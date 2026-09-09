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
  { icon: BadgeCheck, title: "Verified quality", text: "We source from established manufacturers and supply batch documentation as standard." },
  { icon: Users, title: "Technical partnership", text: "Our team advises on instrument selection, method consumables and laboratory design." },
  { icon: Target, title: "Reliable supply", text: "Planned stockholding and call-off contracts keep laboratories running through the year." },
  { icon: Building2, title: "Institutional experience", text: "Familiar with tender documentation, purchase orders and public procurement timelines." },
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
              operators nationwide.
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
              laboratory furniture. We also provide fit-out support, instrument installation and routine
              servicing.
            </p>
            <p>
              Our customers include public universities and technical universities, teaching and district
              hospitals, food and beverage manufacturers, mining service laboratories, and municipal water
              operators. Most work with us on a recurring basis through quotations and scheduled call-off
              supply, which keeps pricing predictable across a budget year.
            </p>
            <p>
              Every analytical grade product ships with its batch certificate of analysis, and we retain
              copies so items can be traced during audits or when troubleshooting a result years later.
            </p>
            <h2 className="pt-4 font-display text-2xl font-extrabold text-foreground">Account types</h2>
            <p>
              Individual accounts are approved immediately and are suited to consultants, small
              laboratories and private buyers. Institutional accounts are reviewed by our team before
              approval, and unlock formal quotations, invoicing against purchase orders and negotiated
              pricing tiers.
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
