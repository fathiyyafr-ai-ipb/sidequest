import { api, ui } from './api.js';

// Cache key for persistent chats
const CHAT_CACHE_KEY = 'sq_sidekick_chat_history';

export function initSideKick() {
  if (document.getElementById('sidekick-container')) return;

  // 1. Create global container
  const container = document.createElement('div');
  container.id = 'sidekick-container';
  container.className = 'fixed bottom-6 right-6 z-50 font-sans';
  document.body.appendChild(container);

  // 2. Add styles for glassmorphism and transitions
  if (!document.getElementById('sidekick-styles')) {
    const s = document.createElement('style');
    s.id = 'sidekick-styles';
    s.textContent = `
      .sidekick-drawer {
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .sidekick-drawer.open {
        transform: translateX(0);
      }
      .typing-dot {
        animation: typingBounce 1.4s infinite ease-in-out both;
      }
      .typing-dot:nth-child(2) { animation-delay: .2s; }
      .typing-dot:nth-child(3) { animation-delay: .4s; }
      @keyframes typingBounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
    `;
    document.head.appendChild(s);
  }

  // 3. Render Floating Bubble & Drawer Layout
  container.innerHTML = `
    <!-- Floating Bubble Button -->
    <button id="sidekick-bubble" type="button" class="w-14 h-14 rounded-full bg-primary hover:bg-primary-dark text-white shadow-2xl flex items-center justify-center border-4 border-white transition-all transform hover:scale-110 active:scale-95 cursor-pointer relative group">
      <span class="text-2xl animate-pulse">⚡</span>
      
      <!-- Tooltip -->
      <span class="absolute right-16 bg-gray-900 text-white text-xs font-700 px-3 py-1.5 rounded-xl whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        SideKick AI Assistant ✨
      </span>
      
      <!-- Pulsing Notification badge -->
      <span class="absolute -top-1 -right-1 w-4.5 h-4.5 bg-accent rounded-full border-2 border-white flex items-center justify-center">
        <span class="w-2.5 h-2.5 bg-white rounded-full animate-ping"></span>
      </span>
    </button>

    <!-- Side-Out Chat Drawer -->
    <div id="sidekick-drawer" class="sidekick-drawer fixed right-0 top-0 h-full w-85 md:w-96 bg-white/95 backdrop-blur-lg shadow-2xl border-l border-gray-100 flex flex-col justify-between hidden">
      
      <!-- Header -->
      <div class="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-primary/10 via-purple-500/10 to-transparent">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary text-xl font-bold">
            ⚡
          </div>
          <div>
            <h3 class="font-800 text-gray-800 text-sm flex items-center gap-1.5">
              SideKick Assistant
              <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            </h3>
            <p class="text-[10px] text-gray-400 font-500 uppercase tracking-wider">AI Matchmaking Agent</p>
          </div>
        </div>
        <button id="sidekick-close" type="button" class="text-gray-400 hover:text-gray-600 font-bold p-1 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border-0 cursor-pointer">
          ✕
        </button>
      </div>

      <!-- Messages Panel -->
      <div id="sidekick-messages" class="flex-1 p-5 overflow-y-auto space-y-4 no-scrollbar scroll-smooth">
        <!-- Messages get injected here -->
      </div>

      <!-- Footer Input form -->
      <form id="sidekick-form" class="p-4 border-t border-gray-100 bg-white flex items-center gap-2">
        <input id="sidekick-input" type="text" placeholder="Tanyakan lomba, skill, atau panduan…" required autocomplete="off" class="flex-1 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-xs md:text-sm text-gray-800 focus:outline-none focus:border-primary focus:bg-white transition-all"/>
        <button type="submit" class="p-3 rounded-xl bg-primary hover:bg-primary-dark text-white transition-colors border-0 cursor-pointer shadow-md flex items-center justify-center">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </form>

    </div>
  `;

  // Bind Events
  const bubble = document.getElementById('sidekick-bubble');
  const drawer = document.getElementById('sidekick-drawer');
  const close = document.getElementById('sidekick-close');
  const form = document.getElementById('sidekick-form');
  const input = document.getElementById('sidekick-input');
  const messagesPanel = document.getElementById('sidekick-messages');

  // Toggle drawer visibility
  const toggleDrawer = () => {
    const isHidden = drawer.classList.contains('hidden');
    if (isHidden) {
      drawer.classList.remove('hidden');
      requestAnimationFrame(() => drawer.classList.add('open'));
      // Scroll to bottom
      setTimeout(scrollToBottom, 100);
    } else {
      drawer.classList.remove('open');
      setTimeout(() => drawer.classList.add('hidden'), 300);
    }
  };

  bubble.addEventListener('click', toggleDrawer);
  close.addEventListener('click', toggleDrawer);

  // Close drawer when clicking outside of it (click-away UX enhancement)
  document.addEventListener('click', (e) => {
    const isDrawerOpen = !drawer.classList.contains('hidden');
    if (isDrawerOpen && !drawer.contains(e.target) && !bubble.contains(e.target)) {
      toggleDrawer();
    }
  });

  // Initialize Obrolan Cache History
  let chatHistory = [];
  try {
    const cached = localStorage.getItem(CHAT_CACHE_KEY);
    if (cached) chatHistory = JSON.parse(cached);
  } catch (_) {}

  // Render initial greeting if no history
  if (chatHistory.length === 0) {
    chatHistory.push({
      sender: 'ai',
      text: 'Halo! Saya adalah **SideKick**, asisten AI personal Anda di SideQuest. ⚡\n\nSaya bisa membantu Anda mencari kompetisi, merekomendasikan rekan tim dari skill/kampus tertentu, atau menjawab panduan platform. Silakan ketik apa yang Anda cari!'
    });
    saveHistory(chatHistory);
  }

  // Initial Render
  renderMessages(chatHistory, messagesPanel);

  // Handle message sending
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const queryText = input.value.trim();
    if (!queryText) return;

    input.value = '';
    
    // 1. Add User Message to thread
    chatHistory.push({ sender: 'user', text: queryText });
    renderMessages(chatHistory, messagesPanel);
    saveHistory(chatHistory);

    // 2. Add Typing Indicator
    const typingId = appendTypingIndicator(messagesPanel);
    
    try {
      // 3. Send payload to Backend
      const response = await api.sidekick.chat(queryText);
      
      // 4. Remove Typing Indicator
      document.getElementById(typingId)?.remove();

      // 5. Add AI Message with structured attachments
      chatHistory.push({
        sender: 'ai',
        text: response.message,
        competitions: response.data.competitions || [],
        users: response.data.users || []
      });
      renderMessages(chatHistory, messagesPanel);
      saveHistory(chatHistory);
    } catch (err) {
      document.getElementById(typingId)?.remove();
      chatHistory.push({
        sender: 'ai',
        text: 'Maaf, terjadi kendala saat menghubungkan ke asisten AI SideKick. Silakan coba lagi.'
      });
      renderMessages(chatHistory, messagesPanel);
      saveHistory(chatHistory);
    }
  });
}

