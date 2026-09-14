import imgAnalytical from "@/assets/cat-analytical-chemicals.jpg";
import imgEquipment from "@/assets/cat-laboratory-equipment.jpg";
import imgGlassware from "@/assets/cat-glassware.jpg";
import imgHousehold from "@/assets/cat-household-chemicals.jpg";
import imgIndustrial from "@/assets/cat-industrial-chemicals.jpg";
import imgFurniture from "@/assets/cat-furniture-fittings.jpg";
import imgPpe from "@/assets/cat-ppe.jpg";
import imgConsumables from "@/assets/cat-consumables.jpg";

const categoryImages: Record<string, string> = {
  "analytical-chemicals": imgAnalytical,
  "laboratory-equipment": imgEquipment,
  glassware: imgGlassware,
  "household-chemicals": imgHousehold,
  "industrial-chemicals": imgIndustrial,
  "furniture-fittings": imgFurniture,
  "personal-protective-equipment": imgPpe,
  consumables: imgConsumables,
};

export const productImage = (categorySlug: string) =>
  categoryImages[categorySlug] ?? imgConsumables;

export const formatGHS = (value: number) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 2,
  }).format(value);

export {
  purchaseUnavailableLabel,
  purchaseUnavailableMessage,
  remainingPurchasableQty,
  stockLabel,
  stockStatus,
  unavailableReason,
  type StockStatus,
} from "@/lib/catalog-stock";

export const COMPANY = {
  name: "TLB Enterprise",
  address: "Pokuase-Nsawam Road, Accra",
  phone: "+233 24 744 6730",
  email: "tlbenterprise272@gmail.com",
};
