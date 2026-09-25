import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, FileText, Headphones, Truck } from "lucide-react";
import { COMPANY } from "@/lib/catalog-utils";
import { useNewestInCatalogue, useCategories, useProducts } from "@/lib/queries/products";
import { HomeHero } from "@/components/site/HomeHero";
import { HomeCategoryRail } from "@/components/site/HomeCategoryRail";
import { HomeProductRail } from "@/components/site/HomeProductRail";
import { HomePromoTiles } from "@/components/site/HomePromoTiles";
import { HomeExploreProducts } from "@/components/site/HomeExploreProducts";

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
  { icon: BadgeCheck, title: "Documented quality", text: "Ask us for batch certificates of analysis on analytical-grade items." },
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

      <section className="border-b border-border bg-card">
        <div className="container-page grid gap-x-6 gap-y-4 py-4 sm:grid-cols-2 lg:grid-cols-4 lg:py-5">
          {promises.map((p) => (
            <div key={p.title} className="flex gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <p.icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">{p.title}</h2>
                <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{p.text}</p>
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

      <section id="ordering" className="container-page scroll-mt-[calc(var(--site-header-height)+1rem)] py-10">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How ordering works</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Catalogue orders and quotation requests follow the same confirmation process.
        </p>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ["1", "Browse the catalogue", "Find chemicals, glassware, equipment and consumables with Ghana cedi list prices."],
            ["2", "Order or request a quote", "Place an order from your cart, or send a quote list for our team to price."],
            ["3", "We confirm offline", "Availability, delivery and invoicing are arranged with TLB after we receive your request."],
          ].map(([step, title, text]) => (
            <li key={step} className="flex gap-3 rounded-lg border border-border/70 bg-card px-4 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {step}
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ol>
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
