/* ═══════════════════════════════════════════════════
   SideQuest — app.js
   Navigation, render functions, UI interactions
   ═══════════════════════════════════════════════════ */

"use strict";

/* ─────────────────────────────────────────────────
   CONSTANTS
   ───────────────────────────────────────────────── */
const PAGE_TITLES = {
  dashboard:   "Dashboard",
  direktori:   "Direktori Lomba",
  detail:      "Detail Lomba",
  matchmaking: "Matchmaking",
  profil:      "Profil Saya",
};

/* sidebar order mirrors the <a> elements */
const SIDEBAR_ORDER = ["dashboard", "direktori", "detail", "matchmaking", "profil"];
/* bottom tab order mirrors the <button> elements */
const TAB_ORDER = ["dashboard", "direktori", "matchmaking", "profil"];

/* ─────────────────────────────────────────────────
   NAVIGATION
   ───────────────────────────────────────────────── */
function navigate(page) {
  /* 1 — hide all pages */
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));

  /* 2 — show target */
  const target = document.getElementById("page-" + page);
  if (target) target.classList.add("active");

  /* 3 — desktop topbar title */
  const titleEl = document.getElementById("page-title");
  if (titleEl) titleEl.textContent = PAGE_TITLES[page] || page;

  /* 4 — sidebar active state */
  document.querySelectorAll(".nav-link").forEach((el) => el.classList.remove("active"));
  const sideIdx = SIDEBAR_ORDER.indexOf(page);
  const sideLinks = document.querySelectorAll(".nav-link");
  if (sideIdx >= 0 && sideLinks[sideIdx]) sideLinks[sideIdx].classList.add("active");

  /* 5 — bottom tab active state */
  document.querySelectorAll(".tab-btn").forEach((el) => el.classList.remove("active"));
  const tabIdx = TAB_ORDER.indexOf(page);
  const tabs = document.querySelectorAll(".tab-btn");
  if (tabIdx >= 0 && tabs[tabIdx]) tabs[tabIdx].classList.add("active");

  /* 6 — scroll to top */
  window.scrollTo({ top: 0, behavior: "smooth" });

  /* 7 — close mobile sidebar */
  closeSidebar();

  /* 8 — lazy render pages that need JS */
  if (page === "direktori")   renderLombaList(lombaData);
  if (page === "matchmaking") renderMatchList(matchData);
  if (page === "profil")      renderProfil(currentUser);
  if (page === "dashboard")   renderDashboard(currentUser);
}

/* ─────────────────────────────────────────────────
   SIDEBAR (mobile)
   ───────────────────────────────────────────────── */
function openSidebar() {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("sidebar-overlay").classList.add("open");
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.remove("open");
}

/* ─────────────────────────────────────────────────
   TOAST NOTIFICATION
   ───────────────────────────────────────────────── */
let _toastTimer = null;
function showToast(msg, durationMs = 2500) {
  let toast = document.getElementById("sq-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "sq-toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove("show"), durationMs);
}

/* ─────────────────────────────────────────────────
   DASHBOARD RENDER
   ───────────────────────────────────────────────── */
function renderDashboard(user) {
  /* sidebar user info */
  const sbName = document.getElementById("sb-user-name");
  const sbRole = document.getElementById("sb-user-role");
  if (sbName) sbName.textContent = user.name;
  if (sbRole) sbRole.textContent = `${user.prodi} · ${user.uni.split(" ")[0]}`;

  /* stats */
  const stats = {
    "stat-lomba":     user.stats.lombaIkuti,
    "stat-tim":       user.stats.timAktif,
    "stat-undangan":  user.stats.undangan,
  };
  Object.entries(stats).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });

  /* deadlines */
  const dlContainer = document.getElementById("deadline-list");
  if (dlContainer) {
    dlContainer.innerHTML = user.deadlines.map((d, i) => `
      <div class="flex items-center gap-4 p-4 ${i < user.deadlines.length - 1 ? "border-b border-gray-50" : ""}
           hover:bg-gray-50/50 transition-colors cursor-pointer" onclick="window.location.href='detail.html?id=${d.id || 1}'">
        <div class="w-12 h-12 rounded-xl ${d.bgCls} flex flex-col items-center justify-center flex-shrink-0">
          <span class="${d.numCls} font-800 text-base leading-none">${d.day}</span>
          <span class="text-xs opacity-70 ${d.numCls}">${d.month}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-700 text-sm text-gray-800 truncate">${d.name}</p>
          <p class="text-xs text-gray-400 mt-0.5">Sisa <span class="${d.urgentCls} font-700">${d.left}</span></p>
        </div>
        <span class="w-2 h-2 rounded-full flex-shrink-0 ${d.dotCls}"></span>
      </div>
    `).join("");
  }
}

