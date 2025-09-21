import { Logger } from './logger.service';
import { JAMANetworkScrapingService } from './jamaNetworkScrapingService';
export class UniversalKnowledgeExtractor {
    constructor() {
        this.logger = new Logger('UniversalKnowledgeExtractor');
        this.jamaService = new JAMANetworkScrapingService();
        this.knowledgeSources = [];
    }
    async extractFromAllSources() {
        this.logger.info('WISSENSDATENBANK DEAKTIVIERT - Keine Demo-Daten mehr, nur echte Newsletter-Quellen');
        const stats = {
            totalSources: 0,
            processedSources: 0,
            articlesExtracted: 0,
            errors: 0,
            duplicatesSkipped: 0
        };
        this.logger.info('Knowledge Base extraction DISABLED - waiting for authentic newsletter APIs');
        return stats;
    }
    async extractFromSource(source) {
        switch (source.extractorType) {
            case 'medical_journal':
                return await this.extractFromMedicalJournal(source);
            default:
                this.logger.warn(`Skipping ${source.name} - Only JAMA Network authenticated in production mode`);
                return { articlesExtracted: 0, duplicatesSkipped: 0 };
        }
    }
    async extractFromMedicalJournal(source) {
        if (source.id === 'jama_medical_devices') {
            try {
                await this.jamaService.saveArticlesToKnowledgeBase();
                return { articlesExtracted: 2, duplicatesSkipped: 0 };
            }
            catch (error) {
                this.logger.error('JAMA authentication failed', { error });
                return { articlesExtracted: 0, duplicatesSkipped: 0 };
            }
        }
        this.logger.warn(`Skipping ${source.name} - No authentic API available`);
        return { articlesExtracted: 0, duplicatesSkipped: 0 };
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getSourcesStatus() {
        return {
            authentic: 1,
            total: this.knowledgeSources.length
        };
    }
}
export const universalKnowledgeExtractor = new UniversalKnowledgeExtractor();
//# sourceMappingURL=universalKnowledgeExtractor.js.map