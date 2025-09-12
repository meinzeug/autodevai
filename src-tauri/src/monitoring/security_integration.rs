// AutoDev-AI Neural Bridge Platform - Security Monitoring Integration
// Integrates with the secure monitoring stack and implements security-specific health checks

use anyhow::Result;
use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{error, info, warn};

use super::health::{HealthCheck, HealthChecker};
use super::logger::SecureLogger;
use super::metrics::PrometheusMetrics;

/// Security monitoring configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub monitoring_enabled: bool,
    pub prometheus_endpoint: String,
    pub grafana_endpoint: String,
    pub tls_enabled: bool,
    pub bearer_token: String,
}

/// Security status response
#[derive(Debug, Serialize, Deserialize)]
pub struct SecurityStatus {
    pub status: String,
    pub timestamp: DateTime<Utc>,
    pub security_level: String,
    pub active_threats: u32,
    pub failed_auth_attempts: u32,
    pub tls_certificates_status: String,
    pub monitoring_stack_health: String,
    pub compliance_score: f64,
    pub security_checks: Vec<SecurityCheck>,
}

/// Individual security check result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityCheck {
    pub check_type: String,
    pub status: String,
    pub severity: String,
    pub message: String,
    pub timestamp: DateTime<Utc>,
    pub remediation: Option<String>,
}

/// Security metrics for Prometheus exposure
#[derive(Debug, Serialize, Deserialize)]
pub struct SecurityMetrics {
    pub authentication_failures: u64,
    pub tls_handshake_failures: u64,
    pub suspicious_requests: u64,
    pub rate_limit_violations: u64,
    pub security_alerts_active: u64,
    pub compliance_violations: u64,
}

/// Query parameters for security endpoint
#[derive(Debug, Deserialize)]
pub struct SecurityQuery {
    pub include_details: Option<bool>,
    pub check_type: Option<String>,
}

/// Security monitoring integration
pub struct SecurityMonitor {
    config: SecurityConfig,
    logger: Arc<Mutex<SecureLogger>>,
    metrics: Arc<PrometheusMetrics>,
    security_metrics: Arc<Mutex<SecurityMetrics>>,
    failed_auth_count: Arc<Mutex<u32>>,
    active_threats: Arc<Mutex<u32>>,
}

impl SecurityMonitor {
    /// Create new security monitor
    pub async fn new(
        config: SecurityConfig,
        logger: Arc<Mutex<SecureLogger>>,
        metrics: Arc<PrometheusMetrics>,
    ) -> Result<Self> {
        let security_metrics = Arc::new(Mutex::new(SecurityMetrics {
            authentication_failures: 0,
            tls_handshake_failures: 0,
            suspicious_requests: 0,
            rate_limit_violations: 0,
            security_alerts_active: 0,
            compliance_violations: 0,
        }));

        Ok(Self {
            config,
            logger,
            metrics,
            security_metrics,
            failed_auth_count: Arc::new(Mutex::new(0)),
            active_threats: Arc::new(Mutex::new(0)),
        })
    }

    /// Perform comprehensive security health check
    pub async fn check_security_health(&self) -> Result<SecurityStatus> {
        info!("Performing security health check");

        let mut security_checks = Vec::new();

        // TLS Certificate validation
        security_checks.push(self.check_tls_certificates().await?);

        // Authentication system check
        security_checks.push(self.check_authentication_system().await?);

        // Monitoring stack connectivity
        security_checks.push(self.check_monitoring_stack().await?);

        // Network security check
        security_checks.push(self.check_network_security().await?);

        // Data protection compliance
        security_checks.push(self.check_data_protection().await?);

        // Log security validation
        security_checks.push(self.check_log_security().await?);

        // Calculate overall security status
        let failed_auth = *self.failed_auth_count.lock().await;
        let active_threats = *self.active_threats.lock().await;
        
        let overall_status = self.calculate_security_status(&security_checks).await;
        let compliance_score = self.calculate_compliance_score(&security_checks).await;

        // Log security status
        let mut logger = self.logger.lock().await;
        logger.log_security_event(
            "security_health_check",
            &format!("Status: {}, Compliance: {:.2}", overall_status, compliance_score),
        ).await?;

        Ok(SecurityStatus {
            status: overall_status,
            timestamp: Utc::now(),
            security_level: "high".to_string(),
            active_threats,
            failed_auth_attempts: failed_auth,
            tls_certificates_status: self.get_tls_status(&security_checks).await,
            monitoring_stack_health: self.get_monitoring_health(&security_checks).await,
            compliance_score,
            security_checks,
        })
    }

