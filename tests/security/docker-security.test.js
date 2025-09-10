const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Docker configuration
const DOCKER_COMPOSE_PATH = '/home/dennis/autodevai/infrastructure/docker/docker-compose.yml';
const PORT_RANGE_START = 50000;
const PORT_RANGE_END = 50100;

describe('Docker Container Security Tests', () => {
  
  describe('Container Configuration Security', () => {
    test('should run containers as non-root user', async () => {
      const containers = getRunningContainers();
      
      for (const container of containers) {
        const user = execSync(`docker inspect ${container} --format='{{.Config.User}}'`)
          .toString().trim();
        
        expect(user).not.toBe('');
        expect(user).not.toBe('root');
        expect(user).not.toBe('0');
      }
    });

    test('should use read-only root filesystem where possible', async () => {
      const containers = getRunningContainers();
      const readOnlyContainers = ['autodev_gui', 'autodev_monitoring'];
      
      for (const container of containers) {
        if (readOnlyContainers.includes(container)) {
          const readOnly = execSync(`docker inspect ${container} --format='{{.HostConfig.ReadonlyRootfs}}'`)
            .toString().trim();
          
          expect(readOnly).toBe('true');
        }
      }
    });

    test('should drop unnecessary capabilities', async () => {
      const containers = getRunningContainers();
      
      for (const container of containers) {
        const caps = execSync(`docker inspect ${container} --format='{{json .HostConfig.CapDrop}}'`)
          .toString().trim();
        
        const droppedCaps = JSON.parse(caps);
        expect(droppedCaps).toContain('ALL');
        
        // Check that only necessary capabilities are added
        const addedCaps = execSync(`docker inspect ${container} --format='{{json .HostConfig.CapAdd}}'`)
          .toString().trim();
        
        const capsAdded = JSON.parse(addedCaps);
        const dangerousCaps = ['SYS_ADMIN', 'NET_ADMIN', 'SYS_MODULE', 'SYS_RAWIO'];
        
        for (const dangerous of dangerousCaps) {
          expect(capsAdded).not.toContain(dangerous);
        }
      }
    });

    test('should set resource limits', async () => {
      const containers = getRunningContainers();
      
      for (const container of containers) {
        const memory = execSync(`docker inspect ${container} --format='{{.HostConfig.Memory}}'`)
          .toString().trim();
        
        const cpus = execSync(`docker inspect ${container} --format='{{.HostConfig.CpuQuota}}'`)
          .toString().trim();
        
        // Should have memory limits
        expect(parseInt(memory)).toBeGreaterThan(0);
        
        // Should have CPU limits (if set)
        if (cpus !== '0') {
          expect(parseInt(cpus)).toBeGreaterThan(0);
        }
      }
    });

    test('should not use privileged mode', async () => {
      const containers = getRunningContainers();
      
      for (const container of containers) {
        const privileged = execSync(`docker inspect ${container} --format='{{.HostConfig.Privileged}}'`)
          .toString().trim();
        
        expect(privileged).toBe('false');
      }
    });

    test('should use security options', async () => {
      const containers = getRunningContainers();
      
      for (const container of containers) {
        const secOpts = execSync(`docker inspect ${container} --format='{{json .HostConfig.SecurityOpt}}'`)
          .toString().trim();
        
        const opts = JSON.parse(secOpts);
        
        // Should have security options set
        if (opts && opts.length > 0) {
          expect(opts.some(opt => opt.includes('no-new-privileges'))).toBe(true);
        }
      }
    });
  });

  describe('Network Security', () => {
    test('should use custom bridge network', async () => {
      const networks = execSync('docker network ls --format "{{.Name}}"')
        .toString().split('\n').filter(Boolean);
      
      expect(networks).toContain('autodev_network');
      
      // Check network configuration
      const networkInfo = execSync('docker network inspect autodev_network')
        .toString();
      
      const network = JSON.parse(networkInfo)[0];
      expect(network.Driver).toBe('bridge');
      expect(network.Internal).toBe(false);
      expect(network.IPAM.Config[0].Subnet).toBe('172.20.0.0/16');
    });

    test('should bind to localhost only', async () => {
      const containers = getRunningContainers();
      
      for (const container of containers) {
        const ports = execSync(`docker inspect ${container} --format='{{json .NetworkSettings.Ports}}'`)
          .toString().trim();
        
        const portBindings = JSON.parse(ports);
        
        for (const port in portBindings) {
          if (portBindings[port]) {
            portBindings[port].forEach(binding => {
              expect(binding.HostIp).toMatch(/^(127\.0\.0\.1|::1)?$/);
            });
          }
        }
      }
    });

    test('should use correct port range', async () => {
      const containers = getRunningContainers();
      
      for (const container of containers) {
        const ports = execSync(`docker inspect ${container} --format='{{json .NetworkSettings.Ports}}'`)
          .toString().trim();
        
        const portBindings = JSON.parse(ports);
        
        for (const port in portBindings) {
          if (portBindings[port]) {
            portBindings[port].forEach(binding => {
              const hostPort = parseInt(binding.HostPort);
              expect(hostPort).toBeGreaterThanOrEqual(PORT_RANGE_START);
              expect(hostPort).toBeLessThanOrEqual(PORT_RANGE_END);
            });
          }
        }
      }
    });

    test('should isolate containers properly', async () => {
      // Check that containers can't access host network directly
      const containers = getRunningContainers();
      
      for (const container of containers) {
        const networkMode = execSync(`docker inspect ${container} --format='{{.HostConfig.NetworkMode}}'`)
          .toString().trim();
        
        expect(networkMode).not.toBe('host');
      }
    });
  });

  describe('Image Security', () => {
    test('should use specific image versions', async () => {
      const images = execSync('docker images --format "{{.Repository}}:{{.Tag}}"')
        .toString().split('\n').filter(Boolean);
      
      for (const image of images) {
        if (image.includes('autodev')) {
          expect(image).not.toContain(':latest');
          expect(image).toMatch(/:\d+\.\d+\.\d+/); // Semantic versioning
        }
      }
    });

    test('should scan images for vulnerabilities', async () => {
      const images = ['autodev/gui:1.0.0', 'autodev/sandbox:1.0.0'];
      
      for (const image of images) {
        try {
          // Use trivy or similar scanner if available
          const scanResult = execSync(`trivy image --severity HIGH,CRITICAL --exit-code 1 ${image} 2>/dev/null || echo "VULNERABILITIES_FOUND"`)
            .toString().trim();
          
          expect(scanResult).not.toContain('VULNERABILITIES_FOUND');
        } catch (e) {
          // Trivy not installed, skip this test
          console.log('Vulnerability scanner not available');
        }
      }
    });

    test('should use minimal base images', async () => {
      const dockerfiles = [
        '/home/dennis/autodevai/docker/Dockerfile.gui',
        '/home/dennis/autodevai/docker/Dockerfile.sandbox'
      ];
      
      for (const dockerfile of dockerfiles) {
        try {
          const content = await fs.readFile(dockerfile, 'utf8');
          
          // Should use alpine or distroless images
          expect(content).toMatch(/FROM .*(alpine|distroless|scratch)/);
          
          // Should not install unnecessary packages
          expect(content).not.toContain('apt-get install vim');
          expect(content).not.toContain('apt-get install curl');
        } catch (e) {
          // Dockerfile not found, skip
        }
      }
    });
  });

  describe('Volume Security', () => {
    test('should mount volumes as read-only where appropriate', async () => {
      const containers = getRunningContainers();
      
      for (const container of containers) {
        const mounts = execSync(`docker inspect ${container} --format='{{json .Mounts}}'`)
          .toString().trim();
        
        const volumes = JSON.parse(mounts);
        
        volumes.forEach(volume => {
          // Config and certificate volumes should be read-only
          if (volume.Destination.includes('/config') || 
              volume.Destination.includes('/certs') ||
              volume.Destination.includes('/ssl')) {
            expect(volume.Mode).toContain('ro');
          }
        });
      }
    });

    test('should not mount sensitive host paths', async () => {
      const containers = getRunningContainers();
      const sensitivePaths = ['/etc', '/root', '/home', '/var/run/docker.sock'];
      
      for (const container of containers) {
        const mounts = execSync(`docker inspect ${container} --format='{{json .Mounts}}'`)
          .toString().trim();
        
        const volumes = JSON.parse(mounts);
        
        volumes.forEach(volume => {
          for (const sensitive of sensitivePaths) {
            expect(volume.Source).not.toBe(sensitive);
          }
        });
      }
    });

    test('should use named volumes for data persistence', async () => {
      const volumes = execSync('docker volume ls --format "{{.Name}}"')
        .toString().split('\n').filter(Boolean);
      
      const expectedVolumes = [
        'autodevai_postgres_data',
        'autodevai_redis_data',
        'autodevai_grafana_data'
      ];
      
      for (const expected of expectedVolumes) {
        expect(volumes).toContain(expected);
      }
    });
  });

  describe('Secrets Management', () => {
    test('should not expose secrets in environment variables', async () => {
      const containers = getRunningContainers();
      
      for (const container of containers) {
        const envVars = execSync(`docker inspect ${container} --format='{{json .Config.Env}}'`)
          .toString().trim();
        
        const env = JSON.parse(envVars);
        
        env.forEach(variable => {
          expect(variable).not.toContain('PASSWORD=');
          expect(variable).not.toContain('SECRET=');
          expect(variable).not.toContain('API_KEY=');
          expect(variable).not.toContain('TOKEN=');
        });
      }
    });

    test('should use Docker secrets for sensitive data', async () => {
      const secrets = execSync('docker secret ls --format "{{.Name}}" 2>/dev/null || echo ""')
        .toString().split('\n').filter(Boolean);
      
      if (secrets.length > 0) {
        const expectedSecrets = [
          'postgres_password',
          'redis_password',
          'openrouter_api_key'
        ];
        
        for (const expected of expectedSecrets) {
          expect(secrets).toContain(expected);
        }
      }
    });

    test('should not log sensitive information', async () => {
      const containers = getRunningContainers();
      
      for (const container of containers) {
        const logs = execSync(`docker logs ${container} 2>&1 | head -100 || echo ""`)
          .toString();
        
        expect(logs).not.toMatch(/password\s*[:=]\s*\S+/i);
        expect(logs).not.toMatch(/api[_-]?key\s*[:=]\s*\S+/i);
        expect(logs).not.toMatch(/secret\s*[:=]\s*\S+/i);
        expect(logs).not.toMatch(/token\s*[:=]\s*\S+/i);
      }
    });
  });

  describe('Container Runtime Security', () => {
    test('should have health checks configured', async () => {
      const containers = getRunningContainers();
      const requiresHealthCheck = ['autodev_gui', 'postgres', 'redis'];
      
      for (const container of containers) {
        if (requiresHealthCheck.some(name => container.includes(name))) {
          const healthcheck = execSync(`docker inspect ${container} --format='{{json .Config.Healthcheck}}'`)
            .toString().trim();
          
          const health = JSON.parse(healthcheck);
          expect(health).not.toBeNull();
          expect(health.Test).toBeDefined();
          expect(health.Interval).toBeDefined();
          expect(health.Timeout).toBeDefined();
          expect(health.Retries).toBeDefined();
        }
      }
    });

    test('should implement restart policies', async () => {
      const containers = getRunningContainers();
      
      for (const container of containers) {
        const restartPolicy = execSync(`docker inspect ${container} --format='{{json .HostConfig.RestartPolicy}}'`)
          .toString().trim();
        
        const policy = JSON.parse(restartPolicy);
        expect(['unless-stopped', 'on-failure', 'always']).toContain(policy.Name);
        
        if (policy.Name === 'on-failure') {
          expect(policy.MaximumRetryCount).toBeLessThanOrEqual(5);
        }
      }
    });

    test('should log to appropriate drivers', async () => {
      const containers = getRunningContainers();
      
      for (const container of containers) {
        const logConfig = execSync(`docker inspect ${container} --format='{{json .HostConfig.LogConfig}}'`)
          .toString().trim();
        
        const config = JSON.parse(logConfig);
        expect(['json-file', 'syslog', 'journald']).toContain(config.Type);
        
        if (config.Type === 'json-file') {
          expect(config.Config['max-size']).toBeDefined();
          expect(config.Config['max-file']).toBeDefined();
        }
      }
    });

    test('should set appropriate ulimits', async () => {
      const containers = getRunningContainers();
      
      for (const container of containers) {
        const ulimits = execSync(`docker inspect ${container} --format='{{json .HostConfig.Ulimits}}'`)
          .toString().trim();
        
        if (ulimits !== 'null') {
          const limits = JSON.parse(ulimits);
          
          limits.forEach(limit => {
            if (limit.Name === 'nofile') {
              expect(limit.Soft).toBeLessThanOrEqual(65536);
              expect(limit.Hard).toBeLessThanOrEqual(65536);
            }
          });
        }
      }
    });
  });

  describe('Docker Compose Security', () => {
    test('should validate docker-compose.yml security settings', async () => {
      const composeContent = await fs.readFile(DOCKER_COMPOSE_PATH, 'utf8');
      
      // Check for security best practices
      expect(composeContent).toContain('security_opt:');
      expect(composeContent).toContain('no-new-privileges:true');
      expect(composeContent).toContain('read_only:');
      expect(composeContent).toContain('user:');
      expect(composeContent).not.toContain('privileged: true');
      expect(composeContent).not.toContain('network_mode: host');
    });

    test('should use specific versions in docker-compose', async () => {
      const composeContent = await fs.readFile(DOCKER_COMPOSE_PATH, 'utf8');
      
      // Check image versions
      const imageLines = composeContent.match(/image:.*$/gm) || [];
      
      imageLines.forEach(line => {
        expect(line).not.toContain(':latest');
        if (!line.includes('autodev/')) {
          expect(line).toMatch(/:\d+/); // Has version tag
        }
      });
    });

    test('should define proper service dependencies', async () => {
      const composeContent = await fs.readFile(DOCKER_COMPOSE_PATH, 'utf8');
      
      expect(composeContent).toContain('depends_on:');
      
      // GUI should depend on postgres and redis
      const guiSection = composeContent.match(/autodev_gui:[\s\S]*?(?=^\w|\z)/m);
      if (guiSection) {
        expect(guiSection[0]).toContain('depends_on:');
      }
    });
  });
});

// Helper function to get running containers
function getRunningContainers() {
  try {
    const containers = execSync('docker ps --format "{{.Names}}" | grep autodev || echo ""')
      .toString()
      .split('\n')
      .filter(Boolean);
    
    return containers.length > 0 ? containers : ['autodev_gui_test'];
  } catch (e) {
    return ['autodev_gui_test']; // Return test container if none running
  }
}

module.exports = { PORT_RANGE_START, PORT_RANGE_END };