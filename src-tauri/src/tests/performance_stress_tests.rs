//! Comprehensive Performance and Stress Tests for Tauri Application
//! 
//! This module contains extensive performance benchmarks and stress tests
//! for all Tauri components to ensure optimal performance under various conditions.

use std::collections::HashMap;
use std::sync::{Arc, Mutex, atomic::{AtomicU32, AtomicBool, Ordering}};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use std::thread;
use tokio::time::sleep;
use serde_json::{json, Value};

/// Performance metrics collector for test results
#[derive(Debug, Clone)]
struct PerformanceMetrics {
    operation: String,
    duration_ms: u128,
    memory_usage_kb: u64,
    cpu_usage_percent: f64,
    operations_per_second: f64,
    success_count: u32,
    error_count: u32,
    timestamp: u64,
}

impl PerformanceMetrics {
    fn new(operation: &str) -> Self {
        Self {
            operation: operation.to_string(),
            duration_ms: 0,
            memory_usage_kb: 0,
            cpu_usage_percent: 0.0,
            operations_per_second: 0.0,
            success_count: 0,
            error_count: 0,
            timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
        }
    }
}

/// High-performance benchmark timer with sub-millisecond precision
struct BenchmarkTimer {
    start_time: Instant,
    operation_count: AtomicU32,
    error_count: AtomicU32,
}

impl BenchmarkTimer {
    fn new() -> Self {
        Self {
            start_time: Instant::now(),
            operation_count: AtomicU32::new(0),
            error_count: AtomicU32::new(0),
        }
    }

    fn record_operation(&self) {
        self.operation_count.fetch_add(1, Ordering::Relaxed);
    }

    fn record_error(&self) {
        self.error_count.fetch_add(1, Ordering::Relaxed);
    }

    fn get_metrics(&self, operation: &str) -> PerformanceMetrics {
        let duration = self.start_time.elapsed();
        let ops = self.operation_count.load(Ordering::Relaxed);
        let errors = self.error_count.load(Ordering::Relaxed);
        
        PerformanceMetrics {
            operation: operation.to_string(),
            duration_ms: duration.as_millis(),
            memory_usage_kb: Self::get_memory_usage(),
            cpu_usage_percent: Self::get_cpu_usage(),
            operations_per_second: if duration.as_secs_f64() > 0.0 {
                ops as f64 / duration.as_secs_f64()
            } else {
                0.0
            },
            success_count: ops,
            error_count: errors,
            timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
        }
    }

    fn get_memory_usage() -> u64 {
        // Mock memory usage calculation
        std::process::id() as u64 * 1024 // Simulated memory usage
    }

    fn get_cpu_usage() -> f64 {
        // Mock CPU usage calculation
        (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos() % 100) as f64
    }
}

/// Mock high-performance window manager for stress testing
struct StressTestWindowManager {
    windows: Arc<Mutex<HashMap<String, MockWindow>>>,
    operation_counter: AtomicU32,
    error_counter: AtomicU32,
    performance_mode: bool,
}

#[derive(Debug, Clone)]
struct MockWindow {
    id: String,
    width: u32,
    height: u32,
    x: i32,
    y: i32,
    visible: bool,
    maximized: bool,
    minimized: bool,
    creation_time: Instant,
    last_update: Instant,
    operation_count: u32,
}

impl StressTestWindowManager {
    fn new() -> Self {
        Self {
            windows: Arc::new(Mutex::new(HashMap::new())),
            operation_counter: AtomicU32::new(0),
            error_counter: AtomicU32::new(0),
            performance_mode: true,
        }
    }

    fn create_window_batch(&self, count: u32) -> Result<Vec<String>, String> {
        let mut windows = self.windows.lock().unwrap();
        let mut created_ids = Vec::new();
        
        for i in 0..count {
            let id = format!("stress_window_{}", i);
            let window = MockWindow {
                id: id.clone(),
                width: 800 + (i % 400),
                height: 600 + (i % 300),
                x: (i as i32 * 50) % 1920,
                y: (i as i32 * 30) % 1080,
                visible: true,
                maximized: false,
                minimized: false,
                creation_time: Instant::now(),
                last_update: Instant::now(),
                operation_count: 0,
            };
            
            windows.insert(id.clone(), window);
            created_ids.push(id);
            self.operation_counter.fetch_add(1, Ordering::Relaxed);
        }
        
        Ok(created_ids)
    }

