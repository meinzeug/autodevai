/**
 * AutoDev-AI Security Testing Configuration
 * Comprehensive security testing framework for the Neural Bridge Platform
 */

const path = require('path');

module.exports = {
  // Security Testing Configuration
  security: {
    // Vulnerability Scanning
    scanning: {
      trivy: {
        enabled: true,
        configPath: path.join(__dirname, 'scanners/trivy.yaml'),
        outputFormat: 'json',
        severity: ['HIGH', 'CRITICAL'],
        includeDevDeps: false,
        timeout: 300000, // 5 minutes
      },
      zapProxy: {
        enabled: true,
        host: 'localhost',
        port: 8080,
        timeout: 600000, // 10 minutes
        scanPolicies: ['SQL-Injection', 'XSS', 'Path-Traversal'],
        apiKey: process.env.ZAP_API_KEY || 'test-api-key',
      },
      sonarqube: {
        enabled: process.env.SONAR_ENABLED === 'true',
        url: process.env.SONAR_HOST_URL || 'http://localhost:9000',
        token: process.env.SONAR_TOKEN,
        projectKey: 'autodev-ai-security',
      },
    },

    // API Security Testing
    api: {
      baseUrl: process.env.API_BASE_URL || 'http://localhost:50052',
      openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1',
        testApiKey: 'sk-or-v1-test-key-for-security-testing',
        rateLimits: {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
        },
        endpoints: [
          '/models',
          '/chat/completions',
          '/usage',
          '/auth/key',
        ],
      },
      security: {
        authEndpoints: ['/auth/login', '/auth/register', '/auth/refresh'],
        protectedEndpoints: ['/api/users', '/api/admin', '/api/sandbox'],
        publicEndpoints: ['/health', '/api/public'],
      },
    },

    // Authentication & Authorization
    auth: {
      jwt: {
        secret: process.env.JWT_SECRET || 'test-secret',
        algorithms: ['HS256'],
        expiresIn: '1h',
        issuer: 'autodev-ai',
      },
      users: {
        admin: {
          username: 'admin-test',
          password: 'admin-secure-password-2024',
          role: 'admin',
        },
        user: {
          username: 'user-test',
          password: 'user-secure-password-2024',
          role: 'user',
        },
        guest: {
          username: 'guest-test',
          password: 'guest-password-2024',
          role: 'guest',
        },
      },
    },

    // Container Security
    containers: {
      images: [
        'autodev-api',
        'autodev-gui',
        'sandbox-template',
        'postgres:16-alpine',
        'redis:7-alpine',
        'nginx:alpine',
      ],
      registries: [
        'docker.io',
        'ghcr.io',
      ],
      policies: {
        allowedUsers: ['autodev', 'sandbox'],
        blockedPorts: [22, 23, 3389],
        maxCpuUsage: 80,
        maxMemoryUsage: 80,
      },
    },

    // Input Validation
    validation: {
      patterns: {
        sqlInjection: [
          "' OR '1'='1",
          '" OR "1"="1',
          '; DROP TABLE users--',
          'UNION SELECT * FROM users',
          '1\' UNION SELECT NULL--',
        ],
        xss: [
          '<script>alert("XSS")</script>',
          'javascript:alert("XSS")',
          '<img src="x" onerror="alert(\'XSS\')" />',
          '"><script>alert(\'XSS\')</script>',
        ],
        pathTraversal: [
          '../../../etc/passwd',
          '..\\..\\..\\windows\\system32\\config\\sam',
          '/etc/shadow',
          'C:\\Windows\\System32\\drivers\\etc\\hosts',
        ],
        commandInjection: [
          '; cat /etc/passwd',
          '| whoami',
          '&& ls -la',
          '`cat /etc/passwd`',
        ],
      },
    },

    // Compliance Standards
    compliance: {
      standards: ['OWASP-ASVS-4.0', 'NIST-CSF', 'ISO-27001'],
      reports: {
        format: 'json',
        outputDir: path.join(__dirname, '../reports/security'),
        retention: 30, // days
      },
    },

    // Monitoring & Alerting
    monitoring: {
      metricsPort: 9090,
      alerting: {
        slack: {
          enabled: process.env.SLACK_ENABLED === 'true',
          webhook: process.env.SLACK_WEBHOOK_URL,
          channel: '#security-alerts',
        },
        email: {
          enabled: process.env.EMAIL_ALERTS === 'true',
          recipients: (process.env.SECURITY_EMAIL_LIST || '').split(','),
        },
      },
    },
  },

  // Test Environment Configuration
  environment: {
    nodeEnv: 'test',
    logLevel: 'info',
    timeout: 30000,
    retries: 3,
  },

  // Database Configuration for Security Tests
  database: {
    test: {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT) || 50050,
      username: 'autodev_test',
      password: 'test_secure_2024',
      database: 'autodev_security_test',
    },
  },

  // Redis Configuration for Security Tests
  redis: {
    test: {
      host: process.env.TEST_REDIS_HOST || 'localhost',
      port: parseInt(process.env.TEST_REDIS_PORT) || 50051,
      password: 'redis_test_secure_2024',
      db: 15, // Use different DB for tests
    },
  },
};