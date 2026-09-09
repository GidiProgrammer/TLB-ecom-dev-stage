import imgAnalytical from "@/assets/cat-analytical-chemicals.jpg";
import imgEquipment from "@/assets/cat-laboratory-equipment.jpg";
import imgGlassware from "@/assets/cat-glassware.jpg";
import imgHousehold from "@/assets/cat-household-chemicals.jpg";
import imgIndustrial from "@/assets/cat-industrial-chemicals.jpg";
import imgFurniture from "@/assets/cat-furniture-fittings.jpg";
import imgPpe from "@/assets/cat-ppe.jpg";
import imgConsumables from "@/assets/cat-consumables.jpg";

export type Category = {
  slug: string;
  name: string;
  blurb: string;
  description: string;
  image: string;
  subcategories: { name: string; note: string }[];
};

export type Product = {
  id: string;
  name: string;
  category: string; // category slug
  subcategory: string;
  price: number;
  unit: string;
  brand: string;
  stock: "in-stock" | "low-stock" | "backorder";
  bestSeller?: boolean;
  description: string;
  specs: { label: string; value: string }[];
};

export const categories: Category[] = [
  {
    slug: "analytical-chemicals",
    name: "Analytical Chemicals",
    blurb: "Reagents, solvents, indicators and standards for accurate analysis.",
    description:
      "Analytical grade reagents, AR/HPLC solvents, volumetric standards and indicators sourced from trusted manufacturers and supplied with certificates of analysis. Suitable for teaching laboratories, quality control units, research institutions and industry.",
    image: imgAnalytical,
    subcategories: [
      { name: "Acids & Bases", note: "AR grade mineral acids, hydroxides and buffers" },
      { name: "Solvents", note: "HPLC, AR and technical grade solvents" },
      { name: "Indicators & Stains", note: "Titration indicators, microscopy stains" },
      { name: "Reference Standards", note: "Volumetric solutions and calibration standards" },
      { name: "Culture Media", note: "Dehydrated media, agar bases and supplements" },
    ],
  },
  {
    slug: "laboratory-equipment",
    name: "Laboratory Equipment",
    blurb: "Instruments and benchtop equipment for routine and research work.",
    description:
      "Benchtop and floor-standing laboratory instruments — from balances and centrifuges to incubators, spectrophotometers and water baths — with installation guidance and after-sales technical support nationwide.",
    image: imgEquipment,
    subcategories: [
      { name: "Balances & Scales", note: "Analytical, precision and moisture balances" },
      { name: "Heating & Drying", note: "Ovens, hot plates, muffle furnaces" },
      { name: "Separation", note: "Centrifuges, shakers, magnetic stirrers" },
      { name: "Measurement", note: "pH meters, conductivity meters, spectrophotometers" },
      { name: "Microscopy", note: "Compound and stereo microscopes with accessories" },
    ],
  },
  {
    slug: "glassware",
    name: "Glassware",
    blurb: "Borosilicate volumetric and general purpose laboratory glassware.",
    description:
      "Class A and Class B borosilicate 3.3 glassware for volumetric, distillation and general bench work. Individually inspected, packed for safe transit and available in bulk quantities for institutional orders.",
    image: imgGlassware,
    subcategories: [
      { name: "Volumetric", note: "Flasks, pipettes, burettes, cylinders" },
      { name: "General Purpose", note: "Beakers, conical flasks, funnels" },
      { name: "Distillation", note: "Condensers, round bottom flasks, joints" },
      { name: "Storage", note: "Reagent bottles, desiccators, dropping bottles" },
    ],
  },
  {
    slug: "household-chemicals",
    name: "Household Chemicals",
    blurb: "Cleaning and sanitation chemistry for homes and facilities.",
    description:
      "Detergent bases, disinfectants, sanitisers and cleaning concentrates supplied in retail and bulk pack sizes for households, schools, hotels and facility management companies.",
    image: imgHousehold,
    subcategories: [
      { name: "Disinfectants", note: "Surface and instrument disinfectants" },
      { name: "Detergent Bases", note: "SLS, CDEA, thickeners and fragrances" },
      { name: "Sanitisers", note: "Hand and surface sanitising solutions" },
      { name: "Bleaches", note: "Sodium hypochlorite and stabilised bleach" },
    ],
  },
  {
    slug: "industrial-chemicals",
    name: "Industrial Chemicals",
    blurb: "Bulk process chemicals for manufacturing and water treatment.",
    description:
      "Bulk industrial chemistry for water treatment, mining, food processing and manufacturing — supplied in drums, sacks and IBCs with safety data sheets and scheduled delivery across Ghana.",
    image: imgIndustrial,
    subcategories: [
      { name: "Water Treatment", note: "Coagulants, chlorine, pH correction" },
      { name: "Process Chemicals", note: "Caustics, acids, salts in bulk packs" },
      { name: "Solvents (Bulk)", note: "Drummed technical solvents" },
      { name: "Mining Reagents", note: "Assay and flotation chemicals" },
    ],
  },
  {
    slug: "furniture-fittings",
    name: "Furniture & Fittings",
    blurb: "Laboratory benches, fume hoods, cabinets and fit-out services.",
    description:
      "Chemical-resistant laboratory furniture and fit-out — island benches, wall benches, fume cupboards, safety cabinets and sinks — designed, supplied and installed for schools, hospitals and industrial laboratories.",
    image: imgFurniture,
    subcategories: [
      { name: "Benching", note: "Island, wall and mobile benches" },
      { name: "Fume Cupboards", note: "Ducted and ductless extraction" },
      { name: "Storage", note: "Chemical and flammable safety cabinets" },
      { name: "Sinks & Fittings", note: "Epoxy sinks, taps, gas and service fittings" },
    ],
  },
  {
    slug: "personal-protective-equipment",
    name: "Personal Protective Equipment",
    blurb: "Certified protection for laboratory and industrial environments.",
    description:
      "Certified PPE for laboratory, clinical and industrial use — lab coats, gloves, eye protection, respirators and safety footwear — available in institutional pack sizes.",
    image: imgPpe,
    subcategories: [
      { name: "Hand Protection", note: "Nitrile, latex and chemical gloves" },
      { name: "Eye & Face", note: "Goggles, face shields, safety glasses" },
      { name: "Body Protection", note: "Lab coats, coveralls, aprons" },
      { name: "Respiratory", note: "N95, FFP2 and cartridge respirators" },
    ],
  },
  {
    slug: "consumables",
    name: "Consumables",
    blurb: "Everyday disposables that keep the bench running.",
    description:
      "Plastics, filtration media, sample containers and other single-use laboratory consumables kept in stock for fast repeat supply.",
    image: imgConsumables,
    subcategories: [
      { name: "Plasticware", note: "Tubes, tips, petri dishes, containers" },
      { name: "Filtration", note: "Filter papers, membranes, syringe filters" },
      { name: "Sampling", note: "Swabs, sample bottles, sterile bags" },
      { name: "Bench Supplies", note: "Wipes, labels, parafilm, tubing" },
    ],
  },
];

