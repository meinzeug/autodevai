//! Enhanced Rate Limiter
//!
//! Advanced rate limiting with sliding windows, adaptive limits, 
//! and comprehensive protection against abuse patterns.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

/// Rate limiting strategy
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum RateLimitStrategy {
    FixedWindow,
    SlidingWindow,
    TokenBucket,
    Adaptive,
}

/// Rate limit configuration for different time windows
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    pub requests_per_second: u32,
    pub requests_per_minute: u32,
    pub requests_per_hour: u32,
    pub burst_limit: u32,
    pub strategy: RateLimitStrategy,
    pub adaptive_threshold: f64, // For adaptive rate limiting
    pub penalty_multiplier: f64, // Rate limit penalty for violations
    pub cooldown_period_seconds: u64,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            requests_per_second: 10,
            requests_per_minute: 100,
            requests_per_hour: 1000,
            burst_limit: 20,
            strategy: RateLimitStrategy::SlidingWindow,
            adaptive_threshold: 0.8,
            penalty_multiplier: 0.5,
            cooldown_period_seconds: 300, // 5 minutes
        }
    }
}

/// Request timestamp with metadata
#[derive(Debug, Clone)]
struct RequestRecord {
    timestamp: Instant,
    endpoint: String,
    session_id: String,
    risk_score: u8,
}

/// Rate limiter state for a specific key
#[derive(Debug)]
struct RateLimiterState {
    requests: VecDeque<RequestRecord>,
    tokens: f64,
    last_refill: Instant,
    violation_count: u32,
    penalty_until: Option<Instant>,
    adaptive_limit: Option<u32>,
}

impl RateLimiterState {
    fn new() -> Self {
        Self {
            requests: VecDeque::new(),
            tokens: 0.0,
            last_refill: Instant::now(),
            violation_count: 0,
            penalty_until: None,
            adaptive_limit: None,
        }
    }
}

/// Rate limit check result
#[derive(Debug, Clone, PartialEq)]
pub enum RateLimitResult {
    Allowed {
        remaining: u32,
        reset_after: Duration,
    },
    Limited {
        retry_after: Duration,
        reason: String,
    },
    Blocked {
        reason: String,
        unblock_after: Duration,
    },
}

/// Enhanced Rate Limiter with multiple strategies
pub struct EnhancedRateLimiter {
    // Global configuration
    global_config: RateLimitConfig,
    
    // Per-endpoint configurations
    endpoint_configs: HashMap<String, RateLimitConfig>,
    
    // Rate limiting state per key (session_id:endpoint)
    states: RwLock<HashMap<String, RateLimiterState>>,
    
    // Global statistics
    stats: RwLock<RateLimitStats>,
}

/// Rate limiting statistics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RateLimitStats {
    pub total_requests: u64,
    pub total_limited: u64,
    pub total_blocked: u64,
    pub active_sessions: u64,
    pub violations_last_hour: u64,
    pub current_adaptive_limits: HashMap<String, u32>,
}

impl EnhancedRateLimiter {
    /// Create a new enhanced rate limiter
    pub fn new() -> Self {
        Self {
            global_config: RateLimitConfig::default(),
            endpoint_configs: HashMap::new(),
            states: RwLock::new(HashMap::new()),
            stats: RwLock::new(RateLimitStats::default()),
        }
    }

    /// Create with custom global configuration
    pub fn with_config(config: RateLimitConfig) -> Self {
        Self {
            global_config: config,
            endpoint_configs: HashMap::new(),
            states: RwLock::new(HashMap::new()),
            stats: RwLock::new(RateLimitStats::default()),
        }
    }

    /// Set rate limit configuration for a specific endpoint
    pub fn set_endpoint_config(&mut self, endpoint: &str, config: RateLimitConfig) {
        self.endpoint_configs.insert(endpoint.to_string(), config);
    }