/* ─────────────────────────────────────────────────
   DIREKTORI — RENDER & FILTER
   ───────────────────────────────────────────────── */
let _currentCat = "all";

function renderLombaList(data) {
  const list  = document.getElementById("lomba-list");
  const count = document.getElementById("lomba-count");
  if (count) count.textContent = data.length;
  if (!list) return;

  if (data.length === 0) {
    list.innerHTML = `
      <div class="text-center py-16">
        <p class="text-4xl mb-3">🔍</p>
        <p class="font-700 text-gray-600">Lomba tidak ditemukan</p>
        <p class="text-sm text-gray-400 mt-1">Coba kata kunci atau kategori lain</p>
      </div>`;
    return;
  }

  list.innerHTML = data.map((l) => `
    <div class="lomba-card bg-white rounded-2xl shadow-card overflow-hidden cursor-pointer"
         onclick="window.location.href='detail.html?id=${l.id}'">
      <div class="flex items-center gap-4 p-4">
        <!-- Icon -->
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br ${l.color}
             flex items-center justify-center flex-shrink-0 text-2xl shadow-sm">
          ${l.emoji}
        </div>
        <!-- Content -->
        <div class="flex-1 min-w-0">
          <h3 class="font-700 text-sm text-gray-800 leading-snug line-clamp-2 mb-1">
            ${l.title}
          </h3>
          <p class="text-xs text-gray-400 mb-2 truncate">${l.org}</p>
          <div class="flex flex-wrap items-center gap-1.5">
            ${l.tags.map((t) => `<span class="tag-purple text-xs font-600 px-2 py-0.5 rounded-lg">${t}</span>`).join("")}
            ${l.free
              ? `<span class="bg-green-100 text-green-700 text-xs font-600 px-2 py-0.5 rounded-lg">Gratis</span>`
              : `<span class="bg-orange-100 text-orange-700 text-xs font-600 px-2 py-0.5 rounded-lg">${l.prize}</span>`
            }
          </div>
        </div>
      </div>
      <!-- Footer bar -->
      <div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div class="flex items-center gap-1.5">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="${l.daysLeft <= 5 ? "#EF4444" : "#9CA3AF"}" stroke-width="2"/>
            <path d="M12 6v6l4 2" stroke="${l.daysLeft <= 5 ? "#EF4444" : "#9CA3AF"}" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span class="text-xs font-600 ${l.daysLeft <= 5 ? "text-red-500" : "text-gray-400"}">
            Deadline: ${l.deadline} ${l.daysLeft <= 5 ? "🔥" : ""}
          </span>
        </div>
        <button class="text-xs font-700 text-primary bg-primary-light px-3 py-1.5 rounded-xl
                       hover:bg-primary hover:text-white transition-colors"
                onclick="event.stopPropagation(); window.location.href='detail.html?id=${l.id}'">
          Detail
        </button>
      </div>
    </div>
  `).join("");
}

function filterLomba(query) {
  const q = query.toLowerCase().trim();
  let filtered = _currentCat === "all"
    ? lombaData
    : lombaData.filter((l) => l.cat === _currentCat);
  if (q) {
    filtered = filtered.filter(
      (l) => l.title.toLowerCase().includes(q) || l.org.toLowerCase().includes(q)
    );
  }
  renderLombaList(filtered);
}

function setChip(el, cat) {
  /* reset all chips in the direktori section */
  document.querySelectorAll(".chip").forEach((c) => {
    c.classList.remove("selected", "border-primary", "bg-primary", "text-white");
    c.classList.add("border-gray-200", "text-gray-600");
  });
  /* activate clicked chip */
  el.classList.add("selected", "border-primary", "bg-primary", "text-white");
  el.classList.remove("border-gray-200", "text-gray-600");

  _currentCat = cat;
  const q = document.getElementById("direktori-search")?.value || "";
  filterLomba(q);
}

