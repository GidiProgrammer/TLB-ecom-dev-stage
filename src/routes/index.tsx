import { Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Headphones, Search, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { COMPANY } from "@/lib/catalog-utils";
import { useNewestInCatalogue, useCategories, useProducts } from "@/lib/queries/products";
import { HomeHero } from "@/components/site/HomeHero";
import { HomeCategoryRail } from "@/components/site/HomeCategoryRail";
import { HomeProductRail } from "@/components/site/HomeProductRail";
import { HomePromoTiles } from "@/components/site/HomePromoTiles";
import { HomeExploreProducts } from "@/components/site/HomeExploreProducts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TLB Enterprise — Laboratory & Scientific Supplies in Ghana" },
      {
        name: "description",
        content:
          "Buy analytical chemicals, laboratory equipment, glassware, PPE and consumables in Accra. Request a quotation and arrange delivery after we confirm your order.",
      },
      { property: "og:title", content: "TLB Enterprise — Laboratory & Scientific Supplies in Ghana" },
      {
        property: "og:description",
        content:
          "Analytical chemicals, equipment, glassware and PPE for laboratories across Ghana. Request a quotation today.",
      },
    ],
  }),
  component: Home,
});

const promises = [
  { icon: ShieldCheck, title: "Documented quality", text: "Ask us for batch certificates of analysis on analytical-grade items." },
  { icon: Truck, title: "Delivery arranged", text: "Accra and regional delivery can be arranged after we confirm your order." },
  { icon: FileText, title: "Quotations", text: "Request a quote for tenders, purchase orders and bulk supply." },
  { icon: Headphones, title: "Technical questions", text: "Ask us about product selection and the documentation you need for your lab." },
];

function Home() {
  const { data: featured, isLoading: featuredLoading, error: featuredError } = useNewestInCatalogue(8);
  const { data: catalogue, isLoading: catalogueLoading, error: catalogueError } = useProducts();
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();

  return (
    <div className="bg-background">
      <HomeHero />

      <section className="border-y border-border bg-card">
        <div className="container-page grid gap-x-0 gap-y-2 py-2 sm:grid-cols-2 lg:grid-cols-4">
          {promises.map((p, index) => (
            <div
              key={p.title}
              className={cn(
                "flex items-center gap-4 px-1 py-6 sm:px-6",
                index % 2 === 1 && "sm:border-l sm:border-border",
                index > 0 && "lg:border-l lg:border-border",
              )}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <p.icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">{p.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <HomeCategoryRail categories={categories} isLoading={categoriesLoading} error={categoriesError} />

      <HomeProductRail products={featured} isLoading={featuredLoading} error={featuredError} />

      <HomePromoTiles />

      <HomeExploreProducts
        products={catalogue}
        isLoading={catalogueLoading}
        error={catalogueError}
        excludeIds={(featured ?? []).map((product) => product.id)}
      />

      <section id="ordering" className="scroll-mt-[calc(var(--site-header-height)+1rem)] bg-primary-soft">
        <div className="container-page py-10">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl">How ordering works</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Catalogue orders and quotation requests follow the same simple process.
          </p>
          <ol className="mt-8 grid list-none gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
            {[
              { step: "1", title: "Browse the catalogue", text: "Find chemicals, glassware, equipment and consumables with Ghana cedi list prices.", icon: Search },
              { step: "2", title: "Order or request a quote", text: "Place an order from your cart, or send a quote list for our team to price.", icon: ShoppingCart },
              { step: "3", title: "We confirm offline", text: "Availability, delivery and invoicing are arranged with TLB after we receive your request.", icon: Truck },
            ].map((item, index) => (
              <Fragment key={item.step}>
                {index > 0 ? (
                  <span className="hidden items-center justify-center text-2xl tracking-[0.35em] text-neutral-300 lg:flex" aria-hidden>
                    ····
                  </span>
                ) : null}
                <li className="rounded-card bg-card p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                      {item.step}
                    </span>
                    <item.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <h3 className="text-sm font-semibold tracking-tight text-foreground">{item.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </li>
              </Fragment>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-border bg-card py-8">
        <div className="container-page text-sm text-muted-foreground">
          <p className="font-display text-base font-semibold tracking-tight text-foreground">Visit or call us</p>
          <p className="mt-2">
            {COMPANY.address} · {COMPANY.phone} · {COMPANY.email}
          </p>
        </div>
      </section>
    </div>
  );
}