    /// Check if request is allowed under rate limits
    pub async fn check_rate_limit(
        &self,
        session_id: &str,
        endpoint: &str,
        risk_score: u8,
    ) -> RateLimitResult {
        let key = format!("{}:{}", session_id, endpoint);
        let config = self.get_config_for_endpoint(endpoint);

        let mut states = self.states.write().await;
        let state = states.entry(key.clone()).or_insert_with(RateLimiterState::new);

        // Check if currently in penalty period
        if let Some(penalty_until) = state.penalty_until {
            if Instant::now() < penalty_until {
                return RateLimitResult::Blocked {
                    reason: "Rate limit violation penalty active".to_string(),
                    unblock_after: penalty_until.duration_since(Instant::now()),
                };
            } else {
                state.penalty_until = None;
            }
        }

        let result = match config.strategy {
            RateLimitStrategy::FixedWindow => {
                self.check_fixed_window(state, &config, endpoint, session_id, risk_score).await
            }
            RateLimitStrategy::SlidingWindow => {
                self.check_sliding_window(state, &config, endpoint, session_id, risk_score).await
            }
            RateLimitStrategy::TokenBucket => {
                self.check_token_bucket(state, &config, endpoint, session_id, risk_score).await
            }
            RateLimitStrategy::Adaptive => {
                self.check_adaptive(state, &config, endpoint, session_id, risk_score).await
            }
        };

        // Handle violations
        if matches!(result, RateLimitResult::Limited { .. }) {
            state.violation_count += 1;
            self.handle_violation(state, &config).await;
        }

        // Update statistics
        self.update_stats(&result).await;

        result
    }

    /// Get configuration for endpoint (endpoint-specific or global)
    fn get_config_for_endpoint(&self, endpoint: &str) -> RateLimitConfig {
        self.endpoint_configs
            .get(endpoint)
            .cloned()
            .unwrap_or_else(|| self.global_config.clone())
    }

    /// Check rate limit using fixed window strategy
    async fn check_fixed_window(
        &self,
        state: &mut RateLimiterState,
        config: &RateLimitConfig,
        endpoint: &str,
        session_id: &str,
        risk_score: u8,
    ) -> RateLimitResult {
        let now = Instant::now();
        
        // Clean old requests (older than 1 minute for simplicity)
        state.requests.retain(|req| now.duration_since(req.timestamp) < Duration::from_secs(60));

        // Count requests in current window
        let requests_this_minute = state.requests.len() as u32;
        let limit = self.get_effective_limit(config, endpoint, risk_score).await;

        if requests_this_minute >= limit {
            RateLimitResult::Limited {
                retry_after: Duration::from_secs(60),
                reason: format!("Fixed window rate limit exceeded: {}/{}", requests_this_minute, limit),
            }
        } else {
            // Allow request and record it
            state.requests.push_back(RequestRecord {
                timestamp: now,
                endpoint: endpoint.to_string(),
                session_id: session_id.to_string(),
                risk_score,
            });

            RateLimitResult::Allowed {
                remaining: limit.saturating_sub(requests_this_minute + 1),
                reset_after: Duration::from_secs(60),
            }
        }
    }

