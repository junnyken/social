const mongoose = require('mongoose');

// ── Account ──
const AccountSchema = new mongoose.Schema({
    name:         { type: String, required: true },
    type:         { type: String, default: 'page' },
    platform:     { type: String, default: 'facebook' },
    status:       { type: String, default: 'connected' },
    pageId:       String,
    accessToken:  String,
    tokenExpiry:  Date,
    userId:       String,
    pages:        [{ id: String, name: String, access_token: String, picture: String, category: String }],
    postsToday:   { type: Number, default: 0 },
    successRate:  { type: Number, default: 100 },
}, { timestamps: true });

// ── QueueItem ──
const QueueItemSchema = new mongoose.Schema({
    accountId:    { type: String, required: true },
    target:       { type: mongoose.Schema.Types.Mixed },
    content:      String,
    images:       [String],
    scheduledAt:  Date,
    status:       { type: String, default: 'pending', enum: ['pending', 'posting', 'posted', 'failed'] },
    error:        String,
    result:       mongoose.Schema.Types.Mixed,
    retries:      { type: Number, default: 0 },
}, { timestamps: true });

// ── Log ──
const LogSchema = new mongoose.Schema({
    type:      { type: String, default: 'info' },
    action:    String,
    message:   String,
    accountId: String,
    pageId:    String,
    details:   mongoose.Schema.Types.Mixed,
}, { timestamps: true });

// ── Contact ──
const ContactSchema = new mongoose.Schema({
    name:       String,
    platform:   { type: String, default: 'facebook' },
    platformId: String,
    pageId:     String,
    email:      String,
    phone:      String,
    tags:       [String],
    notes:      String,
    lastInteraction: Date,
}, { timestamps: true });

// ── InboxMessage ──
const InboxMessageSchema = new mongoose.Schema({
    from:       String,
    to:         String,
    pageId:     String,
    platform:   { type: String, default: 'facebook' },
    content:    String,
    type:       { type: String, default: 'message', enum: ['message', 'comment', 'review'] },
    read:       { type: Boolean, default: false },
    replied:    { type: Boolean, default: false },
    contactId:  String,
    threadId:   String,
    sentiment:  String,
    category:   String,
}, { timestamps: true });

// ── AuditLog ──
const AuditLogSchema = new mongoose.Schema({
    userId:    String,
    action:    { type: String, required: true },
    resource:  String,
    resourceId: String,
    details:   mongoose.Schema.Types.Mixed,
    ip:        String,
    userAgent: String,
}, { timestamps: true });

// ── Schedule ──
const ScheduleSchema = new mongoose.Schema({
    name:        String,
    accountId:   String,
    pageId:      String,
    content:     String,
    images:      [String],
    scheduledAt: Date,
    recurType:   { type: String, enum: ['once', 'daily', 'weekly', 'monthly'], default: 'once' },
    status:      { type: String, default: 'active', enum: ['active', 'paused', 'completed'] },
    lastRun:     Date,
}, { timestamps: true });