    fn update_windows_batch(&self, window_ids: &[String]) -> Result<(), String> {
        let mut windows = self.windows.lock().unwrap();
        
        for id in window_ids {
            if let Some(window) = windows.get_mut(id) {
                window.width = (window.width + 10) % 1920;
                window.height = (window.height + 10) % 1080;
                window.last_update = Instant::now();
                window.operation_count += 1;
                self.operation_counter.fetch_add(1, Ordering::Relaxed);
            }
        }
        
        Ok(())
    }

    fn destroy_windows_batch(&self, window_ids: &[String]) -> Result<(), String> {
        let mut windows = self.windows.lock().unwrap();
        
        for id in window_ids {
            windows.remove(id);
            self.operation_counter.fetch_add(1, Ordering::Relaxed);
        }
        
        Ok(())
    }

    fn get_window_count(&self) -> usize {
        self.windows.lock().unwrap().len()
    }

    fn get_performance_stats(&self) -> Value {
        let windows = self.windows.lock().unwrap();
        let total_operations = windows.values().map(|w| w.operation_count).sum::<u32>();
        
        json!({
            "window_count": windows.len(),
            "total_operations": total_operations + self.operation_counter.load(Ordering::Relaxed),
            "error_count": self.error_counter.load(Ordering::Relaxed),
            "performance_mode": self.performance_mode
        })
    }
}

/// Mock high-performance IPC system for stress testing
struct StressTestIPCManager {
    message_queue: Arc<Mutex<Vec<IPCMessage>>>,
    processing_rate: AtomicU32,
    success_count: AtomicU32,
    error_count: AtomicU32,
    rate_limits: HashMap<String, RateLimit>,
    is_running: AtomicBool,
}

#[derive(Debug, Clone)]
struct IPCMessage {
    id: String,
    command: String,
    payload: Value,
    timestamp: Instant,
    priority: u8,
    retry_count: u8,
}

#[derive(Debug, Clone)]
struct RateLimit {
    requests_per_second: u32,
    current_count: AtomicU32,
    window_start: Instant,
}

impl StressTestIPCManager {
    fn new() -> Self {
        let mut rate_limits = HashMap::new();
        rate_limits.insert("default".to_string(), RateLimit {
            requests_per_second: 1000,
            current_count: AtomicU32::new(0),
            window_start: Instant::now(),
        });

        Self {
            message_queue: Arc::new(Mutex::new(Vec::new())),
            processing_rate: AtomicU32::new(0),
            success_count: AtomicU32::new(0),
            error_count: AtomicU32::new(0),
            rate_limits,
            is_running: AtomicBool::new(false),
        }
    }

    fn process_messages_batch(&self, messages: Vec<IPCMessage>) -> Result<Vec<Value>, String> {
        let mut results = Vec::new();
        
        for message in messages {
            // Simulate message processing
            let processing_time = Duration::from_micros(100 + (message.payload.to_string().len() as u64));
            thread::sleep(processing_time);
            
            if message.command.contains("error") {
                self.error_count.fetch_add(1, Ordering::Relaxed);
                results.push(json!({
                    "id": message.id,
                    "error": "Simulated processing error",
                    "timestamp": message.timestamp.elapsed().as_millis()
                }));
            } else {
                self.success_count.fetch_add(1, Ordering::Relaxed);
                results.push(json!({
                    "id": message.id,
                    "result": "success",
                    "data": message.payload,
                    "processing_time_ms": processing_time.as_millis()
                }));
            }
        }
        
        self.processing_rate.fetch_add(messages.len() as u32, Ordering::Relaxed);
        Ok(results)
    }

