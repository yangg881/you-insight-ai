
// State Management
let currentTab = 'digest';
let customApiKey = localStorage.getItem('you_custom_api_key') || '';

// Initialize Icons & UI
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  if (customApiKey) {
    document.getElementById('custom-api-key-input').value = customApiKey;
  }
  testCurrentKey(true);
});

function getApiKeyHeader() {
  return customApiKey ? { 'x-api-key': customApiKey } : {};
}

// Tab Switching
function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));

  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  const activeContent = document.getElementById(`tab-content-${tabId}`);
  if (activeBtn) activeBtn.classList.add('active');
  if (activeContent) activeContent.classList.remove('hidden');

  if (window.lucide) lucide.createIcons();
}

// 1. Digest (早报与事件综合)
function setDigestQuery(text) {
  document.getElementById('digest-input').value = text;
  runDigest();
}

async function runDigest() {
  const query = document.getElementById('digest-input').value.trim();
  if (!query) return;

  const emptyState = document.getElementById('digest-empty-state');
  const loadingState = document.getElementById('digest-loading-state');
  const resultBox = document.getElementById('digest-result-box');
  const btn = document.getElementById('btn-run-digest');

  emptyState.classList.add('hidden');
  resultBox.classList.add('hidden');
  loadingState.classList.remove('hidden');
  btn.disabled = true;

  try {
    const res = await fetch('/api/digest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getApiKeyHeader() },
      body: JSON.stringify({ topic: query })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '请求失败');

    // Render Brief Report
    const reportContent = data.brief_report?.output?.content || '暂无研报内容';
    document.getElementById('digest-report-body').innerHTML = marked.parse(reportContent);

    // Render News Sources
    const newsItems = data.search_results?.results?.web || [];
    const newsGrid = document.getElementById('digest-news-grid');
    newsGrid.innerHTML = '';

    if (newsItems.length === 0) {
      newsGrid.innerHTML = '<p class="text-xs text-slate-500 col-span-2">未检索到关联独立新闻源</p>';
    } else {
      newsItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'bg-slate-950/70 border border-slate-800/80 hover:border-pink-500/40 rounded-xl p-3.5 transition-all flex flex-col justify-between';
        div.innerHTML = `
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[10px] text-pink-400 font-medium px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/20 truncate max-w-[150px]">
                ${new URL(item.url || 'http://unknown').hostname}
              </span>
              <span class="text-[10px] text-slate-500">${item.page_age ? item.page_age.split('T')[0] : '最新'}</span>
            </div>
            <a href="${item.url}" target="_blank" class="text-xs font-semibold text-slate-200 hover:text-pink-300 line-clamp-1 mb-1 block">
              ${item.title || '无标题'}
            </a>
            <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
              ${item.description || (item.snippets && item.snippets[0]) || '暂无摘要'}
            </p>
          </div>
          <div class="mt-3 pt-2 border-t border-slate-900 flex justify-between items-center text-[10px]">
            <a href="${item.url}" target="_blank" class="text-indigo-400 hover:underline flex items-center gap-1">
              查看原文 <i data-lucide="external-link" class="w-3 h-3"></i>
            </a>
            <button onclick="extractUrlDirectly('${item.url}')" class="text-amber-400 hover:text-amber-300 flex items-center gap-1">
              提取正文 <i data-lucide="file-text" class="w-3 h-3"></i>
            </button>
          </div>
        `;
        newsGrid.appendChild(div);
      });
    }

    loadingState.classList.add('hidden');
    resultBox.classList.remove('hidden');
  } catch (err) {
    alert('生成早报失败: ' + err.message);
    loadingState.classList.add('hidden');
    emptyState.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
  }
}

// 2. Deep Research
function setResearchQuery(text) {
  document.getElementById('research-input').value = text;
  runResearch();
}

