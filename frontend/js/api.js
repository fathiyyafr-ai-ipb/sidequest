/**
 * SideQuest — api.js  (ES Module)
 * Central HTTP client — import in every page.
 */
// Konfigurasi URL API Dinamis
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001/api'
  : 'https://sidequest-backend-3930.onrender.com/api';

const TOKEN_KEY = 'sq_access_token';
const REFRESH_KEY = 'sq_refresh_token';
const USER_KEY = 'sq_user';

// ── Token storage ─────────────────────────────────────────────────
export const token = {
  get() { return localStorage.getItem(TOKEN_KEY); },
  set(t) { localStorage.setItem(TOKEN_KEY, t); },
  getRefresh() { return localStorage.getItem(REFRESH_KEY); },
  setRefresh(t) { localStorage.setItem(REFRESH_KEY, t); },
  clear() { [TOKEN_KEY, REFRESH_KEY, USER_KEY].forEach(k => localStorage.removeItem(k)); },
  isPresent() { return !!localStorage.getItem(TOKEN_KEY); },
};

// ── Cached user ───────────────────────────────────────────────────
export const currentUser = {
  get() { const r = localStorage.getItem(USER_KEY); return r ? JSON.parse(r) : null; },
  set(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); },
  clear() { localStorage.removeItem(USER_KEY); },
};

// ── Core fetch ────────────────────────────────────────────────────
let _refreshing = false, _queue = [];