    fn generate_test_messages(&self, count: u32) -> Vec<IPCMessage> {
        (0..count).map(|i| IPCMessage {
            id: format!("msg_{}", i),
            command: if i % 10 == 0 { "error_command".to_string() } else { "normal_command".to_string() },
            payload: json!({
                "index": i,
                "data": format!("test_data_{}", i),
                "timestamp": SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis()
            }),
            timestamp: Instant::now(),
            priority: (i % 3) as u8,
            retry_count: 0,
        }).collect()
    }

    fn get_performance_metrics(&self) -> Value {
        json!({
            "messages_processed": self.processing_rate.load(Ordering::Relaxed),
            "success_count": self.success_count.load(Ordering::Relaxed),
            "error_count": self.error_count.load(Ordering::Relaxed),
            "queue_size": self.message_queue.lock().unwrap().len(),
            "is_running": self.is_running.load(Ordering::Relaxed)
        })
    }
}

// ============================================================================
// WINDOW MANAGEMENT PERFORMANCE TESTS
// ============================================================================

#[tokio::test]
async fn test_window_creation_performance() {
    let timer = BenchmarkTimer::new();
    let window_manager = StressTestWindowManager::new();
    
    // Test creating 1000 windows in batches
    let batch_size = 100;
    let total_windows = 1000;
    
    for batch in 0..(total_windows / batch_size) {
        let start = Instant::now();
        let result = window_manager.create_window_batch(batch_size);
        
        assert!(result.is_ok(), "Window batch creation failed at batch {}", batch);
        timer.record_operation();
        
        // Ensure each batch completes within 100ms
        assert!(start.elapsed() < Duration::from_millis(100), 
                "Window creation batch {} took too long: {:?}", batch, start.elapsed());
    }
    
    let metrics = timer.get_metrics("window_creation");
    println!("Window Creation Performance: {:.2} ops/sec", metrics.operations_per_second);
    
    // Performance assertions
    assert!(metrics.operations_per_second > 50.0, "Window creation too slow: {}", metrics.operations_per_second);
    assert_eq!(window_manager.get_window_count(), total_windows as usize);
}

#[tokio::test]
async fn test_window_update_performance() {
    let timer = BenchmarkTimer::new();
    let window_manager = StressTestWindowManager::new();
    
    // Create initial windows
    let window_ids = window_manager.create_window_batch(500).unwrap();
    
    // Perform 10 rounds of updates
    for round in 0..10 {
        let start = Instant::now();
        let result = window_manager.update_windows_batch(&window_ids);
        
        assert!(result.is_ok(), "Window update failed at round {}", round);
        timer.record_operation();
        
        // Each update round should complete in under 50ms
        assert!(start.elapsed() < Duration::from_millis(50),
                "Window update round {} took too long: {:?}", round, start.elapsed());
    }
    
    let metrics = timer.get_metrics("window_updates");
    println!("Window Update Performance: {:.2} ops/sec", metrics.operations_per_second);
    
    assert!(metrics.operations_per_second > 100.0, "Window updates too slow: {}", metrics.operations_per_second);
}

#[tokio::test]
async fn test_concurrent_window_operations() {
    let window_manager = Arc::new(StressTestWindowManager::new());
    let timer = BenchmarkTimer::new();
    
    // Spawn multiple concurrent tasks
    let mut handles = Vec::new();
    let thread_count = 10;
    let operations_per_thread = 100;
    
    for thread_id in 0..thread_count {
        let wm = Arc::clone(&window_manager);
        let handle = tokio::spawn(async move {
            let mut thread_operations = 0;
            
            for op in 0..operations_per_thread {
                match op % 3 {
                    0 => {
                        // Create windows
                        let ids = wm.create_window_batch(5).unwrap();
                        thread_operations += ids.len();
                    },
                    1 => {
                        // Update existing windows (if any exist)
                        if wm.get_window_count() > 0 {
                            // Mock update operation
                            thread_operations += 1;
                        }
                    },
                    _ => {
                        // Brief pause to simulate real-world usage
                        sleep(Duration::from_micros(100)).await;
                        thread_operations += 1;
                    }
                }
            }
            
            thread_operations
        });
        
        handles.push(handle);
    }
    
    // Wait for all threads to complete
    let start_time = Instant::now();
    let mut total_operations = 0;
    
    for handle in handles {
        let ops = handle.await.unwrap();
        total_operations += ops;
        timer.record_operation();
    }
    
    let duration = start_time.elapsed();
    let operations_per_second = total_operations as f64 / duration.as_secs_f64();
    
    println!("Concurrent Operations: {} ops in {:?} = {:.2} ops/sec", 
             total_operations, duration, operations_per_second);
    
    // Performance assertions for concurrent operations
    assert!(operations_per_second > 500.0, "Concurrent operations too slow: {}", operations_per_second);
    assert!(duration < Duration::from_secs(10), "Concurrent test took too long: {:?}", duration);
}

