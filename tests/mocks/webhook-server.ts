/**
 * Mock Webhook Server for testing GitHub webhook integration
 */

import express from 'express';
import crypto from 'crypto';
import { Server } from 'http';

export class MockWebhookServer {
  private app: express.Application;
  private server: Server | null = null;
  private processedWebhooks: any[] = [];
  private processingSequence: Map<number, number[]> = new Map();
  private webhookSecret = 'test_webhook_secret';
  
  constructor(private port: number) {
    this.app = express();
    this.setupRoutes();
  }
  
  private setupRoutes() {
    // Parse raw body for signature verification
    this.app.use('/webhooks/github', express.raw({ type: 'application/json' }));
    this.app.use(express.json());
    
    // Main webhook endpoint
    this.app.post('/webhooks/github', (req, res) => {
      this.processWebhook(req, res);
    });
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', port: this.port });
    });
    
    // Stats endpoint
    this.app.get('/stats', (req, res) => {
      res.json({
        processedWebhooks: this.processedWebhooks.length,
        processingSequence: Object.fromEntries(this.processingSequence)
      });
    });
  }
  
  private processWebhook(req: express.Request, res: express.Response) {
    try {
      const signature = req.get('X-Hub-Signature-256');
      const eventType = req.get('X-GitHub-Event');
      const delivery = req.get('X-GitHub-Delivery');
      
      console.log(`📥 Webhook received: ${eventType} (${delivery})`);
      
      // Verify signature if provided
      if (signature && !this.verifySignature(req.body, signature)) {
        console.log('❌ Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      // Parse payload
      const payload = Buffer.isBuffer(req.body) 
        ? JSON.parse(req.body.toString()) 
        : req.body;
      
      // Record webhook processing
      const webhookRecord = {
        id: delivery || Date.now().toString(),
        eventType,
        payload,
        processedAt: new Date().toISOString(),
        status: 'processed'
      };
      
      this.processedWebhooks.push(webhookRecord);
      
      // Handle sequence tracking for PR events
      if (eventType === 'pull_request' && payload.pull_request) {
        const prNumber = payload.pull_request.number;
        const sequence = payload.sequence || this.processedWebhooks.length;
        
        if (!this.processingSequence.has(prNumber)) {
          this.processingSequence.set(prNumber, []);
        }
        this.processingSequence.get(prNumber)!.push(sequence);
      }
      
      // Simulate processing delay
      setTimeout(() => {
        this.handleWebhookEvent(eventType, payload);
      }, 100);
      
      res.status(200).json({ message: 'Webhook processed successfully' });
      
    } catch (error: any) {
      console.error('❌ Webhook processing error:', error.message);
      
      this.processedWebhooks.push({
        id: req.get('X-GitHub-Delivery') || Date.now().toString(),
        eventType: req.get('X-GitHub-Event'),
        error: error.message,
        processedAt: new Date().toISOString(),
        status: 'failed'
      });
      
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
  
  private verifySignature(body: Buffer, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');
    
    const providedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  }
  
  private handleWebhookEvent(eventType: string, payload: any) {
    switch (eventType) {
      case 'pull_request':
        this.handlePullRequestEvent(payload);
        break;
      case 'issues':
        this.handleIssuesEvent(payload);
        break;
      case 'push':
        this.handlePushEvent(payload);
        break;
      case 'workflow_run':
        this.handleWorkflowRunEvent(payload);
        break;
      default:
        console.log(`📌 Unhandled event type: ${eventType}`);
    }
  }
  
  private handlePullRequestEvent(payload: any) {
    const { action, pull_request } = payload;
    console.log(`🔄 PR Event: ${action} - #${pull_request.number}`);
    
    // Simulate different processing based on PR characteristics
    if (pull_request.user.login === 'dependabot[bot]') {
      console.log('🤖 Dependabot PR detected - triggering auto-merge workflow');
    }
    
    if (!pull_request.mergeable && action === 'synchronize') {
      console.log('⚠️ Merge conflicts detected - triggering resolution workflow');
    }
  }
  
  private handleIssuesEvent(payload: any) {
    const { action, issue } = payload;
    console.log(`📢 Issue Event: ${action} - #${issue.number}`);
    
    // Check for security labels
    const hasSecurityLabel = issue.labels.some((label: any) => 
      label.name.includes('security') || label.name.includes('vulnerability')
    );
    
    if (hasSecurityLabel && action === 'opened') {
      console.log('🛡️ Security issue detected - triggering auto-fix workflow');
    }
  }
  
  private handlePushEvent(payload: any) {
    const { ref, commits } = payload;
    console.log(`📤 Push Event: ${ref} - ${commits.length} commits`);
    
    if (ref === 'refs/heads/main') {
      console.log('🎆 Main branch updated - triggering CI/CD pipeline');
    }
  }
  
  private handleWorkflowRunEvent(payload: any) {
    const { action, workflow_run } = payload;
    console.log(`⛏️ Workflow Event: ${action} - ${workflow_run.name}`);
    
    if (action === 'completed' && workflow_run.conclusion === 'success') {
      console.log('✅ Workflow completed successfully - checking for next steps');
    }
  }
  
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          console.log(`📋 Mock Webhook Server started on port ${this.port}`);
          resolve();
        }
      });
    });
  }
  
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Mock Webhook Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
  
  // Test helper methods
  async sendWebhook(payload: any, eventType: string): Promise<any> {
    const fetch = (await import('node-fetch')).default;
    
    const body = JSON.stringify(payload);
    const signature = this.generateSignature(body);
    
    const response = await fetch(`http://localhost:${this.port}/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': eventType,
        'X-GitHub-Delivery': Date.now().toString(),
        'X-Hub-Signature-256': signature
      },
      body
    });
    
    return {
      status: response.status,
      data: await response.json()
    };
  }
  
  async sendAuthenticatedWebhook(
    payload: any, 
    eventType: string, 
    secret: string
  ): Promise<any> {
    const fetch = (await import('node-fetch')).default;
    
    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    
    const response = await fetch(`http://localhost:${this.port}/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': eventType,
        'X-GitHub-Delivery': Date.now().toString(),
        'X-Hub-Signature-256': `sha256=${signature}`
      },
      body
    });
    
    return {
      status: response.status,
      data: await response.json()
    };
  }
  
  private generateSignature(body: string): string {
    const signature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');
    return `sha256=${signature}`;
  }
  
  getProcessedWebhooks(): any[] {
    return this.processedWebhooks;
  }
  
  getProcessingSequence(prNumber: number): number[] {
    return this.processingSequence.get(prNumber) || [];
  }
  
  async triggerRoadmapExecution(taskId: string): Promise<void> {
    await this.sendWebhook({
      action: 'execute_roadmap_task',
      task_id: taskId
    }, 'repository_dispatch');
  }
  
  reset() {
    this.processedWebhooks = [];
    this.processingSequence.clear();
  }
}
