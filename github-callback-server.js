#!/usr/bin/env node
/**
 * GitHub Callback Server für dennis
 * Empfängt Webhooks auf Port 19000 und startet AI neu
 */

import express from 'express';
import crypto from 'crypto';
import { exec } from 'child_process';
import fs from 'fs';

const app = express();
const PORT = 19000;

// Load GitHub webhook secret
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'your_webhook_secret';

// Parse raw body for signature verification
app.use('/githubisdone', express.raw({type: 'application/json'}));
app.use(express.json());

// State tracking
const pendingWorkflows = new Set();

console.log(`🌐 GitHub Callback Server starting on port ${PORT}`);
console.log(`📡 Webhook URL: http://tekkfm.mooo.com:${PORT}/githubisdone`);

// Webhook signature verification
function verifyGitHubSignature(req, res, buf) {
  const signature = req.get('X-Hub-Signature-256');
  if (!signature) {
    console.log('⚠️ No signature provided');
    return false;
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(buf, 'utf8')
    .digest('hex');
    
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
  
  if (!isValid) {
    console.log('❌ Invalid webhook signature');
  }
  
  return isValid;
}

// Main webhook endpoint
app.post('/githubisdone', (req, res) => {
  console.log('📥 GitHub webhook received');
  
  // Skip signature verification if no secret is set
  if (WEBHOOK_SECRET !== 'your_webhook_secret') {
    const isValid = verifyGitHubSignature(req, res, req.body);
    if (!isValid) {
      return res.status(401).send('Invalid signature');
    }
  }
  
  console.log('📦 Processing webhook...');
  
  // Parse the webhook payload
  const payload = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
  const eventType = req.get('X-GitHub-Event');
  
  console.log(`📋 Event type: ${eventType}`);
  console.log(`📝 Action: ${payload.action || 'N/A'}`);
  
  // Handle different webhook events
  handleWebhookEvent(eventType, payload);
  
  res.status(200).send('OK');
});

// Handle webhook events
function handleWebhookEvent(eventType, payload) {
  switch (eventType) {
    case 'workflow_run':
      handleWorkflowRun(payload);
      break;
    case 'push':
      console.log(`🔄 Push event on ${payload.ref}`);
      if (payload.ref === 'refs/heads/main') {
        console.log('📈 Main branch updated - considering AI restart');
        // restartClaudeAI();
      }
      break;
    case 'pull_request':
      console.log(`🔍 PR event: ${payload.action} - #${payload.pull_request?.number}`);
      break;
    default:
      console.log(`📌 Unhandled event type: ${eventType}`);
  }
}

// Handle workflow run events
function handleWorkflowRun(payload) {
  const { action, workflow_run } = payload;
  const { id, name, status, conclusion, _head_sha } = workflow_run;
  
  console.log(`🚀 Workflow: ${name}`);
  console.log(`  ID: ${id}`);
  console.log(`  Status: ${status}`);
  console.log(`  Conclusion: ${conclusion || 'N/A'}`);
  
  if (action === 'requested' || action === 'in_progress') {
    console.log(`⏳ Workflow ${id} is running...`);
    pendingWorkflows.add(id);
  } else if (action === 'completed') {
    pendingWorkflows.delete(id);
    console.log(`✅ Workflow ${id} completed with status: ${conclusion}`);
    
    if (conclusion === 'success') {
      console.log('🎉 Workflow succeeded!');
      // Restart Claude AI if needed
      setTimeout(() => {
        checkAndRestartClaudeAI();
      }, 5000);
    } else if (conclusion === 'failure') {
      console.log('❌ Workflow failed - may need attention');
    }
  }
}

// Check and restart Claude AI
function checkAndRestartClaudeAI() {
  console.log('🔍 Checking Claude AI status...');
  console.log('📊 Pending workflows:', pendingWorkflows.size);
  
  // If no workflows are pending, restart AI
  if (pendingWorkflows.size === 0) {
    setTimeout(() => {
      restartClaudeAI();
    }, 3000);
  }
}

// Restart Claude AI
function restartClaudeAI() {
  console.log('🤖 Restarting Claude AI...');
  
  exec('pgrep -f "claude-flow hive-mind" | xargs kill -2 2>/dev/null', (_error, _stdout, _stderr) => {
    // Kill existing process
    console.log('🛑 Stopped existing Claude AI process');
    
    // Start new process
    setTimeout(() => {
      const command = `
        cd /home/dennis/autodevai && \\
        sudo -u dennis npx claude-flow@alpha hive-mind spawn \\
        "Read and execute the prompt in code_github.md. Work as dennis user with sudo powers. Fix GitHub issues, merge PRs, work through roadmap tasks, then push ONLY at the very end when everything is complete." \\
        --agents 10 \\
        --topology hierarchical \\
        --strategy parallel \\
        --memory-namespace autodev-dennis \\
        --claude \\
        --auto-spawn \\
        --verbose > /tmp/claude-ai.log 2>&1 &
      `;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Failed to start Claude AI:', error.message);
        } else {
          console.log('✅ Claude AI restarted successfully');
          console.log('📄 Log file: /tmp/claude-ai.log');
        }
      });
    }, 2000);
  });
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'GitHub Callback Server is running',
    webhookUrl: `http://tekkfm.mooo.com:${PORT}/githubisdone`,
    pendingWorkflows: pendingWorkflows.size
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ GitHub Callback Server running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://tekkfm.mooo.com:${PORT}/githubisdone`);
  console.log(`🔐 Webhook secret: ${WEBHOOK_SECRET === 'your_webhook_secret' ? 'NOT SET (signature verification disabled)' : 'SET'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Server shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Server terminated (SIGTERM)...');
  process.exit(0);
});

// API endpoints for monitoring
app.get('/webhooks', (req, res) => {
  res.json({
    pendingWorkflows: Array.from(pendingWorkflows),
    count: pendingWorkflows.size
  });
});

// Alive endpoint
app.get('/alive', (req, res) => {
  res.json({
    status: 'alive',
    port: PORT,
    pendingWorkflows: Array.from(pendingWorkflows),
    timestamp: new Date().toISOString(),
    webhookUrl: `http://tekkfm.mooo.com:${PORT}/githubisdone`
  });
});

