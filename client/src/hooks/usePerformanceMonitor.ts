import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentMountTime: number;
  memoryUsage?: number;
  fps?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
}

interface PerformanceReport {
  componentName: string;
  metrics: PerformanceMetrics;
  timestamp: number;
  recommendations: string[];
}

class PerformanceTracker {
  private static instance: PerformanceTracker;
  private reports: PerformanceReport[] = [];
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  init() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    // Observe Web Vitals
    this.observeWebVitals();
    
    // Observe long tasks
    this.observeLongTasks();
    
    // Observe layout shifts
    this.observeLayoutShifts();
  }

  private observeWebVitals() {
    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log('LCP:', entry.startTime);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay (FID) - approximated with first-input
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log('FID:', (entry as any).processingStart - entry.startTime);
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

    } catch (error) {
      console.warn('Performance observation not supported:', error);
    }
  }

  private observeLongTasks() {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn('Long task detected:', entry.duration + 'ms');
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    } catch (error) {
      console.warn('Long task observation not supported:', error);
    }
  }

  private observeLayoutShifts() {
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        console.log('CLS:', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn('Layout shift observation not supported:', error);
    }
  }

  addReport(report: PerformanceReport) {
    this.reports.push(report);
    
    // Keep only last 100 reports to prevent memory leaks
    if (this.reports.length > 100) {
      this.reports = this.reports.slice(-100);
    }
  }

  getReports(): PerformanceReport[] {
    return [...this.reports];
  }

  getAverageRenderTime(): number {
    if (this.reports.length === 0) return 0;
    const total = this.reports.reduce((sum, report) => sum + report.metrics.renderTime, 0);
    return total / this.reports.length;
  }

  getSlowestComponents(): PerformanceReport[] {
    return [...this.reports]
      .sort((a, b) => b.metrics.renderTime - a.metrics.renderTime)
      .slice(0, 10);
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

export function usePerformanceMonitor(componentName: string) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const mountTimeRef = useRef<number>(Date.now());
  const renderCountRef = useRef<number>(0);
  const lastRenderTimeRef = useRef<number>(Date.now());

  // Initialize tracker on first use
  useEffect(() => {
    const tracker = PerformanceTracker.getInstance();
    tracker.init();
    
    return () => {
      tracker.cleanup();
    };
  }, []);

  // Track component mount time
  useEffect(() => {
    const mountTime = Date.now() - mountTimeRef.current;
    
    setMetrics(prev => ({
      ...prev,
      componentMountTime: mountTime,
      renderTime: 0
    }));
  }, []);

  // Track render performance
  useEffect(() => {
    renderCountRef.current++;
    const renderTime = Date.now() - lastRenderTimeRef.current;
    lastRenderTimeRef.current = Date.now();

    if (renderCountRef.current > 1) { // Skip first render
      setMetrics(prev => ({
        ...prev,
        renderTime,
        componentMountTime: prev?.componentMountTime || 0
      }));
    }
  });

  // Get memory usage
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      return {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      };
    }
    return null;
  }, []);

  // Report performance data
  const reportPerformance = useCallback(() => {
    if (!metrics) return;

    const memoryUsage = getMemoryUsage();
    const tracker = PerformanceTracker.getInstance();

    const report: PerformanceReport = {
      componentName,
      metrics: {
        ...metrics,
        memoryUsage: memoryUsage?.usedJSHeapSize
      },
      timestamp: Date.now(),
      recommendations: generateRecommendations(metrics)
    };

    tracker.addReport(report);
  }, [componentName, metrics, getMemoryUsage]);

  // Auto-report on unmount
  useEffect(() => {
    return () => {
      if (metrics) {
        reportPerformance();
      }
    };
  }, [reportPerformance, metrics]);

  return {
    metrics,
    reportPerformance,
    getMemoryUsage,
    renderCount: renderCountRef.current
  };
}

function generateRecommendations(metrics: PerformanceMetrics): string[] {
  const recommendations: string[] = [];

  if (metrics.renderTime > 16) {
    recommendations.push('Consider optimizing render performance - target <16ms for 60fps');
  }

  if (metrics.componentMountTime > 100) {
    recommendations.push('Component mount time is slow - consider lazy loading or code splitting');
  }

  if (metrics.memoryUsage && metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
    recommendations.push('High memory usage detected - check for memory leaks');
  }

  if (recommendations.length === 0) {
    recommendations.push('Performance looks good! 🚀');
  }

  return recommendations;
}

// Hook for measuring async operations
export function useAsyncPerformance() {
  const measureAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<{ result: T; duration: number }> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      console.log(`🚀 ${operationName} completed in ${duration.toFixed(2)}ms`);
      
      return { result, duration };
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ ${operationName} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }, []);

  return { measureAsync };
}

// Hook for FPS monitoring
export function useFPSMonitor() {
  const [fps, setFps] = useState<number>(60);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const animationIdRef = useRef<number>();

  useEffect(() => {
    const measureFPS = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      
      if (delta >= 1000) { // Update every second
        const currentFps = Math.round((frameRef.current * 1000) / delta);
        setFps(currentFps);
        frameRef.current = 0;
        lastTimeRef.current = now;
      }
      
      frameRef.current++;
      animationIdRef.current = requestAnimationFrame(measureFPS);
    };

    animationIdRef.current = requestAnimationFrame(measureFPS);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  return fps;
}

export { PerformanceTracker };