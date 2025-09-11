// Advanced memory optimization for Rust applications
// Implements memory pooling, allocation tracking, and garbage collection hints

use serde::{Deserialize, Serialize};
use std::alloc::{GlobalAlloc, Layout, System};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryConfig {
    pub pool_enabled: bool,
    pub tracking_enabled: bool,
    pub pool_initial_size: usize,
    pub pool_max_size: usize,
    pub large_allocation_threshold: usize,
    pub gc_hint_threshold: usize,
}

impl Default for MemoryConfig {
    fn default() -> Self {
        Self {
            pool_enabled: true,
            tracking_enabled: true,
            pool_initial_size: 1024 * 1024,        // 1MB
            pool_max_size: 100 * 1024 * 1024,      // 100MB
            large_allocation_threshold: 64 * 1024, // 64KB
            gc_hint_threshold: 10 * 1024 * 1024,   // 10MB
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryStats {
    pub total_allocated: u64,
    pub total_deallocated: u64,
    pub current_usage: u64,
    pub peak_usage: u64,
    pub allocation_count: u64,
    pub deallocation_count: u64,
    pub large_allocations: u64,
    pub pool_hits: u64,
    pub pool_misses: u64,
    pub pool_utilization: f64,
}

impl Default for MemoryStats {
    fn default() -> Self {
        Self {
            total_allocated: 0,
            total_deallocated: 0,
            current_usage: 0,
            peak_usage: 0,
            allocation_count: 0,
            deallocation_count: 0,
            large_allocations: 0,
            pool_hits: 0,
            pool_misses: 0,
            pool_utilization: 0.0,
        }
    }
}

// Memory pool for common allocation sizes
pub struct MemoryPool {
    config: MemoryConfig,
    pools: HashMap<usize, Vec<Vec<u8>>>,
    stats: Arc<AtomicStats>,
}

#[derive(Debug)]
struct AtomicStats {
    total_allocated: AtomicU64,
    total_deallocated: AtomicU64,
    current_usage: AtomicU64,
    peak_usage: AtomicU64,
    allocation_count: AtomicU64,
    deallocation_count: AtomicU64,
    large_allocations: AtomicU64,
    pool_hits: AtomicU64,
    pool_misses: AtomicU64,
}

impl AtomicStats {
    fn new() -> Self {
        Self {
            total_allocated: AtomicU64::new(0),
            total_deallocated: AtomicU64::new(0),
            current_usage: AtomicU64::new(0),
            peak_usage: AtomicU64::new(0),
            allocation_count: AtomicU64::new(0),
            deallocation_count: AtomicU64::new(0),
            large_allocations: AtomicU64::new(0),
            pool_hits: AtomicU64::new(0),
            pool_misses: AtomicU64::new(0),
        }
    }

    fn to_memory_stats(&self) -> MemoryStats {
        let current = self.current_usage.load(Ordering::Relaxed);
        let total_allocated = self.total_allocated.load(Ordering::Relaxed);

        MemoryStats {
            total_allocated,
            total_deallocated: self.total_deallocated.load(Ordering::Relaxed),
            current_usage: current,
            peak_usage: self.peak_usage.load(Ordering::Relaxed),
            allocation_count: self.allocation_count.load(Ordering::Relaxed),
            deallocation_count: self.deallocation_count.load(Ordering::Relaxed),
            large_allocations: self.large_allocations.load(Ordering::Relaxed),
            pool_hits: self.pool_hits.load(Ordering::Relaxed),
            pool_misses: self.pool_misses.load(Ordering::Relaxed),
            pool_utilization: if total_allocated > 0 {
                (self.pool_hits.load(Ordering::Relaxed) as f64 / total_allocated as f64) * 100.0
            } else {
                0.0
            },
        }
    }
}

impl MemoryPool {
    pub fn new(config: MemoryConfig) -> Self {
        let mut pools = HashMap::new();

        // Pre-allocate pools for common sizes
        let common_sizes = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];
        for &size in &common_sizes {
            pools.insert(size, Vec::new());
        }

        info!(
            "Memory pool initialized with {} common sizes",
            common_sizes.len()
        );

        Self {
            config,
            pools,
            stats: Arc::new(AtomicStats::new()),
        }
    }

    pub fn allocate(&mut self, size: usize) -> Option<Vec<u8>> {
        if !self.config.pool_enabled {
            return None;
        }

        // Find the appropriate pool size (next power of 2 or exact match)
        let pool_size = self.find_pool_size(size);

        if let Some(pool) = self.pools.get_mut(&pool_size) {
            if let Some(buffer) = pool.pop() {
                self.stats.pool_hits.fetch_add(1, Ordering::Relaxed);
                self.stats.allocation_count.fetch_add(1, Ordering::Relaxed);
                self.stats
                    .total_allocated
                    .fetch_add(size as u64, Ordering::Relaxed);
                self.update_current_usage(size as i64);

                debug!(
                    "Pool hit for size {}, allocated from pool size {}",
                    size, pool_size
                );
                return Some(buffer);
            }
        }

        self.stats.pool_misses.fetch_add(1, Ordering::Relaxed);
        None
    }

    pub fn deallocate(&mut self, buffer: Vec<u8>) {
        if !self.config.pool_enabled {
            return;
        }

        let size = buffer.len();
        let pool_size = self.find_pool_size(size);

        if let Some(pool) = self.pools.get_mut(&pool_size) {
            // Only return to pool if we haven't exceeded the max size
            if pool.len() < self.config.pool_max_size / pool_size {
                pool.push(buffer);

                self.stats
                    .deallocation_count
                    .fetch_add(1, Ordering::Relaxed);
                self.stats
                    .total_deallocated
                    .fetch_add(size as u64, Ordering::Relaxed);
                self.update_current_usage(-(size as i64));

                debug!("Buffer returned to pool, size: {}", size);
                return;
            }
        }

        // Buffer dropped here if not returned to pool
        self.stats
            .deallocation_count
            .fetch_add(1, Ordering::Relaxed);
        self.stats
            .total_deallocated
            .fetch_add(size as u64, Ordering::Relaxed);
        self.update_current_usage(-(size as i64));
    }

    fn find_pool_size(&self, requested_size: usize) -> usize {
        // Find the smallest pool size that can accommodate the request
        let mut pool_size = 32;
        while pool_size < requested_size {
            pool_size *= 2;
        }

        // Cap at reasonable maximum
        pool_size.min(8192)
    }

    fn update_current_usage(&self, delta: i64) {
        let old_usage = self.stats.current_usage.load(Ordering::Relaxed);
        let new_usage = if delta > 0 {
            old_usage.saturating_add(delta as u64)
        } else {
            old_usage.saturating_sub((-delta) as u64)
        };

        self.stats.current_usage.store(new_usage, Ordering::Relaxed);

        // Update peak usage if necessary
        let current_peak = self.stats.peak_usage.load(Ordering::Relaxed);
        if new_usage > current_peak {
            self.stats.peak_usage.store(new_usage, Ordering::Relaxed);
        }
    }

    pub fn get_stats(&self) -> MemoryStats {
        self.stats.to_memory_stats()
    }

    pub fn cleanup(&mut self) {
        let initial_pools = self.pools.len();
        let mut freed_buffers = 0;

        for (size, pool) in self.pools.iter_mut() {
            let count = pool.len();
            pool.clear();
            freed_buffers += count;
            debug!("Cleaned {} buffers from size {} pool", count, size);
        }

        info!(
            "Memory pool cleanup: freed {} buffers from {} pools",
            freed_buffers, initial_pools
        );
    }

    pub async fn suggest_optimizations(&self) -> Vec<MemoryOptimization> {
        let stats = self.get_stats();
        let mut optimizations = Vec::new();

        // Analyze pool efficiency
        if stats.pool_utilization < 50.0 && stats.pool_misses > stats.pool_hits {
            optimizations.push(MemoryOptimization {
                category: "Pool Configuration".to_string(),
                description: "Low pool utilization detected. Consider adjusting pool sizes or disabling pooling for better performance.".to_string(),
                priority: "Medium".to_string(),
                estimated_savings: "5-15% memory reduction".to_string(),
            });
        }

        // High memory usage
        if stats.current_usage > self.config.pool_max_size as u64 {
            optimizations.push(MemoryOptimization {
                category: "Memory Usage".to_string(),
                description: "High memory usage detected. Consider implementing more aggressive garbage collection or reducing allocation frequency.".to_string(),
                priority: "High".to_string(),
                estimated_savings: "20-30% memory reduction".to_string(),
            });
        }

        // Large allocation frequency
        if stats.large_allocations > stats.allocation_count / 4 {
            optimizations.push(MemoryOptimization {
                category: "Allocation Pattern".to_string(),
                description:
                    "High frequency of large allocations. Consider streaming or chunked processing."
                        .to_string(),
                priority: "Medium".to_string(),
                estimated_savings: "10-25% allocation reduction".to_string(),
            });
        }

        optimizations
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryOptimization {
    pub category: String,
    pub description: String,
    pub priority: String,
    pub estimated_savings: String,
}

// Custom allocator that tracks allocations
pub struct TrackingAllocator {
    stats: Arc<AtomicStats>,
    inner: System,
}

impl TrackingAllocator {
    pub fn new() -> Self {
        Self {
            stats: Arc::new(AtomicStats::new()),
            inner: System,
        }
    }

    pub fn get_stats(&self) -> MemoryStats {
        self.stats.to_memory_stats()
    }
}

unsafe impl GlobalAlloc for TrackingAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let ptr = self.inner.alloc(layout);

        if !ptr.is_null() {
            let size = layout.size() as u64;
            self.stats
                .total_allocated
                .fetch_add(size, Ordering::Relaxed);
            self.stats.allocation_count.fetch_add(1, Ordering::Relaxed);

            let old_usage = self.stats.current_usage.load(Ordering::Relaxed);
            let new_usage = old_usage.saturating_add(size);
            self.stats.current_usage.store(new_usage, Ordering::Relaxed);

            // Update peak usage
            let current_peak = self.stats.peak_usage.load(Ordering::Relaxed);
            if new_usage > current_peak {
                self.stats.peak_usage.store(new_usage, Ordering::Relaxed);
            }

            // Track large allocations
            if layout.size() > 64 * 1024 {
                self.stats.large_allocations.fetch_add(1, Ordering::Relaxed);
            }
        }

        ptr
    }

    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        let size = layout.size() as u64;
        self.stats
            .total_deallocated
            .fetch_add(size, Ordering::Relaxed);
        self.stats
            .deallocation_count
            .fetch_add(1, Ordering::Relaxed);

        let old_usage = self.stats.current_usage.load(Ordering::Relaxed);
        let new_usage = old_usage.saturating_sub(size);
        self.stats.current_usage.store(new_usage, Ordering::Relaxed);

        self.inner.dealloc(ptr, layout);
    }
}

// Memory optimization utilities
pub struct MemoryOptimizer {
    pool: Arc<RwLock<MemoryPool>>,
    config: MemoryConfig,
}

impl MemoryOptimizer {
    pub fn new(config: MemoryConfig) -> Self {
        let pool = Arc::new(RwLock::new(MemoryPool::new(config.clone())));

        Self { pool, config }
    }

