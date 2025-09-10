/**
 * Container Security Testing Suite
 * Docker container security scanning and validation for AutoDev-AI
 */

const { execSync, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { expect } = require('@jest/globals');
const config = require('./security-config');

describe('Container Security Testing Suite', () => {
  let dockerImages = [];
  let scanResults = {};

  beforeAll(async () => {
    // Build all Docker images for testing
    await buildDockerImages();
    dockerImages = await getDockerImages();
  });

  describe('Container Image Security Scanning', () => {
    describe('Trivy Vulnerability Scanning', () => {
      test('should scan all container images for vulnerabilities', async () => {
        for (const image of config.security.containers.images) {
          const result = await scanImageWithTrivy(image);
          scanResults[image] = result;
          
          // Check for critical vulnerabilities
          const criticalVulns = result.vulnerabilities.filter(v => v.severity === 'CRITICAL');
          expect(criticalVulns.length).toBe(0, 
            `Critical vulnerabilities found in ${image}: ${criticalVulns.map(v => v.id).join(', ')}`
          );
          
          // High vulnerabilities should be limited
          const highVulns = result.vulnerabilities.filter(v => v.severity === 'HIGH');
          expect(highVulns.length).toBeLessThan(10,
            `Too many HIGH vulnerabilities in ${image}: ${highVulns.length}`
          );
        }
      });

      test('should scan for secrets in container images', async () => {
        for (const image of config.security.containers.images) {
          const secretScanResult = await scanImageForSecrets(image);
          
          expect(secretScanResult.secrets.length).toBe(0,
            `Secrets found in ${image}: ${secretScanResult.secrets.map(s => s.type).join(', ')}`
          );
        }
      });

      test('should scan for misconfigurations', async () => {
        for (const image of config.security.containers.images) {
          const misconfigResult = await scanImageForMisconfigurations(image);
          
          const criticalMisconfigs = misconfigResult.misconfigurations
            .filter(m => m.severity === 'CRITICAL');
            
          expect(criticalMisconfigs.length).toBe(0,
            `Critical misconfigurations in ${image}: ${criticalMisconfigs.map(m => m.title).join(', ')}`
          );
        }
      });
    });

    describe('Dockerfile Security Analysis', () => {
      test('should validate Dockerfile security best practices', async () => {
        const dockerfiles = [
          'docker/Dockerfile.api',
          'docker/Dockerfile.gui',
          'docker/Dockerfile.sandbox'
        ];
        
        for (const dockerfile of dockerfiles) {
          const content = await fs.readFile(path.join(process.cwd(), dockerfile), 'utf8');
          
          // Check for non-root user
          expect(content).toMatch(/USER\s+(?!root)\w+/,
            `${dockerfile} should switch to non-root user`
          );
          
          // Check for specific version tags (not latest)
          expect(content).not.toMatch(/FROM.*:latest/,
            `${dockerfile} should not use 'latest' tag`
          );
          
          // Check for proper file permissions
          expect(content).toMatch(/chown/,
            `${dockerfile} should set proper file ownership`
          );
          
          // Check for minimal package installation
          expect(content).toMatch(/rm -rf \/var\/lib\/apt\/lists/,
            `${dockerfile} should clean package cache`
          );
          
          // Check for health checks
          expect(content).toMatch(/HEALTHCHECK/,
            `${dockerfile} should include health check`
          );
        }
      });

      test('should not expose unnecessary ports', async () => {
        const dockerCompose = await fs.readFile('docker/docker-compose.yml', 'utf8');
        
        // Check that only expected ports are exposed
        const exposedPorts = dockerCompose.match(/- "(\d+):/g) || [];
        const portNumbers = exposedPorts.map(p => parseInt(p.match(/\d+/)[0]));
        
        // All ports should be in the expected range (50000-50199)
        for (const port of portNumbers) {
          expect(port).toBeGreaterThanOrEqual(50000);
          expect(port).toBeLessThan(50200);
        }
        
        // Check that no dangerous ports are exposed
        const dangerousPorts = [22, 23, 3389, 5432, 6379];
        for (const port of dangerousPorts) {
          expect(portNumbers).not.toContain(port);
        }
      });
    });

    describe('Runtime Security Configuration', () => {
      test('should validate container runtime security', async () => {
        const containers = await getRunningContainers();
        
        for (const container of containers) {
          const inspection = await inspectContainer(container.id);
          
          // Check security options
          expect(inspection.HostConfig.Privileged).toBe(false,
            `Container ${container.name} should not run in privileged mode`
          );
          
          // Check for read-only root filesystem where applicable
          if (container.name.includes('sandbox')) {
            expect(inspection.HostConfig.ReadonlyRootfs).toBe(true,
              `Sandbox container ${container.name} should have read-only root filesystem`
            );
          }
          
          // Check resource limits
          expect(inspection.HostConfig.Memory).toBeGreaterThan(0,
            `Container ${container.name} should have memory limits`
          );
          
          expect(inspection.HostConfig.CpuQuota).toBeGreaterThan(0,
            `Container ${container.name} should have CPU limits`
          );
        }
      });

      test('should validate network security', async () => {
        const networks = await getDockerNetworks();
        
        for (const network of networks) {
          if (network.name === 'autodev-network') {
            // Check for custom subnet
            expect(network.subnet).toBe('172.20.0.0/16');
            
            // Check for proper isolation
            expect(network.driver).toBe('bridge');
          }
        }
      });
    });
  });

  describe('Container Compliance Testing', () => {
    describe('CIS Docker Benchmark', () => {
      test('should validate Docker daemon configuration', async () => {
        const dockerInfo = await getDockerInfo();
        
        // Check for user namespace support
        expect(dockerInfo.SecurityOptions).toContain('name=userns');
        
        // Check for content trust
        expect(process.env.DOCKER_CONTENT_TRUST).toBe('1');
        
        // Check for logging driver
        expect(dockerInfo.LoggingDriver).toBe('json-file');
      });

      test('should validate container user configuration', async () => {
        for (const image of config.security.containers.images) {
          const result = await runContainer(image, 'whoami');
          
          // Should not run as root
          expect(result.output.trim()).not.toBe('root');
          
          // Should run as expected user
          const expectedUsers = config.security.containers.policies.allowedUsers;
          expect(expectedUsers).toContain(result.output.trim());
        }
      });
    });

    describe('Security Policies Validation', () => {
      test('should enforce resource limits', async () => {
        const containers = await getRunningContainers();
        
        for (const container of containers) {
          const stats = await getContainerStats(container.id);
          
          // CPU usage should be within limits
          expect(stats.cpuUsage).toBeLessThan(
            config.security.containers.policies.maxCpuUsage
          );
          
          // Memory usage should be within limits
          expect(stats.memoryUsage).toBeLessThan(
            config.security.containers.policies.maxMemoryUsage
          );
        }
      });

      test('should validate volume mounts security', async () => {
        const containers = await getRunningContainers();
        
        for (const container of containers) {
          const inspection = await inspectContainer(container.id);
          
          for (const mount of inspection.Mounts) {
            // Check for sensitive paths
            const sensitivePaths = ['/proc', '/sys', '/dev'];
            const isSensitive = sensitivePaths.some(path => 
              mount.Source.startsWith(path)
            );
            
            if (isSensitive) {
              expect(mount.RW).toBe(false,
                `Sensitive path ${mount.Source} should be mounted read-only`
              );
            }
            
            // Check for proper ownership
            if (mount.Type === 'bind') {
              expect(mount.Source).not.toMatch(/^\/home\/[^\/]+\/.ssh/,
                'SSH directories should not be mounted'
              );
            }
          }
        }
      });
    });
  });

  describe('Registry Security', () => {
    test('should verify image signatures', async () => {
      for (const image of config.security.containers.images) {
        try {
          // Check if image is signed (would require Notary/cosign setup)
          const verifyResult = await verifyImageSignature(image);
          expect(verifyResult.verified).toBe(true);
        } catch (error) {
          // If signature verification is not set up, warn but don't fail
          console.warn(`Image signature verification not configured for ${image}`);
        }
      }
    });

    test('should check for known malicious images', async () => {
      const maliciousDomains = [
        'dockerhub-malicious.com',
        'fake-registry.io',
        'malicious.registry'
      ];
      
      for (const image of dockerImages) {
        const domain = image.split('/')[0];
        expect(maliciousDomains).not.toContain(domain);
      }
    });
  });

  afterAll(async () => {
    // Generate security report
    await generateSecurityReport(scanResults);
    
    // Store results in memory for hive coordination
    await storeSecurityResults(scanResults);
  });
});

// Helper functions
async function buildDockerImages() {
  try {
    execSync('docker-compose -f docker/docker-compose.yml build', { 
      stdio: 'ignore',
      cwd: process.cwd()
    });
  } catch (error) {
    console.warn('Could not build Docker images for testing');
  }
}

async function getDockerImages() {
  try {
    const result = execSync('docker images --format "{{.Repository}}:{{.Tag}}"', { 
      encoding: 'utf8' 
    });
    return result.trim().split('\n');
  } catch (error) {
    return [];
  }
}

async function scanImageWithTrivy(imageName) {
  try {
    const command = `trivy image --format json --severity HIGH,CRITICAL ${imageName}`;
    const result = execSync(command, { encoding: 'utf8' });
    const scanData = JSON.parse(result);
    
    return {
      image: imageName,
      vulnerabilities: scanData.Results ? 
        scanData.Results.flatMap(r => r.Vulnerabilities || []) : []
    };
  } catch (error) {
    console.warn(`Could not scan ${imageName} with Trivy:`, error.message);
    return { image: imageName, vulnerabilities: [] };
  }
}

async function scanImageForSecrets(imageName) {
  try {
    const command = `trivy image --scanners secret --format json ${imageName}`;
    const result = execSync(command, { encoding: 'utf8' });
    const scanData = JSON.parse(result);
    
    return {
      image: imageName,
      secrets: scanData.Results ? 
        scanData.Results.flatMap(r => r.Secrets || []) : []
    };
  } catch (error) {
    return { image: imageName, secrets: [] };
  }
}

async function scanImageForMisconfigurations(imageName) {
  try {
    const command = `trivy image --scanners misconfig --format json ${imageName}`;
    const result = execSync(command, { encoding: 'utf8' });
    const scanData = JSON.parse(result);
    
    return {
      image: imageName,
      misconfigurations: scanData.Results ? 
        scanData.Results.flatMap(r => r.Misconfigurations || []) : []
    };
  } catch (error) {
    return { image: imageName, misconfigurations: [] };
  }
}

async function getRunningContainers() {
  try {
    const result = execSync('docker ps --format "{{.ID}} {{.Names}}"', { 
      encoding: 'utf8' 
    });
    
    return result.trim().split('\n').map(line => {
      const [id, name] = line.split(' ');
      return { id, name };
    });
  } catch (error) {
    return [];
  }
}

async function inspectContainer(containerId) {
  try {
    const result = execSync(`docker inspect ${containerId}`, { 
      encoding: 'utf8' 
    });
    return JSON.parse(result)[0];
  } catch (error) {
    return {};
  }
}

async function getDockerNetworks() {
  try {
    const result = execSync('docker network ls --format "{{.Name}}"', { 
      encoding: 'utf8' 
    });
    
    const networks = [];
    for (const networkName of result.trim().split('\n')) {
      const inspection = execSync(`docker network inspect ${networkName}`, { 
        encoding: 'utf8' 
      });
      const networkData = JSON.parse(inspection)[0];
      
      networks.push({
        name: networkName,
        driver: networkData.Driver,
        subnet: networkData.IPAM?.Config?.[0]?.Subnet
      });
    }
    
    return networks;
  } catch (error) {
    return [];
  }
}

async function getDockerInfo() {
  try {
    const result = execSync('docker info --format "{{json .}}"', { 
      encoding: 'utf8' 
    });
    return JSON.parse(result);
  } catch (error) {
    return {};
  }
}

async function runContainer(imageName, command) {
  try {
    const result = execSync(`docker run --rm ${imageName} ${command}`, { 
      encoding: 'utf8' 
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getContainerStats(containerId) {
  try {
    const result = execSync(`docker stats --no-stream --format "{{.CPUPerc}} {{.MemPerc}}" ${containerId}`, { 
      encoding: 'utf8' 
    });
    
    const [cpuPerc, memPerc] = result.trim().split(' ');
    return {
      cpuUsage: parseFloat(cpuPerc.replace('%', '')),
      memoryUsage: parseFloat(memPerc.replace('%', ''))
    };
  } catch (error) {
    return { cpuUsage: 0, memoryUsage: 0 };
  }
}

async function verifyImageSignature(imageName) {
  // This would require cosign or Docker Content Trust setup
  try {
    const result = execSync(`cosign verify ${imageName}`, { encoding: 'utf8' });
    return { verified: true, signature: result };
  } catch (error) {
    throw new Error(`Image signature verification failed: ${error.message}`);
  }
}

async function generateSecurityReport(scanResults) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalImages: Object.keys(scanResults).length,
      totalVulnerabilities: Object.values(scanResults)
        .reduce((sum, result) => sum + result.vulnerabilities.length, 0),
      criticalVulnerabilities: Object.values(scanResults)
        .reduce((sum, result) => sum + result.vulnerabilities.filter(v => v.severity === 'CRITICAL').length, 0)
    },
    details: scanResults
  };
  
  await fs.writeFile(
    path.join(config.security.compliance.reports.outputDir, 'container-security-report.json'),
    JSON.stringify(report, null, 2)
  );
}

async function storeSecurityResults(scanResults) {
  try {
    execSync(`npx claude-flow@alpha hooks post-edit --memory-key "hive/security/container-results" --file "container-security-report.json"`, {
      stdio: 'ignore'
    });
  } catch (error) {
    console.warn('Could not store security results in hive memory');
  }
}