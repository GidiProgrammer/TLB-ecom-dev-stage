import { Link } from "@tanstack/react-router";
import { FlaskConical, Mail, MapPin, Phone } from "lucide-react";
import { COMPANY } from "@/lib/catalog-utils";
import { useCategories } from "@/lib/queries/products";

export function Footer() {
  const { data: categories } = useCategories();

  return (
    <footer className="mt-20 border-t border-border bg-primary-dark text-primary-foreground">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded bg-primary-foreground/10">
              <FlaskConical className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-extrabold">TLB Enterprise</span>
          </div>
          <p className="mt-4 text-sm text-primary-foreground/75">
            Supplier of laboratory chemicals, equipment, glassware and safety products to institutions,
            industry and healthcare across Ghana.
          </p>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide">Categories</h3>
          <ul className="mt-4 space-y-2 text-sm text-primary-foreground/75">
            {(categories ?? []).slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link to="/shop" search={{ category: c.slug }} className="hover:text-primary-foreground">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide">Company</h3>
          <ul className="mt-4 space-y-2 text-sm text-primary-foreground/75">
            <li><Link to="/about" className="hover:text-primary-foreground">About us</Link></li>
            <li><Link to="/blog" className="hover:text-primary-foreground">Knowledge hub</Link></li>
            <li><Link to="/quote" className="hover:text-primary-foreground">Request a quote</Link></li>
            <li><Link to="/account" className="hover:text-primary-foreground">Account dashboard</Link></li>
            <li><Link to="/contact" className="hover:text-primary-foreground">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide">Get in touch</h3>
          <ul className="mt-4 space-y-3 text-sm text-primary-foreground/75">
            <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{COMPANY.address}</li>
            <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" />{COMPANY.phone}</li>
            <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" />{COMPANY.email}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-primary-foreground/15">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-primary-foreground/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} TLB Enterprise. All rights reserved.</p>
          <p>Payments are arranged offline — invoices and purchase orders welcome.</p>
        </div>
      </div>
    </footer>
  );
}
