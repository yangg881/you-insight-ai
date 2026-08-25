// 兼容根路径(Vercel/本地8200)与子路径(/you-insight/)两种部署入口：
const API_BASE = window.location.pathname.startsWith('/you-insight') ? '/you-insight' : '';


let currentTab = 'home';
let historyData = [];
let historyTotal = 0;
let historyOffset = 0;
const PAGE_SIZE = 50;
let currentSources = [];

async function init() {
  await loadTemplates();
  await loadHistory();
  updateHistoryBadge();
  switchTab('home');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '⚠️', info: '💡' };
  toast.innerHTML = `<span>${icons[type] || '✨'}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3200);
}

// 统一带超时+自动重试的 fetch：浏览器到服务器的网络抖动经常表现为 "Failed to fetch"，
// 绝大多数是瞬时丢包/扩展拦截，重试 1 次就过；同时把浏览器的 TypeError 翻译成中文提示。
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
      // TypeError 多数是浏览器层面的网络层失败（"Failed to fetch"），离线时不重试
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

// URL 域名容错提取：脏数据只影响单条展示，不再炸掉整个列表
function safeHostname(url) {
  try { return new URL(url).hostname; } catch (e) { return ''; }
}

function renderMarkdown(md) {
  if (!md) return '';
  let html = window.marked ? marked.parse(md) : md.replace(/\n/g, '<br>');
  html = html.replace(/\[\[(\d+)\]\]/g, (m, n) => `<button onclick="scrollToSource(${n})" class="source-badge" title="查看来源">[${n}]</button>`);
  return html;
}

function scrollToSource(idx) {
  const el = document.getElementById(`source-${idx}`);
  if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('ring-2', 'ring-indigo-500'); setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500'), 2000); }
}

function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll('.workspace-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById(`panel-${tabId}`)?.classList.remove('hidden');
  document.querySelectorAll('.tab-btn, .mobile-nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tabId}`)?.classList.add('active');
  document.getElementById(`m-nav-${tabId}`)?.classList.add('active');
}

function startTimer(elId) {
  const start = Date.now();
  const el = document.getElementById(elId);
  return setInterval(() => { if (el) el.textContent = ((Date.now() - start) / 1000).toFixed(1); }, 100);
}
function stopTimer(id) { clearInterval(id); }

// 长任务进度文案随时间推进，避免"正在检索..."挂两分钟不动
function startStageRotation(stageElId, timerElId, stages) {
  const int = setInterval(() => {
    const el = document.getElementById(stageElId);
    if (!el) return;
    const t = parseFloat(document.getElementById(timerElId)?.textContent || '0');
    let idx = 0;
    if (t > 45) idx = 3; else if (t > 25) idx = 2; else if (t > 10) idx = 1;
    if (stages[idx]) el.textContent = stages[idx];
  }, 4000);
  return int;
}

function quickFill(type, text) {
  const el = document.getElementById(`${type}-input`);
  if (el) { el.value = text; if (type === 'digest') executeDigest(); else if (type === 'research') executeResearchStream(); }
}

function quickStart(templateId) {
  const templates = { competitor: '请对比分析以下产品/公司的核心功能、定价策略、技术架构和市场定位：', tech: '请深度调研以下技术方案的优缺点、适用场景、社区活跃度和迁移成本：', investment: '请对以下公司/赛道进行投资尽调分析，包括市场规模、竞争格局、核心壁垒和风险因素：', market: '请分析以下市场的进入策略，包括监管环境、本地化需求、渠道建设和增长机会：' };
  switchTab('research');
  document.getElementById('research-input').value = templates[templateId] || '';
  showToast('已填充模板，请补充具体对象', 'info');
}

async function handleGlobalSearch() {
  const query = document.getElementById('global-search').value.trim();
  if (!query) return;
  if (query.startsWith('http')) { switchTab('contents'); document.getElementById('contents-input').value = query; executeContents(); }
  else if (query.length < 30 && !query.includes(' ')) { switchTab('search'); document.getElementById('search-input').value = query; executeSearch(); }
  else { switchTab('research'); document.getElementById('research-input').value = query; executeResearchStream(); }
}

