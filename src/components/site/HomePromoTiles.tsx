import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import imgEquipment from "@/assets/promo-equipment-purple.png";
import imgLab from "@/assets/promo-scientist-white.png";
import { Button } from "@/components/ui/button";

const goldCta =
  "mt-5 h-11 w-fit bg-gold px-5 text-gold-foreground hover:bg-gold-hover focus-visible:ring-gold";

export function HomePromoTiles() {
  return (
    <section className="container-page pb-10" aria-labelledby="home-editorial-heading">
      <h2 id="home-editorial-heading" className="sr-only">
        Featured catalogue ranges
      </h2>
      <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-5">
        <article className="relative flex min-h-[22rem] flex-col overflow-hidden rounded-card bg-deep-purple text-white lg:min-h-[24rem]">
          <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-8 sm:px-8 lg:min-h-[24rem] lg:w-[52%] lg:py-10 lg:pl-10 lg:pr-8">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-white">Laboratory equipment</p>
            <h3 className="mt-3 text-[1.75rem] font-bold leading-[1.12] tracking-tight text-white sm:text-[2rem]">
              Equip your laboratory for <span className="text-gold">better results.</span>
            </h3>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/88">
              Explore laboratory equipment and analytical instruments in the TLB catalogue.
            </p>
            <Button asChild className={`${goldCta} focus-visible:ring-offset-deep-purple`}>
              <Link to="/shop" search={{ category: "laboratory-equipment" }}>
                Explore equipment
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="relative min-h-64 lg:absolute lg:inset-y-0 lg:right-0 lg:w-[62%]">
            <img
              src={imgEquipment}
              alt="Analytical balance, centrifuge and water bath"
              className="absolute inset-0 h-full w-full object-cover object-[72%_center]"
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-deep-purple to-transparent lg:hidden" aria-hidden />
            <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-3/5 bg-gradient-to-r from-deep-purple via-deep-purple/75 to-transparent lg:block" aria-hidden />
          </div>
        </article>

        <article className="relative flex min-h-[22rem] flex-col overflow-hidden rounded-card bg-card lg:min-h-[24rem]">
          <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-8 sm:px-8 lg:min-h-[24rem] lg:w-[54%] lg:py-10 lg:pl-8 lg:pr-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Laboratory essentials</p>
            <h3 className="mt-3 text-[1.75rem] font-bold leading-[1.12] tracking-tight text-foreground sm:text-[2rem]">
              Everyday laboratory supplies
            </h3>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Discover consumables, analytical chemicals, glassware and related catalogue ranges.
            </p>
            <Button asChild className={goldCta}>
              <Link to="/shop">
                Shop supplies
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="relative min-h-64 lg:absolute lg:inset-y-0 lg:right-0 lg:w-[58%]">
            <img
              src={imgLab}
              alt="Scientist pipetting at a laboratory bench beside glassware and a microscope"
              className="absolute inset-0 h-full w-full object-cover object-[70%_center]"
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white to-transparent lg:hidden" aria-hidden />
            <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/2 bg-gradient-to-r from-white via-white/80 to-transparent lg:block" aria-hidden />
          </div>
        </article>
      </div>
    </section>
  );
}
