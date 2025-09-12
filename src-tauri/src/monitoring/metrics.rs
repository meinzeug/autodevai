// AutoDev-AI Neural Bridge Platform - Prometheus Metrics System
// Production-ready metrics collection with custom business metrics

use anyhow::{Result, Context};
use axum::{
    extract::State,
    http::StatusCode,
    response::Response,
};
use prometheus::{
    Counter, Histogram, Gauge, Registry, TextEncoder, Encoder,
    HistogramOpts, Opts, GaugeVec, CounterVec, HistogramVec,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{Duration, Instant};
use sysinfo::System;
use tokio::sync::Mutex;
use tracing::{info, warn, error};

/// Metrics configuration
#[derive(Debug, Clone)]
pub struct MetricsConfig {
    pub enabled: bool,
    pub collection_interval_seconds: u64,
    pub custom_metrics_enabled: bool,
    pub system_metrics_enabled: bool,
}

impl Default for MetricsConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            collection_interval_seconds: 15,
            custom_metrics_enabled: true,
            system_metrics_enabled: true,
        }
    }
}

/// Prometheus metrics collector
pub struct PrometheusMetrics {
    registry: Registry,
    
    // Request metrics
    http_requests_total: CounterVec,
    http_request_duration: HistogramVec,
    http_requests_in_flight: Gauge,
    
    // System metrics
    system_cpu_usage: Gauge,
    system_memory_usage: Gauge,
    system_memory_total: Gauge,
    system_disk_usage: GaugeVec,
    
    // Application metrics
    app_uptime_seconds: Gauge,
    app_version_info: GaugeVec,
    
    // AI Tool metrics
    ai_tool_requests_total: CounterVec,
    ai_tool_request_duration: HistogramVec,
    ai_tool_errors_total: CounterVec,
    ai_token_usage_total: CounterVec,
    
    // Security metrics
    security_events_total: CounterVec,
    authentication_attempts_total: CounterVec,
    
    // Performance metrics
    task_execution_duration: HistogramVec,
    memory_allocations_total: Counter,
    gc_duration_seconds: Histogram,
    
    // Health check metrics
    health_check_duration: Histogram,
    health_check_status: GaugeVec,
    
    // Business metrics
    user_sessions_active: Gauge,
    feature_usage_total: CounterVec,
    error_rate: GaugeVec,
    
    // System info
    system: Arc<Mutex<System>>,
    start_time: Instant,
    config: MetricsConfig,
}