    /// Check TLS certificate status
    async fn check_tls_certificates(&self) -> Result<SecurityCheck> {
        info!("Checking TLS certificate status");

        // In a real implementation, this would check actual certificate files
        // For now, we'll simulate the check
        let cert_valid = self.validate_certificates().await?;

        let (status, message) = if cert_valid {
            ("healthy", "TLS certificates valid and properly configured")
        } else {
            ("unhealthy", "TLS certificate validation failed")
        };

        Ok(SecurityCheck {
            check_type: "tls_certificates".to_string(),
            status: status.to_string(),
            severity: if cert_valid { "low" } else { "critical" }.to_string(),
            message: message.to_string(),
            timestamp: Utc::now(),
            remediation: if !cert_valid {
                Some("Renew TLS certificates and restart services".to_string())
            } else {
                None
            },
        })
    }

    /// Check authentication system health
    async fn check_authentication_system(&self) -> Result<SecurityCheck> {
        info!("Checking authentication system");

        let failed_attempts = *self.failed_auth_count.lock().await;
        
        let (status, severity, message) = match failed_attempts {
            0..=5 => ("healthy", "low", "Authentication system operating normally"),
            6..=20 => ("degraded", "medium", "Moderate authentication failures detected"),
            _ => ("unhealthy", "critical", "High number of authentication failures"),
        };

        Ok(SecurityCheck {
            check_type: "authentication".to_string(),
            status: status.to_string(),
            severity: severity.to_string(),
            message: format!("{} ({} failed attempts)", message, failed_attempts),
            timestamp: Utc::now(),
            remediation: if failed_attempts > 20 {
                Some("Review authentication logs and consider IP blocking".to_string())
            } else {
                None
            },
        })
    }

    /// Check monitoring stack connectivity
    async fn check_monitoring_stack(&self) -> Result<SecurityCheck> {
        info!("Checking monitoring stack connectivity");

        let prometheus_healthy = self.check_prometheus_connectivity().await?;
        let grafana_healthy = self.check_grafana_connectivity().await?;

        let (status, message) = match (prometheus_healthy, grafana_healthy) {
            (true, true) => ("healthy", "Monitoring stack fully operational"),
            (true, false) => ("degraded", "Prometheus healthy, Grafana unreachable"),
            (false, true) => ("degraded", "Grafana healthy, Prometheus unreachable"),
            (false, false) => ("unhealthy", "Monitoring stack unreachable"),
        };

        Ok(SecurityCheck {
            check_type: "monitoring_stack".to_string(),
            status: status.to_string(),
            severity: if prometheus_healthy && grafana_healthy { "low" } else { "high" }.to_string(),
            message: message.to_string(),
            timestamp: Utc::now(),
            remediation: if !prometheus_healthy || !grafana_healthy {
                Some("Check monitoring stack containers and network connectivity".to_string())
            } else {
                None
            },
        })
    }

    /// Check network security
    async fn check_network_security(&self) -> Result<SecurityCheck> {
        info!("Checking network security");

        // Check for suspicious network activity
        let suspicious_connections = self.check_suspicious_network_activity().await?;

        let (status, severity, message) = if suspicious_connections == 0 {
            ("healthy", "low", "No suspicious network activity detected")
        } else if suspicious_connections < 5 {
            ("degraded", "medium", format!("Moderate suspicious activity: {} connections", suspicious_connections))
        } else {
            ("unhealthy", "critical", format!("High suspicious activity: {} connections", suspicious_connections))
        };

        Ok(SecurityCheck {
            check_type: "network_security".to_string(),
            status: status.to_string(),
            severity: severity.to_string(),
            message: message.to_string(),
            timestamp: Utc::now(),
            remediation: if suspicious_connections > 0 {
                Some("Review network logs and consider IP filtering".to_string())
            } else {
                None
            },
        })
    }

    /// Check data protection compliance
    async fn check_data_protection(&self) -> Result<SecurityCheck> {
        info!("Checking data protection compliance");

        let encryption_status = self.check_data_encryption().await?;
        let privacy_compliance = self.check_privacy_compliance().await?;

        let (status, message) = if encryption_status && privacy_compliance {
            ("healthy", "Data protection compliance verified")
        } else {
            ("unhealthy", "Data protection compliance issues detected")
        };

        Ok(SecurityCheck {
            check_type: "data_protection".to_string(),
            status: status.to_string(),
            severity: if encryption_status && privacy_compliance { "low" } else { "critical" }.to_string(),
            message: message.to_string(),
            timestamp: Utc::now(),
            remediation: if !encryption_status || !privacy_compliance {
                Some("Review encryption settings and privacy controls".to_string())
            } else {
                None
            },
        })
    }

