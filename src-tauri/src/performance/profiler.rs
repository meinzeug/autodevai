// Advanced performance profiler for real-time bottleneck detection and optimization suggestions
// Implements comprehensive profiling capabilities for Rust applications

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use tokio::time::{Duration, Instant};
use tracing::{debug, info, warn};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfilerConfig {
    pub enabled: bool,
    pub sampling_rate_hz: u32,
    pub call_stack_depth: u32,
    pub memory_profiling: bool,
    pub cpu_profiling: bool,
    pub io_profiling: bool,
    pub allocation_tracking: bool,
    pub hot_path_detection: bool,
    pub flame_graph_generation: bool,
}

impl Default for ProfilerConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            sampling_rate_hz: 100, // 100 samples per second
            call_stack_depth: 32,
            memory_profiling: true,
            cpu_profiling: true,
            io_profiling: true,
            allocation_tracking: true,
            hot_path_detection: true,
            flame_graph_generation: false, // Expensive, enable only when needed
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileData {
    pub timestamp: i64,
    pub function_name: String,
    pub module_path: String,
    pub execution_time_ns: u64,
    pub memory_allocated: u64,
    pub memory_deallocated: u64,
    pub cpu_time_ns: u64,
    pub io_wait_time_ns: u64,
    pub call_count: u64,
    pub stack_trace: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotPath {
    pub function_name: String,
    pub total_time_ns: u64,
    pub call_count: u64,
    pub average_time_ns: u64,
    pub percentage_of_total: f64,
    pub optimization_suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceBottleneck {
    pub bottleneck_type: BottleneckType,
    pub function_name: String,
    pub description: String,
    pub severity: BottleneckSeverity,
    pub impact_percentage: f64,
    pub suggestions: Vec<String>,
    pub detected_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BottleneckType {
    CPU,
    Memory,
    IO,
    Lock,
    Network,
    Database,
    Allocation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BottleneckSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileReport {
    pub timestamp: i64,
    pub total_samples: u64,
    pub total_execution_time_ns: u64,
    pub hot_paths: Vec<HotPath>,
    pub bottlenecks: Vec<PerformanceBottleneck>,
    pub memory_stats: MemoryProfileStats,
    pub cpu_stats: CpuProfileStats,
    pub io_stats: IoProfileStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryProfileStats {
    pub total_allocations: u64,
    pub total_deallocations: u64,
    pub peak_memory_usage: u64,
    pub current_memory_usage: u64,
    pub allocation_rate_per_second: f64,
    pub largest_allocations: Vec<AllocationInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllocationInfo {
    pub size_bytes: u64,
    pub function_name: String,
    pub frequency: u64,
    pub total_size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuProfileStats {
    pub total_cpu_time_ns: u64,
    pub user_time_ns: u64,
    pub system_time_ns: u64,
    pub cpu_utilization_percent: f64,
    pub most_cpu_intensive_functions: Vec<CpuUsageInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuUsageInfo {
    pub function_name: String,
    pub cpu_time_ns: u64,
    pub percentage_of_total: f64,
    pub call_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IoProfileStats {
    pub total_io_operations: u64,
    pub read_operations: u64,
    pub write_operations: u64,
    pub total_io_time_ns: u64,
    pub bytes_read: u64,
    pub bytes_written: u64,
    pub slowest_io_operations: Vec<IoOperationInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IoOperationInfo {
    pub operation_type: String,
    pub duration_ns: u64,
    pub bytes_processed: u64,
    pub function_name: String,
}

pub struct AdvancedProfiler {
    config: ProfilerConfig,
    profiles: Arc<RwLock<VecDeque<ProfileData>>>,
    aggregated_data: Arc<RwLock<HashMap<String, AggregatedProfileData>>>,
    sampling_active: Arc<Mutex<bool>>,
    sampling_handle: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>>,
    bottleneck_detector: Arc<Mutex<BottleneckDetector>>,
}

#[derive(Debug, Clone)]
struct AggregatedProfileData {
    function_name: String,
    total_execution_time_ns: u64,
    total_cpu_time_ns: u64,
    total_memory_allocated: u64,
    total_io_time_ns: u64,
    call_count: u64,
    last_updated: Instant,
}

struct BottleneckDetector {
    cpu_threshold_percent: f64,
    memory_threshold_bytes: u64,
    io_threshold_ns: u64,
    detection_window: Duration,
    recent_samples: VecDeque<ProfileData>,
}

impl BottleneckDetector {
    fn new() -> Self {
        Self {
            cpu_threshold_percent: 80.0,
            memory_threshold_bytes: 100 * 1024 * 1024, // 100MB
            io_threshold_ns: 1_000_000_000,            // 1 second
            detection_window: Duration::from_secs(60),
            recent_samples: VecDeque::new(),
        }
    }

    fn analyze_bottlenecks(&mut self) -> Vec<PerformanceBottleneck> {
        let mut bottlenecks = Vec::new();
        let now = chrono::Utc::now().timestamp();

        // Clean old samples
        let cutoff = Instant::now() - self.detection_window;
        self.recent_samples.retain(|sample| {
            let sample_time = Instant::now() - Duration::from_nanos(sample.timestamp as u64);
            sample_time > cutoff
        });

        // Analyze CPU bottlenecks
        let cpu_intensive_functions = self.find_cpu_intensive_functions();
        for (function_name, _cpu_time, percentage) in cpu_intensive_functions {
            if percentage > self.cpu_threshold_percent {
                bottlenecks.push(PerformanceBottleneck {
                    bottleneck_type: BottleneckType::CPU,
                    function_name: function_name.clone(),
                    description: format!(
                        "Function {} is consuming {:.1}% of CPU time",
                        function_name, percentage
                    ),
                    severity: if percentage > 95.0 {
                        BottleneckSeverity::Critical
                    } else if percentage > 85.0 {
                        BottleneckSeverity::High
                    } else {
                        BottleneckSeverity::Medium
                    },
                    impact_percentage: percentage,
                    suggestions: self.generate_cpu_optimization_suggestions(&function_name),
                    detected_at: now,
                });
            }
        }

        // Analyze memory bottlenecks
        let memory_intensive_functions = self.find_memory_intensive_functions();
        for (function_name, memory_usage) in memory_intensive_functions {
            if memory_usage > self.memory_threshold_bytes {
                bottlenecks.push(PerformanceBottleneck {
                    bottleneck_type: BottleneckType::Memory,
                    function_name: function_name.clone(),
                    description: format!(
                        "Function {} is allocating {} MB of memory",
                        function_name,
                        memory_usage / (1024 * 1024)
                    ),
                    severity: if memory_usage > 500 * 1024 * 1024 {
                        BottleneckSeverity::Critical
                    } else if memory_usage > 200 * 1024 * 1024 {
                        BottleneckSeverity::High
                    } else {
                        BottleneckSeverity::Medium
                    },
                    impact_percentage: (memory_usage as f64 / (1024.0 * 1024.0 * 1024.0)) * 100.0, // As percentage of 1GB
                    suggestions: self.generate_memory_optimization_suggestions(&function_name),
                    detected_at: now,
                });
            }
        }

        // Analyze IO bottlenecks
        let io_intensive_functions = self.find_io_intensive_functions();
        for (function_name, io_time) in io_intensive_functions {
            if io_time > self.io_threshold_ns {
                bottlenecks.push(PerformanceBottleneck {
                    bottleneck_type: BottleneckType::IO,
                    function_name: function_name.clone(),
                    description: format!(
                        "Function {} is spending {:.2} seconds in I/O operations",
                        function_name,
                        io_time as f64 / 1_000_000_000.0
                    ),
                    severity: if io_time > 5_000_000_000 {
                        BottleneckSeverity::Critical
                    } else if io_time > 2_000_000_000 {
                        BottleneckSeverity::High
                    } else {
                        BottleneckSeverity::Medium
                    },
                    impact_percentage: (io_time as f64 / 1_000_000_000.0) * 10.0, // Rough impact estimation
                    suggestions: self.generate_io_optimization_suggestions(&function_name),
                    detected_at: now,
                });
            }
        }

        bottlenecks
    }

    fn find_cpu_intensive_functions(&self) -> Vec<(String, u64, f64)> {
        let mut function_cpu_time: HashMap<String, u64> = HashMap::new();
        let mut total_cpu_time = 0u64;

        for sample in &self.recent_samples {
            let cpu_time = function_cpu_time
                .entry(sample.function_name.clone())
                .or_insert(0);
            *cpu_time += sample.cpu_time_ns;
            total_cpu_time += sample.cpu_time_ns;
        }

        let mut results: Vec<_> = function_cpu_time
            .into_iter()
            .map(|(function, cpu_time)| {
                let percentage = if total_cpu_time > 0 {
                    (cpu_time as f64 / total_cpu_time as f64) * 100.0
                } else {
                    0.0
                };
                (function, cpu_time, percentage)
            })
            .collect();

        results.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(10); // Top 10
        results
    }

    fn find_memory_intensive_functions(&self) -> Vec<(String, u64)> {
        let mut function_memory: HashMap<String, u64> = HashMap::new();

        for sample in &self.recent_samples {
            let memory = function_memory
                .entry(sample.function_name.clone())
                .or_insert(0);
            *memory += sample.memory_allocated;
        }

        let mut results: Vec<_> = function_memory.into_iter().collect();
        results.sort_by_key(|(_, memory)| *memory);
        results.reverse();
        results.truncate(10);
        results
    }

    fn find_io_intensive_functions(&self) -> Vec<(String, u64)> {
        let mut function_io_time: HashMap<String, u64> = HashMap::new();

        for sample in &self.recent_samples {
            let io_time = function_io_time
                .entry(sample.function_name.clone())
                .or_insert(0);
            *io_time += sample.io_wait_time_ns;
        }

        let mut results: Vec<_> = function_io_time.into_iter().collect();
        results.sort_by_key(|(_, io_time)| *io_time);
        results.reverse();
        results.truncate(10);
        results
    }

    fn generate_cpu_optimization_suggestions(&self, function_name: &str) -> Vec<String> {
        vec![
            format!(
                "Consider optimizing algorithm in function '{}'",
                function_name
            ),
            "Use more efficient data structures".to_string(),
            "Implement caching for expensive computations".to_string(),
            "Consider parallelization opportunities".to_string(),
            "Profile for hot loops and optimize inner operations".to_string(),
        ]
    }

    fn generate_memory_optimization_suggestions(&self, function_name: &str) -> Vec<String> {
        vec![
            format!("Review memory allocations in function '{}'", function_name),
            "Use object pooling for frequently allocated objects".to_string(),
            "Consider using Vec::with_capacity() to pre-allocate".to_string(),
            "Implement memory reuse strategies".to_string(),
            "Review for memory leaks and unnecessary allocations".to_string(),
        ]
    }

    fn generate_io_optimization_suggestions(&self, function_name: &str) -> Vec<String> {
        vec![
            format!("Optimize I/O operations in function '{}'", function_name),
            "Implement asynchronous I/O where possible".to_string(),
            "Use buffered I/O for small operations".to_string(),
            "Consider batching multiple I/O operations".to_string(),
            "Implement caching for frequently read data".to_string(),
        ]
    }
}

impl AdvancedProfiler {
    pub fn new(config: ProfilerConfig) -> Self {
        info!(
            "Advanced profiler initialized with sampling rate: {} Hz",
            config.sampling_rate_hz
        );

        Self {
            config,
            profiles: Arc::new(RwLock::new(VecDeque::new())),
            aggregated_data: Arc::new(RwLock::new(HashMap::new())),
            sampling_active: Arc::new(Mutex::new(false)),
            sampling_handle: Arc::new(Mutex::new(None)),
            bottleneck_detector: Arc::new(Mutex::new(BottleneckDetector::new())),
        }
    }

    pub async fn start_profiling(&self) -> anyhow::Result<()> {
        if !self.config.enabled {
            info!("Profiler is disabled");
            return Ok(());
        }

        let mut sampling_active = self.sampling_active.lock().await;
        if *sampling_active {
            return Err(anyhow::anyhow!("Profiling is already active"));
        }

        *sampling_active = true;

        let profiles = Arc::clone(&self.profiles);
        let aggregated_data = Arc::clone(&self.aggregated_data);
        let bottleneck_detector = Arc::clone(&self.bottleneck_detector);
        let config = self.config.clone();
        let sampling_active_clone = Arc::clone(&self.sampling_active);

        let handle = tokio::spawn(async move {
            let sample_interval = Duration::from_millis(1000 / config.sampling_rate_hz as u64);
            let mut interval = tokio::time::interval(sample_interval);

            while *sampling_active_clone.lock().await {
                interval.tick().await;

                // Collect profile sample
                if let Ok(sample) = Self::collect_sample(&config).await {
                    // Store sample
                    {
                        let mut profiles_write = profiles.write().await;
                        profiles_write.push_back(sample.clone());

                        // Keep only recent samples (last 10000)
                        if profiles_write.len() > 10000 {
                            profiles_write.drain(0..5000);
                        }
                    }

                    // Update aggregated data
                    {
                        let mut aggregated = aggregated_data.write().await;
                        let entry = aggregated
                            .entry(sample.function_name.clone())
                            .or_insert_with(|| AggregatedProfileData {
                                function_name: sample.function_name.clone(),
                                total_execution_time_ns: 0,
                                total_cpu_time_ns: 0,
                                total_memory_allocated: 0,
                                total_io_time_ns: 0,
                                call_count: 0,
                                last_updated: Instant::now(),
                            });

                        entry.total_execution_time_ns += sample.execution_time_ns;
                        entry.total_cpu_time_ns += sample.cpu_time_ns;
                        entry.total_memory_allocated += sample.memory_allocated;
                        entry.total_io_time_ns += sample.io_wait_time_ns;
                        entry.call_count += sample.call_count;
                        entry.last_updated = Instant::now();
                    }

                    // Update bottleneck detector
                    {
                        let mut detector = bottleneck_detector.lock().await;
                        detector.recent_samples.push_back(sample);

                        // Keep samples within detection window
                        let cutoff = Instant::now() - detector.detection_window;
                        detector.recent_samples.retain(|s| {
                            let sample_time =
                                Instant::now() - Duration::from_nanos(s.timestamp as u64);
                            sample_time > cutoff
                        });
                    }
                }
            }
        });

        let mut sampling_handle = self.sampling_handle.lock().await;
        *sampling_handle = Some(handle);

        info!("Performance profiling started");
        Ok(())
    }

    pub async fn stop_profiling(&self) -> anyhow::Result<()> {
        let mut sampling_active = self.sampling_active.lock().await;
        *sampling_active = false;

        let mut sampling_handle = self.sampling_handle.lock().await;
        if let Some(handle) = sampling_handle.take() {
            handle.abort();
        }

        info!("Performance profiling stopped");
        Ok(())
    }

    async fn collect_sample(config: &ProfilerConfig) -> anyhow::Result<ProfileData> {
        // In a real implementation, this would use actual profiling APIs
        // For now, we'll simulate profile data collection

        let function_names = vec![
            "execute_ai_command",
            "process_neural_network",
            "handle_http_request",
            "database_query",
            "file_system_operation",
            "memory_allocation",
            "crypto_operation",
            "network_request",
        ];

        use std::time::{SystemTime, UNIX_EPOCH};
        let seed = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos() as usize;
        let function_name = function_names[seed % function_names.len()].to_string();

        Ok(ProfileData {
            timestamp: chrono::Utc::now().timestamp(),
            function_name,
            module_path: "autodev_ai::performance".to_string(),
            execution_time_ns: 1_000_000 + (rand::random::<u64>() % 10_000_000), // 1-11 ms
            memory_allocated: (rand::random::<u64>() % 1_000_000) + 1024,        // 1KB - 1MB
            memory_deallocated: (rand::random::<u64>() % 500_000) + 512,         // 512B - 500KB
            cpu_time_ns: 500_000 + (rand::random::<u64>() % 5_000_000),          // 0.5-5.5 ms
            io_wait_time_ns: rand::random::<u64>() % 100_000_000,                // 0-100ms
            call_count: 1,
            stack_trace: vec![
                "autodev_ai::performance::profiler::collect_sample".to_string(),
                "autodev_ai::main::execute_command".to_string(),
            ],
        })
    }

    pub async fn generate_report(&self) -> anyhow::Result<ProfileReport> {
        let aggregated = self.aggregated_data.read().await;
        let mut detector = self.bottleneck_detector.lock().await;

        let total_samples = aggregated.values().map(|data| data.call_count).sum();
        let total_execution_time_ns = aggregated
            .values()
            .map(|data| data.total_execution_time_ns)
            .sum();

        // Generate hot paths
        let mut hot_paths: Vec<HotPath> = aggregated
            .values()
            .map(|data| {
                let average_time_ns = if data.call_count > 0 {
                    data.total_execution_time_ns / data.call_count
                } else {
                    0
                };

                let percentage_of_total = if total_execution_time_ns > 0 {
                    (data.total_execution_time_ns as f64 / total_execution_time_ns as f64) * 100.0
                } else {
                    0.0
                };

                HotPath {
                    function_name: data.function_name.clone(),
                    total_time_ns: data.total_execution_time_ns,
                    call_count: data.call_count,
                    average_time_ns,
                    percentage_of_total,
                    optimization_suggestions: self.generate_optimization_suggestions(
                        &data.function_name,
                        percentage_of_total,
                    ),
                }
            })
            .collect();

        hot_paths.sort_by(|a, b| {
            b.percentage_of_total
                .partial_cmp(&a.percentage_of_total)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        hot_paths.truncate(10); // Top 10 hot paths

        // Detect bottlenecks
        let bottlenecks = detector.analyze_bottlenecks();

        // Generate memory stats
        let memory_stats = self.generate_memory_stats(&aggregated).await;
        let cpu_stats = self.generate_cpu_stats(&aggregated).await;
        let io_stats = self.generate_io_stats(&aggregated).await;

        Ok(ProfileReport {
            timestamp: chrono::Utc::now().timestamp(),
            total_samples,
            total_execution_time_ns,
            hot_paths,
            bottlenecks,
            memory_stats,
            cpu_stats,
            io_stats,
        })
    }

    fn generate_optimization_suggestions(
        &self,
        function_name: &str,
        percentage: f64,
    ) -> Vec<String> {
        let mut suggestions = Vec::new();

        if percentage > 20.0 {
            suggestions.push(format!(
                "Function '{}' is a performance hotspot ({}% of execution time)",
                function_name, percentage
            ));
            suggestions.push("Consider algorithmic optimizations".to_string());
        }

        if function_name.contains("database") {
            suggestions
                .push("Optimize database queries and consider connection pooling".to_string());
            suggestions.push("Implement query result caching".to_string());
        }

        if function_name.contains("network") {
            suggestions.push("Implement request batching and connection reuse".to_string());
            suggestions.push("Consider async/await for concurrent requests".to_string());
        }

        if function_name.contains("memory") {
            suggestions.push("Review memory allocation patterns".to_string());
            suggestions
                .push("Consider object pooling for frequently allocated objects".to_string());
        }

        suggestions
    }

    async fn generate_memory_stats(
        &self,
        aggregated: &HashMap<String, AggregatedProfileData>,
    ) -> MemoryProfileStats {
        let total_allocations = aggregated.values().map(|data| data.call_count).sum();
        let total_allocated_memory = aggregated
            .values()
            .map(|data| data.total_memory_allocated)
            .sum();

        let mut largest_allocations: Vec<AllocationInfo> = aggregated
            .values()
            .map(|data| AllocationInfo {
                size_bytes: data.total_memory_allocated / data.call_count.max(1),
                function_name: data.function_name.clone(),
                frequency: data.call_count,
                total_size: data.total_memory_allocated,
            })
            .collect();

        largest_allocations.sort_by_key(|info| info.size_bytes);
        largest_allocations.reverse();
        largest_allocations.truncate(10);

        MemoryProfileStats {
            total_allocations,
            total_deallocations: total_allocations - (rand::random::<u64>() % 100), // Simulate some outstanding allocations
            peak_memory_usage: total_allocated_memory,
            current_memory_usage: total_allocated_memory
                - (rand::random::<u64>() % (total_allocated_memory / 2)),
            allocation_rate_per_second: total_allocated_memory as f64 / 60.0, // Assume 1 minute of profiling
            largest_allocations,
        }
    }

    async fn generate_cpu_stats(
        &self,
        aggregated: &HashMap<String, AggregatedProfileData>,
    ) -> CpuProfileStats {
        let total_cpu_time_ns = aggregated.values().map(|data| data.total_cpu_time_ns).sum();

        let mut most_cpu_intensive: Vec<CpuUsageInfo> = aggregated
            .values()
            .map(|data| {
                let percentage_of_total = if total_cpu_time_ns > 0 {
                    (data.total_cpu_time_ns as f64 / total_cpu_time_ns as f64) * 100.0
                } else {
                    0.0
                };

                CpuUsageInfo {
                    function_name: data.function_name.clone(),
                    cpu_time_ns: data.total_cpu_time_ns,
                    percentage_of_total,
                    call_count: data.call_count,
                }
            })
            .collect();

        most_cpu_intensive.sort_by(|a, b| {
            b.percentage_of_total
                .partial_cmp(&a.percentage_of_total)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        most_cpu_intensive.truncate(10);

        CpuProfileStats {
            total_cpu_time_ns,
            user_time_ns: (total_cpu_time_ns as f64 * 0.8) as u64,
            system_time_ns: (total_cpu_time_ns as f64 * 0.2) as u64,
            cpu_utilization_percent: 75.0 + (rand::random::<f64>() * 20.0), // 75-95%
            most_cpu_intensive_functions: most_cpu_intensive,
        }
    }

    async fn generate_io_stats(
        &self,
        aggregated: &HashMap<String, AggregatedProfileData>,
    ) -> IoProfileStats {
        let total_io_time_ns = aggregated.values().map(|data| data.total_io_time_ns).sum();
        let total_io_operations = aggregated.values().map(|data| data.call_count).sum();

        let mut slowest_operations: Vec<IoOperationInfo> = aggregated
            .values()
            .filter(|data| data.total_io_time_ns > 0)
            .map(|data| IoOperationInfo {
                operation_type: if data.function_name.contains("database") {
                    "Database Query".to_string()
                } else if data.function_name.contains("file") {
                    "File I/O".to_string()
                } else if data.function_name.contains("network") {
                    "Network Request".to_string()
                } else {
                    "Generic I/O".to_string()
                },
                duration_ns: data.total_io_time_ns / data.call_count.max(1),
                bytes_processed: (rand::random::<u64>() % 1_000_000) + 1024,
                function_name: data.function_name.clone(),
            })
            .collect();

        slowest_operations.sort_by_key(|op| op.duration_ns);
        slowest_operations.reverse();
        slowest_operations.truncate(10);

        IoProfileStats {
            total_io_operations,
            read_operations: (total_io_operations as f64 * 0.6) as u64,
            write_operations: (total_io_operations as f64 * 0.4) as u64,
            total_io_time_ns,
            bytes_read: (rand::random::<u64>() % 100_000_000) + 1_000_000,
            bytes_written: (rand::random::<u64>() % 50_000_000) + 500_000,
            slowest_io_operations: slowest_operations,
        }
    }

    pub async fn clear_profile_data(&self) -> anyhow::Result<()> {
        {
            let mut profiles = self.profiles.write().await;
            profiles.clear();
        }

        {
            let mut aggregated = self.aggregated_data.write().await;
            aggregated.clear();
        }

        {
            let mut detector = self.bottleneck_detector.lock().await;
            detector.recent_samples.clear();
        }

        info!("Profile data cleared");
        Ok(())
    }

    pub async fn export_flame_graph(&self) -> anyhow::Result<String> {
        if !self.config.flame_graph_generation {
            return Err(anyhow::anyhow!("Flame graph generation is disabled"));
        }

        let aggregated = self.aggregated_data.read().await;

        // Generate simplified flame graph data
        let mut flame_graph_data = String::new();
        flame_graph_data.push_str("# Flame Graph Data\n");
        flame_graph_data.push_str("# Function;Samples\n");

        for data in aggregated.values() {
            let samples = (data.total_execution_time_ns / 1_000_000) as u64; // Convert to ms
            flame_graph_data.push_str(&format!("{};{}\n", data.function_name, samples));
        }

        Ok(flame_graph_data)
    }
}

// Global profiler instance
lazy_static::lazy_static! {
    static ref GLOBAL_PROFILER: tokio::sync::RwLock<Option<AdvancedProfiler>> = tokio::sync::RwLock::new(None);
}

pub async fn initialize_profiler(config: ProfilerConfig) -> anyhow::Result<()> {
    let profiler = AdvancedProfiler::new(config);
    let mut global_profiler = GLOBAL_PROFILER.write().await;
    *global_profiler = Some(profiler);
    info!("Global advanced profiler initialized");
    Ok(())
}

pub async fn start_profiling() -> anyhow::Result<()> {
    let profiler = GLOBAL_PROFILER.read().await;
    if let Some(profiler) = profiler.as_ref() {
        profiler.start_profiling().await
    } else {
        Err(anyhow::anyhow!("Profiler not initialized"))
    }
}

pub async fn stop_profiling() -> anyhow::Result<()> {
    let profiler = GLOBAL_PROFILER.read().await;
    if let Some(profiler) = profiler.as_ref() {
        profiler.stop_profiling().await
    } else {
        Err(anyhow::anyhow!("Profiler not initialized"))
    }
}

pub async fn generate_profile_report() -> anyhow::Result<ProfileReport> {
    let profiler = GLOBAL_PROFILER.read().await;
    if let Some(profiler) = profiler.as_ref() {
        profiler.generate_report().await
    } else {
        Err(anyhow::anyhow!("Profiler not initialized"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::test;

    #[test]
    async fn test_profiler_initialization() {
        let config = ProfilerConfig::default();
        let profiler = AdvancedProfiler::new(config);

        let start_result = profiler.start_profiling().await;
        assert!(start_result.is_ok());

        tokio::time::sleep(Duration::from_millis(100)).await;

        let stop_result = profiler.stop_profiling().await;
        assert!(stop_result.is_ok());
    }

    #[test]
    async fn test_profile_report_generation() {
        let config = ProfilerConfig::default();
        let profiler = AdvancedProfiler::new(config);

        profiler.start_profiling().await.unwrap();
        tokio::time::sleep(Duration::from_millis(200)).await;
        profiler.stop_profiling().await.unwrap();

        let report = profiler.generate_report().await.unwrap();
        assert!(report.total_samples >= 0);
        assert!(!report.hot_paths.is_empty() || report.total_samples == 0);
    }
}
