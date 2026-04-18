/**
 * RSS Auto-Post — Tự động lấy bài từ RSS feed, post lên social
 */
import { addToQueue, saveDraft } from './scheduler-store.js';

// ── RSS Feed Store ────────────────────────────────────────────
let rssFeeds = [];

export function addRSSFeed(feedConfig) {
  const feed = {
    id: crypto.randomUUID(),
    url: feedConfig.url,
    title: feedConfig.title || '',
    platform: feedConfig.platform || 'facebook',
    template: feedConfig.template || defaultPostTemplate,
    enabled: true,
    checkInterval: feedConfig.checkInterval || 60,  // minutes
    lastChecked: null,
    createdAt: new Date().toISOString()
  };
  rssFeeds.push(feed);
  return feed;
}

export function getRSSFeeds() { return [...rssFeeds]; }
export function updateRSSFeed(id, updates) {
  const feed = rssFeeds.find(f => f.id === id);
  if (feed) Object.assign(feed, updates);
  return feed;
}
export function removeRSSFeed(id) {
  rssFeeds = rssFeeds.filter(f => f.id !== id);
}

const defaultPostTemplate = `
{title}

{description}

🔗 Link: {link}

#autoblog #news
`.trim();

// ── Fetch & Parse RSS ─────────────────────────────────────────
export async function fetchRSSFeed(feedUrl) {
  try {
    // In production: call backend that parses XML
    // For demo: return mock data
    return getMockRSSItems();
  } catch (err) {
    return { error: err.message, items: [] };
  }
}

// Mock RSS data
function getMockRSSItems() {
  return {
    items: [
      {
        title: 'AI Breakthroughs in 2026',
        description: 'Latest advances in artificial intelligence...',
        link: 'https://example.com/article/ai-2026',
        pubDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        title: 'Social Media Marketing Trends',
        description: 'Top trends shaping social media strategy...',
        link: 'https://example.com/article/social-trends-2026',
        pubDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      }
    ]
  };
}

// ── Generate Post from RSS Item ───────────────────────────────
export function generatePostFromRSSItem(item, template) {
  let text = template
    .replace('{title}', item.title || '')
    .replace('{description}', (item.description || '').slice(0, 200))
    .replace('{link}', item.link || '')
    .replace('{author}', item.author || '');

  // Auto-shorten for Twitter
  if (text.length > 280) {
    text = text.slice(0, 270) + '... {link}';
  }

  return {
    text,
    sourceUrl: item.link,
    sourceTitle: item.title,
    isAutoPosted: true,
    type: 'rss'
  };
}

// ── Auto-Post RSS ─────────────────────────────────────────────
export async function autoPostFromRSS(feedId, options = {}) {
  // options: { limit: 5, asDraft: true }
  const feed = rssFeeds.find(f => f.id === feedId);
  if (!feed) return { error: 'Feed not found' };

  const rssData = await fetchRSSFeed(feed.url);
  if (rssData.error) return { error: rssData.error };

  const posted = [];
  const items = rssData.items.slice(0, options.limit || 5);

  items.forEach((item, i) => {
    const post = generatePostFromRSSItem(item, feed.template);

    // Schedule: spread out over next 7 days
    const scheduleTime = new Date();
    scheduleTime.setDate(scheduleTime.getDate() + Math.floor(i / 2));
    scheduleTime.setHours(9 + (i % 2) * 8, 0, 0, 0);

    post.platform = feed.platform;
    post.scheduledAt = scheduleTime.toISOString();

    if (options.asDraft) {
      saveDraft(post);
    } else {
      addToQueue(post);
    }

    posted.push(post);
  });

  // Update lastChecked
  updateRSSFeed(feedId, { lastChecked: new Date().toISOString() });

  return {
    success: true,
    feedTitle: feed.title,
    posted: posted.length,
    items: posted,
    nextCheck: new Date(Date.now() + feed.checkInterval * 60 * 1000).toISOString()
  };
}