    pub async fn allocate_optimized(&self, size: usize) -> Vec<u8> {
        // Try pool allocation first
        if self.config.pool_enabled {
            let mut pool = self.pool.write().await;
            if let Some(buffer) = pool.allocate(size) {
                return buffer;
            }
        }

        // Fall back to standard allocation
        vec![0; size]
    }

    pub async fn deallocate_optimized(&self, buffer: Vec<u8>) {
        if self.config.pool_enabled {
            let mut pool = self.pool.write().await;
            pool.deallocate(buffer);
        }
        // Buffer dropped automatically if not pooled
    }

    pub async fn get_memory_stats(&self) -> MemoryStats {
        let pool = self.pool.read().await;
        pool.get_stats()
    }

    pub async fn cleanup_memory(&self) {
        if self.config.pool_enabled {
            let mut pool = self.pool.write().await;
            pool.cleanup();
        }

        // Suggest garbage collection
        self.suggest_gc().await;
    }

    async fn suggest_gc(&self) {
        let stats = self.get_memory_stats().await;
        if stats.current_usage > self.config.gc_hint_threshold as u64 {
            info!(
                "Suggesting garbage collection - current usage: {} bytes",
                stats.current_usage
            );
            // In a real implementation, this might trigger more aggressive GC
        }
    }

