import { connectWebSocket, Auth, Queue, onEvent } from './api-client.js';
import { initSocket, trackNavigation } from '../modules/collab/socket-client.js';
import { initPresenceUI } from '../modules/collab/presence-ui.js';
import { initNotificationUI } from '../modules/collab/notification-ui.js';
import { initErrorBoundary } from '../modules/collab/error-boundary.js';
import { initWorkspaceSwitcher } from '../modules/workspace-switcher.js';

import { getLanguage, setLanguage, t } from './i18n.js';

// ── App Init ─────────────────────────────────────────────────
async function initApp() {
  // Setup i18n toggle
  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) {
    langBtn.textContent = getLanguage().toUpperCase();
    langBtn.onclick = () => {
      const newLang = getLanguage() === 'vi' ? 'en' : 'vi';
      setLanguage(newLang);
      langBtn.textContent = newLang.toUpperCase();
      translateUI();
    };
  }
  translateUI();

  // Error boundary first — catch all errors from the start
  initErrorBoundary();

  // Recover auth token from cookie if localStorage is empty (production fix)
  if (typeof Auth.initAuth === 'function') {
      try {
          await Auth.initAuth();
      } catch (e) {
          console.error('[Auth] initAuth error:', e);
      }
  }

  connectWebSocket();

  try {
    // Check auth status - we mocked it in middleware so it might pass inherently
    const res = await Auth.getStatus().catch(() => ({}));
    // Note: For local bypass, no forced login unless server requires it
  } catch {}

  // Initialize Socket.IO and UI components
  await initSocket();
  initPresenceUI();
  initNotificationUI();
  initWorkspaceSwitcher();

  // Real-time event listeners
  setupRealtimeListeners();

  // 4. Start routing
  router();
  window.addEventListener('hashchange', router);

  setupGlobalEventHandlers();
  
  // Expose Toast globally if it exists mapped from fb-autoposter
  window.Toast = window.Toast || { show: (msg) => alert(msg) };
}

function setupRealtimeListeners() {
  if (!window._socket) return;
  const s = window._socket;

  // Join active workspace room
  const wsId = localStorage.getItem('activeWorkspaceId') || 'default';
  s.emit('join:workspace', wsId);

  s.on('post:published', (d) => {
    window.Toast?.show(`✅ Bài đã đăng: ${d.platform || ''}`, 'success');
  });
  s.on('post:failed', (d) => {
    window.Toast?.show(`❌ Đăng bài thất bại: ${d.error || ''}`, 'error');
  });
  s.on('token:expiring', (d) => {
    window.Toast?.show(`⚠️ Token ${d.platform} sắp hết hạn (${d.daysLeft} ngày)`, 'warning');
  });
  s.on('token:expired', (d) => {
    window.Toast?.show(`🔴 Token ${d.platform} đã hết hạn! Vui lòng re-connect.`, 'error');
  });
  s.on('token:renewed', (d) => {
    window.Toast?.show(`🔑 Token ${d.platform} đã tự động gia hạn`, 'success');
  });
  s.on('mention:new', (d) => {
    window.Toast?.show(`🔔 Đề cập mới: "${d.text?.slice(0, 50)}"`, 'info');
  });
  s.on('abtest:completed', (d) => {
    window.Toast?.show(`🧪 A/B Test hoàn thành: ${d.name || ''}`, 'info');
  });
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

  // Track navigation in presence system
  trackNavigation(hash.replace('#/', ''));

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
    '#/analytics-pro': () => {
        main.innerHTML = '<div id="analytics-pro-container"></div>';
        import('../modules/analytics/analytics-pro.js').then(m => m.renderAnalyticsPro(document.querySelector('#analytics-pro-container')));
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
        main.innerHTML = '<div id="ai-container"></div>';
        import('../modules/ai/ai-command-center.js').then(m => m.renderAICommandCenter(document.querySelector('#ai-container')));
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
    '#/ab-test': () => {
        main.innerHTML = '<div id="abtest-container"></div>';
        import('../modules/abtest/abtest-ui.js').then(m => m.renderABTestLab(document.querySelector('#abtest-container')));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/bulk-publish': () => {
        main.innerHTML = '<div id="bulk-container"></div>';
        import('../modules/bulk/bulk-publisher-ui.js').then(m => m.renderBulkPublisher(document.querySelector('#bulk-container')));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/evergreen': () => {
        main.innerHTML = '<div id="evergreen-container"></div>';
        import('../modules/evergreen/evergreen-ui.js').then(m => m.renderEvergreen(document.querySelector('#evergreen-container')));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/reports': () => {
        main.innerHTML = '<div id="reports-container"></div>';
        import('../modules/reports/reports-ui.js').then(m => m.renderReportsUI(document.querySelector('#reports-container')));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/link-in-bio': () => {
        main.innerHTML = '<div id="linkinbio-container"></div>';
        import('../modules/linkinbio/linkinbio-ui.js').then(m => m.renderLinkInBio(document.querySelector('#linkinbio-container')));
        if(window.refreshIcons) window.refreshIcons();
        return null;
    },
    '#/audit': () => {
        main.innerHTML = '<div id="audit-container"></div>';
        import('../modules/audit/audit-ui.js').then(m => m.renderAudit(document.querySelector('#audit-container')));
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

window.addEventListener('language_changed', () => {
    translateUI();
    // Re-render current page to apply translations if there's a refresh function
    if (typeof window.refreshCurrentPage === 'function') {
        window.refreshCurrentPage();
    }
});

function translateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(`nav.${key}`) || t(key);
    });
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
