import { performance } from 'perf_hooks';
class HealthCheckService {
    constructor() {
        this.lastErrors = [];
        this.requestMetrics = {
            total: 0,
            successful: 0,
            failed: 0,
            responseTimes: []
        };
    }
    async performHealthCheck() {
        const startTime = performance.now();
        try {
            const [dbHealth, cacheHealth, apiHealth, dataHealth] = await Promise.allSettled([
                this.checkDatabase(),
                this.checkCache(),
                this.checkExternalAPIs(),
                this.checkDataCollection()
            ]);
            const services = {
                database: this.getHealthResult(dbHealth),
                cache: this.getHealthResult(cacheHealth),
                externalAPIs: this.getHealthResult(apiHealth),
                dataCollection: this.getHealthResult(dataHealth)
            };
            const overallStatus = this.determineOverallStatus(services);
            const result = {
                status: overallStatus,
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                services,
                metrics: {
                    memory: this.getMemoryMetrics(),
                    cpu: this.getCPUMetrics(),
                    requests: this.getRequestMetrics()
                }
            };
            if (this.lastErrors.length > 0) {
                result.lastErrors = this.lastErrors.slice(-5);
            }
            return result;
        }
        catch (error) {
            console.error('[Health Check] Error performing health check:', error);
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                services: {
                    database: { status: 'down', lastCheck: new Date().toISOString() },
                    cache: { status: 'down', lastCheck: new Date().toISOString() },
                    externalAPIs: { status: 'down', lastCheck: new Date().toISOString() },
                    dataCollection: { status: 'down', lastCheck: new Date().toISOString() }
                },
                metrics: {
                    memory: this.getMemoryMetrics(),
                    cpu: this.getCPUMetrics(),
                    requests: this.getRequestMetrics()
                },
                lastErrors: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
            };
        }
    }
    async checkDatabase() {
        const startTime = performance.now();
        try {
            const { storage } = await import('../storage');
            await storage.getAllDataSources();
            const responseTime = performance.now() - startTime;
            return {
                status: responseTime < 1000 ? 'up' : 'degraded',
                responseTime,
                lastCheck: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                status: 'down',
                lastCheck: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Database connection failed'
            };
        }
    }
    async checkCache() {
        const startTime = performance.now();
        try {
            const testKey = 'health_check_' + Date.now();
            const testValue = 'ok';
            const responseTime = performance.now() - startTime;
            return {
                status: 'up',
                responseTime,
                lastCheck: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                status: 'down',
                lastCheck: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Cache connection failed'
            };
        }
    }
    async checkExternalAPIs() {
        const startTime = performance.now();
        try {
            const response = await fetch('https://api.fda.gov/device/recall.json?limit=1', {
                method: 'GET',
                timeout: 5000
            });
            const responseTime = performance.now() - startTime;
            if (response.ok) {
                return {
                    status: responseTime < 3000 ? 'up' : 'degraded',
                    responseTime,
                    lastCheck: new Date().toISOString()
                };
            }
            else {
                return {
                    status: 'degraded',
                    responseTime,
                    lastCheck: new Date().toISOString(),
                    error: `FDA API returned ${response.status}`
                };
            }
        }
        catch (error) {
            return {
                status: 'down',
                lastCheck: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'External API check failed'
            };
        }
    }
    async checkDataCollection() {
        try {
            const { storage } = await import('../storage');
            const recentUpdates = await storage.getAllRegulatoryUpdates();
            const recentCases = await storage.getAllLegalCases();
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const hasRecentData = recentUpdates.some(update => update.lastUpdated && new Date(update.lastUpdated) > oneDayAgo);
            return {
                status: hasRecentData ? 'up' : 'degraded',
                lastCheck: new Date().toISOString(),
                error: hasRecentData ? undefined : 'No recent data collected'
            };
        }
        catch (error) {
            return {
                status: 'down',
                lastCheck: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Data collection check failed'
            };
        }
    }
    getHealthResult(result) {
        if (result.status === 'fulfilled') {
            return result.value;
        }
        else {
            return {
                status: 'down',
                lastCheck: new Date().toISOString(),
                error: result.reason instanceof Error ? result.reason.message : 'Service check failed'
            };
        }
    }
    determineOverallStatus(services) {
        const statuses = Object.values(services).map(service => service.status);
        if (statuses.every(status => status === 'up')) {
            return 'healthy';
        }
        else if (statuses.some(status => status === 'down')) {
            return 'unhealthy';
        }
        else {
            return 'degraded';
        }
    }
    getMemoryMetrics() {
        const memUsage = process.memoryUsage();
        return {
            used: memUsage.rss,
            total: memUsage.rss + memUsage.heapTotal,
            usage: (memUsage.rss / (memUsage.rss + memUsage.heapTotal)) * 100,
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal
        };
    }
    getCPUMetrics() {
        const cpuUsage = process.cpuUsage();
        const loadAvg = process.platform === 'win32' ? [0, 0, 0] : require('os').loadavg();
        return {
            usage: (cpuUsage.user + cpuUsage.system) / 1000000,
            loadAverage: loadAvg
        };
    }
    getRequestMetrics() {
        const avgResponseTime = this.requestMetrics.responseTimes.length > 0
            ? this.requestMetrics.responseTimes.reduce((a, b) => a + b, 0) / this.requestMetrics.responseTimes.length
            : 0;
        return {
            total: this.requestMetrics.total,
            successful: this.requestMetrics.successful,
            failed: this.requestMetrics.failed,
            averageResponseTime: avgResponseTime
        };
    }
    trackRequest(responseTime, success) {
        this.requestMetrics.total++;
        this.requestMetrics.responseTimes.push(responseTime);
        if (this.requestMetrics.responseTimes.length > 1000) {
            this.requestMetrics.responseTimes = this.requestMetrics.responseTimes.slice(-1000);
        }
        if (success) {
            this.requestMetrics.successful++;
        }
        else {
            this.requestMetrics.failed++;
        }
    }
    logError(error) {
        this.lastErrors.push(`${new Date().toISOString()}: ${error}`);
        if (this.lastErrors.length > 50) {
            this.lastErrors = this.lastErrors.slice(-50);
        }
    }
}
export const healthCheckService = new HealthCheckService();
export const healthCheckHandler = async (req, res) => {
    try {
        const healthResult = await healthCheckService.performHealthCheck();
        const statusCode = healthResult.status === 'healthy' ? 200 :
            healthResult.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json(healthResult);
    }
    catch (error) {
        console.error('[Health Check] Handler error:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Health check failed'
        });
    }
};
export const metricsHandler = async (req, res) => {
    try {
        const healthResult = await healthCheckService.performHealthCheck();
        const prometheusMetrics = `
# HELP helix_app_status Application health status (1=healthy, 0.5=degraded, 0=unhealthy)
# TYPE helix_app_status gauge
helix_app_status{environment="${healthResult.environment}"} ${healthResult.status === 'healthy' ? 1 : healthResult.status === 'degraded' ? 0.5 : 0}

# HELP helix_app_uptime_seconds Application uptime in seconds
# TYPE helix_app_uptime_seconds counter
helix_app_uptime_seconds ${healthResult.uptime}

# HELP helix_memory_usage_bytes Memory usage in bytes
# TYPE helix_memory_usage_bytes gauge
helix_memory_usage_bytes{type="used"} ${healthResult.metrics.memory.used}
helix_memory_usage_bytes{type="heap_used"} ${healthResult.metrics.memory.heapUsed}
helix_memory_usage_bytes{type="heap_total"} ${healthResult.metrics.memory.heapTotal}

# HELP helix_requests_total Total number of requests
# TYPE helix_requests_total counter
helix_requests_total{status="successful"} ${healthResult.metrics.requests.successful}
helix_requests_total{status="failed"} ${healthResult.metrics.requests.failed}

# HELP helix_response_time_seconds Average response time in seconds
# TYPE helix_response_time_seconds gauge
helix_response_time_seconds ${healthResult.metrics.requests.averageResponseTime / 1000}

# HELP helix_service_status Service health status (1=up, 0.5=degraded, 0=down)
# TYPE helix_service_status gauge
helix_service_status{service="database"} ${healthResult.services.database.status === 'up' ? 1 : healthResult.services.database.status === 'degraded' ? 0.5 : 0}
helix_service_status{service="cache"} ${healthResult.services.cache.status === 'up' ? 1 : healthResult.services.cache.status === 'degraded' ? 0.5 : 0}
helix_service_status{service="external_apis"} ${healthResult.services.externalAPIs.status === 'up' ? 1 : healthResult.services.externalAPIs.status === 'degraded' ? 0.5 : 0}
helix_service_status{service="data_collection"} ${healthResult.services.dataCollection.status === 'up' ? 1 : healthResult.services.dataCollection.status === 'degraded' ? 0.5 : 0}
`;
        res.set('Content-Type', 'application/json');
        res.json({
            success: true,
            metrics: prometheusMetrics,
            contentType: 'prometheus/metrics',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[Metrics] Handler error:', error);
        res.status(500).send('# Metrics unavailable\n');
    }
};
//# sourceMappingURL=healthCheck.js.map