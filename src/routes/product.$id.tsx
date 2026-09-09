import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, ShoppingCart, FlaskConical, Check } from "lucide-react";
import { toast } from "sonner";
import {
  categoryBySlug,
  formatGHS,
  productById,
  productImage,
  relatedProducts,
  stockLabel,
} from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => {
    const product = productById(params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Product unavailable — TLB Enterprise" }, { name: "robots", content: "noindex" }] };
    }
    const { product } = loaderData;
    return {
      meta: [
        { title: `${product.name} — TLB Enterprise` },
        { name: "description", content: product.description.slice(0, 155) },
        { property: "og:title", content: `${product.name} — TLB Enterprise` },
        { property: "og:description", content: product.description.slice(0, 155) },
      ],
    };
  },
  notFoundComponent: ProductNotFound,
  errorComponent: ProductNotFound,
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

function ProductDetail() {
  const { product } = Route.useLoaderData();
  const { addToCart, addToQuote } = useStore();
  const [qty, setQty] = useState(1);
  const category = categoryBySlug(product.category);

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
            src={productImage(product.category)}
            alt={product.name}
            className="aspect-4/3 w-full object-cover"
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {product.brand} · {product.subcategory}
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight">{product.name}</h1>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant={product.stock === "in-stock" ? "default" : "secondary"}>
              {stockLabel[product.stock]}
            </Badge>
            {product.bestSeller && <Badge className="bg-accent text-accent-foreground">Best seller</Badge>}
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
            <Input
              type="number"
              min={1}
              value={qty}
              aria-label="Quantity"
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="w-24"
            />
            <Button
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => {
                addToCart(product.id, qty);
                toast.success("Added to cart", { description: `${qty} × ${product.name}` });
              }}
            >
              <ShoppingCart className="h-4 w-4" /> Add to cart
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                addToQuote(product.id, qty);
                toast.success("Added to quote request", { description: product.name });
              }}
            >
              <FileText className="h-4 w-4" /> Add to quote
            </Button>
          </div>

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
            {product.specs.map((s) => (
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
          {relatedProducts(product).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
