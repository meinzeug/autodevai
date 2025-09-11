//! OpenRouter Multi-Model Intelligent Routing System
//! 
//! Implements intelligent routing across multiple AI models via OpenRouter,
//! with cost optimization, performance tracking, and automatic fallback.

use super::*;
use crate::api::{ApiClient, ApiConfig};
use anyhow::{anyhow, Result};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime};
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};

/// OpenRouter integration service
#[derive(Debug, Clone)]
pub struct OpenRouterService {
    client: reqwest::Client,
    api_key: Option<String>,
    base_url: String,
    model_cache: Arc<RwLock<HashMap<String, ModelRoutingInfo>>>,
    performance_history: Arc<RwLock<HashMap<String, Vec<PerformanceEntry>>>>,
    circuit_breakers: Arc<RwLock<HashMap<String, CircuitBreaker>>>,
}

#[derive(Debug, Clone)]
struct PerformanceEntry {
    timestamp: SystemTime,
    response_time: Duration,
    success: bool,
    cost: f64,
    tokens: u32,
}

#[derive(Debug, Clone)]
struct CircuitBreaker {
    failure_count: u32,
    last_failure: SystemTime,
    state: CircuitBreakerState,
    threshold: u32,
}

#[derive(Debug, Clone, PartialEq)]
enum CircuitBreakerState {
    Closed,
    Open,
    HalfOpen,
}

