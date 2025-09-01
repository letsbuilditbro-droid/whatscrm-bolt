import { authFetch } from './config.js';
import { showToast } from './app.js';

export function initDashboard() {
  loadDashboardData();
}

async function loadDashboardData() {
  try {
    const response = await authFetch('/api/campaigns');
    if (response.ok) {
      const campaigns = await response.json();
      const campaignList = Array.isArray(campaigns) ? campaigns : campaigns.campaigns || [];
      renderStats(campaignList);
      renderRecentCampaigns(campaignList.slice(0, 5));
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showToast('Failed to load dashboard data', 'error');
  }
}

function renderStats(campaigns) {
  const stats = {
    total: campaigns.length,
    running: campaigns.filter(c => c.status === 'running').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    failed: campaigns.filter(c => c.status === 'failed').length
  };

  const container = document.getElementById('dashboard-stats');
  if (!container) return;

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-number">${stats.total}</div>
      <div class="stat-label">Total Campaigns</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${stats.running}</div>
      <div class="stat-label">Running</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${stats.completed}</div>
      <div class="stat-label">Completed</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${stats.failed}</div>
      <div class="stat-label">Failed</div>
    </div>
  `;
}

function renderRecentCampaigns(campaigns) {
  const container = document.getElementById('recent-campaigns');
  if (!container) return;

  if (campaigns.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No campaigns yet</h3>
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
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${campaigns.map(campaign => `
            <tr>
              <td>
                <a href="/campaigns/${campaign.id}" data-link class="text-primary font-medium">
                  ${campaign.name}
                </a>
              </td>
              <td>
                <span class="chip ${campaign.status}">${campaign.status}</span>
              </td>
              <td>${formatDate(campaign.createdAt)}</td>
              <td>
                <a href="/campaigns/${campaign.id}" data-link class="btn btn-secondary btn-sm">
                  View
                </a>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}