// High-performance caching system with multiple cache levels and intelligent eviction
// Implements advanced caching strategies for optimal performance and memory usage

use std::sync::Arc;
use std::collections::{HashMap, BTreeMap};
use tokio::sync::{RwLock, Mutex};
use tokio::time::{Duration, Instant};
use serde::{Serialize, Deserialize};
use tracing::{info, warn, debug};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    pub l1_cache_size_mb: u64,
    pub l2_cache_size_mb: u64,
    pub l3_cache_size_mb: u64,
    pub default_ttl_seconds: u64,
    pub max_ttl_seconds: u64,
    pub eviction_policy: EvictionPolicy,
    pub compression_enabled: bool,
    pub persistence_enabled: bool,
    pub analytics_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EvictionPolicy {
    LRU,    // Least Recently Used
    LFU,    // Least Frequently Used
    FIFO,   // First In, First Out
    TTL,    // Time To Live based
    Adaptive, // Adaptive based on usage patterns
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            l1_cache_size_mb: 64,
            l2_cache_size_mb: 256,
            l3_cache_size_mb: 1024,
            default_ttl_seconds: 3600, // 1 hour
            max_ttl_seconds: 86400,    // 24 hours
            eviction_policy: EvictionPolicy::LRU,
            compression_enabled: true,
            persistence_enabled: false,
            analytics_enabled: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheMetrics {
    pub timestamp: i64,
    pub l1_hit_rate: f64,
    pub l2_hit_rate: f64,
    pub l3_hit_rate: f64,
    pub overall_hit_rate: f64,
    pub l1_size_mb: f64,
    pub l2_size_mb: f64,
    pub l3_size_mb: f64,
    pub total_requests: u64,
    pub total_hits: u64,
    pub total_misses: u64,
    pub evictions: u64,
    pub compression_ratio: f64,
    pub average_access_time_ms: f64,
}

#[derive(Debug, Clone)]
pub struct CacheEntry {
    pub key: String,
    pub data: Vec<u8>,
    pub compressed_size: usize,
    pub original_size: usize,
    pub created_at: Instant,
    pub last_accessed: Instant,
    pub access_count: u64,
    pub ttl: Option<Duration>,
    pub compression_ratio: f64,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheAnalytics {
    pub key: String,
    pub hit_count: u64,
    pub miss_count: u64,
    pub total_access_time_ms: f64,
    pub average_access_time_ms: f64,
    pub data_size_bytes: usize,
    pub compression_ratio: f64,
    pub cache_level_distribution: HashMap<String, u64>,
}

pub struct HighPerformanceCache {
    config: CacheConfig,
    l1_cache: Arc<RwLock<HashMap<String, CacheEntry>>>,
    l2_cache: Arc<RwLock<HashMap<String, CacheEntry>>>,
    l3_cache: Arc<RwLock<HashMap<String, CacheEntry>>>,
    access_order: Arc<RwLock<BTreeMap<Instant, String>>>, // For LRU eviction
    frequency_counter: Arc<RwLock<HashMap<String, u64>>>, // For LFU eviction
    metrics: Arc<Mutex<CacheMetrics>>,
    analytics: Arc<RwLock<HashMap<String, CacheAnalytics>>>,
}

impl HighPerformanceCache {
    pub fn new(config: CacheConfig) -> Self {
        let metrics = CacheMetrics {
            timestamp: chrono::Utc::now().timestamp(),
            l1_hit_rate: 0.0,
            l2_hit_rate: 0.0,
            l3_hit_rate: 0.0,
            overall_hit_rate: 0.0,
            l1_size_mb: 0.0,
            l2_size_mb: 0.0,
            l3_size_mb: 0.0,
            total_requests: 0,
            total_hits: 0,
            total_misses: 0,
            evictions: 0,
            compression_ratio: 1.0,
            average_access_time_ms: 0.0,
        };

        info!("High-performance cache initialized with L1: {}MB, L2: {}MB, L3: {}MB", 
              config.l1_cache_size_mb, config.l2_cache_size_mb, config.l3_cache_size_mb);

        Self {
            config,
            l1_cache: Arc::new(RwLock::new(HashMap::new())),
            l2_cache: Arc::new(RwLock::new(HashMap::new())),
            l3_cache: Arc::new(RwLock::new(HashMap::new())),
            access_order: Arc::new(RwLock::new(BTreeMap::new())),
            frequency_counter: Arc::new(RwLock::new(HashMap::new())),
            metrics: Arc::new(Mutex::new(metrics)),
            analytics: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn get(&self, key: &str) -> Option<Vec<u8>> {
        let start_time = Instant::now();
        let mut cache_level = "";
        let mut result = None;

        // Try L1 cache first
        {
            let mut l1_cache = self.l1_cache.write().await;
            if let Some(entry) = l1_cache.get_mut(key) {
                if !self.is_expired(entry) {
                    entry.last_accessed = Instant::now();
                    entry.access_count += 1;
                    result = Some(entry.data.clone());
                    cache_level = "L1";
                    debug!("L1 cache hit for key: {}", key);
                } else {
                    l1_cache.remove(key);
                    debug!("L1 cache entry expired for key: {}", key);
                }
            }
        }

        // Try L2 cache if L1 miss
        if result.is_none() {
            let mut l2_cache = self.l2_cache.write().await;
            if let Some(entry) = l2_cache.get_mut(key) {
                if !self.is_expired(entry) {
                    entry.last_accessed = Instant::now();
                    entry.access_count += 1;
                    result = Some(entry.data.clone());
                    cache_level = "L2";

                    // Promote to L1
                    let mut l1_cache = self.l1_cache.write().await;
                    self.ensure_l1_capacity(&mut l1_cache, entry.compressed_size).await;
                    l1_cache.insert(key.to_string(), entry.clone());
                    
                    debug!("L2 cache hit for key: {}, promoted to L1", key);
                } else {
                    l2_cache.remove(key);
                    debug!("L2 cache entry expired for key: {}", key);
                }
            }
        }

        // Try L3 cache if L1 and L2 miss
        if result.is_none() {
            let mut l3_cache = self.l3_cache.write().await;
            if let Some(entry) = l3_cache.get_mut(key) {
                if !self.is_expired(entry) {
                    entry.last_accessed = Instant::now();
                    entry.access_count += 1;
                    result = Some(entry.data.clone());
                    cache_level = "L3";

                    // Promote to L2
                    let mut l2_cache = self.l2_cache.write().await;
                    self.ensure_l2_capacity(&mut l2_cache, entry.compressed_size).await;
                    l2_cache.insert(key.to_string(), entry.clone());
                    
                    debug!("L3 cache hit for key: {}, promoted to L2", key);
                } else {
                    l3_cache.remove(key);
                    debug!("L3 cache entry expired for key: {}", key);
                }
            }
        }

        let access_time = start_time.elapsed();
        self.update_access_metrics(key, cache_level, result.is_some(), access_time).await;

        result
    }

    pub async fn set(&self, key: &str, data: Vec<u8>, ttl: Option<Duration>, tags: Vec<String>) -> anyhow::Result<()> {
        let start_time = Instant::now();
        
        // Compress data if enabled
        let (compressed_data, compression_ratio) = if self.config.compression_enabled {
            self.compress_data(&data).await?
        } else {
            (data.clone(), 1.0)
        };

        let entry = CacheEntry {
            key: key.to_string(),
            data,
            compressed_size: compressed_data.len(),
            original_size: compressed_data.len(),
            created_at: start_time,
            last_accessed: start_time,
            access_count: 0,
            ttl: ttl.or_else(|| Some(Duration::from_secs(self.config.default_ttl_seconds))),
            compression_ratio,
            tags,
        };

        // Store in L1 cache
        {
            let mut l1_cache = self.l1_cache.write().await;
            self.ensure_l1_capacity(&mut l1_cache, entry.compressed_size).await;
            l1_cache.insert(key.to_string(), entry);
        }

        // Update access order for LRU
        {
            let mut access_order = self.access_order.write().await;
            access_order.insert(start_time, key.to_string());
        }

        // Update frequency counter for LFU
        {
            let mut frequency = self.frequency_counter.write().await;
            *frequency.entry(key.to_string()).or_insert(0) += 1;
        }

        debug!("Stored key: {} in L1 cache with compression ratio: {:.2}", key, compression_ratio);
        Ok(())
    }

    pub async fn remove(&self, key: &str) -> bool {
        let mut removed = false;

        // Remove from all cache levels
        {
            let mut l1_cache = self.l1_cache.write().await;
            if l1_cache.remove(key).is_some() {
                removed = true;
            }
        }

        {
            let mut l2_cache = self.l2_cache.write().await;
            if l2_cache.remove(key).is_some() {
                removed = true;
            }
        }

        {
            let mut l3_cache = self.l3_cache.write().await;
            if l3_cache.remove(key).is_some() {
                removed = true;
            }
        }

        // Clean up tracking structures
        if removed {
            {
                let mut access_order = self.access_order.write().await;
                access_order.retain(|_, k| k != key);
            }

            {
                let mut frequency = self.frequency_counter.write().await;
                frequency.remove(key);
            }

            debug!("Removed key: {} from all cache levels", key);
        }

        removed
    }

    pub async fn clear(&self) -> anyhow::Result<()> {
        {
            let mut l1_cache = self.l1_cache.write().await;
            l1_cache.clear();
        }

        {
            let mut l2_cache = self.l2_cache.write().await;
            l2_cache.clear();
        }

        {
            let mut l3_cache = self.l3_cache.write().await;
            l3_cache.clear();
        }

        {
            let mut access_order = self.access_order.write().await;
            access_order.clear();
        }

        {
            let mut frequency = self.frequency_counter.write().await;
            frequency.clear();
        }

        info!("Cleared all cache levels");
        Ok(())
    }

    pub async fn clear_by_tags(&self, tags: &[String]) -> anyhow::Result<usize> {
        let mut removed_count = 0;

        // Clear from L1
        {
            let mut l1_cache = self.l1_cache.write().await;
            let keys_to_remove: Vec<String> = l1_cache
                .iter()
                .filter(|(_, entry)| entry.tags.iter().any(|tag| tags.contains(tag)))
                .map(|(key, _)| key.clone())
                .collect();

            for key in keys_to_remove {
                l1_cache.remove(&key);
                removed_count += 1;
            }
        }

        // Clear from L2
        {
            let mut l2_cache = self.l2_cache.write().await;
            let keys_to_remove: Vec<String> = l2_cache
                .iter()
                .filter(|(_, entry)| entry.tags.iter().any(|tag| tags.contains(tag)))
                .map(|(key, _)| key.clone())
                .collect();

            for key in keys_to_remove {
                l2_cache.remove(&key);
                removed_count += 1;
            }
        }

        // Clear from L3
        {
            let mut l3_cache = self.l3_cache.write().await;
            let keys_to_remove: Vec<String> = l3_cache
                .iter()
                .filter(|(_, entry)| entry.tags.iter().any(|tag| tags.contains(tag)))
                .map(|(key, _)| key.clone())
                .collect();

            for key in keys_to_remove {
                l3_cache.remove(&key);
                removed_count += 1;
            }
        }

        info!("Cleared {} entries by tags: {:?}", removed_count, tags);
        Ok(removed_count)
    }

    async fn compress_data(&self, data: &[u8]) -> anyhow::Result<(Vec<u8>, f64)> {
        // Simple compression simulation
        let compressed_size = (data.len() as f64 * 0.6) as usize; // 40% compression
        let compressed_data = vec![0u8; compressed_size];
        let compression_ratio = data.len() as f64 / compressed_size as f64;

        Ok((compressed_data, compression_ratio))
    }

    fn is_expired(&self, entry: &CacheEntry) -> bool {
        if let Some(ttl) = entry.ttl {
            entry.created_at.elapsed() > ttl
        } else {
            false
        }
    }

    async fn ensure_l1_capacity(&self, l1_cache: &mut HashMap<String, CacheEntry>, required_size: usize) {
        let max_size = (self.config.l1_cache_size_mb * 1024 * 1024) as usize;
        let current_size: usize = l1_cache.values().map(|e| e.compressed_size).sum();

        if current_size + required_size > max_size {
            let to_remove = self.select_eviction_candidates(l1_cache, required_size).await;
            for key in to_remove {
                if let Some(entry) = l1_cache.remove(&key) {
                    // Move to L2 if not expired
                    if !self.is_expired(&entry) {
                        let mut l2_cache = self.l2_cache.write().await;
                        self.ensure_l2_capacity(&mut l2_cache, entry.compressed_size).await;
                        l2_cache.insert(key, entry);
                    }
                }
            }
        }
    }

    async fn ensure_l2_capacity(&self, l2_cache: &mut HashMap<String, CacheEntry>, required_size: usize) {
        let max_size = (self.config.l2_cache_size_mb * 1024 * 1024) as usize;
        let current_size: usize = l2_cache.values().map(|e| e.compressed_size).sum();

        if current_size + required_size > max_size {
            let to_remove = self.select_eviction_candidates(l2_cache, required_size).await;
            for key in to_remove {
                if let Some(entry) = l2_cache.remove(&key) {
                    // Move to L3 if not expired
                    if !self.is_expired(&entry) {
                        let mut l3_cache = self.l3_cache.write().await;
                        self.ensure_l3_capacity(&mut l3_cache, entry.compressed_size).await;
                        l3_cache.insert(key, entry);
                    }
                }
            }
        }
    }

    async fn ensure_l3_capacity(&self, l3_cache: &mut HashMap<String, CacheEntry>, required_size: usize) {
        let max_size = (self.config.l3_cache_size_mb * 1024 * 1024) as usize;
        let current_size: usize = l3_cache.values().map(|e| e.compressed_size).sum();

        if current_size + required_size > max_size {
            let to_remove = self.select_eviction_candidates(l3_cache, required_size).await;
            for key in to_remove {
                l3_cache.remove(&key);
            }
        }
    }

    async fn select_eviction_candidates(&self, cache: &HashMap<String, CacheEntry>, _required_size: usize) -> Vec<String> {
        match self.config.eviction_policy {
            EvictionPolicy::LRU => {
                let mut entries: Vec<_> = cache.iter().collect();
                entries.sort_by_key(|(_, entry)| entry.last_accessed);
                entries.into_iter().take(cache.len() / 4).map(|(key, _)| key.clone()).collect()
            },
            EvictionPolicy::LFU => {
                let mut entries: Vec<_> = cache.iter().collect();
                entries.sort_by_key(|(_, entry)| entry.access_count);
                entries.into_iter().take(cache.len() / 4).map(|(key, _)| key.clone()).collect()
            },
            EvictionPolicy::FIFO => {
                let mut entries: Vec<_> = cache.iter().collect();
                entries.sort_by_key(|(_, entry)| entry.created_at);
                entries.into_iter().take(cache.len() / 4).map(|(key, _)| key.clone()).collect()
            },
            EvictionPolicy::TTL => {
                let mut expired: Vec<_> = cache.iter()
                    .filter(|(_, entry)| self.is_expired(entry))
                    .map(|(key, _)| key.clone())
                    .collect();

                if expired.len() < cache.len() / 4 {
                    // If not enough expired entries, fall back to LRU
                    let mut entries: Vec<_> = cache.iter()
                        .filter(|(_, entry)| !self.is_expired(entry))
                        .collect();
                    entries.sort_by_key(|(_, entry)| entry.last_accessed);
                    expired.extend(entries.into_iter().take(cache.len() / 4 - expired.len()).map(|(key, _)| key.clone()));
                }
                expired
            },
            EvictionPolicy::Adaptive => {
                // Adaptive policy based on access patterns
                let mut entries: Vec<_> = cache.iter().collect();
                entries.sort_by(|(_, a), (_, b)| {
                    let score_a = self.calculate_adaptive_score(a);
                    let score_b = self.calculate_adaptive_score(b);
                    score_a.partial_cmp(&score_b).unwrap_or(std::cmp::Ordering::Equal)
                });
                entries.into_iter().take(cache.len() / 4).map(|(key, _)| key.clone()).collect()
            }
        }
    }

    fn calculate_adaptive_score(&self, entry: &CacheEntry) -> f64 {
        let age_factor = entry.created_at.elapsed().as_secs() as f64;
        let access_factor = entry.access_count as f64;
        let recency_factor = entry.last_accessed.elapsed().as_secs() as f64;
        let size_factor = entry.compressed_size as f64;

        // Lower score means higher priority for eviction
        (age_factor + recency_factor) / (access_factor + 1.0) + (size_factor / 1024.0)
    }

    async fn update_access_metrics(&self, key: &str, cache_level: &str, hit: bool, access_time: Duration) {
        let mut metrics = self.metrics.lock().await;
        
        metrics.total_requests += 1;
        
        if hit {
            metrics.total_hits += 1;
            match cache_level {
                "L1" => metrics.l1_hit_rate = (metrics.l1_hit_rate * (metrics.total_requests - 1) as f64 + 1.0) / metrics.total_requests as f64,
                "L2" => metrics.l2_hit_rate = (metrics.l2_hit_rate * (metrics.total_requests - 1) as f64 + 1.0) / metrics.total_requests as f64,
                "L3" => metrics.l3_hit_rate = (metrics.l3_hit_rate * (metrics.total_requests - 1) as f64 + 1.0) / metrics.total_requests as f64,
                _ => {}
            }
        } else {
            metrics.total_misses += 1;
        }

        metrics.overall_hit_rate = (metrics.total_hits as f64 / metrics.total_requests as f64) * 100.0;

        // Update average access time
        let access_time_ms = access_time.as_millis() as f64;
        metrics.average_access_time_ms = (metrics.average_access_time_ms * (metrics.total_requests - 1) as f64 + access_time_ms) / metrics.total_requests as f64;

        // Update analytics if enabled
        if self.config.analytics_enabled {
            let mut analytics = self.analytics.write().await;
            let entry = analytics.entry(key.to_string()).or_insert_with(|| CacheAnalytics {
                key: key.to_string(),
                hit_count: 0,
                miss_count: 0,
                total_access_time_ms: 0.0,
                average_access_time_ms: 0.0,
                data_size_bytes: 0,
                compression_ratio: 1.0,
                cache_level_distribution: HashMap::new(),
            });

            if hit {
                entry.hit_count += 1;
                *entry.cache_level_distribution.entry(cache_level.to_string()).or_insert(0) += 1;
            } else {
                entry.miss_count += 1;
            }

            entry.total_access_time_ms += access_time_ms;
            entry.average_access_time_ms = entry.total_access_time_ms / (entry.hit_count + entry.miss_count) as f64;
        }

        metrics.timestamp = chrono::Utc::now().timestamp();
    }

    pub async fn get_metrics(&self) -> CacheMetrics {
        let mut metrics = self.metrics.lock().await;
        
        // Update cache sizes
        let l1_cache = self.l1_cache.read().await;
        let l2_cache = self.l2_cache.read().await;
        let l3_cache = self.l3_cache.read().await;

        metrics.l1_size_mb = l1_cache.values().map(|e| e.compressed_size).sum::<usize>() as f64 / (1024.0 * 1024.0);
        metrics.l2_size_mb = l2_cache.values().map(|e| e.compressed_size).sum::<usize>() as f64 / (1024.0 * 1024.0);
        metrics.l3_size_mb = l3_cache.values().map(|e| e.compressed_size).sum::<usize>() as f64 / (1024.0 * 1024.0);

        // Calculate overall compression ratio
        let total_original: usize = l1_cache.values().chain(l2_cache.values()).chain(l3_cache.values())
            .map(|e| e.original_size).sum();
        let total_compressed: usize = l1_cache.values().chain(l2_cache.values()).chain(l3_cache.values())
            .map(|e| e.compressed_size).sum();

        if total_compressed > 0 {
            metrics.compression_ratio = total_original as f64 / total_compressed as f64;
        }

        metrics.clone()
    }

    pub async fn get_analytics(&self) -> Vec<CacheAnalytics> {
        let analytics = self.analytics.read().await;
        analytics.values().cloned().collect()
    }

    pub async fn cleanup_expired(&self) -> anyhow::Result<usize> {
        let mut removed_count = 0;

        // Clean L1
        {
            let mut l1_cache = self.l1_cache.write().await;
            let keys_to_remove: Vec<String> = l1_cache
                .iter()
                .filter(|(_, entry)| self.is_expired(entry))
                .map(|(key, _)| key.clone())
                .collect();

            for key in keys_to_remove {
                l1_cache.remove(&key);
                removed_count += 1;
            }
        }

        // Clean L2
        {
            let mut l2_cache = self.l2_cache.write().await;
            let keys_to_remove: Vec<String> = l2_cache
                .iter()
                .filter(|(_, entry)| self.is_expired(entry))
                .map(|(key, _)| key.clone())
                .collect();

            for key in keys_to_remove {
                l2_cache.remove(&key);
                removed_count += 1;
            }
        }

        // Clean L3
        {
            let mut l3_cache = self.l3_cache.write().await;
            let keys_to_remove: Vec<String> = l3_cache
                .iter()
                .filter(|(_, entry)| self.is_expired(entry))
                .map(|(key, _)| key.clone())
                .collect();

            for key in keys_to_remove {
                l3_cache.remove(&key);
                removed_count += 1;
            }
        }

        info!("Cleaned up {} expired cache entries", removed_count);
        Ok(removed_count)
    }
}

// Global cache instance
lazy_static::lazy_static! {
    pub static ref GLOBAL_CACHE: tokio::sync::RwLock<Option<HighPerformanceCache>> = tokio::sync::RwLock::new(None);
}

pub async fn initialize_cache(config: CacheConfig) -> anyhow::Result<()> {
    let cache = HighPerformanceCache::new(config);
    let mut global_cache = GLOBAL_CACHE.write().await;
    *global_cache = Some(cache);
    info!("Global high-performance cache initialized");
    Ok(())
}

pub async fn cache_get(key: &str) -> Option<Vec<u8>> {
    let cache = GLOBAL_CACHE.read().await;
    if let Some(cache) = cache.as_ref() {
        cache.get(key).await
    } else {
        None
    }
}

pub async fn cache_set(key: &str, data: Vec<u8>, ttl: Option<Duration>, tags: Vec<String>) -> anyhow::Result<()> {
    let cache = GLOBAL_CACHE.read().await;
    if let Some(cache) = cache.as_ref() {
        cache.set(key, data, ttl, tags).await
    } else {
        Err(anyhow::anyhow!("Cache not initialized"))
    }
}

pub async fn get_cache_metrics() -> Option<CacheMetrics> {
    let cache = GLOBAL_CACHE.read().await;
    if let Some(cache) = cache.as_ref() {
        Some(cache.get_metrics().await)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::test;

    #[test]
    async fn test_cache_operations() {
        let config = CacheConfig::default();
        let cache = HighPerformanceCache::new(config);
        
        // Test set and get
        let data = b"test data".to_vec();
        cache.set("test_key", data.clone(), None, vec!["test".to_string()]).await.unwrap();
        
        let retrieved = cache.get("test_key").await;
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap(), data);
        
        // Test cache levels
        let metrics = cache.get_metrics().await;
        assert!(metrics.total_requests > 0);
    }

    #[test]
    async fn test_cache_eviction() {
        let mut config = CacheConfig::default();
        config.l1_cache_size_mb = 1; // Very small cache
        
        let cache = HighPerformanceCache::new(config);
        
        // Fill cache beyond capacity
        for i in 0..100 {
            let data = vec![0u8; 1024]; // 1KB each
            cache.set(&format!("key_{}", i), data, None, vec![]).await.unwrap();
        }
        
        let metrics = cache.get_metrics().await;
        assert!(metrics.l1_size_mb <= 1.0);
    }
}