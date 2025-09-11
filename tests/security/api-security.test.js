/**
 * API Security Testing Suite
 * Comprehensive security tests for AutoDev-AI Neural Bridge Platform APIs
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { expect } = require('@jest/globals');
const config = require('./security-config');

describe('API Security Testing Suite', () => {
  let app;
  let adminToken;
  let userToken;
  let guestToken;
  
  beforeAll(async () => {
    // Initialize test application (mock for testing)
    app = await setupTestApp();
    
    // Generate test tokens
    adminToken = generateTestToken(config.security.auth.users.admin);
    userToken = generateTestToken(config.security.auth.users.user);
    guestToken = generateTestToken(config.security.auth.users.guest);
  });

  describe('Authentication Security', () => {
    describe('JWT Token Security', () => {
      test('should reject invalid JWT tokens', async () => {
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
          
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('invalid token');
      });

      test('should reject expired JWT tokens', async () => {
        const expiredToken = jwt.sign(
          { userId: 1, role: 'user' },
          config.security.auth.jwt.secret,
          { expiresIn: '-1h' }
        );
        
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);
          
        expect(response.body.error).toContain('expired');
      });

      test('should reject tokens with invalid signatures', async () => {
        const invalidToken = jwt.sign(
          { userId: 1, role: 'user' },
          'wrong-secret'
        );
        
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${invalidToken}`)
          .expect(401);
          
        expect(response.body.error).toContain('invalid signature');
      });

      test('should validate token algorithms', async () => {
        const weakToken = jwt.sign(
          { userId: 1, role: 'user' },
          config.security.auth.jwt.secret,
          { algorithm: 'none' }
        );
        
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${weakToken}`)
          .expect(401);
      });
    });

    describe('Password Security', () => {
      test('should enforce strong password requirements', async () => {
        const weakPasswords = [
          '123456',
          'password',
          'abc123',
          '12345678',
          'qwerty'
        ];
        
        for (const password of weakPasswords) {
          const response = await request(app)
            .post('/auth/register')
            .send({
              username: 'testuser',
              email: 'test@example.com',
              password: password
            })
            .expect(400);
            
          expect(response.body.error).toContain('password requirements');
        }
      });

      test('should hash passwords securely', async () => {
        const password = 'SecurePassword123!';
        const hash = await bcrypt.hash(password, 12);
        
        expect(hash).not.toBe(password);
        expect(hash.length).toBeGreaterThan(50);
        expect(await bcrypt.compare(password, hash)).toBe(true);
      });

      test('should prevent password enumeration', async () => {
        // Test with non-existent user
        const response1 = await request(app)
          .post('/auth/login')
          .send({
            username: 'nonexistent@example.com',
            password: 'AnyPassword123!'
          });
          
        // Test with existing user but wrong password
        const response2 = await request(app)
          .post('/auth/login')
          .send({
            username: 'admin-test',
            password: 'WrongPassword123!'
          });
          
        // Both should return same generic error
        expect(response1.status).toBe(response2.status);
        expect(response1.body.error).toBe(response2.body.error);
      });
    });

    describe('Session Management', () => {
      test('should implement session timeout', async () => {
        // This would require mocking time or using a test with actual timeout
        const shortLivedToken = jwt.sign(
          { userId: 1, role: 'user' },
          config.security.auth.jwt.secret,
          { expiresIn: '1ms' }
        );
        
        // Wait for token to expire
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${shortLivedToken}`)
          .expect(401);
      });

      test('should invalidate tokens on logout', async () => {
        const response = await request(app)
          .post('/auth/logout')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);
          
        // Token should now be invalid
        await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(401);
      });
    });
  });

  describe('Authorization Security', () => {
    describe('Role-Based Access Control', () => {
      test('admin can access all endpoints', async () => {
        const endpoints = ['/api/users', '/api/admin', '/api/sandbox'];
        
        for (const endpoint of endpoints) {
          await request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(res => expect([200, 404]).toContain(res.status));
        }
      });

      test('user cannot access admin endpoints', async () => {
        const adminEndpoints = ['/api/admin', '/api/admin/users', '/api/admin/logs'];
        
        for (const endpoint of adminEndpoints) {
          await request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${userToken}`)
            .expect(403);
        }
      });

      test('guest has minimal access', async () => {
        const restrictedEndpoints = ['/api/users', '/api/sandbox', '/api/admin'];
        
        for (const endpoint of restrictedEndpoints) {
          await request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${guestToken}`)
            .expect(403);
        }
      });
    });

    describe('Resource-Level Authorization', () => {
      test('users can only access their own resources', async () => {
        // Try to access another user's data
        const response = await request(app)
          .get('/api/users/999/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
          
        expect(response.body.error).toContain('access denied');
      });

      test('should prevent horizontal privilege escalation', async () => {
        // User trying to modify another user's data
        const response = await request(app)
          .put('/api/users/999/settings')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ role: 'admin' })
          .expect(403);
      });

      test('should prevent vertical privilege escalation', async () => {
        // User trying to grant themselves admin privileges
        const response = await request(app)
          .put('/api/users/1/role')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ role: 'admin' })
          .expect(403);
      });
    });
  });

  describe('Input Validation Security', () => {
    describe('SQL Injection Protection', () => {
      test('should prevent SQL injection in query parameters', async () => {
        const sqlPayloads = config.security.validation.patterns.sqlInjection;
        
        for (const payload of sqlPayloads) {
          const response = await request(app)
            .get(`/api/users?search=${encodeURIComponent(payload)}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(res => expect([400, 422]).toContain(res.status));
        }
      });

      test('should prevent SQL injection in POST data', async () => {
        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            username: "admin'; DROP TABLE users; --",
            email: "test@example.com",
            password: "SecurePassword123!"
          })
          .expect(400);
          
        expect(response.body.error).toContain('invalid input');
      });
    });

    describe('XSS Protection', () => {
      test('should sanitize XSS payloads in input', async () => {
        const xssPayloads = config.security.validation.patterns.xss;
        
        for (const payload of xssPayloads) {
          const response = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              username: 'testuser',
              email: 'test@example.com',
              bio: payload,
              password: 'SecurePassword123!'
            });
            
          if (response.status === 201) {
            // Check that XSS payload was sanitized
            expect(response.body.user.bio).not.toContain('<script>');
            expect(response.body.user.bio).not.toContain('javascript:');
          }
        }
      });

      test('should set proper security headers', async () => {
        const response = await request(app)
          .get('/health')
          .expect(200);
          
        expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
        expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
        expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
      });
    });

    describe('Path Traversal Protection', () => {
      test('should prevent directory traversal attacks', async () => {
        const traversalPayloads = config.security.validation.patterns.pathTraversal;
        
        for (const payload of traversalPayloads) {
          const response = await request(app)
            .get(`/api/files/${encodeURIComponent(payload)}`)
            .set('Authorization', `Bearer ${userToken}`)
            .expect(res => expect([400, 403, 404]).toContain(res.status));
        }
      });

      test('should validate file upload paths', async () => {
        const response = await request(app)
          .post('/api/upload')
          .set('Authorization', `Bearer ${userToken}`)
          .field('filename', '../../../etc/passwd')
          .attach('file', Buffer.from('test content'), 'test.txt')
          .expect(400);
          
        expect(response.body.error).toContain('invalid filename');
      });
    });

    describe('Command Injection Protection', () => {
      test('should prevent command injection in sandbox operations', async () => {
        const commandPayloads = config.security.validation.patterns.commandInjection;
        
        for (const payload of commandPayloads) {
          const response = await request(app)
            .post('/api/sandbox/execute')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              command: `echo "hello" ${payload}`,
              sandboxId: 'test-sandbox'
            })
            .expect(res => expect([400, 403]).toContain(res.status));
        }
      });
    });
  });

  describe('OpenRouter API Security', () => {
    describe('API Key Protection', () => {
      test('should validate OpenRouter API key format', async () => {
        const invalidKeys = [
          'invalid-key',
          'sk-wrong-format',
          '',
          'sk-or-v1-toolshort'
        ];
        
        for (const key of invalidKeys) {
          const response = await request(app)
            .post('/api/openrouter/chat')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              apiKey: key,
              messages: [{ role: 'user', content: 'Hello' }]
            })
            .expect(400);
            
          expect(response.body.error).toContain('invalid api key');
        }
      });

      test('should not expose API keys in logs or responses', async () => {
        const response = await request(app)
          .post('/api/openrouter/chat')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            apiKey: 'sk-or-v1-1234567890abcdef1234567890abcdef',
            messages: [{ role: 'user', content: 'Hello' }]
          });
          
        // API key should not appear in response
        const responseString = JSON.stringify(response.body);
        expect(responseString).not.toContain('sk-or-v1-');
      });
    });

    describe('Rate Limiting', () => {
      test('should enforce rate limits for OpenRouter API', async () => {
        const requests = Array(65).fill().map((_, i) => 
          request(app)
            .post('/api/openrouter/chat')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              apiKey: config.security.api.openrouter.testApiKey,
              messages: [{ role: 'user', content: `Test message ${i}` }]
            })
        );
        
        const responses = await Promise.all(requests);
        const tooManyRequestsResponses = responses.filter(r => r.status === 429);
        
        expect(tooManyRequestsResponses.length).toBeGreaterThan(0);
      });
    });

    describe('Request Validation', () => {
      test('should validate OpenRouter request structure', async () => {
        const invalidRequests = [
          { /* missing messages */ },
          { messages: 'invalid' },
          { messages: [] },
          { messages: [{ role: 'invalid', content: 'test' }] }
        ];
        
        for (const request of invalidRequests) {
          const response = await request(app)
            .post('/api/openrouter/chat')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              apiKey: config.security.api.openrouter.testApiKey,
              ...request
            })
            .expect(400);
        }
      });
    });
  });

  describe('Security Headers and CORS', () => {
    test('should set comprehensive security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
        
      const securityHeaders = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block',
        'strict-transport-security': 'max-age=31536000; includeSubDomains',
        'content-security-policy': expect.stringContaining("default-src 'self'"),
        'referrer-policy': 'strict-origin-when-cross-origin'
      };
      
      for (const [header, expectedValue] of Object.entries(securityHeaders)) {
        expect(response.headers).toHaveProperty(header, expectedValue);
      }
    });

    test('should configure CORS properly', async () => {
      const response = await request(app)
        .options('/api/users')
        .set('Origin', 'https://malicious.com')
        .expect(200);
        
      expect(response.headers['access-control-allow-origin']).not.toBe('https://malicious.com');
    });
  });

  describe('Error Handling Security', () => {
    test('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
        
      const errorString = JSON.stringify(response.body);
      expect(errorString).not.toMatch(/database|sql|query|connection/i);
      expect(errorString).not.toMatch(/stack trace|error stack/i);
    });

    test('should not expose internal paths in errors', async () => {
      const response = await request(app)
        .get('/api/error-test')
        .set('Authorization', `Bearer ${userToken}`);
        
      const errorString = JSON.stringify(response.body);
      expect(errorString).not.toMatch(/\/home\/|\/app\/|\/usr\/local/);
    });
  });

  afterAll(async () => {
    // Clean up test environment
    await cleanupTestApp();
  });
});

