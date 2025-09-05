import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { ResponsiveLayout } from "@/components/responsive-layout";
import { performanceMonitor, preloadCriticalResources } from "@/utils/performance";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CustomerThemeProvider } from "@/contexts/customer-theme-context";
import { LanguageProvider } from "@/contexts/LanguageContext";

// Initialize performance monitoring and preload resources
if (typeof window !== 'undefined') {
  preloadCriticalResources();
}

// Critical pages loaded immediately
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

// Lazy load non-critical pages for better performance
const Landing = lazy(() => import("@/pages/landing"));
const DataCollection = lazy(() => import("@/pages/data-collection"));
const GlobalSources = lazy(() => import("@/pages/global-sources"));
const Analytics = lazy(() => import("@/pages/analytics"));
const RegulatoryUpdatesNew = lazy(() => import("@/pages/regulatory-updates-fixed-complete"));
const RegulatoryUpdatesFinal = lazy(() => import("@/pages/regulatory-updates-individual"));
const NewsletterManager = lazy(() => import("@/pages/newsletter-manager"));
const ZulassungenGlobal = lazy(() => import("@/pages/zulassungen-global"));
const LaufendeZulassungen = lazy(() => import("@/pages/laufende-zulassungen"));

const UserManagement = lazy(() => import("@/pages/user-management"));
const SystemSettings = lazy(() => import("@/pages/system-settings"));
const AuditLogs = lazy(() => import("@/pages/audit-logs"));
const AIInsights = lazy(() => import("@/pages/ai-insights"));

const KnowledgeBaseNew = lazy(() => import("@/pages/knowledge-base-new"));
const KnowledgeBase = lazy(() => import("@/pages/knowledge-base"));

const HistoricalData = lazy(() => import("@/pages/historical-data-simple"));
const IntelligentSearch = lazy(() => import("@/pages/intelligent-search"));
const DocumentViewer = lazy(() => import("@/pages/document-viewer"));
const SyncManagerNew = lazy(() => import("@/pages/sync-manager-new"));
const Phase1Integration = lazy(() => import("@/pages/phase1-integration"));
const AIContentAnalysis = lazy(() => import("@/pages/ai-content-analysis"));
const Phase2Integration = lazy(() => import("@/pages/phase2-integration"));
const Phase3Advanced = lazy(() => import("@/pages/phase3-advanced"));
const RealTimeIntegration = lazy(() => import("@/pages/real-time-integration"));

const Administration = lazy(() => import("@/pages/administration"));
const AdminCustomers = lazy(() => import("@/pages/admin-customers"));
const GripData = lazy(() => import("@/pages/grip-data"));
const NewsletterAdmin = lazy(() => import("@/pages/newsletter-admin"));
const AdvancedAnalytics = lazy(() => import("@/pages/advanced-analytics"));
const CustomerDashboard = lazy(() => import("@/pages/customer-dashboard"));
const ChatSupport = lazy(() => import("@/pages/chat-support"));
const CustomerSettings = lazy(() => import("@/pages/customer-settings"));
const CustomerAIInsightsClean = lazy(() => import("@/pages/customer-ai-insights-clean"));
const CustomerRegulatoryUpdates = lazy(() => import("@/pages/customer-regulatory-updates"));
const CustomerRouter = lazy(() => import("@/components/customer/customer-router"));
const TenantOnboarding = lazy(() => import("@/pages/tenant-onboarding"));
const EmailManagement = lazy(() => import("@/pages/email-management-new"));
const RegulatoryUpdateDetail = lazy(() => import("@/pages/regulatory-update-detail-new"));
const RechtsprechungFixed = lazy(() => import("@/pages/rechtsprechung-fixed"));
const RechtsprechungKompakt = lazy(() => import("@/pages/rechtsprechung-kompakt"));
const TerminologyGlossary = lazy(() => import("@/pages/terminology-glossary"));
const AdminGlossary = lazy(() => import("@/pages/admin-glossary"));
const GRIPIntegration = lazy(() => import("@/pages/grip-integration"));
const ISOStandards = lazy(() => import("@/pages/iso-standards"));
const NetcupDeployment = lazy(() => import("@/pages/netcup-deployment"));