impl PrometheusMetrics {
    /// Create a new Prometheus metrics collector
    pub fn new() -> Result<Self> {
        let registry = Registry::new();
        
        // Initialize request metrics
        let http_requests_total = CounterVec::new(
            Opts::new("http_requests_total", "Total number of HTTP requests")
                .namespace("autodev_ai")
                .subsystem("http"),
            &["method", "endpoint", "status_code"]
        )?;
        
        let http_request_duration = HistogramVec::new(
            HistogramOpts::new("http_request_duration_seconds", "HTTP request duration")
                .namespace("autodev_ai")
                .subsystem("http")
                .buckets(vec![0.001, 0.01, 0.1, 0.5, 1.0, 2.5, 5.0, 10.0]),
            &["method", "endpoint"]
        )?;
        
        let http_requests_in_flight = Gauge::new(
            "autodev_ai_http_requests_in_flight",
            "Number of HTTP requests currently being processed"
        )?;
        
        // Initialize system metrics
        let system_cpu_usage = Gauge::new(
            "autodev_ai_system_cpu_usage_percent",
            "System CPU usage percentage"
        )?;
        
        let system_memory_usage = Gauge::new(
            "autodev_ai_system_memory_usage_bytes",
            "System memory usage in bytes"
        )?;
        
        let system_memory_total = Gauge::new(
            "autodev_ai_system_memory_total_bytes",
            "Total system memory in bytes"
        )?;
        
        let system_disk_usage = GaugeVec::new(
            Opts::new("system_disk_usage_bytes", "Disk usage by mount point")
                .namespace("autodev_ai")
                .subsystem("system"),
            &["mount_point", "device"]
        )?;
        
        // Initialize application metrics
        let app_uptime_seconds = Gauge::new(
            "autodev_ai_app_uptime_seconds",
            "Application uptime in seconds"
        )?;
        
        let app_version_info = GaugeVec::new(
            Opts::new("app_version_info", "Application version information")
                .namespace("autodev_ai")
                .subsystem("app"),
            &["version", "rust_version", "build_date"]
        )?;
        
        // Initialize AI tool metrics
        let ai_tool_requests_total = CounterVec::new(
            Opts::new("ai_tool_requests_total", "Total AI tool requests")
                .namespace("autodev_ai")
                .subsystem("ai"),
            &["tool", "status", "model"]
        )?;
        
        let ai_tool_request_duration = HistogramVec::new(
            HistogramOpts::new("ai_tool_request_duration_seconds", "AI tool request duration")
                .namespace("autodev_ai")
                .subsystem("ai")
                .buckets(vec![0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0]),
            &["tool", "model"]
        )?;
        
        let ai_tool_errors_total = CounterVec::new(
            Opts::new("ai_tool_errors_total", "Total AI tool errors")
                .namespace("autodev_ai")
                .subsystem("ai"),
            &["tool", "error_type"]
        )?;
        
        let ai_token_usage_total = CounterVec::new(
            Opts::new("ai_token_usage_total", "Total AI tokens used")
                .namespace("autodev_ai")
                .subsystem("ai"),
            &["tool", "model", "type"]
        )?;
        
        // Initialize security metrics
        let security_events_total = CounterVec::new(
            Opts::new("security_events_total", "Total security events")
                .namespace("autodev_ai")
                .subsystem("security"),
            &["event_type", "severity"]
        )?;
        
        let authentication_attempts_total = CounterVec::new(
            Opts::new("authentication_attempts_total", "Authentication attempts")
                .namespace("autodev_ai")
                .subsystem("security"),
            &["result", "method"]
        )?;
        
        // Initialize performance metrics
        let task_execution_duration = HistogramVec::new(
            HistogramOpts::new("task_execution_duration_seconds", "Task execution duration")
                .namespace("autodev_ai")
                .subsystem("performance")
                .buckets(vec![0.01, 0.1, 0.5, 1.0, 5.0, 10.0, 30.0]),
            &["task_type", "status"]
        )?;
        
        let memory_allocations_total = Counter::new(
            "autodev_ai_performance_memory_allocations_total",
            "Total memory allocations"
        )?;
        
        let gc_duration_seconds = Histogram::new(
            HistogramOpts::new("gc_duration_seconds", "Garbage collection duration")
                .namespace("autodev_ai")
                .subsystem("performance")
                .buckets(vec![0.001, 0.01, 0.1, 0.5, 1.0])
        )?;
        
        // Initialize health check metrics
        let health_check_duration = Histogram::new(
            HistogramOpts::new("health_check_duration_seconds", "Health check duration")
                .namespace("autodev_ai")
                .subsystem("health")
                .buckets(vec![0.001, 0.01, 0.1, 0.5, 1.0])
        )?;
        
        let health_check_status = GaugeVec::new(
            Opts::new("health_check_status", "Health check status (1=healthy, 0=unhealthy)")
                .namespace("autodev_ai")
                .subsystem("health"),
            &["check_type"]
        )?;
        
        // Initialize business metrics
        let user_sessions_active = Gauge::new(
            "autodev_ai_business_user_sessions_active",
            "Number of active user sessions"
        )?;
        
        let feature_usage_total = CounterVec::new(
            Opts::new("feature_usage_total", "Feature usage count")
                .namespace("autodev_ai")
                .subsystem("business"),
            &["feature", "user_type"]
        )?;
        
        let error_rate = GaugeVec::new(
            Opts::new("error_rate", "Error rate by component")
                .namespace("autodev_ai")
                .subsystem("business"),
            &["component", "error_type"]
        )?;
        
        // Register all metrics
        registry.register(Box::new(http_requests_total.clone()))?;
        registry.register(Box::new(http_request_duration.clone()))?;
        registry.register(Box::new(http_requests_in_flight.clone()))?;
        registry.register(Box::new(system_cpu_usage.clone()))?;
        registry.register(Box::new(system_memory_usage.clone()))?;
        registry.register(Box::new(system_memory_total.clone()))?;
        registry.register(Box::new(system_disk_usage.clone()))?;
        registry.register(Box::new(app_uptime_seconds.clone()))?;
        registry.register(Box::new(app_version_info.clone()))?;
        registry.register(Box::new(ai_tool_requests_total.clone()))?;
        registry.register(Box::new(ai_tool_request_duration.clone()))?;
        registry.register(Box::new(ai_tool_errors_total.clone()))?;
        registry.register(Box::new(ai_token_usage_total.clone()))?;
        registry.register(Box::new(security_events_total.clone()))?;
        registry.register(Box::new(authentication_attempts_total.clone()))?;
        registry.register(Box::new(task_execution_duration.clone()))?;
        registry.register(Box::new(memory_allocations_total.clone()))?;
        registry.register(Box::new(gc_duration_seconds.clone()))?;
        registry.register(Box::new(health_check_duration.clone()))?;
        registry.register(Box::new(health_check_status.clone()))?;
        registry.register(Box::new(user_sessions_active.clone()))?;
        registry.register(Box::new(feature_usage_total.clone()))?;
        registry.register(Box::new(error_rate.clone()))?;
        
        let mut system = System::new_all();
        system.refresh_all();
        
        let metrics = Self {
            registry,
            http_requests_total,
            http_request_duration,
            http_requests_in_flight,
            system_cpu_usage,
            system_memory_usage,
            system_memory_total,
            system_disk_usage,
            app_uptime_seconds,
            app_version_info,
            ai_tool_requests_total,
            ai_tool_request_duration,
            ai_tool_errors_total,
            ai_token_usage_total,
            security_events_total,
            authentication_attempts_total,
            task_execution_duration,
            memory_allocations_total,
            gc_duration_seconds,
            health_check_duration,
            health_check_status,
            user_sessions_active,
            feature_usage_total,
            error_rate,
            system: Arc::new(Mutex::new(system)),
            start_time: Instant::now(),
            config: MetricsConfig::default(),
        };
        
        // Set static version info
        metrics.app_version_info
            .with_label_values(&[
                env!("CARGO_PKG_VERSION"),
                env!("CARGO_PKG_RUST_VERSION"),
                env!("BUILD_TIMESTAMP"),
            ])
            .set(1.0);
        
        info!("Prometheus metrics system initialized");
        Ok(metrics)
    }
    
