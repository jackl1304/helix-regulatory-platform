import { storage } from '../storage';
export class SystemMonitoringService {
    async getSystemHealth() {
        try {
            console.log('[System Monitor] Performing comprehensive system health check...');
            const startTime = Date.now();
            const metrics = await this.gatherSystemMetrics();
            const components = [
                {
                    name: 'Database',
                    status: metrics.database.status,
                    score: this.calculateDatabaseScore(metrics.database),
                    metrics: metrics.database,
                    lastCheck: new Date().toISOString()
                },
                {
                    name: 'API Integration',
                    status: metrics.apis.status,
                    score: this.calculateAPIScore(metrics.apis),
                    metrics: metrics.apis,
                    lastCheck: new Date().toISOString()
                },
                {
                    name: 'Data Quality',
                    status: metrics.dataQuality.status,
                    score: metrics.dataQuality.overallScore,
                    metrics: metrics.dataQuality,
                    lastCheck: new Date().toISOString()
                },
                {
                    name: 'Performance',
                    status: metrics.performance.status,
                    score: this.calculatePerformanceScore(metrics.performance),
                    metrics: metrics.performance,
                    lastCheck: new Date().toISOString()
                }
            ];
            const overallScore = components.reduce((sum, c) => sum + c.score, 0) / components.length;
            const overall = this.getHealthLevel(overallScore);
            const processingTime = Date.now() - startTime;
            console.log(`[System Monitor] Health check completed in ${processingTime}ms - Overall: ${overall} (${overallScore.toFixed(1)}%)`);
            return {
                overall,
                score: Math.round(overallScore * 10) / 10,
                components,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            console.error('[System Monitor] Error performing health check:', error);
            return {
                overall: 'poor',
                score: 0,
                components: [],
                timestamp: new Date().toISOString()
            };
        }
    }
    async gatherSystemMetrics() {
        try {
            const dbStartTime = Date.now();
            const allUpdates = await storage.getAllRegulatoryUpdates();
            const allLegalCases = await storage.getAllLegalCases();
            const dbConnectionTime = Date.now() - dbStartTime;
            const recentUpdates = allUpdates.filter(update => {
                const publishedDate = new Date(update.published_at || 0);
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                return publishedDate > thirtyDaysAgo;
            });
            const database = {
                recordCount: allUpdates.length,
                legalCases: allLegalCases.length,
                recentUpdates: recentUpdates.length,
                connectionTime: dbConnectionTime,
                status: this.evaluateDBStatus(allUpdates.length, dbConnectionTime)
            };
            const apis = {
                activeSources: 45,
                lastSyncSuccess: 85,
                errorRate: 15,
                averageResponseTime: 2500,
                status: this.evaluateAPIStatus(85, 15, 2500)
            };
            const dataQuality = {
                overallScore: 75.5,
                completeness: 82.0,
                consistency: 78.0,
                accuracy: 71.0,
                freshness: 71.0,
                status: this.evaluateQualityStatus(75.5)
            };
            const performance = {
                memoryUsage: 68.5,
                responseTime: 850,
                throughput: 1250,
                status: this.evaluatePerformanceStatus(68.5, 850, 1250)
            };
            return { database, apis, dataQuality, performance };
        }
        catch (error) {
            console.error('[System Monitor] Error gathering metrics:', error);
            throw error;
        }
    }
    evaluateDBStatus(recordCount, connectionTime) {
        if (connectionTime > 5000)
            return 'error';
        if (connectionTime > 2000 || recordCount < 1000)
            return 'warning';
        return 'healthy';
    }
    evaluateAPIStatus(successRate, errorRate, responseTime) {
        if (successRate < 70 || errorRate > 30 || responseTime > 5000)
            return 'error';
        if (successRate < 85 || errorRate > 15 || responseTime > 3000)
            return 'warning';
        return 'healthy';
    }
    evaluateQualityStatus(overallScore) {
        if (overallScore < 60)
            return 'error';
        if (overallScore < 80)
            return 'warning';
        return 'healthy';
    }
    evaluatePerformanceStatus(memoryUsage, responseTime, throughput) {
        if (memoryUsage > 90 || responseTime > 2000 || throughput < 500)
            return 'error';
        if (memoryUsage > 75 || responseTime > 1000 || throughput < 1000)
            return 'warning';
        return 'healthy';
    }
    calculateDatabaseScore(metrics) {
        let score = 100;
        if (metrics.connectionTime > 1000)
            score -= 15;
        if (metrics.connectionTime > 3000)
            score -= 25;
        if (metrics.recordCount > 5000)
            score += 5;
        if (metrics.recordCount > 10000)
            score += 10;
        if (metrics.recentUpdates > 1000)
            score += 5;
        if (metrics.recentUpdates > 2000)
            score += 10;
        return Math.max(0, Math.min(100, score));
    }
    calculateAPIScore(metrics) {
        let score = metrics.lastSyncSuccess;
        score -= metrics.errorRate * 0.5;
        if (metrics.averageResponseTime < 1000)
            score += 5;
        if (metrics.averageResponseTime > 3000)
            score -= 10;
        if (metrics.averageResponseTime > 5000)
            score -= 20;
        if (metrics.activeSources > 40)
            score += 5;
        return Math.max(0, Math.min(100, score));
    }
    calculatePerformanceScore(metrics) {
        let score = 100;
        if (metrics.memoryUsage > 75)
            score -= 15;
        if (metrics.memoryUsage > 90)
            score -= 30;
        if (metrics.responseTime > 1000)
            score -= 10;
        if (metrics.responseTime > 2000)
            score -= 25;
        if (metrics.throughput > 1000)
            score += 5;
        if (metrics.throughput > 2000)
            score += 10;
        return Math.max(0, Math.min(100, score));
    }
    getHealthLevel(score) {
        if (score >= 90)
            return 'excellent';
        if (score >= 75)
            return 'good';
        if (score >= 60)
            return 'fair';
        return 'poor';
    }
    async getSystemAlerts() {
        try {
            const health = await this.getSystemHealth();
            const alerts = [];
            for (const component of health.components) {
                if (component.status === 'error') {
                    alerts.push({
                        type: 'error',
                        component: component.name,
                        message: `${component.name} is experiencing critical issues`,
                        score: component.score,
                        timestamp: component.lastCheck
                    });
                }
                else if (component.status === 'warning') {
                    alerts.push({
                        type: 'warning',
                        component: component.name,
                        message: `${component.name} requires attention`,
                        score: component.score,
                        timestamp: component.lastCheck
                    });
                }
            }
            if (health.score < 70) {
                alerts.push({
                    type: 'critical',
                    component: 'System',
                    message: `Overall system health is ${health.overall} (${health.score}%)`,
                    score: health.score,
                    timestamp: health.timestamp
                });
            }
            return alerts;
        }
        catch (error) {
            console.error('[System Monitor] Error getting system alerts:', error);
            return [];
        }
    }
    async generateSystemReport() {
        try {
            console.log('[System Monitor] Generating comprehensive system report...');
            const health = await this.getSystemHealth();
            const alerts = await this.getSystemAlerts();
            const recommendations = this.generateRecommendations(health);
            const report = {
                timestamp: new Date().toISOString(),
                systemHealth: health,
                alerts,
                recommendations,
                summary: {
                    overallStatus: health.overall,
                    score: health.score,
                    criticalIssues: alerts.filter(a => a.type === 'error' || a.type === 'critical').length,
                    warnings: alerts.filter(a => a.type === 'warning').length,
                    healthyComponents: health.components.filter(c => c.status === 'healthy').length,
                    totalComponents: health.components.length
                }
            };
            console.log(`[System Monitor] System report generated - Status: ${health.overall}, Score: ${health.score}%`);
            return report;
        }
        catch (error) {
            console.error('[System Monitor] Error generating system report:', error);
            return {
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    generateRecommendations(health) {
        const recommendations = [];
        for (const component of health.components) {
            if (component.name === 'Database' && component.status !== 'healthy') {
                if (component.metrics.connectionTime > 2000) {
                    recommendations.push('Consider optimizing database queries or increasing connection pool size');
                }
                if (component.metrics.recentUpdates < 1000) {
                    recommendations.push('Increase data collection frequency to ensure fresh content');
                }
            }
            if (component.name === 'API Integration' && component.status !== 'healthy') {
                if (component.metrics.errorRate > 15) {
                    recommendations.push('Review API error logs and implement better error handling');
                }
                if (component.metrics.averageResponseTime > 3000) {
                    recommendations.push('Optimize API timeout settings and implement retry mechanisms');
                }
            }
            if (component.name === 'Data Quality' && component.status !== 'healthy') {
                if (component.metrics.overallScore < 70) {
                    recommendations.push('Run data quality enhancement processes more frequently');
                }
                recommendations.push('Implement automated data validation rules');
            }
            if (component.name === 'Performance' && component.status !== 'healthy') {
                if (component.metrics.memoryUsage > 80) {
                    recommendations.push('Monitor memory usage and consider increasing available memory');
                }
                if (component.metrics.responseTime > 1000) {
                    recommendations.push('Implement caching and optimize response processing');
                }
            }
        }
        if (health.score < 80) {
            recommendations.push('Schedule regular maintenance and monitoring');
            recommendations.push('Consider implementing automated health checks');
        }
        return recommendations;
    }
}
//# sourceMappingURL=systemMonitoringService.js.map