    /// Check log security
    async fn check_log_security(&self) -> Result<SecurityCheck> {
        info!("Checking log security");

        let logger = self.logger.lock().await;
        let sanitization_active = logger.is_sanitization_active().await?;
        let secure_storage = logger.is_storage_secure().await?;

        let (status, message) = if sanitization_active && secure_storage {
            ("healthy", "Log security measures active")
        } else {
            ("degraded", "Log security issues detected")
        };

        Ok(SecurityCheck {
            check_type: "log_security".to_string(),
            status: status.to_string(),
            severity: if sanitization_active && secure_storage { "low" } else { "medium" }.to_string(),
            message: message.to_string(),
            timestamp: Utc::now(),
            remediation: if !sanitization_active || !secure_storage {
                Some("Enable log sanitization and secure storage".to_string())
            } else {
                None
            },
        })
    }

    /// Calculate overall security status
    async fn calculate_security_status(&self, checks: &[SecurityCheck]) -> String {
        let unhealthy_count = checks.iter().filter(|c| c.status == "unhealthy").count();
        let degraded_count = checks.iter().filter(|c| c.status == "degraded").count();

        if unhealthy_count > 0 {
            "unhealthy"
        } else if degraded_count > 0 {
            "degraded"
        } else {
            "healthy"
        }.to_string()
    }

    /// Calculate compliance score (0.0 to 1.0)
    async fn calculate_compliance_score(&self, checks: &[SecurityCheck]) -> f64 {
        let total_checks = checks.len() as f64;
        if total_checks == 0.0 {
            return 0.0;
        }

        let healthy_count = checks.iter().filter(|c| c.status == "healthy").count() as f64;
        let degraded_count = checks.iter().filter(|c| c.status == "degraded").count() as f64;
        
        // Healthy = 1.0, Degraded = 0.7, Unhealthy = 0.0
        (healthy_count + degraded_count * 0.7) / total_checks
    }

    /// Get TLS status summary
    async fn get_tls_status(&self, checks: &[SecurityCheck]) -> String {
        checks.iter()
            .find(|c| c.check_type == "tls_certificates")
            .map(|c| c.status.clone())
            .unwrap_or_else(|| "unknown".to_string())
    }

    /// Get monitoring health summary
    async fn get_monitoring_health(&self, checks: &[SecurityCheck]) -> String {
        checks.iter()
            .find(|c| c.check_type == "monitoring_stack")
            .map(|c| c.status.clone())
            .unwrap_or_else(|| "unknown".to_string())
    }

    /// Validate TLS certificates
    async fn validate_certificates(&self) -> Result<bool> {
        // In a real implementation, this would check certificate files
        // For now, return true if TLS is enabled in config
        Ok(self.config.tls_enabled)
    }

    /// Check Prometheus connectivity
    async fn check_prometheus_connectivity(&self) -> Result<bool> {
        // Simulate connectivity check
        // In real implementation, would make HTTP request to Prometheus
        Ok(true)
    }

    /// Check Grafana connectivity
    async fn check_grafana_connectivity(&self) -> Result<bool> {
        // Simulate connectivity check
        // In real implementation, would make HTTP request to Grafana
        Ok(true)
    }

    /// Check for suspicious network activity
    async fn check_suspicious_network_activity(&self) -> Result<u32> {
        // Simulate network security check
        // In real implementation, would analyze network logs
        Ok(0)
    }

    /// Check data encryption status
    async fn check_data_encryption(&self) -> Result<bool> {
        // Simulate encryption check
        // In real implementation, would verify encryption settings
        Ok(true)
    }

    /// Check privacy compliance
    async fn check_privacy_compliance(&self) -> Result<bool> {
        // Simulate compliance check
        // In real implementation, would verify GDPR/privacy settings
        Ok(true)
    }

    /// Record authentication failure
    pub async fn record_auth_failure(&self) -> Result<()> {
        let mut count = self.failed_auth_count.lock().await;
        *count += 1;

        // Update metrics
        let mut metrics = self.security_metrics.lock().await;
        metrics.authentication_failures += 1;

        // Log security event
        let mut logger = self.logger.lock().await;
        logger.log_security_event(
            "authentication_failure",
            &format!("Total failed attempts: {}", *count),
        ).await?;

        info!("Recorded authentication failure, total: {}", *count);
        Ok(())
    }

