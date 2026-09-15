import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  Headphones,
  Truck,
} from "lucide-react";
import heroLab from "@/assets/hero-lab.jpg";
import { COMPANY } from "@/lib/catalog-utils";
import { articles } from "@/lib/content";
import { useNewestInCatalogue, useCategories } from "@/lib/queries/products";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
    <>
      <section aria-labelledby="home-hero-heading">
        <div className="relative isolate h-[calc(100svh-var(--site-header-height))] max-h-[calc(100svh-var(--site-header-height))] overflow-hidden">
          <img
            src={heroLab}
            alt="Scientist working at a laboratory bench with analytical instruments"
            className="absolute inset-0 h-full w-full scale-x-[-1] object-cover object-[center_20%] md:object-[28%_center]"
          />
          <div className="hero-readability-veil absolute inset-0" aria-hidden />
          <div className="container-page relative flex h-full min-h-0 items-end py-8 md:items-center md:py-12 lg:py-16">
            <div className="w-full max-w-xl text-white md:max-w-[42%] lg:max-w-[26rem] xl:max-w-[28rem]">
              <h1
                id="home-hero-heading"
                className="max-w-[20ch] text-[2rem] font-semibold leading-[1.15] tracking-tight sm:text-[2.5rem] md:text-[3rem] lg:text-[3.5rem]"
              >
                Laboratory supplies for serious work.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white [text-shadow:0_1px_10px_rgb(8_5_14_/_0.65)] sm:mt-5 sm:text-base md:[text-shadow:none]">
                TLB Enterprise supplies analytical chemicals, benchtop equipment, borosilicate glassware,
                PPE and consumables to universities, hospitals, industry and research institutions across
                Ghana.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                  <Link to="/shop">
                    Browse the catalogue <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/80 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/quote">Request a quote</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="border-b border-border bg-neutral-50">
          <dl className="container-page grid gap-5 py-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
            {[
              ["Catalogue", "Chemicals, equipment and consumables"],
              ["Institutions", "Universities, hospitals and industry"],
              ["Ghana-wide", "Delivery arranged after confirmation"],
            ].map(([title, detail]) => (
              <div key={title} className="sm:px-8 first:sm:pl-0 last:sm:pr-0">
                <dt className="text-sm font-semibold text-foreground">{title}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-b border-border bg-secondary/50">
        <div className="container-page grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {promises.map((p) => (
            <div key={p.title} className="flex gap-3">
              <p.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div>
                <h2 className="font-display text-sm font-bold">{p.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="categories" className="container-page py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Shop by category</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Eight core ranges covering the full laboratory workflow.
            </p>
          </div>
          <Link to="/shop" className="hidden text-sm font-semibold text-primary hover:underline sm:block">
            View all products
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categoriesLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-4/3 w-full rounded-md" />
              ))
            : categoriesError
              ? (
                <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-4">
                  Could not load categories. Please try again shortly.
                </p>
              )
              : (categories ?? []).map((c) => (
            <Link
              key={c.slug}
              to="/shop"
              search={{ category: c.slug }}
              aria-label={c.name}
              className="group overflow-hidden rounded-md border border-border bg-card transition-shadow hover:shadow-card"
            >
              <div className="aspect-4/3 overflow-hidden bg-secondary">
                <img
                  src={c.image}
                  alt={c.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <h3 className="font-display text-sm font-bold group-hover:text-primary">{c.name}</h3>
                <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-secondary/50 py-16">
        <div className="container-page">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">New in catalogue</h2>
              <p className="mt-2 text-sm text-muted-foreground">Recently added laboratory supplies.</p>
            </div>
            <Link to="/shop" className="text-sm font-semibold text-primary hover:underline">
              See more
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-4/3 w-full rounded-md" />
                ))
              : featuredError
                ? (
                  <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-4">
                    Could not load new catalogue items. Please try again shortly.
                  </p>
                )
                : (featured ?? []).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="rounded-lg border border-border bg-primary-soft p-8 sm:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Supply for laboratories and institutions
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                Open an account to track orders and quotations. You can include your institution details,
                request a quotation, and contact TLB to arrange invoicing or purchase orders. Recurring
                lists can be saved as experiments from your account after you sign in.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/auth">Open an account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/quote">Request pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pb-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How ordering works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            ["1. Browse the catalogue", "Find chemicals, glassware, equipment and consumables with Ghana cedi list prices."],
            ["2. Order or request a quote", "Place an order from your cart, or send a quote list for our team to price."],
            ["3. We confirm offline", "Availability, delivery and invoicing are arranged with TLB after we receive your request."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-md border border-border bg-card p-5">
              <h3 className="font-display text-sm font-bold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">From the knowledge hub</h2>
          <Link to="/blog" className="text-sm font-semibold text-primary hover:underline">
            All articles
          </Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {articles.slice(0, 3).map((a) => (
            <Link
              key={a.slug}
              to="/blog/$slug"
              params={{ slug: a.slug }}
              className="rounded-md border border-border bg-card p-5 transition-shadow hover:shadow-card"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">{a.category}</p>
              <h3 className="mt-2 font-display text-base font-bold leading-snug">{a.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{a.excerpt}</p>
              <p className="mt-3 text-xs text-muted-foreground">{a.readTime}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-secondary/50 py-10">
        <div className="container-page text-sm text-muted-foreground">
          <p className="font-display text-base font-bold text-foreground">Visit or call us</p>
          <p className="mt-2">
            {COMPANY.address} · {COMPANY.phone} · {COMPANY.email}
          </p>
        </div>
      </section>
    </>
  );
}