export const categoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);

const p = (
  id: string,
  name: string,
  category: string,
  subcategory: string,
  price: number,
  unit: string,
  brand: string,
  stock: Product["stock"],
  description: string,
  specs: [string, string][],
  bestSeller = false,
): Product => ({
  id,
  name,
  category,
  subcategory,
  price,
  unit,
  brand,
  stock,
  bestSeller,
  description,
  specs: specs.map(([label, value]) => ({ label, value })),
});

export const products: Product[] = [
  p(
    "ac-001",
    "Sulphuric Acid 98% AR Grade",
    "analytical-chemicals",
    "Acids & Bases",
    420,
    "2.5 L bottle",
    "LabChem",
    "in-stock",
    "Analytical reagent grade sulphuric acid for titrimetry, digestion and general analytical use. Supplied with a batch certificate of analysis.",
    [
      ["Assay", "≥ 98%"],
      ["Grade", "Analytical Reagent (AR)"],
      ["CAS No.", "7664-93-9"],
      ["Pack size", "2.5 L amber bottle"],
    ],
    true,
  ),
  p(
    "ac-002",
    "Methanol HPLC Grade",
    "analytical-chemicals",
    "Solvents",
    560,
    "2.5 L bottle",
    "PureSolv",
    "in-stock",
    "High purity HPLC grade methanol, filtered to 0.2 µm with low UV absorbance for chromatography and spectroscopy applications.",
    [
      ["Purity", "≥ 99.9%"],
      ["UV cutoff", "205 nm"],
      ["Filtration", "0.2 µm"],
      ["Pack size", "2.5 L"],
    ],
    true,
  ),
  p(
    "ac-003",
    "Phenolphthalein Indicator Solution 1%",
    "analytical-chemicals",
    "Indicators & Stains",
    95,
    "500 mL",
    "LabChem",
    "in-stock",
    "Ready-to-use 1% phenolphthalein indicator in ethanol for acid–base titrations in teaching and QC laboratories.",
    [
      ["Concentration", "1% w/v in ethanol"],
      ["pH range", "8.2 – 10.0"],
      ["Pack size", "500 mL dropper bottle"],
    ],
  ),
  p(
    "ac-004",
    "Sodium Hydroxide Pellets AR",
    "analytical-chemicals",
    "Acids & Bases",
    310,
    "1 kg",
    "LabChem",
    "in-stock",
    "Analytical reagent grade sodium hydroxide pellets for preparation of standard solutions and general laboratory use.",
    [
      ["Assay", "≥ 97%"],
      ["Form", "Pellets"],
      ["CAS No.", "1310-73-2"],
      ["Pack size", "1 kg HDPE"],
    ],
  ),
  p(
    "ac-005",
    "Buffer Solution pH 7.00 (colour coded)",
    "analytical-chemicals",
    "Reference Standards",
    120,
    "500 mL",
    "CalibraStd",
    "in-stock",
    "Traceable pH 7.00 calibration buffer at 25 °C, colour coded green to prevent cross-contamination during meter calibration.",
    [
      ["Accuracy", "± 0.01 pH at 25 °C"],
      ["Traceability", "NIST traceable"],
      ["Pack size", "500 mL"],
    ],
    true,
  ),
  p(
    "ac-006",
    "Nutrient Agar Dehydrated Media",
    "analytical-chemicals",
    "Culture Media",
    480,
    "500 g",
    "MicroCulture",
    "low-stock",
    "General purpose dehydrated nutrient agar for cultivation of non-fastidious organisms in microbiology laboratories.",
    [
      ["Preparation", "28 g/L"],
      ["Final pH", "7.4 ± 0.2 at 25 °C"],
      ["Pack size", "500 g"],
    ],
  ),
  p(
    "le-001",
    "Analytical Balance 220 g / 0.1 mg",
    "laboratory-equipment",
    "Balances & Scales",
    12500,
    "unit",
    "PrecisionLab",
    "in-stock",
    "Internal-calibration analytical balance with draft shield, RS-232 output and overload protection. Ideal for gravimetric analysis and standard preparation.",
    [
      ["Capacity", "220 g"],
      ["Readability", "0.1 mg"],
      ["Calibration", "Internal automatic"],
      ["Warranty", "24 months"],
    ],
    true,
  ),
  p(
    "le-002",
    "Benchtop Centrifuge 4000 rpm",
    "laboratory-equipment",
    "Separation",
    7800,
    "unit",
    "SpinTech",
    "in-stock",
    "Compact benchtop centrifuge with swing-out rotor, digital timer and lid interlock for clinical and teaching laboratories.",
    [
      ["Max speed", "4000 rpm"],
      ["Rotor", "8 × 15 mL swing-out"],
      ["Timer", "1 – 99 min"],
      ["Power", "220 V / 50 Hz"],
    ],
    true,
  ),
  p(
    "le-003",
    "Laboratory Hot Air Oven 50 L",
    "laboratory-equipment",
    "Heating & Drying",
    9400,
    "unit",
    "ThermoLine",
    "in-stock",
    "Forced-convection drying oven with digital PID control and stainless steel chamber for drying, sterilisation and moisture determination.",
    [
      ["Chamber volume", "50 L"],
      ["Temperature range", "Ambient +10 °C to 250 °C"],
      ["Control", "Digital PID ± 1 °C"],
    ],
  ),
  p(
    "le-004",
    "Digital pH Meter with Electrode",
    "laboratory-equipment",
    "Measurement",
    2650,
    "unit",
    "AquaMeter",
    "in-stock",
    "Benchtop pH/mV meter with automatic temperature compensation, three-point calibration and refillable glass electrode.",
    [
      ["Range", "-2.00 to 16.00 pH"],
      ["Resolution", "0.01 pH"],
      ["ATC", "Included"],
    ],
  ),
  p(
    "le-005",
    "Binocular Compound Microscope 1000x",
    "laboratory-equipment",
    "Microscopy",
    5900,
    "unit",
    "OptiView",
    "backorder",
    "Binocular compound microscope with achromatic objectives, LED Köhler illumination and mechanical stage for clinical and school laboratories.",
    [
      ["Magnification", "40x – 1000x"],
      ["Illumination", "3 W LED, adjustable"],
      ["Head", "Binocular, 30° inclined"],
    ],
  ),
  p(
    "le-006",
    "UV-Vis Spectrophotometer 190–1100 nm",
    "laboratory-equipment",
    "Measurement",
    28500,
    "unit",
    "SpectraOne",
    "low-stock",
    "Split-beam UV-Vis spectrophotometer with 2 nm bandwidth, on-board methods and PC software for water, food and pharmaceutical analysis.",
    [
      ["Wavelength range", "190 – 1100 nm"],
      ["Bandwidth", "2 nm"],
      ["Photometric range", "-0.3 to 3.0 A"],
    ],
  ),
  p(
    "gl-001",
    "Volumetric Flask 250 mL Class A",
    "glassware",
    "Volumetric",
    85,
    "each",
    "BoroLab",
    "in-stock",
    "Class A borosilicate 3.3 volumetric flask with polypropylene stopper, individually calibrated and batch certified.",
    [
      ["Capacity", "250 mL"],
      ["Tolerance", "± 0.15 mL"],
      ["Material", "Borosilicate 3.3"],
    ],
    true,
  ),
  p(
    "gl-002",
    "Beaker Set (50–1000 mL), 6 pieces",
    "glassware",
    "General Purpose",
    240,
    "set of 6",
    "BoroLab",
    "in-stock",
    "Low-form graduated beakers with spout and printed white scale, supplied as a six-piece bench set.",
    [
      ["Sizes", "50, 100, 250, 400, 600, 1000 mL"],
      ["Material", "Borosilicate 3.3"],
      ["Graduation", "Printed enamel"],
    ],
  ),
  p(
    "gl-003",
    "Burette 50 mL Class A with PTFE Stopcock",
    "glassware",
    "Volumetric",
    195,
    "each",
    "BoroLab",
    "in-stock",
    "Class A straight-bore burette with PTFE key stopcock and Schellbach stripe for precise endpoint reading.",
    [
      ["Capacity", "50 mL"],
      ["Subdivision", "0.1 mL"],
      ["Tolerance", "± 0.05 mL"],
    ],
    true,
  ),
  p(
    "gl-004",
    "Liebig Condenser 300 mm",
    "glassware",
    "Distillation",
    320,
    "each",
    "BoroLab",
    "in-stock",
    "Borosilicate Liebig condenser with 24/29 ground glass joints and hose connections for distillation set-ups.",
    [
      ["Jacket length", "300 mm"],
      ["Joints", "24/29"],
      ["Material", "Borosilicate 3.3"],
    ],
  ),
  p(
    "gl-005",
    "Amber Reagent Bottle 1 L",
    "glassware",
    "Storage",
    110,
    "each",
    "BoroLab",
    "in-stock",
    "Amber narrow-mouth reagent bottle with GL45 screw cap and pouring ring for light-sensitive reagents.",
    [
      ["Capacity", "1 L"],
      ["Thread", "GL45"],
      ["Autoclavable", "Yes, 121 °C"],
    ],
  ),
  p(
    "hc-001",
    "Multi-Surface Disinfectant Concentrate",
    "household-chemicals",
    "Disinfectants",
    180,
    "5 L",
    "TLB Clean",
    "in-stock",
    "Broad-spectrum quaternary ammonium disinfectant concentrate for floors, surfaces and sanitary areas. Dilutes up to 1:100.",
    [
      ["Active", "Benzalkonium chloride"],
      ["Dilution", "1:50 – 1:100"],
      ["Pack size", "5 L jerrycan"],
    ],
    true,
  ),
  p(
    "hc-002",
    "Sodium Lauryl Ether Sulphate (SLES 70%)",
    "household-chemicals",
    "Detergent Bases",
    650,
    "25 kg drum",
    "TLB Clean",
    "in-stock",
    "Primary anionic surfactant base for liquid soap, shampoo and dishwashing formulations.",
    [
      ["Active content", "70%"],
      ["Appearance", "Viscous white paste"],
      ["Pack size", "25 kg"],
    ],
  ),
  p(
    "hc-003",
    "Hand Sanitiser Gel 70% Ethanol",
    "household-chemicals",
    "Sanitisers",
    75,
    "5 L",
    "TLB Clean",
    "in-stock",
    "70% ethanol gel sanitiser with glycerine emollient, suitable for clinics, schools and offices. Bulk refill pack.",
    [
      ["Alcohol content", "70% v/v"],
      ["Format", "Gel"],
      ["Pack size", "5 L refill"],
    ],
  ),
  p(
    "hc-004",
    "Sodium Hypochlorite 12% Bleach",
    "household-chemicals",
    "Bleaches",
    140,
    "20 L",
    "TLB Clean",
    "low-stock",
    "Stabilised 12% sodium hypochlorite solution for water treatment, sanitation and heavy-duty cleaning.",
    [
      ["Available chlorine", "12%"],
      ["Pack size", "20 L jerrycan"],
      ["Shelf life", "3 months from production"],
    ],
  ),
  p(
    "ic-001",
    "Aluminium Sulphate (Water Treatment Grade)",
    "industrial-chemicals",
    "Water Treatment",
    980,
    "50 kg bag",
    "AquaPure",
    "in-stock",
    "Granular coagulant for potable and wastewater clarification, supplied in 50 kg moisture-barrier sacks.",
    [
      ["Al2O3 content", "17%"],
      ["Form", "Granular"],
      ["Pack size", "50 kg"],
    ],
    true,
  ),
  p(
    "ic-002",
    "Caustic Soda Flakes 99%",
    "industrial-chemicals",
    "Process Chemicals",
    890,
    "25 kg bag",
    "IndusChem",
    "in-stock",
    "Technical grade sodium hydroxide flakes for soap manufacture, pH correction and industrial cleaning.",
    [
      ["Assay", "99% min"],
      ["Form", "Flakes"],
      ["Pack size", "25 kg"],
    ],
  ),
  p(
    "ic-003",
    "Isopropyl Alcohol Technical Grade",
    "industrial-chemicals",
    "Solvents (Bulk)",
    2100,
    "200 L drum",
    "IndusChem",
    "backorder",
    "Technical grade IPA supplied in sealed 200 L drums for cleaning, degreasing and formulation.",
    [
      ["Purity", "99% min"],
      ["Pack size", "200 L steel drum"],
      ["Hazard class", "Flammable liquid, Class 3"],
    ],
  ),
  p(
    "ic-004",
    "Lead Nitrate Assay Reagent",
    "industrial-chemicals",
    "Mining Reagents",
    1450,
    "25 kg",
    "IndusChem",
    "in-stock",
    "Fire assay reagent used in gold and silver determination for mining laboratories.",
    [
      ["Assay", "≥ 99%"],
      ["Form", "Crystalline"],
      ["Pack size", "25 kg"],
    ],
  ),
  p(
    "ff-001",
    "Island Laboratory Bench 3.0 m (Epoxy Top)",
    "furniture-fittings",
    "Benching",
    18500,
    "unit",
    "LabFit GH",
    "in-stock",
    "Central island bench with monolithic epoxy resin worktop, chemical-resistant frame, reagent shelf and under-bench cabinets. Installation included in Greater Accra.",
    [
      ["Length", "3000 mm"],
      ["Worktop", "19 mm epoxy resin"],
      ["Frame", "Powder-coated steel, C-frame"],
      ["Includes", "Reagent shelf, 4 cabinets"],
    ],
    true,
  ),
  p(
    "ff-002",
    "Ducted Fume Cupboard 1.5 m",
    "furniture-fittings",
    "Fume Cupboards",
    42000,
    "unit",
    "LabFit GH",
    "low-stock",
    "Ducted fume cupboard with laminated safety glass sash, airflow alarm, epoxy liner and integrated services. Ducting and commissioning quoted separately.",
    [
      ["Width", "1500 mm"],
      ["Face velocity", "0.5 m/s"],
      ["Sash", "Vertical, laminated glass"],
    ],
  ),
  p(
    "ff-003",
    "Flammable Storage Safety Cabinet 90 L",
    "furniture-fittings",
    "Storage",
    8600,
    "unit",
    "LabFit GH",
    "in-stock",
    "Double-walled steel safety cabinet with self-closing doors, spill tray and vent ports for flammable solvent storage.",
    [
      ["Capacity", "90 L"],
      ["Doors", "Self-closing, lockable"],
      ["Colour", "Safety yellow"],
    ],
  ),
  p(
    "ff-004",
    "Epoxy Laboratory Sink with Gooseneck Tap",
    "furniture-fittings",
    "Sinks & Fittings",
    3400,
    "set",
    "LabFit GH",
    "in-stock",
    "Chemical-resistant epoxy resin sink supplied with swivel gooseneck mixer tap, strainer and PP waste trap.",
    [
      ["Bowl size", "450 × 400 × 300 mm"],
      ["Material", "Epoxy resin"],
      ["Includes", "Tap, strainer, trap"],
    ],
  ),
  p(
    "pp-001",
    "Nitrile Examination Gloves (Box of 100)",
    "personal-protective-equipment",
    "Hand Protection",
    95,
    "box of 100",
    "SafeGrip",
    "in-stock",
    "Powder-free blue nitrile gloves with textured fingertips, suitable for clinical and chemical handling tasks.",
    [
      ["Material", "Nitrile, powder-free"],
      ["Sizes", "S, M, L, XL"],
      ["Standard", "EN 455 / EN 374"],
    ],
    true,
  ),
  p(
    "pp-002",
    "Laboratory Coat, Poly-Cotton",
    "personal-protective-equipment",
    "Body Protection",
    150,
    "each",
    "SafeGrip",
    "in-stock",
    "Knee-length white laboratory coat with press studs, three pockets and reinforced seams. Institutional pricing on 20+ units.",
    [
      ["Fabric", "65/35 poly-cotton"],
      ["Sizes", "S – XXL"],
      ["Closure", "Press stud"],
    ],
  ),
  p(
    "pp-003",
    "Chemical Splash Goggles",
    "personal-protective-equipment",
    "Eye & Face",
    68,
    "each",
    "SafeGrip",
    "in-stock",
    "Indirect-vent splash goggles with anti-fog polycarbonate lens and adjustable strap.",
    [
      ["Lens", "Polycarbonate, anti-fog"],
      ["Ventilation", "Indirect"],
      ["Standard", "EN 166"],
    ],
  ),
  p(
    "pp-004",
    "N95 Particulate Respirator (Box of 20)",
    "personal-protective-equipment",
    "Respiratory",
    210,
    "box of 20",
    "SafeGrip",
    "low-stock",
    "Cup-shaped N95 respirator with adjustable nose clip and dual head straps for particulate protection.",
    [
      ["Filtration", "≥ 95% of 0.3 µm particles"],
      ["Pack size", "20 pieces"],
      ["Standard", "NIOSH N95"],
    ],
  ),
  p(
    "cn-001",
    "Micropipette Tips 1000 µL (Bag of 1000)",
    "consumables",
    "Plasticware",
    130,
    "bag of 1000",
    "BenchPro",
    "in-stock",
    "Universal-fit polypropylene pipette tips, autoclavable and free from DNase, RNase and pyrogens.",
    [
      ["Volume", "100 – 1000 µL"],
      ["Material", "Virgin polypropylene"],
      ["Pack size", "1000 tips"],
    ],
    true,
  ),
  p(
    "cn-002",
    "Whatman-Type Filter Paper No.1, 110 mm",
    "consumables",
    "Filtration",
    88,
    "pack of 100",
    "BenchPro",
    "in-stock",
    "Qualitative cellulose filter paper, medium retention and flow rate, for routine gravimetric filtration.",
    [
      ["Diameter", "110 mm"],
      ["Retention", "11 µm"],
      ["Pack size", "100 circles"],
    ],
  ),
  p(
    "cn-003",
    "Petri Dishes 90 mm Sterile (Pack of 500)",
    "consumables",
    "Plasticware",
    390,
    "pack of 500",
    "BenchPro",
    "in-stock",
    "Sterile vented polystyrene petri dishes, individually stackable and gamma irradiated.",
    [
      ["Diameter", "90 mm"],
      ["Sterility", "Gamma irradiated"],
      ["Pack size", "500 dishes"],
    ],
  ),
  p(
    "cn-004",
    "Sterile Sample Containers 60 mL (Pack of 100)",
    "consumables",
    "Sampling",
    165,
    "pack of 100",
    "BenchPro",
    "in-stock",
    "Leak-resistant screw-cap sample containers with write-on panel for clinical and water sampling.",
    [
      ["Volume", "60 mL"],
      ["Closure", "Screw cap, leak resistant"],
      ["Pack size", "100 units"],
    ],
  ),
];

export const productById = (id: string) => products.find((x) => x.id === id);

export const productImage = (categorySlug: string) =>
  categoryBySlug(categorySlug)?.image ?? imgConsumables;

export const relatedProducts = (product: Product, limit = 4) =>
  products
    .filter((x) => x.id !== product.id && x.category === product.category)
    .slice(0, limit);

export const bestSellers = () => products.filter((x) => x.bestSeller);

export const formatGHS = (value: number) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 2,
  }).format(value);

export const stockLabel: Record<Product["stock"], string> = {
  "in-stock": "In stock",
  "low-stock": "Low stock",
  backorder: "Available on order",
};

export function searchProducts(query: string, categorySlug = "all") {
  const q = query.trim().toLowerCase();
  return products.filter((item) => {
    const matchCategory = categorySlug === "all" || item.category === categorySlug;
    if (!matchCategory) return false;
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.subcategory.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });
}

export const COMPANY = {
  name: "TLB Enterprise",
  address: "Pokuase-Nsawam Road, Accra",
  phone: "+233 24 744 6730",
  email: "tlbenterprise272@gmail.com",
};
