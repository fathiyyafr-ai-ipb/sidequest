/**
 * SideQuest — notifications.js  (ES Module)
 * Single shared notification bell + badge + panel.
 *
 * Replaces the per-page copies that had drifted apart. Pages only need:
 *   - one or more bell buttons carrying `data-notif-btn`, each containing a
 *     `<span data-notif-badge class="… hidden"></span>` count badge
 *   - to import and call `initNotifications()` once after the session is ready
 *
 * The panel is injected into <body> so pages don't carry panel markup.
 * Rich actions (accept/reject) reuse the page's own global handlers when
 * present (`window.viewApplicantProfile`, `window.viewInvitation`); on pages
 * without them the notification still renders, it just isn't interactive.
 */
import { api, ui, token } from './api.js';

let _initialized = false;
let _outsideBound = false;
let _lastCount = 0;

const PANEL_ID = 'sq-notif-panel';
const LIST_ID = 'sq-notif-list';

function ensurePanel() {
  let panel = document.getElementById(PANEL_ID);
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.className = 'hidden fixed top-16 right-4 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 p-4';
  panel.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-800 text-gray-800">Notifikasi</h3>
      <button id="sq-notif-clear" class="text-[10px] font-700 text-primary hover:underline">Tandai dibaca</button>
    </div>
    <div id="${LIST_ID}" class="space-y-3 max-h-72 overflow-y-auto no-scrollbar"></div>`;
  document.body.appendChild(panel);
  return panel;
}

async function refreshBadge() {
  if (!token.isPresent()) return;
  try {
    const n = await api.notifications.unreadCount();
    _lastCount = n;
    document.querySelectorAll('[data-notif-badge]').forEach((badge) => {
      if (n > 0) {
        badge.classList.remove('hidden');
        badge.textContent = n > 99 ? '99+' : String(n);
      } else {
        badge.classList.add('hidden');
        badge.textContent = '';
      }
    });
  } catch (_) { /* network/auth blip — leave badge as-is */ }
}

async function loadNotifications() {
  const list = document.getElementById(LIST_ID);
  if (!list) return;
  list.innerHTML = '<p class="text-center text-xs text-gray-400 py-4">Memuat notifikasi…</p>';
  try {
    const res = await api.notifications.list();
    if (!res || res.length === 0) {
      list.innerHTML = '<p class="text-center text-xs text-gray-400 py-6">Tidak ada notifikasi baru.</p>';
      return;
    }
    list.innerHTML = res.map((notif) => {
      let clickHandler = '';
      let cursorClass = '';
      const hasInvite = notif.title === 'Undangan Bergabung Tim' && typeof window.viewInvitation === 'function';
      const hasApplicant = notif.applicantId && typeof window.viewApplicantProfile === 'function';
      if (hasInvite) {
        const msg = String(notif.message || '').replace(/'/g, "\\'");
        clickHandler = `onclick="viewInvitation(${notif.teamId}, '${notif.title}', '${msg}')"`;
        cursorClass = 'cursor-pointer hover:bg-primary-light/20';
      } else if (hasApplicant) {
        clickHandler = `onclick="viewApplicantProfile(${notif.applicantId}, ${notif.teamId || 'null'})"`;
        cursorClass = 'cursor-pointer hover:bg-primary-light/20';
      }

      const isPendingJoin = notif.teamId && notif.applicantId && notif.memberStatus === 'applied';
      const isPendingConnection = !notif.teamId && notif.applicantId && notif.connectionStatus === 'pending';
      const isPendingInvite = notif.teamId && notif.memberStatus === 'invited' && notif.title === 'Undangan Bergabung Tim';
      const isPending = isPendingJoin || isPendingConnection || isPendingInvite;
      const pendingBadge = isPending
        ? `<span class="bg-orange-100 text-orange-700 text-[9px] font-700 px-1.5 py-0.5 rounded-md uppercase flex-shrink-0">Pending</span>`
        : '';

      return `
        <div ${clickHandler} class="p-2.5 rounded-xl ${notif.isRead ? 'bg-gray-50/50' : 'bg-primary-light/10 border-l-4 border-primary'} ${cursorClass} flex flex-col gap-1 transition-all">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-700 text-gray-800 leading-snug">${notif.title}</p>
            ${pendingBadge}
          </div>
          <p class="text-[10px] text-gray-500 mt-0.5 leading-relaxed">${notif.message}</p>
          <span class="text-[8px] text-gray-400 mt-1 block">${ui.formatDate(notif.createdAt)}</span>
        </div>`;
    }).join('');
  } catch (_) {
    list.innerHTML = '<p class="text-center text-xs text-red-500 py-4">Gagal memuat notifikasi.</p>';
  }
}

async function togglePanel(e) {
  if (e) e.stopPropagation();
  const panel = ensurePanel();
  const isOpen = !panel.classList.contains('hidden');
  if (isOpen) { panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');
  await loadNotifications();
  if (_lastCount > 0) {
    try { await api.notifications.markAllRead(); } catch (_) {}
    await refreshBadge();
  }
}

/**
 * Wire every notification bell on the page. Safe to call multiple times —
 * buttons are bound once, the outside-click listener is registered once.
 */
export async function initNotifications() {
  if (!token.isPresent()) return;
  ensurePanel();

  document.querySelectorAll('[data-notif-btn]').forEach((btn) => {
    if (btn.dataset.notifBound) return;
    btn.dataset.notifBound = 'true';
    btn.addEventListener('click', togglePanel);
  });

  if (!_outsideBound) {
    _outsideBound = true;
    document.addEventListener('click', (e) => {
      const panel = document.getElementById(PANEL_ID);
      if (!panel || panel.classList.contains('hidden')) return;
      const insidePanel = panel.contains(e.target);
      const onBell = e.target.closest('[data-notif-btn]');
      if (!insidePanel && !onBell) panel.classList.add('hidden');
    });
    const clear = () => document.getElementById('sq-notif-clear');
    document.addEventListener('click', async (e) => {
      if (e.target.closest('#sq-notif-clear')) {
        try {
          await api.notifications.markAllRead();
          ui.toast('✅ Semua notifikasi ditandai telah dibaca', 'success');
          await loadNotifications();
          await refreshBadge();
        } catch (_) {}
      }
    });
  }

  _initialized = true;
  await refreshBadge();
}

// Allow other code (e.g. after accepting a request) to refresh the count.
export const notifications = { refresh: refreshBadge, reload: loadNotifications };