// Status endpoint with watchdog integration
app.get('/status', (req, res) => {
  // Try to read watchdog status
  let watchdogStatus = null;
  try {
    const watchdogFile = '/tmp/claude-watchdog-status.json';
    if (fs.existsSync(watchdogFile)) {
      watchdogStatus = JSON.parse(fs.readFileSync(watchdogFile, 'utf8'));
    }
  } catch (error) {
    console.log('Could not read watchdog status:', error.message);
  }
  
  res.json({
    server: 'GitHub Callback Server',
    port: PORT,
    pendingWorkflows: {
      count: pendingWorkflows.size,
      ids: Array.from(pendingWorkflows)
    },
    claude: {
      watchdog: watchdogStatus,
      isRateLimited: watchdogStatus?.is_rate_limited || false,
      resumeTime: watchdogStatus?.resume_time || null
    },
    lastCheck: new Date().toISOString()
  });
});

// Claude watchdog status endpoint
app.get('/claude/status', (req, res) => {
  try {
    const watchdogFile = '/tmp/claude-watchdog-status.json';
    const pidFile = '/tmp/claude-ai.pid';
    
    let status = {
      claude: 'unknown',
      watchdog: null,
      pid: null,
      isRateLimited: false
    };
    
    // Check watchdog status
    if (fs.existsSync(watchdogFile)) {
      status.watchdog = JSON.parse(fs.readFileSync(watchdogFile, 'utf8'));
      status.isRateLimited = status.watchdog.is_rate_limited || false;
      
      // Format resume time if rate limited
      if (status.watchdog.resume_time) {
        const resumeDate = new Date(status.watchdog.resume_time);
        const now = new Date();
        const minutesLeft = Math.max(0, Math.floor((resumeDate - now) / 60000));
        status.resumeInMinutes = minutesLeft;
        status.resumeAt = resumeDate.toLocaleTimeString();
      }
    }
    
    // Check Claude PID
    if (fs.existsSync(pidFile)) {
      const pid = fs.readFileSync(pidFile, 'utf8').trim();
      status.pid = pid;
      
      // Check if process is running
      try {
        process.kill(pid, 0);
        status.claude = status.isRateLimited ? 'rate_limited' : 'running';
      } catch (e) {
        status.claude = 'stopped';
      }
    }
    
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Server wird heruntergefahren...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Server wird beendet (SIGTERM)...');
  process.exit(0);
});