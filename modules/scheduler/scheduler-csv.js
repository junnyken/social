/**
 * CSV Bulk Upload — Import 100+ posts from spreadsheet
 * Format: Date, Time, Platform, Content, Hashtags, MediaURL
 */
import { bulkAddToQueue, saveDraft } from './scheduler-store.js';

// ── CSV Parser ────────────────────────────────────────────────
export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return { posts: [], headerMap: {} };
  const headers = parseCSVLine(lines[0]);

  // Expected headers (case-insensitive)
  const headerMap = {
    date: -1, time: -1, platform: -1, content: -1, text: -1,
    hashtags: -1, tags: -1, media: -1, mediaurl: -1, image: -1,
    type: -1, notes: -1
  };

  // Map column positions
  headers.forEach((h, i) => {
    const lower = h.toLowerCase().trim();
    Object.keys(headerMap).forEach(key => {
      if (lower.includes(key)) headerMap[key] = i;
    });
  });

  // Parse rows
  const posts = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const row = parseCSVLine(lines[i]);
    const post = parseCSVRow(row, headerMap);

    if (post.text || post.content) {
      posts.push(post);
    }
  }

  return { posts, headerMap };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCSVRow(row, headerMap) {
  // Extract values based on header positions
  const getValue = (key, index = headerMap[key]) =>
    index >= 0 ? row[index]?.trim() || '' : '';

  const dateStr = getValue('date');
  const timeStr = getValue('time');
  const platform = getValue('platform').toLowerCase() || 'facebook';
  const content = getValue('content') || getValue('text');
  const hashtags = getValue('hashtags') || getValue('tags');
  const mediaUrl = getValue('media') || getValue('mediaurl') || getValue('image');

  // Parse datetime
  let scheduledAt;
  if (dateStr && timeStr) {
    scheduledAt = new Date(`${dateStr}T${timeStr}`);
  } else if (dateStr) {
    const dt = new Date(dateStr);
    dt.setHours(9, 0, 0, 0);
    scheduledAt = dt;
  } else {
    scheduledAt = new Date();
  }

  // Validate platform
  const validPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'];
  const validPlatform = validPlatforms.includes(platform)
    ? platform
    : 'facebook';

  return {
    text: content,
    platform: validPlatform,
    scheduledAt: scheduledAt.toISOString(),
    hashtags: hashtags ? hashtags.split(/[,;#]/).map(t => t.trim()).filter(Boolean) : [],
    mediaUrl: mediaUrl || null,
    importedAt: new Date().toISOString(),
    source: 'csv'
  };
}

// ── CSV Template Generator ────────────────────────────────────
export function generateCSVTemplate() {
  const headers = [
    'Date (YYYY-MM-DD)',
    'Time (HH:MM)',
    'Platform',
    'Content',
    'Hashtags (comma-separated)',
    'Media URL'
  ].join(',');

  const samples = [
    '"2026-04-20","09:00","facebook","Nội dung bài 1","#sale #flash","https://example.com/img1.jpg"',
    '"2026-04-21","12:00","instagram","Nội dung bài 2","#trending #reels","https://example.com/img2.jpg"',
    '"2026-04-22","18:00","twitter","Nội dung bài 3","#news","https://example.com/img3.jpg"'
  ].join('\n');

  return `${headers}\n${samples}`;
}

// ── Export Queue to CSV ───────────────────────────────────────
export function exportQueueToCSV(queue) {
  const headers = ['Date', 'Time', 'Platform', 'Content', 'Hashtags', 'Status'].join(',');

  const rows = queue.map(item => {
    const dt = new Date(item.scheduledAt);
    return [
      dt.toISOString().split('T')[0],
      `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`,
      item.platform,
      `"${(item.text || '').replace(/"/g, '""')}"`,
      (item.hashtags || []).join(';'),
      item.status
    ].join(',');
  }).join('\n');

  return `${headers}\n${rows}`;
}

// ── Bulk Import with Validation ───────────────────────────────
export function bulkImportCSV(csvText, options = {}) {
  // options: { asDrafts: false, autoSchedule: false, skipOnError: true }
  const { posts, headerMap } = parseCSV(csvText);

  if (posts.length === 0) {
    return { success: false, error: 'No valid posts found in CSV', skipped: 0 };
  }

  const validation = validatePosts(posts);
  const filtered = options.skipOnError
    ? posts.filter((_, i) => !validation.errors[i])
    : posts;

  // Add to queue or drafts
  const added = options.asDrafts
    ? filtered.map(p => saveDraft(p))
    : bulkAddToQueue(filtered);

  return {
    success: true,
    imported: added.length,
    total: posts.length,
    skipped: posts.length - added.length,
    warnings: validation.warnings,
    items: added
  };
}

function validatePosts(posts) {
  const errors = {};
  const warnings = [];

  posts.forEach((post, i) => {
    if (!post.text || post.text.length === 0) {
      errors[i] = 'Missing content';
    }
    if (!post.platform) {
      errors[i] = 'Invalid platform';
    }
    if (!post.scheduledAt || new Date(post.scheduledAt) <= new Date()) {
      warnings.push(`Post ${i+1}: scheduled time in the past or invalid`);
    }
  });

  return { errors, warnings };
}
