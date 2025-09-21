import { Logger } from './logger.service';
const logger = new Logger('CachingService');
export class CachingService {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 1000;
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredEntries();
        }, 5 * 60 * 1000);
        logger.info('Caching service initialized', { maxCacheSize: this.maxCacheSize });
    }
    static getInstance() {
        if (!CachingService.instance) {
            CachingService.instance = new CachingService();
        }
        return CachingService.instance;
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            logger.debug('Cache entry expired and removed', { key });
            return null;
        }
        logger.debug('Cache hit', { key });
        return entry.data;
    }
    set(key, data, ttlMs = 5 * 60 * 1000) {
        if (this.cache.size >= this.maxCacheSize) {
            this.evictOldestEntries(Math.floor(this.maxCacheSize * 0.1));
        }
        const entry = {
            data,
            timestamp: Date.now(),
            ttl: ttlMs
        };
        this.cache.set(key, entry);
        logger.debug('Cache entry set', { key, ttlMs, cacheSize: this.cache.size });
    }
    delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            logger.debug('Cache entry deleted', { key });
        }
        return deleted;
    }
    clear() {
        const previousSize = this.cache.size;
        this.cache.clear();
        logger.info('Cache cleared', { previousSize });
    }
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            entries: Array.from(this.cache.keys())
        };
    }
    async cached(key, asyncFn, ttlMs = 5 * 60 * 1000) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }
        try {
            const result = await asyncFn();
            this.set(key, result, ttlMs);
            return result;
        }
        catch (error) {
            logger.error('Error in cached function execution', { key, error });
            throw error;
        }
    }
    cleanupExpiredEntries() {
        const now = Date.now();
        let removedCount = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
                removedCount++;
            }
        }
        if (removedCount > 0) {
            logger.debug('Cleaned up expired cache entries', {
                removedCount,
                remainingSize: this.cache.size
            });
        }
    }
    evictOldestEntries(count) {
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp)
            .slice(0, count);
        for (const [key] of entries) {
            this.cache.delete(key);
        }
        logger.debug('Evicted oldest cache entries', {
            evictedCount: count,
            remainingSize: this.cache.size
        });
    }
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.cache.clear();
        logger.info('Caching service destroyed');
    }
}
export const cachingService = CachingService.getInstance();
//# sourceMappingURL=cachingService.js.map