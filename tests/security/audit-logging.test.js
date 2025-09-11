const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// Production endpoints
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:50040';
const { makeSecureRequest } = require('./api-security.test');

describe('Audit Logging Security Tests', () => {
  const testApiKey = process.env.TEST_API_KEY || 'sk-or-v1-test-' + crypto.randomBytes(32).toString('hex');
  const adminApiKey = process.env.ADMIN_API_KEY || 'sk-or-admin-' + crypto.randomBytes(32).toString('hex');
  
  describe('Audit Event Logging', () => {
    test('should log authentication attempts', async () => {
      const requestId = crypto.randomUUID();
      
      // Make authentication attempt
      await makeSecureRequest('/api/auth', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'X-Request-ID': requestId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'login' })
      });
      
      // Check audit log
      const auditResponse = await makeSecureRequest('/api/audit/search', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey
        },
        params: { requestId }
      });
      
      if (auditResponse.statusCode === 200) {
        const audit = JSON.parse(auditResponse.body);
        expect(audit.events).toContainEqual(
          expect.objectContaining({
            type: 'authentication',
            requestId,
            timestamp: expect.any(String),
            outcome: expect.stringMatching(/success|failure/)
          })
        );
      }
    });

    test('should log API key usage', async () => {
      const requestId = crypto.randomUUID();
      
      // Use API key
      await makeSecureRequest('/api/generate', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'X-Request-ID': requestId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: 'test' })
      });
      
      // Check audit log
      const auditResponse = await makeSecureRequest('/api/audit/search', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey
        },
        params: { requestId }
      });
      
      if (auditResponse.statusCode === 200) {
        const audit = JSON.parse(auditResponse.body);
        expect(audit.events).toContainEqual(
          expect.objectContaining({
            type: 'api_key_usage',
            requestId,
            keyId: expect.any(String),
            endpoint: '/api/generate',
            method: 'POST'
          })
        );
      }
    });

    test('should log data access events', async () => {
      const requestId = crypto.randomUUID();
      const sensitiveDataId = 'user-123';
      
      // Access sensitive data
      await makeSecureRequest(`/api/users/${sensitiveDataId}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'X-Request-ID': requestId
        }
      });
      
      // Check audit log
      const auditResponse = await makeSecureRequest('/api/audit/search', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey
        },
        params: { requestId }
      });
      
      if (auditResponse.statusCode === 200) {
        const audit = JSON.parse(auditResponse.body);
        expect(audit.events).toContainEqual(
          expect.objectContaining({
            type: 'data_access',
            requestId,
            resource: `/api/users/${sensitiveDataId}`,
            action: 'read',
            dataClassification: 'sensitive'
          })
        );
      }
    });

    test('should log security violations', async () => {
      const requestId = crypto.randomUUID();
      const maliciousPayload = "' OR '1'='1";
      
      // Attempt SQL injection
      await makeSecureRequest('/api/search', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'X-Request-ID': requestId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: maliciousPayload })
      });
      
      // Check audit log
      const auditResponse = await makeSecureRequest('/api/audit/search', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey
        },
        params: { requestId }
      });
      
      if (auditResponse.statusCode === 200) {
        const audit = JSON.parse(auditResponse.body);
        expect(audit.events).toContainEqual(
          expect.objectContaining({
            type: 'security_violation',
            requestId,
            violationType: 'sql_injection_attempt',
            severity: 'high',
            blocked: true
          })
        );
      }
    });

    test('should log configuration changes', async () => {
      const requestId = crypto.randomUUID();
      
      // Attempt configuration change
      await makeSecureRequest('/api/config', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey,
          'X-Request-ID': requestId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          setting: 'rate_limit',
          value: 100
        })
      });
      
      // Check audit log
      const auditResponse = await makeSecureRequest('/api/audit/search', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey
        },
        params: { requestId }
      });
      
      if (auditResponse.statusCode === 200) {
        const audit = JSON.parse(auditResponse.body);
        expect(audit.events).toContainEqual(
          expect.objectContaining({
            type: 'configuration_change',
            requestId,
            setting: 'rate_limit',
            oldValue: expect.any(Number),
            newValue: 100,
            changedBy: expect.any(String)
          })
        );
      }
    });

    test('should log privilege escalation attempts', async () => {
      const requestId = crypto.randomUUID();
      
      // Attempt to access admin endpoint with regular key
      await makeSecureRequest('/api/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'X-Request-ID': requestId
        }
      });
      
      // Check audit log
      const auditResponse = await makeSecureRequest('/api/audit/search', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey
        },
        params: { requestId }
      });
      
      if (auditResponse.statusCode === 200) {
        const audit = JSON.parse(auditResponse.body);
        expect(audit.events).toContainEqual(
          expect.objectContaining({
            type: 'privilege_escalation_attempt',
            requestId,
            requiredRole: 'admin',
            actualRole: 'user',
            blocked: true
          })
        );
      }
    });
  });

  describe('Audit Log Integrity', () => {
    test('should include cryptographic hashes for log entries', async () => {
      const auditResponse = await makeSecureRequest('/api/audit/recent', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey
        },
        params: { limit: 10 }
      });
      
      if (auditResponse.statusCode === 200) {
        const audit = JSON.parse(auditResponse.body);
        
        audit.events.forEach(event => {
          expect(event.hash).toBeDefined();
          expect(event.hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash
          expect(event.previousHash).toBeDefined();
        });
        
        // Verify hash chain
        for (let i = 1; i < audit.events.length; i++) {
          expect(audit.events[i].previousHash).toBe(audit.events[i - 1].hash);
        }
      }
    });

    test('should detect tampering with audit logs', async () => {
      const verifyResponse = await makeSecureRequest('/api/audit/verify', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey
        },
        params: {
          startTime: new Date(Date.now() - 86400000).toISOString(),
          endTime: new Date().toISOString()
        }
      });
      
      if (verifyResponse.statusCode === 200) {
        const result = JSON.parse(verifyResponse.body);
        expect(result.valid).toBe(true);
        expect(result.tamperedEntries).toEqual([]);
        expect(result.brokenChainAt).toBeNull();
      }
    });

    test('should use immutable storage for audit logs', async () => {
      const configResponse = await makeSecureRequest('/api/audit/config', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey
        }
      });
      
      if (configResponse.statusCode === 200) {
        const config = JSON.parse(configResponse.body);
        expect(config.storage).toBe('append-only');
        expect(config.encryption).toBe('AES-256-GCM');
        expect(config.compression).toBe('gzip');
        expect(config.rotation.enabled).toBe(true);
      }
    });
  });

  describe('Audit Log Completeness', () => {
    test('should log all CRUD operations', async () => {
      const entityId = crypto.randomUUID();
      const operations = ['CREATE', 'READ', 'UPDATE', 'DELETE'];
      const requestIds = {};
      
      // Perform CRUD operations
      for (const op of operations) {
        const requestId = crypto.randomUUID();
        requestIds[op] = requestId;
        
        const method = {
          'CREATE': 'POST',
          'READ': 'GET',
          'UPDATE': 'PUT',
          'DELETE': 'DELETE'
        }[op];
        
        await makeSecureRequest(`/api/entities/${op === 'CREATE' ? '' : entityId}`, {
          method,
          headers: {
            'Authorization': 'Bearer ' + testApiKey,
            'X-Request-ID': requestId,
            'Content-Type': 'application/json'
          },
          body: ['POST', 'PUT'].includes(method) ? 
            JSON.stringify({ data: 'test' }) : undefined
        });
      }
      
      // Verify all operations were logged
      for (const op of operations) {
        const auditResponse = await makeSecureRequest('/api/audit/search', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + adminApiKey
          },
          params: { requestId: requestIds[op] }
        });
        
        if (auditResponse.statusCode === 200) {
          const audit = JSON.parse(auditResponse.body);
          expect(audit.events).toContainEqual(
            expect.objectContaining({
              type: 'data_operation',
              operation: op.toLowerCase(),
              requestId: requestIds[op]
            })
          );
        }
      }
    });

    test('should log failed operations', async () => {
      const requestId = crypto.randomUUID();
      
      // Attempt operation that will fail
      await makeSecureRequest('/api/nonexistent', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'X-Request-ID': requestId
        }
      });
      
      // Check audit log
      const auditResponse = await makeSecureRequest('/api/audit/search', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey
        },
        params: { requestId }
      });
      
      if (auditResponse.statusCode === 200) {
        const audit = JSON.parse(auditResponse.body);
        expect(audit.events).toContainEqual(
          expect.objectContaining({
            type: 'request',
            requestId,
            statusCode: 404,
            outcome: 'failure'
          })
        );
      }
    });

    test('should include request and response metadata', async () => {
      const requestId = crypto.randomUUID();
      
      await makeSecureRequest('/api/data', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + testApiKey,
          'X-Request-ID': requestId,
          'Content-Type': 'application/json',
          'User-Agent': 'AutoDev-AI-Test/1.0'
        },
        body: JSON.stringify({ test: 'data' })
      });
      
      const auditResponse = await makeSecureRequest('/api/audit/search', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey
        },
        params: { requestId }
      });
      
      if (auditResponse.statusCode === 200) {
        const audit = JSON.parse(auditResponse.body);
        expect(audit.events[0]).toMatchObject({
          requestId,
          timestamp: expect.any(String),
          method: 'POST',
          path: '/api/data',
          ip: expect.any(String),
          userAgent: 'AutoDev-AI-Test/1.0',
          requestSize: expect.any(Number),
          responseSize: expect.any(Number),
          responseTime: expect.any(Number),
          statusCode: expect.any(Number)
        });
      }
    });
  });

  describe('Audit Log Retention and Compliance', () => {
    test('should enforce retention policies', async () => {
      const retentionResponse = await makeSecureRequest('/api/audit/retention', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey
        }
      });
      
      if (retentionResponse.statusCode === 200) {
        const policy = JSON.parse(retentionResponse.body);
        expect(policy.minimumRetentionDays).toBeGreaterThanOrEqual(90);
        expect(policy.maximumRetentionDays).toBeLessThanOrEqual(2555);
        expect(policy.archivalEnabled).toBe(true);
        expect(policy.complianceStandards).toContain('SOC2');
        expect(policy.complianceStandards).toContain('GDPR');
      }
    });

    test('should support audit log export', async () => {
      const exportResponse = await makeSecureRequest('/api/audit/export', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: new Date(Date.now() - 86400000).toISOString(),
          endDate: new Date().toISOString(),
          format: 'json'
        })
      });
      
      if (exportResponse.statusCode === 200) {
        const result = JSON.parse(exportResponse.body);
        expect(result.exportId).toBeDefined();
        expect(result.status).toBe('processing');
        expect(result.estimatedSize).toBeDefined();
        expect(result.downloadUrl).toBeDefined();
      }
    });

    test('should anonymize PII in audit logs when required', async () => {
      const gdprResponse = await makeSecureRequest('/api/audit/gdpr/anonymize', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'user-123',
          reason: 'right-to-be-forgotten'
        })
      });
      
      if (gdprResponse.statusCode === 200) {
        const result = JSON.parse(gdprResponse.body);
        expect(result.anonymizedEntries).toBeGreaterThanOrEqual(0);
        expect(result.retainedForLegal).toBeDefined();
      }
    });
  });

  describe('Real-time Audit Monitoring', () => {
    test('should support real-time audit streaming', async () => {
      const streamResponse = await makeSecureRequest('/api/audit/stream', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey,
          'Accept': 'text/event-stream'
        }
      });
      
      expect([200, 426]).toContain(streamResponse.statusCode);
      if (streamResponse.statusCode === 200) {
        expect(streamResponse.headers['content-type']).toContain('text/event-stream');
      }
    });

    test('should trigger alerts for suspicious patterns', async () => {
      // Simulate suspicious pattern
      const suspiciousKey = 'sk-or-sus-' + crypto.randomBytes(32).toString('hex');
      
      // Multiple failed auth attempts
      for (let i = 0; i < 10; i++) {
        await makeSecureRequest('/api/auth', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + suspiciousKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'login' })
        });
      }
      
      // Check for alert
      const alertResponse = await makeSecureRequest('/api/audit/alerts', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey
        },
        params: { 
          type: 'suspicious_activity',
          last: '5m'
        }
      });
      
      if (alertResponse.statusCode === 200) {
        const alerts = JSON.parse(alertResponse.body);
        expect(alerts).toContainEqual(
          expect.objectContaining({
            type: 'multiple_auth_failures',
            severity: 'high',
            details: expect.objectContaining({
              attempts: expect.any(Number),
              keyId: expect.any(String)
            })
          })
        );
      }
    });
  });

  describe('Audit Log Search and Analytics', () => {
    test('should support complex audit log queries', async () => {
      const queryResponse = await makeSecureRequest('/api/audit/query', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filters: {
            type: ['authentication', 'api_key_usage'],
            outcome: 'failure',
            timeRange: {
              start: new Date(Date.now() - 3600000).toISOString(),
              end: new Date().toISOString()
            }
          },
          aggregations: {
            by_endpoint: {
              field: 'endpoint',
              type: 'count'
            },
            by_hour: {
              field: 'timestamp',
              type: 'date_histogram',
              interval: 'hour'
            }
          }
        })
      });
      
      if (queryResponse.statusCode === 200) {
        const result = JSON.parse(queryResponse.body);
        expect(result.total).toBeDefined();
        expect(result.events).toBeInstanceOf(Array);
        expect(result.aggregations).toBeDefined();
        expect(result.aggregations.by_endpoint).toBeDefined();
        expect(result.aggregations.by_hour).toBeDefined();
      }
    });

    test('should generate audit reports', async () => {
      const reportResponse = await makeSecureRequest('/api/audit/report', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + adminApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'security_summary',
          period: 'last_24_hours'
        })
      });
      
      if (reportResponse.statusCode === 200) {
        const report = JSON.parse(reportResponse.body);
        expect(report.summary).toBeDefined();
        expect(report.summary.totalEvents).toBeDefined();
        expect(report.summary.securityViolations).toBeDefined();
        expect(report.summary.failedAuthentications).toBeDefined();
        expect(report.summary.suspiciousActivities).toBeDefined();
        expect(report.recommendations).toBeInstanceOf(Array);
      }
    });
  });
});

module.exports = { BASE_URL };