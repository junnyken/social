/**
 * Dashboard Analytics Service — Phase B
 * Aggregates real Facebook Graph API data for the Dashboard Command Center.
 * Falls back to mock data when no pages are connected.
 */
const fbGraphV2 = require('./fb-graph-v2.service');
const dataService = require('./data.service');

class DashboardAnalyticsService {

    /**
     * Get all connected pages for a user (with tokens)
     */
    async getConnectedPages(userId) {
        try {
            const accounts = await dataService.getAll('accounts');
            const pages = [];
            for (const acct of accounts) {
                if (acct.pages && acct.pages.length > 0) {
                    for (const p of acct.pages) {
                        if (p.access_token) {
                            pages.push({ ...p, accountId: acct.id });
                        }
                    }
                }
            }
            return pages;
        } catch (e) {
            console.error('[DashAnalytics] getConnectedPages error:', e.message);
            return [];
        }
    }

    /**
     * Dashboard Summary — KPIs + Platform breakdown
     * Tries real FB API, falls back to mock
     */
    async getDashboardSummary(userId, range = '30d', compare = false) {
        const pages = await this.getConnectedPages(userId);
        console.log(`[DashAnalytics] getDashboardSummary — Found ${pages.length} pages for userId=${userId}`);
        
        if (pages.length === 0) {
            console.log('[DashAnalytics] No pages found, returning mock data');
            return this._mockSummary(range, compare);
        }

        let totalFollowers = 0, totalReach = 0, totalEngaged = 0, totalFollowersAdded = 0;
        const platforms = [];
        let hasAnyData = false;

        for (const page of pages) {
            console.log(`[DashAnalytics] Fetching insights for page: ${page.name} (${page.id})`);
            try {
                // Try individual metrics separately to avoid one bad metric killing everything
                let impressions = 0, engaged = 0, followers = 0, fanAdds = 0;

                // Try page_fans first (lifetime metric)
                try {
                    const fansData = await fbGraphV2.getPageInsights(page.access_token, page.id, 'page_fans', 'day');
                    if (fansData && fansData.length > 0) {
                        const fanObj = fansData.find(m => m.name === 'page_fans');
                        if (fanObj?.values?.length > 0) followers = fanObj.values[fanObj.values.length - 1].value || 0;
                    }
                } catch (e) {
                    console.warn(`[DashAnalytics] page_fans failed for ${page.name}: ${e.message}`);
                }

                // Try page_impressions + page_engaged_users + page_fan_adds
                try {
                    const insightsData = await fbGraphV2.getPageInsights(page.access_token, page.id, 'page_impressions,page_engaged_users,page_fan_adds', 'day');
                    if (insightsData && insightsData.length > 0) {
                        const impObj = insightsData.find(m => m.name === 'page_impressions');
                        const engObj = insightsData.find(m => m.name === 'page_engaged_users');
                        const fanAddObj = insightsData.find(m => m.name === 'page_fan_adds');

                        if (impObj?.values) impressions = impObj.values.reduce((s, v) => s + (v.value || 0), 0);
                        if (engObj?.values) engaged = engObj.values.reduce((s, v) => s + (v.value || 0), 0);
                        if (fanAddObj?.values) fanAdds = fanAddObj.values.reduce((s, v) => s + (v.value || 0), 0);
                    }
                } catch (e) {
                    console.warn(`[DashAnalytics] page_impressions group failed for ${page.name}: ${e.message}`);
                }

                // If we got followers OR impressions, count it as real data
                if (followers > 0 || impressions > 0) hasAnyData = true;

                totalFollowers += followers;
                totalReach += Math.round(impressions * 0.8);
                totalEngaged += engaged;
                totalFollowersAdded += fanAdds;

                platforms.push({
                    id: 'facebook',
                    name: page.name || 'Facebook Page',
                    followers,
                    reach: Math.round(impressions * 0.8),
                    er: followers > 0 ? parseFloat(((engaged / followers) * 100).toFixed(1)) : 0
                });

                console.log(`[DashAnalytics] Page ${page.name}: followers=${followers}, impressions=${impressions}, engaged=${engaged}`);
            } catch (error) {
                console.error(`[DashAnalytics] Error processing page ${page.name}:`, error.message);
                // Still add this page with zero data instead of failing entirely
                platforms.push({
                    id: 'facebook',
                    name: page.name || 'Facebook Page',
                    followers: 0,
                    reach: 0,
                    er: 0
                });
            }
        }

        const er = totalFollowers > 0 ? parseFloat(((totalEngaged / totalFollowers) * 100).toFixed(1)) : 0;

        // Count inbox items
        let inboxCount = 0;
        try {
            const inboxData = await dataService.getAll('inbox') || [];
            inboxCount = inboxData.filter(i => !i.read).length;
        } catch(e) { /* ignore */ }

        console.log(`[DashAnalytics] FINAL: hasAnyData=${hasAnyData}, followers=${totalFollowers}, reach=${totalReach}, er=${er}`);

        return {
            _source: hasAnyData ? 'live' : 'live_empty',
            kpis: {
                followers: totalFollowers,
                followersChange: String(totalFollowersAdded),
                followersPct: compare && totalFollowers > 0 ? parseFloat(((totalFollowersAdded / totalFollowers) * 100).toFixed(1)) : null,
                reach: totalReach,
                reachChange: String(totalReach),
                reachPct: null,
                engagementRate: er,
                erChange: '0',
                erPct: null,
                inbox: inboxCount,
                inboxChange: '0',
                inboxPct: null
            },
            platforms
        };
    }

