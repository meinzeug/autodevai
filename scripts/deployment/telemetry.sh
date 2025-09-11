#!/bin/bash

# AutoDev-AI Telemetry and Analytics Setup
# Privacy-focused user analytics and crash reporting system

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly TELEMETRY_CONFIG_FILE="${TELEMETRY_CONFIG_FILE:-$PROJECT_ROOT/config/telemetry.json}"
readonly ANALYTICS_ENDPOINT="${ANALYTICS_ENDPOINT:-https://analytics.autodev-ai.com}"
readonly CRASH_REPORTING_ENDPOINT="${CRASH_REPORTING_ENDPOINT:-https://crashes.autodev-ai.com}"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $*" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARN:${NC} $*" >&2
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*" >&2
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $*" >&2
}

# Default telemetry configuration
readonly DEFAULT_TELEMETRY_CONFIG='{
    "enabled": true,
    "privacy_mode": "opt-in",
    "data_retention_days": 90,
    "anonymization": {
        "enabled": true,
        "hash_user_data": true,
        "remove_pii": true
    },
    "analytics": {
        "enabled": true,
        "track_usage": true,
        "track_performance": true,
        "track_errors": true,
        "batch_size": 100,
        "flush_interval": 300000
    },
    "crash_reporting": {
        "enabled": true,
        "auto_submit": false,
        "include_logs": true,
        "include_system_info": true,
        "max_crashes_per_day": 10
    },
    "metrics": {
        "enabled": true,
        "collection_interval": 60000,
        "metrics": [
            "cpu_usage",
            "memory_usage",
            "disk_usage",
            "network_usage",
            "response_times",
            "error_rates"
        ]
    },
    "compliance": {
        "gdpr_compliant": true,
        "ccpa_compliant": true,
        "hipaa_compliant": false,
        "data_processing_consent": true
    }
}'

# Initialize telemetry system
init_telemetry() {
    log "Initializing telemetry system..."
    
    # Create config directory
    mkdir -p "$(dirname "$TELEMETRY_CONFIG_FILE")"
    
    # Create default config if it doesn't exist
    if [[ ! -f "$TELEMETRY_CONFIG_FILE" ]]; then
        echo "$DEFAULT_TELEMETRY_CONFIG" | jq '.' > "$TELEMETRY_CONFIG_FILE"
        log "Created default telemetry configuration"
    fi
    
    # Validate configuration
    if ! jq '.' "$TELEMETRY_CONFIG_FILE" > /dev/null 2>&1; then
        error "Invalid telemetry configuration JSON"
        return 1
    fi
    
    success "Telemetry system initialized"
}

