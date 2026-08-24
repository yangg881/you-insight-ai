// Global State
let currentTab = 'digest';
let customApiKey = localStorage.getItem('you_custom_api_key') || '';
let historyData = [];

try {
  historyData = JSON.parse(localStorage.getItem('you_insight_history') || '[]');
} catch (e) {
  historyData = [];
}

// Fallback simple markdown parser in case CDN fails
function renderMarkdown(md) {
  if (window.marked && typeof window.marked.parse === 'function') {
    try {
      return window.marked.parse(md);
    } catch (e) {
      console.warn('Marked parse error:', e);
    }
  }
  // Simple fallback
  return md
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-slate-100 mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-slate-100 mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold text-white mt-4 mb-2 border-b border-slate-800 pb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em class="text-slate-300">$1</em>')
    .replace(/\[\[(\d+)\]\]/g, '<span class="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-xs font-mono font-semibold ml-1">[$1]</span>')
    .replace(/\n/gim, '<br>');
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
  updateHistoryBadge();
  if (customApiKey) {
    const keyInput = document.getElementById('custom-api-key-input');
    if (keyInput) keyInput.value = customApiKey;
  }
  testCurrentKey(true);
});

// Tab Switcher
function switchTab(tabId) {
  currentTab = tabId;
  
  // 1. Update nav tab buttons
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  if (activeBtn) activeBtn.classList.add('active');

  // 2. Hide all panels, show target panel
  document.querySelectorAll('.workspace-panel').forEach(panel => {
    panel.classList.add('hidden');
  });
  const activePanel = document.getElementById(`panel-${tabId}`);
  if (activePanel) activePanel.classList.remove('hidden');
}

// Timer helper
function startTimer(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return null;
  const start = Date.now();
  el.innerText = '0.0s';
  const interval = setInterval(() => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    el.innerText = `${elapsed}s`;
  }, 100);
  return interval;
}

function stopTimer(interval) {
  if (interval) clearInterval(interval);
}

function getApiKeyHeader() {
  return customApiKey ? { 'x-api-key': customApiKey } : {};
}

// Quick Fill and Run
function quickFillAndRun(tab, text) {
  switchTab(tab);
  if (tab === 'digest') {
    document.getElementById('digest-input').value = text;
    executeDigest();
  } else if (tab === 'research') {
    document.getElementById('research-input').value = text;
    executeResearch();
  } else if (tab === 'finance') {
    document.getElementById('finance-input').value = text;
    executeFinance();
  }
}