    /**
     * Top Performing Posts — ranked by engagement
     */
    async getTopPosts(userId, limit = 5) {
        const pages = await this.getConnectedPages(userId);
        
        if (pages.length === 0) {
            return this._mockTopPosts();
        }

        try {
            const allPosts = [];

            for (const page of pages) {
                const result = await fbGraphV2.getPagePosts(page.access_token, page.id, 25);
                
                if (result?.posts) {
                    for (const post of result.posts) {
                        const reactions = post.reactions?.summary?.total_count || 0;
                        const comments = post.comments?.summary?.total_count || 0;
                        const shares = post.shares?.count || 0;
                        const totalEngagement = reactions + comments + shares;
                        
                        // Estimate reach from reactions (rough proxy when no insights access)
                        const estimatedReach = totalEngagement * 10;
                        const er = estimatedReach > 0 ? parseFloat(((totalEngagement / estimatedReach) * 100).toFixed(1)) : 0;

                        allPosts.push({
                            title: (post.message || 'Untitled post').substring(0, 50),
                            platform: 'facebook',
                            type: post.full_picture ? 'image' : 'text',
                            thumbnail: post.full_picture || null,
                            reach: estimatedReach,
                            likes: reactions,
                            comments: comments,
                            shares: shares,
                            er,
                            permalink: post.permalink_url,
                            publishedAt: post.created_time
                        });
                    }
                }
            }

            // Sort by ER descending, take top N
            allPosts.sort((a, b) => b.er - a.er);
            return allPosts.slice(0, limit);
        } catch (error) {
            console.error('[DashAnalytics] getTopPosts error:', error.message);
            return this._mockTopPosts();
        }
    }