function saveHistory(history) {
  try {
    localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(history));
  } catch (_) {}
}

function scrollToBottom() {
  const messagesPanel = document.getElementById('sidekick-messages');
  if (messagesPanel) {
    messagesPanel.scrollTop = messagesPanel.scrollHeight;
  }
}

function appendTypingIndicator(container) {
  const id = `typing-${Date.now()}`;
  const el = document.createElement('div');
  el.id = id;
  el.className = 'flex items-start gap-2.5';
  el.innerHTML = `
    <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
      ⚡
    </div>
    <div class="bg-gray-100 text-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm text-xs font-500 flex items-center gap-1">
      <span class="typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
      <span class="typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
      <span class="typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
    </div>
  `;
  container.appendChild(el);
  scrollToBottom();
  return id;
}

// Global Connection trigger from chatbot bubble card
window.connectSideKickUser = async (id, name, btnEl) => {
  btnEl.disabled = true;
  btnEl.textContent = 'Menghubungkan…';
  try {
    await api.matchmaking.connect(id);
    ui.toast(`✅ Permintaan koneksi terkirim ke ${name}!`, 'success');
    btnEl.className = "w-full py-2 bg-green-50 text-green-700 text-[10px] font-800 rounded-lg border-0 cursor-not-allowed";
    btnEl.textContent = 'Request Sent';
  } catch (err) {
    ui.toast(err.message || 'Gagal mengirim koneksi', 'error');
    btnEl.disabled = false;
    btnEl.textContent = 'Hubungkan ✨';
  }
};

