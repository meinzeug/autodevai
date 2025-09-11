//! AI Operation Performance Tracking System
//! 
//! Comprehensive performance tracking with real-time metrics collection,
//! trend analysis, and automated optimization recommendations.

use super::*;
use anyhow::{anyhow, Result};
use serde_json::{json, Value};
use std::collections::{HashMap, VecDeque, BTreeMap};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio::sync::{RwLock, Mutex};
use tokio::time::interval;
use tracing::{debug, error, info, warn};

/// Performance tracking service
#[derive(Debug)]
pub struct PerformanceTracker {
    metrics_store: Arc<RwLock<MetricsStore>>,
    real_time_monitor: Arc<RealTimeMonitor>,
    trend_analyzer: Arc<TrendAnalyzer>,
    alert_manager: Arc<AlertManager>,
    optimization_advisor: Arc<OptimizationAdvisor>,
    config: PerformanceConfig,
}

/// Centralized metrics storage
#[derive(Debug)]
pub struct MetricsStore {
    execution_metrics: VecDeque<ExecutionMetricEntry>,
    system_metrics: VecDeque<SystemMetricEntry>,
    model_metrics: HashMap<String, ModelMetricsHistory>,
    agent_metrics: HashMap<String, AgentMetricsHistory>,
    aggregated_metrics: AggregatedMetrics,
    metric_snapshots: BTreeMap<u64, MetricsSnapshot>, // timestamp -> snapshot
}

/// Individual execution metric entry
#[derive(Debug, Clone)]
pub struct ExecutionMetricEntry {
    pub id: String,
    pub timestamp: SystemTime,
    pub model_id: Option<String>,
    pub agent_id: Option<String>,
    pub request_type: String,
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
    pub response_time_ms: u64,
    pub queue_time_ms: u64,
    pub processing_time_ms: u64,
    pub cost_usd: f64,
    pub success: bool,
    pub error_type: Option<String>,
    pub quality_score: Option<f64>,
    pub user_satisfaction: Option<f64>,
    pub metadata: HashMap<String, Value>,
}

/// System-level metric entry
#[derive(Debug, Clone)]
pub struct SystemMetricEntry {
    pub timestamp: SystemTime,
    pub cpu_usage_percent: f64,
    pub memory_usage_mb: u64,
    pub memory_usage_percent: f64,
    pub disk_io_kb: u64,
    pub network_io_kb: u64,
    pub active_connections: u32,
    pub thread_count: u32,
    pub gc_collections: u32,
    pub heap_size_mb: u64,
}

/// Model-specific metrics history
#[derive(Debug, Clone)]
pub struct ModelMetricsHistory {
    pub model_id: String,
    pub total_requests: u64,
    pub successful_requests: u64,
    pub total_tokens: u64,
    pub total_cost: f64,
    pub response_times: VecDeque<u64>,
    pub quality_scores: VecDeque<f64>,
    pub error_counts: HashMap<String, u32>,
    pub usage_over_time: VecDeque<TimeSeriesPoint>,
    pub performance_trend: TrendData,
}

/// Agent-specific metrics history
#[derive(Debug, Clone)]
pub struct AgentMetricsHistory {
    pub agent_id: String,
    pub agent_type: String,
    pub tasks_completed: u64,
    pub tasks_failed: u64,
    pub avg_task_duration: Duration,
    pub coordination_events: u64,
    pub consensus_participation: u64,
    pub resource_usage: ResourceUsageHistory,
    pub performance_scores: VecDeque<f64>,
    pub efficiency_trend: TrendData,
}

/// Resource usage history for agents
#[derive(Debug, Clone)]
pub struct ResourceUsageHistory {
    pub memory_usage: VecDeque<u64>,
    pub cpu_usage: VecDeque<f64>,
    pub network_bandwidth: VecDeque<u64>,
    pub storage_usage: VecDeque<u64>,
}

/// Time series data point
#[derive(Debug, Clone)]
pub struct TimeSeriesPoint {
    pub timestamp: SystemTime,
    pub value: f64,
    pub metadata: Option<HashMap<String, Value>>,
}

/// Trend analysis data
#[derive(Debug, Clone)]
pub struct TrendData {
    pub direction: TrendDirection,
    pub strength: f64, // 0.0 to 1.0
    pub confidence: f64, // 0.0 to 1.0
    pub prediction: Option<f64>,
    pub seasonality: Option<SeasonalityPattern>,
    pub anomalies: Vec<AnomalyDetection>,
}

#[derive(Debug, Clone)]
pub struct SeasonalityPattern {
    pub period: Duration,
    pub amplitude: f64,
    pub phase_shift: f64,
}

#[derive(Debug, Clone)]
pub struct AnomalyDetection {
    pub timestamp: SystemTime,
    pub severity: AnomalySeverity,
    pub description: String,
    pub value: f64,
    pub expected_range: (f64, f64),
}

#[derive(Debug, Clone, PartialEq)]
pub enum AnomalySeverity {
    Low,
    Medium,
    High,
    Critical,
}