    /// Update system metrics
    pub async fn update_system_metrics(&self) -> Result<()> {
        if !self.config.system_metrics_enabled {
            return Ok(());
        }
        
        let mut system = self.system.lock().await;
        system.refresh_all();
        
        // CPU usage
        self.system_cpu_usage.set(system.global_cpu_info().cpu_usage() as f64);
        
        // Memory usage
        self.system_memory_usage.set(system.used_memory() as f64);
        self.system_memory_total.set(system.total_memory() as f64);
        
        // Disk usage
        for disk in system.disks() {
            let mount_point = disk.mount_point().to_string_lossy();
            let device = disk.name().to_string_lossy();
            let used_space = disk.total_space() - disk.available_space();
            
            self.system_disk_usage
                .with_label_values(&[&mount_point, &device])
                .set(used_space as f64);
        }
        
        // App uptime
        self.app_uptime_seconds.set(self.start_time.elapsed().as_secs() as f64);
        
        Ok(())
    }
    
    /// Record HTTP request metrics
    pub fn record_http_request(&self, method: &str, endpoint: &str, status_code: u16, duration: Duration) -> Result<()> {
        self.http_requests_total
            .with_label_values(&[method, endpoint, &status_code.to_string()])
            .inc();
            
        self.http_request_duration
            .with_label_values(&[method, endpoint])
            .observe(duration.as_secs_f64());
            
        Ok(())
    }
    
    /// Record AI tool usage
    pub fn record_ai_tool_usage(&self, tool: &str, model: &str, status: &str, duration: Duration, tokens_used: u64) -> Result<()> {
        self.ai_tool_requests_total
            .with_label_values(&[tool, status, model])
            .inc();
            
        self.ai_tool_request_duration
            .with_label_values(&[tool, model])
            .observe(duration.as_secs_f64());
            
        self.ai_token_usage_total
            .with_label_values(&[tool, model, "total"])
            .inc_by(tokens_used);
            
        Ok(())
    }
    
    /// Record AI tool error
    pub fn record_ai_tool_error(&self, tool: &str, error_type: &str) -> Result<()> {
        self.ai_tool_errors_total
            .with_label_values(&[tool, error_type])
            .inc();
        Ok(())
    }
    
    /// Record security event
    pub fn record_security_event(&self, event_type: &str, severity: &str) -> Result<()> {
        self.security_events_total
            .with_label_values(&[event_type, severity])
            .inc();
        Ok(())
    }
    
    /// Record authentication attempt
    pub fn record_authentication_attempt(&self, result: &str, method: &str) -> Result<()> {
        self.authentication_attempts_total
            .with_label_values(&[result, method])
            .inc();
        Ok(())
    }
    
    /// Record task execution
    pub fn record_task_execution(&self, task_type: &str, status: &str, duration: Duration) -> Result<()> {
        self.task_execution_duration
            .with_label_values(&[task_type, status])
            .observe(duration.as_secs_f64());
        Ok(())
    }
    
    /// Record health check duration
    pub fn record_health_check_duration(&self, duration_ms: f64) -> Result<()> {
        self.health_check_duration.observe(duration_ms / 1000.0);
        Ok(())
    }
    
