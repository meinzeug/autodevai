const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Production endpoints
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:50040';
const { makeSecureRequest } = require('./api-security.test');

describe('OWASP Top 10 Compliance Tests', () => {
  const testApiKey = process.env.TEST_API_KEY || 'sk-or-v1-test-' + crypto.randomBytes(32).toString('hex');
  
  describe('A01:2021 – Broken Access Control', () => {
    test('should enforce vertical access control', async () => {
      const userKey = 'sk-or-user-' + crypto.randomBytes(32).toString('hex');
      
      // Try to access admin endpoint with user key
      const response = await makeSecureRequest('/api/admin/config', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + userKey
        }
      });
      
      expect([401, 403]).toContain(response.statusCode);
      expect(response.body).toContain('Insufficient privileges');
    });

    test('should enforce horizontal access control', async () => {
      const userId1 = 'user-123';
      const userId2 = 'user-456';
      const userKey1 = 'sk-or-u1-' + crypto.randomBytes(32).toString('hex');
      
      // Try to access another user's data
      const response = await makeSecureRequest(`/api/users/${userId2}/data`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + userKey1,
          'X-User-ID': userId1
        }
      });
      
      expect([403, 404]).toContain(response.statusCode);
      expect(response.body).not.toContain(userId2);
    });

    test('should prevent directory traversal', async () => {
      const response = await makeSecureRequest('/api/file', {
        method: 'GET',
        params: { path: '../../../../etc/passwd' }
      });
      
      expect([400, 403]).toContain(response.statusCode);
      expect(response.body).toContain('Invalid file path');
    });

    test('should enforce CORS policies', async () => {
      const response = await makeSecureRequest('/api/data', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://evil.com',
          'Access-Control-Request-Method': 'POST'
        }
      });
      
      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).not.toBe('*');
        expect(response.headers['access-control-allow-origin']).not.toBe('https://evil.com');
      }
    });

    test('should prevent IDOR vulnerabilities', async () => {
      const response = await makeSecureRequest('/api/resource/1', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + testApiKey
        }
      });
      
      // Should not expose internal IDs
      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        expect(data.id).not.toMatch(/^\d+$/); // Not a simple numeric ID
        expect(data.internalId).toBeUndefined(); // No internal IDs exposed
      }
    });
  });

  describe('A02:2021 – Cryptographic Failures', () => {
    test('should use strong encryption for sensitive data', async () => {
      const response = await makeSecureRequest('/api/security/config', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + testApiKey
        }
      });
      
      if (response.statusCode === 200) {
        const config = JSON.parse(response.body);
        expect(config.encryption.algorithm).toBe('AES-256-GCM');
        expect(config.hashing.algorithm).toBe('bcrypt');
        expect(config.hashing.rounds).toBeGreaterThanOrEqual(12);
        expect(config.tls.version).toBe('1.3');
      }
    });

    test('should not expose sensitive data in URLs', async () => {
      const sensitiveData = 'password123';
      
      // Should reject sensitive data in URL
      const response = await makeSecureRequest('/api/auth', {
        method: 'GET',
        params: { password: sensitiveData }
      });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Sensitive data not allowed in URL');
    });

    test('should use secure session management', async () => {
      const response = await makeSecureRequest('/api/session', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'create' })
      });
      
      if (response.statusCode === 200) {
        expect(response.headers['set-cookie']).toContain('Secure');
        expect(response.headers['set-cookie']).toContain('HttpOnly');
        expect(response.headers['set-cookie']).toContain('SameSite=Strict');
      }
    });

    test('should implement proper key management', async () => {
      const response = await makeSecureRequest('/api/keys/rotate', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.statusCode === 200) {
        const result = JSON.parse(response.body);
        expect(result.newKey).toBeDefined();
        expect(result.oldKeyExpiry).toBeDefined();
        expect(result.rotationInterval).toBeLessThanOrEqual(90); // Days
      }
    });
  });

  describe('A03:2021 – Injection', () => {
    test('should prevent SQL injection', async () => {
      const sqlPayloads = [
        "' OR '1'='1",
        "1; DROP TABLE users--",
        "' UNION SELECT * FROM passwords--"
      ];
      
      for (const payload of sqlPayloads) {
        const response = await makeSecureRequest('/api/search', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + testApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: payload })
        });
        
        expect(response.statusCode).toBe(400);
        expect(response.body).toContain('Invalid input');
        expect(response.body).not.toContain('SQL');
      }
    });

    test('should prevent NoSQL injection', async () => {
      const nosqlPayload = { $ne: null };
      
      const response = await makeSecureRequest('/api/users/find', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filter: nosqlPayload })
      });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid filter');
    });

    test('should prevent command injection', async () => {
      const cmdPayload = '; cat /etc/passwd';
      
      const response = await makeSecureRequest('/api/execute', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command: 'echo', args: cmdPayload })
      });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid characters');
    });

    test('should prevent LDAP injection', async () => {
      const ldapPayload = '*)(uid=*)';
      
      const response = await makeSecureRequest('/api/ldap/search', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: ldapPayload })
      });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid LDAP query');
    });
  });

  describe('A04:2021 – Insecure Design', () => {
    test('should implement rate limiting', async () => {
      const responses = [];
      
      for (let i = 0; i < 100; i++) {
        const response = await makeSecureRequest('/api/generate', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + testApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt: 'test' })
        });
        
        responses.push(response.statusCode);
        
        if (response.statusCode === 429) break;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      expect(responses).toContain(429);
    });

    test('should implement account lockout', async () => {
      const username = 'testuser';
      const responses = [];
      
      // Multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        const response = await makeSecureRequest('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password: 'wrongpassword' + i
          })
        });
        
        responses.push(response);
      }
      
      // Account should be locked
      const lastResponse = responses[responses.length - 1];
      expect([401, 403, 429]).toContain(lastResponse.statusCode);
      expect(lastResponse.body).toContain('locked');
    });

    test('should validate business logic', async () => {
      // Try to transfer negative amount
      const response = await makeSecureRequest('/api/transfer', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: -1000,
          to: 'user-456'
        })
      });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid amount');
    });
  });

  describe('A05:2021 – Security Misconfiguration', () => {
    test('should not expose detailed error messages', async () => {
      const response = await makeSecureRequest('/api/error-test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid'
        }
      });
      
      expect(response.body).not.toContain('stack');
      expect(response.body).not.toContain('SQLException');
      expect(response.body).not.toContain('/home/');
      expect(response.body).not.toContain('\\Users\\');
    });

    test('should disable unnecessary HTTP methods', async () => {
      const unnecessaryMethods = ['TRACE', 'TRACK', 'CONNECT'];
      
      for (const method of unnecessaryMethods) {
        const response = await makeSecureRequest('/api/test', {
          method: method
        });
        
        expect([405, 501]).toContain(response.statusCode);
      }
    });

    test('should set security headers', async () => {
      const response = await makeSecureRequest('/api/data', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + testApiKey
        }
      });
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toContain('max-age=');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should not expose server version', async () => {
      const response = await makeSecureRequest('/api/test', {
        method: 'GET'
      });
      
      expect(response.headers['server']).not.toContain('Apache');
      expect(response.headers['server']).not.toContain('nginx');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('A06:2021 – Vulnerable and Outdated Components', () => {
    test('should check for vulnerable dependencies', async () => {
      const response = await makeSecureRequest('/api/health/dependencies', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + testApiKey
        }
      });
      
      if (response.statusCode === 200) {
        const result = JSON.parse(response.body);
        expect(result.vulnerabilities.critical).toBe(0);
        expect(result.vulnerabilities.high).toBe(0);
        expect(result.lastScan).toBeDefined();
      }
    });

    test('should validate component versions', async () => {
      const response = await makeSecureRequest('/api/health/versions', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + testApiKey
        }
      });
      
      if (response.statusCode === 200) {
        const versions = JSON.parse(response.body);
        
        // Check for minimum secure versions
        if (versions.node) {
          const nodeVersion = parseInt(versions.node.split('.')[0]);
          expect(nodeVersion).toBeGreaterThanOrEqual(18);
        }
        
        if (versions.openssl) {
          expect(versions.openssl).not.toContain('1.0');
          expect(versions.openssl).not.toContain('1.1.0');
        }
      }
    });
  });

  describe('A07:2021 – Identification and Authentication Failures', () => {
    test('should enforce strong password requirements', async () => {
      const weakPasswords = [
        'password',
        '12345678',
        'qwerty123',
        'admin',
        'Password1'
      ];
      
      for (const password of weakPasswords) {
        const response = await makeSecureRequest('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'testuser',
            password
          })
        });
        
        expect(response.statusCode).toBe(400);
        expect(response.body).toContain('Password does not meet requirements');
      }
    });

    test('should implement multi-factor authentication', async () => {
      const response = await makeSecureRequest('/api/auth/mfa/status', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + testApiKey
        }
      });
      
      if (response.statusCode === 200) {
        const mfaStatus = JSON.parse(response.body);
        expect(mfaStatus.available).toBe(true);
        expect(mfaStatus.methods).toContain('totp');
      }
    });

    test('should implement session timeout', async () => {
      const response = await makeSecureRequest('/api/session/config', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + testApiKey
        }
      });
      
      if (response.statusCode === 200) {
        const config = JSON.parse(response.body);
        expect(config.timeout).toBeLessThanOrEqual(1800000); // 30 minutes
        expect(config.absoluteTimeout).toBeLessThanOrEqual(86400000); // 24 hours
      }
    });

    test('should prevent credential stuffing', async () => {
      const credentials = [
        { username: 'admin', password: 'admin123' },
        { username: 'user1', password: 'password1' },
        { username: 'test', password: 'test123' }
      ];
      
      const responses = [];
      
      for (const cred of credentials) {
        const response = await makeSecureRequest('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cred)
        });
        
        responses.push(response);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Should detect pattern and block
      const blockedCount = responses.filter(r => r.statusCode === 429 || r.statusCode === 403).length;
      expect(blockedCount).toBeGreaterThan(0);
    });
  });

  describe('A08:2021 – Software and Data Integrity Failures', () => {
    test('should validate JWT signatures', async () => {
      const tamperedToken = jwt.sign(
        { sub: 'admin', role: 'admin' },
        'wrong-secret',
        { algorithm: 'HS256' }
      );
      
      const response = await makeSecureRequest('/api/protected', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + tamperedToken
        }
      });
      
      expect(response.statusCode).toBe(401);
      expect(response.body).toContain('Invalid token');
    });

    test('should implement code signing verification', async () => {
      const response = await makeSecureRequest('/api/deploy/verify', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          package: 'test-package',
          signature: 'invalid-signature'
        })
      });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid signature');
    });

    test('should validate deserialized data', async () => {
      const maliciousPayload = {
        __proto__: { isAdmin: true },
        data: 'test'
      };
      
      const response = await makeSecureRequest('/api/process', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(maliciousPayload)
      });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid data structure');
    });
  });

  describe('A09:2021 – Security Logging and Monitoring Failures', () => {
    test('should log security events', async () => {
      const requestId = crypto.randomUUID();
      
      // Attempt suspicious activity
      await makeSecureRequest('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'X-Request-ID': requestId
        }
      });
      
      // Check if logged
      const logResponse = await makeSecureRequest('/api/audit/check', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + process.env.ADMIN_KEY
        },
        params: { requestId }
      });
      
      if (logResponse.statusCode === 200) {
        const log = JSON.parse(logResponse.body);
        expect(log.logged).toBe(true);
        expect(log.severity).toMatch(/high|critical/);
      }
    });

    test('should implement intrusion detection', async () => {
      // Simulate attack pattern
      const attackPatterns = [
        '/api/../../../../etc/passwd',
        '/api/admin\'; DROP TABLE users--',
        '/api/<script>alert("XSS")</script>'
      ];
      
      for (const pattern of attackPatterns) {
        await makeSecureRequest(pattern, {
          method: 'GET'
        });
      }
      
      // Check if detected
      const alertResponse = await makeSecureRequest('/api/security/alerts', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + process.env.ADMIN_KEY
        },
        params: { last: '1m' }
      });
      
      if (alertResponse.statusCode === 200) {
        const alerts = JSON.parse(alertResponse.body);
        expect(alerts.length).toBeGreaterThan(0);
        expect(alerts[0].type).toContain('intrusion');
      }
    });
  });

  describe('A10:2021 – Server-Side Request Forgery (SSRF)', () => {
    test('should prevent SSRF attacks', async () => {
      const ssrfPayloads = [
        'http://localhost:50050', // Internal PostgreSQL
        'http://127.0.0.1:50051', // Internal Redis
        'http://169.254.169.254/latest/meta-data/', // AWS metadata
        'file:///etc/passwd',
        'gopher://localhost:50050',
        'dict://localhost:50051'
      ];
      
      for (const payload of ssrfPayloads) {
        const response = await makeSecureRequest('/api/fetch', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + testApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: payload })
        });
        
        expect([400, 403]).toContain(response.statusCode);
        expect(response.body).toContain('Invalid URL');
      }
    });

    test('should validate URL schemes', async () => {
      const response = await makeSecureRequest('/api/webhook', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: 'javascript:alert("XSS")'
        })
      });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid URL scheme');
    });

    test('should implement URL allowlisting', async () => {
      const response = await makeSecureRequest('/api/integration/configure', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhook: 'https://random-site.com/webhook'
        })
      });
      
      expect(response.statusCode).toBe(403);
      expect(response.body).toContain('URL not in allowlist');
    });
  });
});

module.exports = { BASE_URL };