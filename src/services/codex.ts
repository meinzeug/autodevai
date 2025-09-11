/**
 * OpenAI Codex Integration
 * Specialized code generation and analysis using OpenAI models
 */

import { OpenRouterClient, TaskComplexity } from './openrouter';

interface CodexRequest {
  prompt: string;
  language: string;
  task_type: 'generation' | 'analysis' | 'completion' | 'debugging' | 'optimization';
  context?: string;
  max_tokens?: number;
  temperature?: number;
}

interface CodexResponse {
  code: string;
  explanation: string;
  suggestions: string[];
  confidence: number;
  model_used: string;
  metrics: {
    tokens_used: number;
    response_time: number;
    cost_estimate: number;
  };
}

interface CodeAnalysis {
  complexity_score: number;
  maintainability: number;
  security_score: number;
  performance_score: number;
  issues: Array<{
    type: 'error' | 'warning' | 'suggestion';
    message: string;
    line?: number;
    severity: number;
  }>;
  recommendations: string[];
}

interface CodeOptimization {
  original_code: string;
  optimized_code: string;
  improvements: Array<{
    type: 'performance' | 'readability' | 'security' | 'memory';
    description: string;
    impact: number;
  }>;
  performance_gain: number;
}

class CodexIntegration {
  private openRouterClient: OpenRouterClient;
  private codeHistory: Map<string, any>;
  private languageSpecialists: Map<string, string>;

  constructor(openRouterClient: OpenRouterClient) {
    this.openRouterClient = openRouterClient;
    this.codeHistory = new Map();
    this.languageSpecialists = new Map();
    this.initializeLanguageSpecialists();
  }

  private initializeLanguageSpecialists() {
    // Map programming languages to best models
    this.languageSpecialists.set('typescript', 'anthropic/claude-3.5-sonnet');
    this.languageSpecialists.set('javascript', 'anthropic/claude-3.5-sonnet');
    this.languageSpecialists.set('python', 'anthropic/claude-3.5-sonnet');
    this.languageSpecialists.set('rust', 'anthropic/claude-3.5-sonnet');
    this.languageSpecialists.set('go', 'openai/gpt-4-turbo');
    this.languageSpecialists.set('java', 'openai/gpt-4-turbo');
    this.languageSpecialists.set('cpp', 'meta-llama/codellama-34b-instruct');
    this.languageSpecialists.set('c', 'meta-llama/codellama-34b-instruct');
    this.languageSpecialists.set('sql', 'google/palm-2-codechat-bison');
    this.languageSpecialists.set('bash', 'anthropic/claude-3-haiku');
  }

