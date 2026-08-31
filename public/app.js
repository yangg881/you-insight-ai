
// ==================== 移动端侧边抽屉导航调度 ====================

window.toggleMobileNavDrawer = function() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const overlay = document.getElementById('mobile-nav-overlay');
  
  if (!drawer || !overlay) {
    console.warn('mobile-nav-drawer elements not found');
    return;
  }
  
  const isOpen = drawer.classList.contains('open');
  if (isOpen) {
    // 隐藏/缩进抽屉
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    
    document.body.style.overflow = '';
  } else {
    // 展开抽屉
    drawer.classList.add('open');
    overlay.classList.add('open');
    
    document.body.style.overflow = 'hidden';
  }
};

window.switchTabMobile = function(tab) {
  switchTab(tab);
  window.toggleMobileNavDrawer();
};;;


// ==================== 移动端侧边抽屉导航调度 ====================

function toggleMobileNavDrawer() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const overlay = document.getElementById('mobile-nav-overlay');
  if (!drawer || !overlay) return;
  const isClosed = drawer.classList.contains('-translate-x-full');
  if (isClosed) {
    drawer.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
  } else {
    drawer.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
  }
}

function switchTabMobile(tab) {
  switchTab(tab);
  toggleMobileNavDrawer();
}


// ==================== 进度耗时计时器与阶段轮播助手 ====================

function startTimer(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return null;
  const startTime = Date.now();
  el.textContent = '耗时: 0s';
  const interval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    el.textContent = `耗时: ${elapsed}s`;
  }, 1000);
  return interval;
}

function startStageRotation(stageId, timerId, stages = []) {
  const el = document.getElementById(stageId);
  if (!el || stages.length === 0) return null;
  let idx = 0;
  el.textContent = stages[0];
  const interval = setInterval(() => {
    idx = (idx + 1) % stages.length;
    el.textContent = stages[idx];
  }, 3500);
  return interval;
}

function stopTimer(intervalId) {
  if (intervalId) clearInterval(intervalId);
}


// ==================== 商汤 SenseNova AI 商业全景信息图渲染器 ====================

function renderAiHeroImage(imageUrl, caption = 'AI 商业全景信息图', containerId = null) {
  if (!imageUrl) return '';
  const html = `
    <div class="ai-hero-infographic mb-5 rounded-2xl overflow-hidden border border-indigo-500/30 bg-gradient-to-b from-indigo-950/30 to-[var(--surface-secondary)] shadow-xl shadow-indigo-950/30 group relative">
      <div class="relative overflow-hidden cursor-pointer" onclick="openImageLightbox('${escapeHtml(imageUrl)}')">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(caption)}" class="w-full h-auto max-h-[420px] object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]" loading="lazy">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/20 opacity-90"></div>
        <div class="absolute top-3 right-3">
          <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-black/60 backdrop-blur-md text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 shadow-lg">
            <span>✨</span><span>SenseNova 4K 商业全景信息图</span>
          </span>
        </div>
        <div class="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 text-white font-medium truncate">
            <span class="text-sm">🖼️</span>
            <span class="truncate">${escapeHtml(caption)}</span>
          </div>
          <span class="text-[11px] text-cyan-300 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm group-hover:bg-indigo-600/80 transition-colors whitespace-nowrap">🔍 点击查看 4K 极清原图 ↗</span>
        </div>
      </div>
    </div>
  `;
  if (containerId) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = html;
  }
  return html;
}

