// ============================================================
// Library Store — Media + Caption Templates
// ============================================================

let mediaItems = [];
let templates = [];
let listeners = [];

// ── Media ──
export function addMedia(item) {
  const media = { id: crypto.randomUUID(), uploadedAt: new Date().toISOString(), usageCount: 0, tags: [], ...item };
  mediaItems.unshift(media);
  notify();
  return media;
}
export function removeMedia(id) { mediaItems = mediaItems.filter(m => m.id !== id); notify(); }
export function updateMediaTags(id, tags) { const m = mediaItems.find(x => x.id === id); if (m) { m.tags = tags; notify(); } }
export function incrementUsage(id) { const m = mediaItems.find(x => x.id === id); if (m) m.usageCount++; }

export function getMedia(filters = {}) {
  let r = [...mediaItems];
  if (filters.type) r = r.filter(m => m.type === filters.type);
  if (filters.tag) r = r.filter(m => m.tags.includes(filters.tag));
  if (filters.search) { const q = filters.search.toLowerCase(); r = r.filter(m => m.name.toLowerCase().includes(q) || m.tags.some(t => t.toLowerCase().includes(q))); }
  return r;
}

export function getAllTags() { const s = new Set(); mediaItems.forEach(m => m.tags.forEach(t => s.add(t))); return [...s].sort(); }

// ── Templates ──
export function addTemplate(data) {
  const t = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), usageCount: 0, platform: 'all', category: 'general', ...data };
  templates.unshift(t);
  notify();
  return t;
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
  t.usageCount++;
  let c = t.content;
  Object.entries(vars).forEach(([k, v]) => { c = c.replaceAll(`{{${k}}}`, v); });
  return c;
}

export function removeTemplate(id) { templates = templates.filter(t => t.id !== id); notify(); }

export function seedDefaultTemplates() {
  if (templates.length > 0) return;
  [
    { title: '🔥 Flash Sale', category: 'promotion', platform: 'all', content: '🔥 FLASH SALE {{discount}}% OFF!\n⏰ Chỉ còn {{hours}} giờ!\n🛍️ {{product}} - Giá từ {{price}}\n👉 Order: {{link}}\n#sale #{{brand}}', variables: ['discount','hours','product','price','link','brand'] },
    { title: '💬 Engagement', category: 'engagement', platform: 'facebook', content: 'Bạn thích {{topic}} như thế nào? 🤔\nComment chia sẻ nhé!\nTag bạn bè cùng trả lời 👇\n#{{brand}}', variables: ['topic','brand'] },
    { title: '📢 Product Launch', category: 'announcement', platform: 'all', content: '🎉 Ra mắt {{product_name}}!\n{{description}}\n✨ Nổi bật:\n• {{feature_1}}\n• {{feature_2}}\n• {{feature_3}}\n🛒 Đặt hàng: {{link}}\n#{{brand}} #launch', variables: ['product_name','description','feature_1','feature_2','feature_3','link','brand'] },
    { title: '🙏 Thank You', category: 'engagement', platform: 'all', content: 'Cảm ơn {{milestone}} khách hàng ❤️\nMã giảm {{discount}}%: {{code}}\nHạn: {{expiry}}\n#{{brand}}', variables: ['milestone','discount','code','expiry','brand'] },
    { title: '📸 IG Reels', category: 'engagement', platform: 'instagram', content: '{{caption}} ✨\nSave để xem lại 📌\nFollow {{brand}} 🔔\n{{hashtags}}', variables: ['caption','brand','hashtags'] }
  ].forEach(t => addTemplate(t));
}

export function onUpdate(fn) { listeners.push(fn); }
function notify() { listeners.forEach(fn => fn()); }
