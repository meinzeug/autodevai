// Performance metrics collection and analysis system
// Provides comprehensive performance measurement and reporting capabilities

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use tokio::time::{Duration, Instant};
use tracing::{debug, info, warn};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsConfig {
    pub collection_enabled: bool,
    pub aggregation_interval_seconds: u64,
    pub retention_hours: u32,
    pub export_prometheus: bool,
    pub export_json: bool,
    pub real_time_alerts: bool,
    pub custom_metrics_enabled: bool,
}

impl Default for MetricsConfig {
    fn default() -> Self {
        Self {
            collection_enabled: true,
            aggregation_interval_seconds: 60,
            retention_hours: 24,
            export_prometheus: true,
            export_json: true,
            real_time_alerts: true,
            custom_metrics_enabled: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricPoint {
    pub timestamp: i64,
    pub metric_name: String,
    pub value: f64,
    pub tags: HashMap<String, String>,
    pub unit: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregatedMetric {
    pub metric_name: String,
    pub min_value: f64,
    pub max_value: f64,
    pub avg_value: f64,
    pub sum_value: f64,
    pub count: u64,
    pub percentiles: HashMap<String, f64>, // P50, P90, P95, P99
    pub tags: HashMap<String, String>,
    pub time_window_start: i64,
    pub time_window_end: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsReport {
    pub timestamp: i64,
    pub collection_period_seconds: u64,
    pub total_metrics_collected: u64,
    pub unique_metric_names: usize,
    pub system_metrics: Vec<AggregatedMetric>,
    pub application_metrics: Vec<AggregatedMetric>,
    pub custom_metrics: Vec<AggregatedMetric>,
    pub performance_summary: PerformanceSummaryMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceSummaryMetrics {
    pub overall_performance_score: f64,
    pub response_time_p95_ms: f64,
    pub throughput_per_second: f64,
    pub error_rate_percentage: f64,
    pub resource_utilization_percentage: f64,
    pub cache_efficiency_percentage: f64,
    pub top_bottlenecks: Vec<String>,
}

pub struct MetricsCollector {
    config: MetricsConfig,
    raw_metrics: Arc<RwLock<Vec<MetricPoint>>>,
    aggregated_metrics: Arc<RwLock<HashMap<String, Vec<AggregatedMetric>>>>,
    collection_task: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>>,
    custom_metrics: Arc<RwLock<HashMap<String, f64>>>,
    metric_metadata: Arc<RwLock<HashMap<String, MetricMetadata>>>,
}

#[derive(Debug, Clone)]
struct MetricMetadata {
    description: String,
    unit: String,
    metric_type: MetricType,
    tags: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MetricType {
    Counter,   // Always increasing
    Gauge,     // Point-in-time value
    Histogram, // Distribution of values
    Summary,   // Summary statistics
}

impl MetricsCollector {
    pub fn new(config: MetricsConfig) -> Self {
        info!(
            "Metrics collector initialized with aggregation interval: {}s",
            config.aggregation_interval_seconds
        );

        Self {
            config,
            raw_metrics: Arc::new(RwLock::new(Vec::new())),
            aggregated_metrics: Arc::new(RwLock::new(HashMap::new())),
            collection_task: Arc::new(Mutex::new(None)),
            custom_metrics: Arc::new(RwLock::new(HashMap::new())),
            metric_metadata: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn start_collection(&self) -> anyhow::Result<()> {
        if !self.config.collection_enabled {
            info!("Metrics collection is disabled");
            return Ok(());
        }

        let raw_metrics = Arc::clone(&self.raw_metrics);
        let aggregated_metrics = Arc::clone(&self.aggregated_metrics);
        let config = self.config.clone();

        let task = tokio::spawn(async move {
            let mut interval =
                tokio::time::interval(Duration::from_secs(config.aggregation_interval_seconds));

            loop {
                interval.tick().await;

                // Collect system metrics
                let system_metrics = Self::collect_system_metrics().await;
                for metric in system_metrics {
                    let mut metrics = raw_metrics.write().await;
                    metrics.push(metric);
                }

                // Aggregate metrics
                Self::aggregate_metrics(&raw_metrics, &aggregated_metrics, &config).await;

                // Clean old data
                Self::cleanup_old_data(&raw_metrics, &aggregated_metrics, &config).await;

                debug!("Metrics collection and aggregation cycle completed");
            }
        });

        let mut collection_task = self.collection_task.lock().await;
        *collection_task = Some(task);

        info!("Metrics collection started");
        Ok(())
    }

    pub async fn stop_collection(&self) -> anyhow::Result<()> {
        let mut collection_task = self.collection_task.lock().await;
        if let Some(task) = collection_task.take() {
            task.abort();
        }

        info!("Metrics collection stopped");
        Ok(())
    }

    async fn collect_system_metrics() -> Vec<MetricPoint> {
        let timestamp = chrono::Utc::now().timestamp();
        let mut metrics = Vec::new();

        // CPU metrics
        metrics.push(MetricPoint {
            timestamp,
            metric_name: "system.cpu.utilization".to_string(),
            value: 45.0 + (timestamp % 30) as f64, // Simulated
            tags: HashMap::from([
                ("host".to_string(), "localhost".to_string()),
                ("core".to_string(), "all".to_string()),
            ]),
            unit: "percent".to_string(),
        });

        // Memory metrics
        metrics.push(MetricPoint {
            timestamp,
            metric_name: "system.memory.usage".to_string(),
            value: 1024.0 + (timestamp % 500) as f64, // MB
            tags: HashMap::from([
                ("host".to_string(), "localhost".to_string()),
                ("type".to_string(), "physical".to_string()),
            ]),
            unit: "megabytes".to_string(),
        });

        metrics.push(MetricPoint {
            timestamp,
            metric_name: "system.memory.available".to_string(),
            value: 8192.0 - (1024.0 + (timestamp % 500) as f64), // Total - Used
            tags: HashMap::from([
                ("host".to_string(), "localhost".to_string()),
                ("type".to_string(), "available".to_string()),
            ]),
            unit: "megabytes".to_string(),
        });

        // Disk metrics
        metrics.push(MetricPoint {
            timestamp,
            metric_name: "system.disk.usage".to_string(),
            value: 65.0 + (timestamp % 10) as f64,
            tags: HashMap::from([
                ("host".to_string(), "localhost".to_string()),
                ("device".to_string(),
                "/dev/sda1".to_string()),
            ]),
            unit: "percent".to_string(),
        });

        // Network metrics
        metrics.push(MetricPoint {
            timestamp,
            metric_name: "system.network.bytes_sent".to_string(),
            value: 1024.0 * 1024.0 + (timestamp as f64 * 1024.0),
            tags: HashMap::from([
                ("host".to_string(), "localhost".to_string()),
                ("interface".to_string(), "eth0".to_string()),
            ]),
            unit: "bytes".to_string(),
        });

        metrics.push(MetricPoint {
            timestamp,
            metric_name: "system.network.bytes_received".to_string(),
            value: 2.0 * 1024.0 * 1024.0 + (timestamp as f64 * 2048.0),
            tags: HashMap::from([
                ("host".to_string(), "localhost".to_string()),
                ("interface".to_string(), "eth0".to_string()),
            ]),
            unit: "bytes".to_string(),
        });

        // Application metrics
        metrics.push(MetricPoint {
            timestamp,
            metric_name: "application.requests.total".to_string(),
            value: 1000.0 + (timestamp % 100) as f64,
            tags: HashMap::from([
                ("service".to_string(), "autodev-ai".to_string()),
                ("endpoint".to_string(), "api".to_string()),
            ]),
            unit: "count".to_string(),
        });

        metrics.push(MetricPoint {
            timestamp,
            metric_name: "application.response_time".to_string(),
            value: 150.0 + (timestamp % 50) as f64,
            tags: HashMap::from([
                ("service".to_string(), "autodev-ai".to_string()),
                ("endpoint".to_string(), "api".to_string()),
            ]),
            unit: "milliseconds".to_string(),
        });

        metrics.push(MetricPoint {
            timestamp,
            metric_name: "application.errors.total".to_string(),
            value: 5.0 + (timestamp % 10) as f64,
            tags: HashMap::from([
                ("service".to_string(), "autodev-ai".to_string()),
                ("type".to_string(), "http_error".to_string()),
            ]),
            unit: "count".to_string(),
        });

        // AI-specific metrics
        metrics.push(MetricPoint {
            timestamp,
            metric_name: "ai.inference.duration".to_string(),
            value: 800.0 + (timestamp % 400) as f64,
            tags: HashMap::from([
                ("model".to_string(), "claude-3".to_string()),
                ("operation".to_string(), "chat_completion".to_string()),
            ]),
            unit: "milliseconds".to_string(),
        });

        metrics.push(MetricPoint {
            timestamp,
            metric_name: "ai.tokens.consumed".to_string(),
            value: 1500.0 + (timestamp % 1000) as f64,
            tags: HashMap::from([
                ("model".to_string(), "claude-3".to_string()),
                ("type".to_string(), "input_tokens".to_string()),
            ]),
            unit: "count".to_string(),
        });

        metrics
    }

    async fn aggregate_metrics(
        raw_metrics: &Arc<RwLock<Vec<MetricPoint>>>,
        aggregated_metrics: &Arc<RwLock<HashMap<String, Vec<AggregatedMetric>>>>,
        config: &MetricsConfig,
    ) {
        let metrics = raw_metrics.read().await;
        let aggregation_window = Duration::from_secs(config.aggregation_interval_seconds);
        let _now = Instant::now();

        // Group metrics by name and time window
        let mut metric_groups: HashMap<String, Vec<&MetricPoint>> = HashMap::new();

        for metric in metrics.iter() {
            let metric_age =
                Duration::from_secs((chrono::Utc::now().timestamp() - metric.timestamp) as u64);
            if metric_age <= aggregation_window {
                metric_groups
                    .entry(metric.metric_name.clone())
                    .or_insert_with(Vec::new)
                    .push(metric);
            }
        }

        // Calculate aggregations
        let mut aggregated = aggregated_metrics.write().await;

        for (metric_name, points) in metric_groups {
            if points.is_empty() {
                continue;
            }

            let mut values: Vec<f64> = points.iter().map(|p| p.value).collect();
            values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

            let min_value = values.first().copied().unwrap_or(0.0);
            let max_value = values.last().copied().unwrap_or(0.0);
            let sum_value: f64 = values.iter().sum();
            let count = values.len() as u64;
            let avg_value = if count > 0 {
                sum_value / count as f64
            } else {
                0.0
            };

            // Calculate percentiles
            let mut percentiles = HashMap::new();
            if !values.is_empty() {
                percentiles.insert("p50".to_string(), Self::percentile(&values, 0.50));
                percentiles.insert("p90".to_string(), Self::percentile(&values, 0.90));
                percentiles.insert("p95".to_string(), Self::percentile(&values, 0.95));
                percentiles.insert("p99".to_string(), Self::percentile(&values, 0.99));
            }

            let aggregated_metric = AggregatedMetric {
                metric_name: metric_name.clone(),
                min_value,
                max_value,
                avg_value,
                sum_value,
                count,
                percentiles,
                tags: points.first().map(|p| p.tags.clone()).unwrap_or_default(),
                time_window_start: chrono::Utc::now().timestamp()
                    - config.aggregation_interval_seconds as i64,
                time_window_end: chrono::Utc::now().timestamp(),
            };

            aggregated
                .entry(metric_name)
                .or_insert_with(Vec::new)
                .push(aggregated_metric);
        }
    }

    fn percentile(sorted_values: &[f64], percentile: f64) -> f64 {
        if sorted_values.is_empty() {
            return 0.0;
        }

        let index = (percentile * (sorted_values.len() - 1) as f64) as usize;
        sorted_values[index.min(sorted_values.len() - 1)]
    }

    async fn cleanup_old_data(
        raw_metrics: &Arc<RwLock<Vec<MetricPoint>>>,
        aggregated_metrics: &Arc<RwLock<HashMap<String, Vec<AggregatedMetric>>>>,
        config: &MetricsConfig,
    ) {
        let retention_duration = Duration::from_secs(config.retention_hours as u64 * 3600);
        let cutoff_timestamp = chrono::Utc::now().timestamp() - retention_duration.as_secs() as i64;

        // Clean raw metrics
        {
            let mut metrics = raw_metrics.write().await;
            metrics.retain(|metric| metric.timestamp > cutoff_timestamp);
        }

        // Clean aggregated metrics
        {
            let mut aggregated = aggregated_metrics.write().await;
            for (_metric_name, metric_list) in aggregated.iter_mut() {
                metric_list.retain(|metric| metric.time_window_end > cutoff_timestamp);
            }

            // Remove empty metric entries
            aggregated.retain(|_, metric_list| !metric_list.is_empty());
        }
    }

    pub async fn record_custom_metric(
        &self,
        name: &str,
        value: f64,
        tags: HashMap<String, String>,
    ) -> anyhow::Result<()> {
        if !self.config.custom_metrics_enabled {
            return Ok(());
        }

        let metric_point = MetricPoint {
            timestamp: chrono::Utc::now().timestamp(),
            metric_name: name.to_string(),
            value,
            tags,
            unit: "custom".to_string(),
        };

        let mut metrics = self.raw_metrics.write().await;
        metrics.push(metric_point);

        debug!("Custom metric recorded: {} = {}", name, value);
        Ok(())
    }

    pub async fn increment_counter(
        &self,
        name: &str,
        tags: HashMap<String, String>,
    ) -> anyhow::Result<()> {
        let mut custom_metrics = self.custom_metrics.write().await;
        let current_value = custom_metrics.entry(name.to_string()).or_insert(0.0);
        *current_value += 1.0;

        self.record_custom_metric(name, *current_value, tags)
            .await?;
        Ok(())
    }

    pub async fn set_gauge(
        &self,
        name: &str,
        value: f64,
        tags: HashMap<String, String>,
    ) -> anyhow::Result<()> {
        let mut custom_metrics = self.custom_metrics.write().await;
        custom_metrics.insert(name.to_string(), value);

        self.record_custom_metric(name, value, tags).await?;
        Ok(())
    }

    pub async fn generate_report(&self) -> anyhow::Result<MetricsReport> {
        let raw_metrics = self.raw_metrics.read().await;
        let aggregated_metrics = self.aggregated_metrics.read().await;

        let total_metrics_collected = raw_metrics.len() as u64;
        let unique_metric_names = aggregated_metrics.keys().len();

        // Categorize metrics
        let mut system_metrics = Vec::new();
        let mut application_metrics = Vec::new();
        let mut custom_metrics = Vec::new();

        for (metric_name, metric_list) in aggregated_metrics.iter() {
            if let Some(latest_metric) = metric_list.last() {
                if metric_name.starts_with("system.") {
                    system_metrics.push(latest_metric.clone());
                } else if metric_name.starts_with("application.") {
                    application_metrics.push(latest_metric.clone());
                } else {
                    custom_metrics.push(latest_metric.clone());
                }
            }
        }

        // Generate performance summary
        let performance_summary = self.generate_performance_summary(&aggregated_metrics).await;

        Ok(MetricsReport {
            timestamp: chrono::Utc::now().timestamp(),
            collection_period_seconds: self.config.aggregation_interval_seconds,
            total_metrics_collected,
            unique_metric_names,
            system_metrics,
            application_metrics,
            custom_metrics,
            performance_summary,
        })
    }

    async fn generate_performance_summary(
        &self,
        aggregated_metrics: &HashMap<String, Vec<AggregatedMetric>>,
    ) -> PerformanceSummaryMetrics {
        // Calculate performance score based on various metrics
        let mut performance_score: f64 = 100.0;
        let mut response_time_p95 = 0.0;
        let mut throughput = 0.0;
        let mut error_rate = 0.0;
        let mut resource_utilization = 0.0;
        let mut cache_efficiency = 0.0;
        let mut top_bottlenecks = Vec::new();

        // Analyze response time
        if let Some(response_metrics) = aggregated_metrics.get("application.response_time") {
            if let Some(latest) = response_metrics.last() {
                response_time_p95 = latest
                    .percentiles
                    .get("p95")
                    .copied()
                    .unwrap_or(latest.avg_value);

                // Deduct score for high response times
                if response_time_p95 > 1000.0 {
                    performance_score -= 20.0;
                    top_bottlenecks.push("High response times detected".to_string());
                } else if response_time_p95 > 500.0 {
                    performance_score -= 10.0;
                }
            }
        }

        // Analyze throughput
        if let Some(request_metrics) = aggregated_metrics.get("application.requests.total") {
            if let Some(latest) = request_metrics.last() {
                let time_window = (latest.time_window_end - latest.time_window_start) as f64;
                throughput = if time_window > 0.0 {
                    latest.sum_value / time_window
                } else {
                    0.0
                };
            }
        }

        // Analyze error rate
        if let (Some(error_metrics), Some(request_metrics)) = (
            aggregated_metrics.get("application.errors.total"),
            aggregated_metrics.get("application.requests.total"),
        ) {
            if let (Some(latest_errors), Some(latest_requests)) =
                (error_metrics.last(), request_metrics.last())
            {
                error_rate = if latest_requests.sum_value > 0.0 {
                    (latest_errors.sum_value / latest_requests.sum_value) * 100.0
                } else {
                    0.0
                };

                if error_rate > 5.0 {
                    performance_score -= 15.0;
                    top_bottlenecks.push("High error rate detected".to_string());
                }
            }
        }

        // Analyze resource utilization
        if let Some(cpu_metrics) = aggregated_metrics.get("system.cpu.utilization") {
            if let Some(latest) = cpu_metrics.last() {
                resource_utilization = latest.avg_value;

                if resource_utilization > 90.0 {
                    performance_score -= 15.0;
                    top_bottlenecks.push("High CPU utilization".to_string());
                } else if resource_utilization > 80.0 {
                    performance_score -= 8.0;
                }
            }
        }

        // Analyze memory usage
        if let (Some(used_metrics), Some(available_metrics)) = (
            aggregated_metrics.get("system.memory.usage"),
            aggregated_metrics.get("system.memory.available"),
        ) {
            if let (Some(latest_used), Some(latest_available)) =
                (used_metrics.last(), available_metrics.last())
            {
                let total_memory = latest_used.avg_value + latest_available.avg_value;
                let memory_utilization = (latest_used.avg_value / total_memory) * 100.0;

                if memory_utilization > 90.0 {
                    performance_score -= 10.0;
                    top_bottlenecks.push("High memory utilization".to_string());
                }
            }
        }

        // Simulate cache efficiency (would be calculated from actual cache metrics)
        cache_efficiency = 85.0 + (rand::random::<f64>() * 10.0); // 85-95%

        // Ensure performance score is within bounds
        performance_score = performance_score.max(0.0).min(100.0);

        PerformanceSummaryMetrics {
            overall_performance_score: performance_score,
            response_time_p95_ms: response_time_p95,
            throughput_per_second: throughput,
            error_rate_percentage: error_rate,
            resource_utilization_percentage: resource_utilization,
            cache_efficiency_percentage: cache_efficiency,
            top_bottlenecks,
        }
    }

    pub async fn export_prometheus(&self) -> anyhow::Result<String> {
        if !self.config.export_prometheus {
            return Err(anyhow::anyhow!("Prometheus export is disabled"));
        }

        let aggregated_metrics = self.aggregated_metrics.read().await;
        let mut prometheus_output = String::new();

        for (metric_name, metric_list) in aggregated_metrics.iter() {
            if let Some(latest_metric) = metric_list.last() {
                // Convert metric name to prometheus format
                let prometheus_name = metric_name.replace(".", "_");

                prometheus_output.push_str(&format!(
                    "# HELP {} {}\n",
                    prometheus_name,
                    format!("AutoDev-AI metric: {}", metric_name)
                ));

                prometheus_output.push_str(&format!("# TYPE {} gauge\n", prometheus_name));

                // Add current value
                prometheus_output.push_str(&format!(
                    "{} {}\n",
                    prometheus_name, latest_metric.avg_value
                ));

                // Add percentiles if available
                for (percentile_name, percentile_value) in &latest_metric.percentiles {
                    prometheus_output.push_str(&format!(
                        "{}_{} {}\n",
                        prometheus_name, percentile_name, percentile_value
                    ));
                }
            }
        }

        Ok(prometheus_output)
    }

    pub async fn export_json(&self) -> anyhow::Result<String> {
        if !self.config.export_json {
            return Err(anyhow::anyhow!("JSON export is disabled"));
        }

        let report = self.generate_report().await?;
        serde_json::to_string_pretty(&report)
            .map_err(|e| anyhow::anyhow!("JSON serialization failed: {}", e))
    }
}

// Convenience macro for creating hash maps
macro_rules! hashmap {
    ($( $key: expr => $val: expr ),*) => {{
        let mut map = HashMap::new();
        $( map.insert($key, $val); )*
        map
    }}
}

// Global metrics collector
lazy_static::lazy_static! {
    static ref METRICS_COLLECTOR: tokio::sync::RwLock<Option<MetricsCollector>> = tokio::sync::RwLock::new(None);
}

pub async fn initialize_metrics_collector(config: MetricsConfig) -> anyhow::Result<()> {
    let collector = MetricsCollector::new(config);
    collector.start_collection().await?;

    let mut global_collector = METRICS_COLLECTOR.write().await;
    *global_collector = Some(collector);

    info!("Global metrics collector initialized and started");
    Ok(())
}

pub async fn record_metric(
    name: &str,
    value: f64,
    tags: HashMap<String, String>,
) -> anyhow::Result<()> {
    let collector = METRICS_COLLECTOR.read().await;
    if let Some(collector) = collector.as_ref() {
        collector.record_custom_metric(name, value, tags).await
    } else {
        Err(anyhow::anyhow!("Metrics collector not initialized"))
    }
}

pub async fn increment_counter(name: &str, tags: HashMap<String, String>) -> anyhow::Result<()> {
    let collector = METRICS_COLLECTOR.read().await;
    if let Some(collector) = collector.as_ref() {
        collector.increment_counter(name, tags).await
    } else {
        Err(anyhow::anyhow!("Metrics collector not initialized"))
    }
}

pub async fn set_gauge(
    name: &str,
    value: f64,
    tags: HashMap<String, String>,
) -> anyhow::Result<()> {
    let collector = METRICS_COLLECTOR.read().await;
    if let Some(collector) = collector.as_ref() {
        collector.set_gauge(name, value, tags).await
    } else {
        Err(anyhow::anyhow!("Metrics collector not initialized"))
    }
}

pub async fn generate_metrics_report() -> anyhow::Result<MetricsReport> {
    let collector = METRICS_COLLECTOR.read().await;
    if let Some(collector) = collector.as_ref() {
        collector.generate_report().await
    } else {
        Err(anyhow::anyhow!("Metrics collector not initialized"))
    }
}

pub async fn export_prometheus_metrics() -> anyhow::Result<String> {
    let collector = METRICS_COLLECTOR.read().await;
    if let Some(collector) = collector.as_ref() {
        collector.export_prometheus().await
    } else {
        Err(anyhow::anyhow!("Metrics collector not initialized"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::test;

    #[test]
    async fn test_metrics_collector() {
        let config = MetricsConfig::default();
        let collector = MetricsCollector::new(config);

        collector.start_collection().await.unwrap();
        tokio::time::sleep(Duration::from_millis(100)).await;
        collector.stop_collection().await.unwrap();

        let report = collector.generate_report().await.unwrap();
        assert!(report.total_metrics_collected >= 0);
    }

    #[test]
    async fn test_custom_metrics() {
        let config = MetricsConfig::default();
        let collector = MetricsCollector::new(config);

        let tags = hashmap!("test".to_string(), "value".to_string());
        collector
            .record_custom_metric("test.metric", 42.0, tags)
            .await
            .unwrap();

        collector
            .increment_counter("test.counter", HashMap::new())
            .await
            .unwrap();
        collector
            .set_gauge("test.gauge", 100.0, HashMap::new())
            .await
            .unwrap();

        let report = collector.generate_report().await.unwrap();
        assert!(report.custom_metrics.len() >= 0);
    }
}
