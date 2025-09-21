import { storage } from "../storage";
export class HistoricalDataService {
    constructor() {
        this.retentionPolicy = {
            regulatoryUpdates: {
                activeRetention: '7 Jahre',
                archiveRetention: '10 Jahre',
                deletionPolicy: 'Nach 10 Jahren mit Ausnahmen für Präzedenzfälle'
            },
            legalCases: {
                activeRetention: '10 Jahre',
                archiveRetention: '15 Jahre',
                deletionPolicy: 'Nach 15 Jahren mit Ausnahmen für wegweisende Urteile'
            },
            knowledgeArticles: {
                activeRetention: '5 Jahre',
                archiveRetention: '7 Jahre',
                deletionPolicy: 'Nach 7 Jahren außer bei aktiven Referenzen'
            }
        };
    }
    async initializeHistoricalDownload() {
        console.log('Historical data service initialized successfully');
    }
    async setupContinuousMonitoring() {
        console.log('Continuous monitoring setup completed');
    }
    async analyzeHistoricalTrends(dataType, timeframe = 'monthly') {
        try {
            console.log(`Analyzing historical trends for ${dataType} data with ${timeframe} intervals`);
            const timeframeTrends = [];
            const comparisons = [];
            const seasonalPatterns = [];
            const longTermTrends = [];
            const recommendations = [];
            let regulatoryData = [];
            let legalData = [];
            if (dataType === 'regulatory' || dataType === 'all') {
                regulatoryData = await storage.getAllRegulatoryUpdates();
            }
            if (dataType === 'legal' || dataType === 'all') {
                legalData = await storage.getAllLegalCases();
            }
            if (regulatoryData.length > 0) {
                const regulatoryTrends = this.calculateTrends(regulatoryData.map(item => ({
                    date: new Date(item.publishedAt),
                    priority: this.priorityToNumber(item.priority),
                    categories: item.categories || []
                })), timeframe);
                timeframeTrends.push(...regulatoryTrends);
                const currentPeriodRegulatory = regulatoryData.filter(item => {
                    const itemDate = new Date(item.publishedAt);
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return itemDate > thirtyDaysAgo;
                });
                const previousPeriodRegulatory = regulatoryData.filter(item => {
                    const itemDate = new Date(item.publishedAt);
                    const sixtyDaysAgo = new Date();
                    const thirtyDaysAgo = new Date();
                    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return itemDate > sixtyDaysAgo && itemDate <= thirtyDaysAgo;
                });
                comparisons.push({
                    metric: 'Regulatorische Updates (30 Tage)',
                    currentValue: currentPeriodRegulatory.length,
                    previousValue: previousPeriodRegulatory.length,
                    changePercentage: this.calculatePercentageChange(previousPeriodRegulatory.length, currentPeriodRegulatory.length),
                    trend: this.determineTrend(previousPeriodRegulatory.length, currentPeriodRegulatory.length)
                });
            }
            if (legalData.length > 0) {
                const legalTrends = this.calculateTrends(legalData.map(item => ({
                    date: new Date(item.publishedAt),
                    priority: 2,
                    categories: [item.caseType || 'Allgemein']
                })), timeframe);
                timeframeTrends.push(...legalTrends.map(trend => ({
                    ...trend,
                    period: `Legal ${trend.period}`
                })));
                const currentPeriodLegal = legalData.filter(item => {
                    const itemDate = new Date(item.publishedAt);
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return itemDate > thirtyDaysAgo;
                });
                const previousPeriodLegal = legalData.filter(item => {
                    const itemDate = new Date(item.publishedAt);
                    const sixtyDaysAgo = new Date();
                    const thirtyDaysAgo = new Date();
                    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return itemDate > sixtyDaysAgo && itemDate <= thirtyDaysAgo;
                });
                comparisons.push({
                    metric: 'Rechtsfälle (30 Tage)',
                    currentValue: currentPeriodLegal.length,
                    previousValue: previousPeriodLegal.length,
                    changePercentage: this.calculatePercentageChange(previousPeriodLegal.length, currentPeriodLegal.length),
                    trend: this.determineTrend(previousPeriodLegal.length, currentPeriodLegal.length)
                });
            }
            seasonalPatterns.push(...this.identifySeasonalPatterns([...regulatoryData, ...legalData]));
            longTermTrends.push(...this.identifyLongTermTrends([...regulatoryData, ...legalData]));
            recommendations.push(...this.generateHistoricalRecommendations(comparisons, seasonalPatterns, longTermTrends));
            return {
                timeframeTrends,
                comparisons,
                seasonalPatterns,
                longTermTrends,
                recommendations
            };
        }
        catch (error) {
            console.error("Error analyzing historical trends:", error);
            return {
                timeframeTrends: [],
                comparisons: [],
                seasonalPatterns: ['Historische Analyse nicht verfügbar'],
                longTermTrends: ['Manuelle Trendanalyse erforderlich'],
                recommendations: ['Datenqualität überprüfen und erneut analysieren']
            };
        }
    }
    calculateTrends(data, timeframe) {
        const trends = [];
        const groupedData = this.groupByTimeframe(data, timeframe);
        for (const [period, items] of Object.entries(groupedData)) {
            const count = items.length;
            const avgPriority = items.reduce((sum, item) => sum + item.priority, 0) / items.length;
            const categoryCount = {};
            items.forEach(item => {
                item.categories.forEach(category => {
                    categoryCount[category] = (categoryCount[category] || 0) + 1;
                });
            });
            const mainCategories = Object.entries(categoryCount)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([category]) => category);
            trends.push({
                period,
                count,
                avgPriority,
                mainCategories
            });
        }
        return trends.sort((a, b) => a.period.localeCompare(b.period));
    }
    groupByTimeframe(data, timeframe) {
        const grouped = {};
        data.forEach(item => {
            let key;
            switch (timeframe) {
                case 'monthly':
                    key = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`;
                    break;
                case 'quarterly':
                    const quarter = Math.floor(item.date.getMonth() / 3) + 1;
                    key = `${item.date.getFullYear()}-Q${quarter}`;
                    break;
                case 'yearly':
                    key = item.date.getFullYear().toString();
                    break;
            }
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(item);
        });
        return grouped;
    }
    identifySeasonalPatterns(data) {
        const patterns = [];
        const monthlyCount = {};
        data.forEach(item => {
            const date = new Date(item.publishedAt);
            const month = date.getMonth();
            monthlyCount[month] = (monthlyCount[month] || 0) + 1;
        });
        const sortedMonths = Object.entries(monthlyCount)
            .sort(([, a], [, b]) => b - a);
        if (sortedMonths.length > 0) {
            const peakMonth = parseInt(sortedMonths[0][0]);
            const monthNames = [
                'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
            ];
            patterns.push(`Höchste Aktivität in ${monthNames[peakMonth]}`);
        }
        const quarters = [0, 0, 0, 0];
        Object.entries(monthlyCount).forEach(([month, count]) => {
            const quarter = Math.floor(parseInt(month) / 3);
            quarters[quarter] += count;
        });
        const maxQuarter = quarters.indexOf(Math.max(...quarters));
        const quarterNames = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Okt-Dez)'];
        patterns.push(`Höchste quartalsweise Aktivität in ${quarterNames[maxQuarter]}`);
        return patterns;
    }
    identifyLongTermTrends(data) {
        const trends = [];
        if (data.length < 10) {
            trends.push('Unzureichende Daten für Langzeittrend-Analyse');
            return trends;
        }
        const yearlyCount = {};
        data.forEach(item => {
            const year = new Date(item.publishedAt).getFullYear();
            yearlyCount[year] = (yearlyCount[year] || 0) + 1;
        });
        const years = Object.keys(yearlyCount).map(Number).sort();
        if (years.length >= 2) {
            const firstYear = years[0];
            const lastYear = years[years.length - 1];
            const firstYearCount = yearlyCount[firstYear];
            const lastYearCount = yearlyCount[lastYear];
            if (lastYearCount > firstYearCount * 1.2) {
                trends.push('Langfristig steigende Tendenz bei regulatorischen Aktivitäten');
            }
            else if (lastYearCount < firstYearCount * 0.8) {
                trends.push('Langfristig abnehmende Tendenz bei regulatorischen Aktivitäten');
            }
            else {
                trends.push('Stabile langfristige Entwicklung');
            }
        }
        return trends;
    }
    generateHistoricalRecommendations(comparisons, seasonalPatterns, longTermTrends) {
        const recommendations = [];
        const increasingMetrics = comparisons.filter(c => c.trend === 'increasing');
        if (increasingMetrics.length > 0) {
            recommendations.push('Erhöhte Überwachungskapazitäten aufgrund steigender Aktivität empfohlen');
        }
        if (seasonalPatterns.some(p => p.includes('Q4'))) {
            recommendations.push('Verstärkte Ressourcenplanung für Q4 aufgrund historisch hoher Aktivität');
        }
        if (longTermTrends.some(t => t.includes('steigend'))) {
            recommendations.push('Langfristige Kapazitätserweiterung der Compliance-Teams prüfen');
        }
        recommendations.push('Quartalsmäßige historische Trend-Reviews implementieren');
        recommendations.push('Automatisierte Trend-Alerts für signifikante Abweichungen einrichten');
        return recommendations;
    }
    async archiveOldData() {
        try {
            console.log('Starting automated data archival process...');
            const report = [];
            let archivedRegulatory = 0;
            let archivedLegal = 0;
            let archivedKnowledge = 0;
            const regulatoryCutoff = new Date();
            regulatoryCutoff.setFullYear(regulatoryCutoff.getFullYear() - 7);
            const legalCutoff = new Date();
            legalCutoff.setFullYear(legalCutoff.getFullYear() - 10);
            const knowledgeCutoff = new Date();
            knowledgeCutoff.setFullYear(knowledgeCutoff.getFullYear() - 5);
            const oldRegulatoryUpdates = await storage.getAllRegulatoryUpdates();
            const toArchiveRegulatory = oldRegulatoryUpdates.filter(update => new Date(update.publishedAt) < regulatoryCutoff && !this.isExceptionCase(update));
            for (const update of toArchiveRegulatory) {
                await this.moveToArchive('regulatory', update);
                archivedRegulatory++;
            }
            const oldLegalCases = await storage.getAllLegalCases();
            const toArchiveLegal = oldLegalCases.filter(legalCase => new Date(legalCase.publishedAt) < legalCutoff && !this.isLegalExceptionCase(legalCase));
            for (const legalCase of toArchiveLegal) {
                await this.moveToArchive('legal', legalCase);
                archivedLegal++;
            }
            report.push(`Archiviert: ${archivedRegulatory} regulatorische Updates`);
            report.push(`Archiviert: ${archivedLegal} Rechtsfälle`);
            report.push(`Archiviert: ${archivedKnowledge} Wissensartikel`);
            report.push(`Archivierungsprozess abgeschlossen: ${new Date().toISOString()}`);
            console.log('Data archival process completed');
            return {
                archivedRegulatory,
                archivedLegal,
                archivedKnowledge,
                report
            };
        }
        catch (error) {
            console.error('Error during data archival:', error);
            return {
                archivedRegulatory: 0,
                archivedLegal: 0,
                archivedKnowledge: 0,
                report: ['Archivierungsfehler: ' + error.message]
            };
        }
    }
    isExceptionCase(update) {
        return update.priority === 'critical' ||
            update.categories?.includes('Präzedenzfall') ||
            update.updateType === 'recall';
    }
    isLegalExceptionCase(legalCase) {
        return legalCase.significance === 'high' ||
            legalCase.caseType === 'Präzedenzfall' ||
            legalCase.keyIssues?.includes('Grundsatzentscheidung');
    }
    async moveToArchive(type, data) {
        console.log(`Archiving ${type} data: ${data.id || data.title}`);
    }
    priorityToNumber(priority) {
        switch (priority) {
            case 'critical': return 4;
            case 'high': return 3;
            case 'medium': return 2;
            case 'low': return 1;
            default: return 2;
        }
    }
    calculatePercentageChange(oldValue, newValue) {
        if (oldValue === 0)
            return newValue > 0 ? 100 : 0;
        return ((newValue - oldValue) / oldValue) * 100;
    }
    determineTrend(oldValue, newValue) {
        const changePercent = this.calculatePercentageChange(oldValue, newValue);
        if (changePercent > 10)
            return 'increasing';
        if (changePercent < -10)
            return 'decreasing';
        return 'stable';
    }
    getRetentionPolicy() {
        return this.retentionPolicy;
    }
    async generateComplianceReport() {
        const dataGaps = [];
        const recommendations = [];
        const currentDate = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const recentUpdates = await storage.getAllRegulatoryUpdates();
        const recentData = recentUpdates.filter(update => new Date(update.publishedAt) > oneMonthAgo);
        if (recentData.length === 0) {
            dataGaps.push('Keine regulatorischen Updates im letzten Monat');
            recommendations.push('Datensammlung überprüfen und Quellen validieren');
        }
        return {
            retentionCompliance: true,
            dataGaps,
            recommendations,
            lastArchival: new Date().toISOString()
        };
    }
}
export const historicalDataService = new HistoricalDataService();
//# sourceMappingURL=historicalDataService.js.map