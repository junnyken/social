import { Logs, Queue, onEvent, offEvent } from '../api-client.js';

export async function renderDashboard(container) {
  // Skeleton
  container.innerHTML = `
        <div class="flex-col">
            <div class="grid-4" id="kpi-grid">Loading KPIs...</div>
            <div class="card"><div class="card-header"><h3>Posts Last 7 Days</h3></div><div class="chart-box"><canvas id="chart-posts"></canvas></div></div>
            <div class="card">
                <div class="card-header"><h3>Recent Activity</h3><a href="#/logs" class="btn btn-ghost btn-sm">View All</a></div>
                <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Time</th><th>Target</th><th>Content</th><th>Account</th><th>Status</th></tr></thead><tbody id="dash-activity"><tr><td colspan="5">Loading...</td></tr></tbody></table></div>
            </div>
        </div>
  `;

  try {
    const logsData = await Logs.list();
    const queueData = await Queue.list({ status: 'pending' });
    const logs = logsData.data || [];
    const schedule = queueData.data || [];

    const today = logs.filter(l => Date.now() - new Date(l.timestamp).getTime() < 86400000);
    const successCount = today.filter(l => l.status === 'success' || l.status === 'done').length;

    // Render KPIs
    const acctsRes = await fetch('http://localhost:3000/api/v1/accounts');
    const accts = acctsRes.ok ? (await acctsRes.json()).data || [] : [];
    
    document.getElementById('kpi-grid').innerHTML = [
        { label: 'Today Posts', value: today.length },
        { label: 'Success Rate', value: today.length ? Math.round(successCount/today.length*100)+'%' : '—' },
        { label: 'Pending Queue', value: schedule.length },
        { label: 'Active Accounts', value: accts.filter(a=>a.status==='connected').length }
    ].map(k => `<div class="card kpi"><span class="kpi-label">${k.label}</span><span class="kpi-value">${k.value}</span></div>`).join('');

    // Activity Table
    document.getElementById('dash-activity').innerHTML = logs.slice(0,5).map(l => `
        <tr>
            <td style="color:var(--color-text-muted)">${timeAgo(new Date(l.timestamp).getTime())}</td>
            <td style="font-weight:500">${l.target?.name || l.target}</td>
            <td><div style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${l.content}">${l.content}</div></td>
            <td>${l.accountId || l.account}</td>
            <td>${statusBadge(l.status)}</td>
        </tr>`).join('');

    // Chart mock for now since exact logs/stats parsing might lack past 7 days endpoints in our schema
    renderChart();

  } catch (error) {
    console.error(error);
  }

  const handlePostDone = () => { if(location.hash === '#/dashboard' || location.hash === '' || location.hash === '#/') renderDashboard(container); };
  onEvent('post_done', handlePostDone);
  onEvent('post_failed', handlePostDone);

  return () => {
    offEvent('post_done', handlePostDone);
    offEvent('post_failed', handlePostDone);
  };
}

function renderChart() {
    // Chart rendering requires live querying now, we mock the final structure
    const data = [{label:'Mon',value:12},{label:'Tue',value:19},{label:'Wed',value:8},{label:'Thu',value:14},{label:'Fri',value:9},{label:'Sat',value:22},{label:'Sun',value:11}];
    const ctx = document.getElementById('chart-posts');
    if (!ctx) return;
    if (window._chartInstance) window._chartInstance.destroy();

    const cs = getComputedStyle(document.documentElement);
    const accent = cs.getPropertyValue('--color-accent').trim() || '#38bdf8';
    const muted = cs.getPropertyValue('--color-text-muted').trim() || '#999';

    window._chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                label: 'Posts Published',
                data: data.map(d => d.value),
                borderColor: accent,
                backgroundColor: accent + '22',
                borderWidth: 2, pointRadius: 4, pointHoverRadius: 6,
                pointBackgroundColor: '#fff', pointBorderColor: accent,
                fill: true, tension: 0.35
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'bottom', labels: { color: muted, font: { family: 'Satoshi' } } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: muted } },
                y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { color: muted } }
            }
        }
    });
}

export function timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts)/1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    return Math.floor(diff/86400) + 'd ago';
}

export function statusBadge(s) {
    const map = {
        success: ['badge-success','check-circle','Success'],
        done: ['badge-success','check-circle','Success'],
        connected: ['badge-success','check-circle','Connected'],
        pending: ['badge-warning','clock','Pending'],
        scheduled: ['badge-info','calendar-clock','Scheduled'],
        failed: ['badge-error','x-circle','Failed'],
        disconnected: ['badge-error','x-circle','Disconnected']
    };
    const [cls, icon, label] = map[s] || ['badge-info','info', s || 'Unknown'];
    return `<span class="badge ${cls}"><i data-lucide="${icon}" width="12" height="12"></i> ${label}</span>`;
}
