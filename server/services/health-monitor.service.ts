import { Logger } from './logger.service';
import { performance } from 'perf_hooks';
import os from 'os';
import fs from 'fs/promises';

interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  system: SystemMetrics;
  database: DatabaseHealth;
  services: ServiceHealth[];
  performance: PerformanceMetrics;
  alerts: HealthAlert[];
}

interface SystemMetrics {
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
    heap: NodeJS.MemoryUsage;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  disk: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  network: {
    interfaces: Array<{
      name: string;
      address: string;
      family: string;
      internal: boolean;
    }>;
  };
}

interface DatabaseHealth {
  status: 'connected' | 'disconnected' | 'error';
  responseTime: number;
  activeConnections: number;
  maxConnections: number;
  lastError?: string;
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: string;
  errorCount: number;
  details?: any;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  memoryLeakDetected: boolean;
}

interface HealthAlert {
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
  service?: string;
}

interface HealthCheck {
  name: string;
  check: () => Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details?: any }>;
  timeout: number;
  interval: number;
}

class HealthMonitorService {
  private logger: Logger;
  private healthChecks = new Map<string, HealthCheck>();
  private metrics: HealthMetrics;
  private alerts: HealthAlert[] = [];
  private responseTimes: number[] = [];
  private requestCount = 0;
  private errorCount = 0;
  private lastMetricsReset = Date.now();
  private monitoringInterval?: NodeJS.Timeout;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('HealthMonitor');
    this.metrics = this.initializeMetrics();
    this.registerDefaultHealthChecks();
    this.startMonitoring();
  }

  /**
   * Get current health status
   */
  async getHealthStatus(): Promise<HealthMetrics> {
    const startTime = performance.now();
    
    try {
      // Update all metrics
      await Promise.all([
        this.updateSystemMetrics(),
        this.updateDatabaseHealth(),
        this.updateServiceHealth(),
        this.updatePerformanceMetrics()
      ]);

      // Determine overall status
      this.metrics.status = this.calculateOverallStatus();
      this.metrics.timestamp = new Date().toISOString();
      this.metrics.alerts = this.getActiveAlerts();

      const responseTime = performance.now() - startTime;
      this.logger.debug('Health check completed', { responseTime });

      return { ...this.metrics };
    } catch (error) {
      this.logger.error('Failed to get health status', error);
      this.addAlert('critical', 'Health check system failure', 'health-monitor');
      
      return {
        ...this.metrics,
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Register a custom health check
   */
  registerHealthCheck(healthCheck: HealthCheck): void {
    this.healthChecks.set(healthCheck.name, healthCheck);
    this.logger.info('Registered health check', { name: healthCheck.name });
  }

  /**
   * Record request metrics
   */
  recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestCount++;
    this.responseTimes.push(responseTime);
    
    if (isError) {
      this.errorCount++;
    }

    // Keep only last 1000 response times to prevent memory growth
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  /**
   * Add health alert
   */
  addAlert(level: HealthAlert['level'], message: string, service?: string): void {
    const alert: HealthAlert = {
      level,
      message,
      timestamp: new Date().toISOString(),
      resolved: false,
      service
    };

    this.alerts.push(alert);
    this.logger.warn('Health alert added', alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Resolve health alert
   */
  resolveAlert(message: string): void {
    const alert = this.alerts.find(a => a.message === message && !a.resolved);
    if (alert) {
      alert.resolved = true;
      this.logger.info('Health alert resolved', { message });
    }
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.runHealthChecks();
        await this.detectAnomalies();
      } catch (error) {
        this.logger.error('Monitoring cycle failed', error);
      }
    }, 30000); // Run every 30 seconds

    this.logger.info('Health monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      this.logger.info('Health monitoring stopped');
    }
  }

  private initializeMetrics(): HealthMetrics {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      system: {} as SystemMetrics,
      database: {} as DatabaseHealth,
      services: [],
      performance: {} as PerformanceMetrics,
      alerts: []
    };
  }

  private registerDefaultHealthChecks(): void {
    // Memory usage check
    this.registerHealthCheck({
      name: 'memory-usage',
      check: async () => {
        const memUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const usagePercent = (memUsage.rss / totalMem) * 100;

        if (usagePercent > 90) {
          return { status: 'unhealthy', details: { usagePercent, memUsage } };
        } else if (usagePercent > 75) {
          return { status: 'degraded', details: { usagePercent, memUsage } };
        }
        
        return { status: 'healthy', details: { usagePercent, memUsage } };
      },
      timeout: 5000,
      interval: 60000
    });

    // CPU usage check
    this.registerHealthCheck({
      name: 'cpu-usage',
      check: async () => {
        const cpus = os.cpus();
        const loadAvg = os.loadavg()[0];
        const usage = (loadAvg / cpus.length) * 100;

        if (usage > 90) {
          return { status: 'unhealthy', details: { usage, loadAvg, cores: cpus.length } };
        } else if (usage > 75) {
          return { status: 'degraded', details: { usage, loadAvg, cores: cpus.length } };
        }
        
        return { status: 'healthy', details: { usage, loadAvg, cores: cpus.length } };
      },
      timeout: 5000,
      interval: 60000
    });

    // Disk space check
    this.registerHealthCheck({
      name: 'disk-space',
      check: async () => {
        try {
          const stats = await fs.stat(process.cwd());
          // This is a simplified check - in production you'd check actual disk usage
          return { status: 'healthy', details: { available: true } };
        } catch (error) {
          return { status: 'unhealthy', details: { error: error.message } };
        }
      },
      timeout: 5000,
      interval: 300000 // 5 minutes
    });
  }

  private async updateSystemMetrics(): Promise<void> {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    this.metrics.system = {
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercent: (usedMem / totalMem) * 100,
        heap: memUsage
      },
      cpu: {
        usage: (loadAvg[0] / cpus.length) * 100,
        loadAverage: loadAvg,
        cores: cpus.length
      },
      disk: {
        total: 0, // Would implement actual disk space check
        free: 0,
        used: 0,
        usagePercent: 0
      },
      network: {
        interfaces: Object.entries(os.networkInterfaces())
          .flatMap(([name, interfaces]) => 
            (interfaces || []).map(iface => ({
              name,
              address: iface.address,
              family: iface.family,
              internal: iface.internal
            }))
          )
      }
    };

    this.metrics.uptime = process.uptime();
  }

  private async updateDatabaseHealth(): Promise<void> {
    // Mock database health check - implement actual database connection check
    const startTime = performance.now();
    
    try {
      // Simulate database ping
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      
      const responseTime = performance.now() - startTime;
      
      this.metrics.database = {
        status: 'connected',
        responseTime,
        activeConnections: Math.floor(Math.random() * 10) + 1,
        maxConnections: 100
      };
    } catch (error) {
      this.metrics.database = {
        status: 'error',
        responseTime: performance.now() - startTime,
        activeConnections: 0,
        maxConnections: 100,
        lastError: error.message
      };
    }
  }

  private async updateServiceHealth(): Promise<void> {
    const services: ServiceHealth[] = [];
    
    for (const [name, healthCheck] of this.healthChecks) {
      const startTime = performance.now();
      
      try {
        const result = await Promise.race([
          healthCheck.check(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), healthCheck.timeout)
          )
        ]) as { status: 'healthy' | 'degraded' | 'unhealthy'; details?: any };

        services.push({
          name,
          status: result.status,
          responseTime: performance.now() - startTime,
          lastCheck: new Date().toISOString(),
          errorCount: 0,
          details: result.details
        });
      } catch (error) {
        services.push({
          name,
          status: 'unhealthy',
          responseTime: performance.now() - startTime,
          lastCheck: new Date().toISOString(),
          errorCount: 1,
          details: { error: error.message }
        });
      }
    }
    
    this.metrics.services = services;
  }

  private async updatePerformanceMetrics(): Promise<void> {
    const now = Date.now();
    const timeSinceReset = now - this.lastMetricsReset;
    const secondsSinceReset = timeSinceReset / 1000;

    const sortedResponseTimes = [...this.responseTimes].sort((a, b) => a - b);
    
    this.metrics.performance = {
      averageResponseTime: this.responseTimes.length > 0 
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
        : 0,
      requestsPerSecond: secondsSinceReset > 0 ? this.requestCount / secondsSinceReset : 0,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      p95ResponseTime: sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.95)] || 0,
      p99ResponseTime: sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.99)] || 0,
      memoryLeakDetected: this.detectMemoryLeak()
    };

    // Reset metrics every hour
    if (timeSinceReset > 3600000) {
      this.resetMetrics();
    }
  }

  private detectMemoryLeak(): boolean {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    
    // Simple heuristic: if heap usage is > 500MB, flag as potential leak
    return heapUsedMB > 500;
  }

  private resetMetrics(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
    this.lastMetricsReset = Date.now();
    this.logger.info('Performance metrics reset');
  }

  private calculateOverallStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    // Check critical system resources
    if (this.metrics.system.memory?.usagePercent > 95 || 
        this.metrics.system.cpu?.usage > 95 ||
        this.metrics.database?.status === 'error') {
      return 'unhealthy';
    }

    // Check for degraded services
    const unhealthyServices = this.metrics.services.filter(s => s.status === 'unhealthy').length;
    const degradedServices = this.metrics.services.filter(s => s.status === 'degraded').length;
    
    if (unhealthyServices > 0 || this.metrics.performance?.errorRate > 10) {
      return 'unhealthy';
    }

    if (degradedServices > 0 || 
        this.metrics.system.memory?.usagePercent > 80 || 
        this.metrics.system.cpu?.usage > 80 ||
        this.metrics.performance?.errorRate > 5) {
      return 'degraded';
    }

    return 'healthy';
  }

  private async runHealthChecks(): Promise<void> {
    for (const [name, healthCheck] of this.healthChecks) {
      try {
        const result = await healthCheck.check();
        
        if (result.status === 'unhealthy') {
          this.addAlert('error', `Service ${name} is unhealthy`, name);
        } else if (result.status === 'degraded') {
          this.addAlert('warning', `Service ${name} is degraded`, name);
        } else {
          this.resolveAlert(`Service ${name} is unhealthy`);
          this.resolveAlert(`Service ${name} is degraded`);
        }
      } catch (error) {
        this.addAlert('critical', `Health check failed for ${name}: ${error.message}`, name);
      }
    }
  }

  private async detectAnomalies(): Promise<void> {
    // Memory usage anomaly detection
    if (this.metrics.system.memory?.usagePercent > 90) {
      this.addAlert('critical', 'High memory usage detected', 'system');
    } else if (this.metrics.system.memory?.usagePercent > 80) {
      this.addAlert('warning', 'Elevated memory usage', 'system');
    }

    // CPU usage anomaly detection
    if (this.metrics.system.cpu?.usage > 90) {
      this.addAlert('critical', 'High CPU usage detected', 'system');
    } else if (this.metrics.system.cpu?.usage > 80) {
      this.addAlert('warning', 'Elevated CPU usage', 'system');
    }

    // Error rate anomaly detection
    if (this.metrics.performance?.errorRate > 10) {
      this.addAlert('error', 'High error rate detected', 'performance');
    } else if (this.metrics.performance?.errorRate > 5) {
      this.addAlert('warning', 'Elevated error rate', 'performance');
    }

    // Memory leak detection
    if (this.metrics.performance?.memoryLeakDetected) {
      this.addAlert('warning', 'Potential memory leak detected', 'performance');
    }
  }

  private getActiveAlerts(): HealthAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }
}

export { HealthMonitorService, HealthMetrics, HealthCheck, HealthAlert };