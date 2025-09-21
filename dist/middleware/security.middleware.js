import { logger } from '../services/logger.service';
const rateLimitStore = {};
export const rateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    return (req, res, next) => {
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        Object.keys(rateLimitStore).forEach(ip => {
            if (rateLimitStore[ip].resetTime < now) {
                delete rateLimitStore[ip];
            }
        });
        if (!rateLimitStore[clientIp]) {
            rateLimitStore[clientIp] = {
                count: 1,
                resetTime: now + windowMs
            };
        }
        else {
            rateLimitStore[clientIp].count++;
        }
        const clientData = rateLimitStore[clientIp];
        res.set({
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': Math.max(0, maxRequests - clientData.count).toString(),
            'X-RateLimit-Reset': new Date(clientData.resetTime).toISOString(),
        });
        if (clientData.count > maxRequests) {
            logger.warn('Rate limit exceeded', {
                clientIp,
                path: req.path,
                userAgent: req.get('User-Agent')
            });
            return res.status(429).json({
                success: false,
                error: 'Too many requests, please try again later',
                retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
                timestamp: new Date().toISOString()
            });
        }
        next();
    };
};
export const securityHeaders = (req, res, next) => {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    });
    next();
};
export const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            return obj.trim().slice(0, 10000);
        }
        if (Array.isArray(obj)) {
            return obj.slice(0, 100).map(sanitize);
        }
        if (obj && typeof obj === 'object') {
            const sanitized = {};
            const keys = Object.keys(obj).slice(0, 50);
            for (const key of keys) {
                if (key.length <= 100) {
                    sanitized[key] = sanitize(obj[key]);
                }
            }
            return sanitized;
        }
        return obj;
    };
    if (req.body) {
        req.body = sanitize(req.body);
    }
    if (req.query) {
        req.query = sanitize(req.query);
    }
    next();
};
//# sourceMappingURL=security.middleware.js.map