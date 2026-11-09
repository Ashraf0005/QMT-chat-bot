/**
 * Aura — Groq Personal Assistant with Tavily Web Search Frontend Engine
 */

(function () {
  'use strict';

  // --- STATE ---
  let appConfig = {
    hasServerApiKey: false,
    hasServerTavilyKey: false,
    defaultModel: 'llama-3.3-70b-versatile',
    models: [],
    personas: {},
    defaultSystemPrompt: ''
  };

  let state = {
    apiKey: localStorage.getItem('groq_custom_api_key') || '',
    tavilyApiKey: localStorage.getItem('tavily_custom_api_key') || '',
    webSearchEnabled: localStorage.getItem('web_search_enabled') === 'true',
    activeModel: localStorage.getItem('groq_active_model') || 'llama-3.3-70b-versatile',
    activePersona: localStorage.getItem('groq_active_persona') || 'executive',
    customSystemPrompt: localStorage.getItem('groq_custom_system_prompt') || '',
    temperature: parseFloat(localStorage.getItem('groq_temperature') || '0.7'),
    maxTokens: parseInt(localStorage.getItem('groq_max_tokens') || '4096', 10),
    conversations: JSON.parse(localStorage.getItem('groq_conversations') || '[]'),
    activeChatId: null,
    isStreaming: false,
    abortController: null,
    theme: localStorage.getItem('groq_theme') || 'dark',
  };

  // --- DOM ELEMENTS ---
  const el = {
    sidebar: document.getElementById('sidebar'),
    toggleSidebarBtn: document.getElementById('toggle-sidebar-btn'),
    closeSidebarBtn: document.getElementById('close-sidebar-btn'),
    newChatBtn: document.getElementById('new-chat-btn'),
    personaSelect: document.getElementById('persona-select'),
    customPromptContainer: document.getElementById('custom-prompt-container'),
    systemPromptInput: document.getElementById('system-prompt-input'),
    modelSelect: document.getElementById('model-select'),
    tempSlider: document.getElementById('temperature-slider'),
    tempVal: document.getElementById('temp-val'),
    historyList: document.getElementById('history-list'),
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    tavilyStatusDot: document.getElementById('tavily-status-dot'),
    tavilyStatusText: document.getElementById('tavily-status-text'),
    openSettingsBtn: document.getElementById('open-settings-btn'),

    // Header
    activePersonaBadge: document.getElementById('active-persona-badge'),
    activeModelBadge: document.getElementById('active-model-badge'),
    activeSearchBadge: document.getElementById('active-search-badge'),
    exportChatBtn: document.getElementById('export-chat-btn'),
    clearChatBtn: document.getElementById('clear-chat-btn'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    themeIconSun: document.getElementById('theme-icon-sun'),
    themeIconMoon: document.getElementById('theme-icon-moon'),

    // Messages
    chatMessages: document.getElementById('chat-messages'),
    welcomeScreen: document.getElementById('welcome-screen'),

    // Input Dock
    userInput: document.getElementById('user-input'),
    sendBtn: document.getElementById('send-btn'),
    stopBtn: document.getElementById('stop-btn'),
    webSearchToggleBtn: document.getElementById('web-search-toggle-btn'),

    // Modal
    settingsModal: document.getElementById('settings-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    apiKeyInput: document.getElementById('api-key-input'),
    toggleKeyVisBtn: document.getElementById('toggle-key-visibility-btn'),
    tavilyKeyInput: document.getElementById('tavily-key-input'),
    toggleTavilyVisBtn: document.getElementById('toggle-tavily-vis-btn'),
    maxTokensSlider: document.getElementById('max-tokens-slider'),
    maxTokensVal: document.getElementById('max-tokens-val'),
    testKeyBtn: document.getElementById('test-key-btn'),
    testTavilyBtn: document.getElementById('test-tavily-btn'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),
    keyTestFeedback: document.getElementById('key-test-feedback'),
  };

  // --- MARKED CONFIGURATION ---
  if (window.marked) {
    const renderer = new marked.Renderer();

    renderer.code = function ({ text, lang }) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted = hljs.getLanguage(language)
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value;

      return `
        <div class="code-block-container">
          <div class="code-header">
            <span class="code-lang">${escapeHtml(language)}</span>
            <button class="copy-code-btn" type="button" onclick="window.copyCodeSnippet(this)">Copy code</button>
          </div>
          <pre><code class="hljs language-${escapeHtml(language)}">${highlighted}</code></pre>
        </div>
      `;
    };

    marked.setOptions({
      renderer: renderer,
      breaks: true,
      gfm: true,
    });
  }

  // Global helper for code snippet copy
  window.copyCodeSnippet = function (btn) {
    const container = btn.closest('.code-block-container');
    const codeEl = container ? container.querySelector('code') : null;
    if (!codeEl) return;

    navigator.clipboard.writeText(codeEl.innerText).then(() => {
      const originalText = btn.innerText;
      btn.innerText = 'Copied!';
      btn.style.borderColor = 'var(--success)';
      btn.style.color = 'var(--success)';
      setTimeout(() => {
        btn.innerText = originalText;
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 2000);
    });
  };

  // --- INIT ---
  async function init() {
    setupTheme();
    setupEventListeners();
    await loadServerConfig();
    applyStateToUI();
    loadOrCreateActiveChat();
    updateKeyStatusIndicator();
    updateTavilyStatusIndicator();
    updateWebSearchToggleUI();
  }

  // --- SERVER CONFIG ---
  async function loadServerConfig() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        appConfig = await res.json();
        populateModelsDropdown();
        populatePersonasDropdown();
        updateKeyStatusIndicator();
        updateTavilyStatusIndicator();
      }
    } catch (err) {
      console.warn('Could not load /api/config:', err);
    }
  }

  function populateModelsDropdown() {
    if (!appConfig.models || !appConfig.models.length) return;
    el.modelSelect.innerHTML = '';
    appConfig.models.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.name} ${m.default ? '(Recommended)' : ''}`;
      if (m.id === state.activeModel) opt.selected = true;
      el.modelSelect.appendChild(opt);
    });
  }

  function populatePersonasDropdown() {
    if (!appConfig.personas) return;
    el.personaSelect.innerHTML = '';

    for (const [key, p] of Object.entries(appConfig.personas)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = p.name;
      el.personaSelect.appendChild(opt);
    }

    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = '⚙️ Custom Persona';
    el.personaSelect.appendChild(customOpt);

    el.personaSelect.value = state.activePersona;
  }

  // --- STATE APPLICATION ---
  function applyStateToUI() {
    // Model & Persona
    if (el.modelSelect.querySelector(`option[value="${state.activeModel}"]`)) {
      el.modelSelect.value = state.activeModel;
    }
    el.personaSelect.value = state.activePersona;
    handlePersonaChange();

    // Sliders
    el.tempSlider.value = state.temperature;
    el.tempVal.textContent = state.temperature.toFixed(1);

    el.maxTokensSlider.value = state.maxTokens;
    el.maxTokensVal.textContent = state.maxTokens;

    el.apiKeyInput.value = state.apiKey;
    el.tavilyKeyInput.value = state.tavilyApiKey;

    updateHeaderBadges();
  }

  function updateHeaderBadges() {
    const selectedPersona = el.personaSelect.options[el.personaSelect.selectedIndex]?.text || state.activePersona;
    el.activePersonaBadge.textContent = selectedPersona;
    el.activeModelBadge.textContent = state.activeModel.replace('-versatile', '').replace('-instant', '');
  }

  function updateKeyStatusIndicator() {
    const hasKey = Boolean(state.apiKey.trim() || appConfig.has_server_api_key);
    if (hasKey) {
      el.statusDot.className = 'status-dot green';
      el.statusText.textContent = state.apiKey.trim() ? 'Groq (Custom)' : 'Groq Ready';
    } else {
      el.statusDot.className = 'status-dot red';
      el.statusText.textContent = 'Groq (No Key)';
    }
  }

  function updateTavilyStatusIndicator() {
    if (!el.tavilyStatusDot || !el.tavilyStatusText) return;
    const hasKey = Boolean(state.tavilyApiKey.trim() || appConfig.has_server_tavily_key);
    if (hasKey) {
      el.tavilyStatusDot.className = 'status-dot blue';
      el.tavilyStatusText.textContent = state.tavilyApiKey.trim() ? 'Tavily (Custom)' : 'Tavily Ready';
    } else {
      el.tavilyStatusDot.className = 'status-dot';
      el.tavilyStatusText.textContent = 'Tavily (No Key)';
    }
  }

  function updateWebSearchToggleUI() {
    if (!el.webSearchToggleBtn) return;
    if (state.webSearchEnabled) {
      el.webSearchToggleBtn.classList.add('active');
      if (el.activeSearchBadge) el.activeSearchBadge.classList.remove('hidden');
    } else {
      el.webSearchToggleBtn.classList.remove('active');
      if (el.activeSearchBadge) el.activeSearchBadge.classList.add('hidden');
    }
  }

  // --- THEME ---
  function setupTheme() {
    if (state.theme === 'light') {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      el.themeIconSun.classList.add('hidden');
      el.themeIconMoon.classList.remove('hidden');
    } else {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      el.themeIconMoon.classList.add('hidden');
      el.themeIconSun.classList.remove('hidden');
    }
  }

  function toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    state.theme = isDark ? 'light' : 'dark';
    localStorage.setItem('groq_theme', state.theme);
    setupTheme();
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Auto-grow textarea
    el.userInput.addEventListener('input', () => {
      el.userInput.style.height = 'auto';
      el.userInput.style.height = Math.min(el.userInput.scrollHeight, 180) + 'px';
      el.sendBtn.disabled = !el.userInput.value.trim() || state.isStreaming;
    });

    // Enter to submit
    el.userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    el.sendBtn.addEventListener('click', sendMessage);
    el.stopBtn.addEventListener('click', stopGenerating);

    // Web Search Toggle Button
    if (el.webSearchToggleBtn) {
      el.webSearchToggleBtn.addEventListener('click', () => {
        state.webSearchEnabled = !state.webSearchEnabled;
        localStorage.setItem('web_search_enabled', state.webSearchEnabled ? 'true' : 'false');
        updateWebSearchToggleUI();
      });
    }

    // Persona change
    el.personaSelect.addEventListener('change', () => {
      state.activePersona = el.personaSelect.value;
      localStorage.setItem('groq_active_persona', state.activePersona);
      handlePersonaChange();
      updateHeaderBadges();
    });

    // Custom prompt input
    el.systemPromptInput.addEventListener('input', () => {
      state.customSystemPrompt = el.systemPromptInput.value;
      localStorage.setItem('groq_custom_system_prompt', state.customSystemPrompt);
    });

    // Model change
    el.modelSelect.addEventListener('change', () => {
      state.activeModel = el.modelSelect.value;
      localStorage.setItem('groq_active_model', state.activeModel);
      updateHeaderBadges();
    });

    // Temperature slider
    el.tempSlider.addEventListener('input', () => {
      state.temperature = parseFloat(el.tempSlider.value);
      el.tempVal.textContent = state.temperature.toFixed(1);
      localStorage.setItem('groq_temperature', state.temperature);
    });

    // Max tokens slider
    el.maxTokensSlider.addEventListener('input', () => {
      state.maxTokens = parseInt(el.maxTokensSlider.value, 10);
      el.maxTokensVal.textContent = state.maxTokens;
      localStorage.setItem('groq_max_tokens', state.maxTokens);
    });

    // Sidebar buttons
    el.newChatBtn.addEventListener('click', createNewChat);
    el.toggleSidebarBtn.addEventListener('click', () => el.sidebar.classList.toggle('collapsed'));
    el.closeSidebarBtn.addEventListener('click', () => el.sidebar.classList.add('collapsed'));

    // Top actions
    el.clearChatBtn.addEventListener('click', clearActiveChat);
    el.exportChatBtn.addEventListener('click', exportChatAsMarkdown);
    el.themeToggleBtn.addEventListener('click', toggleTheme);

    // Settings Modal
    el.openSettingsBtn.addEventListener('click', openSettingsModal);
    el.closeModalBtn.addEventListener('click', closeSettingsModal);
    el.settingsModal.addEventListener('click', (e) => {
      if (e.target === el.settingsModal) closeSettingsModal();
    });

    // Groq key visibility toggle
    el.toggleKeyVisBtn.addEventListener('click', () => {
      const isPass = el.apiKeyInput.type === 'password';
      el.apiKeyInput.type = isPass ? 'text' : 'password';
      el.toggleKeyVisBtn.textContent = isPass ? 'Hide' : 'Show';
    });

    // Tavily key visibility toggle
    if (el.toggleTavilyVisBtn && el.tavilyKeyInput) {
      el.toggleTavilyVisBtn.addEventListener('click', () => {
        const isPass = el.tavilyKeyInput.type === 'password';
        el.tavilyKeyInput.type = isPass ? 'text' : 'password';
        el.toggleTavilyVisBtn.textContent = isPass ? 'Hide' : 'Show';
      });
    }

    el.testKeyBtn.addEventListener('click', testApiKey);
    if (el.testTavilyBtn) {
      el.testTavilyBtn.addEventListener('click', testTavilyKey);
    }
    el.saveSettingsBtn.addEventListener('click', saveSettings);

    // Starter cards click
    document.querySelectorAll('.starter-card').forEach((card) => {
      card.addEventListener('click', () => {
        const prompt = card.getAttribute('data-prompt');
        const isSearch = card.getAttribute('data-search') === 'true';
        if (isSearch && !state.webSearchEnabled) {
          state.webSearchEnabled = true;
          localStorage.setItem('web_search_enabled', 'true');
          updateWebSearchToggleUI();
        }
        if (prompt) {
          el.userInput.value = prompt;
          el.userInput.dispatchEvent(new Event('input'));
          sendMessage();
        }
      });
    });
  }

  function handlePersonaChange() {
    if (state.activePersona === 'custom') {
      el.customPromptContainer.classList.remove('hidden');
      el.systemPromptInput.value = state.customSystemPrompt || appConfig.default_system_prompt || '';
    } else {
      el.customPromptContainer.classList.add('hidden');
      const persona = appConfig.personas ? appConfig.personas[state.activePersona] : null;
      if (persona) {
        el.systemPromptInput.value = persona.prompt;
      }
    }
  }

  function getActiveSystemPrompt() {
    if (state.activePersona === 'custom') {
      return state.customSystemPrompt.trim() || appConfig.default_system_prompt;
    }
    const persona = appConfig.personas ? appConfig.personas[state.activePersona] : null;
    return persona ? persona.prompt : appConfig.default_system_prompt;
  }

  // --- CONVERSATION STORAGE & LOGIC ---
  function loadOrCreateActiveChat() {
    renderHistoryList();
    if (state.conversations.length > 0) {
      switchConversation(state.conversations[0].id);
    } else {
      createNewChat();
    }
  }

  function createNewChat() {
    const newChat = {
      id: 'chat_' + Date.now(),
      title: 'New Conversation',
      messages: [],
      timestamp: Date.now(),
      model: state.activeModel,
      persona: state.activePersona,
    };
    state.conversations.unshift(newChat);
    saveConversations();
    renderHistoryList();
    switchConversation(newChat.id);
  }

  function switchConversation(id) {
    state.activeChatId = id;
    const chat = getActiveChat();
    renderHistoryList();
    renderChatMessages(chat ? chat.messages : []);
    el.userInput.focus();
  }

  function getActiveChat() {
    return state.conversations.find((c) => c.id === state.activeChatId) || null;
  }

  function saveConversations() {
    localStorage.setItem('groq_conversations', JSON.stringify(state.conversations));
  }

  function deleteConversation(id, e) {
    if (e) e.stopPropagation();
    state.conversations = state.conversations.filter((c) => c.id !== id);
    saveConversations();
    if (state.activeChatId === id) {
      if (state.conversations.length > 0) {
        switchConversation(state.conversations[0].id);
      } else {
        createNewChat();
      }
    } else {
      renderHistoryList();
    }
  }

  function clearActiveChat() {
    const chat = getActiveChat();
    if (!chat) return;
    if (confirm('Are you sure you want to clear all messages in this conversation?')) {
      chat.messages = [];
      chat.title = 'New Conversation';
      saveConversations();
      renderChatMessages([]);
      renderHistoryList();
    }
  }

  function renderHistoryList() {
    el.historyList.innerHTML = '';
    state.conversations.forEach((chat) => {
      const item = document.createElement('div');
      item.className = 'history-item' + (chat.id === state.activeChatId ? ' active' : '');
      item.onclick = () => switchConversation(chat.id);

      const titleSpan = document.createElement('span');
      titleSpan.className = 'history-item-title';
      titleSpan.textContent = chat.title || 'Untitled Chat';

      const delBtn = document.createElement('button');
      delBtn.className = 'history-delete-btn';
      delBtn.title = 'Delete chat';
      delBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      delBtn.onclick = (e) => deleteConversation(chat.id, e);

      item.appendChild(titleSpan);
      item.appendChild(delBtn);
      el.historyList.appendChild(item);
    });
  }

  // --- RENDERING CHAT MESSAGES ---
  function renderChatMessages(messages) {
    el.chatMessages.innerHTML = '';
    if (!messages || messages.length === 0) {
      el.chatMessages.appendChild(el.welcomeScreen);
      el.welcomeScreen.classList.remove('hidden');
      return;
    }

    el.welcomeScreen.classList.add('hidden');
    messages.forEach((msg) => {
      appendMessageToDOM(msg.role, msg.content, false);
    });
    scrollToBottom();
  }

  function appendMessageToDOM(role, content, animate = true) {
    el.welcomeScreen.classList.add('hidden');

    const row = document.createElement('div');
    row.className = `message-row ${role}`;
    if (!animate) row.style.animation = 'none';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'U' : '✦';

    const wrapper = document.createElement('div');
    wrapper.className = 'message-content-wrapper';

    const header = document.createElement('div');
    header.className = 'message-header';
    const sender = document.createElement('span');
    sender.className = 'message-sender';
    sender.textContent = role === 'user' ? 'You' : 'Aura Assistant';
    header.appendChild(sender);

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    if (role === 'user') {
      bubble.textContent = content;
    } else {
      bubble.innerHTML = window.marked ? marked.parse(content) : escapeHtml(content);
    }

    wrapper.appendChild(header);
    wrapper.appendChild(bubble);
    row.appendChild(avatar);
    row.appendChild(wrapper);

    el.chatMessages.appendChild(row);
    return bubble;
  }

  function scrollToBottom() {
    el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
  }

  // --- SEND & STREAMING ---
  async function sendMessage() {
    const text = el.userInput.value.trim();
    if (!text || state.isStreaming) return;

    const chat = getActiveChat();
    if (!chat) return;

    // 1. Append User Message
    chat.messages.push({ role: 'user', content: text });
    if (chat.messages.length === 1) {
      chat.title = text.length > 36 ? text.substring(0, 36) + '...' : text;
      renderHistoryList();
    }
    saveConversations();

    appendMessageToDOM('user', text);
    el.userInput.value = '';
    el.userInput.style.height = 'auto';
    el.sendBtn.disabled = true;
    scrollToBottom();

    // 2. Prepare Assistant Bubble for Streaming
    const assistantBubble = appendMessageToDOM('assistant', '');
    assistantBubble.innerHTML = ''; // Start clean

    // Container for streaming text
    const textBody = document.createElement('div');
    textBody.className = 'message-text-body';
    const cursor = document.createElement('span');
    cursor.className = 'streaming-cursor';
    textBody.appendChild(cursor);
    assistantBubble.appendChild(textBody);

    // 3. UI State: Streaming
    state.isStreaming = true;
    el.sendBtn.classList.add('hidden');
    el.stopBtn.classList.remove('hidden');

    state.abortController = new AbortController();
    let accumulatedContent = '';

    const payload = {
      messages: chat.messages,
      model: state.activeModel,
      system_prompt: getActiveSystemPrompt(),
      temperature: state.temperature,
      max_tokens: state.maxTokens,
      api_key: state.apiKey.trim() || undefined,
      web_search: state.webSearchEnabled,
      tavily_api_key: state.tavilyApiKey.trim() || undefined,
    };

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: state.abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred.' }));
        throw new Error(errorData.detail || `Server status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              throw new Error(parsed.error);
            }

            // Handle Tavily search starting event
            if (parsed.type === 'search_start') {
              let statusBar = assistantBubble.querySelector('.search-status-bar');
              if (!statusBar) {
                statusBar = document.createElement('div');
                statusBar.className = 'search-status-bar';
                statusBar.innerHTML = `
                  <div class="search-spinner"></div>
                  <span>Searching web via Tavily for: "<strong>${escapeHtml(parsed.query || '')}</strong>"...</span>
                `;
                assistantBubble.insertBefore(statusBar, textBody);
                scrollToBottom();
              }
            }

            // Handle Tavily search results event
            if (parsed.type === 'search_results') {
              let statusBar = assistantBubble.querySelector('.search-status-bar');
              if (statusBar) {
                if (parsed.success && parsed.results && parsed.results.length > 0) {
                  statusBar.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Found ${parsed.results.length} relevant web sources</span>
                  `;
                } else if (!parsed.success) {
                  statusBar.innerHTML = `
                    <span style="color: var(--warning);">⚠ ${escapeHtml(parsed.error || 'Web search did not return results.')}</span>
                  `;
                }
              }

              // Render source citations pills
              if (parsed.results && parsed.results.length > 0) {
                let sourcesBox = assistantBubble.querySelector('.search-sources-box');
                if (!sourcesBox) {
                  sourcesBox = document.createElement('div');
                  sourcesBox.className = 'search-sources-box';
                  const header = `<div class="sources-header">🌐 Web Sources (${parsed.results.length})</div>`;
                  const pills = parsed.results.map((r, i) => {
                    let hostname = 'source';
                    try {
                      hostname = new URL(r.url).hostname.replace('www.', '');
                    } catch (e) {
                      hostname = 'web';
                    }
                    const title = r.title || hostname;
                    return `
                      <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer" class="source-pill" title="${escapeHtml(title)}: ${escapeHtml(r.content || '')}">
                        <span class="source-pill-title">${escapeHtml(title)}</span>
                      </a>
                    `;
                  }).join('');
                  sourcesBox.innerHTML = `${header}<div class="sources-grid">${pills}</div>`;
                  assistantBubble.insertBefore(sourcesBox, textBody);
                  scrollToBottom();
                }
              }
            }

            // Handle text completion streaming
            if (parsed.content) {
              accumulatedContent += parsed.content;
              textBody.innerHTML = window.marked
                ? marked.parse(accumulatedContent)
                : escapeHtml(accumulatedContent);
              textBody.appendChild(cursor);
              scrollToBottom();
            }
          } catch (jsonErr) {
            if (dataStr !== '[DONE]') {
              console.warn('Could not parse SSE chunk:', dataStr, jsonErr);
            }
          }
        }
      }

      // Finish streaming cleanly
      cursor.remove();
      chat.messages.push({ role: 'assistant', content: accumulatedContent });
      saveConversations();

    } catch (err) {
      cursor.remove();
      if (err.name === 'AbortError') {
        if (accumulatedContent) {
          chat.messages.push({ role: 'assistant', content: accumulatedContent });
          saveConversations();
        }
      } else {
        const errMsg = err.message || 'Error communicating with assistant.';
        textBody.innerHTML = `
          <div class="feedback-alert error">
            <strong>Assistant Error:</strong> ${escapeHtml(errMsg)}
          </div>
        `;
        if (errMsg.toLowerCase().includes('groq api key') || errMsg.toLowerCase().includes('tavily api key')) {
          openSettingsModal();
        }
      }
    } finally {
      state.isStreaming = false;
      state.abortController = null;
      el.stopBtn.classList.add('hidden');
      el.sendBtn.classList.remove('hidden');
      el.sendBtn.disabled = !el.userInput.value.trim();
      scrollToBottom();
    }
  }

  function stopGenerating() {
    if (state.abortController) {
      state.abortController.abort();
    }
  }

  // --- EXPORT AS MARKDOWN ---
  function exportChatAsMarkdown() {
    const chat = getActiveChat();
    if (!chat || chat.messages.length === 0) {
      alert('No messages to export in current conversation.');
      return;
    }

    let md = `# ${chat.title}\n`;
    md += `*Exported on ${new Date().toLocaleString()}*\n`;
    md += `*Model: ${chat.model || state.activeModel} | Persona: ${chat.persona || state.activePersona}*\n\n---\n\n`;

    chat.messages.forEach((msg) => {
      const sender = msg.role === 'user' ? '### 👤 User' : '### ✦ Aura Assistant';
      md += `${sender}\n\n${msg.content}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(chat.title || 'chat').replace(/[^a-z0-9_-]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- SETTINGS MODAL & TEST KEYS ---
  function openSettingsModal() {
    el.apiKeyInput.value = state.apiKey;
    if (el.tavilyKeyInput) el.tavilyKeyInput.value = state.tavilyApiKey;
    el.keyTestFeedback.className = 'feedback-alert hidden';
    el.keyTestFeedback.textContent = '';
    el.settingsModal.classList.remove('hidden');
  }

  function closeSettingsModal() {
    el.settingsModal.classList.add('hidden');
  }

  async function testApiKey() {
    const key = el.apiKeyInput.value.trim();
    if (!key) {
      showFeedback('Please enter a Groq API key to test.', 'error');
      return;
    }

    el.testKeyBtn.disabled = true;
    el.testKeyBtn.textContent = 'Testing...';
    el.keyTestFeedback.className = 'feedback-alert hidden';

    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: key }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        showFeedback('Connection Successful! Groq API key is valid.', 'success');
      } else {
        showFeedback(data.message || 'Groq key validation failed.', 'error');
      }
    } catch (err) {
      showFeedback(`Test failed: ${err.message}`, 'error');
    } finally {
      el.testKeyBtn.disabled = false;
      el.testKeyBtn.textContent = 'Test Groq';
    }
  }

  async function testTavilyKey() {
    const key = el.tavilyKeyInput ? el.tavilyKeyInput.value.trim() : '';
    if (!key) {
      showFeedback('Please enter a Tavily API key to test.', 'error');
      return;
    }

    el.testTavilyBtn.disabled = true;
    el.testTavilyBtn.textContent = 'Testing...';
    el.keyTestFeedback.className = 'feedback-alert hidden';

    try {
      const res = await fetch('/api/validate-tavily-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: key }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        showFeedback('Connection Successful! Tavily Web Search key is valid.', 'success');
      } else {
        showFeedback(data.message || 'Tavily validation failed.', 'error');
      }
    } catch (err) {
      showFeedback(`Test failed: ${err.message}`, 'error');
    } finally {
      el.testTavilyBtn.disabled = false;
      el.testTavilyBtn.textContent = 'Test Tavily';
    }
  }

  function saveSettings() {
    const groqKey = el.apiKeyInput.value.trim();
    state.apiKey = groqKey;
    localStorage.setItem('groq_custom_api_key', groqKey);

    if (el.tavilyKeyInput) {
      const tavilyKey = el.tavilyKeyInput.value.trim();
      state.tavilyApiKey = tavilyKey;
      localStorage.setItem('tavily_custom_api_key', tavilyKey);
    }

    updateKeyStatusIndicator();
    updateTavilyStatusIndicator();
    closeSettingsModal();
  }

  function showFeedback(msg, type) {
    el.keyTestFeedback.className = `feedback-alert ${type}`;
    el.keyTestFeedback.textContent = msg;
    el.keyTestFeedback.classList.remove('hidden');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Start application
  document.addEventListener('DOMContentLoaded', init);
})();
