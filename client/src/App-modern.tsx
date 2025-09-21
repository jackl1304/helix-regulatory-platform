import React, { Suspense, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ModernErrorBoundary from "@/components/modern/ErrorBoundary";
import { usePerformanceMonitor, useFPSMonitor } from "@/hooks/usePerformanceMonitor";
import { useCacheManager } from "@/hooks/useOptimizedQuery";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CustomerThemeProvider } from "@/contexts/customer-theme-context";

// Performance monitoring
import { PerformanceTracker } from "@/hooks/usePerformanceMonitor";

// Critical pages loaded immediately
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

// Lazy load non-critical pages for better performance
const Landing = React.lazy(() => import("@/pages/landing"));
const DataCollection = React.lazy(() => import("@/pages/data-collection"));
const Analytics = React.lazy(() => import("@/pages/analytics"));
const RegulatoryUpdatesComplete = React.lazy(() => import("@/pages/regulatory-updates-fixed-complete"));
const NewsletterManager = React.lazy(() => import("@/pages/newsletter-manager"));
const UserManagement = React.lazy(() => import("@/pages/user-management"));
const SystemSettings = React.lazy(() => import("@/pages/system-settings"));
const AIInsights = React.lazy(() => import("@/pages/ai-insights"));
const KnowledgeBase = React.lazy(() => import("@/pages/knowledge-base"));
const Administration = React.lazy(() => import("@/pages/administration"));

// Loading fallback component with skeleton
const LoadingFallback = ({ componentName }: { componentName?: string }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">
        {componentName ? `Loading ${componentName}...` : 'Loading...'}
      </p>
      <div className="mt-2 w-48 h-2 bg-gray-200 rounded-full mx-auto">
        <div className="h-2 bg-blue-600 rounded-full animate-pulse" style={{ width: '60%' }}></div>
      </div>
    </div>
  </div>
);

// Performance monitoring wrapper
function PerformanceWrapper({ children }: { children: React.ReactNode }) {
  const { metrics } = usePerformanceMonitor('App');
  const fps = useFPSMonitor();
  const { getCacheStats, preloadCriticalData } = useCacheManager();

  useEffect(() => {
    // Initialize performance tracking
    const tracker = PerformanceTracker.getInstance();
    tracker.init();

    // Preload critical data in background
    preloadCriticalData([
      '/api/dashboard/stats',
      '/api/regulatory-updates',
      '/api/health'
    ]);

    // Monitor performance periodically
    const interval = setInterval(() => {
      const cacheStats = getCacheStats();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 Performance Metrics:', {
          fps,
          cacheStats,
          memoryUsage: (performance as any).memory?.usedJSHeapSize
        });
      }

      // Alert if performance degrades
      if (fps < 30) {
        console.warn('⚠️ Low FPS detected:', fps);
      }

      if (metrics?.renderTime && metrics.renderTime > 100) {
        console.warn('⚠️ Slow render detected:', metrics.renderTime + 'ms');
      }
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(interval);
      tracker.cleanup();
    };
  }, [fps, metrics, getCacheStats, preloadCriticalData]);

  return <>{children}</>;
}

// Modern router with performance optimization
function ModernRouter() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Switch>
        {/* Landing page */}
        <Route path="/landing">
          <Suspense fallback={<LoadingFallback componentName="Landing" />}>
            <Landing />
          </Suspense>
        </Route>

        {/* 404 page */}
        <Route path="/404" component={NotFound} />

        {/* Multi-Tenant Customer Portal */}
        <Route path="/tenant/:tenantId/*">
          <CustomerThemeProvider>
            <Suspense fallback={<LoadingFallback componentName="Customer Portal" />}>
              {React.lazy(() => import("@/components/customer/customer-router"))}
            </Suspense>
          </CustomerThemeProvider>
        </Route>

        {/* Main application routes */}
        <Route path="/" component={Dashboard} />
        
        <Route path="/data-collection">
          <Suspense fallback={<LoadingFallback componentName="Data Collection" />}>
            <DataCollection />
          </Suspense>
        </Route>

        <Route path="/analytics">
          <Suspense fallback={<LoadingFallback componentName="Analytics" />}>
            <Analytics />
          </Suspense>
        </Route>

        <Route path="/regulatory-updates">
          <Suspense fallback={<LoadingFallback componentName="Regulatory Updates" />}>
            <RegulatoryUpdatesComplete />
          </Suspense>
        </Route>

        <Route path="/newsletter-manager">
          <Suspense fallback={<LoadingFallback componentName="Newsletter Manager" />}>
            <NewsletterManager />
          </Suspense>
        </Route>

        <Route path="/user-management">
          <Suspense fallback={<LoadingFallback componentName="User Management" />}>
            <UserManagement />
          </Suspense>
        </Route>

        <Route path="/system-settings">
          <Suspense fallback={<LoadingFallback componentName="System Settings" />}>
            <SystemSettings />
          </Suspense>
        </Route>

        <Route path="/ai-insights">
          <Suspense fallback={<LoadingFallback componentName="AI Insights" />}>
            <AIInsights />
          </Suspense>
        </Route>

        <Route path="/knowledge-base">
          <Suspense fallback={<LoadingFallback componentName="Knowledge Base" />}>
            <KnowledgeBase />
          </Suspense>
        </Route>

        <Route path="/administration">
          <Suspense fallback={<LoadingFallback componentName="Administration" />}>
            <Administration />
          </Suspense>
        </Route>

        {/* Fallback for unknown routes */}
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

// Main App component with all modern features
function App() {
  return (
    <ModernErrorBoundary
      enableReporting={process.env.NODE_ENV === 'production'}
      onError={(error, errorInfo) => {
        // Custom error handling - send to monitoring service
        console.error('App Error:', error, errorInfo);
        
        // In production, send to error tracking service
        if (process.env.NODE_ENV === 'production') {
          // Example: Sentry.captureException(error);
        }
      }}
    >
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <PerformanceWrapper>
              {/* Global notifications */}
              <Toaster />
              
              {/* Main application */}
              <ModernRouter />
              
              {/* Development tools */}
              {process.env.NODE_ENV === 'development' && (
                <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
                  <div>React Dev Tools Active</div>
                  <div>Performance Monitoring: ON</div>
                </div>
              )}
            </PerformanceWrapper>
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ModernErrorBoundary>
  );
}

export default App;