/// Aggregated metrics for quick access
#[derive(Debug, Clone)]
pub struct AggregatedMetrics {
    pub current_hour: HourlyMetrics,
    pub current_day: DailyMetrics,
    pub current_week: WeeklyMetrics,
    pub current_month: MonthlyMetrics,
    pub last_updated: SystemTime,
}

#[derive(Debug, Clone)]
pub struct HourlyMetrics {
    pub requests_per_hour: f64,
    pub avg_response_time_ms: f64,
    pub success_rate: f64,
    pub cost_per_hour: f64,
    pub tokens_per_hour: u64,
    pub errors_per_hour: u32,
}

#[derive(Debug, Clone)]
pub struct DailyMetrics {
    pub requests_per_day: f64,
    pub peak_requests_per_hour: f64,
    pub avg_daily_cost: f64,
    pub daily_token_usage: u64,
    pub quality_score_avg: f64,
    pub uptime_percentage: f64,
}

#[derive(Debug, Clone)]
pub struct WeeklyMetrics {
    pub avg_daily_requests: f64,
    pub weekly_cost_trend: TrendDirection,
    pub performance_stability: f64,
    pub capacity_utilization: f64,
    pub efficiency_score: f64,
}

#[derive(Debug, Clone)]
pub struct MonthlyMetrics {
    pub monthly_request_volume: u64,
    pub cost_efficiency_trend: TrendDirection,
    pub model_usage_distribution: HashMap<String, f64>,
    pub performance_improvements: f64,
    pub reliability_score: f64,
}

/// Metrics snapshot for historical comparison
#[derive(Debug, Clone)]
pub struct MetricsSnapshot {
    pub timestamp: SystemTime,
    pub snapshot_type: SnapshotType,
    pub aggregated_metrics: AggregatedMetrics,
    pub top_models_by_usage: Vec<(String, u64)>,
    pub top_agents_by_performance: Vec<(String, f64)>,
    pub system_health_score: f64,
    pub recommendations: Vec<OptimizationRecommendation>,
}

#[derive(Debug, Clone)]
pub enum SnapshotType {
    Hourly,
    Daily,
    Weekly,
    Monthly,
    OnDemand,
}

/// Real-time monitoring system
#[derive(Debug)]
pub struct RealTimeMonitor {
    active_requests: Arc<RwLock<HashMap<String, ActiveRequest>>>,
    performance_alerts: Arc<Mutex<VecDeque<PerformanceAlert>>>,
    monitoring_interval: Duration,
    alert_thresholds: AlertThresholds,
}

#[derive(Debug, Clone)]
pub struct ActiveRequest {
    pub request_id: String,
    pub start_time: Instant,
    pub model_id: Option<String>,
    pub request_type: String,
    pub estimated_tokens: u32,
    pub priority: RequestPriority,
    pub status: RequestStatus,
}

#[derive(Debug, Clone, PartialEq)]
pub enum RequestStatus {
    Queued,
    Processing,
    Completing,
    Completed,
    Failed,
    Timeout,
}