/* ─────────────────────────────────────────────────
   MATCHMAKING — RENDER
   ───────────────────────────────────────────────── */
let _currentMatchSkill = "all";

function renderMatchList(data) {
  const list = document.getElementById("match-list");
  if (!list) return;

  /* update count jika ada elemen count */
  const countEl = document.getElementById("match-count");
  if (countEl) countEl.textContent = data.length;

  if (data.length === 0) {
    list.innerHTML = `
      <div class="text-center py-16">
        <p class="text-4xl mb-3">🔍</p>
        <p class="font-700 text-gray-600">Tidak ada kandidat ditemukan</p>
        <p class="text-sm text-gray-400 mt-1">Coba filter skill yang lain</p>
      </div>`;
    return;
  }

  list.innerHTML = data.map((m) => {
    const barColor =
      m.compat >= 85 ? "bg-green-500" :
      m.compat >= 70 ? "bg-blue-500"  : "bg-orange-500";

    return `
    <div class="match-card bg-white rounded-2xl shadow-card overflow-hidden">
      <!-- Header -->
      <div class="p-4 flex items-start gap-4">
        <div class="relative flex-shrink-0">
          <div class="w-14 h-14 rounded-full ${m.avatarColor}
               flex items-center justify-center text-white shadow-md border-2 border-white">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2
                       M12 11a4 4 0 100-8 4 4 0 000 8z"
                    stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          ${m.online
            ? `<span class="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white"></span>`
            : ""}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-800 text-gray-800 text-sm">${m.name}</h3>
            <div class="score-badge text-white text-xs font-800 px-2.5 py-1 rounded-xl shadow-sm flex-shrink-0">
              ${m.compat}%
            </div>
          </div>
          <p class="text-xs text-primary font-600 mt-0.5">${m.prodi}</p>
          <p class="text-xs text-gray-400">${m.uni}</p>
        </div>
      </div>

      <!-- Skills -->
      <div class="px-4 pb-3">
        <p class="text-xs font-700 text-gray-500 mb-2">Skill</p>
        <div class="flex flex-wrap gap-1.5">
          ${m.skills.map((s) => `<span class="tag-purple text-xs font-600 px-2 py-1 rounded-lg">${s}</span>`).join("")}
        </div>
      </div>

      <!-- Experience -->
      <div class="px-4 pb-3">
        <p class="text-xs font-700 text-gray-500 mb-1">Pengalaman</p>
        ${m.exp.map((e) => `<p class="text-xs text-gray-600">• ${e}</p>`).join("")}
      </div>

      <!-- Prestasi -->
      <div class="px-4 pb-3 flex flex-wrap gap-1.5">
        ${m.prestasi.map((p) => `<span class="text-xs font-600 px-2.5 py-1 rounded-lg bg-accent-light text-accent">${p}</span>`).join("")}
      </div>

      <!-- Actions -->
      <div class="px-4 pb-4 flex gap-2">
        <button class="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-700
                       hover:bg-primary-dark transition-colors shadow-sm"
                onclick="showToast('✅ Permintaan dikirim ke ${m.name}!')">
          Connect
        </button>
        <button class="w-11 h-10 rounded-xl bg-primary-light flex items-center justify-center
                       hover:bg-primary group transition-colors">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"
               class="group-hover:stroke-white transition-colors">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                  stroke="#6C63FF" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <!-- Compat bar -->
      <div class="bg-gray-50 px-4 py-2.5 flex items-center gap-3 border-t border-gray-100">
        <span class="text-xs text-gray-400 font-500 flex-shrink-0">Kecocokan</span>
        <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div class="compat-bar-fill ${barColor} h-full rounded-full" style="width:${m.compat}%"></div>
        </div>
        <span class="text-xs font-800 text-gray-700 flex-shrink-0">${m.compat}%</span>
      </div>
    </div>`;
  }).join("");
}

function filterMatch(skillCat) {
  const filtered = skillCat === "all"
    ? matchData
    : matchData.filter((m) => m.skillCats && m.skillCats.includes(skillCat));
  renderMatchList(filtered);
}

