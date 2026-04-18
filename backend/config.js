require('dotenv').config && require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  fb: {
    appId: process.env.FB_APP_ID,
    appSecret: process.env.FB_APP_SECRET,
    redirectUri: process.env.FB_REDIRECT_URI || 'http://localhost:3000/api/v1/auth/callback',
    apiVersion: 'v19.0',
    scopes: [
      'pages_manage_posts',
      'pages_read_engagement',
      'pages_show_list',
      'publish_to_groups'
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
