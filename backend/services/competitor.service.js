// ============================================================
// Competitor Benchmarking Service
// Track and compare competitor Facebook Pages
// ============================================================

const dataService = require('./data.service');

class CompetitorService {

    async getCompetitors() {
        return await dataService.read('competitors') || [];
    }

    async addCompetitor(data) {
        const competitors = await this.getCompetitors();
        const competitor = {
            id: require('crypto').randomUUID(),
            name: data.name,
            pageId: data.pageId || null,
            pageUrl: data.pageUrl || '',
            platform: data.platform || 'facebook',
            avatar: data.avatar || null,
            industry: data.industry || '',
            addedAt: new Date().toISOString(),
            metrics: {
                followers: data.followers || 0,
                posts: data.posts || 0,
                engagementRate: data.engagementRate || 0,
                avgLikes: data.avgLikes || 0,
                avgComments: data.avgComments || 0,
                avgShares: data.avgShares || 0,
                postingFrequency: data.postingFrequency || 0,
            },
            history: [{
                date: new Date().toISOString(),
                followers: data.followers || 0,
                engagementRate: data.engagementRate || 0
            }],
            notes: data.notes || ''
        };

        competitors.push(competitor);
        await dataService.write('competitors', competitors);
        return competitor;
    }

    async updateCompetitor(id, updates) {
        const competitors = await this.getCompetitors();
        const idx = competitors.findIndex(c => c.id === id);
        if (idx === -1) throw new Error('Competitor not found');

        // If metrics are updated, push to history
        if (updates.metrics) {
            competitors[idx].history = competitors[idx].history || [];
            competitors[idx].history.push({
                date: new Date().toISOString(),
                followers: updates.metrics.followers || competitors[idx].metrics.followers,
                engagementRate: updates.metrics.engagementRate || competitors[idx].metrics.engagementRate
            });
            // Keep last 90 history entries
            if (competitors[idx].history.length > 90) {
                competitors[idx].history = competitors[idx].history.slice(-90);
            }
        }

        Object.assign(competitors[idx], updates, { updatedAt: new Date().toISOString() });
        await dataService.write('competitors', competitors);
        return competitors[idx];
    }

    async removeCompetitor(id) {
        let competitors = await this.getCompetitors();
        competitors = competitors.filter(c => c.id !== id);
        await dataService.write('competitors', competitors);
    }

    async getBenchmark(myMetrics = {}) {
        const competitors = await this.getCompetitors();
        if (competitors.length === 0) {
            return { competitors: [], benchmark: null, radarData: null };
        }

        // Calculate averages
        const avgMetrics = {
            followers: 0, engagementRate: 0, avgLikes: 0,
            avgComments: 0, avgShares: 0, postingFrequency: 0
        };

        competitors.forEach(c => {
            Object.keys(avgMetrics).forEach(k => {
                avgMetrics[k] += (c.metrics?.[k] || 0);
            });
        });

        Object.keys(avgMetrics).forEach(k => {
            avgMetrics[k] = Math.round((avgMetrics[k] / competitors.length) * 100) / 100;
        });

        // Build radar chart data (normalized 0-100)
        const maxVals = {};
        const allEntries = [...competitors.map(c => c.metrics), myMetrics];
        ['followers', 'engagementRate', 'avgLikes', 'avgComments', 'postingFrequency'].forEach(k => {
            maxVals[k] = Math.max(...allEntries.map(e => e?.[k] || 0), 1);
        });

        const normalize = (metrics) => ({
            followers: Math.round(((metrics?.followers || 0) / maxVals.followers) * 100),
            engagementRate: Math.round(((metrics?.engagementRate || 0) / maxVals.engagementRate) * 100),
            avgLikes: Math.round(((metrics?.avgLikes || 0) / maxVals.avgLikes) * 100),
            avgComments: Math.round(((metrics?.avgComments || 0) / maxVals.avgComments) * 100),
            postingFrequency: Math.round(((metrics?.postingFrequency || 0) / maxVals.postingFrequency) * 100)
        });

        const radarData = {
            you: normalize(myMetrics),
            industryAvg: normalize(avgMetrics),
            competitors: competitors.map(c => ({
                name: c.name,
                data: normalize(c.metrics)
            }))
        };

        // Rankings
        const rankings = competitors.map(c => ({
            id: c.id,
            name: c.name,
            followers: c.metrics?.followers || 0,
            engagementRate: c.metrics?.engagementRate || 0,
            score: Math.round(
                ((c.metrics?.followers || 0) / maxVals.followers * 30) +
                ((c.metrics?.engagementRate || 0) / maxVals.engagementRate * 40) +
                ((c.metrics?.avgLikes || 0) / maxVals.avgLikes * 15) +
                ((c.metrics?.postingFrequency || 0) / maxVals.postingFrequency * 15)
            )
        })).sort((a, b) => b.score - a.score);

        return {
            competitors: competitors.map(c => ({ ...c, history: undefined })),
            benchmark: { avgMetrics, myMetrics, rankings },
            radarData
        };
    }
}

module.exports = new CompetitorService();
