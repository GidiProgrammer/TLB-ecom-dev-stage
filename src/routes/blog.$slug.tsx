import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { articleBySlug, articles } from "@/lib/content";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const article = articleBySlug(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Article not found — TLB Enterprise" }, { name: "robots", content: "noindex" }] };
    }
    const { article } = loaderData;
    return {
      meta: [
        { title: `${article.title} — TLB Enterprise` },
        { name: "description", content: article.excerpt.slice(0, 155) },
        { property: "og:title", content: article.title },
        { property: "og:description", content: article.excerpt.slice(0, 155) },
        { property: "og:type", content: "article" },
      ],
    };
  },
  notFoundComponent: ArticleMissing,
  component: ArticlePage,
});

function ArticleMissing() {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="font-display text-2xl font-extrabold">Article not found</h1>
      <Button asChild className="mt-6">
        <Link to="/blog">Back to knowledge hub</Link>
      </Button>
    </div>
  );
}

function ArticlePage() {
  const { article } = Route.useLoaderData();
  const more = articles.filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <div className="container-page py-10">
      <nav className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link> /{" "}
        <Link to="/blog" className="hover:text-primary">Knowledge hub</Link> /{" "}
        <span className="text-foreground">{article.category}</span>
      </nav>

      <article className="mx-auto mt-6 max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">{article.category}</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight sm:text-4xl">{article.title}</h1>
        <p className="mt-3 text-xs text-muted-foreground">
          {new Date(article.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} ·{" "}
          {article.readTime}
        </p>
        <p className="mt-6 border-l-2 border-accent pl-4 text-base text-muted-foreground">{article.excerpt}</p>
        <div className="mt-6 space-y-4 text-[15px] leading-relaxed">
          {article.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-10 rounded-md border border-border bg-primary-soft p-6">
          <p className="font-display text-base font-bold">Need help applying this in your laboratory?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Our technical team advises on reagents, instruments and laboratory setup across Ghana.
          </p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/contact">Talk to us</Link>
          </Button>
        </div>
      </article>

      <section className="mx-auto mt-14 max-w-3xl">
        <h2 className="font-display text-xl font-extrabold">More articles</h2>
        <ul className="mt-4 space-y-3">
          {more.map((a) => (
            <li key={a.slug}>
              <Link to="/blog/$slug" params={{ slug: a.slug }} className="font-medium text-primary hover:underline">
                {a.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