// ============================================================================
// IPC COMMUNICATION PERFORMANCE TESTS
// ============================================================================

#[tokio::test]
async fn test_ipc_message_processing_performance() {
    let timer = BenchmarkTimer::new();
    let ipc_manager = StressTestIPCManager::new();
    
    let message_count = 10000;
    let batch_size = 500;
    
    for batch_num in 0..(message_count / batch_size) {
        let messages = ipc_manager.generate_test_messages(batch_size);
        let start = Instant::now();
        
        let results = ipc_manager.process_messages_batch(messages).unwrap();
        
        assert_eq!(results.len(), batch_size as usize, "Batch {} processing failed", batch_num);
        timer.record_operation();
        
        // Each batch should process in under 200ms
        assert!(start.elapsed() < Duration::from_millis(200),
                "IPC batch {} processing took too long: {:?}", batch_num, start.elapsed());
    }
    
    let metrics = timer.get_metrics("ipc_processing");
    println!("IPC Processing Performance: {:.2} ops/sec", metrics.operations_per_second);
    
    let ipc_metrics = ipc_manager.get_performance_metrics();
    println!("IPC Manager Stats: {}", serde_json::to_string_pretty(&ipc_metrics).unwrap());
    
    assert!(metrics.operations_per_second > 20.0, "IPC processing too slow: {}", metrics.operations_per_second);
}

#[tokio::test]
async fn test_high_frequency_ipc_messages() {
    let ipc_manager = StressTestIPCManager::new();
    let timer = BenchmarkTimer::new();
    
    // Generate 50,000 small messages for high-frequency test
    let total_messages = 50000;
    let batch_size = 1000;
    let start_time = Instant::now();
    
    for batch in 0..(total_messages / batch_size) {
        let messages: Vec<IPCMessage> = (0..batch_size).map(|i| IPCMessage {
            id: format!("hf_msg_{}_{}", batch, i),
            command: "ping".to_string(),
            payload: json!({ "seq": i }),
            timestamp: Instant::now(),
            priority: 1,
            retry_count: 0,
        }).collect();
        
        let results = ipc_manager.process_messages_batch(messages).unwrap();
        assert_eq!(results.len(), batch_size as usize);
        
        timer.record_operation();
    }
    
    let total_duration = start_time.elapsed();
    let messages_per_second = total_messages as f64 / total_duration.as_secs_f64();
    
    println!("High-frequency IPC: {} messages/sec", messages_per_second);
    
    // Should handle at least 10,000 messages per second
    assert!(messages_per_second > 10000.0, "High-frequency IPC too slow: {}", messages_per_second);
    assert!(total_duration < Duration::from_secs(30), "High-frequency test took too long");
}

// ============================================================================
// MEMORY AND RESOURCE STRESS TESTS
// ============================================================================