function openImageLightbox(url) {
  let modal = document.getElementById('modal-image-lightbox');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-image-lightbox';
    modal.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200';
    modal.onclick = (e) => { if (e.target === modal || e.target.tagName === 'BUTTON') modal.remove(); };
    modal.innerHTML = `
      <div class="relative max-w-5xl max-h-[95vh] flex flex-col items-center">
        <button class="absolute -top-10 right-0 text-white/80 hover:text-white text-xl font-bold bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
        <img id="lightbox-img" src="${url}" class="max-w-full max-h-[85vh] rounded-xl object-contain border border-white/20 shadow-2xl">
        <div class="mt-3 flex items-center gap-3">
          <a href="${url}" target="_blank" download class="btn-primary text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5">
            <span>💾</span><span>下载 4K 高清原图</span>
          </a>
          <button onclick="document.getElementById('modal-image-lightbox').remove()" class="btn-secondary text-xs py-1.5 px-3 rounded-xl">关闭</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    document.getElementById('lightbox-img').src = url;
    modal.classList.remove('hidden');
  }
}

// ==================== 白天/黑夜主题切换 (Theme Switcher) ====================
function initTheme() {
  const savedTheme = localStorage.getItem('youinsight_theme') || 'dark';
  applyTheme(savedTheme, false);
}

function applyTheme(theme, notify = true) {
  const html = document.documentElement;
  const icon = document.getElementById('theme-icon');
  if (theme === 'light') {
    html.classList.remove('dark');
    html.setAttribute('data-theme', 'light');
    if (icon) icon.textContent = '☀️';
  } else {
    html.classList.add('dark');
    html.setAttribute('data-theme', 'dark');
    if (icon) icon.textContent = '🌙';
  }
  localStorage.setItem('youinsight_theme', theme);
  if (notify) {
    showToast(theme === 'light' ? '已切换至 ☀️ 白天模式' : '已切换至 🌙 黑夜模式', 'info');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const nextTheme = current === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme, true);
}


const PROMPT_TEMPLATES_MAP = {
  competitor: {
    icon: '⚔️',
    name: '竞品深度分析',
    desc: '对比功能、商业模式、技术架构与市场定价',
    prompt: '请对以下两个或多个产品/公司进行多维度竞品深度分析，涵盖：核心功能差异、技术架构壁垒、商业模式与定价策略、目标客群与市场口碑优劣势：\n【请在此输入对比标的，如：DeepSeek vs OpenAI】'
  },
  tech: {
    icon: '🔧',
    name: '技术架构选型',
    desc: '深度调研技术路线、生态活跃度与迁移成本',
    prompt: '请对以下技术方案进行深度架构选型与可行性调研，包括：技术演进路线、性能基准指标、社区活跃度与生态成熟度、实施难度与长期维护迁移成本：\n【请在此输入技术选型主题】'
  },
  investment: {
    icon: '💰',
    name: '投资尽调体检',
    desc: '行业天花板、市场规模、竞争壁垒与财务风险',
    prompt: '请对以下企业/赛道进行机构级投资尽调全景分析，包含：行业市场空间(TAM)、上下游产业链格局、核心护城河壁垒、财务健康度与潜在监管/经营风险：\n【请在此输入尽调标的】'
  },
  market: {
    icon: '🌍',
    name: '市场进入策略',
    desc: '政策监管、本地化需求、渠道策略与破局打法',
    prompt: '请为以下业务/产品制定详细的市场进入(Go-To-Market)全景策略，涵盖：宏观政策与合规准入、本地化用户痛点、渠道冷启动与分销打法、增长飞轮与关键里程碑：\n【请在此输入目标市场与业务】'
  },
  academic: {
    icon: '📚',
    name: '前沿学术综述',
    desc: '系统文献综述、关键里程碑论文与未来趋势',
    prompt: '请针对以下前沿科学/技术课题进行系统性学术综述与文献脉络梳理，提炼：核心理论发展脉络、近年来代表性突破论文与方法论演进、当前技术瓶颈与未来5年研发趋势：\n【请在此输入学术研究课题】'
  }
};

function applyPromptTemplate(tid, targetId = 'research-input') {
  const t = PROMPT_TEMPLATES_MAP[tid];
  if (!t) return;
  const inputEl = document.getElementById(targetId);
  if (!inputEl) return;
  inputEl.value = t.prompt;
  inputEl.focus();
  
  // 智能聚焦到括号内的提示文字
  const startPos = t.prompt.indexOf('【');
  const endPos = t.prompt.indexOf('】') + 1;
  if (startPos !== -1 && endPos > startPos) {
    inputEl.setSelectionRange(startPos, endPos);
  }
  closeSlashPromptMenu();
}

function handleSlashPrompt(el, context) {
  const val = el.value;
  const menu = document.getElementById(`slash-prompt-menu-${context}`);
  if (!menu) return;
  
  if (val.trim().startsWith('/') || val.trim() === '') {
    menu.innerHTML = `
      <div class="px-2 py-1 text-[10px] font-bold text-indigo-400 uppercase tracking-wider border-b border-white/5 mb-1">
        ✨ 快捷研报模板（点击直接选用）
      </div>
      ${Object.keys(PROMPT_TEMPLATES_MAP).map(key => {
        const item = PROMPT_TEMPLATES_MAP[key];
        return `
          <div class="slash-prompt-item" onclick="applyPromptTemplate('${key}', '${el.id}')">
            <span class="text-base">${item.icon}</span>
            <div class="min-w-0 flex-1">
              <p class="font-bold text-white leading-none mb-0.5">${escapeHtml(item.name)}</p>
              <p class="text-[10px] text-[var(--text-muted)] truncate">${escapeHtml(item.desc)}</p>
            </div>
          </div>
        `;
      }).join('')}
    `;
    menu.classList.remove('hidden');
  } else {
    menu.classList.add('hidden');
  }
}

function closeSlashPromptMenu() {
  document.querySelectorAll('.slash-prompt-menu').forEach(m => m.classList.add('hidden'));
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('#panel-research') && !e.target.closest('.slash-prompt-menu')) {
    closeSlashPromptMenu();
  }
});


async function translateCard(btn, titleId, descId) {
  const titleEl = document.getElementById(titleId);
  const descEl = document.getElementById(descId);
  if (!descEl) return;
  
  if (btn.dataset.translated === 'true') {
    // 恢复原文
    titleEl.textContent = btn.dataset.origTitle;
    descEl.textContent = btn.dataset.origDesc;
    btn.dataset.translated = 'false';
    btn.innerHTML = '🇨🇳 译为中文';
    btn.classList.remove('bg-indigo-500/20', 'text-indigo-300');
    btn.classList.add('bg-white/5', 'text-slate-400');
    return;
  }
  
  // 保存原文
  if (!btn.dataset.origTitle) btn.dataset.origTitle = titleEl.textContent;
  if (!btn.dataset.origDesc) btn.dataset.origDesc = descEl.textContent;
  
  const origText = btn.dataset.origDesc;
  const origTitle = btn.dataset.origTitle;
  
  btn.disabled = true;
  btn.innerHTML = '<svg class="animate-spin h-3 w-3 inline mr-1" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> 翻译中...';
  
  try {
    const res = await apiCall('/api/translate', {
      method: 'POST',
      body: JSON.stringify({ title: origTitle, text: origText })
    });
    if (res.status === 'success' && res.data) {
      if (res.data.title && titleEl) titleEl.textContent = res.data.title;
      if (res.data.text) descEl.textContent = res.data.text;
      btn.dataset.translated = 'true';
      btn.innerHTML = '🔄 显示原文';
      btn.classList.remove('bg-white/5', 'text-slate-400');
      btn.classList.add('bg-indigo-500/20', 'text-indigo-300');
    } else {
      showToast('翻译异常，请稍后重试', 'error');
      btn.innerHTML = '🇨🇳 译为中文';
    }
  } catch (e) {
    showToast('翻译超时', 'error');
    btn.innerHTML = '🇨🇳 译为中文';
  } finally {
    btn.disabled = false;
  }
}

function cleanSnippetText(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .trim();
}

// ==================== 商探 AI Studio Frontend Core ====================

// 兼容根路径(Vercel/本地8200)与反向代理子路径(/you-insight/)两种部署入口：
const API_BASE = window.location.pathname.startsWith('/you-insight') ? '/you-insight' : '';

let currentTab = 'home';
let currentAdminTab = 'metrics';
let historyData = [];
let historyTotal = 0;
let historyOffset = 0;
const PAGE_SIZE = 50;
let currentSources = [];

// 用户与鉴权状态
let currentUser = null;
let authToken = localStorage.getItem('youinsight_jwt_token') || null;

// ==================== 初始化 ====================
async function init() {
  await checkAuth();
  await loadTemplates();
  await loadHistory();
  updateHistoryBadge();
  
  // 检查 URL 是否带 #restore=ID / #history=ID 或 #admin 等锚点
  const hash = window.location.hash.replace('#', '');
  if (hash.startsWith('restore=') || hash.startsWith('history=')) {
    const histId = parseInt(hash.split('=')[1]);
    if (histId) {
      setTimeout(() => restoreHistory(histId), 200);
    }
  } else if (hash === 'admin') {
    if (currentUser && ['admin', 'super_admin'].includes(currentUser.role)) {
      switchTab('admin');
    } else {
      openAuthModal('login');
      showToast('请登录管理员账号以进入后台', 'info');
    }
  } else if (hash && ['home', 'findall', 'deepresearch', 'intelligence', 'digest', 'research', 'search', 'social', 'news', 'finance', 'contents'].includes(hash)) {
    switchTab(hash);
  } else {
    switchTab('home');
  }

  loadSystemAnnouncement();
  bindAuthEnterKeys();

  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash.replace('#', '');
    if (newHash.startsWith('restore=') || newHash.startsWith('history=')) {
      const hId = parseInt(newHash.split('=')[1]);
      if (hId) restoreHistory(hId);
    } else if (newHash) {
      switchTab(newHash);
    }
  });
}

function bindAuthEnterKeys() {
  const bindings = [
    { id: 'login-account', fn: handleLoginSubmit },
    { id: 'login-password', fn: handleLoginSubmit },
    { id: 'login-code-target', fn: handleLoginSubmit },
    { id: 'login-code-val', fn: handleLoginSubmit },
    { id: 'reg-username', fn: handleRegisterSubmit },
    { id: 'reg-target', fn: handleRegisterSubmit },
    { id: 'reg-code', fn: handleRegisterSubmit },
    { id: 'reg-password', fn: handleRegisterSubmit },
    { id: 'reg-password-confirm', fn: handleRegisterSubmit },
    { id: 'reset-target', fn: handleResetSubmit },
    { id: 'reset-code', fn: handleResetSubmit },
    { id: 'reset-new-password', fn: handleResetSubmit },
    { id: 'reset-confirm-password', fn: handleResetSubmit }
  ];
  bindings.forEach(({ id, fn }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          fn();
        }
      });
    }
  });
}


// 自动向所有受保护的 fetch 附加 JWT Token
async function fetchWithAuth(url, options = {}, ms = 120000, retries = 1) {
  const headers = { ...(options.headers || {}) };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return fetchWithTimeout(url, { ...options, headers }, ms, retries);
}

// 带超时和自动重试的底层网络请求
async function fetchWithTimeout(url, options = {}, ms = 120000, retries = 1) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } catch (e) {
      lastErr = e;
      if (e.name === 'AbortError') throw new Error('请求超时，请稍后重试');
      const isNetworkErr = e.name === 'TypeError' || /Failed to fetch|NetworkError|Load failed/i.test(e.message || '');
      if (isNetworkErr && attempt < retries && (navigator.onLine !== false)) {
        await new Promise(r => setTimeout(r, 800));
        continue;
      }
      if (isNetworkErr) throw new Error('网络连接中断，请检查网络后重试');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

// ==================== 屏幕正中央弹窗提示 (Centered Toast Modal) ====================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  // 清理现有旧弹窗，保持单条中央聚焦
  container.innerHTML = '';
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '⚠️', info: '💡' };
  toast.innerHTML = `<span style="font-size: 1.25rem;">${icons[type] || '✨'}</span><span style="flex: 1;">${escapeHtml(message)}</span>`;
  
  // 点击即可立即关闭
  toast.onclick = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'scale(0.8) translateY(-15px)';
    setTimeout(() => toast.remove(), 250);
  };
  
  container.appendChild(toast);
  
  // 2.5秒后优雅自动消失
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'scale(0.8) translateY(-15px)';
      setTimeout(() => toast.remove(), 250);
    }
  }, 2600);
}

// ==================== 用户认证与状态管理 ====================

async function checkAuth() {
  if (!authToken) {
    currentUser = null;
    renderAuthHeader();
    return;
  }
  try {
    const res = await fetchWithAuth(`${API_BASE}/api/auth/me`, {}, 8000, 0);
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
    } else {
      // Token 过期或无效
      authToken = null;
      localStorage.removeItem('youinsight_jwt_token');
      currentUser = null;
    }
  } catch (e) {
    console.error('Check auth failed:', e);
  }
  renderAuthHeader();
}

function renderAuthHeader() {
  const container = document.getElementById('auth-status-container');
  if (!container) return;

  if (currentUser) {
    const quotaText = currentUser.daily_quota === -1 ? '无限' : `${currentUser.remaining_today}次`;
    const userTier = currentUser.tier || (currentUser.daily_quota >= 400 ? 'pro' : (currentUser.daily_quota >= 100 ? 'standard' : 'basic'));
    const roleBadge = currentUser.role === 'super_admin' ? '👑 超管' : (userTier === 'pro' ? '👑 专业版' : (userTier === 'standard' ? '⚡ 标准版' : '🌱 基础版'));
    
    container.innerHTML = `
      <div class="relative" id="user-dropdown-container">
        <button onclick="toggleUserDropdown(event)" class="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-300 text-xs transition-colors whitespace-nowrap">
          <span>👤</span>
          <span class="font-bold">我的</span>
          <span class="text-[10px]">▾</span>
        </button>
        <div id="user-dropdown-menu" class="user-dropdown hidden">
          <div class="px-3 py-2.5 border-b border-white/10 mb-1">
            <div class="flex items-center justify-between gap-2 mb-1">
              <p class="text-xs font-bold text-white truncate">${escapeHtml(currentUser.username)}</p>
              <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 cursor-pointer" onclick="copyText('${currentUser.uid || ('YI-' + (80260000 + currentUser.id))}')" title="点击复制 UID">
                ${currentUser.uid || ('YI-' + (80260000 + currentUser.id))} 📋
              </span>
            </div>
            <p class="text-[11px] text-[var(--text-muted)]">${roleBadge} · 今日剩余: <span class="text-emerald-400 font-mono font-bold">${quotaText}</span></p>
          </div>
          <a href="profile.html" class="dropdown-item">
            <span>👤</span><span>个人中心</span>
          </a>
          <button onclick="handleLogout()" class="dropdown-item text-rose-400 hover:text-rose-300">
            <span>🚪</span><span>退出登录</span>
          </button>
        </div>
      </div>
    `;
  } else {
    // 游客模式展示
    container.innerHTML = `
      <div class="flex items-center gap-1.5">
        <span class="hidden sm:inline-flex px-2 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-[var(--text-muted)]">
          ⚡ 游客体验模式
        </span>
        <button onclick="openAuthModal('login')" class="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
          <span>🚀</span><span>登录 / 注册</span>
        </button>
      </div>
    `;
  }
}

function toggleUserDropdown(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const menu = document.getElementById('user-dropdown-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

function closeUserDropdown() {
  const menu = document.getElementById('user-dropdown-menu');
  if (menu && !menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
  }
}

document.addEventListener('click', (e) => {
  const container = document.getElementById('user-dropdown-container');
  if (container && !container.contains(e.target)) {
    closeUserDropdown();
  }
});

// ==================== 登录/注册弹窗交互 ====================

function showAuthAlert(msg, type = 'error') {
  const box = document.getElementById('auth-alert-box');
  if (!box) return;
  if (!msg) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }
  box.classList.remove('hidden');
  const styles = {
    error: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
    success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    info: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
  };
  const icons = { error: '⚠️', success: '✅', info: '💡' };
  box.className = `text-xs rounded-xl p-3 mb-4 flex items-center gap-2 border ${styles[type] || styles.info} transition-all`;
  box.innerHTML = `<span>${icons[type] || '✨'}</span><span class="flex-1">${escapeHtml(msg)}</span>`;
}

function openAuthModal(tab = 'login') {
  showAuthAlert('');
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('hidden');
  switchAuthTab(tab);
  requestAnimationFrame(() => {
    const firstField = [...modal.querySelectorAll('input, select')].find(item => !item.closest('.hidden') && item.offsetParent !== null);
    if (firstField) firstField.focus();
  });
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('hidden');
}

document.addEventListener('keydown', (event) => {
  const modal = document.getElementById('auth-modal');
  if (event.key === 'Escape' && modal && !modal.classList.contains('hidden')) closeAuthModal();
});
document.getElementById('auth-modal')?.addEventListener('click', (event) => {
  if (event.target?.id === 'auth-modal') closeAuthModal();
});

function switchAuthTab(tab) {
  showAuthAlert('');
  const tabs = ['login', 'register', 'reset'];
  tabs.forEach(t => {
    const form = document.getElementById(`auth-form-${t}`);
    const tabBtn = document.getElementById(`auth-tab-btn-${t}`);
    if (form) form.classList.toggle('hidden', t !== tab);
    if (tabBtn) tabBtn.classList.toggle('active', t === tab);
  });

  const mainTabs = document.getElementById('auth-main-tabs');
  const title = document.getElementById('auth-modal-title');
  const subtitle = document.getElementById('auth-modal-subtitle');

  if (tab === 'reset') {
    if (mainTabs) mainTabs.classList.add('hidden');
    if (title) title.textContent = '🔒 重置登录密码';
    if (subtitle) subtitle.textContent = '输入绑定的手机号或邮箱接收验证码';
  } else {
    if (mainTabs) mainTabs.classList.remove('hidden');
    if (title) title.textContent = '欢迎使用 商探 AI';
    if (subtitle) subtitle.textContent = tab === 'login' ? '登录后解锁每日 10 次额度与云端研报漫游' : '注册即送每日 10 次免费深度研报额度';
  }
}

function toggleLoginMode(mode) {
  const pwFields = document.getElementById('login-fields-password');
  const codeFields = document.getElementById('login-fields-code');
  if (mode === 'password') {
    pwFields?.classList.remove('hidden');
    codeFields?.classList.add('hidden');
  } else {
    pwFields?.classList.add('hidden');
    codeFields?.classList.remove('hidden');
  }
}

function togglePasswordVisibility(inputId) {
  const el = document.getElementById(inputId);
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
}

// 密码强度检测 (弱/中/强)
function checkPasswordStrength(password) {
  if (!password) return { score: 0, text: '', color: '', textColor: '', width: '0%' };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { score: 1, text: '弱', color: 'bg-rose-500', textColor: 'text-rose-400', width: '25%' };
  } else if (score <= 3) {
    return { score: 2, text: '中等', color: 'bg-amber-500', textColor: 'text-amber-400', width: '60%' };
  } else {
    return { score: 3, text: '强', color: 'bg-emerald-500', textColor: 'text-emerald-400', width: '100%' };
  }
}

function onPasswordInput(pwdId, confirmId, barId, textId, hintId) {
  const pwd = document.getElementById(pwdId)?.value || '';
  const bar = document.getElementById(barId);
  const container = bar?.parentElement;
  const text = document.getElementById(textId);
  
  if (!pwd) {
    if (container) container.classList.add('hidden');
    if (text) text.textContent = '';
  } else {
    const res = checkPasswordStrength(pwd);
    if (container) container.classList.remove('hidden');
    if (bar) {
      bar.className = `h-full transition-all duration-300 ${res.color}`;
      bar.style.width = res.width;
    }
    if (text) {
      text.className = `text-[11px] font-medium ${res.textColor}`;
      text.textContent = `强度: ${res.text}`;
    }
  }
  onPasswordConfirmInput(pwdId, confirmId, hintId);
}

function onPasswordConfirmInput(pwdId, confirmId, hintId) {
  const pwd = document.getElementById(pwdId)?.value || '';
  const confirm = document.getElementById(confirmId)?.value || '';
  const hint = document.getElementById(hintId);
  const confirmInput = document.getElementById(confirmId);
  
  if (!hint || !confirm) {
    if (hint) hint.classList.add('hidden');
    if (confirmInput) confirmInput.classList.remove('border-rose-500', 'border-emerald-500');
    return;
  }
  
  hint.classList.remove('hidden');
  if (pwd === confirm) {
    hint.className = 'text-[11px] mt-1 text-emerald-400 flex items-center gap-1';
    hint.innerHTML = '<span>✓</span><span>两次输入的密码一致</span>';
    if (confirmInput) {
      confirmInput.classList.remove('border-rose-500');
      confirmInput.classList.add('border-emerald-500/60');
    }
  } else {
    hint.className = 'text-[11px] mt-1 text-rose-400 flex items-center gap-1';
    hint.innerHTML = '<span>✕</span><span>两次输入的密码不一致</span>';
    if (confirmInput) {
      confirmInput.classList.remove('border-emerald-500');
      confirmInput.classList.add('border-rose-500/60');
    }
  }
}

// 倒计时获取验证码
async function sendAuthCode(targetInputId, btnId, codeType) {
  const target = document.getElementById(targetInputId)?.value.trim();
  if (!target) {
    showToast('请输入 11 位手机号或邮箱地址', 'info');
    return;
  }
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.disabled = true;
    btn.textContent = '发送中...';
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, code_type: codeType })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || data.message || '验证码下发失败');
    }

    showToast(data.message || '验证码已成功下发！', 'success');
    showAuthAlert(data.message || '验证码已成功发送！', 'success');

    // 60秒倒计时
    let countdown = 60;
    if (btn) {
      btn.textContent = `${countdown}s 后重新获取`;
      const interval = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(interval);
          btn.disabled = false;
          btn.textContent = '获取验证码';
        } else {
          btn.textContent = `${countdown}s 后重新获取`;
        }
      }, 1000);
    }
  } catch (err) {
    showToast(err.message || '发送失败，请重试', 'error');
    showAuthAlert(err.message || '发送失败，请重试', 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '获取验证码';
    }
  }
}

// 登录提交 (支持 账号密码 / 手机验证码 / 邮箱验证码 三选一)
async function handleLoginSubmit() {
  const mode = document.querySelector('input[name="login_mode"]:checked')?.value || 'password';
  const submitBtn = document.getElementById('btn-login-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = '正在登录...';

  let payload = { mode };
  if (mode === 'password') {
    payload.account = document.getElementById('login-account')?.value.trim();
    payload.password = document.getElementById('login-password')?.value;
  } else {
    payload.target = document.getElementById('login-code-target')?.value.trim();
    payload.code = document.getElementById('login-code-val')?.value.trim();
  }

  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 15000, 0);

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '登录失败');

    authToken = data.token;
    localStorage.setItem('youinsight_jwt_token', authToken);
    currentUser = data.user;
    renderAuthHeader();
    closeAuthModal();
    showToast(`欢迎回来，${currentUser.username}！`, 'success');
    await loadHistory();
  } catch (err) {
    showToast(err.message, 'error');
    showAuthAlert(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '🚀 立即登录 ↗';
  }
}

// 注册提交 (短信/邮件验证码 二选一 + 密码与确认密码 + 可选用户名)
async function handleRegisterSubmit() {
  const target = document.getElementById('reg-target')?.value.trim();
  const code = document.getElementById('reg-code')?.value.trim();
  const password = document.getElementById('reg-password')?.value;
  const passwordConfirm = document.getElementById('reg-password-confirm')?.value;
  const username = document.getElementById('reg-username')?.value.trim();
  const submitBtn = document.getElementById('btn-reg-submit');

  if (!target || !code || !password || !passwordConfirm) {
    showToast('请完整填写账号、验证码及两次密码', 'info');
    showAuthAlert('请完整填写账号、验证码及两次密码', 'error');
    return;
  }
  if (password.length < 6) {
    showToast('密码长度至少 6 位', 'info');
    showAuthAlert('密码长度至少 6 位', 'error');
    document.getElementById('reg-password')?.focus();
    return;
  }
  if (password !== passwordConfirm) {
    showToast('两次输入的密码不一致，请重新确认', 'error');
    showAuthAlert('两次输入的密码不一致，请重新确认', 'error');
    document.getElementById('reg-password-confirm')?.focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = '正在注册并登录...';

  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, code, password, username: username || null })
    }, 15000, 0);

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '注册失败');

    authToken = data.token;
    localStorage.setItem('youinsight_jwt_token', authToken);
    currentUser = data.user;
    renderAuthHeader();
    closeAuthModal();
    showToast(`注册成功！欢迎探索智能研报，${currentUser.username}！`, 'success');
    await loadHistory();
  } catch (err) {
    showToast(err.message, 'error');
    showAuthAlert(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '✨ 立即注册并登录 ↗';
  }
}

// 重置密码提交 (验证码 + 新密码与确认新密码)
async function handleResetSubmit() {
  const target = document.getElementById('reset-target')?.value.trim();
  const code = document.getElementById('reset-code')?.value.trim();
  const new_password = document.getElementById('reset-new-password')?.value;
  const confirm_password = document.getElementById('reset-confirm-password')?.value;
  const submitBtn = document.getElementById('btn-reset-submit');

  if (!target || !code || !new_password || !confirm_password) {
    showToast('请完整填写所有信息及确认密码', 'info');
    showAuthAlert('请完整填写所有信息及确认密码', 'error');
    return;
  }
  if (new_password.length < 6) {
    showToast('新密码长度不能少于 6 位', 'info');
    showAuthAlert('新密码长度不能少于 6 位', 'error');
    document.getElementById('reset-new-password')?.focus();
    return;
  }
  if (new_password !== confirm_password) {
    showToast('两次输入的新密码不一致，请核对', 'error');
    showAuthAlert('两次输入的新密码不一致，请核对', 'error');
    document.getElementById('reset-confirm-password')?.focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = '正在重置...';

  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, code, new_password })
    }, 15000, 0);

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '重置失败');

    showToast('密码已重置成功，请使用新密码登录', 'success');
    switchAuthTab('login');
    const loginAcc = document.getElementById('login-account');
    if (loginAcc) loginAcc.value = target;
    const loginPw = document.getElementById('login-password');
    if (loginPw) { loginPw.value = ''; loginPw.focus(); }
    showAuthAlert('密码已重置成功，请直接登录', 'success');
  } catch (err) {
    showToast(err.message, 'error');
    showAuthAlert(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '🔒 重置密码并登录 ↗';
  }
}

// 退出登录
function handleLogout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('youinsight_jwt_token');
  renderAuthHeader();
  closeProfileModal();
  
  // 检查 URL 是否带 #restore=ID / #history=ID 或 #admin 等锚点
  const hash = window.location.hash.replace('#', '');
  if (hash.startsWith('restore=') || hash.startsWith('history=')) {
    const histId = parseInt(hash.split('=')[1]);
    if (histId) {
      setTimeout(() => restoreHistory(histId), 200);
    }
  } else if (hash === 'admin') {
    if (currentUser && ['admin', 'super_admin'].includes(currentUser.role)) {
      switchTab('admin');
    } else {
      openAuthModal('login');
      showToast('请登录管理员账号以进入后台', 'info');
    }
  } else if (hash && ['home', 'findall', 'deepresearch', 'intelligence', 'digest', 'research', 'search', 'social', 'news', 'finance', 'contents'].includes(hash)) {
    switchTab(hash);
  } else {
    switchTab('home');
  }

  showToast('已安全退出登录', 'info');
}

// ==================== 个人中心弹窗 ====================

function openProfileModal() {
  if (!currentUser) return;
  closeUserDropdown();
  const modal = document.getElementById('profile-modal');
  document.getElementById('prof-username').textContent = currentUser.username;
  document.getElementById('prof-phone').textContent = currentUser.phone || '未绑定';
  document.getElementById('prof-email').textContent = currentUser.email || '未绑定';
  document.getElementById('prof-role').textContent = currentUser.role === 'super_admin' ? '超级管理员 (无限额度)' : (currentUser.role === 'admin' ? '运营管理员' : '正式会员');
  document.getElementById('prof-quota').textContent = currentUser.daily_quota === -1 ? '无限次 / 终身畅享' : `${currentUser.remaining_today} 次 (每日 ${currentUser.daily_quota} 次)`;
  document.getElementById('prof-edit-username').value = currentUser.username;
  if (modal) modal.classList.remove('hidden');
}

function closeProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (modal) modal.classList.add('hidden');
}

async function saveProfileUsername() {
  const newUsername = document.getElementById('prof-edit-username')?.value.trim();
  if (!newUsername) return;
  try {
    const res = await fetchWithAuth(`${API_BASE}/api/auth/update-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername })
    }, 10000, 0);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '更新失败');
    currentUser.username = newUsername;
    renderAuthHeader();
    document.getElementById('prof-username').textContent = newUsername;
    showToast('个性用户名已更新！', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==================== 系统管理后台 (Admin Functions) ====================

function switchAdminTab(tab) {
  currentAdminTab = tab;
  ['metrics', 'users', 'logs', 'settings'].forEach(t => {
    const view = document.getElementById(`admin-view-${t}`);
    const tabBtn = document.getElementById(`admin-tab-${t}`);
    if (view) view.classList.toggle('hidden', t !== tab);
    if (tabBtn) tabBtn.classList.toggle('active', t === tab);
  });
  if (tab === 'metrics') loadAdminMetrics();
  else if (tab === 'users') loadAdminUsers();
  else if (tab === 'logs') loadAdminLogs();
  else if (tab === 'settings') loadAdminSettings();
}

async function loadAdminData() {
  switchAdminTab(currentAdminTab);
  showToast('管理后台数据已刷新', 'info');
}

async function loadAdminMetrics() {
  try {
    const res = await fetchWithAuth(`${API_BASE}/api/admin/metrics`);
    if (!res.ok) return;
    const { data } = await res.json();
    document.getElementById('adm-metric-total-users').textContent = data.total_users;
    document.getElementById('adm-metric-today-users').textContent = data.today_users;
    document.getElementById('adm-metric-total-gens').textContent = data.total_generations;
    document.getElementById('adm-metric-today-gens').textContent = data.today_generations;
    document.getElementById('adm-metric-sms-sent').textContent = data.total_sms_sent;
    document.getElementById('adm-metric-email-sent').textContent = data.total_emails_sent;

    const statsContainer = document.getElementById('adm-module-stats');
    if (data.module_stats && data.module_stats.length > 0) {
      statsContainer.innerHTML = data.module_stats.map(m => `
        <div class="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] text-xs">
          <span class="font-medium text-white">${escapeHtml(m.type)}</span>
          <span class="font-mono text-indigo-400 font-bold">${m.count} 次生成</span>
        </div>
      `).join('');
    }
  } catch (e) { console.error(e); }
}

let userSearchTimer = null;
function handleAdminUserSearch() {
  clearTimeout(userSearchTimer);
  userSearchTimer = setTimeout(() => {
    const q = document.getElementById('adm-user-search')?.value.trim();
    loadAdminUsers(q);
  }, 400);
}

async function loadAdminUsers(query = '') {
  try {
    const res = await fetchWithAuth(`${API_BASE}/api/admin/users?query=${encodeURIComponent(query)}`);
    if (!res.ok) return;
    const data = await res.json();
    const tbody = document.getElementById('adm-users-table-body');
    if (!data.users || data.users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-[var(--text-muted)]">未找到用户</td></tr>`;
      return;
    }
    tbody.innerHTML = data.users.map(u => `
      <tr class="hover:bg-[var(--surface-tertiary)] transition-colors">
        <td class="p-3 font-mono text-[var(--text-muted)]">#${u.id}</td>
        <td class="p-3 font-bold text-white">${escapeHtml(u.username)}</td>
        <td class="p-3 font-mono text-slate-300">${escapeHtml(u.phone || u.email || '—')}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded text-[11px] ${u.role === 'super_admin' ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'}">${u.role}</span></td>
        <td class="p-3 font-mono text-emerald-400">${u.daily_quota === -1 ? '无限' : u.daily_quota + '次/天'}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded text-[11px] ${u.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">${u.is_active ? '正常' : '已封禁'}</span></td>
        <td class="p-3 text-[var(--text-muted)]">${u.created_at || '—'}</td>
        <td class="p-3 text-right space-x-1">
          <button onclick="adminChangeQuota(${u.id}, 50)" class="btn-secondary text-[11px] py-1 px-2">加50次</button>
          <button onclick="adminChangeQuota(${u.id}, -1)" class="btn-secondary text-[11px] py-1 px-2 text-amber-300">无限</button>
          <button onclick="adminToggleStatus(${u.id})" class="btn-secondary text-[11px] py-1 px-2 ${u.is_active ? 'text-rose-400' : 'text-emerald-400'}">${u.is_active ? '封禁' : '解封'}</button>
        </td>
      </tr>
    `).join('');
  } catch (e) { console.error(e); }
}

async function adminChangeQuota(uid, quota) {
  try {
    const res = await fetchWithAuth(`${API_BASE}/api/admin/users/${uid}/quota`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_quota: quota })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '修改失败');
    showToast(data.message, 'success');
    loadAdminUsers();
  } catch (err) { showToast(err.message, 'error'); }
}

