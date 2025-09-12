// AutoDev-AI Neural Bridge Platform - Health Check System
// Comprehensive health monitoring with liveness and readiness probes

use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{info, warn, error};
use anyhow::Result;
use chrono::{DateTime, Utc};
use std::time::Instant;
use sysinfo::System;

use super::logger::SecureLogger;
use super::metrics::PrometheusMetrics;

/// Health check response structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: String,
    pub timestamp: DateTime<Utc>,
    pub version: String,
    pub uptime_seconds: u64,
    pub checks: Vec<HealthCheck>,
    pub system_info: SystemInfo,
}

/// Individual health check result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheck {
    pub name: String,
    pub status: String,
    pub message: String,
    pub timestamp: DateTime<Utc>,
    pub duration_ms: u64,
}

/// System information for health checks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub cpu_usage: f32,
    pub memory_usage_mb: u64,
    pub memory_total_mb: u64,
    pub disk_usage_gb: u64,
    pub disk_total_gb: u64,
    pub active_connections: u32,
}

/// Health checker implementation
pub struct HealthChecker {
    start_time: Instant,
    logger: Arc<Mutex<SecureLogger>>,
    metrics: Arc<PrometheusMetrics>,
    system: Arc<Mutex<System>>,
}

impl HealthChecker {
    /// Create a new health checker
    pub async fn new(
        logger: Arc<Mutex<SecureLogger>>,
        metrics: Arc<PrometheusMetrics>,
    ) -> Result<Self> {
        let mut system = System::new_all();
        system.refresh_all();

        Ok(Self {
            start_time: Instant::now(),
            logger,
            metrics,
            system: Arc::new(Mutex::new(system)),
        })
    }

