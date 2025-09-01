import { CONFIG, token, clearToken } from './config.js';
import { initLogin } from './auth.js';
import { initInbox, onSseMessage } from './inbox.js';
import { initContacts } from './contacts.js';
import { initCampaigns, initCampaignDetail, initCampaignNew, onSseCampaign } from './campaigns.js';
import { initTemplates } from './templates.js';
import { initDashboard } from './dashboard.js';

const routes = {
  '/login': 'pages/login.html',
  '/signup': 'pages/signup.html',
  '/dashboard': 'pages/dashboard.html',
  '/inbox': 'pages/inbox.html',
  '/contacts': 'pages/contacts.html',
  '/campaigns': 'pages/campaigns.html',
  '/campaigns/new': 'pages/campaign-new.html',
  '/templates': 'pages/templates.html'
};

function isPublic(path) { 
  return path === '/login' || path === '/signup'; 
}

function updateNavAuth() {
  const authLinks = document.querySelectorAll('.auth-link');
  const logoutBtn = document.getElementById('logout-btn');
  
  if (token()) {
    authLinks.forEach(link => link.style.display = 'none');
    logoutBtn.style.display = 'block';
  } else {
    authLinks.forEach(link => link.style.display = 'block');
    logoutBtn.style.display = 'none';
  }
}

export async function navigate(path) {
  // Auth guard
  if (!isPublic(path) && !token()) {
    history.pushState({}, '', '/login');
    path = '/login';
  }

  // Handle dynamic campaign detail route
  if (path.startsWith('/campaigns/') && path !== '/campaigns/new') {
    const id = path.split('/')[2];
    const html = await (await fetch('pages/campaign-detail.html')).text();
    document.querySelector('#app').innerHTML = html;
    initCampaignDetail(id);
    updateNavAuth();
    return;
  }

  const page = routes[path] || routes['/login'];
  try {
    const html = await (await fetch(page)).text();
    document.querySelector('#app').innerHTML = html;

    // Initialize page-specific logic
    if (path === '/login') initLogin();
    else if (path === '/signup') initLogin(true);
    else if (path === '/dashboard') initDashboard();
    else if (path === '/inbox') initInbox();
    else if (path === '/contacts') initContacts();
    else if (path === '/campaigns') initCampaigns();
    else if (path === '/campaigns/new') initCampaignNew();
    else if (path === '/templates') initTemplates();

    updateNavAuth();
  } catch (error) {
    console.error('Navigation error:', error);
    showToast('Page not found', 'error');
  }
}

// Global navigation handler
window.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a) return;
  
  const url = new URL(a.href);
  if (url.origin === location.origin) {
    e.preventDefault();
    history.pushState({}, '', url.pathname);
    navigate(url.pathname);
  }
});

window.addEventListener('popstate', () => {
  const path = location.pathname || '/login';
  navigate(path);
});

// SSE Connection
let eventSource = null;

function sseConnect() {
  if (!token()) return;
  
  if (eventSource) {
    eventSource.close();
  }
  
  eventSource = new EventSource(CONFIG.EVENTS_URL(token()));
  
  eventSource.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data || '{}');
      if (data.type === 'message') {
        if (typeof onSseMessage === 'function') onSseMessage(data);
      }
      if (data.type === 'campaign') {
        if (typeof onSseCampaign === 'function') onSseCampaign(data);
      }
    } catch (error) {
      console.error('SSE parse error:', error);
    }
  };
  
  eventSource.onerror = () => {
    eventSource.close();
    setTimeout(sseConnect, 3000);
  };
}

// Toast notifications
export function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Logout handler
document.addEventListener('click', (e) => {
  if (e.target.id === 'logout-btn') {
    clearToken();
    if (eventSource) eventSource.close();
    navigate('/login');
    showToast('Logged out successfully', 'success');
  }
});

// Initialize app
window.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname || '/login';
  navigate(path).then(() => {
    if (token()) sseConnect();
  });
});