  async generateCode(request: CodexRequest): Promise<CodexResponse> {
    const startTime = Date.now();
    const model = this.languageSpecialists.get(request.language.toLowerCase()) || 'anthropic/claude-3.5-sonnet';

    const systemPrompt = this.buildSystemPrompt(request.task_type, request.language);
    const userPrompt = this.buildUserPrompt(request);

    try {
      const response = await this.openRouterClient.completion({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: request.temperature || 0.3,
        max_tokens: request.max_tokens || 2000,
        task_description: `Code ${request.task_type} in ${request.language}`,
        complexity: this.assessCodeComplexity(request.prompt, request.language),
        constraints: {
          optimizeCost: false,
          prioritizeSpeed: request.task_type === 'completion'
        }
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const result = this.parseCodeResponse(response.choices[0].message.content);
      const costEstimate = await this.openRouterClient.estimateCost(
        model,
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0
      );

      const codexResponse: CodexResponse = {
        code: result.code,
        explanation: result.explanation,
        suggestions: result.suggestions,
        confidence: this.calculateConfidence(response, request),
        model_used: model,
        metrics: {
          tokens_used: response.usage?.total_tokens || 0,
          response_time: responseTime,
          cost_estimate: costEstimate
        }
      };

      // Store in history for learning
      this.codeHistory.set(`${Date.now()}_${request.language}_${request.task_type}`, {
        request,
        response: codexResponse,
        timestamp: new Date()
      });

      return codexResponse;
    } catch (error) {
      console.error('Codex generation error:', error);
      throw new Error(`Failed to generate ${request.language} code: ${(error as Error).message}`);
    }
  }

  private buildSystemPrompt(taskType: string, language: string): string {
    const basePrompt = `You are an expert ${language} developer with deep knowledge of best practices, performance optimization, and secure coding standards.`;

    const taskPrompts = {
      generation: `Generate clean, efficient, and well-documented ${language} code. Follow language-specific conventions and include error handling where appropriate.`,
      analysis: `Analyze the provided ${language} code for potential issues, optimizations, and improvements. Provide detailed feedback with specific recommendations.`,
      completion: `Complete the provided ${language} code snippet intelligently, maintaining consistency with existing patterns and style.`,
      debugging: `Debug the provided ${language} code by identifying issues and providing corrected versions with explanations.`,
      optimization: `Optimize the provided ${language} code for better performance, readability, and maintainability while preserving functionality.`
    };

    return `${basePrompt}\n\n${(taskPrompts as any)[taskType] || taskPrompts.generation}\n\nAlways respond with:
1. The requested code (properly formatted)
2. A clear explanation of what the code does
3. Suggestions for improvements or alternatives
4. Any potential issues or considerations`;
  }

  private buildUserPrompt(request: CodexRequest): string {
    let prompt = `Task: ${request.task_type}\nLanguage: ${request.language}\n\nPrompt: ${request.prompt}`;
    
    if (request.context) {
      prompt += `\n\nContext: ${request.context}`;
    }

    prompt += '\n\nPlease provide the complete response with code, explanation, and suggestions.';
    
    return prompt;
  }

  private assessCodeComplexity(prompt: string, language: string): TaskComplexity {
    const complexityIndicators = {
      high: ['algorithm', 'optimization', 'concurrent', 'async', 'parallel', 'distributed', 'database', 'security'],
      medium: ['class', 'interface', 'function', 'method', 'api', 'integration', 'testing'],
      low: ['variable', 'simple', 'basic', 'hello', 'example', 'tutorial']
    };

    const promptLower = prompt.toLowerCase();
    let score = 0.5; // Default medium complexity

    if (complexityIndicators.high.some(indicator => promptLower.includes(indicator))) {
      score += 0.3;
    }
    if (complexityIndicators.medium.some(indicator => promptLower.includes(indicator))) {
      score += 0.1;
    }
    if (complexityIndicators.low.some(indicator => promptLower.includes(indicator))) {
      score -= 0.2;
    }

    // Language-specific complexity adjustments
    const languageComplexity = {
      'cpp': 0.2,
      'rust': 0.2,
      'assembly': 0.3,
      'python': -0.1,
      'javascript': -0.1,
      'go': 0.1
    };

    score += (languageComplexity as any)[language.toLowerCase()] || 0;
    score = Math.max(0.1, Math.min(1.0, score));

    return {
      computational: score,
      logical: score,
      creative: score * 0.8,
      domain_specific: score * 1.2
    };
  }

  private parseCodeResponse(response: string): { code: string; explanation: string; suggestions: string[] } {
    // Parse the structured response from the AI model
    const sections = {
      code: '',
      explanation: '',
      suggestions: [] as string[]
    };

    // Extract code blocks
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/g;
    const codeMatches = response.match(codeBlockRegex);
    if (codeMatches && codeMatches.length > 0) {
      sections.code = codeMatches[0].replace(/```[\w]*\n/, '').replace(/\n```$/, '');
    }

    // Extract explanation (text before "Suggestions:" or similar)
    const explanationMatch = response.match(/explanation[:\s]*([\s\S]*?)(?:suggestions?[:\s]|$)/i);
    if (explanationMatch) {
      sections.explanation = explanationMatch[1].trim();
    }

    // Extract suggestions
    const suggestionsMatch = response.match(/suggestions?[:\s]*([\s\S]*)/i);
    if (suggestionsMatch) {
      const suggestionText = suggestionsMatch[1];
      sections.suggestions = suggestionText
        .split(/\n/)
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^[-\s*]+/, '').trim())
        .filter(line => line.length > 0);
    }

    return sections;
  }

