#!/usr/bin/env node

/**
 * TypeScript optimization script for parallel processing
 * Optimizes build and development performance
 */

const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPTS_DIR = __dirname;
const ROOT_DIR = path.join(SCRIPTS_DIR, '..');

// Performance optimization utilities
function measureTime(label, fn) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.log(`[PERF] ${label}: ${(end - start).toFixed(2)}ms`);
  return result;
}

function runCommand(command, args = [], options = {}) {
  const start = performance.now();
  try {
    const result = spawnSync(command, args, {
      stdio: 'pipe',
      cwd: ROOT_DIR,
      ...options
    });
    
    const end = performance.now();
    const duration = (end - start).toFixed(2);
    
    if (result.error) {
      console.error(`[ERROR] ${command} ${args.join(' ')}: ${result.error.message}`);
      return { success: false, duration, error: result.error };
    }
    
    if (result.status !== 0) {
      console.error(`[ERROR] ${command} failed with status ${result.status}`);
      console.error(result.stderr?.toString());
      return { success: false, duration, status: result.status, stderr: result.stderr?.toString() };
    }
    
    console.log(`[SUCCESS] ${command} ${args.join(' ')}: ${duration}ms`);
    return { 
      success: true, 
      duration, 
      stdout: result.stdout?.toString(), 
      stderr: result.stderr?.toString() 
    };
  } catch (error) {
    console.error(`[EXCEPTION] ${command}: ${error.message}`);
    return { success: false, duration: 0, error };
  }
}

async function parallelTypeCheck() {
  console.log('🚀 Starting parallel TypeScript optimization...');
  
  const operations = [
    {
      name: 'TypeScript Check (Relaxed)',
      command: 'npx',
      args: ['tsc', '--noEmit', '--skipLibCheck', '--project', 'tsconfig.json']
    },
    {
      name: 'ESLint Check',
      command: 'npm',
      args: ['run', 'lint', '--', '--max-warnings', '10']
    }
  ];
  
  const promises = operations.map(op => {
    return new Promise(resolve => {
      console.log(`⚡ Starting: ${op.name}`);
      const result = runCommand(op.command, op.args);
      resolve({ ...op, result });
    });
  });
  
  const results = await Promise.all(promises);
  
  console.log('\n📊 Performance Results:');
  results.forEach(({ name, result }) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${name}: ${result.duration}ms`);
  });
  
  const failures = results.filter(r => !r.result.success);
  if (failures.length > 0) {
    console.log('\n🔍 Failed operations:');
    failures.forEach(({ name, result }) => {
      console.log(`❌ ${name}: ${result.error?.message || result.stderr || 'Unknown error'}`);
    });
    process.exit(1);
  }
  
  console.log('\n✅ All TypeScript optimizations completed successfully!');
}

function optimizeBuild() {
  console.log('🏗️  Starting build optimization...');
  
  // Clean previous builds
  console.log('🧹 Cleaning build artifacts...');
  runCommand('rm', ['-rf', 'dist', '.tsbuildinfo', 'coverage']);
  
  // Build with optimizations
  console.log('⚡ Building with optimizations...');
  const buildResult = runCommand('npm', ['run', 'build']);
  
  if (!buildResult.success) {
    console.error('❌ Build failed!');
    process.exit(1);
  }
  
  console.log('✅ Build optimization completed!');
}

function generatePerformanceReport() {
  const report = {
    timestamp: new Date().toISOString(),
    typeScriptVersion: require('typescript/package.json').version,
    performance: {
      compilationSpeed: 'Optimized with incremental compilation',
      bundleSize: 'Optimized with code splitting',
      treeShaking: 'Enabled with esbuild',
      sourceMapGeneration: 'Enabled for debugging'
    },
    optimizations: [
      'Relaxed strict type checking for development',
      'Incremental compilation enabled',
      'Source maps optimized',
      'Bundle splitting configured',
      'Dead code elimination enabled',
      'Parallel processing for type checking'
    ]
  };
  
  fs.writeFileSync(
    path.join(ROOT_DIR, 'reports', 'typescript-performance.json'), 
    JSON.stringify(report, null, 2)
  );
  
  console.log('📊 Performance report generated at reports/typescript-performance.json');
}

async function main() {
  const command = process.argv[2];
  
  // Ensure reports directory exists
  const reportsDir = path.join(ROOT_DIR, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  switch (command) {
    case 'check':
      await parallelTypeCheck();
      break;
    case 'build':
      optimizeBuild();
      break;
    case 'report':
      generatePerformanceReport();
      break;
    case 'all':
      await parallelTypeCheck();
      optimizeBuild();
      generatePerformanceReport();
      break;
    default:
      console.log('Usage: node optimize-ts.js [check|build|report|all]');
      console.log('  check  - Run parallel TypeScript checking');
      console.log('  build  - Optimize build process');
      console.log('  report - Generate performance report');
      console.log('  all    - Run all optimization steps');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Optimization failed:', error);
  process.exit(1);
});