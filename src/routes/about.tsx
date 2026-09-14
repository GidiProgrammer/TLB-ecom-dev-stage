import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Building2, Target, Users } from "lucide-react";
import heroLab from "@/assets/hero-lab.jpg";
import { COMPANY } from "@/lib/catalog-utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About TLB Enterprise — laboratory suppliers in Accra" },
      {
        name: "description",
        content:
          "TLB Enterprise supplies laboratory chemicals, equipment and safety products to universities, hospitals and industry across Ghana.",
      },
      { property: "og:title", content: "About TLB Enterprise" },
      { property: "og:description", content: "Trusted laboratory supply partner for institutions across Ghana." },
    ],
  }),
  component: About,
});

const values = [
  { icon: BadgeCheck, title: "Documented quality", text: "We can supply batch certificates of analysis for analytical-grade products when you ask at order time." },
  { icon: Users, title: "Practical advice", text: "Talk to us about product selection, pack sizes and the consumables your method needs." },
  { icon: Target, title: "Confirmed supply", text: "Availability, delivery and invoicing are arranged after we receive your order or quotation request." },
  { icon: Building2, title: "Institutional purchasing", text: "We work with quotations, purchase orders and offline invoicing for organisations." },
];

function About() {
  return (
    <div>
      <section className="hero-surface text-primary-foreground">
        <div className="container-page grid items-center gap-10 py-16 lg:grid-cols-2">
          <div>
            <h1 className="font-display text-4xl font-extrabold leading-tight">About TLB Enterprise</h1>
            <p className="mt-4 text-primary-foreground/85">
              We are a Ghanaian laboratory supply company based in Accra, serving teaching and research
              laboratories, hospitals, mining and manufacturing quality control units, and water treatment
              operators.
            </p>
          </div>
          <img src={heroLab} alt="Laboratory bench with instruments" className="rounded-lg shadow-pop" />
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <h2 className="font-display text-2xl font-extrabold text-foreground">What we do</h2>
            <p>
              TLB Enterprise supplies analytical and industrial chemicals, benchtop and floor-standing
              equipment, borosilicate glassware, personal protective equipment, general consumables and
              laboratory furniture. Ask us what we can source for your specification.
            </p>
            <p>
              Our customers include public universities and technical universities, teaching and district
              hospitals, food and beverage manufacturers, mining service laboratories, and municipal water
              operators. Recurring work is typically arranged through quotations and scheduled deliveries
              agreed with our team.
            </p>
            <p>
              We can supply batch certificates of analysis for analytical-grade products. Ask our team when
              you order if you need documentation retained for audits.
            </p>
            <h2 className="pt-4 font-display text-2xl font-extrabold text-foreground">Account types</h2>
            <p>
              Individual accounts are ready to use after sign-up. Institutional accounts are reviewed by our
              team so we can recognise your organisation. You can request quotations, provide institutional
              details, and contact TLB to arrange invoicing — this does not unlock automatic negotiated
              pricing.
            </p>
          </div>

          <aside className="h-fit rounded-md border border-border bg-primary-soft p-6">
            <h2 className="font-display text-base font-bold">Visit us</h2>
            <dl className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div>
                <dt className="font-semibold text-foreground">Address</dt>
                <dd>{COMPANY.address}</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Phone</dt>
                <dd>{COMPANY.phone}</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Email</dt>
                <dd>{COMPANY.email}</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Opening hours</dt>
                <dd>Monday to Friday, 8:00 – 17:00 · Saturday, 9:00 – 13:00</dd>
              </div>
            </dl>
            <Button asChild className="mt-5 w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/contact">Contact the team</Link>
            </Button>
          </aside>
        </div>
      </section>

      <section className="bg-secondary/50 py-16">
        <div className="container-page grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="rounded-md border border-border bg-card p-5">
              <v.icon className="h-5 w-5 text-accent" />
              <h3 className="mt-3 font-display text-sm font-bold">{v.title}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground">{v.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
