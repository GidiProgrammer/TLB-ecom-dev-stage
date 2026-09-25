import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { COMPANY } from "@/lib/catalog-utils";
import { useCategories } from "@/lib/queries/products";
import { BrandLogo } from "@/components/site/BrandLogo";
import { CommerceExplainer } from "@/components/site/CommerceExplainer";

export function Footer() {
  const { data: categories } = useCategories();

  return (
    <footer className="mt-8 max-w-full border-t-4 border-gold bg-deep-purple text-white">
      <div className="container-page grid min-w-0 gap-10 py-16 md:grid-cols-4">
        <div className="min-w-0">
          <BrandLogo className="h-16" />
          <p className="sr-only">TLB Enterprise</p>
          <p className="mt-4 text-sm leading-relaxed text-white/85">
            Supplier of laboratory chemicals, equipment, glassware and safety products to institutions,
            industry and healthcare across Ghana.
          </p>
          <CommerceExplainer className="mt-4 text-sm leading-relaxed text-white/80" />
        </div>

        <div className="min-w-0">
          <h3 className="w-fit border-b-2 border-gold pb-1 text-sm font-semibold tracking-wide text-white">Categories</h3>
          <ul className="mt-4 space-y-1 text-sm text-white/80">
            {(categories ?? []).map((c) => (
              <li key={c.slug} className="min-w-0">
                <Link
                  to="/shop"
                  search={{ category: c.slug }}
                  className="flex min-h-11 min-w-0 items-center break-words hover:text-gold"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0">
          <h3 className="w-fit border-b-2 border-gold pb-1 text-sm font-semibold tracking-wide text-white">Company</h3>
          <ul className="mt-4 space-y-1 text-sm text-white/80">
            <li>
              <Link to="/about" className="flex min-h-11 min-w-0 items-center break-words hover:text-gold">
                About us
              </Link>
            </li>
            <li>
              <Link to="/quote" className="flex min-h-11 min-w-0 items-center break-words hover:text-gold">
                Request a quote
              </Link>
            </li>
            <li>
              <Link
                to="/account"
                activeOptions={{ exact: true }}
                className="flex min-h-11 min-w-0 items-center break-words hover:text-gold"
              >
                Account dashboard
              </Link>
            </li>
            <li>
              <Link to="/contact" className="flex min-h-11 min-w-0 items-center break-words hover:text-gold">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div className="min-w-0">
          <h3 className="w-fit border-b-2 border-gold pb-1 text-sm font-semibold tracking-wide text-white">Get in touch</h3>
          <ul className="mt-4 space-y-1 text-sm text-white/80">
            <li className="flex min-h-11 min-w-0 items-start gap-2 break-words py-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
              {COMPANY.address}
            </li>
            <li>
              <a
                href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}
                className="flex min-h-11 min-w-0 items-center gap-2 break-words hover:text-gold"
              >
                <Phone className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                {COMPANY.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${COMPANY.email}`} className="flex min-h-11 min-w-0 items-center gap-2 hover:text-gold">
                <Mail className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                <span className="min-w-0 break-all">{COMPANY.email}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex min-w-0 flex-col gap-2 py-5 text-sm text-white/75 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0">© {new Date().getFullYear()} TLB Enterprise. All rights reserved.</p>
          <p className="min-w-0">Payments are arranged offline — invoices and purchase orders welcome.</p>
        </div>
      </div>
    </footer>
  );
}