async function http(method, path, body = null, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token.isPresent() && !opts.skipAuth) headers['Authorization'] = `Bearer ${token.get()}`;

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const cfg = { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) };
  let res = await fetch(url, cfg);

  // 401 → try refresh
  if (res.status === 401 && token.getRefresh() && !opts.skipRefresh) {
    if (!_refreshing) {
      _refreshing = true;
      try {
        const rr = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Refresh-Token': token.getRefresh() }
        });
        if (rr.ok) {
          const rd = await rr.json();
          token.set(rd.data.accessToken);
          token.setRefresh(rd.data.refreshToken);
          headers['Authorization'] = `Bearer ${rd.data.accessToken}`;
          _queue.forEach(r => r()); _queue = [];
        } else { token.clear(); window.location.href = '../pages/login.html'; return; }
      } finally { _refreshing = false; }
    } else { await new Promise(r => _queue.push(r)); }
    res = await fetch(url, { ...cfg, headers });
  }

  if (res.status === 503 && !window.location.pathname.includes('maintenance.html')) {
    const isRoot = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || (window.location.pathname.includes('/sidequest/') && !window.location.pathname.includes('/pages/'));
    window.location.href = isRoot ? 'pages/maintenance.html' : 'maintenance.html';
    return;
  }

  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (typeof data === 'object') ? (data?.message || `HTTP ${res.status}`) : `HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status, data });
  }
  return data;
}

const _get = (p, o) => http('GET', p, null, o);
const _post = (p, b, o) => http('POST', p, b, o);
const _put = (p, b, o) => http('PUT', p, b, o);
const _patch = (p, b, o) => http('PATCH', p, b, o);
const _del = (p, o) => http('DELETE', p, null, o);

// ── Public API ────────────────────────────────────────────────────
export const api = {

  auth: {
    async login(email, password) {
      const res = await _post('/auth/login', { email, password }, { skipAuth: true, skipRefresh: true });
      _store(res.data); return res.data;
    },
    async register(payload) {
      const res = await _post('/auth/register', payload, { skipAuth: true, skipRefresh: true });
      return res; // returns { message, isLocalhost, verificationToken, data: { user } }
    },
    async forgotPassword(email) {
      return await _post('/auth/forgot-password', { email }, { skipAuth: true, skipRefresh: true });
    },
    logout() { token.clear(); window.location.href = '../pages/login.html'; },
    isLoggedIn() { return token.isPresent(); },
  },

  competitions: {
    async list(p = {}) {
      const q = new URLSearchParams();
      if (p.search) q.set('search', p.search);
      if (p.category) q.set('category', p.category);
      if (p.scope) q.set('scope', p.scope);
      if (p.free != null) q.set('free', p.free);
      q.set('sortBy', p.sortBy || 'registrationClose');
      q.set('page', p.page ?? 0);
      q.set('size', p.size ?? 12);
      const res = await _get(`/competitions?${q}`);
      return res.data;
    },
    async upcoming(page = 0, size = 5) {
      const res = await _get(`/competitions/upcoming?page=${page}&size=${size}`);
      return res.data;
    },
    async getById(id) { const res = await _get(`/competitions/${id}`); return res.data; },
    save(id) { return _post(`/competitions/${id}/save`); },
    unsave(id) { return _del(`/competitions/${id}/save`); },
    async getSaved() { const res = await _get('/competitions/saved'); return res.data; },
    register(id, payload = null) { return _post(`/competitions/${id}/register`, payload); },
    async getRegistrationStatus(id) { const res = await _get(`/competitions/${id}/registration-status`); return res.data; },
    // Organizer extensions
    async getOrganizerCompetitions() { const res = await _get('/competitions/organizer/mine'); return res.data; },
    create(payload) { return _post('/competitions/organizer/create', payload); },
    update(id, payload) { return _put(`/competitions/organizer/${id}`, payload); },
    publish(id) { return _patch(`/competitions/organizer/${id}/publish`); },
    announce(id, announcement) { return _patch(`/competitions/organizer/${id}/announce`, { announcement }); },
    async getApplicants(id) { const res = await _get(`/competitions/organizer/${id}/applicants`); return res.data; },
    respondApplicant(id, userId, action) { return _patch(`/competitions/organizer/${id}/applicants/${userId}`, { action }); },
  },

  users: {
    async me() { const res = await _get('/users/me'); currentUser.set(res.data); return res.data; },
    async getById(id) { const res = await _get(`/users/${id}`); return res.data; },
    async candidates(p = {}) {
      const q = new URLSearchParams();
      if (p.search) q.set('search', p.search);
      q.set('page', p.page ?? 0); q.set('size', p.size ?? 10);
      const res = await _get(`/users/candidates?${q}`); return res.data;
    },
    async updateProfile(payload) { const res = await _put('/users/me', payload); currentUser.set(res.data); return res.data; },
  },

  notifications: {
    async list(page = 0, size = 20) { const res = await _get(`/notifications?page=${page}&size=${size}`); return res.data; },
    async unreadCount() { const res = await _get('/notifications/unread-count'); return res.data.unread; },
    markAllRead() { return _patch('/notifications/read-all'); },
  },

  connections: {
    send(receiverId, message = '') { return _post('/connections', { receiverId, message }); },
    respond(id, status) { return _patch(`/connections/${id}`, { status }); },
    async received() { const res = await _get('/connections/received'); return res.data; },
    async sent() { const res = await _get('/connections/sent'); return res.data; },
  },

  matchmaking: {
    async get(skill = 'all') { const res = await _get(`/matchmaking?skill=${skill}`); return res.data; },
    async connect(receiverId) { const res = await _post('/matchmaking/connect', { receiverId }); return res; }
  },

  sidekick: {
    async chat(message) {
      return await _post('/sidekick/chat', { message });
    }
  },

  teams: {
    async mine() { const res = await _get('/teams/me'); return res.data; },
    async candidates() { const res = await _get('/teams/candidates'); return res.data; },
    async create(p) { const res = await _post('/teams', p); return res.data; },
    async list(cat = 'all') { const res = await _get(`/teams?cat=${cat}`); return res.data; },
    async apply(id) { const res = await _post(`/teams/${id}/apply`); return res; },
    async respond(id, applicantId, action) { const res = await _post(`/teams/${id}/respond`, { applicantId, action }); return res; },
    leave(id) { return _del(`/teams/${id}/leave`); },
    invite(id, userId) { return _post(`/teams/${id}/invite`, { userId }); },
  },

  admin: {
    async getStats() { const res = await _get('/admin/stats'); return res.data; },
    async getData() { const res = await _get('/admin/data'); return res.data; },
    toggleActive(type, id) { return _patch(`/admin/toggle/${type}/${id}`); },
    async scrape(url) { const res = await _post('/admin/scrape', { url }); return res.data; },
    toggleModerator(id) { return _patch(`/admin/super/moderator/${id}/toggle`); },
    updateFeatures(featureKey, activeValue) { return _patch('/admin/super/features', { featureKey, activeValue }); },
    updateMaintenance(enabled) { return _patch('/admin/super/maintenance', { enabled }); },
    approveOrganizer(id) { return _patch(`/admin/approve-organizer/${id}`); },
  },
};

// ── helpers ───────────────────────────────────────────────────────
function _store(data) {
  if (!data) return;
  if (data.accessToken) token.set(data.accessToken);
  if (data.refreshToken) token.setRefresh(data.refreshToken);
  if (data.user) currentUser.set(data.user);
}

// ── UI helpers ────────────────────────────────────────────────────
export const ui = {
  toast(msg, type = 'info', ms = 3000) {
    document.getElementById('sq-toast')?.remove();
    const bg = { info: '#1E1B3A', success: '#166534', error: '#991B1B', warning: '#92400E' }[type] || '#1E1B3A';
    const el = document.createElement('div'); el.id = 'sq-toast';
    Object.assign(el.style, {
      position: 'fixed', bottom: '24px', left: '50%',
      transform: 'translateX(-50%) translateY(16px)',
      background: bg, color: '#fff', padding: '11px 22px', borderRadius: '12px',
      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '13px', fontWeight: '600',
      boxShadow: '0 8px 32px rgba(0,0,0,.3)', zIndex: '9999',
      opacity: '0', transition: 'opacity .25s,transform .25s', whiteSpace: 'nowrap',
      maxWidth: '90vw', textAlign: 'center',
    });
    el.textContent = msg; document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)'; });
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(16px)'; setTimeout(() => el.remove(), 300); }, ms);
  },

  loading(show, container = null) {
    const id = 'sq-loading';
    if (!show) { document.getElementById(id)?.remove(); return; }
    if (document.getElementById(id)) return;
    const el = document.createElement('div'); el.id = id;
    Object.assign(el.style, {
      position: container ? 'absolute' : 'fixed', inset: '0',
      background: 'rgba(255,255,255,.75)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: '8888', borderRadius: 'inherit'
    });
    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px">
      <div style="width:32px;height:32px;border:3px solid #EDE9FF;border-top-color:#6C63FF;
           border-radius:50%;animation:sq-spin .7s linear infinite"></div>
      <span style="font-size:13px;color:#6C63FF;font-family:'Plus Jakarta Sans',sans-serif;font-weight:600">Memuat…</span>
    </div>`;
    if (!document.getElementById('sq-spin-s')) {
      const s = document.createElement('style'); s.id = 'sq-spin-s';
      s.textContent = '@keyframes sq-spin{to{transform:rotate(360deg)}}@keyframes sq-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}';
      document.head.appendChild(s);
    }
    (container || document.body).appendChild(el);
  },

  skeletons(el, n = 3, h = '120px') {
    if (!el) return;
    el.innerHTML = Array.from({ length: n }, () => `<div style="background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:sq-shimmer 1.4s infinite;border-radius:16px;height:${h}"></div>`).join('');
    if (!document.getElementById('sq-spin-s')) {
      const s = document.createElement('style'); s.id = 'sq-spin-s';
      s.textContent = '@keyframes sq-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}';
      document.head.appendChild(s);
    }
  },

  fillSidebarUser() {
    const u = currentUser.get(); if (!u) return;
    const parts = (u.fullName || u.full_name || u.name || 'U').split(' ');
    const fname = parts[0] || '';
    const init = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
    document.querySelectorAll('[data-sb-name]').forEach(el => el.textContent = u.fullName || u.full_name || u.name || '');
    document.querySelectorAll('[data-sb-fname]').forEach(el => el.textContent = fname);
    document.querySelectorAll('[data-sb-role]').forEach(el => el.textContent = u.university || u.studyProgram || u.prodi || '');
    document.querySelectorAll('[data-sb-init]').forEach(el => el.textContent = init || 'U');

    // Hide "Posting Lomba" for role 'peserta'
    const role = u.role || 'peserta';
    if (role === 'peserta') {
      document.querySelectorAll('[href*="posting-lomba.html"]').forEach(el => {
        el.style.setProperty('display', 'none', 'important');
      });
    } else {
      document.querySelectorAll('[href*="posting-lomba.html"]').forEach(el => {
        el.style.display = '';
      });
    }

    // Auto-inject SideKick chatbot bubble for logged-in participants (not on maintenance)
    if (role === 'peserta' && !window.location.pathname.includes('maintenance.html')) {
      import('./sidekick.js')
        .then(m => m.initSideKick())
        .catch(err => console.warn('SideKick failed to load:', err));
    }
  },

  async updateNotifBadge() {
    if (!token.isPresent()) return;
    try {
      const n = await api.notifications.unreadCount();
      document.querySelectorAll('[data-notif-count]').forEach(el => {
        el.textContent = n > 99 ? '99+' : n;
        el.style.display = n > 0 ? 'inline-flex' : 'none';
      });
    } catch (_) { }
  },

  formatDate(s) {
    if (!s) return '-';
    return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  },
  daysUntil(s) {
    if (!s) return null;
    return Math.ceil((new Date(s) - new Date()) / (86400000));
  },
  formatRupiah(n) {
    if (!n || n === 0) return 'Gratis';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  },
  catColor(cat) {
    const map = {
      TEKNOLOGI: 'tag-purple', BISNIS: 'tag-orange', SOSIAL: 'tag-green',
      SAINS: 'tag-blue', DESAIN: 'tag-pink', HACKATHON: 'tag-purple', LAINNYA: 'tag-blue'
    };
    return map[cat] || 'tag-blue';
  },
  catEmoji(cat) {
    const map = { TEKNOLOGI: '💻', BISNIS: '💼', SOSIAL: '🌱', SAINS: '🔬', DESAIN: '🎨', HACKATHON: '⚡', LAINNYA: '📌' };
    return map[cat] || '📌';
  },
  compatColor(n) {
    if (n >= 85) return 'bg-green-500';
    if (n >= 70) return 'bg-blue-500';
    return 'bg-orange-500';
  },
};

export function handleApiError(err, fallback = 'Terjadi kesalahan. Coba lagi.') {
  console.error('[API]', err);
  ui.toast(err?.message || fallback, 'error');
  return null;
}
