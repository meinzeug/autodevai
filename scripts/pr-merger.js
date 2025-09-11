#!/usr/bin/env node

/**
 * AutoDev-AI Intelligent PR Merger
 * Safely analyzes and merges Dependabot PRs with comprehensive safety checks
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');

class PRMerger {
    constructor(options = {}) {
        this.octokit = new Octokit({
            auth: options.token || process.env.GITHUB_TOKEN,
        });
        
        this.owner = options.owner || process.env.GITHUB_REPOSITORY?.split('/')[0];
        this.repo = options.repo || process.env.GITHUB_REPOSITORY?.split('/')[1];
        this.dryRun = options.dryRun || false;
        this.forceMerge = options.forceMerge || false;
        this.maxFilesChanged = options.maxFilesChanged || 10;
        this.reportsDir = path.join(process.cwd(), 'docs', 'pipeline-reports');
        
        if (!this.owner || !this.repo) {
            throw new Error('Repository owner and name must be provided');
        }
        
        this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    }

    /**
     * Main entry point for PR merging
     */
    async run() {
        console.log(`🤖 Starting AutoDev-AI PR Merger`);
        console.log(`📍 Repository: ${this.owner}/${this.repo}`);
        console.log(`🔄 Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
        console.log(`⚡ Force merge: ${this.forceMerge}`);
        
        try {
            await this.ensureReportsDirectory();
            
            const dependabotPRs = await this.getDependabotPRs();
            console.log(`📋 Found ${dependabotPRs.length} Dependabot PRs`);
            
            if (dependabotPRs.length === 0) {
                console.log('✅ No Dependabot PRs to process');
                return { merged: 0, failed: 0, skipped: 0 };
            }
            
            const results = await this.processPRs(dependabotPRs);
            await this.generateReport(results);
            
            return results.summary;
            
        } catch (error) {
            console.error('❌ Error in PR merger:', error.message);
            throw error;
        }
    }

    /**
     * Get all open Dependabot PRs
     */
    async getDependabotPRs() {
        console.log('🔍 Fetching Dependabot PRs...');
        
        const { data: prs } = await this.octokit.pulls.list({
            owner: this.owner,
            repo: this.repo,
            state: 'open',
            sort: 'created',
            direction: 'asc',
            per_page: 100
        });
        
        return prs.filter(pr => 
            pr.user.login === 'dependabot[bot]' &&
            pr.labels.some(label => label.name === 'dependencies')
        );
    }

    /**
     * Process all PRs with safety checks
     */
    async processPRs(prs) {
        const results = {
            processed: [],
            summary: { merged: 0, failed: 0, skipped: 0 }
        };
        
        for (const pr of prs) {
            console.log(`\n🔍 Processing PR #${pr.number}: ${pr.title}`);
            
            try {
                const analysis = await this.analyzePR(pr);
                const result = await this.processSinglePR(pr, analysis);
                
                results.processed.push(result);
                results.summary[result.action]++;
                
            } catch (error) {
                console.error(`❌ Error processing PR #${pr.number}:`, error.message);
                results.processed.push({
                    pr: pr.number,
                    title: pr.title,
                    action: 'failed',
                    reason: error.message,
                    timestamp: new Date().toISOString()
                });
                results.summary.failed++;
            }
        }
        
        return results;
    }

    /**
     * Analyze a single PR for safety
     */
    async analyzePR(pr) {
        console.log(`  🔍 Analyzing PR safety...`);
        
        const analysis = {
            safe: true,
            reasons: [],
            metadata: {
                filesChanged: 0,
                hasBreakingChanges: false,
                updateType: 'unknown',
                ciStatus: 'unknown',
                reviewStatus: 'unknown'
            }
        };

        // Check for breaking changes in title/description
        const breakingKeywords = [
            'breaking', 'breaking change', 'major', 'incompatible', 
            'migration', 'removed', 'deprecated'
        ];
        
        const text = `${pr.title} ${pr.body || ''}`.toLowerCase();
        
        for (const keyword of breakingKeywords) {
            if (text.includes(keyword)) {
                analysis.safe = false;
                analysis.reasons.push(`Contains breaking change keyword: '${keyword}'`);
                analysis.metadata.hasBreakingChanges = true;
            }
        }

        // Analyze update type from title
        const majorUpdatePattern = /bump.*from.*\d+\.\d+\.\d+.*to.*(\d+)\./i;
        const minorUpdatePattern = /bump.*from.*\d+\.(\d+)\.\d+.*to.*\d+\.(\d+)\./i;
        
        if (majorUpdatePattern.test(pr.title)) {
            analysis.metadata.updateType = 'major';
            if (!this.forceMerge) {
                analysis.safe = false;
                analysis.reasons.push('Major version update requires manual review');
            }
        } else if (minorUpdatePattern.test(pr.title)) {
            analysis.metadata.updateType = 'minor';
        } else {
            analysis.metadata.updateType = 'patch';
        }

        // Check files changed
        const { data: files } = await this.octokit.pulls.listFiles({
            owner: this.owner,
            repo: this.repo,
            pull_number: pr.number
        });
        
        analysis.metadata.filesChanged = files.length;
        
        if (files.length > this.maxFilesChanged) {
            analysis.safe = false;
            analysis.reasons.push(`Too many files changed: ${files.length} > ${this.maxFilesChanged}`);
        }

        // Check for sensitive file modifications
        const sensitiveFiles = [
            'package.json', 'Cargo.toml', 'Dockerfile', 
            'docker-compose.yml', '.github/workflows/',
            'security.md', 'SECURITY.md'
        ];
        
        for (const file of files) {
            for (const sensitivePattern of sensitiveFiles) {
                if (file.filename.includes(sensitivePattern) && file.changes > 10) {
                    analysis.safe = false;
                    analysis.reasons.push(`Significant changes to sensitive file: ${file.filename}`);
                }
            }
        }

        // Check CI status
        try {
            const { data: checks } = await this.octokit.checks.listForRef({
                owner: this.owner,
                repo: this.repo,
                ref: pr.head.sha
            });
            
            const failedChecks = checks.check_runs.filter(check => 
                check.status === 'completed' && check.conclusion !== 'success'
            );
            
            if (failedChecks.length > 0 && !this.forceMerge) {
                analysis.safe = false;
                analysis.reasons.push(`CI checks failing: ${failedChecks.map(c => c.name).join(', ')}`);
                analysis.metadata.ciStatus = 'failed';
            } else {
                analysis.metadata.ciStatus = 'passed';
            }
        } catch (error) {
            console.log(`  ⚠️  Could not check CI status: ${error.message}`);
            analysis.metadata.ciStatus = 'unknown';
        }

        // Check for required reviews
        try {
            const { data: reviews } = await this.octokit.pulls.listReviews({
                owner: this.owner,
                repo: this.repo,
                pull_number: pr.number
            });
            
            const approvedReviews = reviews.filter(review => review.state === 'APPROVED');
            const requestedChanges = reviews.filter(review => review.state === 'CHANGES_REQUESTED');
            
            if (requestedChanges.length > 0 && !this.forceMerge) {
                analysis.safe = false;
                analysis.reasons.push('Changes requested in reviews');
                analysis.metadata.reviewStatus = 'changes_requested';
            } else if (approvedReviews.length > 0) {
                analysis.metadata.reviewStatus = 'approved';
            } else {
                analysis.metadata.reviewStatus = 'pending';
            }
        } catch (error) {
            console.log(`  ⚠️  Could not check review status: ${error.message}`);
            analysis.metadata.reviewStatus = 'unknown';
        }

        return analysis;
    }

    /**
     * Process a single PR based on analysis
     */
    async processSinglePR(pr, analysis) {
        const result = {
            pr: pr.number,
            title: pr.title,
            action: 'skipped',
            reason: 'Unknown',
            analysis: analysis,
            timestamp: new Date().toISOString()
        };

        if (!analysis.safe) {
            result.action = 'skipped';
            result.reason = analysis.reasons.join('; ');
            console.log(`  ⏭️  Skipping: ${result.reason}`);
            return result;
        }

        if (this.dryRun) {
            result.action = 'merged';
            result.reason = 'DRY RUN - Would have merged';
            console.log(`  🔍 DRY RUN - Would merge PR #${pr.number}`);
            return result;
        }

        try {
            // Attempt to merge
            const { data: mergeResult } = await this.octokit.pulls.merge({
                owner: this.owner,
                repo: this.repo,
                pull_number: pr.number,
                commit_title: `Auto-merge: ${pr.title}`,
                commit_message: `Automatically merged by AutoDev-AI PR Merger\n\nUpdate type: ${analysis.metadata.updateType}\nFiles changed: ${analysis.metadata.filesChanged}\nCI status: ${analysis.metadata.ciStatus}\n\nMerge ID: ${this.timestamp}`,
                merge_method: 'squash'
            });

            result.action = 'merged';
            result.reason = 'Successfully merged';
            result.mergeCommit = mergeResult.sha;
            
            console.log(`  ✅ Successfully merged PR #${pr.number}`);
            
        } catch (error) {
            result.action = 'failed';
            result.reason = `Merge failed: ${error.message}`;
            
            console.log(`  ❌ Failed to merge PR #${pr.number}: ${error.message}`);
        }

        return result;
    }

    /**
     * Generate comprehensive report
     */
    async generateReport(results) {
        console.log('\n📊 Generating PR merger report...');
        
        const reportData = {
            timestamp: new Date().toISOString(),
            repository: `${this.owner}/${this.repo}`,
            configuration: {
                dryRun: this.dryRun,
                forceMerge: this.forceMerge,
                maxFilesChanged: this.maxFilesChanged
            },
            summary: results.summary,
            processed: results.processed,
            statistics: this.calculateStatistics(results.processed)
        };

        // Write JSON report
        const jsonReport = path.join(this.reportsDir, `pr-merger-${this.timestamp}.json`);
        await fs.writeFile(jsonReport, JSON.stringify(reportData, null, 2));

        // Write Markdown report
        const markdownReport = await this.generateMarkdownReport(reportData);
        const mdReport = path.join(this.reportsDir, `pr-merger-${this.timestamp}.md`);
        await fs.writeFile(mdReport, markdownReport);

        console.log(`📄 Reports generated:`);
        console.log(`  - JSON: ${jsonReport}`);
        console.log(`  - Markdown: ${mdReport}`);

        // Summary
        console.log(`\n📈 Summary:`);
        console.log(`  - Merged: ${results.summary.merged}`);
        console.log(`  - Failed: ${results.summary.failed}`);
        console.log(`  - Skipped: ${results.summary.skipped}`);
    }

    /**
     * Calculate processing statistics
     */
    calculateStatistics(processed) {
        const stats = {
            byUpdateType: { major: 0, minor: 0, patch: 0, unknown: 0 },
            byAction: { merged: 0, failed: 0, skipped: 0 },
            avgFilesChanged: 0,
            totalFilesChanged: 0,
            mostCommonSkipReasons: {}
        };

        let totalFiles = 0;

        for (const item of processed) {
            // Update type stats
            const updateType = item.analysis?.metadata?.updateType || 'unknown';
            stats.byUpdateType[updateType]++;

            // Action stats
            stats.byAction[item.action]++;

            // Files changed
            const filesChanged = item.analysis?.metadata?.filesChanged || 0;
            totalFiles += filesChanged;

            // Skip reasons
            if (item.action === 'skipped') {
                const reason = item.reason;
                stats.mostCommonSkipReasons[reason] = (stats.mostCommonSkipReasons[reason] || 0) + 1;
            }
        }

        stats.avgFilesChanged = processed.length > 0 ? totalFiles / processed.length : 0;
        stats.totalFilesChanged = totalFiles;

        return stats;
    }

    /**
     * Generate Markdown report
     */
    async generateMarkdownReport(data) {
        return `# 🤖 AutoDev-AI PR Merger Report

**Generated:** ${data.timestamp}  
**Repository:** ${data.repository}  
**Mode:** ${data.configuration.dryRun ? 'DRY RUN' : 'LIVE'}

## 📊 Summary

| Action | Count |
|--------|-------|
| ✅ Merged | ${data.summary.merged} |
| ❌ Failed | ${data.summary.failed} |
| ⏭️ Skipped | ${data.summary.skipped} |
| **Total** | **${data.summary.merged + data.summary.failed + data.summary.skipped}** |

## 📈 Statistics

### Update Types Processed
| Type | Count |
|------|-------|
| Major | ${data.statistics.byUpdateType.major} |
| Minor | ${data.statistics.byUpdateType.minor} |
| Patch | ${data.statistics.byUpdateType.patch} |
| Unknown | ${data.statistics.byUpdateType.unknown} |

### Files Changed
- **Total files modified:** ${data.statistics.totalFilesChanged}
- **Average per PR:** ${data.statistics.avgFilesChanged.toFixed(1)}

### Most Common Skip Reasons
${Object.entries(data.statistics.mostCommonSkipReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => `- ${reason}: ${count}`)
    .join('\n')}

## 🔍 Detailed Results

${data.processed.map(item => `### PR #${item.pr}: ${item.title}

**Action:** ${item.action}  
**Reason:** ${item.reason}  
**Update Type:** ${item.analysis?.metadata?.updateType || 'unknown'}  
**Files Changed:** ${item.analysis?.metadata?.filesChanged || 0}  
**CI Status:** ${item.analysis?.metadata?.ciStatus || 'unknown'}  

${item.analysis?.safe === false ? '**Safety Issues:**\n' + item.analysis.reasons.map(r => `- ${r}`).join('\n') : '✅ All safety checks passed'}

---`).join('\n\n')}

## ⚙️ Configuration

- **Dry Run:** ${data.configuration.dryRun}
- **Force Merge:** ${data.configuration.forceMerge}
- **Max Files Changed:** ${data.configuration.maxFilesChanged}

## 🚀 Next Steps

${data.summary.failed > 0 ? `- Review ${data.summary.failed} failed merge(s) and resolve issues` : ''}
${data.summary.skipped > 0 ? `- Consider manual review of ${data.summary.skipped} skipped PR(s)` : ''}
${data.summary.merged > 0 ? `- Monitor ${data.summary.merged} merged PR(s) for any issues` : ''}

---
*Generated by AutoDev-AI PR Merger v1.0.0*`;
    }

    /**
     * Ensure reports directory exists
     */
    async ensureReportsDirectory() {
        try {
            await fs.mkdir(this.reportsDir, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        dryRun: args.includes('--dry-run'),
        forceMerge: args.includes('--force'),
        token: process.env.GITHUB_TOKEN
    };

    // Parse max files option
    const maxFilesIndex = args.indexOf('--max-files');
    if (maxFilesIndex !== -1 && args[maxFilesIndex + 1]) {
        options.maxFilesChanged = parseInt(args[maxFilesIndex + 1]);
    }

    const merger = new PRMerger(options);
    
    merger.run()
        .then(summary => {
            console.log('\n✅ PR merger completed successfully');
            process.exit(summary.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('\n❌ PR merger failed:', error.message);
            process.exit(1);
        });
}

module.exports = PRMerger;