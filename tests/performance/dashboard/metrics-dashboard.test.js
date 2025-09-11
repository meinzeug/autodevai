const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

describe('Performance Metrics Dashboard', () => {
  let testMetrics;
  let dashboardData;
  let metricsCollector;

  beforeAll(() => {
    testMetrics = {
      startTime: Date.now(),
      dashboardTests: [],
      metricsData: [],
      visualizations: [],
      alerts: []
    };
    
    dashboardData = {
      realTimeMetrics: {},
      historicalData: [],
      performanceBaselines: {},
      alertsConfig: {},
      dashboardConfig: {}
    };
    
    metricsCollector = new MetricsCollector();
    console.log('📊 Initializing performance metrics dashboard tests...');
  });

  afterAll(() => {
    const summary = {
      testDuration: Date.now() - testMetrics.startTime,
      dashboardComponents: testMetrics.dashboardTests.length,
      metricsCollected: testMetrics.metricsData.length,
      visualizationsGenerated: testMetrics.visualizations.length,
      alertsConfigured: testMetrics.alerts.length
    };
    
    console.log('🚀 Dashboard Testing Summary:', summary);
    global.performanceUtils.saveMetrics('metrics-dashboard', {
      summary,
      dashboardData,
      testMetrics
    });
    
    // Generate final dashboard
    generateProductionDashboard();
  });

  class MetricsCollector {
    constructor() {
      this.collectors = {};
      this.realTimeData = {};
      this.historicalData = [];
      this.isCollecting = false;
    }

    startCollection(interval = 1000) {
      if (this.isCollecting) return;
      
      this.isCollecting = true;
      this.collectionInterval = setInterval(async () => {
        await this.collectMetrics();
      }, interval);
      
      console.log('📊 Started metrics collection');
    }

    stopCollection() {
      if (this.collectionInterval) {
        clearInterval(this.collectionInterval);
        this.collectionInterval = null;
        this.isCollecting = false;
        console.log('📊 Stopped metrics collection');
      }
    }

    async collectMetrics() {
      const timestamp = Date.now();
      
      try {
        const metrics = {
          timestamp,
          system: await this.collectSystemMetrics(),
          application: await this.collectApplicationMetrics(),
          performance: await this.collectPerformanceMetrics(),
          custom: await this.collectCustomMetrics()
        };
        
        this.realTimeData = metrics;
        this.historicalData.push(metrics);
        testMetrics.metricsData.push(metrics);
        
        // Keep only last 1000 data points to prevent memory issues
        if (this.historicalData.length > 1000) {
          this.historicalData = this.historicalData.slice(-1000);
        }
        
        return metrics;
      } catch (error) {
        console.log(`⚠️  Error collecting metrics: ${error.message}`);
        return null;
      }
    }

    async collectSystemMetrics() {
      const os = require('os');
      
      return {
        cpu: {
          usage: (os.loadavg()[0] / os.cpus().length) * 100,
          loadAverage: os.loadavg(),
          cores: os.cpus().length
        },
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          utilization: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
        },
        uptime: os.uptime(),
        platform: os.platform(),
        arch: os.arch()
      };
    }

    async collectApplicationMetrics() {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      return {
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers || 0
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        uptime: process.uptime(),
        pid: process.pid,
        version: process.version
      };
    }

    async collectPerformanceMetrics() {
      // Simulate collecting application-specific performance metrics
      return {
        activeConnections: Math.floor(Math.random() * 100) + 20,
        requestsPerSecond: Math.floor(Math.random() * 500) + 50,
        averageResponseTime: Math.random() * 1000 + 100,
        errorRate: Math.random() * 5,
        throughput: Math.floor(Math.random() * 1000) + 200,
        queueLength: Math.floor(Math.random() * 50),
        cacheHitRate: 85 + Math.random() * 10
      };
    }

    async collectCustomMetrics() {
      // Custom application metrics
      return {
        aiModelRequests: Math.floor(Math.random() * 50) + 10,
        containerOperations: Math.floor(Math.random() * 20) + 5,
        databaseConnections: Math.floor(Math.random() * 30) + 10,
        apiCalls: Math.floor(Math.random() * 200) + 50,
        backgroundTasks: Math.floor(Math.random() * 10) + 2
      };
    }

    generateReport() {
      if (this.historicalData.length === 0) return null;
      
      const latest = this.historicalData[this.historicalData.length - 1];
      const oldest = this.historicalData[0];
      const duration = latest.timestamp - oldest.timestamp;
      
      return {
        dataPoints: this.historicalData.length,
        collectionDuration: duration,
        latest: latest,
        averages: this.calculateAverages(),
        trends: this.calculateTrends(),
        peaks: this.findPeaks()
      };
    }

    calculateAverages() {
      const sums = {};
      const counts = {};
      
      this.historicalData.forEach(data => {
        this.addToAverages(sums, counts, data.system, 'system');
        this.addToAverages(sums, counts, data.application, 'application');
        this.addToAverages(sums, counts, data.performance, 'performance');
        this.addToAverages(sums, counts, data.custom, 'custom');
      });
      
      const averages = {};
      Object.keys(sums).forEach(key => {
        averages[key] = sums[key] / counts[key];
      });
      
      return averages;
    }

    addToAverages(sums, counts, obj, prefix) {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = `${prefix}.${key}`;
        if (typeof value === 'number') {
          sums[fullKey] = (sums[fullKey] || 0) + value;
          counts[fullKey] = (counts[fullKey] || 0) + 1;
        } else if (typeof value === 'object' && value !== null) {
          this.addToAverages(sums, counts, value, fullKey);
        }
      });
    }

    calculateTrends() {
      if (this.historicalData.length < 2) return {};
      
      const first = this.historicalData[0];
      const last = this.historicalData[this.historicalData.length - 1];
      
      return {
        cpuTrend: this.calculateTrend(first.system.cpu.usage, last.system.cpu.usage),
        memoryTrend: this.calculateTrend(first.system.memory.utilization, last.system.memory.utilization),
        responseTimeTrend: this.calculateTrend(first.performance.averageResponseTime, last.performance.averageResponseTime),
        throughputTrend: this.calculateTrend(first.performance.throughput, last.performance.throughput)
      };
    }

    calculateTrend(first, last) {
      if (first === 0) return 0;
      const change = ((last - first) / first) * 100;
      let direction = 'stable';
      if (change > 5) direction = 'increasing';
      else if (change < -5) direction = 'decreasing';
      
      return { change, direction };
    }

    findPeaks() {
      if (this.historicalData.length === 0) return {};
      
      const peaks = {
        maxCpuUsage: Math.max(...this.historicalData.map(d => d.system.cpu.usage)),
        maxMemoryUsage: Math.max(...this.historicalData.map(d => d.system.memory.utilization)),
        maxResponseTime: Math.max(...this.historicalData.map(d => d.performance.averageResponseTime)),
        minResponseTime: Math.min(...this.historicalData.map(d => d.performance.averageResponseTime)),
        maxThroughput: Math.max(...this.historicalData.map(d => d.performance.throughput)),
        maxErrorRate: Math.max(...this.historicalData.map(d => d.performance.errorRate))
      };
      
      return peaks;
    }
  }

  class DashboardVisualizer {
    constructor() {
      this.charts = [];
      this.widgets = [];
    }

    generateTimeSeriesChart(data, metric, title) {
      const chartData = {
        type: 'timeseries',
        title: title,
        metric: metric,
        data: data.map(point => ({
          timestamp: point.timestamp,
          value: this.extractMetricValue(point, metric)
        })),
        config: {
          xAxis: 'timestamp',
          yAxis: 'value',
          color: '#3498db',
          showGrid: true,
          showPoints: false
        }
      };
      
      this.charts.push(chartData);
      return chartData;
    }

    generateGaugeChart(currentValue, maxValue, title, thresholds = {}) {
      const chartData = {
        type: 'gauge',
        title: title,
        currentValue: currentValue,
        maxValue: maxValue,
        thresholds: {
          good: thresholds.good || maxValue * 0.6,
          warning: thresholds.warning || maxValue * 0.8,
          critical: thresholds.critical || maxValue * 0.9
        },
        config: {
          colors: {
            good: '#27ae60',
            warning: '#f39c12',
            critical: '#e74c3c'
          }
        }
      };
      
      this.charts.push(chartData);
      return chartData;
    }

    generateBarChart(data, title) {
      const chartData = {
        type: 'bar',
        title: title,
        data: data,
        config: {
          color: '#9b59b6',
          showValues: true,
          horizontal: false
        }
      };
      
      this.charts.push(chartData);
      return chartData;
    }

    generateHeatmap(data, title) {
      const chartData = {
        type: 'heatmap',
        title: title,
        data: data,
        config: {
          colorScale: ['#2ecc71', '#f39c12', '#e74c3c'],
          showTooltips: true
        }
      };
      
      this.charts.push(chartData);
      return chartData;
    }

    createWidget(type, title, value, config = {}) {
      const widget = {
        type: type,
        title: title,
        value: value,
        timestamp: Date.now(),
        config: {
          format: config.format || 'number',
          unit: config.unit || '',
          precision: config.precision || 2,
          color: config.color || '#34495e',
          size: config.size || 'medium'
        }
      };
      
      this.widgets.push(widget);
      return widget;
    }

    extractMetricValue(dataPoint, metricPath) {
      const parts = metricPath.split('.');
      let value = dataPoint;
      
      for (const part of parts) {
        if (value && typeof value === 'object') {
          value = value[part];
        } else {
          return null;
        }
      }
      
      return value;
    }

    generateDashboard() {
      return {
        charts: this.charts,
        widgets: this.widgets,
        layout: this.generateLayout(),
        timestamp: Date.now()
      };
    }

    generateLayout() {
      return {
        grid: {
          columns: 12,
          rows: 'auto'
        },
        sections: [
          {
            title: 'System Overview',
            widgets: this.widgets.filter(w => w.title.toLowerCase().includes('cpu') || w.title.toLowerCase().includes('memory')),
            charts: this.charts.filter(c => c.metric && c.metric.startsWith('system'))
          },
          {
            title: 'Application Performance',
            widgets: this.widgets.filter(w => w.title.toLowerCase().includes('response') || w.title.toLowerCase().includes('throughput')),
            charts: this.charts.filter(c => c.metric && c.metric.startsWith('performance'))
          },
          {
            title: 'Custom Metrics',
            widgets: this.widgets.filter(w => w.title.toLowerCase().includes('ai') || w.title.toLowerCase().includes('container')),
            charts: this.charts.filter(c => c.metric && c.metric.startsWith('custom'))
          }
        ]
      };
    }
  }

  test('Real-time Metrics Collection', async () => {
    console.log('📊 Testing real-time metrics collection...');
    
    metricsCollector.startCollection(500); // Collect every 500ms
    
    // Let it collect data for a while
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
    
    metricsCollector.stopCollection();
    
    const report = metricsCollector.generateReport();
    
    console.log(`📊 Metrics Collection Report:
      - Data Points: ${report.dataPoints}
      - Collection Duration: ${(report.collectionDuration / 1000).toFixed(1)}s
      - Average CPU Usage: ${report.averages['system.cpu.usage']?.toFixed(2)}%
      - Average Memory Usage: ${report.averages['system.memory.utilization']?.toFixed(2)}%
      - Max Response Time: ${report.peaks.maxResponseTime?.toFixed(2)}ms
      - Max Throughput: ${report.peaks.maxThroughput}`);
    
    testMetrics.dashboardTests.push({
      testType: 'real-time-collection',
      report: report,
      dataPoints: report.dataPoints,
      success: report.dataPoints > 15 // Should have collected at least 15 data points
    });
    
    dashboardData.realTimeMetrics = report.latest;
    dashboardData.historicalData = metricsCollector.historicalData.slice(-100); // Keep last 100 points
    
    expect(report.dataPoints).toBeGreaterThan(15);
    expect(report.latest).toHaveProperty('system');
    expect(report.latest).toHaveProperty('performance');
  });

  test('Dashboard Visualization Components', async () => {
    console.log('📈 Testing dashboard visualization components...');
    
    const visualizer = new DashboardVisualizer();
    const historicalData = metricsCollector.historicalData;
    
    if (historicalData.length === 0) {
      console.log('⚠️  No historical data available, generating sample data...');
      // Generate sample data for testing
      for (let i = 0; i < 50; i++) {
        historicalData.push({
          timestamp: Date.now() - (50 - i) * 1000,
          system: {
            cpu: { usage: Math.random() * 80 + 10 },
            memory: { utilization: Math.random() * 70 + 20 }
          },
          performance: {
            averageResponseTime: Math.random() * 1000 + 100,
            throughput: Math.random() * 500 + 200,
            errorRate: Math.random() * 10
          },
          custom: {
            aiModelRequests: Math.random() * 50 + 10,
            containerOperations: Math.random() * 20 + 5
          }
        });
      }
    }
    
    // Generate time series charts
    const cpuChart = visualizer.generateTimeSeriesChart(
      historicalData, 
      'system.cpu.usage', 
      'CPU Usage Over Time'
    );
    
    const memoryChart = visualizer.generateTimeSeriesChart(
      historicalData, 
      'system.memory.utilization', 
      'Memory Utilization Over Time'
    );
    
    const responseTimeChart = visualizer.generateTimeSeriesChart(
      historicalData, 
      'performance.averageResponseTime', 
      'Average Response Time'
    );
    
    const throughputChart = visualizer.generateTimeSeriesChart(
      historicalData, 
      'performance.throughput', 
      'Throughput'
    );
    
    // Generate gauge charts
    const latest = historicalData[historicalData.length - 1];
    
    const cpuGauge = visualizer.generateGaugeChart(
      latest.system.cpu.usage,
      100,
      'Current CPU Usage',
      { good: 60, warning: 80, critical: 90 }
    );
    
    const memoryGauge = visualizer.generateGaugeChart(
      latest.system.memory.utilization,
      100,
      'Current Memory Usage',
      { good: 70, warning: 85, critical: 95 }
    );
    
    // Generate bar charts
    const aiMetricsBar = visualizer.generateBarChart([
      { label: 'AI Model Requests', value: latest.custom.aiModelRequests },
      { label: 'Container Operations', value: latest.custom.containerOperations },
      { label: 'API Calls', value: latest.custom.apiCalls },
      { label: 'Background Tasks', value: latest.custom.backgroundTasks }
    ], 'Custom Metrics Summary');
    
    // Create widgets
    visualizer.createWidget('metric', 'Response Time', latest.performance.averageResponseTime, {
      unit: 'ms',
      precision: 1,
      color: latest.performance.averageResponseTime > 500 ? '#e74c3c' : '#27ae60'
    });
    
    visualizer.createWidget('metric', 'Throughput', latest.performance.throughput, {
      unit: 'req/s',
      precision: 0,
      color: '#3498db'
    });
    
    visualizer.createWidget('percentage', 'Error Rate', latest.performance.errorRate, {
      unit: '%',
      precision: 2,
      color: latest.performance.errorRate > 5 ? '#e74c3c' : '#27ae60'
    });
    
    visualizer.createWidget('count', 'Active Connections', latest.performance.activeConnections, {
      precision: 0,
      color: '#9b59b6'
    });
    
    const dashboard = visualizer.generateDashboard();
    
    console.log(`📈 Dashboard Components Generated:
      - Charts: ${dashboard.charts.length}
      - Widgets: ${dashboard.widgets.length}
      - Sections: ${dashboard.layout.sections.length}`);
    
    testMetrics.visualizations.push({
      testType: 'dashboard-components',
      dashboard: dashboard,
      componentsGenerated: dashboard.charts.length + dashboard.widgets.length
    });
    
    dashboardData.dashboardConfig = dashboard;
    
    expect(dashboard.charts.length).toBeGreaterThan(4);
    expect(dashboard.widgets.length).toBeGreaterThan(3);
    expect(dashboard.layout.sections.length).toBe(3);
  });

  test('Performance Alerting System', async () => {
    console.log('🚨 Testing performance alerting system...');
    
    const alertManager = new PerformanceAlertManager();
    
    // Configure alert rules
    alertManager.addRule({
      name: 'High CPU Usage',
      metric: 'system.cpu.usage',
      condition: 'greater_than',
      threshold: 80,
      severity: 'warning',
      duration: 30000 // 30 seconds
    });
    
    alertManager.addRule({
      name: 'Critical Memory Usage',
      metric: 'system.memory.utilization',
      condition: 'greater_than',
      threshold: 90,
      severity: 'critical',
      duration: 10000 // 10 seconds
    });
    
    alertManager.addRule({
      name: 'High Response Time',
      metric: 'performance.averageResponseTime',
      condition: 'greater_than',
      threshold: 2000,
      severity: 'warning',
      duration: 60000 // 1 minute
    });
    
    alertManager.addRule({
      name: 'High Error Rate',
      metric: 'performance.errorRate',
      condition: 'greater_than',
      threshold: 10,
      severity: 'critical',
      duration: 30000 // 30 seconds
    });
    
    // Simulate metrics that should trigger alerts
    const testMetrics = [
      {
        timestamp: Date.now(),
        system: { cpu: { usage: 85 }, memory: { utilization: 75 } },
        performance: { averageResponseTime: 1500, errorRate: 3 }
      },
      {
        timestamp: Date.now() + 5000,
        system: { cpu: { usage: 88 }, memory: { utilization: 92 } },
        performance: { averageResponseTime: 2500, errorRate: 12 }
      },
      {
        timestamp: Date.now() + 10000,
        system: { cpu: { usage: 90 }, memory: { utilization: 95 } },
        performance: { averageResponseTime: 3000, errorRate: 15 }
      }
    ];
    
    // Process metrics through alert manager
    for (const metrics of testMetrics) {
      alertManager.processMetrics(metrics);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const alerts = alertManager.getActiveAlerts();
    const alertHistory = alertManager.getAlertHistory();
    
    console.log(`🚨 Alert System Results:
      - Active Alerts: ${alerts.length}
      - Alert History: ${alertHistory.length}
      - Rules Configured: ${alertManager.rules.length}`);
    
    alerts.forEach(alert => {
      console.log(`   🔔 ${alert.severity.toUpperCase()}: ${alert.ruleName} - ${alert.message}`);
    });
    
    testMetrics.alerts.push(...alerts);
    dashboardData.alertsConfig = {
      rules: alertManager.rules,
      activeAlerts: alerts,
      alertHistory: alertHistory
    };
    
    expect(alerts.length).toBeGreaterThan(0);
    expect(alertManager.rules.length).toBe(4);
  });

  test('Dashboard Performance Under Load', async () => {
    console.log('🔥 Testing dashboard performance under load...');
    
    const loadTestResults = {
      metricsProcessed: 0,
      averageProcessingTime: 0,
      peakMemoryUsage: 0,
      errors: 0
    };
    
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    // Simulate high-frequency metrics updates
    const metricsCount = 1000;
    const processingTimes = [];
    
    for (let i = 0; i < metricsCount; i++) {
      const metricStartTime = performance.now();
      
      try {
        // Simulate processing a metric update
        const metric = {
          timestamp: Date.now(),
          system: {
            cpu: { usage: Math.random() * 100 },
            memory: { utilization: Math.random() * 100 }
          },
          performance: {
            averageResponseTime: Math.random() * 3000,
            throughput: Math.random() * 1000,
            errorRate: Math.random() * 20
          },
          custom: {
            aiModelRequests: Math.random() * 100,
            containerOperations: Math.random() * 50
          }
        };
        
        // Simulate dashboard update processing
        const processedMetric = JSON.parse(JSON.stringify(metric)); // Deep clone
        processedMetric.processed = true;
        processedMetric.processingIndex = i;
        
        // Calculate some aggregations (simulating dashboard calculations)
        const aggregation = {
          avgCpu: processedMetric.system.cpu.usage,
          avgMemory: processedMetric.system.memory.utilization,
          totalRequests: processedMetric.performance.throughput,
          healthScore: (100 - processedMetric.performance.errorRate) / 100
        };
        
        loadTestResults.metricsProcessed++;
        
        const metricEndTime = performance.now();
        const processingTime = metricEndTime - metricStartTime;
        processingTimes.push(processingTime);
        
        // Track peak memory usage
        const currentMemory = process.memoryUsage().heapUsed;
        if (currentMemory > loadTestResults.peakMemoryUsage) {
          loadTestResults.peakMemoryUsage = currentMemory;
        }
        
      } catch (error) {
        loadTestResults.errors++;
        console.log(`❌ Error processing metric ${i}: ${error.message}`);
      }
      
      // Small delay to avoid overwhelming the system
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;
    
    loadTestResults.totalTime = endTime - startTime;
    loadTestResults.averageProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
    loadTestResults.memoryIncrease = endMemory - startMemory;
    loadTestResults.processingRate = (loadTestResults.metricsProcessed / (loadTestResults.totalTime / 1000)).toFixed(2);
    
    console.log(`🔥 Dashboard Load Test Results:
      - Metrics Processed: ${loadTestResults.metricsProcessed}/${metricsCount}
      - Total Time: ${loadTestResults.totalTime.toFixed(2)}ms
      - Average Processing Time: ${loadTestResults.averageProcessingTime.toFixed(3)}ms
      - Processing Rate: ${loadTestResults.processingRate} metrics/sec
      - Memory Increase: ${(loadTestResults.memoryIncrease / 1024 / 1024).toFixed(2)}MB
      - Peak Memory: ${(loadTestResults.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB
      - Errors: ${loadTestResults.errors}`);
    
    testMetrics.dashboardTests.push({
      testType: 'load-testing',
      results: loadTestResults,
      success: loadTestResults.errors < metricsCount * 0.01 // Less than 1% errors
    });
    
    // Assert performance requirements
    expect(loadTestResults.metricsProcessed).toBe(metricsCount);
    expect(loadTestResults.averageProcessingTime).toBeLessThan(10); // Less than 10ms per metric
    expect(loadTestResults.errors).toBeLessThan(metricsCount * 0.01); // Less than 1% errors
  });

  class PerformanceAlertManager {
    constructor() {
      this.rules = [];
      this.activeAlerts = [];
      this.alertHistory = [];
      this.metricHistory = [];
    }

    addRule(rule) {
      this.rules.push({
        ...rule,
        id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        triggered: false,
        firstTriggered: null
      });
    }

    processMetrics(metrics) {
      this.metricHistory.push(metrics);
      
      // Keep only recent history to prevent memory issues
      if (this.metricHistory.length > 1000) {
        this.metricHistory = this.metricHistory.slice(-1000);
      }
      
      this.rules.forEach(rule => {
        this.evaluateRule(rule, metrics);
      });
    }

    evaluateRule(rule, metrics) {
      const value = this.extractMetricValue(metrics, rule.metric);
      if (value === null || value === undefined) return;
      
      let conditionMet = false;
      
      switch (rule.condition) {
        case 'greater_than':
          conditionMet = value > rule.threshold;
          break;
        case 'less_than':
          conditionMet = value < rule.threshold;
          break;
        case 'equals':
          conditionMet = value === rule.threshold;
          break;
        case 'not_equals':
          conditionMet = value !== rule.threshold;
          break;
      }
      
      if (conditionMet) {
        if (!rule.triggered) {
          rule.triggered = true;
          rule.firstTriggered = Date.now();
        }
        
        // Check if duration threshold is met
        const timeTriggered = Date.now() - rule.firstTriggered;
        if (timeTriggered >= rule.duration) {
          this.triggerAlert(rule, value, metrics);
        }
      } else {
        if (rule.triggered) {
          this.resolveAlert(rule);
          rule.triggered = false;
          rule.firstTriggered = null;
        }
      }
    }

    triggerAlert(rule, value, metrics) {
      // Check if alert already exists
      const existingAlert = this.activeAlerts.find(a => a.ruleId === rule.id);
      if (existingAlert) {
        // Update existing alert
        existingAlert.lastTriggered = Date.now();
        existingAlert.currentValue = value;
        existingAlert.triggerCount++;
        return;
      }
      
      const alert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        metric: rule.metric,
        condition: rule.condition,
        threshold: rule.threshold,
        currentValue: value,
        message: this.generateAlertMessage(rule, value),
        firstTriggered: rule.firstTriggered,
        lastTriggered: Date.now(),
        triggerCount: 1,
        status: 'active'
      };
      
      this.activeAlerts.push(alert);
      this.alertHistory.push({ ...alert, action: 'triggered' });
      
      console.log(`🚨 ALERT TRIGGERED: ${alert.message}`);
    }

    resolveAlert(rule) {
      const alertIndex = this.activeAlerts.findIndex(a => a.ruleId === rule.id);
      if (alertIndex >= 0) {
        const alert = this.activeAlerts[alertIndex];
        alert.status = 'resolved';
        alert.resolvedAt = Date.now();
        
        this.alertHistory.push({ ...alert, action: 'resolved' });
        this.activeAlerts.splice(alertIndex, 1);
        
        console.log(`✅ ALERT RESOLVED: ${alert.ruleName}`);
      }
    }

    generateAlertMessage(rule, value) {
      const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
      return `${rule.name}: ${rule.metric} is ${formattedValue} (threshold: ${rule.threshold})`;
    }

    extractMetricValue(metrics, metricPath) {
      const parts = metricPath.split('.');
      let value = metrics;
      
      for (const part of parts) {
        if (value && typeof value === 'object') {
          value = value[part];
        } else {
          return null;
        }
      }
      
      return value;
    }

    getActiveAlerts() {
      return [...this.activeAlerts];
    }

    getAlertHistory() {
      return [...this.alertHistory];
    }
  }

  function generateProductionDashboard() {
    const dashboardHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>AutoDev-AI Performance Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
            background: #f8fafc; 
            color: #334155;
            line-height: 1.6;
        }
        
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 2rem; 
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .header h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 0.5rem; }
        .header p { font-size: 1.1rem; opacity: 0.9; }
        
        .dashboard-container { 
            max-width: 1400px; 
            margin: 2rem auto; 
            padding: 0 1rem;
            display: grid;
            gap: 2rem;
        }
        
        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
            gap: 1.5rem; 
            margin-bottom: 2rem;
        }
        
        .metric-card { 
            background: white; 
            border-radius: 12px; 
            padding: 1.5rem; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            border: 1px solid #e2e8f0;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .metric-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
        
        .metric-title { 
            font-size: 0.875rem; 
            font-weight: 600; 
            color: #64748b; 
            text-transform: uppercase; 
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }
        
        .metric-value { 
            font-size: 2.25rem; 
            font-weight: 700; 
            color: #1e293b; 
            margin-bottom: 0.25rem;
        }
        
        .metric-unit { 
            font-size: 1rem; 
            color: #64748b; 
            font-weight: 500;
        }
        
        .metric-change {
            font-size: 0.875rem;
            font-weight: 500;
            padding: 0.25rem 0.5rem;
            border-radius: 6px;
            display: inline-block;
            margin-top: 0.5rem;
        }
        
        .change-positive { background: #ecfdf5; color: #16a34a; }
        .change-negative { background: #fef2f2; color: #dc2626; }
        .change-neutral { background: #f1f5f9; color: #64748b; }
        
        .charts-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }
        
        .chart-container {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            border: 1px solid #e2e8f0;
        }
        
        .chart-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .chart-placeholder {
            height: 300px;
            background: linear-gradient(45deg, #f8fafc 25%, transparent 25%),
                        linear-gradient(-45deg, #f8fafc 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #f8fafc 75%),
                        linear-gradient(-45deg, transparent 75%, #f8fafc 75%);
            background-size: 20px 20px;
            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #64748b;
            font-weight: 500;
        }
        
        .alerts-section {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            border: 1px solid #e2e8f0;
            margin-bottom: 2rem;
        }
        
        .alerts-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .alert-item {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 0.75rem;
            border-left: 4px solid;
        }
        
        .alert-critical { 
            background: #fef2f2; 
            border-color: #dc2626; 
            color: #7f1d1d;
        }
        
        .alert-warning { 
            background: #fffbeb; 
            border-color: #d97706; 
            color: #92400e;
        }
        
        .alert-info { 
            background: #eff6ff; 
            border-color: #2563eb; 
            color: #1d4ed8;
        }
        
        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 0.5rem;
        }
        
        .status-healthy { background: #10b981; }
        .status-warning { background: #f59e0b; }
        .status-critical { background: #ef4444; }
        
        .timestamp {
            color: #64748b;
            font-size: 0.875rem;
            margin-top: 1rem;
            text-align: center;
        }
        
        @media (max-width: 768px) {
            .header { padding: 1rem; }
            .header h1 { font-size: 2rem; }
            .dashboard-container { margin: 1rem; padding: 0; }
            .metrics-grid { grid-template-columns: 1fr; }
            .charts-section { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 AutoDev-AI Performance Dashboard</h1>
        <p>Real-time performance monitoring and analytics</p>
    </div>
    
    <div class="dashboard-container">
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-title">CPU Usage</div>
                <div class="metric-value">${dashboardData.realTimeMetrics?.system?.cpu?.usage?.toFixed(1) || '0'}</div>
                <div class="metric-unit">%</div>
                <div class="metric-change change-neutral">
                    <span class="status-indicator status-healthy"></span>Normal
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Memory Usage</div>
                <div class="metric-value">${dashboardData.realTimeMetrics?.system?.memory?.utilization?.toFixed(1) || '0'}</div>
                <div class="metric-unit">%</div>
                <div class="metric-change change-positive">
                    <span class="status-indicator status-warning"></span>Moderate
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Response Time</div>
                <div class="metric-value">${dashboardData.realTimeMetrics?.performance?.averageResponseTime?.toFixed(0) || '0'}</div>
                <div class="metric-unit">ms</div>
                <div class="metric-change change-positive">
                    <span class="status-indicator status-healthy"></span>Good
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Throughput</div>
                <div class="metric-value">${dashboardData.realTimeMetrics?.performance?.throughput?.toFixed(0) || '0'}</div>
                <div class="metric-unit">req/s</div>
                <div class="metric-change change-positive">
                    <span class="status-indicator status-healthy"></span>+12%
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Error Rate</div>
                <div class="metric-value">${dashboardData.realTimeMetrics?.performance?.errorRate?.toFixed(2) || '0'}</div>
                <div class="metric-unit">%</div>
                <div class="metric-change change-positive">
                    <span class="status-indicator status-healthy"></span>Low
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">AI Model Requests</div>
                <div class="metric-value">${dashboardData.realTimeMetrics?.custom?.aiModelRequests?.toFixed(0) || '0'}</div>
                <div class="metric-unit">/min</div>
                <div class="metric-change change-positive">
                    <span class="status-indicator status-healthy"></span>+5%
                </div>
            </div>
        </div>
        
        <div class="charts-section">
            <div class="chart-container">
                <div class="chart-title">
                    CPU Usage Over Time
                    <span style="font-size: 0.875rem; color: #64748b;">Last 24 hours</span>
                </div>
                <div class="chart-placeholder">📊 Time Series Chart - CPU Usage</div>
            </div>
            
            <div class="chart-container">
                <div class="chart-title">
                    Memory Utilization
                    <span style="font-size: 0.875rem; color: #64748b;">Real-time</span>
                </div>
                <div class="chart-placeholder">📈 Line Chart - Memory Usage</div>
            </div>
            
            <div class="chart-container">
                <div class="chart-title">
                    Response Time Distribution
                    <span style="font-size: 0.875rem; color: #64748b;">P95, P99</span>
                </div>
                <div class="chart-placeholder">📊 Histogram - Response Times</div>
            </div>
            
            <div class="chart-container">
                <div class="chart-title">
                    Custom Metrics
                    <span style="font-size: 0.875rem; color: #64748b;">Summary</span>
                </div>
                <div class="chart-placeholder">📊 Bar Chart - AI & Container Metrics</div>
            </div>
        </div>
        
        ${dashboardData.alertsConfig?.activeAlerts?.length > 0 ? `
            <div class="alerts-section">
                <div class="alerts-title">
                    🚨 Active Alerts
                    <span style="font-size: 0.875rem; font-weight: 500; color: #64748b;">
                        (${dashboardData.alertsConfig.activeAlerts.length} active)
                    </span>
                </div>
                ${dashboardData.alertsConfig.activeAlerts.map(alert => `
                    <div class="alert-item alert-${alert.severity}">
                        <strong>${alert.ruleName}</strong><br>
                        ${alert.message}<br>
                        <small>Triggered: ${new Date(alert.firstTriggered).toLocaleString()}</small>
                    </div>
                `).join('')}
            </div>
        ` : `
            <div class="alerts-section">
                <div class="alerts-title">
                    ✅ System Status
                </div>
                <div class="alert-item alert-info">
                    All systems operating normally. No active alerts.
                </div>
            </div>
        `}
        
        <div class="timestamp">
            Dashboard generated: ${new Date().toLocaleString()}<br>
            Data collection: ${testMetrics.metricsData.length} measurements | 
            Test duration: ${((Date.now() - testMetrics.startTime) / 1000 / 60).toFixed(1)} minutes
        </div>
    </div>
    
    <script>
        // Auto-refresh dashboard every 30 seconds
        setTimeout(() => {
            window.location.reload();
        }, 30000);
        
        // Add click handlers for metric cards
        document.querySelectorAll('.metric-card').forEach(card => {
            card.addEventListener('click', function() {
                this.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 200);
            });
        });
    </script>
</body>
</html>`;
    
    const dashboardPath = path.join(__dirname, '../reports', 'performance-dashboard.html');
    fs.writeFileSync(dashboardPath, dashboardHTML);
    
    console.log(`📊 Production dashboard generated: ${dashboardPath}`);
    
    // Also save dashboard data as JSON for API consumption
    const apiDataPath = path.join(__dirname, '../reports', 'dashboard-api-data.json');
    fs.writeFileSync(apiDataPath, JSON.stringify(dashboardData, null, 2));
    
    console.log(`📄 Dashboard API data saved: ${apiDataPath}`);
  }
});