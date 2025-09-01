export const CONFIG = {
  API_BASE: localStorage.getItem('apiBase') || 'http://localhost:3000',
  EVENTS_URL: (token) => `${localStorage.getItem('eventsUrl') || 'http://localhost:3000/events'}?token=${encodeURIComponent(token)}`
};

export const token = () => localStorage.getItem('token') || '';
export const setToken = (t) => localStorage.setItem('token', t);
export const clearToken = () => localStorage.removeItem('token');

export async function authFetch(path, opts = {}) {
  const headers = Object.assign({ 
    'Content-Type': 'application/json', 
    'Authorization': `Bearer ${token()}` 
  }, opts.headers || {});
  
  const res = await fetch(`${CONFIG.API_BASE}${path}`, Object.assign({}, opts, { headers }));
  
  if (res.status === 401) { 
    clearToken(); 
    history.pushState({}, '', '/login'); 
    window.dispatchEvent(new Event('popstate')); 
  }
  
  return res;
}

export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatPhone(phone) {
  if (!phone) return '';
  return phone.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');
}