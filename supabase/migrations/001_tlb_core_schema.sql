-- =========================================================
-- TLB Enterprise — Core Schema
-- Supersedes/extends the Lovable-generated migration.
-- Run this against your NEW Supabase project.
-- =========================================================

-- -----------------------------------------------------------------
-- 1. ENUMS
-- -----------------------------------------------------------------
CREATE TYPE public.account_type AS ENUM ('individual','institutional');
CREATE TYPE public.approval_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.app_role AS ENUM ('admin','staff');
CREATE TYPE public.order_status AS ENUM ('pending','paid','processing','shipped','completed','cancelled','payment_failed');
CREATE TYPE public.quote_status AS ENUM ('submitted','reviewed','quoted','accepted','declined');
CREATE TYPE public.stock_reason AS ENUM ('restock','sale','adjustment','damaged','return');

-- -----------------------------------------------------------------
-- 2. ROLES  (separate table — never store role on a user-editable row)
-- -----------------------------------------------------------------
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
-- No client policies at all: only service_role (server) can read/write this table.
GRANT ALL ON public.user_roles TO service_role;

-- Security-definer helper so RLS policies can check role without recursive RLS issues.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- -----------------------------------------------------------------
-- 3. PROFILES
-- -----------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  account_type public.account_type NOT NULL DEFAULT 'individual',
  institution_name TEXT,
  institution_type TEXT,
  approval_status public.approval_status NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE POLICY "own profile select" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
-- Users may update their own profile EXCEPT approval_status (enforced by trigger below).
CREATE POLICY "own profile update" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "admin select all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "admin update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Prevent a regular user from approving their own institutional account
-- by editing approval_status directly through the "own profile update" policy.
CREATE OR REPLACE FUNCTION public.prevent_self_approval() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     AND NOT (public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'approval_status can only be changed by an admin';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_prevent_self_approval
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_approval();

-- -----------------------------------------------------------------
-- 4. CATEGORIES & PRODUCTS
-- -----------------------------------------------------------------
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.categories TO authenticated, anon;
GRANT ALL ON public.categories TO service_role;
CREATE POLICY "public read categories" ON public.categories
  FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "admin write categories" ON public.categories
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT UNIQUE,
  description TEXT,
  unit_label TEXT,                 -- e.g. "pack of 100", "500ml bottle"
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  institutional_price NUMERIC(12,2), -- optional bulk/institutional rate
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.products TO authenticated, anon;
GRANT ALL ON public.products TO service_role;
CREATE POLICY "public read active products" ON public.products
  FOR SELECT TO authenticated, anon USING (is_active = true);
CREATE POLICY "admin read all products" ON public.products
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "admin write products" ON public.products
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  change_qty INTEGER NOT NULL,          -- positive = added, negative = removed
  reason public.stock_reason NOT NULL,
  reference_id UUID,                     -- e.g. related order id
  note TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.stock_movements TO service_role;
CREATE POLICY "admin read stock movements" ON public.stock_movements
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
-- No client INSERT/UPDATE policy — all writes go through the decrement/restock
-- functions below (SECURITY DEFINER), never directly from the client.

-- -----------------------------------------------------------------
-- 5. ORDERS  (relational line items, not JSONB)
-- -----------------------------------------------------------------
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  status public.order_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_name TEXT,
  shipping_email TEXT,
  shipping_phone TEXT,
  shipping_address TEXT,
  shipping_city TEXT,
  institution TEXT,
  payment_reference TEXT,          -- Paystack/Flutterwave transaction ref
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.orders TO authenticated;   -- no direct UPDATE/DELETE grant
GRANT ALL ON public.orders TO service_role;

CREATE POLICY "own orders select" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own orders insert" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "admin read all orders" ON public.orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "admin update orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
-- Status/total changes (paid, cancelled, etc.) happen via server-side code using
-- the service role, or a dedicated RPC — never a raw client UPDATE from a customer.

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,       -- snapshot at time of order
  unit_price NUMERIC(12,2) NOT NULL,-- snapshot at time of order
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(12,2) NOT NULL
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
CREATE POLICY "own order items select" ON public.order_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );
CREATE POLICY "admin read all order items" ON public.order_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- -----------------------------------------------------------------
-- 6. QUOTES  (same relational pattern)
-- -----------------------------------------------------------------
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  status public.quote_status NOT NULL DEFAULT 'submitted',
  notes TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  institution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
CREATE POLICY "own quotes select" ON public.quotes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own quotes insert" ON public.quotes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'submitted');
CREATE POLICY "admin manage quotes" ON public.quotes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE TABLE public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  quoted_price NUMERIC(12,2)   -- filled in by staff during review
);
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_items TO service_role;
CREATE POLICY "own quote items select" ON public.quote_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.user_id = auth.uid())
  );
CREATE POLICY "admin manage quote items" ON public.quote_items
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- -----------------------------------------------------------------
-- 7. EXPERIMENTS  (kept close to original — low risk, user-owned notes)
-- -----------------------------------------------------------------
CREATE TABLE public.experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiments TO authenticated;
GRANT ALL ON public.experiments TO service_role;
CREATE POLICY "own experiments" ON public.experiments
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------
-- 8. updated_at TRIGGERS
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER experiments_updated_at BEFORE UPDATE ON public.experiments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------
-- 9. NEW USER HANDLER  (unchanged logic, kept from original)
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, account_type, institution_name, institution_type, approval_status)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE((NEW.raw_user_meta_data ->> 'account_type')::public.account_type, 'individual'),
    NEW.raw_user_meta_data ->> 'institution_name',
    NEW.raw_user_meta_data ->> 'institution_type',
    CASE WHEN COALESCE(NEW.raw_user_meta_data ->> 'account_type','individual') = 'institutional'
      THEN 'pending'::public.approval_status ELSE 'approved'::public.approval_status END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------
-- 10. ATOMIC STOCK DECREMENT  (the transactional heart of checkout)
-- -----------------------------------------------------------------
-- Called by server-side checkout code inside the same transaction that
-- creates the order + order_items. Raises an exception (rolling back
-- the whole transaction) if stock is insufficient — never oversells.
CREATE OR REPLACE FUNCTION public.decrement_stock(_product_id UUID, _qty INTEGER, _order_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  SELECT stock_quantity INTO current_stock
  FROM public.products WHERE id = _product_id FOR UPDATE;  -- row lock

  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Product % not found', _product_id;
  END IF;

  IF current_stock < _qty THEN
    RAISE EXCEPTION 'Insufficient stock for product %: have %, need %', _product_id, current_stock, _qty;
  END IF;

  UPDATE public.products SET stock_quantity = stock_quantity - _qty WHERE id = _product_id;

  INSERT INTO public.stock_movements (product_id, change_qty, reason, reference_id)
  VALUES (_product_id, -_qty, 'sale', _order_id);
END; $$;
-- Only callable via service role from server-side checkout code.
REVOKE EXECUTE ON FUNCTION public.decrement_stock(UUID, INTEGER, UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.restock_product(_product_id UUID, _qty INTEGER, _note TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.products SET stock_quantity = stock_quantity + _qty WHERE id = _product_id;
  INSERT INTO public.stock_movements (product_id, change_qty, reason, note, created_by)
  VALUES (_product_id, _qty, 'restock', _note, auth.uid());
END; $$;
REVOKE EXECUTE ON FUNCTION public.restock_product(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restock_product(UUID, INTEGER, TEXT) TO authenticated;
-- Note: this function itself doesn't check the role — pair it with an admin-only
-- check in your API route, or add a has_role() guard inside the function body.
