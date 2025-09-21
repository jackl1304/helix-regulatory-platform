import { Logger } from './logger.service';
export class DeepKnowledgeScrapingService {
    constructor() {
        this.logger = new Logger('DeepKnowledgeScraping');
    }
    async performDeepScraping() {
        this.logger.info('Deep Knowledge Scraping DISABLED - Using authentic newsletter sources only');
        return {
            articlesStored: 0
        };
    }
}
export const deepKnowledgeScrapingService = new DeepKnowledgeScrapingService();
//# sourceMappingURL=deepKnowledgeScrapingService.js.map