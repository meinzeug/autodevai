#!/bin/bash
# Test Script für dennis AI Automation System
set -euo pipefail

echo "🧪 DENNIS AI AUTOMATION - INTEGRATION TEST"
echo "=========================================="
echo "$(date) - Starting comprehensive test suite..."
echo ""

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Test function
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

echo "Phase 1: System Prerequisites"
echo "-----------------------------"

run_test "Node.js verfügbar" "command -v node"
run_test "GitHub CLI verfügbar" "command -v gh"
run_test "GitHub Authentication" "gh auth status"
run_test "dennis sudo ohne passwort" "sudo -n true"

echo ""
echo "Phase 2: File Structure & Permissions"  
echo "-------------------------------------"

run_test "GitHub callback server exists" "[ -f '/home/dennis/autodevai/github-callback-server.js' ]"
run_test "startgit.sh exists" "[ -f '/home/dennis/autodevai/startgit.sh' ]"
run_test "code_github.md exists" "[ -f '/home/dennis/autodevai/code_github.md' ]"
run_test "startgit.sh executable" "[ -x '/home/dennis/autodevai/startgit.sh' ]"
run_test "dennis working directory exists" "[ -d '/home/dennis/autodevai' ]"
run_test "dennis owns directory" "[ -O '/home/dennis/autodevai' ]"

echo ""
echo "Phase 3: GitHub Integration"
echo "---------------------------"

run_detailed_test "GitHub Repository Access" "gh repo view meinzeug/autodevai"
run_detailed_test "GitHub Issues List" "gh issue list --limit 5"
run_detailed_test "GitHub PRs List" "gh pr list --limit 5" 
run_detailed_test "GitHub Workflows List" "gh run list --limit 5"

# Check current GitHub state
OPEN_ISSUES=$(gh issue list --state=open --json number | jq '. | length' 2>/dev/null || echo "0")
OPEN_PRS=$(gh pr list --state=open --json number | jq '. | length' 2>/dev/null || echo "0")

echo ""
echo "📊 Current GitHub State:"
echo "   Open Issues: $OPEN_ISSUES"
echo "   Open PRs: $OPEN_PRS"

echo ""
echo "Phase 4: Webhook Server Tests"
echo "-----------------------------"

# Check if service is running (MX Linux SysV Init)
if service github-callback status >/dev/null 2>&1; then
  echo "✅ Webhook service is running"
  
  run_test "Local health endpoint (19000)" "curl -f http://localhost:19000/health"
  run_test "Local status endpoint" "curl -f http://localhost:19000/status"
  
  # Test external access
  if curl -f http://tekkfm.mooo.com:19000/health >/dev/null 2>&1; then
    echo "✅ PASSED: External webhook access (Router Port-Forwarding works!)"
    ((TESTS_PASSED++))
  else
    echo "❌ FAILED: External webhook access - Router Port-Forwarding needed"
    ((TESTS_FAILED++))
    FAILED_TESTS+=("External webhook access")
  fi
  
else
  echo "⚠️ Webhook service not running - starting test server..."
  
  # Start test server in background
  cd /home/dennis/autodevai
  node github-callback-server.js &
  SERVER_PID=$!
  sleep 3
  
  run_test "Test server startup" "curl -f http://localhost:19000/health"
  
  # Cleanup
  kill $SERVER_PID >/dev/null 2>&1 || true
fi

echo ""
echo "Phase 5: Mock Webhook Test"
echo "-------------------------"

# Create mock webhook payload
MOCK_PAYLOAD='{
  "action": "completed", 
  "workflow_run": {
    "id": 999999,
    "name": "Test Workflow",
    "status": "completed",
    "conclusion": "success"
  }
}'

# Test webhook endpoint (will fail auth, but should reach endpoint)
if curl -X POST http://localhost:19000/githubisdone \
   -H "Content-Type: application/json" \
   -d "$MOCK_PAYLOAD" 2>/dev/null | grep -q "Unauthorized"; then
  echo "✅ PASSED: Webhook endpoint reachable (returns 401 without signature)"
  ((TESTS_PASSED++))
else  
  echo "❌ FAILED: Webhook endpoint not reachable"
  ((TESTS_FAILED++))
  FAILED_TESTS+=("Webhook endpoint")
fi

echo ""
echo "Phase 6: AI Start Script Test"
echo "-----------------------------"

# Test startgit.sh components
run_test "startgit.sh syntax check" "bash -n /home/dennis/autodevai/startgit.sh"

