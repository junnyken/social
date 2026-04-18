// ============================================================
// Library Store — Media + Caption Templates (API Backed)
// ============================================================

let mediaItems = [];
let templates = [];
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

export async function syncLibrary() {
    try {
        const data = await apiFetch('/api/v1/library');
        if (data.success) {
            mediaItems = data.data.mediaItems || [];
            templates = data.data.templates || [];
            notify();
        }
    } catch (e) { console.error('Library sync error', e); }
}

// ── Media ──
export async function addMedia(item) {
    try {
        const res = await apiFetch('/api/v1/library/media', {
            method: 'POST',
            body: JSON.stringify(item)
        });
        if (res.success) {
            await syncLibrary();
            return res.data;
        }
    } catch (e) {}
}

export async function removeMedia(id) {
    try {
        const res = await apiFetch(`/api/v1/library/media/${id}`, { method: 'DELETE' });
        if (res.success) {
            await syncLibrary();
        }
    } catch (e) {}
}

export async function updateMediaTags(id, tags) {
    try {
        const res = await apiFetch(`/api/v1/library/media/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ tags })
        });
        if (res.success) {
            await syncLibrary();
        }
    } catch (e) {}
}

export async function incrementUsage(id) {
    const m = mediaItems.find(x => x.id === id);
    if (!m) return;
    try {
        await apiFetch(`/api/v1/library/media/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ usageCount: m.usageCount + 1 })
        });
        await syncLibrary();
    } catch (e) {}
}

export function getMedia(filters = {}) {
  let r = [...mediaItems];
  if (filters.type) r = r.filter(m => m.type === filters.type);
  if (filters.tag) r = r.filter(m => (m.tags||[]).includes(filters.tag));
  if (filters.search) { const q = filters.search.toLowerCase(); r = r.filter(m => m.name.toLowerCase().includes(q) || (m.tags||[]).some(t => t.toLowerCase().includes(q))); }
  return r;
}

export function getAllTags() { const s = new Set(); mediaItems.forEach(m => (m.tags||[]).forEach(t => s.add(t))); return [...s].sort(); }

// ── Templates ──
export async function addTemplate(data) {
    try {
        const res = await apiFetch('/api/v1/library/templates', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (res.success) {
            await syncLibrary();
            return res.data;
        }
    } catch (e) {}
}

export function getTemplates(filters = {}) {
  let r = [...templates];
  if (filters.platform && filters.platform !== 'all') r = r.filter(t => t.platform === 'all' || t.platform === filters.platform);
  if (filters.category) r = r.filter(t => t.category === filters.category);
  if (filters.search) { const q = filters.search.toLowerCase(); r = r.filter(t => t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q)); }
  return r;
}

export function useTemplate(id, vars = {}) {
  const t = templates.find(x => x.id === id);
  if (!t) return null;
  // Note: Local update for fast response, would usually send a usage record or patch usageCount.
  t.usageCount++;
  let c = t.content;
  Object.entries(vars).forEach(([k, v]) => { c = c.replaceAll(`{{${k}}}`, v); });
  return c;
}

export async function removeTemplate(id) {
    try {
        const res = await apiFetch(`/api/v1/library/templates/${id}`, { method: 'DELETE' });
        if (res.success) {
            await syncLibrary();
        }
    } catch (e) {}
}

export function seedDefaultTemplates() {
  // Deprecated - Seeded by backend GET
}

export function onUpdate(fn) { listeners.push(fn); }
function notify() { listeners.forEach(fn => fn()); }

// Initial load
if (typeof window !== 'undefined') {
    syncLibrary();
}
