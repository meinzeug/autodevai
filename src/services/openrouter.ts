/**
 * OpenRouter API Integration
 * Handles multi-model AI orchestration for AutoDev-AI
 */

interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  fallbackModels: string[];
  timeout: number;
  retryAttempts: number;
}

interface ModelCapabilities {
  reasoning: number;
  coding: number;
  analysis: number;
  creativity: number;
  speed: number;
  cost: number;
}

interface TaskComplexity {
  computational: number;
  logical: number;
  creative: number;
  domain_specific: number;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost?: number;
}

class OpenRouterClient {
  private config: OpenRouterConfig;
  private modelCapabilities: Map<string, ModelCapabilities>;
  private performanceMetrics: Map<string, any>;

  constructor(config: OpenRouterConfig) {
    this.config = config;
    this.modelCapabilities = new Map();
    this.performanceMetrics = new Map();
    this.initializeModelCapabilities();
  }

  private initializeModelCapabilities() {
    // Claude models
    this.modelCapabilities.set('anthropic/claude-3.5-sonnet', {
      reasoning: 9.5,
      coding: 9.8,
      analysis: 9.6,
      creativity: 8.8,
      speed: 7.5,
      cost: 3.0
    });

    this.modelCapabilities.set('anthropic/claude-3-haiku', {
      reasoning: 8.5,
      coding: 8.7,
      analysis: 8.8,
      creativity: 7.5,
      speed: 9.5,
      cost: 9.0
    });

    // GPT models
    this.modelCapabilities.set('openai/gpt-4-turbo', {
      reasoning: 9.2,
      coding: 9.0,
      analysis: 9.3,
      creativity: 9.0,
      speed: 8.0,
      cost: 4.0
    });

    this.modelCapabilities.set('openai/gpt-3.5-turbo', {
      reasoning: 7.8,
      coding: 8.2,
      analysis: 8.0,
      creativity: 7.5,
      speed: 9.8,
      cost: 9.5
    });

    // Specialized models
    this.modelCapabilities.set('google/palm-2-codechat-bison', {
      reasoning: 8.0,
      coding: 9.5,
      analysis: 7.8,
      creativity: 6.5,
      speed: 8.5,
      cost: 7.0
    });

    this.modelCapabilities.set('meta-llama/codellama-34b-instruct', {
      reasoning: 7.5,
      coding: 9.8,
      analysis: 7.2,
      creativity: 6.0,
      speed: 8.8,
      cost: 8.0
    });
  }

  async selectOptimalModel(task: string, complexity: TaskComplexity, constraints: any = {}): Promise<string> {
    const taskVector = this.analyzeTaskRequirements(task, complexity);
    let bestModel = this.config.defaultModel;
    let bestScore = 0;

    for (const [model, capabilities] of this.modelCapabilities) {
      if (constraints.excludeModels?.includes(model)) continue;
      if (constraints.maxCost && capabilities.cost > constraints.maxCost) continue;
      if (constraints.minSpeed && capabilities.speed < constraints.minSpeed) continue;

      const score = this.calculateModelScore(taskVector, capabilities, constraints);
      
      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    }

    return bestModel;
  }

  private analyzeTaskRequirements(task: string, complexity: TaskComplexity) {
    // Advanced task analysis using keyword matching and complexity scoring
    const keywords = {
      reasoning: ['analyze', 'logic', 'reason', 'deduce', 'infer', 'conclude'],
      coding: ['code', 'implement', 'program', 'debug', 'refactor', 'optimize'],
      analysis: ['review', 'examine', 'assess', 'evaluate', 'study', 'investigate'],
      creativity: ['design', 'create', 'generate', 'invent', 'brainstorm', 'imagine']
    };

    const weights = {
      reasoning: 0,
      coding: 0,
      analysis: 0,
      creativity: 0
    };

    const taskLower = task.toLowerCase();
    
    for (const [category, terms] of Object.entries(keywords)) {
      weights[category as keyof typeof weights] = terms.reduce((count, term) => {
        return count + (taskLower.includes(term) ? 1 : 0);
      }, 0) / terms.length;
    }

    // Combine with complexity metrics
    return {
      reasoning: (weights.reasoning + complexity.logical) / 2,
      coding: (weights.coding + complexity.computational) / 2,
      analysis: (weights.analysis + complexity.domain_specific) / 2,
      creativity: (weights.creativity + complexity.creative) / 2
    };
  }

