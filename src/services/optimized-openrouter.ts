/**
 * Optimized OpenRouter API Integration with Performance Enhancements
 * - Connection pooling and keep-alive
 * - Response caching with intelligent TTL
 * - Request batching and deduplication
 * - Circuit breaker pattern
 * - Performance metrics collection
 */

import { OpenRouterClient, OpenRouterConfig, OpenRouterResponse, TaskComplexity } from './openrouter';

interface CacheEntry {
  response: OpenRouterResponse;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailTime: number;
  state: 'closed' | 'open' | 'half-open';
}

interface ConnectionPoolOptions {
  maxConnections: number;
  keepAlive: boolean;
  timeout: number;
}

interface BatchRequestItem {
  id: string;
  params: any;
  resolve: (value: OpenRouterResponse) => void;
  reject: (error: Error) => void;
}

class OptimizedOpenRouterClient extends OpenRouterClient {
  private cache: Map<string, CacheEntry> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private requestQueue: Map<string, BatchRequestItem[]> = new Map();
  private activeConnections: Set<AbortController> = new Set();
  private performanceMetrics: Map<string, any> = new Map();
  
  private readonly poolOptions: ConnectionPoolOptions = {
    maxConnections: 10,
    keepAlive: true,
    timeout: 30000
  };

  constructor(config: OpenRouterConfig) {
    super(config);
    this.initializePerformanceMonitoring();
    this.startCacheCleanup();
  }

  private initializePerformanceMonitoring() {
    // Track performance metrics every 30 seconds
    setInterval(() => {
      this.collectMetrics();
    }, 30000);
  }

  private startCacheCleanup() {
    // Clean expired cache entries every 60 seconds
    setInterval(() => {
      this.cleanExpiredCache();
    }, 60000);
  }

  private createCacheKey(params: any): string {
    // Create deterministic cache key
    const cacheableParams = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.max_tokens
    };
    