// ── Settings (singleton-like, keyed by userId or 'global') ──
const SettingsSchema = new mongoose.Schema({
    key:   { type: String, unique: true, default: 'global' },
    data:  { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

// ── Notification ──
const NotificationSchema = new mongoose.Schema({
    userId:  String,
    type:    { type: String, default: 'info' },
    title:   String,
    message: String,
    read:    { type: Boolean, default: false },
    link:    String,
}, { timestamps: true });

// ── TeamMember ──
const TeamMemberSchema = new mongoose.Schema({
    name:     { type: String, required: true },
    email:    String,
    role:     { type: String, default: 'editor', enum: ['admin', 'manager', 'editor', 'viewer'] },
    status:   { type: String, default: 'active' },
    avatar:   String,
    lastActive: Date,
}, { timestamps: true });

// ── Workflow ──
const WorkflowSchema = new mongoose.Schema({
    name:     { type: String, required: true },
    type:     { type: String, default: 'approval' },
    steps:    [{ name: String, assignee: String, status: String, order: Number }],
    status:   { type: String, default: 'active' },
    postId:   String,
}, { timestamps: true });

// ── LibraryItem ──
const LibraryItemSchema = new mongoose.Schema({
    name:     String,
    type:     { type: String, default: 'image', enum: ['image', 'video', 'document', 'template'] },
    url:      String,
    thumbnail: String,
    size:     Number,
    tags:     [String],
    folder:   String,
    uploadedBy: String,
}, { timestamps: true });

// ── Competitor ──
const CompetitorSchema = new mongoose.Schema({
    name:       { type: String, required: true },
    platform:   { type: String, default: 'facebook' },
    platformId: String,
    url:        String,
    followers:  Number,
    avgEngagement: Number,
    lastChecked: Date,
}, { timestamps: true });

// ── A/B Experiment ──
const ABExperimentSchema = new mongoose.Schema({
    id:                { type: String, unique: true },
    name:              String,
    description:       String,
    platform:          { type: String, default: 'facebook' },
    status:            { type: String, default: 'draft', enum: ['draft', 'running', 'completed', 'archived'] },
    goal:              { type: String, default: 'engagement' },
    trafficSplit:      { type: String, default: 'equal' },
    duration:          { type: Number, default: 72 },
    variants:          [mongoose.Schema.Types.Mixed],
    winner:            String,
    confidence:        { type: Number, default: 0 },
    startedAt:         Date,
    completedAt:       Date,
    autoSelectWinner:  { type: Boolean, default: true },
    minimumSampleSize: { type: Number, default: 100 },
}, { timestamps: true });

// ── Bulk Campaign ──
const BulkCampaignSchema = new mongoose.Schema({
    id:                 { type: String, unique: true },
    name:               String,
    description:        String,
    status:             { type: String, default: 'draft' },
    platforms:          [String],
    content:            mongoose.Schema.Types.Mixed,
    platformOverrides:  mongoose.Schema.Types.Mixed,
    scheduledAt:        Date,
    timezone:           { type: String, default: 'Asia/Ho_Chi_Minh' },
    results:            [mongoose.Schema.Types.Mixed],
    publishedAt:        Date,
    completedAt:        Date,
    tags:               [String],
    utmCampaign:        String,
}, { timestamps: true });

// ── Evergreen Queue ──
const EvergreenQueueSchema = new mongoose.Schema({
    id:          { type: String, unique: true },
    name:        String,
    description: String,
    status:      { type: String, default: 'active' },
    platforms:   [String],
    schedule:    mongoose.Schema.Types.Mixed,
    rules:       mongoose.Schema.Types.Mixed,
    posts:       [mongoose.Schema.Types.Mixed],
    stats:       mongoose.Schema.Types.Mixed,
}, { timestamps: true });

// ── Listening Keyword ──
const ListeningKeywordSchema = new mongoose.Schema({
    id:           { type: String, unique: true },
    term:         { type: String, required: true },
    color:        String,
    mentionCount: { type: Number, default: 0 },
}, { timestamps: true });

// ── Listening Mention ──
const ListeningMentionSchema = new mongoose.Schema({
    id:             { type: String, unique: true },
    keyword:        String,
    text:           String,
    platform:       String,
    author:         String,
    url:            String,
    sentiment:      String,
    sentimentScore: Number,
    timestamp:      { type: Date, default: Date.now },
}, { timestamps: true });

// ── Link-in-Bio Page ──
const LinkInBioPageSchema = new mongoose.Schema({
    id:           { type: String, unique: true },
    slug:         { type: String, unique: true },
    title:        String,
    bio:          String,
    avatarUrl:    String,
    theme:        { type: String, default: 'default' },
    customColors: mongoose.Schema.Types.Mixed,
    links:        [mongoose.Schema.Types.Mixed],
    socials:      mongoose.Schema.Types.Mixed,
    analytics:    mongoose.Schema.Types.Mixed,
    isPublished:  { type: Boolean, default: true },
}, { timestamps: true });

// ── PDF Report ──
const PDFReportSchema = new mongoose.Schema({
    id:                { type: String, unique: true },
    title:             String,
    branding:          mongoose.Schema.Types.Mixed,
    period:            mongoose.Schema.Types.Mixed,
    summary:           mongoose.Schema.Types.Mixed,
    platformBreakdown: mongoose.Schema.Types.Mixed,
    topPosts:          [mongoose.Schema.Types.Mixed],
    dailyTrend:        mongoose.Schema.Types.Mixed,
    recommendations:   [String],
    format:            { type: String, default: 'html' },
    status:            { type: String, default: 'generated' },
    generatedAt:       Date,
}, { timestamps: true });

// ── UTM Link ──
const UTMLinkSchema = new mongoose.Schema({
    id:          { type: String, unique: true },
    name:        String,
    baseUrl:     String,
    source:      String,
    medium:      String,
    campaign:    String,
    term:        String,
    content:     String,
    fullUrl:     String,
    clicks:      { type: Number, default: 0 },
    tags:        [String],
}, { timestamps: true });

// ── Brand Voice ──
const BrandVoiceSchema = new mongoose.Schema({
    key:   { type: String, unique: true, default: 'global' },
    data:  mongoose.Schema.Types.Mixed,
}, { timestamps: true });

// ── Export all models ──
module.exports = {
    Account:          mongoose.model('Account', AccountSchema),
    QueueItem:        mongoose.model('QueueItem', QueueItemSchema),
    Log:              mongoose.model('Log', LogSchema),
    Contact:          mongoose.model('Contact', ContactSchema),
    InboxMessage:     mongoose.model('InboxMessage', InboxMessageSchema),
    AuditLog:         mongoose.model('AuditLog', AuditLogSchema),
    Schedule:         mongoose.model('Schedule', ScheduleSchema),
    Settings:         mongoose.model('Settings', SettingsSchema),
    Notification:     mongoose.model('Notification', NotificationSchema),
    TeamMember:       mongoose.model('TeamMember', TeamMemberSchema),
    Workflow:         mongoose.model('Workflow', WorkflowSchema),
    LibraryItem:      mongoose.model('LibraryItem', LibraryItemSchema),
    Competitor:       mongoose.model('Competitor', CompetitorSchema),
    ABExperiment:     mongoose.model('ABExperiment', ABExperimentSchema),
    BulkCampaign:     mongoose.model('BulkCampaign', BulkCampaignSchema),
    EvergreenQueue:   mongoose.model('EvergreenQueue', EvergreenQueueSchema),
    ListeningKeyword: mongoose.model('ListeningKeyword', ListeningKeywordSchema),
    ListeningMention: mongoose.model('ListeningMention', ListeningMentionSchema),
    LinkInBioPage:    mongoose.model('LinkInBioPage', LinkInBioPageSchema),
    PDFReport:        mongoose.model('PDFReport', PDFReportSchema),
    UTMLink:          mongoose.model('UTMLink', UTMLinkSchema),
    BrandVoice:       mongoose.model('BrandVoice', BrandVoiceSchema),
};

