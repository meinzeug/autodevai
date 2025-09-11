#!/bin/bash
# Comprehensive Test Suite for AI Automation System
set -euo pipefail

echo "🧪 AI Automation System - Comprehensive Test Suite"
echo "=================================================="
echo ""

# Test configuration
WEBHOOK_URL="http://tekkfm.mooo.com:3000"
LOCAL_URL="http://localhost:3000"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Test function wrapper
run_test() {
  local test_name="$1"
  local test_command="$2"
  
  echo -n "🔍 Testing: $test_name... "
  
  if eval "$test_command" >/dev/null 2>&1; then
    echo "✅ PASSED"
    ((TESTS_PASSED++))
  else
    echo "❌ FAILED"
    ((TESTS_FAILED++))
    FAILED_TESTS+=("$test_name")
  fi
}

# Detailed test function
run_detailed_test() {
  local test_name="$1"
  local test_command="$2"
  
  echo "🔍 Testing: $test_name"
  echo "Command: $test_command"
  
  if eval "$test_command"; then
    echo "✅ PASSED: $test_name"
    echo ""
    ((TESTS_PASSED++))
  else
    echo "❌ FAILED: $test_name"
    echo ""
    ((TESTS_FAILED++))
    FAILED_TESTS+=("$test_name")
  fi
}

echo "Phase 1: Prerequisites & Dependencies"
echo "-------------------------------------"

run_test "Node.js installed" "command -v node"
run_test "NPM installed" "command -v npm"
run_test "GitHub CLI installed" "command -v gh"
run_test "GitHub authentication" "gh auth status"
run_test "curl available" "command -v curl"
run_test "systemctl available" "command -v systemctl"

echo ""
echo "Phase 2: File Structure & Permissions"
echo "-------------------------------------"

run_test "Scripts directory exists" "[ -d '$SCRIPT_DIR' ]"
run_test "AI automation server script exists" "[ -f '$SCRIPT_DIR/ai-automation-server.js' ]"
run_test "Process manager script exists" "[ -f '$SCRIPT_DIR/ai-process-manager.sh' ]"
run_test "GitHub auth setup script exists" "[ -f '$SCRIPT_DIR/github-auth-setup.sh' ]"
run_test "Package.json exists" "[ -f '$SCRIPT_DIR/package.json' ]"
run_test "Process manager is executable" "[ -x '$SCRIPT_DIR/ai-process-manager.sh' ]"
run_test "GitHub setup is executable" "[ -x '$SCRIPT_DIR/github-auth-setup.sh' ]"

echo ""
echo "Phase 3: Node.js Dependencies"
echo "-----------------------------"

cd "$SCRIPT_DIR"
run_test "NPM dependencies installed" "npm list --depth=0"
run_test "Express available" "node -e 'require(\"express\")'"
run_test "Dotenv available" "node -e 'require(\"dotenv\")'"

echo ""
echo "Phase 4: GitHub Integration"
echo "---------------------------"

run_detailed_test "GitHub API access" "gh api user"
run_detailed_test "Repository access" "gh repo view meinzeug/autodevai"
run_detailed_test "Workflow list access" "gh run list --limit 5"
run_detailed_test "Issue list access" "gh issue list --limit 5"

echo ""
echo "Phase 5: Webhook Server"
echo "-----------------------"

# Check if webhook server is running
if systemctl is-active ai-webhook-server.service >/dev/null 2>&1; then
  echo "✅ Webhook server is running"
  
  run_test "Local health endpoint" "curl -f $LOCAL_URL/health"
  run_test "External health endpoint" "curl -f $WEBHOOK_URL/health"
  
  # Test webhook endpoint (should return 401 without signature)
  if curl -X POST "$LOCAL_URL/github-webhook" -H "Content-Type: application/json" -d '{}' 2>/dev/null | grep -q "Unauthorized"; then
    echo "✅ PASSED: Webhook security (returns 401 without signature)"
    ((TESTS_PASSED++))
  else
    echo "❌ FAILED: Webhook security"
    ((TESTS_FAILED++))
    FAILED_TESTS+=("Webhook security")
  fi
  
