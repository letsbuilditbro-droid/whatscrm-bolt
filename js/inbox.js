import { authFetch, formatDate } from './config.js';
import { showToast } from './app.js';

let currentContact = null;
let contacts = [];

export function initInbox() {
  loadContacts();
  setupChatForm();
}

async function loadContacts() {
  try {
    const response = await authFetch('/api/contacts');
    if (response.ok) {
      contacts = await response.json();
      renderContacts();
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
        <h3>No contacts</h3>
        <p>Start by adding some contacts</p>
      </div>
    `;
    return;
  }

  container.innerHTML = contacts.map(contact => `
    <div class="contact-item" data-wa-id="${contact.waId}" onclick="selectContact('${contact.waId}')">
      <div class="contact-name">${contact.displayName || contact.waId}</div>
      <div class="contact-phone">${contact.phone || ''}</div>
    </div>
  `).join('');
}

window.selectContact = async function(waId) {
  currentContact = contacts.find(c => c.waId === waId);
  if (!currentContact) return;

  // Update UI
  document.querySelectorAll('.contact-item').forEach(item => item.classList.remove('active'));
  document.querySelector(`[data-wa-id="${waId}"]`).classList.add('active');

  // Load messages
  await loadMessages(waId);
}

async function loadMessages(waId) {
  try {
    const response = await authFetch(`/api/messages/${waId}`);
    if (response.ok) {
      const messages = await response.json();
      renderMessages(messages);
      updateChatHeader();
    }
  } catch (error) {
    console.error('Error loading messages:', error);
    showToast('Failed to load messages', 'error');
  }
}

function renderMessages(messages) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  if (messages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No messages yet</h3>
        <p>Start a conversation</p>
      </div>
    `;
    return;
  }

  container.innerHTML = messages.map(msg => `
    <div class="bubble ${msg.direction || 'out'}">
      <div>${msg.text || msg.message}</div>
      <div class="bubble-time">${formatDate(msg.timestamp || msg.createdAt)}</div>
    </div>
  `).join('');

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function updateChatHeader() {
  const header = document.getElementById('chat-header');
  if (!header || !currentContact) return;

  header.innerHTML = `
    <div>
      <div class="contact-name">${currentContact.displayName || currentContact.waId}</div>
      <div class="contact-phone">${currentContact.phone || ''}</div>
    </div>
  `;
}

function setupChatForm() {
  const form = document.getElementById('chat-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentContact) {
      showToast('Please select a contact first', 'warning');
      return;
    }

    const input = form.querySelector('input[name="message"]');
    const message = input.value.trim();
    
    if (!message) return;

    // Optimistic UI update
    const messagesContainer = document.getElementById('chat-messages');
    const bubble = document.createElement('div');
    bubble.className = 'bubble out';
    bubble.innerHTML = `
      <div>${message}</div>
      <div class="bubble-time">${formatDate(new Date())}</div>
    `;
    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Clear input
    input.value = '';

    try {
      const response = await authFetch(`/api/messages/${currentContact.waId}/send`, {
        method: 'POST',
        body: JSON.stringify({ text: message })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
      // Remove optimistic bubble on error
      bubble.remove();
    }
  });
}

// SSE Message Handler
export function onSseMessage(data) {
  if (!currentContact || data.waId !== currentContact.waId) return;

  const messagesContainer = document.getElementById('chat-messages');
  if (!messagesContainer) return;

  const bubble = document.createElement('div');
  bubble.className = 'bubble in';
  bubble.innerHTML = `
    <div>${data.message.text || data.message.message}</div>
    <div class="bubble-time">${formatDate(data.message.timestamp || new Date())}</div>
  `;
  
  messagesContainer.appendChild(bubble);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}