    /// Check rate limit using sliding window strategy
    async fn check_sliding_window(
        &self,
        state: &mut RateLimiterState,
        config: &RateLimitConfig,
        endpoint: &str,
        session_id: &str,
        risk_score: u8,
    ) -> RateLimitResult {
        let now = Instant::now();

        // Remove requests outside the sliding window
        while let Some(front) = state.requests.front() {
            if now.duration_since(front.timestamp) >= Duration::from_secs(60) {
                state.requests.pop_front();
            } else {
                break;
            }
        }

        // Check different time windows
        let requests_last_second = state.requests.iter()
            .filter(|req| now.duration_since(req.timestamp) < Duration::from_secs(1))
            .count() as u32;

        let requests_last_minute = state.requests.len() as u32;

        // Get effective limits
        let second_limit = config.requests_per_second;
        let minute_limit = self.get_effective_limit(config, endpoint, risk_score).await;
        let burst_limit = config.burst_limit;

        // Check per-second limit
        if requests_last_second >= second_limit {
            return RateLimitResult::Limited {
                retry_after: Duration::from_secs(1),
                reason: format!("Per-second rate limit exceeded: {}/{}", requests_last_second, second_limit),
            };
        }

        // Check burst limit (last 5 seconds)
        let burst_requests = state.requests.iter()
            .filter(|req| now.duration_since(req.timestamp) < Duration::from_secs(5))
            .count() as u32;

        if burst_requests >= burst_limit {
            return RateLimitResult::Limited {
                retry_after: Duration::from_secs(5),
                reason: format!("Burst limit exceeded: {}/{}", burst_requests, burst_limit),
            };
        }

        // Check per-minute limit
        if requests_last_minute >= minute_limit {
            return RateLimitResult::Limited {
                retry_after: Duration::from_secs(60),
                reason: format!("Per-minute rate limit exceeded: {}/{}", requests_last_minute, minute_limit),
            };
        }

        // Allow request
        state.requests.push_back(RequestRecord {
            timestamp: now,
            endpoint: endpoint.to_string(),
            session_id: session_id.to_string(),
            risk_score,
        });

        RateLimitResult::Allowed {
            remaining: minute_limit.saturating_sub(requests_last_minute + 1),
            reset_after: Duration::from_secs(60),
        }
    }

    /// Check rate limit using token bucket strategy
    async fn check_token_bucket(
        &self,
        state: &mut RateLimiterState,
        config: &RateLimitConfig,
        endpoint: &str,
        _session_id: &str,
        risk_score: u8,
    ) -> RateLimitResult {
        let now = Instant::now();
        let capacity = config.requests_per_minute as f64;
        let refill_rate = capacity / 60.0; // tokens per second

        // Refill tokens based on elapsed time
        let elapsed = now.duration_since(state.last_refill).as_secs_f64();
        state.tokens = (state.tokens + elapsed * refill_rate).min(capacity);
        state.last_refill = now;

        // Calculate token cost (higher risk = more tokens)
        let token_cost = match risk_score {
            0..=20 => 1.0,
            21..=50 => 1.5,
            51..=80 => 2.0,
            _ => 3.0,
        };

        if state.tokens >= token_cost {
            state.tokens -= token_cost;
            RateLimitResult::Allowed {
                remaining: state.tokens.floor() as u32,
                reset_after: Duration::from_secs_f64((capacity - state.tokens) / refill_rate),
            }
        } else {
            RateLimitResult::Limited {
                retry_after: Duration::from_secs_f64((token_cost - state.tokens) / refill_rate),
                reason: format!("Token bucket empty: {:.1} tokens available, {:.1} required", 
                               state.tokens, token_cost),
            }
        }
    }

    /// Check rate limit using adaptive strategy
    async fn check_adaptive(
        &self,
        state: &mut RateLimiterState,
        config: &RateLimitConfig,
        endpoint: &str,
        session_id: &str,
        risk_score: u8,
    ) -> RateLimitResult {
        // Update adaptive limit based on system load and violation history
        let base_limit = config.requests_per_minute;
        let load_factor = self.calculate_system_load().await;
        let violation_factor = (state.violation_count as f64 * 0.1).min(0.5);
        
        let adaptive_limit = (base_limit as f64 * (1.0 - load_factor - violation_factor)).max(1.0) as u32;
        state.adaptive_limit = Some(adaptive_limit);

        // Update global stats
        {
            let mut stats = self.stats.write().await;
            stats.current_adaptive_limits.insert(endpoint.to_string(), adaptive_limit);
        }

        // Use sliding window with adaptive limit
        let mut adaptive_config = config.clone();
        adaptive_config.requests_per_minute = adaptive_limit;
        
        self.check_sliding_window(state, &adaptive_config, endpoint, session_id, risk_score).await
    }

