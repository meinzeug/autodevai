const axios = require('axios');
const net = require('net');

describe('Service Port Range Load Testing (50000-50100)', () => {
  const PORT_START = 50000;
  const PORT_END = 50100;
  let testMetrics;
  let activeServices;

  beforeAll(async () => {
    testMetrics = {
      startTime: Date.now(),
      portTests: {},
      connectionTests: [],
      throughputTests: [],
      errors: []
    };
    
    activeServices = await discoverActiveServices();
    console.log(`🔍 Discovered ${activeServices.length} active services in port range ${PORT_START}-${PORT_END}`);
  });

  afterAll(() => {
    const summary = {
      testDuration: Date.now() - testMetrics.startTime,
      activeServices: activeServices.length,
      totalPortTests: Object.keys(testMetrics.portTests).length,
      connectionTests: testMetrics.connectionTests.length,
      throughputTests: testMetrics.throughputTests.length,
      errorCount: testMetrics.errors.length
    };
    
    console.log('🚀 Service Port Load Test Summary:', summary);
    global.performanceUtils.saveMetrics('service-port-load-test', summary);
  });

  const discoverActiveServices = async () => {
    const services = [];
    const checkPort = (port) => {
      return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 1000; // 1 second timeout
        
        socket.setTimeout(timeout);
        socket.on('connect', () => {
          socket.destroy();
          resolve({ port, status: 'open' });
        });
        
        socket.on('timeout', () => {
          socket.destroy();
          resolve({ port, status: 'timeout' });
        });
        
        socket.on('error', () => {
          resolve({ port, status: 'closed' });
        });
        
        socket.connect(port, 'localhost');
      });
    };

    console.log(`🔍 Scanning ports ${PORT_START} to ${PORT_END}...`);
    const portChecks = [];
    
    for (let port = PORT_START; port <= PORT_END; port++) {
      portChecks.push(checkPort(port));
    }
    
    const results = await Promise.all(portChecks);
    const openPorts = results.filter(result => result.status === 'open');
    
    // Try to identify service types for open ports
    for (const portInfo of openPorts) {
      try {
        const serviceType = await identifyServiceType(portInfo.port);
        services.push({ ...portInfo, serviceType });
      } catch (error) {
        services.push({ ...portInfo, serviceType: 'unknown' });
      }
    }
    
    return services;
  };

  const identifyServiceType = async (port) => {
    const endpoints = [
      { path: '/health', type: 'health-check' },
      { path: '/api/health', type: 'api-service' },
      { path: '/status', type: 'status-service' },
      { path: '/ping', type: 'ping-service' },
      { path: '/metrics', type: 'metrics-service' },
      { path: '/', type: 'web-service' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`http://localhost:${port}${endpoint.path}`, {
          timeout: 2000,
          validateStatus: () => true // Accept any status code
        });
        
        if (response.status < 500) {
          return endpoint.type;
        }
      } catch (error) {
        // Continue to next endpoint
      }
    }
    
    return 'tcp-service';
  };

  test('Concurrent connections to active services', async () => {
    if (activeServices.length === 0) {
      console.log('⚠️  No active services found, skipping concurrent connection test');
      return;
    }

    const concurrentConnections = 20;
    console.log(`🔗 Testing ${concurrentConnections} concurrent connections to each of ${activeServices.length} services...`);

    for (const service of activeServices) {
      const connectionPromises = Array(concurrentConnections)
        .fill(null)
        .map(async (_, index) => {
          const startTime = performance.now();
          
          try {
            const socket = new net.Socket();
            
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                socket.destroy();
                reject(new Error('Connection timeout'));
              }, 5000);
              
              socket.on('connect', () => {
                clearTimeout(timeout);
                socket.destroy();
                resolve();
              });
              
              socket.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
              });
              
              socket.connect(service.port, 'localhost');
            });
            
            const duration = performance.now() - startTime;
            testMetrics.connectionTests.push({
              port: service.port,
              index,
              duration,
              status: 'success'
            });
            
            return { success: true, duration };
          } catch (error) {
            const duration = performance.now() - startTime;
            testMetrics.connectionTests.push({
              port: service.port,
              index,
              duration,
              status: 'error',
              error: error.message
            });
            
            testMetrics.errors.push({
              type: 'connection',
              port: service.port,
              error: error.message
            });
            
            return { success: false, error: error.message, duration };
          }
        });

      const results = await Promise.all(connectionPromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log(`📊 Port ${service.port} (${service.serviceType}): ${successful.length}/${concurrentConnections} connections successful`);
      
      if (successful.length > 0) {
        const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
        console.log(`   Average connection time: ${avgDuration.toFixed(2)}ms`);
      }
      
      testMetrics.portTests[service.port] = {
        serviceType: service.serviceType,
        successfulConnections: successful.length,
        failedConnections: failed.length,
        successRate: (successful.length / concurrentConnections) * 100
      };
    }

    // Assert that most services can handle concurrent connections
    const portsWithGoodPerformance = Object.values(testMetrics.portTests)
      .filter(test => test.successRate >= 80);
    
    expect(portsWithGoodPerformance.length).toBeGreaterThan(activeServices.length * 0.5);
  });

  test('HTTP service throughput testing', async () => {
    const httpServices = activeServices.filter(service => 
      ['health-check', 'api-service', 'web-service', 'status-service'].includes(service.serviceType)
    );

    if (httpServices.length === 0) {
      console.log('⚠️  No HTTP services found, skipping throughput test');
      return;
    }

    console.log(`🚀 Testing throughput for ${httpServices.length} HTTP services...`);

    for (const service of httpServices) {
      const requestsPerSecond = 50;
      const testDuration = 10000; // 10 seconds
      const interval = 1000 / requestsPerSecond; // ms between requests
      
      console.log(`📈 Testing port ${service.port} at ${requestsPerSecond} RPS for ${testDuration/1000} seconds...`);
      
      const startTime = Date.now();
      const requests = [];
      let requestIndex = 0;
      
      while (Date.now() - startTime < testDuration) {
        const requestStartTime = performance.now();
        
        try {
          const response = await axios.get(`http://localhost:${service.port}/`, {
            timeout: 5000,
            validateStatus: () => true
          });
          
          const duration = performance.now() - requestStartTime;
          requests.push({
            index: requestIndex++,
            port: service.port,
            status: response.status,
            duration,
            success: response.status < 500
          });
          
        } catch (error) {
          const duration = performance.now() - requestStartTime;
          requests.push({
            index: requestIndex++,
            port: service.port,
            status: 'error',
            duration,
            success: false,
            error: error.message
          });
          
          testMetrics.errors.push({
            type: 'throughput',
            port: service.port,
            error: error.message
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, interval));
      }
      
      const successful = requests.filter(r => r.success);
      const failed = requests.filter(r => !r.success);
      const avgResponseTime = successful.length > 0 
        ? successful.reduce((sum, r) => sum + r.duration, 0) / successful.length
        : 0;
      
      const actualRPS = (successful.length / (testDuration / 1000)).toFixed(2);
      
      console.log(`   📊 Results: ${successful.length}/${requests.length} successful (${actualRPS} RPS)`);
      console.log(`   ⏱️  Average response time: ${avgResponseTime.toFixed(2)}ms`);
      
      testMetrics.throughputTests.push({
        port: service.port,
        serviceType: service.serviceType,
        targetRPS: requestsPerSecond,
        actualRPS: parseFloat(actualRPS),
        totalRequests: requests.length,
        successfulRequests: successful.length,
        failedRequests: failed.length,
        averageResponseTime: avgResponseTime,
        successRate: (successful.length / requests.length) * 100
      });
    }
    
    // Assert that services can handle reasonable load
    const goodPerformingServices = testMetrics.throughputTests
      .filter(test => test.successRate >= 90 && test.averageResponseTime < 1000);
    
    expect(goodPerformingServices.length).toBeGreaterThan(0);
  });

  test('Port scanning and availability monitoring', async () => {
    console.log('🔍 Performing comprehensive port availability monitoring...');
    
    const scanResults = [];
    const batchSize = 10; // Scan ports in batches to avoid overwhelming the system
    
    for (let i = PORT_START; i <= PORT_END; i += batchSize) {
      const batch = [];
      const endPort = Math.min(i + batchSize - 1, PORT_END);
      
      for (let port = i; port <= endPort; port++) {
        batch.push(scanPort(port));
      }
      
      const batchResults = await Promise.all(batch);
      scanResults.push(...batchResults);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const openPorts = scanResults.filter(result => result.isOpen);
    const responsivePorts = scanResults.filter(result => result.isResponsive);
    
    console.log(`📊 Port Scan Results:
      - Total ports scanned: ${scanResults.length}
      - Open ports: ${openPorts.length}
      - Responsive ports: ${responsivePorts.length}
      - Port range: ${PORT_START}-${PORT_END}`);
    
    // Store detailed results
    testMetrics.portScan = {
      totalScanned: scanResults.length,
      openPorts: openPorts.length,
      responsivePorts: responsivePorts.length,
      openPortsList: openPorts.map(p => p.port),
      responsivePortsList: responsivePorts.map(p => p.port)
    };
    
    expect(scanResults.length).toBe(PORT_END - PORT_START + 1);
  });

  const scanPort = async (port) => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const startTime = performance.now();
      let isOpen = false;
      let isResponsive = false;
      
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({
          port,
          isOpen: false,
          isResponsive: false,
          responseTime: performance.now() - startTime,
          error: 'timeout'
        });
      }, 2000);
      
      socket.on('connect', async () => {
        isOpen = true;
        
        // Test if port is responsive by trying an HTTP request
        try {
          await axios.get(`http://localhost:${port}/`, {
            timeout: 1000,
            validateStatus: () => true
          });
          isResponsive = true;
        } catch (error) {
          // Port is open but not HTTP responsive
        }
        
        clearTimeout(timeout);
        socket.destroy();
        resolve({
          port,
          isOpen,
          isResponsive,
          responseTime: performance.now() - startTime
        });
      });
      
      socket.on('error', () => {
        clearTimeout(timeout);
        resolve({
          port,
          isOpen: false,
          isResponsive: false,
          responseTime: performance.now() - startTime,
          error: 'connection_refused'
        });
      });
      
      socket.connect(port, 'localhost');
    });
  };
});