    pub async fn optimize_allocations(&self) -> Vec<MemoryOptimization> {
        let pool = self.pool.read().await;
        pool.suggest_optimizations().await
    }
}

// Global memory optimizer instance
lazy_static::lazy_static! {
    static ref MEMORY_OPTIMIZER: tokio::sync::RwLock<Option<MemoryOptimizer>> = tokio::sync::RwLock::new(None);
}

pub async fn initialize_memory_optimizer(config: MemoryConfig) -> anyhow::Result<()> {
    let optimizer = MemoryOptimizer::new(config);
    let mut global_optimizer = MEMORY_OPTIMIZER.write().await;
    *global_optimizer = Some(optimizer);
    info!("Global memory optimizer initialized");
    Ok(())
}

pub async fn allocate_optimized(size: usize) -> Vec<u8> {
    let optimizer = MEMORY_OPTIMIZER.read().await;
    if let Some(optimizer) = optimizer.as_ref() {
        optimizer.allocate_optimized(size).await
    } else {
        vec![0; size]
    }
}

pub async fn deallocate_optimized(buffer: Vec<u8>) {
    let optimizer = MEMORY_OPTIMIZER.read().await;
    if let Some(optimizer) = optimizer.as_ref() {
        optimizer.deallocate_optimized(buffer).await;
    }
}

pub async fn get_global_memory_stats() -> Option<MemoryStats> {
    let optimizer = MEMORY_OPTIMIZER.read().await;
    if let Some(optimizer) = optimizer.as_ref() {
        Some(optimizer.get_memory_stats().await)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::test;

    #[test]
    async fn test_memory_pool() {
        let config = MemoryConfig::default();
        let mut pool = MemoryPool::new(config);

        // Test allocation and deallocation
        let buffer1 = vec![0u8; 1024];
        pool.deallocate(buffer1);

        let buffer2 = pool.allocate(1024);
        assert!(buffer2.is_some());

        let stats = pool.get_stats();
        assert!(stats.pool_hits > 0);
    }

    #[test]
    async fn test_memory_optimizer() {
        let config = MemoryConfig::default();
        let optimizer = MemoryOptimizer::new(config);

        let buffer = optimizer.allocate_optimized(1024).await;
        assert_eq!(buffer.len(), 1024);

        optimizer.deallocate_optimized(buffer).await;

        let stats = optimizer.get_memory_stats().await;
        assert!(stats.allocation_count > 0 || stats.pool_hits > 0);
    }
}