/// Performance alert system
#[derive(Debug, Clone)]
pub struct PerformanceAlert {
    pub id: String,
    pub timestamp: SystemTime,
    pub severity: AlertSeverity,
    pub category: AlertCategory,
    pub metric_name: String,
    pub current_value: f64,
    pub threshold_value: f64,
    pub description: String,
    pub suggested_actions: Vec<String>,
    pub auto_resolved: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub enum AlertSeverity {
    Info,
    Warning,
    Error,
    Critical,
    Emergency,
}

#[derive(Debug, Clone, PartialEq)]
pub enum AlertCategory {
    ResponseTime,
    ErrorRate,
    CostOverrun,
    ResourceExhaustion,
    QualityDegradation,
    SystemHealth,
    SecurityBreach,
}

/// Trend analysis system
#[derive(Debug)]
pub struct TrendAnalyzer {
    trend_models: HashMap<String, TrendModel>,
    analysis_window: Duration,
    prediction_horizon: Duration,
}

#[derive(Debug)]
pub struct TrendModel {
    pub metric_name: String,
    pub model_type: TrendModelType,
    pub historical_data: VecDeque<f64>,
    pub coefficients: Vec<f64>,
    pub accuracy: f64,
    pub last_trained: SystemTime,
}

#[derive(Debug, Clone)]
pub enum TrendModelType {
    LinearRegression,
    MovingAverage,
    ExponentialSmoothing,
    SeasonalDecomposition,
    Arima,
}

/// Alert management system
#[derive(Debug)]
pub struct AlertManager {
    active_alerts: Arc<RwLock<HashMap<String, PerformanceAlert>>>,
    alert_history: Arc<RwLock<VecDeque<PerformanceAlert>>>,
    suppression_rules: Vec<AlertSuppressionRule>,
    notification_channels: Vec<NotificationChannel>,
}

#[derive(Debug, Clone)]
pub struct AlertSuppressionRule {
    pub rule_id: String,
    pub metric_pattern: String,
    pub suppression_duration: Duration,
    pub max_occurrences: u32,
    pub conditions: Vec<SuppressionCondition>,
}

#[derive(Debug, Clone)]
pub struct SuppressionCondition {
    pub field: String,
    pub operator: ComparisonOperator,
    pub value: Value,
}

#[derive(Debug, Clone)]
pub enum ComparisonOperator {
    Equal,
    NotEqual,
    GreaterThan,
    LessThan,
    Contains,
    Regex,
}

#[derive(Debug, Clone)]
pub struct NotificationChannel {
    pub channel_id: String,
    pub channel_type: NotificationType,
    pub endpoint: String,
    pub enabled: bool,
    pub severity_filter: Vec<AlertSeverity>,
}

#[derive(Debug, Clone)]
pub enum NotificationType {
    Email,
    Slack,
    Webhook,
    PagerDuty,
    Discord,
    Teams,
}

/// Optimization advisor system
#[derive(Debug)]
pub struct OptimizationAdvisor {
    recommendations: Arc<RwLock<Vec<OptimizationRecommendation>>>,
    optimization_rules: Vec<OptimizationRule>,
    implementation_tracker: HashMap<String, OptimizationImplementation>,
}

#[derive(Debug, Clone)]
pub struct OptimizationRecommendation {
    pub id: String,
    pub timestamp: SystemTime,
    pub priority: RecommendationPriority,
    pub category: OptimizationCategory,
    pub title: String,
    pub description: String,
    pub impact_estimate: ImpactEstimate,
    pub implementation_difficulty: ImplementationDifficulty,
    pub estimated_savings: EstimatedSavings,
    pub prerequisites: Vec<String>,
    pub implementation_steps: Vec<String>,
    pub metrics_to_monitor: Vec<String>,
    pub status: RecommendationStatus,
}

#[derive(Debug, Clone, PartialEq)]
pub enum RecommendationPriority {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone)]
pub enum OptimizationCategory {
    CostOptimization,
    PerformanceImprovement,
    ReliabilityEnhancement,
    ScalabilityIncrease,
    SecurityHardening,
    MaintenanceReduction,
}

#[derive(Debug, Clone)]
pub struct ImpactEstimate {
    pub performance_improvement: Option<f64>, // Percentage
    pub cost_reduction: Option<f64>,          // USD or percentage
    pub reliability_improvement: Option<f64>, // Score improvement
    pub user_experience_impact: Option<f64>,  // Score change
}

#[derive(Debug, Clone)]
pub enum ImplementationDifficulty {
    Trivial,     // < 1 hour
    Easy,        // 1-8 hours
    Moderate,    // 1-3 days
    Hard,        // 1-2 weeks
    Complex,     // > 2 weeks
}