  private calculateModelScore(taskVector: any, capabilities: ModelCapabilities, constraints: any) {
    const taskWeight = constraints.prioritizeSpeed ? 0.3 : 0.1;
    const costWeight = constraints.optimizeCost ? 0.3 : 0.1;
    
    const performanceScore = 
      taskVector.reasoning * capabilities.reasoning +
      taskVector.coding * capabilities.coding +
      taskVector.analysis * capabilities.analysis +
      taskVector.creativity * capabilities.creativity;
    
    const speedScore = capabilities.speed * taskWeight;
    const costScore = capabilities.cost * costWeight;
    
    return performanceScore + speedScore + costScore;
  }

  async completion(params: {
    model?: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
    task_description?: string;
    complexity?: TaskComplexity;
    constraints?: any;
  }): Promise<OpenRouterResponse> {
    const model = params.model || await this.selectOptimalModel(
      params.task_description || '',
      params.complexity || { computational: 0.5, logical: 0.5, creative: 0.5, domain_specific: 0.5 },
      params.constraints
    );

    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/chat/completions', {
        model,
        messages: params.messages,
        temperature: params.temperature || 0.7,
        max_tokens: params.max_tokens || 4000
      });

      const endTime = Date.now();
      this.updatePerformanceMetrics(model, endTime - startTime, response);

      return response;
    } catch (error) {
      console.error(`OpenRouter API error with model ${model}:`, error);
      
      // Fallback to alternative models
      for (const fallbackModel of this.config.fallbackModels) {
        if (fallbackModel !== model) {
          try {
            console.log(`Falling back to model: ${fallbackModel}`);
            const fallbackResponse = await this.makeRequest('/chat/completions', {
              model: fallbackModel,
              messages: params.messages,
              temperature: params.temperature || 0.7,
              max_tokens: params.max_tokens || 4000
            });
            
            const endTime = Date.now();
            this.updatePerformanceMetrics(fallbackModel, endTime - startTime, fallbackResponse);
            
            return fallbackResponse;
          } catch (fallbackError) {
            console.error(`Fallback model ${fallbackModel} also failed:`, fallbackError);
          }
        }
      }
      
      throw error;
    }
  }

  private async makeRequest(endpoint: string, data: any): Promise<OpenRouterResponse> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://autodev-ai.github.io',
        'X-Title': 'AutoDev-AI Integration'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  private updatePerformanceMetrics(model: string, responseTime: number, response: OpenRouterResponse) {
    const existing = this.performanceMetrics.get(model) || {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      averageResponseTime: 0,
      successRate: 0
    };

    existing.totalRequests += 1;
    existing.totalTokens += response.usage?.total_tokens || 0;
    existing.totalCost += response.cost || 0;
    existing.averageResponseTime = (existing.averageResponseTime * (existing.totalRequests - 1) + responseTime) / existing.totalRequests;
    existing.successRate = existing.totalRequests > 0 ? (existing.totalRequests - 1) / existing.totalRequests : 1;

    this.performanceMetrics.set(model, existing);
  }

  async getModelPerformance(): Promise<Map<string, any>> {
    return new Map(this.performanceMetrics);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/models', {});
      return Array.isArray(response) || !!(response as any).data;
    } catch (error) {
      console.error('OpenRouter health check failed:', error);
      return false;
    }
  }

  async estimateCost(model: string, promptTokens: number, completionTokens: number): Promise<number> {
    // Implement cost estimation based on model pricing
    const pricing = {
      'anthropic/claude-3.5-sonnet': { input: 0.003, output: 0.015 },
      'anthropic/claude-3-haiku': { input: 0.00025, output: 0.00125 },
      'openai/gpt-4-turbo': { input: 0.01, output: 0.03 },
      'openai/gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
    };

    const modelPricing = pricing[model as keyof typeof pricing] || pricing['openai/gpt-3.5-turbo'];
    return (promptTokens * modelPricing.input + completionTokens * modelPricing.output) / 1000;
  }
}

export {
  OpenRouterClient
};

export type {
  OpenRouterConfig,
  OpenRouterResponse,
  ModelCapabilities,
  TaskComplexity
};