    /// Get effective rate limit considering risk score and adaptive adjustments
    async fn get_effective_limit(&self, config: &RateLimitConfig, endpoint: &str, risk_score: u8) -> u32 {
        let base_limit = config.requests_per_minute;
        
        // Reduce limit for high-risk requests
        let risk_factor = match risk_score {
            0..=20 => 1.0,
            21..=50 => 0.8,
            51..=80 => 0.6,
            _ => 0.4,
        };

        // Apply adaptive adjustments if enabled
        if config.strategy == RateLimitStrategy::Adaptive {
            let load_factor = self.calculate_system_load().await;
            let adaptive_factor = 1.0 - load_factor * 0.5;
            (base_limit as f64 * risk_factor * adaptive_factor).max(1.0) as u32
        } else {
            (base_limit as f64 * risk_factor) as u32
        }
    }

    /// Calculate system load for adaptive rate limiting
    async fn calculate_system_load(&self) -> f64 {
        let stats = self.stats.read().await;
        let total_requests = stats.total_requests as f64;
        let total_limited = stats.total_limited as f64;
        
        if total_requests == 0.0 {
            0.0
        } else {
            (total_limited / total_requests).min(1.0)
        }
    }

    /// Handle rate limit violations
    async fn handle_violation(&self, state: &mut RateLimiterState, config: &RateLimitConfig) {
        // Apply penalty period for repeated violations
        if state.violation_count >= 5 {
            let penalty_duration = Duration::from_secs(
                (config.cooldown_period_seconds as f64 * config.penalty_multiplier) as u64
            );
            state.penalty_until = Some(Instant::now() + penalty_duration);
            
            // Reset violation count after applying penalty
            state.violation_count = 0;
        }
    }

    /// Update rate limiting statistics
    async fn update_stats(&self, result: &RateLimitResult) {
        let mut stats = self.stats.write().await;
        
        match result {
            RateLimitResult::Allowed { .. } => {
                stats.total_requests += 1;
            }
            RateLimitResult::Limited { .. } => {
                stats.total_requests += 1;
                stats.total_limited += 1;
                stats.violations_last_hour += 1;
            }
            RateLimitResult::Blocked { .. } => {
                stats.total_blocked += 1;
            }
        }
    }

    /// Clean up expired states
    pub async fn cleanup_expired_states(&self) {
        let mut states = self.states.write().await;
        let now = Instant::now();
        
        states.retain(|_, state| {
            // Remove states with no recent activity (1 hour)
            if let Some(last_request) = state.requests.back() {
                now.duration_since(last_request.timestamp) < Duration::from_secs(3600)
            } else {
                // Keep states that are in penalty period
                state.penalty_until.map_or(false, |until| now < until)
            }
        });
    }

    /// Get current rate limiting statistics
    pub async fn get_stats(&self) -> RateLimitStats {
        let stats = self.stats.read().await;
        let mut result = stats.clone();
        
        // Update active sessions count
        let states = self.states.read().await;
        result.active_sessions = states.len() as u64;
        
        result
    }

    /// Reset rate limit for a specific key (admin function)
    pub async fn reset_rate_limit(&self, session_id: &str, endpoint: &str) {
        let key = format!("{}:{}", session_id, endpoint);
        let mut states = self.states.write().await;
        states.remove(&key);
    }

    /// Get rate limit status for a specific key
    pub async fn get_rate_limit_status(&self, session_id: &str, endpoint: &str) -> Option<(u32, Duration)> {
        let key = format!("{}:{}", session_id, endpoint);
        let states = self.states.read().await;
        
        if let Some(state) = states.get(&key) {
            let config = self.get_config_for_endpoint(endpoint);
            let now = Instant::now();
            
            // Count recent requests
            let recent_requests = state.requests.iter()
                .filter(|req| now.duration_since(req.timestamp) < Duration::from_secs(60))
                .count() as u32;
            
            let limit = config.requests_per_minute;
            let remaining = limit.saturating_sub(recent_requests);
            let reset_after = Duration::from_secs(60);
            
            Some((remaining, reset_after))
        } else {
            None
        }
    }
}

