//! Event System
//! 
//! Provides a comprehensive event system for inter-component communication
//! with event routing, filtering, persistence, and real-time updates.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State, Window};
use tokio::sync::{broadcast, RwLock, Mutex};
use uuid::Uuid;

/// Event severity levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum EventSeverity {
    Debug,
    Info,
    Warning,
    Error,
    Critical,
}

/// Event categories for organization
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum EventCategory {
    System,
    User,
    Security,
    Project,
    Docker,
    Extension,
    Update,
    Settings,
    Performance,
    Network,
}

/// Event source information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventSource {
    pub component: String,
    pub module: Option<String>,
    pub function: Option<String>,
    pub line: Option<u32>,
}

/// Core event structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub timestamp: u64,
    pub severity: EventSeverity,
    pub category: EventCategory,
    pub source: EventSource,
    pub title: String,
    pub description: Option<String>,
    pub metadata: HashMap<String, serde_json::Value>,
    pub tags: HashSet<String>,
    pub session_id: Option<String>,
    pub user_id: Option<String>,
}

impl Event {
    /// Create a new event
    pub fn new(
        severity: EventSeverity,
        category: EventCategory,
        source: EventSource,
        title: String,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            severity,
            category,
            source,
            title,
            description: None,
            metadata: HashMap::new(),
            tags: HashSet::new(),
            session_id: None,
            user_id: None,
        }
    }

    /// Add description to the event
    pub fn with_description(mut self, description: String) -> Self {
        self.description = Some(description);
        self
    }

    /// Add metadata to the event
    pub fn with_metadata(mut self, key: String, value: serde_json::Value) -> Self {
        self.metadata.insert(key, value);
        self
    }

    /// Add tag to the event
    pub fn with_tag(mut self, tag: String) -> Self {
        self.tags.insert(tag);
        self
    }

    /// Add session context
    pub fn with_session(mut self, session_id: String, user_id: Option<String>) -> Self {
        self.session_id = Some(session_id);
        self.user_id = user_id;
        self
    }
}

/// Event filter for querying events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventFilter {
    pub severities: Option<HashSet<EventSeverity>>,
    pub categories: Option<HashSet<EventCategory>>,
    pub components: Option<HashSet<String>>,
    pub tags: Option<HashSet<String>>,
    pub since: Option<u64>,
    pub until: Option<u64>,
    pub session_id: Option<String>,
    pub user_id: Option<String>,
    pub limit: Option<usize>,
}

impl Default for EventFilter {
    fn default() -> Self {
        Self {
            severities: None,
            categories: None,
            components: None,
            tags: None,
            since: None,
            until: None,
            session_id: None,
            user_id: None,
            limit: Some(100),
        }
    }
}

/// Event subscription configuration
#[derive(Debug, Clone)]
pub struct EventSubscription {
    pub id: String,
    pub filter: EventFilter,
    pub window_label: Option<String>,
    pub realtime: bool,
    pub created_at: SystemTime,
}

/// Event statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventStats {
    pub total_events: usize,
    pub events_by_severity: HashMap<EventSeverity, usize>,
    pub events_by_category: HashMap<EventCategory, usize>,
    pub recent_events: usize, // Last hour
    pub error_rate: f64,      // Errors per minute
}

/// Event system manager
pub struct EventSystem {
    events: Arc<RwLock<VecDeque<Event>>>,
    subscriptions: Arc<RwLock<HashMap<String, EventSubscription>>>,
    broadcast_sender: broadcast::Sender<Event>,
    app_handle: AppHandle,
    config: Arc<RwLock<EventSystemConfig>>,
    stats: Arc<Mutex<EventStats>>,
}

/// Event system configuration
#[derive(Debug, Clone)]
pub struct EventSystemConfig {
    pub max_events: usize,
    pub persist_events: bool,
    pub auto_cleanup_hours: u64,
    pub realtime_enabled: bool,
    pub log_to_file: bool,
    pub broadcast_capacity: usize,
}

impl Default for EventSystemConfig {
    fn default() -> Self {
        Self {
            max_events: 10000,
            persist_events: true,
            auto_cleanup_hours: 168, // 7 days
            realtime_enabled: true,
            log_to_file: true,
            broadcast_capacity: 1000,
        }
    }
}

