import { Link } from "@tanstack/react-router";
import imgGlassware from "@/assets/cat-glassware.jpg";
import imgPpe from "@/assets/cat-ppe.jpg";
import { Button } from "@/components/ui/button";

export function HomePromoTiles() {
  return (
    <section className="container-page pb-16">
      <div className="grid gap-5 lg:grid-cols-2">
        <article className="relative isolate min-h-[16rem] overflow-hidden rounded-lg">
          <img
            src={imgGlassware}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-primary/78" />
          <div className="relative z-10 flex h-full flex-col justify-end p-8 text-primary-foreground sm:p-10">
            <h2 className="text-2xl font-semibold tracking-tight">Need a quotation?</h2>
            <p className="mt-3 max-w-md text-sm text-primary-foreground/90">
              Send a list for tenders, purchase orders or items that are not sold at catalogue price.
              Quoted amounts are estimates, not an invoice.
            </p>
            <Button asChild className="mt-6 w-fit bg-gold text-gold-foreground hover:bg-gold/90">
              <Link to="/quote">Request a quote</Link>
            </Button>
          </div>
        </article>
        <article className="relative isolate min-h-[16rem] overflow-hidden rounded-lg">
          <img src={imgPpe} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-foreground/72" />
          <div className="relative z-10 flex h-full flex-col justify-end p-8 text-background sm:p-10">
            <h2 className="text-2xl font-semibold tracking-tight">Supply for laboratories</h2>
            <p className="mt-3 max-w-md text-sm text-background/90">
              Open an account to track orders and quotations. Availability, delivery and invoicing are
              arranged with TLB after we receive your request.
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-6 w-fit border-background bg-transparent text-background hover:bg-background hover:text-foreground"
            >
              <Link to="/auth">Open an account</Link>
            </Button>
          </div>
        </article>
      </div>
    </section>
  );
}
