const dataService = require('./data.service');
const path = require('path');
const fs = require('fs');

class AnalyticsService {
    async getOverviewStats(range) {
        const logs = await dataService.read('logs');
        const now = new Date();
        const days = parseInt(range) || 30; // 7, 30, 90
        const cutoff = new Date(now.setDate(now.getDate() - days));

        let totalPosts = 0;
        let successCount = 0;
        let failCount = 0;
        const postsPerDay = {};

        logs.forEach(log => {
            const logDate = new Date(log.createdAt);
            if (logDate >= cutoff && log.type === 'post') {
                totalPosts++;
                if (log.status === 'success') successCount++;
                if (log.status === 'error') failCount++;
                
                const dateKey = logDate.toISOString().slice(0, 10);
                postsPerDay[dateKey] = (postsPerDay[dateKey] || 0) + 1;
            }
        });

        const successRate = totalPosts > 0 ? ((successCount / totalPosts) * 100).toFixed(1) : 0;

        return {
            totalPosts,
            successCount,
            failCount,
            successRate,
            postsPerDay
        };
    }

    async getPostingTrends(range) {
        const logs = await dataService.read('logs');
        // Group by day for the given range, separated by platform if possible
        // Actually, log entries might not have platform. They have 'target' or 'account'
        const trends = {};
        const now = new Date();
        const days = parseInt(range) || 30;
        const cutoff = new Date(now.setDate(now.getDate() - days));

        logs.forEach(log => {
            const logDate = new Date(log.createdAt);
            if (logDate >= cutoff && log.type === 'post') {
                const dateKey = logDate.toISOString().slice(0, 10);
                if (!trends[dateKey]) trends[dateKey] = { date: dateKey, value: 0 };
                trends[dateKey].value++;
            }
        });
        
        // Convert to array and sort by date
        return Object.values(trends).sort((a, b) => a.date.localeCompare(b.date));
    }

    async getFailuresAnalysis(range) {
        const logs = await dataService.read('logs');
        const now = new Date();
        const days = parseInt(range) || 30;
        const cutoff = new Date(now.setDate(now.getDate() - days));

        const errors = {};
        logs.forEach(log => {
            const logDate = new Date(log.createdAt);
            if (logDate >= cutoff && log.status === 'error') {
                // Approximate error reasoning from content or just mark generic
                let reason = 'Unknown';
                if (log.content.toLowerCase().includes('timeout')) reason = 'Timeout';
                else if (log.content.toLowerCase().includes('auth') || log.content.toLowerCase().includes('token')) reason = 'Auth Error';
                else if (log.content.toLowerCase().includes('rate limit')) reason = 'Rate Limit';
                else if (log.content.toLowerCase().includes('network')) reason = 'Network';

                errors[reason] = (errors[reason] || 0) + 1;
            }
        });

        return Object.entries(errors).map(([reason, count]) => ({ reason, count }));
    }

    async exportCSV(range) {
        // Just return a CSV string of recent logs for simplicity
        const logs = await dataService.read('logs');
        const now = new Date();
        const days = parseInt(range) || 30;
        const cutoff = new Date(now.setDate(now.getDate() - days));

        let csv = 'ID,Date,Type,Target,Status,Content\n';
        logs.forEach(log => {
            const logDate = new Date(log.createdAt);
            if (logDate >= cutoff) {
                // escape commas/quotes in content
                let content = (log.content || '').replace(/"/g, '""');
                csv += `${log.id},${log.createdAt},${log.type},${log.target},${log.status},"${content}"\n`;
            }
        });

        return csv;
    }
}

module.exports = new AnalyticsService();
