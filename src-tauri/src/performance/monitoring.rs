// Real-time performance monitoring with Grafana integration and alerting
// Provides comprehensive system monitoring, metrics collection, and performance dashboards

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use tokio::time::{interval, Duration, Instant};
use tracing::{debug, error, info, warn};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringConfig {
    pub enabled: bool,
    pub collection_interval_seconds: u64,
    pub retention_days: u32,
    pub grafana_enabled: bool,
    pub grafana_endpoint: Option<String>,
    pub prometheus_port: u16,
    pub alert_thresholds: AlertConfig,
    pub metrics_buffer_size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertConfig {
    pub cpu_threshold_percent: f64,
    pub memory_threshold_percent: f64,
    pub disk_threshold_percent: f64,
    pub response_time_threshold_ms: u64,
    pub error_rate_threshold_percent: f64,
    pub queue_depth_threshold: usize,
}

impl Default for MonitoringConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            collection_interval_seconds: 10,
            retention_days: 30,
            grafana_enabled: false,
            grafana_endpoint: None,
            prometheus_port: 9090,
            alert_thresholds: AlertConfig {
                cpu_threshold_percent: 80.0,
                memory_threshold_percent: 85.0,
                disk_threshold_percent: 90.0,
                response_time_threshold_ms: 1000,
                error_rate_threshold_percent: 5.0,
                queue_depth_threshold: 100,
            },
            metrics_buffer_size: 10000,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub timestamp: i64,
    pub cpu_usage_percent: f64,
    pub memory_usage_mb: u64,
    pub memory_total_mb: u64,
    pub disk_usage_percent: f64,
    pub disk_total_gb: u64,
    pub network_bytes_in: u64,
    pub network_bytes_out: u64,
    pub active_connections: u32,
    pub thread_count: u32,
    pub file_descriptors: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplicationMetrics {
    pub timestamp: i64,
    pub requests_per_second: f64,
    pub average_response_time_ms: f64,
    pub p95_response_time_ms: f64,
    pub p99_response_time_ms: f64,
    pub error_rate_percent: f64,
    pub active_tasks: u32,
    pub queue_depth: u32,
    pub cache_hit_rate: f64,
    pub database_connections: u32,
    pub database_query_time_ms: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIMetrics {
    pub timestamp: i64,
    pub ai_requests_per_second: f64,
    pub ai_response_time_ms: f64,
    pub ai_success_rate: f64,
    pub token_usage_per_minute: u64,
    pub model_inference_time_ms: f64,
    pub concurrent_ai_operations: u32,
    pub ai_queue_depth: u32,
    pub cost_per_hour_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub id: Uuid,
    pub alert_type: AlertType,
    pub severity: AlertSeverity,
    pub title: String,
    pub description: String,
    pub triggered_at: i64,
    pub resolved_at: Option<i64>,
    pub metric_value: f64,
    pub threshold_value: f64,
    pub actions_taken: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertType {
    SystemResource,
    Application,
    AI,
    Performance,
    Security,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertSeverity {
    Critical,
    Warning,
    Info,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceDashboard {
    pub system_health_score: f64,
    pub application_performance_score: f64,
    pub ai_efficiency_score: f64,
    pub recent_alerts: Vec<Alert>,
    pub key_metrics: HashMap<String, f64>,
    pub performance_trends: HashMap<String, Vec<(i64, f64)>>,
}

pub struct PerformanceMonitor {
    config: MonitoringConfig,
    system_metrics: Arc<RwLock<Vec<SystemMetrics>>>,
    application_metrics: Arc<RwLock<Vec<ApplicationMetrics>>>,
    ai_metrics: Arc<RwLock<Vec<AIMetrics>>>,
    active_alerts: Arc<RwLock<HashMap<Uuid, Alert>>>,
    alert_history: Arc<RwLock<Vec<Alert>>>,
    collection_task: Option<tokio::task::JoinHandle<()>>,
    prometheus_client: Option<PrometheusClient>,
    grafana_client: Option<GrafanaClient>,
}

struct PrometheusClient {
    endpoint: String,
    client: reqwest::Client,
}

struct GrafanaClient {
    endpoint: String,
    api_key: String,
    client: reqwest::Client,
}

impl PerformanceMonitor {
    pub fn new(config: MonitoringConfig) -> Self {
        let prometheus_client = Some(PrometheusClient {
            endpoint: format!("http://localhost:{}", config.prometheus_port),
            client: reqwest::Client::new(),
        });

        let grafana_client = if config.grafana_enabled && config.grafana_endpoint.is_some() {
            Some(GrafanaClient {
                endpoint: config.grafana_endpoint.clone().unwrap(),
                api_key: std::env::var("GRAFANA_API_KEY").unwrap_or_default(),
                client: reqwest::Client::new(),
            })
        } else {
            None
        };

        info!(
            "Performance monitor initialized with Prometheus: {}, Grafana: {}",
            prometheus_client.is_some(),
            grafana_client.is_some()
        );

        Self {
            config,
            system_metrics: Arc::new(RwLock::new(Vec::new())),
            application_metrics: Arc::new(RwLock::new(Vec::new())),
            ai_metrics: Arc::new(RwLock::new(Vec::new())),
            active_alerts: Arc::new(RwLock::new(HashMap::new())),
            alert_history: Arc::new(RwLock::new(Vec::new())),
            collection_task: None,
            prometheus_client,
            grafana_client,
        }
    }

    pub async fn start_monitoring(&mut self) -> anyhow::Result<()> {
        if !self.config.enabled {
            info!("Performance monitoring is disabled");
            return Ok(());
        }

        info!(
            "Starting performance monitoring with {}s interval",
            self.config.collection_interval_seconds
        );

        let system_metrics = Arc::clone(&self.system_metrics);
        let application_metrics = Arc::clone(&self.application_metrics);
        let ai_metrics = Arc::clone(&self.ai_metrics);
        let active_alerts = Arc::clone(&self.active_alerts);
        let alert_history = Arc::clone(&self.alert_history);
        let config = self.config.clone();

        let collection_task = tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(config.collection_interval_seconds));

            loop {
                interval.tick().await;

                // Collect system metrics
                if let Ok(sys_metrics) = Self::collect_system_metrics().await {
                    let mut metrics = system_metrics.write().await;
                    metrics.push(sys_metrics.clone());

                    // Limit buffer size
                    if metrics.len() > config.metrics_buffer_size {
                        metrics.drain(0..config.metrics_buffer_size / 2);
                    }

                    // Check system alerts
                    Self::check_system_alerts(
                        &sys_metrics,
                        &config.alert_thresholds,
                        &active_alerts,
                        &alert_history,
                    )
                    .await;
                }

                // Collect application metrics
                if let Ok(app_metrics) = Self::collect_application_metrics().await {
                    let mut metrics = application_metrics.write().await;
                    metrics.push(app_metrics.clone());

                    if metrics.len() > config.metrics_buffer_size {
                        metrics.drain(0..config.metrics_buffer_size / 2);
                    }

                    // Check application alerts
                    Self::check_application_alerts(
                        &app_metrics,
                        &config.alert_thresholds,
                        &active_alerts,
                        &alert_history,
                    )
                    .await;
                }

                // Collect AI metrics
                if let Ok(ai_metrics_data) = Self::collect_ai_metrics().await {
                    let mut metrics = ai_metrics.write().await;
                    metrics.push(ai_metrics_data);

                    if metrics.len() > config.metrics_buffer_size {
                        metrics.drain(0..config.metrics_buffer_size / 2);
                    }
                }

                debug!("Metrics collection cycle completed");
            }
        });

        self.collection_task = Some(collection_task);
        Ok(())
    }

    pub async fn stop_monitoring(&mut self) {
        if let Some(task) = self.collection_task.take() {
            task.abort();
            info!("Performance monitoring stopped");
        }
    }

    async fn collect_system_metrics() -> anyhow::Result<SystemMetrics> {
        // In a real implementation, this would use system APIs
        // For now, we'll return mock data with some realistic variations

        let timestamp = chrono::Utc::now().timestamp();

        Ok(SystemMetrics {
            timestamp,
            cpu_usage_percent: 45.0 + (timestamp % 30) as f64,
            memory_usage_mb: 1024 + (timestamp % 500) as u64,
            memory_total_mb: 8192,
            disk_usage_percent: 65.0 + (timestamp % 10) as f64,
            disk_total_gb: 256,
            network_bytes_in: 1024 * 1024 + (timestamp as u64 * 1024),
            network_bytes_out: 512 * 1024 + (timestamp as u64 * 512),
            active_connections: 25 + (timestamp % 50) as u32,
            thread_count: 120 + (timestamp % 20) as u32,
            file_descriptors: 256 + (timestamp % 100) as u32,
        })
    }

    async fn collect_application_metrics() -> anyhow::Result<ApplicationMetrics> {
        let timestamp = chrono::Utc::now().timestamp();

        Ok(ApplicationMetrics {
            timestamp,
            requests_per_second: 50.0 + (timestamp % 20) as f64,
            average_response_time_ms: 150.0 + (timestamp % 50) as f64,
            p95_response_time_ms: 300.0 + (timestamp % 100) as f64,
            p99_response_time_ms: 500.0 + (timestamp % 200) as f64,
            error_rate_percent: 1.0 + (timestamp % 5) as f64 / 10.0,
            active_tasks: 15 + (timestamp % 30) as u32,
            queue_depth: 5 + (timestamp % 20) as u32,
            cache_hit_rate: 85.0 + (timestamp % 10) as f64,
            database_connections: 8 + (timestamp % 5) as u32,
            database_query_time_ms: 50.0 + (timestamp % 30) as f64,
        })
    }

    async fn collect_ai_metrics() -> anyhow::Result<AIMetrics> {
        let timestamp = chrono::Utc::now().timestamp();

        Ok(AIMetrics {
            timestamp,
            ai_requests_per_second: 10.0 + (timestamp % 15) as f64,
            ai_response_time_ms: 800.0 + (timestamp % 400) as f64,
            ai_success_rate: 95.0 + (timestamp % 5) as f64,
            token_usage_per_minute: 1000 + (timestamp % 500) as u64,
            model_inference_time_ms: 200.0 + (timestamp % 100) as f64,
            concurrent_ai_operations: 3 + (timestamp % 8) as u32,
            ai_queue_depth: 2 + (timestamp % 10) as u32,
            cost_per_hour_usd: 0.50 + (timestamp % 10) as f64 / 100.0,
        })
    }

    async fn check_system_alerts(
        metrics: &SystemMetrics,
        thresholds: &AlertConfig,
        active_alerts: &Arc<RwLock<HashMap<Uuid, Alert>>>,
        alert_history: &Arc<RwLock<Vec<Alert>>>,
    ) {
        // CPU usage alert
        if metrics.cpu_usage_percent > thresholds.cpu_threshold_percent {
            let alert = Alert {
                id: Uuid::new_v4(),
                alert_type: AlertType::SystemResource,
                severity: if metrics.cpu_usage_percent > 90.0 {
                    AlertSeverity::Critical
                } else {
                    AlertSeverity::Warning
                },
                title: "High CPU Usage".to_string(),
                description: format!(
                    "CPU usage is {}%, exceeding threshold of {}%",
                    metrics.cpu_usage_percent, thresholds.cpu_threshold_percent
                ),
                triggered_at: metrics.timestamp,
                resolved_at: None,
                metric_value: metrics.cpu_usage_percent,
                threshold_value: thresholds.cpu_threshold_percent,
                actions_taken: vec!["Monitoring escalated".to_string()],
            };

            let mut alerts = active_alerts.write().await;
            alerts.insert(alert.id, alert.clone());

            let mut history = alert_history.write().await;
            history.push(alert);

            warn!("CPU usage alert triggered: {}%", metrics.cpu_usage_percent);
        }

        // Memory usage alert
        let memory_usage_percent =
            (metrics.memory_usage_mb as f64 / metrics.memory_total_mb as f64) * 100.0;
        if memory_usage_percent > thresholds.memory_threshold_percent {
            let alert = Alert {
                id: Uuid::new_v4(),
                alert_type: AlertType::SystemResource,
                severity: if memory_usage_percent > 95.0 {
                    AlertSeverity::Critical
                } else {
                    AlertSeverity::Warning
                },
                title: "High Memory Usage".to_string(),
                description: format!(
                    "Memory usage is {:.1}%, exceeding threshold of {}%",
                    memory_usage_percent, thresholds.memory_threshold_percent
                ),
                triggered_at: metrics.timestamp,
                resolved_at: None,
                metric_value: memory_usage_percent,
                threshold_value: thresholds.memory_threshold_percent,
                actions_taken: vec!["Memory cleanup suggested".to_string()],
            };

            let mut alerts = active_alerts.write().await;
            alerts.insert(alert.id, alert.clone());

            let mut history = alert_history.write().await;
            history.push(alert);

            warn!("Memory usage alert triggered: {:.1}%", memory_usage_percent);
        }
    }

    async fn check_application_alerts(
        metrics: &ApplicationMetrics,
        thresholds: &AlertConfig,
        active_alerts: &Arc<RwLock<HashMap<Uuid, Alert>>>,
        alert_history: &Arc<RwLock<Vec<Alert>>>,
    ) {
        // Response time alert
        if metrics.average_response_time_ms > thresholds.response_time_threshold_ms as f64 {
            let alert = Alert {
                id: Uuid::new_v4(),
                alert_type: AlertType::Performance,
                severity: if metrics.average_response_time_ms > 2000.0 {
                    AlertSeverity::Critical
                } else {
                    AlertSeverity::Warning
                },
                title: "High Response Time".to_string(),
                description: format!(
                    "Average response time is {:.1}ms, exceeding threshold of {}ms",
                    metrics.average_response_time_ms, thresholds.response_time_threshold_ms
                ),
                triggered_at: metrics.timestamp,
                resolved_at: None,
                metric_value: metrics.average_response_time_ms,
                threshold_value: thresholds.response_time_threshold_ms as f64,
                actions_taken: vec!["Performance analysis recommended".to_string()],
            };

            let mut alerts = active_alerts.write().await;
            alerts.insert(alert.id, alert.clone());

            let mut history = alert_history.write().await;
            history.push(alert);

            warn!(
                "Response time alert triggered: {:.1}ms",
                metrics.average_response_time_ms
            );
        }

        // Error rate alert
        if metrics.error_rate_percent > thresholds.error_rate_threshold_percent {
            let alert = Alert {
                id: Uuid::new_v4(),
                alert_type: AlertType::Application,
                severity: if metrics.error_rate_percent > 10.0 {
                    AlertSeverity::Critical
                } else {
                    AlertSeverity::Warning
                },
                title: "High Error Rate".to_string(),
                description: format!(
                    "Error rate is {:.1}%, exceeding threshold of {}%",
                    metrics.error_rate_percent, thresholds.error_rate_threshold_percent
                ),
                triggered_at: metrics.timestamp,
                resolved_at: None,
                metric_value: metrics.error_rate_percent,
                threshold_value: thresholds.error_rate_threshold_percent,
                actions_taken: vec!["Error investigation required".to_string()],
            };

            let mut alerts = active_alerts.write().await;
            alerts.insert(alert.id, alert.clone());

            let mut history = alert_history.write().await;
            history.push(alert);

            warn!(
                "Error rate alert triggered: {:.1}%",
                metrics.error_rate_percent
            );
        }
    }

    pub async fn get_current_dashboard(&self) -> PerformanceDashboard {
        let system_metrics = self.system_metrics.read().await;
        let application_metrics = self.application_metrics.read().await;
        let ai_metrics = self.ai_metrics.read().await;
        let active_alerts = self.active_alerts.read().await;

        // Calculate health scores
        let system_health_score = Self::calculate_system_health_score(&system_metrics);
        let application_performance_score =
            Self::calculate_application_performance_score(&application_metrics);
        let ai_efficiency_score = Self::calculate_ai_efficiency_score(&ai_metrics);

        // Get recent alerts (last 10)
        let recent_alerts: Vec<Alert> = active_alerts
            .values()
            .cloned()
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .take(10)
            .collect();

        // Build key metrics map
        let mut key_metrics = HashMap::new();

        if let Some(latest_sys) = system_metrics.last() {
            key_metrics.insert("cpu_usage".to_string(), latest_sys.cpu_usage_percent);
            key_metrics.insert(
                "memory_usage".to_string(),
                (latest_sys.memory_usage_mb as f64 / latest_sys.memory_total_mb as f64) * 100.0,
            );
        }

        if let Some(latest_app) = application_metrics.last() {
            key_metrics.insert(
                "response_time".to_string(),
                latest_app.average_response_time_ms,
            );
            key_metrics.insert(
                "requests_per_second".to_string(),
                latest_app.requests_per_second,
            );
            key_metrics.insert("error_rate".to_string(), latest_app.error_rate_percent);
        }

        if let Some(latest_ai) = ai_metrics.last() {
            key_metrics.insert(
                "ai_response_time".to_string(),
                latest_ai.ai_response_time_ms,
            );
            key_metrics.insert("ai_success_rate".to_string(), latest_ai.ai_success_rate);
            key_metrics.insert("cost_per_hour".to_string(), latest_ai.cost_per_hour_usd);
        }

        // Build performance trends (last 100 data points)
        let mut performance_trends = HashMap::new();

        let cpu_trend: Vec<(i64, f64)> = system_metrics
            .iter()
            .rev()
            .take(100)
            .map(|m| (m.timestamp, m.cpu_usage_percent))
            .collect();
        performance_trends.insert("cpu_usage".to_string(), cpu_trend);

        let response_trend: Vec<(i64, f64)> = application_metrics
            .iter()
            .rev()
            .take(100)
            .map(|m| (m.timestamp, m.average_response_time_ms))
            .collect();
        performance_trends.insert("response_time".to_string(), response_trend);

        PerformanceDashboard {
            system_health_score,
            application_performance_score,
            ai_efficiency_score,
            recent_alerts,
            key_metrics,
            performance_trends,
        }
    }

    fn calculate_system_health_score(metrics: &[SystemMetrics]) -> f64 {
        if metrics.is_empty() {
            return 100.0;
        }

        let recent_metrics: Vec<_> = metrics.iter().rev().take(10).collect();
        let avg_cpu = recent_metrics
            .iter()
            .map(|m| m.cpu_usage_percent)
            .sum::<f64>()
            / recent_metrics.len() as f64;
        let avg_memory = recent_metrics
            .iter()
            .map(|m| (m.memory_usage_mb as f64 / m.memory_total_mb as f64) * 100.0)
            .sum::<f64>()
            / recent_metrics.len() as f64;
        let avg_disk = recent_metrics
            .iter()
            .map(|m| m.disk_usage_percent)
            .sum::<f64>()
            / recent_metrics.len() as f64;

        // Simple scoring: 100 - weighted average of resource usage
        let score = 100.0 - (avg_cpu * 0.4 + avg_memory * 0.4 + avg_disk * 0.2);
        score.max(0.0).min(100.0)
    }

    fn calculate_application_performance_score(metrics: &[ApplicationMetrics]) -> f64 {
        if metrics.is_empty() {
            return 100.0;
        }

        let recent_metrics: Vec<_> = metrics.iter().rev().take(10).collect();
        let avg_response_time = recent_metrics
            .iter()
            .map(|m| m.average_response_time_ms)
            .sum::<f64>()
            / recent_metrics.len() as f64;
        let avg_error_rate = recent_metrics
            .iter()
            .map(|m| m.error_rate_percent)
            .sum::<f64>()
            / recent_metrics.len() as f64;
        let avg_cache_hit_rate = recent_metrics.iter().map(|m| m.cache_hit_rate).sum::<f64>()
            / recent_metrics.len() as f64;

        // Score based on response time (lower is better), error rate (lower is better), cache hit rate (higher is better)
        let response_score = (1000.0 - avg_response_time.min(1000.0)) / 10.0; // Scale to 0-100
        let error_score = (100.0 - avg_error_rate * 10.0).max(0.0); // Scale error rate impact
        let cache_score = avg_cache_hit_rate;

        let score = (response_score * 0.4 + error_score * 0.3 + cache_score * 0.3);
        score.max(0.0).min(100.0)
    }

    fn calculate_ai_efficiency_score(metrics: &[AIMetrics]) -> f64 {
        if metrics.is_empty() {
            return 100.0;
        }

        let recent_metrics: Vec<_> = metrics.iter().rev().take(10).collect();
        let avg_response_time = recent_metrics
            .iter()
            .map(|m| m.ai_response_time_ms)
            .sum::<f64>()
            / recent_metrics.len() as f64;
        let avg_success_rate = recent_metrics
            .iter()
            .map(|m| m.ai_success_rate)
            .sum::<f64>()
            / recent_metrics.len() as f64;
        let avg_cost = recent_metrics
            .iter()
            .map(|m| m.cost_per_hour_usd)
            .sum::<f64>()
            / recent_metrics.len() as f64;

        // Score based on response time, success rate, and cost efficiency
        let response_score = (2000.0 - avg_response_time.min(2000.0)) / 20.0; // Scale to 0-100
        let success_score = avg_success_rate;
        let cost_score = (2.0 - avg_cost.min(2.0)) * 50.0; // Lower cost is better

        let score = (response_score * 0.4 + success_score * 0.4 + cost_score * 0.2);
        score.max(0.0).min(100.0)
    }

    pub async fn export_metrics_prometheus(&self) -> anyhow::Result<String> {
        let dashboard = self.get_current_dashboard().await;

        let mut prometheus_metrics = String::new();

        // Export key metrics in Prometheus format
        for (metric_name, value) in dashboard.key_metrics {
            prometheus_metrics.push_str(&format!(
                "# HELP autodevai_{} AutoDev-AI {} metric\n",
                metric_name, metric_name
            ));
            prometheus_metrics.push_str(&format!("# TYPE autodevai_{} gauge\n", metric_name));
            prometheus_metrics.push_str(&format!("autodevai_{} {}\n", metric_name, value));
        }

        // Add health scores
        prometheus_metrics.push_str(&format!(
            "autodevai_system_health_score {}\n",
            dashboard.system_health_score
        ));
        prometheus_metrics.push_str(&format!(
            "autodevai_application_performance_score {}\n",
            dashboard.application_performance_score
        ));
        prometheus_metrics.push_str(&format!(
            "autodevai_ai_efficiency_score {}\n",
            dashboard.ai_efficiency_score
        ));

        Ok(prometheus_metrics)
    }

    pub async fn create_grafana_dashboard(&self) -> anyhow::Result<String> {
        if let Some(grafana) = &self.grafana_client {
            let dashboard_json = self.generate_grafana_dashboard_json().await?;

            let response = grafana
                .client
                .post(&format!("{}/api/dashboards/db", grafana.endpoint))
                .header("Authorization", format!("Bearer {}", grafana.api_key))
                .header("Content-Type", "application/json")
                .body(dashboard_json.clone())
                .send()
                .await?;

            if response.status().is_success() {
                info!("Grafana dashboard created successfully");
                Ok("Dashboard created".to_string())
            } else {
                let error_text = response.text().await?;
                Err(anyhow::anyhow!(
                    "Failed to create Grafana dashboard: {}",
                    error_text
                ))
            }
        } else {
            Err(anyhow::anyhow!("Grafana client not configured"))
        }
    }

    async fn generate_grafana_dashboard_json(&self) -> anyhow::Result<String> {
        // This would generate a complete Grafana dashboard JSON
        // For now, return a simplified version
        let dashboard = serde_json::json!({
            "dashboard": {
                "id": null,
                "title": "AutoDev-AI Performance Dashboard",
                "tags": ["autodevai", "performance"],
                "timezone": "utc",
                "panels": [
                    {
                        "id": 1,
                        "title": "System Health Score",
                        "type": "stat",
                        "targets": [
                            {
                                "expr": "autodevai_system_health_score",
                                "legendFormat": "Health Score"
                            }
                        ],
                        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
                    },
                    {
                        "id": 2,
                        "title": "CPU Usage",
                        "type": "graph",
                        "targets": [
                            {
                                "expr": "autodevai_cpu_usage",
                                "legendFormat": "CPU %"
                            }
                        ],
                        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
                    },
                    {
                        "id": 3,
                        "title": "Response Time",
                        "type": "graph",
                        "targets": [
                            {
                                "expr": "autodevai_response_time",
                                "legendFormat": "Response Time (ms)"
                            }
                        ],
                        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
                    }
                ],
                "time": {
                    "from": "now-1h",
                    "to": "now"
                },
                "refresh": "10s"
            },
            "overwrite": false
        });

        Ok(dashboard.to_string())
    }

    pub async fn resolve_alert(&self, alert_id: Uuid) -> anyhow::Result<()> {
        let mut active_alerts = self.active_alerts.write().await;

        if let Some(mut alert) = active_alerts.remove(&alert_id) {
            alert.resolved_at = Some(chrono::Utc::now().timestamp());

            let mut history = self.alert_history.write().await;
            history.push(alert);

            info!("Alert {} resolved", alert_id);
            Ok(())
        } else {
            Err(anyhow::anyhow!("Alert not found"))
        }
    }

    pub async fn get_alerts(&self, severity: Option<AlertSeverity>) -> Vec<Alert> {
        let active_alerts = self.active_alerts.read().await;

        active_alerts
            .values()
            .filter(|alert| {
                severity.as_ref().map_or(true, |s| {
                    std::mem::discriminant(&alert.severity) == std::mem::discriminant(s)
                })
            })
            .cloned()
            .collect()
    }
}

// Global performance monitor
lazy_static::lazy_static! {
    static ref PERFORMANCE_MONITOR: tokio::sync::RwLock<Option<PerformanceMonitor>> = tokio::sync::RwLock::new(None);
}

pub async fn initialize_performance_monitor(config: MonitoringConfig) -> anyhow::Result<()> {
    let mut monitor = PerformanceMonitor::new(config);
    monitor.start_monitoring().await?;

    let mut global_monitor = PERFORMANCE_MONITOR.write().await;
    *global_monitor = Some(monitor);

    info!("Global performance monitor initialized and started");
    Ok(())
}

pub async fn get_performance_dashboard() -> Option<PerformanceDashboard> {
    let monitor = PERFORMANCE_MONITOR.read().await;
    if let Some(monitor) = monitor.as_ref() {
        Some(monitor.get_current_dashboard().await)
    } else {
        None
    }
}

pub async fn get_prometheus_metrics() -> Option<String> {
    let monitor = PERFORMANCE_MONITOR.read().await;
    if let Some(monitor) = monitor.as_ref() {
        monitor.export_metrics_prometheus().await.ok()
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::test;

    #[test]
    async fn test_performance_monitor() {
        let config = MonitoringConfig::default();
        let monitor = PerformanceMonitor::new(config);

        let dashboard = monitor.get_current_dashboard().await;
        assert!(dashboard.system_health_score >= 0.0);
        assert!(dashboard.system_health_score <= 100.0);
    }

    #[test]
    async fn test_metrics_collection() {
        let sys_metrics = PerformanceMonitor::collect_system_metrics().await.unwrap();
        assert!(sys_metrics.cpu_usage_percent >= 0.0);
        assert!(sys_metrics.memory_usage_mb > 0);

        let app_metrics = PerformanceMonitor::collect_application_metrics()
            .await
            .unwrap();
        assert!(app_metrics.requests_per_second >= 0.0);
        assert!(app_metrics.average_response_time_ms >= 0.0);
    }
}
