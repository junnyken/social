// ============================================================
// Link-in-Bio Service
// Create customizable landing pages for social media bios
// ============================================================

const dataService = require('./data.service');
const crypto = require('crypto');

class LinkInBioService {

    async getPages() {
        return await dataService.read('linkinbio_pages') || [];
    }

    async getPage(id) {
        const pages = await this.getPages();
        return pages.find(p => p.id === id) || null;
    }

    async getPageBySlug(slug) {
        const pages = await this.getPages();
        return pages.find(p => p.slug === slug) || null;
    }

    async createPage(data) {
        const pages = await this.getPages();

        // Generate unique slug
        let slug = (data.slug || data.title || 'mypage')
            .toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
        if (pages.find(p => p.slug === slug)) slug += '-' + Math.random().toString(36).substr(2, 4);

        const page = {
            id: crypto.randomUUID(),
            slug,
            title: data.title || 'My Links',
            bio: data.bio || '',
            avatarUrl: data.avatarUrl || null,
            theme: data.theme || 'default', // default | dark | gradient | minimal | neon
            customColors: {
                background: data.bgColor || '#0f172a',
                cardBg: data.cardBg || '#1e293b',
                text: data.textColor || '#f1f5f9',
                accent: data.accentColor || '#3b82f6',
                buttonBg: data.buttonBg || '#3b82f6',
                buttonText: data.buttonText || '#ffffff'
            },
            links: [],
            socials: {
                facebook: data.facebook || '',
                instagram: data.instagram || '',
                twitter: data.twitter || '',
                tiktok: data.tiktok || '',
                youtube: data.youtube || '',
                website: data.website || ''
            },
            analytics: {
                totalViews: 0,
                totalClicks: 0,
                viewHistory: []
            },
            isPublished: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        pages.push(page);
        await dataService.write('linkinbio_pages', pages);
        return page;
    }

    async updatePage(id, updates) {
        const pages = await this.getPages();
        const idx = pages.findIndex(p => p.id === id);
        if (idx === -1) throw new Error('Page not found');

        // Don't overwrite nested objects completely
        if (updates.customColors) {
            pages[idx].customColors = { ...pages[idx].customColors, ...updates.customColors };
            delete updates.customColors;
        }
        if (updates.socials) {
            pages[idx].socials = { ...pages[idx].socials, ...updates.socials };
            delete updates.socials;
        }

        Object.assign(pages[idx], updates, { updatedAt: new Date().toISOString() });
        await dataService.write('linkinbio_pages', pages);
        return pages[idx];
    }

    async addLink(pageId, linkData) {
        const pages = await this.getPages();
        const page = pages.find(p => p.id === pageId);
        if (!page) throw new Error('Page not found');

        const link = {
            id: crypto.randomUUID(),
            title: linkData.title || 'Link',
            url: linkData.url || '#',
            icon: linkData.icon || '🔗',
            thumbnail: linkData.thumbnail || null,
            isActive: true,
            clicks: 0,
            position: page.links.length,
            addedAt: new Date().toISOString()
        };

        page.links.push(link);
        page.updatedAt = new Date().toISOString();
        await dataService.write('linkinbio_pages', pages);
        return link;
    }

    async updateLink(pageId, linkId, updates) {
        const pages = await this.getPages();
        const page = pages.find(p => p.id === pageId);
        if (!page) throw new Error('Page not found');

        const link = page.links.find(l => l.id === linkId);
        if (!link) throw new Error('Link not found');

        Object.assign(link, updates);
        page.updatedAt = new Date().toISOString();
        await dataService.write('linkinbio_pages', pages);
        return link;
    }

    async removeLink(pageId, linkId) {
        const pages = await this.getPages();
        const page = pages.find(p => p.id === pageId);
        if (!page) throw new Error('Page not found');

        page.links = page.links.filter(l => l.id !== linkId);
        page.updatedAt = new Date().toISOString();
        await dataService.write('linkinbio_pages', pages);
    }

    async reorderLinks(pageId, linkIds) {
        const pages = await this.getPages();
        const page = pages.find(p => p.id === pageId);
        if (!page) throw new Error('Page not found');

        const reordered = [];
        linkIds.forEach((id, i) => {
            const link = page.links.find(l => l.id === id);
            if (link) { link.position = i; reordered.push(link); }
        });
        page.links = reordered;
        page.updatedAt = new Date().toISOString();
        await dataService.write('linkinbio_pages', pages);
        return page.links;
    }

    // Track page view
    async trackView(slug) {
        const pages = await this.getPages();
        const page = pages.find(p => p.slug === slug);
        if (!page) return null;

        page.analytics.totalViews++;
        page.analytics.viewHistory.push({
            timestamp: new Date().toISOString(),
            userAgent: 'browser'
        });

        // Keep last 1000 views
        if (page.analytics.viewHistory.length > 1000) {
            page.analytics.viewHistory = page.analytics.viewHistory.slice(-1000);
        }

        await dataService.write('linkinbio_pages', pages);
        return page;
    }

    // Track link click
    async trackClick(slug, linkId) {
        const pages = await this.getPages();
        const page = pages.find(p => p.slug === slug);
        if (!page) return null;

        const link = page.links.find(l => l.id === linkId);
        if (link) {
            link.clicks++;
            page.analytics.totalClicks++;
        }

        await dataService.write('linkinbio_pages', pages);
        return link;
    }

    // Render the public bio page HTML
    renderPublicPage(page) {
        const c = page.customColors;
        const socialLinks = Object.entries(page.socials)
            .filter(([, v]) => v)
            .map(([k, v]) => {
                const icons = { facebook: '📘', instagram: '📸', twitter: '🐦', tiktok: '🎵', youtube: '📺', website: '🌐' };
                return `<a href="${v}" target="_blank" style="font-size:24px;text-decoration:none;" title="${k}">${icons[k] || '🔗'}</a>`;
            }).join(' ');

        return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${page.title}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',sans-serif; background:${c.background}; color:${c.text}; min-height:100vh; display:flex; justify-content:center; padding:40px 20px; }
    .container { width:100%; max-width:420px; text-align:center; }
    .avatar { width:96px; height:96px; border-radius:50%; background:${c.accent}; margin:0 auto 16px; display:flex; align-items:center; justify-content:center; font-size:40px; border:3px solid ${c.accent}; }
    .avatar img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    h1 { font-size:22px; margin-bottom:6px; }
    .bio { font-size:14px; opacity:0.7; margin-bottom:24px; line-height:1.5; }
    .links { display:flex; flex-direction:column; gap:12px; margin-bottom:32px; }
    .link-btn { display:flex; align-items:center; gap:12px; padding:16px 20px; background:${c.cardBg}; border:1px solid rgba(255,255,255,0.08); border-radius:14px; text-decoration:none; color:${c.text}; transition:all 0.2s; cursor:pointer; }
    .link-btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.3); border-color:${c.accent}40; }
    .link-icon { font-size:22px; }
    .link-title { flex:1; text-align:left; font-weight:600; font-size:15px; }
    .link-arrow { opacity:0.3; font-size:18px; }
    .socials { display:flex; justify-content:center; gap:16px; margin-bottom:24px; }
    .footer { font-size:11px; opacity:0.3; }
    .footer a { color:${c.accent}; text-decoration:none; }
</style>
</head><body>
<div class="container">
    <div class="avatar">${page.avatarUrl ? `<img src="${page.avatarUrl}" alt="avatar">` : '👤'}</div>
    <h1>${page.title}</h1>
    ${page.bio ? `<p class="bio">${page.bio}</p>` : ''}
    
    <div class="links">
        ${page.links.filter(l => l.isActive).map(l => `
            <a href="${l.url}" target="_blank" class="link-btn" onclick="fetch('/api/v1/bio/click/${page.slug}/${l.id}',{method:'POST'})">
                <span class="link-icon">${l.icon}</span>
                <span class="link-title">${l.title}</span>
                <span class="link-arrow">→</span>
            </a>
        `).join('')}
    </div>

    ${socialLinks ? `<div class="socials">${socialLinks}</div>` : ''}
    <div class="footer">Powered by <a href="/">SocialHub</a></div>
</div>
<script>fetch('/api/v1/bio/view/${page.slug}',{method:'POST'});</script>
</body></html>`;
    }

    async deletePage(id) {
        let pages = await this.getPages();
        pages = pages.filter(p => p.id !== id);
        await dataService.write('linkinbio_pages', pages);
    }
}

module.exports = new LinkInBioService();
