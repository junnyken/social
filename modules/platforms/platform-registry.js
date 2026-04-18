// ============================================================
// Platform Registry — Đăng ký + quản lý tất cả platforms
// ============================================================

export const PLATFORMS = {
  facebook: {
    id: 'facebook', name: 'Facebook', color: '#1877F2', icon: 'facebook',
    limits: { text: 63206, images: 10, video: 1, hashtags: null },
    authModule: () => import('../facebook/fb-auth.js'),
    apiModule:  () => import('../facebook/fb-api.js'),
    enabled: true
  },
  instagram: {
    id: 'instagram', name: 'Instagram', color: '#E1306C', icon: 'instagram',
    limits: { text: 2200, images: 10, video: 1, hashtags: 30 },
    authModule: () => import('./instagram/ig-auth.js'),
    apiModule:  () => import('./instagram/ig-api.js'),
    enabled: true
  },
  twitter: {
    id: 'twitter', name: 'X (Twitter)', color: '#000000', icon: 'twitter',
    limits: { text: 280, images: 4, video: 1, hashtags: null },
    authModule: () => import('./twitter/tw-auth.js'),
    apiModule:  () => import('./twitter/tw-api.js'),
    enabled: true
  },
  linkedin: {
    id: 'linkedin', name: 'LinkedIn', color: '#0077B5', icon: 'linkedin',
    limits: { text: 3000, images: 9, video: 1, hashtags: 5 },
    authModule: () => import('./linkedin/li-auth.js'),
    apiModule:  () => import('./linkedin/li-api.js'),
    enabled: true
  }
};

const connectedPlatforms = {};

export function setConnected(platformId, data) { connectedPlatforms[platformId] = data; }
export function getConnected(platformId) { return connectedPlatforms[platformId] || null; }
export function getAllConnected() {
  return Object.entries(connectedPlatforms).filter(([_, v]) => v !== null).map(([id]) => id);
}
export function isConnected(platformId) { return !!connectedPlatforms[platformId]; }

export function validateContent(platformId, { text = '', images = [], hashtags = [] }) {
  const limits = PLATFORMS[platformId]?.limits;
  if (!limits) return { valid: false, errors: ['Platform không hợp lệ'] };
  const errors = [];
  if (text.length > limits.text) errors.push(`${PLATFORMS[platformId].name}: Vượt ${limits.text} ký tự (hiện: ${text.length})`);
  if (images.length > limits.images) errors.push(`${PLATFORMS[platformId].name}: Tối đa ${limits.images} ảnh`);
  if (limits.hashtags && hashtags.length > limits.hashtags) errors.push(`${PLATFORMS[platformId].name}: Tối đa ${limits.hashtags} hashtags`);
  return { valid: errors.length === 0, errors };
}
