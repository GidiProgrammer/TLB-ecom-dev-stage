import { createFileRoute, Link } from "@tanstack/react-router";
import { articles } from "@/lib/content";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Knowledge Hub — laboratory practice articles | TLB Enterprise" },
      {
        name: "description",
        content:
          "Practical guidance on reagent storage, equipment selection, PPE programmes and laboratory fit-out from the TLB Enterprise team in Accra.",
      },
      { property: "og:title", content: "Knowledge Hub — TLB Enterprise" },
      { property: "og:description", content: "Practical laboratory guidance for Ghanaian institutions and industry." },
    ],
  }),
  component: Blog,
});

function Blog() {
  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-extrabold">Knowledge hub</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Field notes on laboratory practice, equipment selection and procurement, written for laboratories
        working in Ghanaian conditions.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <article key={a.slug} className="flex flex-col rounded-md border border-border bg-card p-5 transition-shadow hover:shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">{a.category}</p>
            <h2 className="mt-2 font-display text-base font-bold leading-snug">
              <Link to="/blog/$slug" params={{ slug: a.slug }} className="hover:text-primary">
                {a.title}
              </Link>
            </h2>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{a.excerpt}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              {new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} ·{" "}
              {a.readTime}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
