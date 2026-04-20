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

// ── Export all models ──
module.exports = {
    Account:       mongoose.model('Account', AccountSchema),
    QueueItem:     mongoose.model('QueueItem', QueueItemSchema),
    Log:           mongoose.model('Log', LogSchema),
    Contact:       mongoose.model('Contact', ContactSchema),
    InboxMessage:  mongoose.model('InboxMessage', InboxMessageSchema),
    AuditLog:      mongoose.model('AuditLog', AuditLogSchema),
    Schedule:      mongoose.model('Schedule', ScheduleSchema),
    Settings:      mongoose.model('Settings', SettingsSchema),
    Notification:  mongoose.model('Notification', NotificationSchema),
    TeamMember:    mongoose.model('TeamMember', TeamMemberSchema),
    Workflow:      mongoose.model('Workflow', WorkflowSchema),
    LibraryItem:   mongoose.model('LibraryItem', LibraryItemSchema),
    Competitor:    mongoose.model('Competitor', CompetitorSchema),
};
