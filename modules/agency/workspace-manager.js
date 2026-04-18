/**
 * Workspace Manager — Multi-workspace support
 * Each workspace = separate social accounts, team, settings
 */

let workspaces = [];
let currentWorkspaceId = null;
let workspaceSubscriptions = {};

// Default workspace (personal)
function initializeDefaultWorkspace() {
  const personal = {
    id: crypto.randomUUID(),
    name: 'Personal',
    type: 'personal',
    owner: 'current_user',
    members: [],
    settings: {
      timezone: 'Asia/Ho_Chi_Minh',
      language: 'vi',
      theme: 'auto',
      integrations: {
        ga4: false,
        facebook: false,
        instagram: false
      }
    },
    plan: 'free',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  workspaces.push(personal);
  currentWorkspaceId = personal.id;
  return personal;
}

// Initialize on load
if (workspaces.length === 0) {
  initializeDefaultWorkspace();
}

// ── Workspace CRUD ────────────────────────────────────────────
export function createWorkspace(data) {
  const workspace = {
    id: crypto.randomUUID(),
    name: data.name,
    type: data.type || 'team',  // personal, team, agency
    owner: data.owner,
    members: [{ userId: data.owner, role: 'owner' }],
    settings: {
      timezone: data.timezone || 'Asia/Ho_Chi_Minh',
      language: 'vi',
      theme: 'auto',
      integrations: {}
    },
    plan: data.plan || 'free',
    maxTeamMembers: data.maxTeamMembers || (data.type === 'agency' ? 50 : 10),
    features: getFeaturesByPlan(data.plan || 'free'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  workspaces.push(workspace);
  return workspace;
}

export function getWorkspace(id = currentWorkspaceId) {
  const ws = workspaces.find(w => w.id === id);
  return ws ? { ...ws } : null;
}

export function updateWorkspace(id, updates) {
  const ws = workspaces.find(w => w.id === id);
  if (ws) {
    Object.assign(ws, updates, { updatedAt: new Date().toISOString() });
  }
  return ws;
}

export function deleteWorkspace(id) {
  if (id === currentWorkspaceId) {
    return { error: 'Cannot delete active workspace' };
  }

  workspaces = workspaces.filter(w => w.id !== id);
  delete workspaceSubscriptions[id];
  return { success: true };
}

export function switchWorkspace(id) {
  const ws = getWorkspace(id);
  if (!ws) return { error: 'Workspace not found' };

  currentWorkspaceId = id;
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
export function updateWorkspaceSettings(workspaceId, settings) {
  const ws = getWorkspace(workspaceId);
  if (ws) {
    ws.settings = { ...ws.settings, ...settings };
    ws.updatedAt = new Date().toISOString();
  }
  return ws;
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
    features: [
      'Basic posting',
      'Queue (50 posts)',
      'Analytics (basic)',
      'UTM builder',
      'Single workspace'
    ]
  },
  starter: {
    name: 'Starter',
    price: 99000,  // VND
    maxMembers: 3,
    maxClients: 15,
    features: [
      'All Free +',
      'AI content generation',
      'Advanced analytics',
      'Link tracking',
      'CSV bulk upload',
      'Team (3 members)',
      'Up to 5 workspaces'
    ]
  },
  pro: {
    name: 'Pro',
    price: 299000,
    maxMembers: 10,
    maxClients: 50,
    features: [
      'All Starter +',
      'Advanced AI (sentiment, trends)',
      'Pixel tracking',
      'RSS auto-post',
      'Content recycling',
      'Team (10 members)',
      'Unlimited workspaces',
      'API access'
    ]
  },
  agency: {
    name: 'Agency',
    price: 999000,
    maxMembers: 50,
    maxClients: 'unlimited',
    features: [
      'All Pro +',
      'Custom branding',
      'White-label option',
      'Advanced reporting',
      'Dedicated support',
      'Team (50 members)',
      'Client billing',
      'Multi-currency'
    ]
  }
};

export function getFeaturesByPlan(plan) {
  return WORKSPACE_PLANS[plan]?.features || [];
}

export function upgradePlan(workspaceId, newPlan) {
  const ws = getWorkspace(workspaceId);
  if (!ws) return { error: 'Workspace not found' };

  const oldPlan = ws.plan;
  ws.plan = newPlan;
  ws.features = getFeaturesByPlan(newPlan);

  workspaceSubscriptions[workspaceId] = {
    plan: newPlan,
    upgradedAt: new Date().toISOString(),
    from: oldPlan,
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  };

  return { success: true, workspace: ws };
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
      current: 0,  // Count from client-manager
      limit: plan?.maxClients
    },
    storage: {
      used: 2.5,  // GB
      limit: 100,
      percentage: 2.5
    }
  };
}
