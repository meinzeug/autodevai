//! Optimized Orchestration Service
//! 
//! Performance-optimized version of the orchestration service with:
//! - Connection pooling and reuse
//! - Async batch processing
//! - Memory-efficient data structures
//! - Circuit breaker patterns
//! - Performance metrics collection

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime};
use tokio::sync::{mpsc, RwLock, Semaphore};
use tokio::time::timeout;
use serde::{Deserialize, Serialize};
use anyhow::{Result, anyhow};
use dashmap::DashMap;
use parking_lot::Mutex;
use futures::future::join_all;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizedExecutionRequest {
    pub id: String,
    pub command: String,
    pub prompt: String,
    pub language: Option<String>,
    pub context: Option<String>,
    pub temperature: Option<f32>,
    pub priority: RequestPriority,
    pub timeout_ms: Option<u64>,
    pub cache_enabled: bool,
    pub batch_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RequestPriority {
    Low,
    Medium, 
    High,
    Critical,
}

#[derive(Debug, Clone)]
pub struct ConnectionPool {
    max_connections: usize,
    active_connections: Arc<Semaphore>,
    connection_count: Arc<Mutex<usize>>,
    connection_timeout: Duration,
}

impl ConnectionPool {
    pub fn new(max_connections: usize) -> Self {
        Self {
            max_connections,
            active_connections: Arc::new(Semaphore::new(max_connections)),
            connection_count: Arc::new(Mutex::new(0)),
            connection_timeout: Duration::from_secs(30),
        }
    }

    pub async fn acquire(&self) -> Result<ConnectionGuard> {
        let permit = timeout(self.connection_timeout, self.active_connections.acquire())
            .await
            .map_err(|_| anyhow!("Connection pool timeout"))?
            .map_err(|_| anyhow!("Failed to acquire connection"))?;

        {
            let mut count = self.connection_count.lock();
            *count += 1;
        }

        Ok(ConnectionGuard {
            _permit: permit,
            pool: self.clone(),
        })
    }

    pub fn active_count(&self) -> usize {
        *self.connection_count.lock()
    }
}

pub struct ConnectionGuard {
    _permit: tokio::sync::SemaphorePermit<'static>,
    pool: ConnectionPool,
}

impl Drop for ConnectionGuard {
    fn drop(&mut self) {
        let mut count = self.pool.connection_count.lock();
        *count = count.saturating_sub(1);
    }
}

#[derive(Debug, Clone)]
pub struct CircuitBreaker {
    failure_threshold: usize,
    recovery_timeout: Duration,
    failure_count: Arc<Mutex<usize>>,
    last_failure: Arc<Mutex<Option<Instant>>>,
    state: Arc<Mutex<CircuitBreakerState>>,
}

#[derive(Debug, Clone, PartialEq)]
enum CircuitBreakerState {
    Closed,
    Open,
    HalfOpen,
}

impl CircuitBreaker {
    pub fn new(failure_threshold: usize, recovery_timeout: Duration) -> Self {
        Self {
            failure_threshold,
            recovery_timeout,
            failure_count: Arc::new(Mutex::new(0)),
            last_failure: Arc::new(Mutex::new(None)),
            state: Arc::new(Mutex::new(CircuitBreakerState::Closed)),
        }
    }

    pub fn can_execute(&self) -> bool {
        let mut state = self.state.lock();
        
        match *state {
            CircuitBreakerState::Closed => true,
            CircuitBreakerState::Open => {
                let last_failure = self.last_failure.lock();
                if let Some(failure_time) = *last_failure {
                    if failure_time.elapsed() >= self.recovery_timeout {
                        *state = CircuitBreakerState::HalfOpen;
                        true
                    } else {
                        false
                    }
                } else {
                    true
                }
            }
            CircuitBreakerState::HalfOpen => true,
        }
    }

    pub fn on_success(&self) {
        let mut state = self.state.lock();
        let mut failure_count = self.failure_count.lock();
        *failure_count = 0;
        *state = CircuitBreakerState::Closed;
    }

    pub fn on_failure(&self) {
        let mut failure_count = self.failure_count.lock();
        let mut last_failure = self.last_failure.lock();
        let mut state = self.state.lock();

        *failure_count += 1;
        *last_failure = Some(Instant::now());

        if *failure_count >= self.failure_threshold {
            *state = CircuitBreakerState::Open;
        }
    }
}

#[derive(Debug)]
pub struct RequestBatcher {
    batches: DashMap<String, Vec<OptimizedExecutionRequest>>,
    batch_size: usize,
    batch_timeout: Duration,
}

impl RequestBatcher {
    pub fn new(batch_size: usize, batch_timeout: Duration) -> Self {
        Self {
            batches: DashMap::new(),
            batch_size,
            batch_timeout,
        }
    }

    pub async fn add_request(&self, request: OptimizedExecutionRequest) -> Result<()> {
        let batch_key = request.batch_id.clone().unwrap_or_else(|| "default".to_string());
        
        let mut batch = self.batches.entry(batch_key.clone()).or_insert_with(Vec::new);
        batch.push(request);

        // Check if batch is ready for processing
        if batch.len() >= self.batch_size {
            let requests = batch.clone();
            batch.clear();
            drop(batch);
            
            // Process batch in background
            let batcher = self.clone();
            tokio::spawn(async move {
                if let Err(e) = batcher.process_batch(batch_key, requests).await {
                    tracing::error!("Batch processing failed: {}", e);
                }
            });
        }

        Ok(())
    }

    async fn process_batch(&self, _batch_id: String, requests: Vec<OptimizedExecutionRequest>) -> Result<()> {
        let tasks: Vec<_> = requests
            .into_iter()
            .map(|request| {
                tokio::spawn(async move {
                    // Process individual request
                    Self::process_single_request(request).await
                })
            })
            .collect();

        let results = join_all(tasks).await;
        
        for result in results {
            match result {
                Ok(Ok(response)) => {
                    tracing::info!("Batch request processed successfully: {}", response.id);
                }
                Ok(Err(e)) => {
                    tracing::error!("Batch request failed: {}", e);
                }
                Err(e) => {
                    tracing::error!("Task join error: {}", e);
                }
            }
        }

        Ok(())
    }

    async fn process_single_request(request: OptimizedExecutionRequest) -> Result<crate::orchestration::ExecutionResponse> {
        // Implementation for processing single request
        // This would interface with the actual orchestration service
        let start_time = Instant::now();
        
        // Simulate processing (replace with actual logic)
        tokio::time::sleep(Duration::from_millis(100)).await;
        
        Ok(crate::orchestration::ExecutionResponse {
            id: request.id,
            result: Some("Batch processed successfully".to_string()),
            success: true,
            execution_time: start_time.elapsed().as_millis() as u64,
            error: None,
            metadata: None,
            swarm_metrics: None,
            memory_operations: Vec::new(),
        })
    }
}

impl Clone for RequestBatcher {
    fn clone(&self) -> Self {
        Self {
            batches: DashMap::new(), // New instance for cloning
            batch_size: self.batch_size,
            batch_timeout: self.batch_timeout,
        }
    }
}

#[derive(Debug)]
pub struct PerformanceMetrics {
    request_count: Arc<Mutex<HashMap<String, u64>>>,
    response_times: Arc<Mutex<HashMap<String, Vec<u64>>>>,
    error_rates: Arc<Mutex<HashMap<String, f64>>>,
    cache_hits: Arc<Mutex<u64>>,
    cache_misses: Arc<Mutex<u64>>,
}

impl PerformanceMetrics {
    pub fn new() -> Self {
        Self {
            request_count: Arc::new(Mutex::new(HashMap::new())),
            response_times: Arc::new(Mutex::new(HashMap::new())),
            error_rates: Arc::new(Mutex::new(HashMap::new())),
            cache_hits: Arc::new(Mutex::new(0)),
            cache_misses: Arc::new(Mutex::new(0)),
        }
    }

    pub fn record_request(&self, operation: &str) {
        let mut counts = self.request_count.lock();
        *counts.entry(operation.to_string()).or_insert(0) += 1;
    }

    pub fn record_response_time(&self, operation: &str, duration_ms: u64) {
        let mut times = self.response_times.lock();
        times.entry(operation.to_string()).or_insert_with(Vec::new).push(duration_ms);
        
        // Keep only last 1000 entries to prevent memory bloat
        let entry = times.get_mut(operation).unwrap();
        if entry.len() > 1000 {
            entry.drain(0..500); // Remove oldest 500 entries
        }
    }

    pub fn record_cache_hit(&self) {
        let mut hits = self.cache_hits.lock();
        *hits += 1;
    }

    pub fn record_cache_miss(&self) {
        let mut misses = self.cache_misses.lock();
        *misses += 1;
    }

    pub fn get_average_response_time(&self, operation: &str) -> Option<f64> {
        let times = self.response_times.lock();
        if let Some(operation_times) = times.get(operation) {
            if !operation_times.is_empty() {
                let sum: u64 = operation_times.iter().sum();
                Some(sum as f64 / operation_times.len() as f64)
            } else {
                None
            }
        } else {
            None
        }
    }

    pub fn get_cache_hit_rate(&self) -> f64 {
        let hits = *self.cache_hits.lock();
        let misses = *self.cache_misses.lock();
        let total = hits + misses;
        
        if total > 0 {
            hits as f64 / total as f64
        } else {
            0.0
        }
    }

    pub fn get_summary(&self) -> HashMap<String, serde_json::Value> {
        let mut summary = HashMap::new();
        
        // Request counts
        let counts = self.request_count.lock();
        summary.insert("request_counts".to_string(), 
                      serde_json::to_value(&*counts).unwrap_or_default());
        
        // Average response times
        let mut avg_times = HashMap::new();
        for (op, _) in counts.iter() {
            if let Some(avg) = self.get_average_response_time(op) {
                avg_times.insert(op.clone(), avg);
            }
        }
        summary.insert("average_response_times".to_string(),
                      serde_json::to_value(avg_times).unwrap_or_default());
        
        // Cache metrics
        summary.insert("cache_hit_rate".to_string(),
                      serde_json::Value::Number(serde_json::Number::from_f64(self.get_cache_hit_rate()).unwrap_or_default()));
        
        summary.insert("cache_hits".to_string(),
                      serde_json::Value::Number(serde_json::Number::from(*self.cache_hits.lock())));
        
        summary.insert("cache_misses".to_string(),
                      serde_json::Value::Number(serde_json::Number::from(*self.cache_misses.lock())));
        
        summary
    }
}

#[derive(Debug)]
pub struct OptimizedOrchestrationService {
    connection_pool: ConnectionPool,
    circuit_breaker: CircuitBreaker,
    request_batcher: RequestBatcher,
    performance_metrics: PerformanceMetrics,
    cache: Arc<RwLock<HashMap<String, (String, SystemTime)>>>,
    cache_ttl: Duration,
}

impl OptimizedOrchestrationService {
    pub fn new() -> Self {
        Self {
            connection_pool: ConnectionPool::new(50), // Max 50 concurrent connections
            circuit_breaker: CircuitBreaker::new(5, Duration::from_secs(60)), // 5 failures, 60s recovery
            request_batcher: RequestBatcher::new(10, Duration::from_millis(100)), // Batch size 10, 100ms timeout
            performance_metrics: PerformanceMetrics::new(),
            cache: Arc::new(RwLock::new(HashMap::new())),
            cache_ttl: Duration::from_secs(300), // 5 minute cache TTL
        }
    }

    pub async fn execute_optimized(&self, request: OptimizedExecutionRequest) -> Result<crate::orchestration::ExecutionResponse> {
        let start_time = Instant::now();
        let operation = "execute_optimized";
        
        self.performance_metrics.record_request(operation);

        // Check circuit breaker
        if !self.circuit_breaker.can_execute() {
            return Err(anyhow!("Circuit breaker is open"));
        }

        // Check cache if enabled
        if request.cache_enabled {
            let cache_key = self.generate_cache_key(&request);
            if let Some(cached_result) = self.get_from_cache(&cache_key).await {
                self.performance_metrics.record_cache_hit();
                let duration_ms = start_time.elapsed().as_millis() as u64;
                self.performance_metrics.record_response_time(operation, duration_ms);
                
                return Ok(crate::orchestration::ExecutionResponse {
                    id: request.id,
                    result: Some(cached_result),
                    success: true,
                    execution_time: duration_ms,
                    error: None,
                    metadata: Some(serde_json::json!({"cached": true})),
                    swarm_metrics: None,
                    memory_operations: Vec::new(),
                });
            } else {
                self.performance_metrics.record_cache_miss();
            }
        }

        // Acquire connection from pool
        let _connection_guard = self.connection_pool.acquire().await?;

        // Execute with timeout
        let execution_timeout = request.timeout_ms
            .map(Duration::from_millis)
            .unwrap_or(Duration::from_secs(30));

        let result = timeout(execution_timeout, self.execute_internal(request.clone())).await;

        let duration_ms = start_time.elapsed().as_millis() as u64;
        self.performance_metrics.record_response_time(operation, duration_ms);

        match result {
            Ok(Ok(response)) => {
                self.circuit_breaker.on_success();
                
                // Cache successful results
                if request.cache_enabled && response.success {
                    if let Some(ref result_data) = response.result {
                        let cache_key = self.generate_cache_key(&request);
                        self.store_in_cache(&cache_key, result_data.clone()).await;
                    }
                }
                
                Ok(response)
            }
            Ok(Err(e)) => {
                self.circuit_breaker.on_failure();
                Err(e)
            }
            Err(_) => {
                self.circuit_breaker.on_failure();
                Err(anyhow!("Request timeout"))
            }
        }
    }

    async fn execute_internal(&self, request: OptimizedExecutionRequest) -> Result<crate::orchestration::ExecutionResponse> {
        // Priority-based execution
        match request.priority {
            RequestPriority::Critical => {
                // Execute immediately without batching
                self.execute_single_request(request).await
            }
            RequestPriority::High => {
                // Execute with minimal delay
                tokio::time::sleep(Duration::from_millis(10)).await;
                self.execute_single_request(request).await
            }
            RequestPriority::Medium | RequestPriority::Low => {
                // Add to batch for efficient processing
                self.request_batcher.add_request(request.clone()).await?;
                self.execute_single_request(request).await
            }
        }
    }

    async fn execute_single_request(&self, request: OptimizedExecutionRequest) -> Result<crate::orchestration::ExecutionResponse> {
        let start_time = Instant::now();
        
        // Simulate actual work with the orchestration service
        // In a real implementation, this would call the actual orchestration logic
        
        let success = request.prompt.len() > 0; // Simple success criteria
        let result = if success {
            Some(format!("Optimized execution completed for: {}", request.prompt))
        } else {
            None
        };

        Ok(crate::orchestration::ExecutionResponse {
            id: request.id,
            result,
            success,
            execution_time: start_time.elapsed().as_millis() as u64,
            error: if !success { Some("Invalid prompt".to_string()) } else { None },
            metadata: Some(serde_json::json!({
                "optimized": true,
                "priority": format!("{:?}", request.priority),
                "cached": request.cache_enabled
            })),
            swarm_metrics: None,
            memory_operations: Vec::new(),
        })
    }

    fn generate_cache_key(&self, request: &OptimizedExecutionRequest) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        request.command.hash(&mut hasher);
        request.prompt.hash(&mut hasher);
        request.language.hash(&mut hasher);
        request.context.hash(&mut hasher);
        request.temperature.map(|t| t.to_bits()).hash(&mut hasher);
        
        format!("cache_key_{:x}", hasher.finish())
    }

    async fn get_from_cache(&self, key: &str) -> Option<String> {
        let cache = self.cache.read().await;
        if let Some((value, timestamp)) = cache.get(key) {
            if timestamp.elapsed().unwrap_or(Duration::MAX) < self.cache_ttl {
                Some(value.clone())
            } else {
                None // Expired
            }
        } else {
            None
        }
    }

    async fn store_in_cache(&self, key: &str, value: String) {
        let mut cache = self.cache.write().await;
        cache.insert(key.to_string(), (value, SystemTime::now()));
        
        // Prevent cache from growing too large
        if cache.len() > 10000 {
            // Remove oldest 1000 entries (simple cleanup)
            let keys_to_remove: Vec<_> = cache.keys().take(1000).cloned().collect();
            for key in keys_to_remove {
                cache.remove(&key);
            }
        }
    }

    pub async fn get_performance_metrics(&self) -> HashMap<String, serde_json::Value> {
        let mut metrics = self.performance_metrics.get_summary();
        
        metrics.insert("connection_pool".to_string(), serde_json::json!({
            "active_connections": self.connection_pool.active_count(),
            "max_connections": self.connection_pool.max_connections,
        }));
        
        let cache = self.cache.read().await;
        metrics.insert("cache".to_string(), serde_json::json!({
            "size": cache.len(),
            "hit_rate": self.performance_metrics.get_cache_hit_rate(),
        }));
        
        metrics
    }

    pub async fn health_check(&self) -> Result<HashMap<String, serde_json::Value>> {
        let mut health = HashMap::new();
        
        health.insert("circuit_breaker".to_string(), serde_json::json!({
            "can_execute": self.circuit_breaker.can_execute(),
        }));
        
        health.insert("connection_pool".to_string(), serde_json::json!({
            "healthy": self.connection_pool.active_count() < self.connection_pool.max_connections,
            "utilization": self.connection_pool.active_count() as f64 / self.connection_pool.max_connections as f64,
        }));
        
        let cache = self.cache.read().await;
        health.insert("cache".to_string(), serde_json::json!({
            "healthy": cache.len() < 10000,
            "size": cache.len(),
        }));
        
        Ok(health)
    }
}