import { Link } from "@tanstack/react-router";
import imgEquipment from "@/assets/cat-laboratory-equipment.jpg";
import imgLab from "@/assets/hero-lab.jpg";
import { Button } from "@/components/ui/button";

const goldCta =
  "mt-4 w-fit bg-gold text-gold-foreground hover:bg-gold-hover focus-visible:ring-gold";

export function HomePromoTiles() {
  return (
    <section className="container-page pb-10" aria-labelledby="home-editorial-heading">
      <h2 id="home-editorial-heading" className="sr-only">
        Featured catalogue ranges
      </h2>
      <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-5">
        <article className="flex flex-col overflow-hidden rounded-lg bg-deep-purple text-white shadow-card lg:min-h-[22rem] lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-col justify-center px-6 py-6 sm:px-8 lg:py-7 lg:pr-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Laboratory equipment</p>
            <h3 className="mt-2 max-w-[14ch] text-[1.65rem] font-bold leading-[1.12] tracking-tight text-white sm:text-[2rem]">
              Equip your laboratory
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-snug text-white/88">
              Explore laboratory equipment and analytical instruments in the TLB catalogue.
            </p>
            <Button
              asChild
              className={`${goldCta} focus-visible:ring-offset-deep-purple`}
            >
              <Link to="/shop" search={{ category: "laboratory-equipment" }}>
                Explore equipment
              </Link>
            </Button>
          </div>
          <div className="px-4 pb-4 lg:w-[52%] lg:px-5 lg:py-5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-white">
              <img
                src={imgEquipment}
                alt="Analytical balance, centrifuge and water bath"
                className="absolute inset-0 h-full w-full object-contain object-center p-1"
              />
            </div>
          </div>
        </article>

        <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-white shadow-card lg:min-h-[22rem]">
          <div className="relative min-h-48 flex-1 sm:min-h-56">
            <img
              src={imgLab}
              alt="Scientist pipetting at a laboratory bench beside glassware and a microscope"
              className="absolute inset-0 h-full w-full object-cover object-[28%_center]"
            />
          </div>
          <div className="border-t-4 border-gold bg-white px-6 py-4 sm:px-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Laboratory essentials</p>
            <h3 className="mt-1.5 text-2xl font-bold leading-tight tracking-tight text-foreground">
              Everyday laboratory supplies
            </h3>
            <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
              Discover consumables, analytical chemicals, glassware and related catalogue ranges.
            </p>
            <Button asChild className={goldCta}>
              <Link to="/shop">Shop supplies</Link>
            </Button>
          </div>
        </article>
      </div>
    </section>
  );
}