else
  echo "⚠️ Webhook server not running, testing local start..."
  
  # Start server in background for testing
  node ai-automation-server.js &
  SERVER_PID=$!
  sleep 3
  
  run_test "Local server startup" "curl -f $LOCAL_URL/health"
  
  # Cleanup
  kill $SERVER_PID >/dev/null 2>&1 || true
fi

echo ""
echo "Phase 6: AI Process Manager"
echo "---------------------------"

run_detailed_test "Process manager help" "$SCRIPT_DIR/ai-process-manager.sh status"
run_test "Log directory creation" "mkdir -p /home/dennis/autodevai/logs && [ -d /home/dennis/autodevai/logs ]"

echo ""
echo "Phase 7: Roadmap Integration"
echo "----------------------------"

ROADMAP_FILE="/home/dennis/autodevai/docs/roadmap.md"
run_test "Roadmap file exists" "[ -f '$ROADMAP_FILE' ]"

if [ -f "$ROADMAP_FILE" ]; then
  # Check if roadmap has unchecked tasks
  if grep -q "- \[ \]" "$ROADMAP_FILE"; then
    echo "✅ PASSED: Roadmap has unchecked tasks"
    ((TESTS_PASSED++))
    
    # Show next task
    NEXT_TASK=$(grep -m1 "- \[ \]" "$ROADMAP_FILE" | sed 's/- \[ \] //' || echo "None")
    echo "   Next task: $NEXT_TASK"
  else
    echo "⚠️ WARNING: No unchecked tasks in roadmap"
  fi
fi

echo ""
echo "Phase 8: Network Connectivity"
echo "-----------------------------"

run_test "Internet connectivity" "ping -c 1 google.com"
run_test "GitHub connectivity" "curl -f https://api.github.com/user -H 'Authorization: token $(gh auth token)'"
run_test "External domain resolution" "nslookup tekkfm.mooo.com"

# Test port forwarding (this might fail if router not configured)
if curl -f "$WEBHOOK_URL/health" >/dev/null 2>&1; then
  echo "✅ PASSED: External webhook access"
  ((TESTS_PASSED++))
else
  echo "⚠️ WARNING: External webhook access failed - check router port forwarding for port 3000"
fi

echo ""
echo "Phase 9: Mock Webhook Test"
echo "--------------------------"

# Create a mock webhook payload for testing
MOCK_WEBHOOK_PAYLOAD='{
  "action": "completed",
  "workflow_run": {
    "id": 12345,
    "name": "Test Workflow",
    "status": "completed",
    "conclusion": "success",
    "head_sha": "abc123"
  }
}'

# Test webhook processing (if server is running)
if systemctl is-active ai-webhook-server.service >/dev/null 2>&1; then
  # This would normally require proper webhook signature, so we just test the endpoint exists
  run_test "Webhook endpoint exists" "curl -X POST $LOCAL_URL/github-webhook -H 'Content-Type: application/json' -d '$MOCK_WEBHOOK_PAYLOAD' | grep -q 'Unauthorized'"
fi

echo ""
echo "=========================================="
echo "🎯 Test Results Summary"
echo "=========================================="
echo "✅ Tests Passed: $TESTS_PASSED"
echo "❌ Tests Failed: $TESTS_FAILED"
echo "📊 Success Rate: $(( (TESTS_PASSED * 100) / (TESTS_PASSED + TESTS_FAILED) ))%"

if [ $TESTS_FAILED -gt 0 ]; then
  echo ""
  echo "❌ Failed Tests:"
  for test in "${FAILED_TESTS[@]}"; do
    echo "   - $test"
  done
  echo ""
  echo "🔧 Troubleshooting Tips:"
  echo "   1. Check system prerequisites: Node.js, GitHub CLI"
  echo "   2. Verify GitHub authentication: gh auth status"
  echo "   3. Check network connectivity and port forwarding"
  echo "   4. Review webhook server logs: webhook-logs"
  echo "   5. Ensure systemd service is running: webhook-status"
fi

echo ""
if [ $TESTS_FAILED -eq 0 ]; then
  echo "🎉 All tests passed! System is ready for AI automation."
  echo ""
  echo "🚀 To start the automation:"
  echo "   ai-start"
  echo ""
  echo "📊 Monitor with:"
  echo "   ai-status"
  echo "   webhook-logs"
  exit 0
else
  echo "⚠️ Some tests failed. Please fix issues before starting automation."
  exit 1
fi