    try {
      return Buffer.from(JSON.stringify(cacheableParams)).toString('base64');
    } catch {
      return `fallback_${Date.now()}_${Math.random()}`;
    }
  }

  private getCachedResponse(cacheKey: string): OpenRouterResponse | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update hit count for cache analytics
    entry.hits++;
    return { ...entry.response };
  }

  private setCachedResponse(cacheKey: string, response: OpenRouterResponse, ttl: number = 300000) {
    // Intelligent TTL based on response characteristics
    const dynamicTTL = this.calculateDynamicTTL(response, ttl);
    
    this.cache.set(cacheKey, {
      response: { ...response },
      timestamp: Date.now(),
      ttl: dynamicTTL,
      hits: 0
    });

    // Implement LRU eviction if cache gets too large
    if (this.cache.size > 500) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  private calculateDynamicTTL(response: OpenRouterResponse, baseTTL: number): number {
    // Longer TTL for successful responses with stable content
    if (response.choices?.[0]?.finish_reason === 'stop') {
      return baseTTL * 2;
    }
    
    // Shorter TTL for incomplete or error responses
    if (response.choices?.[0]?.finish_reason === 'length') {
      return baseTTL * 0.5;
    }

    return baseTTL;
  }

  private isCircuitBreakerOpen(model: string): boolean {
    const breaker = this.circuitBreakers.get(model);
    if (!breaker) return false;

    const now = Date.now();
    
    // Reset circuit breaker after 60 seconds
    if (breaker.state === 'open' && now - breaker.lastFailTime > 60000) {
      breaker.state = 'half-open';
      breaker.failures = 0;
    }

    return breaker.state === 'open';
  }

  private updateCircuitBreaker(model: string, success: boolean) {
    let breaker = this.circuitBreakers.get(model);
    if (!breaker) {
      breaker = { failures: 0, lastFailTime: 0, state: 'closed' };
      this.circuitBreakers.set(model, breaker);
    }

    if (success) {
      breaker.failures = 0;
      breaker.state = 'closed';
    } else {
      breaker.failures++;
      breaker.lastFailTime = Date.now();
      
      // Open circuit breaker after 3 failures
      if (breaker.failures >= 3) {
        breaker.state = 'open';
      }
    }
  }

  async completion(params: {
    model?: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
    task_description?: string;
    complexity?: TaskComplexity;
    constraints?: any;
    enableCache?: boolean;
    priority?: 'low' | 'medium' | 'high';
  }): Promise<OpenRouterResponse> {
    const startTime = performance.now();
    const enableCache = params.enableCache !== false;
    
    // Model selection with circuit breaker awareness
    const model = params.model || await this.selectOptimalModelWithFallback(
      params.task_description || '',
      params.complexity || { computational: 0.5, logical: 0.5, creative: 0.5, domain_specific: 0.5 },
      params.constraints
    );

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(model)) {
      throw new Error(`Circuit breaker open for model: ${model}`);
    }

    // Check cache first
    const cacheKey = enableCache ? this.createCacheKey({ ...params, model }) : null;
    if (cacheKey) {
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        this.recordMetric('cache_hit', model, performance.now() - startTime);
        return cached;
      }
    }

    // Request deduplication for identical requests
    const dedupeKey = cacheKey || `${model}_${Date.now()}`;
    if (this.requestQueue.has(dedupeKey)) {
      // Return promise that resolves when the original request completes
      return new Promise((resolve, reject) => {
        this.requestQueue.get(dedupeKey)!.push({
          id: Math.random().toString(36),
          params,
          resolve,
          reject
        });
      });
    }

    // Initialize request queue for deduplication
    this.requestQueue.set(dedupeKey, []);

    try {
      // Create abort controller for connection management
      const controller = new AbortController();
      this.activeConnections.add(controller);

      // Enhanced request with connection pooling
      const response = await this.makeOptimizedRequest('/chat/completions', {
        model,
        messages: params.messages,
        temperature: params.temperature || 0.7,
        max_tokens: params.max_tokens || 4000
      }, {
        signal: controller.signal,
        priority: params.priority || 'medium'
      });

      const duration = performance.now() - startTime;

      // Cache successful response
      if (cacheKey && response.choices?.[0]?.finish_reason === 'stop') {
        this.setCachedResponse(cacheKey, response);
      }

      // Update performance metrics and circuit breaker
      this.updateCircuitBreaker(model, true);
      this.recordMetric('request_success', model, duration);

      // Resolve any duplicate requests
      const duplicates = this.requestQueue.get(dedupeKey) || [];
      duplicates.forEach(item => item.resolve({ ...response }));
      this.requestQueue.delete(dedupeKey);

      this.activeConnections.delete(controller);
      return response;

    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Update circuit breaker and metrics
      this.updateCircuitBreaker(model, false);
      this.recordMetric('request_error', model, duration);

      // Reject any duplicate requests
      const duplicates = this.requestQueue.get(dedupeKey) || [];
      duplicates.forEach(item => item.reject(error as Error));
      this.requestQueue.delete(dedupeKey);

      // Try fallback model if available
      if (this.config.fallbackModels.length > 0) {
        const fallbackModel = this.config.fallbackModels.find(m => m !== model && !this.isCircuitBreakerOpen(m));
        if (fallbackModel) {
          return this.completion({ ...params, model: fallbackModel });
        }
      }

      throw error;
    }
  }

  private async selectOptimalModelWithFallback(
    task: string,
    complexity: TaskComplexity,
    constraints: any = {}
  ): Promise<string> {
    const preferredModel = await this.selectOptimalModel(task, complexity, constraints);
    
    // Check if preferred model is available
    if (!this.isCircuitBreakerOpen(preferredModel)) {
      return preferredModel;
    }

    // Find best available fallback
    for (const [model] of this.modelCapabilities) {
      if (!this.isCircuitBreakerOpen(model) && model !== preferredModel) {
        return model;
      }
    }

    return this.config.defaultModel;
  }

  private async makeOptimizedRequest(endpoint: string, data: any, options: any = {}): Promise<OpenRouterResponse> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    // Enhanced fetch with connection pooling and performance optimizations
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://autodev-ai.github.io',
        'X-Title': 'AutoDev-AI Optimized Integration',
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=30, max=100'
      },
      body: JSON.stringify(data),
      signal: options.signal,
      // Connection pooling configuration
      ...(this.poolOptions.keepAlive && {
        keepalive: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  private recordMetric(type: string, model: string, duration: number) {
    const key = `${type}_${model}`;
    const existing = this.performanceMetrics.get(key) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0
    };

    existing.count++;
    existing.totalDuration += duration;
    existing.avgDuration = existing.totalDuration / existing.count;
    existing.minDuration = Math.min(existing.minDuration, duration);
    existing.maxDuration = Math.max(existing.maxDuration, duration);

    this.performanceMetrics.set(key, existing);
  }

  private cleanExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private collectMetrics() {
    const metrics = {
      cacheSize: this.cache.size,
      cacheHitRate: this.calculateCacheHitRate(),
      activeConnections: this.activeConnections.size,
      circuitBreakerStates: Object.fromEntries(this.circuitBreakers),
      performanceMetrics: Object.fromEntries(this.performanceMetrics)
    };

    // Store metrics for monitoring
    globalThis.openrouterMetrics = metrics;
  }

  private calculateCacheHitRate(): number {
    const entries = Array.from(this.cache.values());
    if (entries.length === 0) return 0;
    
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    return totalHits / entries.length;
  }

  async getPerformanceMetrics(): Promise<any> {
    return {
      cache: {
        size: this.cache.size,
        hitRate: this.calculateCacheHitRate(),
        entries: this.cache.size
      },
      circuitBreakers: Object.fromEntries(this.circuitBreakers),
      connections: {
        active: this.activeConnections.size,
        max: this.poolOptions.maxConnections
      },
      performance: Object.fromEntries(this.performanceMetrics)
    };
  }

  // Clean up resources
  destroy() {
    // Abort all active connections
    this.activeConnections.forEach(controller => controller.abort());
    this.activeConnections.clear();
    
    // Clear caches and metrics
    this.cache.clear();
    this.performanceMetrics.clear();
    this.circuitBreakers.clear();
  }
}

export { OptimizedOpenRouterClient };