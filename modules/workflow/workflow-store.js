// ============================================================
// Workflow Store — Post state machine + Comments (API Backed)
// ============================================================

import { emit, onSocketEvent } from '../collab/socket-client.js';

export const POST_STATES = {
  draft:     { id: 'draft',     label: 'Draft',     color: '#6B7280', icon: '📝', next: ['review'] },
  review:    { id: 'review',    label: 'Chờ duyệt', color: '#F59E0B', icon: '⏳', next: ['approved','rejected'] },
  approved:  { id: 'approved',  label: 'Đã duyệt',  color: '#10B981', icon: '✅', next: ['published','draft'] },
  rejected:  { id: 'rejected',  label: 'Từ chối',    color: '#EF4444', icon: '❌', next: ['draft'] },
  published: { id: 'published', label: 'Đã đăng',    color: '#1e3a5f', icon: '🚀', next: [] }
};

let posts = [];
let listeners = [];

async function apiFetch(url, options = {}) {
    const token = window.localStorage.getItem('token') || '';
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {})
        }
    });
    return res.json();
}

export async function syncWorkflow() {
    try {
        const data = await apiFetch('/api/v1/workflow');
        if (data.success) {
            posts = data.data;
            notify();
        }
    } catch (e) { console.error('Workflow sync error', e); }
}

onSocketEvent((event) => {
    if (event.type === 'workflow_updated') {
        // If it's an action from someone else, sync to get latest state
        // In a real sophisticated app, we'd apply the patch locally instead of full sync
        syncWorkflow();
    }
});

export async function createPost(data) {
    try {
        const res = await apiFetch('/api/v1/workflow', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (res.success) {
            posts.unshift(res.data);
            notify();
            emit('workflow:stateChange', { action: 'create', postId: res.data.id, post: res.data });
            return res.data;
        }
    } catch (e) {}
}

export function getPosts(filters = {}) {
  let r = [...posts];
  if (filters.state) r = r.filter(p => p.state === filters.state);
  if (filters.platform) r = r.filter(p => (p.platforms || []).includes(filters.platform));
  return r;
}

export function getPost(id) { return posts.find(p => p.id === id); }

export async function submitForReview(postId) { return _transition(postId, 'submit'); }
export async function approvePost(postId) { return _transition(postId, 'approve'); }
export async function rejectPost(postId, reason) { return _transition(postId, 'reject', reason); }
export async function markPublished(postId) { 
    const res = await _transition(postId, 'publish');
    // NOTE: UI should also call addToQueue
    return res;
}
export async function revertToDraft(postId) { return _transition(postId, 'revert'); }

async function _transition(postId, action, reason = null) {
    try {
        const res = await apiFetch(`/api/v1/workflow/${postId}`, {
            method: 'PATCH',
            body: JSON.stringify({ action, reason })
        });
        if (res.success) {
            const idx = posts.findIndex(p => p.id === postId);
            if (idx > -1) {
                posts[idx] = res.data;
                notify();
                emit('workflow:stateChange', { action, postId, post: res.data });
            }
            return res.data;
        }
    } catch (e) {
        console.error('Transition error', e); throw e;
    }
}

export async function addComment(postId, text) {
    try {
        const res = await apiFetch(`/api/v1/workflow/${postId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ text })
        });
        if (res.success) {
            const p = posts.find(x => x.id === postId);
            if (p) {
                p.comments = p.comments || [];
                p.comments.push(res.data);
                notify();
                emit('workflow:stateChange', { action: 'comment', postId, comment: res.data });
            }
            return res.data;
        }
    } catch (e) {}
}

export function getComments(postId) { 
    const p = posts.find(x => x.id === postId);
    return p ? (p.comments || []) : []; 
}

export function getWorkflowStats() {
  return { 
      draft: posts.filter(p => p.state === 'draft').length, 
      review: posts.filter(p => p.state === 'review').length, 
      approved: posts.filter(p => p.state === 'approved').length, 
      rejected: posts.filter(p => p.state === 'rejected').length, 
      published: posts.filter(p => p.state === 'published').length 
  };
}

export function seedWorkflowData() {
  // Deprecated - using Real API now
  syncWorkflow();
}

export function onUpdate(fn) { listeners.push(fn); }
function notify() { listeners.forEach(fn => fn()); }

// Initial load
if (typeof window !== 'undefined') {
    syncWorkflow();
    setInterval(syncWorkflow, 60000);
}