async function loadTemplates() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/templates`, {}, 15000);
    const data = await res.json();
    const list = document.getElementById('template-list');
    data.data?.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'w-full text-left px-3 py-2 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] hover:text-white transition-colors';
      btn.innerHTML = `<span class="mr-2">${t.icon}</span>${escapeHtml(t.name)}`;
      btn.onclick = () => quickStart(t.id);
      list?.appendChild(btn);
    });
  } catch (e) { console.error('Load templates failed:', e); }
}

async function loadHistory(append = false) {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/history?limit=${PAGE_SIZE}&offset=${historyOffset}`, {}, 15000);
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
  if (recent.length === 0) { container.innerHTML = '<p class="text-sm text-[var(--text-muted)]">暂无研究记录</p>'; return; }
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

// 后端下发 "YYYY-MM-DD HH:MM:SS"（本地时区）；空格分隔格式在 Safari 下会 Invalid Date，先转成 ISO 形式
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
  if (items.length === 0) { list.innerHTML = '<p class="text-sm text-[var(--text-muted)] text-center py-8">暂无历史记录</p>'; return; }
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
    // 防止单条超大内容撑爆数据库与列表接口
    const safeContent = typeof content === 'string' ? content.slice(0, 200000) : JSON.stringify(content).slice(0, 200000);
    await fetchWithTimeout(`${API_BASE}/api/history`, {
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
  try { await fetchWithTimeout(`${API_BASE}/api/history/${id}`, { method: 'DELETE' }, 15000); historyOffset = 0; await loadHistory(); updateHistoryBadge(); showToast('已删除', 'success'); } catch (e) { showToast('删除失败', 'error'); }
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

// 历史恢复：按记录类型把内容还原到对应面板（此前只是弹个提示，等于没有恢复）
async function restoreHistory(id) {
  const summary = historyData.find(h => h.id === id);
  if (!summary) return;
  let full = summary;
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/history/${id}`, {}, 20000);
    const data = await res.json();
    if (res.ok && data.data) full = data.data;
  } catch (e) { showToast('详情加载失败，仅恢复摘要', 'info'); }
  const type = full.type;
  const isList = ['实时搜索', '新闻流', '正文提取'].includes(type);
  const panelMap = { '行业早报': 'digest', '深度研报': 'research', '实时搜索': 'search', '企业财报': 'finance', '正文提取': 'contents', '新闻流': 'news' };
  const panel = panelMap[type] || 'research';
  switchTab(panel);
  const inputEl = document.getElementById(`${panel}-input`);
  if (inputEl && !isList) inputEl.value = full.title || '';
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
      document.getElementById('finance-sources').innerHTML = '<p class="text-sm text-[var(--text-muted)]">历史记录：披露源未存档</p>';
    } else if (type === '实时搜索') {
      renderWebItems(JSON.parse(full.content || '[]'));
    } else if (type === '新闻流') {
      renderNewsItems(JSON.parse(full.content || '[]'));
    } else if (type === '正文提取') {
      renderContentsItems(JSON.parse(full.content || '[]'));
    } else {
      switchTab('research');
      document.getElementById('research-content').innerHTML = renderMarkdown(full.content || full.excerpt || '');
    }
    showToast('已恢复历史记录', 'success');
    toggleHistoryDrawer();
  } catch (e) {
    showToast('记录解析失败', 'error');
    result?.classList.add('hidden'); empty?.classList.remove('hidden');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function copyContent(id) {
  const el = document.getElementById(id);
  if (el) { navigator.clipboard.writeText(el.innerText); showToast('已复制到剪贴板', 'success'); }
}

function exportMarkdown(id, filename) {
  const el = document.getElementById(id);
  if (!el) return;
  const blob = new Blob([el.innerText], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('导出成功', 'success');
}

async function executeDigest() {
  const query = document.getElementById('digest-input')?.value.trim();
  if (!query) { showToast('请输入早报主题', 'info'); return; }
  const empty = document.getElementById('digest-empty');
  const progress = document.getElementById('digest-progress');
  const result = document.getElementById('digest-result');
  const btn = document.getElementById('digest-submit-btn');
  empty.classList.add('hidden'); result.classList.add('hidden'); progress.classList.remove('hidden'); btn.disabled = true;
  const timer = startTimer('digest-timer');
  const rotator = startStageRotation('digest-stage', 'digest-timer', ['正在检索最新资讯...', '多源交叉分析中，约需 1-2 分钟...', '正在整合研报正文...', '即将完成，请稍候...']);
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/digest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: query }) }, 240000);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '生成失败');
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
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="text-sm font-medium text-white hover:text-indigo-400 line-clamp-2 block mb-1">${escapeHtml(item.title || '无标题')}</a>
        <p class="text-xs text-[var(--text-secondary)] line-clamp-2">${escapeHtml(item.description || item.snippets?.[0] || '')}</p>
      </div>
    `).join('');
    await saveHistory('行业早报', query, content, sources);
    showToast('早报生成成功！', 'success');
    progress.classList.add('hidden'); result.classList.remove('hidden');
  } catch (err) {
    showToast('生成失败: ' + err.message, 'error');
    progress.classList.add('hidden'); empty.classList.remove('hidden');
  } finally { stopTimer(timer); stopTimer(rotator); btn.disabled = false; }
}

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
  const rotator = startStageRotation('research-stage', 'research-timer', ['初始化检索通道...', '全网多轮检索中...', '正在总结与分析引用...', '深度推理中，大课题约需 2-3 分钟...']);
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/research/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input, depth: document.getElementById('research-depth')?.value }) }, 300000);
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const errData = await res.json(); if (errData.detail) msg = typeof errData.detail === 'string' ? `${msg} ${errData.detail}` : JSON.stringify(errData.detail); } catch (e) {}
      throw new Error(msg);
    }
    if (!res.body) throw new Error('当前浏览器不支持流式响应');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let finalContent = null;
    let gotDone = false;
    let streamError = null;
    progress.classList.add('hidden'); result.classList.remove('hidden');
    contentEl.innerHTML = '<span class="stream-cursor"></span>';
    // 处理一条完整的 SSE data 消息
    const handleMessage = (line) => {
      if (!line.startsWith('data: ')) return;
      let data;
      try { data = JSON.parse(line.slice(6)); } catch (e) { console.error('Parse error:', e); return; }
      if (data.type === 'content') {
        fullContent += data.chunk;
        contentEl.innerHTML = renderMarkdown(fullContent) + '<span class="stream-cursor"></span>';
      } else if (data.type === 'stage') {
        const stageEl = document.getElementById('research-stage');
        if (stageEl) stageEl.textContent = data.stage;
      } else if (data.type === 'done') {
        currentSources = data.sources || [];
        finalContent = data.full_content || fullContent;
        contentEl.innerHTML = renderMarkdown(finalContent);
        renderSources(sourcesEl, currentSources);
        gotDone = true;
      } else if (data.type === 'error') {
        streamError = data.message || '未知错误';
      }
    };
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // SSE 消息可能被拆包/粘包，必须先攒进缓冲区再按空行分割
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop();
      for (const evt of events) {
        for (const line of evt.split('\n')) handleMessage(line);
        if (streamError) break;
      }
      if (streamError) break;
    }
    // 流结束时冲掉残留缓冲，防止最后一条消息因缺少结尾空行而丢失
    if (!streamError && buffer.trim()) {
      for (const line of buffer.split('\n')) handleMessage(line);
    }
    if (streamError) throw new Error(streamError);
    if (gotDone || fullContent.trim()) {
      await saveHistory('深度研报', input, gotDone ? finalContent : fullContent, currentSources);
      showToast('研报生成完成！', 'success');
    } else {
      throw new Error('服务未返回任何内容');
    }
  } catch (err) {
    showToast('研究失败: ' + err.message, 'error');
    progress.classList.add('hidden'); empty.classList.remove('hidden');
  } finally { stopTimer(timer); stopTimer(rotator); btn.disabled = false; }
}