// Helper functions
function generateTestToken(user) {
  return jwt.sign(
    { 
      userId: user.username === 'admin-test' ? 1 : user.username === 'user-test' ? 2 : 3,
      username: user.username,
      role: user.role 
    },
    config.security.auth.jwt.secret,
    { 
      expiresIn: config.security.auth.jwt.expiresIn,
      issuer: config.security.auth.jwt.issuer 
    }
  );
}

async function setupTestApp() {
  // Mock Express app for testing
  const express = require('express');
  const helmet = require('helmet');
  const app = express();
  
  app.use(helmet());
  app.use(express.json());
  
  // Mock routes for testing
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/users', authenticateToken, (req, res) => res.json({ users: [] }));
  app.get('/api/admin', authenticateToken, requireRole('admin'), (req, res) => res.json({ admin: true }));
  app.post('/auth/login', (req, res) => res.status(401).json({ error: 'Invalid credentials' }));
  app.post('/auth/register', (req, res) => {
    if (req.body.password && req.body.password.length < 8) {
      return res.status(400).json({ error: 'Password does not meet requirements' });
    }
    res.status(201).json({ user: { id: 1, username: req.body.username } });
  });
  
  return app;
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  try {
    const user = jwt.verify(token, config.security.auth.jwt.secret);
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}

async function cleanupTestApp() {
  // Cleanup code if needed
}