# Test GitHub token loading
if [ -f "/etc/neubri/secrets.env" ]; then
  run_test "GitHub token readable" "sudo cat /etc/neubri/secrets.env | grep -q 'GITHUB_TOKEN='"
else
  echo "⚠️ WARNING: /etc/neubri/secrets.env not found"
fi

echo ""
echo "Phase 7: Roadmap Integration"
echo "---------------------------"

ROADMAP_FILE="/home/dennis/autodevai/docs/roadmap.md"
run_test "Roadmap file exists" "[ -f '$ROADMAP_FILE' ]"

if [ -f "$ROADMAP_FILE" ]; then
  UNCHECKED_TASKS=$(grep -c "- \[ \]" "$ROADMAP_FILE" 2>/dev/null || echo "0")
  CHECKED_TASKS=$(grep -c "- \[x\]" "$ROADMAP_FILE" 2>/dev/null || echo "0")
  
  echo "📋 Roadmap Status:"
  echo "   Unchecked tasks: $UNCHECKED_TASKS"
  echo "   Completed tasks: $CHECKED_TASKS"
  
  if [ "$UNCHECKED_TASKS" -gt 0 ]; then
    echo "✅ PASSED: Roadmap has tasks to work on"
    ((TESTS_PASSED++))
  else
    echo "⚠️ WARNING: No unchecked tasks in roadmap"
  fi
fi

echo ""
echo "Phase 8: Process Management Test"
echo "-------------------------------"

# Test sudo killall command (dennis can kill claude)
run_test "sudo killall available" "command -v killall && sudo -n killall --version"

# Test dennis can run startgit.sh
if test -x /home/dennis/autodevai/startgit.sh; then
  echo "✅ PASSED: dennis can execute startgit.sh"
  ((TESTS_PASSED++))
else
  echo "❌ FAILED: dennis cannot execute startgit.sh"
  ((TESTS_FAILED++))
  FAILED_TESTS+=("dennis startgit.sh access")
fi

echo ""
echo "Phase 9: Network & Connectivity"
echo "------------------------------"

run_test "Internet connectivity" "ping -c 1 google.com"
run_test "GitHub API connectivity" "curl -f https://api.github.com/user -H 'Authorization: token $(gh auth token)'"
run_test "Domain resolution" "nslookup tekkfm.mooo.com"

echo ""
echo "=================================================="
echo "🎯 INTEGRATION TEST RESULTS"
echo "=================================================="
echo "✅ Tests Passed: $TESTS_PASSED"
echo "❌ Tests Failed: $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
  SUCCESS_RATE=100
else
  SUCCESS_RATE=$(( (TESTS_PASSED * 100) / (TESTS_PASSED + TESTS_FAILED) ))
fi

echo "📊 Success Rate: ${SUCCESS_RATE}%"

if [ $TESTS_FAILED -gt 0 ]; then
  echo ""
  echo "❌ Failed Tests:"
  for test in "${FAILED_TESTS[@]}"; do
    echo "   - $test"
  done
  echo ""
  echo "🔧 Troubleshooting Guide (MX Linux):"
  echo "   1. Router Port-Forwarding: Port 19000 → [deine PC IP]:19000"
  echo "   2. GitHub Authentication: gh auth status"
  echo "   3. dennis user setup: id dennis"
  echo "   4. Webhook service: sudo service github-callback status"
  echo "   5. File permissions: ls -la /home/dennis/autodevai/"
fi

echo ""
if [ $TESTS_FAILED -eq 0 ]; then
  echo "🎉 ALL TESTS PASSED! System ready for AI automation."
  echo ""
  echo "🚀 To start the automation:"
  echo "   source ~/.bashrc"
  echo "   ai-start-manual"
  echo ""
  echo "📊 Monitor with:"
  echo "   ai-callback-logs"
  echo "   ai-status"
  echo ""
  echo "🔥 The system will automatically:"
  echo "   1. Fix all GitHub issues"
  echo "   2. Merge all PRs intelligently"
  echo "   3. Work through roadmap tasks"
  echo "   4. Push only at the very end"
  echo "   5. Receive webhook callbacks"
  echo "   6. Kill and restart AI for next cycle"
  echo ""
  echo "🌟 AUTOMATION IS READY!"
  exit 0
else
  echo "⚠️ Some tests failed. Fix issues before starting automation."
  exit 1
fi