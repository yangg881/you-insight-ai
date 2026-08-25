import os, time, asyncio, json, re, sqlite3, secrets
from datetime import datetime
from typing import List, Optional
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from dotenv import load_dotenv
    load_dotenv('/etc/you-insight-ai/.env')
except Exception:
    pass

API_KEY = os.getenv('YOU_API_KEY')
if not API_KEY:
    raise RuntimeError('YOU_API_KEY not set')
PROXY_URL = os.getenv('PROXY_URL', 'http://127.0.0.1:10888')

BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

DB_PATH = '/opt/you-insight-ai/data/youinsight.db'
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, api_key TEXT, plan TEXT DEFAULT "free", created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
    conn.execute('CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER DEFAULT 0, type TEXT, title TEXT, content TEXT, sources TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
    conn.execute('CREATE TABLE IF NOT EXISTS subscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, topic TEXT, schedule TEXT DEFAULT "daily", active INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
    conn.commit()
    conn.close()
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title='YouInsight AI Studio', version='2.0.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

def get_client(timeout=60.0):
    transport = httpx.AsyncHTTPTransport(proxy=PROXY_URL) if PROXY_URL else None
    return httpx.AsyncClient(transport=transport, timeout=timeout, follow_redirects=True, headers=BROWSER_HEADERS)

class SearchRequest(BaseModel):
    query: str
    count: Optional[int] = 10
    freshness: Optional[str] = None

class ResearchRequest(BaseModel):
    input: str
    chat_history: Optional[List[dict]] = None
    depth: Optional[str] = 'standard'

class FinanceRequest(BaseModel):
    input: str

class ContentsRequest(BaseModel):
    urls: List[str]

class DigestRequest(BaseModel):
    topic: str
    schedule: Optional[bool] = False

class NewsRequest(BaseModel):
    query: str
    count: Optional[int] = 10

class HistorySave(BaseModel):
    type: str
    title: str
    content: str
    sources: Optional[str] = ''

@app.get('/api/health')
async def health():
    return {'status': 'ok', 'version': '2.0.0', 'proxy': bool(PROXY_URL)}

@app.post('/api/search')
async def api_search(req: SearchRequest):
    async with get_client() as client:
        params = {'query': req.query, 'count': req.count}
        if req.freshness:
            params['freshness'] = req.freshness
        resp = await client.get('https://api.you.com/v1/search', params=params, headers={'X-API-Key': API_KEY})
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f'Search API Error: {resp.text[:200]}')
        return {'status': 'success', 'data': resp.json()}

@app.post('/api/news')
async def api_news(req: NewsRequest):
    async with get_client() as client:
        resp = await client.get('https://api.you.com/v1/search', params={'query': req.query, 'count': req.count}, headers={'X-API-Key': API_KEY})
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f'News API Error: {resp.text[:200]}')
        return {'status': 'success', 'data': resp.json()}

@app.post('/api/research')
async def api_research(req: ResearchRequest):
    async with get_client(timeout=120.0) as client:
        payload = {'input': req.input, 'chat_history': req.chat_history or []}
        resp = await client.post('https://api.you.com/v1/research', json=payload, headers={'X-API-Key': API_KEY})
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f'Research API Error: {resp.text[:200]}')
        return {'status': 'success', 'data': resp.json()}

async def research_with_retry(client, payload):
    """调用上游研报接口；上游偶发 60s 掐断连接，自动换一次新连接重试。
    产出 ('stage', 文案) 进度事件，最后产出 ('result', 数据)。"""
    last_err = None
    for attempt in range(2):
        try:
            resp = await client.post('https://api.you.com/v1/research', json=payload, headers={'X-API-Key': API_KEY})
            if resp.status_code != 200:
                raise RuntimeError(f'Research API Error: {resp.status_code} {resp.text[:200]}')
            yield ('result', resp.json())
            return
        except (httpx.RemoteProtocolError, httpx.ReadError, httpx.ReadTimeout) as e:
            last_err = e
            if attempt == 0:
                yield ('stage', '上游连接中断，正在重试')
                await asyncio.sleep(1)
                continue
    raise last_err

@app.post('/api/research/stream')
async def api_research_stream(req: ResearchRequest):
    async def generate():
        yield f'data: {json.dumps({"type": "start", "stage": "检索中"})}\n\n'
        await asyncio.sleep(0.5)
        yield f'data: {json.dumps({"type": "stage", "stage": "分析中"})}\n\n'
        try:
            async with get_client(timeout=180.0) as client:
                payload = {'input': req.input, 'chat_history': req.chat_history or []}
                data = None
                async for kind, val in research_with_retry(client, payload):
                    if kind == 'stage':
                        yield f'data: {json.dumps({"type": "stage", "stage": val})}\n\n'
                    else:
                        data = val
                content = data.get('output', {}).get('content', '')
                sources = data.get('output', {}).get('sources', [])
                chunk_size = 50
                for i in range(0, len(content), chunk_size):
                    yield f'data: {json.dumps({"type": "content", "chunk": content[i:i+chunk_size]})}\n\n'
                    await asyncio.sleep(0.03)
                yield f'data: {json.dumps({"type": "done", "sources": sources, "full_content": content})}\n\n'
        except Exception as e:
            yield f'data: {json.dumps({"type": "error", "message": str(e)})}\n\n'
    return StreamingResponse(generate(), media_type='text/event-stream', headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})

