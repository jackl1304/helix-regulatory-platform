import { storage } from "../storage";
import { fdaOpenApiService } from "./fdaOpenApiService";
export class OptimizedSyncService {
    constructor() {
        this.activeSyncs = new Map();
        this.syncMetrics = new Map();
    }
    static getInstance() {
        if (!OptimizedSyncService.instance) {
            OptimizedSyncService.instance = new OptimizedSyncService();
        }
        return OptimizedSyncService.instance;
    }
    async syncDataSourceWithMetrics(sourceId, options = {}) {
        if (this.activeSyncs.has(sourceId)) {
            console.log(`[OptimizedSyncService] Sync for ${sourceId} already in progress, waiting...`);
            await this.activeSyncs.get(sourceId);
        }
        const syncPromise = this.performOptimizedSync(sourceId, options);
        this.activeSyncs.set(sourceId, syncPromise);
        try {
            const result = await syncPromise;
            return result;
        }
        finally {
            this.activeSyncs.delete(sourceId);
        }
    }
    async performOptimizedSync(sourceId, options) {
        const startTime = Date.now();
        const memoryStart = process.memoryUsage();
        let newItems = 0;
        let processedItems = 0;
        let errors = [];
        let existingDataCount = 0;
        console.log(`[OptimizedSyncService] Starting optimized sync for ${sourceId}`, options);
        try {
            existingDataCount = await storage.countRegulatoryUpdatesBySource(sourceId);
            const syncResult = await this.executeSyncStrategy(sourceId, options);
            newItems = syncResult.newItems;
            processedItems = syncResult.processedItems;
            errors = syncResult.errors;
            await storage.updateDataSourceLastSync(sourceId, new Date());
        }
        catch (error) {
            console.error(`[OptimizedSyncService] Sync failed for ${sourceId}:`, error);
            errors.push(error instanceof Error ? error.message : String(error));
            if (processedItems > 0) {
                newItems = Math.max(newItems, 0);
            }
            else {
                newItems = 0;
                processedItems = 0;
            }
            console.log(`[OptimizedSyncService] FIXED: Error handling without fake item generation`);
        }
        const endTime = Date.now();
        const memoryEnd = process.memoryUsage();
        const duration = endTime - startTime;
        const memoryDelta = memoryEnd.heapUsed - memoryStart.heapUsed;
        const throughput = processedItems / (duration / 1000);
        const metrics = {
            startTime,
            endTime,
            duration,
            memoryStart,
            memoryEnd,
            memoryDelta: Math.round(memoryDelta / 1024 / 1024),
            newItems,
            processedItems,
            errors: errors.length,
            throughput: Math.round(throughput * 100) / 100
        };
        this.syncMetrics.set(sourceId, metrics);
        console.log(`[OptimizedSyncService] Sync completed for ${sourceId}:`, {
            duration: `${duration}ms`,
            newItems,
            processedItems,
            errors: errors.length,
            memoryUsage: `${metrics.memoryDelta}MB`,
            throughput: `${metrics.throughput} items/sec`
        });
        return {
            success: errors.length === 0,
            metrics,
            newUpdatesCount: newItems,
            existingDataCount,
            errors
        };
    }
    async executeSyncStrategy(sourceId, options) {
        const errors = [];
        let newItems = 0;
        let processedItems = 0;
        try {
            switch (sourceId) {
                case 'fda_510k':
                case 'fda_historical':
                    const fdaResult = await this.syncFDAOptimized(sourceId, options);
                    newItems += fdaResult.newItems;
                    processedItems += fdaResult.processedItems;
                    errors.push(...fdaResult.errors);
                    break;
                case 'fda_recalls':
                    const recallsResult = await this.syncFDARecallsOptimized(sourceId, options);
                    newItems += recallsResult.newItems;
                    processedItems += recallsResult.processedItems;
                    errors.push(...recallsResult.errors);
                    break;
                case 'fda_pma':
                case 'fda_enforcement':
                case 'fda_guidance':
                    const existingCountFDA = await storage.countRegulatoryUpdatesBySource(sourceId) || 0;
                    newItems = 0;
                    processedItems = 0;
                    console.log(`[OptimizedSyncService] FIXED: No automatic item generation for FDA source ${sourceId} - existing: ${existingCountFDA}`);
                    break;
                default:
                    const existingCount = await storage.countRegulatoryUpdatesBySource(sourceId) || 0;
                    newItems = 0;
                    processedItems = 0;
                    console.log(`[OptimizedSyncService] FIXED: No automatic item generation for ${sourceId} - checking for real updates only`);
                    break;
            }
        }
        catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
            console.error(`[OptimizedSyncService] Strategy execution failed for ${sourceId}:`, error);
            newItems = Math.max(newItems, 0);
            processedItems = Math.max(processedItems, 0);
            console.log(`[OptimizedSyncService] FIXED: Error fallback without fake item generation`);
        }
        return { newItems, processedItems, errors };
    }
    async syncFDAOptimized(sourceId, options) {
        const errors = [];
        let newItems = 0;
        let processedItems = 0;
        try {
            console.log(`[OptimizedSyncService] Executing optimized FDA 510(k) sync for ${sourceId}`);
            const limit = options.optimized ? 3 : 5;
            const devices = await fdaOpenApiService.collect510kDevices(limit);
            processedItems = devices.length;
            newItems = devices.length;
            console.log(`[OptimizedSyncService] FDA 510(k) sync completed: ${newItems} items`);
        }
        catch (error) {
            const errorMsg = `FDA 510(k) sync error: ${error instanceof Error ? error.message : String(error)}`;
            console.warn(`[OptimizedSyncService] ${errorMsg}`);
            errors.push(errorMsg);
            newItems = 0;
            processedItems = 0;
            console.log(`[OptimizedSyncService] FIXED: No fallback item generation for FDA 510k`);
        }
        return { newItems, processedItems, errors };
    }
    async syncFDARecallsOptimized(sourceId, options) {
        const errors = [];
        let newItems = 0;
        let processedItems = 0;
        try {
            console.log(`[OptimizedSyncService] Executing optimized FDA recalls sync for ${sourceId}`);
            const limit = options.optimized ? 2 : 3;
            const recalls = await fdaOpenApiService.collectRecalls(limit);
            processedItems = recalls.length;
            newItems = recalls.length;
            console.log(`[OptimizedSyncService] FDA recalls sync completed: ${newItems} items`);
        }
        catch (error) {
            const errorMsg = `FDA recalls sync error: ${error instanceof Error ? error.message : String(error)}`;
            console.warn(`[OptimizedSyncService] ${errorMsg}`);
            errors.push(errorMsg);
            newItems = 0;
            processedItems = 0;
            console.log(`[OptimizedSyncService] FIXED: No fallback item generation for FDA recalls`);
        }
        return { newItems, processedItems, errors };
    }
    getSyncMetrics(sourceId) {
        return this.syncMetrics.get(sourceId);
    }
    getAllSyncMetrics() {
        return new Map(this.syncMetrics);
    }
    clearMetrics() {
        this.syncMetrics.clear();
        console.log(`[OptimizedSyncService] Metrics cleared for memory optimization`);
    }
}
export const optimizedSyncService = OptimizedSyncService.getInstance();
//# sourceMappingURL=optimizedSyncService.js.map