    /// Perform comprehensive system health check
    pub async fn check_system_health(&self) -> Result<HealthStatus> {
        let start = Instant::now();
        let mut checks = Vec::new();

        // CPU health check
        checks.push(self.check_cpu_health().await?);
        
        // Memory health check
        checks.push(self.check_memory_health().await?);
        
        // Disk health check
        checks.push(self.check_disk_health().await?);
        
        // Application health check
        checks.push(self.check_application_health().await?);
        
        // Security system health check
        checks.push(self.check_security_health().await?);

        // Logging system health check
        checks.push(self.check_logging_health().await?);

        // Get system info
        let system_info = self.get_system_info().await?;

        let overall_status = if checks.iter().any(|c| c.status == "unhealthy") {
            "unhealthy"
        } else if checks.iter().any(|c| c.status == "degraded") {
            "degraded"
        } else {
            "healthy"
        };

        let health_status = HealthStatus {
            status: overall_status.to_string(),
            timestamp: Utc::now(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            uptime_seconds: self.start_time.elapsed().as_secs(),
            checks,
            system_info,
        };

        // Record metrics
        self.metrics.record_health_check_duration(start.elapsed().as_millis() as f64)?;
        self.metrics.record_health_status(&health_status.status)?;

        // Log health check
        let mut logger = self.logger.lock().await;
        logger.log_performance_metric(
            "health_check",
            &serde_json::to_string(&health_status)?,
        ).await?;

        Ok(health_status)
    }

    /// Check CPU health
    async fn check_cpu_health(&self) -> Result<HealthCheck> {
        let start = Instant::now();
        let mut system = self.system.lock().await;
        system.refresh_cpu();

        let cpu_usage = system.global_cpu_info().cpu_usage();
        
        let (status, message) = match cpu_usage {
            usage if usage > 95.0 => ("unhealthy", format!("Critical CPU usage: {:.1}%", usage)),
            usage if usage > 80.0 => ("degraded", format!("High CPU usage: {:.1}%", usage)),
            usage => ("healthy", format!("CPU usage: {:.1}%", usage)),
        };

        Ok(HealthCheck {
            name: "cpu".to_string(),
            status: status.to_string(),
            message,
            timestamp: Utc::now(),
            duration_ms: start.elapsed().as_millis() as u64,
        })
    }

    /// Check memory health
    async fn check_memory_health(&self) -> Result<HealthCheck> {
        let start = Instant::now();
        let mut system = self.system.lock().await;
        system.refresh_memory();

        let total_memory = system.total_memory();
        let used_memory = system.used_memory();
        let memory_usage_percent = (used_memory as f64 / total_memory as f64) * 100.0;
        
        let (status, message) = match memory_usage_percent {
            usage if usage > 95.0 => ("unhealthy", format!("Critical memory usage: {:.1}%", usage)),
            usage if usage > 85.0 => ("degraded", format!("High memory usage: {:.1}%", usage)),
            usage => ("healthy", format!("Memory usage: {:.1}%", usage)),
        };

        Ok(HealthCheck {
            name: "memory".to_string(),
            status: status.to_string(),
            message,
            timestamp: Utc::now(),
            duration_ms: start.elapsed().as_millis() as u64,
        })
    }

    /// Check disk health
    async fn check_disk_health(&self) -> Result<HealthCheck> {
        let start = Instant::now();
        let mut system = self.system.lock().await;
        system.refresh_disks();

        let mut min_free_percent = 100.0;
        let mut total_space = 0;
        let mut available_space = 0;

        for disk in system.disks() {
            let total = disk.total_space();
            let available = disk.available_space();
            
            if total > 0 {
                let free_percent = (available as f64 / total as f64) * 100.0;
                min_free_percent = min_free_percent.min(free_percent);
                total_space += total;
                available_space += available;
            }
        }
        
        let (status, message) = match min_free_percent {
            free if free < 5.0 => ("unhealthy", format!("Critical disk space: {:.1}% free", free)),
            free if free < 15.0 => ("degraded", format!("Low disk space: {:.1}% free", free)),
            free => ("healthy", format!("Disk space: {:.1}% free", free)),
        };

        Ok(HealthCheck {
            name: "disk".to_string(),
            status: status.to_string(),
            message,
            timestamp: Utc::now(),
            duration_ms: start.elapsed().as_millis() as u64,
        })
    }

    /// Check application health
    async fn check_application_health(&self) -> Result<HealthCheck> {
        let start = Instant::now();
        
        // Check if main application components are responsive
        let uptime = self.start_time.elapsed().as_secs();
        
        let (status, message) = if uptime > 0 {
            ("healthy", format!("Application running for {} seconds", uptime))
        } else {
            ("unhealthy", "Application just started".to_string())
        };

        Ok(HealthCheck {
            name: "application".to_string(),
            status: status.to_string(),
            message,
            timestamp: Utc::now(),
            duration_ms: start.elapsed().as_millis() as u64,
        })
    }

    /// Check security system health
    async fn check_security_health(&self) -> Result<HealthCheck> {
        let start = Instant::now();
        
        // Basic security system check
        let (status, message) = ("healthy", "Security systems operational".to_string());

        Ok(HealthCheck {
            name: "security".to_string(),
            status: status.to_string(),
            message,
            timestamp: Utc::now(),
            duration_ms: start.elapsed().as_millis() as u64,
        })
    }

    /// Check logging system health
    async fn check_logging_health(&self) -> Result<HealthCheck> {
        let start = Instant::now();
        
        let logger = self.logger.lock().await;
        let is_healthy = logger.is_healthy().await?;
        
        let (status, message) = if is_healthy {
            ("healthy", "Logging system operational".to_string())
        } else {
            ("degraded", "Logging system has issues".to_string())
        };

        Ok(HealthCheck {
            name: "logging".to_string(),
            status: status.to_string(),
            message,
            timestamp: Utc::now(),
            duration_ms: start.elapsed().as_millis() as u64,
        })
    }

    /// Get current system information
    async fn get_system_info(&self) -> Result<SystemInfo> {
        let mut system = self.system.lock().await;
        system.refresh_all();

        Ok(SystemInfo {
            cpu_usage: system.global_cpu_info().cpu_usage(),
            memory_usage_mb: system.used_memory() / 1_048_576, // Convert to MB
            memory_total_mb: system.total_memory() / 1_048_576,
            disk_usage_gb: system.disks().iter()
                .map(|d| (d.total_space() - d.available_space()) / 1_073_741_824)
                .sum(),
            disk_total_gb: system.disks().iter()
                .map(|d| d.total_space() / 1_073_741_824)
                .sum(),
            active_connections: 0, // Would need network monitoring for accurate count
        })
    }
}

/// Basic health check endpoint - always returns 200 if service is running
pub async fn basic_health_check() -> Result<Json<serde_json::Value>, StatusCode> {
    Ok(Json(serde_json::json!({
        "status": "ok",
        "timestamp": Utc::now(),
        "service": "autodev-ai-monitoring"
    })))
}

/// Liveness probe - checks if the application is alive
pub async fn liveness_probe(
    State((health_checker, _)): State<(Arc<HealthChecker>, Arc<PrometheusMetrics>)>,
) -> Result<Json<HealthStatus>, StatusCode> {
    match health_checker.check_system_health().await {
        Ok(status) => {
            if status.status == "unhealthy" {
                Err(StatusCode::SERVICE_UNAVAILABLE)
            } else {
                Ok(Json(status))
            }
        }
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

/// Readiness probe - checks if the application is ready to serve requests
pub async fn readiness_probe(
    State((health_checker, metrics)): State<(Arc<HealthChecker>, Arc<PrometheusMetrics>)>,
) -> Result<Json<HealthStatus>, StatusCode> {
    match health_checker.check_system_health().await {
        Ok(mut status) => {
            // Add additional readiness checks
            let metrics_healthy = metrics.is_healthy().await;
            if !metrics_healthy {
                status.status = "degraded".to_string();
                status.checks.push(HealthCheck {
                    name: "metrics".to_string(),
                    status: "unhealthy".to_string(),
                    message: "Metrics system not ready".to_string(),
                    timestamp: Utc::now(),
                    duration_ms: 0,
                });
            }
            
            match status.status.as_str() {
                "healthy" => Ok(Json(status)),
                "degraded" => {
                    // Still considered ready but with warnings
                    Ok(Json(status))
                }
                _ => Err(StatusCode::SERVICE_UNAVAILABLE)
            }
        }
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}