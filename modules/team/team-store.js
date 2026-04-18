// ============================================================
// Team Store — Members, Roles, Invitations, Activity (API Backed)
// ============================================================

import { emit, onSocketEvent } from '../collab/socket-client.js';

export const ROLES = {
  owner:   { id: 'owner',   label: 'Owner',   color: '#F59E0B', icon: '👑', permissions: ['*'] },
  manager: { id: 'manager', label: 'Manager', color: '#8B5CF6', icon: '💼', permissions: ['post.create','post.edit','post.delete','post.publish','post.approve','post.reject','post.submit_review','analytics.view','library.upload','library.manage','team.view','team.manage','inbox.reply','inbox.view'] },
  editor:  { id: 'editor',  label: 'Editor',  color: '#10B981', icon: '✍️', permissions: ['post.create','post.edit','post.submit_review','analytics.view','library.upload','library.view','inbox.view'] },
  viewer:  { id: 'viewer',  label: 'Viewer',  color: '#6B7280', icon: '👀', permissions: ['analytics.view','library.view','inbox.view'] }
};

let currentUser = { id: 'user-001', name: 'Trieu Nguyen', email: 'trieu@example.com', role: 'owner', avatar: null, joinedAt: new Date().toISOString(), lastActive: new Date().toISOString() };
let members = [];
let invitations = [];
let activities = [];
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

export async function syncTeam() {
    try {
        const data = await apiFetch('/api/v1/team');
        if (data.success) {
            members = data.data.members || [];
            invitations = data.data.invitations || [];
            activities = data.data.activities || [];
            
            // Set current user if found in members (using a mocked ID matcher or default)
            // Just placeholder for now
            if (members.length > 0) {
                currentUser = members.find(m => m.role === 'owner') || members[0];
            }
            notify();
        }
    } catch (e) { console.error('Team sync error', e); }
}

onSocketEvent((event) => {
    if (event.type === 'team_updated') {
        syncTeam();
    }
});

export function getCurrentUser() { return { ...currentUser }; }
export function setCurrentUser(u) { currentUser = { ...u }; }
export function getMembers() { return [...members]; }

export async function addMember(data) {
    try {
        const res = await apiFetch('/api/v1/team/members', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (res.success) {
            await syncTeam();
            return res.data;
        }
    } catch (e) {}
}

export async function updateMemberRole(memberId, newRole) {
    try {
        const res = await apiFetch(`/api/v1/team/members/${memberId}`, {
            method: 'PATCH',
            body: JSON.stringify({ role: newRole })
        });
        if (res.success) {
            await syncTeam();
        }
    } catch (e) {}
}

export async function removeMember(memberId) {
    try {
        const res = await apiFetch(`/api/v1/team/members/${memberId}`, { method: 'DELETE' });
        if (res.success) {
            await syncTeam();
        }
    } catch (e) {}
}

export async function createInvitation(email, role) {
    try {
        const res = await apiFetch('/api/v1/team/invitations', {
            method: 'POST',
            body: JSON.stringify({ email, role })
        });
        if (res.success) {
            await syncTeam();
            return res.data;
        }
    } catch (e) {}
}

export function getInvitations() { return [...invitations]; }

export async function revokeInvitation(id) {
    try {
        const res = await apiFetch(`/api/v1/team/invitations/${id}`, { method: 'DELETE' });
        if (res.success) {
            await syncTeam();
        }
    } catch (e) {}
}

export function addActivity(data) { 
    // In real scenario, backend handles this internally or via POST,
    // but the store UI shouldn't arbitrarily add it.
}

export function getActivities(limit = 50) { return activities.slice(0, limit); }

export function onUpdate(fn) { listeners.push(fn); }
function notify() { listeners.forEach(fn => fn()); }

if (typeof window !== 'undefined') {
    syncTeam();
}