async function adminToggleStatus(uid) {
  try {
    const res = await fetchWithAuth(`${API_BASE}/api/admin/users/${uid}/status`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '操作失败');
    showToast(data.message, 'success');
    loadAdminUsers();
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadAdminLogs() {
  try {
    const res = await fetchWithAuth(`${API_BASE}/api/admin/logs`);
    if (!res.ok) return;
    const data = await res.json();
    const tbody = document.getElementById('adm-logs-table-body');
    if (!data.logs || data.logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-[var(--text-muted)]">暂无调用日志</td></tr>`;
      return;
    }
    tbody.innerHTML = data.logs.map(l => `
      <tr class="hover:bg-[var(--surface-tertiary)] transition-colors">
        <td class="p-3 text-[var(--text-muted)] font-mono">${l.created_at}</td>
        <td class="p-3 font-bold text-white">${escapeHtml(l.username || '游客')}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded text-[11px] bg-purple-500/20 text-purple-300">${escapeHtml(l.type)}</span></td>
        <td class="p-3 max-w-xs truncate text-slate-200" title="${escapeHtml(l.title)}">${escapeHtml(l.title)}</td>
        <td class="p-3 font-mono text-cyan-300">${l.duration_ms}ms</td>
        <td class="p-3"><span class="px-1.5 py-0.5 rounded text-[10px] ${l.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}">${l.status}</span></td>
        <td class="p-3 font-mono text-[var(--text-muted)]">${escapeHtml(l.ip)}</td>
      </tr>
    `).join('');
  } catch (e) { console.error(e); }
}

async function loadAdminSettings() {
  try {
    const res = await fetchWithAuth(`${API_BASE}/api/admin/settings`);
    if (!res.ok) return;
    const { settings } = await res.json();
    if (settings.guest_daily_limit) document.getElementById('adm-set-guest-limit').value = settings.guest_daily_limit;
    if (settings.default_user_quota) document.getElementById('adm-set-user-quota').value = settings.default_user_quota;
    if (settings.announcement !== undefined) document.getElementById('adm-set-announcement').value = settings.announcement;
  } catch (e) { console.error(e); }
}

async function saveAdminSettings() {
  const guest_daily_limit = document.getElementById('adm-set-guest-limit')?.value;
  const default_user_quota = document.getElementById('adm-set-user-quota')?.value;
  const announcement = document.getElementById('adm-set-announcement')?.value;
  try {
    const res = await fetchWithAuth(`${API_BASE}/api/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { guest_daily_limit, default_user_quota, announcement } })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '保存失败');
    showToast('系统策略配置已生效！', 'success');
    loadSystemAnnouncement();
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadSystemAnnouncement() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/system/announcement`, {}, 15000);
    const data = await res.json();
    const text = data?.data?.announcement;
    const banner = document.getElementById('system-announcement-banner');
    const content = document.getElementById('announcement-text');
    if (banner && content && text) {
      content.textContent = text;
      banner.classList.remove('hidden');
    }
  } catch (e) {}
}

// ==================== 页面导航与 4 大核心 Tab 切换 (Tier-1 SaaS 架构) ====================

let currentIntelSubtab = 'research';

function switchTab(tabId) {
  currentTab = tabId;
  
  // 4 大核心导航定义与映射
  const coreTabs = ['home', 'findall', 'deepresearch', 'intelligence'];
  const allPanels = ['home', 'findall', 'deepresearch', 'intelligence', 'digest', 'research', 'search', 'social', 'news', 'finance', 'contents', 'admin'];
  
  // 处理子标签路由重定向至 intelligence
  let activeNavTab = tabId;
  if (['research', 'finance', 'social', 'digest', 'search', 'news', 'contents'].includes(tabId)) {
    activeNavTab = 'intelligence';
    currentIntelSubtab = (tabId === 'search' || tabId === 'contents') ? 'research' : (tabId === 'news' ? 'digest' : tabId);
  }

  // 1. 切换侧边栏与底部高亮
  coreTabs.forEach(id => {
    const tabBtn = document.getElementById(`tab-${id}`);
    const mobTabBtn = document.getElementById(`mob-tab-${id}`);
    const mobDrawerBtn = document.getElementById(`mob-drawer-${id}`);
    if (tabBtn) tabBtn.classList.toggle('active', id === activeNavTab);
    if (mobTabBtn) mobTabBtn.classList.toggle('active', id === activeNavTab);
    if (mobDrawerBtn) mobDrawerBtn.classList.toggle('active', id === activeNavTab);
  });

  // 2. 切换主面板展示
  if (activeNavTab === 'intelligence') {
    // 隐藏其它主面板，显示 panel-intelligence
    ['home', 'findall', 'deepresearch', 'admin'].forEach(pId => {
      const p = document.getElementById(`panel-${pId}`);
      if (p) p.classList.add('hidden');
    });
    const intelPanel = document.getElementById('panel-intelligence');
    if (intelPanel) intelPanel.classList.remove('hidden');
    switchIntelSubtab(currentIntelSubtab);
  } else {
    // 隐藏 panel-intelligence 及子面板，显示对应主面板
    allPanels.forEach(id => {
      const panel = document.getElementById(`panel-${id}`);
      if (panel) panel.classList.toggle('hidden', id !== tabId);
    });
  }

  if (tabId === 'admin') loadAdminData();
  history.replaceState(null, '', `#${tabId}`);
}

function switchIntelSubtab(subId) {
  currentIntelSubtab = subId;
  const subtabs = ['research', 'finance', 'social', 'digest'];
  
  // 1. 切换顶部子胶囊按钮样式
  subtabs.forEach(id => {
    const btn = document.getElementById(`subtab-${id}`);
    if (btn) {
      if (id === subId) {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-indigo-600 text-white shadow-sm';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-all';
      }
    }
  });

  // 2. 将对应的子 section 挂载/展示在 intel-subview-content 容器中
  subtabs.forEach(id => {
    const panel = document.getElementById(`panel-${id}`);
    if (panel) panel.classList.toggle('hidden', id !== subId);
  });

  // 辅助独立面板
  const searchPanel = document.getElementById('panel-search');
  const newsPanel = document.getElementById('panel-news');
  const contentsPanel = document.getElementById('panel-contents');
  if (searchPanel) searchPanel.classList.add('hidden');
  if (newsPanel) newsPanel.classList.add('hidden');
  if (contentsPanel) contentsPanel.classList.add('hidden');
}

// ==================== 智能工作台 · AI 意图自动识别与分流路由引擎 ====================

function detectQueryIntent(q) {
  const query = (q || '').trim();

  // 1. URL 链接提取
  if (/^https?:\/\//i.test(query)) {
    return { type: 'contents', label: '正文结构化提取', badge: '🌐 网页直提', action: 'extract' };
  }

  // 2. 实体与商机挖掘 (FindAll)
  // 识别找公司、找供应商、名单大表、排名清单、企查查穿透需求
  const isEntity = /(?:找|挖掘|搜集|列出|盘点|推荐|梳理|查询|汇总|寻找|有哪些)?(?:核心|重点|头部|排名前|前[0-9一二三四五六七八九十百]+|TOP\s*[0-9]+)?[^，。！？\n]*(?:公司|企业|厂商|供应商|标的|服务商|品牌|竞品|机构|高校|团队|名单|清单|大表|名单列表|从业者|上下游)/i.test(query)
    || /(?:供应商|代工厂|整机厂|核心企业|产业链企业|主要玩家|谁在做|制造厂商)/i.test(query)
    || /^[0-9一二三四五六七八九十百]+\s*(?:家|个)[^，。！？\n]*(?:公司|企业|供应商|品牌)/i.test(query);

  // 3. 长程深度调研 Agent (Deep Research)
  // 识别多步深度调研、跨公司对比大表、系统性全景调研
  const isDeepResearch = /(?:长程|深度调研|多步|对比大表|横向对比|全维度对比|多维对比|产业链深度调研|全面系统调研|系统性梳理|全景调研|对比分析大表|万字报告)/i.test(query)
    || (query.length > 35 && /(?:对比|横评|优缺点|深度测评|各家.*差异|优劣势)/i.test(query));

  // 4. 社媒声量与舆情 (Social)
  // 识别小红书、微博、B站、用户评价、口碑舆情
  const isSocial = /(?:小红书|微博|B站|bilibili|抖音|快手|知乎|公众号|社媒|社交媒体|舆情|声量|口碑|差评|好评|网友评价|真实评价|吐槽|风评)/i.test(query);

  // 5. 企业财报洞察 (Finance)
  // 识别财报、营收、利润、资产负债、估值分析
  const isFinance = /(?:财报|年报|季报|中报|财务报表|营收|营业收入|净利润|毛利|资产负债|现金流|估值分析|财务指标|经营业绩|EPS|PE|PB)/i.test(query);

  // 6. 行业早报 (Digest)
  const isDigest = /(?:早报|晨报|今日动态|今日简报|每日快讯|行业早报|最新动态追踪)/i.test(query);

  if (isEntity && !isDeepResearch) {
    return { type: 'findall', label: '🎯 实体与商机挖掘', badge: 'Parallel FindAll 引擎', desc: '已自动识别为【商业实体挖掘】意图，正在批量提炼商业标的大表...' };
  } else if (isDeepResearch) {
    return { type: 'deepresearch', label: '🤖 AI 长程深度调研', badge: 'Parallel Task Agent', desc: '已自动识别为【长程深度调研】意图，AI Agent 正在全网自主多步调研...' };
  } else if (isSocial) {
    return { type: 'social', label: '💬 社媒声量与舆情', badge: 'Social Search 引擎', desc: '已自动识别为【社媒声量与舆情】意图，正在检索全网真实口碑...' };
  } else if (isFinance) {
    return { type: 'finance', label: '📑 企业财报洞察', badge: 'Financial Intelligence', desc: '已自动识别为【企业财报洞察】意图，正在调阅权威财务数据...' };
  } else if (isDigest) {
    return { type: 'digest', label: '📰 行业情报早报', badge: 'Daily Intelligence', desc: '已自动识别为【行业早报定制】意图，正在汇总过去 24 小时动态...' };
  } else {
    // 默认通用深度商业研报
    return { type: 'research', label: '📊 商业深度研报', badge: 'Research Engine', desc: '已自动识别为【商业深度研报】意图，正在多源交叉验证生成研报...' };
  }
}

function setHomeSearch(query, preferredType) {
  const input = document.getElementById('global-search');
  if (input) {
    input.value = query;
    handleGlobalSearch(preferredType);
  }
}

async function handleGlobalSearch(forcedType) {
  const input = document.getElementById('global-search');
  const query = input?.value.trim();
  if (!query) {
    showToast('请输入您的商业调研或挖掘需求', 'info');
    input?.focus();
    return;
  }

  const intent = forcedType ? { type: forcedType, label: forcedType, desc: '正在调度专属引擎...' } : detectQueryIntent(query);
  showToast(`✨ ${intent.label}：已自动识别意图并调度引擎`, 'info');

  if (intent.type === 'findall') {
    switchTab('findall');
    const findallInput = document.getElementById('findall-topic-input');
    if (findallInput) {
      findallInput.value = query;
      executeFindAll();
    }
  } else if (intent.type === 'deepresearch') {
    switchTab('deepresearch');
    const drInput = document.getElementById('deepresearch-input');
    if (drInput) {
      drInput.value = query;
      executeDeepResearchStream();
    }
  } else if (intent.type === 'social') {
    switchTab('social');
    const socInput = document.getElementById('social-input');
    if (socInput) {
      socInput.value = query;
      executeSocial();
    }
  } else if (intent.type === 'finance') {
    switchTab('finance');
    const finInput = document.getElementById('finance-input');
    if (finInput) {
      finInput.value = query;
      executeFinanceStream();
    }
  } else if (intent.type === 'digest') {
    switchTab('digest');
    const digInput = document.getElementById('digest-input');
    if (digInput) {
      digInput.value = query;
      executeDigest();
    }
  } else if (intent.type === 'contents') {
    switchTab('contents');
    const contInput = document.getElementById('contents-input');
    if (contInput) {
      contInput.value = query;
      executeContents();
    }
  } else {
    // Standard commercial research
    switchTab('research');
    const resInput = document.getElementById('research-input');
    if (resInput) {
      resInput.value = query;
      executeResearchStream();
    }
  }
}

function quickStart(templateId) {
  const templates = {
    competitor: '请对比分析以下产品/公司的核心功能、定价策略、技术架构和市场定位：',
    tech: '请深度调研以下技术方案的优缺点、适用场景、社区活跃度和迁移成本：',
    investment: '请对以下公司/赛道进行投资尽调分析，包括市场规模、竞争格局、核心壁垒和风险因素：',
    market: '请分析以下市场的进入策略，包括监管环境、本地化需求、渠道建设和增长机会：',
    academic: '请对以下研究方向进行系统性文献综述，梳理发展脉络、关键突破和未来趋势：'
  };
  switchTab('research');
  const input = document.getElementById('research-input');
  if (input) input.value = templates[templateId] || '';
  showToast('已填充场景模板，请补充具体公司或标的', 'info');
}

async function loadTemplates() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/templates`, {}, 15000);
    const data = await res.json();
    const list = document.getElementById('template-list');
    if (!list) return;
    list.innerHTML = '';
    data.data?.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'w-full text-left px-3 py-2 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] hover:text-white transition-colors';
      btn.innerHTML = `<span class="mr-2">${t.icon}</span>${escapeHtml(t.name)}`;
      btn.onclick = () => quickStart(t.id);
      list.appendChild(btn);
    });
  } catch (e) { console.error('Load templates failed:', e); }
}

async function loadHistory(append = false) {
  try {
    if (!authToken) {
      historyData = [];
      historyTotal = 0;
      renderHistoryList(historyData);
      renderRecentHistory();
      updateHistoryBadge();
      return;
    }
    const res = await fetchWithAuth(`${API_BASE}/api/history?limit=${PAGE_SIZE}&offset=${historyOffset}`, {}, 15000);
    const data = await res.json();
    const items = data.data || [];
    historyTotal = data.total || items.length;
    historyData = append ? historyData.concat(items) : items;
    renderHistoryList(historyData);
    renderRecentHistory();
    const moreBtn = document.getElementById('history-load-more');
    if (moreBtn) moreBtn.classList.toggle('hidden', historyData.length >= historyTotal);
  } catch (e) { console.error('Load history failed:', e); }
}

async function loadMoreHistory() {
  historyOffset += PAGE_SIZE;
  await loadHistory(true);
}

function renderRecentHistory() {
  const container = document.getElementById('recent-history');
  if (!container) return;
  const recent = historyData.slice(0, 5);
  if (recent.length === 0) {
    container.innerHTML = '<p class="text-sm text-[var(--text-muted)]">暂无研究记录</p>';
    return;
  }
  container.innerHTML = recent.map(h => `
    <div class="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-tertiary)] hover:bg-[var(--surface-card)] transition-colors cursor-pointer" onclick="restoreHistory(${h.id})">
      <div class="flex items-center gap-3 min-w-0">
        <span class="text-lg">${getTypeIcon(h.type)}</span>
        <div class="min-w-0">
          <p class="text-sm font-medium text-white truncate">${escapeHtml(h.title)}</p>
          <p class="text-xs text-[var(--text-muted)]">${formatTime(h.created_at)}</p>
        </div>
      </div>
      <button onclick="event.stopPropagation(); deleteHistory(${h.id})" class="text-[var(--text-muted)] hover:text-rose-400 p-1" title="删除">🗑️</button>
    </div>
  `).join('');
}

function getTypeIcon(type) {
  const icons = { '行业早报': '📰', '深度研报': '🧠', '实时搜索': '🔍', '企业财报': '📈', '正文提取': '📑', '新闻流': '📡' };
  return icons[type] || '📄';
}

function formatTime(ts) {
  if (!ts) return '';
  const iso = String(ts).replace(' ', 'T');
  const d = new Date(iso);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function renderHistoryList(items) {
  const list = document.getElementById('history-list');
  if (!list) return;
  if (items.length === 0) {
    list.innerHTML = '<p class="text-sm text-[var(--text-muted)] text-center py-8">暂无历史记录</p>';
    return;
  }
  list.innerHTML = items.map(h => `
    <div class="p-3 rounded-lg bg-[var(--surface-tertiary)] hover:bg-[var(--surface-card)] transition-colors cursor-pointer" onclick="restoreHistory(${h.id})">
      <div class="flex items-center gap-2 mb-1">
        <span>${getTypeIcon(h.type)}</span>
        <span class="text-xs text-[var(--text-muted)]">${escapeHtml(h.type)}</span>
      </div>
      <p class="text-sm font-medium text-white mb-1 line-clamp-2">${escapeHtml(h.title)}</p>
      <p class="text-xs text-[var(--text-muted)]">${formatTime(h.created_at)}</p>
    </div>
  `).join('');
}

function filterHistory() {
  const query = document.getElementById('history-search')?.value.toLowerCase() || '';
  const filtered = historyData.filter(h => h.title?.toLowerCase().includes(query) || h.excerpt?.toLowerCase().includes(query));
  renderHistoryList(filtered);
}

async function saveHistory(type, title, content, sources = '') {
  try {
    const safeContent = typeof content === 'string' ? content.slice(0, 200000) : JSON.stringify(content).slice(0, 200000);
    await fetchWithAuth(`${API_BASE}/api/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title: String(title || '').slice(0, 300), content: safeContent, sources: typeof sources === 'string' ? sources : JSON.stringify(sources || []) })
    }, 15000);
    historyOffset = 0;
    await loadHistory();
    updateHistoryBadge();
  } catch (e) { console.error('Save history failed:', e); }
}

