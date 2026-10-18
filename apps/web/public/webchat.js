/**
 * WebChat Widget
 * ویجت چت شناور برای وب‌سایت
 * 
 * @version 1.1.0
 * 
 * نحوه استفاده:
 * <script src="https://your-domain.com/webchat.js" 
 *         data-bot-id="YOUR_BOT_ID"
 *         data-api-url="https://api.your-domain.com"
 *         data-color="#6a8dff"
 *         data-title="پشتیبانی"
 *         async></script>
 */

(function () {
  'use strict';

  // ==================== CONFIG ====================

  const currentScript = document.currentScript;
  const CONFIG = {
    botId: currentScript?.getAttribute('data-bot-id') || '',
    apiUrl: currentScript?.getAttribute('data-api-url') || 'http://localhost:4000',
    color: currentScript?.getAttribute('data-color') || '#6a8dff',
    title: currentScript?.getAttribute('data-title') || 'پشتیبانی آنلاین',
    subtitle: currentScript?.getAttribute('data-subtitle') || 'معمولاً سریع پاسخ می‌دهیم',
    icon: currentScript?.getAttribute('data-icon') || '💬',
    position: currentScript?.getAttribute('data-position') || 'bottom-left',
    autoOpen: currentScript?.getAttribute('data-auto-open') === 'true',
    sessionId: null,
  };

  // ==================== STATE ====================

  let isOpen = false;
  let messages = [];
  let isSending = false;
  let unreadCount = 0;

  // ==================== HELPERS ====================

  function getSessionId() {
    if (CONFIG.sessionId) return CONFIG.sessionId;

    const stored = localStorage.getItem('webchat_session_id');
    if (stored) {
      CONFIG.sessionId = stored;
      return stored;
    }

    const newId = `web_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('webchat_session_id', newId);
    CONFIG.sessionId = newId;
    return newId;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatTime(date) {
    const d = new Date(date);
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }

  // ==================== STYLES ====================

  const styles = `
    .webchat-widget {
      position: fixed;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Tahoma', sans-serif;
      direction: rtl;
    }

    .webchat-widget.position-bottom-left { bottom: 24px; left: 24px; }
    .webchat-widget.position-bottom-right { bottom: 24px; right: 24px; }

    .webchat-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${CONFIG.color}, ${CONFIG.color}dd);
      border: none;
      cursor: pointer;
      box-shadow: 0 8px 32px ${CONFIG.color}55, 0 2px 8px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s;
      position: relative;
    }

    .webchat-button:hover {
      transform: scale(1.1);
      box-shadow: 0 12px 40px ${CONFIG.color}66, 0 4px 12px rgba(0,0,0,0.2);
    }

    .webchat-button:active { transform: scale(0.95); }
    .webchat-button.open { transform: rotate(180deg); }

    .webchat-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 10px;
      background: #ef4444;
      color: white;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .webchat-window {
      position: absolute;
      bottom: 80px;
      width: 380px;
      max-width: calc(100vw - 48px);
      height: 560px;
      max-height: calc(100vh - 120px);
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px) scale(0.95);
      transition: opacity 0.3s, visibility 0.3s, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .position-bottom-left .webchat-window { left: 0; }
    .position-bottom-right .webchat-window { right: 0; }

    .webchat-window.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }

    .webchat-header {
      background: linear-gradient(135deg, ${CONFIG.color}, ${CONFIG.color}dd);
      color: white;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .webchat-header-avatar {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      backdrop-filter: blur(10px);
      flex-shrink: 0;
    }

    .webchat-header-info { flex: 1; min-width: 0; }

    .webchat-header-title {
      font-weight: 700;
      font-size: 15px;
      margin-bottom: 2px;
    }

    .webchat-header-subtitle {
      font-size: 11px;
      opacity: 0.85;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .webchat-header-subtitle::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4ade80;
      animation: pulse 2s infinite;
    }

    .webchat-header-close {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255,255,255,0.15);
      border: none;
      color: white;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
      flex-shrink: 0;
    }

    .webchat-header-close:hover { background: rgba(255,255,255,0.3); }

    .webchat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #f8f9fb;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .webchat-messages::-webkit-scrollbar { width: 6px; }
    .webchat-messages::-webkit-scrollbar-track { background: transparent; }
    .webchat-messages::-webkit-scrollbar-thumb {
      background: rgba(0,0,0,0.15);
      border-radius: 3px;
    }

    .webchat-welcome {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 20px;
      color: #6b7280;
      margin: auto 0;
    }

    .webchat-welcome-icon {
      width: 64px;
      height: 64px;
      border-radius: 20px;
      background: linear-gradient(135deg, ${CONFIG.color}22, ${CONFIG.color}11);
      border: 2px solid ${CONFIG.color}33;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin-bottom: 16px;
    }

    .webchat-welcome-title {
      font-weight: 700;
      color: #111827;
      margin-bottom: 6px;
      font-size: 15px;
    }

    .webchat-welcome-text { font-size: 13px; line-height: 1.6; }

    .webchat-message {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .webchat-message.user { flex-direction: row-reverse; }

    .webchat-message-avatar {
      width: 28px;
      height: 28px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }

    .webchat-message.user .webchat-message-avatar { background: #e5e7eb; }

    .webchat-message.bot .webchat-message-avatar {
      background: linear-gradient(135deg, ${CONFIG.color}, ${CONFIG.color}dd);
      color: white;
    }

    .webchat-message-bubble {
      max-width: 75%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.6;
      word-wrap: break-word;
      white-space: pre-wrap;
    }

    .webchat-message.user .webchat-message-bubble {
      background: ${CONFIG.color};
      color: white;
      border-bottom-right-radius: 4px;
    }

    .webchat-message.bot .webchat-message-bubble {
      background: white;
      color: #111827;
      border: 1px solid #e5e7eb;
      border-bottom-left-radius: 4px;
    }

    .webchat-typing {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      width: fit-content;
    }

    .webchat-typing span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #9ca3af;
      animation: typing 1.4s infinite;
    }

    .webchat-typing span:nth-child(2) { animation-delay: 0.2s; }
    .webchat-typing span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    .webchat-input-area {
      padding: 16px;
      background: white;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 10px;
      align-items: flex-end;
    }

    .webchat-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 24px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
      resize: none;
      max-height: 100px;
      direction: rtl;
    }

    .webchat-input:focus { border-color: ${CONFIG.color}; }

    .webchat-send {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: ${CONFIG.color};
      border: none;
      color: white;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .webchat-send:hover:not(:disabled) {
      background: ${CONFIG.color}dd;
      transform: scale(1.05);
    }

    .webchat-send:disabled { opacity: 0.5; cursor: not-allowed; }

    .webchat-error {
      padding: 10px 14px;
      background: #fee2e2;
      color: #991b1b;
      border-radius: 10px;
      font-size: 12px;
      margin-bottom: 8px;
    }

    @media (max-width: 480px) {
      .webchat-widget.position-bottom-left,
      .webchat-widget.position-bottom-right { bottom: 16px; }

      .webchat-widget.position-bottom-left { left: 16px; }
      .webchat-widget.position-bottom-right { right: 16px; }

      .webchat-window {
        width: calc(100vw - 32px);
        height: calc(100vh - 100px);
        bottom: 76px;
        left: 0 !important;
        right: 0 !important;
      }
    }
  `;

  // ==================== CREATE WIDGET ====================

  function createWidget() {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    const widget = document.createElement('div');
    widget.className = `webchat-widget position-${CONFIG.position}`;
    widget.innerHTML = `
      <div class="webchat-window" id="webchat-window">
        <div class="webchat-header">
          <div class="webchat-header-avatar">${CONFIG.icon}</div>
          <div class="webchat-header-info">
            <div class="webchat-header-title">${escapeHtml(CONFIG.title)}</div>
            <div class="webchat-header-subtitle">${escapeHtml(CONFIG.subtitle)}</div>
          </div>
          <button class="webchat-header-close" id="webchat-close" aria-label="بستن">✕</button>
        </div>

        <div class="webchat-messages" id="webchat-messages">
          <div class="webchat-welcome">
            <div class="webchat-welcome-icon">${CONFIG.icon}</div>
            <div class="webchat-welcome-title">سلام! 👋</div>
            <div class="webchat-welcome-text">
              چطور می‌توانم کمکتان کنم؟<br>
              سوال خود را بنویسید...
            </div>
          </div>
        </div>

        <div class="webchat-input-area">
          <textarea
            class="webchat-input"
            id="webchat-input"
            placeholder="پیام خود را بنویسید..."
            rows="1"
          ></textarea>
          <button class="webchat-send" id="webchat-send" aria-label="ارسال" disabled>
            ➤
          </button>
        </div>
      </div>

      <button class="webchat-button" id="webchat-toggle" aria-label="چت">
        ${CONFIG.icon}
      </button>
    `;

    document.body.appendChild(widget);
    attachEvents();
  }

  // ==================== EVENTS ====================

  function attachEvents() {
    const toggle = document.getElementById('webchat-toggle');
    const close = document.getElementById('webchat-close');
    const input = document.getElementById('webchat-input');
    const send = document.getElementById('webchat-send');

    if (!toggle || !close || !input || !send) return;

    toggle.addEventListener('click', () => {
      isOpen = !isOpen;
      updateUI();
      if (isOpen) {
        input.focus();
        unreadCount = 0;
      }
    });

    close.addEventListener('click', () => {
      isOpen = false;
      updateUI();
    });

    input.addEventListener('input', () => {
      send.disabled = !input.value.trim() || isSending;
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    send.addEventListener('click', sendMessage);
  }

  // ==================== UI ====================

  function updateUI() {
    const window = document.getElementById('webchat-window');
    const toggle = document.getElementById('webchat-toggle');

    if (!window || !toggle) return;

    if (isOpen) {
      window.classList.add('open');
      toggle.classList.add('open');
      toggle.innerHTML = '✕';
    } else {
      window.classList.remove('open');
      toggle.classList.remove('open');
      toggle.innerHTML = CONFIG.icon;

      if (unreadCount > 0) {
        toggle.innerHTML += `<span class="webchat-badge">${unreadCount}</span>`;
      }
    }
  }

  function renderMessages() {
    const container = document.getElementById('webchat-messages');
    if (!container) return;

    if (messages.length === 0) {
      container.innerHTML = `
        <div class="webchat-welcome">
          <div class="webchat-welcome-icon">${CONFIG.icon}</div>
          <div class="webchat-welcome-title">سلام! 👋</div>
          <div class="webchat-welcome-text">
            چطور می‌توانم کمکتان کنم؟<br>
            سوال خود را بنویسید...
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = messages
      .map(
        (msg) => `
      <div class="webchat-message ${msg.role}">
        <div class="webchat-message-avatar">
          ${msg.role === 'user' ? '👤' : CONFIG.icon}
        </div>
        <div class="webchat-message-bubble">${escapeHtml(msg.content)}</div>
      </div>
    `
      )
      .join('');

    if (isSending) {
      container.innerHTML += `
        <div class="webchat-message bot">
          <div class="webchat-message-avatar">${CONFIG.icon}</div>
          <div class="webchat-typing">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      `;
    }

    container.scrollTop = container.scrollHeight;
  }

  function showError(text) {
    const container = document.getElementById('webchat-messages');
    if (!container) return;

    const existing = container.querySelector('.webchat-error');
    if (existing) existing.remove();

    const errorEl = document.createElement('div');
    errorEl.className = 'webchat-error';
    errorEl.textContent = `⚠️ ${text}`;
    container.appendChild(errorEl);

    setTimeout(() => errorEl.remove(), 5000);
  }

  // ==================== HUMAN HANDOFF POLLING ====================

  let handoffNotified = false;
  let pollTimer = null;
  let lastPoll = new Date().toISOString();

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(async () => {
      try {
        const r = await fetch(
          `${CONFIG.apiUrl}/api/inbox/poll/${encodeURIComponent(getSessionId())}?after=${encodeURIComponent(lastPoll)}`
        );
        if (!r.ok) return;
        const d = await r.json();
        for (const m of d.items || []) {
          lastPoll = m.createdAt;
          if (m.role === 'HUMAN') {
            messages.push({ role: 'bot', content: m.content, timestamp: m.createdAt });
            if (!isOpen) unreadCount++;
          }
        }
        if ((d.items || []).length) { renderMessages(); updateUI(); }
        if (d.status === 'BOT' || d.status === 'CLOSED') {
          clearInterval(pollTimer);
          pollTimer = null;
          handoffNotified = false;
        }
      } catch (_) {}
    }, 4000);
  }

  // ==================== SEND MESSAGE ====================

  async function sendMessage() {
    const input = document.getElementById('webchat-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text || isSending) return;

    messages.push({
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    });

    input.value = '';
    input.style.height = 'auto';

    const send = document.getElementById('webchat-send');
    if (send) send.disabled = true;

    isSending = true;
    renderMessages();

    try {
      // ⭐ تغییر مهم: endpoint جدید عمومی بدون auth
      const response = await fetch(`${CONFIG.apiUrl}/api/ai/webchat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botId: CONFIG.botId,
          sessionId: getSessionId(),
          message: text,
        }),
      });

      if (!response.ok) {
        let errMsg = `خطای سرور (${response.status})`;
        try {
          const errData = await response.json();
          if (errData.error) errMsg = errData.error;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();

      if (data.handoff) {
        // گفتگو دست اپراتور انسانی است؛ پیام‌های او با polling دریافت می‌شود
        if (data.message) {
          messages.push({ role: 'bot', content: data.message, timestamp: new Date().toISOString() });
        } else if (!handoffNotified) {
          messages.push({ role: 'bot', content: 'پیام شما برای همکار ما ارسال شد؛ به‌زودی پاسخ می‌دهیم. 🙏', timestamp: new Date().toISOString() });
        }
        handoffNotified = true;
        startPolling();
      } else {
        messages.push({
          role: 'bot',
          content: data.message || data.response || data.content || 'پاسخی دریافت نشد',
          timestamp: new Date().toISOString(),
        });
      }

      if (!isOpen) {
        unreadCount++;
      }
    } catch (error) {
      showError(error.message || 'خطا در ارسال پیام');
      messages.pop();
      input.value = text;
    } finally {
      isSending = false;
      renderMessages();
      updateUI();

      if (send) {
        send.disabled = !input.value.trim();
      }
    }
  }

  // ==================== INITIALIZE ====================

  function init() {
    if (!CONFIG.botId) {
      console.error('[WebChat] data-bot-id لازم است');
      return;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createWidget);
    } else {
      createWidget();
    }

    if (CONFIG.autoOpen) {
      setTimeout(() => {
        isOpen = true;
        updateUI();
      }, 2000);
    }

    window.WebChat = {
      open: () => { isOpen = true; updateUI(); },
      close: () => { isOpen = false; updateUI(); },
      toggle: () => { isOpen = !isOpen; updateUI(); },
      sendMessage: (text) => {
        const input = document.getElementById('webchat-input');
        if (input) {
          input.value = text;
          sendMessage();
        }
      },
      clear: () => { messages = []; renderMessages(); },
      config: CONFIG,
    };
  }

  init();
})();