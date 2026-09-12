-- Restore products.category_id → categories.id for PostgREST embeds.
-- Live drift (2026-09-11): category_id is text holding UUID strings, with no FK.
-- PostgREST then returns PGRST200 on select=*,categories(*).
-- products.id remains text (hybrid catalogue); this migration does not change it.

DO $$
DECLARE
  bad_shape integer;
  orphans integer;
BEGIN
  SELECT count(*) INTO bad_shape
  FROM public.products
  WHERE category_id IS NOT NULL
    AND category_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  IF bad_shape > 0 THEN
    RAISE EXCEPTION 'products.category_id has % non-UUID values; aborting type change', bad_shape;
  END IF;

  SELECT count(*) INTO orphans
  FROM public.products p
  WHERE p.category_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.categories c WHERE c.id::text = p.category_id
    );

  IF orphans > 0 THEN
    RAISE EXCEPTION 'products.category_id has % orphan values; aborting FK', orphans;
  END IF;
END $$;

ALTER TABLE public.products
  ALTER COLUMN category_id TYPE uuid USING category_id::uuid;

ALTER TABLE public.products
  ADD CONSTRAINT products_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES public.categories(id)
  ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
