const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');

// Public route to view a post awaiting approval via Magic Link
// Magic Link format: /api/v1/approval/p/:token 
// Token is just base64(postId) or we can use UUID for better security
router.get('/p/:token', async (req, res) => {
    try {
        const decoded = Buffer.from(req.params.token, 'base64').toString('ascii');
        const workflows = await dataService.getAll('workflows') || [];
        const post = workflows.find(w => w.id === decoded);
        
        if (!post) return res.status(404).send('<h1>Link expired or invalid</h1>');
        
        // Render simple HTML page for the client
        res.setHeader('Content-Type', 'text/html');
        res.send(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Review Content - SocialHub</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; background: #0f172a; color: #f1f5f9; padding: 20px; display:flex; justify-content:center; }
    .card { background: #1e293b; border-radius: 12px; padding: 24px; max-width: 500px; width: 100%; border: 1px solid #334155; }
    .btn { padding: 10px 20px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; color: white; }
    .btn-approve { background: #10b981; }
    .btn-reject { background: #ef4444; }
    textarea { width:100%; background:#0f172a; border:1px solid #334155; color:white; padding:12px; border-radius:8px; margin-top:12px; resize:none;}
    .post-content { background:#0f172a; padding:16px; border-radius:8px; margin: 16px 0; border: 1px solid #334155; white-space: pre-wrap;}
</style>
</head><body>
<div class="card">
    <div style="text-align:center; margin-bottom:20px;">
        <h2 style="margin:0;">Vui lòng duyệt nội dung</h2>
        <div style="font-size:12px; color:#94a3b8; margin-top:4px;">Chờ duyệt bởi Client</div>
    </div>
    
    <div style="font-size:13px; color:#94a3b8;">Nền tảng đăng: <b>${(post.platforms || []).join(', ')}</b></div>
    <div class="post-content">${post.content}</div>
    
    ${post.state === 'approved' ? `<div style="padding:12px; background:rgba(16,185,129,0.2); color:#10b981; border-radius:8px; text-align:center;">Đã được duyệt ✅</div>` : ''}
    ${post.state === 'rejected' ? `<div style="padding:12px; background:rgba(239,68,68,0.2); color:#ef4444; border-radius:8px; text-align:center;">Đã từ chối ❌</div>` : ''}

    ${['draft', 'review'].includes(post.state) ? `
    <textarea id="comment" rows="3" placeholder="Nhập comment nếu bạn muốn yêu cầu sửa đổi..."></textarea>
    <div style="display:flex; gap:12px; margin-top:16px;">
        <button class="btn btn-reject" style="flex:1;" onclick="action('reject')">Từ chối</button>
        <button class="btn btn-approve" style="flex:1;" onclick="action('approve')">Duyệt bài</button>
    </div>` : ''}
    
    <div style="text-align:center; font-size:11px; color:#64748b; margin-top:24px;">Powered by SocialHub Collaboration</div>
</div>
<script>
async function action(type) {
    const cmt = document.getElementById('comment').value;
    try {
        const res = await fetch('/api/v1/approval/action/${req.params.token}', {
            method: 'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ action: type, comment: cmt })
        });
        if(res.ok) window.location.reload();
        else alert('Có lỗi xảy ra');
    } catch(e){ alert(e.message); }
}
</script>
</body></html>`);
    } catch(e) { res.status(500).send('Error loading page'); }
});

router.post('/action/:token', async (req, res) => {
    try {
        const postId = Buffer.from(req.params.token, 'base64').toString('ascii');
        const workflows = await dataService.getAll('workflows') || [];
        const idx = workflows.findIndex(w => w.id === postId);
        
        if(idx === -1) return res.status(404).json({error: 'not found'});

        // Determine new status
        workflows[idx].state = req.body.action === 'approve' ? 'approved' : 'rejected';
        workflows[idx].updatedAt = new Date().toISOString();
        
        // Add comment
        if (req.body.comment) {
            workflows[idx].comments = workflows[idx].comments || [];
            workflows[idx].comments.push({
                id: require('crypto').randomUUID(),
                text: req.body.comment,
                authorId: 'client',
                authorName: 'Khách hàng',
                createdAt: new Date().toISOString()
            });
        }
        
        await dataService.write('workflows', workflows);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
