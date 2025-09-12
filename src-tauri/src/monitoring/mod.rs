// AutoDev-AI Neural Bridge Platform - Monitoring Module
// Complete monitoring system with health checks, logging, and metrics

pub mod health;
pub mod logger;
pub mod metrics;
pub mod security_integration;

use anyhow::Result;
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::cors::CorsLayer;
use axum::{
    Router,
    routing::{get, post},
};
use tracing::{info, warn, error};

use crate::monitoring::security_integration::{SecurityMonitor, SecurityConfig};

/// Monitoring system configuration
#[derive(Debug, Clone)]
pub struct MonitoringConfig {
    pub health_check_port: u16,
    pub metrics_port: u16,
    pub log_level: String,
    pub log_dir: String,
    pub metrics_enabled: bool,
    pub health_checks_enabled: bool,
}

impl Default for MonitoringConfig {
    fn default() -> Self {
        Self {
            health_check_port: 8080,
            metrics_port: 8081,
            log_level: "info".to_string(),
            log_dir: "./logs".to_string(),
            metrics_enabled: true,
            health_checks_enabled: true,
        }
    }
}

/// Main monitoring system manager
pub struct MonitoringSystem {
    config: MonitoringConfig,
    logger: Arc<Mutex<logger::SecureLogger>>,
    metrics: Arc<metrics::PrometheusMetrics>,
    health_checker: Arc<health::HealthChecker>,
}

impl MonitoringSystem {
    /// Initialize the complete monitoring system
    pub async fn new(config: MonitoringConfig) -> Result<Self> {
        info!("Initializing AutoDev-AI monitoring system");

        // Initialize secure logger
        let logger = Arc::new(Mutex::new(
            logger::SecureLogger::new(&config.log_dir, &config.log_level).await?
        ));

        // Initialize Prometheus metrics
        let metrics = Arc::new(metrics::PrometheusMetrics::new()?);

        // Initialize health checker
        let health_checker = Arc::new(health::HealthChecker::new(
            logger.clone(),
            metrics.clone(),
        ).await?);

        Ok(Self {
            config,
            logger,
            metrics,
            health_checker,
        })
    }

    /// Start the monitoring HTTP server
    pub async fn start_server(&self) -> Result<()> {
        if !self.config.health_checks_enabled {
            info!("Health checks disabled, skipping server start");
            return Ok(());
        }

        info!("Starting monitoring server on port {}", self.config.health_check_port);

        let health_checker = Arc::clone(&self.health_checker);
        let metrics = Arc::clone(&self.metrics);
        
        // Create the monitoring routes
        let app = Router::new()
            .route("/health", get(health::basic_health_check))
            .route("/health/live", get(health::liveness_probe))
            .route("/health/ready", get(health::readiness_probe))
            .route("/metrics", get(metrics::prometheus_metrics_endpoint))
            .layer(CorsLayer::permissive())
            .with_state((health_checker, metrics));

        let listener = tokio::net::TcpListener::bind(
            format!("0.0.0.0:{}", self.config.health_check_port)
        ).await?;

        info!("Monitoring server listening on port {}", self.config.health_check_port);

        // Start the server
        tokio::spawn(async move {
            if let Err(e) = axum::serve(listener, app).await {
                error!("Monitoring server error: {}", e);
            }
        });

        Ok(())
    }

    /// Get system metrics
    pub async fn get_metrics(&self) -> Result<String> {
        self.metrics.get_metrics_output().await
    }

    /// Log a security event
    pub async fn log_security_event(&self, event: &str, details: &str) -> Result<()> {
        let mut logger = self.logger.lock().await;
        logger.log_security_event(event, details).await
    }

    /// Record custom metric
    pub fn record_metric(&self, name: &str, value: f64, labels: &[(&str, &str)]) -> Result<()> {
        self.metrics.record_custom_metric(name, value, labels)
    }

    /// Get health status
    pub async fn get_health_status(&self) -> Result<health::HealthStatus> {
        self.health_checker.check_system_health().await
    }

    /// Shutdown the monitoring system gracefully
    pub async fn shutdown(&self) -> Result<()> {
        info!("Shutting down monitoring system");
        
        let mut logger = self.logger.lock().await;
        logger.flush_logs().await?;
        
        info!("Monitoring system shutdown complete");
        Ok(())
    }
}

/// Initialize monitoring for the Tauri application
pub async fn setup_monitoring(app_handle: &tauri::AppHandle) -> Result<Arc<MonitoringSystem>> {
    let config = MonitoringConfig::default();
    let monitoring = Arc::new(MonitoringSystem::new(config).await?);
    
    // Start the monitoring server
    monitoring.start_server().await?;
    
    // Store the monitoring system in Tauri state
    app_handle.manage(monitoring.clone());
    
    info!("Monitoring system setup complete");
    Ok(monitoring)
}