async function deleteHistory(id) {
  if (!confirm('确定删除这条历史记录？删除后不可恢复。')) return;
  try {
    await fetchWithAuth(`${API_BASE}/api/history/${id}`, { method: 'DELETE' }, 15000);
    historyOffset = 0;
    await loadHistory();
    updateHistoryBadge();
    showToast('已删除', 'success');
  } catch (e) { showToast('删除失败', 'error'); }
}

function updateHistoryBadge() {
  const badge = document.getElementById('history-count-badge');
  if (badge) badge.textContent = historyTotal > 99 ? '99+' : historyTotal;
}

function toggleHistoryDrawer() {
  const drawer = document.getElementById('history-drawer');
  const overlay = document.getElementById('history-overlay');
  const isOpen = !drawer.classList.contains('translate-x-full');
  if (isOpen) { drawer.classList.add('translate-x-full'); overlay.classList.add('hidden'); }
  else { drawer.classList.remove('translate-x-full'); overlay.classList.remove('hidden'); }
}

async function restoreHistory(id) {
  const summary = historyData.find(h => h.id === id);
  if (!summary) return;
  let full = summary;
  try {
    const res = await fetchWithAuth(`${API_BASE}/api/history/${id}`, {}, 20000);
    const data = await res.json();
    if (res.ok && data.data) full = data.data;
  } catch (e) { showToast('详情加载失败，仅恢复摘要', 'info'); }

  const type = full.type;
  const panelMap = {
    '行业早报': 'digest',
    '深度研报': 'research',
    '实时搜索': 'search',
    '实体挖掘': 'findall',
    '长程调研': 'deepresearch',
    '企业穿透': 'findall',
    '社媒舆情': 'social',
    '企业财报': 'finance',
    '正文提取': 'contents',
    '新闻流': 'news'
  };
  const panel = panelMap[type] || 'research';
  switchTab(panel);

  const inputEl = document.getElementById(`${panel}-input`) || document.getElementById('social-keyword-input');
  if (inputEl) inputEl.value = full.title || '';
  const empty = document.getElementById(`${panel}-empty`);
  const result = document.getElementById(`${panel}-result`);
  const progress = document.getElementById(`${panel}-progress`);
  empty?.classList.add('hidden'); progress?.classList.add('hidden'); result?.classList.remove('hidden');

  try {
    if (type === '行业早报' || type === '深度研报' || type === '长程调研') {
      let targetElId = type === '行业早报' ? 'digest-content' : (type === '深度研报' ? 'research-content' : 'deepresearch-content');
      let targetEl = document.getElementById(targetElId);
      if (targetEl) {
        let mdText = full.content || full.excerpt || '';
        let heroHtml = '';
        try {
          const parsed = typeof full.content === 'string' && full.content.startsWith('{') ? JSON.parse(full.content) : (typeof full.content === 'object' ? full.content : null);
          if (parsed) {
            if (parsed.markdown || parsed.content) mdText = parsed.markdown || parsed.content;
            if (parsed.image_url) heroHtml = renderAiHeroImage(parsed.image_url, `【${full.title}】AI 商业全景信息图`);
          }
        } catch(e) {}
        targetEl.innerHTML = heroHtml + renderMarkdown(mdText);
      }
      if (type === '深度研报') {
        const sourcesEl = document.getElementById('research-sources');
        let sources = [];
        try { sources = full.sources ? JSON.parse(full.sources) : []; } catch (e) { sources = []; }
        currentSources = sources;
        renderSources(sourcesEl, sources);
      } else if (type === '长程调研') {
        const sourcesEl = document.getElementById('deepresearch-sources');
        let sources = [];
        try { sources = full.sources ? JSON.parse(full.sources) : []; } catch (e) { sources = []; }
        if (sourcesEl) renderSources(sourcesEl, sources);
      } else if (type === '行业早报') {
        const newsEl = document.getElementById('digest-news');
        if (newsEl) newsEl.innerHTML = '<p class="text-sm text-[var(--text-muted)] col-span-2">历史记录：关联新闻信源未存档</p>';
      }
    } else if (type === '实体挖掘') {
      let parsed = null;
      try {
        parsed = typeof full.content === 'string' ? JSON.parse(full.content) : full.content;
      } catch (e) {
        parsed = { entities: [], sources: [] };
      }
      
      let entities = [];
      let sources = [];
      if (Array.isArray(parsed)) {
        entities = parsed;
      } else if (parsed && parsed.entities) {
        entities = parsed.entities;
        sources = parsed.sources || [];
      }
      
      if ((!sources || sources.length === 0) && full.sources) {
        try { sources = JSON.parse(full.sources); } catch (e) {}
      }
      
      rawFindAllEntities = entities || [];
      currentFindAllData = [...rawFindAllEntities];
      currentFindAllQuery = full.title || '';
      currentFindAllPage = 1;
      
      const titleEl = document.getElementById('findall-result-title');
      const countEl = document.getElementById('findall-result-count');
      if (titleEl) titleEl.textContent = `【${full.title || '历史记录'}】实体挖掘与商机全景大表`;
      if (countEl) countEl.textContent = `${currentFindAllData.length} 家/项`;
      
      goToFindAllPage(1);
      renderFindAllSources(sources);
    } else if (type === '社媒舆情') {
      const reportMarkdown = typeof full.content === 'string' ? full.content : JSON.stringify(full.content);
      currentSocialReportMarkdown = reportMarkdown;
      const reportEl = document.getElementById('social-report-markdown');
      if (reportEl) reportEl.innerHTML = renderMarkdown(reportMarkdown);
      if (typeof switchSocialResultTab === 'function') switchSocialResultTab('report');
    } else if (type === '企业穿透') {
      const modal = document.getElementById('modal-company-enrich');
      const loadingEl = document.getElementById('enrich-modal-loading');
      const bodyEl = document.getElementById('enrich-modal-body');
      
      let parsedDossier = null;
      try {
        parsedDossier = typeof full.content === 'string' ? JSON.parse(full.content) : full.content;
      } catch (e) {
        parsedDossier = null;
      }

      let sources = [];
      try { sources = full.sources ? JSON.parse(full.sources) : []; } catch (e) { sources = []; }

      if (parsedDossier && parsedDossier.metrics) {
        parsedDossier.sources = sources;
        currentEnrichDossier = parsedDossier;
        if (modal) {
          modal.classList.remove('hidden');
          loadingEl?.classList.add('hidden');
          bodyEl?.classList.remove('hidden');
          renderEnrichDossier(parsedDossier);
        }
      } else {
        // 兼容重构前的历史老记录
        const fallbackDossier = {
          company_name: full.title || '企业档案',
          tagline: `${full.title || '企业'} 商业情报档案`,
          industry: '商业全景',
          metrics: {
            business_model: '详见下方历史尽调报告内容',
            market_position: '历史挖掘标的',
            scale_and_capital: '历史归档记录',
            headquarters: '已归档'
          },
          products: [],
          moats: [],
          executives: [],
          partners_and_clients: [],
          strategic_summary: typeof full.content === 'string' ? full.content : JSON.stringify(full.content || ''),
          sources: sources
        };
        currentEnrichDossier = fallbackDossier;
        if (modal) {
          modal.classList.remove('hidden');
          loadingEl?.classList.add('hidden');
          bodyEl?.classList.remove('hidden');
          renderEnrichDossier(fallbackDossier);
        }
      }
    } else if (type === '长程调研') {
      const contentEl = document.getElementById('deepresearch-content');
      const sourcesEl = document.getElementById('deepresearch-sources');
      if (contentEl) contentEl.innerHTML = renderMarkdown(full.content || full.excerpt || '');
      let sources = [];
      try { sources = full.sources ? JSON.parse(full.sources) : []; } catch (e) { sources = []; }
      if (sourcesEl) renderSources(sourcesEl, sources);
    } else if (type === '企业财报') {
      document.getElementById('finance-content').innerHTML = renderMarkdown(full.content || full.excerpt || '');
    } else if (type === '实时搜索') {
      renderWebItems(JSON.parse(full.content || '[]'));
    } else if (type === '新闻流') {
      renderNewsItems(JSON.parse(full.content || '[]'));
    } else if (type === '正文提取') {
      renderContentsItems(JSON.parse(full.content || '[]'));
    }
    showToast('已恢复历史记录', 'success');
    toggleHistoryDrawer();
  } catch (e) {
    console.error('Restore history error:', e);
    showToast('记录解析失败', 'error');
  }
}

