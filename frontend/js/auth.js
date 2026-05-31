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
    if (user && (user.role === 'moderator' || user.role === 'superadmin')) {
      window.location.href = '../pages/admin-dashboard.html';
    } else if (user && user.role === 'organizer') {
      window.location.href = '../pages/organizer-dashboard.html';
    } else if (user && user.role === 'sponsor') {
      window.location.href = '../pages/sponsor-dashboard.html';
    } else {
      window.location.href = '../pages/dashboard.html';
    }
    return false;
  }
  return true;
}

export async function initSession() {
  if (!requireAuth()) return null;
  
  // Auto redirect administrator/moderator from standard participant pages
  const user = currentUser.get();
  if (user && (user.role === 'moderator' || user.role === 'superadmin') && 
      !window.location.pathname.includes('admin-dashboard')) {
    window.location.href = '../pages/admin-dashboard.html';
    return null;
  }
  
  // Auto redirect organizer from standard participant pages
  if (user && user.role === 'organizer' && 
      !window.location.pathname.includes('organizer-dashboard') && 
      !window.location.pathname.includes('posting-lomba')) {
    window.location.href = '../pages/organizer-dashboard.html';
    return null;
  }
  
  // Auto redirect sponsor from standard participant pages
  if (user && user.role === 'sponsor' && 
      !window.location.pathname.includes('sponsor-dashboard')) {
    window.location.href = '../pages/sponsor-dashboard.html';
    return null;
  }
  
  ui.fillSidebarUser();          // immediate from cache
  ui.updateNotifBadge();         // badge in background
  bindLogout();
  try {
    const profile = await api.users.me();
    
    // Double check with latest profile role
    if (profile && (profile.role === 'moderator' || profile.role === 'superadmin') && 
        !window.location.pathname.includes('admin-dashboard')) {
      window.location.href = '../pages/admin-dashboard.html';
      return null;
    }
    
    if (profile && profile.role === 'organizer' && 
        !window.location.pathname.includes('organizer-dashboard') && 
        !window.location.pathname.includes('posting-lomba')) {
      window.location.href = '../pages/organizer-dashboard.html';
      return null;
    }
    
    if (profile && profile.role === 'sponsor' && 
        !window.location.pathname.includes('sponsor-dashboard')) {
      window.location.href = '../pages/sponsor-dashboard.html';
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
    if (el.dataset.logoutBound) return;
    el.dataset.logoutBound = 'true';
    
    el.addEventListener('click', e=>{
      e.preventDefault();
      ui.confirm('Konfirmasi Keluar', 'Apakah Anda yakin ingin keluar dari SideQuest?', 'Keluar', () => {
        token.clear();
        window.location.href='../pages/login.html';
      }, true);
    });
  });
}