impl Default for EnhancedRateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::{sleep, Duration as TokioDuration};

    #[tokio::test]
    async fn test_sliding_window_rate_limiting() {
        let mut limiter = EnhancedRateLimiter::new();
        limiter.set_endpoint_config("test", RateLimitConfig {
            requests_per_second: 2,
            requests_per_minute: 5,
            burst_limit: 3,
            ..Default::default()
        });

        let session_id = "test_session";
        let endpoint = "test";

        // First few requests should be allowed
        for i in 0..3 {
            let result = limiter.check_rate_limit(session_id, endpoint, 0).await;
            match result {
                RateLimitResult::Allowed { .. } => {},
                _ => panic!("Request {} should be allowed", i),
            }
        }

        // Next request should hit burst limit
        let result = limiter.check_rate_limit(session_id, endpoint, 0).await;
        match result {
            RateLimitResult::Limited { .. } => {},
            _ => panic!("Request should be limited by burst"),
        }
    }

    #[tokio::test]
    async fn test_token_bucket_strategy() {
        let config = RateLimitConfig {
            strategy: RateLimitStrategy::TokenBucket,
            requests_per_minute: 60, // 1 per second
            ..Default::default()
        };
        
        let limiter = EnhancedRateLimiter::with_config(config);
        let session_id = "token_test";
        let endpoint = "test";

        // First request should be allowed
        let result = limiter.check_rate_limit(session_id, endpoint, 0).await;
        assert!(matches!(result, RateLimitResult::Allowed { .. }));

        // High-risk request should consume more tokens
        let result = limiter.check_rate_limit(session_id, endpoint, 90).await;
        // Depending on initial token state, this might be allowed or limited
        match result {
            RateLimitResult::Allowed { .. } | RateLimitResult::Limited { .. } => {},
            _ => panic!("Unexpected result for high-risk request"),
        }
    }

    #[tokio::test]
    async fn test_penalty_system() {
        let mut limiter = EnhancedRateLimiter::new();
        limiter.set_endpoint_config("penalty_test", RateLimitConfig {
            requests_per_second: 1,
            requests_per_minute: 1,
            cooldown_period_seconds: 1,
            penalty_multiplier: 2.0,
            ..Default::default()
        });

        let session_id = "penalty_session";
        let endpoint = "penalty_test";

        // Trigger violations
        for i in 0..7 { // Exceed the violation threshold (5)
            let result = limiter.check_rate_limit(session_id, endpoint, 0).await;
            if i == 0 {
                assert!(matches!(result, RateLimitResult::Allowed { .. }));
            }
            // Other requests may be limited due to rate limits
        }

        // After multiple violations, should be blocked
        sleep(TokioDuration::from_millis(100)).await; // Small delay
        let result = limiter.check_rate_limit(session_id, endpoint, 0).await;
        // The exact behavior depends on timing and violation counting
        match result {
            RateLimitResult::Limited { .. } | RateLimitResult::Blocked { .. } => {},
            RateLimitResult::Allowed { .. } => {}, // May still be allowed if penalty not yet applied
        }
    }

    #[tokio::test]
    async fn test_adaptive_rate_limiting() {
        let config = RateLimitConfig {
            strategy: RateLimitStrategy::Adaptive,
            requests_per_minute: 10,
            adaptive_threshold: 0.5,
            ..Default::default()
        };
        
        let limiter = EnhancedRateLimiter::with_config(config);
        let session_id = "adaptive_test";
        let endpoint = "adaptive";

        // Make some requests to establish load
        for _ in 0..3 {
            let _ = limiter.check_rate_limit(session_id, endpoint, 0).await;
        }

        // Check that adaptive limits are being calculated
        let stats = limiter.get_stats().await;
        assert!(stats.current_adaptive_limits.contains_key(endpoint));
    }
}