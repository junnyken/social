/**
 * Workspace Manager — Multi-workspace support (API Backed)
 * Each workspace = separate social accounts, team, settings
 */

let workspaces = [];
let currentWorkspaceId = null;
let workspaceSubscriptions = {};
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

export async function syncWorkspaces() {
    try {
        const res = await apiFetch('/api/v1/agency/workspaces');
        if (res.success) {
            workspaces = res.data || [];
            if (!currentWorkspaceId && workspaces.length > 0) {
                currentWorkspaceId = workspaces[0].id;
            }
            notify();
        }
    } catch (e) {
        console.error('Workspaces sync error', e);
    }
}

// ── Workspace CRUD ────────────────────────────────────────────
export async function createWorkspace(data) {
    try {
        const res = await apiFetch('/api/v1/agency/workspaces', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (res.success) {
            await syncWorkspaces();
            return res.data;
        }
    } catch (e) {
        return { error: e.message };
    }
}

export function getWorkspace(id = currentWorkspaceId) {
  const ws = workspaces.find(w => w.id === id);
  return ws ? { ...ws } : null;
}

export async function updateWorkspace(id, updates) {
    try {
        const res = await apiFetch(`/api/v1/agency/workspaces/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
        if (res.success) {
            await syncWorkspaces();
            return res.data;
        }
    } catch (e) {
        return null;
    }
}

export async function deleteWorkspace(id) {
  if (id === currentWorkspaceId) return { error: 'Cannot delete active workspace' };
  try {
      const res = await apiFetch(`/api/v1/agency/workspaces/${id}`, { method: 'DELETE' });
      if (res.success) {
          await syncWorkspaces();
          delete workspaceSubscriptions[id];
          return { success: true };
      }
  } catch (e) {}
  return { error: 'Delete failed' };
}

export function switchWorkspace(id) {
  const ws = getWorkspace(id);
  if (!ws) return { error: 'Workspace not found' };

  currentWorkspaceId = id;
  notify();
  // We trigger client sync elsewhere or here if needed
  if (window.syncClients) window.syncClients();
  return { success: true, workspace: ws };
}

export function getCurrentWorkspace() {
  return getWorkspace(currentWorkspaceId);
}

export function getUserWorkspaces(userId) {
  return workspaces.filter(w => w.members.some(m => m.userId === userId));
}

export function getAllWorkspaces() { return [...workspaces]; }

// ── Workspace Settings ────────────────────────────────────────
export async function updateWorkspaceSettings(workspaceId, settings) {
  const ws = getWorkspace(workspaceId);
  if (ws) {
      const newSettings = { ...ws.settings, ...settings };
      return await updateWorkspace(workspaceId, { settings: newSettings });
  }
}

export function getWorkspaceSettings(workspaceId = currentWorkspaceId) {
  const ws = getWorkspace(workspaceId);
  return ws ? ws.settings : null;
}

// ── Workspace Plan & Features ─────────────────────────────────
export const WORKSPACE_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    maxMembers: 1,
    maxClients: 5,
    features: ['Basic posting', 'Queue (50 posts)', 'Analytics (basic)', 'UTM builder', 'Single workspace']
  },
  starter: {
    name: 'Starter',
    price: 99000,  // VND
    maxMembers: 3,
    maxClients: 15,
    features: ['All Free +', 'AI content generation', 'Advanced analytics', 'Link tracking', 'CSV bulk upload', 'Team (3 members)', 'Up to 5 workspaces']
  },
  pro: {
    name: 'Pro',
    price: 299000,
    maxMembers: 10,
    maxClients: 50,
    features: ['All Starter +', 'Advanced AI (sentiment, trends)', 'Pixel tracking', 'RSS auto-post', 'Content recycling', 'Team (10 members)', 'Unlimited workspaces', 'API access']
  },
  agency: {
    name: 'Agency',
    price: 999000,
    maxMembers: 50,
    maxClients: 'unlimited',
    features: ['All Pro +', 'Custom branding', 'White-label option', 'Advanced reporting', 'Dedicated support', 'Team (50 members)', 'Client billing', 'Multi-currency']
  }
};

export function getFeaturesByPlan(plan) {
  return WORKSPACE_PLANS[plan]?.features || [];
}

export async function upgradePlan(workspaceId, newPlan) {
  const ws = getWorkspace(workspaceId);
  if (!ws) return { error: 'Workspace not found' };

  const oldPlan = ws.plan;
  const res = await updateWorkspace(workspaceId, { plan: newPlan, features: getFeaturesByPlan(newPlan) });
  
  if (res) {
      workspaceSubscriptions[workspaceId] = {
        plan: newPlan,
        upgradedAt: new Date().toISOString(),
        from: oldPlan,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
      return { success: true, workspace: res };
  }
  return { error: 'Upgrade failed' };
}

export function getWorkspacePlan(workspaceId = currentWorkspaceId) {
  const ws = getWorkspace(workspaceId);
  return ws ? WORKSPACE_PLANS[ws.plan] : null;
}

// ── Usage Statistics ──────────────────────────────────────────
export function getWorkspaceUsage(workspaceId = currentWorkspaceId) {
  const ws = getWorkspace(workspaceId);
  const plan = WORKSPACE_PLANS[ws?.plan];

  return {
    workspace: ws?.name,
    plan: ws?.plan,
    members: {
      current: ws?.members?.length || 0,
      limit: plan?.maxMembers
    },
    clients: {
      current: 0,  // Might be populated by UI integrating client store
      limit: plan?.maxClients
    },
    storage: {
      used: 2.5,  // GB
      limit: 100,
      percentage: 2.5
    }
  };
}

export function onUpdate(fn) { listeners.push(fn); }
function notify() { listeners.forEach(fn => fn()); }

if(typeof window !== 'undefined') {
    syncWorkspaces();
}