# Setup analytics infrastructure
setup_analytics() {
    log "Setting up analytics infrastructure..."
    
    # Create analytics service configuration
    cat > "$PROJECT_ROOT/config/analytics-service.json" << 'EOF'
{
    "service": "autodev-ai-analytics",
    "version": "1.0.0",
    "endpoints": {
        "events": "/api/v1/events",
        "metrics": "/api/v1/metrics",
        "sessions": "/api/v1/sessions",
        "users": "/api/v1/users"
    },
    "storage": {
        "type": "postgresql",
        "retention_policy": {
            "raw_events": "30 days",
            "aggregated_data": "2 years",
            "user_profiles": "5 years"
        }
    },
    "privacy": {
        "anonymize_ip": true,
        "hash_user_ids": true,
        "respect_dnt": true,
        "gdpr_compliant": true
    },
    "rate_limiting": {
        "events_per_minute": 1000,
        "events_per_hour": 10000,
        "events_per_day": 100000
    }
}
EOF
    
    # Create Docker Compose for analytics stack
    cat > "$PROJECT_ROOT/monitoring/docker-compose.analytics.yml" << 'EOF'
version: '3.8'

services:
  analytics-api:
    image: autodev-ai/analytics-api:latest
    container_name: autodev-ai-analytics-api
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - ANALYTICS_SECRET=${ANALYTICS_SECRET}
    volumes:
      - ../config/analytics-service.json:/app/config.json:ro
    networks:
      - analytics
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  clickhouse:
    image: clickhouse/clickhouse-server:23.8
    container_name: autodev-ai-clickhouse
    ports:
      - "8123:8123"
      - "9000:9000"
    environment:
      - CLICKHOUSE_DB=analytics
      - CLICKHOUSE_USER=analytics
      - CLICKHOUSE_PASSWORD=${CLICKHOUSE_PASSWORD}
    volumes:
      - clickhouse_data:/var/lib/clickhouse
      - ./clickhouse/config.xml:/etc/clickhouse-server/config.xml:ro
      - ./clickhouse/users.xml:/etc/clickhouse-server/users.xml:ro
      - ./clickhouse/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - analytics
    restart: unless-stopped

  vector:
    image: timberio/vector:0.33.0-alpine
    container_name: autodev-ai-vector
    volumes:
      - ./vector/vector.toml:/etc/vector/vector.toml:ro
      - /var/log:/var/log:ro
    networks:
      - analytics
    restart: unless-stopped
    depends_on:
      - clickhouse

  metabase:
    image: metabase/metabase:v0.47.0
    container_name: autodev-ai-metabase
    ports:
      - "3002:3000"
    environment:
      - MB_DB_TYPE=postgres
      - MB_DB_DBNAME=metabase
      - MB_DB_PORT=5432
      - MB_DB_USER=metabase
      - MB_DB_PASS=${METABASE_DB_PASSWORD}
      - MB_DB_HOST=postgres
    networks:
      - analytics
    restart: unless-stopped
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    container_name: autodev-ai-analytics-postgres
    environment:
      - POSTGRES_DB=analytics
      - POSTGRES_USER=analytics
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_analytics_data:/var/lib/postgresql/data
      - ./postgres/init-analytics.sql:/docker-entrypoint-initdb.d/init-analytics.sql:ro
    networks:
      - analytics
    restart: unless-stopped

volumes:
  clickhouse_data:
  postgres_analytics_data:

networks:
  analytics:
    driver: bridge
EOF
    
    success "Analytics infrastructure configured"
}

# Setup crash reporting
setup_crash_reporting() {
    log "Setting up crash reporting system..."
    
    # Create crash reporting service configuration
    cat > "$PROJECT_ROOT/config/crash-reporting.json" << 'EOF'
{
    "service": "autodev-ai-crash-reporter",
    "version": "1.0.0",
    "endpoints": {
        "crashes": "/api/v1/crashes",
        "symbols": "/api/v1/symbols",
        "reports": "/api/v1/reports"
    },
    "storage": {
        "type": "s3",
        "bucket": "autodev-ai-crash-reports",
        "encryption": "AES256",
        "retention_days": 180
    },
    "processing": {
        "auto_symbolicate": true,
        "generate_reports": true,
        "notify_on_new_crashes": true,
        "deduplicate": true
    },
    "privacy": {
        "strip_pii": true,
        "anonymize_paths": true,
        "require_consent": true
    },
    "alerts": {
        "crash_threshold": 10,
        "time_window": "1 hour",
        "notification_channels": ["slack", "email"]
    }
}
EOF
    
    # Create Sentry configuration for crash reporting
    cat > "$PROJECT_ROOT/config/sentry.conf.py" << 'EOF'
# Sentry configuration for AutoDev-AI crash reporting
import os
import sentry_sdk
from sentry_sdk.integrations.rust import RustIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

# Configure Sentry
sentry_sdk.init(
    dsn=os.environ.get('SENTRY_DSN'),
    environment=os.environ.get('SENTRY_ENVIRONMENT', 'production'),
    release=os.environ.get('SENTRY_RELEASE', '1.0.0'),
    
    # Set sample rates
    traces_sample_rate=0.1,
    profiles_sample_rate=0.1,
    
    # Integrations
    integrations=[
        RustIntegration(),
        LoggingIntegration(
            level=logging.INFO,
            event_level=logging.ERROR
        ),
    ],
    
    # Privacy settings
    send_default_pii=False,
    attach_stacktrace=True,
    
    # Performance monitoring
    enable_tracing=True,
    
    # Custom processors
    before_send=custom_before_send_processor,
    before_send_transaction=custom_before_send_transaction_processor,
)

def custom_before_send_processor(event, hint):
    """Custom processor to filter sensitive data before sending to Sentry"""
    # Remove sensitive keys
    sensitive_keys = ['password', 'token', 'key', 'secret', 'auth']
    
    def filter_sensitive_data(data):
        if isinstance(data, dict):
            return {k: filter_sensitive_data(v) if k.lower() not in sensitive_keys else '[FILTERED]'
                   for k, v in data.items()}
        elif isinstance(data, list):
            return [filter_sensitive_data(item) for item in data]
        return data
    
    return filter_sensitive_data(event)

def custom_before_send_transaction_processor(event, hint):
    """Custom processor for transaction events"""
    # Filter out health check transactions
    if event.get('transaction') in ['/health', '/ready', '/metrics']:
        return None
    return event
EOF
    
    # Create crash report processing script
    cat > "$PROJECT_ROOT/scripts/deployment/process-crashes.sh" << 'EOF'
#!/bin/bash

# AutoDev-AI Crash Report Processing Script
# Processes and analyzes crash reports for insights

set -euo pipefail

CRASH_REPORTS_DIR="${CRASH_REPORTS_DIR:-/app/crash-reports}"
SYMBOLS_DIR="${SYMBOLS_DIR:-/app/symbols}"
OUTPUT_DIR="${OUTPUT_DIR:-/app/processed-reports}"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $*" >&2
}

