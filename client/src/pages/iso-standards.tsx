import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Sidebar } from "@/components/layout/sidebar";
import { 
  FileText, 
  Search, 
  ExternalLink, 
  Shield, 
  Clipboard,
  BookOpen,
  Globe,
  Star,
  Filter
} from "lucide-react";

interface Standard {
  id: string;
  code: string;
  title: string;
  url: string;
  category: string;
  year?: string;
  description?: string;
}

const standards: Standard[] = [
  // ISO Standards - Risk Management & Quality
  {
    id: "iso-14971",
    code: "ISO 14971:2019",
    title: "Medical devices — Application of risk management to medical devices",
    url: "https://www.iso.org/standard/72704.html",
    category: "ISO",
    year: "2019"
  },
  {
    id: "iso-tr-24971",
    code: "ISO/TR 24971:2020",
    title: "Medical devices — Guidance on the application of ISO 14971",
    url: "https://www.iso.org/standard/74437.html",
    category: "ISO",
    year: "2020"
  },
  {
    id: "iso-13485",
    code: "ISO 13485:2016",
    title: "Medical devices — Quality management systems — Requirements for regulatory purposes",
    url: "https://www.iso.org/standard/59752.html",
    category: "ISO",
    year: "2016"
  },

  // ISO 10993 Series - Biological Evaluation
  {
    id: "iso-10993-1",
    code: "ISO 10993-1:2018",
    title: "Biological evaluation of medical devices Part 1: Evaluation and testing within a risk management process",
    url: "https://www.iso.org/standard/68936.html",
    category: "ISO",
    year: "2018"
  },
  {
    id: "iso-10993-2",
    code: "ISO 10993-2:2022",
    title: "Biological evaluation of medical devices Part 2: Animal welfare requirements",
    url: "https://www.iso.org/standard/78866.html",
    category: "ISO",
    year: "2022"
  },
  {
    id: "iso-10993-3",
    code: "ISO 10993-3:2014",
    title: "Biological evaluation of medical devices - Part 3: Tests for genotoxicity, carcinogenicity and reproductive toxicity",
    url: "https://www.iso.org/standard/55614.html",
    category: "ISO",
    year: "2014"
  },
  {
    id: "iso-10993-4",
    code: "ISO 10993-4:2017",
    title: "Biological evaluation of medical devices Part 4: Selection of tests for interactions with blood",
    url: "https://www.iso.org/standard/63448.html",
    category: "ISO",
    year: "2017"
  },
  {
    id: "iso-10993-5",
    code: "ISO 10993-5:2009",
    title: "Biological evaluation of medical devices Part 5: Tests for in vitro cytotoxicity",
    url: "https://www.iso.org/standard/36406.html",
    category: "ISO",
    year: "2009"
  },
  {
    id: "iso-10993-6",
    code: "ISO 10993-6:2016",
    title: "Biological evaluation of medical devices Part 6: Tests for local effects after implantation",
    url: "https://www.iso.org/standard/61089.html",
    category: "ISO",
    year: "2016"
  },
  {
    id: "iso-10993-7",
    code: "ISO 10993-7:2008",
    title: "Biological evaluation of medical devices Part 7: Ethylene oxide sterilization residuals",
    url: "https://www.iso.org/standard/52736.html",
    category: "ISO",
    year: "2008"
  },
  {
    id: "iso-10993-9",
    code: "ISO 10993-9:2019",
    title: "Biological evaluation of medical devices Part 9: Framework for identification and quantification of potential degradation products",
    url: "https://www.iso.org/standard/64580.html",
    category: "ISO",
    year: "2019"
  },
  {
    id: "iso-10993-10",
    code: "ISO 10993-10:2021",
    title: "Biological evaluation of medical devices Part 10: Tests for skin sensitization",
    url: "https://www.iso.org/standard/75279.html",
    category: "ISO",
    year: "2021"
  },
  {
    id: "iso-10993-11",
    code: "ISO 10993-11:2017",
    title: "Biological evaluation of medical devices Part 11: Tests for systemic toxicity",
    url: "https://www.iso.org/standard/68426.html",
    category: "ISO",
    year: "2017"
  },
  {
    id: "iso-10993-12",
    code: "ISO 10993-12:2021",
    title: "Biological evaluation of medical devices Part 12: Sample preparation and reference materials",
    url: "https://www.iso.org/standard/75769.html",
    category: "ISO",
    year: "2021"
  },
  {
    id: "iso-10993-13",
    code: "ISO 10993-13:2010",
    title: "Biological evaluation of medical devices Part 13: Identification and quantification of degradation products from polymeric medical devices",
    url: "https://www.iso.org/standard/44050.html",
    category: "ISO",
    year: "2010"
  },
  {
    id: "iso-10993-14",
    code: "ISO 10993-14:2001",
    title: "Biological evaluation of medical devices Part 14: Identification and quantification of degradation products from ceramics",
    url: "https://www.iso.org/standard/22693.html",
    category: "ISO",
    year: "2001"
  },
  {
    id: "iso-10993-16",
    code: "ISO 10993-16:2017",
    title: "Biological evaluation of medical devices Part 16: Toxicokinetic study design for degradation products and leachables",
    url: "https://www.iso.org/standard/64582.html",
    category: "ISO",
    year: "2017"
  },
  {
    id: "iso-10993-17",
    code: "ISO 10993-17:2009",
    title: "Biological evaluation of medical devices Part 17: Toxicological risk assessment of medical device constituents",
    url: "https://www.iso.org/standard/75323.html",
    category: "ISO",
    year: "2009"
  },
  {
    id: "iso-10993-18",
    code: "ISO 10993-18:2020",
    title: "Biological evaluation of medical devices Part 18: Chemical characterization of medical device materials within a risk management process",
    url: "https://www.iso.org/standard/64750.html",
    category: "ISO",
    year: "2020"
  },
  {
    id: "iso-ts-10993-19",
    code: "ISO/TS 10993-19:2020",
    title: "Biological evaluation of medical devices Part 19: Physico-chemical, morphological and topographical characterization of materials",
    url: "https://www.iso.org/standard/75138.html",
    category: "ISO",
    year: "2020"
  },

  // ISO 11137 Series - Sterilization Radiation
  {
    id: "iso-11137-1",
    code: "ISO 11137-1:2006",
    title: "Sterilization of health care products — Radiation Part 1: Requirements for the development, validation and routine control of a sterilization process for medical devices",
    url: "https://www.iso.org/standard/81721.html",
    category: "ISO",
    year: "2006"
  },
  {
    id: "iso-11137-2",
    code: "ISO 11137-2:2013",
    title: "Sterilization of health care products — Radiation Part 2: Establishing the sterilization dose",
    url: "https://www.iso.org/standard/62442.html",
    category: "ISO",
    year: "2013"
  },
  {
    id: "iso-11137-3",
    code: "ISO 11137-3:2017",
    title: "Sterilization of health care products — Radiation Part 3: Guidance on dosimetric aspects of development, validation and routine control",
    url: "https://www.iso.org/standard/63841.html",
    category: "ISO",
    year: "2017"
  },
  {
    id: "iso-13004",
    code: "ISO 13004:2022",
    title: "Sterilization of health care products — Radiation — Substantiation of selected sterilization dose: Method VDmaxSD",
    url: "https://www.iso.org/standard/82297.html",
    category: "ISO",
    year: "2022"
  },

  // ISO 11737 Series - Sterilization Microbiological
  {
    id: "iso-11737-1",
    code: "ISO 11737-1:2018",
    title: "Sterilization of health care products — Microbiological methods Part 1: Determination of a population of microorganisms on products",
    url: "https://www.iso.org/standard/66451.html",
    category: "ISO",
    year: "2018"
  },
  {
    id: "iso-11737-2",
    code: "ISO 11737-2:2019",
    title: "Sterilization of health care products — Microbiological methods Part 2: Tests of sterility performed in the definition, validation and maintenance of a sterilization process",
    url: "https://www.iso.org/standard/70801.html",
    category: "ISO",
    year: "2019"
  },

  // ISO 11607 Series - Packaging
  {
    id: "iso-11607-1",
    code: "ISO 11607-1:2019",
    title: "Packaging for terminally sterilized medical devices Part 1: Requirements for materials, sterile barrier systems and packaging systems",
    url: "https://www.iso.org/standard/70799.html",
    category: "ISO",
    year: "2019"
  },
  {
    id: "iso-11607-2",
    code: "ISO 11607-2:2019",
    title: "Packaging for terminally sterilized medical devices Part 2: Validation requirements for forming, sealing and assembly processes",
    url: "https://www.iso.org/standard/70800.html",
    category: "ISO",
    year: "2019"
  },

  // Other ISO Standards
  {
    id: "iso-16061",
    code: "ISO 16061:2021",
    title: "Instruments for use in association with non-active surgical implants — General requirements",
    url: "https://www.iso.org/standard/74548.html",
    category: "ISO",
    year: "2021"
  },
  {
    id: "iso-17664-1",
    code: "ISO 17664-1:2021",
    title: "Processing of health care products — Information to be provided by the medical device manufacturer for the processing of medical devices Part 1: Critical and semi-critical medical devices",
    url: "https://www.iso.org/standard/81720.html",
    category: "ISO",
    year: "2021"
  },
  {
    id: "iso-17664-2",
    code: "ISO 17664-2:2021",
    title: "Processing of health care products — Information to be provided by the medical device manufacturer for the processing of medical devices Part 2: Non-critical medical devices",
    url: "https://www.iso.org/standard/74152.html",
    category: "ISO",
    year: "2021"
  },
  {
    id: "iso-17665",
    code: "ISO 17665:2024",
    title: "Sterilization of health care products — Moist heat — Requirements for the development, validation and routine control of a sterilization process for medical devices",
    url: "https://www.iso.org/standard/80271.html",
    category: "ISO",
    year: "2024"
  },
  {
    id: "iso-7000",
    code: "ISO 7000:2019",
    title: "Graphical symbols for use on equipment — Registered symbols",
    url: "https://www.iso.org/standard/78717.html",
    category: "ISO",
    year: "2019"
  },
  {
    id: "iso-7010",
    code: "ISO 7010:2019",
    title: "Graphical symbols — Safety colours and safety signs — Registered safety signs",
    url: "https://www.iso.org/standard/72424.html",
    category: "ISO",
    year: "2019"
  },
  {
    id: "iso-20417",
    code: "ISO 20417:2021",
    title: "Medical devices — Information to be supplied by the manufacturer",
    url: "https://www.iso.org/standard/67943.html",
    category: "ISO",
    year: "2021"
  },
  {
    id: "iso-15223-1",
    code: "ISO 15223-1:2021",
    title: "Medical devices — Symbols to be used with information to be supplied by the manufacturer Part 1: General requirements",
    url: "https://www.iso.org/standard/77326.html",
    category: "ISO",
    year: "2021"
  },
  {
    id: "iso-7153-1",
    code: "ISO 7153-1:2016",
    title: "Surgical instruments — Materials Part 1: Metals",
    url: "https://www.iso.org/standard/66850.html",
    category: "ISO",
    year: "2016"
  },
  {
    id: "iso-14630",
    code: "ISO 14630:2024",
    title: "Non-active surgical implants — General requirements",
    url: "https://www.iso.org/standard/76810.html",
    category: "ISO",
    year: "2024"
  },
  {
    id: "iso-14937",
    code: "ISO 14937:2009",
    title: "Sterilization of health care products — General requirements for characterization of a sterilizing agent and the development, validation and routine control of a sterilization process for medical devices",
    url: "https://www.iso.org/en/contents/data/standard/04/49/44954.html",
    category: "ISO",
    year: "2009"
  },
  {
    id: "iso-15883-5",
    code: "ISO 15883-5:2021",
    title: "Performance requirements and test method criteria for demonstrating cleaning efficacy",
    url: "https://www.iso.org/standard/68297.html",
    category: "ISO",
    year: "2021"
  },
  {
    id: "iso-11135",
    code: "ISO 11135:2017",
    title: "Sterilization of health-care products — Ethylene oxide — Requirements for the development, validation and routine control of a sterilization process for medical devices",
    url: "https://www.iso.org/standard/56137.html",
    category: "ISO",
    year: "2017"
  },
  {
    id: "iso-14644-1",
    code: "ISO 14644-1:2015",
    title: "Cleanrooms and associated controlled environments Part 1: Classification of air cleanliness by particle concentration",
    url: "https://www.iso.org/standard/53394.html",
    category: "ISO",
    year: "2015"
  },
  {
    id: "iso-14644-2",
    code: "ISO 14644-2:2015",
    title: "Cleanrooms and associated controlled environments Part 2: Monitoring to provide evidence of cleanroom performance related to air cleanliness by particle concentration",
    url: "https://www.iso.org/standard/53393.html",
    category: "ISO",
    year: "2015"
  },
  {
    id: "iso-14644-3",
    code: "ISO 14644-3:2019",
    title: "Cleanrooms and associated controlled environments Part 3: Test methods",
    url: "https://www.iso.org/standard/60598.html",
    category: "ISO",
    year: "2019"
  },

  // IEC Standards
  {
    id: "iec-62304",
    code: "IEC 62304:2006",
    title: "Medical device software — Software life cycle processes",
    url: "https://www.iso.org/standard/38421.html",
    category: "IEC",
    year: "2006"
  },
  {
    id: "iec-62366-1",
    code: "IEC 62366-1:2015",
    title: "Medical devices Part 1: Application of usability engineering to medical devices",
    url: "https://www.iso.org/standard/63179.html",
    category: "IEC",
    year: "2015"
  },
  {
    id: "iec-60601-1",
    code: "IEC 60601-1:2005",
    title: "Medical electrical equipment - Part 1: General requirements for basic safety and essential performance",
    url: "https://webstore.iec.ch/en/publication/2606",
    category: "IEC",
    year: "2005"
  },
  {
    id: "iec-62570",
    code: "IEC 62570:2014",
    title: "Standard practice for marking medical devices and other items for safety in the magnetic resonance environment",
    url: "https://webstore.iec.ch/en/publication/7213",
    category: "IEC",
    year: "2014"
  },

  // ASTM Standards
  {
    id: "astm-e1837",
    code: "ASTM E1837-96(2014)",
    title: "Standard Test Method to Determine Efficacy of Disinfection Processes for Reusable Medical Devices (Simulated Use Test) (Withdrawn 2023)",
    url: "https://store.astm.org/e1837-96r14.html",
    category: "ASTM",
    year: "2014"
  },
  {
    id: "astm-f1886",
    code: "ASTM F1886/F1886M-16(2024)",
    title: "Standard Test Method for Determining Integrity of Seals for Flexible Packaging by Visual Inspection",
    url: "https://store.astm.org/f1886_f1886m-16r24.html",
    category: "ASTM",
    year: "2024"
  },
  {
    id: "astm-f899",
    code: "ASTM F899-23",
    title: "Standard Specification for Wrought Stainless Steels for Surgical Instruments",
    url: "https://store.astm.org/f0899-23.html",
    category: "ASTM",
    year: "2023"
  },
  {
    id: "astm-f88",
    code: "ASTM F88/F88M-23",
    title: "Standard Test Method for Seal Strength of Flexible Barrier Materials",
    url: "https://store.astm.org/f0088_f0088m-23.html",
    category: "ASTM",
    year: "2023"
  },
  {
    id: "astm-f1635",
    code: "ASTM F1635-24",
    title: "Standard Test Method for in vitro Degradation Testing of Hydrolytically Degradable Polymer Resins and Fabricated Forms for Surgical Implants",
    url: "https://store.astm.org/f1635-24.html",
    category: "ASTM",
    year: "2024"
  },
  {
    id: "astm-f1929",
    code: "ASTM F1929-23",
    title: "Standard Test Method for Detecting Seal Leaks in Porous Medical Packaging by Dye Penetration",
    url: "https://store.astm.org/f1929-23.html",
    category: "ASTM",
    year: "2023"
  },
  {
    id: "astm-f2847",
    code: "ASTM F2847-17",
    title: "Standard Practice for Reporting and Assessment of Residues on Single-Use Implants and Single-Use Sterile Instruments",
    url: "https://store.astm.org/f2847-17.html",
    category: "ASTM",
    year: "2017"
  },
  {
    id: "astm-f1088",
    code: "ASTM F1088-23",
    title: "Standard Specification for Medical-Grade Beta-Tricalcium Phosphate Raw Material for Implantable Medical Devices",
    url: "https://store.astm.org/f1088-23.html",
    category: "ASTM",
    year: "2023"
  },
  {
    id: "astm-f1185",
    code: "ASTM F1185-23",
    title: "Standard Specification for Composition of Medical-Grade Hydroxylapatite for Surgical Implants",
    url: "https://store.astm.org/f1185-23.html",
    category: "ASTM",
    year: "2023"
  },

  // EN Standards
  {
    id: "en-556-1",
    code: "EN 556-1:2024",
    title: "Sterilisation von Medizinprodukten - Anforderungen an Medizinprodukte, die als 'STERIL' gekennzeichnet werden - Teil 1: Anforderungen an Medizinprodukte, die in der Endpackung sterilisiert wurden",
    url: "https://connect.snv.ch/de/sn-en-556-1-2024",
    category: "EN",
    year: "2024"
  },
  {
    id: "en-868-5",
    code: "EN 868-5:2018",
    title: "Verpackungen für in der Endverpackung zu sterilisierende Medizinprodukte - Teil 5: Siegelfähige Klarsichtbeutel und -schläuche aus porösen Materialien und Kunststoff-Verbundfolie",
    url: "https://connect.snv.ch/de/din-en-868-5-2019",
    category: "EN",
    year: "2018"
  },

  // AAMI Standards
  {
    id: "aami-tir30",
    code: "AAMI TIR30:2011 (R2016)",
    title: "A compendium of processes, materials, test methods, and acceptance criteria for cleaning reusable medical devices",
    url: "https://webstore.ansi.org/standards/aami/aamitir302011r2016",
    category: "AAMI",
    year: "2016"
  },
  {
    id: "ansi-aami-st98",
    code: "ANSI/AAMI ST98:2022",
    title: "Cleaning validation of health care products - Requirements for development and validation of a cleaning process for medical devices",
    url: "https://webstore.ansi.org/standards/aami/ansiaamist982022",
    category: "AAMI",
    year: "2022"
  },

  // Regulatory Documents
  {
    id: "eu-mdr",
    code: "EU MDR 2017/745",
    title: "Regulation (EU) 2017/745 on medical devices",
    url: "https://eur-lex.europa.eu/eli/reg/2017/745/oj/eng",
    category: "EU Regulation",
    year: "2017"
  }
];

