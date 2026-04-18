// ============================================================
// A/B Testing Engine Service
// Create split-test experiments on post variants
// Track real engagement to determine statistically winning variant
// ============================================================

const dataService = require('./data.service');
const crypto = require('crypto');

class ABTestService {

    async getExperiments() {
        return await dataService.read('ab_experiments') || [];
    }

    async getExperiment(id) {
        const experiments = await this.getExperiments();
        return experiments.find(e => e.id === id) || null;
    }

    async createExperiment(data) {
        const experiments = await this.getExperiments();

        if (!data.variants || data.variants.length < 2) {
            throw new Error('A/B test requires at least 2 variants');
        }

        const experiment = {
            id: crypto.randomUUID(),
            name: data.name || `Test ${experiments.length + 1}`,
            description: data.description || '',
            platform: data.platform || 'facebook',
            status: 'draft', // draft → running → completed → archived
            goal: data.goal || 'engagement', // engagement | clicks | reach | conversions
            trafficSplit: data.trafficSplit || 'equal', // equal | weighted
            duration: data.duration || 72, // hours
            variants: data.variants.map((v, i) => ({
                id: crypto.randomUUID(),
                label: v.label || `Variant ${String.fromCharCode(65 + i)}`,
                content: v.content || '',
                imageUrl: v.imageUrl || null,
                hashtags: v.hashtags || [],
                cta: v.cta || '',
                postId: null,    // filled when published
                weight: v.weight || Math.round(100 / data.variants.length),
                metrics: {
                    impressions: 0,
                    reach: 0,
                    likes: 0,
                    comments: 0,
                    shares: 0,
                    clicks: 0,
                    conversions: 0,
                    engagementRate: 0,
                    ctr: 0,
                    costPerResult: 0
                },
                isWinner: false
            })),
            winner: null,
            confidence: 0,
            createdAt: new Date().toISOString(),
            startedAt: null,
            completedAt: null,
            autoSelectWinner: data.autoSelectWinner !== false,
            minimumSampleSize: data.minimumSampleSize || 100
        };

        experiments.push(experiment);
        await dataService.write('ab_experiments', experiments);
        return experiment;
    }

    async startExperiment(id) {
        const experiments = await this.getExperiments();
        const idx = experiments.findIndex(e => e.id === id);
        if (idx === -1) throw new Error('Experiment not found');
        if (experiments[idx].status !== 'draft') throw new Error('Experiment already started');

        experiments[idx].status = 'running';
        experiments[idx].startedAt = new Date().toISOString();
        await dataService.write('ab_experiments', experiments);
        return experiments[idx];
    }

    async updateVariantMetrics(experimentId, variantId, metrics) {
        const experiments = await this.getExperiments();
        const exp = experiments.find(e => e.id === experimentId);
        if (!exp) throw new Error('Experiment not found');

        const variant = exp.variants.find(v => v.id === variantId);
        if (!variant) throw new Error('Variant not found');

        // Merge metrics
        Object.keys(metrics).forEach(k => {
            if (typeof metrics[k] === 'number') {
                variant.metrics[k] = metrics[k];
            }
        });

        // Calculate derived metrics
        if (variant.metrics.impressions > 0) {
            const totalEngagement = variant.metrics.likes + variant.metrics.comments * 2 + variant.metrics.shares * 3;
            variant.metrics.engagementRate = Math.round((totalEngagement / variant.metrics.impressions) * 10000) / 100;
            variant.metrics.ctr = Math.round((variant.metrics.clicks / variant.metrics.impressions) * 10000) / 100;
        }

        // Check auto-complete
        if (exp.autoSelectWinner && exp.status === 'running') {
            const allHaveData = exp.variants.every(v => v.metrics.impressions >= exp.minimumSampleSize);
            if (allHaveData) {
                this._determineWinner(exp);
            }
        }

        // Check time-based completion
        if (exp.startedAt && exp.status === 'running') {
            const elapsed = (Date.now() - new Date(exp.startedAt).getTime()) / 3600000;
            if (elapsed >= exp.duration) {
                this._determineWinner(exp);
            }
        }

        await dataService.write('ab_experiments', experiments);
        return exp;
    }

    _determineWinner(experiment) {
        const goalMetric = {
            engagement: 'engagementRate',
            clicks: 'ctr',
            reach: 'reach',
            conversions: 'conversions'
        }[experiment.goal] || 'engagementRate';

        // Sort by goal metric
        const sorted = [...experiment.variants].sort((a, b) =>
            (b.metrics[goalMetric] || 0) - (a.metrics[goalMetric] || 0)
        );

        const best = sorted[0];
        const second = sorted[1];

        // Statistical significance (simplified z-test)
        const confidence = this._calculateConfidence(best, second, goalMetric);

        experiment.variants.forEach(v => { v.isWinner = false; });
        best.isWinner = true;
        experiment.winner = best.id;
        experiment.confidence = confidence;

        if (confidence >= 95) {
            experiment.status = 'completed';
            experiment.completedAt = new Date().toISOString();
        }
    }

    _calculateConfidence(winner, loser, metric) {
        const w = winner.metrics[metric] || 0;
        const l = loser.metrics[metric] || 0;
        if (w === 0 && l === 0) return 0;
        if (l === 0) return 99;

        // Simplified relative improvement
        const improvement = ((w - l) / l) * 100;
        const sampleFactor = Math.min(1, (winner.metrics.impressions + loser.metrics.impressions) / 500);

        // Map improvement * sample to confidence percentage
        const rawConfidence = Math.min(99, Math.round(50 + (improvement * sampleFactor * 2)));
        return Math.max(0, rawConfidence);
    }

    async completeExperiment(id) {
        const experiments = await this.getExperiments();
        const exp = experiments.find(e => e.id === id);
        if (!exp) throw new Error('Experiment not found');

        this._determineWinner(exp);
        exp.status = 'completed';
        exp.completedAt = new Date().toISOString();
        await dataService.write('ab_experiments', experiments);
        return exp;
    }

    async deleteExperiment(id) {
        let experiments = await this.getExperiments();
        experiments = experiments.filter(e => e.id !== id);
        await dataService.write('ab_experiments', experiments);
    }

    async getStats() {
        const experiments = await this.getExperiments();
        return {
            total: experiments.length,
            draft: experiments.filter(e => e.status === 'draft').length,
            running: experiments.filter(e => e.status === 'running').length,
            completed: experiments.filter(e => e.status === 'completed').length,
            avgConfidence: experiments.filter(e => e.confidence > 0).length > 0
                ? Math.round(experiments.filter(e => e.confidence > 0).reduce((s, e) => s + e.confidence, 0) / experiments.filter(e => e.confidence > 0).length)
                : 0,
            avgImprovement: this._calcAvgImprovement(experiments)
        };
    }

    _calcAvgImprovement(experiments) {
        const completed = experiments.filter(e => e.status === 'completed' && e.winner);
        if (completed.length === 0) return 0;

        let total = 0;
        completed.forEach(exp => {
            const winner = exp.variants.find(v => v.isWinner);
            const losers = exp.variants.filter(v => !v.isWinner);
            if (winner && losers.length) {
                const avgLoser = losers.reduce((s, l) => s + (l.metrics.engagementRate || 0), 0) / losers.length;
                if (avgLoser > 0) total += ((winner.metrics.engagementRate - avgLoser) / avgLoser) * 100;
            }
        });
        return Math.round(total / completed.length);
    }
}

module.exports = new ABTestService();
