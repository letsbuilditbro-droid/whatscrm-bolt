import { authFetch } from './config.js';
import { showToast } from './app.js';

let templates = [];

export function initTemplates() {
  loadTemplates();
  setupCreateForm();
  setupSyncButton();
}

async function loadTemplates() {
  try {
    const response = await authFetch('/api/templates');
    if (response.ok) {
      templates = await response.json();
      renderTemplates();
    }
  } catch (error) {
    console.error('Error loading templates:', error);
    showToast('Failed to load templates', 'error');
  }
}

function renderTemplates() {
  const container = document.getElementById('templates-list');
  if (!container) return;

  if (templates.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No templates found</h3>
        <p>Sync with WhatsApp Business API or create a new template</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="grid grid-3">
      ${templates.map(template => `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${template.name}</h3>
            <button class="btn btn-error btn-sm" onclick="deleteTemplate('${template.name}')">
              Delete
            </button>
          </div>
          <div class="template-meta">
            <p><strong>Category:</strong> ${template.category || 'N/A'}</p>
            <p><strong>Language:</strong> ${template.language || 'N/A'}</p>
            <p><strong>Status:</strong> 
              <span class="chip ${template.status || 'approved'}">${template.status || 'approved'}</span>
            </p>
          </div>
          ${template.components ? `
            <div class="template-preview">
              <h4>Components:</h4>
              <pre class="template-components">${JSON.stringify(template.components, null, 2)}</pre>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function setupCreateForm() {
  const form = document.getElementById('create-template-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Parse components if provided
    if (data.components) {
      try {
        data.components = JSON.parse(data.components);
      } catch (error) {
        showToast('Invalid JSON in components field', 'error');
        return;
      }
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating...';
    submitBtn.disabled = true;

    try {
      const response = await authFetch('/api/templates', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      if (response.ok) {
        showToast('Template created successfully', 'success');
        form.reset();
        loadTemplates();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to create template', 'error');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      showToast('Failed to create template', 'error');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

function setupSyncButton() {
  const syncBtn = document.getElementById('sync-templates');
  if (!syncBtn) return;

  syncBtn.addEventListener('click', async () => {
    const originalText = syncBtn.textContent;
    syncBtn.textContent = 'Syncing...';
    syncBtn.disabled = true;

    try {
      const response = await authFetch('/api/templates/sync');
      if (response.ok) {
        const result = await response.json();
        showToast(`Synced ${result.synced || 0} templates`, 'success');
        loadTemplates();
      } else {
        showToast('Failed to sync templates', 'error');
      }
    } catch (error) {
      console.error('Error syncing templates:', error);
      showToast('Failed to sync templates', 'error');
    } finally {
      syncBtn.textContent = originalText;
      syncBtn.disabled = false;
    }
  });
}

// Global functions
window.deleteTemplate = async function(name) {
  if (!confirm('Are you sure you want to delete this template?')) return;

  try {
    const response = await authFetch(`/api/templates/${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      showToast('Template deleted successfully', 'success');
      loadTemplates();
    } else {
      showToast('Failed to delete template', 'error');
    }
  } catch (error) {
    console.error('Error deleting template:', error);
    showToast('Failed to delete template', 'error');
  }
}