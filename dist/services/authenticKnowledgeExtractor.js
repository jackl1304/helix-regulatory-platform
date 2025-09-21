import { Logger } from './logger.service';
import { storage } from '../storage';
import { JAMANetworkScrapingService } from './jamaNetworkScrapingService';
export class AuthenticKnowledgeExtractor {
    constructor() {
        this.logger = new Logger('AuthenticKnowledgeExtractor');
        this.jamaService = new JAMANetworkScrapingService();
        this.authenticSources = [
            {
                id: 'jama_medical_devices',
                name: 'JAMA Network - Medical Devices Collection',
                url: 'https://jamanetwork.com/collections/5738/medical-devices-and-equipment',
                authenticAPI: true,
                extractorService: 'JAMANetworkScrapingService'
            }
        ];
    }
    async extractAuthenticKnowledgeArticles() {
        this.logger.info('Starting AUTHENTIC knowledge extraction - NO DEMO DATA');
        const stats = {
            totalSources: this.authenticSources.length,
            processedSources: 0,
            articlesExtracted: 0,
            errors: 0,
            duplicatesSkipped: 0
        };
        if (stats.totalSources === 0) {
            this.logger.warn('NO AUTHENTIC KNOWLEDGE SOURCES CONFIGURED - Knowledge extraction disabled');
            return stats;
        }
        for (const source of this.authenticSources) {
            try {
                this.logger.info('Processing AUTHENTIC knowledge source', {
                    sourceId: source.id,
                    sourceName: source.name,
                    hasAPI: source.authenticAPI
                });
                const articles = await this.extractFromAuthenticSource(source);
                for (const article of articles) {
                    try {
                        await storage.createRegulatoryUpdate({
                            title: article.title,
                            content: article.content || article.abstract,
                            source: source.name,
                            sourceId: source.id,
                            url: article.url,
                            publishedAt: new Date(article.publishedDate),
                            jurisdiction: 'Global',
                            category: 'Medical Research',
                            tags: JSON.stringify(article.tags || []),
                            author: article.authors.join(', '),
                            wordCount: article.content?.length || 500,
                            relevanceScore: 9,
                            difficulty: 'advanced'
                        });
                        stats.articlesExtracted++;
                    }
                    catch (error) {
                        if (error.message?.includes('duplicate')) {
                            stats.duplicatesSkipped++;
                        }
                        else {
                            this.logger.error('Failed to store authentic article', {
                                error: error.message,
                                title: article.title
                            });
                            stats.errors++;
                        }
                    }
                }
                stats.processedSources++;
                this.logger.info('Authentic source processing completed', {
                    sourceId: source.id,
                    articlesExtracted: articles.length,
                    duplicatesSkipped: 0
                });
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            catch (error) {
                this.logger.error('Failed to process authentic knowledge source', {
                    sourceId: source.id,
                    error: error.message
                });
                stats.errors++;
            }
        }
        this.logger.info('AUTHENTIC knowledge extraction completed - NO DEMO DATA USED', stats);
        return stats;
    }
    async extractFromAuthenticSource(source) {
        switch (source.extractorService) {
            case 'JAMANetworkScrapingService':
                return await this.jamaService.scrapeJAMAArticles();
            default:
                this.logger.warn(`No authentic extractor available for ${source.name}`);
                return [];
        }
    }
    getAuthenticSourcesInfo() {
        const authenticated = this.authenticSources.filter(s => s.authenticAPI).length;
        return {
            totalConfigured: this.authenticSources.length,
            authenticated,
            pendingAPIKeys: this.authenticSources.length - authenticated
        };
    }
}
export const authenticKnowledgeExtractor = new AuthenticKnowledgeExtractor();
//# sourceMappingURL=authenticKnowledgeExtractor.js.map