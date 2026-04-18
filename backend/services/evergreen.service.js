// ============================================================
// Evergreen Content Recycling Engine
// Auto-republish top-performing posts on a recurring schedule
// ============================================================

const dataService = require('./data.service');
const crypto = require('crypto');

class EvergreenService {

    async getQueues() {
        return await dataService.read('evergreen_queues') || [];
    }

    async getQueue(id) {
        const queues = await this.getQueues();
        return queues.find(q => q.id === id) || null;
    }

    // Create a new evergreen queue (category of recyclable content)
    async createQueue(data) {
        const queues = await this.getQueues();
        const queue = {
            id: crypto.randomUUID(),
            name: data.name || 'Evergreen Queue',
            description: data.description || '',
            status: 'active', // active | paused
            platforms: data.platforms || ['facebook'],
            schedule: {
                frequency: data.frequency || 'weekly', // daily | weekly | biweekly | monthly
                daysOfWeek: data.daysOfWeek || [1, 3, 5], // Mon, Wed, Fri
                timesOfDay: data.timesOfDay || ['11:00', '18:00'],
                timezone: data.timezone || 'Asia/Ho_Chi_Minh'
            },
            rules: {
                minEngagementRate: data.minEngagementRate || 3, // Only recycle posts with ER > 3%
                minDaysSinceLastPost: data.minDaysSinceLastPost || 14, // Don't repost within 14 days
                maxRecycles: data.maxRecycles || 5, // Max times a post can be recycled
                shuffleOrder: data.shuffleOrder !== false // Randomize order
            },
            posts: [], // Array of evergreen post items
            stats: {
                totalRecycled: 0,
                totalEngagement: 0,
                avgEngagementLift: 0,
                lastRecycledAt: null
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        queues.push(queue);
        await dataService.write('evergreen_queues', queues);
        return queue;
    }

    // Add a post to the evergreen queue
    async addPost(queueId, postData) {
        const queues = await this.getQueues();
        const queue = queues.find(q => q.id === queueId);
        if (!queue) throw new Error('Queue not found');

        const post = {
            id: crypto.randomUUID(),
            content: postData.content || '',
            imageUrl: postData.imageUrl || null,
            hashtags: postData.hashtags || [],
            originalPostId: postData.originalPostId || null,
            originalPlatform: postData.originalPlatform || 'facebook',
            originalMetrics: {
                likes: postData.likes || 0,
                comments: postData.comments || 0,
                shares: postData.shares || 0,
                reach: postData.reach || 0,
                engagementRate: postData.engagementRate || 0
            },
            recycleCount: 0,
            recycleHistory: [],
            status: 'active', // active | paused | retired
            addedAt: new Date().toISOString(),
            lastRecycledAt: null,
            variations: postData.variations || [] // alt text versions for variety
        };

        queue.posts.push(post);
        queue.updatedAt = new Date().toISOString();
        await dataService.write('evergreen_queues', queues);
        return post;
    }

    // Auto-detect top posts from logs and suggest for evergreen
    async suggestEvergreenPosts(minER = 3, limit = 10) {
        const logs = await dataService.getAll('logs') || [];
        
        const scored = logs
            .filter(l => l.status === 'success' && l.content)
            .map(l => {
                const likes = l.likes || 0;
                const comments = l.comments || 0;
                const shares = l.shares || 0;
                const reach = l.reach || 1;
                const er = ((likes + comments * 2 + shares * 3) / reach) * 100;
                return { ...l, engagementRate: Math.round(er * 100) / 100 };
            })
            .filter(l => l.engagementRate >= minER)
            .sort((a, b) => b.engagementRate - a.engagementRate)
            .slice(0, limit);

        return scored.map(l => ({
            content: l.content,
            platform: l.platform || 'facebook',
            likes: l.likes || 0,
            comments: l.comments || 0,
            shares: l.shares || 0,
            reach: l.reach || 0,
            engagementRate: l.engagementRate,
            publishedAt: l.createdAt,
            postId: l.id
        }));
    }

    // Simulate recycling a post (in production, this would call social APIs)
    async recyclePost(queueId, postId) {
        const queues = await this.getQueues();
        const queue = queues.find(q => q.id === queueId);
        if (!queue) throw new Error('Queue not found');

        const post = queue.posts.find(p => p.id === postId);
        if (!post) throw new Error('Post not found');

        if (post.recycleCount >= queue.rules.maxRecycles) {
            post.status = 'retired';
            await dataService.write('evergreen_queues', queues);
            throw new Error('Post has reached max recycle limit');
        }

        // Check cooldown
        if (post.lastRecycledAt) {
            const daysSince = (Date.now() - new Date(post.lastRecycledAt).getTime()) / 86400000;
            if (daysSince < queue.rules.minDaysSinceLastPost) {
                throw new Error(`Post needs ${Math.ceil(queue.rules.minDaysSinceLastPost - daysSince)} more days cooldown`);
            }
        }

        // Simulate recycling
        const result = {
            recycledAt: new Date().toISOString(),
            platforms: queue.platforms,
            content: post.variations.length > 0
                ? post.variations[post.recycleCount % post.variations.length]
                : post.content,
            postIds: queue.platforms.map(p => `${p}_recycled_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`)
        };

        post.recycleCount++;
        post.lastRecycledAt = result.recycledAt;
        post.recycleHistory.push(result);

        queue.stats.totalRecycled++;
        queue.stats.lastRecycledAt = result.recycledAt;
        queue.updatedAt = new Date().toISOString();

        await dataService.write('evergreen_queues', queues);
        return result;
    }

    // Remove a post from queue
    async removePost(queueId, postId) {
        const queues = await this.getQueues();
        const queue = queues.find(q => q.id === queueId);
        if (!queue) throw new Error('Queue not found');

        queue.posts = queue.posts.filter(p => p.id !== postId);
        queue.updatedAt = new Date().toISOString();
        await dataService.write('evergreen_queues', queues);
    }

    // Get next scheduled posts (what would be posted next)
    async getNextUp(queueId, count = 5) {
        const queue = await this.getQueue(queueId);
        if (!queue) throw new Error('Queue not found');

        const eligible = queue.posts
            .filter(p => {
                if (p.status !== 'active') return false;
                if (p.recycleCount >= queue.rules.maxRecycles) return false;
                if (p.lastRecycledAt) {
                    const daysSince = (Date.now() - new Date(p.lastRecycledAt).getTime()) / 86400000;
                    if (daysSince < queue.rules.minDaysSinceLastPost) return false;
                }
                return true;
            });

        if (queue.rules.shuffleOrder) {
            eligible.sort(() => Math.random() - 0.5);
        }

        return eligible.slice(0, count);
    }

    // Toggle queue status
    async toggleQueue(id) {
        const queues = await this.getQueues();
        const queue = queues.find(q => q.id === id);
        if (!queue) throw new Error('Queue not found');
        queue.status = queue.status === 'active' ? 'paused' : 'active';
        queue.updatedAt = new Date().toISOString();
        await dataService.write('evergreen_queues', queues);
        return queue;
    }

    async deleteQueue(id) {
        let queues = await this.getQueues();
        queues = queues.filter(q => q.id !== id);
        await dataService.write('evergreen_queues', queues);
    }

    async getStats() {
        const queues = await this.getQueues();
        return {
            totalQueues: queues.length,
            activeQueues: queues.filter(q => q.status === 'active').length,
            totalPosts: queues.reduce((s, q) => s + q.posts.length, 0),
            totalRecycled: queues.reduce((s, q) => s + q.stats.totalRecycled, 0),
            activePosts: queues.reduce((s, q) => s + q.posts.filter(p => p.status === 'active').length, 0),
            retiredPosts: queues.reduce((s, q) => s + q.posts.filter(p => p.status === 'retired').length, 0)
        };
    }
}

module.exports = new EvergreenService();
