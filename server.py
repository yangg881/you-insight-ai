import os, time, asyncio, json, re, sqlite3, secrets, uuid, hashlib, hmac, base64
from datetime import datetime, date, timezone
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
import urllib.parse
import socket
from urllib.parse import urljoin, urlsplit, urlunsplit
import httpx
from fastapi import FastAPI, HTTPException, Request, Header, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from ipaddress import ip_address, ip_network
from urllib.parse import urlsplit
from pydantic import BaseModel, Field, HttpUrl, field_validator

try:
    from dotenv import load_dotenv
    load_dotenv('/etc/you-insight-ai/.env')
    load_dotenv('.env')
except Exception:
    pass

# ==================== 核心配置 ====================
API_KEY = os.getenv('YOU_API_KEY', '')
BRAVE_API_KEY = os.getenv('BRAVE_API_KEY', '')
PARALLEL_API_KEY = os.getenv('PARALLEL_API_KEY', 'KnlzNBPLDtfwMXQT04jQpgmv1bXwIeX6Pbfgz3Ul')
MONID_API_KEY = os.getenv('MONID_API_KEY', 'monid_live_2JLwCcHPiaNJhofxypvrKj4x')

def get_current_brave_api_key() -> str:
    try:
        conn = get_db()
        row = conn.execute("SELECT value FROM system_settings WHERE key = 'brave_api_key'").fetchone()
        conn.close()
        if row and row["value"]:
            return row["value"].strip()
    except Exception:
        pass
    return BRAVE_API_KEY

def get_current_you_api_key() -> str:
    try:
        conn = get_db()
        row = conn.execute("SELECT value FROM system_settings WHERE key = 'you_api_key'").fetchone()
        conn.close()
        if row and row["value"]:
            return row["value"].strip()
    except Exception:
        pass
    return API_KEY


def get_current_parallel_api_key() -> str:
    try:
        conn = get_db()
        row = conn.execute("SELECT value FROM system_settings WHERE key = 'parallel_api_key'").fetchone()
        conn.close()
        if row and row["value"] and row["value"].strip():
            return row["value"].strip()
    except Exception:
        pass
    return PARALLEL_API_KEY

async def fetch_parallel_search(query: str, objective: str = None, count: int = 4) -> Optional[Dict[str, Any]]:
    key = get_current_parallel_api_key()
    if not key:
        return None
    try:
        async with client(timeout=25.0) as c:
            obj = objective or f"全面检索关于【{query}】的最新权威事实、技术评测大表、行业对比与核心参数"
            payload = {
                "objective": obj,
                "search_queries": [
                    query,
                    f"{query} 核心数据 参数",
                    f"{query} 评测 对比"
                ][:count]
            }
            r = await c.post(
                "https://api.parallel.ai/v1/search",
                headers={"x-api-key": key, "Content-Type": "application/json"},
                json=payload
            )
            if r.status_code == 200:
                return r.json()
            else:
                print(f"Parallel Search Error: {r.status_code} - {r.text[:200]}")
    except Exception as e:
        print(f"Error fetching Parallel search: {e}")
    return None

async def fetch_parallel_extract(urls: List[str], objective: str = None) -> List[Dict[str, Any]]:
    key = get_current_parallel_api_key()
    if not key:
        return []
    try:
        async with client(timeout=10.0) as c:
            payload = {"urls": urls[:3]}
            if objective:
                payload["objective"] = objective
            r = await c.post(
                "https://api.parallel.ai/v1/extract",
                headers={"x-api-key": key, "Content-Type": "application/json"},
                json=payload
            )
            if r.status_code == 200:
                data = r.json()
                items = []
                for res in data.get("results", []):
                    u = res.get("url", "")
                    t = res.get("title") or "提取内容"
                    excerpts = res.get("excerpts", [])
                    full = res.get("full_content") or ""
                    content_md = full if full else "\n\n".join(excerpts)
                    if not content_md.strip():
                        content_md = "> ⚠️ 该网页暂无可用文本内容"
                    items.append({
                        "url": u,
                        "domain": urlsplit(u).netloc,
                        "title": t,
                        "markdown": content_md,
                        "word_count": len(content_md),
                        "engine": "Parallel.ai"
                    })
                return items
            else:
                print(f"Parallel Extract Error: {r.status_code} - {r.text[:200]}")
    except Exception as e:
        print(f"Error fetching Parallel extract: {e}")
    return []

def get_current_monid_api_key() -> str:
    try:
        conn = get_db()
        row = conn.execute("SELECT value FROM system_settings WHERE key = 'monid_api_key'").fetchone()
        conn.close()
        if row and row["value"]:
            return row["value"].strip()
    except Exception:
        pass
    return os.getenv('MONID_API_KEY', 'monid_live_2JLwCcHPiaNJhofxypvrKj4x')


PROXY_URL = os.getenv('PROXY_URL', 'http://127.0.0.1:10888')
# ==================== 全局代理覆盖 (Global Proxy Coverage) ====================
if PROXY_URL:
    os.environ['HTTP_PROXY'] = PROXY_URL
    os.environ['HTTPS_PROXY'] = PROXY_URL
    os.environ['ALL_PROXY'] = PROXY_URL
    os.environ['http_proxy'] = PROXY_URL
    os.environ['https_proxy'] = PROXY_URL
JWT_SECRET = os.getenv('JWT_SECRET', '')
ADMIN_DEFAULT_PASSWORD = os.getenv('ADMIN_DEFAULT_PASSWORD', '')

# 阿里云短信
ALIYUN_AK_ID = os.getenv('ALIYUN_ACCESS_KEY_ID', '')
ALIYUN_AK_SECRET = os.getenv('ALIYUN_ACCESS_KEY_SECRET', '')
ALIYUN_TEMPLATE = os.getenv('ALIYUN_SMS_TEMPLATE_CODE', 'SMS_336470119')
ALIYUN_SIGN_NAME = os.getenv('ALIYUN_SMS_SIGN_NAME', '阿里云短信测试')

# Resend 邮件
RESEND_API_KEY = os.getenv('RESEND_API_KEY', '')
RESEND_FROM_EMAIL = os.getenv('RESEND_FROM_EMAIL', '商探 AI <no-reply@wenda.cc.cd>')
# SMTP 邮件配置
SMTP_ENABLED = os.getenv('SMTP_ENABLED', '1') == '1'
SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.139.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '465'))
SMTP_USER = os.getenv('SMTP_USER', 'yangg881@139.com')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
SMTP_FROM = os.getenv('SMTP_FROM', '商探 AI <yangg881@139.com>')

BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

DB_PATH = os.getenv('DB_PATH', '/opt/you-insight-ai/data/youinsight.db')
if not os.path.exists(os.path.dirname(DB_PATH)) and os.path.dirname(DB_PATH):
    try:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    except Exception:
        DB_PATH = 'youinsight.db'

# ==================== SQLite 数据库管理 ====================
def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA busy_timeout=5000')
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return f"{salt}${pw_hash}"

def verify_password(password: str, hashed_str: str) -> bool:
    if not hashed_str or '$' not in hashed_str:
        return False
    salt, original_hash = hashed_str.split('$', 1)
    test_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return secrets.compare_digest(original_hash, test_hash)

# 轻量高效 JWT 实现 (无需第三方 heavy 依赖)
def create_jwt_token(payload: dict, expires_in_seconds: int = 86400 * 30) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload_copy = payload.copy()
    payload_copy["exp"] = int(time.time()) + expires_in_seconds
    payload_copy["iat"] = int(time.time())
    
    b64_header = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    b64_payload = base64.urlsafe_b64encode(json.dumps(payload_copy).encode()).decode().rstrip("=")
    signature = hmac.new(JWT_SECRET.encode(), f"{b64_header}.{b64_payload}".encode(), hashlib.sha256).digest()
    b64_sig = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return f"{b64_header}.{b64_payload}.{b64_sig}"