// Multi-Tenant Components
const TenantDashboard = lazy(() => import("@/pages/tenant-dashboard"));
const TenantAuth = lazy(() => import("@/pages/tenant-auth"));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        {/* Critical pages loaded immediately */}
        <Route path="/" component={Dashboard} />
        
        {/* Lazy-loaded pages */}
        <Route path="/data-collection" component={DataCollection} />
        <Route path="/global-sources" component={GlobalSources} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/regulatory-updates/:id" component={RegulatoryUpdateDetail} />
        <Route path="/regulatory-updates" component={RegulatoryUpdatesNew} />
        <Route path="/regulatory-updates-old" component={RegulatoryUpdatesNew} />
        <Route path="/sync-manager" component={SyncManagerNew} />
        <Route path="/newsletter-manager" component={NewsletterManager} />
        <Route path="/zulassungen/global" component={ZulassungenGlobal} />
        <Route path="/zulassungen/laufende" component={LaufendeZulassungen} />

        <Route path="/user-management" component={UserManagement} />
        <Route path="/system-settings" component={SystemSettings} />
        <Route path="/audit-logs" component={AuditLogs} />
        <Route path="/ai-insights" component={AIInsights} />
        <Route path="/ki-insights" component={AIInsights} />
        <Route path="/ai-content-analysis" component={AIContentAnalysis} />

        <Route path="/knowledge-base" component={KnowledgeBase} />
        <Route path="/rechtsprechung" component={RechtsprechungFixed} />
        <Route path="/terminology" component={TerminologyGlossary} />
        <Route path="/admin/glossary" component={AdminGlossary} />
        <Route path="/grip-integration" component={GRIPIntegration} />
        <Route path="/iso-standards" component={ISOStandards} />
        <Route path="/netcup-deployment" component={NetcupDeployment} />
        <Route path="/historical-data" component={HistoricalData} />
        <Route path="/intelligent-search" component={IntelligentSearch} />

        <Route path="/phase1-integration" component={Phase1Integration} />
        <Route path="/phase2-integration" component={Phase2Integration} />
        <Route path="/phase3-advanced" component={Phase3Advanced} />
        <Route path="/ai-content-analysis" component={AIContentAnalysis} />
        <Route path="/real-time-integration" component={RealTimeIntegration} />

        <Route path="/administration" component={Administration} />
        <Route path="/admin-customers" component={AdminCustomers} />
        <Route path="/grip-data" component={GripData} />
        <Route path="/newsletter-admin" component={NewsletterAdmin} />
        <Route path="/advanced-analytics" component={AdvancedAnalytics} />
        <Route path="/tenant-onboarding" component={TenantOnboarding} />
        <Route path="/email-management" component={EmailManagement} />
        <Route path="/documents/:sourceType/:documentId" component={DocumentViewer} />
        
        {/* Chat Support für Tenant-Administrator-Kommunikation */}
        <Route path="/chat-support" component={ChatSupport} />
        
        {/* Tenant Routes - Isolated Dashboard Access */}
        <Route path="/tenant/auth" component={() => <TenantAuth />} />
        <Route path="/tenant/dashboard" component={TenantDashboard} />
        <Route path="/tenant/*" component={TenantDashboard} />
        
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
          <Switch>
            {/* Pages without Sidebar */}
            <Route path="/landing" component={Landing} />
            <Route path="/404" component={NotFound} />
            
            {/* Multi-Tenant Customer Portal - Each customer gets their own portal */}
            <Route path="/tenant/:tenantId/*">
              <CustomerThemeProvider>
                <CustomerRouter />
              </CustomerThemeProvider>
            </Route>
            
            {/* Legacy customer routes - redirect to tenant-specific URLs */}
            <Route path="/customer-dashboard">
              <CustomerThemeProvider>
                <CustomerRouter />
              </CustomerThemeProvider>
            </Route>
            <Route path="/customer-settings">
              <CustomerThemeProvider>
                <CustomerRouter />
              </CustomerThemeProvider>
            </Route>
            <Route path="/customer-ai-insights">
              <CustomerThemeProvider>
                <CustomerRouter />
              </CustomerThemeProvider>
            </Route>
            <Route path="/customer/regulatory-updates">
              <CustomerThemeProvider>
                <CustomerRouter />
              </CustomerThemeProvider>
            </Route>
            <Route path="/customer/legal-cases">
              <CustomerThemeProvider>
                <CustomerRouter />
              </CustomerThemeProvider>
            </Route>
            <Route path="/customer/knowledge-base">
              <CustomerThemeProvider>
                <CustomerRouter />
              </CustomerThemeProvider>
            </Route>
            <Route path="/customer/newsletters">
              <CustomerThemeProvider>
                <CustomerRouter />
              </CustomerThemeProvider>
            </Route>
            <Route path="/customer/analytics">
              <CustomerThemeProvider>
                <CustomerRouter />
              </CustomerThemeProvider>
            </Route>
            <Route path="/customer/advanced-analytics">
              <CustomerThemeProvider>
                <CustomerRouter />
              </CustomerThemeProvider>
            </Route>
            <Route path="/customer/global-sources">
              <CustomerThemeProvider>
                <CustomerRouter />
              </CustomerThemeProvider>
            </Route>
            <Route path="/customer/data-collection">
              <CustomerThemeProvider>
                <CustomerRouter />
              </CustomerThemeProvider>
            </Route>
            <Route path="/customer/historical-data">
              <CustomerThemeProvider>
                <CustomerRouter />
              </CustomerThemeProvider>
            </Route>
            
            {/* Tenant Routes - Direct access without sidebar */}
            <Route path="/tenant/auth" component={() => <TenantAuth />} />
            <Route path="/tenant/dashboard" component={TenantDashboard} />
            <Route path="/tenant-auth" component={() => <TenantAuth />} />
            <Route path="/tenant-dashboard" component={TenantDashboard} />
            
            {/* All other pages with Admin Sidebar */}
            <Route>
              <ResponsiveLayout>
                <Router />
              </ResponsiveLayout>
            </Route>
          </Switch>
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
