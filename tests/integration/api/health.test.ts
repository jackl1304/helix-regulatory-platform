import request from 'supertest';
import express from 'express';
import { securityMiddleware } from '../../../server/middleware/modern-security.middleware';
import { errorMiddleware } from '../../../server/middleware/modern-error.middleware';

// Create test app
const createTestApp = () => {
  const app = express();
  
  // Apply security middleware
  app.use(express.json());
  app.use(...securityMiddleware.applyAll());
  
  // Test routes
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0'
    });
  });

  app.get('/api/error', (req, res, next) => {
    next(new Error('Test error'));
  });

  app.post('/api/echo', (req, res) => {
    res.json({
      success: true,
      data: req.body,
      headers: req.headers
    });
  });

  // Apply error middleware last
  app.use(errorMiddleware);
  
  return app;
};

describe('API Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Server is healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        memory: expect.objectContaining({
          rss: expect.any(Number),
          heapTotal: expect.any(Number),
          heapUsed: expect.any(Number),
          external: expect.any(Number)
        }),
        version: '1.0.0'
      });
    });

    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers).toMatchObject({
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block',
        'referrer-policy': 'strict-origin-when-cross-origin'
      });
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers).toMatchObject({
        'x-ratelimit-limit': expect.any(String),
        'x-ratelimit-remaining': expect.any(String),
        'x-ratelimit-reset': expect.any(String)
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const response = await request(app)
        .get('/api/error')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: expect.any(String),
        code: expect.any(String),
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('not found'),
        code: expect.any(String),
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/echo')
        .send('{"invalid": json}')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('JSON'),
        code: 'INVALID_JSON',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious input', async () => {
      const maliciousPayload = {
        title: '<script>alert("xss")</script>Clean Title',
        description: 'javascript:void(0)Clean Description',
        onclick: 'malicious()',
        nested: {
          script: '<script>nested xss</script>',
          safe: 'clean data'
        }
      };

      const response = await request(app)
        .post('/api/echo')
        .send(maliciousPayload)
        .expect(200);

      expect(response.body.data.title).not.toContain('<script>');
      expect(response.body.data.description).not.toContain('javascript:');
      expect(response.body.data).not.toHaveProperty('onclick');
      expect(response.body.data.nested.script).not.toContain('<script>');
      expect(response.body.data.nested.safe).toBe('clean data');
    });

    it('should limit payload size', async () => {
      const largePayload = {
        data: 'x'.repeat(60000) // Exceeds 50KB limit
      };

      const response = await request(app)
        .post('/api/echo')
        .send(largePayload)
        .expect(200);

      expect(response.body.data.data.length).toBeLessThanOrEqual(50000);
    });

    it('should limit array size', async () => {
      const largeArray = Array.from({ length: 1500 }, (_, i) => `item${i}`);
      const payload = { items: largeArray };

      const response = await request(app)
        .post('/api/echo')
        .send(payload)
        .expect(200);

      expect(response.body.data.items.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      // Make several requests in quick succession
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app).get('/api/health')
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      });

      // Check that rate limit remaining decreases
      const remaining1 = parseInt(responses[0].headers['x-ratelimit-remaining']);
      const remaining2 = parseInt(responses[4].headers['x-ratelimit-remaining']);
      expect(remaining2).toBeLessThan(remaining1);
    });

    it('should block requests exceeding rate limit', async () => {
      // This test requires making many requests quickly
      // Note: In a real test environment, you'd want to configure lower limits
      const requests = Array.from({ length: 105 }, () => 
        request(app).get('/api/health')
      );

      const responses = await Promise.allSettled(requests);
      
      // Some requests should succeed, some should be rate limited
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      ).length;
      
      const rateLimited = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      ).length;

      expect(successful).toBeGreaterThan(0);
      expect(rateLimited).toBeGreaterThan(0);
    }, 10000); // Increase timeout for this test
  });

  describe('CORS and Security Headers', () => {
    it('should set appropriate cache control headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['cache-control']).toContain('no-store');
      expect(response.headers['cache-control']).toContain('no-cache');
    });

    it('should set security headers for all endpoints', async () => {
      const healthResponse = await request(app).get('/api/health');
      const echoResponse = await request(app).post('/api/echo').send({});

      [healthResponse, echoResponse].forEach(response => {
        expect(response.headers).toMatchObject({
          'x-content-type-options': 'nosniff',
          'x-frame-options': 'DENY',
          'x-dns-prefetch-control': 'off',
          'permissions-policy': expect.stringContaining('camera=()'),
          'expect-ct': expect.stringContaining('max-age=86400')
        });
      });
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      const requests = Array.from({ length: 50 }, () => 
        request(app).get('/api/health')
      );

      await Promise.all(requests);
      
      const duration = Date.now() - startTime;
      
      // Should handle 50 concurrent requests within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should maintain response time under load', async () => {
      const responses: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        await request(app).get('/api/health').expect(200);
        const responseTime = Date.now() - startTime;
        responses.push(responseTime);
      }
      
      const averageResponseTime = responses.reduce((a, b) => a + b, 0) / responses.length;
      const maxResponseTime = Math.max(...responses);
      
      expect(averageResponseTime).toBeLessThan(100); // Average under 100ms
      expect(maxResponseTime).toBeLessThan(500); // Max under 500ms
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/echo')
        .send('')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle very long URLs gracefully', async () => {
      const longPath = '/api/health?' + 'x'.repeat(1000);
      
      const response = await request(app)
        .get(longPath);

      // Should either accept it or return a reasonable error
      expect([200, 414, 400]).toContain(response.status);
    });

    it('should handle unusual content types', async () => {
      const response = await request(app)
        .post('/api/echo')
        .send('plain text data')
        .set('Content-Type', 'text/plain');

      // Should handle gracefully
      expect([200, 400, 415]).toContain(response.status);
    });
  });
});