impl OpenRouterService {
    /// Create a new OpenRouter service
    pub fn new(api_key: Option<String>) -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(60))
            .build()
            .unwrap_or_default();

        Self {
            client,
            api_key,
            base_url: "https://openrouter.ai/api/v1".to_string(),
            model_cache: Arc::new(RwLock::new(HashMap::new())),
            performance_history: Arc::new(RwLock::new(HashMap::new())),
            circuit_breakers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Initialize available models and their capabilities
    pub async fn initialize_models(&self) -> Result<()> {
        info!("Initializing OpenRouter models and capabilities");

        if self.api_key.is_none() {
            warn!("OpenRouter API key not provided - running in fallback mode");
            return self.initialize_fallback_models();
        }

        let models = self.fetch_available_models().await?;
        let mut model_cache = self.model_cache.write().await;

        for model in models {
            let routing_info = ModelRoutingInfo {
                model_id: model["id"].as_str().unwrap_or("unknown").to_string(),
                provider: model["provider"].as_str().unwrap_or("unknown").to_string(),
                cost_per_token: model["pricing"]["prompt"].as_f64().unwrap_or(0.0),
                avg_response_time_ms: 5000, // Initial estimate
                success_rate: 0.95, // Initial estimate
                context_window: model["context_length"].as_u64().unwrap_or(4096) as u32,
                capabilities: self.extract_capabilities(&model),
            };

            model_cache.insert(routing_info.model_id.clone(), routing_info);
        }

        info!("Initialized {} models from OpenRouter", model_cache.len());
        Ok(())
    }

    /// Fetch available models from OpenRouter API
    async fn fetch_available_models(&self) -> Result<Vec<Value>> {
        let mut headers = HeaderMap::new();
        if let Some(api_key) = &self.api_key {
            headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {}", api_key))?);
        }

        let response = self.client
            .get(&format!("{}/models", self.base_url))
            .headers(headers)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch models: {}", response.status()));
        }

        let data: Value = response.json().await?;
        Ok(data["data"].as_array().unwrap_or(&vec![]).clone())
    }

    /// Initialize fallback models when API key is not available
    fn initialize_fallback_models(&self) -> Result<()> {
        tokio::spawn({
            let model_cache = self.model_cache.clone();
            async move {
                let mut cache = model_cache.write().await;
                
                // Add common model configurations as fallback
                let fallback_models = vec![
                    ModelRoutingInfo {
                        model_id: "claude-3.5-sonnet".to_string(),
                        provider: "anthropic".to_string(),
                        cost_per_token: 0.000003,
                        avg_response_time_ms: 3000,
                        success_rate: 0.98,
                        context_window: 200000,
                        capabilities: vec![
                            ModelCapability::CodeGeneration,
                            ModelCapability::TextGeneration,
                            ModelCapability::Analysis,
                            ModelCapability::Reasoning,
                        ],
                    },
                    ModelRoutingInfo {
                        model_id: "gpt-4o".to_string(),
                        provider: "openai".to_string(),
                        cost_per_token: 0.000005,
                        avg_response_time_ms: 4000,
                        success_rate: 0.97,
                        context_window: 128000,
                        capabilities: vec![
                            ModelCapability::CodeGeneration,
                            ModelCapability::TextGeneration,
                            ModelCapability::Analysis,
                            ModelCapability::Vision,
                            ModelCapability::FunctionCalling,
                        ],
                    },
                    ModelRoutingInfo {
                        model_id: "gemini-1.5-pro".to_string(),
                        provider: "google".to_string(),
                        cost_per_token: 0.000001,
                        avg_response_time_ms: 5000,
                        success_rate: 0.95,
                        context_window: 1000000,
                        capabilities: vec![
                            ModelCapability::CodeGeneration,
                            ModelCapability::TextGeneration,
                            ModelCapability::Analysis,
                            ModelCapability::Vision,
                        ],
                    },
                ];

                for model in fallback_models {
                    cache.insert(model.model_id.clone(), model);
                }
            }
        });

        Ok(())
    }

    /// Extract model capabilities from OpenRouter model data
    fn extract_capabilities(&self, model: &Value) -> Vec<ModelCapability> {
        let mut capabilities = vec![
            ModelCapability::TextGeneration,
            ModelCapability::Analysis,
        ];

        if let Some(name) = model["id"].as_str() {
            if name.contains("code") || name.contains("claude") || name.contains("gpt-4") {
                capabilities.push(ModelCapability::CodeGeneration);
                capabilities.push(ModelCapability::Reasoning);
            }
            if name.contains("vision") || name.contains("gpt-4o") || name.contains("gemini") {
                capabilities.push(ModelCapability::Vision);
            }
            if name.contains("gpt-4") {
                capabilities.push(ModelCapability::FunctionCalling);
            }
        }

        capabilities
    }

    /// Intelligently route request to optimal model
    pub async fn route_request(&self, request: &AdvancedExecutionRequest) -> Result<ModelRoutingResult> {
        let start_time = Instant::now();
        info!("Starting intelligent model routing for request: {}", request.base_request.id);

        let model_cache = self.model_cache.read().await;
        let available_models: Vec<_> = model_cache.values().collect();

        if available_models.is_empty() {
            return Err(anyhow!("No models available for routing"));
        }

        let selected_model = self.select_optimal_model(&available_models, request).await?;
        let routing_time = start_time.elapsed();

        debug!(
            "Selected model '{}' for routing in {}ms",
            selected_model.model_id,
            routing_time.as_millis()
        );

        Ok(ModelRoutingResult {
            selected_model: selected_model.model_id.clone(),
            routing_reason: self.explain_routing_decision(selected_model, request),
            alternatives_considered: available_models
                .iter()
                .filter(|m| m.model_id != selected_model.model_id)
                .take(3)
                .map(|m| m.model_id.clone())
                .collect(),
            routing_time_ms: routing_time.as_millis() as u64,
        })
    }

    /// Select the optimal model based on request requirements and historical data
    async fn select_optimal_model(
        &self,
        available_models: &[&ModelRoutingInfo],
        request: &AdvancedExecutionRequest,
    ) -> Result<&ModelRoutingInfo> {
        let mut scored_models = Vec::new();

        for model in available_models {
            // Skip models that are circuit broken
            if self.is_circuit_broken(&model.model_id).await {
                continue;
            }

            let score = self.calculate_model_score(model, request).await;
            scored_models.push((model, score));
        }

        // Sort by score (highest first)
        scored_models.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        if let Some((best_model, _score)) = scored_models.first() {
            Ok(*best_model)
        } else {
            Err(anyhow!("No suitable model found for request"))
        }
    }

    /// Calculate a score for a model based on request requirements
    async fn calculate_model_score(&self, model: &ModelRoutingInfo, request: &AdvancedExecutionRequest) -> f64 {
        let mut score = 100.0; // Base score

        // Quality preference scoring
        match request.routing_preferences.quality_preference {
            QualityPreference::Speed => {
                score += (5000.0 - model.avg_response_time_ms as f64) / 100.0;
            }
            QualityPreference::Accuracy => {
                score += model.success_rate * 50.0;
            }
            QualityPreference::Cost => {
                score += (0.001 - model.cost_per_token) * 10000.0;
            }
            QualityPreference::Balanced => {
                score += model.success_rate * 25.0;
                score += (5000.0 - model.avg_response_time_ms as f64) / 200.0;
                score += (0.001 - model.cost_per_token) * 5000.0;
            }
        }

        // Preferred models bonus
        if request.routing_preferences.preferred_models.contains(&model.model_id) {
            score += 20.0;
        }

        // Avoided models penalty
        if request.routing_preferences.avoid_models.contains(&model.model_id) {
            score -= 50.0;
        }

        // Cost limit constraint
        if let Some(cost_limit) = request.routing_preferences.cost_limit {
            if model.cost_per_token > cost_limit {
                score -= 100.0;
            }
        }

        // Latency requirement
        if let Some(latency_req) = request.routing_preferences.latency_requirement {
            if Duration::from_millis(model.avg_response_time_ms) > latency_req {
                score -= 30.0;
            }
        }

        // Historical performance bonus
        let perf_history = self.performance_history.read().await;
        if let Some(history) = perf_history.get(&model.model_id) {
            let recent_success_rate = self.calculate_recent_success_rate(history);
            score += (recent_success_rate - 0.5) * 20.0;
        }

        score.max(0.0)
    }

    /// Calculate recent success rate from performance history
    fn calculate_recent_success_rate(&self, history: &[PerformanceEntry]) -> f64 {
        let recent_cutoff = SystemTime::now() - Duration::from_hours(1);
        let recent_entries: Vec<_> = history
            .iter()
            .filter(|entry| entry.timestamp > recent_cutoff)
            .collect();

        if recent_entries.is_empty() {
            return 0.95; // Default assumption
        }

        let successful = recent_entries.iter().filter(|entry| entry.success).count();
        successful as f64 / recent_entries.len() as f64
    }

    /// Check if model is circuit broken
    async fn is_circuit_broken(&self, model_id: &str) -> bool {
        let breakers = self.circuit_breakers.read().await;
        if let Some(breaker) = breakers.get(model_id) {
            match breaker.state {
                CircuitBreakerState::Open => {
                    // Check if enough time has passed to try half-open
                    let elapsed = SystemTime::now()
                        .duration_since(breaker.last_failure)
                        .unwrap_or(Duration::ZERO);
                    
                    elapsed < Duration::from_mins(5) // 5-minute cooldown
                }
                _ => false,
            }
        } else {
            false
        }
    }

    /// Execute request via OpenRouter
    pub async fn execute_request(
        &self,
        model_id: &str,
        request: &AdvancedExecutionRequest,
    ) -> Result<AdvancedExecutionResponse> {
        let start_time = Instant::now();
        info!("Executing request via OpenRouter model: {}", model_id);

        let result = self.send_openrouter_request(model_id, request).await;
        let total_time = start_time.elapsed();

        // Record performance metrics
        self.record_performance(model_id, &result, total_time).await;

        // Handle circuit breaker logic
        if result.is_err() {
            self.handle_failure(model_id).await;
        } else {
            self.handle_success(model_id).await;
        }

        match result {
            Ok(response) => Ok(response),
            Err(e) => {
                // Attempt fallback if enabled
                if request.recovery_options.fallback_models.len() > 0 {
                    self.attempt_fallback(request, e).await
                } else {
                    Err(e)
                }
            }
        }
    }

    /// Send request to OpenRouter API
    async fn send_openrouter_request(
        &self,
        model_id: &str,
        request: &AdvancedExecutionRequest,
    ) -> Result<AdvancedExecutionResponse> {
        let mut headers = HeaderMap::new();
        if let Some(api_key) = &self.api_key {
            headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {}", api_key))?);
        }
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

        let payload = json!({
            "model": model_id,
            "messages": [{
                "role": "user",
                "content": request.base_request.prompt
            }],
            "temperature": request.base_request.temperature.unwrap_or(0.7),
            "max_tokens": 4000,
            "stream": false
        });

        let queue_start = Instant::now();
        let response = self.client
            .post(&format!("{}/chat/completions", self.base_url))
            .headers(headers)
            .json(&payload)
            .send()
            .await?;

        let queue_time = queue_start.elapsed();
        let processing_start = Instant::now();

        if !response.status().is_success() {
            return Err(anyhow!("OpenRouter request failed: {}", response.status()));
        }

        let response_data: Value = response.json().await?;
        let processing_time = processing_start.elapsed();

        // Extract response content
        let content = response_data["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("No content")
            .to_string();

        // Extract token usage
        let usage = &response_data["usage"];
        let token_usage = TokenUsage {
            input_tokens: usage["prompt_tokens"].as_u64().unwrap_or(0),
            output_tokens: usage["completion_tokens"].as_u64().unwrap_or(0),
            total_tokens: usage["total_tokens"].as_u64().unwrap_or(0),
        };

        // Build enhanced response
        let base_response = ExecutionResponse {
            id: request.base_request.id.clone(),
            result: Some(content),
            success: true,
            execution_time: (queue_time + processing_time).as_millis() as u64,
            error: None,
            metadata: Some(json!({
                "model": model_id,
                "provider": "openrouter",
                "timestamp": chrono::Utc::now().to_rfc3339()
            })),
            swarm_metrics: None,
            memory_operations: Vec::new(),
        };

        let performance_data = ResponsePerformanceData {
            queue_time_ms: queue_time.as_millis() as u64,
            processing_time_ms: processing_time.as_millis() as u64,
            total_time_ms: (queue_time + processing_time).as_millis() as u64,
            tokens_processed: token_usage.clone(),
            throughput_tokens_per_second: if processing_time.as_secs_f64() > 0.0 {
                token_usage.output_tokens as f64 / processing_time.as_secs_f64()
            } else {
                0.0
            },
        };

        let cost_breakdown = self.calculate_cost_breakdown(model_id, &token_usage).await;

        Ok(AdvancedExecutionResponse {
            base_response,
            routing_info: ModelRoutingResult {
                selected_model: model_id.to_string(),
                routing_reason: "Direct execution".to_string(),
                alternatives_considered: Vec::new(),
                routing_time_ms: 0,
            },
            performance_data,
            cost_breakdown,
            recovery_actions: Vec::new(),
        })
    }

    /// Calculate cost breakdown for request
    async fn calculate_cost_breakdown(&self, model_id: &str, token_usage: &TokenUsage) -> CostBreakdown {
        let model_cache = self.model_cache.read().await;
        let cost_per_token = model_cache
            .get(model_id)
            .map(|m| m.cost_per_token)
            .unwrap_or(0.000001);

        let model_cost = (token_usage.input_tokens + token_usage.output_tokens) as f64 * cost_per_token;
        let infrastructure_cost = model_cost * 0.1; // 10% overhead estimate
        let coordination_cost = 0.001; // Fixed small coordination cost

        CostBreakdown {
            model_cost,
            infrastructure_cost,
            coordination_cost,
            total_cost: model_cost + infrastructure_cost + coordination_cost,
            cost_efficiency_score: if model_cost > 0.0 { 1.0 / model_cost } else { 1.0 },
        }
    }

    /// Record performance metrics for a model
    async fn record_performance(&self, model_id: &str, result: &Result<AdvancedExecutionResponse>, duration: Duration) {
        let mut history = self.performance_history.write().await;
        let entries = history.entry(model_id.to_string()).or_insert_with(Vec::new);

        let entry = PerformanceEntry {
            timestamp: SystemTime::now(),
            response_time: duration,
            success: result.is_ok(),
            cost: result.as_ref().map(|r| r.cost_breakdown.total_cost).unwrap_or(0.0),
            tokens: result.as_ref()
                .map(|r| r.performance_data.tokens_processed.total_tokens as u32)
                .unwrap_or(0),
        };

        entries.push(entry);

        // Keep only recent entries (last 1000)
        if entries.len() > 1000 {
            entries.drain(0..entries.len() - 1000);
        }
    }

    /// Handle model failure for circuit breaker
    async fn handle_failure(&self, model_id: &str) {
        let mut breakers = self.circuit_breakers.write().await;
        let breaker = breakers.entry(model_id.to_string()).or_insert_with(|| CircuitBreaker {
            failure_count: 0,
            last_failure: SystemTime::now(),
            state: CircuitBreakerState::Closed,
            threshold: 5,
        });

        breaker.failure_count += 1;
        breaker.last_failure = SystemTime::now();

        if breaker.failure_count >= breaker.threshold {
            breaker.state = CircuitBreakerState::Open;
            warn!("Circuit breaker opened for model: {}", model_id);
        }
    }

    /// Handle model success for circuit breaker
    async fn handle_success(&self, model_id: &str) {
        let mut breakers = self.circuit_breakers.write().await;
        if let Some(breaker) = breakers.get_mut(model_id) {
            breaker.failure_count = 0;
            breaker.state = CircuitBreakerState::Closed;
        }
    }

    /// Attempt fallback execution
    async fn attempt_fallback(
        &self,
        request: &AdvancedExecutionRequest,
        original_error: anyhow::Error,
    ) -> Result<AdvancedExecutionResponse> {
        warn!("Attempting fallback execution due to error: {}", original_error);

        for fallback_model in &request.recovery_options.fallback_models {
            if !self.is_circuit_broken(fallback_model).await {
                match self.send_openrouter_request(fallback_model, request).await {
                    Ok(mut response) => {
                        response.recovery_actions.push(RecoveryAction {
                            action_type: RecoveryActionType::ModelFallback,
                            timestamp: SystemTime::now(),
                            reason: format!("Fallback to {} due to: {}", fallback_model, original_error),
                            success: true,
                        });
                        return Ok(response);
                    }
                    Err(e) => {
                        warn!("Fallback to {} also failed: {}", fallback_model, e);
                        continue;
                    }
                }
            }
        }

        Err(anyhow!("All fallback attempts failed. Original error: {}", original_error))
    }

    /// Explain routing decision for observability
    fn explain_routing_decision(&self, selected_model: &ModelRoutingInfo, request: &AdvancedExecutionRequest) -> String {
        match request.routing_preferences.quality_preference {
            QualityPreference::Speed => format!(
                "Selected {} for speed optimization ({}ms avg response time)",
                selected_model.model_id, selected_model.avg_response_time_ms
            ),
            QualityPreference::Accuracy => format!(
                "Selected {} for accuracy ({:.1}% success rate)",
                selected_model.model_id, selected_model.success_rate * 100.0
            ),
            QualityPreference::Cost => format!(
                "Selected {} for cost optimization (${:.6} per token)",
                selected_model.model_id, selected_model.cost_per_token
            ),
            QualityPreference::Balanced => format!(
                "Selected {} for balanced performance (cost: ${:.6}/token, speed: {}ms, accuracy: {:.1}%)",
                selected_model.model_id,
                selected_model.cost_per_token,
                selected_model.avg_response_time_ms,
                selected_model.success_rate * 100.0
            ),
        }
    }

    /// Get current performance metrics
    pub async fn get_performance_metrics(&self) -> EnhancedPerformanceMetrics {
        let history = self.performance_history.read().await;
        let mut all_entries = Vec::new();

        for entries in history.values() {
            all_entries.extend(entries.iter());
        }

        // Calculate aggregate metrics
        let total_requests = all_entries.len() as u64;
        let successful_requests = all_entries.iter().filter(|e| e.success).count() as u64;
        let failed_requests = total_requests - successful_requests;

        let response_times: Vec<_> = all_entries.iter().map(|e| e.response_time).collect();
        let avg_response_time = if response_times.is_empty() {
            Duration::ZERO
        } else {
            Duration::from_nanos(
                response_times.iter().map(|d| d.as_nanos() as u64).sum::<u64>() / response_times.len() as u64
            )
        };

        let execution_metrics = ExecutionMetrics {
            total_requests,
            successful_requests,
            failed_requests,
            avg_response_time,
            p95_response_time: self.calculate_percentile(&response_times, 0.95),
            p99_response_time: self.calculate_percentile(&response_times, 0.99),
        };

        let total_cost: f64 = all_entries.iter().map(|e| e.cost).sum();
        let total_tokens: u64 = all_entries.iter().map(|e| e.tokens as u64).sum();

        let cost_metrics = CostMetrics {
            total_cost_usd: total_cost,
            cost_per_request: if total_requests > 0 { total_cost / total_requests as f64 } else { 0.0 },
            token_usage: TokenUsage {
                input_tokens: total_tokens / 2, // Rough estimate
                output_tokens: total_tokens / 2,
                total_tokens,
            },
            model_costs: HashMap::new(), // Would need more detailed tracking
        };

        let success_rate = if total_requests > 0 {
            successful_requests as f64 / total_requests as f64
        } else {
            0.0
        };

        let quality_metrics = QualityMetrics {
            success_rate,
            user_satisfaction_score: success_rate * 5.0, // Rough proxy
            error_distribution: HashMap::new(), // Would need error categorization
            performance_trend: TrendDirection::Unknown, // Would need time series analysis
        };

        EnhancedPerformanceMetrics {
            execution_metrics,
            cost_metrics,
            quality_metrics,
            resource_metrics: ResourceMetrics {
                memory_usage_mb: 0.0,
                cpu_usage_percentage: 0.0,
                network_io_kb: 0.0,
                active_connections: 0,
            },
            coordination_metrics: CoordinationMetrics {
                active_agents: 0,
                coordination_efficiency: 0.0,
                swarm_intelligence_score: 0.0,
                consensus_time_ms: 0,
            },
        }
    }

    /// Calculate percentile from durations
    fn calculate_percentile(&self, durations: &[Duration], percentile: f64) -> Duration {
        if durations.is_empty() {
            return Duration::ZERO;
        }

        let mut sorted: Vec<_> = durations.iter().cloned().collect();
        sorted.sort();

        let index = (percentile * (sorted.len() - 1) as f64).round() as usize;
        sorted.get(index).cloned().unwrap_or(Duration::ZERO)
    }

    /// Health check for OpenRouter service
    pub async fn health_check(&self) -> Result<bool> {
        if self.api_key.is_none() {
            return Ok(true); // Fallback mode is healthy
        }

        let response = self.client
            .get(&format!("{}/models", self.base_url))
            .timeout(Duration::from_secs(5))
            .send()
            .await?;

        Ok(response.status().is_success())
    }
}

impl Default for OpenRouterService {
    fn default() -> Self {
        Self::new(std::env::var("OPENROUTER_API_KEY").ok())
    }
}