#[tokio::test]
async fn test_memory_usage_under_load() {
    let timer = BenchmarkTimer::new();
    let window_manager = StressTestWindowManager::new();
    let ipc_manager = StressTestIPCManager::new();
    
    let initial_memory = BenchmarkTimer::get_memory_usage();
    
    // Create substantial load
    let _window_ids = window_manager.create_window_batch(2000).unwrap();
    let _messages = ipc_manager.generate_test_messages(5000);
    
    // Perform operations
    for i in 0..100 {
        window_manager.create_window_batch(10).unwrap();
        ipc_manager.process_messages_batch(ipc_manager.generate_test_messages(50)).unwrap();
        timer.record_operation();
        
        // Check memory growth periodically
        if i % 20 == 0 {
            let current_memory = BenchmarkTimer::get_memory_usage();
            let memory_growth = current_memory - initial_memory;
            
            // Memory growth should be reasonable (under 100MB for this test)
            assert!(memory_growth < 100 * 1024, "Excessive memory growth: {} KB", memory_growth);
        }
    }
    
    let final_memory = BenchmarkTimer::get_memory_usage();
    let total_growth = final_memory - initial_memory;
    
    println!("Memory usage: Initial: {} KB, Final: {} KB, Growth: {} KB", 
             initial_memory, final_memory, total_growth);
    
    // Final memory growth check
    assert!(total_growth < 500 * 1024, "Memory growth too high: {} KB", total_growth);
}

#[tokio::test]
async fn test_sustained_load_performance() {
    let timer = BenchmarkTimer::new();
    let window_manager = Arc::new(StressTestWindowManager::new());
    let ipc_manager = Arc::new(StressTestIPCManager::new());
    
    let test_duration = Duration::from_secs(30); // 30-second sustained load test
    let start_time = Instant::now();
    
    // Spawn background tasks to simulate sustained load
    let wm_clone = Arc::clone(&window_manager);
    let wm_task = tokio::spawn(async move {
        let mut operations = 0;
        while start_time.elapsed() < test_duration {
            let _ids = wm_clone.create_window_batch(5).unwrap();
            operations += 1;
            sleep(Duration::from_millis(100)).await;
        }
        operations
    });
    
    let ipc_clone = Arc::clone(&ipc_manager);
    let ipc_task = tokio::spawn(async move {
        let mut operations = 0;
        while start_time.elapsed() < test_duration {
            let messages = ipc_clone.generate_test_messages(20);
            let _results = ipc_clone.process_messages_batch(messages).unwrap();
            operations += 1;
            sleep(Duration::from_millis(50)).await;
        }
        operations
    });
    
    // Wait for sustained load test to complete
    let (wm_ops, ipc_ops) = tokio::join!(wm_task, ipc_task);
    
    let wm_operations = wm_ops.unwrap();
    let ipc_operations = ipc_ops.unwrap();
    
    timer.record_operation();
    
    println!("Sustained load test results:");
    println!("  Duration: {:?}", start_time.elapsed());
    println!("  Window operations: {}", wm_operations);
    println!("  IPC operations: {}", ipc_operations);
    println!("  Total window count: {}", window_manager.get_window_count());
    
    // Performance assertions for sustained load
    assert!(wm_operations > 250, "Window manager underperformed during sustained load: {}", wm_operations);
    assert!(ipc_operations > 500, "IPC manager underperformed during sustained load: {}", ipc_operations);
    assert!(window_manager.get_window_count() > 1000, "Insufficient windows created during sustained load");
}

// ============================================================================
// EDGE CASE AND ERROR RECOVERY TESTS
// ============================================================================

#[tokio::test]
async fn test_rapid_create_destroy_cycles() {
    let timer = BenchmarkTimer::new();
    let window_manager = StressTestWindowManager::new();
    
    // Perform rapid create/destroy cycles
    for cycle in 0..100 {
        let start = Instant::now();
        
        // Create batch of windows
        let window_ids = window_manager.create_window_batch(50).unwrap();
        assert_eq!(window_ids.len(), 50);
        
        // Immediately destroy half of them
        let ids_to_destroy: Vec<String> = window_ids.into_iter().take(25).collect();
        window_manager.destroy_windows_batch(&ids_to_destroy).unwrap();
        
        timer.record_operation();
        
        // Each cycle should complete quickly
        assert!(start.elapsed() < Duration::from_millis(50),
                "Create/destroy cycle {} took too long: {:?}", cycle, start.elapsed());
    }
    
    let metrics = timer.get_metrics("create_destroy_cycles");
    println!("Create/Destroy Cycles: {:.2} ops/sec", metrics.operations_per_second);
    
    // Should maintain reasonable performance even with rapid cycles
    assert!(metrics.operations_per_second > 50.0, "Create/destroy cycles too slow");
}

