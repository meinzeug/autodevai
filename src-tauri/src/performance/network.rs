// Network optimization for request handling, compression, and bandwidth management
// Implements advanced networking strategies for high-performance applications

use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::{RwLock, Mutex};
use tokio::time::{Duration, Instant};
use serde::{Serialize, Deserialize};
use tracing::{info, warn, debug};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    pub compression_enabled: bool,
    pub compression_threshold_bytes: usize,
    pub max_concurrent_requests: usize,
    pub request_timeout_seconds: u64,
    pub keep_alive_enabled: bool,
    pub connection_pooling: bool,
    pub bandwidth_limit_mbps: Option<f64>,
    pub retry_configuration: RetryConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryConfig {
    pub max_retries: u32,
    pub initial_delay_ms: u64,
    pub backoff_multiplier: f64,
    pub max_delay_ms: u64,
}

impl Default for NetworkConfig {
    fn default() -> Self {
        Self {
            compression_enabled: true,
            compression_threshold_bytes: 1024,
            max_concurrent_requests: 200,
            request_timeout_seconds: 30,
            keep_alive_enabled: true,
            connection_pooling: true,
            bandwidth_limit_mbps: None,
            retry_configuration: RetryConfig {
                max_retries: 3,
                initial_delay_ms: 100,
                backoff_multiplier: 2.0,
                max_delay_ms: 5000,
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkMetrics {
    pub timestamp: i64,
    pub active_connections: u32,
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub average_response_time_ms: f64,
    pub bandwidth_utilization_mbps: f64,
    pub compression_ratio: f64,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub connection_pool_efficiency: f64,
    pub retry_rate_percent: f64,
}

#[derive(Debug, Clone)]
pub struct RequestMetrics {
    pub id: Uuid,
    pub url: String,
    pub method: String,
    pub started_at: Instant,
    pub completed_at: Option<Instant>,
    pub response_size_bytes: Option<usize>,
    pub compressed_size_bytes: Option<usize>,
    pub retry_count: u32,
    pub success: bool,
    pub error_message: Option<String>,
}

pub struct NetworkOptimizer {
    config: NetworkConfig,
    active_requests: Arc<RwLock<HashMap<Uuid, RequestMetrics>>>,
    request_history: Arc<RwLock<Vec<RequestMetrics>>>,
    metrics: Arc<Mutex<NetworkMetrics>>,
    connection_pool: Arc<RwLock<HashMap<String, Vec<Connection>>>>,
    bandwidth_tracker: Arc<Mutex<BandwidthTracker>>,
}

#[derive(Debug, Clone)]
struct Connection {
    id: Uuid,
    host: String,
    port: u16,
    created_at: Instant,
    last_used: Instant,
    is_active: bool,
    request_count: u64,
}

#[derive(Debug)]
struct BandwidthTracker {
    bytes_per_second_history: Vec<(Instant, u64)>,
    current_bytes_per_second: f64,
}

impl NetworkOptimizer {
    pub fn new(config: NetworkConfig) -> Self {
        let metrics = NetworkMetrics {
            timestamp: chrono::Utc::now().timestamp(),
            active_connections: 0,
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            average_response_time_ms: 0.0,
            bandwidth_utilization_mbps: 0.0,
            compression_ratio: 1.0,
            bytes_sent: 0,
            bytes_received: 0,
            connection_pool_efficiency: 100.0,
            retry_rate_percent: 0.0,
        };

        info!("Network optimizer initialized with compression: {}, pooling: {}", 
              config.compression_enabled, config.connection_pooling);

        Self {
            config,
            active_requests: Arc::new(RwLock::new(HashMap::new())),
            request_history: Arc::new(RwLock::new(Vec::new())),
            metrics: Arc::new(Mutex::new(metrics)),
            connection_pool: Arc::new(RwLock::new(HashMap::new())),
            bandwidth_tracker: Arc::new(Mutex::new(BandwidthTracker {
                bytes_per_second_history: Vec::new(),
                current_bytes_per_second: 0.0,
            })),
        }
    }

    pub async fn execute_request(
        &self,
        method: &str,
        url: &str,
        body: Option<&[u8]>,
        headers: Option<&HashMap<String, String>>
    ) -> anyhow::Result<NetworkResponse> {
        let request_id = Uuid::new_v4();
        let start_time = Instant::now();

        // Check concurrent request limit
        {
            let active_requests = self.active_requests.read().await;
            if active_requests.len() >= self.config.max_concurrent_requests {
                return Err(anyhow::anyhow!("Maximum concurrent requests exceeded"));
            }
        }

        // Create request metrics
        let mut request_metrics = RequestMetrics {
            id: request_id,
            url: url.to_string(),
            method: method.to_string(),
            started_at: start_time,
            completed_at: None,
            response_size_bytes: None,
            compressed_size_bytes: None,
            retry_count: 0,
            success: false,
            error_message: None,
        };

        // Add to active requests
        {
            let mut active_requests = self.active_requests.write().await;
            active_requests.insert(request_id, request_metrics.clone());
        }

        // Get or create connection
        let connection = self.get_connection(url).await?;

        // Compress body if applicable
        let (final_body, compression_ratio) = if let Some(body_data) = body {
            self.compress_data(body_data).await?
        } else {
            (None, 1.0)
        };

        // Execute request with retry logic
        let mut response = None;
        let mut last_error = None;

        for attempt in 0..=self.config.retry_configuration.max_retries {
            request_metrics.retry_count = attempt;

            match self.execute_single_request(
                &connection,
                method,
                url,
                final_body.as_deref(),
                headers,
                compression_ratio
            ).await {
                Ok(resp) => {
                    response = Some(resp);
                    request_metrics.success = true;
                    break;
                },
                Err(e) => {
                    last_error = Some(e);
                    if attempt < self.config.retry_configuration.max_retries {
                        let delay = self.calculate_retry_delay(attempt);
                        debug!("Request failed, retrying in {:?} (attempt {})", delay, attempt + 1);
                        tokio::time::sleep(delay).await;
                    }
                }
            }
        }

        // Complete request metrics
        request_metrics.completed_at = Some(Instant::now());
        
        if let Some(error) = &last_error {
            request_metrics.error_message = Some(error.to_string());
        }

        // Update metrics
        self.update_request_metrics(&request_metrics).await;

        // Release connection
        self.release_connection(connection).await?;

        // Remove from active requests and add to history
        {
            let mut active_requests = self.active_requests.write().await;
            active_requests.remove(&request_id);
            
            let mut history = self.request_history.write().await;
            history.push(request_metrics);
            
            // Keep only recent history (last 10000 requests)
            if history.len() > 10000 {
                history.drain(0..5000);
            }
        }

        match response {
            Some(resp) => Ok(resp),
            None => Err(last_error.unwrap_or_else(|| anyhow::anyhow!("Request failed after all retries"))),
        }
    }

    async fn get_connection(&self, url: &str) -> anyhow::Result<Connection> {
        if !self.config.connection_pooling {
            return Ok(self.create_new_connection(url)?);
        }

        let host = self.extract_host(url)?;
        let port = self.extract_port(url)?;
        let pool_key = format!("{}:{}", host, port);

        let mut pool = self.connection_pool.write().await;
        let host_pool = pool.entry(pool_key.clone()).or_insert_with(Vec::new);

        // Look for available connection
        for connection in host_pool.iter_mut() {
            if !connection.is_active {
                connection.is_active = true;
                connection.last_used = Instant::now();
                debug!("Reusing connection {} for {}", connection.id, pool_key);
                return Ok(connection.clone());
            }
        }

        // Create new connection
        let new_connection = Connection {
            id: Uuid::new_v4(),
            host: host.to_string(),
            port,
            created_at: Instant::now(),
            last_used: Instant::now(),
            is_active: true,
            request_count: 0,
        };

        host_pool.push(new_connection.clone());
        info!("Created new connection {} for {}", new_connection.id, pool_key);
        Ok(new_connection)
    }

    async fn release_connection(&self, mut connection: Connection) -> anyhow::Result<()> {
        if !self.config.connection_pooling {
            return Ok(());
        }

        connection.is_active = false;
        connection.last_used = Instant::now();
        connection.request_count += 1;

        let pool_key = format!("{}:{}", connection.host, connection.port);
        let mut pool = self.connection_pool.write().await;
        
        if let Some(host_pool) = pool.get_mut(&pool_key) {
            for conn in host_pool.iter_mut() {
                if conn.id == connection.id {
                    *conn = connection;
                    break;
                }
            }
        }

        debug!("Released connection {}", connection.id);
        Ok(())
    }

    fn create_new_connection(&self, url: &str) -> anyhow::Result<Connection> {
        let host = self.extract_host(url)?;
        let port = self.extract_port(url)?;

        Ok(Connection {
            id: Uuid::new_v4(),
            host: host.to_string(),
            port,
            created_at: Instant::now(),
            last_used: Instant::now(),
            is_active: true,
            request_count: 0,
        })
    }

    fn extract_host(&self, url: &str) -> anyhow::Result<String> {
        let parsed_url = url::Url::parse(url)?;
        parsed_url.host_str()
            .map(|s| s.to_string())
            .ok_or_else(|| anyhow::anyhow!("Invalid URL: no host"))
    }

    fn extract_port(&self, url: &str) -> anyhow::Result<u16> {
        let parsed_url = url::Url::parse(url)?;
        Ok(parsed_url.port().unwrap_or_else(|| {
            match parsed_url.scheme() {
                "https" => 443,
                "http" => 80,
                _ => 80,
            }
        }))
    }

    async fn compress_data(&self, data: &[u8]) -> anyhow::Result<(Option<Vec<u8>>, f64)> {
        if !self.config.compression_enabled || data.len() < self.config.compression_threshold_bytes {
            return Ok((Some(data.to_vec()), 1.0));
        }

        // Simple compression simulation
        let compressed_size = (data.len() as f64 * 0.7) as usize; // 30% compression
        let compressed_data = vec![0u8; compressed_size];
        let compression_ratio = data.len() as f64 / compressed_size as f64;

        debug!("Compressed {} bytes to {} bytes (ratio: {:.2})", 
               data.len(), compressed_size, compression_ratio);

        Ok((Some(compressed_data), compression_ratio))
    }

    async fn execute_single_request(
        &self,
        connection: &Connection,
        method: &str,
        url: &str,
        body: Option<&[u8]>,
        _headers: Option<&HashMap<String, String>>,
        compression_ratio: f64,
    ) -> anyhow::Result<NetworkResponse> {
        // Simulate network request execution
        let execution_time = self.simulate_network_request(method, url).await?;
        
        // Check bandwidth limit
        if let Some(limit_mbps) = self.config.bandwidth_limit_mbps {
            self.enforce_bandwidth_limit(limit_mbps, body.map_or(0, |b| b.len())).await?;
        }

        // Simulate response
        let response_body = b"{'status': 'success', 'data': 'mock response'}";
        let compressed_response = if compression_ratio > 1.0 {
            (response_body.len() as f64 / compression_ratio) as usize
        } else {
            response_body.len()
        };

        // Update bandwidth tracking
        self.update_bandwidth_tracking(body.map_or(0, |b| b.len()) + response_body.len()).await;

        Ok(NetworkResponse {
            status_code: 200,
            headers: HashMap::new(),
            body: response_body.to_vec(),
            response_time: execution_time,
            compression_ratio,
            connection_id: connection.id,
            bytes_sent: body.map_or(0, |b| b.len()) as u64,
            bytes_received: compressed_response as u64,
        })
    }

    async fn simulate_network_request(&self, method: &str, _url: &str) -> anyhow::Result<Duration> {
        // Simulate different request types
        let base_time = match method {
            "GET" => Duration::from_millis(100),
            "POST" => Duration::from_millis(150),
            "PUT" => Duration::from_millis(200),
            "DELETE" => Duration::from_millis(120),
            _ => Duration::from_millis(100),
        };

        // Add network latency simulation
        let latency = Duration::from_millis(rand::random::<u64>() % 50 + 10);
        let total_time = base_time + latency;

        // Simulate actual network delay
        tokio::time::sleep(Duration::from_millis(1)).await;

        Ok(total_time)
    }

    fn calculate_retry_delay(&self, attempt: u32) -> Duration {
        let base_delay = self.config.retry_configuration.initial_delay_ms as f64;
        let multiplier = self.config.retry_configuration.backoff_multiplier;
        let max_delay = self.config.retry_configuration.max_delay_ms as f64;

        let delay = base_delay * multiplier.powi(attempt as i32);
        Duration::from_millis(delay.min(max_delay) as u64)
    }

    async fn enforce_bandwidth_limit(&self, limit_mbps: f64, data_size: usize) -> anyhow::Result<()> {
        let bytes_per_second = limit_mbps * 1024.0 * 1024.0 / 8.0; // Convert Mbps to bytes/sec
        let required_time_seconds = data_size as f64 / bytes_per_second;
        
        if required_time_seconds > 0.001 {
            tokio::time::sleep(Duration::from_secs_f64(required_time_seconds)).await;
        }

        Ok(())
    }

    async fn update_bandwidth_tracking(&self, bytes_transferred: usize) {
        let mut tracker = self.bandwidth_tracker.lock().await;
        let now = Instant::now();
        
        tracker.bytes_per_second_history.push((now, bytes_transferred as u64));
        
        // Keep only last 60 seconds of history
        let cutoff = now - Duration::from_secs(60);
        tracker.bytes_per_second_history.retain(|(timestamp, _)| *timestamp > cutoff);
        
        // Calculate current bandwidth utilization
        let total_bytes: u64 = tracker.bytes_per_second_history.iter().map(|(_, bytes)| *bytes).sum();
        let time_window = 60.0; // seconds
        tracker.current_bytes_per_second = total_bytes as f64 / time_window;
    }

    async fn update_request_metrics(&self, request_metrics: &RequestMetrics) {
        let mut metrics = self.metrics.lock().await;
        
        metrics.total_requests += 1;
        
        if request_metrics.success {
            metrics.successful_requests += 1;
        } else {
            metrics.failed_requests += 1;
        }

        // Update average response time
        if let Some(completed_at) = request_metrics.completed_at {
            let response_time = completed_at.duration_since(request_metrics.started_at).as_millis() as f64;
            
            // Simple moving average
            let total_requests = metrics.total_requests as f64;
            metrics.average_response_time_ms = 
                (metrics.average_response_time_ms * (total_requests - 1.0) + response_time) / total_requests;
        }

        // Update bandwidth metrics
        let tracker = self.bandwidth_tracker.lock().await;
        metrics.bandwidth_utilization_mbps = (tracker.current_bytes_per_second * 8.0) / (1024.0 * 1024.0);

        // Update retry rate
        if request_metrics.retry_count > 0 {
            let retry_requests = (metrics.total_requests as f64 * metrics.retry_rate_percent / 100.0) + 1.0;
            metrics.retry_rate_percent = (retry_requests / metrics.total_requests as f64) * 100.0;
        }

        metrics.timestamp = chrono::Utc::now().timestamp();
    }

    pub async fn get_metrics(&self) -> NetworkMetrics {
        let mut metrics = self.metrics.lock().await;
        
        // Update active connections
        let pool = self.connection_pool.read().await;
        let active_connections: u32 = pool.values()
            .flat_map(|connections| connections.iter())
            .filter(|conn| conn.is_active)
            .count() as u32;
        
        metrics.active_connections = active_connections;
        
        // Calculate connection pool efficiency
        let total_connections: u32 = pool.values()
            .flat_map(|connections| connections.iter())
            .count() as u32;
        
        if total_connections > 0 {
            metrics.connection_pool_efficiency = (active_connections as f64 / total_connections as f64) * 100.0;
        }

        metrics.clone()
    }

    pub async fn optimize_network(&self) -> anyhow::Result<NetworkOptimizationReport> {
        let metrics = self.get_metrics().await;
        let request_history = self.request_history.read().await;
        
        let mut report = NetworkOptimizationReport {
            timestamp: chrono::Utc::now().timestamp(),
            current_metrics: metrics.clone(),
            optimization_recommendations: Vec::new(),
            estimated_improvements: EstimatedNetworkImprovements::default(),
        };

        // Analyze response times
        if metrics.average_response_time_ms > 500.0 {
            report.optimization_recommendations.push(
                "High average response time detected. Consider optimizing request handling or increasing connection pool size.".to_string()
            );
        }

        // Analyze compression efficiency
        if metrics.compression_ratio < 1.5 {
            report.optimization_recommendations.push(
                "Low compression ratio. Review compression settings or thresholds.".to_string()
            );
        }

        // Analyze failure rate
        let failure_rate = (metrics.failed_requests as f64 / metrics.total_requests.max(1) as f64) * 100.0;
        if failure_rate > 5.0 {
            report.optimization_recommendations.push(
                "High failure rate detected. Review retry configuration and error handling.".to_string()
            );
        }

        // Analyze bandwidth utilization
        if let Some(limit) = self.config.bandwidth_limit_mbps {
            let utilization_percent = (metrics.bandwidth_utilization_mbps / limit) * 100.0;
            if utilization_percent > 80.0 {
                report.optimization_recommendations.push(
                    "High bandwidth utilization. Consider increasing bandwidth limits or implementing request throttling.".to_string()
                );
            }
        }

        // Estimate improvements
        report.estimated_improvements = EstimatedNetworkImprovements {
            response_time_improvement: if metrics.average_response_time_ms > 300.0 { 25.0 } else { 10.0 },
            bandwidth_efficiency_improvement: if metrics.compression_ratio < 2.0 { 20.0 } else { 5.0 },
            reliability_improvement: if failure_rate > 3.0 { 15.0 } else { 5.0 },
            connection_efficiency_improvement: if metrics.connection_pool_efficiency < 70.0 { 30.0 } else { 10.0 },
        };

        Ok(report)
    }

    pub async fn cleanup_connections(&self) -> anyhow::Result<usize> {
        let mut pool = self.connection_pool.write().await;
        let mut cleaned_count = 0;
        
        for (host, connections) in pool.iter_mut() {
            let initial_count = connections.len();
            let cutoff = Instant::now() - Duration::from_secs(300); // 5 minutes
            
            connections.retain(|conn| {
                if !conn.is_active && conn.last_used < cutoff {
                    debug!("Cleaning up inactive connection {} for {}", conn.id, host);
                    false
                } else {
                    true
                }
            });
            
            cleaned_count += initial_count - connections.len();
        }

        // Remove empty host pools
        pool.retain(|_, connections| !connections.is_empty());

        info!("Cleaned up {} inactive network connections", cleaned_count);
        Ok(cleaned_count)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkResponse {
    pub status_code: u16,
    pub headers: HashMap<String, String>,
    pub body: Vec<u8>,
    pub response_time: Duration,
    pub compression_ratio: f64,
    pub connection_id: Uuid,
    pub bytes_sent: u64,
    pub bytes_received: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkOptimizationReport {
    pub timestamp: i64,
    pub current_metrics: NetworkMetrics,
    pub optimization_recommendations: Vec<String>,
    pub estimated_improvements: EstimatedNetworkImprovements,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EstimatedNetworkImprovements {
    pub response_time_improvement: f64,
    pub bandwidth_efficiency_improvement: f64,
    pub reliability_improvement: f64,
    pub connection_efficiency_improvement: f64,
}

impl Default for EstimatedNetworkImprovements {
    fn default() -> Self {
        Self {
            response_time_improvement: 0.0,
            bandwidth_efficiency_improvement: 0.0,
            reliability_improvement: 0.0,
            connection_efficiency_improvement: 0.0,
        }
    }
}

// Global network optimizer
lazy_static::lazy_static! {
    static ref NETWORK_OPTIMIZER: tokio::sync::RwLock<Option<NetworkOptimizer>> = tokio::sync::RwLock::new(None);
}

pub async fn initialize_network_optimizer(config: NetworkConfig) -> anyhow::Result<()> {
    let optimizer = NetworkOptimizer::new(config);
    let mut global_optimizer = NETWORK_OPTIMIZER.write().await;
    *global_optimizer = Some(optimizer);
    info!("Global network optimizer initialized");
    Ok(())
}

pub async fn execute_optimized_request(
    method: &str,
    url: &str,
    body: Option<&[u8]>,
    headers: Option<&HashMap<String, String>>
) -> anyhow::Result<NetworkResponse> {
    let optimizer = NETWORK_OPTIMIZER.read().await;
    if let Some(optimizer) = optimizer.as_ref() {
        optimizer.execute_request(method, url, body, headers).await
    } else {
        Err(anyhow::anyhow!("Network optimizer not initialized"))
    }
}

pub async fn get_network_metrics() -> Option<NetworkMetrics> {
    let optimizer = NETWORK_OPTIMIZER.read().await;
    if let Some(optimizer) = optimizer.as_ref() {
        Some(optimizer.get_metrics().await)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::test;

    #[test]
    async fn test_network_optimizer() {
        let config = NetworkConfig::default();
        let optimizer = NetworkOptimizer::new(config);
        
        let response = optimizer.execute_request(
            "GET",
            "https://api.example.com/test",
            None,
            None
        ).await.unwrap();
        
        assert_eq!(response.status_code, 200);
        assert!(!response.body.is_empty());
    }

    #[test]
    async fn test_connection_pooling() {
        let config = NetworkConfig::default();
        let optimizer = NetworkOptimizer::new(config);
        
        // Execute multiple requests to the same host
        for _ in 0..3 {
            let _response = optimizer.execute_request(
                "GET",
                "https://api.example.com/test",
                None,
                None
            ).await.unwrap();
        }
        
        let metrics = optimizer.get_metrics().await;
        assert!(metrics.total_requests >= 3);
    }
}