/**
 * SideQuest — auth.js
 * Route guard utilities — import in every protected page.
 */
import { token, currentUser, api, ui } from './api.js';

export function requireAuth() {
  if (!token.isPresent()) {
    window.location.href = '../pages/login.html';
    return false;
  }
  return true;
}

export function requireGuest() {
  if (token.isPresent()) {
    window.location.href = '../pages/dashboard.html';
    return false;
  }
  return true;
}

export async function initSession() {
  if (!requireAuth()) return null;
  ui.fillSidebarUser();          // immediate from cache
  ui.updateNotifBadge();         // badge in background
  bindLogout();
  try {
    const profile = await api.users.me();
    ui.fillSidebarUser();        // refresh with latest
    return profile;
  } catch(err) {
    if (err?.status===401) { token.clear(); window.location.href='../pages/login.html'; }
    return currentUser.get();
  }
}

export function bindLogout() {
  document.querySelectorAll('[data-logout]').forEach(el=>{
    el.addEventListener('click', e=>{
      e.preventDefault();
      if (confirm('Keluar dari SideQuest?')) {
        token.clear();
        window.location.href='../pages/login.html';
      }
    });
  });
}
