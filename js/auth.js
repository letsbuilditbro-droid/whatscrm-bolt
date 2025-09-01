import { CONFIG, setToken } from './config.js';
import { navigate, showToast } from './app.js';

export function initLogin(isSignup = false) {
  const form = document.getElementById(isSignup ? 'signup-form' : 'login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Loading...';
    submitBtn.disabled = true;

    try {
      const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
      const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        setToken(result.token);
        showToast(isSignup ? 'Account created successfully!' : 'Welcome back!', 'success');
        navigate('/dashboard');
      } else {
        const error = await response.json();
        showToast(error.message || 'Authentication failed', 'error');
      }
    } catch (error) {
      console.error('Auth error:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}