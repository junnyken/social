/**
 * Billing Manager — Subscription, invoices, usage tracking
 */

let subscriptions = [];
let invoices = [];

// ── Create Subscription ───────────────────────────────────────
export function createSubscription(subData) {
  const subscription = {
    id: crypto.randomUUID(),
    workspaceId: subData.workspaceId,
    plan: subData.plan,  // free, starter, pro, agency
    status: 'active',    // active, cancelled, past_due
    billingCycle: 'monthly',
    amount: subData.amount,
    currency: 'VND',
    startDate: new Date().toISOString(),
    renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    autoRenew: true,
    cardEnding: subData.cardEnding,
    createdAt: new Date().toISOString()
  };

  subscriptions.push(subscription);
  return subscription;
}

export function getSubscription(workspaceId) {
  return subscriptions.find(s => s.workspaceId === workspaceId);
}

export function updateSubscription(workspaceId, updates) {
  const sub = getSubscription(workspaceId);
  if (sub) {
    Object.assign(sub, updates);
  }
  return sub;
}

export function cancelSubscription(workspaceId) {
  const sub = getSubscription(workspaceId);
  if (sub) {
    sub.status = 'cancelled';
    sub.cancelledAt = new Date().toISOString();
  }
  return sub;
}

// ── Invoices ──────────────────────────────────────────────────
export function createInvoice(invoiceData) {
  const invoice = {
    id: crypto.randomUUID(),
    invoiceNumber: `INV-${Date.now()}`,
    workspaceId: invoiceData.workspaceId,
    subscriptionId: invoiceData.subscriptionId,
    amount: invoiceData.amount,
    currency: 'VND',
    status: 'paid',  // paid, pending, failed
    billingPeriodStart: invoiceData.periodStart,
    billingPeriodEnd: invoiceData.periodEnd,
    issuedAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    paidAt: invoiceData.status === 'paid' ? new Date().toISOString() : null,
    items: invoiceData.items || []
  };

  invoices.push(invoice);
  return invoice;
}

export function getInvoices(workspaceId, limit = 20) {
  return invoices
    .filter(i => i.workspaceId === workspaceId)
    .sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt))
    .slice(0, limit);
}

export function getInvoice(invoiceId) {
  return invoices.find(i => i.id === invoiceId);
}

// ── Usage Tracking ────────────────────────────────────────────
export function trackUsage(workspaceId, metric, value) {
  // Track: posts_published, api_calls, storage_used, team_members
  const usage = {
    id: crypto.randomUUID(),
    workspaceId,
    metric,
    value,
    timestamp: new Date().toISOString()
  };

  return usage;
}

export function getBillingOverview(workspaceId) {
  const sub = getSubscription(workspaceId);
  const recentInvoices = getInvoices(workspaceId, 3);

  return {
    workspace: workspaceId,
    plan: sub?.plan,
    status: sub?.status,
    currentAmount: sub?.amount,
    currency: 'VND',
    renewalDate: sub?.renewalDate,
    autoRenew: sub?.autoRenew,
    recentInvoices,
    nextInvoiceDate: sub?.renewalDate
  };
}
