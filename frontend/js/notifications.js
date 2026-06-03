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
import { api, ui, token, handleApiError } from './api.js';

let _initialized = false;
let _outsideBound = false;
let _lastCount = 0;
let _currentNotifs = [];

const PANEL_ID = 'sq-notif-panel';
const LIST_ID = 'sq-notif-list';

// HTML-escape user-supplied text before injecting as innerHTML.
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

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
    // Keep the raw objects; the click is dispatched by index via a single
    // delegated listener. We never inject user text (title/message, which can
    // contain quotes) into an inline onclick — that previously broke the
    // attribute and made invitation notifications unclickable.
    _currentNotifs = res;
    list.innerHTML = res.map((notif, i) => {
      const actionable = notif.title === 'Undangan Bergabung Tim' || !!notif.applicantId;
      const cursorClass = actionable ? 'cursor-pointer hover:bg-primary-light/20' : '';

      const isPendingJoin = notif.teamId && notif.applicantId && notif.memberStatus === 'applied';
      const isPendingConnection = !notif.teamId && notif.applicantId && notif.connectionStatus === 'pending';
      const isPendingInvite = notif.teamId && notif.memberStatus === 'invited' && notif.title === 'Undangan Bergabung Tim';
      const isPending = isPendingJoin || isPendingConnection || isPendingInvite;
      const pendingBadge = isPending
        ? `<span class="bg-orange-100 text-orange-700 text-[9px] font-700 px-1.5 py-0.5 rounded-md uppercase flex-shrink-0">Pending</span>`
        : '';

      return `
        <div data-notif-index="${i}" class="p-2.5 rounded-xl ${notif.isRead ? 'bg-gray-50/50' : 'bg-primary-light/10 border-l-4 border-primary'} ${cursorClass} flex flex-col gap-1 transition-all">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-700 text-gray-800 leading-snug">${esc(notif.title)}</p>
            ${pendingBadge}
          </div>
          <p class="text-[10px] text-gray-500 mt-0.5 leading-relaxed">${esc(notif.message)}</p>
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

// ── Built-in profile/invitation modal + accept-reject handlers ───────
// These make notifications actionable on EVERY page. Pages that already
// define their own richer handlers (dashboard/matchmaking, tied to their
// own modal + widgets) keep them; elsewhere these fallbacks take over.

const MODAL_ID = 'sq-notif-modal';

function ensureModal() {
  let modal = document.getElementById(MODAL_ID);
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = MODAL_ID;
  modal.className = 'hidden fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm';
  modal.innerHTML = `
    <div class="bg-white rounded-3xl w-full max-w-sm shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar relative">
      <button id="sq-notif-modal-close" class="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500" aria-label="Tutup">✕</button>
      <div id="sq-notif-modal-content" class="p-6"></div>
    </div>`;
  document.body.appendChild(modal);
  const close = () => modal.classList.add('hidden');
  modal.querySelector('#sq-notif-modal-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  return modal;
}

function closeModal() { document.getElementById(MODAL_ID)?.classList.add('hidden'); }

// Refresh the panel + badge and let the host page refresh its own widgets.
async function afterAction() {
  closeModal();
  await refreshBadge();
  const panel = document.getElementById(PANEL_ID);
  if (panel && !panel.classList.contains('hidden')) await loadNotifications();
  document.dispatchEvent(new CustomEvent('sq:notif-updated'));
}

async function viewInvitationFallback(teamId, title, message) {
  const modal = ensureModal();
  const content = document.getElementById('sq-notif-modal-content');
  modal.classList.remove('hidden');
  content.innerHTML = `
    <div class="text-center pb-4 border-b border-gray-100">
      <div class="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center text-xl text-primary mx-auto mb-3">📩</div>
      <h3 class="font-800 text-gray-800 text-base">${title}</h3>
      <p class="text-xs text-gray-400 mt-0.5">Undangan Bergabung Tim</p>
    </div>
    <div class="space-y-4 mt-4">
      <p class="text-xs text-gray-600 leading-relaxed text-center">${message}</p>
      <div class="flex gap-3 pt-4 mt-4 border-t border-gray-100">
        <button id="sq-inv-accept" class="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-700 cursor-pointer border-0">Terima Undangan</button>
        <button id="sq-inv-reject" class="flex-1 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-700 cursor-pointer border-0">Tolak Undangan</button>
      </div>
    </div>`;
  const respond = async (action) => {
    ui.loading(true);
    try {
      await api.teams.respondInvite(teamId, action);
      ui.toast(action === 'approve' ? '✅ Undangan diterima! Anda bergabung dalam tim.' : '✅ Undangan ditolak.', 'success');
      await afterAction();
    } catch (e) { handleApiError(e, 'Gagal memproses undangan tim'); }
    finally { ui.loading(false); }
  };
  content.querySelector('#sq-inv-accept').onclick = () => respond('approve');
  content.querySelector('#sq-inv-reject').onclick = () => respond('reject');
}

async function viewApplicantFallback(applicantId, teamId = null) {
  const modal = ensureModal();
  const content = document.getElementById('sq-notif-modal-content');
  modal.classList.remove('hidden');
  content.innerHTML = `<div class="flex items-center justify-center py-12"><div style="width:32px;height:32px;border:3px solid #EDE9FF;border-top-color:#6C63FF;border-radius:50%;animation:sq-spin .7s linear infinite"></div></div>`;
  try {
    const m = await api.users.getById(applicantId);
    const skillsHtml = (m.skills || []).map((s) => `<span class="text-xs font-600 px-2.5 py-1 rounded-xl bg-primary-light text-primary">${s.label || s}</span>`).join('');
    const isTeamRequest = teamId && teamId !== 'null' && teamId !== 'undefined';
    let actionHtml = '';
    let bind = null;
    if (isTeamRequest) {
      const myTeams = await api.teams.mine();
      const activeTeam = Array.isArray(myTeams) ? myTeams.find((t) => t.id === parseInt(teamId, 10)) : (myTeams && myTeams.id === parseInt(teamId, 10) ? myTeams : null);
      const applicantPending = activeTeam && activeTeam.role === 'owner' && (activeTeam.applicants || []).some((a) => a.id === parseInt(applicantId, 10) && a.status !== 'invited');
      if (applicantPending) {
        actionHtml = `<div class="flex gap-3 pt-4 mt-4 border-t border-gray-100"><button id="sq-app-accept" class="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-700 cursor-pointer border-0">Setuju Bergabung</button><button id="sq-app-reject" class="flex-1 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-700 cursor-pointer border-0">Tolak Permohonan</button></div>`;
        bind = () => {
          const respond = async (action) => {
            ui.loading(true);
            try {
              await api.teams.respond(teamId, applicantId, action);
              ui.toast(action === 'approve' ? `✅ ${m.name} diterima masuk tim!` : `✅ Permohonan ${m.name} ditolak.`, 'success');
              await afterAction();
            } catch (e) { handleApiError(e, 'Gagal memproses permohonan bergabung'); }
            finally { ui.loading(false); }
          };
          content.querySelector('#sq-app-accept').onclick = () => respond('approve');
          content.querySelector('#sq-app-reject').onclick = () => respond('reject');
        };
      }
    } else if (m.connectionStatus === 'received' && m.connectionId) {
      actionHtml = `<div class="flex gap-3 pt-4 mt-4 border-t border-gray-100"><button id="sq-con-accept" class="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-700 cursor-pointer border-0">Terima Koneksi</button><button id="sq-con-reject" class="flex-1 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-700 cursor-pointer border-0">Tolak Koneksi</button></div>`;
      bind = () => {
        const respond = async (action) => {
          ui.loading(true);
          try {
            await api.connections.respond(m.connectionId, action === 'approve' ? 'accepted' : 'rejected');
            ui.toast(action === 'approve' ? `✅ Koneksi dengan ${m.name} diterima!` : `✅ Koneksi ditolak.`, 'success');
            await afterAction();
          } catch (e) { handleApiError(e, 'Gagal memproses permintaan koneksi'); }
          finally { ui.loading(false); }
        };
        content.querySelector('#sq-con-accept').onclick = () => respond('approve');
        content.querySelector('#sq-con-reject').onclick = () => respond('reject');
      };
    }
    const initials = m.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
    content.innerHTML = `
      <div class="text-center pb-4 border-b border-gray-100">
        <div class="w-16 h-16 rounded-full ${m.avatarColor || 'bg-primary'} flex items-center justify-center text-white font-bold text-lg mx-auto shadow-md border-2 border-white mb-3">${initials}</div>
        <h3 class="font-800 text-gray-800 text-base">${m.name}</h3>
        <p class="text-xs text-primary font-600 mt-0.5">${m.prodi || m.studyProgram || ''}</p>
        <p class="text-[10px] text-gray-400">${m.university || m.uni || ''}</p>
      </div>
      <div class="space-y-4 mt-4">
        <div><h4 class="font-800 text-xs text-gray-700 uppercase tracking-wide mb-1">Bio Singkat</h4><p class="text-xs text-gray-600 leading-relaxed">${m.bio || 'Siap berkolaborasi!'}</p></div>
        <div><h4 class="font-800 text-xs text-gray-700 uppercase tracking-wide mb-2">Keahlian / Skills</h4><div class="flex flex-wrap gap-1.5">${skillsHtml || '<p class="text-xs text-gray-400">Belum menambahkan skill.</p>'}</div></div>
        ${actionHtml}
      </div>`;
    if (bind) bind();
  } catch (e) {
    handleApiError(e, 'Gagal mengambil profil detail');
    closeModal();
  }
}

/**
 * Wire every notification bell on the page. Safe to call multiple times —
 * buttons are bound once, the outside-click listener is registered once.
 */
export async function initNotifications() {
  if (!token.isPresent()) return;
  ensurePanel();

  // Register actionable handlers as fallbacks — never clobber a page's own.
  if (typeof window.viewInvitation !== 'function') window.viewInvitation = viewInvitationFallback;
  if (typeof window.viewApplicantProfile !== 'function') window.viewApplicantProfile = viewApplicantFallback;

  document.querySelectorAll('[data-notif-btn]').forEach((btn) => {
    if (btn.dataset.notifBound) return;
    btn.dataset.notifBound = 'true';
    btn.addEventListener('click', togglePanel);
  });

  if (!_outsideBound) {
    _outsideBound = true;

    // Delegated click on a notification card → dispatch by index (no inline
    // onclick, so quotes in the message can't break it).
    document.addEventListener('click', (e) => {
      const card = e.target.closest('[data-notif-index]');
      if (!card) return;
      const notif = _currentNotifs[parseInt(card.dataset.notifIndex, 10)];
      if (!notif) return;
      let dispatched = false;
      if (notif.title === 'Undangan Bergabung Tim') {
        window.viewInvitation?.(notif.teamId, notif.title, notif.message);
        dispatched = true;
      } else if (notif.applicantId) {
        window.viewApplicantProfile?.(notif.applicantId, notif.teamId ?? null);
        dispatched = true;
      }
      if (dispatched) document.getElementById(PANEL_ID)?.classList.add('hidden');
    });

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