async function runResearch() {
  const input = document.getElementById('research-input').value.trim();
  if (!input) return;

  const emptyState = document.getElementById('research-empty-state');
  const loadingState = document.getElementById('research-loading-state');
  const resultBox = document.getElementById('research-result-box');
  const btn = document.getElementById('btn-run-research');

  emptyState.classList.add('hidden');
  resultBox.classList.add('hidden');
  loadingState.classList.remove('hidden');
  btn.disabled = true;

  try {
    const res = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getApiKeyHeader() },
      body: JSON.stringify({ input })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '请求失败');

    const output = data.data?.output || {};
    const content = output.content || '暂无研究内容';
    const sources = output.sources || [];

    document.getElementById('research-report-body').innerHTML = marked.parse(content);
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
          <a href="${src.url}" target="_blank" class="text-slate-500 hover:text-slate-300 shrink-0">
            <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
          </a>
        `;
        sourcesList.appendChild(div);
      });
    }

    loadingState.classList.add('hidden');
    resultBox.classList.remove('hidden');
  } catch (err) {
    alert('深度研究失败: ' + err.message);
    loadingState.classList.add('hidden');
    emptyState.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
  }
}

// 3. Web Search
async function runSearch() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;
  const count = parseInt(document.getElementById('search-count').value, 10) || 10;

  const emptyState = document.getElementById('search-empty-state');
  const loadingState = document.getElementById('search-loading-state');
  const resultBox = document.getElementById('search-result-box');

  emptyState.classList.add('hidden');
  resultBox.classList.add('hidden');
  loadingState.classList.remove('hidden');

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
        const div = document.createElement('div');
        div.className = 'bg-slate-950/70 border border-slate-800/80 hover:border-blue-500/40 rounded-xl p-4 transition-all shadow-sm';
        div.innerHTML = `
          <div class="flex items-center justify-between mb-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono text-slate-500">#${idx + 1}</span>
              <span class="text-[11px] text-blue-400 font-medium px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                ${new URL(item.url || 'http://unknown').hostname}
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
          <div class="mt-3 pt-2.5 border-t border-slate-900/80 flex items-center justify-between text-xs">
            <a href="${item.url}" target="_blank" class="text-blue-400 hover:underline flex items-center gap-1">
              访问源网页 <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
            </a>
            <div class="flex items-center gap-3">
              <button onclick="quickDeepResearch('${item.title ? item.title.replace(/'/g, '') : ''}')" class="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                <i data-lucide="brain-circuit" class="w-3.5 h-3.5"></i> 针对此主题研报
              </button>
              <button onclick="extractUrlDirectly('${item.url}')" class="text-amber-400 hover:text-amber-300 flex items-center gap-1">
                <i data-lucide="file-text" class="w-3.5 h-3.5"></i> 提取正文
              </button>
            </div>
          </div>
        `;
        resultBox.appendChild(div);
      });
    }

    loadingState.classList.add('hidden');
    resultBox.classList.remove('hidden');
  } catch (err) {
    alert('搜索失败: ' + err.message);
    loadingState.classList.add('hidden');
    emptyState.classList.remove('hidden');
  } finally {
    if (window.lucide) lucide.createIcons();
  }
}

// 4. Financial Intelligence
function setFinanceQuery(text) {
  document.getElementById('finance-input').value = text;
  runFinance();
}

async function runFinance() {
  const input = document.getElementById('finance-input').value.trim();
  if (!input) return;

  const emptyState = document.getElementById('finance-empty-state');
  const loadingState = document.getElementById('finance-loading-state');
  const resultBox = document.getElementById('finance-result-box');
  const btn = document.getElementById('btn-run-finance');

  emptyState.classList.add('hidden');
  resultBox.classList.add('hidden');
  loadingState.classList.remove('hidden');
  btn.disabled = true;

  try {
    const res = await fetch('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getApiKeyHeader() },
      body: JSON.stringify({ input })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '请求失败');

    const output = data.data?.output || {};
    const content = output.content || '暂无财务分析结果';
    const sources = output.sources || [];

    document.getElementById('finance-report-body').innerHTML = marked.parse(content);
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
          <a href="${src.url}" target="_blank" class="text-slate-500 hover:text-slate-300 shrink-0">
            <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
          </a>
        `;
        sourcesList.appendChild(div);
      });
    }

    loadingState.classList.add('hidden');
    resultBox.classList.remove('hidden');
  } catch (err) {
    alert('财务研究失败: ' + err.message);
    loadingState.classList.add('hidden');
    emptyState.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
  }
}

// 5. Contents Extractor
function extractUrlDirectly(url) {
  switchTab('contents');
  document.getElementById('contents-url-input').value = url;
  runContents();
}

async function runContents() {
  const rawInput = document.getElementById('contents-url-input').value.trim();
  if (!rawInput) return;

  const urls = rawInput.split(/[
,]+/).map(u => u.trim()).filter(u => u.startsWith('http'));
  if (urls.length === 0) {
    alert('请输入有效的 HTTP / HTTPS 链接');
    return;
  }

  const emptyState = document.getElementById('contents-empty-state');
  const loadingState = document.getElementById('contents-loading-state');
  const resultBox = document.getElementById('contents-result-box');

  emptyState.classList.add('hidden');
  resultBox.classList.add('hidden');
  loadingState.classList.remove('hidden');

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
        div.className = 'bg-slate-950/70 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3';
        div.innerHTML = `
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">网页 #${idx + 1}</span>
              <a href="${item.url}" target="_blank" class="text-xs text-slate-300 hover:text-amber-300 max-w-md truncate">
                ${item.url}
              </a>
            </div>
            <button onclick="copyRawText(this)" data-content="${encodeURIComponent(textContent)}" class="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md transition-colors">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i> 复制正文
            </button>
          </div>
          <div class="bg-slate-900/60 p-4 rounded-lg text-xs text-slate-300 max-h-96 overflow-y-auto leading-relaxed whitespace-pre-wrap font-mono custom-scrollbar">
            ${escapeHtml(textContent.slice(0, 5000))}${textContent.length > 5000 ? '... [已截断显示]' : ''}
          </div>
        `;
        resultBox.appendChild(div);
      });
    }

    loadingState.classList.add('hidden');
    resultBox.classList.remove('hidden');
  } catch (err) {
    alert('网页提取失败: ' + err.message);
    loadingState.classList.add('hidden');
    emptyState.classList.remove('hidden');
  } finally {
    if (window.lucide) lucide.createIcons();
  }
}

function quickDeepResearch(topic) {
  switchTab('research');
  document.getElementById('research-input').value = `请对以下主题展开深度研报分析：${topic}`;
  runResearch();
}

// Helpers
function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

function copyContent(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  navigator.clipboard.writeText(el.innerText).then(() => {
    alert('内容已成功复制到剪贴板！');
  });
}

function copyRawText(btn) {
  const content = decodeURIComponent(btn.getAttribute('data-content'));
  navigator.clipboard.writeText(content).then(() => {
    alert('网页提取正文已复制！');
  });
}

// API Key Modal Functions
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
      badgeText.innerText = `API 正常 (${data.latency_ms}ms)`;
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
    badgeText.innerText = '后端未响应';
  }
}
