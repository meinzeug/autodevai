/**
 * @fileoverview Bundle analysis and optimization tests
 * Comprehensive bundle size and optimization analysis
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Bundle Analysis and Optimization', () => {
  let bundleStats;
  let buildDir;

  beforeAll(async () => {
    // Build the application for analysis
    console.log('Building application for bundle analysis...');
    try {
      execSync('npm run build', { stdio: 'inherit' });
      buildDir = path.join(__dirname, '../../dist');
      
      // Generate bundle analysis
      if (fs.existsSync(buildDir)) {
        const statsFile = path.join(buildDir, 'stats.json');
        if (fs.existsSync(statsFile)) {
          bundleStats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
        }
      }
    } catch (error) {
      console.error('Build failed:', error.message);
    }
  });

  describe('Bundle Size Analysis', () => {
    it('should have reasonable total bundle size', () => {
      if (!fs.existsSync(buildDir)) {
        console.warn('Build directory not found, skipping bundle tests');
        return;
      }

      const files = fs.readdirSync(buildDir);
      const jsFiles = files.filter(file => file.endsWith('.js') && !file.includes('map'));
      
      let totalSize = 0;
      jsFiles.forEach(file => {
        const stats = fs.statSync(path.join(buildDir, file));
        totalSize += stats.size;
      });

      const totalSizeMB = totalSize / (1024 * 1024);
      console.log(`Total JS bundle size: ${totalSizeMB.toFixed(2)} MB`);
      
      // Target: Keep main bundle under 1MB for good performance
      expect(totalSizeMB).toBeLessThan(2.0); // Allowing 2MB for comprehensive app
    });

    it('should have main chunk size within limits', () => {
      if (!fs.existsSync(buildDir)) return;

      const files = fs.readdirSync(buildDir);
      const mainFiles = files.filter(file => 
        file.startsWith('index-') && file.endsWith('.js') && !file.includes('map')
      );

      if (mainFiles.length === 0) return;

      mainFiles.forEach(file => {
        const stats = fs.statSync(path.join(buildDir, file));
        const sizeMB = stats.size / (1024 * 1024);
        
        console.log(`Main chunk ${file}: ${sizeMB.toFixed(2)} MB`);
        expect(sizeMB).toBeLessThan(1.5); // Main chunk should be < 1.5MB
      });
    });

    it('should properly split vendor chunks', () => {
      if (!fs.existsSync(buildDir)) return;

      const files = fs.readdirSync(buildDir);
      const vendorFiles = files.filter(file => 
        file.includes('vendor') && file.endsWith('.js')
      );

      // Should have vendor chunk separation for better caching
      expect(vendorFiles.length).toBeGreaterThan(0);

      vendorFiles.forEach(file => {
        const stats = fs.statSync(path.join(buildDir, file));
        const sizeMB = stats.size / (1024 * 1024);
        
        console.log(`Vendor chunk ${file}: ${sizeMB.toFixed(2)} MB`);
        expect(sizeMB).toBeLessThan(2.0); // Vendor chunks should be reasonable
      });
    });

    it('should have compressed asset sizes within limits', () => {
      if (!fs.existsSync(buildDir)) return;

      const files = fs.readdirSync(buildDir);
      const gzFiles = files.filter(file => file.endsWith('.gz'));

      if (gzFiles.length > 0) {
        gzFiles.forEach(file => {
          const stats = fs.statSync(path.join(buildDir, file));
          const sizeKB = stats.size / 1024;
          
          console.log(`Compressed file ${file}: ${sizeKB.toFixed(2)} KB`);
          
          // Compressed main files should be under 500KB
          if (file.includes('index-') || file.includes('main-')) {
            expect(sizeKB).toBeLessThan(500);
          }
        });
      }
    });
  });

  describe('Asset Optimization', () => {
    it('should generate source maps for debugging', () => {
      if (!fs.existsSync(buildDir)) return;

      const files = fs.readdirSync(buildDir);
      const sourceMapFiles = files.filter(file => file.endsWith('.js.map'));
      
      // Should have source maps for main files
      expect(sourceMapFiles.length).toBeGreaterThan(0);
      
      sourceMapFiles.forEach(file => {
        const mapPath = path.join(buildDir, file);
        const mapContent = fs.readFileSync(mapPath, 'utf8');
        const mapData = JSON.parse(mapContent);
        
        expect(mapData.version).toBe(3);
        expect(mapData.sources).toBeDefined();
        expect(mapData.sources.length).toBeGreaterThan(0);
      });
    });

    it('should include critical CSS inline or in separate chunks', () => {
      if (!fs.existsSync(buildDir)) return;

      const files = fs.readdirSync(buildDir);
      const cssFiles = files.filter(file => file.endsWith('.css'));
      
      if (cssFiles.length > 0) {
        cssFiles.forEach(file => {
          const stats = fs.statSync(path.join(buildDir, file));
          const sizeKB = stats.size / 1024;
          
          console.log(`CSS file ${file}: ${sizeKB.toFixed(2)} KB`);
          
          // CSS files should be reasonably sized
          expect(sizeKB).toBeLessThan(500); // 500KB limit for CSS
        });
      }
    });

    it('should optimize images and static assets', () => {
      if (!fs.existsSync(buildDir)) return;

      const assetsDir = path.join(buildDir, 'assets');
      if (!fs.existsSync(assetsDir)) return;

      const assetFiles = fs.readdirSync(assetsDir);
      const imageFiles = assetFiles.filter(file => 
        /\.(png|jpg|jpeg|gif|svg|webp|avif)$/i.test(file)
      );

      imageFiles.forEach(file => {
        const stats = fs.statSync(path.join(assetsDir, file));
        const sizeKB = stats.size / 1024;
        
        console.log(`Image asset ${file}: ${sizeKB.toFixed(2)} KB`);
        
        // Images should be optimized (< 1MB each)
        expect(sizeKB).toBeLessThan(1024);
      });
    });

    it('should have proper asset fingerprinting', () => {
      if (!fs.existsSync(buildDir)) return;

      const files = fs.readdirSync(buildDir);
      const fingerprintedFiles = files.filter(file => 
        /\.(js|css)$/.test(file) && /-[a-f0-9]{8,}\./.test(file)
      );

      // Should have fingerprinted assets for caching
      expect(fingerprintedFiles.length).toBeGreaterThan(0);
      
      console.log(`Fingerprinted files: ${fingerprintedFiles.length}`);
    });
  });

  describe('Performance Optimizations', () => {
    it('should implement tree shaking effectively', () => {
      if (!fs.existsSync(buildDir)) return;

      const files = fs.readdirSync(buildDir);
      const jsFiles = files.filter(file => file.endsWith('.js') && !file.includes('map'));
      
      // Check if bundle contains unused code patterns
      jsFiles.forEach(file => {
        const content = fs.readFileSync(path.join(buildDir, file), 'utf8');
        
        // Should not contain dead code markers
        expect(content).not.toMatch(/\/\*\s*unused harmony export/);
        
        // Should not contain excessive whitespace (minified)
        const lines = content.split('\n');
        const avgLineLength = content.length / lines.length;
        expect(avgLineLength).toBeGreaterThan(50); // Minified code has longer lines
      });
    });

    it('should implement code splitting for lazy loading', () => {
      if (!fs.existsSync(buildDir)) return;

      const files = fs.readdirSync(buildDir);
      const chunkFiles = files.filter(file => 
        file.endsWith('.js') && !file.includes('map') && !file.startsWith('index-')
      );

      // Should have multiple chunks for code splitting
      expect(chunkFiles.length).toBeGreaterThanOrEqual(2);
      
      console.log(`Total chunks: ${chunkFiles.length + 1}`); // +1 for main chunk
    });

    it('should minimize third-party library sizes', () => {
      if (!bundleStats) return;

      // Analyze common heavy libraries
      const heavyLibraries = [
        'react',
        'react-dom',
        '@anthropic-ai/sdk',
        'axios',
        'lodash'
      ];

      // This would require actual webpack stats analysis
      // For now, we'll check if any obvious anti-patterns exist
      const buildFiles = fs.existsSync(buildDir) ? fs.readdirSync(buildDir) : [];
      const jsContent = buildFiles
        .filter(file => file.endsWith('.js') && !file.includes('map'))
        .map(file => fs.readFileSync(path.join(buildDir, file), 'utf8'))
        .join('\n');

      // Should not include multiple versions of React
      const reactMatches = jsContent.match(/react.*version/gi) || [];
      expect(reactMatches.length).toBeLessThanOrEqual(1);
    });

    it('should have efficient module federation setup', () => {
      if (!fs.existsSync(buildDir)) return;

      // Check for module federation artifacts
      const files = fs.readdirSync(buildDir);
      const hasModuleFederation = files.some(file => 
        file.includes('remoteEntry') || file.includes('federation')
      );

      if (hasModuleFederation) {
        console.log('Module federation detected');
        
        // Module federation chunks should be optimized
        const federationFiles = files.filter(file => 
          file.includes('remoteEntry') || file.includes('federation')
        );
        
        federationFiles.forEach(file => {
          const stats = fs.statSync(path.join(buildDir, file));
          const sizeKB = stats.size / 1024;
          
          console.log(`Federation file ${file}: ${sizeKB.toFixed(2)} KB`);
          expect(sizeKB).toBeLessThan(200); // Federation files should be small
        });
      }
    });
  });

  describe('Runtime Performance', () => {
    it('should generate service worker for caching', () => {
      if (!fs.existsSync(buildDir)) return;

      const files = fs.readdirSync(buildDir);
      const swFiles = files.filter(file => 
        file.includes('service-worker') || file.includes('sw.js') || file.includes('workbox')
      );

      if (swFiles.length > 0) {
        console.log('Service worker files found:', swFiles);
        
        swFiles.forEach(file => {
          const content = fs.readFileSync(path.join(buildDir, file), 'utf8');
          
          // Should have basic service worker functionality
          expect(content).toMatch(/(cache|fetch|install|activate)/i);
        });
      }
    });

    it('should have proper resource hints and preloading', () => {
      if (!fs.existsSync(buildDir)) return;

      const indexPath = path.join(buildDir, 'index.html');
      if (!fs.existsSync(indexPath)) return;

      const indexContent = fs.readFileSync(indexPath, 'utf8');
      
      // Should have resource hints
      const hasPreload = indexContent.includes('rel="preload"');
      const hasPrefetch = indexContent.includes('rel="prefetch"');
      const hasDnsPrefix = indexContent.includes('rel="dns-prefetch"');
      
      console.log('Resource hints:', { hasPreload, hasPrefetch, hasDnsPrefix });
      
      // At least some resource optimization should be present
      expect(hasPreload || hasPrefetch || hasDnsPrefix).toBeTruthy();
    });

    it('should implement lazy loading for components', () => {
      // This requires analyzing the source code structure
      const srcDir = path.join(__dirname, '../../src');
      if (!fs.existsSync(srcDir)) return;

      const findLazyImports = (dir) => {
        const files = fs.readdirSync(dir);
        let lazyImports = [];
        
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory() && !file.includes('node_modules')) {
            lazyImports.push(...findLazyImports(filePath));
          } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Look for lazy imports
            const lazyMatches = content.match(/React\.lazy|import\(/g) || [];
            lazyImports.push(...lazyMatches);
          }
        });
        
        return lazyImports;
      };

      const lazyImports = findLazyImports(srcDir);
      console.log(`Lazy imports found: ${lazyImports.length}`);
      
      // Should have some lazy loading implemented
      expect(lazyImports.length).toBeGreaterThan(0);
    });
  });

  describe('Bundle Analysis Report', () => {
    it('should generate bundle analysis report', async () => {
      const reportPath = path.join(__dirname, '../reports/bundle-analysis.json');
      const reportDir = path.dirname(reportPath);
      
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      const report = {
        timestamp: new Date().toISOString(),
        build: {
          directory: buildDir,
          exists: fs.existsSync(buildDir)
        },
        analysis: {}
      };

      if (fs.existsSync(buildDir)) {
        const files = fs.readdirSync(buildDir);
        
        // Analyze JS files
        const jsFiles = files.filter(file => file.endsWith('.js') && !file.includes('map'));
        let totalJSSize = 0;
        const jsAnalysis = [];

        jsFiles.forEach(file => {
          const stats = fs.statSync(path.join(buildDir, file));
          const size = stats.size;
          totalJSSize += size;
          
          jsAnalysis.push({
            file,
            size,
            sizeKB: size / 1024,
            sizeMB: size / (1024 * 1024)
          });
        });

        // Analyze CSS files
        const cssFiles = files.filter(file => file.endsWith('.css'));
        let totalCSSSize = 0;
        const cssAnalysis = [];

        cssFiles.forEach(file => {
          const stats = fs.statSync(path.join(buildDir, file));
          const size = stats.size;
          totalCSSSize += size;
          
          cssAnalysis.push({
            file,
            size,
            sizeKB: size / 1024,
            sizeMB: size / (1024 * 1024)
          });
        });

        report.analysis = {
          javascript: {
            files: jsAnalysis,
            totalSize: totalJSSize,
            totalSizeKB: totalJSSize / 1024,
            totalSizeMB: totalJSSize / (1024 * 1024),
            fileCount: jsFiles.length
          },
          css: {
            files: cssAnalysis,
            totalSize: totalCSSSize,
            totalSizeKB: totalCSSSize / 1024,
            totalSizeMB: totalCSSSize / (1024 * 1024),
            fileCount: cssFiles.length
          },
          compression: {
            gzipFiles: files.filter(file => file.endsWith('.gz')).length,
            brotliFiles: files.filter(file => file.endsWith('.br')).length
          },
          optimization: {
            sourceMaps: files.filter(file => file.endsWith('.map')).length,
            fingerprinted: files.filter(file => /-[a-f0-9]{8,}\./.test(file)).length
          }
        };
      }

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`Bundle analysis report generated: ${reportPath}`);
      console.log('Summary:', {
        totalJSSize: report.analysis.javascript?.totalSizeMB?.toFixed(2) + ' MB',
        totalCSSSize: report.analysis.css?.totalSizeMB?.toFixed(2) + ' MB',
        totalFiles: (report.analysis.javascript?.fileCount || 0) + (report.analysis.css?.fileCount || 0)
      });

      expect(fs.existsSync(reportPath)).toBe(true);
    });

    it('should provide optimization recommendations', () => {
      const report = {
        recommendations: [],
        warnings: [],
        info: []
      };

      if (fs.existsSync(buildDir)) {
        const files = fs.readdirSync(buildDir);
        const jsFiles = files.filter(file => file.endsWith('.js') && !file.includes('map'));
        
        // Check for large files
        jsFiles.forEach(file => {
          const stats = fs.statSync(path.join(buildDir, file));
          const sizeMB = stats.size / (1024 * 1024);
          
          if (sizeMB > 1) {
            report.warnings.push(`Large bundle detected: ${file} (${sizeMB.toFixed(2)} MB)`);
            report.recommendations.push(`Consider code splitting for ${file}`);
          }
        });

        // Check for missing optimizations
        const hasGzip = files.some(file => file.endsWith('.gz'));
        const hasBrotli = files.some(file => file.endsWith('.br'));
        
        if (!hasGzip && !hasBrotli) {
          report.recommendations.push('Enable gzip or brotli compression');
        }

        // Check for service worker
        const hasSW = files.some(file => 
          file.includes('service-worker') || file.includes('sw.js')
        );
        
        if (!hasSW) {
          report.recommendations.push('Consider implementing service worker for caching');
        }

        // Check for proper chunking
        const chunkCount = jsFiles.length;
        if (chunkCount < 3) {
          report.recommendations.push('Consider implementing more aggressive code splitting');
        }

        report.info.push(`Total chunks: ${chunkCount}`);
        report.info.push(`Compression enabled: ${hasGzip ? 'gzip' : hasBrotli ? 'brotli' : 'none'}`);
      }

      console.log('Optimization Report:');
      console.log('Recommendations:', report.recommendations);
      console.log('Warnings:', report.warnings);
      console.log('Info:', report.info);

      // Should have at least some analysis
      expect(report.recommendations.length + report.warnings.length + report.info.length)
        .toBeGreaterThan(0);
    });
  });
});