function renderMessages(history, container) {
  container.innerHTML = history.map((msg, index) => {
    const isAi = msg.sender === 'ai';
    const alignClass = isAi ? 'justify-start' : 'justify-end';
    const bgClass = isAi ? 'bg-gray-100 text-gray-800 rounded-tl-sm' : 'bg-primary text-white rounded-tr-sm';
    const initAvatar = isAi ? '⚡' : '🧑‍🎓';
    const avatarBg = isAi ? 'bg-primary/10 text-primary' : 'bg-accent text-white';

    // Parse bold markdown manually for clean styling
    let formattedText = msg.text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');

    // Render competitions rich mini-cards attachment
    let compCardsHtml = '';
    if (msg.competitions && msg.competitions.length > 0) {
      compCardsHtml = `
        <div class="mt-3 space-y-2.5 w-full">
          ${msg.competitions.map(c => `
            <div class="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div class="flex items-start gap-2.5">
                <span class="text-xl flex-shrink-0">${c.emoji || '🏆'}</span>
                <div class="flex-1 min-w-0">
                  <h4 class="text-xs font-800 text-gray-800 truncate leading-snug">${c.title}</h4>
                  <p class="text-[9px] text-gray-400 truncate mt-0.5">${c.organizer || 'SideQuest EO'}</p>
                </div>
              </div>
              <div class="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-50">
                <span class="text-[9px] text-accent font-700 uppercase bg-accent-light px-2 py-0.5 rounded-md">
                  ⏳ ${ui.formatDate(c.deadline)}
                </span>
                <a href="detail.html?id=${c.id}" class="text-[9px] font-800 text-primary hover:underline flex items-center gap-0.5 no-underline">
                  Detail Lomba →
                </a>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Render users rich mini-cards attachment
    let userCardsHtml = '';
    if (msg.users && msg.users.length > 0) {
      userCardsHtml = `
        <div class="mt-3 space-y-2.5 w-full">
          ${msg.users.map(u => `
            <div class="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow">
              <div class="flex items-start gap-2.5">
                <div class="w-8 h-8 rounded-full ${u.avatarColor || 'bg-primary'} flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  ${u.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="text-xs font-800 text-gray-800 truncate leading-snug">${u.name}</h4>
                  <p class="text-[9px] text-primary font-600 truncate mt-0.5">${u.prodi}</p>
                  <p class="text-[8px] text-gray-400 truncate">${u.uni}</p>
                </div>
              </div>
              
              <!-- Skills -->
              <div class="flex flex-wrap gap-1 mt-2.5">
                ${u.skills.map(s => `<span class="text-[8px] bg-primary-light text-primary px-1.5 py-0.5 rounded font-600">${s}</span>`).join('')}
              </div>

              <!-- Action Connect directly from Chat -->
              <div class="mt-2.5 pt-2 border-t border-gray-50">
                <button onclick="window.connectSideKickUser(${u.id}, '${u.name}', this)" class="w-full py-2 bg-primary hover:bg-primary-dark text-white text-[10px] font-800 rounded-lg border-0 cursor-pointer shadow-sm transition-colors">
                  Hubungkan ✨
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `
      <div class="flex items-start gap-2.5 ${alignClass}">
        ${isAi ? `
          <div class="w-8 h-8 rounded-lg ${avatarBg} flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm border border-gray-100">
            ${initAvatar}
          </div>
        ` : ''}
        
        <div class="max-w-[75%] flex flex-col">
          <div class="${bgClass} px-4 py-3 rounded-2xl text-xs md:text-sm font-500 leading-relaxed shadow-sm">
            ${formattedText}
            ${compCardsHtml}
            ${userCardsHtml}
          </div>
        </div>

        ${!isAi ? `
          <div class="w-8 h-8 rounded-lg ${avatarBg} flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm border border-gray-100">
            ${initAvatar}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  scrollToBottom();
}
