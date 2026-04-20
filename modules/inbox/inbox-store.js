// ============================================================
// Inbox Store — In-memory message management
// ============================================================

let messages = [];
let unreadCount = 0;
const listeners = [];

export function addMessages(newMessages) {
  const existingIds = new Set(messages.map(m => m.id));
  const added = newMessages.filter(m => !existingIds.has(m.id));
  messages = [...added, ...messages].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  unreadCount += added.filter(m => !m.read).length;
  notifyListeners();
  return added.length;
}

export async function markRead(messageId) {
  const msg = messages.find(m => m.id === messageId);
  if (msg && !msg.read) { 
    msg.read = true; 
    unreadCount = Math.max(0, unreadCount - 1); 
    notifyListeners(); 
    // Persist
    if (messageId.startsWith('fb_')) fetch(`/api/v1/inbox/messages/${messageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ read: true }) }).catch(e => console.error(e));
  }
}

export async function markDone(messageId) {
  const msg = messages.find(m => m.id === messageId);
  if (msg) { 
    msg.status = 'done'; 
    notifyListeners(); 
    // Persist
    if (messageId.startsWith('fb_')) fetch(`/api/v1/inbox/messages/${messageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'done' }) }).catch(e => console.error(e));
  }
}

export function getMessages(filters = {}) {
  let result = [...messages];
  if (filters.platform) result = result.filter(m => m.platform === filters.platform);
  if (filters.type) result = result.filter(m => m.type === filters.type);
  if (filters.status === 'unread') result = result.filter(m => !m.read);
  if (filters.status === 'done') result = result.filter(m => m.status === 'done');
  if (filters.pageId && filters.pageId !== 'all') result = result.filter(m => m.pageId === filters.pageId || m.accountId === filters.pageId || m.targetId === filters.pageId);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(m => m.text.toLowerCase().includes(q) || m.from.toLowerCase().includes(q));
  }
  return result;
}

export function getUnreadCount() { return unreadCount; }
export function onUpdate(fn) { listeners.push(fn); }
function notifyListeners() { listeners.forEach(fn => fn()); }
