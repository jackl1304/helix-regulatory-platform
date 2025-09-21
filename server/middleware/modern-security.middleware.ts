import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import { RateLimitError } from '../../shared/types/errors';

interface SecurityConfig {
  enableRateLimit: boolean;
  enableSlowDown: boolean;
  enableHelmet: boolean;
  enableCSP: boolean;
  trustedDomains: string[];
  maxRequestsPerWindow: number;
  windowMs: number;
  slowDownThreshold: number;
  slowDownDelay: number;
}

interface ClientData {
  count: number;
  resetTime: number;
  firstRequest: number;
}

class ModernSecurityMiddleware {
  private rateLimitStore = new Map<string, ClientData>();
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableRateLimit: process.env.ENABLE_RATE_LIMITING !== 'false',
      enableSlowDown: process.env.ENABLE_SLOW_DOWN !== 'false',
      enableHelmet: process.env.ENABLE_HELMET !== 'false',
      enableCSP: process.env.ENABLE_CSP !== 'false',
      trustedDomains: ['*.helix-regulatory.com', 'localhost:*', '127.0.0.1:*'],
      maxRequestsPerWindow: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      slowDownThreshold: parseInt(process.env.SLOW_DOWN_THRESHOLD || '50'),
      slowDownDelay: parseInt(process.env.SLOW_DOWN_DELAY || '500'),
      ...config
    };
  }

  /**
   * Apply all security middleware
   */
  applyAll = () => {
    const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

    if (this.config.enableHelmet) {
      middlewares.push(this.helmetMiddleware());
    }

    if (this.config.enableRateLimit) {
      middlewares.push(this.rateLimitMiddleware());
    }

    if (this.config.enableSlowDown) {
      middlewares.push(this.slowDownMiddleware());
    }

    middlewares.push(this.securityHeadersMiddleware);
    middlewares.push(this.inputSanitizationMiddleware);
    middlewares.push(this.csrfProtectionMiddleware);

    return middlewares;
  };

  /**
   * Helmet middleware for basic security headers
   */
  helmetMiddleware = () => {
    return helmet({
      contentSecurityPolicy: this.config.enableCSP ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", ...this.config.trustedDomains],
          styleSrc: ["'self'", "'unsafe-inline'", ...this.config.trustedDomains],
          imgSrc: ["'self'", "data:", "https:", ...this.config.trustedDomains],
          connectSrc: ["'self'", ...this.config.trustedDomains],
          fontSrc: ["'self'", ...this.config.trustedDomains],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      } : false,
      crossOriginEmbedderPolicy: false, // Allow embedding for development
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  };

  /**
   * Advanced rate limiting with memory store
   */
  rateLimitMiddleware = () => {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIp = this.getClientIp(req);
      const now = Date.now();
      const windowStart = now - this.config.windowMs;

      // Clean up old entries
      this.cleanupOldEntries(windowStart);

      const clientData = this.rateLimitStore.get(clientIp) || {
        count: 0,
        resetTime: now + this.config.windowMs,
        firstRequest: now
      };

      // Reset if window has passed
      if (now > clientData.resetTime) {
        clientData.count = 0;
        clientData.resetTime = now + this.config.windowMs;
        clientData.firstRequest = now;
      }

      clientData.count++;
      this.rateLimitStore.set(clientIp, clientData);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': this.config.maxRequestsPerWindow.toString(),
        'X-RateLimit-Remaining': Math.max(0, this.config.maxRequestsPerWindow - clientData.count).toString(),
        'X-RateLimit-Reset': new Date(clientData.resetTime).toISOString(),
        'X-RateLimit-Window': this.config.windowMs.toString(),
      });

      if (clientData.count > this.config.maxRequestsPerWindow) {
        const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);
        res.set('Retry-After', retryAfter.toString());
        
        throw new RateLimitError(
          new Date(clientData.resetTime),
          this.config.maxRequestsPerWindow,
          this.config.windowMs
        );
      }

      next();
    };
  };

  /**
   * Slow down middleware for gradual rate limiting
   */
  slowDownMiddleware = () => {
    return slowDown({
      windowMs: this.config.windowMs,
      delayAfter: this.config.slowDownThreshold,
      delayMs: this.config.slowDownDelay,
      maxDelayMs: 20000, // Maximum 20 second delay
      headers: true,
      skip: (req) => {
        // Skip slowdown for health checks and static assets
        return req.path === '/api/health' || req.path.startsWith('/static/');
      }
    });
  };

  /**
   * Additional security headers
   */
  securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'X-DNS-Prefetch-Control': 'off',
      'Expect-CT': 'max-age=86400, enforce',
      'X-Permitted-Cross-Domain-Policies': 'none',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });

    next();
  };

  /**
   * Advanced input sanitization
   */
  inputSanitizationMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const sanitize = (obj: any, depth = 0): any => {
      if (depth > 10) return obj; // Prevent deep recursion attacks

      if (typeof obj === 'string') {
        return obj
          .trim()
          .slice(0, 50000) // Prevent large payload attacks
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .replace(/on\w+\s*=/gi, ''); // Remove event handlers
      }

      if (Array.isArray(obj)) {
        return obj.slice(0, 1000).map(item => sanitize(item, depth + 1)); // Limit array size
      }

      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        const keys = Object.keys(obj).slice(0, 100); // Limit object keys

        for (const key of keys) {
          if (key.length <= 200) { // Limit key length
            const sanitizedKey = key.replace(/[^\w\-_]/g, ''); // Allow only safe characters in keys
            if (sanitizedKey) {
              sanitized[sanitizedKey] = sanitize(obj[key], depth + 1);
            }
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
    if (req.params) {
      req.params = sanitize(req.params);
    }

    next();
  };

  /**
   * CSRF protection for state-changing operations
   */
  csrfProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF for GET, HEAD, OPTIONS requests and API routes with proper authentication
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path.startsWith('/api/')) {
      return next();
    }

    const token = req.headers['x-csrf-token'] || req.body._csrf || req.query._csrf;
    const expectedToken = (req as any).session?.csrfToken;

    if (!token || !expectedToken || token !== expectedToken) {
      return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID'
      });
    }

    next();
  };

  /**
   * Get client IP address with proxy support
   */
  private getClientIp(req: Request): string {
    return (
      req.ip ||
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.headers['x-real-ip']?.toString() ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Clean up old rate limit entries to prevent memory leaks
   */
  private cleanupOldEntries(windowStart: number): void {
    for (const [ip, data] of this.rateLimitStore.entries()) {
      if (data.firstRequest < windowStart) {
        this.rateLimitStore.delete(ip);
      }
    }
  }

  /**
   * Get current rate limit status for monitoring
   */
  getRateLimitStatus = () => {
    return {
      totalClients: this.rateLimitStore.size,
      memoryUsage: process.memoryUsage(),
      config: this.config
    };
  };
}

// Create singleton instance
export const securityMiddleware = new ModernSecurityMiddleware();

// Export individual middleware functions
export const {
  applyAll: applyAllSecurity,
  rateLimitMiddleware,
  slowDownMiddleware,
  securityHeadersMiddleware,
  inputSanitizationMiddleware,
  csrfProtectionMiddleware,
  getRateLimitStatus
} = securityMiddleware;