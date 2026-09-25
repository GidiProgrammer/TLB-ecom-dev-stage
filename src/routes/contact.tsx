import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { toast } from "sonner";
import { COMPANY } from "@/lib/catalog-utils";
import { submitContact } from "@/lib/contact";
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

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  institution: "",
  message: "",
  website: "",
};

function Contact() {
  const errorId = useId();
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await submitContact({ data: form });
      setAccepted(true);
      setForm(emptyForm);
      toast.success("Enquiry received", {
        description: "We will follow up. This does not mean an email has been delivered yet.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit your message. Please try again or call us.";
      setError(message);
      toast.error("Could not submit your message", { description: message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-extrabold">Contact us</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Tell us what your laboratory needs and we'll respond with availability, pricing and lead times.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div id="message" className="scroll-mt-[calc(var(--site-header-height)+1rem)]">
        {accepted ? (
          <div className="space-y-4 rounded-md border border-border p-6" role="status" aria-live="polite">
            <p className="text-sm">
              Thank you. Your enquiry was accepted. A member of the team will follow up. For urgent requests
              please call {COMPANY.phone}.
            </p>
            <Button type="button" variant="outline" onClick={() => setAccepted(false)}>
              Send another message
            </Button>
          </div>
        ) : (
          <form className="space-y-5 rounded-md border border-border p-6" onSubmit={onSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="c-name">Your name</Label>
                <Input
                  id="c-name"
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={200}
                  className="mt-1.5"
                  value={form.name}
                  onChange={set("name")}
                />
              </div>
              <div>
                <Label htmlFor="c-email">Email</Label>
                <Input
                  id="c-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={200}
                  className="mt-1.5"
                  value={form.email}
                  onChange={set("email")}
                />
              </div>
              <div>
                <Label htmlFor="c-phone">Phone</Label>
                <Input
                  id="c-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={50}
                  className="mt-1.5"
                  value={form.phone}
                  onChange={set("phone")}
                />
              </div>
              <div>
                <Label htmlFor="c-org">Institution / company</Label>
                <Input
                  id="c-org"
                  name="institution"
                  autoComplete="organization"
                  maxLength={200}
                  className="mt-1.5"
                  value={form.institution}
                  onChange={set("institution")}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="c-msg">How can we help?</Label>
              <Textarea
                id="c-msg"
                name="message"
                rows={6}
                required
                maxLength={2000}
                className="mt-1.5"
                value={form.message}
                onChange={set("message")}
              />
            </div>
            <div className="sr-only" aria-hidden="true">
              <label htmlFor="c-website">Website</label>
              <input
                id="c-website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={set("website")}
              />
            </div>
            {error ? (
              <p id={errorId} className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={busy}
              aria-describedby={error ? errorId : undefined}
            >
              {busy ? "Sending…" : "Send message"}
            </Button>
          </form>
        )}
        </div>

        <aside id="visit" className="h-fit scroll-mt-[calc(var(--site-header-height)+1rem)] space-y-4 rounded-md border border-border bg-primary-soft p-6 text-sm">
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