function renderSources(el, sources) {
  const countEl = document.getElementById('research-sources-count');
  if (countEl) countEl.textContent = `(${sources.length})`;
  if (sources.length === 0) { el.innerHTML = '<p class="text-sm text-[var(--text-muted)]">无外部引用源</p>'; return; }
  el.innerHTML = sources.map((src, i) => `
    <div id="source-${i + 1}" class="p-3 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] flex items-start gap-3">
      <span class="source-badge shrink-0">[${i + 1}]</span>
      <div class="min-w-0 flex-1">
        <a href="${escapeHtml(src.url || '#')}" target="_blank" rel="noopener" class="text-sm font-medium text-white hover:text-indigo-400 block truncate">${escapeHtml(src.title || src.url || '')}</a>
        <p class="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">${escapeHtml(src.snippets?.join(' ') || '')}</p>
      </div>
    </div>
  `).join('');
}

// 搜索结果渲染：新搜索与历史恢复共用同一份外观
function renderWebItems(items) {
  const result = document.getElementById('search-result');
  if (!result) return;
  if (!Array.isArray(items) || items.length === 0) { result.innerHTML = '<p class="text-sm text-[var(--text-muted)]">未找到相关结果</p>'; result.classList.remove('hidden'); return; }
  result.innerHTML = items.map(item => `
    <div class="card p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <a href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener" class="text-base font-semibold text-white hover:text-indigo-400 block mb-1">${escapeHtml(item.title || '无标题')}</a>
          <p class="text-sm text-[var(--text-secondary)] mb-2">${escapeHtml(item.description || item.snippets?.[0] || '')}</p>
          <div class="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>${escapeHtml(safeHostname(item.url))}</span>
            ${item.page_age ? `<span>·</span><span>${escapeHtml(String(item.page_age).split('T')[0])}</span>` : ''}
          </div>
        </div>
        ${item.url ? `<button onclick="extractUrl('${encodeURIComponent(item.url)}')" class="btn-secondary text-xs shrink-0">📥 提取正文</button>` : ''}
      </div>
    </div>
  `).join('');
  result.classList.remove('hidden');
}

