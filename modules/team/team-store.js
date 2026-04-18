// ============================================================
// Team Store — Members, Roles, Invitations, Activity
// ============================================================

export const ROLES = {
  owner:   { id: 'owner',   label: 'Owner',   color: '#F59E0B', icon: '👑', permissions: ['*'] },
  manager: { id: 'manager', label: 'Manager', color: '#8B5CF6', icon: '💼', permissions: ['post.create','post.edit','post.delete','post.publish','post.approve','post.reject','post.submit_review','analytics.view','library.upload','library.manage','team.view','team.manage','inbox.reply','inbox.view'] },
  editor:  { id: 'editor',  label: 'Editor',  color: '#10B981', icon: '✍️', permissions: ['post.create','post.edit','post.submit_review','analytics.view','library.upload','library.view','inbox.view'] },
  viewer:  { id: 'viewer',  label: 'Viewer',  color: '#6B7280', icon: '👀', permissions: ['analytics.view','library.view','inbox.view'] }
};

let currentUser = { id: 'user-001', name: 'Trieu Nguyen', email: 'trieu@example.com', role: 'owner', avatar: null, joinedAt: new Date().toISOString(), lastActive: new Date().toISOString() };

let members = [{ ...currentUser, status: 'active' }];
let invitations = [];
let activities = [];
let listeners = [];

export function getCurrentUser() { return { ...currentUser }; }
export function setCurrentUser(u) { currentUser = { ...u }; }
export function getMembers() { return [...members]; }

export function addMember(data) {
  const member = { id: crypto.randomUUID(), status: 'active', joinedAt: new Date().toISOString(), lastActive: new Date().toISOString(), ...data };
  members.push(member);
  addActivity({ type: 'member_added', actorId: currentUser.id, actorName: currentUser.name, detail: `thêm ${member.name} với role ${ROLES[member.role]?.label}` });
  notify();
  return member;
}

export function updateMemberRole(memberId, newRole) {
  const m = members.find(x => x.id === memberId);
  if (!m || m.id === currentUser.id) return;
  const old = m.role; m.role = newRole;
  addActivity({ type: 'role_changed', actorId: currentUser.id, actorName: currentUser.name, detail: `đổi role ${m.name}: ${ROLES[old]?.label} → ${ROLES[newRole]?.label}` });
  notify();
}

export function removeMember(memberId) {
  const m = members.find(x => x.id === memberId);
  if (!m || memberId === currentUser.id) return;
  members = members.filter(x => x.id !== memberId);
  addActivity({ type: 'member_removed', actorId: currentUser.id, actorName: currentUser.name, detail: `xóa ${m.name} khỏi team` });
  notify();
}

export function createInvitation(email, role) {
  const inv = { id: crypto.randomUUID(), email, role, invitedBy: currentUser.id, invitedByName: currentUser.name, token: Math.random().toString(36).slice(2), createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), status: 'pending' };
  invitations.push(inv);
  notify();
  return inv;
}
export function getInvitations() { return [...invitations]; }
export function revokeInvitation(id) { invitations = invitations.filter(i => i.id !== id); notify(); }

export function addActivity(data) { activities.unshift({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...data }); activities = activities.slice(0, 200); }
export function getActivities(limit = 50) { return activities.slice(0, limit); }

export function onUpdate(fn) { listeners.push(fn); }
function notify() { listeners.forEach(fn => fn()); }
