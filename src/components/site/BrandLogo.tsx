import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

export function BrandLogo({
  className,
  decorative = false,
}: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <img
      src={logo}
      alt={decorative ? "" : "TLB Enterprise"}
      className={cn("h-11 w-auto object-contain", className)}
      {...(decorative ? { "aria-hidden": true } : {})}
    />
  );
}
