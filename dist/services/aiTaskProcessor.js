import { storage } from "../storage";
import { aiService } from "./aiService";
export class AITaskProcessor {
    constructor() {
        this.isProcessing = false;
        this.processingInterval = null;
        this.startProcessing();
    }
    startProcessing() {
        this.processingInterval = setInterval(() => {
            this.processPendingTasks();
        }, 10000);
        this.processPendingTasks();
    }
    async processPendingTasks() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        try {
            const pendingTasks = await storage.getPendingAiTasks();
            for (const task of pendingTasks) {
                await this.processTask(task);
            }
            const scheduledTasks = await storage.getScheduledAiTasks();
            for (const task of scheduledTasks) {
                await this.processTask(task);
            }
        }
        catch (error) {
        }
        finally {
            this.isProcessing = false;
        }
    }
    async processTask(task) {
        const startTime = Date.now();
        try {
            await storage.updateAiTask(task.id, {
                status: "processing",
            });
            let result;
            switch (task.type) {
                case "product_optimization":
                    result = await this.handleProductOptimization(task);
                    break;
                case "order_processing":
                    result = await this.handleOrderProcessing(task);
                    break;
                case "customer_service":
                    result = await this.handleCustomerService(task);
                    break;
                case "marketing":
                    result = await this.handleMarketing(task);
                    break;
                case "inventory_optimization":
                    result = await this.handleInventoryOptimization(task);
                    break;
                case "price_optimization":
                    result = await this.handlePriceOptimization(task);
                    break;
                case "customer_segmentation":
                    result = await this.handleCustomerSegmentation(task);
                    break;
                default:
                    throw new Error(`Unknown task type: ${task.type}`);
            }
            const processingTime = Date.now() - startTime;
            await storage.updateAiTask(task.id, {
                status: "completed",
                output: result,
                processingTime,
                completedAt: new Date(),
            });
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            await storage.updateAiTask(task.id, {
                status: "failed",
                error: error instanceof Error ? error.message : "Unknown error",
                processingTime,
                completedAt: new Date(),
            });
        }
    }
    async handleProductOptimization(task) {
        const { productId } = task.input;
        if (!productId) {
            throw new Error("Product ID is required for product optimization");
        }
        return await aiService.optimizeProduct(productId);
    }
    async handleOrderProcessing(task) {
        const { orderId } = task.input;
        if (!orderId) {
            throw new Error("Order ID is required for order processing");
        }
        return await aiService.processOrder(orderId);
    }
    async handleCustomerService(task) {
        const { conversationId, message } = task.input;
        if (!conversationId || !message) {
            throw new Error("Conversation ID and message are required for customer service");
        }
        return await aiService.handleCustomerService(conversationId, message);
    }
    async handleMarketing(task) {
        const { campaignType, targetAudience, budget } = task.input;
        if (!campaignType) {
            throw new Error("Campaign type is required for marketing");
        }
        return await aiService.generateMarketingCampaign(campaignType, targetAudience || {}, budget || 1000);
    }
    async handleInventoryOptimization(task) {
        return await aiService.optimizeInventory();
    }
    async handlePriceOptimization(task) {
        return await aiService.optimizeProductPricing();
    }
    async handleCustomerSegmentation(task) {
        return await aiService.analyzeCustomerSegmentation();
    }
    async scheduleAutomatedTasks() {
        const now = new Date();
        const inventoryTask = new Date(now);
        inventoryTask.setHours(2, 0, 0, 0);
        if (inventoryTask <= now) {
            inventoryTask.setDate(inventoryTask.getDate() + 1);
        }
        await storage.createAiTask({
            type: "inventory_optimization",
            input: {},
            priority: "medium",
            scheduled: true,
            scheduledFor: inventoryTask,
        });
        const priceTask = new Date(now);
        priceTask.setDate(priceTask.getDate() + (7 - priceTask.getDay()));
        priceTask.setHours(3, 0, 0, 0);
        await storage.createAiTask({
            type: "price_optimization",
            input: {},
            priority: "medium",
            scheduled: true,
            scheduledFor: priceTask,
        });
        const segmentationTask = new Date(now);
        segmentationTask.setMonth(segmentationTask.getMonth() + 1);
        segmentationTask.setDate(1);
        segmentationTask.setHours(4, 0, 0, 0);
        await storage.createAiTask({
            type: "customer_segmentation",
            input: {},
            priority: "low",
            scheduled: true,
            scheduledFor: segmentationTask,
        });
    }
    async cleanupOldTasks() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        }
        catch (error) {
        }
    }
    async getProcessingStats() {
        try {
            const allTasks = await storage.getAiTasks({ limit: 1000, offset: 0 });
            const stats = {
                total: allTasks.length,
                pending: allTasks.filter(t => t.status === "pending").length,
                processing: allTasks.filter(t => t.status === "processing").length,
                completed: allTasks.filter(t => t.status === "completed").length,
                failed: allTasks.filter(t => t.status === "failed").length,
                byType: {},
                averageProcessingTime: 0,
            };
            const typeStats = {};
            let totalProcessingTime = 0;
            let completedCount = 0;
            for (const task of allTasks) {
                if (!typeStats[task.type]) {
                    typeStats[task.type] = { total: 0, completed: 0, failed: 0 };
                }
                typeStats[task.type].total++;
                if (task.status === "completed") {
                    typeStats[task.type].completed++;
                    if (task.processingTime) {
                        totalProcessingTime += task.processingTime;
                        completedCount++;
                    }
                }
                else if (task.status === "failed") {
                    typeStats[task.type].failed++;
                }
            }
            stats.byType = typeStats;
            stats.averageProcessingTime = completedCount > 0 ? totalProcessingTime / completedCount : 0;
            return stats;
        }
        catch (error) {
            return { error: "Failed to get processing stats" };
        }
    }
    stop() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
    }
}
export const aiTaskProcessor = new AITaskProcessor();
//# sourceMappingURL=aiTaskProcessor.js.map