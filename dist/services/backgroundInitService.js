import { Logger } from './logger.service';
import { storage } from '../storage';
import { legalDataService } from './legalDataService';
const logger = new Logger('BackgroundInitService');
export class BackgroundInitService {
    constructor() {
        this.initializationPromise = null;
    }
    static getInstance() {
        if (!BackgroundInitService.instance) {
            BackgroundInitService.instance = new BackgroundInitService();
        }
        return BackgroundInitService.instance;
    }
    async startBackgroundInit() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        this.initializationPromise = this.performBackgroundInit();
        this.initializationPromise.catch(error => {
            logger.error('Background initialization failed', { error });
        });
        return Promise.resolve();
    }
    async waitForInit() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        return Promise.resolve();
    }
    async performBackgroundInit() {
        logger.info("Starting background data initialization...");
        try {
            await this.initializeDataSources();
            await this.initializeLegalDataIfNeeded();
            await this.initializeRegulatoryDataIfNeeded();
            logger.info("Background initialization completed successfully");
        }
        catch (error) {
            logger.error("Background initialization failed", { error });
            throw error;
        }
    }
    async initializeDataSources() {
        try {
            const existingSources = await storage.getAllDataSources();
            logger.info(`Found ${existingSources.length} existing data sources`);
            if (existingSources.length < 46) {
                logger.info("Initializing additional data sources...");
                const requiredSources = [
                    { id: 'grip_platform', name: 'GRIP Regulatory Intelligence', endpoint: 'https://grip-app.pureglobal.com', country: 'GLOBAL', region: 'Global', type: 'intelligence', category: 'regulatory', isActive: true },
                    { id: 'fda_510k', name: 'FDA 510(k) Database', endpoint: 'https://api.fda.gov/device/510k.json', country: 'US', region: 'North America', type: 'regulatory', category: 'approvals', isActive: true },
                    { id: 'fda_recalls', name: 'FDA Device Recalls', endpoint: 'https://api.fda.gov/device/recall.json', country: 'US', region: 'North America', type: 'safety', category: 'recalls', isActive: true },
                ];
                for (const source of requiredSources) {
                    try {
                        await storage.createDataSource(source);
                        logger.debug(`Created/Updated data source: ${source.name}`);
                    }
                    catch (err) {
                        const errorMessage = err instanceof Error ? err.message : String(err);
                        logger.debug(`Data source ${source.name} already exists or error: ${errorMessage}`);
                    }
                }
            }
            const finalCount = await storage.getAllDataSources();
            logger.info(`Data sources ready: ${finalCount.length} sources available`);
        }
        catch (error) {
            logger.error("Error initializing data sources", { error });
            throw error;
        }
    }
    async initializeLegalDataIfNeeded() {
        try {
            const currentLegalCases = await storage.getAllLegalCases();
            logger.info(`Current legal cases in database: ${currentLegalCases.length}`);
            if (currentLegalCases.length < 100) {
                logger.info("Initializing legal data in background...");
                await legalDataService.initializeLegalData();
                const updatedLegalCount = await storage.getAllLegalCases();
                logger.info(`Legal data initialized: ${updatedLegalCount.length} legal cases`);
            }
        }
        catch (error) {
            logger.error("Error initializing legal data", { error });
        }
    }
    async initializeRegulatoryDataIfNeeded() {
        try {
            const currentUpdates = await storage.getAllRegulatoryUpdates();
            logger.info(`Current regulatory updates: ${currentUpdates.length}`);
            if (currentUpdates.length < 1000) {
                logger.info("Starting regulatory data collection in background...");
                const { DataCollectionService } = await import("./dataCollectionService");
                const dataService = new DataCollectionService();
                await dataService.performLimitedDataCollection(10);
                const updatedCount = await storage.getAllRegulatoryUpdates();
                logger.info(`Regulatory data collection completed: ${updatedCount.length} updates`);
            }
        }
        catch (error) {
            logger.error("Error collecting regulatory data", { error });
        }
    }
}
export const backgroundInitService = BackgroundInitService.getInstance();
//# sourceMappingURL=backgroundInitService.js.map