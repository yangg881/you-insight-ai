#!/usr/bin/env python3
"""仅上传前端修复（StaticFiles 实时读盘，无需重启服务）"""
import os, sys
import paramiko

HOST = os.environ.get('HOST', '115.120.206.64')
USER = os.environ.get('USER', 'root')
PASS = os.environ.get('PASS', '')

LOCAL_DIR = r'C:\Users\Administrator\Desktop\you-insight-ai'
REMOTE_APP = '/opt/you-insight-ai/app'

UPLOADS = [
    (os.path.join(LOCAL_DIR, 'public', 'app.js'), f'{REMOTE_APP}/public/app.js'),
    (os.path.join(LOCAL_DIR, 'public', 'index.html'), f'{REMOTE_APP}/public/index.html'),
    (os.path.join(LOCAL_DIR, 'public', 'app.js'), f'{REMOTE_APP}/static/app.js'),
    (os.path.join(LOCAL_DIR, 'public', 'index.html'), f'{REMOTE_APP}/static/index.html'),
]

def main():
    if not PASS:
        print('Set PASS env var', file=sys.stderr); sys.exit(1)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=20, allow_agent=False, look_for_keys=False)
    sftp = client.open_sftp()
    for local, remote in UPLOADS:
        sftp.put(local, remote)
        print(f'UPLOADED {remote}')
    sftp.close()

    # 校验服务器拿到的新内容
    _, out, _ = client.exec_command("grep -c 'retries = 1' /opt/you-insight-ai/app/public/app.js && grep -c 'app.js?v=2.1.1' /opt/you-insight-ai/app/public/index.html && systemctl is-active you-insight-ai", timeout=15)
    print('VERIFICATION:', out.read().decode().strip())
    client.close()

if __name__ == '__main__':
    main()