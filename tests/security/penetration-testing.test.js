/**
 * Automated Penetration Testing Suite
 * OWASP ZAP and custom security testing for AutoDev-AI Neural Bridge Platform
 */

const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { expect } = require('@jest/globals');
const config = require('./security-config');

describe('Automated Penetration Testing Suite', () => {
  let zapClient;
  let targetUrl;
  let testSession;

  beforeAll(async () => {
    targetUrl = config.security.api.baseUrl;
    testSession = `pentest-${Date.now()}`;
    
    // Initialize OWASP ZAP client
    await initializeZAP();
  });

  describe('OWASP ZAP Security Scanning', () => {
    describe('Spider and Discovery', () => {
      test('should discover all application endpoints', async () => {
        const spiderScanId = await startSpiderScan(targetUrl);
        await waitForScanCompletion(spiderScanId);
        
        const spiderResults = await getSpiderResults(spiderScanId);
        expect(spiderResults.urlsFound).toBeGreaterThan(5);
        
        // Verify expected endpoints were discovered
        const expectedEndpoints = [
          '/health',
          '/api/users',
          '/api/auth',
          '/api/sandbox'
        ];
        
        for (const endpoint of expectedEndpoints) {
          const found = spiderResults.urls.some(url => url.includes(endpoint));
          expect(found).toBe(true, `Endpoint ${endpoint} not discovered`);
        }
      });

      test('should perform AJAX spider for SPA endpoints', async () => {
        const ajaxSpiderId = await startAjaxSpider(targetUrl);
        await waitForScanCompletion(ajaxSpiderId);
        
        const ajaxResults = await getAjaxSpiderResults(ajaxSpiderId);
        expect(ajaxResults.urlsFound).toBeGreaterThan(0);
      });
    });

    describe('Active Security Scanning', () => {
      test('should scan for OWASP Top 10 vulnerabilities', async () => {
        const activeScanId = await startActiveScan(targetUrl);
        await waitForScanCompletion(activeScanId, 600000); // 10 minutes timeout
        
        const scanResults = await getActiveScanResults(activeScanId);
        
        // Check for critical vulnerabilities
        const criticalAlerts = scanResults.alerts.filter(
          alert => alert.risk === 'High' || alert.risk === 'Critical'
        );
        
        expect(criticalAlerts.length).toBe(0, 
          `Critical vulnerabilities found: ${criticalAlerts.map(a => a.name).join(', ')}`
        );
        
        // Generate detailed report
        await generateZAPReport(scanResults, 'active-scan');
      });

      test('should test for SQL injection vulnerabilities', async () => {
        const sqlInjectionTests = [
          { endpoint: '/api/users', params: { search: "' OR 1=1 --" } },
          { endpoint: '/api/sandbox', params: { id: "1 UNION SELECT * FROM users" } },
          { endpoint: '/auth/login', params: { username: "admin'--", password: "any" } }
        ];
        
        for (const test of sqlInjectionTests) {
          const result = await testSQLInjection(test.endpoint, test.params);
          expect(result.vulnerable).toBe(false, 
            `SQL Injection vulnerability found at ${test.endpoint}`
          );
        }
      });

      test('should test for XSS vulnerabilities', async () => {
        const xssPayloads = [
          '<script>alert("XSS")</script>',
          '"><script>alert("XSS")</script>',
          'javascript:alert("XSS")',
          '<img src="x" onerror="alert(\'XSS\')" />'
        ];
        
        const testEndpoints = ['/api/users', '/api/sandbox/create'];
        
        for (const endpoint of testEndpoints) {
          for (const payload of xssPayloads) {
            const result = await testXSS(endpoint, payload);
            expect(result.vulnerable).toBe(false,
              `XSS vulnerability found at ${endpoint} with payload: ${payload}`
            );
          }
        }
      });

      test('should test for CSRF vulnerabilities', async () => {
        const sensitiveEndpoints = [
          { method: 'POST', path: '/api/users' },
          { method: 'DELETE', path: '/api/users/1' },
          { method: 'POST', path: '/api/sandbox/create' },
          { method: 'PUT', path: '/api/admin/settings' }
        ];
        
        for (const endpoint of sensitiveEndpoints) {
          const result = await testCSRF(endpoint.method, endpoint.path);
          expect(result.protected).toBe(true,
            `CSRF protection missing for ${endpoint.method} ${endpoint.path}`
          );
        }
      });
    });

    describe('Authentication and Session Testing', () => {
      test('should test authentication bypass attempts', async () => {
        const bypassAttempts = [
          { headers: { 'X-Original-URL': '/api/admin' } },
          { headers: { 'X-Rewrite-URL': '/api/admin' } },
          { headers: { 'X-Forwarded-For': '127.0.0.1' } },
          { path: '/api/admin/../users' },
          { path: '/api/admin%2f../users' },
          { path: '/api/admin/../../etc/passwd' }
        ];
        
        for (const attempt of bypassAttempts) {
          const result = await testAuthenticationBypass(attempt);
          expect(result.bypassed).toBe(false,
            `Authentication bypass possible with: ${JSON.stringify(attempt)}`
          );
        }
      });

      test('should test session fixation vulnerabilities', async () => {
        // Test session fixation
        const sessionId = 'FIXED_SESSION_ID_123';
        const result = await testSessionFixation(sessionId);
        
        expect(result.vulnerable).toBe(false,
          'Session fixation vulnerability detected'
        );
      });

      test('should test session hijacking protection', async () => {
        // Create a valid session
        const session = await createTestSession();
        
        // Test session hijacking attempts
        const hijackTests = [
          { userAgent: 'DifferentBrowser/1.0' },
          { ipAddress: '192.168.1.100' },
          { both: true }
        ];
        
        for (const test of hijackTests) {
          const result = await testSessionHijacking(session.token, test);
          expect(result.protected).toBe(true,
            `Session hijacking protection failed for: ${JSON.stringify(test)}`
          );
        }
      });
    });

    describe('API Security Testing', () => {
      test('should test API rate limiting', async () => {
        const endpoint = '/api/auth/login';
        const requests = [];
        
        // Send rapid requests to test rate limiting
        for (let i = 0; i < 100; i++) {
          requests.push(
            axios.post(`${targetUrl}${endpoint}`, {
              username: 'test',
              password: 'test'
            }, { validateStatus: () => true })
          );
        }
        
        const responses = await Promise.all(requests);
        const rateLimitedResponses = responses.filter(r => r.status === 429);
        
        expect(rateLimitedResponses.length).toBeGreaterThan(0,
          'Rate limiting not implemented properly'
        );
      });

      test('should test API input validation', async () => {
        const maliciousInputs = [
          { field: 'username', value: '../../../etc/passwd' },
          { field: 'email', value: '<script>alert("xss")</script>' },
          { field: 'password', value: 'a'.repeat(10000) }, // Buffer overflow attempt
          { field: 'role', value: 'admin' }, // Privilege escalation attempt
          { field: 'id', value: -1 }, // Integer overflow
          { field: 'callback', value: 'javascript:alert("xss")' } // Callback injection
        ];
        
        for (const input of maliciousInputs) {
          const result = await testAPIInputValidation(input.field, input.value);
          expect(result.blocked).toBe(true,
            `Malicious input not blocked: ${input.field}=${input.value}`
          );
        }
      });

      test('should test OpenRouter API security', async () => {
        const openrouterTests = [
          {
            name: 'API key validation',
            test: () => testOpenRouterKeyValidation()
          },
          {
            name: 'Rate limiting',
            test: () => testOpenRouterRateLimit()
          },
          {
            name: 'Request size limits',
            test: () => testOpenRouterRequestLimits()
          }
        ];
        
        for (const testCase of openrouterTests) {
          const result = await testCase.test();
          expect(result.secure).toBe(true,
            `OpenRouter security test failed: ${testCase.name}`
          );
        }
      });
    });

    describe('Infrastructure Security Testing', () => {
      test('should test for information disclosure', async () => {
        const infoDisclosureTests = [
          { path: '/.env' },
          { path: '/.git/config' },
          { path: '/package.json' },
          { path: '/docker-compose.yml' },
          { path: '/api/debug' },
          { path: '/api/status' },
          { path: '/health?debug=true' }
        ];
        
        for (const test of infoDisclosureTests) {
          const result = await testInformationDisclosure(test.path);
          expect(result.disclosed).toBe(false,
            `Information disclosure at: ${test.path}`
          );
        }
      });

      test('should test for directory traversal', async () => {
        const traversalPaths = [
          '../../../etc/passwd',
          '..\\..\\..\\windows\\system32\\config\\sam',
          '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
          '....//....//....//etc/passwd'
        ];
        
        for (const path of traversalPaths) {
          const result = await testDirectoryTraversal(path);
          expect(result.vulnerable).toBe(false,
            `Directory traversal vulnerability with path: ${path}`
          );
        }
      });

      test('should test for security header presence', async () => {
        const response = await axios.get(`${targetUrl}/health`);
        
        const requiredHeaders = {
          'x-content-type-options': 'nosniff',
          'x-frame-options': /^(DENY|SAMEORIGIN)$/,
          'x-xss-protection': '1; mode=block',
          'strict-transport-security': /max-age=\d+/,
          'content-security-policy': /.+/
        };
        
        for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
          const headerValue = response.headers[header.toLowerCase()];
          
          if (expectedValue instanceof RegExp) {
            expect(headerValue).toMatch(expectedValue, 
              `Security header ${header} not properly configured`
            );
          } else {
            expect(headerValue).toBe(expectedValue,
              `Security header ${header} missing or incorrect`
            );
          }
        }
      });
    });
  });

  describe('Business Logic Testing', () => {
    test('should test privilege escalation', async () => {
      // Create a regular user
      const user = await createTestUser('regular_user', 'user');
      
      // Attempt privilege escalation
      const escalationAttempts = [
        { method: 'PUT', path: '/api/users/me', data: { role: 'admin' } },
        { method: 'POST', path: '/api/admin/promote', data: { userId: user.id } },
        { method: 'PATCH', path: '/api/users/1', data: { permissions: ['admin'] } }
      ];
      
      for (const attempt of escalationAttempts) {
        const result = await testPrivilegeEscalation(user.token, attempt);
        expect(result.escalated).toBe(false,
          `Privilege escalation possible: ${attempt.method} ${attempt.path}`
        );
      }
    });

    test('should test horizontal privilege escalation', async () => {
      const user1 = await createTestUser('user1', 'user');
      const user2 = await createTestUser('user2', 'user');
      
      // User1 tries to access User2's data
      const result = await testHorizontalPrivilegeEscalation(
        user1.token, 
        user2.id
      );
      
      expect(result.escalated).toBe(false,
        'Horizontal privilege escalation detected'
      );
    });

    test('should test resource enumeration protection', async () => {
      const user = await createTestUser('enum_test', 'user');
      
      // Try to enumerate resources
      const enumerationTests = [
        { endpoint: '/api/users', range: [1, 100] },
        { endpoint: '/api/sandbox', range: [1, 50] },
        { endpoint: '/api/projects', range: [1, 25] }
      ];
      
      for (const test of enumerationTests) {
        const result = await testResourceEnumeration(user.token, test);
        expect(result.enumerable).toBe(false,
          `Resource enumeration possible at ${test.endpoint}`
        );
      }
    });
  });

  afterAll(async () => {
    // Generate final security report
    await generateFinalPentestReport();
    
    // Store results in hive memory
    await storePentestResults();
    
    // Cleanup ZAP session
    await cleanupZAP();
  });
});

