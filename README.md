# 道具運搬担当レコード

ボートとエンジンの「保管 / 行き / 帰り」を、日付単位の月カレンダーで管理する日本語対応PWAです。  
スマホ最優先で、部員CSV・ユーザーCSVの取り込み、ログイン、月カレンダー編集、月次集計、CSV出力までを単一VPS + Node.js + SQLite 前提で実装しています。

## 目次

- [1. はじめに](#section-1)
- [1-1 アプリ概要](#section-1-1)

- [2. 準備](#section-2)
- [2-1 Node.jsのインストール](#section-2-1)
- [2-2 環境変数一覧](#section-2-2)
- [2-3 CSVファイルの作成](#section-2-3)

- [3. 最短スタート](#section-3)
- [3-1 最短スタート手順](#section-3-1)
- [3-2 変更反映とやり直し](#section-3-2)

- [4. 本番デプロイ](#section-4)
- [4-1 本番デプロイ手順](#section-4-1)
- [4-2 `boat` ユーザー作成](#section-4-2)
- [4-3 アプリ配置](#section-4-3)
- [4-4 依存関係とビルド](#section-4-4)
- [4-5 初期ユーザーと部員投入](#section-4-5)
- [4-6 単体起動確認](#section-4-6)
- [4-7 本番権限の固定](#section-4-7)
- [4-8 `mw1.sailripper.top` のDNS確認](#section-4-dns)
- [4-9 systemd 設定例](#section-4-8)
- [4-10 更新反映手順](#section-4-9)
- [4-11 nginx リバースプロキシ設定例](#section-4-10)
- [4-12 HTTPS 化手順例](#section-4-11)
- [4-13 SQLite ファイル配置の考え方](#section-sqlite)

- [5. その他](#section-5)
- [5-1 バックアップの考え方](#section-5-1)
- [5-2 セキュリティ上の注意点](#section-5-2)
- [5-3 今後の改善案](#section-5-3)

<a id="section-1"></a>
# 1. はじめに

<a id="section-1-1"></a>
## 1-1 アプリ概要

- 対象物は `ボート` と `エンジン`
- 各日付ごとに `保管 / 行き / 帰り` を設定
- 1日あたり最大6項目を編集可能
- 管理者はユーザーCSV・部員CSVを取込可能
- 一般ユーザーも月カレンダー編集、集計閲覧、CSV出力が可能
- PWAとしてホーム画面追加に対応

<a id="section-2"></a>
# 2. 準備

<a id="section-2-1"></a>
## 2-1 Node.jsのインストール

```
# インストール
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs

# 確認
node -v
npm -v
which node
which npm
```

期待する状態:

- `node -v` が `v22.x.x` 以上
- `which node` が `/usr/bin/node`
- `which npm` が `/usr/bin/npm` または同等の固定パス

<a id="section-2-2"></a>
## 2-2 環境変数一覧

`.env.example` をコピーして `.env` を作成してください。  
`/var/www/boat-engine-scheduler` に clone する前提では、初期値のままで SQLite の保存先が一致します。

| 変数名 | 必須 | 説明 |
| --- | --- | --- |
| `DATABASE_URL` | 必須 | SQLite接続文字列。開発例: `file:./data/app.db`、本番例: `file:/var/www/boat-engine-scheduler/data/app.db` |
| `SESSION_COOKIE_NAME` | 任意 | セッションCookie名。開発では `boat_engine_session` を推奨。本番では `__Host-boat_engine_session` を推奨 |
| `SESSION_SECRET` | 必須 | 長くランダムな文字列 |
| `APP_URL` | 必須 | 公開URL。例: `https://mw1.sailripper.top` |

<a id="section-2-3"></a>
## 2-3 CSVファイルの作成

- `private-imports/users.private.csv`: ログイン用ユーザーCSV
- `private-imports/members.private.csv`: 部員マスタCSV

`public/samples/` 配下のサンプルを参考に作成してください。  
実運用CSVは Git 管理に含めず、`.gitignore` で除外される `private-imports/*.private.csv` として配置してください。


<a id="section-3"></a>
# 3. 最短スタート

<a id="section-3-1"></a>
## 3-1 最短スタート手順

このリポジトリを `/var/www/boat-engine-scheduler` に clone して、そのまま実装や検証を始めたい場合の最短手順です。  
まずは systemd 用の `boat` ユーザーへ切り替えず、普段使っている作業ユーザーで所有して進めるのが安全です。  
本番公開の直前に、後述の手順で `boat` ユーザー運用へ切り替えてください。

```bash
sudo mkdir -p /var/www
sudo chown -R "${USER}:${USER}" /var/www
git clone <repo-url> /var/www/boat-engine-scheduler
cd /var/www/boat-engine-scheduler
mkdir -p private-imports
# 事前に用意した実運用CSVを配置
```

CSV読み込み＋起動
```
npm run setup:dev
npm run import:users -- private-imports/users.private.csv
npm run import:members -- private-imports/members.private.csv
npm run dev -- --hostname 0.0.0.0 --port 3100
```

ブラウザでは `http://<サーバーIP>:3100/login` を開きます。

<a id="section-3-2"></a>
## 3-2 変更反映とやり直し

`private-imports/users.private.csv`,`private-imports/members.private.csv`を編集しただけでは、ログイン情報や部員マスタは変わりません。CSVの変更内容をDBへ反映するには、編集後に必ず再インポートを実行してください。

```bash
npm run import:users -- private-imports/users.private.csv
npm run import:members -- private-imports/members.private.csv
```

これまでのユーザー、部員、担当表、集計元データ、取込履歴をすべて消去して初期状態に戻したい場合は、次を順に実行してください。

```bash
npm run db:reset
npm run db:init
npm run import:users -- private-imports/users.private.csv
npm run import:members -- private-imports/members.private.csv
```

`npm run db:reset` はSQLiteファイル自体を削除するため、既存データは元に戻せません。必要なら先にバックアップを取ってください。

開発サーバーが複数残っているとポートが自動でずれて、ブラウザ側で読み込み中のままに見えることがあります。不要な開発サーバーを止める場合は次を実行してください。

```bash
pkill -f "next-server"
```

<a id="section-4"></a>
# 4. 本番デプロイ

<a id="section-4-1"></a>
## 4-1 本番デプロイ手順
**本番では Git 管理外の実運用CSVを用意してください。**
- 実運用用のCSVは `private-imports/users.private.csv` など Git 管理外の場所へ置いてください
- `.gitignore` では `private-imports/*.private.csv` を除外しています。

以下は `mw1.sailripper.top` で公開する前提の具体例です。  
このサーバーでは他アプリが `3000` を使用している想定で、本アプリは `127.0.0.1:3100` で待ち受け、nginx から `https://mw1.sailripper.top` へ公開する構成にしています。

本番では、実行中にアプリ本体へ書き込めない状態にするのが重要です。  
この README の本番手順では、最終的に次の状態へ寄せます。

- アプリ本体は `root:boat` 管理
- `boat` ユーザーが書き込めるのは `data/` のみ
- systemd は `ProtectSystem=strict` と `ReadWritePaths=/var/www/boat-engine-scheduler/data` を使う
- `.runtime/standalone` 直下に未知の実行ファイルが混ざると起動失敗にする

不審な実行ファイルや user systemd unit を見つけた場合は、権限変更だけで済ませず、まず `.incident-quarantine/` へ隔離して証跡を残してください。

<a id="section-4-2"></a>
## 4-2 `boat` ユーザー作成

本番では、アプリ専用の systemd 実行ユーザーとして `boat` を作成します。  
ログイン用ユーザーではなく、アプリ起動・SQLite書き込み・ビルド実行を担うサービスユーザーです。

- `--system`: 一般ログインユーザーではなくシステムユーザーとして作成
- `--create-home --home-dir /var/www/boat-engine-scheduler`: この運用例ではアプリ配置先をそのままホームディレクトリにする
- `--shell /usr/sbin/nologin`: SSHログインを禁止し、サービス実行専用にする

作成手順:

```bash
sudo mkdir -p /var/www
id -u boat >/dev/null 2>&1 || sudo useradd --system --create-home --home-dir /var/www/boat-engine-scheduler --shell /usr/sbin/nologin boat
sudo mkdir -p /var/www/boat-engine-scheduler
sudo chown -R boat:boat /var/www/boat-engine-scheduler
sudo chmod 755 /var /var/www
sudo chmod 750 /var/www/boat-engine-scheduler
```

作成確認:

```bash
id boat
getent passwd boat
sudo -u boat -H bash -c 'echo "$HOME" && whoami && cd /var/www/boat-engine-scheduler && pwd'
```

期待する状態:

- `boat` ユーザーが存在する
- ホームディレクトリが `/var/www/boat-engine-scheduler`
- 所有者が `boat:boat`
- `sudo -u boat ...` で `/var/www/boat-engine-scheduler` に入れる
- 他のユーザーでは、`/var/www/boat-engine-scheduler`には入れないのが正しい

重要:
`getent passwd boat` の結果でホームディレクトリが誤って `/www/var/boat-engine-scheduler` のようになっていると、権限管理や `sudo -u boat -H ...` 実行時の作業ディレクトリ解決が崩れます。  
その場合は先に次で修正してください。

```bash
sudo usermod -d /var/www/boat-engine-scheduler boat
getent passwd boat
```

<a id="section-4-3"></a>
## 4-3 アプリ配置

すでに `/var/www/boat-engine-scheduler` を作業ユーザー所有で使っている場合は、公開直前に所有者だけを `boat:boat` へ切り替えれば構いません。  
作業ユーザー所有の既存 clone をそのまま本番配置へ切り替える例:

最初から `boat` ユーザーで clone する例:

```bash
sudo rm -rf /var/www/boat-engine-scheduler
sudo -u boat -H git clone <your-repo> /var/www/boat-engine-scheduler
sudo -u boat -H bash -c 'cd /var/www/boat-engine-scheduler && cp .env.example .env'
sudo chown -R boat:boat /var/www/boat-engine-scheduler
sudo chmod 640 /var/www/boat-engine-scheduler/.env
```

`/var/www/` を本番配置先とし、このアプリ本体は `/var/www/boat-engine-scheduler` に置く前提です。  
`boat` は systemd 実行専用ユーザーとして作成し、アプリ更新・DB書き込み・起動をこのユーザー権限で行います。

`.env` は本番用に書き換えてください。SQLite はアプリ更新と分離しやすい場所を推奨します。

例:

```env
DATABASE_URL="file:/var/www/boat-engine-scheduler/data/app.db"
SESSION_COOKIE_NAME="boat_engine_session"
SESSION_SECRET="十分に長いランダム文字列"
APP_URL="https://mw1.sailripper.top"
```

本番へ切り替えるときは、`.env` の `SESSION_COOKIE_NAME` を `__Host-boat_engine_session` に変更してください。  
HTTP の `localhost` 開発では `__Host-` 付きCookieはブラウザに保存されません。

<a id="section-4-4"></a>
## 4-4 依存関係とビルド

すでに実装中に `npm run setup:dev` を実行済みであっても、本番切替時は `boat` ユーザー権限で依存関係とビルド成果物を作り直してください。

```bash
sudo -u boat -H bash -c '
cd /var/www/boat-engine-scheduler &&
npm install
npx prisma generate
mkdir -p /var/www/boat-engine-scheduler/data
npm run db:init
npm run build:prod
'
```

<a id="section-4-5"></a>
## 4-5 初期ユーザーと部員投入

```bash
sudo -u boat -H bash -c '
cd /var/www/boat-engine-scheduler &&
npm run import:users -- private-imports/users.private.csv
npm run import:members -- private-imports/members.private.csv
'
```

<a id="section-4-6"></a>
## 4-6 単体起動確認

```bash
sudo -u boat -H bash -c 'cd /var/www/boat-engine-scheduler && PORT=3100 HOSTNAME=127.0.0.1 /usr/bin/node .runtime/standalone/server.js'
```

ブラウザで `http://127.0.0.1:3100/login` を確認します。  
まだ nginx を通していない段階では、サーバー外部からは見えなくて正常です。

<a id="section-4-7"></a>
## 4-7 本番権限の固定

ビルド、CSV 取込、単体起動確認まで終わったら、本番権限へ固定します。  
この処理でアプリ本体を `root:boat` 管理へ寄せ、`boat` が書き込めるのを `data/` だけに絞ります。

```bash
cd /var/www/boat-engine-scheduler
sudo bash scripts/harden-production.sh /var/www/boat-engine-scheduler boat boat
```

反映後の確認例:

```bash
sudo ls -ld /var/www/boat-engine-scheduler
sudo ls -ld /var/www/boat-engine-scheduler/data
sudo ls -l /var/www/boat-engine-scheduler/.env
```

期待する状態:

- `/var/www/boat-engine-scheduler` は `root:boat`
- `data/` は `boat:boat`
- `.env` は `root:boat` かつ `640`
- アプリ本体のディレクトリは概ね `750`
- アプリ本体の通常ファイルは概ね `640`
- `data/` 配下ディレクトリは `770`
- `data/` 配下ファイルは `660`
- `.incident-quarantine/` を残す場合はディレクトリ `700`、配下ファイル `600`

<a id="section-4-dns"></a>
## 4-8 `mw1.sailripper.top` のDNS確認

`mw1.sailripper.top` がこのVPSのグローバルIPを向いていることを確認してください。

確認例:

```bash
dig +short mw1.sailripper.top
```

返ってきたIPがこのVPSのIPと一致していれば次へ進めます。

<a id="section-4-8"></a>
## 4-9 systemd 設定例

ファイル例: `deploy/boat-engine-scheduler.service`

```ini
[Unit]
Description=Boat Engine Scheduler
After=network.target

[Service]
Type=simple
User=boat
Group=boat
WorkingDirectory=/var/www/boat-engine-scheduler/.runtime/standalone
Environment=NODE_ENV=production
Environment=HOSTNAME=127.0.0.1
Environment=PORT=3100
Environment=HOME=/var/www/boat-engine-scheduler
EnvironmentFile=/var/www/boat-engine-scheduler/.env
ExecStartPre=/usr/bin/test -f /var/www/boat-engine-scheduler/.env
ExecStartPre=/usr/bin/test -f /var/www/boat-engine-scheduler/.runtime/standalone/server.js
ExecStartPre=/usr/bin/node /var/www/boat-engine-scheduler/scripts/verify-runtime.mjs
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
KillSignal=SIGINT
TimeoutStopSec=20
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectSystem=strict
ProtectHome=true
ProtectControlGroups=true
ProtectKernelTunables=true
ProtectKernelModules=true
RestrictSUIDSGID=true
LockPersonality=true
SystemCallArchitectures=native
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
CapabilityBoundingSet=
UMask=0027
ReadWritePaths=/var/www/boat-engine-scheduler/data

[Install]
WantedBy=multi-user.target
```

反映例:

```bash
sudo cp /var/www/boat-engine-scheduler/deploy/boat-engine-scheduler.service /etc/systemd/system/boat-engine-scheduler.service
sudo systemctl daemon-reload
sudo systemctl enable --now boat-engine-scheduler.service
sudo systemctl status boat-engine-scheduler.service
```

まだ `/etc/systemd/system/boat-engine-scheduler.service` を配置していない状態では、`sudo systemctl restart boat-engine-scheduler` は失敗します。  
最初の1回は必ず上の `cp` と `enable --now` を先に実行してください。
また、`/var/www/boat-engine-scheduler` は `boat` 専用権限にしているため、`du` など別ユーザーでは通常 `cd` できません。中を確認したい場合は `sudo -u boat -H bash -c 'cd /var/www/boat-engine-scheduler && ls'` か `sudo ls -la /var/www/boat-engine-scheduler` を使ってください。

<a id="section-4-9"></a>
## 4-10 更新反映手順

以前の `npm run build && sudo systemctl restart ...` は、稼働中の `next start` が参照する `.next` を同じ場所で再ビルドするため、低スペックVPSではCPU負荷や不安定化の原因になりえます。  
このリポジトリでは本番用ビルドを `.runtime/standalone` に分離するように変更したので、以後は以下を使ってください。

```bash
npm run build:prod
sudo systemctl restart boat-engine-scheduler
sudo systemctl status boat-engine-scheduler --no-pager
```

CPUピークをさらに抑えたい場合は、旧プロセスを止めてからビルドしてください。

```bash
sudo systemctl stop boat-engine-scheduler
npm run build:prod
sudo systemctl start boat-engine-scheduler
sudo systemctl status boat-engine-scheduler --no-pager
```

ビルド後に本番権限へ戻すのを忘れないでください。

```bash
sudo bash scripts/harden-production.sh /var/www/boat-engine-scheduler boat boat
sudo systemctl restart boat-engine-scheduler
```

<a id="section-4-10"></a>
## 4-11 nginx リバースプロキシ設定例

初回は証明書がまだ無いので、先に HTTP-only 設定で nginx を通してください。  
ファイル例: `deploy/nginx.http-only.conf.example`

```nginx
server {
  listen 80;
  server_name mw1.sailripper.top;

  client_max_body_size 10m;

  location / {
    proxy_pass http://127.0.0.1:3100;
    proxy_http_version 1.1;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

初回反映例:

```bash
sudo cp deploy/nginx.http-only.conf.example /etc/nginx/sites-available/boat-engine-scheduler
sudo ln -sf /etc/nginx/sites-available/boat-engine-scheduler /etc/nginx/sites-enabled/boat-engine-scheduler
sudo nginx -t
sudo systemctl reload nginx
```

証明書取得後の完成形は次のファイルです。  
ファイル例: `deploy/nginx.conf.example`

```nginx
server {
  listen 80;
  server_name mw1.sailripper.top;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name mw1.sailripper.top;

  ssl_certificate /etc/letsencrypt/live/mw1.sailripper.top/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/mw1.sailripper.top/privkey.pem;

  client_max_body_size 10m;

  location / {
    proxy_pass http://127.0.0.1:3100;
    proxy_http_version 1.1;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

証明書取得後の反映例:

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/boat-engine-scheduler
sudo ln -sf /etc/nginx/sites-available/boat-engine-scheduler /etc/nginx/sites-enabled/boat-engine-scheduler
sudo nginx -t
sudo systemctl reload nginx
```

このREADMEの例をそのまま使うなら、`deploy/nginx.conf.example` の `server_name` は `mw1.sailripper.top`、`proxy_pass` は `127.0.0.1:3100` のままで使えます。

<a id="section-4-11"></a>
## 4-12 HTTPS 化手順例

Let's Encrypt / Certbot の例です。

1. 先に `deploy/nginx.http-only.conf.example` を `/etc/nginx/sites-available/boat-engine-scheduler` へ配置して nginx を reload
2. `mw1.sailripper.top` の DNS がこのVPSを向いていることを確認
3. Certbot で証明書を取得
4. その後で `deploy/nginx.conf.example` に差し替えて nginx を reload

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d mw1.sailripper.top
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/boat-engine-scheduler
sudo nginx -t
sudo systemctl reload nginx
```

更新確認:

```bash
sudo certbot renew --dry-run
```

<a id="section-sqlite"></a>
## 4-13 SQLite ファイル配置の考え方

- 推奨: `/var/www/boat-engine-scheduler/data/app.db`
- アプリ更新ディレクトリと分離するとバックアップとロールバックが楽です
- `boat` など systemd の実行ユーザーに書き込み権限を付与してください

例:

```bash
sudo mkdir -p /var/www/boat-engine-scheduler/data
sudo chown -R boat:boat /var/www/boat-engine-scheduler/data
```
<a id="section-5"></a>
# 5. その他

<a id="section-5-1"></a>
## 5-1 バックアップの考え方

- 最低でも SQLite ファイルを日次バックアップ
- 可能なら `tar` で `.env` と `deploy` 設定も一緒に退避
- アプリ停止中バックアップが最も安全
- 稼働中に取る場合も単一ファイルなので取り回しはしやすいですが、運用では世代管理を推奨します

バックアップ用スクリプト:

```bash
npm run backup:create
```

別ディレクトリにまとめる例:

```bash
npm run backup:create -- /srv/backups/boat-engine-scheduler
```

このスクリプトは、`.env` の `DATABASE_URL` を読んで実際の SQLite ファイルを特定し、以下を `backup-YYYYMMDD-HHMMSS` ディレクトリへまとめてコピーします。

- `.env`
- `.env.example`
- SQLite ファイル
- `deploy/`
- `prisma/`
- `public/samples/`
- `package.json`
- `package-lock.json`
- `README.md`

復元時は、バックアップ先の `app/` 配下を参照すれば必要ファイルをまとめて確認できます。  
整合性を最優先する場合は、次の順で停止中に実行してください。

```bash
sudo systemctl stop boat-engine-scheduler
npm run backup:create -- /srv/backups/boat-engine-scheduler
sudo systemctl start boat-engine-scheduler
```

<a id="section-5-2"></a>
## 5-2 セキュリティ上の注意点

- ログイン認証は DB の `users.passwordHash` のみを使い、平文パスワード設定ファイルは使わない
- セッションは HTTP Only Cookie
- `sameSite=lax` を設定
- 本番既定のCookie名は `__Host-boat_engine_session`
- ログインAPIはIP単位と `login_id` 単位でレート制限する
- 変更系APIは同一オリジン検証を行う
- 保護画面と認証系API、CSV出力APIは `Cache-Control: no-store` を返す
- 管理系APIは管理者のみ許可
- CSVバリデーションで全件検証
- 本番では `SESSION_SECRET` を必ず長いランダム値にする
- 実運用のユーザーCSVは Git 管理しない。`private-imports/` や `*.private.csv` を使う
- nginx 配下で HTTPS を必須にする
- nginx では HSTS、`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy` を付与する
- nginx ではIP単位レート制限を併用する
- `mw1.sailripper.top` のDNSがVPSを向いてから Certbot を実行する
- 本アプリは他サービスと競合しないよう `3100` で待ち受け、nginx で公開する
- 本番の systemd 実行ユーザーは `boat` とし、アプリ本体は `root:boat` 管理、`data/` だけを `boat:boat` の書き込み対象にする
- 本番ではリポジトリ配下を広く writable にしない。アプリ本体は概ねディレクトリ `750`、ファイル `640`、`data/` のみ `770/660` を維持する
- このREADMEの運用例では `boat` ユーザーのホームを `/var/www/boat-engine-scheduler` にしている。`getent passwd boat` の結果が `/www/var/...` など誤ったパスになっていないか確認する
- systemd ではシェル初期化に依存せず、`/usr/bin/node` のような固定パスを使う
- `.runtime/standalone` 直下に想定外の実行ファイルがないことを `npm run runtime:verify` または systemd の `ExecStartPre` で必ず確認する
- 本番サーバーで `curl | bash` を安易に実行しない
- `.config/` にアプリ由来でないバイナリや user systemd unit が混ざっていないか確認し、不審物は `.incident-quarantine/` に隔離して証跡を残す
- VPS侵害が疑われる場合は kill と設定修正だけで済ませず、`cron`、`systemd`、`authorized_keys`、`sudoers` を確認し、必要なら新規VPSへ再構築する

<a id="section-5-3"></a>
## 5-3 今後の改善案

- 部員の表示順を五十音専用ソートへ最適化
- CSV取込結果の詳細エラーレポートを画面上で複数行表示
- 日別編集シートに前後日の移動ボタン追加
- 月カレンダーのPC表示を7列カレンダーへ切替可能にする
- 監査ログを別テーブル化して更新履歴を増やす