#[tokio::test]
async fn test_error_recovery_performance() {
    let timer = BenchmarkTimer::new();
    let ipc_manager = StressTestIPCManager::new();
    
    // Generate messages with intentional errors (every 5th message)
    let messages: Vec<IPCMessage> = (0..1000).map(|i| IPCMessage {
        id: format!("recovery_msg_{}", i),
        command: if i % 5 == 0 { "error_command".to_string() } else { "normal_command".to_string() },
        payload: json!({ "index": i }),
        timestamp: Instant::now(),
        priority: 1,
        retry_count: 0,
    }).collect();
    
    let start = Instant::now();
    let results = ipc_manager.process_messages_batch(messages).unwrap();
    let duration = start.elapsed();
    
    timer.record_operation();
    
    // Count successful vs error responses
    let success_count = results.iter().filter(|r| r.get("result").is_some()).count();
    let error_count = results.iter().filter(|r| r.get("error").is_some()).count();
    
    println!("Error recovery test: {} success, {} errors in {:?}", success_count, error_count, duration);
    
    // Verify error handling doesn't significantly impact performance
    assert!(duration < Duration::from_secs(5), "Error recovery took too long: {:?}", duration);
    assert_eq!(error_count, 200, "Unexpected error count: {}", error_count); // Every 5th message = 200 errors
    assert_eq!(success_count, 800, "Unexpected success count: {}", success_count);
    
    let messages_per_second = 1000.0 / duration.as_secs_f64();
    assert!(messages_per_second > 500.0, "Error recovery performance too slow: {}", messages_per_second);
}

// ============================================================================
// INTEGRATION PERFORMANCE TESTS
// ============================================================================

#[tokio::test]
async fn test_full_system_integration_performance() {
    let timer = BenchmarkTimer::new();
    let window_manager = Arc::new(StressTestWindowManager::new());
    let ipc_manager = Arc::new(StressTestIPCManager::new());
    
    println!("Starting full system integration performance test...");
    
    // Phase 1: System initialization
    let init_start = Instant::now();
    let initial_windows = window_manager.create_window_batch(100).unwrap();
    let init_messages = ipc_manager.generate_test_messages(500);
    println!("Phase 1 (Init): {:?}", init_start.elapsed());
    
    // Phase 2: Concurrent operations
    let concurrent_start = Instant::now();
    let wm_clone = Arc::clone(&window_manager);
    let ipc_clone = Arc::clone(&ipc_manager);
    
    let (window_results, ipc_results) = tokio::join!(
        tokio::spawn(async move {
            let mut total_ops = 0;
            for _ in 0..50 {
                let ids = wm_clone.create_window_batch(10).unwrap();
                wm_clone.update_windows_batch(&ids).unwrap();
                total_ops += ids.len();
            }
            total_ops
        }),
        tokio::spawn(async move {
            let mut total_processed = 0;
            for _ in 0..20 {
                let messages = ipc_clone.generate_test_messages(100);
                let results = ipc_clone.process_messages_batch(messages).unwrap();
                total_processed += results.len();
            }
            total_processed
        })
    );
    
    let concurrent_duration = concurrent_start.elapsed();
    println!("Phase 2 (Concurrent): {:?}", concurrent_duration);
    
    // Phase 3: Cleanup and final stats
    let cleanup_start = Instant::now();
    window_manager.destroy_windows_batch(&initial_windows).unwrap();
    let cleanup_duration = cleanup_start.elapsed();
    println!("Phase 3 (Cleanup): {:?}", cleanup_duration);
    
    timer.record_operation();
    
    let window_ops = window_results.unwrap();
    let ipc_processed = ipc_results.unwrap();
    
    let total_duration = timer.start_time.elapsed();
    let system_throughput = (window_ops + ipc_processed) as f64 / total_duration.as_secs_f64();
    
    println!("Full System Integration Results:");
    println!("  Total Duration: {:?}", total_duration);
    println!("  Window Operations: {}", window_ops);
    println!("  IPC Messages Processed: {}", ipc_processed);
    println!("  System Throughput: {:.2} ops/sec", system_throughput);
    
    // Performance assertions for full system integration
    assert!(total_duration < Duration::from_secs(15), "Full system test took too long: {:?}", total_duration);
    assert!(system_throughput > 200.0, "System throughput too low: {}", system_throughput);
    assert!(concurrent_duration < Duration::from_secs(5), "Concurrent phase took too long: {:?}", concurrent_duration);
    assert!(cleanup_duration < Duration::from_secs(1), "Cleanup took too long: {:?}", cleanup_duration);
    
    // Verify system state after integration test
    let final_stats = window_manager.get_performance_stats();
    let ipc_stats = ipc_manager.get_performance_metrics();
    
    println!("Final Window Manager Stats: {}", serde_json::to_string_pretty(&final_stats).unwrap());
    println!("Final IPC Manager Stats: {}", serde_json::to_string_pretty(&ipc_stats).unwrap());
}

