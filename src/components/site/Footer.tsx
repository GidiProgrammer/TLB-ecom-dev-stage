import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { COMPANY } from "@/lib/catalog-utils";
import { useCategories } from "@/lib/queries/products";
import { BrandLogo } from "@/components/site/BrandLogo";
import { CommerceExplainer } from "@/components/site/CommerceExplainer";

export function Footer() {
  const { data: categories } = useCategories();

  return (
    <footer className="mt-20 border-t-4 border-gold bg-neutral-900 text-neutral-50">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div>
          <BrandLogo className="h-16" />
          <p className="sr-only">TLB Enterprise</p>
          <p className="mt-4 text-sm text-neutral-400">
            Supplier of laboratory chemicals, equipment, glassware and safety products to institutions,
            industry and healthcare across Ghana.
          </p>
          <CommerceExplainer className="mt-4 text-xs leading-relaxed text-neutral-400" />
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gold">Categories</h3>
          <ul className="mt-4 space-y-1 text-sm text-neutral-400">
            {(categories ?? []).map((c) => (
              <li key={c.slug}>
                <Link
                  to="/shop"
                  search={{ category: c.slug }}
                  className="inline-flex min-h-11 items-center hover:text-neutral-50"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gold">Company</h3>
          <ul className="mt-4 space-y-1 text-sm text-neutral-400">
            <li>
              <Link to="/about" className="inline-flex min-h-11 items-center hover:text-neutral-50">
                About us
              </Link>
            </li>
            <li>
              <Link to="/blog" className="inline-flex min-h-11 items-center hover:text-neutral-50">
                Knowledge hub
              </Link>
            </li>
            <li>
              <Link to="/quote" className="inline-flex min-h-11 items-center hover:text-neutral-50">
                Request a quote
              </Link>
            </li>
            <li>
              <Link
                to="/account"
                activeOptions={{ exact: true }}
                className="inline-flex min-h-11 items-center hover:text-neutral-50"
              >
                Account dashboard
              </Link>
            </li>
            <li>
              <Link to="/contact" className="inline-flex min-h-11 items-center hover:text-neutral-50">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gold">Get in touch</h3>
          <ul className="mt-4 space-y-1 text-sm text-neutral-400">
            <li className="flex min-h-11 items-start gap-2 py-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {COMPANY.address}
            </li>
            <li>
              <a
                href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}
                className="flex min-h-11 items-center gap-2 hover:text-neutral-50"
              >
                <Phone className="h-4 w-4 shrink-0" aria-hidden />
                {COMPANY.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${COMPANY.email}`} className="flex min-h-11 items-center gap-2 hover:text-neutral-50">
                <Mail className="h-4 w-4 shrink-0" aria-hidden />
                {COMPANY.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} TLB Enterprise. All rights reserved.</p>
          <p>Payments are arranged offline — invoices and purchase orders welcome.</p>
        </div>
      </div>
    </footer>
  );
}
