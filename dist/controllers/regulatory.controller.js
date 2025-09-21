import { logger } from '../services/logger.service';
import { asyncHandler } from '../middleware/error.middleware';
class ValidationError extends Error {
    constructor(message) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
    }
}
class NotFoundError extends Error {
    constructor(message) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
    }
}
import { storage } from '../storage';
export class RegulatoryController {
    constructor() {
        this.getRecent = asyncHandler(async (req, res, next) => {
            logger.info("API: Fetching recent regulatory updates from database");
            const limitParam = req.query.limit;
            const limit = limitParam ? parseInt(limitParam, 10) : 50;
            if (isNaN(limit) || limit < 1 || limit > 1000) {
                throw new ValidationError('Limit must be a number between 1 and 1000');
            }
            const region = req.query.region;
            const updates = await storage.getRecentRegulatoryUpdates(limit);
            const filteredUpdates = region && region !== 'all'
                ? updates.filter(update => update.region?.toLowerCase().includes(region.toLowerCase()))
                : updates;
            const transformedUpdates = filteredUpdates.map(update => ({
                id: update.id,
                title: update.title,
                description: update.description,
                region: update.region,
                update_type: update.update_type,
                priority: update.priority,
                device_classes: update.device_classes,
                published_at: update.published_at,
                created_at: update.created_at,
                effective_date: update.effective_date,
                source_id: update.source_id,
                source_url: update.source_url,
                content: update.content,
                categories: update.categories,
                raw_data: update.raw_data
            }));
            logger.info("API: Retrieved regulatory updates from database", {
                total: updates.length,
                filtered: filteredUpdates.length,
                region: region || 'all'
            });
            res.json({
                success: true,
                data: transformedUpdates,
                timestamp: new Date().toISOString()
            });
        });
        this.getAll = asyncHandler(async (req, res, next) => {
            logger.info("API: Fetching all regulatory updates");
            const updates = await storage.getAllRegulatoryUpdates();
            const transformedUpdates = updates.map(update => ({
                id: update.id,
                title: update.title,
                description: update.description,
                region: update.region,
                update_type: update.update_type,
                priority: update.priority,
                device_classes: update.device_classes,
                published_at: update.published_at,
                created_at: update.created_at,
                effective_date: update.effective_date,
                source_id: update.source_id,
                source_url: update.source_url,
                content: update.content,
                categories: update.categories,
                raw_data: update.raw_data
            }));
            logger.info("API: Retrieved all regulatory updates", { count: transformedUpdates.length });
            res.json({
                success: true,
                data: transformedUpdates,
                timestamp: new Date().toISOString()
            });
        });
    }
}
export const regulatoryController = new RegulatoryController();
//# sourceMappingURL=regulatory.controller.js.map