require('dotenv').config && require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://social-9cpy.onrender.com'],
  fb: {
    appId: process.env.FB_APP_ID,
    appSecret: process.env.FB_APP_SECRET,
    redirectUri: process.env.FB_REDIRECT_URI || 'https://social-9cpy.onrender.com/api/v1/auth/callback',
    apiVersion: 'v19.0',
    scopes: [
      // ── Core Page Permissions (hoạt động ở Development mode) ──
      'pages_show_list',           // Liệt kê Pages của user
      'pages_read_engagement',     // Đọc likes, comments, shares
      // 'pages_manage_posts',        // Cần add Use Case bên FB developer
      'pages_manage_metadata',     // Quản lý thông tin Page
      // 'pages_read_user_content',   // Cần add Use Case bên FB developer
      'pages_messaging',           // Inbox / tin nhắn Page
      'business_management',       // Quản lý Business (nếu cần)
      // ── Đã loại bỏ (invalid/deprecated) ──
      // 'catalog_management',     // ❌ Cần bật Commerce feature
      // 'ads_management',         // ❌ Cần Marketing API access
      // 'ads_read',               // ❌ Cần Marketing API access
      // 'publish_to_groups'       // ❌ DEPRECATED — Facebook đã xóa
    ]
  },
  scheduler: {
    cronInterval: '* * * * *',   // Check queue every 1 minute
    operatingHours: { start: 7, end: 22 }, // Default active hours
  },
  delay: {
    pagePost:    { min: 8,  max: 15 }, // minutes
    groupPost:   { min: 15, max: 30 }, // minutes
    betweenAccs: { min: 5,  max: 12 }, // minutes
    jitter:      { min: 0,  max: 30 }, // seconds
  },
  rateLimits: {
    dailyPostsPerAccount: 20,
    groupsPerHour: 10,
  },
  dataDir: './data'
};