function escapeHtml(text) {
  return String(text || '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function safeHostname(url) {
  try { return new URL(url).hostname; } catch (e) { return ''; }
}

function renderMarkdown(content) {
  if (window.marked) {
    const html = marked.parse(String(content || ''));
    if (window.DOMPurify) {
      return DOMPurify.sanitize(html, {
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel'],
        ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i
      });
    }
    return html;
  }
  return escapeHtml(content).replace(/(?:\r\n|\n)/g, '<br>');
}

function copyContent(id) {
  const el = document.getElementById(id);
  if (el) {
    navigator.clipboard.writeText(el.innerText);
    showToast('已复制到剪贴板', 'success');
  }
}

// 导出 Word (格式化 HTML 文档)
function exportWord(id, filename) {
  const el = document.getElementById(id);
  if (!el) return;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>${filename}</title>
    <style>
      body { font-family: 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif; line-height: 1.8; color: #1e293b; padding: 30px; }
      h1 { font-size: 22pt; color: #0f172a; border-bottom: 2px solid #38bdf8; padding-bottom: 8px; }
      h2 { font-size: 16pt; color: #1e293b; margin-top: 20px; }
      p { font-size: 11pt; }
      blockquote { border-left: 4px solid #38bdf8; padding-left: 12px; color: #64748b; }
      code { background: #f1f5f9; padding: 2px 5px; font-family: Consolas; }
    </style>
    </head>
    <body>
      ${el.innerHTML}
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.doc`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('已成功导出 Word 文档！', 'success');
}

// 导出 PDF (移动端兼容：Blob 内嵌打印，不依赖 window.open 弹窗)
function exportPDF(id, filename) {
  const el = document.getElementById(id);
  if (!el) return;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${filename}</title>
    <style>
      body { font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif; padding: 30px; color: #111827; line-height: 1.75; max-width: 800px; margin: 0 auto; }
      h1 { border-bottom: 2px solid #6366f1; padding-bottom: 10px; color: #1f2937; font-size: 20px; }
      h2 { color: #374151; margin-top: 20px; font-size: 17px; }
      h3 { color: #4b5563; font-size: 15px; }
      p, li { font-size: 13px; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
      th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; }
      th { background: #f3f4f6; font-weight: 600; }
      blockquote { border-left: 4px solid #6366f1; padding-left: 12px; color: #64748b; margin: 10px 0; }
      code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
      @media print { body { padding: 0; } }
    </style>
    </head>
    <body>
      <h1>${filename}</h1>
      ${el.innerHTML}
    </body>
    </html>
  `;

  // 优先尝试 Blob + 隐藏 iframe 打印（移动端最可靠）
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // 桌面端：用 iframe 静默打印
    if (window.innerWidth > 768) {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = function() {
        try {
          iframe.contentWindow.print();
        } catch(e) {
          // 跨域限制时降级为新标签页
          window.open(url, '_blank');
        }
        setTimeout(() => { document.body.removeChild(iframe); URL.revokeObjectURL(url); }, 3000);
      };
    } else {
      // 移动端：直接导航到 Blob URL 让用户手动选择「打印/另存为PDF」
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('已打开预览页面，请使用浏览器菜单「分享 → 打印」导出 PDF', 'info');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  } catch(e) {
    // 最终降级：直接用 window.open 写入
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(htmlContent);
      w.document.close();
      w.onload = function() { w.print(); };
    } else {
      showToast('浏览器拦截了弹窗，请允许弹窗后重试', 'error');
    }
  }
}

// ==================== 业务研报执行 ====================

// 1. 行业早报生成
async function executeDigest() {
  const query = document.getElementById('digest-input')?.value.trim();
  if (!query) { showToast('请输入早报主题', 'info'); return; }
  const empty = document.getElementById('digest-empty');
  const progress = document.getElementById('digest-progress');
  const result = document.getElementById('digest-result');
  const btn = document.getElementById('digest-submit-btn');
  empty.classList.add('hidden'); result.classList.add('hidden'); progress.classList.remove('hidden'); btn.disabled = true;
  
  const timer = startTimer('digest-timer');
  const rotator = startStageRotation('digest-stage', 'digest-timer', [
    '🦁 检索过去 24 小时突发动态 (Brave 独立通道)...',
    '📅 梳理过去 7 天核心脉络演进...',
    '🧠 多源交叉时序分析与商业研判提炼...',
    '📋 正在生成结构化行业早报...'
  ]);

  try {
    const res = await fetchWithAuth(`${API_BASE}/api/digest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: query })
    }, 240000);

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 403 && !currentUser) {
        openAuthModal('login');
      }
      throw new Error(data.detail || '生成失败');
    }

    const content = data.brief_report?.output?.content || '暂无研报正文';
    const sources = data.brief_report?.output?.sources || [];
    const heroHtml = data.image_url ? renderAiHeroImage(data.image_url, `【${query}】SenseNova 行业早报视觉海报`) : '';
    document.getElementById('digest-content').innerHTML = heroHtml + renderMarkdown(content);

    const newsItems = data.search_results?.results?.web || [];
    const newsGrid = document.getElementById('digest-news');
    newsGrid.innerHTML = newsItems.length === 0 ? '<p class="text-sm text-[var(--text-muted)] col-span-2">未检索到关联新闻</p>' : newsItems.map(item => `
      <div class="p-3 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-subtle)]">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-pink-400 font-medium">${escapeHtml(safeHostname(item.url))}</span>
          <span class="text-xs text-[var(--text-muted)]">${item.page_age ? escapeHtml(String(item.page_age).split('T')[0]) : '实时'}</span>
        </div>
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="text-sm font-medium text-white hover:text-indigo-400 line-clamp-2 block mb-1">${escapeHtml(cleanSnippetText(item.title || '无标题'))}</a>
        <p class="text-xs text-[var(--text-secondary)] line-clamp-2">${escapeHtml(cleanSnippetText(item.description || item.snippets?.[0] || ''))}</p>
      </div>
    `).join('');

    await saveHistory('行业早报', query, { markdown: content, image_url: data.image_url }, sources);
    showToast('早报生成成功！', 'success');
    progress.classList.add('hidden'); result.classList.remove('hidden');
    checkAuth(); // 刷新剩余额度
  } catch (err) {
    showToast(err.message, 'error');
    progress.classList.add('hidden'); empty.classList.remove('hidden');
  } finally {
    stopTimer(timer); stopTimer(rotator); btn.disabled = false;
  }
}

// 2. 深度研报流式生成
async function executeResearchStream() {
  const input = document.getElementById('research-input')?.value.trim();
  if (!input) { showToast('请输入研究课题', 'info'); return; }
  const empty = document.getElementById('research-empty');
  const progress = document.getElementById('research-progress');
  const result = document.getElementById('research-result');
  const contentEl = document.getElementById('research-content');
  const sourcesEl = document.getElementById('research-sources');
  const btn = document.getElementById('research-submit-btn');
  empty.classList.add('hidden'); result.classList.add('hidden'); progress.classList.remove('hidden'); btn.disabled = true;
  contentEl.innerHTML = ''; sourcesEl.innerHTML = ''; currentSources = [];

  const timer = startTimer('research-timer');
  const rotator = startStageRotation('research-stage', 'research-timer', [
    '🦁 Brave 全球独立索引库毫秒级检索中 (0.2s)...',
    '🧠 双引擎多源交叉验证与深度逻辑推理中...',
    '🔗 事实溯源与高密上下文切片结构化提炼...',
    '📑 研报正文生成中，约需 1-2 分钟...'
  ]);

  try {
    const res = await fetchWithAuth(`${API_BASE}/api/research/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, depth: document.getElementById('research-depth')?.value })
    }, 300000);

    if (!res.ok) {
      if (res.status === 403 && !currentUser) openAuthModal('login');
      let msg = `HTTP ${res.status}`;
      try { const errData = await res.json(); msg = errData.detail || msg; } catch (e) {}
      throw new Error(msg);
    }

    if (!res.body) throw new Error('当前浏览器不支持流式响应');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let finalSources = [];

    progress.classList.add('hidden'); result.classList.remove('hidden');
    contentEl.innerHTML = '<span class="stream-cursor"></span>';

    const handleMessage = async (line) => {
      if (!line.startsWith('data: ')) return;
      let data;
      try { data = JSON.parse(line.slice(6)); } catch (e) { return; }
      if (data.type === 'content') {
        fullContent += data.chunk;
        contentEl.innerHTML = renderMarkdown(fullContent) + '<span class="stream-cursor"></span>';
      } else if (data.type === 'stage') {
        const stageEl = document.getElementById('research-stage');
        if (stageEl) stageEl.textContent = data.stage;
      } else if (data.type === 'done') {
        finalSources = data.sources || [];
        const heroHtml = data.image_url ? renderAiHeroImage(data.image_url, `【${input}】SenseNova AI 商业全景信息图`) : '';
        contentEl.innerHTML = heroHtml + renderMarkdown(fullContent);
        renderSources(sourcesEl, finalSources);
        await saveHistory('深度研报', input, { markdown: fullContent, image_url: data.image_url }, JSON.stringify(finalSources));
        showToast('深度研报与商业全景信息图生成完毕！', 'success');
      } else if (data.type === 'error') {
        throw new Error(data.message);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (line.trim()) await handleMessage(line.trim());
      }
    }
    if (buffer.trim()) await handleMessage(buffer.trim());

    checkAuth();
  } catch (err) {
    showToast(err.message, 'error');
    progress.classList.add('hidden');
    if (!contentEl.innerHTML) empty.classList.remove('hidden');
  } finally {
    stopTimer(timer); stopTimer(rotator); btn.disabled = false;
  }
}

function renderSources(container, sources) {
  if (!container) return;
  if (!sources || sources.length === 0) {
    container.innerHTML = '<p class="text-sm text-[var(--text-muted)] col-span-2">未提取到结构化出处</p>';
    return;
  }
  container.innerHTML = sources.map((s, idx) => {
    const isBrave = s.name === 'Brave 独立索引库' || s.source?.includes('Brave');
    const badge = isBrave 
      ? '<span class="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 font-medium">🦁 Brave 独立索引</span>' 
      : '<span class="px-1.5 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-300 font-medium">🌐 全球信源</span>';
    return `
      <div class="p-3 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] flex items-start gap-2.5 hover:border-indigo-500/30 transition-colors">
        <span class="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">[${idx+1}]</span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 mb-1">
            <a href="${escapeHtml(s.url || '#')}" target="_blank" rel="noopener" class="text-xs font-medium text-white hover:text-indigo-400 truncate block flex-1">${escapeHtml(s.title || s.name || s.url || '参考来源')}</a>
            ${badge}
          </div>
          <p class="text-[11px] text-[var(--text-muted)] truncate">${escapeHtml(safeHostname(s.url))}</p>
        </div>
      </div>
    `;
  }).join('');
}


let currentSearchEngine = 'hybrid';
function setSearchEngine(eng) {
  currentSearchEngine = eng;
  const btnHybrid = document.getElementById('btn-engine-hybrid');
  const btnParallel = document.getElementById('btn-engine-parallel');
  const hintEl = document.getElementById('search-engine-hint');
  
  if (btnHybrid && btnParallel) {
    if (eng === 'parallel') {
      btnParallel.className = 'px-2.5 py-1 text-xs rounded-md font-medium transition-colors bg-indigo-600 text-white shadow-sm';
      btnHybrid.className = 'px-2.5 py-1 text-xs rounded-md font-medium transition-colors text-[var(--text-muted)] hover:text-white';
      if (hintEl) hintEl.textContent = '🧠 已开启 Parallel.ai 深度语义检索，输出高密 Markdown 表格与核心参数';
    } else {
      btnHybrid.className = 'px-2.5 py-1 text-xs rounded-md font-medium transition-colors bg-indigo-500 text-white shadow-sm';
      btnParallel.className = 'px-2.5 py-1 text-xs rounded-md font-medium transition-colors text-[var(--text-muted)] hover:text-white';
      if (hintEl) hintEl.textContent = '⚡ 综合极速引擎 · 0.2s 毫秒级返回全球最新事实快讯';
    }
  }
}

// 3. 实时搜索
async function executeSearch() {
  const query = document.getElementById('search-input')?.value.trim();
  if (!query) { showToast('请输入搜索关键词', 'info'); return; }
  const count = document.getElementById('search-count')?.value || 10;
  const result = document.getElementById('search-result');
  const empty = document.getElementById('search-empty');
  empty.classList.add('hidden'); result.classList.remove('hidden');
  result.innerHTML = '<div class="card p-8 text-center text-sm text-[var(--text-muted)]"><div class="loading-spinner mx-auto mb-3"></div>全网检索中...</div>';

  try {
    const res = await fetchWithAuth(`${API_BASE}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, count: parseInt(count), engine: currentSearchEngine })
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 403 && !currentUser) openAuthModal('login');
      throw new Error(data.detail || '搜索失败');
    }
    const items = data.data?.results?.web || [];
    renderWebItems(items);
    await saveHistory('实时搜索', query, items);
    checkAuth();
  } catch (err) {
    showToast(err.message, 'error');
    result.innerHTML = `<div class="card p-6 text-center text-sm text-rose-400">${err.message}</div>`;
  }
}

function renderWebItems(items) {
  const result = document.getElementById('search-result');
  if (!result) return;
  if (!items || items.length === 0) {
    result.innerHTML = '<div class="card p-8 text-center text-sm text-[var(--text-muted)]">未找到相关网页结果</div>';
    return;
  }
  result.innerHTML = items.map((item, idx) => {
    const isEn = !/[\u4e00-\u9fa5]/.test(item.title + (item.description || ''));
    return `
    <div class="card p-4 hover:border-indigo-500/40 transition-colors relative group">
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-2">
          <span class="text-xs text-indigo-400 font-mono">${escapeHtml(safeHostname(item.url))}</span>
          ${item.source ? `<span class="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/15 text-amber-300">🦁 ${escapeHtml(item.source)}</span>` : ''}
        </div>
        <div class="flex items-center gap-2">
          ${isEn ? `<button onclick="translateCard(this, 's-title-${idx}', 's-desc-${idx}')" class="px-2 py-0.5 rounded text-[10px] bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-300 transition-colors">🇨🇳 译为中文</button>` : ''}
          <span class="text-xs text-[var(--text-muted)]">${item.page_age ? escapeHtml(String(item.page_age).split('T')[0]) : '实时'}</span>
        </div>
      </div>
      <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" id="s-title-${idx}" class="text-sm font-bold text-white hover:text-indigo-400 block mb-1.5">${escapeHtml(cleanSnippetText(item.title || '无标题'))}</a>
      <p id="s-desc-${idx}" class="text-xs text-[var(--text-secondary)] line-clamp-3">${escapeHtml(cleanSnippetText(item.description || item.snippets?.[0] || ''))}</p>
    </div>
  `}).join('');
}

// 4. 新闻流
async function executeNews() {
  const query = document.getElementById('news-input')?.value.trim();
  if (!query) { showToast('请输入新闻关键词', 'info'); return; }
  const result = document.getElementById('news-result');
  const empty = document.getElementById('news-empty');
  empty.classList.add('hidden'); result.classList.remove('hidden');
  result.innerHTML = '<div class="card p-8 text-center text-sm text-[var(--text-muted)] col-span-2"><div class="loading-spinner mx-auto mb-3"></div>聚合资讯中...</div>';

  try {
    const res = await fetchWithAuth(`${API_BASE}/api/news`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, count: 10 })
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 403 && !currentUser) openAuthModal('login');
      throw new Error(data.detail || '获取新闻失败');
    }
    const items = data.data?.results?.news || data.data?.results?.web || [];
    renderNewsItems(items);
    await saveHistory('新闻流', query, items);
    checkAuth();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderNewsItems(items) {
  const result = document.getElementById('news-result');
  if (!result) return;
  if (!items || items.length === 0) {
    result.innerHTML = '<div class="card p-8 text-center text-sm text-[var(--text-muted)] col-span-2">暂无相关资讯</div>';
    return;
  }
  result.innerHTML = items.map(item => `
    <div class="card p-4">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-pink-400 font-medium">${escapeHtml(safeHostname(item.url))}</span>
        <span class="text-xs text-[var(--text-muted)]">${item.page_age ? escapeHtml(String(item.page_age).split('T')[0]) : '最新'}</span>
      </div>
      <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="text-sm font-medium text-white hover:text-indigo-400 line-clamp-2 block mb-1">${escapeHtml(cleanSnippetText(item.title || '无标题'))}</a>
      <p class="text-xs text-[var(--text-secondary)] line-clamp-2">${escapeHtml(cleanSnippetText(item.description || item.snippets?.[0] || ''))}</p>
    </div>
  `).join('');
}

// 5. 财报分析
async function executeFinance() {
  const input = document.getElementById('finance-input')?.value.trim();
  if (!input) { showToast('请输入公司名称或股票代码', 'info'); return; }
  const empty = document.getElementById('finance-empty');
  const progress = document.getElementById('finance-progress');
  const result = document.getElementById('finance-result');
  const contentEl = document.getElementById('finance-content');
  empty.classList.add('hidden'); result.classList.add('hidden'); progress.classList.remove('hidden');

  try {
    const res = await fetchWithAuth(`${API_BASE}/api/finance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    }, 180000);
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 403 && !currentUser) openAuthModal('login');
      throw new Error(data.detail || '财报分析生成失败');
    }
    const content = data.data?.output?.content || '未获取到财报正文';
    contentEl.innerHTML = renderMarkdown(content);
    await saveHistory('企业财报', input, content);
    showToast('财报洞察已生成！', 'success');
    progress.classList.add('hidden'); result.classList.remove('hidden');
    checkAuth();
  } catch (err) {
    showToast(err.message, 'error');
    progress.classList.add('hidden'); empty.classList.remove('hidden');
  }
}

