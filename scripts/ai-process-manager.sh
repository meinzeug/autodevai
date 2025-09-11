#!/bin/bash
# AI Process Manager - Advanced Vibe-Coding-AI Lifecycle Management
set -euo pipefail

# Configuration
AI_LOG_DIR="/home/dennis/autodevai/logs"
AI_PID_FILE="/tmp/claude-ai.pid"
AI_STATE_FILE="/tmp/claude-ai.state"
MAX_RETRIES=3
RETRY_DELAY=10

# Ensure log directory exists
mkdir -p "$AI_LOG_DIR"

# Logging function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$AI_LOG_DIR/ai-manager.log"
}

# Get current AI process status
get_ai_status() {
  if [ -f "$AI_PID_FILE" ]; then
    local pid=$(cat "$AI_PID_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
      echo "running"
      return 0
    else
      rm -f "$AI_PID_FILE"
      echo "stopped"
      return 1
    fi
  else
    echo "stopped"
    return 1
  fi
}

# Start AI with specific task
start_ai() {
  local task="${1:-$(get_next_roadmap_task)}"
  local retry_count="${2:-0}"
  
  if [ "$(get_ai_status)" = "running" ]; then
    log "⚠️ AI is already running. Use 'restart' to restart."
    return 1
  fi
  
  if [ -z "$task" ]; then
    log "🏁 No more tasks in roadmap. Automation complete!"
    return 0
  fi
  
  log "🚀 Starting AI with task: $task (attempt $((retry_count + 1)))"
  
  # Create task-specific environment
  export CURRENT_TASK="$task"
  export AI_MODE="automated"
  export AI_START_TIME=$(date +%s)
  
  # Store current state
  echo "$task" > "$AI_STATE_FILE"
  
  # Start AI process in background with comprehensive logging
  nohup bash -c "
    cd /home/dennis/autodevai
    source scripts/github-auth-setup.sh
    github_auth_setup
    
    # Execute the optimized GitHub-first prompt
    echo '$task' | npx claude-flow@alpha execute --prompt-file code_github.md --mode automated
  " > "$AI_LOG_DIR/ai-$(date +%Y%m%d-%H%M%S).log" 2>&1 &
  
  local ai_pid=$!
  echo "$ai_pid" > "$AI_PID_FILE"
  
  log "✅ AI started with PID: $ai_pid, Task: $task"
  
  # Monitor AI process
  monitor_ai_process "$ai_pid" "$task" "$retry_count" &
}

# Stop AI process
stop_ai() {
  local force="${1:-false}"
  
  if [ "$(get_ai_status)" = "stopped" ]; then
    log "ℹ️ AI is not running"
    return 0
  fi
  
  local pid=$(cat "$AI_PID_FILE")
  log "🛑 Stopping AI process (PID: $pid)"
  
  if [ "$force" = "true" ]; then
    kill -KILL "$pid" 2>/dev/null || true
  else
    kill -TERM "$pid" 2>/dev/null || true
    sleep 5
    if ps -p "$pid" > /dev/null 2>&1; then
      log "⚠️ AI didn't stop gracefully, forcing..."
      kill -KILL "$pid" 2>/dev/null || true
    fi
  fi
  
  rm -f "$AI_PID_FILE"
  log "✅ AI stopped"
}

# Restart AI with next task
restart_ai() {
  local next_task="${1:-$(get_next_roadmap_task)}"
  
  log "🔄 Restarting AI with task: $next_task"
  stop_ai
  sleep 2
  start_ai "$next_task"
}

# Monitor AI process and handle failures
monitor_ai_process() {
  local pid="$1"
  local task="$2"
  local retry_count="$3"
  
  # Wait for process to complete
  wait "$pid" 2>/dev/null
  local exit_code=$?
  
  rm -f "$AI_PID_FILE"
  log "🔚 AI process completed with exit code: $exit_code"
  
  if [ $exit_code -eq 0 ]; then
    log "✅ Task completed successfully: $task"
    # Mark task as complete in roadmap
    mark_task_complete "$task"
  else
    log "❌ AI process failed with exit code: $exit_code"
    
    if [ $retry_count -lt $MAX_RETRIES ]; then
      log "🔄 Retrying in ${RETRY_DELAY}s... (attempt $((retry_count + 1))/$MAX_RETRIES)"
      sleep $RETRY_DELAY
      start_ai "$task" $((retry_count + 1))
    else
      log "🚨 Max retries exceeded for task: $task"
      # Skip to next task
      skip_current_task "$task"
    fi
  fi
}

# Get next unchecked task from roadmap
get_next_roadmap_task() {
  local roadmap_file="/home/dennis/autodevai/docs/roadmap.md"
  
  if [ ! -f "$roadmap_file" ]; then
    echo ""
    return
  fi
  
  # Find first unchecked task
  grep -m1 "- \[ \]" "$roadmap_file" | sed 's/- \[ \] //' || echo ""
}

# Mark task as complete in roadmap
mark_task_complete() {
  local task="$1"
  local roadmap_file="/home/dennis/autodevai/docs/roadmap.md"
  
  if [ -f "$roadmap_file" ]; then
    # Replace [ ] with [x] for the specific task
    sed -i "s/- \[ \] \Q$task\E/- [x] $task/" "$roadmap_file"
    log "✅ Marked task as complete: $task"
    
    # Commit the update
    cd /home/dennis/autodevai
    git add "$roadmap_file"
    git commit -m "✅ Complete: $task

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>" || true
    git push origin main || log "⚠️ Failed to push roadmap update"
  fi
}

# Skip current task (mark as skipped)
skip_current_task() {
  local task="$1"
  local roadmap_file="/home/dennis/autodevai/docs/roadmap.md"
  
  if [ -f "$roadmap_file" ]; then
    # Replace [ ] with [~] for skipped tasks
    sed -i "s/- \[ \] \Q$task\E/- [~] $task (SKIPPED - failed after $MAX_RETRIES attempts)/" "$roadmap_file"
    log "⏭️ Marked task as skipped: $task"
  fi
}

# Get AI status with details
status() {
  local status=$(get_ai_status)
  local current_task=""
  
  if [ -f "$AI_STATE_FILE" ]; then
    current_task=$(cat "$AI_STATE_FILE")
  fi
  
  echo "AI Status: $status"
  if [ "$status" = "running" ]; then
    echo "Current Task: $current_task"
    echo "PID: $(cat $AI_PID_FILE 2>/dev/null || echo 'unknown')"
  fi
  echo "Next Task: $(get_next_roadmap_task)"
  
  # Show recent logs
  if [ -f "$AI_LOG_DIR/ai-manager.log" ]; then
    echo ""
    echo "Recent Activity:"
    tail -5 "$AI_LOG_DIR/ai-manager.log"
  fi
}

# Main command handler
case "${1:-status}" in
  start)
    start_ai "${2:-}"
    ;;
  stop)
    stop_ai "${2:-false}"
    ;;
  restart)
    restart_ai "${2:-}"
    ;;
  status)
    status
    ;;
  logs)
    tail -f "$AI_LOG_DIR/ai-manager.log"
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs} [task|force]"
    exit 1
    ;;
esac