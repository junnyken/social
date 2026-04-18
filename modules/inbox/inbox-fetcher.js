// ============================================================
// Inbox Fetcher — Polling messages from all platforms
// ============================================================

import { addMessages } from './inbox-store.js';
import { getAllConnected, getConnected } from '../platforms/platform-registry.js';

let fetchTimer = null;

export function startInboxPolling(onNewMessages) {
  fetchAll(onNewMessages);
  fetchTimer = setInterval(() => fetchAll(onNewMessages), 2 * 60 * 1000);
}

export function stopInboxPolling() { clearInterval(fetchTimer); }

async function fetchAll(onNewMessages) {
  const results = await Promise.allSettled(
    getAllConnected().map(pid => fetchPlatformMessages(pid))
  );

  let totalNew = 0;
  results.forEach(r => {
    if (r.status === 'fulfilled' && r.value?.length) totalNew += addMessages(r.value);
  });

  // Always generate some mock messages for demo
  if (totalNew === 0) {
    const mockPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin'];
    const randomP = mockPlatforms[Math.floor(Math.random() * mockPlatforms.length)];
    totalNew += addMessages(generateMockMessages(randomP, 1 + Math.floor(Math.random() * 2)));
  }

  if (totalNew > 0) onNewMessages?.(totalNew);
}

async function fetchPlatformMessages(platformId) {
  const conn = getConnected(platformId);
  if (!conn) return generateMockMessages(platformId, 1);
  // Real API fetch would go here
  return generateMockMessages(platformId, 1 + Math.floor(Math.random() * 2));
}

function generateMockMessages(platform, count) {
  const names = ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', 'Phạm Thị D', 'Hoàng Minh E', 'Đỗ Thị F'];
  const texts = [
    'Sản phẩm này còn hàng không ạ?',
    'Giá bao nhiêu vậy shop?',
    'Ship về HCM mất bao lâu?',
    'Cho mình hỏi có size L không?',
    'Cảm ơn shop đã tư vấn nhiệt tình!',
    'Mình muốn đặt 2 cái, có giảm giá không?',
    'Nhờ shop check giúp đơn hàng #12345',
    'Review sản phẩm rất tốt, sẽ mua tiếp!'
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `${platform}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    platform,
    type: Math.random() > 0.5 ? 'comment' : 'dm',
    from: names[Math.floor(Math.random() * names.length)],
    fromId: 'user_' + Math.random().toString(36).slice(2),
    avatar: null,
    text: texts[Math.floor(Math.random() * texts.length)],
    postUrl: '#',
    timestamp: new Date(Date.now() - Math.random() * 7200000).toISOString(),
    read: false,
    status: 'new',
    parentPost: Math.random() > 0.6 ? { id: 'post_123', content: 'Ưu đãi hot cuối tuần...' } : null
  }));
}
