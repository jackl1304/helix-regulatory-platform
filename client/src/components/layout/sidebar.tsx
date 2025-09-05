import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Database, 
  Globe,
  FileText, 
  Newspaper, 
  CheckCircle, 
  TrendingUp,
  Brain,
  Book,
  Users,
  Settings,
  Archive,
  Shield,
  Search,
  RefreshCw,
  Scale,
  FileSearch,
  ChevronDown,
  ChevronRight,
  Mail,
  Bot,
  Sparkles,
  Building
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarLogo } from "@/components/layout/logo";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";

// Verbesserte thematische Sidebar-Struktur basierend auf Benutzeranalyse
interface NavigationItem {
  name: string;
  href: string;
  icon: any;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
  defaultOpen?: boolean;
  hiddenItems?: NavigationItem[];
}

const getNavigationStructure = (t: (key: string) => string): Record<string, NavigationSection> => ({
  // 1. OVERVIEW & CONTROL
  overview: {
    title: t('nav.sections.overview'),
    items: [
      { name: t('nav.dashboard'), href: "/", icon: BarChart3 },
      { name: t('nav.analytics'), href: "/analytics", icon: TrendingUp },
    ],
    defaultOpen: true
  },

  // 2. DATA MANAGEMENT 
  dataManagement: {
    title: t('nav.sections.dataManagement'),
    items: [
      { name: t('nav.dataCollection'), href: "/data-collection", icon: Database },
      { name: t('nav.newsletterAdmin'), href: "/newsletter-admin", icon: Mail },
      { name: t('nav.emailManagement'), href: "/email-management", icon: Mail },
      { name: t('nav.knowledgeBase'), href: "/knowledge-base", icon: Book },
    ],
    defaultOpen: true
  },

  // 3. COMPLIANCE & REGULATION
  compliance: {
    title: t('nav.sections.compliance'),
    items: [
      { name: t('nav.regulatoryUpdates'), href: "/regulatory-updates", icon: FileText },
      { name: t('nav.legalCases'), href: "/rechtsprechung", icon: Scale },
    ],
    defaultOpen: true
  },

  // 4. APPROVALS & REGISTRATION
  approvals: {
    title: t('nav.sections.approvals'),
    items: [
      { name: t('nav.globalApprovals'), href: "/zulassungen/global", icon: Globe },
      { name: t('nav.ongoingApprovals'), href: "/zulassungen/laufende", icon: CheckCircle },
    ],
    defaultOpen: true
  },

  // 5. STANDARDS & REGULATIONS
  standards: {
    title: t('nav.sections.standards'),
    items: [
      { name: t('nav.isoStandards'), href: "/iso-standards", icon: Shield },
    ],
    defaultOpen: true
  },

  // 5. ADVANCED (collapsible)
  advanced: {
    title: t('nav.sections.advanced'),
    items: [
      { name: t('nav.syncManager'), href: "/sync-manager", icon: RefreshCw },
      { name: t('nav.globalSources'), href: "/global-sources", icon: Globe },
      { name: t('nav.newsletterManager'), href: "/newsletter-manager", icon: Newspaper },
      { name: t('nav.historicalData'), href: "/historical-data", icon: Archive },
      { name: t('nav.customerManagement'), href: "/admin-customers", icon: Building },
      { name: t('nav.userManagement'), href: "/user-management", icon: Users },
      { name: t('nav.systemAdmin'), href: "/administration", icon: Settings },
      { name: t('nav.auditLogs'), href: "/audit-logs", icon: FileSearch },
    ],
    defaultOpen: false,
    hiddenItems: [
      { name: "🧠", href: "/ai-content-analysis", icon: Brain },
      { name: "🤖", href: "/ki-insights", icon: Bot },
      { name: "✨", href: "/grip-integration", icon: Sparkles },
    ]
  }
});

// Sidebar Search Field Component
function SidebarSearchField() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to intelligent search page with query
      setLocation(`/intelligent-search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  return (
    <form onSubmit={handleSearch}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#07233e]" />
        <Input
          type="text"
          placeholder={t('search.askQuestion')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pl-10 pr-4 py-2 bg-[#f0f8ff] border border-[#b0d4f6] rounded-lg text-sm text-[#07233e] placeholder-[#07233e]/70 focus:outline-none focus:ring-2 focus:ring-[#07233e] focus:border-transparent hover:bg-[#e6f3ff] transition-colors duration-200"
          data-testid="sidebar-search-input"
        />
      </div>
    </form>
  );
}

export function Sidebar() {
  const { t } = useLanguage();
  const [location] = useLocation();
  const navigationStructure = getNavigationStructure(t);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    // Initialize with default open states
    const initial: Record<string, boolean> = {};
    Object.entries(navigationStructure).forEach(([key, section]) => {
      initial[key] = section.defaultOpen || false;
    });
    return initial;
  });

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = location === item.href;
    const IconComponent = item.icon;
    
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center justify-start px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 cursor-pointer text-left",
          isActive
            ? "bg-[#07233e] text-white shadow-md"
            : "text-gray-700 hover:bg-[#f0f8ff] hover:text-[#07233e]"
        )}
      >
        <IconComponent className="mr-3 h-5 w-5 flex-shrink-0" />
        <span className="text-left">{item.name}</span>
      </Link>
    );
  };

  const renderHiddenItems = (hiddenItems: NavigationItem[]) => {
    return (
      <div className="flex justify-center space-x-4 py-3 border-t border-gray-200 dark:border-gray-700 mt-2">
        {hiddenItems.map((item) => {
          const isActive = location === item.href;
          const IconComponent = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300 cursor-pointer",
                isActive
                  ? "bg-[#07233e] text-white shadow-md"
                  : "text-gray-700 hover:bg-[#f0f8ff] hover:text-[#07233e]"
              )}
              title={item.name}
            >
              <IconComponent className="h-5 w-5" />
            </Link>
          );
        })}
      </div>
    );
  };

  const renderNavigationSection = (sectionKey: string, section: NavigationSection) => {
    const isExpanded = expandedSections[sectionKey];
    const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;
    
    return (
      <div key={sectionKey} className="mb-3">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-[#07233e] transition-colors duration-200 text-left"
        >
          <span>{section.title}</span>
          <ChevronIcon className="h-4 w-4" />
        </button>
        
        {isExpanded && (
          <div className="mt-1 space-y-1">
            {section.items.map(renderNavigationItem)}
            {section.hiddenItems && renderHiddenItems(section.hiddenItems)}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 deltaways-nav shadow-lg z-50 overflow-y-auto">
      {/* DELTA WAYS Logo Header */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/">
          <div className="flex flex-col items-center cursor-pointer space-y-2">
            <SidebarLogo />
            <p className="text-xs font-medium text-gray-600 mt-2">Powered by DELTA WAYS</p>
          </div>
        </Link>
        
      </div>
      
      {/* Funktionsfähiger Suchbereich */}
      <div className="p-4 border-b border-gray-100">
        <SidebarSearchField />
      </div>
      
      {/* Thematisch organisierte Navigation */}
      <nav className="mt-4 pb-8 flex-1 overflow-y-auto">
        <div className="px-2 space-y-2">
          {Object.entries(navigationStructure).map(([sectionKey, section]) =>
            renderNavigationSection(sectionKey, section)
          )}
        </div>
      </nav>
      
      {/* Status-Footer */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>{t('status.label')}:</span>
            <span className="text-green-600 font-medium">{t('status.online')}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span>{t('status.dataSources')}</span>
            <span className="text-blue-600 font-medium">{t('common.active')}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}