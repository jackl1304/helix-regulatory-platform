import { Logger } from './logger.service';
export class JAMANetworkScrapingService {
    constructor() {
        this.logger = new Logger('JAMANetworkScraping');
        this.baseUrl = 'https://jamanetwork.com';
    }
    async extractMedicalDeviceArticles() {
        this.logger.warn('JAMA Network extraction DISABLED - No authentic API access available');
        return [];
    }
    async extractArticlesFromPage(url) {
        this.logger.warn('JAMA Network scraping DISABLED - No authentic API access');
        return [];
    }
    async getTotalPages(url) {
        return 0;
    }
    async saveArticlesToKnowledgeBase() {
        this.logger.info('JAMA Knowledge Base saving DISABLED - No authentic articles to save');
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
export const jamaNetworkScrapingService = new JAMANetworkScrapingService();
//# sourceMappingURL=jamaNetworkScrapingService.js.map