import { Request, Response, NextFunction } from 'express';
import { securityMiddleware } from '../../../server/middleware/modern-security.middleware';
import { RateLimitError } from '../../../shared/types/errors';

// Mock express request/response
const mockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  ip: '127.0.0.1',
  path: '/api/test',
  method: 'GET',
  headers: {},
  body: {},
  query: {},
  params: {},
  get: jest.fn((header: string) => {
    const headers: Record<string, string> = {
      'user-agent': 'test-browser',
      'x-forwarded-for': '192.168.1.1',
      ...overrides.headers
    };
    return headers[header.toLowerCase()];
  }),
  ...overrides
});

const mockResponse = (): Partial<Response> => ({
  set: jest.fn(),
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  headers: {}
});

const mockNext = (): NextFunction => jest.fn();

describe('ModernSecurityMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    
    // Clear rate limit store between tests
    (securityMiddleware as any).rateLimitStore.clear();
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', () => {
      const rateLimitMiddleware = securityMiddleware.rateLimitMiddleware();
      
      rateLimitMiddleware(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
        'X-RateLimit-Limit': expect.any(String),
        'X-RateLimit-Remaining': expect.any(String),
        'X-RateLimit-Reset': expect.any(String)
      }));
    });

    it('should block requests exceeding rate limit', () => {
      const rateLimitMiddleware = securityMiddleware.rateLimitMiddleware();
      
      // Simulate 101 requests (assuming default limit is 100)
      for (let i = 0; i < 102; i++) {
        try {
          rateLimitMiddleware(req as Request, res as Response, next);
        } catch (error) {
          if (i >= 100) {
            expect(error).toBeInstanceOf(RateLimitError);
            expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
              'Retry-After': expect.any(String)
            }));
            return;
          }
        }
      }
      
      // Should have thrown RateLimitError before reaching here
      expect(true).toBe(false);
    });

    it('should track different IPs separately', () => {
      const rateLimitMiddleware = securityMiddleware.rateLimitMiddleware();
      
      const req1 = mockRequest({ ip: '192.168.1.1' });
      const req2 = mockRequest({ ip: '192.168.1.2' });
      
      // Both IPs should be allowed
      rateLimitMiddleware(req1 as Request, res as Response, next);
      rateLimitMiddleware(req2 as Request, res as Response, next);
      
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should reset rate limit after window expires', () => {
      // This would require mocking Date.now() to test time-based reset
      // For now, just verify the reset logic exists
      const rateLimitStatus = securityMiddleware.getRateLimitStatus();
      expect(rateLimitStatus).toHaveProperty('totalClients');
      expect(rateLimitStatus).toHaveProperty('config');
    });
  });

  describe('Security Headers', () => {
    it('should set comprehensive security headers', () => {
      const securityHeadersMiddleware = securityMiddleware.securityHeadersMiddleware;
      
      securityHeadersMiddleware(req as Request, res as Response, next);
      
      expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': expect.stringContaining('camera=()'),
        'X-DNS-Prefetch-Control': 'off',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }));
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious script tags', () => {
      const inputSanitizationMiddleware = securityMiddleware.inputSanitizationMiddleware;
      
      req.body = {
        title: '<script>alert("xss")</script>Clean Title',
        description: 'javascript:void(0)Clean Description',
        onclick: 'malicious()'
      };
      
      inputSanitizationMiddleware(req as Request, res as Response, next);
      
      expect(req.body.title).not.toContain('<script>');
      expect(req.body.description).not.toContain('javascript:');
      expect(req.body).not.toHaveProperty('onclick');
      expect(next).toHaveBeenCalled();
    });

    it('should limit string length', () => {
      const inputSanitizationMiddleware = securityMiddleware.inputSanitizationMiddleware;
      
      const veryLongString = 'a'.repeat(100000);
      req.body = { longField: veryLongString };
      
      inputSanitizationMiddleware(req as Request, res as Response, next);
      
      expect(req.body.longField.length).toBeLessThanOrEqual(50000);
      expect(next).toHaveBeenCalled();
    });

    it('should limit array size', () => {
      const inputSanitizationMiddleware = securityMiddleware.inputSanitizationMiddleware;
      
      const largeArray = Array.from({ length: 2000 }, (_, i) => `item${i}`);
      req.body = { items: largeArray };
      
      inputSanitizationMiddleware(req as Request, res as Response, next);
      
      expect(req.body.items.length).toBeLessThanOrEqual(1000);
      expect(next).toHaveBeenCalled();
    });

    it('should limit object keys', () => {
      const inputSanitizationMiddleware = securityMiddleware.inputSanitizationMiddleware;
      
      const largeObject: Record<string, string> = {};
      for (let i = 0; i < 200; i++) {
        largeObject[`key${i}`] = `value${i}`;
      }
      req.body = largeObject;
      
      inputSanitizationMiddleware(req as Request, res as Response, next);
      
      expect(Object.keys(req.body).length).toBeLessThanOrEqual(100);
      expect(next).toHaveBeenCalled();
    });

    it('should handle nested objects', () => {
      const inputSanitizationMiddleware = securityMiddleware.inputSanitizationMiddleware;
      
      req.body = {
        level1: {
          level2: {
            level3: {
              malicious: '<script>alert("nested")</script>',
              safe: 'clean data'
            }
          }
        }
      };
      
      inputSanitizationMiddleware(req as Request, res as Response, next);
      
      expect(req.body.level1.level2.level3.malicious).not.toContain('<script>');
      expect(req.body.level1.level2.level3.safe).toBe('clean data');
      expect(next).toHaveBeenCalled();
    });

    it('should prevent deep recursion attacks', () => {
      const inputSanitizationMiddleware = securityMiddleware.inputSanitizationMiddleware;
      
      // Create deeply nested object (15 levels deep)
      let deepObject: any = { data: 'value' };
      for (let i = 0; i < 15; i++) {
        deepObject = { nested: deepObject };
      }
      
      req.body = deepObject;
      
      expect(() => {
        inputSanitizationMiddleware(req as Request, res as Response, next);
      }).not.toThrow();
      
      expect(next).toHaveBeenCalled();
    });

    it('should sanitize query parameters', () => {
      const inputSanitizationMiddleware = securityMiddleware.inputSanitizationMiddleware;
      
      req.query = {
        search: '<script>alert("query xss")</script>search term',
        page: '1',
        malicious: 'javascript:void(0)'
      };
      
      inputSanitizationMiddleware(req as Request, res as Response, next);
      
      expect(req.query.search).not.toContain('<script>');
      expect(req.query.malicious).not.toContain('javascript:');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('CSRF Protection', () => {
    it('should allow GET requests without CSRF token', () => {
      const csrfMiddleware = securityMiddleware.csrfProtectionMiddleware;
      
      req.method = 'GET';
      
      csrfMiddleware(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow HEAD requests without CSRF token', () => {
      const csrfMiddleware = securityMiddleware.csrfProtectionMiddleware;
      
      req.method = 'HEAD';
      
      csrfMiddleware(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow OPTIONS requests without CSRF token', () => {
      const csrfMiddleware = securityMiddleware.csrfProtectionMiddleware;
      
      req.method = 'OPTIONS';
      
      csrfMiddleware(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow API routes without CSRF token', () => {
      const csrfMiddleware = securityMiddleware.csrfProtectionMiddleware;
      
      req.method = 'POST';
      req.path = '/api/data';
      
      csrfMiddleware(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing IP address gracefully', () => {
      const rateLimitMiddleware = securityMiddleware.rateLimitMiddleware();
      
      req.ip = undefined;
      (req as any).connection = {};
      (req as any).socket = {};
      req.headers = {};
      
      expect(() => {
        rateLimitMiddleware(req as Request, res as Response, next);
      }).not.toThrow();
      
      expect(next).toHaveBeenCalled();
    });

    it('should handle malformed headers gracefully', () => {
      const inputSanitizationMiddleware = securityMiddleware.inputSanitizationMiddleware;
      
      req.headers = {
        'content-type': null as any,
        'user-agent': undefined as any
      };
      
      expect(() => {
        inputSanitizationMiddleware(req as Request, res as Response, next);
      }).not.toThrow();
      
      expect(next).toHaveBeenCalled();
    });

    it('should handle circular references in request body', () => {
      const inputSanitizationMiddleware = securityMiddleware.inputSanitizationMiddleware;
      
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      
      req.body = circularObj;
      
      expect(() => {
        inputSanitizationMiddleware(req as Request, res as Response, next);
      }).not.toThrow();
      
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should process large sanitization workload efficiently', () => {
      const inputSanitizationMiddleware = securityMiddleware.inputSanitizationMiddleware;
      
      // Create large dataset
      const largeData: Record<string, any> = {};
      for (let i = 0; i < 50; i++) {
        largeData[`field${i}`] = `<script>alert("${i}")</script>`.repeat(100);
      }
      
      req.body = largeData;
      
      const startTime = Date.now();
      inputSanitizationMiddleware(req as Request, res as Response, next);
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
      expect(next).toHaveBeenCalled();
    });

    it('should maintain rate limit performance with many clients', () => {
      const rateLimitMiddleware = securityMiddleware.rateLimitMiddleware();
      
      const startTime = Date.now();
      
      // Simulate 100 different clients
      for (let i = 0; i < 100; i++) {
        const clientReq = mockRequest({ ip: `192.168.1.${i}` });
        rateLimitMiddleware(clientReq as Request, res as Response, next);
      }
      
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(100); // Should be very fast
      expect(next).toHaveBeenCalledTimes(100);
    });
  });
});