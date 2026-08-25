#!/usr/bin/env python3
"""部署 you-insight-ai：备份服务器现状 -> 上传新文件 -> 重启服务 -> 基础验证"""
import os, sys, time
import paramiko

HOST = os.environ.get('HOST', '115.120.206.64')
USER = os.environ.get('USER', 'root')
PASS = os.environ.get('PASS', '')

LOCAL_DIR = r'C:\Users\Administrator\Desktop\you-insight-ai'
REMOTE_APP = '/opt/you-insight-ai/app'
STAMP = time.strftime('%Y%m%d-%H%M%S')

UPLOADS = [
    (os.path.join(LOCAL_DIR, 'server.py'), f'{REMOTE_APP}/server.py'),
    (os.path.join(LOCAL_DIR, 'public', 'app.js'), f'{REMOTE_APP}/public/app.js'),
    (os.path.join(LOCAL_DIR, 'public', 'index.html'), f'{REMOTE_APP}/public/index.html'),
    (os.path.join(LOCAL_DIR, 'public', 'style.css'), f'{REMOTE_APP}/public/style.css'),
]

def main():
    if not PASS:
        print('Set PASS env var', file=sys.stderr); sys.exit(1)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=20, allow_agent=False, look_for_keys=False)

    def run(cmd):
        _, out, err = client.exec_command(cmd, timeout=120)
        code = out.channel.recv_exit_status()
        o, e = out.read().decode(), err.read().decode()
        return code, o, e

    # 1. 备份
    code, o, e = run(f'cd /opt/you-insight-ai && mkdir -p backups && cp -r app backups/app-{STAMP} && echo BACKUP_OK backups/app-{STAMP}')
    print(o.strip() or e.strip())
    if code != 0:
        print('备份失败，中止'); client.close(); sys.exit(1)

    # 2. 上传
    sftp = client.open_sftp()
    for local, remote in UPLOADS:
        sftp.put(local, remote)
        print(f'UPLOADED {remote}')
    sftp.close()

    # 3. 语法检查后重启
    code, o, e = run(f'{REMOTE_APP}/../venv/bin/python -m py_compile {REMOTE_APP}/server.py && echo PY_OK')
    print(o.strip() or e.strip())
    if code != 0:
        print('服务器端 Python 语法检查失败，回滚')
        run(f'cd /opt/you-insight-ai && rm -rf app && cp -r backups/app-{STAMP} app && systemctl restart you-insight-ai')
        client.close(); sys.exit(1)

    code, o, e = run('systemctl restart you-insight-ai && sleep 3 && systemctl is-active you-insight-ai')
    print('service:', o.strip() or e.strip())

    # 4. 验证
    for path in ['/api/health', '/api/history?limit=5', '/api/history/1', '/']:
        code, o, e = run(f'curl -s -o /dev/null -w "%{{http_code}}" -m 15 http://127.0.0.1:18088{path}')
        print(f'{path} -> {o.strip()}')

    code, o, e = run('curl -s -m 15 http://127.0.0.1:18088/api/health')
    print('health body:', o.strip()[:200])
    client.close()

if __name__ == '__main__':
    main()
