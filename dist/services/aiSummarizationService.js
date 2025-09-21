import { storage } from '../storage';
export class AISummarizationService {
    constructor() {
        this.apiUrl = 'https://api.anthropic.com/v1/messages';
        this.maxTokens = 1000;
        this.temperature = 0.3;
    }
    async generateSummary(request) {
        try {
            console.log(`[AI Summary] Generating summary for ${request.contentId}`);
            const content = await this.getContentById(request.contentId, request.contentType);
            if (!content) {
                throw new Error(`Content not found: ${request.contentId}`);
            }
            const summaryData = await this.callAISummarizationAPI(content, request);
            const summary = {
                id: `summary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                originalContentId: request.contentId,
                summaryType: `${request.targetAudience}_summary`,
                keyPoints: summaryData.keyPoints,
                impactAssessment: summaryData.impactAssessment,
                actionItems: summaryData.actionItems,
                riskLevel: summaryData.riskLevel,
                confidence: summaryData.confidence,
                generatedAt: new Date(),
                wordCount: summaryData.wordCount,
                readingTime: Math.ceil(summaryData.wordCount / 200)
            };
            console.log(`[AI Summary] Generated summary with ${summary.keyPoints.length} key points`);
            return summary;
        }
        catch (error) {
            console.error('[AI Summary] Error generating summary:', error);
            throw error;
        }
    }
    async getContentById(contentId, contentType) {
        try {
            switch (contentType) {
                case 'regulatory_update':
                    const updates = await storage.getAllRegulatoryUpdates();
                    return updates.find(u => u.id === contentId);
                case 'legal_case':
                    const legalCases = await storage.getAllLegalCases();
                    return legalCases.find(l => l.id === contentId);
                default:
                    return null;
            }
        }
        catch (error) {
            console.error('[AI Summary] Error fetching content:', error);
            return null;
        }
    }
    async callAISummarizationAPI(content, request) {
        try {
            console.log('[AI Summary] Using mock AI service for development');
            return this.generateMockSummary(content, request);
        }
        catch (error) {
            console.error('[AI Summary] AI API call failed:', error);
            return this.generateMockSummary(content, request);
        }
    }
    generateMockSummary(content, request) {
        const contentText = content.title + ' ' + content.content;
        const wordCount = contentText.split(' ').length;
        const themes = this.extractThemes(contentText);
        const riskLevel = this.assessRiskLevel(contentText, content);
        const summaryData = {
            keyPoints: this.generateKeyPoints(content, request.targetAudience, themes),
            impactAssessment: this.generateImpactAssessment(content, riskLevel),
            actionItems: this.generateActionItems(content, request.targetAudience),
            riskLevel,
            confidence: 0.85,
            wordCount: Math.floor(wordCount * 0.3)
        };
        return summaryData;
    }
    extractThemes(text) {
        const themes = [];
        const lowercaseText = text.toLowerCase();
        if (lowercaseText.includes('device') || lowercaseText.includes('medical')) {
            themes.push('Medical Device');
        }
        if (lowercaseText.includes('safety') || lowercaseText.includes('recall')) {
            themes.push('Safety Alert');
        }
        if (lowercaseText.includes('approval') || lowercaseText.includes('clearance')) {
            themes.push('Regulatory Approval');
        }
        if (lowercaseText.includes('clinical') || lowercaseText.includes('study')) {
            themes.push('Clinical Evidence');
        }
        if (lowercaseText.includes('software') || lowercaseText.includes('ai')) {
            themes.push('Digital Health');
        }
        if (lowercaseText.includes('implant') || lowercaseText.includes('cardiac')) {
            themes.push('Implantable Device');
        }
        return themes.length > 0 ? themes : ['General'];
    }
    assessRiskLevel(text, content) {
        const lowercaseText = text.toLowerCase();
        if (lowercaseText.includes('death') ||
            lowercaseText.includes('life-threatening') ||
            lowercaseText.includes('emergency') ||
            content.priority === 'critical') {
            return 'critical';
        }
        if (lowercaseText.includes('serious') ||
            lowercaseText.includes('injury') ||
            lowercaseText.includes('malfunction') ||
            lowercaseText.includes('recall') ||
            content.priority === 'high') {
            return 'high';
        }
        if (lowercaseText.includes('warning') ||
            lowercaseText.includes('advisory') ||
            lowercaseText.includes('precaution') ||
            content.priority === 'medium') {
            return 'medium';
        }
        return 'low';
    }
    generateKeyPoints(content, audience, themes) {
        const keyPoints = [];
        keyPoints.push(`${content.authority || 'Regulatory Authority'} issued ${content.type || 'update'}`);
        if (themes.includes('Safety Alert')) {
            keyPoints.push('Safety concern identified requiring immediate attention');
        }
        if (themes.includes('Regulatory Approval')) {
            keyPoints.push('New regulatory pathway or approval granted');
        }
        if (themes.includes('Clinical Evidence')) {
            keyPoints.push('Clinical data requirements or study results reported');
        }
        switch (audience) {
            case 'executive':
                keyPoints.push('Business impact assessment required for affected products');
                break;
            case 'technical':
                keyPoints.push('Technical specifications and compliance requirements detailed');
                break;
            case 'regulatory':
                keyPoints.push('Regulatory submission implications and timeline considerations');
                break;
        }
        if (content.region) {
            keyPoints.push(`Applies to ${content.region} market operations`);
        }
        return keyPoints.slice(0, 5);
    }
    generateImpactAssessment(content, riskLevel) {
        const impacts = [];
        switch (riskLevel) {
            case 'critical':
                impacts.push('Immediate action required - potential for serious harm');
                impacts.push('Market withdrawal or suspension may be necessary');
                break;
            case 'high':
                impacts.push('Significant compliance implications for affected devices');
                impacts.push('Review of quality systems and post-market surveillance recommended');
                break;
            case 'medium':
                impacts.push('Moderate impact on regulatory strategy and compliance activities');
                impacts.push('Documentation updates and process reviews advised');
                break;
            case 'low':
                impacts.push('Minimal immediate impact on current operations');
                impacts.push('Monitor for future developments and trend implications');
                break;
        }
        return impacts.join(' ');
    }
    generateActionItems(content, audience) {
        const actions = [];
        actions.push('Review current product portfolio for applicability');
        actions.push('Assess compliance with updated requirements');
        switch (audience) {
            case 'executive':
                actions.push('Evaluate business risk and resource allocation');
                actions.push('Consider impact on market strategy and timeline');
                break;
            case 'technical':
                actions.push('Update technical documentation and specifications');
                actions.push('Review design controls and verification protocols');
                break;
            case 'regulatory':
                actions.push('Update regulatory submission strategy');
                actions.push('Coordinate with regulatory consultants if needed');
                break;
        }
        return actions;
    }
    async batchSummarizeRecent(hours = 24) {
        try {
            console.log(`[AI Summary] Batch summarizing content from last ${hours} hours`);
            const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
            const allUpdates = await storage.getAllRegulatoryUpdates();
            const recentUpdates = allUpdates.filter(update => new Date(update.published_at) > cutoffDate).slice(0, 10);
            const summaries = [];
            for (const update of recentUpdates) {
                try {
                    const request = {
                        contentId: update.id,
                        contentType: 'regulatory_update',
                        priority: update.priority === 'critical' || update.priority === 'high' ? 'urgent' : 'standard',
                        targetAudience: 'regulatory'
                    };
                    const summary = await this.generateSummary(request);
                    summaries.push(summary);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                catch (error) {
                    console.error(`[AI Summary] Error summarizing ${update.id}:`, error);
                }
            }
            console.log(`[AI Summary] Generated ${summaries.length} batch summaries`);
            return summaries;
        }
        catch (error) {
            console.error('[AI Summary] Batch summarization failed:', error);
            throw error;
        }
    }
    async analyzeTrends(timeframe = '30d') {
        try {
            console.log(`[AI Summary] Analyzing trends for timeframe: ${timeframe}`);
            const allUpdates = await storage.getAllRegulatoryUpdates();
            const days = this.parseTimeframe(timeframe);
            const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const recentUpdates = allUpdates.filter(update => new Date(update.published_at) > cutoffDate);
            console.log(`[AI Summary] Analyzing ${recentUpdates.length} updates from last ${days} days`);
            const topicFrequency = this.analyzeTopicFrequency(recentUpdates);
            const trends = this.generateTrendItems(topicFrequency, recentUpdates);
            const emergingTopics = this.identifyEmergingTopics(recentUpdates);
            const riskFactors = this.identifyRiskFactors(recentUpdates);
            const recommendations = this.generateTrendRecommendations(trends, riskFactors);
            const analysis = {
                timeframe,
                trends,
                emergingTopics,
                riskFactors,
                recommendations
            };
            console.log(`[AI Summary] Generated trend analysis with ${trends.length} trends`);
            return analysis;
        }
        catch (error) {
            console.error('[AI Summary] Trend analysis failed:', error);
            throw error;
        }
    }
    parseTimeframe(timeframe) {
        const match = timeframe.match(/(\d+)([dwmy])/);
        if (!match)
            return 30;
        const [, num, unit] = match;
        const value = parseInt(num, 10);
        switch (unit) {
            case 'd': return value;
            case 'w': return value * 7;
            case 'm': return value * 30;
            case 'y': return value * 365;
            default: return 30;
        }
    }
    analyzeTopicFrequency(updates) {
        const frequency = {};
        for (const update of updates) {
            const themes = this.extractThemes(update.title + ' ' + update.content);
            for (const theme of themes) {
                frequency[theme] = (frequency[theme] || 0) + 1;
            }
        }
        return frequency;
    }
    generateTrendItems(frequency, updates) {
        const trends = [];
        for (const [topic, freq] of Object.entries(frequency)) {
            if (freq < 2)
                continue;
            const relatedUpdates = updates.filter(u => this.extractThemes(u.title + ' ' + u.content).includes(topic));
            const authorities = Array.from(new Set(relatedUpdates.map(u => u.authority)));
            const severity = this.assessTopicSeverity(relatedUpdates);
            const trajectory = this.assessTopicTrajectory(relatedUpdates);
            trends.push({
                topic,
                frequency: freq,
                severity,
                trajectory,
                relatedAuthorities: authorities
            });
        }
        return trends.sort((a, b) => b.frequency - a.frequency);
    }
    assessTopicSeverity(updates) {
        const priorities = updates.map(u => u.priority || 'low');
        const highPriorityCount = priorities.filter(p => p === 'high' || p === 'critical').length;
        if (highPriorityCount / updates.length > 0.5)
            return 'high';
        if (highPriorityCount > 0)
            return 'medium';
        return 'low';
    }
    assessTopicTrajectory(updates) {
        const sortedUpdates = updates.sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime());
        const midpoint = Math.floor(sortedUpdates.length / 2);
        const firstHalf = sortedUpdates.slice(0, midpoint);
        const secondHalf = sortedUpdates.slice(midpoint);
        if (secondHalf.length > firstHalf.length * 1.2)
            return 'increasing';
        if (firstHalf.length > secondHalf.length * 1.2)
            return 'decreasing';
        return 'stable';
    }
    identifyEmergingTopics(updates) {
        const emergingTopics = [];
        const recentUpdates = updates.slice(0, Math.floor(updates.length * 0.3));
        const recentThemes = this.analyzeTopicFrequency(recentUpdates);
        const allThemes = this.analyzeTopicFrequency(updates);
        for (const [theme, recentFreq] of Object.entries(recentThemes)) {
            const totalFreq = allThemes[theme];
            const recentRatio = recentFreq / totalFreq;
            if (recentRatio > 0.6 && totalFreq >= 3) {
                emergingTopics.push(theme);
            }
        }
        return emergingTopics.slice(0, 5);
    }
    identifyRiskFactors(updates) {
        const riskFactors = [];
        const criticalUpdates = updates.filter(u => u.priority === 'critical');
        const highUpdates = updates.filter(u => u.priority === 'high');
        if (criticalUpdates.length > 0) {
            riskFactors.push(`${criticalUpdates.length} critical regulatory alerts detected`);
        }
        if (highUpdates.length > updates.length * 0.3) {
            riskFactors.push('High volume of high-priority regulatory activity');
        }
        const safetyUpdates = updates.filter(u => (u.title + ' ' + u.content).toLowerCase().includes('safety'));
        if (safetyUpdates.length > updates.length * 0.2) {
            riskFactors.push('Increased safety-related regulatory communications');
        }
        return riskFactors;
    }
    generateTrendRecommendations(trends, riskFactors) {
        const recommendations = [];
        const highSeverityTrends = trends.filter(t => t.severity === 'high');
        if (highSeverityTrends.length > 0) {
            recommendations.push('Immediate review recommended for high-severity regulatory trends');
        }
        const increasingTrends = trends.filter(t => t.trajectory === 'increasing');
        if (increasingTrends.length > 0) {
            recommendations.push('Monitor increasing regulatory activity patterns for early intervention');
        }
        if (riskFactors.length > 2) {
            recommendations.push('Enhanced compliance monitoring advised due to elevated risk factors');
        }
        recommendations.push('Regular trend analysis should be conducted weekly for optimal regulatory intelligence');
        return recommendations;
    }
}
//# sourceMappingURL=aiSummarizationService.js.map