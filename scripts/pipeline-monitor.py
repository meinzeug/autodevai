#!/usr/bin/env python3

"""
AutoDev-AI Pipeline Monitor
Real-time monitoring and status dashboard for CI/CD pipeline
"""

import asyncio
import json
import time
import logging
import argparse
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import subprocess
import websockets
import signal

# Third-party imports (install with: pip install aiohttp GitPython)
try:
    import aiohttp
    import git
    from git import Repo
except ImportError as e:
    print(f"Missing required dependencies: {e}")
    print("Install with: pip install aiohttp GitPython")
    sys.exit(1)

class PipelineMonitor:
    """Real-time pipeline monitoring with WebSocket dashboard"""
    
    def __init__(self, repo_path: str = ".", check_interval: int = 30, port: int = 8080):
        self.repo_path = Path(repo_path)
        self.check_interval = check_interval
        self.port = port
        self.repo = None
        self.github_token = os.getenv('GITHUB_TOKEN')
        self.github_repo = os.getenv('GITHUB_REPOSITORY', '').split('/')
        
        # Status tracking
        self.pipeline_status = {
            'last_update': None,
            'workflows': {},
            'dependabot_prs': [],
            'security_status': {},
            'metrics': {
                'total_runs': 0,
                'success_rate': 0.0,
                'avg_duration': 0,
                'last_success': None,
                'last_failure': None
            }
        }
        
        # WebSocket clients
        self.clients = set()
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully"""
        self.logger.info(f"Received signal {signum}, shutting down...")
        asyncio.create_task(self.shutdown())

    async def initialize(self):
        """Initialize the monitor"""
        self.logger.info(f"Initializing Pipeline Monitor for {self.repo_path}")
        
        try:
            self.repo = Repo(self.repo_path)
            self.logger.info(f"Repository loaded: {self.repo.remotes.origin.url}")
        except Exception as e:
            self.logger.error(f"Failed to load repository: {e}")
            raise
        
        # Create reports directory
        reports_dir = self.repo_path / 'docs' / 'pipeline-reports'
        reports_dir.mkdir(parents=True, exist_ok=True)
        
        self.logger.info("Pipeline Monitor initialized successfully")

    async def start_monitoring(self):
        """Start the monitoring loop"""
        self.logger.info("Starting pipeline monitoring...")
        
        # Start WebSocket server
        websocket_task = asyncio.create_task(self.start_websocket_server())
        
        # Start monitoring loop
        monitor_task = asyncio.create_task(self.monitoring_loop())
        
        try:
            await asyncio.gather(websocket_task, monitor_task)
        except asyncio.CancelledError:
            self.logger.info("Monitoring cancelled")
        except Exception as e:
            self.logger.error(f"Monitoring error: {e}")
            raise

    async def monitoring_loop(self):
        """Main monitoring loop"""
        while True:
            try:
                self.logger.info("Checking pipeline status...")
                
                # Update all status components
                await self.update_workflow_status()
                await self.update_dependabot_status()
                await self.update_security_status()
                await self.update_metrics()
                
                # Broadcast updates to clients
                await self.broadcast_status()
                
                # Save status to file
                await self.save_status()
                
                self.pipeline_status['last_update'] = datetime.now().isoformat()
                
                await asyncio.sleep(self.check_interval)
                
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(self.check_interval)

    async def update_workflow_status(self):
        """Update GitHub workflow status"""
        if not self.github_token or len(self.github_repo) != 2:
            self.logger.warning("GitHub token or repository not configured")
            return
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'token {self.github_token}',
                    'Accept': 'application/vnd.github.v3+json'
                }
                
                # Get workflow runs
                owner, repo = self.github_repo
                url = f'https://api.github.com/repos/{owner}/{repo}/actions/runs'
                
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Process recent runs
                        recent_runs = data.get('workflow_runs', [])[:10]
                        
                        workflow_status = {}
                        for run in recent_runs:
                            workflow_name = run['name']
                            if workflow_name not in workflow_status:
                                workflow_status[workflow_name] = {
                                    'latest_run': run,
                                    'recent_runs': [],
                                    'success_rate': 0.0,
                                    'avg_duration': 0
                                }
                            
                            workflow_status[workflow_name]['recent_runs'].append({
                                'id': run['id'],
                                'status': run['status'],
                                'conclusion': run['conclusion'],
                                'created_at': run['created_at'],
                                'updated_at': run['updated_at'],
                                'duration': self._calculate_duration(
                                    run['created_at'], 
                                    run['updated_at']
                                )
                            })
                        
                        # Calculate metrics for each workflow
                        for workflow in workflow_status.values():
                            runs = workflow['recent_runs']
                            if runs:
                                successful = sum(1 for r in runs if r['conclusion'] == 'success')
                                workflow['success_rate'] = successful / len(runs) * 100
                                
                                completed_runs = [r for r in runs if r['duration'] > 0]
                                if completed_runs:
                                    workflow['avg_duration'] = sum(r['duration'] for r in completed_runs) / len(completed_runs)
                        
                        self.pipeline_status['workflows'] = workflow_status
                        
                    else:
                        self.logger.warning(f"Failed to fetch workflows: {response.status}")
                        
        except Exception as e:
            self.logger.error(f"Error updating workflow status: {e}")

    async def update_dependabot_status(self):
        """Update Dependabot PR status"""
        if not self.github_token or len(self.github_repo) != 2:
            return
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'token {self.github_token}',
                    'Accept': 'application/vnd.github.v3+json'
                }
                
                owner, repo = self.github_repo
                url = f'https://api.github.com/repos/{owner}/{repo}/pulls'
                params = {'state': 'open', 'per_page': 50}
                
                async with session.get(url, headers=headers, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        dependabot_prs = []
                        for pr in data:
                            if pr['user']['login'] == 'dependabot[bot]':
                                dependabot_prs.append({
                                    'number': pr['number'],
                                    'title': pr['title'],
                                    'created_at': pr['created_at'],
                                    'updated_at': pr['updated_at'],
                                    'state': pr['state'],
                                    'url': pr['html_url'],
                                    'mergeable': pr['mergeable'],
                                    'labels': [label['name'] for label in pr['labels']]
                                })
                        
                        self.pipeline_status['dependabot_prs'] = dependabot_prs
                        
        except Exception as e:
            self.logger.error(f"Error updating Dependabot status: {e}")

    async def update_security_status(self):
        """Update security scan status"""
        try:
            # Check for recent security reports
            reports_dir = self.repo_path / 'docs' / 'security-reports' / 'combined'
            
            if reports_dir.exists():
                # Find most recent security report
                json_reports = list(reports_dir.glob('security-report-*.json'))
                
                if json_reports:
                    latest_report = max(json_reports, key=lambda p: p.stat().st_mtime)
                    
                    with open(latest_report, 'r') as f:
                        security_data = json.load(f)
                    
                    self.pipeline_status['security_status'] = {
                        'last_scan': security_data.get('timestamp'),
                        'total_vulnerabilities': security_data.get('summary', {}).get('total_vulnerabilities', 0),
                        'status': security_data.get('summary', {}).get('status', 'UNKNOWN'),
                        'report_file': str(latest_report)
                    }
                else:
                    self.pipeline_status['security_status'] = {
                        'last_scan': None,
                        'status': 'NO_SCAN'
                    }
                    
        except Exception as e:
            self.logger.error(f"Error updating security status: {e}")

    async def update_metrics(self):
        """Update overall pipeline metrics"""
        try:
            workflows = self.pipeline_status.get('workflows', {})
            
            if workflows:
                # Calculate overall metrics
                all_runs = []
                for workflow in workflows.values():
                    all_runs.extend(workflow.get('recent_runs', []))
                
                if all_runs:
                    # Success rate
                    successful = sum(1 for run in all_runs if run['conclusion'] == 'success')
                    self.pipeline_status['metrics']['success_rate'] = successful / len(all_runs) * 100
                    
                    # Average duration
                    completed_runs = [run for run in all_runs if run['duration'] > 0]
                    if completed_runs:
                        avg_duration = sum(run['duration'] for run in completed_runs) / len(completed_runs)
                        self.pipeline_status['metrics']['avg_duration'] = avg_duration
                    
                    # Last success/failure
                    sorted_runs = sorted(all_runs, key=lambda r: r['updated_at'], reverse=True)
                    
                    for run in sorted_runs:
                        if run['conclusion'] == 'success' and not self.pipeline_status['metrics']['last_success']:
                            self.pipeline_status['metrics']['last_success'] = run['updated_at']
                        elif run['conclusion'] in ['failure', 'cancelled'] and not self.pipeline_status['metrics']['last_failure']:
                            self.pipeline_status['metrics']['last_failure'] = run['updated_at']
                    
                    self.pipeline_status['metrics']['total_runs'] = len(all_runs)
                    
        except Exception as e:
            self.logger.error(f"Error updating metrics: {e}")

    async def broadcast_status(self):
        """Broadcast status to all connected WebSocket clients"""
        if self.clients:
            message = json.dumps({
                'type': 'status_update',
                'data': self.pipeline_status
            })
            
            # Send to all clients
            disconnected = set()
            for client in self.clients:
                try:
                    await client.send(message)
                except websockets.exceptions.ConnectionClosed:
                    disconnected.add(client)
                except Exception as e:
                    self.logger.warning(f"Error sending to client: {e}")
                    disconnected.add(client)
            
            # Remove disconnected clients
            self.clients -= disconnected

    async def save_status(self):
        """Save current status to file"""
        try:
            status_file = self.repo_path / 'docs' / 'pipeline-reports' / 'current-status.json'
            
            with open(status_file, 'w') as f:
                json.dump(self.pipeline_status, f, indent=2, default=str)
                
        except Exception as e:
            self.logger.error(f"Error saving status: {e}")

    async def start_websocket_server(self):
        """Start WebSocket server for real-time updates"""
        async def handle_client(websocket, path):
            """Handle new WebSocket client connection"""
            self.clients.add(websocket)
            self.logger.info(f"New client connected. Total clients: {len(self.clients)}")
            
            try:
                # Send current status immediately
                await websocket.send(json.dumps({
                    'type': 'initial_status',
                    'data': self.pipeline_status
                }))
                
                # Keep connection alive
                async for message in websocket:
                    # Handle client messages if needed
                    try:
                        data = json.loads(message)
                        await self.handle_client_message(websocket, data)
                    except json.JSONDecodeError:
                        await websocket.send(json.dumps({
                            'type': 'error',
                            'message': 'Invalid JSON'
                        }))
                        
            except websockets.exceptions.ConnectionClosed:
                pass
            finally:
                self.clients.discard(websocket)
                self.logger.info(f"Client disconnected. Total clients: {len(self.clients)}")

        # Start server
        self.logger.info(f"Starting WebSocket server on port {self.port}")
        server = await websockets.serve(handle_client, "localhost", self.port)
        
        # Create dashboard HTML
        await self.create_dashboard()
        
        self.logger.info(f"Dashboard available at: http://localhost:{self.port}/dashboard")
        
        return server

    async def handle_client_message(self, websocket, data):
        """Handle messages from WebSocket clients"""
        message_type = data.get('type')
        
        if message_type == 'ping':
            await websocket.send(json.dumps({'type': 'pong'}))
        elif message_type == 'request_status':
            await websocket.send(json.dumps({
                'type': 'status_update',
                'data': self.pipeline_status
            }))

    async def create_dashboard(self):
        """Create HTML dashboard"""
        dashboard_html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AutoDev-AI Pipeline Monitor</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0d1117;
            color: #f0f6fc;
            line-height: 1.6;
        }}
        .container {{ max-width: 1400px; margin: 0 auto; padding: 20px; }}
        .header {{ 
            background: linear-gradient(135deg, #238636 0%, #2ea043 100%);
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
        }}
        .status-grid {{ 
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        .card {{ 
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }}
        .card h3 {{ 
            color: #f0f6fc;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .metric {{ text-align: center; margin: 16px 0; }}
        .metric-value {{ 
            font-size: 2.5rem;
            font-weight: bold;
            margin: 8px 0;
        }}
        .metric-label {{ color: #8b949e; font-size: 0.9rem; }}
        .status-indicator {{
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }}
        .status-success {{ background: #238636; }}
        .status-failure {{ background: #da3633; }}
        .status-pending {{ background: #f85149; }}
        .status-unknown {{ background: #6e7681; }}
        .pr-list {{ max-height: 300px; overflow-y: auto; }}
        .pr-item {{ 
            padding: 12px;
            margin: 8px 0;
            background: #0d1117;
            border-radius: 8px;
            border: 1px solid #30363d;
        }}
        .connection-status {{
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: bold;
        }}
        .connected {{ background: #238636; color: white; }}
        .disconnected {{ background: #da3633; color: white; }}
        .last-update {{ 
            color: #8b949e;
            font-size: 0.8rem;
            text-align: center;
            margin-top: 20px;
        }}
        .workflow-runs {{ 
            max-height: 200px;
            overflow-y: auto;
        }}
        .run-item {{
            display: flex;
            justify-content: between;
            align-items: center;
            padding: 8px;
            margin: 4px 0;
            background: #0d1117;
            border-radius: 6px;
            font-size: 0.85rem;
        }}
        .progress-bar {{
            width: 100%;
            height: 8px;
            background: #21262d;
            border-radius: 4px;
            overflow: hidden;
            margin: 8px 0;
        }}
        .progress-fill {{
            height: 100%;
            background: linear-gradient(90deg, #238636, #2ea043);
            transition: width 0.3s ease;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="connection-status" id="connectionStatus">Connecting...</div>
        
        <div class="header">
            <h1>🔧 AutoDev-AI Pipeline Monitor</h1>
            <p>Real-time CI/CD pipeline monitoring and status dashboard</p>
        </div>
        
        <div class="status-grid">
            <div class="card">
                <h3>📊 Pipeline Health</h3>
                <div class="metric">
                    <div class="metric-value" id="successRate">--</div>
                    <div class="metric-label">Success Rate</div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="successProgress" style="width: 0%"></div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 16px;">
                    <div>
                        <div style="color: #8b949e; font-size: 0.8rem;">Total Runs</div>
                        <div id="totalRuns">--</div>
                    </div>
                    <div>
                        <div style="color: #8b949e; font-size: 0.8rem;">Avg Duration</div>
                        <div id="avgDuration">--</div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h3>🔒 Security Status</h3>
                <div class="metric">
                    <div class="metric-value" id="vulnerabilities">--</div>
                    <div class="metric-label">Vulnerabilities</div>
                </div>
                <div id="securityStatus" style="text-align: center; margin-top: 16px;">
                    <span class="status-indicator status-unknown"></span>
                    <span id="securityStatusText">Unknown</span>
                </div>
                <div style="margin-top: 16px; color: #8b949e; font-size: 0.8rem; text-align: center;">
                    Last scan: <span id="lastScan">Never</span>
                </div>
            </div>
            
            <div class="card">
                <h3>🤖 Dependabot PRs</h3>
                <div class="metric">
                    <div class="metric-value" id="dependabotCount">--</div>
                    <div class="metric-label">Open PRs</div>
                </div>
                <div class="pr-list" id="dependabotList">
                    <div style="text-align: center; color: #8b949e; padding: 20px;">
                        Loading...
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h3>⚡ Recent Workflow Runs</h3>
            <div class="workflow-runs" id="workflowRuns">
                <div style="text-align: center; color: #8b949e; padding: 20px;">
                    Loading workflow data...
                </div>
            </div>
        </div>
        
        <div class="last-update">
            Last updated: <span id="lastUpdate">Never</span>
        </div>
    </div>

    <script>
        class PipelineMonitor {{
            constructor() {{
                this.ws = null;
                this.reconnectDelay = 1000;
                this.maxReconnectDelay = 30000;
                this.reconnectAttempts = 0;
                this.connect();
            }}
            
            connect() {{
                try {{
                    this.ws = new WebSocket('ws://localhost:{self.port}');
                    
                    this.ws.onopen = () => {{
                        console.log('Connected to pipeline monitor');
                        this.updateConnectionStatus(true);
                        this.reconnectAttempts = 0;
                        this.reconnectDelay = 1000;
                    }};
                    
                    this.ws.onmessage = (event) => {{
                        const message = JSON.parse(event.data);
                        this.handleMessage(message);
                    }};
                    
                    this.ws.onclose = () => {{
                        console.log('Disconnected from pipeline monitor');
                        this.updateConnectionStatus(false);
                        this.scheduleReconnect();
                    }};
                    
                    this.ws.onerror = (error) => {{
                        console.error('WebSocket error:', error);
                        this.updateConnectionStatus(false);
                    }};
                    
                }} catch (error) {{
                    console.error('Failed to connect:', error);
                    this.scheduleReconnect();
                }}
            }}
            
            scheduleReconnect() {{
                this.reconnectAttempts++;
                const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
                
                setTimeout(() => {{
                    console.log(`Reconnecting... (attempt ${{this.reconnectAttempts}})`);
                    this.connect();
                }}, delay);
            }}
            
            updateConnectionStatus(connected) {{
                const status = document.getElementById('connectionStatus');
                if (connected) {{
                    status.textContent = 'Connected';
                    status.className = 'connection-status connected';
                }} else {{
                    status.textContent = 'Disconnected';
                    status.className = 'connection-status disconnected';
                }}
            }}
            
            handleMessage(message) {{
                switch (message.type) {{
                    case 'initial_status':
                    case 'status_update':
                        this.updateDashboard(message.data);
                        break;
                    case 'error':
                        console.error('Server error:', message.message);
                        break;
                }}
            }}
            
            updateDashboard(data) {{
                // Update metrics
                const metrics = data.metrics || {{}};
                document.getElementById('successRate').textContent = 
                    metrics.success_rate ? `${{metrics.success_rate.toFixed(1)}}%` : '--';
                document.getElementById('successProgress').style.width = 
                    `${{metrics.success_rate || 0}}%`;
                document.getElementById('totalRuns').textContent = metrics.total_runs || '--';
                document.getElementById('avgDuration').textContent = 
                    metrics.avg_duration ? `${{Math.round(metrics.avg_duration)}s` : '--';
                
                // Update security status
                const security = data.security_status || {{}};
                document.getElementById('vulnerabilities').textContent = 
                    security.total_vulnerabilities || '--';
                
                const securityStatusEl = document.getElementById('securityStatus');
                const statusIndicator = securityStatusEl.querySelector('.status-indicator');
                const statusText = document.getElementById('securityStatusText');
                
                if (security.status === 'CLEAN') {{
                    statusIndicator.className = 'status-indicator status-success';
                    statusText.textContent = 'Clean';
                }} else if (security.status === 'VULNERABILITIES_FOUND') {{
                    statusIndicator.className = 'status-indicator status-failure';
                    statusText.textContent = 'Issues Found';
                }} else {{
                    statusIndicator.className = 'status-indicator status-unknown';
                    statusText.textContent = 'Unknown';
                }}
                
                document.getElementById('lastScan').textContent = 
                    security.last_scan ? new Date(security.last_scan).toLocaleString() : 'Never';
                
                // Update Dependabot PRs
                const dependabotPRs = data.dependabot_prs || [];
                document.getElementById('dependabotCount').textContent = dependabotPRs.length;
                
                const dependabotList = document.getElementById('dependabotList');
                if (dependabotPRs.length === 0) {{
                    dependabotList.innerHTML = '<div style="text-align: center; color: #8b949e; padding: 20px;">No open Dependabot PRs</div>';
                }} else {{
                    dependabotList.innerHTML = dependabotPRs.map(pr => `
                        <div class="pr-item">
                            <div style="font-weight: bold;">PR #${{pr.number}}</div>
                            <div style="font-size: 0.85rem; color: #8b949e; margin: 4px 0;">${{pr.title}}</div>
                            <div style="font-size: 0.75rem; color: #8b949e;">
                                Created: ${{new Date(pr.created_at).toLocaleDateString()}}
                            </div>
                        </div>
                    `).join('');
                }}
                
                // Update workflow runs
                const workflows = data.workflows || {{}};
                const workflowRuns = document.getElementById('workflowRuns');
                
                if (Object.keys(workflows).length === 0) {{
                    workflowRuns.innerHTML = '<div style="text-align: center; color: #8b949e; padding: 20px;">No workflow data available</div>';
                }} else {{
                    const runsHtml = Object.entries(workflows).map(([name, workflow]) => {{
                        const latestRun = workflow.latest_run || {{}};
                        const statusClass = latestRun.conclusion === 'success' ? 'status-success' : 
                                          latestRun.conclusion === 'failure' ? 'status-failure' : 'status-unknown';
                        
                        return `
                            <div class="run-item">
                                <div style="flex: 1;">
                                    <span class="status-indicator ${{statusClass}}"></span>
                                    ${{name}}
                                </div>
                                <div style="text-align: right; font-size: 0.8rem; color: #8b949e;">
                                    ${{latestRun.updated_at ? new Date(latestRun.updated_at).toLocaleString() : 'Unknown'}}
                                </div>
                            </div>
                        `;
                    }}).join('');
                    
                    workflowRuns.innerHTML = runsHtml;
                }}
                
                // Update last update time
                document.getElementById('lastUpdate').textContent = 
                    data.last_update ? new Date(data.last_update).toLocaleString() : 'Never';
            }}
        }}
        
        // Initialize monitor when page loads
        document.addEventListener('DOMContentLoaded', () => {{
            new PipelineMonitor();
        }});
    </script>
</body>
</html>"""
        
        dashboard_file = self.repo_path / 'docs' / 'pipeline-reports' / 'dashboard.html'
        with open(dashboard_file, 'w') as f:
            f.write(dashboard_html)

    def _calculate_duration(self, start_time: str, end_time: str) -> int:
        """Calculate duration between two ISO timestamps in seconds"""
        try:
            start = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            return int((end - start).total_seconds())
        except:
            return 0

    async def shutdown(self):
        """Graceful shutdown"""
        self.logger.info("Shutting down Pipeline Monitor...")
        
        # Close all WebSocket connections
        for client in self.clients.copy():
            try:
                await client.close()
            except:
                pass
        
        self.logger.info("Pipeline Monitor stopped")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='AutoDev-AI Pipeline Monitor')
    parser.add_argument('--repo', default='.', help='Repository path')
    parser.add_argument('--interval', type=int, default=30, help='Check interval in seconds')
    parser.add_argument('--port', type=int, default=8080, help='WebSocket server port')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    async def run_monitor():
        monitor = PipelineMonitor(
            repo_path=args.repo,
            check_interval=args.interval,
            port=args.port
        )
        
        try:
            await monitor.initialize()
            await monitor.start_monitoring()
        except KeyboardInterrupt:
            await monitor.shutdown()
        except Exception as e:
            logging.error(f"Monitor failed: {e}")
            sys.exit(1)
    
    # Run the monitor
    try:
        asyncio.run(run_monitor())
    except KeyboardInterrupt:
        print("\nMonitor stopped by user")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()