// 6. 正文提取
async function executeContents() {
  const text = document.getElementById('contents-input')?.value.trim();
  if (!text) { showToast('请输入网页 URL', 'info'); return; }
  const urls = text.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));
  if (urls.length === 0) { showToast('请输入有效的 http/https 链接', 'info'); return; }
  const empty = document.getElementById('contents-empty');
  const result = document.getElementById('contents-result');
  empty.classList.add('hidden'); result.classList.remove('hidden');
  result.innerHTML = '<div class="card p-8 text-center text-sm text-[var(--text-muted)]"><div class="loading-spinner mx-auto mb-3"></div>提取正文中...</div>';

  try {
    const res = await fetchWithAuth(`${API_BASE}/api/contents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls })
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 403 && !currentUser) openAuthModal('login');
      throw new Error(data.detail || '提取失败');
    }
    const items = data.data || [];
    renderContentsItems(items);
    await saveHistory('正文提取', urls.join('; '), items);
    checkAuth();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderContentsItems(items) {
  const result = document.getElementById('contents-result');
  if (!result) return;
  if (!items || items.length === 0) {
    result.innerHTML = '<div class="card p-8 text-center text-sm text-[var(--text-muted)]">未能提取到正文</div>';
    return;
  }
  result.innerHTML = items.map((item, idx) => `
    <div class="card p-6 space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] flex-wrap gap-2">
        <div class="min-w-0 flex-1">
          <h3 class="text-base font-bold text-white mb-1.5">${escapeHtml(item.title || '网页正文')}</h3>
          <div class="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <span class="font-mono text-indigo-400">${escapeHtml(safeHostname(item.url))}</span>
            <span>字数: <strong class="text-slate-200">${item.word_count || 0}</strong> 字</span>
            <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="text-indigo-400 hover:text-indigo-300">原网页 ↗</a>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="exportWord('content-md-${idx}', '${escapeHtml(item.title || '网页正文')}')" class="btn-secondary text-xs">📄 导出 Word</button>
          <button onclick="exportPDF('content-md-${idx}', '${escapeHtml(item.title || '网页正文')}')" class="btn-secondary text-xs">📑 导出 PDF</button>
          <button onclick="navigator.clipboard.writeText(document.getElementById('content-md-${idx}').innerText); showToast('已复制纯文本', 'success');" class="btn-secondary text-xs">📋 复制</button>
        </div>
      </div>
      <div id="content-md-${idx}" class="markdown-body text-sm leading-relaxed max-h-[600px] overflow-y-auto custom-scrollbar p-5 bg-slate-950/40 rounded-xl border border-white/5">
        ${renderMarkdown(item.markdown || item.text || '无正文内容')}
      </div>
    </div>
  `).join('');
}

// 页面加载完成后启动
document.addEventListener('DOMContentLoaded', init);


// ==================== 全网社媒声量与舆情洞察 (Social Media Intelligence) ====================

let currentSocialRawItems = [];
let currentSocialReportMarkdown = '';
let currentSocialKeyword = '';

function setSocialPreset(keyword) {
  const inputEl = document.getElementById('social-keyword-input');
  if (inputEl) {
    inputEl.value = keyword;
    inputEl.focus();
  }
}

function toggleSocialPlatform(platform) {
  const chip = document.querySelector(`.social-chip[data-platform="${platform}"]`);
  if (chip) {
    chip.classList.toggle('active');
  }
}

function selectAllSocialPlatforms() {
  document.querySelectorAll('#social-platform-chips .social-chip').forEach(c => c.classList.add('active'));
}

function clearSocialPlatforms() {
  document.querySelectorAll('#social-platform-chips .social-chip').forEach(c => c.classList.remove('active'));
}

function getSelectedSocialPlatforms() {
  const selected = [];
  document.querySelectorAll('#social-platform-chips .social-chip.active').forEach(c => {
    selected.push(c.dataset.platform);
  });
  return selected.length > 0 ? selected : ['xiaohongshu', 'bilibili', 'weibo', 'twitter'];
}

function switchSocialResultTab(tab) {
  const reportView = document.getElementById('social-view-report');
  const cardsView = document.getElementById('social-view-cards');
  const reportTabBtn = document.getElementById('subtab-social-report');
  const cardsTabBtn = document.getElementById('subtab-social-cards');

  if (tab === 'report') {
    reportView?.classList.remove('hidden');
    cardsView?.classList.add('hidden');
    reportTabBtn?.classList.add('bg-white/10', 'text-white', 'font-bold', 'border-pink-500/40');
    reportTabBtn?.classList.remove('text-[var(--text-muted)]');
    cardsTabBtn?.classList.remove('bg-white/10', 'text-white', 'font-bold', 'border-pink-500/40');
    cardsTabBtn?.classList.add('text-[var(--text-muted)]');
  } else {
    reportView?.classList.add('hidden');
    cardsView?.classList.remove('hidden');
    cardsTabBtn?.classList.add('bg-white/10', 'text-white', 'font-bold', 'border-pink-500/40');
    cardsTabBtn?.classList.remove('text-[var(--text-muted)]');
    reportTabBtn?.classList.remove('bg-white/10', 'text-white', 'font-bold', 'border-pink-500/40');
    reportTabBtn?.classList.add('text-[var(--text-muted)]');
  }
}

function renderSocialCards(items) {
  const container = document.getElementById('social-cards-grid');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = '<div class="col-span-full card p-8 text-center text-sm text-[var(--text-muted)]">暂未获取到切片卡片</div>';
    return;
  }

  const badgeClasses = {
    'xiaohongshu': 'badge-xiaohongshu',
    'bilibili': 'badge-bilibili',
    'weibo': 'badge-weibo',
    'wechat_mp': 'badge-wechat',
    'douyin': 'badge-douyin',
    'twitter': 'badge-twitter',
    'reddit': 'badge-reddit',
    'youtube': 'badge-youtube',
    'web_search': 'badge-web'
  };

  container.innerHTML = items.map((it, idx) => {
    const badgeClass = badgeClasses[it.platform] || 'badge-web';
    const cleanTitle = escapeHtml(it.title || '社媒动态');
    const cleanContent = escapeHtml(it.content || '');
    const cleanAuthor = escapeHtml(it.author || '社媒用户');
    const likesDisplay = it.likes ? (it.likes > 10000 ? (it.likes / 10000).toFixed(1) + '万' : it.likes) : 0;
    const commentsDisplay = it.comments ? (it.comments > 10000 ? (it.comments / 10000).toFixed(1) + '万' : it.comments) : 0;

    return `
      <div class="card p-4 space-y-3 flex flex-col justify-between social-card border-white/5 bg-slate-900/60">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 ${badgeClass}">
              <span>${it.icon || '🌐'}</span>
              <span>${escapeHtml(it.platform_name || '社媒')}</span>
            </span>
            <span class="text-[10px] text-[var(--text-muted)]">${escapeHtml(it.time || '近期')}</span>
          </div>

          <h4 class="text-sm font-bold text-white leading-snug mb-1.5 line-clamp-2" title="${cleanTitle}">
            ${cleanTitle}
          </h4>

          <p class="text-xs text-[var(--text-muted)] line-clamp-3 leading-relaxed">
            ${cleanContent}
          </p>
        </div>

        <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <div class="flex items-center gap-1 min-w-0 flex-1 truncate text-slate-300">
            <span>👤</span>
            <span class="truncate">${cleanAuthor}</span>
          </div>
          <div class="flex items-center gap-2.5 flex-shrink-0">
            <span class="flex items-center gap-0.5 text-pink-400 font-mono">
              <span>👍</span><span>${likesDisplay}</span>
            </span>
            <span class="flex items-center gap-0.5 text-indigo-400 font-mono">
              <span>💬</span><span>${commentsDisplay}</span>
            </span>
            <a href="${escapeHtml(it.url || '#')}" target="_blank" rel="noopener" class="text-indigo-400 hover:text-indigo-300 ml-1 font-bold">
              直达 ↗
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function handleSocialSubmit() {
  const keyword = document.getElementById('social-keyword-input')?.value.trim();
  if (!keyword) {
    showToast('请输入要监测的品牌、产品或事件关键词', 'info');
    document.getElementById('social-keyword-input')?.focus();
    return;
  }

  currentSocialKeyword = keyword;
  const platforms = getSelectedSocialPlatforms();
  const mode = document.getElementById('social-mode-select')?.value || 'comprehensive';
  const sort_by = document.getElementById('social-sort-select')?.value || 'general';

  const submitBtn = document.getElementById('btn-social-submit');
  const resultContainer = document.getElementById('social-result-container');
  const progressBar = document.getElementById('social-progress-bar');
  const progressText = document.getElementById('social-progress-text');
  const markdownContainer = document.getElementById('social-report-markdown');
  const rawCountEl = document.getElementById('social-raw-count');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⚡ 正在调度跨平台引擎...</span>';
  }

  resultContainer?.classList.remove('hidden');
  progressBar?.classList.remove('hidden');
  if (progressText) progressText.textContent = `📱 正在调度 Monid 网关并行检索 ${platforms.length} 个社媒平台一手切片...`;

  currentSocialReportMarkdown = '';
  currentSocialRawItems = [];
  if (markdownContainer) markdownContainer.innerHTML = '<div class="loading-spinner mx-auto my-8"></div>';
  if (rawCountEl) rawCountEl.textContent = '0';
  switchSocialResultTab('report');

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(`${API_BASE}/api/social/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ keyword, platforms, mode, sort_by })
    });

    if (!response.ok) {
      if (response.status === 403 && !currentUser) {
        openAuthModal('login');
      }
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail || '检索请求失败');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop(); // 保留最后一个未闭合块

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const payload = JSON.parse(line.substring(6));

          if (payload.type === 'start' || payload.type === 'stage') {
            if (progressText) progressText.textContent = payload.stage;
          } else if (payload.type === 'raw_items') {
            currentSocialRawItems = payload.items || [];
            if (rawCountEl) rawCountEl.textContent = payload.count || currentSocialRawItems.length;
            renderSocialCards(currentSocialRawItems);
          } else if (payload.type === 'content') {
            currentSocialReportMarkdown += payload.chunk;
            if (markdownContainer) {
              markdownContainer.innerHTML = renderMarkdown(currentSocialReportMarkdown);
            }
          } else if (payload.type === 'done') {
            progressBar?.classList.add('hidden');
            if (payload.full_content) {
              currentSocialReportMarkdown = payload.full_content;
              if (markdownContainer) markdownContainer.innerHTML = renderMarkdown(currentSocialReportMarkdown);
            }
            if (payload.raw_items && payload.raw_items.length > 0) {
              currentSocialRawItems = payload.raw_items;
              if (rawCountEl) rawCountEl.textContent = currentSocialRawItems.length;
              renderSocialCards(currentSocialRawItems);
            }
            await saveHistory('社媒舆情', keyword, currentSocialReportMarkdown);
            showToast('🎉 社媒舆情研报与原始切片已全部生成！', 'success');
            checkAuth();
          } else if (payload.type === 'error') {
            progressBar?.classList.add('hidden');
            showToast(payload.message || '生成失败', 'error');
            if (markdownContainer) {
              markdownContainer.innerHTML = `<div class="card p-6 bg-red-950/30 border-red-500/30 text-red-300 text-sm">❌ ${escapeHtml(payload.message || '生成失败')}</div>`;
            }
          }
        } catch (jsonErr) {
          console.error('SSE JSON parse error:', jsonErr);
        }
      }
    }
  } catch (err) {
    progressBar?.classList.add('hidden');
    showToast(err.message, 'error');
    if (markdownContainer) {
      markdownContainer.innerHTML = `<div class="card p-6 bg-red-950/30 border-red-500/30 text-red-300 text-sm">❌ ${escapeHtml(err.message)}</div>`;
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>🚀 启动社媒检索与分析</span>';
    }
  }
}

function copySocialReport() {
  if (!currentSocialReportMarkdown) {
    showToast('当前暂无研报内容可复制', 'info');
    return;
  }
  navigator.clipboard.writeText(currentSocialReportMarkdown).then(() => {
    showToast('已复制社媒舆情研报全文（Markdown格式）！', 'success');
  }).catch(() => {
    showToast('复制失败，请手动选择复制', 'error');
  });
}

function exportSocialMarkdown() {
  if (!currentSocialReportMarkdown) {
    showToast('当前暂无研报内容可导出', 'info');
    return;
  }
  const blob = new Blob([currentSocialReportMarkdown], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `社媒舆情研报_${currentSocialKeyword || '主题'}_${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('已成功导出 Markdown 文件！', 'success');
}

function exportSocialPdf() {
  exportPDF('social-report-markdown', `社媒舆情研报_${currentSocialKeyword || '主题'}`);
}



// ==================== 8. 全网实体挖掘与商机大表 (商探 AI 双视图 + 分页增强版) ====================

let rawFindAllEntities = [];
let currentFindAllData = [];
let currentFindAllQuery = '';
let currentFindAllPage = 1;
let currentFindAllView = 'cards'; // 'cards' 商机卡片流 (默认) | 'table' 高密大表
const FINDALL_PAGE_SIZE = 10;

function switchFindAllView(viewMode) {
  currentFindAllView = viewMode;
  const cardsContainer = document.getElementById('findall-view-cards');
  const tableContainer = document.getElementById('findall-view-table');
  const btnCards = document.getElementById('btn-findall-view-cards');
  const btnTable = document.getElementById('btn-findall-view-table');

  if (viewMode === 'cards') {
    cardsContainer?.classList.remove('hidden');
    tableContainer?.classList.add('hidden');
    if (btnCards) btnCards.className = 'px-2.5 py-1 text-xs rounded-md font-medium transition-all bg-indigo-600 text-white shadow-sm flex items-center gap-1';
    if (btnTable) btnTable.className = 'px-2.5 py-1 text-xs rounded-md font-medium transition-all text-[var(--text-muted)] hover:text-white flex items-center gap-1';
  } else {
    cardsContainer?.classList.add('hidden');
    tableContainer?.classList.remove('hidden');
    if (btnTable) btnTable.className = 'px-2.5 py-1 text-xs rounded-md font-medium transition-all bg-indigo-600 text-white shadow-sm flex items-center gap-1';
    if (btnCards) btnCards.className = 'px-2.5 py-1 text-xs rounded-md font-medium transition-all text-[var(--text-muted)] hover:text-white flex items-center gap-1';
  }
}

function setFindAllPreset(text) {
  const input = document.getElementById('findall-input');
  if (input) {
    input.value = text;
    executeFindAll();
  }
}

async function executeFindAll() {
  const inputEl = document.getElementById('findall-input');
  const query = inputEl?.value.trim();
  if (!query) {
    showToast('请输入需要挖掘的企业、产品或行业实体需求', 'info');
    return;
  }
  currentFindAllQuery = query;

  const limitSelect = document.getElementById('findall-limit-select');
  const limit = parseInt(limitSelect?.value || '20');

  const btn = document.getElementById('findall-submit-btn');
  const emptyEl = document.getElementById('findall-empty');
  const progressEl = document.getElementById('findall-progress');
  const resultEl = document.getElementById('findall-result');
  const stageEl = document.getElementById('findall-stage');
  const timerEl = document.getElementById('findall-timer');

  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner w-4 h-4"></span><span>正在挖掘中...</span>';
  emptyEl?.classList.add('hidden');
  resultEl?.classList.add('hidden');
  progressEl?.classList.remove('hidden');

  let seconds = 0;
  timerEl.textContent = '已耗时: 0s';
  const timer = setInterval(() => {
    seconds++;
    timerEl.textContent = `已耗时: ${seconds}s`;
    if (seconds === 3 && stageEl) stageEl.textContent = `⚡ 正在调度 Parallel.ai 全网专有索引库进行深度语义检索（规模: ${limit} 条）...`;
    if (seconds === 7 && stageEl) stageEl.textContent = '🧠 正在多源交叉验证，提取实体画像、企业性质、投资规模与主营业务...';
    if (seconds === 14 && stageEl) stageEl.textContent = '📊 正在进行智能归一化去重，并按照【综合影响力与匹配度】进行精准排名与打分...';
    if (seconds === 22 && stageEl) stageEl.textContent = '📑 正在生成高密交互大表与多维数据矩阵...';
  }, 1000);

  try {
    const res = await fetchWithAuth(`${API_BASE}/api/findall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit })
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 403 && !currentUser) openAuthModal('login');
      throw new Error(data.detail || '实体挖掘失败，请稍后重试');
    }

    rawFindAllEntities = data.entities || [];
    currentFindAllData = [...rawFindAllEntities];
    currentFindAllPage = 1;

    goToFindAllPage(1);
    renderFindAllSources(data.sources || []);

    const titleEl = document.getElementById('findall-result-title');
    const countEl = document.getElementById('findall-result-count');
    if (titleEl) titleEl.textContent = `【${query}】实体挖掘与商机全景大表`;
    if (countEl) countEl.textContent = `${currentFindAllData.length} 家/项`;

    resultEl?.classList.remove('hidden');
    await saveHistory('实体挖掘', query, { entities: currentFindAllData, sources: data.sources });
    checkAuth();
    showToast(`成功挖掘并综合排名 ${currentFindAllData.length} 条高价值实体数据！`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
    emptyEl?.classList.remove('hidden');
  } finally {
    clearInterval(timer);
    progressEl?.classList.add('hidden');
    btn.disabled = false;
    btn.innerHTML = '<span>🎯</span><span>一键全网挖掘</span>';
  }
}

function goToFindAllPage(page) {
  const totalItems = currentFindAllData.length;
  const totalPages = Math.ceil(totalItems / FINDALL_PAGE_SIZE) || 1;
  
  currentFindAllPage = Math.max(1, Math.min(page, totalPages));
  
  const startIdx = (currentFindAllPage - 1) * FINDALL_PAGE_SIZE;
  const endIdx = Math.min(startIdx + FINDALL_PAGE_SIZE, totalItems);
  const pageItems = currentFindAllData.slice(startIdx, endIdx);

  renderFindAllCards(pageItems, startIdx);
  renderFindAllTableRows(pageItems, startIdx);
  renderFindAllPagination(totalItems, totalPages, currentFindAllPage, startIdx, endIdx);
}

function jumpToFindAllPage() {
  const input = document.getElementById('findall-jump-page');
  if (!input) return;
  const p = parseInt(input.value);
  if (!isNaN(p)) {
    goToFindAllPage(p);
  }
}

// 渲染现代 SaaS / PitchBook 级商机全景卡片流 (移动端原生自适应 · 告别折字与重叠)
function renderFindAllCards(entities, startOffset = 0) {
  const container = document.getElementById('findall-cards-container');
  if (!container) return;

  if (!entities || entities.length === 0) {
    container.innerHTML = `<div class="card p-10 text-center text-[var(--text-muted)] text-sm">未找到匹配的实体数据</div>`;
    return;
  }

  container.innerHTML = entities.map((item, idx) => {
    const globalIdx = startOffset + idx;
    const rank = item.rank || (globalIdx + 1);
    
    let rankBadge = `<span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[var(--surface-tertiary)] text-slate-400 font-mono font-bold text-xs border border-white/10 flex-shrink-0 whitespace-nowrap">#${rank}</span>`;
    if (rank === 1) {
      rankBadge = `<span class="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/25 to-yellow-500/25 text-amber-300 font-bold border border-amber-500/40 text-xs shadow-sm flex-shrink-0 whitespace-nowrap">🥇 第 1 名</span>`;
    } else if (rank === 2) {
      rankBadge = `<span class="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-gradient-to-r from-slate-400/25 to-slate-300/25 text-slate-200 font-bold border border-slate-300/40 text-xs shadow-sm flex-shrink-0 whitespace-nowrap">🥈 第 2 名</span>`;
    } else if (rank === 3) {
      rankBadge = `<span class="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-700/25 to-orange-600/25 text-amber-300 font-bold border border-amber-700/40 text-xs shadow-sm flex-shrink-0 whitespace-nowrap">🥉 第 3 名</span>`;
    }

    const score = item.score || Math.max(70, 99 - globalIdx * 2);
    let scoreBadge = `<span class="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex-shrink-0 whitespace-nowrap">🎯 ${score}% 匹配</span>`;
    if (score < 85) {
      scoreBadge = `<span class="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex-shrink-0 whitespace-nowrap">🎯 ${score}% 匹配</span>`;
    }

    const hasUrl = item.url && item.url !== '#' && item.url.startsWith('http');
    const linkBtn = hasUrl ? `
      <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="btn-secondary py-1.5 px-3 text-xs inline-flex items-center justify-center gap-1 font-medium whitespace-nowrap flex-1 sm:flex-initial">
        <span>官方信源</span><span>↗</span>
      </a>
    ` : '';

    return `
      <div class="card p-3.5 sm:p-4 space-y-3 hover:border-indigo-500/40 transition-all bg-[var(--surface-secondary)]/90 rounded-2xl border border-[var(--border-subtle)] shadow-sm">
        
        <!-- 1. 顶层标题栏: 排名 + 企业名称 + 赛道标签 + 右侧匹配度 (占满整行，绝不压缩) -->
        <div class="flex items-center justify-between gap-2 pb-2 border-b border-white/5">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            ${rankBadge}
            <h4 class="font-bold text-white text-base sm:text-lg truncate group-hover:text-indigo-200 transition-colors">${escapeHtml(item.name || '未命名实体')}</h4>
            <span class="px-2 py-0.5 rounded text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/25 font-medium whitespace-nowrap hidden sm:inline-block">
              ${escapeHtml(item.tag || '通用')}
            </span>
          </div>
          ${scoreBadge}
        </div>

        <!-- 移动端显示的赛道标签 + 排名依据 -->
        <div class="space-y-1 text-xs">
          <div class="flex items-center gap-1.5 sm:hidden">
            <span class="text-slate-400 text-[11px]">赛道:</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/25 font-medium">
              ${escapeHtml(item.tag || '通用')}
            </span>
          </div>
          <div class="text-[11px] text-amber-200/90 leading-relaxed bg-amber-500/5 px-2.5 py-1.5 rounded-lg border border-amber-500/10">
            <span class="font-bold text-amber-300">💡 推荐依据: </span><span class="text-slate-300">${escapeHtml(item.rank_reason || '核心行业标杆与高匹配标的')}</span>
          </div>
        </div>

        <!-- 2. 中部核心优势亮点 -->
        <div class="p-2.5 rounded-xl bg-black/25 border border-white/5">
          <div class="text-[10px] font-semibold text-indigo-300 mb-1 flex items-center gap-1">
            <span>⚡ 核心优势与主营业务:</span>
          </div>
          <p class="text-xs text-slate-200 leading-relaxed line-clamp-3">${escapeHtml(item.highlight || '暂无详细亮点描述')}</p>
        </div>

        <!-- 3. 结构化关键商业指标 -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs text-slate-300 bg-white/[0.02] p-2 rounded-xl border border-white/5">
          <div class="flex items-center gap-1.5 truncate">
            <span class="text-slate-400 text-[11px] flex-shrink-0">💰 规模/融资:</span>
            <strong class="text-slate-200 font-normal truncate">${escapeHtml(item.funding || '未披露')}</strong>
          </div>
          <div class="flex items-center gap-1.5 truncate">
            <span class="text-slate-400 text-[11px] flex-shrink-0">👤 负责人:</span>
            <strong class="text-slate-200 font-normal truncate">${escapeHtml(item.leader || '暂未公开')}</strong>
          </div>
          <div class="flex items-center gap-1.5 truncate">
            <span class="text-slate-400 text-[11px] flex-shrink-0">📍 所在地:</span>
            <strong class="text-slate-200 font-normal truncate">${escapeHtml(item.location || '全国')}</strong>
          </div>
        </div>

        <!-- 4. 底部操作按钮栏 (手机端双列大按钮，极佳触控体验) -->
        <div class="flex items-center gap-2 pt-1">
          <button onclick="enrichCompany('${escapeHtml(item.name)}', '${escapeHtml(item.url || '')}', '${escapeHtml(item.tag || '')}')" class="btn-primary py-1.5 px-3 text-xs inline-flex items-center justify-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 font-semibold whitespace-nowrap shadow-sm hover:shadow-indigo-500/20 active:scale-98 transition-all flex-1">
            <span>🔍</span><span>穿透官网底细</span>
          </button>
          ${linkBtn}
        </div>

      </div>
    `;
  }).join('');
}

// 渲染宽屏数据大表
function renderFindAllTableRows(entities, startOffset = 0) {
  const tbody = document.getElementById('findall-table-body');
  if (!tbody) return;

  if (!entities || entities.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-[var(--text-muted)]">未找到匹配的实体数据</td></tr>`;
    return;
  }

  tbody.innerHTML = entities.map((item, idx) => {
    const globalIdx = startOffset + idx;
    const rank = item.rank || (globalIdx + 1);
    let rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--surface-tertiary)] text-slate-400 font-mono font-bold text-xs">#${rank}</span>`;
    if (rank === 1) {
      rankBadge = `<span class="inline-flex items-center justify-center w-8 h-7 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 text-xs shadow-md shadow-amber-500/10">🥇 1</span>`;
    } else if (rank === 2) {
      rankBadge = `<span class="inline-flex items-center justify-center w-8 h-7 rounded-lg bg-slate-300/20 text-slate-200 font-bold border border-slate-300/40 text-xs shadow-md shadow-slate-300/10">🥈 2</span>`;
    } else if (rank === 3) {
      rankBadge = `<span class="inline-flex items-center justify-center w-8 h-7 rounded-lg bg-amber-700/20 text-amber-400 font-bold border border-amber-700/40 text-xs shadow-md shadow-amber-700/10">🥉 3</span>`;
    }

    const score = item.score || Math.max(70, 99 - globalIdx * 2);
    let scoreClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    if (score < 85) scoreClass = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';

    const linkBtn = item.url && item.url !== '#' ? `
      <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/25 transition-colors text-xs font-medium whitespace-nowrap">
        <span>直达</span><span>↗</span>
      </a>
    ` : `<span class="text-[var(--text-muted)] text-xs">—</span>`;

    return `
      <tr class="hover:bg-[var(--surface-tertiary)]/70 transition-colors">
        <td class="p-3.5 text-center whitespace-nowrap align-middle">
          ${rankBadge}
        </td>
        <td class="p-3.5 text-center whitespace-nowrap align-middle">
          <span class="inline-block px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${scoreClass}">
            ${score}%
          </span>
        </td>
        <td class="p-3.5 align-middle">
          <div class="font-bold text-white text-xs sm:text-sm leading-snug">${escapeHtml(item.name || '未命名实体')}</div>
        </td>
        <td class="p-3.5 align-middle">
          <span class="inline-block px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] bg-purple-500/15 text-purple-300 border border-purple-500/25 font-medium whitespace-nowrap">
            ${escapeHtml(item.tag || '通用')}
          </span>
        </td>
        <td class="p-3.5 align-middle">
          <div class="text-xs text-amber-200 font-medium flex items-center gap-1">
            <span>✨</span><span>${escapeHtml(item.rank_reason || '核心行业标杆')}</span>
          </div>
        </td>
        <td class="p-3.5 align-middle text-slate-200 text-xs leading-relaxed">
          ${escapeHtml(item.highlight || '—')}
        </td>
        <td class="p-3.5 align-middle whitespace-nowrap">
          <span class="px-2.5 py-1 rounded-md text-xs bg-emerald-500/15 text-emerald-300 font-mono font-medium">
            ${escapeHtml(item.funding || '未披露')}
          </span>
        </td>
        <td class="p-3.5 align-middle whitespace-nowrap text-slate-300 text-xs font-medium">
          ${escapeHtml(item.leader || '暂未披露')}
        </td>
        <td class="p-3.5 align-middle whitespace-nowrap text-[var(--text-muted)] text-xs">
          ${escapeHtml(item.location || '—')}
        </td>
        <td class="p-3.5 align-middle text-right whitespace-nowrap">
          <button onclick="enrichCompany('${escapeHtml(item.name)}', '${escapeHtml(item.url || '')}', '${escapeHtml(item.tag || '')}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-200 border border-purple-500/30 transition-all text-xs font-semibold hover:-translate-y-0.5 shadow-sm">
        <span>🔍</span><span>穿透官网底细</span>
      </button>
      ${linkBtn}
        </td>
      </tr>
    `;
  }).join('');
}

function renderFindAllPagination(totalItems, totalPages, currentPage, startIdx, endIdx) {
  const rangeEl = document.getElementById('findall-page-range');
  const totalEl = document.getElementById('findall-total-count');
  const btnContainer = document.getElementById('findall-page-buttons');
  const jumpInput = document.getElementById('findall-jump-page');

  if (rangeEl) rangeEl.textContent = totalItems > 0 ? `${startIdx + 1} - ${endIdx}` : '0 - 0';
  if (totalEl) totalEl.textContent = `${totalItems}`;
  if (jumpInput) {
    jumpInput.max = totalPages;
    jumpInput.value = currentPage;
  }

  if (!btnContainer) return;

  if (totalItems <= FINDALL_PAGE_SIZE) {
    btnContainer.innerHTML = `
      <button class="px-2.5 py-1 rounded bg-indigo-600 text-white font-medium text-xs shadow-sm">1</button>
    `;
    return;
  }

  let html = '';
  
  // Previous Button
  const prevDisabled = currentPage <= 1 ? 'disabled opacity-40 cursor-not-allowed' : 'hover:bg-[var(--surface-elevated)] hover:text-white';
  html += `<button onclick="goToFindAllPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''} class="px-2 py-1 rounded bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] text-xs text-slate-300 transition-colors ${prevDisabled}">‹ 上一页</button>`;

  // Page Numbers
  let pagesToShow = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pagesToShow.push(i);
  } else {
    pagesToShow.push(1);
    if (currentPage > 3) pagesToShow.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pagesToShow.push(i);
    if (currentPage < totalPages - 2) pagesToShow.push('...');
    pagesToShow.push(totalPages);
  }

  pagesToShow.forEach(p => {
    if (p === '...') {
      html += `<span class="px-1.5 py-1 text-slate-500 text-xs">...</span>`;
    } else {
      const isActive = p === currentPage;
      const cls = isActive
        ? 'bg-indigo-600 text-white font-bold shadow-sm'
        : 'bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] text-slate-300 hover:bg-[var(--surface-elevated)] hover:text-white';
      html += `<button onclick="goToFindAllPage(${p})" class="px-2.5 py-1 rounded text-xs transition-colors ${cls}">${p}</button>`;
    }
  });

  // Next Button
  const nextDisabled = currentPage >= totalPages ? 'disabled opacity-40 cursor-not-allowed' : 'hover:bg-[var(--surface-elevated)] hover:text-white';
  html += `<button onclick="goToFindAllPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''} class="px-2 py-1 rounded bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] text-xs text-slate-300 transition-colors ${nextDisabled}">下一页 ›</button>`;

  btnContainer.innerHTML = html;
}

