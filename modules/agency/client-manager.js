/**
 * Client Manager — Manage client accounts within workspace
 * Track which team member manages which client
 */

let clients = [];

// ── Create Client ─────────────────────────────────────────────
export function addClient(clientData) {
  const client = {
    id: crypto.randomUUID(),
    workspaceId: clientData.workspaceId,
    name: clientData.name,
    industry: clientData.industry,
    email: clientData.email,
    phone: clientData.phone,
    website: clientData.website,
    socialAccounts: clientData.socialAccounts || [],  // {platform, handle, url}
    assignedTo: clientData.assignedTo,  // userId
    status: 'active',  // active, paused, archived
    plan: clientData.plan || 'free',
    monthlyBudget: clientData.monthlyBudget || 0,
    notes: clientData.notes,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };

  clients.push(client);
  return client;
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

export function updateClient(id, updates) {
  const client = getClient(id);
  if (client) {
    Object.assign(client, updates, { lastModified: new Date().toISOString() });
  }
  return client;
}

export function reassignClient(clientId, newAssignee) {
  return updateClient(clientId, { assignedTo: newAssignee });
}

export function archiveClient(id) {
  return updateClient(id, { status: 'archived' });
}

export function deleteClient(id) {
  clients = clients.filter(c => c.id !== id);
}

// ── Client Social Accounts ────────────────────────────────────
export function addClientSocialAccount(clientId, account) {
  const client = getClient(clientId);
  if (!client) return null;

  client.socialAccounts.push({
    id: crypto.randomUUID(),
    platform: account.platform,
    handle: account.handle,
    url: account.url,
    connected: account.connected || false,
    connectedAt: account.connected ? new Date().toISOString() : null
  });

  return client;
}

export function removeClientSocialAccount(clientId, accountId) {
  const client = getClient(clientId);
  if (client) {
    client.socialAccounts = client.socialAccounts.filter(a => a.id !== accountId);
  }
  return client;
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

  const isActive = client.status === 'active';
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