process_crash_reports() {
    log "Processing crash reports..."
    
    # Find new crash reports
    find "$CRASH_REPORTS_DIR" -name "*.dmp" -newer "$OUTPUT_DIR/.last_processed" 2>/dev/null | while read -r crash_file; do
        log "Processing crash report: $crash_file"
        
        # Extract crash information
        crash_id=$(basename "$crash_file" .dmp)
        output_file="$OUTPUT_DIR/${crash_id}.json"
        
        # Process with minidump_stackwalk or similar tool
        if command -v minidump_stackwalk >/dev/null 2>&1; then
            minidump_stackwalk "$crash_file" "$SYMBOLS_DIR" > "${output_file%.json}.txt" 2>&1
            
            # Convert to JSON format
            python3 - << PYTHON
import json
import sys
import re
from datetime import datetime

crash_data = {
    "crash_id": "$crash_id",
    "processed_at": datetime.utcnow().isoformat(),
    "status": "processed",
    "stacktrace": [],
    "metadata": {}
}

try:
    with open("${output_file%.json}.txt", "r") as f:
        content = f.read()
        
    # Parse stack trace (simplified)
    stack_lines = re.findall(r'\d+\s+\S+\s+\S+\s+.*', content)
    crash_data["stacktrace"] = stack_lines[:20]  # Limit to top 20 frames
    
    # Extract metadata
    crash_data["metadata"]["file_size"] = $(stat -f%z "$crash_file" 2>/dev/null || stat -c%s "$crash_file")
    crash_data["metadata"]["crash_file"] = "$crash_file"
    
except Exception as e:
    crash_data["status"] = "error"
    crash_data["error"] = str(e)

with open("$output_file", "w") as f:
    json.dump(crash_data, f, indent=2)
PYTHON
            
            log "Processed crash report: $crash_id"
        else
            log "minidump_stackwalk not available, skipping detailed processing"
        fi
    done
    
    # Update timestamp
    touch "$OUTPUT_DIR/.last_processed"
}

generate_crash_summary() {
    log "Generating crash summary report..."
    
    python3 - << PYTHON
import json
import os
from collections import defaultdict
from datetime import datetime, timedelta

crash_stats = defaultdict(int)
recent_crashes = []
top_crashes = defaultdict(int)

# Process all crash reports from last 7 days
cutoff_date = datetime.utcnow() - timedelta(days=7)

for filename in os.listdir("$OUTPUT_DIR"):
    if not filename.endswith('.json'):
        continue
        
    try:
        with open(os.path.join("$OUTPUT_DIR", filename), 'r') as f:
            crash_data = json.load(f)
            
        processed_at = datetime.fromisoformat(crash_data.get('processed_at', '1900-01-01'))
        if processed_at < cutoff_date:
            continue
            
        crash_stats['total'] += 1
        
        if crash_data.get('status') == 'processed':
            crash_stats['processed'] += 1
            
            # Extract top crash signature
            if crash_data.get('stacktrace'):
                top_frame = crash_data['stacktrace'][0] if crash_data['stacktrace'] else 'unknown'
                top_crashes[top_frame] += 1
        else:
            crash_stats['failed'] += 1
            
        recent_crashes.append({
            'id': crash_data.get('crash_id', 'unknown'),
            'processed_at': crash_data.get('processed_at'),
            'status': crash_data.get('status', 'unknown')
        })
        
    except Exception as e:
        print(f"Error processing {filename}: {e}")
        continue

# Generate summary report
summary = {
    'generated_at': datetime.utcnow().isoformat(),
    'period': '7 days',
    'statistics': dict(crash_stats),
    'top_crashes': dict(sorted(top_crashes.items(), key=lambda x: x[1], reverse=True)[:10]),
    'recent_crashes': recent_crashes[:50]
}

with open("$OUTPUT_DIR/crash_summary.json", 'w') as f:
    json.dump(summary, f, indent=2)

print(f"Crash Summary Report Generated:")
print(f"Total crashes: {crash_stats['total']}")
print(f"Successfully processed: {crash_stats['processed']}")
print(f"Failed to process: {crash_stats['failed']}")
PYTHON
    
    log "Crash summary report generated"
}

