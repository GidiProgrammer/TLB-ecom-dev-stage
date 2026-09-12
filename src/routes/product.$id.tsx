import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, ShoppingCart, FlaskConical, Check } from "lucide-react";
import { toast } from "sonner";
import { formatGHS, remainingPurchasableQty, stockLabel, stockStatus } from "@/lib/catalog-utils";
import { fetchProductBySlug, useCategories, useRelatedProducts } from "@/lib/queries/products";
import { useStore } from "@/lib/store";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function productMetaDescription(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "Laboratory supply from TLB Enterprise.";
  return trimmed.length > 155 ? `${trimmed.slice(0, 152).trimEnd()}…` : trimmed;
}

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params, context }) => {
    const product = await context.queryClient.ensureQueryData({
      queryKey: ["product", params.id],
      queryFn: () => fetchProductBySlug(params.id),
    });
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.product) {
      return {
        meta: [
          { title: "Product not available — TLB Enterprise" },
          { name: "description", content: "This laboratory product is not available from TLB Enterprise." },
          { name: "robots", content: "noindex" },
          { property: "og:title", content: "Product not available — TLB Enterprise" },
          { property: "og:description", content: "This laboratory product is not available from TLB Enterprise." },
        ],
      };
    }
    const { product } = loaderData;
    const description = productMetaDescription(product.description);
    return {
      meta: [
        { title: `${product.name} — TLB Enterprise` },
        { name: "description", content: description },
        { property: "og:title", content: `${product.name} — TLB Enterprise` },
        { property: "og:description", content: description },
      ],
    };
  },
  notFoundComponent: ProductNotFound,
  errorComponent: ProductLoadError,
  component: ProductDetail,
});

function ProductNotFound() {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="font-display text-2xl font-extrabold">Product not available</h1>
      <p className="mt-2 text-sm text-muted-foreground">This item may have been renamed or discontinued.</p>
      <Button asChild className="mt-6">
        <Link to="/shop">Back to shop</Link>
      </Button>
    </div>
  );
}

function ProductLoadError() {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="font-display text-2xl font-extrabold">Could not load this product</h1>
      <p className="mt-2 text-sm text-muted-foreground">Please try again shortly.</p>
      <Button asChild className="mt-6">
        <Link to="/shop">Back to shop</Link>
      </Button>
    </div>
  );
}