    /**
     * Engagement breakdown over time
     */
    async getEngagementBreakdown(userId, range = '30d') {
        const pages = await this.getConnectedPages(userId);
        
        if (pages.length === 0) {
            return this._mockBreakdown(range);
        }

        try {
            // Fetch posts and aggregate by day
            const dayMap = {};
            const rangeDays = this._rangeToDays(range);
            
            for (const page of pages) {
                const result = await fbGraphV2.getPagePosts(page.access_token, page.id, 50);
                
                if (result?.posts) {
                    for (const post of result.posts) {
                        const day = new Date(post.created_time).toISOString().slice(0, 10);
                        if (!dayMap[day]) dayMap[day] = { likes: 0, comments: 0, shares: 0 };
                        
                        dayMap[day].likes += post.reactions?.summary?.total_count || 0;
                        dayMap[day].comments += post.comments?.summary?.total_count || 0;
                        dayMap[day].shares += post.shares?.count || 0;
                    }
                }
            }

            // Generate labels for range
            const labels = [];
            const likes = [], comments = [], shares = [];
            const reach = [], followers = [];
            
            for (let i = rangeDays - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = d.toISOString().slice(0, 10);
                const label = d.getDate() + '/' + (d.getMonth() + 1);
                labels.push(label);
                
                likes.push(dayMap[key]?.likes || 0);
                comments.push(dayMap[key]?.comments || 0);
                shares.push(dayMap[key]?.shares || 0);
                reach.push((dayMap[key]?.likes || 0) * 10); // rough estimate
                followers.push(0); // would need page_fans daily data
            }

            return {
                _source: 'live',
                growth: { labels, reach, followers },
                engagement: { labels, likes, comments, shares }
            };
        } catch (error) {
            console.error('[DashAnalytics] getEngagementBreakdown error:', error.message);
            return this._mockBreakdown(range);
        }
    }

    /**
     * Simple sentiment from comments
     */
    async getSentiment(userId) {
        // For now, sentiment is basic — in production this would use NLP
        // Return mock with _source indicator
        return {
            _source: 'estimated',
            positive: 72,
            neutral: 20,
            negative: 8,
            index: 87
        };
    }

    // ===========================
    // MOCK DATA FALLBACKS
    // ===========================
    
    _rangeToDays(range) {
        const map = { 'today': 1, '7d': 7, '30d': 30, 'month': 30, '90d': 90 };
        return map[range] || 30;
    }

    _mockSummary(range, compare) {
        const days = this._rangeToDays(range);
        const factor = days / 30;
        return {
            _source: 'demo',
            kpis: {
                followers: 18240, followersChange: '412',
                followersPct: compare ? 2.3 : null,
                reach: Math.round(56300 * factor), reachChange: '15.4',
                reachPct: compare ? 14.9 : null,
                engagementRate: 5.1, erChange: '0.5',
                erPct: compare ? 10.9 : null,
                inbox: Math.round(32 * factor), inboxChange: '5',
                inboxPct: compare ? 18.5 : null
            },
            platforms: [
                { id: 'facebook', followers: 12400, reach: Math.round(38000 * factor), er: 5.2 },
                { id: 'instagram', followers: 4800, reach: Math.round(14000 * factor), er: 6.8 },
                { id: 'twitter', followers: 1040, reach: Math.round(4300 * factor), er: 1.8 }
            ]
        };
    }

    _mockTopPosts() {
        return [
            { title: '[Hot] Bộ sưu tập Mùa Hè 2026', platform: 'facebook', type: 'image', reach: 35200, likes: 2100, er: 28.4 },
            { title: 'Behind the scenes: Buổi chụp hình', platform: 'instagram', type: 'video', reach: 28900, likes: 3102, er: 22.1 },
            { title: 'Tặng quà Minigame đầu tháng', platform: 'facebook', type: 'image', reach: 18200, likes: 1420, er: 19.8 },
            { title: 'Tips phối đồ đi biển', platform: 'twitter', type: 'text', reach: 12100, likes: 815, er: 12.2 },
            { title: 'Review từ khách hàng thân thiết', platform: 'instagram', type: 'image', reach: 9800, likes: 620, er: 9.5 }
        ];
    }

    _mockBreakdown(range) {
        const days = Math.min(this._rangeToDays(range), 30);
        const labels = Array.from({length:days}, (_,i) => {
            const d = new Date(); d.setDate(d.getDate()-(days-1-i));
            return d.getDate()+'/'+(d.getMonth()+1);
        });
        return {
            _source: 'demo',
            growth: {
                labels,
                reach: labels.map(() => 5000 + Math.random()*8000),
                followers: labels.map((_,i) => 18000 + (i*20) + Math.random()*40)
            },
            engagement: {
                labels,
                likes: labels.map(() => 150 + Math.random()*300),
                comments: labels.map(() => 40 + Math.random()*80),
                shares: labels.map(() => Math.random()*50)
            }
        };
    }
}

module.exports = new DashboardAnalyticsService();