export default function ISOStandards() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { t } = useLanguage();

  const categories = [
    { value: "all", label: "Alle Standards", count: standards.length },
    { value: "ISO", label: "ISO Standards", count: standards.filter(s => s.category === "ISO").length },
    { value: "IEC", label: "IEC Standards", count: standards.filter(s => s.category === "IEC").length },
    { value: "ASTM", label: "ASTM Standards", count: standards.filter(s => s.category === "ASTM").length },
    { value: "EN", label: "EN Standards", count: standards.filter(s => s.category === "EN").length },
    { value: "AAMI", label: "AAMI Standards", count: standards.filter(s => s.category === "AAMI").length },
    { value: "EU Regulation", label: "EU Verordnungen", count: standards.filter(s => s.category === "EU Regulation").length }
  ];

  const filteredStandards = standards.filter(standard => {
    const matchesSearch = standard.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         standard.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || standard.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group standards by category for display
  const groupedStandards = filteredStandards.reduce((acc, standard) => {
    if (!acc[standard.category]) {
      acc[standard.category] = [];
    }
    acc[standard.category].push(standard);
    return acc;
  }, {} as Record<string, Standard[]>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "ISO": return <Shield className="w-4 h-4" />;
      case "IEC": return <Clipboard className="w-4 h-4" />;
      case "ASTM": return <FileText className="w-4 h-4" />;
      case "EN": return <Globe className="w-4 h-4" />;
      case "AAMI": return <BookOpen className="w-4 h-4" />;
      case "EU Regulation": return <Star className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "ISO": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "IEC": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "ASTM": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "EN": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "AAMI": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "EU Regulation": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Language Selector - Top Right */}
        <div className="fixed top-4 right-4 z-50">
          <LanguageSelector />
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6 ml-64">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 via-purple-600 to-cyan-700 rounded-lg flex items-center justify-center text-white font-bold">
                  ISO
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    ISO & Internationale Standards
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Vollständige Sammlung medizinischer Geräte-Standards und Normen
                  </p>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Standards durchsuchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category.value}
                      variant={selectedCategory === category.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.value)}
                      className="whitespace-nowrap"
                    >
                      {category.label} ({category.count})
                    </Button>
                  ))}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                {categories.slice(1).map((category) => (
                  <Card key={category.value}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getCategoryIcon(category.value)}
                        <span className="text-sm font-medium">{category.label}</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">{category.count}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Standards Display */}
            <div className="space-y-6">
              {Object.entries(groupedStandards).map(([category, categoryStandards]) => (
                <Card key={category} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 dark:bg-gray-800">
                    <CardTitle className="flex items-center gap-2">
                      {getCategoryIcon(category)}
                      {category} Standards
                      <Badge className={getCategoryColor(category)}>
                        {categoryStandards.length} Standards
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {category === "ISO" && "Internationale Organisation für Normung"}
                      {category === "IEC" && "Internationale Elektrotechnische Kommission"}
                      {category === "ASTM" && "American Society for Testing and Materials"}
                      {category === "EN" && "Europäische Normen"}
                      {category === "AAMI" && "Association for the Advancement of Medical Instrumentation"}
                      {category === "EU Regulation" && "Europäische Union Verordnungen"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {categoryStandards.map((standard) => (
                        <div key={standard.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {standard.code}
                                </Badge>
                                {standard.year && (
                                  <Badge variant="secondary" className="text-xs">
                                    {standard.year}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
                                {standard.title}
                              </h3>
                              {standard.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                  {standard.description}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="shrink-0"
                            >
                              <a
                                href={standard.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Öffnen
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredStandards.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Keine Standards gefunden
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Versuchen Sie einen anderen Suchbegriff oder Filter.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}