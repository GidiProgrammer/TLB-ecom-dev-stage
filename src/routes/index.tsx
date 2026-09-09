import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  FlaskConical,
  Headphones,
  Star,
  Truck,
} from "lucide-react";
import heroLab from "@/assets/hero-lab.jpg";
import { COMPANY } from "@/lib/catalog-utils";
import { brands, testimonials, articles } from "@/lib/content";
import { useBestSellers, useCategories } from "@/lib/queries/products";
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
          "Buy analytical chemicals, laboratory equipment, glassware, PPE and consumables in Accra. Institutional quotes, certificates of analysis and nationwide delivery.",
      },
      { property: "og:title", content: "TLB Enterprise — Laboratory & Scientific Supplies in Ghana" },
      {
        property: "og:description",
        content:
          "Analytical chemicals, equipment, glassware and PPE for laboratories across Ghana. Request institutional pricing today.",
      },
    ],
  }),
  component: Home,
});

const promises = [
  { icon: BadgeCheck, title: "Certified quality", text: "Batch certificates of analysis on every analytical grade product." },
  { icon: Truck, title: "Nationwide delivery", text: "Accra same-week dispatch, regional delivery across Ghana." },
  { icon: FileText, title: "Institutional quotes", text: "Formal quotations for tenders, purchase orders and call-off supply." },
  { icon: Headphones, title: "Technical support", text: "Guidance on instrument selection, installation and servicing." },
];

function Home() {
  const { data: featured, isLoading: featuredLoading, error: featuredError } = useBestSellers(8);
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();

  return (
    <>
      <section className="hero-surface relative overflow-hidden text-primary-foreground">
        <div className="grid-lines absolute inset-0" aria-hidden />
        <div className="container-page relative grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
              <FlaskConical className="h-3.5 w-3.5" /> Serving laboratories since 2014
            </p>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              Laboratory supplies you can build a result on
            </h1>
            <p className="mt-5 max-w-xl text-base text-primary-foreground/85">
              TLB Enterprise supplies analytical chemicals, benchtop equipment, borosilicate glassware,
              PPE and consumables to universities, hospitals, industry and research institutions across
              Ghana.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/shop">
                  Browse the catalogue <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to="/quote">Request a quote</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
              {[
                ["1,200+", "Product lines"],
                ["180+", "Institutions served"],
                ["48 hrs", "Typical Accra dispatch"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-display text-2xl font-extrabold">{v}</dt>
                  <dd className="text-xs text-primary-foreground/75">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <img
              src={heroLab}
              alt="Scientist working at a laboratory bench with analytical instruments"
              className="w-full rounded-lg object-cover shadow-pop"
            />
          </div>
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

      <section className="container-page py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Shop by category</h2>
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
                <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{c.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-secondary/50 py-16">
        <div className="container-page">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Best sellers</h2>
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
                    Could not load best sellers. Please try again shortly.
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
              <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
                Institutional accounts &amp; call-off supply
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                Universities, hospitals and manufacturers can open an institutional account for approved
                pricing, formal quotations against purchase orders and scheduled deliveries through the
                academic or production year. Save recurring reagent lists as “Experiments” and reorder in
                one click.
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
        <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Brands we supply</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {brands.map((b) => (
            <div key={b.name} className="rounded-md border border-border bg-card px-4 py-3">
              <p className="font-display text-sm font-bold">{b.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{b.focus}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-primary-dark py-16 text-primary-foreground">
        <div className="container-page">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">What our clients say</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {testimonials.map((t) => (
              <figure key={t.name} className="rounded-md bg-primary-foreground/10 p-5">
                <div className="flex gap-0.5 text-accent">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-3 text-sm text-primary-foreground/85">“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-xs">
                  <span className="font-semibold">{t.name}</span>
                  <span className="block text-primary-foreground/65">{t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">From the knowledge hub</h2>
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
