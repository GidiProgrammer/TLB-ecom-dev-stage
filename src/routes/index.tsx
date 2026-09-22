import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, FileText, Headphones, Truck } from "lucide-react";
import { COMPANY } from "@/lib/catalog-utils";
import { useNewestInCatalogue, useCategories } from "@/lib/queries/products";
import { HomeHero } from "@/components/site/HomeHero";
import { HomeCategoryRail } from "@/components/site/HomeCategoryRail";
import { HomeProductRail } from "@/components/site/HomeProductRail";
import { HomePromoTiles } from "@/components/site/HomePromoTiles";

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
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();

  return (
    <div className="bg-muted">
      <HomeHero />

      <section className="container-page pb-10">
        <div className="grid gap-6 rounded-lg bg-card px-5 py-8 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {promises.map((p) => (
            <div key={p.title} className="flex gap-3">
              <p.icon className="mt-0.5 h-8 w-8 shrink-0 text-primary" aria-hidden />
              <div>
                <h2 className="font-display text-sm font-bold">{p.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <HomeCategoryRail categories={categories} isLoading={categoriesLoading} error={categoriesError} />

      <HomeProductRail products={featured} isLoading={featuredLoading} error={featuredError} />

      <HomePromoTiles />

      <section className="container-page pb-16">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How ordering works</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Catalogue orders and quotation requests follow the same confirmation process.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["1. Browse the catalogue", "Find chemicals, glassware, equipment and consumables with Ghana cedi list prices."],
            ["2. Order or request a quote", "Place an order from your cart, or send a quote list for our team to price."],
            ["3. We confirm offline", "Availability, delivery and invoicing are arranged with TLB after we receive your request."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-lg bg-card p-5">
              <h3 className="font-display text-sm font-bold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-card py-10">
        <div className="container-page text-sm text-muted-foreground">
          <p className="font-display text-base font-bold text-foreground">Visit or call us</p>
          <p className="mt-2">
            {COMPANY.address} · {COMPANY.phone} · {COMPANY.email}
          </p>
        </div>
      </section>
    </div>
  );
}