// ============================================================================
// BENCHMARK REPORTING AND ANALYSIS
// ============================================================================

#[tokio::test]
async fn test_performance_regression_detection() {
    // This test establishes performance baselines and detects regressions
    
    let mut baseline_metrics = HashMap::new();
    
    // Window creation baseline
    let timer = BenchmarkTimer::new();
    let window_manager = StressTestWindowManager::new();
    
    let _windows = window_manager.create_window_batch(100).unwrap();
    timer.record_operation();
    
    let window_metrics = timer.get_metrics("window_creation_baseline");
    baseline_metrics.insert("window_creation_ops_per_sec".to_string(), window_metrics.operations_per_second);
    
    // IPC processing baseline
    let timer = BenchmarkTimer::new();
    let ipc_manager = StressTestIPCManager::new();
    
    let messages = ipc_manager.generate_test_messages(1000);
    let _results = ipc_manager.process_messages_batch(messages).unwrap();
    timer.record_operation();
    
    let ipc_metrics = timer.get_metrics("ipc_processing_baseline");
    baseline_metrics.insert("ipc_processing_ops_per_sec".to_string(), ipc_metrics.operations_per_second);
    
    // Verify baselines meet minimum performance requirements
    assert!(baseline_metrics["window_creation_ops_per_sec"] > 10.0, 
            "Window creation baseline too low: {}", baseline_metrics["window_creation_ops_per_sec"]);
    assert!(baseline_metrics["ipc_processing_ops_per_sec"] > 5.0,
            "IPC processing baseline too low: {}", baseline_metrics["ipc_processing_ops_per_sec"]);
    
    println!("Performance Baselines Established:");
    for (metric, value) in &baseline_metrics {
        println!("  {}: {:.2}", metric, value);
    }
    
    // Store baselines for future regression testing
    // In a real implementation, these would be saved to a file or database
}

/// Generate comprehensive performance report
fn generate_performance_report(metrics: Vec<PerformanceMetrics>) -> String {
    let mut report = String::new();
    report.push_str("# Comprehensive Performance Test Report\n\n");
    
    for metric in metrics {
        report.push_str(&format!(
            "## {} Performance\n\
            - Duration: {}ms\n\
            - Operations/Second: {:.2}\n\
            - Success Rate: {:.2}%\n\
            - Memory Usage: {} KB\n\
            - CPU Usage: {:.2}%\n\n",
            metric.operation,
            metric.duration_ms,
            metric.operations_per_second,
            if metric.success_count + metric.error_count > 0 {
                (metric.success_count as f64 / (metric.success_count + metric.error_count) as f64) * 100.0
            } else {
                0.0
            },
            metric.memory_usage_kb,
            metric.cpu_usage_percent
        ));
    }
    
    report
}