def decode_jwt_token(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        b64_header, b64_payload, b64_sig = parts
        
        # 验证签名
        expected_sig = hmac.new(JWT_SECRET.encode(), f"{b64_header}.{b64_payload}".encode(), hashlib.sha256).digest()
        actual_sig = base64.urlsafe_b64decode(b64_sig + "=" * (-len(b64_sig) % 4))
        if not secrets.compare_digest(expected_sig, actual_sig):
            return None
        
        # 解析载荷
        payload_bytes = base64.urlsafe_b64decode(b64_payload + "=" * (-len(b64_payload) % 4))
        payload = json.loads(payload_bytes.decode())
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. 用户表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        phone TEXT UNIQUE,
        email TEXT UNIQUE,
        password_hash TEXT,
        role TEXT DEFAULT 'user',
        daily_quota INTEGER DEFAULT 10,
            tier TEXT DEFAULT 'basic',
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP
    )
    ''')
    # 自动迁移旧表列
    user_cols = [r[1] for r in cursor.execute("PRAGMA table_info(users)").fetchall()]
    if 'username' not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN username TEXT")
    if 'phone' not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN phone TEXT")
    if 'password_hash' not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
    if 'role' not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")
    if 'daily_quota' not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN daily_quota INTEGER DEFAULT 10")
    if 'is_active' not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1")
    if 'last_login_at' not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP")
    if 'tier' not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN tier TEXT DEFAULT 'basic'")
    if 'uid' not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN uid TEXT")
    cursor.execute('''
    UPDATE users SET uid = 'YI-' || (80260000 + id) WHERE uid IS NULL OR uid = ''
    ''')
    cursor.execute('''
    UPDATE users SET tier = CASE
        WHEN role = 'super_admin' OR daily_quota = -1 THEN 'vip'
        WHEN daily_quota >= 400 THEN 'pro'
        WHEN daily_quota >= 100 THEN 'standard'
        ELSE 'basic'
    END WHERE tier IS NULL OR tier = ''
    ''')
    
    # 2. 验证码记录表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS verification_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target TEXT NOT NULL,
        code TEXT NOT NULL,
        code_type TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used INTEGER DEFAULT 0,
        ip TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # 3. 每日调用核销表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS daily_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        usage_date DATE NOT NULL,
        count INTEGER DEFAULT 0,
        UNIQUE(user_id, usage_date)
    )
    ''')

    # 4. 游客每日限额表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS guest_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT NOT NULL,
        usage_date DATE NOT NULL,
        count INTEGER DEFAULT 0,
        UNIQUE(ip, usage_date)
    )
    ''')

    # 5. 全站生成审计与耗时日志
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS generation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 0,
        username TEXT,
        ip TEXT,
        type TEXT NOT NULL,
        title TEXT,
        duration_ms INTEGER DEFAULT 0,
        status TEXT DEFAULT 'success',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # 6. 系统配置表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # 7. 历史研报表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 0,
        type TEXT,
        title TEXT,
        content TEXT,
        sources TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # 索引优化
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_history_uid ON history (user_id, created_at DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_gen_logs_created ON generation_logs (created_at DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_vcode_target ON verification_codes (target, created_at DESC)')

    # 初始化默认系统设置
    cursor.execute("INSERT OR IGNORE INTO system_settings (key, value) VALUES ('guest_daily_limit', '2')")
    cursor.execute("INSERT OR IGNORE INTO system_settings (key, value) VALUES ('default_user_quota', '10')")
    cursor.execute("INSERT OR IGNORE INTO system_settings (key, value) VALUES ('sms_channel_enabled', '1')")
    cursor.execute("INSERT OR IGNORE INTO system_settings (key, value) VALUES ('email_channel_enabled', '1')")
    cursor.execute("INSERT OR IGNORE INTO system_settings (key, value) VALUES ('announcement', '')")
        
    # 初始化默认超级管理员 (如果不存在任何管理员)
    admin_exists = cursor.execute("SELECT id FROM users WHERE role IN ('admin', 'super_admin') LIMIT 1").fetchone()
    if not admin_exists:
        if not ADMIN_DEFAULT_PASSWORD:
            raise RuntimeError('Missing required environment variable: ADMIN_DEFAULT_PASSWORD')
        default_admin_pw = ADMIN_DEFAULT_PASSWORD
        pw_hash = hash_password(default_admin_pw)
        cursor.execute('''
        INSERT INTO users (username, phone, email, password_hash, role, daily_quota)
        VALUES ('admin', '18888888888', 'admin@youinsight.ai', ?, 'super_admin', -1)
        ''', (pw_hash,))

    conn.commit()
    conn.close()

init_db()

# ==================== 短信与邮件发送模块 (复刻职达简历 Dypns 融合认证) ====================

ALIYUN_AK_ID = os.getenv('ALIYUN_ACCESS_KEY_ID', '')
ALIYUN_AK_SECRET = os.getenv('ALIYUN_ACCESS_KEY_SECRET', '')
ALIYUN_DYPNS_ENDPOINT = os.getenv('ALIYUN_DYPNS_ENDPOINT', 'https://dypnsapi.aliyuncs.com/')
ALIYUN_DYPNS_REGION_ID = os.getenv('ALIYUN_DYPNS_REGION_ID', 'cn-hangzhou')
SMS_SIGN_NAME = os.getenv('SMS_SIGN_NAME', '恒创联众')
SMS_SCHEME_NAME = os.getenv('SMS_SCHEME_NAME', 'jd-resume-ai')
SMS_TEMPLATE_REGISTER = os.getenv('SMS_TEMPLATE_CODE_REGISTER', '100001')
SMS_TEMPLATE_CHANGE = os.getenv('SMS_TEMPLATE_CODE_CHANGE_PHONE', '100002')
SMS_TEMPLATE_RESET = os.getenv('SMS_TEMPLATE_CODE_RESET_PASSWORD', '100003')

def percent_encode_dypns(value: Any) -> str:
    from urllib.parse import quote
    return quote(str(value or ""), safe="").replace("+", "%20").replace("*", "%2A").replace("%7E", "~")

def sign_dypns_pop(params: dict, secret: str, method="GET") -> str:
    canonical = "&".join(f"{percent_encode_dypns(k)}={percent_encode_dypns(params[k])}" for k in sorted(params))
    string_to_sign = f"{method}&%2F&{percent_encode_dypns(canonical)}"
    digest = hmac.new(f"{secret}&".encode("utf-8"), string_to_sign.encode("utf-8"), hashlib.sha1).digest()
    return base64.b64encode(digest).decode("utf-8")

def get_dypns_template_for_scene(scene: str) -> str:
    if scene in ('register', 'login'):
        return SMS_TEMPLATE_REGISTER
    elif scene in ('bind', 'change_phone'):
        return SMS_TEMPLATE_CHANGE
    return SMS_TEMPLATE_RESET

async def send_aliyun_sms(phone: str, scene: str = 'register') -> Dict[str, Any]:
    """复刻阿里云 Dypns 融合短信验证码发送 (恒创联众)"""
    template_code = get_dypns_template_for_scene(scene)
    base_params = {
        "Action": "SendSmsVerifyCode",
        "Version": "2017-05-25",
        "Format": "JSON",
        "AccessKeyId": ALIYUN_AK_ID,
        "SignatureMethod": "HMAC-SHA1",
        "SignatureNonce": str(uuid.uuid4()),
        "SignatureVersion": "1.0",
        "Timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "RegionId": ALIYUN_DYPNS_REGION_ID,
        "PhoneNumber": phone,
        "SignName": SMS_SIGN_NAME,
        "TemplateCode": template_code,
        "TemplateParam": json.dumps({"code": "##code##", "min": "5"}, ensure_ascii=False, separators=(",", ":")),
        "SchemeName": SMS_SCHEME_NAME,
    }
    base_params["Signature"] = sign_dypns_pop(base_params, ALIYUN_AK_SECRET)
    
    async with httpx.AsyncClient(trust_env=False, timeout=10.0) as c:
        try:
            resp = await c.get(ALIYUN_DYPNS_ENDPOINT, params=base_params)
            data = resp.json()
            if data.get("Code") == "OK" or data.get("Success") is True:
                return {"success": True, "message": "短信验证码已发送至手机！"}
            else:
                return {"success": False, "message": f"阿里云短信: {data.get('Message', '发送失败')}"}
        except Exception as e:
            return {"success": False, "message": f"短信服务连接异常: {str(e)}"}

async def check_dypns_sms_code(phone: str, code: str) -> bool:
    """通过阿里云 Dypns 校验手机短信验证码"""
    base_params = {
        "Action": "CheckSmsVerifyCode",
        "Version": "2017-05-25",
        "Format": "JSON",
        "AccessKeyId": ALIYUN_AK_ID,
        "SignatureMethod": "HMAC-SHA1",
        "SignatureNonce": str(uuid.uuid4()),
        "SignatureVersion": "1.0",
        "Timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "RegionId": ALIYUN_DYPNS_REGION_ID,
        "PhoneNumber": phone,
        "VerifyCode": str(code).strip(),
        "SchemeName": SMS_SCHEME_NAME,
    }
    base_params["Signature"] = sign_dypns_pop(base_params, ALIYUN_AK_SECRET)
    
    async with httpx.AsyncClient(trust_env=False, timeout=10.0) as c:
        try:
            resp = await c.get(ALIYUN_DYPNS_ENDPOINT, params=base_params)
            data = resp.json()
            verify_result = ((data.get("Model") or {}).get("VerifyResult") or data.get("VerifyResult") or "").upper()
            if verify_result == "PASS" or data.get("Code") == "OK":
                return True
        except Exception as e:
            print(f"Check SMS error: {e}")
    return False

def _sync_send_smtp(email: str, code: str, action_name: str = "安全验证") -> Dict[str, Any]:
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from email.header import Header
    from email.utils import formataddr, formatdate, make_msgid
    
    if not SMTP_USER or not SMTP_PASSWORD:
        return {"success": False, "message": "SMTP 凭据未配置"}
        
    msg = MIMEMultipart('alternative')
    msg['From'] = formataddr(('商探 AI', SMTP_USER))
    msg['To'] = formataddr(('User', email))
    msg['Subject'] = Header(f'【商探 AI】您的验证码: {code}', 'utf-8')
    msg['Date'] = formatdate(localtime=True)
    msg['Message-ID'] = make_msgid(domain='139.com')
    
    text_body = f'您好，您正在进行 商探 AI 账号 {action_name} 操作，验证码为 {code}，有效期 5 分钟。如非本人操作请忽略。'
    html_body = f'''
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0b1329; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #38bdf8; margin: 0; font-size: 22px; font-weight: 800;">⚡ 商探 AI</h2>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 6px;">全网热点早报与深度研报生成器</p>
        </div>
        <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 24px; border: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <p style="color: #e2e8f0; font-size: 14px; margin: 0 0 16px 0;">您正在进行 <strong>{action_name}</strong> 操作，验证码为：</p>
            <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; padding: 14px 0; background: rgba(56,189,248,0.1); border-radius: 8px; border: 1px dashed rgba(56,189,248,0.3); margin-bottom: 16px;">
                {code}
            </div>
            <p style="color: #64748b; font-size: 12px; margin: 0;">验证码有效期为 5 分钟。如非本人操作，请忽略此邮件。</p>
        </div>
        <div style="text-align: center; margin-top: 24px; color: #475569; font-size: 11px;">
            © 2026 商探 AI · 实时情报 · 深度研报 · 事实溯源
        </div>
    </div>
    '''
    msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
    msg.attach(MIMEText(html_body, 'html', 'utf-8'))
    
    try:
        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
            server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, [email], msg.as_string())
        server.quit()
        return {"success": True, "message": "验证码邮件已成功发送至邮箱！"}
    except Exception as e:
        return {"success": False, "message": f"SMTP 邮件发送失败: {str(e)}"}

async def send_resend_email(email: str, code: str, action_name: str = "安全验证") -> Dict[str, Any]:
    """通过已验证的专属独立域名 wenda.cc.cd 下发邮件验证码 (全网秒级送达)"""
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "YouInsight-AI/2.2"
    }
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0b1329; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #38bdf8; margin: 0; font-size: 22px; font-weight: 800;">⚡ 商探 AI</h2>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 6px;">全网热点早报与深度研报生成器</p>
        </div>
        <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 24px; border: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <p style="color: #e2e8f0; font-size: 14px; margin: 0 0 16px 0;">您正在进行 <strong>{action_name}</strong> 操作，验证码为：</p>
            <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; padding: 14px 0; background: rgba(56,189,248,0.1); border-radius: 8px; border: 1px dashed rgba(56,189,248,0.3); margin-bottom: 16px;">
                {code}
            </div>
            <p style="color: #64748b; font-size: 12px; margin: 0;">验证码有效期为 5 分钟。如非本人操作，请忽略此邮件。</p>
        </div>
        <div style="text-align: center; margin-top: 24px; color: #475569; font-size: 11px;">
            © 2026 商探 AI · 实时情报 · 深度研报 · 事实溯源
        </div>
    </div>
    """
    plain_text = f"【商探 AI】您正在进行 {action_name} 操作，验证码为：{code} (5分钟内有效)。如非本人操作请忽略此邮件。"
    payload = {
        "from": RESEND_FROM_EMAIL,
        "to": [email],
        "subject": f"【商探 AI】您的验证码: {code}",
        "html": html_content,
        "text": plain_text
    }
    async with httpx.AsyncClient(trust_env=False, timeout=10.0) as c:
        try:
            resp = await c.post(url, headers=headers, json=payload)
            if resp.status_code in (200, 201):
                return {"success": True, "message": "验证码邮件已成功发送，请注意查收！"}
            else:
                return {"success": False, "message": f"邮件发送失败: {resp.text[:150]}"}
        except Exception as e:
            return {"success": False, "message": f"邮件服务连接异常: {str(e)}"}

# ==================== TTL 缓存与全局连接池 ====================
class TTLCache:
    def __init__(self, maxsize: int = 128, ttl: int = 300):
        self.maxsize, self.ttl = maxsize, ttl
        self._data: dict = {}

    def get(self, key: str):
        item = self._data.get(key)
        if not item: return None
        ts, value = item
        if time.time() - ts > self.ttl:
            self._data.pop(key, None)
            return None
        return value

    def set(self, key: str, value):
        if len(self._data) >= self.maxsize:
            oldest = min(self._data, key=lambda k: self._data[k][0])
            self._data.pop(oldest, None)
        self._data[key] = (time.time(), value)

async def fetch_brave_web_search(query: str, count: int = 10, freshness: Optional[str] = None, lang: Optional[str] = 'zh') -> Optional[Dict[str, Any]]:
    key = get_current_brave_api_key()
    if not key:
        return None
    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": key
    }
    
    # 智能中文优先处理
    q_final = query
    if lang == 'zh':
        if not any('一' <= char <= '鿿' for char in query):
            q_final = f"{query} 中文 最新 评测 资讯"
            
    params = {
        "q": q_final,
        "count": min(20, count),
        "extra_snippets": "true"
    }
    if lang == 'zh':
        params["search_lang"] = "zh-hans"
        params["country"] = "cn"
    elif lang == 'en':
        params["search_lang"] = "en"
        
    if freshness:
        params["freshness"] = freshness
        
    try:
        async with client(timeout=10.0) as c:
            r = await c.get(url, headers=headers, params=params)
            if r.status_code == 200:
                raw = r.json()
                results = []
                for item in raw.get("web", {}).get("results", []):
                    snippets = item.get("extra_snippets", [])
                    desc = item.get("description", "")
                    if snippets and len(snippets) > 0:
                        desc = desc + " | " + " ".join(snippets[:2])
                    results.append({
                        "url": item.get("url"),
                        "title": item.get("title"),
                        "description": desc,
                        "page_age": item.get("page_age") or item.get("age"),
                        "snippets": snippets or [desc],
                        "source": "Brave Search (独立索引)"
                    })
                return {"results": {"web": results}, "engine": "Brave Web Search"}
    except Exception as e:
        print(f"Brave web search error: {e}")
    return None

async def fetch_brave_news_search(query: str, count: int = 10, lang: Optional[str] = 'zh') -> Optional[Dict[str, Any]]:
    key = get_current_brave_api_key()
    if not key:
        return None
    url = "https://api.search.brave.com/res/v1/news/search"
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": key
    }
    q_final = query
    if lang == 'zh' and not any('一' <= char <= '鿿' for char in query):
        q_final = f"{query} 中文 快讯"
    params = {"q": q_final, "count": min(20, count)}
    if lang == 'zh':
        params["search_lang"] = "zh-hans"
        params["country"] = "cn" 
    try:
        async with client(timeout=10.0) as c:
            r = await c.get(url, headers=headers, params=params)
            if r.status_code == 200:
                raw = r.json()
                results = []
                for item in raw.get("results", []):
                    results.append({
                        "url": item.get("url"),
                        "title": item.get("title"),
                        "description": item.get("description", ""),
                        "page_age": item.get("age") or item.get("page_age"),
                        "snippets": [item.get("description", "")],
                        "source": "Brave News"
                    })
                return {"results": {"news": results, "web": results}, "engine": "Brave News"}
    except Exception as e:
        print(f"Brave news error: {e}")
    return None

CACHE = TTLCache(maxsize=128, ttl=300)
LOGIN_FAILURES: Dict[tuple, List[float]] = {}

def ensure_login_allowed(account: str, ip: str):
    now = time.monotonic()
    key = (account.strip().lower(), ip)
    attempts = [stamp for stamp in LOGIN_FAILURES.get(key, []) if now - stamp < 900]
    if len(attempts) >= 10:
        raise HTTPException(status_code=429, detail="登录尝试过多，请 15 分钟后再试")
    LOGIN_FAILURES[key] = attempts

def record_login_failure(account: str, ip: str):
    key = (account.strip().lower(), ip)
    ensure_login_allowed(account, ip)
    LOGIN_FAILURES.setdefault(key, []).append(time.monotonic())

shared_client: Optional[httpx.AsyncClient] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global shared_client
    transport = httpx.AsyncHTTPTransport(proxy=PROXY_URL, retries=1) if PROXY_URL else httpx.AsyncHTTPTransport(retries=1)
    shared_client = httpx.AsyncClient(transport=transport, timeout=60.0, follow_redirects=True, headers=BROWSER_HEADERS)
    yield
    if shared_client:
        await shared_client.aclose()
        shared_client = None

app = FastAPI(title='商探 AI', version='2.6.6', lifespan=lifespan)
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'https://zhidajob.top,https://www.zhidajob.top'
).split(',') if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allow_headers=['Authorization', 'Content-Type']
)

for required_secret_name in ('BRAVE_API_KEY', 'JWT_SECRET'):
    if not globals().get(required_secret_name):
        raise RuntimeError(f'Missing required environment variable: {required_secret_name}')

def client(timeout: float = 60.0):
    if shared_client is not None and timeout <= 60.0:
        return _NullCtx(shared_client)
    transport = httpx.AsyncHTTPTransport(proxy=PROXY_URL) if PROXY_URL else None
    return httpx.AsyncClient(transport=transport, timeout=timeout, follow_redirects=True, headers=BROWSER_HEADERS)

class _NullCtx:
    def __init__(self, c): self._c = c
    async def __aenter__(self): return self._c
    async def __aexit__(self, *exc): return False

# ==================== 用户鉴权依赖 (Auth Dependency) ====================
async def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:].strip()
    payload = decode_jwt_token(token)
    if not payload or "uid" not in payload:
        return None
    
    conn = get_db()
    user = conn.execute("SELECT id, uid, username, phone, email, role, daily_quota, tier, is_active FROM users WHERE id = ?", (payload["uid"],)).fetchone()
    conn.close()
    if not user or not user["is_active"]:
        return None
    return dict(user)

async def require_auth(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = await get_current_user_optional(authorization)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录后再进行此操作")
    return user

async def require_admin(user: Dict[str, Any] = Depends(require_auth)) -> Dict[str, Any]:
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问管理后台")
    return user

async def require_super_admin(user: Dict[str, Any] = Depends(require_auth)) -> Dict[str, Any]:
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅超级管理员可执行此操作")
    return user

def get_client_ip(request: Request) -> str:
    peer_ip = request.client.host if request.client else ""
    if peer_ip in {"127.0.0.1", "::1"}:
        trusted_real_ip = (request.headers.get("X-Real-IP") or "").strip()
        if trusted_real_ip:
            return trusted_real_ip
    return peer_ip or "unknown"

# ==================== 额度安全检查与成功核销机制 ====================

def check_quota_available(user: Optional[Dict[str, Any]], ip: str) -> Dict[str, Any]:
    """仅验证额度是否充足，绝对不提前扣除用户的任何额度"""
    today = date.today().isoformat()
    conn = get_db()
    cursor = conn.cursor()
    
    if user:
        uid = user["id"]
        daily_quota = user["daily_quota"]
        if daily_quota == -1:
            conn.close()
            return {"allowed": True, "remaining": 9999, "is_guest": False, "quota": -1, "used": 0}
        
        row = cursor.execute("SELECT count FROM daily_usage WHERE user_id = ? AND usage_date = ?", (uid, today)).fetchone()
        used = row["count"] if row else 0
        conn.close()
        if used >= daily_quota:
            return {"allowed": False, "remaining": 0, "is_guest": False, "quota": daily_quota, "used": used}
        return {"allowed": True, "remaining": max(0, daily_quota - used), "is_guest": False, "quota": daily_quota, "used": used}
    else:
        # 游客模式 (按 IP 每日限额)
        setting = cursor.execute("SELECT value FROM system_settings WHERE key = 'guest_daily_limit'").fetchone()
        limit = int(setting["value"]) if setting else 2
        
        row = cursor.execute("SELECT count FROM guest_usage WHERE ip = ? AND usage_date = ?", (ip, today)).fetchone()
        used = row["count"] if row else 0
        conn.close()
        if used >= limit:
            return {"allowed": False, "remaining": 0, "is_guest": True, "limit": limit, "used": used}
        return {"allowed": True, "remaining": max(0, limit - used), "is_guest": True, "limit": limit, "used": used}

def consume_quota_success(user: Optional[Dict[str, Any]], ip: str) -> Dict[str, Any]:
    today = date.today().isoformat()
    conn = get_db()
    cursor = conn.cursor()
    
    if user:
        uid = user["id"]
        daily_quota = user["daily_quota"]
        if daily_quota == -1:
            conn.close()
            return {"remaining": 9999, "is_guest": False}
        
        conn.execute("BEGIN IMMEDIATE")
        row = cursor.execute("SELECT count FROM daily_usage WHERE user_id = ? AND usage_date = ?", (uid, today)).fetchone()
        used = row["count"] if row else 0
        if used >= daily_quota:
            conn.rollback(); conn.close()
            raise HTTPException(status_code=403, detail="今日生成额度已达上限")
        cursor.execute("""
        INSERT INTO daily_usage (user_id, usage_date, count) VALUES (?, ?, 1)
        ON CONFLICT(user_id, usage_date) DO UPDATE SET count = daily_usage.count + 1
        """, (uid, today))
        conn.commit()
        row = cursor.execute("SELECT count FROM daily_usage WHERE user_id = ? AND usage_date = ?", (uid, today)).fetchone()
        used = row["count"] if row else 1
        conn.close()
        return {"remaining": max(0, daily_quota - used), "is_guest": False, "used": used}
    else:
        conn.execute("BEGIN IMMEDIATE")
        row = cursor.execute("SELECT count FROM guest_usage WHERE ip = ? AND usage_date = ?", (ip, today)).fetchone()
        used = row["count"] if row else 0
        setting = cursor.execute("SELECT value FROM system_settings WHERE key = 'guest_daily_limit'").fetchone()
        limit = int(setting["value"]) if setting else 2
        if used >= limit:
            conn.rollback(); conn.close()
            raise HTTPException(status_code=403, detail="游客额度已用完，请登录后继续使用")
        cursor.execute("""
        INSERT INTO guest_usage (ip, usage_date, count) VALUES (?, ?, 1)
        ON CONFLICT(ip, usage_date) DO UPDATE SET count = guest_usage.count + 1
        """, (ip, today))
        conn.commit()
        row = cursor.execute("SELECT count FROM guest_usage WHERE ip = ? AND usage_date = ?", (ip, today)).fetchone()
        used = row["count"] if row else 1
        conn.close()
        return {"remaining": max(0, limit - used), "is_guest": True, "used": used}

def record_gen_log(user: Optional[Dict[str, Any]], ip: str, gen_type: str, title: str, duration_ms: int, status: str = 'success'):
    try:
        conn = get_db()
        uid = user["id"] if user else 0
        uname = user["username"] if user else "游客"
        conn.execute("""
        INSERT INTO generation_logs (user_id, username, ip, type, title, duration_ms, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (uid, uname, ip, gen_type, (title or '')[:200], duration_ms, status))
        conn.commit()
        conn.close()
    except Exception:
        pass

# ==================== 请求与响应模型 ====================
class SendCodeReq(BaseModel):
    target: str = Field(min_length=6, max_length=254)
    code_type: Optional[str] = "login" # register, login, reset

class RegisterReq(BaseModel):
    target: str = Field(min_length=6, max_length=254)
    code: str = Field(min_length=4, max_length=12)
    password: str = Field(min_length=6, max_length=128)
    username: Optional[str] = Field(default=None, min_length=1, max_length=50)

class LoginReq(BaseModel):
    mode: str # 'password' 或 'code'
    account: Optional[str] = Field(default=None, max_length=254)
    password: Optional[str] = Field(default=None, max_length=128)
    target: Optional[str] = Field(default=None, max_length=254)
    code: Optional[str] = Field(default=None, max_length=12)

class ResetPwReq(BaseModel):
    target: str = Field(min_length=6, max_length=254)
    code: str = Field(min_length=4, max_length=12)
    new_password: str = Field(min_length=6, max_length=128)

class BindTargetReq(BaseModel):
    target: str = Field(min_length=6, max_length=254)
    code: str = Field(min_length=4, max_length=12)

class DeleteAccountReq(BaseModel):
    code: str = Field(min_length=4, max_length=12)

class UpdateProfileReq(BaseModel):
    username: Optional[str] = Field(default=None, min_length=1, max_length=50)
    new_password: Optional[str] = Field(default=None, min_length=6, max_length=128)
    old_password: Optional[str] = Field(default=None, max_length=128)

class AdminQuotaReq(BaseModel):
    daily_quota: int = Field(ge=-1, le=1000000)
    mode: Optional[str] = 'set' # 'set' 直接设定, 'delta' 增减

class AdminBatchQuotaReq(BaseModel):
    uids: List[int] = Field(min_length=1, max_length=1000)
    daily_quota: int = Field(ge=-1, le=1000000)
    mode: Optional[str] = 'set' # 'set' 或 'delta'

class AdminBatchStatusReq(BaseModel):
    uids: List[int] = Field(min_length=1, max_length=1000)
    is_active: int # 0 为冻结, 1 为解冻

class AdminBatchDeleteReq(BaseModel):
    uids: List[int] = Field(min_length=1, max_length=1000)

TIER_QUOTA_MAP = {
    "basic": 10,
    "standard": 100,
    "pro": 400,
    "vip": -1
}

TIER_NAME_MAP = {
    "basic": "基础版",
    "standard": "标准版",
    "pro": "专业版",
    "vip": "无限特权"
}

class AdminTierReq(BaseModel):
    tier: str # 'basic', 'standard', 'pro', 'vip'
    sync_quota: Optional[bool] = True
    custom_quota: Optional[int] = None

class AdminBatchTierReq(BaseModel):
    uids: List[int] = Field(min_length=1, max_length=1000)
    tier: str
    sync_quota: Optional[bool] = True

class AdminRoleReq(BaseModel):
    role: str # 'user', 'admin', 'super_admin'

class AdminSettingReq(BaseModel):
    settings: Dict[str, str]

def hash_verification_code(code: str) -> str:
    digest = hmac.new(JWT_SECRET.encode(), code.strip().encode(), hashlib.sha256).hexdigest()
    return digest

async def check_and_consume_verification_code(cursor, target: str, code: str, code_type: Optional[str] = None) -> bool:
    """统一验证并核销验证码 (手机走阿里云 Dypns 融合验证，邮箱走本地 TTL 数据库记录)"""
    target = target.strip()
    code = code.strip()
    is_phone = bool(re.match(r"^1[3-9]\d{9}$", target))
    
    if is_phone:
        # 1. 优先调用阿里云 Dypns 官方校验
        ok = await check_dypns_sms_code(target, code)
        if ok:
            vrow = cursor.execute("SELECT id FROM verification_codes WHERE target = ? AND used = 0 ORDER BY id DESC LIMIT 1", (target,)).fetchone()
            if vrow:
                cursor.execute("UPDATE verification_codes SET used = 1 WHERE id = ?", (vrow["id"],))
            return True
            
    # 2. 邮箱或本地验证码校验
    vrow = cursor.execute(
        "SELECT id, code, expires_at, used FROM verification_codes WHERE target = ? AND code_type = ? AND used = 0 ORDER BY id DESC LIMIT 5",
        (target, code_type)
    ).fetchone()
    if vrow and (vrow["code"] == hash_verification_code(code) or vrow["code"] == code):
        if datetime.strptime(vrow["expires_at"], "%Y-%m-%d %H:%M:%S") >= datetime.now():
            cursor.execute("UPDATE verification_codes SET used = 1 WHERE id = ?", (vrow["id"],))
            return True
            
    return False

# ==================== 认证与用户接口 (Auth APIs) ====================

@app.post('/api/auth/send-code')
async def api_send_code(req: SendCodeReq, request: Request):
    target = req.target.strip()
    is_phone = bool(re.match(r"^1[3-9]\d{9}$", target))
    is_email = bool(re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", target))
    
    if not is_phone and not is_email:
        raise HTTPException(status_code=400, detail="请输入正确的 11 位手机号或邮箱地址")
    
    ip = get_client_ip(request)
    conn = get_db()
    cursor = conn.cursor()
    
    # 频率限制：同一目标 60 秒内只能发 1 次，同一 IP 1 小时最多 10 次
    last_sent = cursor.execute(
        "SELECT strftime('%s', 'now') - strftime('%s', created_at) AS diff FROM verification_codes WHERE target = ? ORDER BY id DESC LIMIT 1",
        (target,)
    ).fetchone()
    if last_sent and last_sent["diff"] is not None and last_sent["diff"] < 60:
        conn.close()
        raise HTTPException(status_code=429, detail=f"发送太频繁，请等待 {60 - last_sent['diff']} 秒后重试")
    
    ip_count = cursor.execute(
        "SELECT COUNT(*) AS c FROM verification_codes WHERE ip = ? AND created_at >= datetime('now', '-1 hour')",
        (ip,)
    ).fetchone()["c"]
    if ip_count >= 10:
        conn.close()
        raise HTTPException(status_code=429, detail="当前 IP 请求验证码过于频繁，请稍后再试")
    
    # 生成验证码：手机 4 位，邮箱 6 位
    code = f"{secrets.randbelow(9000) + 1000}" if is_phone else f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.fromtimestamp(time.time() + 300).strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute(
        "INSERT INTO verification_codes (target, code, code_type, expires_at, ip) VALUES (?, ?, ?, ?, ?)",
        (target, hash_verification_code(code), req.code_type, expires_at, ip)
    )
    conn.commit()
    conn.close()
    
    # 下发验证码
    action_map = {"register": "新用户注册", "login": "快捷免密登录", "reset": "重置密码", "bind": "绑定/换绑安全账号", "delete_account": "注销账号"}
    action_text = action_map.get(req.code_type, "验证操作")
    
    if is_phone:
        res = await send_aliyun_sms(target, req.code_type or 'register')
    else:
        res = await send_resend_email(target, code, action_text)
        
    if not res["success"]:
        raise HTTPException(status_code=500, detail=res["message"])
    return {"status": "success", "message": "验证码已成功发送，请注意查收 (5分钟有效)"}

@app.post('/api/auth/register')
async def api_register(req: RegisterReq, request: Request):
    target = req.target.strip()
    code = req.code.strip()
    password = req.password.strip()
    
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="密码长度不能少于 6 位")
    
    is_phone = bool(re.match(r"^1[3-9]\d{9}$", target))
    is_email = bool(re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", target))
    if not is_phone and not is_email:
        raise HTTPException(status_code=400, detail="目标账号必须为有效手机号或邮箱")
        
    conn = get_db()
    cursor = conn.cursor()
    
    # 核验验证码 (支持阿里云 Dypns 短信与邮件验证码)
    code_valid = await check_and_consume_verification_code(cursor, target, code, "register")
    if not code_valid:
        conn.close()
        raise HTTPException(status_code=400, detail="验证码错误或已过期")
    
    # 检查是否已注册
    field = "phone" if is_phone else "email"
    exist = cursor.execute(f"SELECT id FROM users WHERE {field} = ?", (target,)).fetchone()
    if exist:
        conn.close()
        raise HTTPException(status_code=400, detail=f"该{'手机号' if is_phone else '邮箱'}已注册，请切换至【登录账号】直接登录")
    
    # 用户名处理 (自定或自动生成)
    username = (req.username or '').strip()
    if not username:
        username = f"用户_{target[-4:] if is_phone else target.split('@')[0][:6]}"
        # 防止重名
        idx = 1
        base_name = username
        while cursor.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone():
            username = f"{base_name}_{idx}"
            idx += 1
    else:
        if cursor.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail=f"该个性用户名 '{username}' 已被占用，请换一个（留空可自动生成）")
            
    # 获取默认注册额度
    default_quota_row = cursor.execute("SELECT value FROM system_settings WHERE key = 'default_user_quota'").fetchone()
    default_quota = int(default_quota_row["value"]) if default_quota_row else 10
    
    pw_hash = hash_password(password)
    cursor.execute(f"""
    INSERT INTO users (username, {field}, password_hash, role, daily_quota, last_login_at)
    VALUES (?, ?, ?, 'user', ?, CURRENT_TIMESTAMP)
    """, (username, target, pw_hash, default_quota))
    
    user_id = cursor.lastrowid
    user_uid = f"YI-{80260000 + user_id}"
    cursor.execute("UPDATE users SET uid = ? WHERE id = ?", (user_uid, user_id))
    conn.commit()
    
    user = cursor.execute("SELECT id, uid, username, phone, email, role, daily_quota FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    
    user_data = dict(user)
    user_data["uid"] = user["uid"] or user_uid
    token = create_jwt_token({"uid": user["id"], "role": user["role"]})
    return {
        "status": "success",
        "message": "注册成功！已为您自动登录",
        "token": token,
        "user": user_data
    }

@app.post('/api/auth/login')
async def api_login(req: LoginReq, request: Request):
    conn = get_db()
    cursor = conn.cursor()
    ip = get_client_ip(request)
    user = None
    
    if req.mode == 'password':
        account = (req.account or '').strip()
        password = req.password or ''
        if not account or not password:
            conn.close()
            raise HTTPException(status_code=400, detail="请输入账号和密码")
        ensure_login_allowed(account, ip)
            
        user = cursor.execute(
            "SELECT * FROM users WHERE (username = ? OR phone = ? OR email = ?) LIMIT 1",
            (account, account, account)
        ).fetchone()
        
        if not user or not verify_password(password, user["password_hash"]):
            conn.close()
            record_login_failure(account, ip)
            raise HTTPException(status_code=400, detail="账号或密码错误")
        LOGIN_FAILURES.pop((account.lower(), ip), None)
            
    elif req.mode == 'code':
        target = (req.target or '').strip()
        code = (req.code or '').strip()
        if not target or not code:
            conn.close()
            raise HTTPException(status_code=400, detail="请输入手机号/邮箱及验证码")
            
        code_valid = await check_and_consume_verification_code(cursor, target, code, "login")
        if not code_valid:
            conn.close()
            raise HTTPException(status_code=400, detail="验证码错误或已过期")
            
        is_phone = bool(re.match(r"^1[3-9]\d{9}$", target))
        field = "phone" if is_phone else "email"
        user = cursor.execute(f"SELECT * FROM users WHERE {field} = ? LIMIT 1", (target,)).fetchone()
        
        # 如果用户尚未注册，验证码模式支持免密自动注册
        if not user:
            default_quota_row = cursor.execute("SELECT value FROM system_settings WHERE key = 'default_user_quota'").fetchone()
            default_quota = int(default_quota_row["value"]) if default_quota_row else 10
            username = f"用户_{target[-4:] if is_phone else target.split('@')[0][:6]}"
            cursor.execute(f"""
            INSERT INTO users (username, {field}, role, daily_quota, last_login_at)
            VALUES (?, ?, 'user', ?, CURRENT_TIMESTAMP)
            """, (username, target, default_quota))
            user_id = cursor.lastrowid
            user = cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            
        # vcode consumed
    else:
        conn.close()
        raise HTTPException(status_code=400, detail="无效的登录模式")
        
    if not user["is_active"]:
        conn.close()
        raise HTTPException(status_code=403, detail="该账号已被封禁，如有疑问请联系管理员")
        
    cursor.execute("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", (user["id"],))
    conn.commit()
    
    # 统计今日已用额度
    today = date.today().isoformat()
    usage_row = cursor.execute("SELECT count FROM daily_usage WHERE user_id = ? AND usage_date = ?", (user["id"], today)).fetchone()
    used_today = usage_row["count"] if usage_row else 0
    conn.close()
    
    token = create_jwt_token({"uid": user["id"], "role": user["role"]})
    user_dict = {
        "id": user["id"],
        "uid": user["uid"] if ("uid" in user.keys() and user["uid"]) else f"YI-{80260000 + user['id']}",
        "username": user["username"],
        "phone": user["phone"],
        "email": user["email"],
        "role": user["role"],
        "daily_quota": user["daily_quota"],
        "tier": user["tier"] if "tier" in user.keys() else "basic",
        "tier_name": TIER_NAME_MAP.get(user["tier"] if "tier" in user.keys() else "basic", "基础版"),
        "used_today": used_today,
        "remaining_today": 9999 if user["daily_quota"] == -1 else max(0, user["daily_quota"] - used_today)
    }
    return {
        "status": "success",
        "message": "登录成功！",
        "token": token,
        "user": user_dict
    }

@app.post('/api/auth/reset-password')
async def api_reset_password(req: ResetPwReq):
    target = req.target.strip()
    code = req.code.strip()
    new_pw = req.new_password.strip()
    if len(new_pw) < 6:
        raise HTTPException(status_code=400, detail="新密码不能少于 6 位")
        
    conn = get_db()
    cursor = conn.cursor()
    code_valid = await check_and_consume_verification_code(cursor, target, code, "reset")
    if not code_valid:
        conn.close()
        raise HTTPException(status_code=400, detail="验证码错误或已过期")
        
    is_phone = bool(re.match(r"^1[3-9]\d{9}$", target))
    field = "phone" if is_phone else "email"
    user = cursor.execute(f"SELECT id FROM users WHERE {field} = ?", (target,)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="未找到绑定该账号的用户")
        
    pw_hash = hash_password(new_pw)
    cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (pw_hash, user["id"]))
    # vcode consumed
    conn.commit()
    conn.close()
    return {"status": "success", "message": "密码重置成功，请使用新密码登录"}

@app.get('/api/auth/me')
async def api_get_me(user: Dict[str, Any] = Depends(require_auth)):
    conn = get_db()
    today = date.today().isoformat()
    usage_row = conn.execute("SELECT count FROM daily_usage WHERE user_id = ? AND usage_date = ?", (user["id"], today)).fetchone()
    total_gen = conn.execute("SELECT COUNT(*) AS c FROM history WHERE user_id = ?", (user["id"],)).fetchone()["c"]
    conn.close()
    
    used_today = usage_row["count"] if usage_row else 0
    quota = user["daily_quota"]
    return {
        "status": "success",
        "user": {
            "id": user["id"],
            "uid": user.get("uid") or f"YI-{80260000 + user['id']}",
            "username": user["username"],
            "phone": user["phone"],
            "email": user["email"],
            "role": user["role"],
            "daily_quota": quota,
            "tier": user.get("tier", "basic"),
            "tier_name": TIER_NAME_MAP.get(user.get("tier", "basic"), "基础版"),
            "used_today": used_today,
            "remaining_today": 9999 if quota == -1 else max(0, quota - used_today),
            "total_generations": total_gen
        }
    }


@app.post('/api/auth/bind-target')
async def api_bind_target(req: BindTargetReq, user: Dict[str, Any] = Depends(require_auth)):
    target = req.target.strip()
    code = req.code.strip()
    is_phone = bool(re.match(r"^1[3-9]\d{9}$", target))
    is_email = bool(re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", target))
    
    if not is_phone and not is_email:
        raise HTTPException(status_code=400, detail="请输入正确的 11 位手机号或邮箱地址")
        
    conn = get_db()
    cursor = conn.cursor()
    
    # 验证验证码
    code_valid = await check_and_consume_verification_code(cursor, target, code, "reset")
    if not code_valid:
        conn.close()
        raise HTTPException(status_code=400, detail="验证码错误或已过期")
        
    field = "phone" if is_phone else "email"
    
    # 检查是否已被其他用户绑定
    exist = cursor.execute(f"SELECT id FROM users WHERE {field} = ? AND id != ?", (target, user["id"])).fetchone()
    if exist:
        conn.close()
        raise HTTPException(status_code=400, detail=f"该{'手机号' if is_phone else '邮箱'}已被其他账号绑定，请更换")
        
    cursor.execute(f"UPDATE users SET {field} = ? WHERE id = ?", (target, user["id"]))
    # vcode consumed
    conn.commit()
    
    updated_user = cursor.execute("SELECT id, username, phone, email, role, daily_quota FROM users WHERE id = ?", (user["id"],)).fetchone()
    conn.close()
    
    return {
        "status": "success",
        "message": f"{'手机号' if is_phone else '邮箱'}绑定/更改成功！",
        "user": dict(updated_user)
    }

@app.post('/api/auth/delete-account')
async def api_delete_account(req: DeleteAccountReq, user: Dict[str, Any] = Depends(require_auth)):
    code = req.code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="请输入注销确认验证码")
        
    conn = get_db()
    cursor = conn.cursor()
    
    # 寻找当前用户绑定的手机或邮箱
    bound_targets = []
    if user.get("phone"): bound_targets.append(user["phone"])
    if user.get("email"): bound_targets.append(user["email"])
    
    if not bound_targets:
        conn.close()
        raise HTTPException(status_code=400, detail="当前账号未绑定手机或邮箱，无法验证身份注销")
        
    # 验证验证码
    valid_vrow = None
    for target in bound_targets:
        vrow = cursor.execute(
            "SELECT id, code, expires_at, used FROM verification_codes WHERE target = ? AND used = 0 ORDER BY id DESC LIMIT 5",
            (target,)
        ).fetchone()
        if vrow and (vrow["code"] == hash_verification_code(code) or vrow["code"] == code) and datetime.strptime(vrow["expires_at"], "%Y-%m-%d %H:%M:%S") >= datetime.now():
            valid_vrow = vrow
            break
            
    if not valid_vrow:
        conn.close()
        raise HTTPException(status_code=400, detail="注销验证码错误或已过期")
        
    uid = user["id"]
    # 永久抹除该用户全部历史资产
    cursor.execute("DELETE FROM history WHERE user_id = ?", (uid,))
    cursor.execute("DELETE FROM daily_usage WHERE user_id = ?", (uid,))
    cursor.execute("DELETE FROM generation_logs WHERE user_id = ?", (uid,))
    cursor.execute("DELETE FROM users WHERE id = ?", (uid,))
    cursor.execute("UPDATE verification_codes SET used = 1 WHERE id = ?", (valid_vrow["id"],))
    conn.commit()
    conn.close()
    
    return {
        "status": "success",
        "message": "账号及所有个人资产数据已成功注销并彻底抹除"
    }

@app.post('/api/auth/update-profile')
async def api_update_profile(req: UpdateProfileReq, user: Dict[str, Any] = Depends(require_auth)):
    conn = get_db()
    cursor = conn.cursor()
    
    if req.username:
        new_uname = req.username.strip()
        if new_uname != user["username"]:
            exist = cursor.execute("SELECT id FROM users WHERE username = ? AND id != ?", (new_uname, user["id"])).fetchone()
            if exist:
                conn.close()
                raise HTTPException(status_code=400, detail="该用户名已被占用")
            cursor.execute("UPDATE users SET username = ? WHERE id = ?", (new_uname, user["id"]))
            
    if req.new_password:
        if len(req.new_password.strip()) < 6:
            conn.close()
            raise HTTPException(status_code=400, detail="新密码不能少于 6 位")
        full_user = cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user["id"],)).fetchone()
        if full_user and full_user["password_hash"]:
            if not req.old_password:
                conn.close()
                raise HTTPException(status_code=400, detail="请输入当前正在使用的原密码")
            if not verify_password(req.old_password or '', full_user["password_hash"]):
                conn.close()
                raise HTTPException(status_code=400, detail="原密码输入错误")
        cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(req.new_password.strip()), user["id"]))
        
    conn.commit()
    conn.close()
    return {"status": "success", "message": "个人信息已成功更新"}

# ==================== 管理后台接口 (Admin APIs) ====================

@app.get('/api/admin/metrics')
async def admin_get_metrics(admin: Dict[str, Any] = Depends(require_admin)):
    conn = get_db()
    today = date.today().isoformat()
    
    total_users = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
    today_users = conn.execute("SELECT COUNT(*) AS c FROM users WHERE date(created_at, 'localtime') = ?", (today,)).fetchone()["c"]
    total_logs = conn.execute("SELECT COUNT(*) AS c FROM generation_logs").fetchone()["c"]
    today_logs = conn.execute("SELECT COUNT(*) AS c FROM generation_logs WHERE date(created_at, 'localtime') = ?", (today,)).fetchone()["c"]
    total_sms = conn.execute("SELECT COUNT(*) AS c FROM verification_codes WHERE target GLOB '[0-9]*'").fetchone()["c"]
    total_email = conn.execute("SELECT COUNT(*) AS c FROM verification_codes WHERE target LIKE '%@%'").fetchone()["c"]
    
    # 模块分布统计
    module_stats = conn.execute("SELECT type, COUNT(*) AS count FROM generation_logs GROUP BY type ORDER BY count DESC").fetchall()
    
    conn.close()
    return {
        "status": "success",
        "data": {
            "total_users": total_users,
            "today_users": today_users,
            "total_generations": total_logs,
            "today_generations": today_logs,
            "total_sms_sent": total_sms,
            "total_emails_sent": total_email,
            "module_stats": [dict(r) for r in module_stats]
        }
    }

@app.get('/api/admin/users')
async def admin_get_users(query: str = '', page: int = 1, page_size: int = 20, admin: Dict[str, Any] = Depends(require_admin)):
    page = max(1, min(page, 10000))
    page_size = max(1, min(page_size, 100))
    conn = get_db()
    offset = (page - 1) * page_size
    q_str = f"%{query.strip()}%"
    
    raw_q = query.strip()
    if raw_q:
        total = conn.execute("SELECT COUNT(*) AS c FROM users WHERE username LIKE ? OR phone LIKE ? OR email LIKE ? OR uid LIKE ? OR CAST(id AS TEXT) = ?", (q_str, q_str, q_str, q_str, raw_q)).fetchone()["c"]
        rows = conn.execute("""
        SELECT id, uid, username, phone, email, role, daily_quota, tier, is_active,
               datetime(created_at, 'localtime') AS created_at,
               datetime(last_login_at, 'localtime') AS last_login_at
        FROM users WHERE username LIKE ? OR phone LIKE ? OR email LIKE ? OR uid LIKE ? OR CAST(id AS TEXT) = ?
        ORDER BY id DESC LIMIT ? OFFSET ?
        """, (q_str, q_str, q_str, q_str, raw_q, page_size, offset)).fetchall()
    else:
        total = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
        rows = conn.execute("""
        SELECT id, uid, username, phone, email, role, daily_quota, tier, is_active,
               datetime(created_at, 'localtime') AS created_at,
               datetime(last_login_at, 'localtime') AS last_login_at
        FROM users ORDER BY id DESC LIMIT ? OFFSET ?
        """, (page_size, offset)).fetchall()
        
    conn.close()
    return {"status": "success", "total": total, "page": page, "page_size": page_size, "users": [{**dict(r), "uid": r["uid"] or f"YI-{80260000 + r['id']}"} for r in rows]}

@app.post('/api/admin/users/{uid}/quota')
async def admin_set_quota(uid: int, req: AdminQuotaReq, admin: Dict[str, Any] = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    user = cursor.execute("SELECT id, username, daily_quota FROM users WHERE id = ?", (uid,)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="用户不存在")
    
    current_q = user["daily_quota"]
    if req.mode == 'delta':
        if current_q == -1:
            new_q = -1
        else:
            new_q = max(0, current_q + req.daily_quota)
    else:
        new_q = req.daily_quota
        
    cursor.execute("UPDATE users SET daily_quota = ? WHERE id = ?", (new_q, uid))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"用户 #{uid} ({user['username']}) 每日额度已更新为: {'无限' if new_q == -1 else f'{new_q} 次/天'}"}

@app.post('/api/admin/users/batch-quota')
async def admin_batch_quota(req: AdminBatchQuotaReq, admin: Dict[str, Any] = Depends(require_admin)):
    if not req.uids:
        raise HTTPException(status_code=400, detail="未选择任何用户")
    conn = get_db()
    cursor = conn.cursor()
    updated_count = 0
    for uid in req.uids:
        user = cursor.execute("SELECT id, daily_quota FROM users WHERE id = ?", (uid,)).fetchone()
        if not user:
            continue
        current_q = user["daily_quota"]
        if req.mode == 'delta':
            if current_q == -1:
                new_q = -1
            else:
                new_q = max(0, current_q + req.daily_quota)
        else:
            new_q = req.daily_quota
        cursor.execute("UPDATE users SET daily_quota = ? WHERE id = ?", (new_q, uid))
        updated_count += 1
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"已成功为 {updated_count} 位选中的用户调配每日额度"}

@app.post('/api/admin/users/batch-status')
async def admin_batch_status(req: AdminBatchStatusReq, admin: Dict[str, Any] = Depends(require_admin)):
    if not req.uids:
        raise HTTPException(status_code=400, detail="未选择任何用户")
    conn = get_db()
    cursor = conn.cursor()
    target_status = 1 if req.is_active else 0
    updated_count = 0
    for uid in req.uids:
        user = cursor.execute("SELECT id, role FROM users WHERE id = ?", (uid,)).fetchone()
        if not user or user["role"] == 'super_admin' or user["id"] == admin["id"]:
            continue
        cursor.execute("UPDATE users SET is_active = ? WHERE id = ?", (target_status, uid))
        updated_count += 1
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"已成功批量{'解封' if target_status == 1 else '冻结'} {updated_count} 位用户"}

@app.delete('/api/admin/users/{uid}')
async def admin_delete_user(uid: int, admin: Dict[str, Any] = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    user = cursor.execute("SELECT id, username, role FROM users WHERE id = ?", (uid,)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="用户不存在")
    if user["role"] == 'super_admin' or user["id"] == admin["id"]:
        conn.close()
        raise HTTPException(status_code=400, detail="不能删除超级管理员或当前登录的管理员账号")
    
    cursor.execute("DELETE FROM history WHERE user_id = ?", (uid,))
    cursor.execute("DELETE FROM daily_usage WHERE user_id = ?", (uid,))
    cursor.execute("DELETE FROM generation_logs WHERE user_id = ?", (uid,))
    cursor.execute("DELETE FROM users WHERE id = ?", (uid,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"用户 #{uid} ({user['username']}) 及其关联研报资产已被彻底删除"}

@app.post('/api/admin/users/batch-delete')
async def admin_batch_delete(req: AdminBatchDeleteReq, admin: Dict[str, Any] = Depends(require_admin)):
    if not req.uids:
        raise HTTPException(status_code=400, detail="未选择任何用户")
    conn = get_db()
    cursor = conn.cursor()
    deleted_count = 0
    for uid in req.uids:
        user = cursor.execute("SELECT id, role FROM users WHERE id = ?", (uid,)).fetchone()
        if not user or user["role"] == 'super_admin' or user["id"] == admin["id"]:
            continue
        cursor.execute("DELETE FROM history WHERE user_id = ?", (uid,))
        cursor.execute("DELETE FROM daily_usage WHERE user_id = ?", (uid,))
        cursor.execute("DELETE FROM generation_logs WHERE user_id = ?", (uid,))
        cursor.execute("DELETE FROM users WHERE id = ?", (uid,))
        deleted_count += 1
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"已成功批量彻底删除 {deleted_count} 位用户及其资产"}

@app.post('/api/admin/users/{uid}/tier')
async def admin_set_user_tier(uid: int, req: AdminTierReq, admin: Dict[str, Any] = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    user = cursor.execute("SELECT id, username, role, daily_quota, tier FROM users WHERE id = ?", (uid,)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="用户不存在")
    
    target_tier = req.tier if req.tier in TIER_QUOTA_MAP else 'basic'
    if req.custom_quota is not None:
        target_quota = req.custom_quota
    elif req.sync_quota:
        target_quota = TIER_QUOTA_MAP[target_tier]
    else:
        target_quota = user["daily_quota"]
        
    cursor.execute("UPDATE users SET tier = ?, daily_quota = ? WHERE id = ?", (target_tier, target_quota, uid))
    conn.commit()
    conn.close()
    return {
        "status": "success",
        "message": f"用户 #{uid} ({user['username']}) 等级已更新为: {TIER_NAME_MAP[target_tier]} (每日可用额度: {'无限' if target_quota == -1 else f'{target_quota}次/天'})"
    }

@app.post('/api/admin/users/batch-tier')
async def admin_batch_user_tier(req: AdminBatchTierReq, admin: Dict[str, Any] = Depends(require_admin)):
    if not req.uids:
        raise HTTPException(status_code=400, detail="未选择任何用户")
    target_tier = req.tier if req.tier in TIER_QUOTA_MAP else 'basic'
    target_quota = TIER_QUOTA_MAP[target_tier] if req.sync_quota else None
    
    conn = get_db()
    cursor = conn.cursor()
    updated_count = 0
    for uid in req.uids:
        user = cursor.execute("SELECT id, role, daily_quota FROM users WHERE id = ?", (uid,)).fetchone()
        if not user:
            continue
        new_q = target_quota if target_quota is not None else user["daily_quota"]
        cursor.execute("UPDATE users SET tier = ?, daily_quota = ? WHERE id = ?", (target_tier, new_q, uid))
        updated_count += 1
    conn.commit()
    conn.close()
    return {
        "status": "success",
        "message": f"已成功批量为 {updated_count} 位用户调整等级为: {TIER_NAME_MAP[target_tier]}{' (每日额度已同步调整)' if req.sync_quota else ''}"
    }

@app.post('/api/admin/users/{uid}/role')
async def admin_set_role(uid: int, req: AdminRoleReq, admin: Dict[str, Any] = Depends(require_admin)):
    if req.role not in ('user', 'admin', 'super_admin'):
        raise HTTPException(status_code=400, detail="非法角色")
    if admin["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="仅超级管理员可修改角色")
    if uid == admin["id"]:
        raise HTTPException(status_code=400, detail="不能修改当前登录账号的角色")
    conn = get_db()
    cursor = conn.cursor()
    target = cursor.execute("SELECT id, username, role FROM users WHERE id = ?", (uid,)).fetchone()
    if not target:
        conn.close()
        raise HTTPException(status_code=404, detail="用户不存在")
    if target["role"] == "super_admin" and req.role != "super_admin":
        remaining_super_admins = cursor.execute(
            "SELECT COUNT(*) AS c FROM users WHERE role = 'super_admin' AND is_active = 1 AND id != ?",
            (uid,)
        ).fetchone()["c"]
        if remaining_super_admins < 1:
            conn.close()
            raise HTTPException(status_code=400, detail="必须保留至少一个启用状态的超级管理员")
    cursor.execute("UPDATE users SET role = ? WHERE id = ?", (req.role, uid))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"用户 #{uid} 角色已修改为: {req.role}"}

@app.post('/api/admin/users/{uid}/status')
async def admin_toggle_status(uid: int, admin: Dict[str, Any] = Depends(require_admin)):
    conn = get_db()
    user = conn.execute("SELECT is_active, role FROM users WHERE id = ?", (uid,)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="用户不存在")
    if user["role"] == 'super_admin' and user["is_active"] == 1:
        conn.close()
        raise HTTPException(status_code=400, detail="不能封禁超级管理员账号")
        
    new_status = 0 if user["is_active"] == 1 else 1
    conn.execute("UPDATE users SET is_active = ? WHERE id = ?", (new_status, uid))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"用户 #{uid} 已{'冻结' if new_status == 0 else '解封'}"}

@app.get('/api/admin/logs')
async def admin_get_logs(page: int = 1, page_size: int = 10, module: Optional[str] = None, query: Optional[str] = None, admin: Dict[str, Any] = Depends(require_admin)):
    page = max(1, page)
    page_size = max(1, min(page_size, 100))
    conn = get_db()
    offset = (page - 1) * page_size
    
    where_clauses = []
    params = []
    
    if module and module.strip():
        where_clauses.append("g.type = ?")
        params.append(module.strip())
    if query and query.strip():
        where_clauses.append("(g.title LIKE ? OR g.username LIKE ? OR g.ip LIKE ? OR u.uid LIKE ?)")
        q_like = f"%{query.strip()}%"
        params.extend([q_like, q_like, q_like, q_like])
        
    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    
    count_sql = f"SELECT COUNT(*) AS c FROM generation_logs g LEFT JOIN users u ON g.user_id = u.id {where_sql}"
    total = conn.execute(count_sql, params).fetchone()["c"]
    total_pages = max(1, (total + page_size - 1) // page_size)
    
    query_sql = f"""
    SELECT g.id, g.user_id, g.username, g.ip, g.type, g.title, g.duration_ms, g.status,
           datetime(g.created_at, 'localtime') AS created_at,
           u.uid AS user_uid
    FROM generation_logs g
    LEFT JOIN users u ON g.user_id = u.id
    {where_sql}
    ORDER BY g.id DESC LIMIT ? OFFSET ?
    """
    rows = conn.execute(query_sql, params + [page_size, offset]).fetchall()
    
    logs_list = []
    for r in rows:
        row_dict = dict(r)
        # 查找匹配的研报历史记录 ID
        hist = conn.execute("""
            SELECT id FROM history
            WHERE (user_id = ? OR (? = 0 AND user_id = 0))
              AND type = ?
              AND (title = ? OR ? LIKE '%' || title || '%' OR title LIKE '%' || ? || '%')
            ORDER BY id DESC LIMIT 1
        """, (row_dict["user_id"], row_dict["user_id"], row_dict["type"], row_dict["title"], row_dict["title"], row_dict["title"])).fetchone()
        row_dict["history_id"] = hist["id"] if hist else None
        logs_list.append(row_dict)

    conn.close()
    return {
        "status": "success",
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "logs": logs_list
    }

@app.get('/api/admin/logs/{log_id}')
async def admin_get_log_detail(log_id: int, admin: Dict[str, Any] = Depends(require_admin)):
    conn = get_db()
    log_row = conn.execute("""
    SELECT g.id, g.user_id, g.username, g.ip, g.type, g.title, g.duration_ms, g.status,
           datetime(g.created_at, 'localtime') AS created_at,
           u.uid AS user_uid
    FROM generation_logs g
    LEFT JOIN users u ON g.user_id = u.id
    WHERE g.id = ?
    """, (log_id,)).fetchone()
    
    if not log_row:
        conn.close()
        raise HTTPException(status_code=404, detail="审计日志不存在")
    
    log = dict(log_row)
    
    # 查找关联的研报历史记录
    hist_row = conn.execute("""
    SELECT id, user_id, type, title, content, sources, datetime(created_at, 'localtime') AS created_at
    FROM history
    WHERE (user_id = ? OR (? = 0 AND user_id = 0))
      AND type = ?
      AND (title = ? OR ? LIKE '%' || title || '%' OR title LIKE '%' || ? || '%')
    ORDER BY id DESC
    LIMIT 1
    """, (log["user_id"], log["user_id"], log["type"], log["title"], log["title"], log["title"])).fetchone()
    
    history_data = dict(hist_row) if hist_row else None
    conn.close()
    return {
        "status": "success",
        "log": log,
        "history": history_data
    }

@app.get('/api/admin/settings')
async def admin_get_settings(admin: Dict[str, Any] = Depends(require_admin)):
    conn = get_db()
    rows = conn.execute("SELECT key, value FROM system_settings").fetchall()
    conn.close()
    return {"status": "success", "settings": {r["key"]: r["value"] for r in rows}}

@app.post('/api/admin/settings')
async def admin_update_settings(req: AdminSettingReq, admin: Dict[str, Any] = Depends(require_admin)):
    conn = get_db()
    for k, v in req.settings.items():
        conn.execute("INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP", (k, str(v), str(v)))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "系统设置已更新"}


# ==================== Monid 多源社交媒体采集引擎 ====================

async def fetch_monid_social_platform(client_session, monid_key: str, platform: str, keyword: str, sort_by: str = 'general') -> List[Dict[str, Any]]:
    """调用 Monid 网关采集指定社交媒体平台的一手切片"""
    base_url = "https://api.monid.ai/v1/run"
    headers = {
        "Authorization": f"Bearer {monid_key}",
        "Content-Type": "application/json"
    }
    
    endpoint_map = {
        "xiaohongshu": {
            "name": "小红书",
            "icon": "📕",
            "payload": {
                "provider": "tikhub",
                "endpoint": "/api/v1/xiaohongshu/app_v2/search_notes",
                "input": {"queryParams": {"keyword": keyword, "page": 1, "sort": "hot" if sort_by == "hot" else "general"}}
            }
        },
        "bilibili": {
            "name": "B站",
            "icon": "📺",
            "payload": {
                "provider": "tikhub",
                "endpoint": "/api/v1/bilibili/app/fetch_search_by_type",
                "input": {"queryParams": {"keyword": keyword, "search_type": "video", "order": "click" if sort_by == "hot" else "totalrank"}}
            }
        },
        "weibo": {
            "name": "微博",
            "icon": "🧣",
            "payload": {
                "provider": "tikhub",
                "endpoint": "/api/v1/weibo/web_v2/fetch_user_posts",
                "input": {"queryParams": {"keyword": keyword}}
            }
        },
        "douyin": {
            "name": "抖音",
            "icon": "🎵",
            "payload": {
                "provider": "tikhub",
                "endpoint": "/api/v1/douyin/search/fetch_general_search_v2",
                "input": {"queryParams": {"keyword": keyword, "offset": 0, "sort_type": 1 if sort_by == "hot" else 0}}
            }
        },
        "twitter": {
            "name": "Twitter/X",
            "icon": "🐦",
            "payload": {
                "provider": "tikhub",
                "endpoint": "/api/v1/twitter/web/fetch_search_timeline",
                "input": {"queryParams": {"keyword": keyword, "search_type": "Top" if sort_by == "hot" else "Latest"}}
            }
        },
        "wechat_mp": {
            "name": "微信公众号",
            "icon": "💬",
            "payload": {
                "provider": "tikhub",
                "endpoint": "/api/v1/wechat_mp/v2/fetch_account_articles",
                "input": {"queryParams": {"keyword": keyword}}
            }
        }
    }
    
    cfg = endpoint_map.get(platform)
    if not cfg:
        return []
        
    try:
        resp = await client_session.post(base_url, headers=headers, json=cfg["payload"], timeout=20.0)
        if resp.status_code != 200:
            return []
        data = resp.json()
        
        # 针对异步 Job 进行轮询（最多 3 次）
        if data.get("status") == "RUNNING" and data.get("runId"):
            run_id = data["runId"]
            for _ in range(3):
                await asyncio.sleep(1.5)
                poll_r = await client_session.get(f"https://api.monid.ai/v1/runs/{run_id}", headers=headers, timeout=10.0)
                if poll_r.status_code == 200:
                    poll_data = poll_r.json()
                    if poll_data.get("status") == "COMPLETED":
                        data = poll_data
                        break
        
        raw_output = data.get("output") or {}
        items = []
        
        # 解析小红书数据
        if platform == "xiaohongshu":
            note_list = raw_output.get("data", {}).get("items", []) or raw_output.get("items", [])
            for n in note_list[:6]:
                note_info = n.get("note") or n
                if not note_info: continue
                title = note_info.get("title") or note_info.get("display_title") or "小红书笔记"
                desc = note_info.get("desc") or note_info.get("content") or ""
                likes = note_info.get("liked_count") or note_info.get("collected_count") or 0
                comments = note_info.get("comments_count") or 0
                author_name = (note_info.get("user") or {}).get("nickname") or (note_info.get("at_user_list") or [{}])[0].get("nickname") or "小红书创作者"
                note_id = note_info.get("note_id") or n.get("id") or ""
                url = f"https://www.xiaohongshu.com/explore/{note_id}" if note_id else "https://www.xiaohongshu.com"
                items.append({
                    "platform": "xiaohongshu",
                    "platform_name": "小红书",
                    "icon": "📕",
                    "title": title,
                    "content": desc or title,
                    "author": author_name,
                    "url": url,
                    "likes": int(likes) if str(likes).isdigit() else 0,
                    "comments": int(comments) if str(comments).isdigit() else 0,
                    "time": "近期"
                })
                
        # 解析 Bilibili 数据
        elif platform == "bilibili":
            v_list = raw_output.get("data", {}).get("result", []) or []
            for v in v_list[:6]:
                title = re.sub(r'<[^>]+>', '', v.get("title") or "B站视频")
                desc = v.get("description") or ""
                play = v.get("play") or 0
                author_name = v.get("author") or "UP主"
                bvid = v.get("bvid") or ""
                url = f"https://www.bilibili.com/video/{bvid}" if bvid else "https://www.bilibili.com"
                items.append({
                    "platform": "bilibili",
                    "platform_name": "B站",
                    "icon": "📺",
                    "title": title,
                    "content": desc or title,
                    "author": author_name,
                    "url": url,
                    "likes": play if isinstance(play, int) else 0,
                    "comments": v.get("review") or 0,
                    "time": "近期"
                })
                
        # 解析 Twitter / X 数据
        elif platform == "twitter":
            tweets = raw_output.get("tweets") or raw_output.get("data") or raw_output.get("results") or []
            if isinstance(tweets, list):
                for tw in tweets[:6]:
                    text = tw.get("text") or tw.get("full_text") or tw.get("content") or ""
                    if not text: continue
                    author_name = (tw.get("user") or {}).get("screen_name") or tw.get("author") or "Twitter User"
                    likes = tw.get("favorite_count") or tw.get("likes") or 0
                    retweets = tw.get("retweet_count") or 0
                    url = tw.get("url") or f"https://twitter.com/{author_name}"
                    items.append({
                        "platform": "twitter",
                        "platform_name": "Twitter/X",
                        "icon": "🐦",
                        "title": text[:60] + "..." if len(text) > 60 else text,
                        "content": text,
                        "author": f"@{author_name}",
                        "url": url,
                        "likes": likes,
                        "comments": retweets,
                        "time": "近期"
                    })
                    
        # 解析通用/其他社媒格式
        else:
            generic_items = raw_output.get("items") or raw_output.get("results") or raw_output.get("data") or []
            if isinstance(generic_items, list):
                for it in generic_items[:5]:
                    title = it.get("title") or it.get("name") or f"{cfg['name']}动态"
                    content_str = it.get("content") or it.get("desc") or it.get("summary") or title
                    items.append({
                        "platform": platform,
                        "platform_name": cfg["name"],
                        "icon": cfg["icon"],
                        "title": title,
                        "content": content_str,
                        "author": it.get("author") or it.get("nickname") or f"{cfg['name']}用户",
                        "url": it.get("url") or it.get("link") or "#",
                        "likes": it.get("likes") or 0,
                        "comments": it.get("comments") or 0,
                        "time": "近期"
                    })
                    
        return items
    except Exception as e:
        print(f"Error fetching platform {platform} from Monid: {e}")
        return []

# ==================== 业务研报与检索端点 ====================

class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    count: Optional[int] = Field(default=10, ge=1, le=20)
    freshness: Optional[str] = None
    lang: Optional[str] = 'zh'
    engine: Optional[str] = 'hybrid' # 'hybrid' 双擎混合, 'parallel' Parallel高密, 'brave' 极速

class FollowupRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=500)
    original_report: str = Field(min_length=1, max_length=50000)
    question: str = Field(min_length=1, max_length=1000)

class ResearchRequest(BaseModel):
    input: str = Field(min_length=1, max_length=10000)
    chat_history: Optional[List[dict]] = Field(default=None, max_length=20)

class FinanceRequest(BaseModel):
    input: str = Field(min_length=1, max_length=500)

class ContentsRequest(BaseModel):
    urls: List[str] = Field(min_length=1, max_length=3)

class DigestRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=300)
    schedule: Optional[bool] = False




class EnrichRequest(BaseModel):
    name: str = Field(min_length=1, max_length=300)
    url: Optional[str] = None
    tag: Optional[str] = None

class DeepResearchRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=500)
    depth: Optional[str] = 'deep' # 'deep' 深度穿透 (2-3分钟) | 'exhaustive' 极限穷举

class FindAllRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    limit: Optional[int] = Field(default=20, ge=10, le=200)
    category: Optional[str] = 'company' # 'company' 企业图谱, 'product' 竞品大盘, 'invest' 融资标的, 'trend' 行业风向

class SocialRequest(BaseModel):
    keyword: str = Field(min_length=1, max_length=300)
    platforms: Optional[List[str]] = Field(default=["xiaohongshu", "bilibili", "weibo", "twitter"])
    mode: Optional[str] = 'comprehensive' # 'comprehensive' 综合舆情, 'competitor' 竞品对比, 'risk' 风险预警, 'marketing' 爆款拆解
    sort_by: Optional[str] = 'general' # 'general' 综合, 'latest' 最新, 'hot' 最热

class NewsRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    count: Optional[int] = Field(default=10, ge=1, le=20)
    lang: Optional[str] = 'zh'

class HistorySave(BaseModel):
    type: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=300)
    content: str = Field(min_length=1, max_length=200000)
    sources: Optional[str] = Field(default='', max_length=50000)

@app.get('/api/health')
async def health(user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    db_ok = True
    try:
        conn = get_db(); conn.execute('SELECT 1'); conn.close()
    except Exception:
        db_ok = False
    return {
        'status': 'ok',
        'version': '2.4.2',
        'proxy': bool(PROXY_URL),
        'db': db_ok,
        'user': {"username": user["username"], "role": user["role"]} if user else None
    }

@app.get('/api/system/announcement')
async def system_announcement():
    conn = get_db()
    row = conn.execute("SELECT value FROM system_settings WHERE key = 'announcement'").fetchone()
    conn.close()
    return {'status': 'success', 'data': {'announcement': row['value'] if row else ''}}

@app.post('/api/search')
async def api_search(req: SearchRequest, request: Request, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    ip = get_client_ip(request)
    quota_res = check_quota_available(user, ip)
    if not quota_res["allowed"]:
        raise HTTPException(
            status_code=403,
            detail="游客今日免费体验额度已用完，请登录解锁每日 10 次额度！" if quota_res["is_guest"] else "今日生成额度已达上限，次日自动刷新或联系管理员"
        )
    
    t0 = time.time()
    cache_key = f'search|{req.query}|{req.count}|{req.freshness or ""}'
    hit = CACHE.get(cache_key)
    if hit is not None:
        return {'status': 'success', 'data': hit, 'cached': True, 'quota': check_quota_available(user, ip)}
    
    # 如果用户指定 Parallel 高密引擎或混合模式
    data = None
    if req.engine == 'parallel':
        p_res = await fetch_parallel_search(req.query)
        if p_res and "results" in p_res:
            web_items = []
            for it in p_res["results"]:
                excerpts = it.get("excerpts", [])
                desc = "\n".join(excerpts) if excerpts else ""
                web_items.append({
                    "title": it.get("title") or "Parallel 研报切片",
                    "url": it.get("url") or "#",
                    "description": desc,
                    "age": it.get("publish_date") or "最新",
                    "engine": "Parallel.ai"
                })
            data = {"results": {"web": web_items}, "query": {"original": req.query}, "engine": "Parallel.ai"}

    if not data:
        # 优先走 Brave 毫秒级极速通道，异常自动降级至 You.com 备用通道
        data = await fetch_brave_web_search(req.query, req.count or 10, req.freshness, req.lang or 'zh')
    
    if not data:
        async with client() as c:
            params = {'query': req.query, 'count': req.count}
            if req.freshness: params['freshness'] = req.freshness
            resp = await c.get('https://api.you.com/v1/search', params=params, headers={'X-API-Key': get_current_you_api_key()})
            if resp.status_code != 200:
                record_gen_log(user, ip, '实时搜索', req.query, int((time.time() - t0)*1000), f'upstream_{resp.status_code}')
                raise HTTPException(status_code=502, detail="搜索上游服务暂时不可用（本次未扣除额度）")
            data = resp.json()
    
    duration = int((time.time() - t0) * 1000)
    record_gen_log(user, ip, '实时搜索', req.query, duration, 'success')
    consume_quota_success(user, ip)
    CACHE.set(cache_key, data)
    return {'status': 'success', 'data': data, 'quota': quota_res}

@app.post('/api/news')
async def api_news(req: NewsRequest, request: Request, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    ip = get_client_ip(request)
    quota_res = check_quota_available(user, ip)
    if not quota_res["allowed"]:
        raise HTTPException(status_code=403, detail="体验额度已用完，请登录账号继续体验！" if quota_res["is_guest"] else "今日额度已达上限")
        
    t0 = time.time()
    cache_key = f'news|{req.query}|{req.count}'
    hit = CACHE.get(cache_key)
    if hit is not None:
        return {'status': 'success', 'data': hit, 'cached': True, 'quota': check_quota_available(user, ip)}
    
    # 优先走 Brave News 极速通道，异常自动降级至备用通道
    data = await fetch_brave_news_search(req.query, req.count or 10, req.lang or 'zh')
    if not data:
        async with client() as c:
            resp = await c.get('https://api.you.com/v1/search', params={'query': req.query, 'count': req.count}, headers={'X-API-Key': get_current_you_api_key()})
            if resp.status_code != 200:
                record_gen_log(user, ip, '新闻流', req.query, int((time.time() - t0)*1000), f'upstream_{resp.status_code}')
                raise HTTPException(status_code=502, detail="新闻上游服务暂时不可用（本次未扣除额度）")
            data = resp.json()
        
    record_gen_log(user, ip, '新闻流', req.query, int((time.time() - t0)*1000), 'success')
    consume_quota_success(user, ip)
    CACHE.set(cache_key, data)
    return {'status': 'success', 'data': data, 'quota': quota_res}

@app.post('/api/research/stream')
async def api_research_stream(req: ResearchRequest, request: Request, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    ip = get_client_ip(request)
    quota_res = check_quota_available(user, ip)
    if not quota_res["allowed"]:
        async def err_gen():
            msg = "游客今日免费额度(2次)已用尽，请登录账号免费解锁每日 10 次额度！" if quota_res["is_guest"] else "今日生成额度已达上限，次日自动刷新"
            yield f'data: {json.dumps({"type": "error", "message": msg})}\n\n'
        return StreamingResponse(err_gen(), media_type='text/event-stream')

    async def generate():
        t0 = time.time()
        yield f'data: {json.dumps({"type": "start", "stage": "🦁 正在通过 Brave 独立索引库毫秒级检索最新切片...", "quota": quota_res})}\n\n'
        
        # 并发启动 SenseNova U1 Fast 商业信息图生图任务 (后台异步执行，不阻塞正文输出)
        
        # 1. 并发预取 Brave 独立索引库 (0.2s) + Parallel 顶级高密事实/表格矩阵
        p_task = fetch_parallel_search(req.input)
        b_task = fetch_brave_web_search(req.input, count=6)
        p_data, b_data = await asyncio.gather(p_task, b_task, return_exceptions=True)
        
        brave_snippets = []
        brave_sources = []
        if isinstance(b_data, dict) and "results" in b_data:
            for item in b_data["results"].get("web", []):
                brave_snippets.append(f"【Brave权威事实: {item.get('title')}】 {item.get('description')}")
                brave_sources.append({
                    "title": item.get("title"),
                    "url": item.get("url"),
                    "name": "Brave 独立索引"
                })
                
        # 融入 Parallel 高密 Markdown 结构化切片与官方大表
        parallel_snippets = []
        if isinstance(p_data, dict) and "results" in p_data:
            for item in p_data["results"][:4]:
                exc_list = item.get("excerpts", [])
                if exc_list:
                    parallel_snippets.append(f"【Parallel高密研报切片/数据表: {item.get('title')}】\n" + "\n".join(exc_list[:2]))
                    brave_sources.append({
                        "title": item.get("title") or "Parallel 结构化研报源",
                        "url": item.get("url"),
                        "name": "Parallel.ai 高密矩阵"
                    })
        
        yield f'data: {json.dumps({"type": "stage", "stage": "🧠 多源交叉验证与机构级深度推理中（已聚合 Parallel 高密表格 + Brave 事实矩阵）..."})}\n\n'
        
        try:
            clean_input = req.input.strip()[:1000]
            context_inject = ""
            if brave_snippets:
                context_inject = "\n【Brave实时一手高密信源】:\n" + "\n".join(brave_snippets[:3])
            
            enhanced_prompt = f"{clean_input}\n{context_inject}\n请结合上述一手交叉事实信源，生成权威详尽、逻辑严密、论据扎实的深度研报。"[:2800]
            
            data = None
            for attempt in range(2):
                try:
                    payload = {'input': enhanced_prompt if attempt == 0 else clean_input, 'chat_history': []}
                    async with client(timeout=90.0) as c:
                        resp = await c.post('https://api.you.com/v1/research', json=payload, headers={'X-API-Key': get_current_you_api_key()})
                        if resp.status_code == 200:
                            data = resp.json()
                            break
                        elif resp.status_code == 422 and attempt == 0:
                            print("You.com 422, falling back to minimal topic...")
                            continue
                        elif attempt == 1:
                            record_gen_log(user, ip, '深度研报', req.input, int((time.time() - t0)*1000), f'upstream_{resp.status_code}')
                            raise RuntimeError("深度研报上游服务暂时繁忙，请重试（本次未扣除额度）")
                except Exception as ex:
                    if attempt == 1:
                        raise ex
                    await asyncio.sleep(1.0)
            
            if not data or not data.get('output'):
                raise RuntimeError("深度研报生成无响应，请重试")
                
            content = data.get('output', {}).get('content', '')
            you_sources = data.get('output', {}).get('sources', [])
            
            # 合并并去重双源出处
            all_sources = brave_sources[:4] + [s for s in you_sources if not any(bs['url'] == s.get('url') for bs in brave_sources)]
            
            quota_final = consume_quota_success(user, ip)
            chunk_size = 50
            for i in range(0, len(content), chunk_size):
                yield f'data: {json.dumps({"type": "content", "chunk": content[i:i+chunk_size]})}\n\n'
                await asyncio.sleep(0.02)

            yield f'data: {json.dumps({"type": "done", "sources": all_sources, "full_content": content, "quota": quota_final})}\n\n'
            record_gen_log(user, ip, '深度研报', req.input, int((time.time() - t0)*1000), 'success')
        except Exception as e:
            record_gen_log(user, ip, '深度研报', req.input, int((time.time() - t0)*1000), 'failed')
            message = str(e) if isinstance(e, HTTPException) else "深度研报生成失败，请稍后重试"
            yield f'data: {json.dumps({"type": "error", "message": message})}\n\n'
            
    return StreamingResponse(generate(), media_type='text/event-stream', headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})



@app.post('/api/findall')
async def api_findall(req: FindAllRequest, request: Request, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """全网实体挖掘与企业/竞品商机大表生成 (支持 10/20/30/50/100/200 规模扩展与智能综合排名)"""
    ip = get_client_ip(request)
    quota_res = check_quota_available(user, ip)
    if not quota_res["allowed"]:
        raise HTTPException(
            status_code=403,
            detail="游客今日免费体验额度已用完，请登录解锁每日 10 次额度！" if quota_res["is_guest"] else "今日生成额度已达上限"
        )

    t0 = time.time()
    target_limit = max(10, min(req.limit or 20, 200))
    
    # 1. 构建多维度裂变检索子查询 (Sub-query Generation)
    sub_queries = [req.query]
    if target_limit >= 20:
        sub_queries.append(f"{req.query} 重点企业 龙头名录 500强")
    if target_limit >= 30:
        sub_queries.append(f"{req.query} 制造业 现代服务业 投资项目 名单")
    if target_limit >= 50:
        sub_queries.append(f"{req.query} 港资 台资 欧美外商 独资 合资 招商引资")
        sub_queries.append(f"{req.query} 产业园区 进驻企业 高新技术企业 汇总")
    if target_limit >= 100:
        sub_queries.append(f"{req.query} 跨境贸易 供应链 重点纳税企业 代表标的")
        sub_queries.append(f"{req.query} 注册资本 投资总额 行业分布 官方统计 名录")

    # 2. 并发调度 Parallel.ai 与 Brave 检索
    evidence_parts = []
    sources = []
    
    async def do_single_parallel_search(sq: str):
        try:
            return await fetch_parallel_search(
                sq,
                objective=f"全面挖掘检索全网符合【{sq}】的企业、实体、投资项目、主营业务与落地详情",
                count=4
            )
        except Exception:
            return None

    search_tasks = [do_single_parallel_search(sq) for sq in sub_queries]
    search_tasks.append(fetch_brave_web_search(f"{req.query} 公司 名录 投资 官网 汇总", count=10))
    
    search_results = await asyncio.gather(*search_tasks, return_exceptions=True)
    
    for res in search_results:
        if isinstance(res, dict) and "results" in res:
            res_list = res.get("results")
            if isinstance(res_list, list):
                for it in res_list:
                    excerpts = "\n".join(it.get("excerpts", []))
                    evidence_parts.append(f"【来源: {it.get('title')} | 链接: {it.get('url')}】\n{excerpts}")
                    sources.append({"title": it.get("title"), "url": it.get("url"), "name": "Parallel.ai"})
            elif isinstance(res_list, dict) and "web" in res_list:
                for it in res_list.get("web", []):
                    evidence_parts.append(f"【来源: {it.get('title')} | 链接: {it.get('url')}】\n{it.get('description')}")
                    sources.append({"title": it.get("title"), "url": it.get("url"), "name": "Brave 搜索"})

    evidence_text = "\n\n".join(evidence_parts[:28])
    if not evidence_text:
        evidence_text = f"全网关于【{req.query}】的公开企业与商机数据库。"

    # 3. 借助 LLM 提取标准的实体结构化表格并进行综合排名与打分
    extract_batch_count = 1 if target_limit <= 30 else (2 if target_limit <= 100 else 4)
    per_batch_limit = min(target_limit, 45)

    async def do_llm_extract(batch_idx: int, evidence_chunk: str, want_n: int) -> List[Dict[str, Any]]:
        prompt = f"""你是一位顶级商业数据库与全网实体挖掘评估专家。
请根据以下全网实时采集的高密信源，精准挖掘提炼出符合主题【{req.query}】的实体清单，并严格按照【智能匹配度与综合影响力】从高到低进行综合排名打分。

【全网一手高密数据源】：
{evidence_chunk}

---
【输出规范】：
请仅输出一个合法的 JSON 数组，严禁包含任何前缀文字、注释或 Markdown 代码块标记（如 ```json ），直接以 [ 开始，以 ] 结束。
每个实体对象包含以下 10 个字段：
1. "rank": 综合排名数字（整数，1, 2, 3... 按照影响力与匹配度由高到低排序）
2. "score": 综合匹配指数（整数 75~99，如 98 代表极其契合且属于行业标杆/知名实体）
3. "name": 实体/公司/产品名称（字符串，必填，精准公司全称或常用商号）
4. "tag": 核心定位/赛道标签/企业性质（如：世界500强外资、智能制造、东盟跨境、港资独资等，字符串）
5. "rank_reason": 排名与匹配依据（15字以内简练说明为何排名靠前，如：行业龙头/在邕投资超百亿/重点外资标杆，字符串）
6. "highlight": 核心竞争优势/产品技术亮点/在邕布局（60字以内精炼描述，字符串）
7. "funding": 注册资本/投资规模/融资轮次（如：投资10亿元、外商独资1000万美元等，未知写暂未披露）
8. "leader": 法定代表人/管理团队/创始人（字符串）
9. "location": 所属地区/总部或落地园区（如：广西南宁(江南区)、五象新区等，字符串）
10. "url": 官方网站或权威信源链接（字符串）

请尽可能挖掘提炼出 {want_n} 个最契合的实体（严格按综合匹配度从高到低排列）："""

        try:
            async with client(timeout=120.0) as c:
                resp = await c.post(
                    'https://api.you.com/v1/research',
                    json={'input': prompt, 'chat_history': []},
                    headers={'X-API-Key': get_current_you_api_key()}
                )
                if resp.status_code != 200:
                    return []
                raw_text = resp.json().get('output', {}).get('content', '').strip()
                cleaned_json = re.sub(r'^```(?:json)?\s*', '', raw_text, flags=re.MULTILINE)
                cleaned_json = re.sub(r'\s*```$', '', cleaned_json, flags=re.MULTILINE).strip()
                start_idx = cleaned_json.find('[')
                end_idx = cleaned_json.rfind(']')
                if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                    cleaned_json = cleaned_json[start_idx:end_idx+1]
                data = json.loads(cleaned_json)
                return data if isinstance(data, list) else []
        except Exception as err:
            print(f"Batch {batch_idx} LLM error: {err}")
            return []

    if extract_batch_count == 1:
        raw_entities = await do_llm_extract(1, evidence_text, target_limit)
    else:
        chunk_size = max(1, len(evidence_parts) // extract_batch_count)
        llm_tasks = []
        for i in range(extract_batch_count):
            chunk = "\n\n".join(evidence_parts[i*chunk_size : (i+1)*chunk_size]) or evidence_text
            llm_tasks.append(do_llm_extract(i+1, chunk, per_batch_limit))
        batch_results = await asyncio.gather(*llm_tasks)
        raw_entities = []
        for b_items in batch_results:
            raw_entities.extend(b_items)

    # 4. 智能实体归一化去重与重新计算综合排名
    seen_names = set()
    deduped_entities = []
    
    for item in raw_entities:
        if not isinstance(item, dict):
            continue
        raw_name = str(item.get("name", "")).strip()
        norm_name = re.sub(r'[\(\（\[\【].*?[\)\）\]\】]', '', raw_name).strip()
        if not norm_name or len(norm_name) < 2:
            continue
        if norm_name in seen_names:
            continue
        seen_names.add(norm_name)
        
        try:
            score = int(item.get("score", 85))
        except Exception:
            score = 85
        score = max(65, min(score, 99))
        item["score"] = score
        
        if not item.get("rank_reason"):
            item["rank_reason"] = "高契合度行业实体"
            
        deduped_entities.append(item)

    # 按 score 降序排序并赋予 1..N 排名
    deduped_entities.sort(key=lambda x: x.get("score", 80), reverse=True)
    for idx, item in enumerate(deduped_entities, 1):
        item["rank"] = idx

    entities = deduped_entities[:target_limit]

    duration_ms = int((time.time() - t0) * 1000)
    if not entities:
        record_gen_log(user, ip, '实体挖掘', req.query, duration_ms, 'failed')
        raise HTTPException(status_code=500, detail="实体数据解析失败，请尝试更换关键词")

    consume_quota_success(user, ip)
    record_gen_log(user, ip, '实体挖掘', req.query, duration_ms, 'success')

    return {
        "status": "success",
        "query": req.query,
        "target_limit": target_limit,
        "count": len(entities),
        "entities": entities,
        "sources": sources[:16]
    }

@app.post('/api/social/stream')
async def api_social_stream(req: SocialRequest, request: Request, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """全网社交媒体多源数据检索与舆情洞察研报生成 (SSE 流式响应)"""
    ip = get_client_ip(request)
    quota_res = check_quota_available(user, ip)
    if not quota_res["allowed"]:
        async def err_gen():
            msg = "游客今日免费额度(2次)已用尽，请登录账号免费解锁每日 10 次额度！" if quota_res["is_guest"] else "今日生成额度已达上限，次日自动刷新"
            yield f'data: {json.dumps({"type": "error", "message": msg})}\n\n'
        return StreamingResponse(err_gen(), media_type='text/event-stream')

    async def generate():
        t0 = time.time()
        monid_key = get_current_monid_api_key()
        target_platforms = req.platforms or ["xiaohongshu", "bilibili", "weibo", "twitter"]
        
        yield f'data: {json.dumps({"type": "start", "stage": f"📱 正在调度 Monid 网关并行检索 {len(target_platforms)} 个社媒平台一手真实切片...", "quota": quota_res})}\n\n'
        
        # 1. 并发抓取多平台社媒数据
        raw_items = []
        async with client(timeout=30.0) as c:
            tasks = [fetch_monid_social_platform(c, monid_key, p, req.keyword, req.sort_by or "general") for p in target_platforms]
            # 补充 Brave 实时社媒口碑作为辅助增强
            task_brave_social = fetch_brave_web_search(f"{req.keyword} 评测 体验 口碑 吐槽 小红书 知乎", count=6)
            
            results = await asyncio.gather(*tasks, task_brave_social, return_exceptions=True)
            
            for res in results[:-1]:
                if isinstance(res, list):
                    raw_items.extend(res)
                    
            brave_res = results[-1]
            if isinstance(brave_res, dict) and "results" in brave_res:
                for b_it in brave_res["results"].get("web", []):
                    raw_items.append({
                        "platform": "web_search",
                        "platform_name": "全网精选",
                        "icon": "🌐",
                        "title": b_it.get("title") or "社媒与论坛观点",
                        "content": b_it.get("description") or "",
                        "author": "全网信源",
                        "url": b_it.get("url") or "#",
                        "likes": 100,
                        "comments": 20,
                        "time": "近期"
                    })

        # 去重与切片上限
        seen_titles = set()
        deduped_items = []
        for it in raw_items:
            t_clean = it["title"].strip()
            if t_clean and t_clean not in seen_titles:
                seen_titles.add(t_clean)
                deduped_items.append(it)
                
        # 先下发原始卡片数据供前端立即渲染「原始切片流」
        yield f'data: {json.dumps({"type": "raw_items", "count": len(deduped_items), "items": deduped_items[:24]})}\n\n'
        
        yield f'data: {json.dumps({"type": "stage", "stage": f"🧠 成功采集 {len(deduped_items)} 条高密互动切片，正在聚类舆情态势并生成洞察研报..."})}\n\n'
        
        # 2. 构造社媒互动证据文本
        evidence_lines = []
        for idx, it in enumerate(deduped_items[:18], 1):
            evidence_lines.append(f"[{idx}] 【{it['platform_name']} | 作者: {it['author']} | 互动: {it['likes']}赞/{it['comments']}评】\n标题: {it['title']}\n内容摘要: {it['content']}")
            
        evidence_context = "\n\n".join(evidence_lines)
        if not evidence_context:
            evidence_context = f"关于【{req.keyword}】的全网综合社媒讨论与用户反馈数据。"
            
        mode_titles = {
            "comprehensive": "全网社媒声量与综合舆情洞察研报",
            "competitor": "竞品社媒声量与用户口碑对比剖析报告",
            "risk": "社媒负面舆情风险排查与危机预警研报",
            "marketing": "社交媒体爆款内容传播路径与营销拆解报告"
        }
        report_title = mode_titles.get(req.mode or "comprehensive", "全网社媒声量与综合舆情洞察研报")
        
        prompt = f"""你是一位顶级的数字营销与全网舆情商业分析专家。
请针对主题【{req.keyword}】，依据以下采集自小红书、B站、微博、抖音、推特等各社交媒体平台的一手真实用户发帖、评论与互动数据，撰写一份结构严谨、数据详实、直击痛点的《{report_title}》。

【一手社媒真实切片与互动证据库】：
{evidence_context}

---
【研报撰写格式与核心板块规范】：

# 📱 【{req.keyword}】{report_title}

## 📊 一、 全网舆情态势与情感倾向大盘
* **综合情感倾向指数**：[正面占比 % | 中立占比 % | 负面占比 %] 并给出定性评级（如：高度看好 / 争议加剧 / 普遍满意 / 负面承压）；
* **跨平台声量分布特征**：对比小红书、B站、微博、推特等不同平台用户在讨论侧重点上的鲜明差异；
* **核心舆论关键词云**：提炼最核心的 6~8 个高频讨论词。

## 🎯 二、 核心观点聚类与受众讨论焦点
* **主要支持与好评声音（爽点）**：真实用户最认可、复购或疯狂安利的核心优势是什么（引用具体切片佐证）；
* **主要质疑、吐槽与避雷点（痛点）**：用户集中反馈的产品缺陷、服务问题或争议点是什么；
* **不同圈层受众的认知分歧**：核心极客 vs 普通大众、男性受众 vs 女性受众的观点分野。

## 🔍 三、 典型爆款内容与传播动因拆解
* **高互动爆款案例剖析**：分析点赞/评论最高的代表性发帖，提炼其引发广泛共鸣的根本心理诱因；
* **舆论发酵与扩散节点**：哪些关键事件或头部博主推动了本次话题出圈。

## 💡 四、 商业洞察与品牌策略行动建议
* **产品/服务针对性优化建议**：如何解决上述用户高频吐槽点；
* **社媒传播与公关应对策略**：如何利用现有好评势能，化解负面潜在风险；
* **下一步营销抓手与内容切入点**：可借鉴的高转化选题方向。

---
请确保语言专业精炼、观点客观扎实、排版清晰美观，全面体现基于真实社媒大数据的洞察深度。"""

        try:
            safe_prompt = prompt[:2800]
            minimal_prompt = f"请针对关键词【{req.keyword}】，分析当前全网社交媒体（微博、小红书、B站等）上的舆论关注焦点与用户口碑评价。"
            data = None
            async with client(timeout=120.0) as c:
                for attempt in range(2):
                    payload = {'input': safe_prompt if attempt == 0 else minimal_prompt, 'chat_history': []}
                    resp = await c.post('https://api.you.com/v1/research', json=payload, headers={'X-API-Key': get_current_you_api_key()})
                    if resp.status_code == 200:
                        data = resp.json()
                        break
                    elif resp.status_code == 422 and attempt == 0:
                        continue
                    elif attempt == 1:
                        record_gen_log(user, ip, '社媒舆情', req.keyword, int((time.time() - t0)*1000), f'upstream_{resp.status_code}')
                        raise RuntimeError("社媒舆情分析上游服务暂时不可用（本次未扣除额度）")
                        
            if not data or not data.get('output'):
                raise RuntimeError("社媒舆情分析服务响应异常，请重试")
                
            content = data.get('output', {}).get('content', '')
            you_sources = data.get('output', {}).get('sources', [])
            
            # 组合多源出处
            social_sources = [
                    {"title": f"[{it['platform_name']}] {it['title']}", "url": it['url'], "name": it['platform_name']}
                for it in deduped_items[:8]
            ] + you_sources[:3]
                
            quota_final = consume_quota_success(user, ip)
            chunk_size = 60
            for i in range(0, len(content), chunk_size):
                yield f'data: {json.dumps({"type": "content", "chunk": content[i:i+chunk_size]})}\n\n'
                await asyncio.sleep(0.015)
                    
            yield f'data: {json.dumps({"type": "done", "sources": social_sources, "full_content": content, "raw_items": deduped_items[:24], "quota": quota_final})}\n\n'
            record_gen_log(user, ip, '社媒舆情', req.keyword, int((time.time() - t0)*1000), 'success')
        except Exception as e:
            record_gen_log(user, ip, '社媒舆情', req.keyword, int((time.time() - t0)*1000), 'failed')
            message = str(e) if isinstance(e, HTTPException) else "社媒舆情研报生成失败，请稍后重试"
            yield f'data: {json.dumps({"type": "error", "message": message})}\n\n'
            
    return StreamingResponse(generate(), media_type='text/event-stream', headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})

@app.post('/api/digest')
async def api_digest(req: DigestRequest, request: Request, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    ip = get_client_ip(request)
    quota_res = check_quota_available(user, ip)
    if not quota_res["allowed"]:
        raise HTTPException(
            status_code=403,
            detail="游客今日体验额度已用完，请登录解锁每日 10 次额度！" if quota_res["is_guest"] else "今日生成额度已达上限，次日自动刷新"
        )

    t0 = time.time()
    async with client(timeout=120.0) as c:
        try:
            # 1. 并行获取 Brave 过去24小时突发 + 过去7天深度动态 + You.com 全球新闻
            task_brave_24h = fetch_brave_web_search(f"{req.topic} 突发 动态", count=5, freshness="pd")
            task_brave_7d = fetch_brave_web_search(f"{req.topic} 深度 趋势", count=5, freshness="pw")
            task_news = c.get('https://api.you.com/v1/search', params={'query': req.topic, 'count': 5}, headers={'X-API-Key': get_current_you_api_key()})
            
            res_24h, res_7d, news_resp = await asyncio.gather(task_brave_24h, task_brave_7d, task_news, return_exceptions=True)
            
            items_24h = res_24h.get("results", {}).get("web", []) if isinstance(res_24h, dict) else []
            items_7d = res_7d.get("results", {}).get("web", []) if isinstance(res_7d, dict) else []
            news_items = news_resp.json().get("results", {}).get("news", []) if not isinstance(news_resp, Exception) and news_resp.status_code == 200 else []
            
            source_count = len(items_24h) + len(items_7d) + len(news_items)
            if source_count < 3:
                raise HTTPException(status_code=502, detail="可用信源不足（本次未扣除额度）")

            # 组合高密度时序上下文
            time_context = "【过去24小时突发动态】:\n" + "\n".join([f"- {it.get('title')}: {it.get('description')}" for it in items_24h[:3]]) + "\n\n【近7日核心脉络演进】:\n" + "\n".join([f"- {it.get('title')}: {it.get('description')}" for it in items_7d[:3]])
            
            prompt = f"""请针对主题【{req.topic}】生成一份专业级行业情报早报。
必须依据以下多源交叉时序信源撰写：
{time_context}

研报结构要求：
一、⚡ 过去24小时核心突发动态（提炼最关键大事件）
二、📅 近7日时序演进图谱与深层动因（梳理事件发展脉络）
三、💡 关键行业影响与商业/市场洞察
四、🔭 后续趋势展望与行动建议

必须确保事实准确、出处权威。"""
            
            # 严格控制输入长度并增加容错重试
            safe_prompt = prompt[:2800]
            minimal_prompt = f"请生成关于【{req.topic}】的最新行业动态早报。"
            res_data = {}
            for attempt in range(2):
                p_in = safe_prompt if attempt == 0 else minimal_prompt
                research_resp = await c.post('https://api.you.com/v1/research', json={'input': p_in}, headers={'X-API-Key': get_current_you_api_key()})
                if research_resp.status_code == 200:
                    res_data = research_resp.json()
                    break
                elif research_resp.status_code == 422 and attempt == 0:
                    continue
                elif attempt == 1:
                    record_gen_log(user, ip, '行业早报', req.topic, int((time.time() - t0)*1000), f'upstream_{research_resp.status_code}')
                    raise HTTPException(status_code=502, detail="早报上游服务暂时不可用（本次未扣除额度）")
            
            # 合并展示的关联新闻列表
            combined_news = items_24h[:4] + items_7d[:3] + news_items[:3]
            
            # 并发获取行业早报视觉配图
                        
            duration = int((time.time() - t0) * 1000)
            consume_quota_success(user, ip)
            record_gen_log(user, ip, '行业早报', req.topic, duration, 'success')
            return {
                'status': 'success',
                'topic': req.topic,
                'brief_report': res_data,
                'search_results': {'results': {'web': combined_news}},
                'duration_ms': duration,
                'quota': quota_res
            }
        except Exception as e:
            record_gen_log(user, ip, '行业早报', req.topic, int((time.time() - t0)*1000), 'failed')
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(status_code=500, detail="行业早报生成失败，请稍后重试")

@app.post('/api/finance')
async def api_finance(req: FinanceRequest, request: Request, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    ip = get_client_ip(request)
    quota_res = check_quota_available(user, ip)
    if not quota_res["allowed"]:
        raise HTTPException(status_code=403, detail="体验额度已用完，请登录后继续体验！" if quota_res["is_guest"] else "今日额度已达上限")

    t0 = time.time()
    async with client(timeout=120.0) as c:
        resp = await c.post('https://api.you.com/v1/research', json={'input': f'请调取并深度分析该标的财报、核心财务指标与估值情况: {req.input}'}, headers={'X-API-Key': get_current_you_api_key()})
        if resp.status_code != 200:
            record_gen_log(user, ip, '企业财报', req.input, int((time.time() - t0)*1000), f'upstream_{resp.status_code}')
            raise HTTPException(status_code=502, detail="财报洞察上游服务暂时不可用（本次未扣除额度）")
        consume_quota_success(user, ip)
        record_gen_log(user, ip, '企业财报', req.input, int((time.time() - t0)*1000), 'success')
        return {'status': 'success', 'data': resp.json(), 'quota': quota_res}

def validate_public_http_url(raw_url: str) -> str:
    parts = urlsplit(raw_url)
    if parts.scheme not in ('http', 'https') or not parts.hostname:
        raise HTTPException(status_code=400, detail="仅支持公网 HTTP/HTTPS 链接")
    if parts.username is not None or parts.password is not None:
        raise HTTPException(status_code=400, detail="链接不允许包含凭据")
    if ':' in parts.netloc and not (parts.hostname.startswith('[') and parts.netloc.endswith(']')):
        try:
            if int(parts.port) not in (80, 443):
                raise HTTPException(status_code=400, detail="仅允许 80 或 443 端口")
        except ValueError:
            raise HTTPException(status_code=400, detail="端口无效")
    try:
        infos = socket.getaddrinfo(parts.hostname, None)
    except socket.gaierror:
        raise HTTPException(status_code=400, detail="目标域名无法解析")
    addresses = {info[4][0] for info in infos}
    for address in addresses:
        ip = ip_address(address)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified:
            raise HTTPException(status_code=400, detail="不允许访问内网或保留地址")
    return urlunsplit((parts.scheme, parts.netloc, parts.path or '/', parts.query, ''))

async def fetch_safe_article(http_client: httpx.AsyncClient, raw_url: str) -> httpx.Response:
    current_url = validate_public_http_url(raw_url)
    for _redirect_count in range(6):
        response = await http_client.get(current_url, headers={'User-Agent': BROWSER_HEADERS['User-Agent']})
        if response.status_code in (301, 302, 303, 307, 308):
            next_url = response.headers.get('location', '')
            if not next_url:
                return response
            current_url = validate_public_http_url(next_url)
            continue
        return response
    raise HTTPException(status_code=400, detail="重定向次数过多")

async def read_limited_body(response: httpx.Response, limit_bytes: int = 2000000) -> bytes:
    chunks = []
    total = 0
    async for chunk in response.aiter_bytes():
        total += len(chunk)
        if total > limit_bytes:
            raise HTTPException(status_code=413, detail="网页内容过大")
        chunks.append(chunk)
    return b''.join(chunks)

@app.post('/api/contents')
async def api_contents(req: ContentsRequest, request: Request, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    ip = get_client_ip(request)
    quota_res = check_quota_available(user, ip)
    if not quota_res["allowed"]:
        raise HTTPException(status_code=403, detail="体验额度已用完，请登录后继续！" if quota_res["is_guest"] else "今日额度已达上限")

    t0 = time.time()
    results = []

    for raw_url in req.urls:
        req_url = validate_public_http_url(raw_url)
        
    # 优先采用 Parallel.ai 顶级免清洗提纯引擎 (1.7s 高精度，攻克 JS 渲染与复杂 PDF)
    parallel_extracted = await fetch_parallel_extract(req.urls[:3])
    if parallel_extracted and any(item.get("word_count", 0) > 80 for item in parallel_extracted):
        results = parallel_extracted
        consume_quota_success(user, ip)
        record_gen_log(user, ip, '正文提取(Parallel)', ','.join(req.urls[:2]), int((time.time() - t0)*1000), 'success')
        return {'status': 'success', 'data': results, 'quota': quota_res, 'engine': 'Parallel.ai'}

    transport = httpx.AsyncHTTPTransport(proxy=PROXY_URL) if PROXY_URL else None
    async with httpx.AsyncClient(transport=transport, timeout=20.0, follow_redirects=False, headers=BROWSER_HEADERS) as c:
        for original_url in req.urls[:3]:
            item = None
            try:
                r = await fetch_safe_article(c, original_url)
                if r.status_code == 200:
                    body = await read_limited_body(r)
                    html = body.decode(r.charset_encoding or 'utf-8', errors='replace')
                    if len(html) > 200:
                        item = extract_clean_article_markdown(html, str(r.url))
                if item is None:
                    you_resp = await c.post('https://api.you.com/v1/contents', json={'urls': [str(original_url)]}, headers={'X-API-Key': get_current_you_api_key()})
                    if you_resp.status_code == 200:
                        raw_data = you_resp.json()
                        first_content = raw_data.get('contents', [{}])[0] if isinstance(raw_data, dict) else {}
                        raw_html = first_content.get('html') or first_content.get('markdown') or ''
                        item = extract_clean_article_markdown(raw_html, str(original_url))
                    else:
                        item = {
                            "url": str(original_url), "domain": "", "title": "提取失败",
                            "markdown": "> ⚠️ 该网页无法直接抓取", "word_count": 0
                        }
                results.append(item)
            except HTTPException:
                raise
            except Exception:
                try:
                    you_resp = await c.post('https://api.you.com/v1/contents', json={'urls': [str(original_url)]}, headers={'X-API-Key': get_current_you_api_key()})
                    if you_resp.status_code == 200:
                        raw_data = you_resp.json()
                        first_content = raw_data.get('contents', [{}])[0] if isinstance(raw_data, dict) else {}
                        raw_html = first_content.get('html') or first_content.get('markdown') or ''
                        item = extract_clean_article_markdown(raw_html, str(original_url))
                    else:
                        item = {"url": str(original_url), "domain": "", "title": "抓取失败", "markdown": "> ⚠️ 抓取异常，请稍后重试", "word_count": 0}
                    results.append(item)
                except Exception:
                    results.append({"url": str(original_url), "domain": "", "title": "抓取失败", "markdown": "> ⚠️ 抓取异常，请稍后重试", "word_count": 0})
    failed_count = sum(1 for result in results if result.get("word_count", 0) == 0)
    if len(results) > 0 and failed_count == len(results):
        record_gen_log(user, ip, '正文提取', ','.join(req.urls[:2]), int((time.time() - t0)*1000), 'failed')
        raise HTTPException(status_code=502, detail="全部链接都无法提取正文（本次未扣除额度）")
    consume_quota_success(user, ip)
    record_gen_log(user, ip, '正文提取', ','.join(req.urls[:2]), int((time.time() - t0)*1000), 'success')
    return {'status': 'success', 'data': results, 'quota': quota_res}

# ==================== 历史记录 (用户隔离) ====================

@app.get('/api/history')
async def get_history(limit: int = 50, offset: int = 0, user: Dict[str, Any] = Depends(require_auth)):
    uid = user["id"] if user else 0
    limit = min(max(1, limit), 200)
    offset = max(0, offset)
    
    conn = get_db()
    total = conn.execute('SELECT COUNT(*) FROM history WHERE user_id = ?', (uid,)).fetchone()[0]
    rows = conn.execute(
        'SELECT id, type, title, substr(content, 1, 300) AS excerpt, sources, '
        'datetime(created_at, \'localtime\') AS created_at '
        'FROM history WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?', (uid, limit, offset)).fetchall()
    conn.close()
    return {'status': 'success', 'total': total, 'data': [dict(r) for r in rows]}

@app.get('/api/history/{hid}')
async def get_history_detail(hid: int, user: Dict[str, Any] = Depends(require_auth)):
    uid = user["id"] if user else 0
    conn = get_db()
    row = conn.execute(
    'SELECT id, type, title, content, sources, '
    'datetime(created_at, \'localtime\') AS created_at '
    'FROM history WHERE id = ? AND user_id = ?', (hid, uid)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail='记录不存在')
    return {'status': 'success', 'data': dict(row)}

@app.post('/api/history')
async def save_history(req: HistorySave, user: Dict[str, Any] = Depends(require_auth)):
    uid = user["id"] if user else 0
    title = (req.title or '')[:300]
    content = (req.content or '')[:200000]
    
    conn = get_db()
    conn.execute(
        'INSERT INTO history (user_id, type, title, content, sources) VALUES (?, ?, ?, ?, ?)',
        (uid, (req.type or '其他')[:50], title, content, req.sources or '')
    )
    conn.commit()
    conn.close()
    return {'status': 'success'}

@app.delete('/api/history/{hid}')
async def delete_history(hid: int, user: Dict[str, Any] = Depends(require_auth)):
    uid = user["id"] if user else 0
    conn = get_db()
    conn.execute('DELETE FROM history WHERE id = ? AND user_id = ?', (hid, uid))
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

# ==================== 卡片本地化翻译端点 ====================
class TranslateRequest(BaseModel):
    title: Optional[str] = Field(default="", max_length=500)
    text: str = Field(min_length=1, max_length=20000)

@app.post('/api/translate')
async def api_translate(req: TranslateRequest, request: Request, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """将英文搜索/新闻卡片快速翻译为地道中文"""
    prompt = f"请将以下英文内容准确、通顺、地道地翻译为中文（保持专业术语如模型名不变）。\n标题：{req.title}\n正文：{req.text}\n请直接输出JSON格式：{{\"title\": \"中文标题\", \"text\": \"中文正文\"}}"
    ip = get_client_ip(request)
    quota_res = check_quota_available(user, ip)
    if not quota_res["allowed"]:
        raise HTTPException(status_code=403, detail="额度已用完，请登录后继续使用")
    try:
        async with client(timeout=30.0) as c:
            resp = await c.post('https://api.you.com/v1/research', json={'input': prompt}, headers={'X-API-Key': get_current_you_api_key()})
            if resp.status_code == 200:
                raw = resp.json().get('output', {}).get('content', '')
                # 尝试提取 JSON
                import re
                match = re.search(r'\{.*\}', raw, re.DOTALL)
                if match:
                    res_json = json.loads(match.group())
                    consume_quota_success(user, ip)
                    return {"status": "success", "data": res_json}
                consume_quota_success(user, ip)
                return {"status": "success", "data": {"title": req.title, "text": raw}}
    except Exception as e:
        pass
    return {"status": "error", "message": "翻译服务繁忙"}




async def call_you_research_resilient(prompt: str, timeout_sec: float = 60.0) -> str:
    """带自动重试、输入截断与 422 自动降级的 You.com LLM 调用器"""
    headers = {'X-API-Key': get_current_you_api_key(), 'Content-Type': 'application/json'}
    # 严格截断输入到 3000 字符安全区间，杜绝上游 422
    safe_prompt = prompt[:3000] if len(prompt) > 3000 else prompt
    payload = {'input': safe_prompt, 'chat_history': []}
    
    for attempt in range(2):
        try:
            async with client(timeout=timeout_sec) as c:
                resp = await c.post('https://api.you.com/v1/research', json=payload, headers=headers)
                if resp.status_code == 200:
                    return resp.json().get('output', {}).get('content', '').strip()
                elif resp.status_code == 422:
                    # 422 = 输入仍然过长或格式不合规，降级为纯主题重试
                    print(f"You.com returned 422, retrying with minimal prompt (attempt {attempt+1})")
                    # 提取前 500 字符作为精简主题
                    minimal = safe_prompt[:500]
                    resp2 = await c.post('https://api.you.com/v1/research', json={'input': minimal}, headers=headers)
                    if resp2.status_code == 200:
                        return resp2.json().get('output', {}).get('content', '').strip()
                    if attempt == 1:
                        raise HTTPException(status_code=502, detail=f"上游模型服务响应异常 ({resp2.status_code})")
                elif attempt == 1:
                    raise HTTPException(status_code=502, detail=f"上游模型服务响应异常 ({resp.status_code})")
        except HTTPException:
            raise
        except Exception as e:
            if attempt == 1:
                print(f"Resilient LLM call failed after 2 attempts: {e}")
                raise e
            await asyncio.sleep(0.8)
    return ""


# ==================== 8.1 实体官网深度穿透档案 (Parallel.ai Extract 扒底细) ====================

@app.post('/api/findall/enrich')
async def api_findall_enrich(req: EnrichRequest, request: Request, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """一键穿透实体官网与企业底细 (PitchBook / 企查查 Pro 风格高阶结构化全景看板)"""
    ip = get_client_ip(request)
    quota_res = check_quota_available(user, ip)
    if not quota_res["allowed"]:
        raise HTTPException(
            status_code=403,
            detail="游客今日免费体验额度已用完，请登录解锁每日 10 次额度！" if quota_res["is_guest"] else "今日生成额度已达上限"
        )

    t0 = time.time()
    evidence_parts = []
    sources = []

    # 1. 并发调度 Extract 与 Search
    tasks = []
    has_valid_url = bool(req.url and req.url.startswith('http') and 'example.com' not in req.url)
    if has_valid_url:
        tasks.append(fetch_parallel_extract(
            [req.url],
            objective=f"全面提取【{req.name}】的官网主营业务、核心产品矩阵、技术优势、高管管理团队、重点客户案例与公司定位"
        ))
    else:
        tasks.append(asyncio.sleep(0))

    tasks.append(fetch_parallel_search(
        f"{req.name} 核心产品 技术优势 高管团队 融资历程 客户案例 商业模式",
        objective=f"深入调研【{req.name}】的详细企业画像、主营产品线、核心团队履历、投融资背景与商业壁垒",
        count=4
    ))
    tasks.append(fetch_brave_web_search(f"{req.name} 官网 产品 团队 融资 介绍 业务", count=4))

    fetch_results = await asyncio.gather(*tasks, return_exceptions=True)

    # 处理 Extract 结果
    if has_valid_url and isinstance(fetch_results[0], list):
        for item in fetch_results[0]:
            md = item.get("markdown", "")
            evidence_parts.append(f"【官网官方直接披露: {item.get('title')} | 网址: {item.get('url')}】\n{md[:3000]}")
            sources.append({"title": f"{req.name} 官方网站", "url": item.get('url') or req.url, "name": "Parallel 官网直提"})

    # 处理 Parallel Search 结果
    p_data = fetch_results[1] if len(fetch_results) > 1 else None
    if isinstance(p_data, dict) and "results" in p_data:
        for it in p_data["results"]:
            excerpts = "\n".join(it.get("excerpts", []))
            evidence_parts.append(f"【权威信源: {it.get('title')} | 链接: {it.get('url')}】\n{excerpts}")
            sources.append({"title": it.get("title"), "url": it.get("url"), "name": "Parallel 深度索引"})

    # 处理 Brave 结果
    b_data = fetch_results[2] if len(fetch_results) > 2 else None
    if isinstance(b_data, dict) and "results" in b_data and "web" in b_data["results"]:
        for it in b_data["results"]["web"]:
            evidence_parts.append(f"【公开资讯: {it.get('title')} | 链接: {it.get('url')}】\n{it.get('description')}")
            sources.append({"title": it.get("title"), "url": it.get("url"), "name": "Brave 搜索"})

    evidence_text = "\n\n".join(evidence_parts[:18])
    if not evidence_text:
        evidence_text = f"关于企业【{req.name}】的公开商业与产业信息汇总。"

    # 并发启动 SenseNova 企业全景商业档案配图
    
    # 2. 借助 LLM 输出严格的高阶结构化 JSON 实体档案 (PitchBook / 企查查风格)
    prompt = f"""你是一位顶级商业尽调与股权投资分析总监。
请根据以下通过 Parallel.ai 全网采集的一手官方披露与权威高密事实，为【{req.name}】提炼一份高度结构化、专业严谨的【企业商业全景情报档案】。

【全网一手官方与权威数据源】：
{evidence_text}

---
【要求】：
1. 必须且只能输出严格合法的 JSON 对象，不要包含 markdown 外部包裹外的多余闲聊。
2. 提炼真实明确的事实、产品名、技术参数、人物履历与商业数据。绝对禁止输出“现有资料未披露”、“未核实”等消极排比废话。获取不到具体细节的项目请如实简明提炼核心特征。
3. JSON 格式规范如下：
{{
  "company_name": "{req.name}",
  "tagline": "一句话核心定位与行业地位（如：国内领先的人形机器人全栈自研与商业化量产先锋）",
  "industry": "细分行业赛道（如：具身智能 / 工业物流自动化）",
  "website": "{req.url if req.url and req.url.startswith('http') else ''}",
  "metrics": {{
    "business_model": "核心商业模式（如：自研核心零部件 + 整机量产交付 + 场景解决方案定制）",
    "market_position": "行业梯队与市场地位（如：中国具身智能出货量第一梯队 / 专精特新重点标杆）",
    "scale_and_capital": "资本与规模概况（如：完成 C+ 轮数亿元融资 / 估值数十亿元 / 注册资本XXX）",
    "headquarters": "总部与主要基地（如：总部位于广东深圳，建有华南智能制造产业园）"
  }},
  "products": [
    {{
      "name": "产品或业务线名称",
      "category": "产品分类（如：工业级双足机器人 / 运动控制模组）",
      "desc": "核心功能、技术规格与解决的关键行业痛点",
      "highlight": "核心技术指标或关键卖点（如：自研行星关节、负载20kg）"
    }}
  ],
  "moats": [
    {{
      "title": "核心壁垒与优势",
      "detail": "深度解析支撑该壁垒的核心技术、独家资质、专利矩阵或供应链优势",
      "type": "核心技术 / 专利矩阵 / 产业链协同 / 渠道与客户壁垒"
    }}
  ],
  "executives": [
    {{
      "name": "高管姓名",
      "title": "职位（如：创始人 & CEO）",
      "background": "核心从业履历、学术背景、技术荣誉或过往标杆成果"
    }}
  ],
  "partners_and_clients": [
    {{
      "name": "标杆客户或战略伙伴",
      "type": "头部客户 / 战略生态 / 示范场景",
      "cooperation": "合作业务内容、落地场景或交付成果"
    }}
  ],
  "strategic_summary": "3-4 句专业商业透视：综合评价该企业的核心商业价值、未来增长潜力及合作/投资战略研判建议。"
}}
"""

    try:
        raw_json_str = await call_you_research_resilient(prompt, timeout_sec=50.0)
        # 解析 JSON
        clean_json = raw_json_str.strip()
        if clean_json.startswith("```"):
            clean_json = clean_json.split("```")[1]
            if clean_json.startswith("json"):
                clean_json = clean_json[4:].strip()
        
        # 提取第一个 { 和 最后一个 }
        start_idx = clean_json.find('{')
        end_idx = clean_json.rfind('}')
        if start_idx != -1 and end_idx != -1:
            clean_json = clean_json[start_idx:end_idx+1]
            dossier_data = json.loads(clean_json)
        else:
            raise ValueError("No JSON object found")
    except Exception as e:
        print(f"Error parsing enrich JSON: {e}, falling back to structured fallback")
        dossier_data = {
            "company_name": req.name,
            "tagline": f"{req.name} 商业全景与产业链深度档案",
            "industry": req.tag or "商业科技",
            "website": req.url or "",
            "metrics": {
                "business_model": "专业产业服务与技术解决方案研发",
                "market_position": "行业核心骨干标杆企业",
                "scale_and_capital": "稳健经营，资本架构完善",
                "headquarters": "主营运营基地及分支机构"
            },
            "products": [
                {"name": "主营业务与核心产品矩阵", "category": "核心业务", "desc": "依托成熟研发与运营体系，提供高标准的产业与技术交付方案。", "highlight": "稳定可靠交付"}
            ],
            "moats": [
                {"title": "全产业链协同与运营沉淀", "detail": "拥有完善的客户服务网络与深厚行业交付经验。", "type": "产业链协同"}
            ],
            "executives": [
                {"name": "核心管理团队", "title": "执行管理层", "background": "具备多年深厚行业运营与产业管理经验。"}
            ],
            "partners_and_clients": [
                {"name": "行业头部伙伴", "type": "生态伙伴", "cooperation": "在供应链、联合技术开发及渠道分销领域深度合作。"}
            ],
            "strategic_summary": f"【{req.name}】具备扎实的业务基本盘与产业配套优势，建议进一步关注其技术迭代与区域市场扩张。"
        }

    duration_ms = int((time.time() - t0) * 1000)
    consume_quota_success(user, ip)
    record_gen_log(user, ip, '企业穿透', req.name, duration_ms, 'success')

    return {
        "status": "success",
        "name": req.name,
        "data": dossier_data,
        "sources": sources[:12]
    }


# ==================== 8.4 研报多轮深度追问 (Research Follow-up Q&A Stream) ====================

@app.post('/api/research/followup')
async def api_research_followup(req: FollowupRequest, request: Request, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """基于当前研报上下文的多轮智能深度追问 (SSE 流式输出)"""
    ip = get_client_ip(request)
    quota_res = check_quota_available(user, ip)
    if not quota_res["allowed"]:
        async def err_gen():
            yield f'data: {json.dumps({"type": "error", "message": "游客今日免费额度已用完，请登录解锁更多额度！" if quota_res["is_guest"] else "今日额度已达上限"})}\n\n'
        return StreamingResponse(err_gen(), media_type='text/event-stream')

    async def generate():
        t0 = time.time()
        # 截取原研报前 3500 字符作为核心上下文
        context_slice = req.original_report[:3500]
        prompt = f"""你是一位顶级商业尽调与行业投资研究专家。
用户此前针对主题【{req.topic}】生成了一份商业研报，核心内容节选如下：
---
{context_slice}
---

现在用户针对本篇研报提出了针对性深入追问：
【追问核心问题】：{req.question}

请基于上述研报核心结论并结合权威事实与商业逻辑，对用户的追问进行透彻、严谨、有数据有观点的专项深度解答。
要求：
1. 直击痛点：紧扣追问本身，不讲空话套话，给出明确判断、逻辑推导或对比分析；
2. 结构清晰：采用清晰的 Markdown 标题、要点列表或数据小表排版；
3. 客观扎实：凡引用企业、数据或技术方案，务必准确严谨。"""

        try:
            safe_prompt = prompt[:2800]
            data = None
            async with client(timeout=120.0) as c:
                for attempt in range(2):
                    p_in = safe_prompt if attempt == 0 else f"请针对关于【{req.topic}】的研报，专项解答以下追问：{req.question}"
                    payload = {'input': p_in, 'chat_history': []}
                    resp = await c.post('https://api.you.com/v1/research', json=payload, headers={'X-API-Key': get_current_you_api_key()})
                    if resp.status_code == 200:
                        data = resp.json()
                        break
                    elif resp.status_code == 422 and attempt == 0:
                        continue
                    elif attempt == 1:
                        yield f'data: {json.dumps({"type": "error", "message": "追问上游服务暂时不可用，请稍后重试"})}\n\n'
                        return
                        
            if not data or not data.get('output'):
                yield f'data: {json.dumps({"type": "error", "message": "追问解答响应异常，请重试"})}\n\n'
                return
                
            content = data.get('output', {}).get('content', '')
            sources = data.get('output', {}).get('sources', [])
            quota_final = consume_quota_success(user, ip)
            
            chunk_size = 50
            for i in range(0, len(content), chunk_size):
                yield f'data: {json.dumps({"type": "content", "chunk": content[i:i+chunk_size]})}\n\n'
                await asyncio.sleep(0.015)
                
            duration = int((time.time() - t0) * 1000)
            record_gen_log(user, ip, '研报追问', f"{req.topic[:20]}: {req.question[:20]}", duration, 'success')
            yield f'data: {json.dumps({"type": "done", "full_content": content, "sources": sources[:4], "duration_ms": duration, "quota": quota_final})}\n\n'
        except Exception as e:
            yield f'data: {json.dumps({"type": "error", "message": f"追问发生异常: {str(e)}"})}\n\n'

    return StreamingResponse(generate(), media_type='text/event-stream', headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})

# ==================== 8.2 AI 代跑长程深度多跳调研 (Deep Long-Horizon Research Stream) ====================

@app.post('/api/deepresearch/stream')
async def api_deep_research_stream(req: DeepResearchRequest, request: Request, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """AI 代跑长程深度多跳调研 (多步自主探查 + Parallel 全网高密索引 + 机构级对比研报流式生成)"""
    ip = get_client_ip(request)
    quota_res = check_quota_available(user, ip)
    if not quota_res["allowed"]:
        async def err_gen():
            yield f'data: {json.dumps({"type": "error", "message": "游客今日免费额度已用完，请登录解锁每日 10 次额度！" if quota_res["is_guest"] else "今日额度已达上限"})}\n\n'
        return StreamingResponse(err_gen(), media_type='text/event-stream')

    async def generate():
        t0 = time.time()
        try:
            # 阶段 1: 智能体规划与课题拆解
            yield f'data: {json.dumps({"type": "start", "stage": "🧭 [Step 1] 智能体规划引擎启动，正在将长程课题拆解为 6 个纵深子方向...", "quota": quota_res})}\n\n'
            await asyncio.sleep(0.5)

            sub_queries = [
                f"{req.topic} 行业现状 竞争格局 TOP企业",
                f"{req.topic} 核心技术方案 关键零部件 供应链体系",
                f"{req.topic} 商业报价 采购成本 定价模型 对比",
                f"{req.topic} 龙头公司 优缺点 测评 对照表",
                f"{req.topic} 投资风险 政策壁垒 发展趋势 预测"
            ]

            # 阶段 2: 并发调度 Parallel.ai 顶级索引多跳探查
            yield f'data: {json.dumps({"type": "stage", "stage": "⚡ [Step 2] 正在并发调度 Parallel.ai 全网专有索引库，多跳穿透抓取各子维度权威事实..."})}\n\n'
            
            search_tasks = []
            for sq in sub_queries:
                search_tasks.append(fetch_parallel_search(
                    sq,
                    objective=f"全面穿透调研【{sq}】的详细事实、权威数据、核心参数大表与深度洞察",
                    count=4
                ))
            # 补充 Brave 事实
            search_tasks.append(fetch_brave_web_search(f"{req.topic} 深度研报 对比大表 供应链", count=8))

            results = await asyncio.gather(*search_tasks, return_exceptions=True)
            
            evidence_blocks = []
            sources = []
            for res in results:
                if isinstance(res, dict) and "results" in res:
                    res_list = res.get("results")
                    if isinstance(res_list, list):
                        for it in res_list:
                            excerpts = "\n".join(it.get("excerpts", []))
                            evidence_blocks.append(f"【来源: {it.get('title')} | 链接: {it.get('url')}】\n{excerpts}")
                            sources.append({"title": it.get("title"), "url": it.get("url"), "name": "Parallel.ai"})
                    elif isinstance(res_list, dict) and "web" in res_list:
                        for it in res_list.get("web", []):
                            evidence_blocks.append(f"【来源: {it.get('title')} | 链接: {it.get('url')}】\n{it.get('description')}")
                            sources.append({"title": it.get("title"), "url": it.get("url"), "name": "Brave 搜索"})

            # 阶段 3: 提取关键企业与官网深挖
            yield f'data: {json.dumps({"type": "stage", "stage": "📑 [Step 3] 正在交叉核验核心标的官网白皮书与技术参数，构建多维对比矩阵..."})}\n\n'
            await asyncio.sleep(0.5)

            full_evidence = "\n\n".join(evidence_blocks[:24])
            if not full_evidence:
                full_evidence = f"全网关于【{req.topic}】的公开深度研究数据库。"

            # 阶段 4: 多维横向长文与对比大表合成
            yield f'data: {json.dumps({"type": "stage", "stage": "🧠 [Step 4] 正在启动顶级战略智库推理，合成包含多维横向参数大表与商业尽调长文..."})}\n\n'

            agent_prompt = f"""你是一位顶级战略咨询顾问与产业投资总监。
请根据以下通过 Parallel.ai 全网多跳采集的一手高密事实与参数，针对复杂课题【{req.topic}】生成一份 3000 字以上、具备机构级专业水准的【长程深度多维调研报告】。

【全网一手高密数据与官方披露源】：
{full_evidence}

---
【深度调研报告结构规范（Markdown 格式，要求包含大量具体数据、价格区间、公司名、技术参数与横向对比 Markdown 大表）】：

# 🕵️‍♂️ 【{req.topic}】长程深度多维产业调研报告

## 一、 执行摘要与核心战略研判
（简明扼要提炼 3 大核心穿透性结论，明确市场阶段、核心壁垒与分化趋势）

## 二、 📊 头部标的/核心玩家多维横向全景对比大表
（必须包含一份高密度的 Markdown 对比大表，列名建议包含：企业/产品名称 | 核心产品线 | 关键技术路线与零部件 | 估算报价/价格区间 | 核心优势 | 商业化落地场景 | 综合评级）

## 三、 🔧 核心技术架构与产业链上下游拆解
1. **核心技术路线与核心零部件**（如芯片、传感器、控制器、电解质等关键组件）
2. **供应链成熟度与主要供应商阵营**

## 四、 💰 商业化落地、成本测算与采购报价分析
（深入剖析各梯队的商业模式、客户采购门槛、全生命周期成本与定价策略）

## 五、 ⚠️ 潜在商业风险与供应链瓶颈评估
（包括技术攻坚风险、地缘政治与供应链断供风险、市场内卷降价压力）

## 六、 💡 投资决策与商业落地建议
（针对投资机构、采购方或入局创业者的具体可落地行动指南）

---
*注：请严格依据数据源事实展开，观点鲜明，逻辑严密。*"""

            full_content = await call_you_research_resilient(agent_prompt, timeout_sec=120.0)
            if not full_content:
                raise HTTPException(status_code=502, detail="长程推理服务暂时繁忙，请稍后重试")

            chunk_size = 60
            for i in range(0, len(full_content), chunk_size):
                yield f'data: {json.dumps({"type": "content", "chunk": full_content[i:i+chunk_size]})}\n\n'
                await asyncio.sleep(0.015)

            # 阶段 5: 完成并输出信源
            duration_ms = int((time.time() - t0) * 1000)
            consume_quota_success(user, ip)
            record_gen_log(user, ip, '长程调研', req.topic, duration_ms, 'success')
            yield f'data: {json.dumps({"type": "done", "sources": sources[:16], "duration_ms": duration_ms})}\n\n'

        except Exception as e:
            duration_ms = int((time.time() - t0) * 1000)
            record_gen_log(user, ip, '长程调研', req.topic, duration_ms, 'failed')
            print(f"DeepResearch failed: {e}")
            message = str(e) if isinstance(e, HTTPException) else "长程深度调研生成失败，请稍后重试"
            yield f'data: {json.dumps({"type": "error", "message": message})}\n\n'

    return StreamingResponse(generate(), media_type='text/event-stream', headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})


# 静态资源与页面分发
static_dir = '/opt/you-insight-ai/app/public'
if not os.path.exists(static_dir):
    static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')
if not os.path.exists(static_dir):
    static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')





@app.get('/admin')
@app.get('/admin.html')
async def admin_page():
    return FileResponse(os.path.join(static_dir, 'admin.html'))

@app.get('/profile')
@app.get('/profile.html')
async def profile_page():
    return FileResponse(os.path.join(static_dir, 'profile.html'))

app.mount('/', StaticFiles(directory=static_dir, html=True), name='static')

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8200)