function setMatchChip(el, skillCat) {
  /* reset semua chip matchmaking */
  document.querySelectorAll(".chip, .match-chip").forEach((c) => {
    c.classList.remove("selected", "bg-primary", "text-white", "border-primary");
    c.classList.add("border-gray-200", "text-gray-600");
  });
  /* aktifkan chip yang diklik */
  el.classList.add("selected", "bg-primary", "text-white", "border-primary");
  el.classList.remove("border-gray-200", "text-gray-600");

  _currentMatchSkill = skillCat;
  filterMatch(skillCat);
}

/* ─────────────────────────────────────────────────
   PROFIL — RENDER
   ───────────────────────────────────────────────── */
function renderProfil(user) {
  /* Skills */
  const skillsEl = document.getElementById("profil-skills");
  if (skillsEl) {
    skillsEl.innerHTML = user.skills
      .map((s) => `<span class="${s.cls} text-xs font-600 px-2.5 py-1.5 rounded-xl">${s.label}</span>`)
      .join("");
  }

  /* Riwayat */
  const riwayatEl = document.getElementById("profil-riwayat");
  if (riwayatEl) {
    riwayatEl.innerHTML = user.riwayat.map((r) => `
      <div class="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
        <div class="w-10 h-10 rounded-xl ${r.bg} flex items-center justify-center flex-shrink-0">
          <span class="text-sm">${r.emoji}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-700 text-gray-800 truncate">${r.title}</p>
          <p class="text-xs text-gray-400">${r.org}</p>
        </div>
        <span class="text-xs font-700 ${r.badgeCls} px-2 py-1 rounded-lg flex-shrink-0">${r.badge}</span>
      </div>
    `).join("");
  }

  /* Prestasi */
  const prestasiEl = document.getElementById("profil-prestasi");
  if (prestasiEl) {
    const items = user.prestasi.map((p) => `
      <div class="p-3 rounded-xl border border-gray-100 hover:border-primary transition-colors">
        <p class="text-xs font-700 text-gray-800 mb-0.5">${p.title}</p>
        <p class="text-xs text-gray-400">${p.sub}</p>
      </div>
    `).join("");
    /* keep the + button */
    prestasiEl.innerHTML = items + `
      <div class="p-3 rounded-xl border border-dashed border-gray-200 hover:border-primary
                  transition-colors cursor-pointer flex items-center justify-center"
           onclick="showToast('✏️ Fitur segera hadir!')">
        <span class="text-xl text-gray-300">+</span>
      </div>`;
  }

  /* Stats header */
  const statMap = {
    "profil-stat-lomba":   user.stats.lombaIkuti,
    "profil-stat-tim":     user.stats.timAktif,
    "profil-stat-match":   user.stats.matchRate,
  };
  Object.entries(statMap).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
}

/* ─────────────────────────────────────────────────
   INITIALISE ON DOM READY
   ───────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  /* Render all data-driven sections immediately */
  renderDashboard(currentUser);
  renderMatchList(matchData);
  renderProfil(currentUser);

  /* Coba ambil data lomba dari API; fallback ke lokal */
  fetchData().then(() => {
    /* Setelah data siap, navigasi ke halaman berdasarkan URL */
    let path = window.location.pathname.split('/').pop().replace('.html', '');
    if (!path || path === '' || path === 'index') path = 'dashboard';
    
    if (TAB_ORDER.includes(path) || SIDEBAR_ORDER.includes(path)) {
      navigate(path);
    } else {
      navigate('dashboard');
    }
  });
});

// Fungsi untuk ambil data dari API Postgres
// PENTING: data disimpan ke lombaData agar filter chip tetap berfungsi
async function fetchData() {
  try {
    const response = await fetch('http://localhost:3001/api/competitions');
    if (!response.ok) throw new Error('API error ' + response.status);
    const apiData = await response.json();
    if (apiData && apiData.data && apiData.data.length > 0) {
      // Simpan ke lombaData agar filterLomba() dan setChip() bisa menggunakannya
      lombaData.length = 0;
      apiData.data.forEach(item => lombaData.push(item));
    } else if (apiData && apiData.length > 0) {
      lombaData.length = 0;
      apiData.forEach(item => lombaData.push(item));
    }
    // Gunakan lombaData (bisa dari API atau tetap dari data.js jika API kosong)
    renderLombaList(lombaData);
  } catch (err) {
    // Fallback ke data lokal jika API tidak tersedia
    console.warn('API tidak tersedia, menggunakan data lokal:', err.message);
    renderLombaList(lombaData);
  }
}