async function executeSearch() {
  const query = document.getElementById('search-input')?.value.trim();
  const count = document.getElementById('search-count')?.value || 10;
  if (!query) { showToast('请输入搜索关键词', 'info'); return; }
  const empty = document.getElementById('search-empty');
  const result = document.getElementById('search-result');
  const progress = document.getElementById('search-progress');
  const btn = document.getElementById('search-submit-btn');
  empty.classList.add('hidden'); result.classList.add('hidden'); progress?.classList.remove('hidden'); btn.disabled = true;
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, count: parseInt(count) }) }, 90000);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '搜索失败');
    const items = data.data?.results?.web || [];
    renderWebItems(items);
    await saveHistory('实时搜索', query, JSON.stringify(items));
  } catch (err) { showToast('搜索失败: ' + err.message, 'error'); empty.classList.remove('hidden'); }
  finally { btn.disabled = false; progress?.classList.add('hidden'); }
}

// 新闻渲染：新查询与历史恢复共用
function renderNewsItems(items) {
  const result = document.getElementById('news-result');
  if (!result) return;
  if (!Array.isArray(items) || items.length === 0) { result.innerHTML = '<p class="text-sm text-[var(--text-muted)]">未找到相关新闻</p>'; result.classList.remove('hidden'); return; }
  result.innerHTML = items.map(item => `
    <div class="card p-4">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium">新闻</span>
        <span class="text-xs text-[var(--text-muted)]">${item.page_age ? escapeHtml(String(item.page_age).split('T')[0]) : '实时'}</span>
      </div>
      <a href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener" class="text-base font-semibold text-white hover:text-indigo-400 block mb-1">${escapeHtml(item.title || '无标题')}</a>
      <p class="text-sm text-[var(--text-secondary)]">${escapeHtml(item.description || item.snippets?.[0] || '')}</p>
    </div>
  `).join('');
  result.classList.remove('hidden');
}

