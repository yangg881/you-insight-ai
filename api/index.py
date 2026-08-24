import os
import time
import httpx
import asyncio
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DEFAULT_API_KEY = os.getenv('YOU_API_KEY', 'ydc-sk-a068ac9fc0503513-Pvd87FZqsG6U8D2eb7KO7ZUWWN1ZL0Pl-23cd1929')

BASE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
}

app = FastAPI(title='YouInsight AI Studio', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

def get_auth_key(custom_key: Optional[str], header_key: Optional[str]) -> str:
    if custom_key and custom_key.strip():
        return custom_key.strip()
    if header_key and header_key.strip():
        return header_key.strip()
    return DEFAULT_API_KEY

def build_headers(key: str) -> dict:
    headers = dict(BASE_HEADERS)
    headers['X-API-Key'] = key
    return headers

class SearchRequest(BaseModel):
    query: str
    count: Optional[int] = 10
    country: Optional[str] = None
    language: Optional[str] = None
    api_key: Optional[str] = None

class ResearchRequest(BaseModel):
    input: str
    api_key: Optional[str] = None

class FinanceRequest(BaseModel):
    input: str
    api_key: Optional[str] = None

class ContentsRequest(BaseModel):
    urls: List[str]
    api_key: Optional[str] = None

class DigestRequest(BaseModel):
    topic: str
    api_key: Optional[str] = None

@app.post('/api/search')
async def search_endpoint(req: SearchRequest, x_api_key: Optional[str] = Header(None)):
    key = get_auth_key(req.api_key, x_api_key)
    params = {'query': req.query, 'count': req.count}
    if req.country:
        params['country'] = req.country
    if req.language:
        params['language'] = req.language

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            start_t = time.time()
            resp = await client.get(
                'https://api.you.com/v1/search',
                params=params,
                headers=build_headers(key)
            )
            elapsed = round(time.time() - start_t, 2)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f'Search API 响应异常: {resp.text}')
            data = resp.json()
            return {'data': data, 'elapsed': elapsed}
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f'网络请求超时或失败: {str(e)}')

@app.post('/api/research')
async def research_endpoint(req: ResearchRequest, x_api_key: Optional[str] = Header(None)):
    key = get_auth_key(req.api_key, x_api_key)
    headers = build_headers(key)
    headers['Content-Type'] = 'application/json'
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            start_t = time.time()
            resp = await client.post(
                'https://api.you.com/v1/research',
                json={'input': req.input},
                headers=headers
            )
            elapsed = round(time.time() - start_t, 2)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f'Research API 响应异常: {resp.text}')
            data = resp.json()
            return {'data': data, 'elapsed': elapsed}
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f'研究请求超时或失败: {str(e)}')

@app.post('/api/finance')
async def finance_endpoint(req: FinanceRequest, x_api_key: Optional[str] = Header(None)):
    key = get_auth_key(req.api_key, x_api_key)
    headers = build_headers(key)
    headers['Content-Type'] = 'application/json'
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            start_t = time.time()
            resp = await client.post(
                'https://api.you.com/v1/finance_research',
                json={'input': req.input},
                headers=headers
            )
            elapsed = round(time.time() - start_t, 2)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f'Finance API 响应异常: {resp.text}')
            data = resp.json()
            return {'data': data, 'elapsed': elapsed}
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f'金融研究请求失败: {str(e)}')

@app.post('/api/contents')
async def contents_endpoint(req: ContentsRequest, x_api_key: Optional[str] = Header(None)):
    key = get_auth_key(req.api_key, x_api_key)
    headers = build_headers(key)
    headers['Content-Type'] = 'application/json'
    async with httpx.AsyncClient(timeout=45.0) as client:
        try:
            start_t = time.time()
            resp = await client.post(
                'https://api.you.com/v1/contents',
                json={'urls': req.urls},
                headers=headers
            )
            elapsed = round(time.time() - start_t, 2)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f'Contents API 响应异常: {resp.text}')
            data = resp.json()
            return {'data': data, 'elapsed': elapsed}
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f'内容提取失败: {str(e)}')

@app.post('/api/digest')
async def digest_endpoint(req: DigestRequest, x_api_key: Optional[str] = Header(None)):
    key = get_auth_key(req.api_key, x_api_key)
    headers = build_headers(key)
    headers['Content-Type'] = 'application/json'
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            start_t = time.time()
            
            search_headers = build_headers(key)
            search_task = client.get(
                'https://api.you.com/v1/search',
                params={'query': f'{req.topic} 最新 动态', 'count': 6},
                headers=search_headers
            )
            
            research_prompt = f'请为我撰写一份关于【{req.topic}】的最新行业动态综合简报。包含：核心背景、最新3个重大进展、影响与分析、未来展望。请分清晰章节输出，并标注数据源。'
            research_task = client.post(
                'https://api.you.com/v1/research',
                json={'input': research_prompt},
                headers=headers
            )
            
            search_res, research_res = await asyncio.gather(search_task, research_task, return_exceptions=True)
            
            search_data = {}
            if not isinstance(search_res, Exception) and search_res.status_code == 200:
                search_data = search_res.json()
            
            research_data = {}
            if not isinstance(research_res, Exception) and research_res.status_code == 200:
                research_data = research_res.json()
            elif isinstance(research_res, Exception):
                raise research_res
            elif research_res.status_code != 200:
                raise HTTPException(status_code=research_res.status_code, detail=research_res.text)

            elapsed = round(time.time() - start_t, 2)
            return {
                'topic': req.topic,
                'search_results': search_data,
                'brief_report': research_data,
                'elapsed': elapsed
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f'生成综合早报失败: {str(e)}')

@app.get('/api/test-key')
async def test_key(key: Optional[str] = None, x_api_key: Optional[str] = Header(None)):
    auth_key = get_auth_key(key, x_api_key)
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            start_t = time.time()
            resp = await client.get(
                'https://api.you.com/v1/search',
                params={'query': 'test', 'count': 1},
                headers=build_headers(auth_key)
            )
            elapsed = round((time.time() - start_t) * 1000)
            if resp.status_code == 200:
                return {'valid': True, 'latency_ms': elapsed, 'message': 'API Key 有效且连接通畅'}
            else:
                return {'valid': False, 'status_code': resp.status_code, 'message': resp.text}
        except Exception as e:
            return {'valid': False, 'message': str(e)}
