import { connectWebSocket, Auth, Queue, onEvent } from './api-client.js';

// ── App Init ─────────────────────────────────────────────────
async function initApp() {
  connectWebSocket();

  try {
    // Check auth status - we mocked it in middleware so it might pass inherently
    const res = await Auth.getStatus().catch(() => ({}));
    // Note: For local bypass, no forced login unless server requires it
  } catch {}

  // 4. Start routing
  router();
  window.addEventListener('hashchange', router);

  setupGlobalEventHandlers();
  
  // Expose Toast globally if it exists mapped from fb-autoposter
  window.Toast = window.Toast || { show: (msg) => alert(msg) };
}

function setupGlobalEventHandlers() {
  onEvent('post_done', (payload) => {
    window.Toast && window.Toast.show(`Post successful on target`, 'success');
  });

  onEvent('post_failed', (payload) => {
    window.Toast && window.Toast.show(`Post failed on target`, 'error');
  });
}

// ── Router ───────────────────────────────────────────────────
let currentCleanup = null;

async function router() {
  if (currentCleanup) currentCleanup();
  
  const main = document.getElementById('main');
  const hash = window.location.hash || '#/dashboard';
  
  // Set Nav Active Classes
  document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.path === hash.replace('#',''));
  });

  const routes = {
    '#/dashboard': () => import('./views/dashboard.view.js').then(m => m.renderDashboard(main)),
    '#/scheduler': () => {
        const section = document.getElementById('page-scheduler');
        main.innerHTML = section ? section.innerHTML : '<div id="scheduler-container"></div>';
        if (window._initScheduler) window._initScheduler();
        else import('../modules/scheduler/scheduler-ui.js').then(m => m.renderScheduler(document.querySelector('#scheduler-container')));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/editor':    () => import('./views/editor.view.js').then(m => m.renderEditor(main)),
    '#/accounts':  () => import('./views/accounts.view.js').then(m => m.renderAccounts(main)),
    '#/logs':      () => import('./views/logs.view.js').then(m => m.renderLogs(main)),
    '#/settings':  () => import('./views/settings.view.js').then(m => m.renderSettings(main)),
    '#/facebook':  () => {
        // Show FB page section
        const section = document.getElementById('page-facebook');
        if (section) {
            main.innerHTML = section.innerHTML;
        } else {
            main.innerHTML = '<div class="flex-col"><h2>Facebook Page Publisher</h2><div id="fb-module-container"></div></div>';
        }
        // Init FB module
        if (window._initFB) window._initFB();
        else {
            import('../modules/facebook/fb-ui.js').then(m => {
                m.initFacebookModule('#fb-module-container');
            });
        }
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/compose': () => {
        const section = document.getElementById('page-compose');
        main.innerHTML = section ? section.innerHTML : '<div class="flex-col"><h2>Đăng bài đa nền tảng</h2><div id="compose-container"></div></div>';
        if (window._initCompose) window._initCompose();
        else import('../modules/platforms/platform-composer.js').then(m => m.renderComposer(document.querySelector('#compose-container'), async () => []));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/analytics': () => {
        const section = document.getElementById('page-analytics');
        main.innerHTML = section ? section.innerHTML : '<div id="analytics-container"></div>';
        if (window._initAnalytics) window._initAnalytics();
        else import('../modules/analytics/analytics-ui.js').then(m => m.renderAnalytics(document.querySelector('#analytics-container')));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/inbox': () => {
        const section = document.getElementById('page-inbox');
        main.innerHTML = section ? section.innerHTML : '<div id="inbox-container"></div>';
        if (window._initInbox) window._initInbox();
        else import('../modules/inbox/inbox-ui.js').then(m => m.renderInbox(document.querySelector('#inbox-container')));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/ai': () => {
        const section = document.getElementById('page-ai');
        main.innerHTML = section ? section.innerHTML : '<div id="ai-container"></div>';
        if (window._initAI) window._initAI();
        else import('../modules/ai/ai-ui.js').then(m => m.renderAIPage(document.querySelector('#ai-container')));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/listening': () => {
        const section = document.getElementById('page-listening');
        main.innerHTML = section ? section.innerHTML : '<div id="listening-container"></div>';
        if (window._initListening) window._initListening();
        else import('../modules/listening/listening-ui.js').then(m => m.renderListening(document.querySelector('#listening-container')));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/calendar': () => {
        const section = document.getElementById('page-calendar');
        main.innerHTML = section ? section.innerHTML : '<div id="calendar-container"></div>';
        if (window._initCalendar) window._initCalendar();
        else import('../modules/calendar/calendar-ui.js').then(m => m.renderCalendar(document.querySelector('#calendar-container')));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/team': () => {
        const section = document.getElementById('page-team');
        main.innerHTML = section ? section.innerHTML : '<div id="team-container"></div>';
        if (window._initTeam) window._initTeam();
        else import('../modules/team/team-ui.js').then(m => m.renderTeam(document.querySelector('#team-container')));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/library': () => {
        const section = document.getElementById('page-library');
        main.innerHTML = section ? section.innerHTML : '<div id="library-container"></div>';
        if (window._initLibrary) window._initLibrary();
        else import('../modules/library/library-ui.js').then(m => m.renderLibrary(document.querySelector('#library-container')));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/workflow': () => {
        const section = document.getElementById('page-workflow');
        main.innerHTML = section ? section.innerHTML : '<div id="workflow-container"></div>';
        if (window._initWorkflow) window._initWorkflow();
        else import('../modules/workflow/workflow-ui.js').then(m => m.renderWorkflow(document.querySelector('#workflow-container')));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/integrations': () => {
        const section = document.getElementById('page-integrations');
        main.innerHTML = section ? section.innerHTML : '<div id="integrations-container"></div>';
        if (window._initIntegrations) window._initIntegrations();
        else import('../modules/integrations/integrations-ui.js').then(m => m.renderIntegrations(document.querySelector('#integrations-container')));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/agency': () => {
        const section = document.getElementById('page-agency');
        main.innerHTML = section ? section.innerHTML : '<div id="agency-container"></div>';
        if (window._initAgency) window._initAgency();
        else import('../modules/agency/agency-ui.js').then(m => m.renderAgency(document.querySelector('#agency-container')));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/ai-brain': () => {
        const section = document.getElementById('page-ai-brain');
        main.innerHTML = section ? section.innerHTML : '<div id="ai-brain-container"></div>';
        if (window._initAIBrain) window._initAIBrain();
        else import('../modules/ai/ai-dashboard.js').then(m => m.renderAIBrain(document.querySelector('#ai-brain-container')));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/login':     () => {
        // Show login page from template
        const tpl = document.getElementById('page-login');
        if (tpl) {
            main.innerHTML = '';
            const clone = tpl.cloneNode(true);
            clone.style.display = 'block';
            // Move children into main
            while (clone.firstChild) main.appendChild(clone.firstChild);
        } else {
            main.innerHTML = `
              <div style="display:flex;align-items:center;justify-content:center;min-height:500px">
                <div class="card" style="text-align:center;max-width:400px;width:100%;padding:var(--space-8)">
                  <h2>Kết nối Facebook</h2>
                  <p style="color:var(--color-text-muted);margin-bottom:var(--space-6)">Vui lòng đăng nhập để sử dụng AutoPoster.</p>
                  <a href="/api/v1/auth/login" class="btn btn-primary btn-md" style="width:100%;display:inline-block;text-decoration:none">Đăng nhập với Facebook</a>
                </div>
              </div>`;
        }
        // Bind click on the button inside main
        const btn = main.querySelector('#oauth-btn') || main.querySelector('button');
        if (btn) {
            btn.addEventListener('click', () => {
                // Direct redirect to backend OAuth — no fetch needed
                window.location.href = '/api/v1/auth/login';
            });
        }
        if(window.refreshIcons) window.refreshIcons();
        return null;
    }
  };

  const renderFn = routes[hash] || routes['#/dashboard'];
  if (renderFn) {
    main.style.opacity = '0';
    currentCleanup = await renderFn() || null;
    requestAnimationFrame(() => { main.style.opacity = '1'; });
  }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
