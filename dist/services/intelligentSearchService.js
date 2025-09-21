class IntelligentSearchService {
    constructor() {
        this.knowledgeBase = [];
    }
    calculateSimilarity(text1, text2) {
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        const intersection = words1.filter(word => words2.includes(word));
        const union = Array.from(new Set([...words1, ...words2]));
        return intersection.length / union.length;
    }
    extractKeywords(query) {
        const keywords = query.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2)
            .filter(word => !['und', 'oder', 'der', 'die', 'das', 'ist', 'sind', 'für', 'mit', 'von', 'zu', 'auf', 'bei'].includes(word));
        return Array.from(new Set(keywords));
    }
    async searchRegulatoryData(query, filters) {
        const results = [];
        const keywords = this.extractKeywords(query);
        let regulatoryData = [];
        try {
            const storage = await import('../storage');
            const allUpdates = await storage.default.getAllRegulatoryUpdates();
            regulatoryData = allUpdates.slice(0, 50);
        }
        catch (error) {
            console.error('Error loading regulatory data for search:', error);
        }
        for (const item of regulatoryData) {
            const relevance = this.calculateSimilarity(query, item.title + " " + item.content);
            if (relevance > 0.1) {
                results.push({
                    id: item.id,
                    title: item.title,
                    content: item.content,
                    excerpt: item.content.substring(0, 200) + "...",
                    type: 'regulatory',
                    source: item.source,
                    relevance,
                    date: item.date,
                    metadata: {
                        region: item.region,
                        deviceClass: item.deviceClass,
                        tags: keywords
                    }
                });
            }
        }
        return results;
    }
    async searchLegalData(query, filters) {
        const results = [];
        const keywords = this.extractKeywords(query);
        try {
            const { legalDataService } = await import('./legalDataService');
            let legalData = [];
            try {
                const storage = await import('../storage');
                legalData = await storage.default.getAllLegalCases();
            }
            catch (error) {
                console.error('Error loading legal data for search:', error);
            }
            for (const legalCase of legalData) {
                const relevance = this.calculateSimilarity(query, legalCase.title + " " + legalCase.summary);
                if (relevance > 0.1) {
                    results.push({
                        id: legalCase.id,
                        title: legalCase.title,
                        content: legalCase.summary,
                        excerpt: legalCase.summary.substring(0, 200) + "...",
                        type: 'legal',
                        source: 'Legal Database',
                        relevance,
                        date: legalCase.date,
                        url: legalCase.url,
                        metadata: {
                            region: legalCase.jurisdiction,
                            category: legalCase.caseType,
                            tags: keywords
                        }
                    });
                }
            }
        }
        catch (error) {
            console.error('Error loading legal data service:', error);
        }
        return results;
    }
    async searchKnowledgeBase(query, filters) {
        const results = [];
        const keywords = this.extractKeywords(query);
        let knowledgeData = [];
        try {
            const storage = await import('../storage');
            knowledgeData = await storage.default.getAllKnowledgeArticles();
            console.log(`[SEARCH] Loaded ${knowledgeData.length} knowledge articles from database`);
        }
        catch (error) {
            console.error('🔴 MOCK DATA - Error loading knowledge articles:', error);
        }
        for (const item of knowledgeData) {
            const relevance = this.calculateSimilarity(query, item.title + " " + item.content);
            if (relevance > 0.1) {
                results.push({
                    id: item.id,
                    title: item.title,
                    content: item.content,
                    excerpt: item.content.substring(0, 200) + "...",
                    type: 'knowledge',
                    source: item.source || "Helix Knowledge Base",
                    relevance,
                    date: item.publishedAt || item.createdAt || "2025-01-20",
                    metadata: {
                        region: item.region,
                        deviceClass: item.deviceClass,
                        category: item.category,
                        tags: item.tags || keywords
                    }
                });
            }
        }
        return results;
    }
    async searchHistoricalData(query, filters) {
        const results = [];
        const keywords = this.extractKeywords(query);
        const historicalSources = ['fda_guidance', 'ema_guidelines', 'bfarm_guidance', 'mhra_guidance', 'swissmedic_guidance'];
        try {
            const { historicalDataService } = await import('./historicalDataService');
            for (const sourceId of historicalSources) {
                try {
                    const documents = await historicalDataService.getHistoricalData(sourceId);
                    for (const doc of documents.slice(0, 5)) {
                        const relevance = this.calculateSimilarity(query, doc.title + " " + (doc.summary || ''));
                        if (relevance > 0.1) {
                            results.push({
                                id: doc.id,
                                title: doc.title,
                                content: doc.summary || doc.title,
                                excerpt: (doc.summary || doc.title).substring(0, 200) + "...",
                                type: 'historical',
                                source: sourceId.replace('_', ' ').toUpperCase(),
                                relevance,
                                date: doc.publishedDate,
                                url: doc.documentUrl,
                                metadata: {
                                    region: doc.region,
                                    category: doc.documentType,
                                    language: doc.language,
                                    tags: keywords
                                }
                            });
                        }
                    }
                }
                catch (error) {
                    console.error(`Error searching historical data for ${sourceId}:`, error);
                }
            }
        }
        catch (error) {
            console.error('Error loading historical data service:', error);
        }
        return results;
    }
    generateIntelligentAnswer(query, results) {
        const topResults = results.slice(0, 5);
        const sources = Array.from(new Set(topResults.map(r => r.source)));
        let answer = "";
        let confidence = 75;
        let recommendations = [];
        let relatedTopics = [];
        const topResult = topResults[0];
        if (topResult) {
            answer = `Based auf echten Datenbank-Ergebnissen: ${topResult.content.substring(0, 300)}...`;
            confidence = Math.round(topResult.relevance * 100);
            recommendations = ["Überprüfen Sie die Quelldokumente für detaillierte Informationen"];
            relatedTopics = topResult.metadata.tags || [];
        }
        else {
            answer = "Keine Informationen in der Datenbank gefunden. Die Suche basiert nur auf authentischen Datenquellen.";
            confidence = 0;
            recommendations = ["Erweitern Sie Ihre Suche oder synchronisieren Sie neue Datenquellen"];
            relatedTopics = [];
        }
        return {
            query,
            answer,
            confidence,
            sources,
            recommendations,
            relatedTopics,
            timestamp: new Date().toISOString()
        };
    }
    async search(query, filters = { type: "all", region: "all", timeframe: "all" }) {
        const allResults = [];
        try {
            if (filters.type === "all" || filters.type === "regulatory") {
                const regulatoryResults = await this.searchRegulatoryData(query, filters);
                allResults.push(...regulatoryResults);
            }
            if (filters.type === "all" || filters.type === "legal") {
                const legalResults = await this.searchLegalData(query, filters);
                allResults.push(...legalResults);
            }
            if (filters.type === "all" || filters.type === "knowledge") {
                const knowledgeResults = await this.searchKnowledgeBase(query, filters);
                allResults.push(...knowledgeResults);
            }
            if (filters.type === "all" || filters.type === "historical") {
                const historicalResults = await this.searchHistoricalData(query, filters);
                allResults.push(...historicalResults);
            }
            allResults.sort((a, b) => b.relevance - a.relevance);
            const intelligentAnswer = this.generateIntelligentAnswer(query, allResults);
            return {
                results: allResults.slice(0, 20),
                answer: intelligentAnswer,
                totalResults: allResults.length
            };
        }
        catch (error) {
            console.error("Error in intelligent search:", error);
            throw new Error("Fehler bei der intelligenten Suche");
        }
    }
}
export const intelligentSearchService = new IntelligentSearchService();
export { IntelligentSearchService };
//# sourceMappingURL=intelligentSearchService.js.map