@app.post('/api/finance')
async def api_finance(req: FinanceRequest):
    async with get_client(timeout=120.0) as client:
        resp = await client.post('https://api.you.com/v1/finance_research', json={'input': req.input}, headers={'X-API-Key': API_KEY})
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f'Finance API Error: {resp.text[:200]}')
        return {'status': 'success', 'data': resp.json()}

@app.post('/api/contents')
async def api_contents(req: ContentsRequest):
    async with get_client() as client:
        resp = await client.post('https://api.you.com/v1/contents', json={'urls': req.urls}, headers={'X-API-Key': API_KEY})
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f'Contents API Error: {resp.text[:200]}')
        return {'status': 'success', 'data': resp.json()}

@app.post('/api/digest')
async def api_digest(req: DigestRequest):
    async with get_client(timeout=120.0) as client:
        try:
            search_task = client.get('https://api.you.com/v1/search', params={'query': f'{req.topic} 最新 进展 动态', 'count': 6}, headers={'X-API-Key': API_KEY})
            news_task = client.get('https://api.you.com/v1/search', params={'query': req.topic, 'count': 5}, headers={'X-API-Key': API_KEY})
            prompt = f'请针对主题【{req.topic}】生成一份结构化行业早报与情报综合分析。包含：1. 今日核心要点 2. 详细动态与深度解读 3. 发展趋势与商业洞察。必须保持事实准确与客观。'
            research_task = client.post('https://api.you.com/v1/research', json={'input': prompt}, headers={'X-API-Key': API_KEY})
            search_res, news_res, research_res = await asyncio.gather(search_task, news_task, research_task, return_exceptions=True)
            search_data = search_res.json() if not isinstance(search_res, Exception) and search_res.status_code == 200 else {}
            news_data = news_res.json() if not isinstance(news_res, Exception) and news_res.status_code == 200 else {}
            res_data = research_res.json() if not isinstance(research_res, Exception) and research_res.status_code == 200 else {}
            return {'status': 'success', 'topic': req.topic, 'brief_report': res_data, 'search_results': search_data, 'news_results': news_data}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/history')
async def get_history(limit: int = 50):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute('SELECT * FROM history ORDER BY created_at DESC LIMIT ?', (limit,)).fetchall()
    conn.close()
    return {'status': 'success', 'data': [dict(r) for r in rows]}

@app.post('/api/history')
async def save_history(req: HistorySave):
    conn = sqlite3.connect(DB_PATH)
    conn.execute('INSERT INTO history (type, title, content, sources) VALUES (?, ?, ?, ?)', (req.type, req.title, req.content, req.sources))
    conn.commit()
    conn.close()
    return {'status': 'success'}

@app.delete('/api/history/{hid}')
async def delete_history(hid: int):
    conn = sqlite3.connect(DB_PATH)
    conn.execute('DELETE FROM history WHERE id = ?', (hid,))
    conn.commit()
    conn.close()
    return {'status': 'success'}

@app.get('/api/templates')
async def get_templates():
    return {'status': 'success', 'data': [
        {'id': 'competitor', 'name': '竞品分析', 'icon': '⚔️', 'prompt': '请对比分析以下产品/公司的核心功能、定价策略、技术架构和市场定位：'},
        {'id': 'tech', 'name': '技术选型', 'icon': '🔧', 'prompt': '请深度调研以下技术方案的优缺点、适用场景、社区活跃度和迁移成本：'},
        {'id': 'investment', 'name': '投资尽调', 'icon': '💰', 'prompt': '请对以下公司/赛道进行投资尽调分析，包括市场规模、竞争格局、核心壁垒和风险因素：'},
        {'id': 'market', 'name': '市场进入', 'icon': '🌍', 'prompt': '请分析以下市场的进入策略，包括监管环境、本地化需求、渠道建设和增长机会：'},
        {'id': 'academic', 'name': '学术综述', 'icon': '📚', 'prompt': '请对以下研究方向进行系统性文献综述，梳理发展脉络、关键突破和未来趋势：'}
    ]}

static_dir = '/opt/you-insight-ai/app/public'
if not os.path.exists(static_dir):
    static_dir = '/opt/you-insight-ai/app/static'
app.mount('/', StaticFiles(directory=static_dir, html=True), name='static')

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8200)