  private calculateConfidence(response: any, request: CodexRequest): number {
    let confidence = 0.7; // Base confidence

    // Model-specific confidence adjustments
    if (response.model?.includes('claude-3.5-sonnet')) confidence += 0.2;
    if (response.model?.includes('gpt-4')) confidence += 0.15;
    if (response.model?.includes('codellama')) confidence += 0.1;

    // Task-specific adjustments
    if (request.task_type === 'completion') confidence += 0.1;
    if (request.task_type === 'debugging') confidence -= 0.1;

    // Token usage as quality indicator
    const tokenRatio = (response.usage?.completion_tokens || 0) / (response.usage?.prompt_tokens || 1);
    if (tokenRatio > 0.5 && tokenRatio < 3) confidence += 0.05;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  async analyzeCode(code: string, language: string): Promise<CodeAnalysis> {
    const analysisPrompt = `Analyze this ${language} code for:
1. Complexity score (0-10)
2. Maintainability score (0-10)
3. Security score (0-10)
4. Performance score (0-10)
5. Issues and recommendations

Code:
\`\`\`${language}
${code}
\`\`\`

Provide detailed analysis with specific line numbers where applicable.`;

    const response = await this.openRouterClient.completion({
      messages: [
        {
          role: 'system',
          content: `You are a senior code reviewer specializing in ${language}. Provide detailed, actionable feedback.`
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      task_description: `Code analysis for ${language}`,
      complexity: { computational: 0.7, logical: 0.8, creative: 0.3, domain_specific: 0.9 }
    });

    return this.parseAnalysisResponse(response.choices[0].message.content);
  }

  private parseAnalysisResponse(response: string): CodeAnalysis {
    // Extract scores using regex patterns
    const extractScore = (metric: string): number => {
      const regex = new RegExp(`${metric}[:\\s]+([0-9.]+)`, 'i');
      const match = response.match(regex);
      return match ? parseFloat(match[1]) : 5.0;
    };

    const complexity_score = extractScore('complexity');
    const maintainability = extractScore('maintainability');
    const security_score = extractScore('security');
    const performance_score = extractScore('performance');

    // Extract issues
    const issues: Array<{type: 'error' | 'warning' | 'suggestion'; message: string; severity: number}> = [];
    const issuePatterns = [
      /error[:\s]*(.*)/gi,
      /warning[:\s]*(.*)/gi,
      /issue[:\s]*(.*)/gi
    ];

    issuePatterns.forEach((pattern, index) => {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        issues.push({
          type: ['error', 'warning', 'suggestion'][index] as 'error' | 'warning' | 'suggestion',
          message: match[1].trim(),
          severity: index + 1
        });
      }
    });

    // Extract recommendations
    const recMatch = response.match(/recommendations?[:\s]*([\s\S]*)/i);
    const recommendations = recMatch 
      ? recMatch[1].split('\n').filter(r => r.trim().length > 0).map(r => r.trim())
      : [];

    return {
      complexity_score,
      maintainability,
      security_score,
      performance_score,
      issues,
      recommendations
    };
  }

  async optimizeCode(code: string, language: string, focusAreas: string[] = ['performance', 'readability']): Promise<CodeOptimization> {
    const optimizationPrompt = `Optimize this ${language} code focusing on: ${focusAreas.join(', ')}

Original code:
\`\`\`${language}
${code}
\`\`\`

Provide:
1. Optimized version of the code
2. List of specific improvements made
3. Expected performance gain percentage
4. Explanation of changes`;

    const response = await this.openRouterClient.completion({
      messages: [
        {
          role: 'system',
          content: `You are an expert ${language} performance engineer. Optimize code while maintaining functionality and improving specified aspects.`
        },
        {
          role: 'user',
          content: optimizationPrompt
        }
      ],
      task_description: `Code optimization for ${language}`,
      complexity: { computational: 0.8, logical: 0.7, creative: 0.6, domain_specific: 0.9 }
    });

    return this.parseOptimizationResponse(response.choices[0].message.content, code);
  }

  private parseOptimizationResponse(response: string, originalCode: string): CodeOptimization {
    // Extract optimized code
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/g;
    const codeMatches = response.match(codeBlockRegex);
    const optimized_code = codeMatches && codeMatches.length > 0 
      ? codeMatches[0].replace(/```[\w]*\n/, '').replace(/\n```$/, '')
      : originalCode;

    // Extract improvements
    const improvements: Array<{type: 'performance' | 'readability' | 'security' | 'memory'; description: string; impact: number}> = [];
    const improvementPatterns = [
      /performance[:\s]*(.*)/gi,
      /readability[:\s]*(.*)/gi,
      /security[:\s]*(.*)/gi,
      /memory[:\s]*(.*)/gi
    ];

    const improvementTypes = ['performance', 'readability', 'security', 'memory'];
    improvementPatterns.forEach((pattern, index) => {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        improvements.push({
          type: improvementTypes[index] as 'performance' | 'readability' | 'security' | 'memory',
          description: match[1].trim(),
          impact: Math.random() * 5 + 1 // Placeholder - in reality would be calculated
        });
      }
    });

    // Extract performance gain
    const gainMatch = response.match(/(?:gain|improvement)[:\s]*([0-9.]+)%?/i);
    const performance_gain = gainMatch ? parseFloat(gainMatch[1]) : 10;

    return {
      original_code: originalCode,
      optimized_code,
      improvements,
      performance_gain
    };
  }

  async debugCode(code: string, language: string, error_message?: string): Promise<CodexResponse> {
    const debugPrompt = `Debug this ${language} code${error_message ? ` that produces the error: "${error_message}"` : ''}:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. Corrected code
2. Explanation of the bug(s) found
3. Prevention suggestions for similar issues`;

    return this.generateCode({
      prompt: debugPrompt,
      language,
      task_type: 'debugging',
      context: error_message,
      temperature: 0.2 // Lower temperature for debugging
    });
  }

  async completeCode(partialCode: string, language: string, intent?: string): Promise<CodexResponse> {
    const completionPrompt = `Complete this ${language} code${intent ? ` to ${intent}` : ''}:

\`\`\`${language}
${partialCode}
\`\`\`

Continue the code naturally, maintaining style and patterns.`;

    return this.generateCode({
      prompt: completionPrompt,
      language,
      task_type: 'completion',
      context: intent,
      temperature: 0.4,
      max_tokens: 1000
    });
  }

  async getCodeHistory(language?: string, taskType?: string): Promise<any[]> {
    const entries = Array.from(this.codeHistory.values());
    
    return entries.filter(entry => {
      if (language && entry.request.language.toLowerCase() !== language.toLowerCase()) return false;
      if (taskType && entry.request.task_type !== taskType) return false;
      return true;
    });
  }

  async getLanguageStatistics(): Promise<Map<string, any>> {
    const stats = new Map();
    
    for (const entry of this.codeHistory.values()) {
      const lang = entry.request.language.toLowerCase();
      const existing = stats.get(lang) || {
        requests: 0,
        averageConfidence: 0,
        averageResponseTime: 0,
        totalTokens: 0,
        taskTypes: new Set()
      };
      
      existing.requests += 1;
      existing.averageConfidence = (existing.averageConfidence * (existing.requests - 1) + entry.response.confidence) / existing.requests;
      existing.averageResponseTime = (existing.averageResponseTime * (existing.requests - 1) + entry.response.metrics.response_time) / existing.requests;
      existing.totalTokens += entry.response.metrics.tokens_used;
      existing.taskTypes.add(entry.request.task_type);
      
      stats.set(lang, existing);
    }
    
    return stats;
  }
}

export {
  CodexIntegration
};

export type {
  CodexRequest,
  CodexResponse,
  CodeAnalysis,
  CodeOptimization
};