// ================= 1. DIGEST =================
async function executeDigest() {
  const inputEl = document.getElementById('digest-input');
  const query = inputEl ? inputEl.value.trim() : '';
  if (!query) {
    alert('请输入你想生成简报的主题');
    return;
  }

  const emptyBox = document.getElementById('digest-empty-box');
  const progressBox = document.getElementById('digest-progress-box');
  const resultBox = document.getElementById('digest-result-box');
  const submitBtn = document.getElementById('digest-submit-btn');

  emptyBox.classList.add('hidden');
  resultBox.classList.add('hidden');
  progressBox.classList.remove('hidden');
  submitBtn.disabled = true;

  const timer = startTimer('digest-timer');

  try {
    const res = await fetch('/api/digest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getApiKeyHeader() },
      body: JSON.stringify({ topic: query })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '生成早报失败');

    // 1. Render Report
    const reportContent = data.brief_report?.output?.content || '暂无研报正文';
    document.getElementById('digest-report-content').innerHTML = renderMarkdown(reportContent);

    // 2. Render News Items
    const newsItems = data.search_results?.results?.web || [];
    const newsGrid = document.getElementById('digest-news-grid');
    newsGrid.innerHTML = '';

    if (newsItems.length === 0) {
      newsGrid.innerHTML = '<p class="text-xs text-slate-500 col-span-2">未检索到关联新闻信源</p>';
    } else {
      newsItems.forEach(item => {
        let domain = '源网址';
        try { domain = new URL(item.url).hostname; } catch(e){}
        const card = document.createElement('div');
        card.className = 'bg-slate-950/80 border border-slate-800 hover:border-pink-500/40 rounded-xl p-4 transition-all flex flex-col justify-between';
        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[10px] text-pink-400 font-medium px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/20 truncate max-w-[140px]">
                ${domain}
              </span>
              <span class="text-[10px] text-slate-500">${item.page_age ? item.page_age.split('T')[0] : '实时'}</span>
            </div>
            <a href="${item.url}" target="_blank" class="text-xs font-semibold text-slate-100 hover:text-pink-300 line-clamp-1 mb-1 block">
              ${item.title || '无标题'}
            </a>
            <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
              ${item.description || (item.snippets && item.snippets[0]) || '暂无摘要'}
            </p>
          </div>
          <div class="mt-3 pt-2 border-t border-slate-900 flex justify-between items-center text-[10px]">
            <a href="${item.url}" target="_blank" class="text-indigo-400 hover:underline">查看原文 ↗</a>
            <button onclick="extractUrlDirectly('${item.url}')" class="text-amber-400 hover:text-amber-300">提取正文 📥</button>
          </div>
        `;
        newsGrid.appendChild(card);
      });
    }

    // Save to History
    saveHistory('行业早报', query, reportContent);

    progressBox.classList.add('hidden');
    resultBox.classList.remove('hidden');
  } catch (err) {
    alert('请求失败: ' + err.message);
    progressBox.classList.add('hidden');
    emptyBox.classList.remove('hidden');
  } finally {
    stopTimer(timer);
    submitBtn.disabled = false;
  }
}

// ================= 2. RESEARCH =================
async function executeResearch() {
  const inputEl = document.getElementById('research-input');
  const input = inputEl ? inputEl.value.trim() : '';
  if (!input) {
    alert('请输入你想深度调研的研究课题');
    return;
  }

  const emptyBox = document.getElementById('research-empty-box');
  const progressBox = document.getElementById('research-progress-box');
  const resultBox = document.getElementById('research-result-box');
  const submitBtn = document.getElementById('research-submit-btn');

  emptyBox.classList.add('hidden');
  resultBox.classList.add('hidden');
  progressBox.classList.remove('hidden');
  submitBtn.disabled = true;

  const timer = startTimer('research-timer');

  try {
    const res = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getApiKeyHeader() },
      body: JSON.stringify({ input })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '深度研究失败');

    const output = data.data?.output || {};
    const content = output.content || '暂无研究内容';
    const sources = output.sources || [];

    document.getElementById('research-report-content').innerHTML = renderMarkdown(content);
    document.getElementById('research-sources-count').innerText = sources.length;

    const sourcesList = document.getElementById('research-sources-list');
    sourcesList.innerHTML = '';

    if (sources.length === 0) {
      sourcesList.innerHTML = '<p class="text-xs text-slate-500">无外部引用源</p>';
    } else {
      sources.forEach((src, idx) => {
        const div = document.createElement('div');
        div.className = 'bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs flex items-start gap-3';
        div.innerHTML = `
          <span class="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-mono rounded text-[11px] font-semibold shrink-0">
            [${idx + 1}]
          </span>
          <div class="min-w-0 flex-1">
            <a href="${src.url}" target="_blank" class="font-medium text-slate-200 hover:text-indigo-400 block truncate">
              ${src.title || src.url}
            </a>
            <p class="text-slate-400 text-[11px] mt-0.5 line-clamp-2">${src.snippets ? src.snippets.join(' ') : ''}</p>
          </div>
          <a href="${src.url}" target="_blank" class="text-slate-500 hover:text-slate-300 shrink-0">↗</a>
        `;
        sourcesList.appendChild(div);
      });
    }

    // Save to History
    saveHistory('深度研报', input, content);

    progressBox.classList.add('hidden');
    resultBox.classList.remove('hidden');
  } catch (err) {
    alert('研究失败: ' + err.message);
    progressBox.classList.add('hidden');
    emptyBox.classList.remove('hidden');
  } finally {
    stopTimer(timer);
    submitBtn.disabled = false;
  }
}

// ================= 3. SEARCH =================
async function executeSearch() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) {
    alert('请输入搜索关键词');
    return;
  }
  const count = parseInt(document.getElementById('search-count').value, 10) || 10;

  const emptyBox = document.getElementById('search-empty-box');
  const progressBox = document.getElementById('search-progress-box');
  const resultBox = document.getElementById('search-result-box');
  const submitBtn = document.getElementById('search-submit-btn');

  emptyBox.classList.add('hidden');
  resultBox.classList.add('hidden');
  progressBox.classList.remove('hidden');
  submitBtn.disabled = true;

  const timer = startTimer('search-timer');

  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getApiKeyHeader() },
      body: JSON.stringify({ query, count })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '搜索失败');

    const items = data.data?.results?.web || [];
    resultBox.innerHTML = '';

    if (items.length === 0) {
      resultBox.innerHTML = '<p class="text-center text-sm text-slate-500 py-8">未搜索到相关网页结果</p>';
    } else {
      items.forEach((item, idx) => {
        let domain = '网页来源';
        try { domain = new URL(item.url).hostname; } catch(e){}
        const div = document.createElement('div');
        div.className = 'bg-slate-950/80 border border-slate-800 hover:border-blue-500/40 rounded-xl p-4 transition-all shadow-sm';
        div.innerHTML = `
          <div class="flex items-center justify-between mb-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono text-slate-500">#${idx + 1}</span>
              <span class="text-[11px] text-blue-400 font-medium px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                ${domain}
              </span>
            </div>
            <span class="text-xs text-slate-500">${item.page_age ? item.page_age.split('T')[0] : '最新'}</span>
          </div>
          <a href="${item.url}" target="_blank" class="text-sm font-semibold text-slate-100 hover:text-blue-400 mb-1.5 block leading-snug">
            ${item.title || '无标题'}
          </a>
          <p class="text-xs text-slate-400 leading-relaxed line-clamp-3">
            ${item.description || (item.snippets && item.snippets.join(' ')) || '暂无摘要'}
          </p>
          <div class="mt-3 pt-2.5 border-t border-slate-900 flex items-center justify-between text-xs">
            <a href="${item.url}" target="_blank" class="text-blue-400 hover:underline">访问网页 ↗</a>
            <div class="flex items-center gap-3">
              <button onclick="quickDeepResearch('${item.title ? item.title.replace(/'/g, '') : ''}')" class="text-indigo-400 hover:text-indigo-300">
                ⚡ 针对此主题研报
              </button>
              <button onclick="extractUrlDirectly('${item.url}')" class="text-amber-400 hover:text-amber-300">
                📥 提取正文
              </button>
            </div>
          </div>
        `;
        resultBox.appendChild(div);
      });
    }

    progressBox.classList.add('hidden');
    resultBox.classList.remove('hidden');
  } catch (err) {
    alert('搜索失败: ' + err.message);
    progressBox.classList.add('hidden');
    emptyBox.classList.remove('hidden');
  } finally {
    stopTimer(timer);
    submitBtn.disabled = false;
  }
}

// ================= 4. FINANCE =================
async function executeFinance() {
  const input = document.getElementById('finance-input').value.trim();
  if (!input) {
    alert('请输入想分析的公司名称或财务问题');
    return;
  }

  const emptyBox = document.getElementById('finance-empty-box');
  const progressBox = document.getElementById('finance-progress-box');
  const resultBox = document.getElementById('finance-result-box');
  const submitBtn = document.getElementById('finance-submit-btn');

  emptyBox.classList.add('hidden');
  resultBox.classList.add('hidden');
  progressBox.classList.remove('hidden');
  submitBtn.disabled = true;

  const timer = startTimer('finance-timer');

  try {
    const res = await fetch('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getApiKeyHeader() },
      body: JSON.stringify({ input })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '财务分析失败');

    const output = data.data?.output || {};
    const content = output.content || '暂无财务分析结果';
    const sources = output.sources || [];

    document.getElementById('finance-report-content').innerHTML = renderMarkdown(content);
    const sourcesList = document.getElementById('finance-sources-list');
    sourcesList.innerHTML = '';

    if (sources.length === 0) {
      sourcesList.innerHTML = '<p class="text-xs text-slate-500">无官方披露源</p>';
    } else {
      sources.forEach((src, idx) => {
        const div = document.createElement('div');
        div.className = 'bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs flex items-start gap-3';
        div.innerHTML = `
          <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono rounded text-[11px] font-semibold shrink-0">
            [${idx + 1}]
          </span>
          <div class="min-w-0 flex-1">
            <a href="${src.url}" target="_blank" class="font-medium text-slate-200 hover:text-emerald-400 block truncate">
              ${src.title || src.url}
            </a>
          </div>
          <a href="${src.url}" target="_blank" class="text-slate-500 hover:text-slate-300 shrink-0">↗</a>
        `;
        sourcesList.appendChild(div);
      });
    }

    saveHistory('企业财报', input, content);

    progressBox.classList.add('hidden');
    resultBox.classList.remove('hidden');
  } catch (err) {
    alert('财务研究失败: ' + err.message);
    progressBox.classList.add('hidden');
    emptyBox.classList.remove('hidden');
  } finally {
    stopTimer(timer);
    submitBtn.disabled = false;
  }
}

// ================= 5. CONTENTS =================
function extractUrlDirectly(url) {
  switchTab('contents');
  document.getElementById('contents-url-input').value = url;
  executeContents();
}

async function executeContents() {
  const rawInput = document.getElementById('contents-url-input').value.trim();
  if (!rawInput) {
    alert('请输入目标网页 URL');
    return;
  }

  const urls = rawInput.split(/[\n,]+/).map(u => u.trim()).filter(u => u.startsWith('http'));
  if (urls.length === 0) {
    alert('请输入有效的 HTTP / HTTPS 链接');
    return;
  }

  const emptyBox = document.getElementById('contents-empty-box');
  const progressBox = document.getElementById('contents-progress-box');
  const resultBox = document.getElementById('contents-result-box');
  const submitBtn = document.getElementById('contents-submit-btn');

  emptyBox.classList.add('hidden');
  resultBox.classList.add('hidden');
  progressBox.classList.remove('hidden');
  submitBtn.disabled = true;

  const timer = startTimer('contents-timer');

  try {
    const res = await fetch('/api/contents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getApiKeyHeader() },
      body: JSON.stringify({ urls })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '内容提取失败');

    const items = data.data || [];
    resultBox.innerHTML = '';

    if (items.length === 0) {
      resultBox.innerHTML = '<p class="text-center text-sm text-slate-500 py-8">未提取到正文内容</p>';
    } else {
      items.forEach((item, idx) => {
        const textContent = item.markdown || item.html || item.text || '正文提取为空';
        const div = document.createElement('div');
        div.className = 'bg-slate-950/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3';
        div.innerHTML = `
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">网页 #${idx + 1}</span>
              <a href="${item.url}" target="_blank" class="text-xs text-slate-300 hover:text-amber-300 max-w-md truncate">
                ${item.url}
              </a>
            </div>
            <button onclick="copyDirectText('${encodeURIComponent(textContent)}')" class="action-btn">📋 复制正文</button>
          </div>
          <div class="bg-slate-900/60 p-4 rounded-lg text-xs text-slate-300 max-h-96 overflow-y-auto leading-relaxed whitespace-pre-wrap font-mono custom-scrollbar">
            ${escapeHtml(textContent.slice(0, 5000))}${textContent.length > 5000 ? '... [已截断显示]' : ''}
          </div>
        `;
        resultBox.appendChild(div);
      });
    }

    progressBox.classList.add('hidden');
    resultBox.classList.remove('hidden');
  } catch (err) {
    alert('网页提取失败: ' + err.message);
    progressBox.classList.add('hidden');
    emptyBox.classList.remove('hidden');
  } finally {
    stopTimer(timer);
    submitBtn.disabled = false;
  }
}

function quickDeepResearch(topic) {
  switchTab('research');
  document.getElementById('research-input').value = `请对以下主题展开深度研报分析：${topic}`;
  executeResearch();
}

// Helpers
function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

function copyElementText(id) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.innerText).then(() => {
    alert('内容已复制到剪贴板！');
  });
}

function copyDirectText(encoded) {
  const text = decodeURIComponent(encoded);
  navigator.clipboard.writeText(text).then(() => {
    alert('正文已成功复制！');
  });
}

function downloadAsMarkdown(id, filename) {
  const el = document.getElementById(id);
  if (!el) return;
  const blob = new Blob([el.innerText], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0,10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ================= History Management =================
function saveHistory(type, title, content) {
  const item = {
    id: Date.now(),
    type,
    title,
    content,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  };
  historyData.unshift(item);
  if (historyData.length > 30) historyData.pop();
  try {
    localStorage.setItem('you_insight_history', JSON.stringify(historyData));
  } catch (e){}
  updateHistoryBadge();
}

function updateHistoryBadge() {
  const badge = document.getElementById('history-count-badge');
  if (badge) badge.innerText = historyData.length;
}

function toggleHistoryDrawer() {
  const drawer = document.getElementById('history-drawer');
  if (!drawer) return;
  const isHidden = drawer.classList.contains('hidden');
  if (isHidden) {
    renderHistoryList();
    drawer.classList.remove('hidden');
  } else {
    drawer.classList.add('hidden');
  }
}

function renderHistoryList() {
  const box = document.getElementById('history-list-box');
  if (!box) return;
  box.innerHTML = '';

  if (historyData.length === 0) {
    box.innerHTML = '<p class="text-xs text-slate-500 text-center py-10">暂无生成历史记录</p>';
    return;
  }

  historyData.forEach(item => {
    const div = document.createElement('div');
    div.className = 'bg-slate-950 border border-slate-800 hover:border-indigo-500/40 rounded-xl p-3.5 space-y-2 transition-all';
    div.innerHTML = `
      <div class="flex items-center justify-between text-[11px]">
        <span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">${item.type}</span>
        <span class="text-slate-500">${item.time}</span>
      </div>
      <h4 class="text-xs font-semibold text-slate-200 line-clamp-1">${item.title}</h4>
      <div class="flex justify-end gap-2 pt-1 border-t border-slate-900 text-xs">
        <button onclick="restoreHistory(${item.id})" class="text-indigo-400 hover:underline text-[11px]">查看详情</button>
      </div>
    `;
    box.appendChild(div);
  });
}

function restoreHistory(id) {
  const item = historyData.find(h => h.id === id);
  if (!item) return;
  toggleHistoryDrawer();
  
  if (item.type === '行业早报') {
    switchTab('digest');
    document.getElementById('digest-input').value = item.title;
    document.getElementById('digest-empty-box').classList.add('hidden');
    document.getElementById('digest-report-content').innerHTML = renderMarkdown(item.content);
    document.getElementById('digest-result-box').classList.remove('hidden');
  } else if (item.type === '深度研报') {
    switchTab('research');
    document.getElementById('research-input').value = item.title;
    document.getElementById('research-empty-box').classList.add('hidden');
    document.getElementById('research-report-content').innerHTML = renderMarkdown(item.content);
    document.getElementById('research-result-box').classList.remove('hidden');
  } else if (item.type === '企业财报') {
    switchTab('finance');
    document.getElementById('finance-input').value = item.title;
    document.getElementById('finance-empty-box').classList.add('hidden');
    document.getElementById('finance-report-content').innerHTML = renderMarkdown(item.content);
    document.getElementById('finance-result-box').classList.remove('hidden');
  }
}

function clearAllHistory() {
  if (!confirm('确定清空所有本地历史记录吗？')) return;
  historyData = [];
  localStorage.removeItem('you_insight_history');
  updateHistoryBadge();
  renderHistoryList();
}

// API Key Modal
function openKeyModal() {
  document.getElementById('key-modal').classList.remove('hidden');
}

function closeKeyModal() {
  document.getElementById('key-modal').classList.add('hidden');
}

function saveCustomKey() {
  const val = document.getElementById('custom-api-key-input').value.trim();
  customApiKey = val;
  if (val) {
    localStorage.setItem('you_custom_api_key', val);
  } else {
    localStorage.removeItem('you_custom_api_key');
  }
  closeKeyModal();
  testCurrentKey();
}

async function testCurrentKey(silent = false) {
  const feedback = document.getElementById('key-test-feedback');
  const badgeText = document.getElementById('api-status-text');

  try {
    const res = await fetch('/api/test-key', { headers: getApiKeyHeader() });
    const data = await res.json();

    if (data.valid) {
      badgeText.innerText = `系统就绪 (${data.latency_ms}ms)`;
      if (!silent && feedback) {
        feedback.className = 'text-xs mt-2 p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        feedback.innerText = `连接成功！响应延迟: ${data.latency_ms} ms`;
        feedback.classList.remove('hidden');
      }
    } else {
      badgeText.innerText = 'API 异常 / 未连接';
      if (!silent && feedback) {
        feedback.className = 'text-xs mt-2 p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20';
        feedback.innerText = '连接测试失败: ' + (data.message || '未知错误');
        feedback.classList.remove('hidden');
      }
    }
  } catch (e) {
    badgeText.innerText = '后端服务正常';
  }
}