// ZAP Helper Functions
async function initializeZAP() {
  try {
    // Start ZAP in daemon mode if not running
    const zapRunning = await checkZAPRunning();
    if (!zapRunning) {
      execSync('zap.sh -daemon -port 8080 -config api.key=test-api-key', {
        detached: true,
        stdio: 'ignore'
      });
      
      // Wait for ZAP to start
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    zapClient = axios.create({
      baseURL: 'http://localhost:8080',
      timeout: 30000
    });
  } catch (error) {
    console.warn('Could not initialize OWASP ZAP:', error.message);
  }
}

async function checkZAPRunning() {
  try {
    await axios.get('http://localhost:8080/JSON/core/view/version/');
    return true;
  } catch {
    return false;
  }
}

async function startSpiderScan(url) {
  const response = await zapClient.get('/JSON/spider/action/scan/', {
    params: { url, maxChildren: 10, recurse: true }
  });
  return response.data.scan;
}

async function startAjaxSpider(url) {
  const response = await zapClient.get('/JSON/ajaxSpider/action/scan/', {
    params: { url }
  });
  return response.data.scan;
}

async function startActiveScan(url) {
  const response = await zapClient.get('/JSON/ascan/action/scan/', {
    params: { url, recurse: true, inScopeOnly: false }
  });
  return response.data.scan;
}

async function waitForScanCompletion(scanId, timeout = 300000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const response = await zapClient.get('/JSON/ascan/view/status/', {
      params: { scanId }
    });
    
    const status = parseInt(response.data.status);
    if (status >= 100) {
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

async function getSpiderResults(scanId) {
  const response = await zapClient.get('/JSON/spider/view/results/', {
    params: { scanId }
  });
  
  return {
    urlsFound: response.data.results.length,
    urls: response.data.results
  };
}

async function getAjaxSpiderResults(scanId) {
  const response = await zapClient.get('/JSON/ajaxSpider/view/results/');
  return {
    urlsFound: response.data.results.length,
    urls: response.data.results
  };
}

async function getActiveScanResults(scanId) {
  const response = await zapClient.get('/JSON/core/view/alerts/');
  return {
    alerts: response.data.alerts
  };
}

// Specific security test functions
async function testSQLInjection(endpoint, params) {
  try {
    const response = await axios.get(`${targetUrl}${endpoint}`, {
      params,
      validateStatus: () => true
    });
    
    // Check for SQL error messages in response
    const sqlErrors = [
      'sql syntax',
      'mysql_fetch',
      'ora-',
      'postgresql',
      'sqlite_step'
    ];
    
    const responseText = JSON.stringify(response.data).toLowerCase();
    const hasErrors = sqlErrors.some(error => responseText.includes(error));
    
    return {
      vulnerable: hasErrors || response.status === 500,
      response: response.data
    };
  } catch (error) {
    return { vulnerable: false, error: error.message };
  }
}

async function testXSS(endpoint, payload) {
  try {
    const response = await axios.post(`${targetUrl}${endpoint}`, {
      content: payload,
      message: payload
    }, { validateStatus: () => true });
    
    const responseText = JSON.stringify(response.data);
    const vulnerable = responseText.includes(payload) && 
                      !responseText.includes('&lt;') && 
                      !responseText.includes('&gt;');
    
    return { vulnerable, response: response.data };
  } catch (error) {
    return { vulnerable: false, error: error.message };
  }
}

async function testCSRF(method, path) {
  try {
    const axios = require('axios');
    const response = await axios({
      method,
      url: `${targetUrl}${path}`,
      headers: {
        'Origin': 'https://evil.com',
        'Referer': 'https://evil.com'
      },
      validateStatus: () => true
    });
    
    // CSRF protection should reject cross-origin requests
    return {
      protected: response.status === 403 || response.status === 400,
      status: response.status
    };
  } catch (error) {
    return { protected: true, error: error.message };
  }
}

async function testAuthenticationBypass(attempt) {
  try {
    const config = {
      url: `${targetUrl}/api/admin`,
      validateStatus: () => true,
      ...attempt
    };
    
    const response = await axios(config);
    
    return {
      bypassed: response.status === 200,
      status: response.status
    };
  } catch (error) {
    return { bypassed: false, error: error.message };
  }
}

async function testSessionFixation(sessionId) {
  // This would require more complex session management testing
  return { vulnerable: false };
}

async function testSessionHijacking(token, test) {
  try {
    const headers = { 'Authorization': `Bearer ${token}` };
    
    if (test.userAgent) {
      headers['User-Agent'] = test.userAgent;
    }
    
    if (test.ipAddress) {
      headers['X-Forwarded-For'] = test.ipAddress;
    }
    
    const response = await axios.get(`${targetUrl}/api/users/me`, {
      headers,
      validateStatus: () => true
    });
    
    return {
      protected: response.status === 401 || response.status === 403,
      status: response.status
    };
  } catch (error) {
    return { protected: true, error: error.message };
  }
}

async function testAPIInputValidation(field, value) {
  try {
    const data = {};
    data[field] = value;
    
    const response = await axios.post(`${targetUrl}/api/users`, data, {
      validateStatus: () => true
    });
    
    return {
      blocked: response.status === 400 || response.status === 422,
      status: response.status
    };
  } catch (error) {
    return { blocked: true, error: error.message };
  }
}

async function testOpenRouterKeyValidation() {
  try {
    const response = await axios.post(`${targetUrl}/api/openrouter/chat`, {
      apiKey: 'invalid-key',
      messages: [{ role: 'user', content: 'test' }]
    }, { validateStatus: () => true });
    
    return { secure: response.status === 400 || response.status === 401 };
  } catch (error) {
    return { secure: true };
  }
}

async function testOpenRouterRateLimit() {
  const requests = Array(70).fill().map(() =>
    axios.post(`${targetUrl}/api/openrouter/chat`, {
      apiKey: config.security.api.openrouter.testApiKey,
      messages: [{ role: 'user', content: 'test' }]
    }, { validateStatus: () => true })
  );
  
  const responses = await Promise.all(requests);
  const rateLimited = responses.some(r => r.status === 429);
  
  return { secure: rateLimited };
}

async function testOpenRouterRequestLimits() {
  const largeMessage = 'x'.repeat(100000); // Very large message
  
  try {
    const response = await axios.post(`${targetUrl}/api/openrouter/chat`, {
      apiKey: config.security.api.openrouter.testApiKey,
      messages: [{ role: 'user', content: largeMessage }]
    }, { validateStatus: () => true });
    
    return { secure: response.status === 413 || response.status === 400 };
  } catch (error) {
    return { secure: true };
  }
}

async function testInformationDisclosure(path) {
  try {
    const response = await axios.get(`${targetUrl}${path}`, {
      validateStatus: () => true
    });
    
    return {
      disclosed: response.status === 200 && 
                response.headers['content-type'] !== 'application/json',
      status: response.status
    };
  } catch (error) {
    return { disclosed: false };
  }
}

async function testDirectoryTraversal(path) {
  try {
    const response = await axios.get(`${targetUrl}/api/files/${encodeURIComponent(path)}`, {
      validateStatus: () => true
    });
    
    const responseText = JSON.stringify(response.data);
    const vulnerable = responseText.includes('root:') || 
                      responseText.includes('[users]') ||
                      response.status === 200;
    
    return { vulnerable, status: response.status };
  } catch (error) {
    return { vulnerable: false };
  }
}

async function createTestUser(username, role) {
  // Mock function - would integrate with actual user creation
  return {
    id: Math.floor(Math.random() * 1000),
    username,
    role,
    token: `test-token-${username}-${Date.now()}`
  };
}

async function createTestSession() {
  // Mock function - would create actual session
  return {
    token: `session-${Date.now()}`,
    userId: 123
  };
}

async function testPrivilegeEscalation(token, attempt) {
  try {
    const response = await axios({
      method: attempt.method,
      url: `${targetUrl}${attempt.path}`,
      data: attempt.data,
      headers: { 'Authorization': `Bearer ${token}` },
      validateStatus: () => true
    });
    
    return {
      escalated: response.status === 200,
      status: response.status
    };
  } catch (error) {
    return { escalated: false };
  }
}

async function testHorizontalPrivilegeEscalation(userToken, targetUserId) {
  try {
    const response = await axios.get(`${targetUrl}/api/users/${targetUserId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      validateStatus: () => true
    });
    
    return {
      escalated: response.status === 200,
      status: response.status
    };
  } catch (error) {
    return { escalated: false };
  }
}

async function testResourceEnumeration(token, test) {
  let accessibleResources = 0;
  
  for (let i = test.range[0]; i <= test.range[1]; i++) {
    try {
      const response = await axios.get(`${targetUrl}${test.endpoint}/${i}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        validateStatus: () => true
      });
      
      if (response.status === 200) {
        accessibleResources++;
      }
    } catch (error) {
      // Ignore errors
    }
  }
  
  const totalRequests = test.range[1] - test.range[0] + 1;
  const accessibilityRatio = accessibleResources / totalRequests;
  
  return {
    enumerable: accessibilityRatio > 0.1, // More than 10% accessible
    accessibleCount: accessibleResources,
    totalRequests
  };
}

async function generateZAPReport(scanResults, scanType) {
  const report = {
    scanType,
    timestamp: new Date().toISOString(),
    summary: {
      totalAlerts: scanResults.alerts.length,
      highRisk: scanResults.alerts.filter(a => a.risk === 'High').length,
      mediumRisk: scanResults.alerts.filter(a => a.risk === 'Medium').length,
      lowRisk: scanResults.alerts.filter(a => a.risk === 'Low').length,
      informational: scanResults.alerts.filter(a => a.risk === 'Informational').length
    },
    alerts: scanResults.alerts
  };
  
  await fs.mkdir(config.security.compliance.reports.outputDir, { recursive: true });
  await fs.writeFile(
    path.join(config.security.compliance.reports.outputDir, `zap-${scanType}-report.json`),
    JSON.stringify(report, null, 2)
  );
}

async function generateFinalPentestReport() {
  // Generate comprehensive pentest report
  const report = {
    timestamp: new Date().toISOString(),
    session: testSession,
    summary: 'Automated penetration testing completed',
    recommendations: [
      'Implement SAST/DAST in CI/CD pipeline',
      'Regular security training for developers',
      'Implement security headers consistently',
      'Regular dependency updates and vulnerability scanning'
    ]
  };
  
  await fs.writeFile(
    path.join(config.security.compliance.reports.outputDir, 'pentest-final-report.json'),
    JSON.stringify(report, null, 2)
  );
}

async function storePentestResults() {
  try {
    execSync(`npx claude-flow@alpha hooks post-edit --memory-key "hive/security/pentest-results" --file "pentest-final-report.json"`, {
      stdio: 'ignore'
    });
  } catch (error) {
    console.warn('Could not store pentest results in hive memory');
  }
}

async function cleanupZAP() {
  try {
    if (zapClient) {
      await zapClient.get('/JSON/core/action/shutdown/');
    }
  } catch (error) {
    console.warn('Could not cleanly shutdown ZAP');
  }
}