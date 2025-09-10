/**
 * Security Monitoring Dashboard
 * Real-time security metrics, threat visualization, and automated reporting
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const config = require('./security-config');
const SecurityIncidentResponse = require('./security-incident-response');

class SecurityMonitoringDashboard {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
    this.threats = new Map();
    this.dashboardData = {};
    this.incidentResponse = new SecurityIncidentResponse();
    this.monitoringInterval = null;
    this.alertThresholds = {};
    
    this.initialize();
  }

  async initialize() {
    await this.setupMetricsCollection();
    await this.loadAlertThresholds();
    await this.startRealTimeMonitoring();
    
    console.log('📊 Security Monitoring Dashboard Initialized');
  }

  async setupMetricsCollection() {
    // Initialize metrics categories
    const metricsCategories = [
      'authentication',
      'authorization', 
      'network',
      'application',
      'container',
      'database',
      'api',
      'compliance'
    ];

    for (const category of metricsCategories) {
      this.metrics.set(category, {
        current: {},
        history: [],
        alerts: [],
        lastUpdated: new Date().toISOString()
      });
    }
  }

  async loadAlertThresholds() {
    this.alertThresholds = {
      authentication: {
        failedLoginAttempts: { warning: 5, critical: 10, timeWindow: 300000 }, // 5 minutes
        suspiciousLoginPatterns: { warning: 3, critical: 5, timeWindow: 3600000 }, // 1 hour
        bruteForceAttempts: { warning: 20, critical: 50, timeWindow: 900000 } // 15 minutes
      },
      network: {
        ddosIndicators: { warning: 1000, critical: 5000, timeWindow: 60000 }, // 1 minute
        suspiciousTraffic: { warning: 100, critical: 500, timeWindow: 300000 }, // 5 minutes
        portScanning: { warning: 10, critical: 25, timeWindow: 600000 } // 10 minutes
      },
      application: {
        sqlInjectionAttempts: { warning: 1, critical: 3, timeWindow: 300000 },
        xssAttempts: { warning: 5, critical: 10, timeWindow: 300000 },
        pathTraversalAttempts: { warning: 3, critical: 7, timeWindow: 300000 },
        commandInjectionAttempts: { warning: 1, critical: 2, timeWindow: 300000 }
      },
      api: {
        rateLimitExceeded: { warning: 10, critical: 50, timeWindow: 300000 },
        unauthorizedAccess: { warning: 5, critical: 15, timeWindow: 300000 },
        invalidTokens: { warning: 20, critical: 100, timeWindow: 300000 }
      },
      container: {
        privilegeEscalation: { warning: 1, critical: 3, timeWindow: 3600000 },
        resourceAbuse: { warning: 3, critical: 10, timeWindow: 300000 },
        suspiciousProcesses: { warning: 5, critical: 15, timeWindow: 600000 }
      },
      compliance: {
        failedSecurityScans: { warning: 1, critical: 3, timeWindow: 86400000 }, // 24 hours
        expiredCertificates: { warning: 1, critical: 5, timeWindow: 86400000 },
        configurationDrift: { warning: 3, critical: 10, timeWindow: 3600000 }
      }
    };
  }

  async startRealTimeMonitoring() {
    // Start continuous monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.collectSecurityMetrics();
      await this.analyzeThreats();
      await this.checkAlertThresholds();
      await this.updateDashboard();
    }, 30000); // Update every 30 seconds

    console.log('🔄 Real-time security monitoring started');
  }

  async collectSecurityMetrics() {
    const timestamp = new Date().toISOString();
    
    // Collect authentication metrics
    await this.collectAuthenticationMetrics(timestamp);
    
    // Collect network metrics
    await this.collectNetworkMetrics(timestamp);
    
    // Collect application security metrics
    await this.collectApplicationMetrics(timestamp);
    
    // Collect API security metrics
    await this.collectAPIMetrics(timestamp);
    
    // Collect container security metrics
    await this.collectContainerMetrics(timestamp);
    
    // Collect compliance metrics
    await this.collectComplianceMetrics(timestamp);
  }

  async collectAuthenticationMetrics(timestamp) {
    const authMetrics = this.metrics.get('authentication');
    
    // Simulate authentication metrics collection
    const current = {
      totalLogins: await this.getTotalLogins(),
      failedLogins: await this.getFailedLogins(),
      suspiciousLogins: await this.getSuspiciousLogins(),
      activeUsers: await this.getActiveUsers(),
      passwordResets: await this.getPasswordResets(),
      mfaUsage: await this.getMFAUsage(),
      sessionDuration: await this.getAverageSessionDuration(),
      geographicDistribution: await this.getGeographicDistribution()
    };
    
    authMetrics.current = current;
    authMetrics.history.push({ timestamp, ...current });
    authMetrics.lastUpdated = timestamp;
    
    // Keep only last 1000 history entries
    if (authMetrics.history.length > 1000) {
      authMetrics.history = authMetrics.history.slice(-1000);
    }
  }

  async collectNetworkMetrics(timestamp) {
    const networkMetrics = this.metrics.get('network');
    
    const current = {
      totalRequests: await this.getTotalNetworkRequests(),
      blockedRequests: await this.getBlockedRequests(),
      suspiciousIPs: await this.getSuspiciousIPs(),
      ddosIndicators: await this.getDDosIndicators(),
      portScanAttempts: await this.getPortScanAttempts(),
      geolocationAnomalies: await this.getGeolocationAnomalies(),
      tlsHandshakeFailures: await this.getTLSHandshakeFailures(),
      bandwidthUsage: await this.getBandwidthUsage()
    };
    
    networkMetrics.current = current;
    networkMetrics.history.push({ timestamp, ...current });
    networkMetrics.lastUpdated = timestamp;
    
    if (networkMetrics.history.length > 1000) {
      networkMetrics.history = networkMetrics.history.slice(-1000);
    }
  }

  async collectApplicationMetrics(timestamp) {
    const appMetrics = this.metrics.get('application');
    
    const current = {
      totalRequests: await this.getTotalAppRequests(),
      errorRate: await this.getApplicationErrorRate(),
      sqlInjectionAttempts: await this.getSQLInjectionAttempts(),
      xssAttempts: await this.getXSSAttempts(),
      pathTraversalAttempts: await this.getPathTraversalAttempts(),
      commandInjectionAttempts: await this.getCommandInjectionAttempts(),
      csrfAttempts: await this.getCSRFAttempts(),
      inputValidationFailures: await this.getInputValidationFailures(),
      securityHeaderCompliance: await this.getSecurityHeaderCompliance()
    };
    
    appMetrics.current = current;
    appMetrics.history.push({ timestamp, ...current });
    appMetrics.lastUpdated = timestamp;
    
    if (appMetrics.history.length > 1000) {
      appMetrics.history = appMetrics.history.slice(-1000);
    }
  }

  async collectAPIMetrics(timestamp) {
    const apiMetrics = this.metrics.get('api');
    
    const current = {
      totalAPIRequests: await this.getTotalAPIRequests(),
      rateLimitViolations: await this.getRateLimitViolations(),
      invalidTokens: await this.getInvalidTokens(),
      unauthorizedAccess: await this.getUnauthorizedAccess(),
      openrouterUsage: await this.getOpenRouterUsage(),
      apiKeyExposures: await this.getAPIKeyExposures(),
      responseTimeAnomalies: await this.getResponseTimeAnomalies(),
      dataLeakageAttempts: await this.getDataLeakageAttempts()
    };
    
    apiMetrics.current = current;
    apiMetrics.history.push({ timestamp, ...current });
    apiMetrics.lastUpdated = timestamp;
    
    if (apiMetrics.history.length > 1000) {
      apiMetrics.history = apiMetrics.history.slice(-1000);
    }
  }

  async collectContainerMetrics(timestamp) {
    const containerMetrics = this.metrics.get('container');
    
    const current = {
      runningContainers: await this.getRunningContainers(),
      privilegedContainers: await this.getPrivilegedContainers(),
      resourceViolations: await this.getResourceViolations(),
      suspiciousProcesses: await this.getSuspiciousProcesses(),
      fileSystemChanges: await this.getFileSystemChanges(),
      networkConnections: await this.getContainerNetworkConnections(),
      vulnerableImages: await this.getVulnerableImages(),
      complianceViolations: await this.getComplianceViolations()
    };
    
    containerMetrics.current = current;
    containerMetrics.history.push({ timestamp, ...current });
    containerMetrics.lastUpdated = timestamp;
    
    if (containerMetrics.history.length > 1000) {
      containerMetrics.history = containerMetrics.history.slice(-1000);
    }
  }

  async collectComplianceMetrics(timestamp) {
    const complianceMetrics = this.metrics.get('compliance');
    
    const current = {
      owaspCompliance: await this.getOWASPCompliance(),
      nistCompliance: await this.getNISTCompliance(),
      iso27001Compliance: await this.getISO27001Compliance(),
      securityScanResults: await this.getSecurityScanResults(),
      vulnerabilityCount: await this.getVulnerabilityCount(),
      patchLevel: await this.getPatchLevel(),
      configurationCompliance: await this.getConfigurationCompliance(),
      auditTrailIntegrity: await this.getAuditTrailIntegrity()
    };
    
    complianceMetrics.current = current;
    complianceMetrics.history.push({ timestamp, ...current });
    complianceMetrics.lastUpdated = timestamp;
    
    if (complianceMetrics.history.length > 1000) {
      complianceMetrics.history = complianceMetrics.history.slice(-1000);
    }
  }

  async analyzeThreats() {
    const threatAnalysis = {
      timestamp: new Date().toISOString(),
      activeThreats: [],
      threatLevel: 'LOW',
      riskScore: 0
    };
    
    // Analyze authentication threats
    const authThreats = await this.analyzeAuthenticationThreats();
    threatAnalysis.activeThreats.push(...authThreats);
    
    // Analyze network threats
    const networkThreats = await this.analyzeNetworkThreats();
    threatAnalysis.activeThreats.push(...networkThreats);
    
    // Analyze application threats
    const appThreats = await this.analyzeApplicationThreats();
    threatAnalysis.activeThreats.push(...appThreats);
    
    // Calculate overall threat level and risk score
    threatAnalysis.threatLevel = this.calculateThreatLevel(threatAnalysis.activeThreats);
    threatAnalysis.riskScore = this.calculateRiskScore(threatAnalysis.activeThreats);
    
    // Store threat analysis
    this.threats.set(threatAnalysis.timestamp, threatAnalysis);
    
    // Trigger incident response for critical threats
    for (const threat of threatAnalysis.activeThreats) {
      if (threat.severity === 'CRITICAL') {
        await this.triggerIncidentResponse(threat);
      }
    }
  }

  async analyzeAuthenticationThreats() {
    const threats = [];
    const authMetrics = this.metrics.get('authentication').current;
    
    // Check for brute force attacks
    if (authMetrics.failedLogins > this.alertThresholds.authentication.bruteForceAttempts.critical) {
      threats.push({
        type: 'brute-force-attack',
        severity: 'CRITICAL',
        description: `High number of failed login attempts: ${authMetrics.failedLogins}`,
        indicators: ['failed-logins', 'authentication'],
        riskScore: 9
      });
    }
    
    // Check for suspicious login patterns
    if (authMetrics.suspiciousLogins > this.alertThresholds.authentication.suspiciousLoginPatterns.warning) {
      threats.push({
        type: 'suspicious-login-pattern',
        severity: authMetrics.suspiciousLogins > this.alertThresholds.authentication.suspiciousLoginPatterns.critical ? 'HIGH' : 'MEDIUM',
        description: `Suspicious login patterns detected: ${authMetrics.suspiciousLogins}`,
        indicators: ['suspicious-login', 'authentication'],
        riskScore: authMetrics.suspiciousLogins > this.alertThresholds.authentication.suspiciousLoginPatterns.critical ? 7 : 5
      });
    }
    
    return threats;
  }

  async analyzeNetworkThreats() {
    const threats = [];
    const networkMetrics = this.metrics.get('network').current;
    
    // Check for DDoS indicators
    if (networkMetrics.ddosIndicators > this.alertThresholds.network.ddosIndicators.critical) {
      threats.push({
        type: 'ddos-attack',
        severity: 'CRITICAL',
        description: `DDoS attack detected: ${networkMetrics.ddosIndicators} req/min`,
        indicators: ['ddos', 'network-attack'],
        riskScore: 10
      });
    }
    
    // Check for port scanning
    if (networkMetrics.portScanAttempts > this.alertThresholds.network.portScanning.warning) {
      threats.push({
        type: 'port-scanning',
        severity: networkMetrics.portScanAttempts > this.alertThresholds.network.portScanning.critical ? 'HIGH' : 'MEDIUM',
        description: `Port scanning detected: ${networkMetrics.portScanAttempts} attempts`,
        indicators: ['port-scan', 'reconnaissance'],
        riskScore: networkMetrics.portScanAttempts > this.alertThresholds.network.portScanning.critical ? 8 : 6
      });
    }
    
    return threats;
  }

  async analyzeApplicationThreats() {
    const threats = [];
    const appMetrics = this.metrics.get('application').current;
    
    // Check for SQL injection attempts
    if (appMetrics.sqlInjectionAttempts > this.alertThresholds.application.sqlInjectionAttempts.warning) {
      threats.push({
        type: 'sql-injection-attempt',
        severity: appMetrics.sqlInjectionAttempts > this.alertThresholds.application.sqlInjectionAttempts.critical ? 'CRITICAL' : 'HIGH',
        description: `SQL injection attempts detected: ${appMetrics.sqlInjectionAttempts}`,
        indicators: ['sql-injection', 'web-attack'],
        riskScore: appMetrics.sqlInjectionAttempts > this.alertThresholds.application.sqlInjectionAttempts.critical ? 9 : 7
      });
    }
    
    // Check for XSS attempts
    if (appMetrics.xssAttempts > this.alertThresholds.application.xssAttempts.warning) {
      threats.push({
        type: 'xss-attempt',
        severity: appMetrics.xssAttempts > this.alertThresholds.application.xssAttempts.critical ? 'HIGH' : 'MEDIUM',
        description: `XSS attempts detected: ${appMetrics.xssAttempts}`,
        indicators: ['xss', 'web-attack'],
        riskScore: appMetrics.xssAttempts > this.alertThresholds.application.xssAttempts.critical ? 8 : 5
      });
    }
    
    return threats;
  }

  calculateThreatLevel(threats) {
    if (threats.some(t => t.severity === 'CRITICAL')) return 'CRITICAL';
    if (threats.some(t => t.severity === 'HIGH')) return 'HIGH';
    if (threats.some(t => t.severity === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }

  calculateRiskScore(threats) {
    if (threats.length === 0) return 0;
    const totalScore = threats.reduce((sum, threat) => sum + threat.riskScore, 0);
    return Math.min(10, totalScore / threats.length);
  }

  async triggerIncidentResponse(threat) {
    const incidentEvent = {
      source: 'security-monitoring',
      description: threat.description,
      indicators: threat.indicators,
      affectedSystems: this.determineAffectedSystems(threat),
      evidence: [{ type: 'threat-detection', data: threat }]
    };
    
    const incidentId = await this.incidentResponse.detectSecurityIncident(incidentEvent);
    console.log(`🚨 Incident ${incidentId} triggered for threat: ${threat.type}`);
    
    return incidentId;
  }

  determineAffectedSystems(threat) {
    const systemMap = {
      'brute-force-attack': ['api', 'auth-service'],
      'ddos-attack': ['api', 'web-server', 'load-balancer'],
      'sql-injection-attempt': ['api', 'database'],
      'xss-attempt': ['web', 'api'],
      'port-scanning': ['network', 'firewall'],
      'suspicious-login-pattern': ['api', 'auth-service']
    };
    
    return systemMap[threat.type] || ['unknown'];
  }

  async checkAlertThresholds() {
    const alerts = [];
    
    for (const [category, metrics] of this.metrics.entries()) {
      const thresholds = this.alertThresholds[category];
      if (!thresholds) continue;
      
      for (const [metric, threshold] of Object.entries(thresholds)) {
        const currentValue = metrics.current[metric];
        if (currentValue === undefined) continue;
        
        let alertLevel = null;
        if (currentValue >= threshold.critical) {
          alertLevel = 'CRITICAL';
        } else if (currentValue >= threshold.warning) {
          alertLevel = 'WARNING';
        }
        
        if (alertLevel) {
          alerts.push({
            category,
            metric,
            level: alertLevel,
            currentValue,
            threshold: alertLevel === 'CRITICAL' ? threshold.critical : threshold.warning,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    // Store new alerts
    this.alerts.push(...alerts);
    
    // Keep only last 10000 alerts
    if (this.alerts.length > 10000) {
      this.alerts = this.alerts.slice(-10000);
    }
    
    // Send notifications for critical alerts
    for (const alert of alerts) {
      if (alert.level === 'CRITICAL') {
        await this.sendCriticalAlertNotification(alert);
      }
    }
  }

  async sendCriticalAlertNotification(alert) {
    // Send critical alert notification
    console.log(`🚨 CRITICAL ALERT: ${alert.category}.${alert.metric} = ${alert.currentValue} (threshold: ${alert.threshold})`);
    
    // This would integrate with notification systems
    const notification = {
      type: 'security-alert',
      level: alert.level,
      message: `Critical security threshold exceeded: ${alert.category}.${alert.metric}`,
      details: alert,
      timestamp: alert.timestamp
    };
    
    // Store notification for dashboard
    this.dashboardData.lastCriticalAlert = notification;
  }

  async updateDashboard() {
    const timestamp = new Date().toISOString();
    
    this.dashboardData = {
      lastUpdated: timestamp,
      
      // Overview metrics
      overview: {
        threatLevel: this.getCurrentThreatLevel(),
        riskScore: this.getCurrentRiskScore(),
        activeIncidents: this.incidentResponse.getIncidentsByStatus('RESPONDING').length,
        totalAlerts: this.getRecentAlerts(86400000).length, // Last 24 hours
        systemStatus: await this.getSystemStatus(),
        complianceScore: await this.getOverallComplianceScore()
      },
      
      // Real-time metrics
      realTime: {
        authentication: this.metrics.get('authentication').current,
        network: this.metrics.get('network').current,
        application: this.metrics.get('application').current,
        api: this.metrics.get('api').current,
        container: this.metrics.get('container').current,
        compliance: this.metrics.get('compliance').current
      },
      
      // Historical trends (last 24 hours)
      trends: {
        authentication: this.getMetricsTrend('authentication', 86400000),
        network: this.getMetricsTrend('network', 86400000),
        application: this.getMetricsTrend('application', 86400000),
        api: this.getMetricsTrend('api', 86400000),
        container: this.getMetricsTrend('container', 86400000)
      },
      
      // Active threats
      threats: this.getActiveThreats(),
      
      // Recent alerts
      alerts: this.getRecentAlerts(3600000), // Last hour
      
      // Top threats by category
      topThreats: this.getTopThreats(),
      
      // Geographic distribution
      geography: await this.getGeographicThreatDistribution(),
      
      // Incident response status
      incidentResponse: {
        activeIncidents: this.incidentResponse.getIncidentsByStatus('RESPONDING'),
        recentIncidents: this.incidentResponse.getIncidentsByStatus('RESOLVED').slice(-10),
        responseTeamStatus: await this.getResponseTeamStatus()
      }
    };
    
    // Save dashboard data
    await this.saveDashboardData();
    
    // Store in hive memory
    await this.storeDashboardInHive();
  }

  getCurrentThreatLevel() {
    const recentThreats = Array.from(this.threats.values())
      .filter(t => Date.now() - new Date(t.timestamp).getTime() < 3600000) // Last hour
      .flatMap(t => t.activeThreats);
      
    return this.calculateThreatLevel(recentThreats);
  }

  getCurrentRiskScore() {
    const recentThreats = Array.from(this.threats.values())
      .filter(t => Date.now() - new Date(t.timestamp).getTime() < 3600000) // Last hour
      .flatMap(t => t.activeThreats);
      
    return this.calculateRiskScore(recentThreats);
  }

  getRecentAlerts(timeWindow) {
    const cutoff = Date.now() - timeWindow;
    return this.alerts.filter(a => new Date(a.timestamp).getTime() > cutoff);
  }

  getMetricsTrend(category, timeWindow) {
    const metrics = this.metrics.get(category);
    if (!metrics) return [];
    
    const cutoff = Date.now() - timeWindow;
    return metrics.history.filter(h => new Date(h.timestamp).getTime() > cutoff);
  }

  getActiveThreats() {
    const recentThreats = Array.from(this.threats.values())
      .filter(t => Date.now() - new Date(t.timestamp).getTime() < 3600000) // Last hour
      .flatMap(t => t.activeThreats);
      
    return recentThreats.sort((a, b) => b.riskScore - a.riskScore);
  }

  getTopThreats() {
    const allThreats = Array.from(this.threats.values())
      .filter(t => Date.now() - new Date(t.timestamp).getTime() < 86400000) // Last 24 hours
      .flatMap(t => t.activeThreats);
      
    const threatCounts = {};
    for (const threat of allThreats) {
      threatCounts[threat.type] = (threatCounts[threat.type] || 0) + 1;
    }
    
    return Object.entries(threatCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  async getSystemStatus() {
    return {
      api: 'healthy',
      database: 'healthy',
      containers: 'healthy',
      network: 'healthy',
      monitoring: 'healthy'
    };
  }

  async getOverallComplianceScore() {
    const complianceMetrics = this.metrics.get('compliance').current;
    
    const scores = [
      complianceMetrics.owaspCompliance || 0,
      complianceMetrics.nistCompliance || 0,
      complianceMetrics.iso27001Compliance || 0
    ];
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  async getGeographicThreatDistribution() {
    // Simulate geographic threat distribution
    return {
      'US': { threats: 45, level: 'MEDIUM' },
      'CN': { threats: 123, level: 'HIGH' },
      'RU': { threats: 67, level: 'HIGH' },
      'BR': { threats: 23, level: 'MEDIUM' },
      'DE': { threats: 12, level: 'LOW' }
    };
  }

  async getResponseTeamStatus() {
    return {
      availableMembers: 4,
      totalMembers: 6,
      averageResponseTime: '2.3 minutes',
      escalationLevel: 'NORMAL'
    };
  }

  async saveDashboardData() {
    const dashboardFile = path.join(
      config.security.compliance.reports.outputDir,
      'security-dashboard.json'
    );
    
    await fs.mkdir(path.dirname(dashboardFile), { recursive: true });
    await fs.writeFile(dashboardFile, JSON.stringify(this.dashboardData, null, 2));
  }

  async storeDashboardInHive() {
    try {
      execSync(`npx claude-flow@alpha hooks post-edit --memory-key "hive/security/dashboard" --file "security-dashboard.json"`, {
        stdio: 'ignore'
      });
    } catch (error) {
      console.warn('Could not store dashboard data in hive memory');
    }
  }

  // Mock data generation methods for demonstration
  async getTotalLogins() { return Math.floor(Math.random() * 1000) + 500; }
  async getFailedLogins() { return Math.floor(Math.random() * 20); }
  async getSuspiciousLogins() { return Math.floor(Math.random() * 5); }
  async getActiveUsers() { return Math.floor(Math.random() * 200) + 100; }
  async getPasswordResets() { return Math.floor(Math.random() * 10); }
  async getMFAUsage() { return Math.floor(Math.random() * 80) + 20; }
  async getAverageSessionDuration() { return Math.floor(Math.random() * 120) + 30; }
  async getGeographicDistribution() { return { US: 45, EU: 30, ASIA: 25 }; }

  async getTotalNetworkRequests() { return Math.floor(Math.random() * 10000) + 5000; }
  async getBlockedRequests() { return Math.floor(Math.random() * 100) + 10; }
  async getSuspiciousIPs() { return Math.floor(Math.random() * 20) + 5; }
  async getDDosIndicators() { return Math.floor(Math.random() * 500); }
  async getPortScanAttempts() { return Math.floor(Math.random() * 15); }
  async getGeolocationAnomalies() { return Math.floor(Math.random() * 8); }
  async getTLSHandshakeFailures() { return Math.floor(Math.random() * 25); }
  async getBandwidthUsage() { return Math.floor(Math.random() * 1000) + 500; }

  async getTotalAppRequests() { return Math.floor(Math.random() * 5000) + 2000; }
  async getApplicationErrorRate() { return Math.random() * 5; }
  async getSQLInjectionAttempts() { return Math.floor(Math.random() * 3); }
  async getXSSAttempts() { return Math.floor(Math.random() * 8); }
  async getPathTraversalAttempts() { return Math.floor(Math.random() * 5); }
  async getCommandInjectionAttempts() { return Math.floor(Math.random() * 2); }
  async getCSRFAttempts() { return Math.floor(Math.random() * 4); }
  async getInputValidationFailures() { return Math.floor(Math.random() * 15); }
  async getSecurityHeaderCompliance() { return Math.floor(Math.random() * 20) + 80; }

  async getTotalAPIRequests() { return Math.floor(Math.random() * 3000) + 1000; }
  async getRateLimitViolations() { return Math.floor(Math.random() * 12); }
  async getInvalidTokens() { return Math.floor(Math.random() * 25); }
  async getUnauthorizedAccess() { return Math.floor(Math.random() * 8); }
  async getOpenRouterUsage() { return Math.floor(Math.random() * 500) + 100; }
  async getAPIKeyExposures() { return Math.floor(Math.random() * 2); }
  async getResponseTimeAnomalies() { return Math.floor(Math.random() * 6); }
  async getDataLeakageAttempts() { return Math.floor(Math.random() * 3); }

  async getRunningContainers() { return Math.floor(Math.random() * 20) + 10; }
  async getPrivilegedContainers() { return Math.floor(Math.random() * 3); }
  async getResourceViolations() { return Math.floor(Math.random() * 5); }
  async getSuspiciousProcesses() { return Math.floor(Math.random() * 8); }
  async getFileSystemChanges() { return Math.floor(Math.random() * 15); }
  async getContainerNetworkConnections() { return Math.floor(Math.random() * 50) + 20; }
  async getVulnerableImages() { return Math.floor(Math.random() * 4); }
  async getComplianceViolations() { return Math.floor(Math.random() * 6); }

  async getOWASPCompliance() { return Math.floor(Math.random() * 15) + 85; }
  async getNISTCompliance() { return Math.floor(Math.random() * 20) + 80; }
  async getISO27001Compliance() { return Math.floor(Math.random() * 25) + 75; }
  async getSecurityScanResults() { return { passed: Math.floor(Math.random() * 100) + 450, failed: Math.floor(Math.random() * 10) }; }
  async getVulnerabilityCount() { return Math.floor(Math.random() * 15) + 5; }
  async getPatchLevel() { return Math.floor(Math.random() * 10) + 90; }
  async getConfigurationCompliance() { return Math.floor(Math.random() * 15) + 85; }
  async getAuditTrailIntegrity() { return Math.random() > 0.1 ? 100 : 85; }

  // Dashboard API methods
  getDashboardData() {
    return this.dashboardData;
  }

  getMetricsHistory(category, timeWindow = 3600000) {
    return this.getMetricsTrend(category, timeWindow);
  }

  getAlertHistory(timeWindow = 86400000) {
    return this.getRecentAlerts(timeWindow);
  }

  getThreatHistory(timeWindow = 86400000) {
    const cutoff = Date.now() - timeWindow;
    return Array.from(this.threats.values())
      .filter(t => new Date(t.timestamp).getTime() > cutoff);
  }

  generateSecurityReport(timeWindow = 86400000) {
    const report = {
      timestamp: new Date().toISOString(),
      timeWindow,
      summary: {
        totalThreats: this.getActiveThreats().length,
        totalAlerts: this.getRecentAlerts(timeWindow).length,
        totalIncidents: this.incidentResponse.getAllIncidents().length,
        averageRiskScore: this.getCurrentRiskScore(),
        overallThreatLevel: this.getCurrentThreatLevel()
      },
      threats: this.getActiveThreats(),
      alerts: this.getRecentAlerts(timeWindow),
      incidents: this.incidentResponse.getAllIncidents(),
      compliance: this.metrics.get('compliance').current,
      recommendations: this.generateSecurityRecommendations()
    };
    
    return report;
  }

  generateSecurityRecommendations() {
    const recommendations = [];
    const activeThreats = this.getActiveThreats();
    
    if (activeThreats.some(t => t.type === 'brute-force-attack')) {
      recommendations.push('Implement account lockout policies and CAPTCHA');
    }
    
    if (activeThreats.some(t => t.type === 'ddos-attack')) {
      recommendations.push('Configure DDoS protection and rate limiting');
    }
    
    if (activeThreats.some(t => t.type === 'sql-injection-attempt')) {
      recommendations.push('Review and strengthen input validation');
    }
    
    if (this.getRecentAlerts(86400000).some(a => a.level === 'CRITICAL')) {
      recommendations.push('Review and update security monitoring thresholds');
    }
    
    return recommendations;
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 Security monitoring stopped');
    }
  }
}

module.exports = SecurityMonitoringDashboard;