function filterFindAllTable(keyword) {
  const kw = (keyword || '').toLowerCase().trim();
  if (!kw) {
    currentFindAllData = [...rawFindAllEntities];
  } else {
    currentFindAllData = rawFindAllEntities.filter(item => {
      const combined = `${item.name} ${item.tag} ${item.rank_reason} ${item.highlight} ${item.funding} ${item.leader} ${item.location}`.toLowerCase();
      return combined.includes(kw);
    });
  }
  currentFindAllPage = 1;
  goToFindAllPage(1);

  const countEl = document.getElementById('findall-result-count');
  if (countEl) countEl.textContent = `${currentFindAllData.length} 家/项`;
}

function renderFindAllSources(sources) {
  const container = document.getElementById('findall-sources');
  if (!container) return;
  if (!sources || sources.length === 0) {
    container.innerHTML = `<p class="text-xs text-[var(--text-muted)]">全网高密事实信源交叉计算</p>`;
    return;
  }
  container.innerHTML = sources.map(s => `
    <a href="${escapeHtml(s.url || '#')}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--surface-tertiary)] hover:bg-[var(--surface-elevated)] border border-[var(--border-subtle)] transition-colors group">
      <span class="text-sm">⚡</span>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-white group-hover:text-indigo-300 truncate">${escapeHtml(s.title || '信源')}</p>
        <p class="text-[10px] text-[var(--text-muted)] font-mono truncate">${escapeHtml(safeHostname(s.url))}</p>
      </div>
    </a>
  `).join('');
}