async function executeNews() {
  const query = document.getElementById('news-input')?.value.trim();
  if (!query) { showToast('请输入追踪主题', 'info'); return; }
  const empty = document.getElementById('news-empty');
  const result = document.getElementById('news-result');
  const progress = document.getElementById('news-progress');
  const btn = document.getElementById('news-submit-btn');
  empty.classList.add('hidden'); result.classList.add('hidden'); progress?.classList.remove('hidden'); btn.disabled = true;
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/news`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, count: 10 }) }, 90000);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '获取失败');
    const items = data.data?.results?.news || data.data?.results?.web || [];
    renderNewsItems(items);
    await saveHistory('新闻流', query, JSON.stringify(items));
  } catch (err) { showToast('获取失败: ' + err.message, 'error'); empty.classList.remove('hidden'); }
  finally { btn.disabled = false; progress?.classList.add('hidden'); }
}

async function executeFinance() {
  const input = document.getElementById('finance-input')?.value.trim();
  if (!input) { showToast('请输入公司或财务问题', 'info'); return; }
  const empty = document.getElementById('finance-empty');
  const result = document.getElementById('finance-result');
  const progress = document.getElementById('finance-progress');
  const btn = document.getElementById('finance-submit-btn');
  empty.classList.add('hidden'); result.classList.add('hidden'); progress?.classList.remove('hidden'); btn.disabled = true;
  const timer = startTimer('finance-timer');
  const rotator = startStageRotation('finance-stage', 'finance-timer', ['正在穿透 SEC 披露文件...', '检索财报数据中，约需 1-2 分钟...', '正在比对财务数据...']);
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/finance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input }) }, 180000);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '分析失败');
    const output = data.data?.output || {};
    document.getElementById('finance-content').innerHTML = renderMarkdown(output.content || '暂无分析结果');
    renderSources(document.getElementById('finance-sources'), output.sources || []);
    await saveHistory('企业财报', input, output.content, output.sources);
    result.classList.remove('hidden');
  } catch (err) { showToast('分析失败: ' + err.message, 'error'); empty.classList.remove('hidden'); }
  finally { btn.disabled = false; progress?.classList.add('hidden'); stopTimer(timer); stopTimer(rotator); }
}

function extractUrl(encUrl) {
  const url = decodeURIComponent(encUrl);
  switchTab('contents');
  document.getElementById('contents-input').value = url;
  executeContents();
}

// 正文提取渲染：新提取与历史恢复共用
function renderContentsItems(items) {
  const result = document.getElementById('contents-result');
  if (!result) return;
  if (!Array.isArray(items) || items.length === 0) { result.innerHTML = '<p class="text-sm text-[var(--text-muted)]">未提取到内容</p>'; result.classList.remove('hidden'); return; }
  result.innerHTML = items.map((item, idx) => {
    const text = item.markdown || item.html || item.text || '提取为空';
    const enc = encodeURIComponent(text);
    return `
      <div class="card p-4">
        <div class="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border-subtle)]">
          <span class="text-sm font-medium text-amber-400">网页 #${idx + 1}</span>
          <button onclick="copyDirectText('${enc}')" class="btn-secondary text-xs">📋 复制</button>
        </div>
        <a href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener" class="text-xs text-[var(--text-muted)] hover:text-indigo-400 block mb-2 truncate">${escapeHtml(item.url || '')}</a>
        <div class="bg-[var(--surface-primary)] p-3 rounded-lg text-xs text-[var(--text-secondary)] max-h-96 overflow-y-auto whitespace-pre-wrap font-mono custom-scrollbar">${escapeHtml(text.slice(0, 8000))}${text.length > 8000 ? '... [已截断]' : ''}</div>
      </div>
    `;
  }).join('');
  result.classList.remove('hidden');
}

async function executeContents() {
  const raw = document.getElementById('contents-input')?.value.trim();
  if (!raw) { showToast('请输入目标网页 URL', 'info'); return; }
  const urls = raw.split(/[\n,]+/).map(u => u.trim()).filter(u => u.startsWith('http'));
  if (urls.length === 0) { showToast('请输入有效链接', 'error'); return; }
  const empty = document.getElementById('contents-empty');
  const result = document.getElementById('contents-result');
  const progress = document.getElementById('contents-progress');
  const btn = document.getElementById('contents-submit-btn');
  empty.classList.add('hidden'); result.classList.add('hidden'); progress?.classList.remove('hidden'); btn.disabled = true;
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/contents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls }) }, 120000);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '提取失败');
    const items = data.data || [];
    renderContentsItems(items);
    await saveHistory('正文提取', urls.join(', '), JSON.stringify(items));
    showToast(`成功提取 ${items.length} 个网页`, 'success');
  } catch (err) { showToast('提取失败: ' + err.message, 'error'); empty.classList.remove('hidden'); }
  finally { btn.disabled = false; progress?.classList.add('hidden'); }
}

function copyDirectText(encoded) {
  navigator.clipboard.writeText(decodeURIComponent(encoded));
  showToast('已复制', 'success');
}

init();
