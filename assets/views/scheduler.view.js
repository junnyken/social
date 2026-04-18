import { Queue, Accounts } from '../api-client.js';

export async function renderScheduler(container) {
  container.innerHTML = `
        <div class="flex-col">
            <div class="flex-between"><h2>Page Scheduler</h2><button class="btn btn-primary btn-md" onclick="window.location.hash='#/editor'"><i data-lucide="plus" width="18" height="18"></i> Add New Post</button></div>
            <div class="flex-row" style="align-items:stretch">
                <div style="flex:2;display:flex;flex-direction:column;gap:var(--space-4)">
                    <div class="card" style="padding:var(--space-4)">
                        <label class="field-label">Account selector</label>
                        <select class="field-select" id="sch-acc-sel" style="max-width:280px"><option value="">All Accounts</option></select>
                    </div>
                    <div class="card" style="flex:1">
                        <div class="card-header"><h3>Calendar</h3><div style="display:flex;gap:var(--space-2);align-items:center"><button class="btn btn-ghost btn-sm"><i data-lucide="chevron-left" width="16" height="16"></i></button><span style="font-weight:500;font-size:var(--text-sm)" id="cal-month"></span><button class="btn btn-ghost btn-sm"><i data-lucide="chevron-right" width="16" height="16"></i></button></div></div>
                        <div id="calendar-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--color-border);border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden"></div>
                        <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-2);text-align:center">Click ngày xem posts ngày đó</p>
                    </div>
                </div>
                <div class="card" style="flex:1;display:flex;flex-direction:column;min-width:280px">
                    <div class="card-header"><h3>Queue</h3><span class="badge badge-info" id="queue-count">0</span></div>
                    <div id="queue-list" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:var(--space-3);max-height:520px"></div>
                </div>
            </div>
        </div>
  `;

  try {
    const [queueRes, accRes] = await Promise.all([
        Queue.list({ status: 'pending' }),
        Accounts.list()
    ]);
    const schedule = queueRes.data || [];
    const accounts = accRes.data || [];

    // Calendar
    const now = new Date();
    document.getElementById('cal-month').textContent = now.toLocaleDateString('vi-VN',{month:'long',year:'numeric'});
    const y = now.getFullYear(), mo = now.getMonth();
    const firstDay = (new Date(y, mo, 1).getDay() + 6) % 7; 
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const todayDate = now.getDate();
    const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    let html = dayNames.map(d => `<div style="background:var(--color-surface);padding:var(--space-2);text-align:center;font-weight:500;font-size:var(--text-xs)">${d}</div>`).join('');
    for (let i = 0; i < firstDay; i++) html += `<div style="background:var(--color-surface);padding:var(--space-2);min-height:70px;opacity:0.4"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
        const isToday = d === todayDate;
        const bg = isToday ? 'background:color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));border:1px solid var(--color-accent)' : 'background:var(--color-surface)';
        const fw = isToday ? 'font-weight:700;color:var(--color-primary)' : '';
        const dots = (d % 3 === 0 || d === todayDate) ? `<div style="display:flex;gap:2px;margin-top:4px"><div style="width:5px;height:5px;border-radius:50%;background:var(--color-success)"></div></div>` : '';
        html += `<div style="${bg};padding:var(--space-2);min-height:70px;display:flex;flex-direction:column;align-items:flex-end;cursor:pointer"><span style="font-size:var(--text-sm);${fw}">${d}</span>${dots}</div>`;
    }
    document.getElementById('calendar-grid').innerHTML = html;

    // Accounts logic
    const afilt = document.getElementById('sch-acc-sel');
    afilt.innerHTML += accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');

    // Queue logic
    document.getElementById('queue-count').textContent = schedule.length;
    document.getElementById('queue-list').innerHTML = schedule.map(s => `
        <div style="border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-3);background:var(--color-surface)">
            <div class="flex-between" style="margin-bottom:var(--space-1)">
                <span style="font-weight:700;color:var(--color-primary);font-size:var(--text-sm)">[${new Date(s.scheduledAt).toLocaleTimeString()}]</span>
                <span class="badge badge-success" style="font-size:10px">Sẵn sàng</span>
            </div>
            <div style="font-size:var(--text-sm);margin-bottom:var(--space-1)">"${s.content}"</div>
            <div class="flex-between">
                <span style="font-size:var(--text-xs);color:var(--color-text-muted)">→ ${s.accountId}</span>
                <button class="icon-btn btn-del" data-id="${s.id}" style="width:28px;height:28px;color:var(--color-error)"><i data-lucide="trash-2" width="14" height="14"></i></button>
            </div>
        </div>`).join('');
    
    document.querySelectorAll('.btn-del').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            await Queue.remove(id);
            renderScheduler(container);
        });
    });

    if(window.refreshIcons) window.refreshIcons();

  } catch (error) {
    console.error(error);
  }
}