function exportFindAllCSV() {
  if (!currentFindAllData || currentFindAllData.length === 0) {
    showToast('暂无数据可导出', 'info');
    return;
  }
  const headers = ['综合排名', '智能匹配度', '实体/企业名称', '赛道与性质', '综合排名与推荐依据', '核心优势与主营业务亮点', '注册资本/投资规模', '负责人/管理团队', '落地地区', '官方网站/信源'];
  const rows = currentFindAllData.map((item, idx) => [
    item.rank || (idx + 1),
    `"${item.score || 85}%"`,
    `"${(item.name || '').replace(/"/g, '""')}"`,
    `"${(item.tag || '').replace(/"/g, '""')}"`,
    `"${(item.rank_reason || '').replace(/"/g, '""')}"`,
    `"${(item.highlight || '').replace(/"/g, '""')}"`,
    `"${(item.funding || '').replace(/"/g, '""')}"`,
    `"${(item.leader || '').replace(/"/g, '""')}"`,
    `"${(item.location || '').replace(/"/g, '""')}"`,
    `"${(item.url || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${currentFindAllQuery || '实体挖掘'}_商探AI_实体商机全景表_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`已成功导出 ${currentFindAllData.length} 条带排名的 Excel / CSV 表格！`, 'success');
}

function copyFindAllMarkdown() {
  if (!currentFindAllData || currentFindAllData.length === 0) {
    showToast('暂无数据可复制', 'info');
    return;
  }
  let md = `### 🎯 【${currentFindAllQuery}】商探 AI 实体与商机挖掘大表 (共 ${currentFindAllData.length} 家/项)\n\n`;
  md += '| 排名 | 匹配度 | 实体/企业名称 | 赛道性质 | 排名依据 | 核心业务与优势 | 投资规模 | 团队负责人 | 地区 | 官方信源 |\n';
  md += '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n';
  currentFindAllData.forEach((item, idx) => {
    const rank = item.rank || (idx + 1);
    const score = item.score || 85;
    md += `| **#${rank}** | ${score}% | **${item.name || ''}** | ${item.tag || ''} | ${item.rank_reason || ''} | ${item.highlight || ''} | ${item.funding || ''} | ${item.leader || ''} | ${item.location || ''} | [官网直达](${item.url || '#'}) |\n`;
  });
  copyText(md);
  showToast('Markdown 排名大表已复制到剪贴板！', 'success');
}



// ==================== 8.1 实体官网深度穿透 (Extract 扒底细) ====================

// ==================== 企业商业全景情报看板 (PitchBook / 企查查 Pro 风格) ====================

let currentEnrichDossier = null;

async function enrichCompany(name, url, tag) {
  const modal = document.getElementById('modal-company-enrich');
  const loadingEl = document.getElementById('enrich-modal-loading');
  const bodyEl = document.getElementById('enrich-modal-body');
  const titleEl = document.getElementById('enrich-modal-title');
  const taglineEl = document.getElementById('enrich-modal-tagline');
  const tagBadgeEl = document.getElementById('enrich-modal-tag');
  const websiteLink = document.getElementById('enrich-modal-website-link');

  if (!modal) return;
  modal.classList.remove('hidden');
  loadingEl?.classList.remove('hidden');
  bodyEl?.classList.add('hidden');

  if (titleEl) titleEl.textContent = `🏢 ${name}`;
  if (taglineEl) taglineEl.textContent = '正在通过 Parallel.ai Extract 深度穿透官网与商业事实...';
  if (tagBadgeEl) tagBadgeEl.textContent = tag || '商业科技';
  if (websiteLink) {
    if (url && url.startsWith('http')) {
      websiteLink.href = url;
      websiteLink.classList.remove('hidden');
      websiteLink.classList.add('inline-flex');
    } else {
      websiteLink.classList.add('hidden');
    }
  }

  try {
    const res = await fetchWithAuth(`${API_BASE}/api/findall/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, url: url || '', tag: tag || '' })
    }, 90000, 0);

    const result = await res.json();
    if (!res.ok) {
      if (res.status === 403 && !currentUser) openAuthModal('login');
      throw new Error(result.detail || '企业情报提取失败');
    }

    currentEnrichDossier = result.data || {};
    currentEnrichDossier.sources = result.sources || [];
    renderEnrichDossier(currentEnrichDossier);

    loadingEl?.classList.add('hidden');
    bodyEl?.classList.remove('hidden');

    await saveHistory('企业穿透', name, JSON.stringify(currentEnrichDossier), JSON.stringify(result.sources || []));
    checkAuth();
  } catch (err) {
    showToast(err.message, 'error');
    closeEnrichModal();
  }
}

function renderEnrichDossier(data) {
  if (!data) return;
  const titleEl = document.getElementById('enrich-modal-title');
  const taglineEl = document.getElementById('enrich-modal-tagline');
  const tagBadgeEl = document.getElementById('enrich-modal-tag');
  const websiteLink = document.getElementById('enrich-modal-website-link');

  if (titleEl) titleEl.textContent = `🏢 ${data.company_name || '企业档案'}`;
  if (taglineEl) taglineEl.textContent = data.tagline || '企业商业全景与产业链深度档案';
  if (tagBadgeEl) tagBadgeEl.textContent = data.industry || '商业科技';
  
  if (websiteLink) {
    const web = data.website || '';
    if (web && web.startsWith('http')) {
      websiteLink.href = web;
      websiteLink.classList.remove('hidden');
      websiteLink.classList.add('inline-flex');
    } else {
      websiteLink.classList.add('hidden');
    }
  }

  // 1. 四大 KPI 指标
  const metrics = data.metrics || {};
  const metricsGrid = document.getElementById('enrich-metrics-grid');
  if (metricsGrid) {
    metricsGrid.innerHTML = `
      <div class="p-3.5 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] space-y-1">
        <span class="text-[11px] text-indigo-300 font-medium flex items-center gap-1"><span>⚡</span><span>商业模式</span></span>
        <p class="text-xs sm:text-sm font-bold text-white line-clamp-2">${escapeHtml(metrics.business_model || '自主研发与产业交付')}</p>
      </div>
      <div class="p-3.5 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] space-y-1">
        <span class="text-[11px] text-cyan-300 font-medium flex items-center gap-1"><span>🏆</span><span>市场地位</span></span>
        <p class="text-xs sm:text-sm font-bold text-white line-clamp-2">${escapeHtml(metrics.market_position || '行业重点骨干标杆')}</p>
      </div>
      <div class="p-3.5 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] space-y-1">
        <span class="text-[11px] text-amber-300 font-medium flex items-center gap-1"><span>💰</span><span>资本与规模</span></span>
        <p class="text-xs sm:text-sm font-bold text-white line-clamp-2">${escapeHtml(metrics.scale_and_capital || '稳健经营，资本架构完善')}</p>
      </div>
      <div class="p-3.5 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] space-y-1">
        <span class="text-[11px] text-emerald-300 font-medium flex items-center gap-1"><span>📍</span><span>运营基地</span></span>
        <p class="text-xs sm:text-sm font-bold text-white line-clamp-2">${escapeHtml(metrics.headquarters || '主营总部及生产基地')}</p>
      </div>
    `;
  }

  // 2. 核心产品矩阵
  const products = data.products || [];
  const productsCountEl = document.getElementById('enrich-products-count');
  if (productsCountEl) productsCountEl.textContent = `${products.length} 项主营业务`;
  
  const productsList = document.getElementById('enrich-products-list');
  if (productsList) {
    if (products.length === 0) {
      productsList.innerHTML = '<p class="text-xs text-[var(--text-muted)] col-span-2 py-2">暂无公开细分产品线</p>';
    } else {
      productsList.innerHTML = products.map(p => `
        <div class="p-3.5 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] hover:border-indigo-500/40 transition-colors space-y-2 flex flex-col justify-between">
          <div class="space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <h5 class="text-xs sm:text-sm font-bold text-white truncate">${escapeHtml(p.name || '产品项目')}</h5>
              <span class="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-medium flex-shrink-0">${escapeHtml(p.category || '业务线')}</span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(p.desc || '')}</p>
          </div>
          ${p.highlight ? `
            <div class="pt-1.5 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-emerald-300 font-medium">
              <span>✨</span><span class="truncate">${escapeHtml(p.highlight)}</span>
            </div>
          ` : ''}
        </div>
      `).join('');
    }
  }

  // 3. 核心壁垒
  const moats = data.moats || [];
  const moatsList = document.getElementById('enrich-moats-list');
  if (moatsList) {
    if (moats.length === 0) {
      moatsList.innerHTML = '<p class="text-xs text-[var(--text-muted)] py-2">具备良好产业交付与运营沉淀</p>';
    } else {
      moatsList.innerHTML = moats.map(m => `
        <div class="p-3 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] space-y-1">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-bold text-white">${escapeHtml(m.title || '竞争壁垒')}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-mono">${escapeHtml(m.type || '核心壁垒')}</span>
          </div>
          <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(m.detail || '')}</p>
        </div>
      `).join('');
    }
  }

  // 4. 高管团队
  const executives = data.executives || [];
  const execList = document.getElementById('enrich-executives-list');
  if (execList) {
    if (executives.length === 0) {
      execList.innerHTML = '<p class="text-xs text-[var(--text-muted)] py-2">核心管理层具备多年产业经验</p>';
    } else {
      execList.innerHTML = executives.map(e => `
        <div class="p-3 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
            ${escapeHtml((e.name || '管')[0])}
          </div>
          <div class="flex-1 min-w-0 space-y-0.5">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-white">${escapeHtml(e.name || '管理人员')}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">${escapeHtml(e.title || '高管')}</span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(e.background || '深耕行业多年')}</p>
          </div>
        </div>
      `).join('');
    }
  }

  // 5. 标杆客户与生态伙伴
  const partners = data.partners_and_clients || [];
  const partnersList = document.getElementById('enrich-partners-list');
  if (partnersList) {
    if (partners.length === 0) {
      partnersList.innerHTML = '<p class="text-xs text-[var(--text-muted)] col-span-2 py-2">服务广泛行业客户与生态伙伴</p>';
    } else {
      partnersList.innerHTML = partners.map(pt => `
        <div class="p-3 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] space-y-1">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-bold text-white">${escapeHtml(pt.name || '标杆客户')}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono">${escapeHtml(pt.type || '客户案例')}</span>
          </div>
          <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(pt.cooperation || '')}</p>
        </div>
      `).join('');
    }
  }

  // 6. 战略透视
  const strategicSummary = document.getElementById('enrich-strategic-summary');
  if (strategicSummary) {
    strategicSummary.textContent = data.strategic_summary || '该企业在细分赛道具备成熟商业交付能力与产业协同价值。';
  }

  // 7. 信源
  const sources = data.sources || [];
  const sourcesEl = document.getElementById('enrich-modal-sources');
  if (sourcesEl) {
    if (sources.length === 0) {
      sourcesEl.innerHTML = '<p class="text-xs text-[var(--text-muted)]">Parallel Extract 官方直提与全网事实溯源</p>';
    } else {
      sourcesEl.innerHTML = sources.map(s => `
        <a href="${escapeHtml(s.url || '#')}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--surface-elevated)] border border-[var(--border-subtle)] transition-colors group">
          <span class="text-xs">⚡</span>
          <div class="flex-1 min-w-0">
            <p class="text-[11px] font-semibold text-white group-hover:text-indigo-300 truncate">${escapeHtml(s.title || '信源')}</p>
            <p class="text-[10px] text-[var(--text-muted)] font-mono truncate">${escapeHtml(safeHostname(s.url))}</p>
          </div>
        </a>
      `).join('');
    }
  }
}

function copyEnrichSummary() {
  if (!currentEnrichDossier) return;
  const d = currentEnrichDossier;
  const text = `🏢 【${d.company_name}】企业全景情报档案
定位: ${d.tagline || ''}
行业: ${d.industry || ''}
商业模式: ${d.metrics?.business_model || ''}
市场地位: ${d.metrics?.market_position || ''}
资本规模: ${d.metrics?.scale_and_capital || ''}
总部基地: ${d.metrics?.headquarters || ''}

📦 核心产品矩阵:
${(d.products || []).map(p => `• ${p.name} (${p.category}): ${p.desc} [${p.highlight}]`).join('\n')}

🛡️ 核心壁垒:
${(d.moats || []).map(m => `• ${m.title} [${m.type}]: ${m.detail}`).join('\n')}

💡 战略研判:
${d.strategic_summary || ''}`;

  navigator.clipboard.writeText(text).then(() => {
    showToast('已复制结构化情报摘要', 'success');
  });
}

function exportEnrichWord() {
  if (!currentEnrichDossier) return;
  const d = currentEnrichDossier;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>${d.company_name} - 企业商业全景尽调档案</title>
    <style>
      body { font-family: 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif; line-height: 1.8; color: #1e293b; padding: 30px; }
      h1 { font-size: 20pt; color: #0f172a; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
      h2 { font-size: 14pt; color: #4338ca; margin-top: 20px; border-left: 4px solid #6366f1; padding-left: 8px; }
      p { font-size: 10.5pt; }
      table { width: 100%; border-collapse: collapse; margin: 15px 0; }
      th, td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 10pt; text-align: left; }
      th { background: #f8fafc; font-weight: bold; }
    </style>
    </head>
    <body>
      <h1>🏢 ${d.company_name} - 企业商业全景尽调档案</h1>
      <p><strong>行业赛道：</strong>${d.industry || '商业科技'} | <strong>定位：</strong>${d.tagline || ''}</p>
      
      <h2>一、 核心速览与商业基本盘</h2>
      <table>
        <tr><th>核心商业模式</th><td>${d.metrics?.business_model || '自主研发与产业交付'}</td></tr>
        <tr><th>市场地位与梯队</th><td>${d.metrics?.market_position || '行业骨干标杆'}</td></tr>
        <tr><th>资本与估值规模</th><td>${d.metrics?.scale_and_capital || '稳健经营'}</td></tr>
        <tr><th>总部及运营基地</th><td>${d.metrics?.headquarters || '主要生产基地'}</td></tr>
      </table>

      <h2>二、 核心产品与业务矩阵</h2>
      <table>
        <tr><th>产品/业务线</th><th>类别</th><th>功能与解决痛点</th><th>核心技术亮点</th></tr>
        ${(d.products || []).map(p => `<tr><td><strong>${p.name}</strong></td><td>${p.category}</td><td>${p.desc}</td><td>${p.highlight}</td></tr>`).join('')}
      </table>

      <h2>三、 核心竞争壁垒与护城河</h2>
      ${(d.moats || []).map(m => `<p><strong>• ${m.title}</strong> [${m.type}]: ${m.detail}</p>`).join('')}

      <h2>四、 核心管理与高管团队</h2>
      ${(d.executives || []).map(e => `<p><strong>• ${e.name} (${e.title})</strong>: ${e.background}</p>`).join('')}

      <h2>五、 标杆客户与商业生态</h2>
      ${(d.partners_and_clients || []).map(pt => `<p><strong>• ${pt.name}</strong> [${pt.type}]: ${pt.cooperation}</p>`).join('')}

      <h2>六、 战略商业透视与合作研判</h2>
      <p style="background: #f1f5f9; padding: 12px; border-radius: 6px;">${d.strategic_summary || ''}</p>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${d.company_name}_企业商业尽调档案_${new Date().toISOString().slice(0, 10)}.doc`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('已成功导出 Word 档案！', 'success');
}

// 点击遮罩外部关闭
document.addEventListener('click', function(e) {
  const modal = document.getElementById('modal-company-enrich');
  if (modal && !modal.classList.contains('hidden') && e.target === modal) {
    closeEnrichModal();
  }
});

function closeEnrichModal() {
  const modal = document.getElementById('modal-company-enrich');
  modal?.classList.add('hidden');
}


// ==================== 8.2 AI 代跑长程深度多跳调研 (Deep Research Stream) ====================

function setDeepResearchPreset(topic) {
  const input = document.getElementById('deepresearch-input');
  if (input) {
    input.value = topic;
    executeDeepResearchStream();
  }
}

let deepResearchAbortController = null;

async function executeDeepResearchStream() {
  const input = document.getElementById('deepresearch-input');
  const depth = document.getElementById('deepresearch-depth')?.value || 'deep';
  const topic = input?.value.trim();

  if (!topic) {
    showToast('请输入长程调研课题', 'info');
    return;
  }

  const btn = document.getElementById('deepresearch-submit-btn');
  const empty = document.getElementById('deepresearch-empty');
  const progress = document.getElementById('deepresearch-progress');
  const result = document.getElementById('deepresearch-result');
  const stageEl = document.getElementById('deepresearch-stage');
  const timerEl = document.getElementById('deepresearch-timer');
  const contentEl = document.getElementById('deepresearch-content');
  const sourcesEl = document.getElementById('deepresearch-sources');

  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner w-4 h-4"></span><span>Agent 正在长程调研中...</span>';
  empty?.classList.add('hidden');
  result?.classList.add('hidden');
  progress?.classList.remove('hidden');
  contentEl.innerHTML = '';

  let seconds = 0;
  timerEl.textContent = '已耗时: 0s';
  const timer = setInterval(() => {
    seconds++;
    timerEl.textContent = `已耗时: ${seconds}s`;
  }, 1000);

  deepResearchAbortController = new AbortController();

  try {
    const res = await fetchWithAuth(`${API_BASE}/api/deepresearch/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, depth }),
      signal: deepResearchAbortController.signal
    });

    if (!res.ok) {
      if (res.status === 403 && !currentUser) openAuthModal('login');
      throw new Error(`HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let finalSources = [];

    progress?.classList.add('hidden');
    result?.classList.remove('hidden');

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'start' || data.type === 'stage') {
            if (stageEl) stageEl.textContent = data.stage;
          } else if (data.type === 'content') {
            fullContent += data.chunk;
            contentEl.innerHTML = renderMarkdown(fullContent);
          } else if (data.type === 'done') {
            finalSources = data.sources || [];
            if (sourcesEl) renderSources(sourcesEl, finalSources);
            const heroHtml = data.image_url ? renderAiHeroImage(data.image_url, `【${topic}】SenseNova AI 长程深度调研全景图`) : '';
            contentEl.innerHTML = heroHtml + renderMarkdown(fullContent);
            await saveHistory('长程调研', topic, { markdown: fullContent, image_url: data.image_url }, JSON.stringify(finalSources));
            checkAuth();
            showToast('AI 长程深度调研与全景大图已完成！', 'success');
          } else if (data.type === 'error') {
            throw new Error(data.message || '长程调研失败');
          }
        } catch (e) {
          if (e.message !== 'Unexpected end of JSON input') console.error('SSE parse error:', e);
        }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      showToast(err.message, 'error');
      empty?.classList.remove('hidden');
      result?.classList.add('hidden');
    }
  } finally {
    clearInterval(timer);
    progress?.classList.add('hidden');
    btn.disabled = false;
    btn.innerHTML = '<span>🕵️‍♂️</span><span>启动 AI 长程深度调研</span>';
  }
}
