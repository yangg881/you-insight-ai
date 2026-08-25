import os, time, asyncio, json, re, sqlite3, secrets, uuid, hashlib, hmac, base64
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
import urllib.parse
import httpx
from fastapi import FastAPI, HTTPException, Request, Header, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from dotenv import load_dotenv
    load_dotenv('/etc/you-insight-ai/.env')
    load_dotenv('.env')
except Exception:
    pass

# ==================== 核心配置 ====================
API_KEY = os.getenv('YOU_API_KEY', '')

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

PROXY_URL = os.getenv('PROXY_URL', 'http://127.0.0.1:10888')
JWT_SECRET = os.getenv('JWT_SECRET', 'youinsight-super-jwt-secret-key-2026')

# 阿里云短信
ALIYUN_AK_ID = os.getenv('ALIYUN_ACCESS_KEY_ID', '')
ALIYUN_AK_SECRET = os.getenv('ALIYUN_ACCESS_KEY_SECRET', '')
ALIYUN_TEMPLATE = os.getenv('ALIYUN_SMS_TEMPLATE_CODE', 'SMS_336470119')
ALIYUN_SIGN_NAME = os.getenv('ALIYUN_SMS_SIGN_NAME', '阿里云短信测试')

# Resend 邮件
RESEND_API_KEY = os.getenv('RESEND_API_KEY', '')
RESEND_FROM_EMAIL = os.getenv('RESEND_FROM_EMAIL', 'YouInsight AI <onboarding@resend.dev>')

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
        default_admin_pw = os.getenv('ADMIN_DEFAULT_PASSWORD', 'Admin123456@')
        pw_hash = hash_password(default_admin_pw)
        cursor.execute('''
        INSERT INTO users (username, phone, email, password_hash, role, daily_quota)
        VALUES ('admin', '18888888888', 'admin@youinsight.ai', ?, 'super_admin', -1)
        ''', (pw_hash,))

    conn.commit()
    conn.close()

init_db()

# ==================== 短信与邮件发送模块 ====================
def sign_aliyun_pop(params: dict, secret: str) -> str:
    sorted_params = sorted(params.items(), key=lambda x: x[0])
    query_str = urllib.parse.urlencode(sorted_params, quote_via=urllib.parse.quote)
    string_to_sign = "GET&" + urllib.parse.quote("/", safe="") + "&" + urllib.parse.quote(query_str, safe="")
    h = hmac.new((secret + "&").encode("utf-8"), string_to_sign.encode("utf-8"), hashlib.sha1)
    return base64.b64encode(h.digest()).decode("utf-8")

async def send_aliyun_sms(phone: str, code: str) -> Dict[str, Any]:
    params = {
        "AccessKeyId": ALIYUN_AK_ID,
        "Action": "SendSms",
        "Format": "JSON",
        "PhoneNumbers": phone,
        "SignName": ALIYUN_SIGN_NAME,
        "SignatureMethod": "HMAC-SHA1",
        "SignatureNonce": str(uuid.uuid4()),
        "SignatureVersion": "1.0",
        "TemplateCode": ALIYUN_TEMPLATE,
        "TemplateParam": json.dumps({"code": str(code)}),
        "Timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "Version": "2017-05-25"
    }
    signature = sign_aliyun_pop(params, ALIYUN_AK_SECRET)
    params["Signature"] = signature
    url = "https://dysmsapi.aliyuncs.com/?" + urllib.parse.urlencode(params)
    
    async with httpx.AsyncClient(timeout=10.0) as c:
        try:
            resp = await c.get(url)
            data = resp.json()
            if data.get("Code") == "OK":
                return {"success": True, "message": "短信发送成功"}
            else:
                return {"success": False, "message": f"阿里云短信: {data.get('Message', '发送失败')}"}
        except Exception as e:
            return {"success": False, "message": f"短信服务异常: {str(e)}"}