#[derive(Debug, Clone)]
pub struct EstimatedSavings {
    pub monthly_cost_savings: f64,
    pub performance_gain_percent: f64,
    pub resource_savings: ResourceSavings,
    pub operational_benefits: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ResourceSavings {
    pub cpu_hours_saved: f64,
    pub memory_gb_hours_saved: f64,
    pub network_gb_saved: f64,
    pub storage_gb_saved: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub enum RecommendationStatus {
    New,
    UnderReview,
    Approved,
    InProgress,
    Implemented,
    Rejected,
    Deferred,
}

#[derive(Debug)]
pub struct OptimizationRule {
    pub rule_id: String,
    pub rule_type: OptimizationRuleType,
    pub conditions: Vec<OptimizationCondition>,
    pub recommendation_template: OptimizationRecommendation,
    pub enabled: bool,
}

#[derive(Debug, Clone)]
pub enum OptimizationRuleType {
    ThresholdBased,
    TrendBased,
    AnomalyBased,
    PatternBased,
    MachineLearning,
}

#[derive(Debug, Clone)]
pub struct OptimizationCondition {
    pub metric: String,
    pub operator: ComparisonOperator,
    pub threshold: f64,
    pub duration: Option<Duration>,
}

#[derive(Debug)]
pub struct OptimizationImplementation {
    pub recommendation_id: String,
    pub implementation_date: SystemTime,
    pub before_metrics: HashMap<String, f64>,
    pub after_metrics: Option<HashMap<String, f64>>,
    pub actual_impact: Option<ImpactEstimate>,
    pub notes: String,
    pub success: Option<bool>,
}

/// Performance configuration
#[derive(Debug, Clone)]
pub struct PerformanceConfig {
    pub metrics_retention_days: u32,
    pub snapshot_interval: Duration,
    pub real_time_monitoring: bool,
    pub trend_analysis_enabled: bool,
    pub alert_thresholds: AlertThresholds,
    pub optimization_advisor_enabled: bool,
    pub auto_optimization: bool,
    pub detailed_logging: bool,
}

impl PerformanceTracker {
    /// Create a new performance tracker
    pub fn new(config: PerformanceConfig) -> Self {
        let metrics_store = Arc::new(RwLock::new(MetricsStore::new()));
        let real_time_monitor = Arc::new(RealTimeMonitor::new(config.alert_thresholds.clone()));
        let trend_analyzer = Arc::new(TrendAnalyzer::new());
        let alert_manager = Arc::new(AlertManager::new());
        let optimization_advisor = Arc::new(OptimizationAdvisor::new());

        Self {
            metrics_store,
            real_time_monitor,
            trend_analyzer,
            alert_manager,
            optimization_advisor,
            config,
        }
    }

    /// Start the performance tracking system
    pub async fn start(&self) -> Result<()> {
        info!("Starting performance tracker");

        // Start real-time monitoring
        if self.config.real_time_monitoring {
            self.start_real_time_monitoring().await?;
        }

        // Start periodic snapshots
        self.start_snapshot_scheduler().await?;

        // Start trend analysis
        if self.config.trend_analysis_enabled {
            self.start_trend_analysis().await?;
        }

        // Start optimization advisor
        if self.config.optimization_advisor_enabled {
            self.start_optimization_advisor().await?;
        }

        Ok(())
    }

    /// Record an execution metric
    pub async fn record_execution(&self, entry: ExecutionMetricEntry) -> Result<()> {
        let mut store = self.metrics_store.write().await;
        
        // Add to execution metrics
        store.execution_metrics.push_back(entry.clone());
        
        // Update model metrics if applicable
        if let Some(model_id) = &entry.model_id {
            self.update_model_metrics(&mut store, model_id, &entry).await;
        }

        // Update agent metrics if applicable
        if let Some(agent_id) = &entry.agent_id {
            self.update_agent_metrics(&mut store, agent_id, &entry).await;
        }

        // Update aggregated metrics
        self.update_aggregated_metrics(&mut store).await;

        // Check for alerts
        self.check_performance_alerts(&entry).await;

        // Limit memory usage
        self.cleanup_old_metrics(&mut store).await;

        debug!("Recorded execution metric: {} ({}ms, success: {})", 
               entry.id, entry.response_time_ms, entry.success);

        Ok(())
    }

    /// Update model-specific metrics
    async fn update_model_metrics(&self, store: &mut MetricsStore, model_id: &str, entry: &ExecutionMetricEntry) {
        let model_metrics = store.model_metrics
            .entry(model_id.to_string())
            .or_insert_with(|| ModelMetricsHistory::new(model_id.to_string()));

        model_metrics.total_requests += 1;
        if entry.success {
            model_metrics.successful_requests += 1;
        }
        
        model_metrics.total_tokens += entry.total_tokens as u64;
        model_metrics.total_cost += entry.cost_usd;
        
        model_metrics.response_times.push_back(entry.response_time_ms);
        if model_metrics.response_times.len() > 1000 {
            model_metrics.response_times.pop_front();
        }

        if let Some(quality) = entry.quality_score {
            model_metrics.quality_scores.push_back(quality);
            if model_metrics.quality_scores.len() > 1000 {
                model_metrics.quality_scores.pop_front();
            }
        }

        if let Some(error_type) = &entry.error_type {
            *model_metrics.error_counts.entry(error_type.clone()).or_insert(0) += 1;
        }

        model_metrics.usage_over_time.push_back(TimeSeriesPoint {
            timestamp: entry.timestamp,
            value: 1.0,
            metadata: Some(json!({
                "tokens": entry.total_tokens,
                "cost": entry.cost_usd,
                "success": entry.success
            }).as_object().unwrap().clone()),
        });

        if model_metrics.usage_over_time.len() > 10000 {
            model_metrics.usage_over_time.pop_front();
        }
    }

    /// Update agent-specific metrics
    async fn update_agent_metrics(&self, store: &mut MetricsStore, agent_id: &str, entry: &ExecutionMetricEntry) {
        let agent_metrics = store.agent_metrics
            .entry(agent_id.to_string())
            .or_insert_with(|| AgentMetricsHistory::new(agent_id.to_string(), "unknown".to_string()));

        if entry.success {
            agent_metrics.tasks_completed += 1;
        } else {
            agent_metrics.tasks_failed += 1;
        }

        // Update average task duration
        let new_duration = Duration::from_millis(entry.response_time_ms);
        let total_tasks = agent_metrics.tasks_completed + agent_metrics.tasks_failed;
        if total_tasks > 1 {
            let current_total = agent_metrics.avg_task_duration.as_millis() as u64 * (total_tasks - 1);
            agent_metrics.avg_task_duration = Duration::from_millis(
                (current_total + entry.response_time_ms) / total_tasks
            );
        } else {
            agent_metrics.avg_task_duration = new_duration;
        }

        // Calculate performance score
        let success_rate = if total_tasks > 0 {
            agent_metrics.tasks_completed as f64 / total_tasks as f64
        } else {
            0.0
        };
        
        let speed_score = if entry.response_time_ms > 0 {
            (10000.0 / entry.response_time_ms as f64).min(1.0)
        } else {
            1.0
        };

        let performance_score = (success_rate + speed_score) / 2.0;
        agent_metrics.performance_scores.push_back(performance_score);
        
        if agent_metrics.performance_scores.len() > 1000 {
            agent_metrics.performance_scores.pop_front();
        }
    }

    /// Update aggregated metrics
    async fn update_aggregated_metrics(&self, store: &mut MetricsStore) {
        let now = SystemTime::now();
        let one_hour_ago = now - Duration::from_secs(3600);
        let one_day_ago = now - Duration::from_secs(86400);

        // Calculate hourly metrics
        let recent_executions: Vec<_> = store.execution_metrics
            .iter()
            .filter(|entry| entry.timestamp >= one_hour_ago)
            .collect();

        let hourly_requests = recent_executions.len() as f64;
        let avg_response_time = if !recent_executions.is_empty() {
            recent_executions.iter().map(|e| e.response_time_ms).sum::<u64>() as f64 / recent_executions.len() as f64
        } else {
            0.0
        };

        let successful_requests = recent_executions.iter().filter(|e| e.success).count() as f64;
        let success_rate = if hourly_requests > 0.0 {
            successful_requests / hourly_requests
        } else {
            0.0
        };

        let hourly_cost = recent_executions.iter().map(|e| e.cost_usd).sum();
        let hourly_tokens = recent_executions.iter().map(|e| e.total_tokens as u64).sum();
        let hourly_errors = recent_executions.iter().filter(|e| !e.success).count() as u32;

        store.aggregated_metrics.current_hour = HourlyMetrics {
            requests_per_hour: hourly_requests,
            avg_response_time_ms: avg_response_time,
            success_rate,
            cost_per_hour: hourly_cost,
            tokens_per_hour: hourly_tokens,
            errors_per_hour: hourly_errors,
        };

        // Calculate daily metrics
        let daily_executions: Vec<_> = store.execution_metrics
            .iter()
            .filter(|entry| entry.timestamp >= one_day_ago)
            .collect();

        let daily_requests = daily_executions.len() as f64;
        let peak_hourly_requests = self.calculate_peak_hourly_requests(&daily_executions);
        let daily_cost = daily_executions.iter().map(|e| e.cost_usd).sum();
        let daily_tokens = daily_executions.iter().map(|e| e.total_tokens as u64).sum();
        let daily_quality = if !daily_executions.is_empty() {
            daily_executions.iter()
                .filter_map(|e| e.quality_score)
                .sum::<f64>() / daily_executions.iter().filter(|e| e.quality_score.is_some()).count() as f64
        } else {
            0.0
        };

        store.aggregated_metrics.current_day = DailyMetrics {
            requests_per_day: daily_requests,
            peak_requests_per_hour: peak_hourly_requests,
            avg_daily_cost: daily_cost,
            daily_token_usage: daily_tokens,
            quality_score_avg: daily_quality,
            uptime_percentage: success_rate * 100.0, // Simplified
        };

        store.aggregated_metrics.last_updated = now;
    }

    /// Calculate peak hourly requests from daily data
    fn calculate_peak_hourly_requests(&self, daily_executions: &[&ExecutionMetricEntry]) -> f64 {
        let mut hourly_counts = HashMap::new();
        
        for execution in daily_executions {
            let hour_timestamp = execution.timestamp
                .duration_since(UNIX_EPOCH)
                .unwrap_or(Duration::ZERO)
                .as_secs() / 3600; // Convert to hour buckets
            
            *hourly_counts.entry(hour_timestamp).or_insert(0) += 1;
        }

        hourly_counts.values().max().cloned().unwrap_or(0) as f64
    }

    /// Check for performance alerts
    async fn check_performance_alerts(&self, entry: &ExecutionMetricEntry) {
        let mut alerts = Vec::new();

        // Response time alert
        if entry.response_time_ms > self.config.alert_thresholds.response_time_ms {
            alerts.push(PerformanceAlert {
                id: format!("response_time_{}", entry.id),
                timestamp: entry.timestamp,
                severity: if entry.response_time_ms > self.config.alert_thresholds.response_time_ms * 2 {
                    AlertSeverity::Critical
                } else {
                    AlertSeverity::Warning
                },
                category: AlertCategory::ResponseTime,
                metric_name: "response_time_ms".to_string(),
                current_value: entry.response_time_ms as f64,
                threshold_value: self.config.alert_thresholds.response_time_ms as f64,
                description: format!("High response time detected: {}ms", entry.response_time_ms),
                suggested_actions: vec![
                    "Check system resources".to_string(),
                    "Consider model optimization".to_string(),
                    "Review request complexity".to_string(),
                ],
                auto_resolved: false,
            });
        }

        // Cost alert
        if entry.cost_usd > self.config.alert_thresholds.cost_per_hour {
            alerts.push(PerformanceAlert {
                id: format!("cost_{}", entry.id),
                timestamp: entry.timestamp,
                severity: AlertSeverity::Warning,
                category: AlertCategory::CostOverrun,
                metric_name: "cost_usd".to_string(),
                current_value: entry.cost_usd,
                threshold_value: self.config.alert_thresholds.cost_per_hour,
                description: format!("High cost per request: ${:.4}", entry.cost_usd),
                suggested_actions: vec![
                    "Review model selection".to_string(),
                    "Optimize prompt length".to_string(),
                    "Consider cost-effective alternatives".to_string(),
                ],
                auto_resolved: false,
            });
        }

        // Error alert
        if !entry.success {
            alerts.push(PerformanceAlert {
                id: format!("error_{}", entry.id),
                timestamp: entry.timestamp,
                severity: AlertSeverity::Error,
                category: AlertCategory::ErrorRate,
                metric_name: "success_rate".to_string(),
                current_value: 0.0,
                threshold_value: self.config.alert_thresholds.error_rate_percentage / 100.0,
                description: format!("Request failed: {}", entry.error_type.as_deref().unwrap_or("Unknown error")),
                suggested_actions: vec![
                    "Check error logs".to_string(),
                    "Verify API connectivity".to_string(),
                    "Review request format".to_string(),
                ],
                auto_resolved: false,
            });
        }

        // Send alerts to alert manager
        for alert in alerts {
            self.alert_manager.process_alert(alert).await;
        }
    }

    /// Cleanup old metrics to prevent memory bloat
    async fn cleanup_old_metrics(&self, store: &mut MetricsStore) {
        let retention_duration = Duration::from_secs(self.config.metrics_retention_days as u64 * 86400);
        let cutoff_time = SystemTime::now() - retention_duration;

        // Clean execution metrics
        store.execution_metrics.retain(|entry| entry.timestamp >= cutoff_time);

        // Clean system metrics
        store.system_metrics.retain(|entry| entry.timestamp >= cutoff_time);

        // Clean model metrics
        for model_metrics in store.model_metrics.values_mut() {
            model_metrics.usage_over_time.retain(|point| point.timestamp >= cutoff_time);
        }

        // Clean snapshots
        let cutoff_timestamp = cutoff_time.duration_since(UNIX_EPOCH).unwrap_or(Duration::ZERO).as_secs();
        store.metric_snapshots.retain(|&timestamp, _| timestamp >= cutoff_timestamp);
    }

    /// Start real-time monitoring
    async fn start_real_time_monitoring(&self) -> Result<()> {
        let monitor = self.real_time_monitor.clone();
        let metrics_store = self.metrics_store.clone();
        
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(10)); // Monitor every 10 seconds
            
            loop {
                interval.tick().await;
                
                if let Err(e) = monitor.collect_system_metrics(&metrics_store).await {
                    error!("Failed to collect system metrics: {}", e);
                }
            }
        });