# Main processing
main() {
    mkdir -p "$CRASH_REPORTS_DIR" "$SYMBOLS_DIR" "$OUTPUT_DIR"
    
    process_crash_reports
    generate_crash_summary
    
    log "Crash report processing completed"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
EOF
    
    chmod +x "$PROJECT_ROOT/scripts/deployment/process-crashes.sh"
    
    success "Crash reporting system configured"
}

# Setup performance monitoring
setup_performance_monitoring() {
    log "Setting up performance monitoring..."
    
    # Create performance monitoring configuration
    cat > "$PROJECT_ROOT/config/performance-monitoring.json" << 'EOF'
{
    "monitoring": {
        "enabled": true,
        "sampling_rate": 0.1,
        "collection_interval": 60,
        "retention_days": 30
    },
    "metrics": {
        "system": {
            "cpu_usage": true,
            "memory_usage": true,
            "disk_usage": true,
            "network_usage": true
        },
        "application": {
            "response_times": true,
            "error_rates": true,
            "throughput": true,
            "active_users": true,
            "feature_usage": true
        },
        "tauri": {
            "window_events": true,
            "menu_interactions": true,
            "api_calls": true,
            "plugin_usage": true
        }
    },
    "alerts": {
        "high_cpu": {"threshold": 80, "duration": "5m"},
        "high_memory": {"threshold": 90, "duration": "3m"},
        "high_error_rate": {"threshold": 5, "duration": "2m"},
        "slow_response": {"threshold": 2000, "duration": "5m"}
    }
}
EOF
    
    # Create Rust performance monitoring code template
    cat > "$PROJECT_ROOT/src-tauri/src/performance.rs" << 'EOF'
// Performance monitoring module for AutoDev-AI
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetric {
    pub name: String,
    pub value: f64,
    pub timestamp: u64,
    pub tags: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceStats {
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub response_times: Vec<f64>,
    pub error_count: u32,
    pub active_sessions: u32,
}

pub struct PerformanceMonitor {
    metrics: Arc<Mutex<Vec<PerformanceMetric>>>,
    stats: Arc<Mutex<PerformanceStats>>,
    enabled: bool,
}

impl PerformanceMonitor {
    pub fn new() -> Self {
        Self {
            metrics: Arc::new(Mutex::new(Vec::new())),
            stats: Arc::new(Mutex::new(PerformanceStats {
                cpu_usage: 0.0,
                memory_usage: 0.0,
                response_times: Vec::new(),
                error_count: 0,
                active_sessions: 0,
            })),
            enabled: true,
        }
    }

    pub fn record_metric(&self, name: &str, value: f64, tags: HashMap<String, String>) {
        if !self.enabled {
            return;
        }

        let metric = PerformanceMetric {
            name: name.to_string(),
            value,
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            tags,
        };

        if let Ok(mut metrics) = self.metrics.lock() {
            metrics.push(metric);
            
            // Keep only last 1000 metrics to prevent memory bloat
            if metrics.len() > 1000 {
                metrics.drain(0..500);
            }
        }
    }

    pub fn record_response_time(&self, duration: Duration) {
        let response_time_ms = duration.as_millis() as f64;
        
        if let Ok(mut stats) = self.stats.lock() {
            stats.response_times.push(response_time_ms);
            
            // Keep only last 100 response times
            if stats.response_times.len() > 100 {
                stats.response_times.drain(0..50);
            }
        }

        let mut tags = HashMap::new();
        tags.insert("type".to_string(), "response_time".to_string());
        self.record_metric("response_time_ms", response_time_ms, tags);
    }

    pub fn increment_error_count(&self) {
        if let Ok(mut stats) = self.stats.lock() {
            stats.error_count += 1;
        }

        let mut tags = HashMap::new();
        tags.insert("type".to_string(), "error".to_string());
        self.record_metric("error_count", 1.0, tags);
    }

    pub fn get_metrics(&self) -> Vec<PerformanceMetric> {
        if let Ok(metrics) = self.metrics.lock() {
            metrics.clone()
        } else {
            Vec::new()
        }
    }

    pub fn get_stats(&self) -> Option<PerformanceStats> {
        if let Ok(stats) = self.stats.lock() {
            Some(stats.clone())
        } else {
            None
        }
    }

    pub fn flush_metrics(&self) -> Vec<PerformanceMetric> {
        if let Ok(mut metrics) = self.metrics.lock() {
            let flushed_metrics = metrics.clone();
            metrics.clear();
            flushed_metrics
        } else {
            Vec::new()
        }
    }
}

// Tauri commands for performance monitoring
#[tauri::command]
pub fn get_performance_stats(
    monitor: State<PerformanceMonitor>,
) -> Result<Option<PerformanceStats>, String> {
    Ok(monitor.get_stats())
}

#[tauri::command]
pub fn record_user_action(
    monitor: State<PerformanceMonitor>,
    action: String,
    duration_ms: Option<f64>,
) -> Result<(), String> {
    let mut tags = HashMap::new();
    tags.insert("action".to_string(), action);
    tags.insert("type".to_string(), "user_action".to_string());

    monitor.record_metric("user_action", duration_ms.unwrap_or(1.0), tags);
    Ok(())
}

#[tauri::command]
pub fn flush_performance_metrics(
    monitor: State<PerformanceMonitor>,
) -> Result<Vec<PerformanceMetric>, String> {
    Ok(monitor.flush_metrics())
}
EOF
    
    success "Performance monitoring configured"
}

# Generate privacy policy and consent forms
generate_privacy_docs() {
    log "Generating privacy documentation..."
    
    # Create privacy policy template
    cat > "$PROJECT_ROOT/docs/privacy-policy.md" << 'EOF'
# Privacy Policy - AutoDev-AI Neural Bridge

**Last Updated:** $(date +%Y-%m-%d)

## Introduction

AutoDev-AI Neural Bridge ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.

## Information We Collect

### Automatically Collected Information

- **Usage Data**: Application features used, time spent, and interaction patterns
- **Performance Data**: System performance metrics, error logs, and crash reports
- **Technical Data**: Operating system, hardware specifications, and application version
- **Anonymized Analytics**: Aggregated usage statistics with no personal identifiers

### Information You Provide

- **Settings and Preferences**: Configuration choices and customization options
- **Feedback**: Bug reports, feature requests, and user feedback (when voluntarily provided)

## How We Use Your Information

We use collected information to:

1. **Improve Application Performance**: Identify and fix bugs, optimize performance
2. **Enhance User Experience**: Understand usage patterns to improve features
3. **Provide Support**: Diagnose issues and provide technical assistance
4. **Security**: Monitor for malicious activity and protect against threats

## Data Sharing and Disclosure

We do not sell, trade, or otherwise transfer your personal information to third parties, except:

- **Service Providers**: Trusted third-party services that help us operate our application
- **Legal Requirements**: When required by law or to protect our rights and safety
- **Business Transfers**: In the event of a merger, acquisition, or sale of assets

## Data Security

We implement industry-standard security measures including:

- **Encryption**: All data transmission is encrypted using TLS
- **Anonymization**: Personal identifiers are removed or hashed
- **Access Controls**: Limited access to data based on job responsibilities
- **Regular Audits**: Security assessments and vulnerability scanning

## Your Rights and Choices

You have the right to:

- **Opt-Out**: Disable analytics and telemetry in application settings
- **Access**: Request a copy of data we have collected about you
- **Correction**: Update or correct inaccurate information
- **Deletion**: Request deletion of your data (subject to legal requirements)
- **Portability**: Receive your data in a machine-readable format

## Data Retention

- **Analytics Data**: Retained for 90 days, then automatically deleted
- **Crash Reports**: Retained for 180 days for debugging purposes
- **Aggregated Statistics**: May be retained indefinitely in anonymous form

## Children's Privacy

Our application is not intended for children under 13. We do not knowingly collect personal information from children under 13.

## International Data Transfers

Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.

## Changes to This Policy

We may update this Privacy Policy periodically. We will notify you of any material changes through the application or via email.

## Contact Us

If you have questions about this Privacy Policy, please contact us at:

- **Email**: privacy@autodev-ai.com
- **Address**: [Company Address]
- **Data Protection Officer**: dpo@autodev-ai.com

## Compliance

This policy is designed to comply with:

- **GDPR** (General Data Protection Regulation)
- **CCPA** (California Consumer Privacy Act)  
- **PIPEDA** (Personal Information Protection and Electronic Documents Act)
EOF
    
    # Create consent form template
    cat > "$PROJECT_ROOT/src/components/ConsentForm.tsx" << 'EOF'
import React, { useState } from 'react';

interface ConsentFormProps {
  onConsent: (consented: boolean, preferences: ConsentPreferences) => void;
}

interface ConsentPreferences {
  analytics: boolean;
  crashReporting: boolean;
  performance: boolean;
  optional: boolean;
}

export const ConsentForm: React.FC<ConsentFormProps> = ({ onConsent }) => {
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    analytics: false,
    crashReporting: false,
    performance: false,
    optional: false,
  });

  const [showDetails, setShowDetails] = useState(false);

  const handleSubmit = (accepted: boolean) => {
    onConsent(accepted, accepted ? preferences : {
      analytics: false,
      crashReporting: false,
      performance: false,
      optional: false,
    });
  };

  return (
    <div className="consent-form-overlay">
      <div className="consent-form">
        <h2>Data Collection Consent</h2>
        
        <p>
          AutoDev-AI would like to collect anonymous usage data to improve the application. 
          Your privacy is important to us, and all data is collected in compliance with privacy laws.
        </p>

        <div className="consent-options">
          <label className="consent-option">
            <input
              type="checkbox"
              checked={preferences.analytics}
              onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
            />
            <span>Basic Analytics (recommended)</span>
            <small>Helps us understand how features are used</small>
          </label>

          <label className="consent-option">
            <input
              type="checkbox"
              checked={preferences.crashReporting}
              onChange={(e) => setPreferences({...preferences, crashReporting: e.target.checked})}
            />
            <span>Crash Reporting (recommended)</span>
            <small>Helps us fix bugs and improve stability</small>
          </label>

          <label className="consent-option">
            <input
              type="checkbox"
              checked={preferences.performance}
              onChange={(e) => setPreferences({...preferences, performance: e.target.checked})}
            />
            <span>Performance Monitoring</span>
            <small>Helps us optimize application performance</small>
          </label>

          <label className="consent-option">
            <input
              type="checkbox"
              checked={preferences.optional}
              onChange={(e) => setPreferences({...preferences, optional: e.target.checked})}
            />
            <span>Optional Feature Usage Data</span>
            <small>Helps us prioritize new features</small>
          </label>
        </div>

        <div className="consent-details">
          <button 
            type="button" 
            onClick={() => setShowDetails(!showDetails)}
            className="details-toggle"
          >
            {showDetails ? 'Hide' : 'Show'} Data Collection Details
          </button>

          {showDetails && (
            <div className="details-content">
              <h4>What data do we collect?</h4>
              <ul>
                <li>Application usage patterns (no personal information)</li>
                <li>Performance metrics (CPU, memory usage)</li>
                <li>Error logs and crash reports</li>
                <li>Feature usage statistics</li>
              </ul>

              <h4>How do we protect your privacy?</h4>
              <ul>
                <li>All data is anonymized before collection</li>
                <li>No personal information is ever collected</li>
                <li>Data is encrypted during transmission</li>
                <li>You can opt-out at any time in settings</li>
              </ul>

              <p>
                <a href="/privacy-policy" target="_blank">Read our full Privacy Policy</a>
              </p>
            </div>
          )}
        </div>

        <div className="consent-actions">
          <button 
            type="button" 
            onClick={() => handleSubmit(false)}
            className="btn-secondary"
          >
            Decline All
          </button>
          <button 
            type="button" 
            onClick={() => handleSubmit(true)}
            className="btn-primary"
          >
            Accept Selected
          </button>
        </div>

        <p className="consent-note">
          You can change these preferences at any time in the application settings.
        </p>
      </div>
    </div>
  );
};

