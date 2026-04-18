/**
 * Client Manager — Manage client accounts within workspace (API Backed)
 * Track which team member manages which client
 */

let clients = [];
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

export async function syncClients() {
    try {
        const res = await apiFetch('/api/v1/agency/clients');
        if (res.success) {
            clients = res.data || [];
            notify();
        }
    } catch (e) {
        console.error('Clients sync error', e);
    }
}

// ── Create Client ─────────────────────────────────────────────
export async function addClient(clientData) {
    try {
        const res = await apiFetch('/api/v1/agency/clients', {
            method: 'POST',
            body: JSON.stringify(clientData)
        });
        if (res.success) {
            await syncClients();
            return res.data;
        }
    } catch (e) { return null; }
}

export function getClient(id) {
  return clients.find(c => c.id === id);
}

export function getWorkspaceClients(workspaceId) {
  return clients.filter(c => c.workspaceId === workspaceId);
}

export function getClientsByAssignee(workspaceId, userId) {
  return clients.filter(c => c.workspaceId === workspaceId && c.assignedTo === userId);
}

export async function updateClient(id, updates) {
    try {
        const res = await apiFetch(`/api/v1/agency/clients/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
        if (res.success) {
            await syncClients();
            return res.data;
        }
    } catch (e) { return null; }
}

export function reassignClient(clientId, newAssignee) {
  return updateClient(clientId, { assignedTo: newAssignee });
}

export function archiveClient(id) {
  return updateClient(id, { status: 'archived' });
}

export async function deleteClient(id) {
    try {
        const res = await apiFetch(`/api/v1/agency/clients/${id}`, { method: 'DELETE' });
        if (res.success) {
            await syncClients();
        }
    } catch (e) {}
}

// ── Client Social Accounts ────────────────────────────────────
export async function addClientSocialAccount(clientId, account) {
  const client = getClient(clientId);
  if (!client) return null;

  const socialAccounts = client.socialAccounts || [];
  socialAccounts.push({
    id: crypto.randomUUID(),
    platform: account.platform,
    handle: account.handle,
    url: account.url,
    connected: account.connected || false,
    connectedAt: account.connected ? new Date().toISOString() : null
  });

  return await updateClient(clientId, { socialAccounts });
}

export async function removeClientSocialAccount(clientId, accountId) {
  const client = getClient(clientId);
  if (!client) return null;
  const socialAccounts = (client.socialAccounts || []).filter(a => a.id !== accountId);
  return await updateClient(clientId, { socialAccounts });
}

// ── Client Analytics ──────────────────────────────────────────
export function getClientMetrics(clientId) {
  const client = getClient(clientId);
  if (!client) return null;

  // Mock metrics per client
  return {
    clientId,
    clientName: client.name,
    postsCreated: Math.floor(Math.random() * 100),
    totalReach: Math.floor(Math.random() * 100000),
    totalEngagement: Math.floor(Math.random() * 10000),
    avgER: (Math.random() * 10).toFixed(1),
    revenue: Math.floor(Math.random() * 50000000)
  };
}

// ── Client Status ─────────────────────────────────────────────
export function getClientStatus(clientId) {
  const client = getClient(clientId);
  if (!client) return null;

  const metrics = getClientMetrics(clientId);

  return {
    client: client.name,
    status: client.status,
    assignedTo: client.assignedTo,
    plan: client.plan,
    budgetRemaining: client.monthlyBudget,
    metrics
  };
}

export function onUpdate(fn) { listeners.push(fn); }
function notify() { listeners.forEach(fn => fn()); }

// Initialize
if (typeof window !== 'undefined') {
    syncClients();
    window.syncClients = syncClients; // Allow workspace-manager to trigger resync
}