        Ok(())
    }

    /// Start snapshot scheduler
    async fn start_snapshot_scheduler(&self) -> Result<()> {
        let metrics_store = self.metrics_store.clone();
        let snapshot_interval = self.config.snapshot_interval;
        
        tokio::spawn(async move {
            let mut interval = interval(snapshot_interval);
            
            loop {
                interval.tick().await;
                
                if let Err(e) = Self::create_metrics_snapshot(&metrics_store).await {
                    error!("Failed to create metrics snapshot: {}", e);
                }
            }
        });

        Ok(())
    }

    /// Create a metrics snapshot
    async fn create_metrics_snapshot(metrics_store: &Arc<RwLock<MetricsStore>>) -> Result<()> {
        let mut store = metrics_store.write().await;
        let timestamp = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
        
        // Calculate top models by usage
        let mut model_usage: Vec<_> = store.model_metrics
            .iter()
            .map(|(id, metrics)| (id.clone(), metrics.total_requests))
            .collect();
        model_usage.sort_by(|a, b| b.1.cmp(&a.1));
        let top_models = model_usage.into_iter().take(5).collect();

        // Calculate top agents by performance
        let mut agent_performance: Vec<_> = store.agent_metrics
            .iter()
            .map(|(id, metrics)| {
                let avg_performance = if !metrics.performance_scores.is_empty() {
                    metrics.performance_scores.iter().sum::<f64>() / metrics.performance_scores.len() as f64
                } else {
                    0.0
                };
                (id.clone(), avg_performance)
            })
            .collect();
        agent_performance.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        let top_agents = agent_performance.into_iter().take(5).collect();

        let snapshot = MetricsSnapshot {
            timestamp: SystemTime::now(),
            snapshot_type: SnapshotType::Hourly,
            aggregated_metrics: store.aggregated_metrics.clone(),
            top_models_by_usage: top_models,
            top_agents_by_performance: top_agents,
            system_health_score: 0.95, // Would calculate from actual metrics
            recommendations: Vec::new(), // Would be populated by optimization advisor
        };

        store.metric_snapshots.insert(timestamp, snapshot);
        
        // Limit snapshot history
        if store.metric_snapshots.len() > 1000 {
            if let Some(&oldest_timestamp) = store.metric_snapshots.keys().next() {
                store.metric_snapshots.remove(&oldest_timestamp);
            }
        }

        Ok(())
    }

    /// Start trend analysis
    async fn start_trend_analysis(&self) -> Result<()> {
        let analyzer = self.trend_analyzer.clone();
        let metrics_store = self.metrics_store.clone();
        
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(300)); // Analyze every 5 minutes
            
            loop {
                interval.tick().await;
                
                if let Err(e) = analyzer.analyze_trends(&metrics_store).await {
                    error!("Failed to analyze trends: {}", e);
                }
            }
        });

        Ok(())
    }

    /// Start optimization advisor
    async fn start_optimization_advisor(&self) -> Result<()> {
        let advisor = self.optimization_advisor.clone();
        let metrics_store = self.metrics_store.clone();
        
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(600)); // Analyze every 10 minutes
            
            loop {
                interval.tick().await;
                
                if let Err(e) = advisor.generate_recommendations(&metrics_store).await {
                    error!("Failed to generate optimization recommendations: {}", e);
                }
            }
        });

        Ok(())
    }

    /// Get current performance metrics
    pub async fn get_metrics(&self) -> EnhancedPerformanceMetrics {
        let store = self.metrics_store.read().await;
        
        let execution_metrics = ExecutionMetrics {
            total_requests: store.aggregated_metrics.current_day.requests_per_day as u64,
            successful_requests: (store.aggregated_metrics.current_day.requests_per_day * store.aggregated_metrics.current_hour.success_rate) as u64,
            failed_requests: (store.aggregated_metrics.current_day.requests_per_day * (1.0 - store.aggregated_metrics.current_hour.success_rate)) as u64,
            avg_response_time: Duration::from_millis(store.aggregated_metrics.current_hour.avg_response_time_ms as u64),
            p95_response_time: Duration::from_millis((store.aggregated_metrics.current_hour.avg_response_time_ms * 1.5) as u64), // Approximation
            p99_response_time: Duration::from_millis((store.aggregated_metrics.current_hour.avg_response_time_ms * 2.0) as u64), // Approximation
        };

        let cost_metrics = CostMetrics {
            total_cost_usd: store.aggregated_metrics.current_day.avg_daily_cost,
            cost_per_request: if store.aggregated_metrics.current_day.requests_per_day > 0.0 {
                store.aggregated_metrics.current_day.avg_daily_cost / store.aggregated_metrics.current_day.requests_per_day
            } else {
                0.0
            },
            token_usage: TokenUsage {
                input_tokens: store.aggregated_metrics.current_day.daily_token_usage / 2, // Rough split
                output_tokens: store.aggregated_metrics.current_day.daily_token_usage / 2,
                total_tokens: store.aggregated_metrics.current_day.daily_token_usage,
            },
            model_costs: HashMap::new(), // Would need more detailed tracking
        };

        let quality_metrics = QualityMetrics {
            success_rate: store.aggregated_metrics.current_hour.success_rate,
            user_satisfaction_score: store.aggregated_metrics.current_day.quality_score_avg,
            error_distribution: HashMap::new(), // Would aggregate from detailed error tracking
            performance_trend: TrendDirection::Unknown, // Would come from trend analyzer
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

    /// Get optimization recommendations
    pub async fn get_optimization_recommendations(&self) -> Vec<OptimizationRecommendation> {
        self.optimization_advisor.recommendations.read().await.clone()
    }

    /// Get active alerts
    pub async fn get_active_alerts(&self) -> Vec<PerformanceAlert> {
        self.alert_manager.active_alerts.read().await.values().cloned().collect()
    }
}

// Implementation stubs for supporting structures
impl MetricsStore {
    pub fn new() -> Self {
        Self {
            execution_metrics: VecDeque::new(),
            system_metrics: VecDeque::new(),
            model_metrics: HashMap::new(),
            agent_metrics: HashMap::new(),
            aggregated_metrics: AggregatedMetrics::default(),
            metric_snapshots: BTreeMap::new(),
        }
    }
}

impl ModelMetricsHistory {
    pub fn new(model_id: String) -> Self {
        Self {
            model_id,
            total_requests: 0,
            successful_requests: 0,
            total_tokens: 0,
            total_cost: 0.0,
            response_times: VecDeque::new(),
            quality_scores: VecDeque::new(),
            error_counts: HashMap::new(),
            usage_over_time: VecDeque::new(),
            performance_trend: TrendData::default(),
        }
    }
}

impl AgentMetricsHistory {
    pub fn new(agent_id: String, agent_type: String) -> Self {
        Self {
            agent_id,
            agent_type,
            tasks_completed: 0,
            tasks_failed: 0,
            avg_task_duration: Duration::ZERO,
            coordination_events: 0,
            consensus_participation: 0,
            resource_usage: ResourceUsageHistory::default(),
            performance_scores: VecDeque::new(),
            efficiency_trend: TrendData::default(),
        }
    }
}

impl RealTimeMonitor {
    pub fn new(alert_thresholds: AlertThresholds) -> Self {
        Self {
            active_requests: Arc::new(RwLock::new(HashMap::new())),
            performance_alerts: Arc::new(Mutex::new(VecDeque::new())),
            monitoring_interval: Duration::from_secs(10),
            alert_thresholds,
        }
    }

    pub async fn collect_system_metrics(&self, metrics_store: &Arc<RwLock<MetricsStore>>) -> Result<()> {
        // Collect system metrics - simplified implementation
        let system_entry = SystemMetricEntry {
            timestamp: SystemTime::now(),
            cpu_usage_percent: 0.0, // Would collect from system
            memory_usage_mb: 0,
            memory_usage_percent: 0.0,
            disk_io_kb: 0,
            network_io_kb: 0,
            active_connections: 0,
            thread_count: 0,
            gc_collections: 0,
            heap_size_mb: 0,
        };

        let mut store = metrics_store.write().await;
        store.system_metrics.push_back(system_entry);
        
        if store.system_metrics.len() > 10000 {
            store.system_metrics.pop_front();
        }

        Ok(())
    }
}

impl TrendAnalyzer {
    pub fn new() -> Self {
        Self {
            trend_models: HashMap::new(),
            analysis_window: Duration::from_days(7),
            prediction_horizon: Duration::from_days(1),
        }
    }

    pub async fn analyze_trends(&self, _metrics_store: &Arc<RwLock<MetricsStore>>) -> Result<()> {
        // Trend analysis implementation would go here
        Ok(())
    }
}

impl AlertManager {
    pub fn new() -> Self {
        Self {
            active_alerts: Arc::new(RwLock::new(HashMap::new())),
            alert_history: Arc::new(RwLock::new(VecDeque::new())),
            suppression_rules: Vec::new(),
            notification_channels: Vec::new(),
        }
    }

    pub async fn process_alert(&self, alert: PerformanceAlert) {
        let mut active_alerts = self.active_alerts.write().await;
        active_alerts.insert(alert.id.clone(), alert.clone());

        let mut history = self.alert_history.write().await;
        history.push_back(alert);
        
        if history.len() > 10000 {
            history.pop_front();
        }
    }
}

impl OptimizationAdvisor {
    pub fn new() -> Self {
        Self {
            recommendations: Arc::new(RwLock::new(Vec::new())),
            optimization_rules: Vec::new(),
            implementation_tracker: HashMap::new(),
        }
    }

    pub async fn generate_recommendations(&self, _metrics_store: &Arc<RwLock<MetricsStore>>) -> Result<()> {
        // Recommendation generation logic would go here
        Ok(())
    }
}

// Default implementations
impl Default for PerformanceConfig {
    fn default() -> Self {
        Self {
            metrics_retention_days: 30,
            snapshot_interval: Duration::from_secs(3600), // Hourly
            real_time_monitoring: true,
            trend_analysis_enabled: true,
            alert_thresholds: AlertThresholds {
                response_time_ms: 30000,
                error_rate_percentage: 5.0,
                cost_per_hour: 10.0,
            },
            optimization_advisor_enabled: true,
            auto_optimization: false,
            detailed_logging: false,
        }
    }
}

impl Default for AggregatedMetrics {
    fn default() -> Self {
        Self {
            current_hour: HourlyMetrics {
                requests_per_hour: 0.0,
                avg_response_time_ms: 0.0,
                success_rate: 1.0,
                cost_per_hour: 0.0,
                tokens_per_hour: 0,
                errors_per_hour: 0,
            },
            current_day: DailyMetrics {
                requests_per_day: 0.0,
                peak_requests_per_hour: 0.0,
                avg_daily_cost: 0.0,
                daily_token_usage: 0,
                quality_score_avg: 0.0,
                uptime_percentage: 100.0,
            },
            current_week: WeeklyMetrics {
                avg_daily_requests: 0.0,
                weekly_cost_trend: TrendDirection::Stable,
                performance_stability: 1.0,
                capacity_utilization: 0.0,
                efficiency_score: 1.0,
            },
            current_month: MonthlyMetrics {
                monthly_request_volume: 0,
                cost_efficiency_trend: TrendDirection::Stable,
                model_usage_distribution: HashMap::new(),
                performance_improvements: 0.0,
                reliability_score: 1.0,
            },
            last_updated: SystemTime::now(),
        }
    }
}

impl Default for TrendData {
    fn default() -> Self {
        Self {
            direction: TrendDirection::Stable,
            strength: 0.0,
            confidence: 0.0,
            prediction: None,
            seasonality: None,
            anomalies: Vec::new(),
        }
    }
}

impl Default for ResourceUsageHistory {
    fn default() -> Self {
        Self {
            memory_usage: VecDeque::new(),
            cpu_usage: VecDeque::new(),
            network_bandwidth: VecDeque::new(),
            storage_usage: VecDeque::new(),
        }
    }
}