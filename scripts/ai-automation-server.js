#!/usr/bin/env node
/**
 * AI Automation Server - GitHub Webhook Receiver
 * Manages Vibe-Coding-AI lifecycle based on GitHub workflow completions
 */

const express = require('express');
const crypto = require('crypto');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// State Management
let currentAIProcess = null;
let pendingWorkflows = new Set();
let currentTask = null;

// Load environment
require('dotenv').config({ path: '.env.local' });
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

app.use(express.json());

// Webhook signature verification
function verifyGitHubSignature(req, res, buf) {
  const signature = req.get('X-Hub-Signature-256');
  if (!signature) return false;
  
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(buf, 'utf8')
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'alive',
    aiProcess: currentAIProcess ? 'running' : 'stopped',
    pendingWorkflows: Array.from(pendingWorkflows),
    currentTask: currentTask,
    timestamp: new Date().toISOString()
  });
});

// Main GitHub webhook endpoint
app.post('/github-webhook', express.raw({type: 'application/json'}), (req, res) => {
  // Verify signature
  if (!verifyGitHubSignature(req, res, req.body)) {
    console.log('❌ Invalid webhook signature');
    return res.status(401).send('Unauthorized');
  }
  
  const event = req.get('X-GitHub-Event');
  const payload = JSON.parse(req.body);
  
  console.log(`📨 GitHub Event: ${event}`);
  
  switch (event) {
    case 'workflow_run':
      handleWorkflowEvent(payload);
      break;
    case 'push':
      handlePushEvent(payload);
      break;
    case 'issues':
      handleIssueEvent(payload);
      break;
    default:
      console.log(`ℹ️ Ignored event: ${event}`);
  }
  
  res.status(200).send('OK');
});

// Handle workflow run events
function handleWorkflowEvent(payload) {
  const { workflow_run } = payload;
  const { id, name, status, conclusion } = workflow_run;
  
  console.log(`🔄 Workflow: ${name} (${id}) - Status: ${status}, Conclusion: ${conclusion}`);
  
  if (status === 'in_progress' || status === 'queued') {
    pendingWorkflows.add(id);
    console.log(`⏳ Added workflow ${id} to pending list`);
  }
  
  if (status === 'completed') {
    pendingWorkflows.delete(id);
    console.log(`✅ Workflow ${id} completed with conclusion: ${conclusion}`);
    
    // Check if all workflows are done
    checkAllWorkflowsComplete();
  }
}

// Handle push events (new workflows might start)
function handlePushEvent(payload) {
  const { head_commit } = payload;
  console.log(`📤 Push detected: ${head_commit?.message?.split('\n')[0] || 'No message'}`);
  
  // Wait a bit for workflows to start, then check status
  setTimeout(checkPendingWorkflows, 5000);
}

// Handle issue events (might indicate problems)
function handleIssueEvent(payload) {
  const { action, issue } = payload;
  
  if (action === 'opened' && issue.labels?.some(label => label.name === 'ci-failure')) {
    console.log(`🚨 CI Failure Issue Created: #${issue.number} - ${issue.title}`);
    // AI will handle this in next iteration
  }
}

// Check for pending workflows via GitHub API
async function checkPendingWorkflows() {
  try {
    const { stdout } = await execPromise('gh run list --limit 20 --json status,conclusion,workflowName,databaseId');
    const runs = JSON.parse(stdout);
    
    // Update pending workflows
    pendingWorkflows.clear();
    runs
      .filter(run => run.status === 'in_progress' || run.status === 'queued')
      .forEach(run => pendingWorkflows.add(run.databaseId));
      
    console.log(`📊 Current pending workflows: ${pendingWorkflows.size}`);
    checkAllWorkflowsComplete();
  } catch (error) {
    console.error('❌ Error checking workflows:', error.message);
  }
}

// Check if all workflows are complete and restart AI if needed
function checkAllWorkflowsComplete() {
  if (pendingWorkflows.size === 0) {
    console.log('🎉 All workflows completed! Restarting AI...');
    restartAI();
  } else {
    console.log(`⏳ Still waiting for ${pendingWorkflows.size} workflows to complete`);
  }
}

// Restart the AI with next task
function restartAI() {
  // Kill current AI process
  if (currentAIProcess) {
    console.log('🔄 Stopping current AI process...');
    currentAIProcess.kill('SIGTERM');
    currentAIProcess = null;
  }
  
  // Wait a bit, then start new AI process
  setTimeout(() => {
    console.log('🚀 Starting new AI iteration...');
    startAI();
  }, 2000);
}

// Start AI process
function startAI() {
  // Load next task from roadmap
  const nextTask = getNextRoadmapTask();
  if (!nextTask) {
    console.log('🏁 No more tasks in roadmap. Automation complete!');
    return;
  }
  
  currentTask = nextTask;
  console.log(`🎯 Starting AI with task: ${nextTask}`);
  
  // Start Claude-Flow process
  currentAIProcess = spawn('npx', ['claude-flow@alpha', 'mcp', 'start'], {
    cwd: '/home/dennis/autodevai',
    stdio: 'inherit',
    env: {
      ...process.env,
      CURRENT_TASK: nextTask,
      AI_MODE: 'automated'
    }
  });
  
  currentAIProcess.on('exit', (code) => {
    console.log(`🔚 AI process exited with code ${code}`);
    currentAIProcess = null;
  });
  
  currentAIProcess.on('error', (error) => {
    console.error('❌ AI process error:', error);
    currentAIProcess = null;
  });
}

// Get next unchecked task from roadmap
function getNextRoadmapTask() {
  try {
    const roadmapPath = path.join(__dirname, '../docs/roadmap.md');
    const roadmapContent = fs.readFileSync(roadmapPath, 'utf8');
    
    // Find first unchecked task [ ]
    const match = roadmapContent.match(/- \[ \] (.+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('❌ Error reading roadmap:', error.message);
    return null;
  }
}

// Utility function to promisify exec
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down AI automation server...');
  if (currentAIProcess) {
    currentAIProcess.kill('SIGTERM');
  }
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🌐 AI Automation Server running on http://localhost:${PORT}`);
  console.log(`📡 Webhook endpoint: http://tekkfm.mooo.com:${PORT}/github-webhook`);
  console.log(`❤️ Health check: http://tekkfm.mooo.com:${PORT}/health`);
  console.log('🚀 Starting initial AI process...');
  
  // Start first AI iteration
  setTimeout(startAI, 1000);
});