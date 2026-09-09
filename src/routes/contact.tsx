import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { toast } from "sonner";
import { COMPANY } from "@/lib/catalog-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact TLB Enterprise — Accra laboratory suppliers" },
      {
        name: "description",
        content:
          "Call +233 24 744 6730 or message TLB Enterprise on Pokuase-Nsawam Road, Accra for laboratory chemicals, equipment and quotations.",
      },
      { property: "og:title", content: "Contact TLB Enterprise" },
      { property: "og:description", content: "Reach our Accra team for laboratory supplies and quotations." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-extrabold">Contact us</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Tell us what your laboratory needs and we'll respond with availability, pricing and lead times.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <form
          className="space-y-5 rounded-md border border-border p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
            toast.success("Message ready to send", {
              description: `Our team will reply from ${COMPANY.email}.`,
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="c-name">Your name</Label>
              <Input id="c-name" required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="c-email">Email</Label>
              <Input id="c-email" type="email" required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="c-phone">Phone</Label>
              <Input id="c-phone" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="c-org">Institution / company</Label>
              <Input id="c-org" className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="c-msg">How can we help?</Label>
            <Textarea id="c-msg" rows={6} required className="mt-1.5" />
          </div>
          <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
            Send message
          </Button>
          {sent && (
            <p className="text-xs text-muted-foreground">
              Thank you — for urgent requests please call {COMPANY.phone}.
            </p>
          )}
        </form>

        <aside className="h-fit space-y-4 rounded-md border border-border bg-primary-soft p-6 text-sm">
          <div className="flex gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>{COMPANY.address}</p>
          </div>
          <div className="flex gap-3">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} className="hover:text-primary">
              {COMPANY.phone}
            </a>
          </div>
          <div className="flex gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <a href={`mailto:${COMPANY.email}`} className="break-all hover:text-primary">
              {COMPANY.email}
            </a>
          </div>
          <div className="flex gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>Mon–Fri 8:00–17:00 · Sat 9:00–13:00</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
