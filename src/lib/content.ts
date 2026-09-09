export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  readTime: string;
  body: string[];
};

export const articles: Article[] = [
  {
    slug: "storing-analytical-reagents-in-tropical-climates",
    title: "Storing analytical reagents safely in tropical climates",
    excerpt:
      "Heat and humidity shorten reagent shelf life faster than most laboratories expect. Here is how to protect your stock in Ghana's climate.",
    date: "2026-07-18",
    category: "Laboratory Practice",
    readTime: "5 min read",
    body: [
      "Ambient temperatures in much of Ghana sit well above the 20–25 °C storage window printed on most reagent labels. Combined with relative humidity that regularly exceeds 80%, this quietly degrades hygroscopic solids, shifts the concentration of volumetric solutions, and shortens the useful life of prepared media.",
      "Start with segregation. Acids, bases, oxidisers and flammables each need their own storage zone, and flammables belong in a vented safety cabinet rather than an open shelf. Segregation is a safety requirement first, but it also reduces cross-contamination that shows up later as unexplained blank drift.",
      "Control what you can afford to control. A dedicated air-conditioned reagent room is ideal; where that is not possible, a well-insulated internal room with an extractor and a cheap max/min thermometer will still beat an external store with a metal roof. Keep amber glass for light-sensitive reagents and never decant into unlabelled containers.",
      "Finally, run stock on a first-expired-first-out basis and record opening dates on the bottle. Most laboratories discover expired standards only when a calibration fails — a two-minute labelling habit prevents a full day of troubleshooting.",
    ],
  },
  {
    slug: "choosing-an-analytical-balance",
    title: "Choosing an analytical balance for your laboratory",
    excerpt:
      "Readability is only part of the story. Draft shields, calibration mode and bench conditions decide whether you actually get the accuracy you paid for.",
    date: "2026-06-02",
    category: "Equipment Guides",
    readTime: "6 min read",
    body: [
      "A 0.1 mg balance on an unstable bench performs worse than a 1 mg balance installed correctly. Before comparing models, look at where the instrument will live: a solid, vibration-free bench away from doors, air conditioning vents and direct sunlight.",
      "Internal calibration is worth the premium for laboratories that weigh across the day, because it corrects for temperature drift automatically. External calibration is acceptable when weighing sessions are short and a certified mass set is available.",
      "Consider throughput too. Balances with fast stabilisation times and side-opening draft shields cut minutes off every batch, which matters in teaching laboratories where dozens of students share one instrument.",
      "Whatever you buy, budget for annual servicing and a traceable calibration certificate. We supply both nationwide, including for instruments not purchased from us.",
    ],
  },
  {
    slug: "ppe-programme-for-institutional-laboratories",
    title: "Building a PPE programme that people actually follow",
    excerpt:
      "Compliance improves when protective equipment fits, is available at the point of use, and is replaced on a predictable schedule.",
    date: "2026-04-22",
    category: "Safety",
    readTime: "4 min read",
    body: [
      "The most common reason laboratory staff skip gloves or goggles is not attitude — it is availability. When the store room is locked or the only remaining size is XL, the safe option becomes the inconvenient one.",
      "Place consumable PPE at the point of use, hold a visible buffer stock, and set a reorder trigger rather than ordering when the last box is opened. Stocking two or three glove sizes costs marginally more and dramatically increases use.",
      "Match the glove to the chemistry. Nitrile is a good general-purpose choice, but extended contact with certain solvents requires a heavier chemical-resistant glove with a documented breakthrough time.",
      "Review the programme once a year with the people who use it. Standing orders that never change usually mean nobody is checking.",
    ],
  },
  {
    slug: "planning-a-laboratory-fit-out",
    title: "Planning a laboratory fit-out: a practical checklist",
    excerpt:
      "Benching, extraction, services and workflow decisions made on paper are far cheaper than changes made after installation.",
    date: "2026-02-11",
    category: "Facilities",
    readTime: "7 min read",
    body: [
      "Start from workflow, not furniture. Map how samples enter the laboratory, where they are prepared, analysed and stored, and where waste leaves. The layout should let a sample travel in one direction without crossing clean areas.",
      "Fume cupboard position drives everything else. It needs a short duct run to the outside, must not sit opposite a door or under an air conditioning outlet, and needs enough clear floor in front for the operator.",
      "Specify worktops by chemistry, not by price. Epoxy resin handles aggressive reagents and heat; laminate is fine for dry instrument benches and costs considerably less. Mixing surfaces by zone keeps the budget realistic.",
      "Plan services early — water, drainage, gas, and enough power outlets above bench height. Retrofitting a single socket into an installed bench run is one of the most expensive small jobs in any fit-out.",
    ],
  },
  {
    slug: "why-certificates-of-analysis-matter",
    title: "Why a certificate of analysis matters for every batch",
    excerpt:
      "A CoA is the difference between a reagent you can defend in an audit and one you simply hope is correct.",
    date: "2025-12-05",
    category: "Quality",
    readTime: "4 min read",
    body: [
      "A certificate of analysis records the actual measured values for a specific production batch — assay, impurities, water content — rather than the generic specification printed on the label.",
      "For accredited laboratories this is not optional. ISO/IEC 17025 assessors will ask how you verify the quality of critical consumables, and a batch CoA filed against the delivery note is the simplest possible answer.",
      "Even outside accreditation, the CoA is your first diagnostic when results drift. If the reagent is within spec, you can stop suspecting it and look at the method or the instrument.",
      "Every analytical grade product we supply ships with its batch certificate, and we keep copies on file so replacements can be traced years later.",
    ],
  },
  {
    slug: "bulk-ordering-for-institutions",
    title: "Bulk ordering for institutions without tying up your budget",
    excerpt:
      "Call-off orders and scheduled delivery let institutions lock in pricing while paying and storing in manageable stages.",
    date: "2025-10-14",
    category: "Procurement",
    readTime: "5 min read",
    body: [
      "Large one-off purchases create two problems: cash flow pressure and storage pressure. Both are avoidable with a call-off arrangement, where the total quantity and price are agreed once and released in scheduled instalments.",
      "This works particularly well for teaching laboratories with term-based demand, and for facilities where reagent shelf life is shorter than the procurement cycle.",
      "Ask for a written quotation that lists unit price, pack size, lead time and validity period. That document is what makes internal approval straightforward.",
      "Our quote system is built for exactly this — add the items you need, submit the request, and we respond with institutional pricing and a delivery schedule.",
    ],
  },
];