    /// Record health check status
    pub fn record_health_status(&self, status: &str) -> Result<()> {
        let status_value = match status {
            "healthy" => 1.0,
            "degraded" => 0.5,
            _ => 0.0,
        };
        
        self.health_check_status
            .with_label_values(&["overall"])
            .set(status_value);
        Ok(())
    }
    
    /// Record feature usage
    pub fn record_feature_usage(&self, feature: &str, user_type: &str) -> Result<()> {
        self.feature_usage_total
            .with_label_values(&[feature, user_type])
            .inc();
        Ok(())
    }
    
    /// Record custom metric
    pub fn record_custom_metric(&self, _name: &str, _value: f64, _labels: &[(&str, &str)]) -> Result<()> {
        // Custom metrics would need to be registered dynamically
        // For now, we'll log the metric
        info!("Custom metric recorded: {} = {}", _name, _value);
        Ok(())
    }
    
    /// Set active user sessions
    pub fn set_active_sessions(&self, count: f64) {
        self.user_sessions_active.set(count);
    }
    
    /// Set error rate
    pub fn set_error_rate(&self, component: &str, error_type: &str, rate: f64) {
        self.error_rate
            .with_label_values(&[component, error_type])
            .set(rate);
    }
    
    /// Get metrics output in Prometheus format
    pub async fn get_metrics_output(&self) -> Result<String> {
        // Update system metrics before output
        self.update_system_metrics().await?;
        
        let encoder = TextEncoder::new();
        let metric_families = self.registry.gather();
        
        let mut output = Vec::new();
        encoder.encode(&metric_families, &mut output)
            .context("Failed to encode metrics")?;
            
        String::from_utf8(output)
            .context("Failed to convert metrics to UTF-8")
    }
    
    /// Check if metrics system is healthy
    pub async fn is_healthy(&self) -> bool {
        // Simple health check - verify we can gather metrics
        match self.registry.gather().len() {
            0 => false,
            _ => true,
        }
    }
    
    /// Get metrics statistics
    pub async fn get_statistics(&self) -> Result<serde_json::Value> {
        let metric_families = self.registry.gather();
        let total_metrics = metric_families.len();
        let total_samples: usize = metric_families.iter()
            .map(|mf| mf.get_metric().len())
            .sum();
            
        Ok(serde_json::json!({
            "total_metric_families": total_metrics,
            "total_samples": total_samples,
            "uptime_seconds": self.start_time.elapsed().as_secs(),
            "system_metrics_enabled": self.config.system_metrics_enabled,
            "custom_metrics_enabled": self.config.custom_metrics_enabled,
        }))
    }
    
    /// Start background metrics collection
    pub async fn start_background_collection(&self) -> Result<()> {
        let interval = Duration::from_secs(self.config.collection_interval_seconds);
        let system = Arc::clone(&self.system);
        let cpu_gauge = self.system_cpu_usage.clone();
        let memory_usage_gauge = self.system_memory_usage.clone();
        let memory_total_gauge = self.system_memory_total.clone();
        let uptime_gauge = self.app_uptime_seconds.clone();
        let start_time = self.start_time;
        
        tokio::spawn(async move {
            let mut interval_timer = tokio::time::interval(interval);
            
            loop {
                interval_timer.tick().await;
                
                let mut sys = system.lock().await;
                sys.refresh_all();
                
                // Update system metrics
                cpu_gauge.set(sys.global_cpu_info().cpu_usage() as f64);
                memory_usage_gauge.set(sys.used_memory() as f64);
                memory_total_gauge.set(sys.total_memory() as f64);
                uptime_gauge.set(start_time.elapsed().as_secs() as f64);
            }
        });
        
        info!("Background metrics collection started with interval: {:?}", interval);
        Ok(())
    }
}

/// Prometheus metrics endpoint handler
pub async fn prometheus_metrics_endpoint(
    State((_, metrics)): State<(Arc<crate::monitoring::health::HealthChecker>, Arc<PrometheusMetrics>)>,
) -> Result<Response<String>, StatusCode> {
    match metrics.get_metrics_output().await {
        Ok(output) => {
            Ok(Response::builder()
                .header("content-type", "text/plain; version=0.0.4; charset=utf-8")
                .body(output)
                .unwrap())
        }
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

/// Tauri command to get metrics statistics
#[tauri::command]
pub async fn get_metrics_stats(
    metrics: tauri::State<'_, Arc<PrometheusMetrics>>,
) -> Result<serde_json::Value, String> {
    metrics.get_statistics().await.map_err(|e| e.to_string())
}

/// Tauri command to get raw metrics output
#[tauri::command]
pub async fn get_metrics_output(
    metrics: tauri::State<'_, Arc<PrometheusMetrics>>,
) -> Result<String, String> {
    metrics.get_metrics_output().await.map_err(|e| e.to_string())
}