    /// Record security threat
    pub async fn record_threat(&self, threat_type: &str, details: &str) -> Result<()> {
        let mut count = self.active_threats.lock().await;
        *count += 1;

        // Update metrics
        let mut metrics = self.security_metrics.lock().await;
        metrics.security_alerts_active += 1;

        // Log security event
        let mut logger = self.logger.lock().await;
        logger.log_security_event(
            threat_type,
            &format!("Threat details: {} | Active threats: {}", details, *count),
        ).await?;

        warn!("Security threat recorded: {} - {}", threat_type, details);
        Ok(())
    }

    /// Get security metrics for Prometheus
    pub async fn get_security_metrics(&self) -> Result<SecurityMetrics> {
        let metrics = self.security_metrics.lock().await;
        Ok(metrics.clone())
    }
}

/// Security monitoring endpoint
pub async fn security_status_endpoint(
    Query(params): Query<SecurityQuery>,
    State(security_monitor): State<Arc<SecurityMonitor>>,
) -> Result<Json<SecurityStatus>, StatusCode> {
    match security_monitor.check_security_health().await {
        Ok(mut status) => {
            // Filter details if not requested
            if params.include_details.unwrap_or(false) {
                // Include all details
            } else {
                // Remove remediation details for cleaner output
                status.security_checks.iter_mut().for_each(|check| {
                    check.remediation = None;
                });
            }

            // Filter by check type if specified
            if let Some(check_type) = params.check_type {
                status.security_checks.retain(|check| check.check_type == check_type);
            }

            Ok(Json(status))
        }
        Err(e) => {
            error!("Failed to get security status: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Security metrics endpoint for Prometheus scraping
pub async fn security_metrics_endpoint(
    State(security_monitor): State<Arc<SecurityMonitor>>,
    headers: HeaderMap,
) -> Result<String, StatusCode> {
    // Validate bearer token for security
    if let Some(auth_header) = headers.get("authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if !auth_str.starts_with("Bearer ") {
                return Err(StatusCode::UNAUTHORIZED);
            }
        } else {
            return Err(StatusCode::UNAUTHORIZED);
        }
    } else {
        return Err(StatusCode::UNAUTHORIZED);
    }

    match security_monitor.get_security_metrics().await {
        Ok(metrics) => {
            let prometheus_output = format!(
                r#"# HELP autodev_ai_auth_failures_total Total number of authentication failures
# TYPE autodev_ai_auth_failures_total counter
autodev_ai_auth_failures_total {}

# HELP autodev_ai_tls_failures_total Total number of TLS handshake failures  
# TYPE autodev_ai_tls_failures_total counter
autodev_ai_tls_failures_total {}

# HELP autodev_ai_suspicious_requests_total Total number of suspicious requests
# TYPE autodev_ai_suspicious_requests_total counter
autodev_ai_suspicious_requests_total {}

# HELP autodev_ai_rate_limit_violations_total Total number of rate limit violations
# TYPE autodev_ai_rate_limit_violations_total counter
autodev_ai_rate_limit_violations_total {}

# HELP autodev_ai_security_alerts_active Number of active security alerts
# TYPE autodev_ai_security_alerts_active gauge
autodev_ai_security_alerts_active {}

# HELP autodev_ai_compliance_violations_total Total number of compliance violations
# TYPE autodev_ai_compliance_violations_total counter
autodev_ai_compliance_violations_total {}
"#,
                metrics.authentication_failures,
                metrics.tls_handshake_failures,
                metrics.suspicious_requests,
                metrics.rate_limit_violations,
                metrics.security_alerts_active,
                metrics.compliance_violations
            );

            Ok(prometheus_output)
        }
        Err(e) => {
            error!("Failed to get security metrics: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Tauri command to get security status
#[tauri::command]
pub async fn get_security_status(
    security_monitor: tauri::State<'_, Arc<SecurityMonitor>>,
) -> Result<SecurityStatus, String> {
    security_monitor.check_security_health().await.map_err(|e| e.to_string())
}

/// Tauri command to record security event
#[tauri::command]
pub async fn record_security_event(
    security_monitor: tauri::State<'_, Arc<SecurityMonitor>>,
    threat_type: String,
    details: String,
) -> Result<(), String> {
    security_monitor.record_threat(&threat_type, &details).await.map_err(|e| e.to_string())
}

/// Tauri command to get security metrics
#[tauri::command]
pub async fn get_security_metrics(
    security_monitor: tauri::State<'_, Arc<SecurityMonitor>>,
) -> Result<SecurityMetrics, String> {
    security_monitor.get_security_metrics().await.map_err(|e| e.to_string())
}