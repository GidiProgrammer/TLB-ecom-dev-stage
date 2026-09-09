# TLB Lab Mart

Build an e-commerce platform for TLB Enterprise, a laboratory and scientific supplies company in Accra, Ghana. Use https://www.labmartgh.com as a direct design and structural reference — match its layout, page structure, and professional B2B clinical aesthetic (clean, blue/white color scheme with a red/orange accent for CTAs, trustworthy and not flashy).
Company name: TLB Enterprise. Contact info: Pokuase-Nsawam Road, Accra | +233 24 744 6730 | tlbenterprise272@gmail.com
Header/Navigation
TLB Enterprise logo on the left
Search bar with an integrated "All Categories" dropdown filter (search scoped to selected category)
Right-side icon row: Cart (with item count badge), Request a Quote (with count badge, links to a "My Quotes" list), Sign In button
Category dropdown/mega-menu listing: Analytical Chemicals, Laboratory Equipment, Glassware, Household Chemicals, Industrial Chemicals, Furniture & Fittings, Personal Protective Equipment, Consumables
Mobile: hamburger menu triggering an offcanvas nav, collapsible search below header
Homepage
Hero banner: "Experience TLB Enterprise" with a promotional strip (e.g. "Up to 25% off first institutional order")
Featured product categories grid (Analytical Chemicals, Laboratory Equipment, Glassware, Household Chemicals, Industrial Chemicals, Furniture & Fittings)
"Trust" strip: nationwide supply coverage, reliable delivery, secure payments, technical support
Best-selling products carousel
"Our Solutions" section — brief description: "At TLB Enterprise, you'll find the best quality analytical chemicals and laboratory supplies at a fair price, for one-time buyers and bulk institutional orders alike"
Client testimonials section with star ratings
Newsletter signup
Shop / Catalog
Full product listing page with left-side category filter menu
Category landing pages with description and sub-category breakdown per category
Product detail page: image gallery, name, specs/description, price, stock status, "Add to Cart," "Add to Quote," related/complementary products section
Cart & Checkout
Cart page with quantity adjustment
Checkout page with shipping/institution details form (no payment processing yet)
Quote System
"My Quotes" page listing quote requests and their status
"My Experiments" page (saved product-list feature tied to the account)
Account
Login and sign-up pages, with account type selection (Individual or Institutional — extra fields for institution name/type when Institutional is selected)
Account dashboard ("My Account") showing order history and saved quotes
Company / Content pages
About Us — company story: "years of experience providing quality analytical chemicals and lab supplies to one-time and bulk institutional buyers"
How We Work
Why Work With Us
Careers
Our Social Responsibility
Brands (partner/brand showcase grid)
News/Knowledge Hub — blog-style article listing with individual article pages
Contact Us page with a form, the address/phone/email above, and a "Schedule a Meeting" option
Admin (basic shell only, doesn't need to be functional yet)
Product list, order list, pending institutional account approvals list
Use Supabase for database and auth. Don't implement payment processing — that will be handled separately.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e19d5b65-2ade-41fe-b3c2-0e8f5c6fe839).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