impl EventSystem {
    /// Create a new event system
    pub fn new(app_handle: AppHandle) -> Self {
        let config = EventSystemConfig::default();
        let (broadcast_sender, _) = broadcast::channel(config.broadcast_capacity);

        Self {
            events: Arc::new(RwLock::new(VecDeque::with_capacity(config.max_events))),
            subscriptions: Arc::new(RwLock::new(HashMap::new())),
            broadcast_sender,
            app_handle,
            config: Arc::new(RwLock::new(config)),
            stats: Arc::new(Mutex::new(EventStats {
                total_events: 0,
                events_by_severity: HashMap::new(),
                events_by_category: HashMap::new(),
                recent_events: 0,
                error_rate: 0.0,
            })),
        }
    }

    /// Initialize the event system
    pub async fn initialize(&self) -> Result<(), Box<dyn std::error::Error>> {
        // Start cleanup task
        self.start_cleanup_task().await;

        // Start statistics update task
        self.start_stats_task().await;

        // Setup real-time broadcasting
        self.setup_realtime_broadcasting().await;

        log::info!("Event system initialized");
        Ok(())
    }

    /// Emit a new event
    pub async fn emit(&self, event: Event) -> Result<(), Box<dyn std::error::Error>> {
        let config = self.config.read().await;
        
        // Add to event queue
        {
            let mut events = self.events.write().await;
            
            // Enforce max events limit
            if events.len() >= config.max_events {
                events.pop_front();
            }
            
            events.push_back(event.clone());
        }

        // Update statistics
        self.update_stats(&event).await;

        // Broadcast to real-time subscribers
        if config.realtime_enabled {
            let _ = self.broadcast_sender.send(event.clone());
        }

        // Log to file if enabled
        if config.log_to_file {
            self.log_event_to_file(&event).await;
        }

        // Emit to Tauri frontend
        if let Err(e) = self.app_handle.emit("event", &event) {
            log::error!("Failed to emit event to frontend: {}", e);
        }

        // Check subscriptions and notify subscribers
        self.notify_subscribers(&event).await;

        Ok(())
    }

    /// Get events matching a filter
    pub async fn get_events(&self, filter: EventFilter) -> Vec<Event> {
        let events = self.events.read().await;
        let mut matched_events = Vec::new();

        for event in events.iter().rev() { // Most recent first
            if self.matches_filter(event, &filter) {
                matched_events.push(event.clone());
                
                if let Some(limit) = filter.limit {
                    if matched_events.len() >= limit {
                        break;
                    }
                }
            }
        }

        matched_events
    }

    /// Subscribe to events
    pub async fn subscribe(
        &self,
        filter: EventFilter,
        window_label: Option<String>,
        realtime: bool,
    ) -> String {
        let subscription = EventSubscription {
            id: Uuid::new_v4().to_string(),
            filter,
            window_label,
            realtime,
            created_at: SystemTime::now(),
        };

        let subscription_id = subscription.id.clone();
        let mut subscriptions = self.subscriptions.write().await;
        subscriptions.insert(subscription_id.clone(), subscription);

        log::debug!("Created event subscription: {}", subscription_id);
        subscription_id
    }

    /// Unsubscribe from events
    pub async fn unsubscribe(&self, subscription_id: &str) -> bool {
        let mut subscriptions = self.subscriptions.write().await;
        let removed = subscriptions.remove(subscription_id).is_some();
        
        if removed {
            log::debug!("Removed event subscription: {}", subscription_id);
        }
        
        removed
    }

    /// Get event statistics
    pub async fn get_stats(&self) -> EventStats {
        self.stats.lock().await.clone()
    }

    /// Clear all events
    pub async fn clear_events(&self) -> usize {
        let mut events = self.events.write().await;
        let count = events.len();
        events.clear();
        
        // Reset statistics
        let mut stats = self.stats.lock().await;
        stats.total_events = 0;
        stats.events_by_severity.clear();
        stats.events_by_category.clear();
        stats.recent_events = 0;
        stats.error_rate = 0.0;
        
        log::info!("Cleared {} events", count);
        count
    }

    /// Check if an event matches a filter
    fn matches_filter(&self, event: &Event, filter: &EventFilter) -> bool {
        // Check severity
        if let Some(severities) = &filter.severities {
            if !severities.contains(&event.severity) {
                return false;
            }
        }

        // Check category
        if let Some(categories) = &filter.categories {
            if !categories.contains(&event.category) {
                return false;
            }
        }

        // Check component
        if let Some(components) = &filter.components {
            if !components.contains(&event.source.component) {
                return false;
            }
        }

        // Check tags
        if let Some(tags) = &filter.tags {
            if !tags.iter().any(|tag| event.tags.contains(tag)) {
                return false;
            }
        }

        // Check time range
        if let Some(since) = filter.since {
            if event.timestamp < since {
                return false;
            }
        }

        if let Some(until) = filter.until {
            if event.timestamp > until {
                return false;
            }
        }

        // Check session
        if let Some(session_id) = &filter.session_id {
            if event.session_id.as_ref() != Some(session_id) {
                return false;
            }
        }

        // Check user
        if let Some(user_id) = &filter.user_id {
            if event.user_id.as_ref() != Some(user_id) {
                return false;
            }
        }

        true
    }

