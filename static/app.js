
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

// ==================== YouInsight AI Studio Frontend Core ====================

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
  
  // 检查 URL 是否带 #admin 或 #digest 等锚点
  const hash = window.location.hash.replace('#', '');
  if (hash === 'admin') {
    if (currentUser && ['admin', 'super_admin'].includes(currentUser.role)) {
      switchTab('admin');
    } else {
      openAuthModal('login');
      showToast('请登录管理员账号以进入后台', 'info');
    }
  } else if (hash && ['home', 'digest', 'research', 'search', 'news', 'finance', 'contents'].includes(hash)) {
    switchTab(hash);
  } else {
    switchTab('home');
  }

  loadSystemAnnouncement();
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

// ==================== Toast 提示组件 ====================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '⚠️', info: '💡' };
  toast.innerHTML = `<span>${icons[type] || '✨'}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
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
  const adminTab = document.getElementById('tab-admin');
  const mobAdminTab = document.getElementById('mob-tab-admin');
  if (!container) return;

  if (currentUser) {
    const quotaText = currentUser.daily_quota === -1 ? '无限' : `${currentUser.remaining_today}次`;
    const roleBadge = currentUser.role === 'super_admin' ? '👑 超管' : (currentUser.role === 'admin' ? '🛡️ 管理' : '✨ 会员');
    
    container.innerHTML = `
      <div class="relative">
        <button onclick="toggleUserDropdown(event)" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-300 text-xs transition-colors">
          <span>👤</span>
          <span class="font-bold max-w-[90px] truncate">${escapeHtml(currentUser.username)}</span>
          <span class="px-1.5 py-0.2 bg-indigo-500/30 text-indigo-200 rounded text-[10px] font-mono">${quotaText}</span>
          <span>▾</span>
        </button>
        <div id="user-dropdown-menu" class="user-dropdown hidden">
          <div class="px-3 py-2 border-b border-white/5 mb-1">
            <p class="text-xs font-bold text-white">${escapeHtml(currentUser.username)}</p>
            <p class="text-[11px] text-[var(--text-muted)]">${roleBadge} · 今日剩余: ${quotaText}</p>
          </div>
          <a href="profile.html" class="dropdown-item"><span>👤</span> 个人中心与资产大盘</a>
          ${['admin', 'super_admin'].includes(currentUser.role) ? `<a href="admin.html" class="dropdown-item text-amber-300"><span>⚙️</span> 系统管理后台大盘</a>` : ''}
          <button onclick="handleLogout()" class="dropdown-item text-rose-400 hover:text-rose-300"><span>🚪</span> 退出登录</button>
        </div>
      </div>
    `;

    // 展示管理员后台入口
    if (['admin', 'super_admin'].includes(currentUser.role)) {
      if (adminTab) adminTab.classList.remove('hidden');
      if (mobAdminTab) mobAdminTab.classList.remove('hidden');
    } else {
      if (adminTab) adminTab.classList.add('hidden');
      if (mobAdminTab) mobAdminTab.classList.add('hidden');
    }
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
    if (adminTab) adminTab.classList.add('hidden');
    if (mobAdminTab) mobAdminTab.classList.add('hidden');
  }
}

function toggleUserDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('user-dropdown-menu');
  if (menu) menu.classList.toggle('hidden');
}

function closeUserDropdown() {
  const menu = document.getElementById('user-dropdown-menu');
  if (menu) menu.classList.add('hidden');
}
window.addEventListener('click', closeUserDropdown);

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
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('hidden');
}

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
    if (title) title.textContent = '欢迎使用 YouInsight AI';
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

// 注册提交 (短信/邮件验证码 二选一 + 密码 + 可选用户名)
async function handleRegisterSubmit() {
  const target = document.getElementById('reg-target')?.value.trim();
  const code = document.getElementById('reg-code')?.value.trim();
  const password = document.getElementById('reg-password')?.value;
  const username = document.getElementById('reg-username')?.value.trim();
  const submitBtn = document.getElementById('btn-reg-submit');

  if (!target || !code || !password) {
    showToast('请完整填写账号、验证码和密码', 'info');
    return;
  }
  if (password.length < 6) {
    showToast('密码长度至少 6 位', 'info');
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

// 重置密码提交
async function handleResetSubmit() {
  const target = document.getElementById('reset-target')?.value.trim();
  const code = document.getElementById('reset-code')?.value.trim();
  const new_password = document.getElementById('reset-new-password')?.value;
  const submitBtn = document.getElementById('btn-reset-submit');

  if (!target || !code || !new_password) {
    showToast('请完整填写所有信息', 'info');
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
  } catch (err) {
    showToast(err.message, 'error');
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
  
  // 检查 URL 是否带 #admin 或 #digest 等锚点
  const hash = window.location.hash.replace('#', '');
  if (hash === 'admin') {
    if (currentUser && ['admin', 'super_admin'].includes(currentUser.role)) {
      switchTab('admin');
    } else {
      openAuthModal('login');
      showToast('请登录管理员账号以进入后台', 'info');
    }
  } else if (hash && ['home', 'digest', 'research', 'search', 'news', 'finance', 'contents'].includes(hash)) {
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
    const res = await fetchWithTimeout(`${API_BASE}/api/health`);
    // Check if announcement is available
  } catch (e) {}
}

// ==================== 页面导航与 Tab 切换 ====================

function switchTab(tabId) {
  currentTab = tabId;
  const panels = ['home', 'digest', 'research', 'search', 'news', 'finance', 'contents', 'admin'];
  panels.forEach(id => {
    const panel = document.getElementById(`panel-${id}`);
    const tab = document.getElementById(`tab-${id}`);
    const mobTab = document.getElementById(`mob-tab-${id}`);
    if (panel) panel.classList.toggle('hidden', id !== tabId);
    if (tab) tab.classList.toggle('active', id !== tabId);
    if (mobTab) mobTab.classList.toggle('active', id !== tabId);
  });
  if (tabId === 'admin') loadAdminData();
}

function startTimer(elementId) {
  let seconds = 0;
  const el = document.getElementById(elementId);
  if (!el) return null;
  el.textContent = '耗时: 0s';
  return setInterval(() => {
    seconds++;
    el.textContent = `耗时: ${seconds}s`;
  }, 1000);
}

function stopTimer(timer) {
  if (timer) clearInterval(timer);
}

function startStageRotation(stageId, timerId, stages = []) {
  if (!stages || stages.length === 0) return null;
  let idx = 0;
  const stageEl = document.getElementById(stageId);
  if (stageEl) stageEl.textContent = stages[0];
  return setInterval(() => {
    idx = (idx + 1) % stages.length;
    if (stageEl) stageEl.textContent = stages[idx];
  }, 3500);
}

function quickFill(type, text) {
  const el = document.getElementById(`${type}-input`);
  if (el) {
    el.value = text;
    if (type === 'digest') executeDigest();
    else if (type === 'research') executeResearchStream();
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
  showToast('已填充模板，请补充具体对象', 'info');
}

async function handleGlobalSearch() {
  const query = document.getElementById('global-search').value.trim();
  if (!query) return;
  if (query.startsWith('http')) {
    switchTab('contents');
    document.getElementById('contents-input').value = query;
    executeContents();
  } else if (query.length < 30 && !query.includes(' ')) {
    switchTab('search');
    document.getElementById('search-input').value = query;
    executeSearch();
  } else {
    switchTab('research');
    document.getElementById('research-input').value = query;
    executeResearchStream();
  }
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
  const panelMap = { '行业早报': 'digest', '深度研报': 'research', '实时搜索': 'search', '企业财报': 'finance', '正文提取': 'contents', '新闻流': 'news' };
  const panel = panelMap[type] || 'research';
  switchTab(panel);

  const inputEl = document.getElementById(`${panel}-input`);
  if (inputEl) inputEl.value = full.title || '';
  const empty = document.getElementById(`${panel}-empty`);
  const result = document.getElementById(`${panel}-result`);
  const progress = document.getElementById(`${panel}-progress`);
  empty?.classList.add('hidden'); progress?.classList.add('hidden'); result?.classList.remove('hidden');

  try {
    if (type === '行业早报') {
      document.getElementById('digest-content').innerHTML = renderMarkdown(full.content || full.excerpt || '');
      document.getElementById('digest-news').innerHTML = '<p class="text-sm text-[var(--text-muted)] col-span-2">历史记录：关联新闻信源未存档</p>';
    } else if (type === '深度研报') {
      const contentEl = document.getElementById('research-content');
      const sourcesEl = document.getElementById('research-sources');
      contentEl.innerHTML = renderMarkdown(full.content || full.excerpt || '');
      let sources = [];
      try { sources = full.sources ? JSON.parse(full.sources) : []; } catch (e) { sources = []; }
      currentSources = sources;
      renderSources(sourcesEl, sources);
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
    showToast('记录解析失败', 'error');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function safeHostname(url) {
  try { return new URL(url).hostname; } catch (e) { return ''; }
}

function renderMarkdown(content) {
  if (window.marked) {
    return marked.parse(content);
  }
  return content.replace(/\n/g, '<br>');
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

// 导出 PDF (浏览器矢量打印)
function exportPDF(id, filename) {
  const el = document.getElementById(id);
  if (!el) return;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>${filename}</title>
    <style>
      body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; padding: 40px; color: #111827; line-height: 1.7; }
      h1 { border-bottom: 2px solid #6366f1; padding-bottom: 10px; color: #1f2937; }
      h2 { color: #374151; margin-top: 24px; }
      p { font-size: 14px; }
      @media print { body { padding: 0; } }
    </style>
    </head>
    <body>
      <h2>${filename}</h2>
      ${el.innerHTML}
      <script>window.onload = function() { window.print(); window.close(); }<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
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
    document.getElementById('digest-content').innerHTML = renderMarkdown(content);

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

    await saveHistory('行业早报', query, content, sources);
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

    const handleMessage = (line) => {
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
        contentEl.innerHTML = renderMarkdown(fullContent);
        renderSources(sourcesEl, finalSources);
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
        if (line.trim()) handleMessage(line.trim());
      }
    }
    if (buffer.trim()) handleMessage(buffer.trim());

    await saveHistory('深度研报', input, fullContent, finalSources);
    showToast('研报生成完毕！', 'success');
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
      body: JSON.stringify({ query, count: parseInt(count) })
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
