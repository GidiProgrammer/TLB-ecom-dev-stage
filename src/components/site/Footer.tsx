import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronRight,
  FileText,
  Headphones,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShoppingCart,
} from "lucide-react";
import { COMPANY } from "@/lib/catalog-utils";
import { useCategories } from "@/lib/queries/products";
import { BrandLogo } from "@/components/site/BrandLogo";

const phoneHref = `tel:${COMPANY.phone.replace(/[^\d+]/g, "")}`;

function columnTitle(label: string) {
  return (
    <h3 className="text-sm font-semibold text-white">
      {label}
      <span className="mt-2 block h-0.5 w-8 rounded-full bg-gold" aria-hidden />
    </h3>
  );
}

export function Footer() {
  const { data: categories } = useCategories();

  return (
    <footer className="mt-8 max-w-full">
      <div className="bg-background">
        <div className="container-page pb-6">
          <div className="flex flex-col gap-5 rounded-card bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:gap-6 lg:px-6">
            <div className="flex min-w-0 items-start gap-3 lg:max-w-sm lg:flex-1">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Headphones className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Need help or a quotation?</p>
                <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                  Our team is ready to assist with product selection, pricing and bulk orders.
                </p>
              </div>
            </div>
            <div className="hidden h-10 w-px bg-border lg:block" aria-hidden />
            <a href={phoneHref} className="flex items-center gap-3 text-sm hover:text-primary">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Phone className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold text-foreground">Call us</span>
                <span className="text-muted-foreground">{COMPANY.phone}</span>
              </span>
            </a>
            <a href={`mailto:${COMPANY.email}`} className="flex min-w-0 items-center gap-3 text-sm hover:text-primary">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Mail className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-foreground">Email us</span>
                <span className="block truncate text-muted-foreground">{COMPANY.email}</span>
              </span>
            </a>
            <Link
              to="/quote"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-gold px-5 text-sm font-semibold text-gold-foreground hover:bg-gold-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MessageSquare className="h-4 w-4" aria-hidden />
              Request a quote
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-deep-purple text-white">
        <div className="container-page grid gap-10 py-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(0,0.9fr)] lg:gap-8">
          <div className="min-w-0">
            <BrandLogo className="h-14" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/80">
              Supplier of laboratory chemicals, equipment, glassware and safety products to institutions, industry and
              healthcare across Ghana.
            </p>
            <ul className="mt-6 space-y-4 text-sm">
              <li className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                  <ShoppingCart className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">Order</span>
                  <span className="text-white/75">Buy from listed catalogue pricing.</span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                  <FileText className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">Quote</span>
                  <span className="text-white/75">Request pricing for items or quantities that need a quotation.</span>
                </span>
              </li>
            </ul>
          </div>

          <div className="min-w-0">
            {columnTitle("Product categories")}
            <ul className="mt-4 space-y-1 text-sm text-white/80">
              {(categories ?? []).map((category) => (
                <li key={category.slug}>
                  <Link
                    to="/shop"
                    search={{ category: category.slug }}
                    className="flex items-center justify-between gap-3 py-1.5 hover:text-white"
                  >
                    <span className="min-w-0">{category.name}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/45" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            {columnTitle("Company")}
            <ul className="mt-4 space-y-1 text-sm text-white/80">
              <li>
                <Link to="/about" className="inline-flex py-1.5 hover:text-white">
                  About us
                </Link>
              </li>
              <li>
                <Link to="/quote" className="inline-flex py-1.5 hover:text-white">
                  Request a quote
                </Link>
              </li>
              <li>
                <Link to="/account" activeOptions={{ exact: true }} className="inline-flex py-1.5 hover:text-white">
                  Account dashboard
                </Link>
              </li>
              <li>
                <Link to="/contact" className="inline-flex py-1.5 hover:text-white">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div className="min-w-0">
            {columnTitle("Support")}
            <ul className="mt-4 space-y-1 text-sm text-white/80">
              <li>
                <Link to="/" hash="ordering" className="inline-flex py-1.5 hover:text-white">
                  Ordering & payment
                </Link>
              </li>
              <li>
                <Link to="/contact" className="inline-flex py-1.5 hover:text-white">
                  Delivery information
                </Link>
              </li>
              <li>
                <Link to="/contact" className="inline-flex py-1.5 hover:text-white">
                  Returns & refunds
                </Link>
              </li>
              <li>
                <Link to="/contact" className="inline-flex py-1.5 hover:text-white">
                  Frequently asked questions
                </Link>
              </li>
            </ul>
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Get in touch</h3>
            <ul className="mt-3 space-y-3 text-sm text-white/80">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {COMPANY.address}
              </li>
              <li>
                <a href={phoneHref} className="flex items-center gap-3 hover:text-white">
                  <Phone className="h-4 w-4 shrink-0" aria-hidden />
                  {COMPANY.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${COMPANY.email}`} className="flex items-center gap-3 hover:text-white">
                  <Mail className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="break-all">{COMPANY.email}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/15">
          <div className="container-page flex flex-col gap-3 py-4 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} TLB Enterprise. All rights reserved.</p>
            <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link to="/contact" className="hover:text-white">
                Privacy Policy
              </Link>
              <span aria-hidden>|</span>
              <Link to="/contact" className="hover:text-white">
                Terms of Service
              </Link>
              <span aria-hidden>|</span>
              <Link to="/contact" className="hover:text-white">
                Cookie Policy
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