    /// Update statistics
    async fn update_stats(&self, event: &Event) {
        let mut stats = self.stats.lock().await;
        stats.total_events += 1;

        // Update severity counts
        *stats.events_by_severity.entry(event.severity.clone()).or_insert(0) += 1;

        // Update category counts
        *stats.events_by_category.entry(event.category.clone()).or_insert(0) += 1;

        // Update recent events (last hour)
        let one_hour_ago = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64 - 3600000;

        if event.timestamp > one_hour_ago {
            stats.recent_events += 1;
        }

        // Update error rate (errors per minute in last hour)
        let error_count = stats.events_by_severity
            .get(&EventSeverity::Error)
            .unwrap_or(&0)
            + stats.events_by_severity
                .get(&EventSeverity::Critical)
                .unwrap_or(&0);
        
        stats.error_rate = error_count as f64 / 60.0; // Rough estimate
    }

    /// Notify subscribers about new events
    async fn notify_subscribers(&self, event: &Event) {
        let subscriptions = self.subscriptions.read().await;
        
        for subscription in subscriptions.values() {
            if self.matches_filter(event, &subscription.filter) {
                if let Some(window_label) = &subscription.window_label {
                    if let Some(window) = self.app_handle.get_webview_window(window_label) {
                        if let Err(e) = window.emit("subscribed-event", event) {
                            log::error!("Failed to emit event to window {}: {}", window_label, e);
                        }
                    }
                }
            }
        }
    }

    /// Log event to file
    async fn log_event_to_file(&self, event: &Event) {
        // In a real implementation, you would write to a log file
        // For now, just log to the system logger
        match event.severity {
            EventSeverity::Debug => log::debug!("[{}] {}", event.source.component, event.title),
            EventSeverity::Info => log::info!("[{}] {}", event.source.component, event.title),
            EventSeverity::Warning => log::warn!("[{}] {}", event.source.component, event.title),
            EventSeverity::Error => log::error!("[{}] {}", event.source.component, event.title),
            EventSeverity::Critical => log::error!("[CRITICAL] [{}] {}", event.source.component, event.title),
        }
    }

    /// Start cleanup task
    async fn start_cleanup_task(&self) {
        let events = self.events.clone();
        let config = self.config.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(3600)); // Every hour

            loop {
                interval.tick().await;

                let cleanup_threshold = {
                    let config = config.read().await;
                    SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis() as u64 - (config.auto_cleanup_hours * 3600 * 1000)
                };

                let mut events = events.write().await;
                let original_len = events.len();

                events.retain(|event| event.timestamp > cleanup_threshold);

                let cleaned = original_len - events.len();
                if cleaned > 0 {
                    log::info!("Cleaned up {} old events", cleaned);
                }
            }
        });
    }

    /// Start statistics update task
    async fn start_stats_task(&self) {
        let events = self.events.clone();
        let stats = self.stats.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(300)); // Every 5 minutes

            loop {
                interval.tick().await;

                let events = events.read().await;
                let mut stats = stats.lock().await;

                // Recalculate recent events
                let one_hour_ago = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64 - 3600000;

                stats.recent_events = events
                    .iter()
                    .filter(|event| event.timestamp > one_hour_ago)
                    .count();
            }
        });
    }

    /// Setup real-time broadcasting
    async fn setup_realtime_broadcasting(&self) {
        // Real-time broadcasting is handled by the broadcast channel
        // Subscribers can use the broadcast receiver to get real-time updates
        log::debug!("Real-time broadcasting setup completed");
    }
}

/// Initialize event system
pub async fn setup_event_system(app_handle: AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let event_system = EventSystem::new(app_handle.clone());
    event_system.initialize().await?;

    app_handle.manage(event_system);

    log::info!("Event system setup completed");
    Ok(())
}