async def send_resend_email(email: str, code: str, action_name: str = "登录/注册") -> Dict[str, Any]:
    url = "https://api.resend.com/emails"
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0b1329; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #38bdf8; margin: 0; font-size: 22px; font-weight: 800;">⚡ YouInsight AI Studio</h2>
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
            © 2026 YouInsight AI · 实时情报 · 深度研报 · 事实溯源
        </div>
    </div>
    """
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "YouInsight-AI/2.1"
    }
    payload = {
        "from": RESEND_FROM_EMAIL,
        "to": [email],
        "subject": f"【YouInsight AI】您的验证码: {code}",
        "html": html_content
    }
    async with httpx.AsyncClient(timeout=10.0) as c:
        try:
            resp = await c.post(url, headers=headers, json=payload)
            if resp.status_code in (200, 201):
                return {"success": True, "message": "邮件发送成功"}
            else:
                return {"success": False, "message": f"Resend 邮件发送失败: {resp.text[:150]}"}
        except Exception as e:
            return {"success": False, "message": f"邮件服务异常: {str(e)}"}

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

CACHE = TTLCache(maxsize=128, ttl=300)
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

app = FastAPI(title='YouInsight AI Studio', version='2.2.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=False, allow_methods=['*'], allow_headers=['*'])

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
    user = conn.execute("SELECT id, username, phone, email, role, daily_quota, is_active FROM users WHERE id = ?", (payload["uid"],)).fetchone()
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

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

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
    """仅在研报/搜索真正成功生成后，才正式核销 1 次额度"""
    today = date.today().isoformat()
    conn = get_db()
    cursor = conn.cursor()
    
    if user:
        uid = user["id"]
        daily_quota = user["daily_quota"]
        if daily_quota == -1:
            conn.close()
            return {"remaining": 9999, "is_guest": False}
        
        cursor.execute("""
        INSERT INTO daily_usage (user_id, usage_date, count) VALUES (?, ?, 1)
        ON CONFLICT(user_id, usage_date) DO UPDATE SET count = count + 1
        """, (uid, today))
        conn.commit()
        row = cursor.execute("SELECT count FROM daily_usage WHERE user_id = ? AND usage_date = ?", (uid, today)).fetchone()
        used = row["count"] if row else 1
        conn.close()
        return {"remaining": max(0, daily_quota - used), "is_guest": False, "used": used}
    else:
        cursor.execute("""
        INSERT INTO guest_usage (ip, usage_date, count) VALUES (?, ?, 1)
        ON CONFLICT(ip, usage_date) DO UPDATE SET count = count + 1
        """, (ip, today))
        conn.commit()
        setting = cursor.execute("SELECT value FROM system_settings WHERE key = 'guest_daily_limit'").fetchone()
        limit = int(setting["value"]) if setting else 2
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
    target: str # 手机号 (11位) 或 邮箱
    code_type: Optional[str] = "login" # register, login, reset

class RegisterReq(BaseModel):
    target: str # 手机号 或 邮箱
    code: str
    password: str
    username: Optional[str] = None

class LoginReq(BaseModel):
    mode: str # 'password' 或 'code'
    account: Optional[str] = None # 用户名 / 手机号 / 邮箱 (密码模式)
    password: Optional[str] = None
    target: Optional[str] = None # 手机号 或 邮箱 (验证码模式)
    code: Optional[str] = None

class ResetPwReq(BaseModel):
    target: str
    code: str
    new_password: str

class BindTargetReq(BaseModel):
    target: str
    code: str

class DeleteAccountReq(BaseModel):
    code: str

class UpdateProfileReq(BaseModel):
    username: Optional[str] = None
    new_password: Optional[str] = None
    old_password: Optional[str] = None

class AdminQuotaReq(BaseModel):
    daily_quota: int # -1 为无限

class AdminRoleReq(BaseModel):
    role: str # 'user', 'admin', 'super_admin'

class AdminSettingReq(BaseModel):
    settings: Dict[str, str]

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
        (target, code, req.code_type, expires_at, ip)
    )
    conn.commit()
    conn.close()
    
    # 下发验证码
    action_map = {"register": "新用户注册", "login": "快捷免密登录", "reset": "重置密码", "bind": "绑定/换绑安全账号", "delete_account": "注销账号"}
    action_text = action_map.get(req.code_type, "验证操作")
    
    if is_phone:
        res = await send_aliyun_sms(target, code)
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
    
    # 核验验证码
    vrow = cursor.execute(
        "SELECT id, code, expires_at, used FROM verification_codes WHERE target = ? ORDER BY id DESC LIMIT 1",
        (target,)
    ).fetchone()
    if not vrow or vrow["used"] == 1 or vrow["code"] != code or datetime.strptime(vrow["expires_at"], "%Y-%m-%d %H:%M:%S") < datetime.now():
        conn.close()
        raise HTTPException(status_code=400, detail="验证码错误或已过期")
    
    # 检查是否已注册
    field = "phone" if is_phone else "email"
    exist = cursor.execute(f"SELECT id FROM users WHERE {field} = ?", (target,)).fetchone()
    if exist:
        conn.close()
        raise HTTPException(status_code=400, detail=f"该{'手机号' if is_phone else '邮箱'}已注册，请直接登录")
    
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
            raise HTTPException(status_code=400, detail="该个性用户名已被占用，请换一个")
            
    # 获取默认注册额度
    default_quota_row = cursor.execute("SELECT value FROM system_settings WHERE key = 'default_user_quota'").fetchone()
    default_quota = int(default_quota_row["value"]) if default_quota_row else 10
    
    pw_hash = hash_password(password)
    cursor.execute(f"""
    INSERT INTO users (username, {field}, password_hash, role, daily_quota, last_login_at)
    VALUES (?, ?, ?, 'user', ?, CURRENT_TIMESTAMP)
    """, (username, target, pw_hash, default_quota))
    
    user_id = cursor.lastrowid
    # 核销验证码
    cursor.execute("UPDATE verification_codes SET used = 1 WHERE id = ?", (vrow["id"],))
    conn.commit()
    
    user = cursor.execute("SELECT id, username, phone, email, role, daily_quota FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    
    token = create_jwt_token({"uid": user["id"], "role": user["role"]})
    return {
        "status": "success",
        "message": "注册成功！已为您自动登录",
        "token": token,
        "user": dict(user)
    }

@app.post('/api/auth/login')
async def api_login(req: LoginReq, request: Request):
    conn = get_db()
    cursor = conn.cursor()
    user = None
    
    if req.mode == 'password':
        account = (req.account or '').strip()
        password = req.password or ''
        if not account or not password:
            conn.close()
            raise HTTPException(status_code=400, detail="请输入账号和密码")
            
        user = cursor.execute(
            "SELECT * FROM users WHERE (username = ? OR phone = ? OR email = ?) LIMIT 1",
            (account, account, account)
        ).fetchone()
        
        if not user or not verify_password(password, user["password_hash"]):
            conn.close()
            raise HTTPException(status_code=400, detail="账号或密码错误")
            
    elif req.mode == 'code':
        target = (req.target or '').strip()
        code = (req.code or '').strip()
        if not target or not code:
            conn.close()
            raise HTTPException(status_code=400, detail="请输入手机号/邮箱及验证码")
            
        vrow = cursor.execute(
            "SELECT id, code, expires_at, used FROM verification_codes WHERE target = ? ORDER BY id DESC LIMIT 1",
            (target,)
        ).fetchone()
        if not vrow or vrow["used"] == 1 or vrow["code"] != code or datetime.strptime(vrow["expires_at"], "%Y-%m-%d %H:%M:%S") < datetime.now():
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
            
        cursor.execute("UPDATE verification_codes SET used = 1 WHERE id = ?", (vrow["id"],))
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
        "username": user["username"],
        "phone": user["phone"],
        "email": user["email"],
        "role": user["role"],
        "daily_quota": user["daily_quota"],
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
    vrow = cursor.execute(
        "SELECT id, code, expires_at, used FROM verification_codes WHERE target = ? ORDER BY id DESC LIMIT 1",
        (target,)
    ).fetchone()
    if not vrow or vrow["used"] == 1 or vrow["code"] != code or datetime.strptime(vrow["expires_at"], "%Y-%m-%d %H:%M:%S") < datetime.now():
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
    cursor.execute("UPDATE verification_codes SET used = 1 WHERE id = ?", (vrow["id"],))
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
            "username": user["username"],
            "phone": user["phone"],
            "email": user["email"],
            "role": user["role"],
            "daily_quota": quota,
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
    vrow = cursor.execute(
        "SELECT id, code, expires_at, used FROM verification_codes WHERE target = ? ORDER BY id DESC LIMIT 1",
        (target,)
    ).fetchone()
    if not vrow or vrow["used"] == 1 or vrow["code"] != code or datetime.strptime(vrow["expires_at"], "%Y-%m-%d %H:%M:%S") < datetime.now():
        conn.close()
        raise HTTPException(status_code=400, detail="验证码错误或已过期")
        
    field = "phone" if is_phone else "email"
    
    # 检查是否已被其他用户绑定
    exist = cursor.execute(f"SELECT id FROM users WHERE {field} = ? AND id != ?", (target, user["id"])).fetchone()
    if exist:
        conn.close()
        raise HTTPException(status_code=400, detail=f"该{'手机号' if is_phone else '邮箱'}已被其他账号绑定，请更换")
        
    cursor.execute(f"UPDATE users SET {field} = ? WHERE id = ?", (target, user["id"]))
    cursor.execute("UPDATE verification_codes SET used = 1 WHERE id = ?", (vrow["id"],))
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
            "SELECT id, code, expires_at, used FROM verification_codes WHERE target = ? ORDER BY id DESC LIMIT 1",
            (target,)
        ).fetchone()
        if vrow and vrow["used"] == 0 and vrow["code"] == code and datetime.strptime(vrow["expires_at"], "%Y-%m-%d %H:%M:%S") >= datetime.now():
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
        if full_user["password_hash"] and not verify_password(req.old_password or '', full_user["password_hash"]):
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
    conn = get_db()
    offset = (page - 1) * page_size
    q_str = f"%{query.strip()}%"
    
    if query:
        total = conn.execute("SELECT COUNT(*) AS c FROM users WHERE username LIKE ? OR phone LIKE ? OR email LIKE ?", (q_str, q_str, q_str)).fetchone()["c"]
        rows = conn.execute("""
        SELECT id, username, phone, email, role, daily_quota, is_active,
               datetime(created_at, 'localtime') AS created_at,
               datetime(last_login_at, 'localtime') AS last_login_at
        FROM users WHERE username LIKE ? OR phone LIKE ? OR email LIKE ?
        ORDER BY id DESC LIMIT ? OFFSET ?
        """, (q_str, q_str, q_str, page_size, offset)).fetchall()
    else:
        total = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
        rows = conn.execute("""
        SELECT id, username, phone, email, role, daily_quota, is_active,
               datetime(created_at, 'localtime') AS created_at,
               datetime(last_login_at, 'localtime') AS last_login_at
        FROM users ORDER BY id DESC LIMIT ? OFFSET ?
        """, (page_size, offset)).fetchall()
        
    conn.close()
    return {"status": "success", "total": total, "page": page, "page_size": page_size, "users": [dict(r) for r in rows]}

@app.post('/api/admin/users/{uid}/quota')
async def admin_set_quota(uid: int, req: AdminQuotaReq, admin: Dict[str, Any] = Depends(require_admin)):
    conn = get_db()
    conn.execute("UPDATE users SET daily_quota = ? WHERE id = ?", (req.daily_quota, uid))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"用户 #{uid} 每日额度已修改为: {'无限' if req.daily_quota == -1 else req.daily_quota}"}

@app.post('/api/admin/users/{uid}/role')
async def admin_set_role(uid: int, req: AdminRoleReq, admin: Dict[str, Any] = Depends(require_admin)):
    if req.role not in ('user', 'admin', 'super_admin'):
        raise HTTPException(status_code=400, detail="非法角色")
    conn = get_db()
    conn.execute("UPDATE users SET role = ? WHERE id = ?", (req.role, uid))
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
    return {"status": "success", "message": f"用户 #{uid} 已{'封禁' if new_status == 0 else '解封'}"}

@app.get('/api/admin/logs')
async def admin_get_logs(page: int = 1, page_size: int = 30, admin: Dict[str, Any] = Depends(require_admin)):
    conn = get_db()
    offset = (page - 1) * page_size
    total = conn.execute("SELECT COUNT(*) AS c FROM generation_logs").fetchone()["c"]
    rows = conn.execute("""
    SELECT id, user_id, username, ip, type, title, duration_ms, status,
           datetime(created_at, 'localtime') AS created_at
    FROM generation_logs ORDER BY id DESC LIMIT ? OFFSET ?
    """, (page_size, offset)).fetchall()
    conn.close()
    return {"status": "success", "total": total, "logs": [dict(r) for r in rows]}

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

# ==================== 业务研报与检索端点 ====================

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
async def health(user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    db_ok = True
    try:
        conn = get_db(); conn.execute('SELECT 1'); conn.close()
    except Exception:
        db_ok = False
    return {
        'status': 'ok',
        'version': '2.2.0',
        'proxy': bool(PROXY_URL),
        'db': db_ok,
        'user': {"username": user["username"], "role": user["role"]} if user else None
    }

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
        return {'status': 'success', 'data': hit, 'cached': True, 'quota': quota_res}
    
    async with client() as c:
        params = {'query': req.query, 'count': req.count}
        if req.freshness: params['freshness'] = req.freshness
        resp = await c.get('https://api.you.com/v1/search', params=params, headers={'X-API-Key': get_current_you_api_key()})
        if resp.status_code != 200:
            record_gen_log(user, ip, '实时搜索', req.query, int((time.time() - t0)*1000), 'failed')
            raise HTTPException(status_code=resp.status_code, detail=f'Search API Error: {resp.text[:200]}')
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
        return {'status': 'success', 'data': hit, 'cached': True, 'quota': quota_res}
    
    async with client() as c:
        resp = await c.get('https://api.you.com/v1/search', params={'query': req.query, 'count': req.count}, headers={'X-API-Key': get_current_you_api_key()})
        if resp.status_code != 200:
            record_gen_log(user, ip, '新闻流', req.query, int((time.time() - t0)*1000), 'failed')
            raise HTTPException(status_code=resp.status_code, detail=f'News API Error: {resp.text[:200]}')
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
        yield f'data: {json.dumps({"type": "start", "stage": "检索中", "quota": quota_res})}\n\n'
        await asyncio.sleep(0.3)
        yield f'data: {json.dumps({"type": "stage", "stage": "多源交叉分析与推理中"})}\n\n'
        try:
            async with client(timeout=180.0) as c:
                payload = {'input': req.input, 'chat_history': req.chat_history or []}
                resp = await c.post('https://api.you.com/v1/research', json=payload, headers={'X-API-Key': get_current_you_api_key()})
                if resp.status_code != 200:
                    raise RuntimeError(f'上游研报服务返回 {resp.status_code}: {resp.text[:150]}')
                data = resp.json()
                content = data.get('output', {}).get('content', '')
                sources = data.get('output', {}).get('sources', [])
                
                chunk_size = 50
                for i in range(0, len(content), chunk_size):
                    yield f'data: {json.dumps({"type": "content", "chunk": content[i:i+chunk_size]})}\n\n'
                    await asyncio.sleep(0.02)
                yield f'data: {json.dumps({"type": "done", "sources": sources, "full_content": content})}\n\n'
                record_gen_log(user, ip, '深度研报', req.input, int((time.time() - t0)*1000), 'success')
        except Exception as e:
            record_gen_log(user, ip, '深度研报', req.input, int((time.time() - t0)*1000), 'failed')
            yield f'data: {json.dumps({"type": "error", "message": str(e)})}\n\n'
            
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
            search_task = c.get('https://api.you.com/v1/search', params={'query': f'{req.topic} 最新 进展 动态', 'count': 6}, headers={'X-API-Key': get_current_you_api_key()})
            news_task = c.get('https://api.you.com/v1/search', params={'query': req.topic, 'count': 5}, headers={'X-API-Key': get_current_you_api_key()})
            prompt = f'请针对主题【{req.topic}】生成一份结构化行业早报与情报综合分析。包含：1. 今日核心要点 2. 详细动态与深度解读 3. 发展趋势与商业洞察。必须保持事实准确与客观。'
            research_task = c.post('https://api.you.com/v1/research', json={'input': prompt}, headers={'X-API-Key': get_current_you_api_key()})
            
            search_res, news_res, research_res = await asyncio.gather(search_task, news_task, research_task, return_exceptions=True)
            search_data = search_res.json() if not isinstance(search_res, Exception) and search_res.status_code == 200 else {}
            news_data = news_res.json() if not isinstance(news_res, Exception) and news_res.status_code == 200 else {}
            res_data = research_res.json() if not isinstance(research_res, Exception) and research_res.status_code == 200 else {}
            
            duration = int((time.time() - t0) * 1000)
            record_gen_log(user, ip, '行业早报', req.topic, duration, 'success')
            return {'status': 'success', 'topic': req.topic, 'brief_report': res_data, 'search_results': search_data, 'news_results': news_data, 'quota': quota_res}
        except Exception as e:
            record_gen_log(user, ip, '行业早报', req.topic, int((time.time() - t0)*1000), 'failed')
            raise HTTPException(status_code=500, detail=str(e))

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
            record_gen_log(user, ip, '企业财报', req.input, int((time.time() - t0)*1000), 'failed')
            raise HTTPException(status_code=resp.status_code, detail=f'Finance API Error: {resp.text[:200]}')
        record_gen_log(user, ip, '企业财报', req.input, int((time.time() - t0)*1000), 'success')
        return {'status': 'success', 'data': resp.json(), 'quota': quota_res}

@app.post('/api/contents')
async def api_contents(req: ContentsRequest, request: Request, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    ip = get_client_ip(request)
    quota_res = check_quota_available(user, ip)
    if not quota_res["allowed"]:
        raise HTTPException(status_code=403, detail="体验额度已用完，请登录后继续！" if quota_res["is_guest"] else "今日额度已达上限")

    t0 = time.time()
    async with client() as c:
        resp = await c.post('https://api.you.com/v1/contents', json={'urls': req.urls}, headers={'X-API-Key': get_current_you_api_key()})
        if resp.status_code != 200:
            record_gen_log(user, ip, '正文提取', ','.join(req.urls[:2]), int((time.time() - t0)*1000), 'failed')
            raise HTTPException(status_code=resp.status_code, detail=f'Contents API Error: {resp.text[:200]}')
        record_gen_log(user, ip, '正文提取', ','.join(req.urls[:2]), int((time.time() - t0)*1000), 'success')
        return {'status': 'success', 'data': resp.json(), 'quota': quota_res}

# ==================== 历史记录 (用户隔离) ====================

@app.get('/api/history')
async def get_history(limit: int = 50, offset: int = 0, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
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
async def get_history_detail(hid: int, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    uid = user["id"] if user else 0
    conn = get_db()
    row = conn.execute(
        'SELECT id, type, title, content, sources, '
        'datetime(created_at, \'localtime\') AS created_at '
        'FROM history WHERE id = ? AND (user_id = ? OR user_id = 0)', (hid, uid)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail='记录不存在')
    return {'status': 'success', 'data': dict(row)}

@app.post('/api/history')
async def save_history(req: HistorySave, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
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
async def delete_history(hid: int, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
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
