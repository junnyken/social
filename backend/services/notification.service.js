// ============================================================
// Notification Service — CRUD + Real-time push
// ============================================================

const dataService = require('./data.service');
const { emitNotification, emitToAll } = require('../config/socket-io');

class NotificationService {

    async getNotifications(userId, limit = 50) {
        const all = await dataService.read('notifications') || [];
        return all
            .filter(n => n.targetUserId === userId || n.targetUserId === '*')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
    }

    async getUnreadCount(userId) {
        const all = await dataService.read('notifications') || [];
        return all.filter(n =>
            (n.targetUserId === userId || n.targetUserId === '*') && !n.read
        ).length;
    }

    async create(notification) {
        const all = await dataService.read('notifications') || [];
        const newNotif = {
            id: require('crypto').randomUUID(),
            read: false,
            createdAt: new Date().toISOString(),
            ...notification
        };
        all.unshift(newNotif);

        // Keep max 500 notifications
        if (all.length > 500) all.length = 500;

        await dataService.write('notifications', all);

        // Push real-time via Socket.IO
        if (notification.targetUserId === '*') {
            emitToAll('notification:new', newNotif);
        } else {
            emitNotification(notification.targetUserId, newNotif);
        }

        return newNotif;
    }

    async markAsRead(notifId) {
        const all = await dataService.read('notifications') || [];
        const notif = all.find(n => n.id === notifId);
        if (notif) {
            notif.read = true;
            notif.readAt = new Date().toISOString();
            await dataService.write('notifications', all);
        }
        return notif;
    }

    async markAllRead(userId) {
        const all = await dataService.read('notifications') || [];
        let count = 0;
        all.forEach(n => {
            if ((n.targetUserId === userId || n.targetUserId === '*') && !n.read) {
                n.read = true;
                n.readAt = new Date().toISOString();
                count++;
            }
        });
        await dataService.write('notifications', all);
        return count;
    }

    // ── Convenience methods for common notifications ──────────
    async notifyPostSubmitted(post, actorName) {
        return this.create({
            type: 'post_submitted',
            targetUserId: '*', // All managers
            title: '⏳ Bài mới chờ duyệt',
            body: `${actorName} đã gửi duyệt: "${(post.content || '').slice(0, 60)}..."`,
            icon: '⏳',
            postId: post.id,
            actorName
        });
    }

    async notifyPostApproved(post, actorName, authorId) {
        return this.create({
            type: 'post_approved',
            targetUserId: authorId,
            title: '✅ Bài đã được duyệt!',
            body: `${actorName} đã duyệt bài: "${(post.content || '').slice(0, 60)}..."`,
            icon: '✅',
            postId: post.id,
            actorName
        });
    }

    async notifyPostRejected(post, actorName, authorId, reason) {
        return this.create({
            type: 'post_rejected',
            targetUserId: authorId,
            title: '❌ Bài bị từ chối',
            body: `${actorName} từ chối: "${reason || 'Không đạt'}"`,
            icon: '❌',
            postId: post.id,
            actorName,
            reason
        });
    }

    async notifyPostPublished(post, actorName) {
        return this.create({
            type: 'post_published',
            targetUserId: '*',
            title: '🚀 Bài đã đăng!',
            body: `${actorName} đã đăng bài lên ${(post.platforms || []).join(', ')}`,
            icon: '🚀',
            postId: post.id,
            actorName
        });
    }

    async notifyMemberAdded(memberName, actorName) {
        return this.create({
            type: 'team_member_added',
            targetUserId: '*',
            title: '👥 Thành viên mới',
            body: `${actorName} đã thêm ${memberName} vào team`,
            icon: '👥',
            actorName
        });
    }

    async notifyComment(post, commentText, actorName, authorId) {
        return this.create({
            type: 'comment_added',
            targetUserId: authorId,
            title: '💬 Bình luận mới',
            body: `${actorName}: "${commentText.slice(0, 80)}"`,
            icon: '💬',
            postId: post.id,
            actorName
        });
    }
}

module.exports = new NotificationService();