// Legacy event types for compatibility
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressEvent {
    pub task_id: String,
    pub progress: f32, // 0.0 - 1.0
    pub message: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusEvent {
    pub component: String,
    pub status: String,
    pub details: Option<String>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorEvent {
    pub error_type: String,
    pub message: String,
    pub source: Option<String>,
    pub timestamp: u64,
}

// Legacy event emission functions for backward compatibility
pub fn emit_progress_event<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    task_id: String,
    progress: f32,
    message: String,
) {
    let event = ProgressEvent {
        task_id,
        progress,
        message,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };

    let _ = app.emit("progress", event);
}

pub fn emit_status_event<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    component: String,
    status: String,
    details: Option<String>,
) {
    let event = StatusEvent {
        component,
        status,
        details,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };

    let _ = app.emit("status", event);
}

pub fn emit_error_event<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    error_type: String,
    message: String,
    source: Option<String>,
) {
    let event = ErrorEvent {
        error_type,
        message,
        source,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };

    let _ = app.emit("error", event);
}

/// Tauri command to emit an event
#[tauri::command]
pub async fn emit_event(
    event_system: State<'_, EventSystem>,
    severity: EventSeverity,
    category: EventCategory,
    component: String,
    title: String,
    description: Option<String>,
    metadata: Option<HashMap<String, serde_json::Value>>,
    tags: Option<HashSet<String>>,
) -> Result<String, String> {
    let source = EventSource {
        component,
        module: None,
        function: None,
        line: None,
    };

    let mut event = Event::new(severity, category, source, title);

    if let Some(desc) = description {
        event = event.with_description(desc);
    }

    if let Some(meta) = metadata {
        for (key, value) in meta {
            event = event.with_metadata(key, value);
        }
    }

    if let Some(event_tags) = tags {
        for tag in event_tags {
            event = event.with_tag(tag);
        }
    }

    let event_id = event.id.clone();

    event_system
        .emit(event)
        .await
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    Ok(event_id)
}

/// Tauri command to get events
#[tauri::command]
pub async fn get_events(
    event_system: State<'_, EventSystem>,
    filter: Option<EventFilter>,
) -> Result<Vec<Event>, String> {
    let filter = filter.unwrap_or_default();
    Ok(event_system.get_events(filter).await)
}

/// Tauri command to subscribe to events
#[tauri::command]
pub async fn subscribe_to_events(
    window: Window,
    event_system: State<'_, EventSystem>,
    filter: EventFilter,
    realtime: Option<bool>,
) -> Result<String, String> {
    let subscription_id = event_system
        .subscribe(filter, Some(window.label().to_string()), realtime.unwrap_or(true))
        .await;
    
    Ok(subscription_id)
}

/// Tauri command to unsubscribe from events
#[tauri::command]
pub async fn unsubscribe_from_events(
    event_system: State<'_, EventSystem>,
    subscription_id: String,
) -> Result<bool, String> {
    Ok(event_system.unsubscribe(&subscription_id).await)
}

/// Tauri command to get event statistics
#[tauri::command]
pub async fn get_event_stats(
    event_system: State<'_, EventSystem>,
) -> Result<EventStats, String> {
    Ok(event_system.get_stats().await)
}

/// Tauri command to clear events
#[tauri::command]
pub async fn clear_events(
    event_system: State<'_, EventSystem>,
) -> Result<usize, String> {
    Ok(event_system.clear_events().await)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::test::mock_app;

    #[tokio::test]
    async fn test_event_creation() {
        let source = EventSource {
            component: "test".to_string(),
            module: Some("test_mod".to_string()),
            function: None,
            line: None,
        };

        let event = Event::new(
            EventSeverity::Info,
            EventCategory::System,
            source,
            "Test event".to_string(),
        )
        .with_description("Test description".to_string())
        .with_tag("test".to_string());

        assert_eq!(event.title, "Test event");
        assert_eq!(event.description, Some("Test description".to_string()));
        assert!(event.tags.contains("test"));
        assert_eq!(event.severity, EventSeverity::Info);
    }

    #[tokio::test]
    async fn test_event_system() {
        let app = mock_app();
        let event_system = EventSystem::new(app.handle());

        let source = EventSource {
            component: "test".to_string(),
            module: None,
            function: None,
            line: None,
        };

        let event = Event::new(
            EventSeverity::Info,
            EventCategory::System,
            source,
            "Test event".to_string(),
        );

        event_system.emit(event).await.unwrap();

        let events = event_system.get_events(EventFilter::default()).await;
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].title, "Test event");
    }

    #[test]
    fn test_event_filter_default() {
        let filter = EventFilter::default();
        assert!(filter.severities.is_none());
        assert!(filter.categories.is_none());
        assert_eq!(filter.limit, Some(100));
    }
}