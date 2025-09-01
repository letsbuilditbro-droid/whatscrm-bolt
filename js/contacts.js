import { authFetch } from './config.js';
import { showToast } from './app.js';

let contacts = [];
let currentPage = 1;
const pageSize = 20;

export function initContacts() {
  loadContacts();
  setupSearch();
  setupCreateForm();
  setupBulkImport();
}

async function loadContacts(search = '', page = 1) {
  try {
    const params = new URLSearchParams({ q: search, page, limit: pageSize });
    const response = await authFetch(`/api/contacts?${params}`);
    
    if (response.ok) {
      const data = await response.json();
      contacts = Array.isArray(data) ? data : data.contacts || [];
      currentPage = page;
      renderContacts();
      renderPagination(data.total || contacts.length);
    }
  } catch (error) {
    console.error('Error loading contacts:', error);
    showToast('Failed to load contacts', 'error');
  }
}

function renderContacts() {
  const container = document.getElementById('contacts-list');
  if (!container) return;

  if (contacts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No contacts found</h3>
        <p>Add some contacts to get started</p>
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
            <th>Display Name</th>
            <th>Phone</th>
            <th>Groups</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${contacts.map(contact => `
            <tr>
              <td>${contact.waId}</td>
              <td>${contact.displayName || '-'}</td>
              <td>${contact.phone || '-'}</td>
              <td>${(contact.groups || []).join(', ') || '-'}</td>
              <td>
                <button class="btn btn-error btn-sm" onclick="deleteContact('${contact.waId}')">
                  Delete
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderPagination(total) {
  const container = document.getElementById('pagination');
  if (!container) return;

  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(`
      <button class="page-btn ${i === currentPage ? 'active' : ''}" 
              onclick="changePage(${i})">${i}</button>
    `);
  }

  container.innerHTML = `<div class="pagination">${pages.join('')}</div>`;
}

function setupSearch() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      loadContacts(e.target.value, 1);
    }, 300);
  });
}

function setupCreateForm() {
  const form = document.getElementById('create-contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Parse groups
    if (data.groups) {
      data.groups = data.groups.split(',').map(g => g.trim()).filter(Boolean);
    }

    try {
      const response = await authFetch('/api/contacts', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      if (response.ok) {
        showToast('Contact created successfully', 'success');
        form.reset();
        loadContacts();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to create contact', 'error');
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      showToast('Failed to create contact', 'error');
    }
  });
}

function setupBulkImport() {
  const fileInput = document.getElementById('csv-file');
  const uploadArea = document.getElementById('upload-area');
  
  if (!fileInput || !uploadArea) return;

  uploadArea.addEventListener('click', () => fileInput.click());
  
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      handleFileUpload(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  });
}

async function handleFileUpload(file) {
  if (!file.name.endsWith('.csv')) {
    showToast('Please select a CSV file', 'error');
    return;
  }

  try {
    const text = await file.text();
    const rows = text.split('\n').filter(row => row.trim());
    const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
    
    const contacts = rows.slice(1).map(row => {
      const values = row.split(',').map(v => v.trim());
      const contact = {};
      
      headers.forEach((header, index) => {
        if (values[index]) {
          if (header === 'groups') {
            contact[header] = values[index].split(';').map(g => g.trim()).filter(Boolean);
          } else {
            contact[header] = values[index];
          }
        }
      });
      
      return contact;
    }).filter(contact => contact.waId || contact.waid);

    if (contacts.length === 0) {
      showToast('No valid contacts found in CSV', 'error');
      return;
    }

    const response = await authFetch('/api/contacts/bulk', {
      method: 'POST',
      body: JSON.stringify({ contacts })
    });

    if (response.ok) {
      showToast(`${contacts.length} contacts imported successfully`, 'success');
      loadContacts();
    } else {
      const error = await response.json();
      showToast(error.message || 'Failed to import contacts', 'error');
    }
  } catch (error) {
    console.error('Error importing contacts:', error);
    showToast('Failed to parse CSV file', 'error');
  }
}

// Global functions
window.deleteContact = async function(waId) {
  if (!confirm('Are you sure you want to delete this contact?')) return;

  try {
    const response = await authFetch(`/api/contacts/${waId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      showToast('Contact deleted successfully', 'success');
      loadContacts();
    } else {
      showToast('Failed to delete contact', 'error');
    }
  } catch (error) {
    console.error('Error deleting contact:', error);
    showToast('Failed to delete contact', 'error');
  }
}

window.changePage = function(page) {
  const searchInput = document.getElementById('search-input');
  const search = searchInput ? searchInput.value : '';
  loadContacts(search, page);
}