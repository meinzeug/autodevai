const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

describe('Codex Code Generation Speed Benchmarks', () => {
  let testMetrics;
  let codexClient;
  let performanceTargets;

  beforeAll(() => {
    testMetrics = {
      startTime: Date.now(),
      generationTests: [],
      languagePerformance: {},
      complexityAnalysis: {},
      qualityMetrics: {},
      errors: []
    };

    // Performance targets from changelog and architecture specs
    performanceTargets = {
      simpleGeneration: 2000, // 2 seconds for simple code
      mediumComplexity: 5000, // 5 seconds for medium complexity
      complexGeneration: 8000, // 8 seconds for complex systems
      codeAnalysis: 3000, // 3 seconds for code analysis
      multiLanguage: 4000, // 4 seconds for multi-language tasks
      optimization: 6000, // 6 seconds for code optimization
      debugging: 4500, // 4.5 seconds for debugging assistance
      documentation: 3500 // 3.5 seconds for documentation generation
    };

    codexClient = axios.create({
      baseURL: process.env.CODEX_API_BASE_URL || 'http://localhost:50030',
      timeout: 45000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CODEX_API_KEY || 'test-key'}`,
        'X-Client': 'AutoDev-AI-Performance-Test'
      }
    });

    console.log('🚀 Starting Codex Code Generation Speed Benchmarks...');
    console.log('📊 Performance Targets:', performanceTargets);
  });

  afterAll(() => {
    const summary = {
      testDuration: Date.now() - testMetrics.startTime,
      totalGenerationTests: testMetrics.generationTests.length,
      errorCount: testMetrics.errors.length,
      errorRate: (testMetrics.errors.length / testMetrics.generationTests.length * 100).toFixed(2),
      averageGenerationTime: calculateAverageGenerationTime(),
      languagePerformanceComparison: testMetrics.languagePerformance,
      complexityImpact: analyzeComplexityImpact(),
      qualityVsSpeedAnalysis: testMetrics.qualityMetrics,
      targetCompliance: calculateTargetCompliance()
    };

    console.log('🏆 Codex Generation Speed Summary:', summary);
    global.performanceUtils.saveMetrics('codex-generation-speed', {
      summary,
      detailedMetrics: testMetrics,
      performanceTargets
    });

    generateCodexPerformanceReport(summary);
  });

  const generateCode = async (prompt, language, options = {}) => {
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage();

    try {
      const requestData = {
        prompt,
        language,
        maxTokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.3,
        complexity: options.complexity || 'medium',
        includeComments: options.includeComments !== false,
        includeTests: options.includeTests || false,
        style: options.style || 'standard',
        ...options.additionalParams
      };

      const response = await codexClient.post('/api/generate', requestData);
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      const memoryAfter = process.memoryUsage();

      const generationResult = {
        prompt,
        language,
        responseTime,
        tokensGenerated: response.data.tokens || 0,
        codeLength: response.data.code?.length || 0,
        linesOfCode: response.data.code ? response.data.code.split('\n').length : 0,
        quality: response.data.quality || {},
        confidence: response.data.confidence || 0,
        memoryUsage: memoryAfter.heapUsed - memoryBefore.heapUsed,
        complexity: options.complexity,
        success: true,
        timestamp: Date.now(),
        generatedCode: response.data.code,
        explanation: response.data.explanation,
        suggestions: response.data.suggestions || []
      };

      testMetrics.generationTests.push(generationResult);

      // Track language-specific performance
      if (!testMetrics.languagePerformance[language]) {
        testMetrics.languagePerformance[language] = {
          tests: [],
          averageTime: 0,
          averageQuality: 0,
          successRate: 100
        };
      }

      testMetrics.languagePerformance[language].tests.push(generationResult);
      updateLanguageStats(language);

      // Track complexity impact
      if (!testMetrics.complexityAnalysis[options.complexity]) {
        testMetrics.complexityAnalysis[options.complexity] = {
          tests: [],
          averageTime: 0,
          averageQuality: 0
        };
      }

      testMetrics.complexityAnalysis[options.complexity].tests.push(generationResult);
      updateComplexityStats(options.complexity);

      return generationResult;
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const errorResult = {
        prompt,
        language,
        responseTime,
        error: error.message,
        success: false,
        complexity: options.complexity,
        timestamp: Date.now()
      };

      testMetrics.generationTests.push(errorResult);
      testMetrics.errors.push(errorResult);

      if (!testMetrics.languagePerformance[language]) {
        testMetrics.languagePerformance[language] = {
          tests: [],
          averageTime: 0,
          averageQuality: 0,
          successRate: 100
        };
      }

      testMetrics.languagePerformance[language].tests.push(errorResult);
      updateLanguageStats(language);

      throw error;
    }
  };

  const analyzeCode = async (code, language, analysisType = 'comprehensive') => {
    const startTime = performance.now();

    try {
      const response = await codexClient.post('/api/analyze', {
        code,
        language,
        analysisType,
        includeOptimizations: true,
        includeSecurity: true,
        includePerformance: true
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      return {
        responseTime,
        analysis: response.data.analysis,
        suggestions: response.data.suggestions || [],
        score: response.data.score || 0,
        issues: response.data.issues || [],
        optimizations: response.data.optimizations || []
      };
    } catch (error) {
      const endTime = performance.now();
      throw { ...error, responseTime: endTime - startTime };
    }
  };

  const updateLanguageStats = (language) => {
    const languageData = testMetrics.languagePerformance[language];
    const successfulTests = languageData.tests.filter(test => test.success);
    
    if (successfulTests.length > 0) {
      languageData.averageTime = successfulTests.reduce((sum, test) => sum + test.responseTime, 0) / successfulTests.length;
      languageData.averageQuality = successfulTests
        .filter(test => test.quality?.overall)
        .reduce((sum, test) => sum + test.quality.overall, 0) / 
        successfulTests.filter(test => test.quality?.overall).length;
    }

    languageData.successRate = (successfulTests.length / languageData.tests.length) * 100;
  };

  const updateComplexityStats = (complexity) => {
    const complexityData = testMetrics.complexityAnalysis[complexity];
    const successfulTests = complexityData.tests.filter(test => test.success);
    
    if (successfulTests.length > 0) {
      complexityData.averageTime = successfulTests.reduce((sum, test) => sum + test.responseTime, 0) / successfulTests.length;
      complexityData.averageQuality = successfulTests
        .filter(test => test.quality?.overall)
        .reduce((sum, test) => sum + test.quality.overall, 0) / 
        successfulTests.filter(test => test.quality?.overall).length;
    }
  };

  const runGenerationBenchmark = async (name, testFunction, expectedTime) => {
    console.log(`🏃 Running generation benchmark: ${name}`);
    const startTime = performance.now();

    try {
      const result = await testFunction();
      const duration = performance.now() - startTime;

      const benchmark = {
        name,
        duration,
        result,
        expectedTime,
        withinTarget: duration <= expectedTime,
        overheadPercentage: ((duration - expectedTime) / expectedTime) * 100,
        timestamp: Date.now(),
        status: 'completed'
      };

      const targetStatus = benchmark.withinTarget ? '✅ PASS' : '❌ FAIL';
      const overheadInfo = benchmark.withinTarget ? '' : ` (${benchmark.overheadPercentage.toFixed(1)}% over target)`;
      
      console.log(`${targetStatus} ${name}: ${duration.toFixed(2)}ms${overheadInfo}`);

      return benchmark;
    } catch (error) {
      const duration = performance.now() - startTime;

      const benchmark = {
        name,
        duration,
        error: error.message,
        expectedTime,
        withinTarget: false,
        timestamp: Date.now(),
        status: 'failed'
      };

      console.log(`❌ FAILED ${name}: ${error.message}`);
      return benchmark;
    }
  };

  test('Simple Code Generation - Multiple Languages', async () => {
    const languages = [
      { name: 'javascript', prompt: 'Create a function that calculates the factorial of a number' },
      { name: 'python', prompt: 'Write a function to check if a string is a palindrome' },
      { name: 'typescript', prompt: 'Create an interface for a User with id, name, and email properties' },
      { name: 'java', prompt: 'Write a method to reverse an array of integers' },
      { name: 'go', prompt: 'Create a function that finds the maximum value in a slice of integers' },
      { name: 'rust', prompt: 'Write a function that counts vowels in a string' }
    ];

    for (const lang of languages) {
      await runGenerationBenchmark(`Simple Generation - ${lang.name}`, async () => {
        const result = await generateCode(lang.prompt, lang.name, {
          maxTokens: 300,
          temperature: 0.2,
          complexity: 'simple',
          includeComments: true
        });

        return {
          language: lang.name,
          responseTime: result.responseTime,
          codeLength: result.codeLength,
          linesOfCode: result.linesOfCode,
          quality: result.quality,
          tokensGenerated: result.tokensGenerated
        };
      }, performanceTargets.simpleGeneration);

      // Brief pause between language tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  });

  test('Medium Complexity Code Generation', async () => {
    const mediumTasks = [
      {
        language: 'javascript',
        prompt: 'Create a React component with hooks for managing a todo list with add, edit, delete, and filter functionality'
      },
      {
        language: 'python',
        prompt: 'Write a class-based implementation of a binary search tree with insert, delete, search, and traversal methods'
      },
      {
        language: 'typescript',
        prompt: 'Create a generic repository pattern with CRUD operations and TypeScript interfaces for a user management system'
      },
      {
        language: 'java',
        prompt: 'Implement a thread-safe singleton pattern with lazy initialization and proper exception handling'
      }
    ];

    for (const task of mediumTasks) {
      await runGenerationBenchmark(`Medium Complexity - ${task.language}`, async () => {
        const result = await generateCode(task.prompt, task.language, {
          maxTokens: 800,
          temperature: 0.3,
          complexity: 'medium',
          includeComments: true,
          includeTests: false
        });

        return {
          language: task.language,
          responseTime: result.responseTime,
          codeLength: result.codeLength,
          linesOfCode: result.linesOfCode,
          quality: result.quality,
          confidence: result.confidence
        };
      }, performanceTargets.mediumComplexity);

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  test('Complex System Generation', async () => {
    await runGenerationBenchmark('Complex System Generation', async () => {
      const complexPrompt = `Create a comprehensive Node.js Express API with the following requirements:
      
1. User authentication with JWT tokens
2. CRUD operations for users and posts
3. Input validation using Joi
4. Error handling middleware
5. Database integration with MongoDB/Mongoose
6. Rate limiting middleware
7. CORS configuration
8. Security headers
9. API documentation structure
10. Basic test setup

Include proper project structure, error handling, and configuration management.`;

      const result = await generateCode(complexPrompt, 'javascript', {
        maxTokens: 2000,
        temperature: 0.4,
        complexity: 'complex',
        includeComments: true,
        includeTests: true,
        style: 'enterprise'
      });

      return {
        responseTime: result.responseTime,
        codeLength: result.codeLength,
        linesOfCode: result.linesOfCode,
        quality: result.quality,
        confidence: result.confidence,
        tokensGenerated: result.tokensGenerated,
        isComprehensive: result.codeLength > 3000
      };
    }, performanceTargets.complexGeneration);
  });

  test('Code Analysis Performance', async () => {
    const codeToAnalyze = `
function processUserData(users) {
  var result = [];
  for (var i = 0; i < users.length; i++) {
    if (users[i].age > 18) {
      result.push({
        name: users[i].name.toUpperCase(),
        email: users[i].email,
        category: users[i].age > 65 ? 'senior' : 'adult'
      });
    }
  }
  return result;
}

class UserManager {
  constructor() {
    this.users = [];
  }
  
  addUser(user) {
    this.users.push(user);
  }
  
  findUser(id) {
    return this.users.find(u => u.id === id);
  }
  
  deleteUser(id) {
    this.users = this.users.filter(u => u.id !== id);
  }
}
    `;

    await runGenerationBenchmark('Code Analysis Performance', async () => {
      const analysis = await analyzeCode(codeToAnalyze, 'javascript', 'comprehensive');

      return {
        responseTime: analysis.responseTime,
        analysisProvided: analysis.analysis ? true : false,
        issuesFound: analysis.issues.length,
        optimizationsFound: analysis.optimizations.length,
        suggestionsProvided: analysis.suggestions.length,
        qualityScore: analysis.score
      };
    }, performanceTargets.codeAnalysis);
  });

  test('Multi-Language Code Generation Performance', async () => {
    await runGenerationBenchmark('Multi-Language Generation', async () => {
      const multiLangPrompt = 'Create a simple REST API endpoint for user registration. Include the implementation in JavaScript (Express), Python (Flask), and Go (Gin framework). Each should have proper error handling and input validation.';

      const results = [];
      const languages = ['javascript', 'python', 'go'];

      for (const language of languages) {
        try {
          const result = await generateCode(multiLangPrompt, language, {
            maxTokens: 600,
            temperature: 0.3,
            complexity: 'medium',
            includeComments: true
          });

          results.push({
            language,
            responseTime: result.responseTime,
            success: true,
            codeLength: result.codeLength
          });
        } catch (error) {
          results.push({
            language,
            responseTime: error.responseTime || 0,
            success: false,
            error: error.message
          });
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const totalTime = results.reduce((sum, r) => sum + r.responseTime, 0);
      const successfulGenerations = results.filter(r => r.success);

      return {
        totalTime,
        languagesCovered: languages.length,
        successfulGenerations: successfulGenerations.length,
        averageTimePerLanguage: totalTime / languages.length,
        results
      };
    }, performanceTargets.multiLanguage * 3); // Account for multiple languages
  });

  test('Code Optimization Performance', async () => {
    const unoptimizedCode = `
function findDuplicates(arr) {
  var duplicates = [];
  for (var i = 0; i < arr.length; i++) {
    for (var j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j]) {
        duplicates.push(arr[i]);
      }
    }
  }
  return duplicates;
}

function sumArray(numbers) {
  var total = 0;
  for (var i = 0; i < numbers.length; i++) {
    total = total + numbers[i];
  }
  return total;
}
    `;

    await runGenerationBenchmark('Code Optimization Performance', async () => {
      const optimizationPrompt = `Optimize the following JavaScript code for better performance, readability, and modern JavaScript practices:\n\n${unoptimizedCode}\n\nProvide the optimized version with explanations for each improvement.`;

      const result = await generateCode(optimizationPrompt, 'javascript', {
        maxTokens: 1000,
        temperature: 0.2,
        complexity: 'medium',
        includeComments: true,
        style: 'optimized'
      });

      return {
        responseTime: result.responseTime,
        codeLength: result.codeLength,
        linesOfCode: result.linesOfCode,
        optimizationsIncluded: result.explanation ? result.explanation.includes('optimiz') : false,
        quality: result.quality,
        tokensGenerated: result.tokensGenerated
      };
    }, performanceTargets.optimization);
  });

  test('Debugging Assistance Performance', async () => {
    const buggyCode = `
function calculateAverage(numbers) {
  var sum = 0;
  for (var i = 0; i <= numbers.length; i++) {
    sum += numbers[i];
  }
  return sum / numbers.length;
}

class Calculator {
  constructor() {
    this.history = [];
  }
  
  add(a, b) {
    let result = a + b;
    this.history.push({operation: 'add', operands: [a, b], result});
    return result;
  }
  
  divide(a, b) {
    let result = a / b;
    this.history.push({operation: 'divide', operands: [a, b], result});
    return result;
  }
  
  getHistory() {
    return this.history;
  }
}
    `;

    await runGenerationBenchmark('Debugging Assistance Performance', async () => {
      const debugPrompt = `Find and fix all bugs in this JavaScript code. Explain what each bug is and provide the corrected version:\n\n${buggyCode}`;

      const result = await generateCode(debugPrompt, 'javascript', {
        maxTokens: 1200,
        temperature: 0.1,
        complexity: 'medium',
        includeComments: true,
        style: 'debugging'
      });

      return {
        responseTime: result.responseTime,
        codeLength: result.codeLength,
        bugsIdentified: result.explanation ? (result.explanation.match(/bug/gi) || []).length : 0,
        fixesProvided: result.generatedCode ? true : false,
        explanationProvided: result.explanation ? true : false,
        quality: result.quality
      };
    }, performanceTargets.debugging);
  });

  test('Documentation Generation Performance', async () => {
    const codeForDocs = `
class DatabaseManager {
  constructor(connectionString) {
    this.connectionString = connectionString;
    this.connection = null;
  }

  async connect() {
    try {
      this.connection = await createConnection(this.connectionString);
      return true;
    } catch (error) {
      console.error('Connection failed:', error);
      return false;
    }
  }

  async query(sql, params = []) {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.connection.execute(sql, params);
      return result.rows;
    } catch (error) {
      console.error('Query failed:', error);
      throw error;
    }
  }

  async close() {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }
}
    `;

    await runGenerationBenchmark('Documentation Generation Performance', async () => {
      const docPrompt = `Generate comprehensive JSDoc documentation for the following JavaScript class. Include parameter types, return types, examples, and usage notes:\n\n${codeForDocs}`;

      const result = await generateCode(docPrompt, 'javascript', {
        maxTokens: 800,
        temperature: 0.2,
        complexity: 'simple',
        includeComments: true,
        style: 'documentation'
      });

      return {
        responseTime: result.responseTime,
        codeLength: result.codeLength,
        documentationProvided: result.generatedCode ? result.generatedCode.includes('@param') : false,
        examplesIncluded: result.generatedCode ? result.generatedCode.includes('@example') : false,
        quality: result.quality,
        completeness: result.codeLength > 1000
      };
    }, performanceTargets.documentation);
  });

  test('Concurrent Code Generation Performance', async () => {
    await runGenerationBenchmark('Concurrent Generation Performance', async () => {
      const concurrentTasks = [
        { prompt: 'Create a simple HTTP server in Node.js', language: 'javascript' },
        { prompt: 'Write a Python function to parse CSV files', language: 'python' },
        { prompt: 'Create a Go function for JSON validation', language: 'go' },
        { prompt: 'Write TypeScript interfaces for an e-commerce system', language: 'typescript' },
        { prompt: 'Create a Java method for string manipulation', language: 'java' }
      ];

      const promises = concurrentTasks.map(task => 
        generateCode(task.prompt, task.language, {
          maxTokens: 400,
          temperature: 0.3,
          complexity: 'simple'
        }).catch(error => ({ error: error.message, language: task.language }))
      );

      const results = await Promise.all(promises);
      const successful = results.filter(r => !r.error);
      const failed = results.filter(r => r.error);

      const averageTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
      const totalTime = Math.max(...successful.map(r => r.responseTime)); // Max time for concurrent execution

      return {
        totalTasks: concurrentTasks.length,
        successful: successful.length,
        failed: failed.length,
        successRate: (successful.length / concurrentTasks.length) * 100,
        averageTime,
        totalConcurrentTime: totalTime,
        concurrencyBenefit: (successful.reduce((sum, r) => sum + r.responseTime, 0) - totalTime) > 0
      };
    }, performanceTargets.simpleGeneration * 2); // Allow extra time for concurrency overhead
  });

  const calculateAverageGenerationTime = () => {
    const successfulTests = testMetrics.generationTests.filter(test => test.success);
    return successfulTests.length > 0 
      ? successfulTests.reduce((sum, test) => sum + test.responseTime, 0) / successfulTests.length
      : 0;
  };

  const analyzeComplexityImpact = () => {
    return Object.entries(testMetrics.complexityAnalysis).map(([complexity, data]) => ({
      complexity,
      averageTime: data.averageTime,
      averageQuality: data.averageQuality,
      testCount: data.tests.length
    })).sort((a, b) => a.averageTime - b.averageTime);
  };

  const calculateTargetCompliance = () => {
    const allBenchmarks = testMetrics.generationTests.concat(
      Object.values(testMetrics.languagePerformance).flatMap(lang => lang.tests)
    );
    
    const withinTargetTests = allBenchmarks.filter(test => {
      if (!test.success) return false;
      
      // Determine appropriate target based on complexity
      let target = performanceTargets.simpleGeneration;
      if (test.complexity === 'medium') target = performanceTargets.mediumComplexity;
      else if (test.complexity === 'complex') target = performanceTargets.complexGeneration;
      
      return test.responseTime <= target;
    });
    
    return {
      totalTests: allBenchmarks.filter(test => test.success).length,
      withinTarget: withinTargetTests.length,
      complianceRate: allBenchmarks.filter(test => test.success).length > 0 
        ? (withinTargetTests.length / allBenchmarks.filter(test => test.success).length) * 100
        : 0
    };
  };

  const generateCodexPerformanceReport = (summary) => {
    const report = {
      timestamp: new Date().toISOString(),
      summary,
      performanceTargets,
      languageComparison: testMetrics.languagePerformance,
      complexityAnalysis: testMetrics.complexityAnalysis,
      qualityMetrics: testMetrics.qualityMetrics,
      recommendations: generateCodexRecommendations(summary)
    };

    const reportPath = path.join(__dirname, '../reports', 'codex-generation-speed-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📄 Codex Generation Speed Report saved to: ${reportPath}`);
  };

  const generateCodexRecommendations = (summary) => {
    const recommendations = [];

    // Overall performance
    if (summary.targetCompliance.complianceRate < 80) {
      recommendations.push({
        type: 'generation_performance',
        priority: 'high',
        message: `Only ${summary.targetCompliance.complianceRate.toFixed(1)}% of generation tests meet performance targets`
      });
    }

    // Language-specific recommendations
    Object.entries(testMetrics.languagePerformance).forEach(([language, data]) => {
      if (data.averageTime > performanceTargets.simpleGeneration * 1.5) {
        recommendations.push({
          type: 'language_optimization',
          priority: 'medium',
          message: `${language} shows slow generation times (${data.averageTime.toFixed(2)}ms avg)`
        });
      }

      if (data.successRate < 95) {
        recommendations.push({
          type: 'language_reliability',
          priority: 'high',
          message: `${language} has low success rate (${data.successRate.toFixed(1)}%)`
        });
      }
    });

    // Complexity impact analysis
    const complexityData = summary.complexityImpact;
    if (complexityData.length > 1) {
      const simpleVsComplex = complexityData.find(c => c.complexity === 'simple');
      const complex = complexityData.find(c => c.complexity === 'complex');
      
      if (simpleVsComplex && complex && complex.averageTime > simpleVsComplex.averageTime * 5) {
        recommendations.push({
          type: 'complexity_scaling',
          priority: 'medium',
          message: `Complex tasks show poor scaling (${(complex.averageTime / simpleVsComplex.averageTime).toFixed(1)}x slower than simple tasks)`
        });
      }
    }

    return recommendations;
  };
});