export const articleBySlug = (slug: string) => articles.find((a) => a.slug === slug);

export const brands = [
  { name: "LabChem", focus: "Analytical reagents & solvents" },
  { name: "BoroLab", focus: "Borosilicate 3.3 glassware" },
  { name: "PrecisionLab", focus: "Balances & weighing systems" },
  { name: "SpinTech", focus: "Centrifuges & separation" },
  { name: "ThermoLine", focus: "Ovens, incubators & furnaces" },
  { name: "OptiView", focus: "Microscopy & optics" },
  { name: "SpectraOne", focus: "Spectroscopy instruments" },
  { name: "AquaMeter", focus: "Water & electrochemistry" },
  { name: "SafeGrip", focus: "Personal protective equipment" },
  { name: "BenchPro", focus: "Laboratory consumables" },
  { name: "LabFit GH", focus: "Laboratory furniture & fit-out" },
  { name: "AquaPure", focus: "Water treatment chemicals" },
];

export const testimonials = [
  {
    name: "Dr. Ama Ofori",
    role: "Head of Chemistry, Technical University",
    rating: 5,
    quote:
      "TLB Enterprise has supplied our teaching laboratory for four academic years. Orders arrive complete, certificates are always attached, and their team helps us plan around the semester calendar.",
  },
  {
    name: "Kwabena Mensah",
    role: "QC Manager, Beverage Manufacturer",
    rating: 5,
    quote:
      "We moved our reagent supply to TLB after repeated stock-outs elsewhere. Lead times are predictable and the pricing on bulk solvents is genuinely competitive.",
  },
  {
    name: "Sister Efua Danso",
    role: "Laboratory Coordinator, District Hospital",
    rating: 4,
    quote:
      "Their PPE and consumables pricing made a real difference to our budget, and they delivered to Koforidua within two days of the purchase order.",
  },
  {
    name: "Ing. Yaw Boateng",
    role: "Process Engineer, Mining Services",
    rating: 5,
    quote:
      "Bulk assay reagents delivered on schedule with correct documentation every time. The technical support on instrument selection was an unexpected bonus.",
  },
];
