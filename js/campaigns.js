import { authFetch, formatDate } from './config.js';
import { showToast } from './app.js';

let campaigns = [];
let currentFilter = 'all';
let currentCampaign = null;
let currentTab = 'overview';

export function initCampaigns() {
  loadCampaigns();
  setupFilters();
}

export function initCampaignNew() {
  setupCreateForm();
  loadTemplates();
}

export function initCampaignDetail(id) {
  currentCampaign = { id };
  loadCampaignDetail(id);
  setupTabs();
  setupActions();
}

// Campaign List
async function loadCampaigns(status = '') {
  try {
    const params = status ? `?status=${status}` : '';
    const response = await authFetch(`/api/campaigns${params}`);
    if (response.ok) {
      const data = await response.json();
      campaigns = Array.isArray(data) ? data : data.campaigns || [];
      renderCampaigns();
    }
  } catch (error) {
    console.error('Error loading campaigns:', error);
    showToast('Failed to load campaigns', 'error');
  }
}

function renderCampaigns() {
  const container = document.getElementById('campaigns-list');
  if (!container) return;

  if (campaigns.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No campaigns found</h3>
        <p>Create your first campaign to get started</p>
        <a href="/campaigns/new" data-link class="btn btn-primary">Create Campaign</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Template</th>
            <th>Status</th>
            <th>Created</th>
            <th>Progress</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${campaigns.map(campaign => `
            <tr>
              <td>
                <a href="/campaigns/${campaign.id}" data-link class="font-medium text-primary">
                  ${campaign.name}
                </a>
              </td>
              <td>${campaign.templateName || '-'}</td>
              <td>
                <span class="chip ${campaign.status}">${campaign.status}</span>
              </td>
              <td>${formatDate(campaign.createdAt)}</td>
              <td>${campaign.sent || 0}/${campaign.total || 0}</td>
              <td>
                <div class="flex gap-1">
                  ${campaign.status === 'draft' || campaign.status === 'scheduled' ? 
                    `<button class="btn btn-success btn-sm" onclick="campaignAction('${campaign.id}', 'start')">Start</button>` : ''}
                  ${campaign.status === 'running' ? 
                    `<button class="btn btn-warning btn-sm" onclick="campaignAction('${campaign.id}', 'pause')">Pause</button>` : ''}
                  ${campaign.status === 'running' || campaign.status === 'paused' ? 
                    `<button class="btn btn-secondary btn-sm" onclick="campaignAction('${campaign.id}', 'complete')">Complete</button>` : ''}
                  <a href="/campaigns/${campaign.id}" data-link class="btn btn-ghost btn-sm">View</a>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function setupFilters() {
  const filters = document.querySelectorAll('.filter-btn');
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(f => f.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.status || 'all';
      loadCampaigns(currentFilter === 'all' ? '' : currentFilter);
    });
  });
}

// Campaign Detail
async function loadCampaignDetail(id) {
  try {
    const response = await authFetch(`/api/campaigns/${id}`);
    if (response.ok) {
      currentCampaign = await response.json();
      renderCampaignHeader();
      loadCampaignData();
    }
  } catch (error) {
    console.error('Error loading campaign:', error);
    showToast('Failed to load campaign', 'error');
  }
}

function renderCampaignHeader() {
  const header = document.getElementById('campaign-header');
  if (!header || !currentCampaign) return;

  header.innerHTML = `
    <div>
      <h1 class="text-2xl font-bold mb-1">${currentCampaign.name}</h1>
      <div class="flex items-center gap-2">
        <span class="chip ${currentCampaign.status}">${currentCampaign.status}</span>
        <span class="text-neutral-500">Created ${formatDate(currentCampaign.createdAt)}</span>
      </div>
    </div>
    <div class="flex gap-2">
      ${currentCampaign.status === 'draft' || currentCampaign.status === 'scheduled' ? 
        `<button class="btn btn-success" onclick="campaignAction('${currentCampaign.id}', 'start')">Start Campaign</button>` : ''}
      ${currentCampaign.status === 'running' ? 
        `<button class="btn btn-warning" onclick="campaignAction('${currentCampaign.id}', 'pause')">Pause Campaign</button>` : ''}
      ${currentCampaign.status === 'running' || currentCampaign.status === 'paused' ? 
        `<button class="btn btn-secondary" onclick="campaignAction('${currentCampaign.id}', 'complete')">Complete Campaign</button>` : ''}
      <button class="btn btn-ghost" onclick="refreshCampaign()">Refresh</button>
    </div>
  `;
}

function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      const targetContent = document.getElementById(`${tab.dataset.tab}-content`);
      if (targetContent) {
        targetContent.classList.add('active');
        currentTab = tab.dataset.tab;
        loadCampaignData();
      }
    });
  });
}

async function loadCampaignData() {
  if (!currentCampaign) return;

  if (currentTab === 'overview') {
    await loadMetrics();
  } else if (currentTab === 'messages') {
    await loadMessages();
  } else if (currentTab === 'cost') {
    await loadCost();
  }
}

async function loadMetrics() {
  try {
    const response = await authFetch(`/api/campaigns/${currentCampaign.id}/metrics`);
    if (response.ok) {
      const metrics = await response.json();
      renderMetrics(metrics);
    }
  } catch (error) {
    console.error('Error loading metrics:', error);
  }
}

function renderMetrics(metrics) {
  const container = document.getElementById('overview-content');
  if (!container) return;

  container.innerHTML = `
    <div class="grid grid-4 mb-3">
      <div class="stat-card">
        <div class="stat-number">${metrics.sent || 0}</div>
        <div class="stat-label">Sent</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${metrics.delivered || 0}</div>
        <div class="stat-label">Delivered</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${metrics.read || 0}</div>
        <div class="stat-label">Read</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${metrics.failed || 0}</div>
        <div class="stat-label">Failed</div>
      </div>
    </div>
    
    <div class="card">
      <h3 class="card-title">Campaign Details</h3>
      <div class="grid grid-2">
        <div>
          <p><strong>Template:</strong> ${currentCampaign.templateName || 'N/A'}</p>
          <p><strong>Target Audience:</strong> ${getAudienceDescription()}</p>
          <p><strong>Scheduled:</strong> ${currentCampaign.scheduleAt ? formatDate(currentCampaign.scheduleAt) : 'Immediate'}</p>
        </div>
        <div>
          <p><strong>Started:</strong> ${currentCampaign.startedAt ? formatDate(currentCampaign.startedAt) : 'Not started'}</p>
          <p><strong>Completed:</strong> ${currentCampaign.completedAt ? formatDate(currentCampaign.completedAt) : 'Not completed'}</p>
          <p><strong>Total Recipients:</strong> ${metrics.total || 0}</p>
        </div>
      </div>
    </div>
  `;
}

async function loadMessages() {
  try {
    const response = await authFetch(`/api/campaigns/${currentCampaign.id}/messages`);
    if (response.ok) {
      const data = await response.json();
      const messages = Array.isArray(data) ? data : data.messages || [];
      renderMessages(messages);
    }
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

function renderMessages(messages) {
  const container = document.getElementById('messages-content');
  if (!container) return;

  if (messages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No messages sent yet</h3>
        <p>Messages will appear here once the campaign starts</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>WhatsApp ID</th>
            <th>Message ID</th>
            <th>Status</th>
            <th>Sent At</th>
            <th>Last Updated</th>
          </tr>
        </thead>
        <tbody>
          ${messages.map(msg => `
            <tr>
              <td>${msg.waId}</td>
              <td>${msg.messageId || '-'}</td>
              <td>
                <span class="chip ${msg.status}">${msg.status}</span>
              </td>
              <td>${msg.sentAt ? formatDate(msg.sentAt) : '-'}</td>
              <td>${msg.lastStatusAt ? formatDate(msg.lastStatusAt) : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function loadCost() {
  try {
    const response = await authFetch(`/api/campaigns/${currentCampaign.id}/cost`);
    if (response.ok) {
      const costData = await response.json();
      renderCost(costData);
    }
  } catch (error) {
    console.error('Error loading cost:', error);
  }
}

function renderCost(costData) {
  const container = document.getElementById('cost-content');
  if (!container) return;

  const items = costData.items || [];
  const total = costData.total || 0;

  container.innerHTML = `
    <div class="card">
      <h3 class="card-title">Cost Breakdown</h3>
      <p class="mb-3"><strong>Pricing Model:</strong> ${costData.model || 'Standard'}</p>
      
      ${items.length > 0 ? `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
                <th>Unit Cost</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.category}</td>
                  <td>${item.count}</td>
                  <td>$${item.unitCost?.toFixed(4) || '0.0000'}</td>
                  <td>$${item.subtotal?.toFixed(4) || '0.0000'}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight: bold; border-top: 2px solid var(--neutral-300);">
                <td colspan="3">Total</td>
                <td>$${total.toFixed(4)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ` : `
        <div class="empty-state">
          <h3>No cost data available</h3>
          <p>Cost information will be available after the campaign starts</p>
        </div>
      `}
    </div>
  `;
}

// Campaign Creation
function setupCreateForm() {
  const form = document.getElementById('create-campaign-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Build audience object
    const audience = {};
    if (data.targetGroup) audience.group = data.targetGroup;
    if (data.targetQuery) audience.query = data.targetQuery;
    
    const campaignData = {
      name: data.name,
      templateName: data.templateName,
      audience,
      scheduleAt: data.scheduleAt || null
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating...';
    submitBtn.disabled = true;

    try {
      const response = await authFetch('/api/campaigns/create', {
        method: 'POST',
        body: JSON.stringify(campaignData)
      });

      if (response.ok) {
        const result = await response.json();
        showToast('Campaign created successfully', 'success');
        // Navigate to campaign detail
        history.pushState({}, '', `/campaigns/${result.id}`);
        window.dispatchEvent(new Event('popstate'));
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to create campaign', 'error');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      showToast('Failed to create campaign', 'error');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

async function loadTemplates() {
  try {
    const response = await authFetch('/api/templates');
    if (response.ok) {
      const templates = await response.json();
      renderTemplateOptions(templates);
    }
  } catch (error) {
    console.error('Error loading templates:', error);
  }
}

function renderTemplateOptions(templates) {
  const select = document.getElementById('template-select');
  if (!select) return;

  select.innerHTML = `
    <option value="">Select a template</option>
    ${templates.map(template => `
      <option value="${template.name}">${template.name}</option>
    `).join('')}
  `;
}

function getAudienceDescription() {
  if (!currentCampaign || !currentCampaign.audience) return 'All contacts';
  
  const audience = currentCampaign.audience;
  if (audience.group) return `Group: ${audience.group}`;
  if (audience.query) return `Query: ${audience.query}`;
  return 'All contacts';
}

function setupActions() {
  // Action buttons are handled via global onclick functions
}

// Global functions
window.campaignAction = async function(id, action) {
  const actionLabels = {
    start: 'Starting',
    pause: 'Pausing',
    complete: 'Completing'
  };

  try {
    showToast(`${actionLabels[action]} campaign...`, 'info');
    
    const response = await authFetch(`/api/campaigns/${id}/${action}`, {
      method: 'POST'
    });

    if (response.ok) {
      const result = await response.json();
      showToast(`Campaign ${action}ed successfully`, 'success');
      
      // Update campaign in list if we're on campaigns page
      const campaignIndex = campaigns.findIndex(c => c.id === id);
      if (campaignIndex !== -1) {
        campaigns[campaignIndex].status = result.status;
        renderCampaigns();
      }
      
      // Update current campaign if we're on detail page
      if (currentCampaign && currentCampaign.id === id) {
        currentCampaign.status = result.status;
        renderCampaignHeader();
      }
    } else {
      const error = await response.json();
      showToast(error.message || `Failed to ${action} campaign`, 'error');
    }
  } catch (error) {
    console.error(`Error ${action}ing campaign:`, error);
    showToast(`Failed to ${action} campaign`, 'error');
  }
};

window.refreshCampaign = function() {
  if (currentCampaign) {
    loadCampaignDetail(currentCampaign.id);
  }
};

// SSE Campaign Handler
export function onSseCampaign(data) {
  // Update campaign status in real-time
  if (data.campaignId && currentCampaign && currentCampaign.id === data.campaignId) {
    currentCampaign.status = data.status;
    renderCampaignHeader();
    loadCampaignData(); // Refresh current tab data
  }
  
  // Update campaigns list if on campaigns page
  const campaignIndex = campaigns.findIndex(c => c.id === data.campaignId);
  if (campaignIndex !== -1) {
    campaigns[campaignIndex].status = data.status;
    if (document.getElementById('campaigns-list')) {
      renderCampaigns();
    }
  }
}