#!/usr/bin/env node

/**
 * AutoDev-AI Notification Manager
 * Comprehensive notification system for pipeline events
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

class NotificationManager {
    constructor(options = {}) {
        this.config = {
            slack: {
                webhook: options.slackWebhook || process.env.SLACK_WEBHOOK_URL,
                channel: options.slackChannel || '#autodev-ai',
                username: 'AutoDev-AI Bot',
                iconEmoji: ':robot_face:'
            },
            discord: {
                webhook: options.discordWebhook || process.env.DISCORD_WEBHOOK_URL
            },
            email: {
                enabled: false, // Not implemented in this version
                smtp: options.emailSMTP || process.env.EMAIL_SMTP,
                from: options.emailFrom || process.env.EMAIL_FROM,
                to: options.emailTo || process.env.EMAIL_TO
            },
            github: {
                token: options.githubToken || process.env.GITHUB_TOKEN,
                repository: options.githubRepo || process.env.GITHUB_REPOSITORY
            },
            templates: {},
            retryAttempts: 3,
            retryDelay: 1000
        };

        this.loadTemplates();
    }

    /**
     * Load notification templates
     */
    async loadTemplates() {
        const templatesPath = path.join(__dirname, '..', 'docs', 'notification-templates.json');
        
        try {
            const data = await fs.readFile(templatesPath, 'utf8');
            this.config.templates = JSON.parse(data);
        } catch (error) {
            console.log('Templates file not found, using defaults');
            await this.createDefaultTemplates();
        }
    }

    /**
     * Create default notification templates
     */
    async createDefaultTemplates() {
        const templates = {
            pipeline_success: {
                title: "✅ Pipeline Success",
                slack: {
                    color: "good",
                    text: "Pipeline completed successfully",
                    fields: [
                        { title: "Status", value: "Success", short: true },
                        { title: "Duration", value: "{{duration}}", short: true },
                        { title: "Branch", value: "{{branch}}", short: true },
                        { title: "Commit", value: "{{commit}}", short: true }
                    ]
                }
            },
            pipeline_failure: {
                title: "❌ Pipeline Failure",
                slack: {
                    color: "danger",
                    text: "Pipeline failed - immediate attention required",
                    fields: [
                        { title: "Status", value: "Failed", short: true },
                        { title: "Error", value: "{{error}}", short: false },
                        { title: "Branch", value: "{{branch}}", short: true },
                        { title: "Commit", value: "{{commit}}", short: true }
                    ]
                }
            },
            security_alert: {
                title: "🔒 Security Alert",
                slack: {
                    color: "warning",
                    text: "Security vulnerabilities detected",
                    fields: [
                        { title: "Vulnerabilities", value: "{{vuln_count}}", short: true },
                        { title: "Severity", value: "{{severity}}", short: true },
                        { title: "Auto-fixed", value: "{{auto_fixed}}", short: true }
                    ]
                }
            },
            dependabot_summary: {
                title: "🤖 Dependabot Summary",
                slack: {
                    color: "#0366d6",
                    text: "Dependabot PR processing completed",
                    fields: [
                        { title: "Merged", value: "{{merged_count}}", short: true },
                        { title: "Failed", value: "{{failed_count}}", short: true },
                        { title: "Skipped", value: "{{skipped_count}}", short: true }
                    ]
                }
            },
            maintenance_start: {
                title: "🔧 Maintenance Started",
                slack: {
                    color: "#36a64f",
                    text: "Daily maintenance pipeline has started",
                    fields: [
                        { title: "Run ID", value: "{{run_id}}", short: true },
                        { title: "Mode", value: "{{mode}}", short: true }
                    ]
                }
            },
            maintenance_complete: {
                title: "✨ Maintenance Complete",
                slack: {
                    color: "good",
                    text: "Daily maintenance pipeline completed successfully",
                    fields: [
                        { title: "PRs Merged", value: "{{merged_prs}}", short: true },
                        { title: "Security Fixes", value: "{{security_fixes}}", short: true },
                        { title: "Duration", value: "{{duration}}", short: true }
                    ]
                }
            },
            rollback_initiated: {
                title: "🚨 Rollback Initiated",
                slack: {
                    color: "danger",
                    text: "System rollback has been initiated",
                    fields: [
                        { title: "Reason", value: "{{reason}}", short: false },
                        { title: "Snapshot", value: "{{snapshot_id}}", short: true },
                        { title: "Initiated By", value: "{{user}}", short: true }
                    ]
                }
            },
            health_check: {
                title: "💓 Health Check",
                slack: {
                    color: "{{health_color}}",
                    text: "System health check completed",
                    fields: [
                        { title: "Health Score", value: "{{health_score}}/100", short: true },
                        { title: "Status", value: "{{health_status}}", short: true },
                        { title: "Issues", value: "{{issues_count}}", short: true }
                    ]
                }
            }
        };

        this.config.templates = templates;

        // Save templates to file
        const templatesPath = path.join(__dirname, '..', 'docs', 'notification-templates.json');
        await fs.mkdir(path.dirname(templatesPath), { recursive: true });
        await fs.writeFile(templatesPath, JSON.stringify(templates, null, 2));
    }

    /**
     * Send notification using the specified template and data
     */
    async notify(templateName, data = {}, options = {}) {
        console.log(`📢 Sending notification: ${templateName}`);
        
        const template = this.config.templates[templateName];
        if (!template) {
            throw new Error(`Template '${templateName}' not found`);
        }

        const results = {
            slack: null,
            discord: null,
            github: null,
            success: false
        };

        // Send to Slack
        if (this.config.slack.webhook && !options.skipSlack) {
            try {
                results.slack = await this.sendSlackNotification(template, data);
            } catch (error) {
                console.error('Slack notification failed:', error.message);
                results.slack = { error: error.message };
            }
        }

        // Send to Discord
        if (this.config.discord.webhook && !options.skipDiscord) {
            try {
                results.discord = await this.sendDiscordNotification(template, data);
            } catch (error) {
                console.error('Discord notification failed:', error.message);
                results.discord = { error: error.message };
            }
        }

        // Create GitHub issue for critical notifications
        if (this.config.github.token && options.createGithubIssue) {
            try {
                results.github = await this.createGithubIssue(template, data);
            } catch (error) {
                console.error('GitHub issue creation failed:', error.message);
                results.github = { error: error.message };
            }
        }

        results.success = results.slack?.success || results.discord?.success || results.github?.success;
        
        // Log notification result
        await this.logNotification(templateName, data, results);
        
        return results;
    }

    /**
     * Send Slack notification
     */
    async sendSlackNotification(template, data) {
        if (!this.config.slack.webhook) {
            throw new Error('Slack webhook URL not configured');
        }

        const message = this.renderTemplate(template.slack, data);
        
        const payload = {
            channel: this.config.slack.channel,
            username: this.config.slack.username,
            icon_emoji: this.config.slack.iconEmoji,
            text: template.title,
            attachments: [{
                ...message,
                footer: "AutoDev-AI Pipeline",
                footer_icon: "https://github.com/meinzeug/autodevai/raw/main/src/assets/icon.png",
                ts: Math.floor(Date.now() / 1000)
            }]
        };

        return await this.sendWebhookRequest(this.config.slack.webhook, payload);
    }

    /**
     * Send Discord notification
     */
    async sendDiscordNotification(template, data) {
        if (!this.config.discord.webhook) {
            throw new Error('Discord webhook URL not configured');
        }

        const message = this.renderTemplate(template.slack, data); // Reuse Slack template format
        
        const embed = {
            title: template.title,
            description: message.text,
            color: this.getDiscordColor(message.color),
            fields: message.fields?.map(field => ({
                name: field.title,
                value: field.value,
                inline: field.short
            })) || [],
            footer: {
                text: "AutoDev-AI Pipeline"
            },
            timestamp: new Date().toISOString()
        };

        const payload = {
            username: "AutoDev-AI Bot",
            avatar_url: "https://github.com/meinzeug/autodevai/raw/main/src/assets/icon.png",
            embeds: [embed]
        };

        return await this.sendWebhookRequest(this.config.discord.webhook, payload);
    }

    /**
     * Create GitHub issue for critical notifications
     */
    async createGithubIssue(template, data) {
        if (!this.config.github.token || !this.config.github.repository) {
            throw new Error('GitHub configuration missing');
        }

        const [owner, repo] = this.config.github.repository.split('/');
        const renderedTemplate = this.renderTemplate(template.slack, data);
        
        const issueBody = `## ${template.title}

${renderedTemplate.text}

### Details
${renderedTemplate.fields?.map(field => `- **${field.title}:** ${field.value}`).join('\n') || 'No additional details'}

### Actions Required
- [ ] Investigate the issue
- [ ] Apply necessary fixes
- [ ] Verify resolution
- [ ] Close this issue

---
*This issue was automatically created by AutoDev-AI Pipeline*`;

        const issueData = {
            title: `${template.title} - ${new Date().toISOString().split('T')[0]}`,
            body: issueBody,
            labels: ['automated', 'pipeline', this.getSeverityLabel(template.title)]
        };

        const options = {
            hostname: 'api.github.com',
            path: `/repos/${owner}/${repo}/issues`,
            method: 'POST',
            headers: {
                'Authorization': `token ${this.config.github.token}`,
                'User-Agent': 'AutoDev-AI-Bot',
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            }
        };

        return await this.sendHttpsRequest(options, JSON.stringify(issueData));
    }

    /**
     * Render template with data substitution
     */
    renderTemplate(template, data) {
        const rendered = JSON.parse(JSON.stringify(template)); // Deep clone
        
        const substitute = (obj) => {
            if (typeof obj === 'string') {
                return obj.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                    return data[key] || match;
                });
            } else if (Array.isArray(obj)) {
                return obj.map(substitute);
            } else if (typeof obj === 'object' && obj !== null) {
                const result = {};
                for (const [key, value] of Object.entries(obj)) {
                    result[key] = substitute(value);
                }
                return result;
            }
            return obj;
        };

        return substitute(rendered);
    }

    /**
     * Convert Slack color to Discord color
     */
    getDiscordColor(slackColor) {
        const colors = {
            'good': 0x36a64f,
            'warning': 0xff9900,
            'danger': 0xff0000,
            '#36a64f': 0x36a64f,
            '#0366d6': 0x0366d6
        };
        
        return colors[slackColor] || 0x808080;
    }

    /**
     * Get severity label for GitHub issues
     */
    getSeverityLabel(title) {
        if (title.includes('❌') || title.includes('🚨')) {
            return 'critical';
        } else if (title.includes('⚠️') || title.includes('🔒')) {
            return 'warning';
        }
        return 'info';
    }

    /**
     * Send webhook request with retry logic
     */
    async sendWebhookRequest(webhookUrl, payload) {
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                const result = await this.sendHttpsRequest(
                    new URL(webhookUrl),
                    JSON.stringify(payload)
                );
                
                return { success: true, response: result };
            } catch (error) {
                console.error(`Webhook attempt ${attempt} failed:`, error.message);
                
                if (attempt < this.config.retryAttempts) {
                    await this.sleep(this.config.retryDelay * attempt);
                } else {
                    throw error;
                }
            }
        }
    }

    /**
     * Send HTTPS request
     */
    async sendHttpsRequest(options, data) {
        return new Promise((resolve, reject) => {
            let requestOptions;
            
            if (options instanceof URL) {
                requestOptions = {
                    hostname: options.hostname,
                    path: options.pathname + options.search,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(data)
                    }
                };
            } else {
                requestOptions = options;
                if (!requestOptions.headers) {
                    requestOptions.headers = {};
                }
                requestOptions.headers['Content-Length'] = Buffer.byteLength(data);
            }

            const req = https.request(requestOptions, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ statusCode: res.statusCode, data: responseData });
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    /**
     * Log notification for audit purposes
     */
    async logNotification(templateName, data, results) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            template: templateName,
            data: data,
            results: results,
            success: results.success
        };

        const logPath = path.join(__dirname, '..', 'docs', 'pipeline-reports', 'notifications.log');
        const logLine = JSON.stringify(logEntry) + '\n';
        
        try {
            await fs.mkdir(path.dirname(logPath), { recursive: true });
            await fs.appendFile(logPath, logLine);
        } catch (error) {
            console.error('Failed to log notification:', error.message);
        }
    }

    /**
     * Utility function to sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Send maintenance pipeline notifications
     */
    async sendMaintenanceNotifications(stage, data) {
        const templates = {
            start: 'maintenance_start',
            complete: 'maintenance_complete',
            failure: 'pipeline_failure'
        };

        const template = templates[stage];
        if (!template) {
            throw new Error(`Unknown maintenance stage: ${stage}`);
        }

        const options = {
            createGithubIssue: stage === 'failure'
        };

        return await this.notify(template, data, options);
    }

    /**
     * Send security notifications
     */
    async sendSecurityAlert(vulnerabilityData) {
        const data = {
            vuln_count: vulnerabilityData.total_vulnerabilities || 0,
            severity: vulnerabilityData.max_severity || 'Unknown',
            auto_fixed: vulnerabilityData.auto_fixed || 0
        };

        const options = {
            createGithubIssue: data.vuln_count > 0
        };

        return await this.notify('security_alert', data, options);
    }

    /**
     * Send Dependabot summary
     */
    async sendDependabotSummary(summaryData) {
        return await this.notify('dependabot_summary', summaryData);
    }

    /**
     * Send rollback notifications
     */
    async sendRollbackNotification(rollbackData) {
        const options = {
            createGithubIssue: true // Always create issue for rollbacks
        };

        return await this.notify('rollback_initiated', rollbackData, options);
    }

    /**
     * Send health check notifications
     */
    async sendHealthCheckNotification(healthData) {
        // Determine color based on health score
        if (healthData.health_score >= 80) {
            healthData.health_color = 'good';
            healthData.health_status = 'Healthy';
        } else if (healthData.health_score >= 60) {
            healthData.health_color = 'warning';
            healthData.health_status = 'Degraded';
        } else {
            healthData.health_color = 'danger';
            healthData.health_status = 'Critical';
        }

        const options = {
            createGithubIssue: healthData.health_score < 60
        };

        return await this.notify('health_check', healthData, options);
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log('Usage: node notification-manager.js <template> [data-json]');
        console.log('Templates: pipeline_success, pipeline_failure, security_alert, etc.');
        process.exit(1);
    }

    const templateName = args[0];
    const data = args[1] ? JSON.parse(args[1]) : {};

    const notificationManager = new NotificationManager();
    
    notificationManager.notify(templateName, data)
        .then(result => {
            console.log('✅ Notification sent successfully');
            console.log(JSON.stringify(result, null, 2));
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Notification failed:', error.message);
            process.exit(1);
        });
}

module.exports = NotificationManager;