function ProductDetail() {
  const { product } = Route.useLoaderData();
  const { data: categories } = useCategories();
  const { addToCart, addToQuote, cart } = useStore();
  const [qty, setQty] = useState(1);
  const { data: related } = useRelatedProducts(product.categoryId ?? "", product.productId);
  const category = categories?.find((c) => c.slug === product.categorySlug);
  const status = stockStatus(product.stock_quantity, product.low_stock_threshold);
  const inCart = cart.find((line) => line.id === product.id)?.qty ?? 0;
  const remaining = remainingPurchasableQty(product.stock_quantity, inCart);
  const canPurchase = remaining > 0;
  const qtyToAdd = Math.min(Math.max(1, Math.floor(qty) || 1), Math.max(1, remaining));

  const handleAddToCart = () => {
    if (!canPurchase) {
      toast.error("This product is out of stock");
      return;
    }
    const requested = Math.max(1, Math.floor(qty) || 1);
    const added = Math.min(requested, remaining);
    addToCart(product.id, added);
    if (added < requested) {
      toast.success("Added available quantity", {
        description: `${added} × ${product.name} (only ${remaining} more available)`,
      });
      return;
    }
    toast.success("Added to cart", { description: `${added} × ${product.name}` });
  };

  return (
    <div className="container-page py-10">
      <nav className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link> /{" "}
        <Link to="/shop" className="hover:text-primary">Shop</Link> /{" "}
        {category && (
          <>
            <Link to="/shop" search={{ category: category.slug }} className="hover:text-primary">
              {category.name}
            </Link>{" "}
            /{" "}
          </>
        )}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-border bg-secondary">
          <img
            src={product.image}
            alt={product.hasProductImage ? product.name : `Category illustration for ${product.name}`}
            className="aspect-4/3 w-full object-cover"
          />
          {!product.hasProductImage ? (
            <p className="border-t border-border bg-card px-4 py-2 text-xs text-muted-foreground">
              Category illustration — a product photograph is not available yet.
            </p>
          ) : null}
        </div>

        <div>
          {product.categoryName ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {product.categoryName}
            </p>
          ) : null}
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight">{product.name}</h1>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant={status === "in-stock" ? "default" : "secondary"}>
              {stockLabel(product.stock_quantity, product.low_stock_threshold)}
            </Badge>
            {product.sku ? <Badge variant="secondary">{product.sku}</Badge> : null}
          </div>

          <p className="mt-5 text-sm text-muted-foreground">{product.description}</p>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-primary">{formatGHS(product.price)}</span>
            <span className="text-sm text-muted-foreground">per {product.unit}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Prices exclude delivery. Institutional pricing available on quotation.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {canPurchase ? (
              <>
                <Input
                  type="number"
                  min={1}
                  max={remaining}
                  step={1}
                  value={qtyToAdd}
                  aria-label="Quantity"
                  onChange={(e) => {
                    const next = Math.floor(Number(e.target.value));
                    if (!Number.isFinite(next) || next < 1) {
                      setQty(1);
                      return;
                    }
                    setQty(Math.min(next, remaining));
                  }}
                  className="w-24"
                />
                <Button
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-4 w-4" /> Add to cart
                </Button>
              </>
            ) : (
              <Button size="lg" disabled>
                Out of stock
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                addToQuote(product.id, canPurchase ? qtyToAdd : 1);
                toast.success("Added to quote request", { description: product.name });
              }}
            >
              <FileText className="h-4 w-4" /> Add to quote
            </Button>
          </div>
          {status === "low-stock" && canPurchase ? (
            <p className="mt-2 text-xs text-muted-foreground">Limited availability. Stock is confirmed when you place the order.</p>
          ) : null}

          <div className="mt-6 rounded-md border border-border bg-primary-soft p-4 text-xs text-muted-foreground">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <FlaskConical className="h-4 w-4 text-primary" /> Save to an experiment
            </p>
            <p className="mt-1">
              Signed-in users can group items into reusable experiment lists for quick reordering.{" "}
              <Link to="/experiments" className="font-semibold text-primary hover:underline">
                Manage experiments
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="specs" className="mt-12">
        <TabsList>
          <TabsTrigger value="specs">Specifications</TabsTrigger>
          <TabsTrigger value="delivery">Delivery &amp; documentation</TabsTrigger>
        </TabsList>
        <TabsContent value="specs" className="mt-4">
          <dl className="grid max-w-2xl gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
            {[
              product.sku ? { label: "SKU", value: product.sku } : null,
              product.unit ? { label: "Unit", value: product.unit } : null,
              {
                label: "Availability",
                value: stockLabel(product.stock_quantity, product.low_stock_threshold),
              },
            ]
              .filter((row): row is { label: string; value: string } => row !== null)
              .map((s) => (
                <div key={s.label} className="bg-card p-4">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</dt>
                  <dd className="mt-1 text-sm font-medium">{s.value}</dd>
                </div>
              ))}
          </dl>
        </TabsContent>
        <TabsContent value="delivery" className="mt-4 max-w-2xl space-y-2 text-sm text-muted-foreground">
          {[
            "Accra deliveries typically dispatched within 48 hours of a confirmed order.",
            "Regional delivery across Ghana arranged with tracked courier or our own transport.",
            "Analytical grade items ship with the batch certificate of analysis.",
            "Purchase orders and institutional invoicing accepted — payment is arranged offline.",
          ].map((t) => (
            <p key={t} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {t}
            </p>
          ))}
        </TabsContent>
      </Tabs>

      <section className="mt-14">
        <h2 className="font-display text-xl font-extrabold">Related products</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(related ?? []).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