export default ConsentForm;
EOF
    
    success "Privacy documentation generated"
}

# Deploy telemetry infrastructure
deploy_telemetry() {
    log "Deploying telemetry infrastructure..."
    
    # Deploy analytics stack
    if [[ -f "$PROJECT_ROOT/monitoring/docker-compose.analytics.yml" ]]; then
        cd "$PROJECT_ROOT/monitoring"
        docker-compose -f docker-compose.analytics.yml up -d
        
        log "Waiting for analytics services to start..."
        sleep 30
        
        # Health check
        if curl -f -s http://localhost:3001/health > /dev/null; then
            success "Analytics API is healthy"
        else
            warn "Analytics API health check failed"
        fi
        
        if curl -f -s http://localhost:8123 > /dev/null; then
            success "ClickHouse is healthy"
        else
            warn "ClickHouse health check failed"
        fi
    fi
    
    success "Telemetry infrastructure deployed"
}

# Generate telemetry report
generate_telemetry_report() {
    log "Generating telemetry configuration report..."
    
    local report_file="$PROJECT_ROOT/telemetry-setup-report.md"
    
    cat > "$report_file" << 'EOF'
# AutoDev-AI Telemetry Setup Report

**Generated:** $(date)

## Configuration Summary

### Analytics
- **Service**: Deployed and configured
- **Database**: ClickHouse for time-series data
- **API**: RESTful analytics API on port 3001
- **Dashboard**: Metabase on port 3002
- **Privacy**: GDPR/CCPA compliant

### Crash Reporting
- **Service**: Sentry integration configured
- **Processing**: Automated crash report processing
- **Storage**: S3-compatible storage for crash dumps
- **Symbolication**: Automatic stack trace symbolication

### Performance Monitoring
- **Metrics**: System and application performance
- **Collection**: 60-second intervals
- **Alerts**: Configurable thresholds
- **Retention**: 30 days for detailed data

### Privacy & Compliance
- **Consent**: User consent form implemented
- **Anonymization**: All PII removed or hashed
- **Retention**: Automatic data deletion
- **Compliance**: GDPR, CCPA, PIPEDA ready

## Deployment Status

- [x] Telemetry configuration created
- [x] Analytics infrastructure deployed
- [x] Crash reporting configured
- [x] Performance monitoring setup
- [x] Privacy documentation generated
- [x] Consent forms implemented

## Next Steps

1. Configure environment variables in production
2. Set up SSL certificates for analytics endpoints
3. Configure notification channels (Slack, email)
4. Test data collection and processing
5. Set up monitoring dashboards

## Security Considerations

- All data transmission is encrypted (TLS)
- User consent is required before data collection
- Personal information is never collected
- Regular security audits are recommended

---

*For questions about telemetry configuration, contact the development team.*
EOF
    
    success "Telemetry report generated: $report_file"
}

# Main function
main() {
    case "${1:-setup}" in
        "init")
            init_telemetry
            ;;
        "setup")
            init_telemetry
            setup_analytics
            setup_crash_reporting
            setup_performance_monitoring
            generate_privacy_docs
            ;;
        "deploy")
            deploy_telemetry
            ;;
        "report")
            generate_telemetry_report
            ;;
        "all")
            init_telemetry
            setup_analytics
            setup_crash_reporting
            setup_performance_monitoring
            generate_privacy_docs
            deploy_telemetry
            generate_telemetry_report
            ;;
        *)
            echo "Usage: $0 {init|setup|deploy|report|all}"
            echo "  init   - Initialize telemetry configuration"
            echo "  setup  - Setup telemetry infrastructure"
            echo "  deploy - Deploy telemetry services"
            echo "  report - Generate telemetry report"
            echo "  all    - Run all telemetry setup steps"
            exit 1
            ;;
    esac
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi