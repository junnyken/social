// ============================================================
// Calendar Store — Scheduled posts storage
// ============================================================

let _posts = [];
const _listeners = [];

export function getCalendarPosts() { return [..._posts]; }

export function addCalendarPost(post) {
  const entry = {
    id: post.id || crypto.randomUUID(),
    content: post.content || '',
    platforms: post.platforms || ['facebook'],
    scheduledAt: post.scheduledAt || new Date().toISOString(),
    status: post.status || 'pending', // pending | done | failed
    createdAt: new Date().toISOString()
  };
  _posts.push(entry);
  _notify();
  return entry;
}

export function updateCalendarPost(id, updates) {
  const post = _posts.find(p => p.id === id);
  if (post) { Object.assign(post, updates); _notify(); }
  return post;
}

export function removeCalendarPost(id) {
  _posts = _posts.filter(p => p.id !== id);
  _notify();
}

export function getPostsByDate(date) {
  const target = new Date(date).toDateString();
  return _posts.filter(p => new Date(p.scheduledAt).toDateString() === target);
}

export function onCalendarUpdate(fn) { _listeners.push(fn); }
function _notify() { _listeners.forEach(fn => fn()); }

// Seed demo data
export function seedDemoData() {
  if (_posts.length > 0) return;
  const now = new Date();
  const platforms = ['facebook', 'instagram', 'twitter', 'linkedin'];
  const contents = [
    '🔥 Flash sale cuối tuần — Giảm 50% toàn bộ sản phẩm!',
    '✨ Ra mắt BST mới — Xu hướng Xuân Hè 2026',
    '📸 Behind the scenes buổi chụp hình sản phẩm',
    '💡 5 tips marketing hiệu quả cho SME',
    '🎉 Minigame tặng quà — Comment để tham gia!',
    '❤️ Cảm ơn 10K followers! Ưu đãi đặc biệt',
    '🍜 Menu mới tháng này — Thử ngay!',
    '💄 Tutorial makeup tự nhiên cho công sở',
    '🏠 Dự án mới — Căn hộ view sông giá tốt',
    '📚 Khóa học online miễn phí tuần này'
  ];

  for (let i = -3; i <= 14; i++) {
    const count = Math.random() > 0.5 ? 1 : Math.random() > 0.3 ? 2 : 0;
    for (let j = 0; j < count; j++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      d.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 4) * 15, 0, 0);

      _posts.push({
        id: crypto.randomUUID(),
        content: contents[Math.floor(Math.random() * contents.length)],
        platforms: [platforms[Math.floor(Math.random() * platforms.length)]],
        scheduledAt: d.toISOString(),
        status: i < 0 ? (Math.random() > 0.2 ? 'done' : 'failed') : 'pending',
        createdAt: new Date(d.getTime() - 86400000).toISOString()
      });
    }
  }
  _notify();
}
