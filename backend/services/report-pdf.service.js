// ============================================================
// White-Label PDF Report Service
// Generate branded analytics reports for agency clients
// ============================================================

const dataService = require('./data.service');
const crypto = require('crypto');

class ReportPDFService {

    async getReports() {
        return await dataService.read('pdf_reports') || [];
    }

    async getReport(id) {
        const reports = await this.getReports();
        return reports.find(r => r.id === id) || null;
    }

    async generateReport(data) {
        const reports = await this.getReports();
        const logs = await dataService.getAll('logs') || [];

        // Collect analytics data
        const range = data.range || 30;
        const cutoff = Date.now() - range * 86400000;
        const recentLogs = logs.filter(l => l.createdAt && new Date(l.createdAt).getTime() > cutoff);

        const totalPosts = recentLogs.length;
        const totalLikes = recentLogs.reduce((s, l) => s + (l.likes || 0), 0);
        const totalComments = recentLogs.reduce((s, l) => s + (l.comments || 0), 0);
        const totalShares = recentLogs.reduce((s, l) => s + (l.shares || 0), 0);
        const totalReach = recentLogs.reduce((s, l) => s + (l.reach || 0), 0);
        const avgEngagement = totalPosts > 0
            ? Math.round(((totalLikes + totalComments * 2 + totalShares * 3) / Math.max(totalReach, 1)) * 10000) / 100
            : 0;

        // Platform breakdown
        const platformBreakdown = {};
        recentLogs.forEach(l => {
            const p = l.platform || 'facebook';
            if (!platformBreakdown[p]) platformBreakdown[p] = { posts: 0, likes: 0, comments: 0, shares: 0, reach: 0 };
            platformBreakdown[p].posts++;
            platformBreakdown[p].likes += l.likes || 0;
            platformBreakdown[p].comments += l.comments || 0;
            platformBreakdown[p].shares += l.shares || 0;
            platformBreakdown[p].reach += l.reach || 0;
        });

        // Top 5 posts
        const topPosts = [...recentLogs]
            .map(l => ({ ...l, score: (l.likes || 0) + (l.comments || 0) * 2 + (l.shares || 0) * 3 }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(l => ({
                content: (l.content || '').substring(0, 100),
                platform: l.platform || 'facebook',
                likes: l.likes || 0,
                comments: l.comments || 0,
                shares: l.shares || 0,
                reach: l.reach || 0,
                date: l.createdAt
            }));

        // Daily trend
        const dailyTrend = {};
        recentLogs.forEach(l => {
            const day = l.createdAt?.split('T')[0];
            if (day) {
                if (!dailyTrend[day]) dailyTrend[day] = { posts: 0, engagement: 0 };
                dailyTrend[day].posts++;
                dailyTrend[day].engagement += (l.likes || 0) + (l.comments || 0) + (l.shares || 0);
            }
        });

        const report = {
            id: crypto.randomUUID(),
            title: data.title || `Social Media Report - ${range} Days`,
            branding: {
                companyName: data.companyName || 'SocialHub',
                clientName: data.clientName || '',
                logoUrl: data.logoUrl || null,
                primaryColor: data.primaryColor || '#1e3a5f',
                accentColor: data.accentColor || '#38bdf8'
            },
            period: {
                days: range,
                from: new Date(cutoff).toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0]
            },
            summary: {
                totalPosts,
                totalLikes,
                totalComments,
                totalShares,
                totalReach,
                avgEngagement,
                totalEngagement: totalLikes + totalComments + totalShares
            },
            platformBreakdown,
            topPosts,
            dailyTrend,
            recommendations: this._generateRecommendations(totalPosts, avgEngagement, platformBreakdown),
            format: data.format || 'html', // html | structured
            status: 'generated',
            generatedAt: new Date().toISOString()
        };

        reports.push(report);
        await dataService.write('pdf_reports', reports);
        return report;
    }

    // Generate HTML report (can be printed to PDF via browser)
    async getReportHTML(id) {
        const report = await this.getReport(id);
        if (!report) throw new Error('Report not found');

        const b = report.branding;
        const s = report.summary;
        const platformIcons = { facebook: '📘', instagram: '📸', twitter: '🐦', linkedin: '💼', tiktok: '🎵', youtube: '📺' };

        return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>${report.title}</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; color: #1a1a2e; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${b.primaryColor}; padding-bottom: 20px; margin-bottom: 32px; }
    .header h1 { font-size: 24px; color: ${b.primaryColor}; }
    .header .meta { text-align: right; font-size: 12px; color: #666; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
    .kpi { background: ${b.primaryColor}08; border: 1px solid ${b.primaryColor}20; border-radius: 12px; padding: 20px; text-align: center; }
    .kpi-value { font-size: 28px; font-weight: 700; color: ${b.primaryColor}; }
    .kpi-label { font-size: 11px; color: #666; text-transform: uppercase; margin-top: 4px; }
    h2 { font-size: 18px; color: ${b.primaryColor}; margin-bottom: 16px; border-left: 4px solid ${b.accentColor}; padding-left: 12px; }
    .section { margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 10px; background: ${b.primaryColor}; color: white; font-size: 11px; text-transform: uppercase; }
    td { padding: 10px; border-bottom: 1px solid #eee; }
    tr:hover td { background: #f9f9f9; }
    .rec-item { padding: 12px; margin-bottom: 8px; background: #f0f9ff; border-left: 3px solid ${b.accentColor}; border-radius: 0 8px 8px 0; font-size: 13px; }
    .footer { text-align: center; padding-top: 24px; border-top: 1px solid #eee; font-size: 11px; color: #999; }
    @media print { .page { padding: 20px; } }
</style>
</head><body>
<div class="page">
    <div class="header">
        <div>
            <h1>${report.title}</h1>
            ${b.clientName ? `<div style="font-size:14px;color:#666;margin-top:4px;">Prepared for: <strong>${b.clientName}</strong></div>` : ''}
        </div>
        <div class="meta">
            <div style="font-size:16px;font-weight:700;color:${b.primaryColor};">${b.companyName}</div>
            <div>Period: ${report.period.from} → ${report.period.to}</div>
            <div>Generated: ${new Date(report.generatedAt).toLocaleDateString('vi-VN')}</div>
        </div>
    </div>

    <div class="kpi-grid">
        <div class="kpi"><div class="kpi-value">${s.totalPosts}</div><div class="kpi-label">Total Posts</div></div>
        <div class="kpi"><div class="kpi-value">${s.totalReach.toLocaleString()}</div><div class="kpi-label">Total Reach</div></div>
        <div class="kpi"><div class="kpi-value">${s.totalEngagement.toLocaleString()}</div><div class="kpi-label">Total Engagement</div></div>
        <div class="kpi"><div class="kpi-value">${s.totalLikes.toLocaleString()}</div><div class="kpi-label">Likes</div></div>
        <div class="kpi"><div class="kpi-value">${s.totalComments.toLocaleString()}</div><div class="kpi-label">Comments</div></div>
        <div class="kpi"><div class="kpi-value">${s.avgEngagement}%</div><div class="kpi-label">Avg Engagement Rate</div></div>
    </div>

    <div class="section">
        <h2>Platform Breakdown</h2>
        <table>
            <thead><tr><th>Platform</th><th>Posts</th><th>Likes</th><th>Comments</th><th>Shares</th><th>Reach</th></tr></thead>
            <tbody>
                ${Object.entries(report.platformBreakdown).map(([p, d]) =>
                    `<tr><td>${platformIcons[p] || ''} ${p}</td><td>${d.posts}</td><td>${d.likes}</td><td>${d.comments}</td><td>${d.shares}</td><td>${d.reach.toLocaleString()}</td></tr>`
                ).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Top Performing Posts</h2>
        <table>
            <thead><tr><th>Content</th><th>Platform</th><th>Likes</th><th>Comments</th><th>Reach</th></tr></thead>
            <tbody>
                ${report.topPosts.map(p =>
                    `<tr><td>${p.content || '-'}</td><td>${platformIcons[p.platform] || ''} ${p.platform}</td><td>${p.likes}</td><td>${p.comments}</td><td>${p.reach.toLocaleString()}</td></tr>`
                ).join('') || '<tr><td colspan="5" style="text-align:center;color:#999;">No post data available</td></tr>'}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Recommendations</h2>
        ${report.recommendations.map(r => `<div class="rec-item">💡 ${r}</div>`).join('')}
    </div>

    <div class="footer">
        <p>Report generated by <strong>${b.companyName}</strong> using SocialHub Analytics Engine</p>
        <p style="margin-top:4px;">© ${new Date().getFullYear()} ${b.companyName}. All rights reserved.</p>
    </div>
</div>
</body></html>`;
    }

    _generateRecommendations(totalPosts, avgER, platformBreakdown) {
        const recs = [];
        if (totalPosts < 10) recs.push('Tăng tần suất đăng bài lên ít nhất 3-4 bài/tuần để duy trì engagement.');
        if (avgER < 2) recs.push('Engagement rate thấp hơn benchmark. Thử dùng video/carousel và CTA mạnh hơn.');
        else if (avgER > 5) recs.push('Engagement rate xuất sắc! Duy trì chiến lược content hiện tại.');

        const platforms = Object.keys(platformBreakdown);
        if (platforms.length < 3) recs.push('Mở rộng sang thêm nền tảng (Instagram Reels, TikTok) để tăng reach.');
        if (platforms.includes('facebook') && !platforms.includes('instagram')) recs.push('Nên cross-post sang Instagram để tận dụng audience overlap.');

        recs.push('Sử dụng tính năng A/B Testing để tối ưu hoá nội dung bài đăng.');
        recs.push('Thiết lập Evergreen Queue để tái sử dụng bài viết hiệu quả nhất.');
        return recs;
    }

    async deleteReport(id) {
        let reports = await this.getReports();
        reports = reports.filter(r => r.id !== id);
        await dataService.write('pdf_reports', reports);
    }
}

module.exports = new ReportPDFService();
