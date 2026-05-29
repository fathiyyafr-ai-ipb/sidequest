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
    const user = currentUser.get();
    if (user && user.role === 'organizer') {
      window.location.href = '../pages/organizer-dashboard.html';
    } else {
      window.location.href = '../pages/dashboard.html';
    }
    return false;
  }
  return true;
}

export async function initSession() {
  if (!requireAuth()) return null;
  
  // Auto redirect organizer from standard participant pages
  const user = currentUser.get();
  if (user && user.role === 'organizer' && 
      !window.location.pathname.includes('organizer-dashboard.html') && 
      !window.location.pathname.includes('posting-lomba.html')) {
    window.location.href = '../pages/organizer-dashboard.html';
    return null;
  }
  
  ui.fillSidebarUser();          // immediate from cache
  ui.updateNotifBadge();         // badge in background
  bindLogout();
  try {
    const profile = await api.users.me();
    
    // Double check with latest profile role
    if (profile && profile.role === 'organizer' && 
        !window.location.pathname.includes('organizer-dashboard.html') && 
        !window.location.pathname.includes('posting-lomba.html')) {
      window.location.href = '../pages/organizer-dashboard.html';
      return null;
    }
    
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
