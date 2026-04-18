// ============================================================
// Workflow Store — Post state machine + Comments
// ============================================================

export const POST_STATES = {
  draft:     { id: 'draft',     label: 'Draft',     color: '#6B7280', icon: '📝', next: ['review'] },
  review:    { id: 'review',    label: 'Chờ duyệt', color: '#F59E0B', icon: '⏳', next: ['approved','rejected'] },
  approved:  { id: 'approved',  label: 'Đã duyệt',  color: '#10B981', icon: '✅', next: ['published','draft'] },
  rejected:  { id: 'rejected',  label: 'Từ chối',    color: '#EF4444', icon: '❌', next: ['draft'] },
  published: { id: 'published', label: 'Đã đăng',    color: '#1e3a5f', icon: '🚀', next: [] }
};

let posts = [];
let comments = {};
let listeners = [];

export function createPost(data) {
  const post = {
    id: crypto.randomUUID(), state: 'draft',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    createdById: 'user-001', createdByName: 'Trieu Nguyen',
    reviewedById: null, reviewedByName: null, reviewedAt: null,
    rejectionReason: null, publishedAt: null, scheduledAt: null,
    platforms: [], content: '', media: [],
    ...data
  };
  posts.unshift(post);
  notify();
  return post;
}

export function getPosts(filters = {}) {
  let r = [...posts];
  if (filters.state) r = r.filter(p => p.state === filters.state);
  if (filters.platform) r = r.filter(p => p.platforms.includes(filters.platform));
  return r;
}

export function getPost(id) { return posts.find(p => p.id === id); }

export function submitForReview(postId) { return _transition(postId, 'review'); }
export function approvePost(postId) { return _transition(postId, 'approved'); }
export function rejectPost(postId, reason) { return _transition(postId, 'rejected', reason); }
export function markPublished(postId) { const p = posts.find(x => x.id === postId); if (p) { p.state = 'published'; p.publishedAt = new Date().toISOString(); p.updatedAt = new Date().toISOString(); notify(); } }
export function revertToDraft(postId) { return _transition(postId, 'draft'); }

function _transition(postId, newState, reason = null) {
  const post = posts.find(p => p.id === postId);
  if (!post) return null;
  const allowed = POST_STATES[post.state]?.next || [];
  if (!allowed.includes(newState)) return null;

  post.state = newState;
  post.updatedAt = new Date().toISOString();
  if (['review','approved','rejected'].includes(newState)) { post.reviewedAt = new Date().toISOString(); }
  if (reason) post.rejectionReason = reason;

  // In-app notification
  try {
    const { addNotification } = _getNotify();
    const sc = POST_STATES[newState];
    addNotification({ type: `post_${newState}`, title: `${sc.icon} Post ${sc.label}`, body: `"${(post.content || '').slice(0, 50)}..."`, postId });
  } catch (e) { /* ignore if notify not loaded */ }

  notify();
  return post;
}

function _getNotify() { return window._workflowNotify || {}; }

export function addComment(postId, text) {
  if (!comments[postId]) comments[postId] = [];
  const c = { id: crypto.randomUUID(), postId, authorId: 'user-001', authorName: 'Trieu Nguyen', text, createdAt: new Date().toISOString() };
  comments[postId].push(c);
  notify();
  return c;
}
export function getComments(postId) { return comments[postId] || []; }

export function getWorkflowStats() {
  return { draft: posts.filter(p => p.state === 'draft').length, review: posts.filter(p => p.state === 'review').length, approved: posts.filter(p => p.state === 'approved').length, rejected: posts.filter(p => p.state === 'rejected').length, published: posts.filter(p => p.state === 'published').length };
}

export function seedWorkflowData() {
  if (posts.length > 0) return;
  const p1 = createPost({ content: '🔥 FLASH SALE 50% — Hôm nay duy nhất! Đừng bỏ lỡ cơ hội vàng...', platforms: ['facebook','instagram'] });
  submitForReview(p1.id);
  const p2 = createPost({ content: '📢 Ra mắt sản phẩm mới! Thiết kế hiện đại, chất liệu cao cấp — BST Xuân Hè 2026', platforms: ['facebook','linkedin'] });
  submitForReview(p2.id);
  createPost({ content: '💬 Bạn thích sản phẩm nào nhất? Comment cho mình biết nhé!', platforms: ['facebook'] });
  const p4 = createPost({ content: '📸 Behind the scenes buổi chụp sản phẩm mới', platforms: ['instagram'] });
  submitForReview(p4.id);
  approvePost(p4.id);
}

export function onUpdate(fn) { listeners.push(fn); }
function notify() { listeners.forEach(fn => fn()); }
