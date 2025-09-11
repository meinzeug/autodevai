/**
 * Rate Limiting Security Tests
 * Comprehensive testing for API rate limiting and DDoS protection
 * Tests rate limits, burst protection, and IP-based restrictions
 */

const request = require('supertest');
const { performance } = require('perf_hooks');
const cluster = require('cluster');
const config = require('./security-config');

describe('Rate Limiting Security Tests', () => {
  let testServer;
  let validTokens;
  const testResults = [];

  beforeAll(async () => {
    testServer = await createTestServer();
    validTokens = await generateTestTokens();
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.close();
    }
    // Generate rate limiting report
    await generateRateLimitReport(testResults);
  });

  describe('API Rate Limiting', () => {
    test('should enforce per-minute rate limits for authenticated users', async () => {
      const startTime = performance.now();
      const maxRequests = 60; // Based on config
      const promises = [];
      
      // Make requests up to the limit
      for (let i = 0; i < maxRequests + 10; i++) {
        promises.push(
          request(testServer)
            .get('/api/user/profile')
            .set('Authorization', `Bearer ${validTokens.user}`)
            .set('X-Forwarded-For', '192.168.1.100') // Consistent IP
        );
      }
      
      const responses = await Promise.allSettled(promises);
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const rateLimited = responses.filter(r => r.status === 'fulfilled' && r.value.status === 429);
      const endTime = performance.now();
      
      testResults.push({
        test: 'per-minute-rate-limit',
        successful: successful.length,
        rateLimited: rateLimited.length,
        duration: endTime - startTime
      });
      
      expect(successful.length).toBeLessThanOrEqual(maxRequests);
      expect(rateLimited.length).toBeGreaterThan(0);
      
      if (rateLimited.length > 0) {
        const limitedResponse = rateLimited[0].value;
        expect(limitedResponse.headers).toHaveProperty('x-ratelimit-limit');
        expect(limitedResponse.headers).toHaveProperty('x-ratelimit-remaining');
        expect(limitedResponse.headers).toHaveProperty('x-ratelimit-reset');
        expect(limitedResponse.body).toHaveProperty('error');
        expect(limitedResponse.body.error).toMatch(/rate limit|too many requests/i);
      }
    });

    test('should enforce hourly rate limits for API keys', async () => {
      const startTime = performance.now();
      const maxRequests = config.security.api.openrouter.rateLimits.requestsPerHour;
      const batchSize = 50;
      let totalRequests = 0;
      let rateLimitedCount = 0;
      
      // Make requests in batches to simulate realistic usage
      for (let batch = 0; batch < Math.ceil(maxRequests / batchSize) + 2; batch++) {
        const promises = [];
        
        for (let i = 0; i < batchSize && totalRequests < maxRequests + 100; i++) {
          promises.push(
            request(testServer)
              .get('/api/openrouter/models')
              .set('Authorization', `Bearer sk-or-v1-test-key-${batch}`)
              .set('X-Forwarded-For', '10.0.0.50')
          );
          totalRequests++;
        }
        
        const responses = await Promise.allSettled(promises);
        const limited = responses.filter(r => 
          r.status === 'fulfilled' && r.value.status === 429
        );
        rateLimitedCount += limited.length;
        
        if (limited.length > 0) {
          break; // Rate limit reached
        }
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const endTime = performance.now();
      
      testResults.push({
        test: 'hourly-rate-limit',
        totalRequests,
        rateLimitedCount,
        duration: endTime - startTime
      });
      
      expect(rateLimitedCount).toBeGreaterThan(0);
      expect(totalRequests).toBeGreaterThan(maxRequests);
    });

    test('should apply different rate limits based on user roles', async () => {
      const roles = {
        admin: { token: validTokens.admin, expectedLimit: 1000 },
        user: { token: validTokens.user, expectedLimit: 100 },
        guest: { token: validTokens.guest, expectedLimit: 20 }
      };
      
      for (const [role, config] of Object.entries(roles)) {
        const startTime = performance.now();
        const promises = [];
        
        // Test with higher request count
        for (let i = 0; i < config.expectedLimit + 10; i++) {
          promises.push(
            request(testServer)
              .get('/api/status')
              .set('Authorization', `Bearer ${config.token}`)
              .set('X-Forwarded-For', `172.16.0.${role === 'admin' ? 10 : role === 'user' ? 20 : 30}`)
          );
        }
        
        const responses = await Promise.allSettled(promises);
        const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
        const rateLimited = responses.filter(r => r.status === 'fulfilled' && r.value.status === 429);
        
        testResults.push({
          test: `role-based-rate-limit-${role}`,
          successful: successful.length,
          rateLimited: rateLimited.length,
          expectedLimit: config.expectedLimit
        });
        
        // Admin should have higher limits
        if (role === 'admin') {
          expect(successful.length).toBeGreaterThan(500);
        }
        // Guest should have lower limits
        if (role === 'guest') {
          expect(rateLimited.length).toBeGreaterThan(0);
          expect(successful.length).toBeLessThan(30);
        }
      }
    });
  });

  describe('IP-based Rate Limiting', () => {
    test('should limit requests per IP address', async () => {
      const testIPs = ['203.0.113.1', '203.0.113.2', '203.0.113.3'];
      const results = {};
      
      for (const ip of testIPs) {
        const promises = [];
        
        // Make many requests from the same IP
        for (let i = 0; i < 200; i++) {
          promises.push(
            request(testServer)
              .get('/api/public/health')
              .set('X-Forwarded-For', ip)
              .set('X-Real-IP', ip)
          );
        }
        
        const responses = await Promise.allSettled(promises);
        const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
        const rateLimited = responses.filter(r => r.status === 'fulfilled' && r.value.status === 429);
        
        results[ip] = {
          successful: successful.length,
          rateLimited: rateLimited.length
        };
        
        expect(rateLimited.length).toBeGreaterThan(0);
      }
      
      testResults.push({
        test: 'ip-rate-limiting',
        results
      });
    });

    test('should implement sliding window rate limiting', async () => {
      const testIP = '198.51.100.1';
      const windowSize = 60; // 60 seconds
      const maxRequests = 100;
      
      // First burst of requests
      const firstBurst = await makeBurstRequests(testIP, 80);
      expect(firstBurst.successful).toBe(80);
      
      // Wait for partial window
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
      
      // Second burst - should still be limited
      const secondBurst = await makeBurstRequests(testIP, 50);
      expect(secondBurst.successful).toBeLessThan(50);
      expect(secondBurst.rateLimited).toBeGreaterThan(0);
      
      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 35000)); // Another 35 seconds
      
      // Third burst - should work again
      const thirdBurst = await makeBurstRequests(testIP, 50);
      expect(thirdBurst.successful).toBeGreaterThan(40);
      
      testResults.push({
        test: 'sliding-window-rate-limit',
        firstBurst,
        secondBurst,
        thirdBurst
      });
    });

    test('should handle distributed rate limiting across multiple instances', async () => {
      if (cluster.isMaster) {
        const workers = [];
        const numWorkers = 3;
        
        // Fork workers
        for (let i = 0; i < numWorkers; i++) {
          workers.push(cluster.fork());
        }
        
        // Coordinate test across workers
        const results = await Promise.all(
          workers.map(worker => new Promise((resolve) => {
            worker.send({ command: 'run-distributed-test', testIP: '192.0.2.1' });
            worker.on('message', (result) => {
              if (result.type === 'test-complete') {
                resolve(result.data);
              }
            });
          }))
        );
        
        const totalSuccessful = results.reduce((sum, r) => sum + r.successful, 0);
        const totalRateLimited = results.reduce((sum, r) => sum + r.rateLimited, 0);
        
        testResults.push({
          test: 'distributed-rate-limiting',
          totalSuccessful,
          totalRateLimited,
          workers: results.length
        });
        
        // Should enforce global limit across all instances
        expect(totalSuccessful).toBeLessThan(300); // Global limit
        expect(totalRateLimited).toBeGreaterThan(0);
        
        // Cleanup workers
        workers.forEach(worker => worker.kill());
      }
    });
  });

  describe('DDoS Protection', () => {
    test('should detect and mitigate DDoS attacks', async () => {
      const attackIPs = [];
      for (let i = 0; i < 50; i++) {
        attackIPs.push(`10.${Math.floor(i / 254)}.${i % 254}.${Math.floor(Math.random() * 254) + 1}`);
      }
      
      const startTime = performance.now();
      const promises = [];
      
      // Simulate DDoS attack from multiple IPs
      attackIPs.forEach(ip => {
        for (let i = 0; i < 100; i++) {
          promises.push(
            request(testServer)
              .get('/api/public/status')
              .set('X-Forwarded-For', ip)
              .timeout(5000)
          );
        }
      });
      
      const responses = await Promise.allSettled(promises);
      const endTime = performance.now();
      
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const blocked = responses.filter(r => r.status === 'fulfilled' && [429, 503].includes(r.value.status));
      const timeouts = responses.filter(r => r.status === 'rejected');
      
      testResults.push({
        test: 'ddos-protection',
        totalRequests: promises.length,
        successful: successful.length,
        blocked: blocked.length,
        timeouts: timeouts.length,
        duration: endTime - startTime
      });
      
      // Should block majority of requests
      expect(blocked.length + timeouts.length).toBeGreaterThan(successful.length);
      
      // Check for DDoS protection headers
      if (blocked.length > 0) {
        const blockedResponse = blocked[0].value;
        expect([429, 503]).toContain(blockedResponse.status);
        expect(blockedResponse.body).toHaveProperty('error');
        expect(blockedResponse.body.error).toMatch(/blocked|ddos|protection/i);
      }
    });

    test('should implement progressive delays for repeated violations', async () => {
      const violatorIP = '172.30.0.100';
      const delays = [];
      
      // Make requests that will be rate limited
      for (let attempt = 0; attempt < 10; attempt++) {
        const startTime = performance.now();
        
        const response = await request(testServer)
          .get('/api/intensive-operation')
          .set('X-Forwarded-For', violatorIP);
          
        const endTime = performance.now();
        delays.push(endTime - startTime);
        
        if (response.status === 429) {
          // Check for increasing delays
          if (attempt > 2) {
            expect(delays[attempt]).toBeGreaterThan(delays[attempt - 1]);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      testResults.push({
        test: 'progressive-delays',
        delays,
        violatorIP
      });
      
      // Later attempts should have longer delays
      expect(delays[delays.length - 1]).toBeGreaterThan(delays[0] * 2);
    });

    test('should whitelist legitimate high-volume clients', async () => {
      const whitelistedIPs = ['10.0.1.100', '10.0.1.101']; // Internal services
      const regularIP = '203.0.113.50';
      
      const results = {};
      
      // Test whitelisted IPs
      for (const ip of whitelistedIPs) {
        const promises = [];
        
        for (let i = 0; i < 500; i++) {
          promises.push(
            request(testServer)
              .get('/api/internal/metrics')
              .set('X-Forwarded-For', ip)
              .set('Authorization', 'Bearer internal-service-token')
          );
        }
        
        const responses = await Promise.allSettled(promises);
        const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
        const rateLimited = responses.filter(r => r.status === 'fulfilled' && r.value.status === 429);
        
        results[ip] = { successful: successful.length, rateLimited: rateLimited.length };
        
        // Whitelisted IPs should have minimal rate limiting
        expect(successful.length).toBeGreaterThan(450);
        expect(rateLimited.length).toBeLessThan(10);
      }
      
      // Test regular IP with same volume
      const regularPromises = [];
      for (let i = 0; i < 500; i++) {
        regularPromises.push(
          request(testServer)
            .get('/api/internal/metrics')
            .set('X-Forwarded-For', regularIP)
        );
      }
      
      const regularResponses = await Promise.allSettled(regularPromises);
      const regularSuccessful = regularResponses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const regularRateLimited = regularResponses.filter(r => r.status === 'fulfilled' && r.value.status === 429);
      
      results[regularIP] = { successful: regularSuccessful.length, rateLimited: regularRateLimited.length };
      
      // Regular IP should be heavily rate limited
      expect(regularRateLimited.length).toBeGreaterThan(400);
      expect(regularSuccessful.length).toBeLessThan(100);
      
      testResults.push({
        test: 'whitelist-protection',
        results
      });
    });
  });

  describe('Rate Limiting Edge Cases', () => {
    test('should handle rate limiting with proxy chains', async () => {
      const proxyChain = '203.0.113.1, 198.51.100.1, 192.0.2.1';
      const realIP = '203.0.113.1';
      
      const promises = [];
      
      // Make requests through proxy chain
      for (let i = 0; i < 150; i++) {
        promises.push(
          request(testServer)
            .get('/api/test')
            .set('X-Forwarded-For', proxyChain)
            .set('X-Real-IP', realIP)
        );
      }
      
      const responses = await Promise.allSettled(promises);
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const rateLimited = responses.filter(r => r.status === 'fulfilled' && r.value.status === 429);
      
      // Should rate limit based on real IP, not proxy
      expect(rateLimited.length).toBeGreaterThan(0);
      
      testResults.push({
        test: 'proxy-chain-rate-limiting',
        successful: successful.length,
        rateLimited: rateLimited.length,
        proxyChain,
        realIP
      });
    });

    test('should handle concurrent requests within rate limit window', async () => {
      const testIP = '10.20.30.40';
      const concurrentBatches = 5;
      const requestsPerBatch = 20;
      
      const batchPromises = [];
      
      // Launch concurrent batches
      for (let batch = 0; batch < concurrentBatches; batch++) {
        const batchRequests = [];
        
        for (let i = 0; i < requestsPerBatch; i++) {
          batchRequests.push(
            request(testServer)
              .get('/api/concurrent-test')
              .set('X-Forwarded-For', testIP)
          );
        }
        
        batchPromises.push(Promise.allSettled(batchRequests));
      }
      
      const batchResults = await Promise.all(batchPromises);
      
      let totalSuccessful = 0;
      let totalRateLimited = 0;
      
      batchResults.forEach((batch, index) => {
        const successful = batch.filter(r => r.status === 'fulfilled' && r.value.status === 200);
        const rateLimited = batch.filter(r => r.status === 'fulfilled' && r.value.status === 429);
        
        totalSuccessful += successful.length;
        totalRateLimited += rateLimited.length;
      });
      
      testResults.push({
        test: 'concurrent-rate-limiting',
        totalRequests: concurrentBatches * requestsPerBatch,
        totalSuccessful,
        totalRateLimited,
        concurrentBatches
      });
      
      // Should enforce rate limits even with concurrent requests
      expect(totalRateLimited).toBeGreaterThan(0);
      expect(totalSuccessful + totalRateLimited).toBe(concurrentBatches * requestsPerBatch);
    });
  });

  // Helper functions
  async function makeBurstRequests(ip, count) {
    const promises = [];
    
    for (let i = 0; i < count; i++) {
      promises.push(
        request(testServer)
          .get('/api/burst-test')
          .set('X-Forwarded-For', ip)
      );
    }
    
    const responses = await Promise.allSettled(promises);
    const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
    const rateLimited = responses.filter(r => r.status === 'fulfilled' && r.value.status === 429);
    
    return {
      successful: successful.length,
      rateLimited: rateLimited.length,
      total: responses.length
    };
  }

  async function createTestServer() {
    // Mock test server with rate limiting
    return {
      close: async () => {}
    };
  }

  async function generateTestTokens() {
    const jwt = require('jsonwebtoken');
    return {
      admin: jwt.sign({ userId: 'admin', role: 'admin' }, config.security.auth.jwt.secret),
      user: jwt.sign({ userId: 'user1', role: 'user' }, config.security.auth.jwt.secret),
      guest: jwt.sign({ userId: 'guest1', role: 'guest' }, config.security.auth.jwt.secret)
    };
  }

  async function generateRateLimitReport(results) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: results.length,
        passed: results.filter(r => !r.error).length,
        failed: results.filter(r => r.error).length
      },
      tests: results,
      recommendations: generateRecommendations(results)
    };
    
    const reportPath = path.join(__dirname, '../reports/security/rate-limiting-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`Rate limiting report saved to: ${reportPath}`);
  }

  function generateRecommendations(results) {
    const recommendations = [];
    
    // Analyze results and generate recommendations
    const ddosTest = results.find(r => r.test === 'ddos-protection');
    if (ddosTest && ddosTest.successful > ddosTest.blocked) {
      recommendations.push('Consider implementing more aggressive DDoS protection');
    }
    
    const distributedTest = results.find(r => r.test === 'distributed-rate-limiting');
    if (distributedTest && distributedTest.totalSuccessful > 250) {
      recommendations.push('Review distributed rate limiting coordination');
    }
    
    return recommendations;
  }
});
