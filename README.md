# 道具運搬担当レコード

ボートとエンジンの「保管 / 行き / 帰り」を、日付単位の月カレンダーで管理する日本語対応PWAです。  
スマホ最優先で、部員CSV・ユーザーCSVの取り込み、ログイン、月カレンダー編集、月次集計、CSV出力までを単一VPS + Node.js + SQLite 前提で実装しています。

## 目次

- [アプリ概要](#アプリ概要)
- [初回セットアップの読み順](#初回セットアップの読み順)
- [最短スタート](#最短スタート)
- [ユースケース](#ユースケース)
- [採用技術一覧](#採用技術一覧)
- [技術選定理由](#技術選定理由)
- [ディレクトリ構成](#ディレクトリ構成)
- [画面一覧](#画面一覧)
- [機能一覧](#機能一覧)
- [DB設計概要](#db設計概要)
- [API設計](#api設計)
- [主要画面設計](#主要画面設計)
- [必要な Node.js バージョン](#必要な-nodejs-バージョン)
- [環境変数一覧](#環境変数一覧)
- [ローカル開発手順](#ローカル開発手順)
- [サンプルCSVの説明](#サンプルcsvの説明)
- [CSVバリデーション](#csvバリデーション)
- [月担当表CSV出力仕様](#月担当表csv出力仕様)
- [担当回数集計CSV出力仕様](#担当回数集計csv出力仕様)
- [支払額集計仕様](#支払額集計仕様)
- [CSV出力画面](#csv出力画面)
- [本番デプロイ手順](#本番デプロイ手順)
- [systemd 設定例](#systemd-設定例)
- [更新反映手順](#更新反映手順)
- [nginx リバースプロキシ設定例](#nginx-リバースプロキシ設定例)
- [HTTPS 化手順例](#https-化手順例)
- [SQLite ファイル配置の考え方](#sqlite-ファイル配置の考え方)
- [バックアップの考え方](#バックアップの考え方)
- [セキュリティ上の注意点](#セキュリティ上の注意点)
- [既知の制約](#既知の制約)
- [テスト](#テスト)
- [今後の改善案](#今後の改善案)

## アプリ概要

- 対象物は `ボート` と `エンジン`
- 各日付ごとに `保管 / 行き / 帰り` を設定
- 1日あたり最大6項目を編集可能
- 管理者はユーザーCSV・部員CSVを取込可能
- 一般ユーザーも月カレンダー編集、集計閲覧、CSV出力が可能
- PWAとしてホーム画面追加に対応

## 初回セットアップの読み順

初めて動かす場合は、次の順で読むと実際の作業順と一致します。

1. `必要な Node.js バージョン`
2. `環境変数一覧`
3. `ローカル開発手順`
4. `サンプルCSVの説明`
5. 必要なら `ローカル開発手順` の `6. 変更反映とやり直し`
6. 本番公開時だけ `本番デプロイ手順`

## 最短スタート

このリポジトリを `/var/www/boat-engine-scheduler` に clone して、そのまま実装や検証を始めたい場合の最短手順です。  
まずは systemd 用の `boat` ユーザーへ切り替えず、普段使っている作業ユーザーで所有して進めるのが安全です。  
本番公開の直前に、後述の手順で `boat` ユーザー運用へ切り替えてください。

```bash
sudo mkdir -p /var/www
sudo chown -R "${USER}:${USER}" /var/www
git clone <repo-url> /var/www/boat-engine-scheduler
cd /var/www/boat-engine-scheduler
npm run setup:dev
npm run import:users -- public/samples/users.sample.csv
npm run import:members -- public/samples/members.sample.csv
npm run dev -- --hostname 0.0.0.0 --port 3100
```

ブラウザでは `http://<サーバーIP>:3100/login` を開きます。  
サンプルユーザーで試す場合は `login_id=admin`、`password=ChangeMe123!` です。

このあと詳しく確認したい場合は、`必要な Node.js バージョン` → `環境変数一覧` → `ローカル開発手順` の順に読み進めてください。

## ユースケース

- 管理者が初回セットアップでユーザーCSVを投入する
- 管理者が部員CSVを投入して担当候補マスタを更新する
- ユーザーが `login_id + password` でログインする
- 当月カレンダーを開き、`ボート / エンジン` を切り替えながら日付をタップして担当者を即時保存で更新する
- 月次の担当回数と料金集計を確認し、担当表CSVと集計CSVを出力する

## 採用技術一覧

- フレームワーク: Next.js 15 / React 19 / App Router
- 言語: TypeScript
- DBアクセス: Prisma Client
- DB: SQLite
- 本番実行: Next.js standalone 出力 + systemd
- 認証: 独自セッション認証（HTTP Only Cookie）
- バリデーション: Zod
- CSV処理: csv-parse
- 日付処理: date-fns
- テスト: Vitest
- PWA: `manifest.webmanifest` + `service worker` + installable icon routes

## 技術選定理由

- Next.js App Router: UIとAPIを同一アプリで保守でき、VPSへの直接配置も簡単です。
- standalone 出力: 稼働中プロセスが参照する実行物を `.runtime/standalone` に分離でき、`npm run build:prod` を繰り返しても本番プロセスとビルド成果物が競合しにくいです。さらに、起動前に runtime 直下の混入ファイルを検査し、想定外の実行ファイルがあれば起動失敗にしています。
- SQLite: 単一VPS・単一ファイル運用に向いており、バックアップもしやすいです。
- Prisma Client: 型安全なDBアクセスで、保守時の破壊を減らせます。
- 独自セッション認証: 外部認証基盤なしで完結し、`login_id + password` 要件に素直です。
- Zod: CSV取込や保存APIの日本語バリデーションを揃えやすいです。
- 手書きPWA構成: オフライン編集不要なので、過剰な複雑化を避けて installability を満たしています。

## ディレクトリ構成

```text
.
├── app
│   ├── (auth)/login
│   ├── (protected)/calendar
│   ├── (protected)/reports
│   ├── (protected)/exports
│   └── api
├── components
├── deploy
│   ├── boat-engine-scheduler.service
│   └── nginx.conf.example
├── data
│   └── app.db
├── lib
├── prisma
│   ├── migrations/0001_init/migration.sql
│   └── schema.prisma
├── public
│   ├── samples
│   └── sw.js
├── scripts
├── tests
└── README.md
```

## 画面一覧

- `/login`: ログイン画面
- `/calendar`: 当月カレンダー、日別編集シート
- `/reports`: 月次集計画面
- `/exports`: 月担当表CSV / 担当回数集計CSV / 支払額集計CSV 出力画面

## 機能一覧

- ログイン / ログアウト
- セッション維持
- 権限別アクセス制御
- ユーザーCSV取込（CLI）
- 部員CSV取込（CLI）
- 月カレンダー表示
- 日別担当の即時保存
- 月次集計表示
- 支払額集計表示
- 月担当表CSV出力
- 担当回数集計CSV出力
- 支払額集計CSV出力
- PWA manifest / service worker / icon 提供

## DB設計概要

### `users`

- `loginId`: ログインID。一意
- `passwordHash`: bcryptハッシュ
- `displayName`: 画面表示名
- `role`: `ADMIN` / `GENERAL`

### `members`

- `name`: 部員名。一意
- `isActive`: 現在の候補表示対象かどうか

### `schedule_days`

- `targetDate`: 対象日。一意
- `year`, `month`: 月検索用
- `lastUpdatedAt`, `lastUpdatedByUserId`: 日単位の最終更新追跡

### `assignments`

- `scheduleDayId`
- `itemType`: `BOAT` / `ENGINE`
- `roleType`: `STORAGE` / `GO` / `RETURN`
- `memberId`: 未選択時は行を削除して表現
- `updatedByUserId`, `updatedAt`
- 一意制約: `(scheduleDayId, itemType, roleType)`

### `import_histories`

- `importType`: `USERS` / `MEMBERS`
- `fileName`
- `rowCount`
- `success`
- `errorSummary`
- `executedByUserId`
- `executedAt`

## API設計

- `POST /api/auth/login`
  - `loginId`, `password` で認証
- `POST /api/auth/logout`
  - セッション削除
- `GET /api/me`
  - ログイン中ユーザー情報
- `GET /api/schedule/month?year=YYYY&month=M`
  - 月カレンダー表示用データ
- `GET /api/schedule/day?date=YYYY-MM-DD`
  - 日別詳細取得
- `POST /api/schedule/day`
  - 日別の単一役割を即時保存
- `GET /api/reports/month?year=YYYY&month=M`
  - 月次集計取得
- `GET /api/exports/schedule?year=YYYY&month=M`
  - 月担当表CSV出力
- `GET /api/exports/report?year=YYYY&month=M`
  - 月集計CSV出力

## 主要画面設計

### 月カレンダー

- `ボート / エンジン` の切替式です
- ボート表示時は `RGB(245, 241, 89)` ベースの黄色系、エンジン表示時は灰色系に切り替わります
- 各日セルに `入力済み / 未入力` を表示します
- 一部入力の日は件数表示を出さず、入力済みの担当者名だけを表示します
- 各日セルには、選択中の対象物だけの `保管 / 行き / 帰り` を表示します
- 未入力枠では `未選択` を表示せず、日単位の `未入力` のみ表示します
- 土曜・日曜・日本の祝日のパネルは薄い赤色背景で表示します
- タップで下部シートを開き、その場で編集できます
- 画面上部には `琉球大学医学部ボードセイリング部` と `ボート用具運搬担当表` を表示します

### 日別入力シート

- カレンダーで現在選択している対象物だけを表示します
- `保管 / 行き / 帰り` の3プルダウンを表示します
- `未選択` を明示
- 選択変更で即時保存
- 保存成功 / 失敗を色分け表示
- `保管` に入力があると `行き / 帰り` は入力不可になります
- `行き` または `帰り` に入力があると `保管` は入力不可になります
- いずれも `未選択` に戻すと再度入力可能になります

### 月次集計

- 1部員 = 1行
- 総担当回数の降順、同数時は氏名昇順
- 回数集計は `ボート保管回数 / ボート行き回数 / ボート帰り回数 / エンジン保管回数 / エンジン行き回数 / エンジン帰り回数`
- 支払額集計は上記回数に単価を掛けた別表を表示
- スマホでは横スクロール可能なテーブル

## 必要な Node.js バージョン

- 必須: Node.js 22 以上
- 推奨: Node.js 24 LTS
- `package.json` の `engines.node` も `>=22.0.0` です
- Node.js 18 は 2025-03-27 に EOL のため、本番利用は避けてください

## 環境変数一覧

`.env.example` をコピーして `.env` を作成してください。  
`/var/www/boat-engine-scheduler` に clone する前提では、初期値のままで SQLite の保存先が一致します。

| 変数名 | 必須 | 説明 |
| --- | --- | --- |
| `DATABASE_URL` | 必須 | SQLite接続文字列。開発例: `file:./data/app.db`、本番例: `file:/var/www/boat-engine-scheduler/data/app.db` |
| `SESSION_COOKIE_NAME` | 必須 | セッションCookie名 |
| `SESSION_SECRET` | 必須 | 長くランダムな文字列 |
| `APP_URL` | 必須 | 公開URL。例: `https://mw1.sailripper.top` |

## ローカル開発手順

### 1. clone

```bash
sudo mkdir -p /var/www
sudo chown -R "${USER}:${USER}" /var/www
git clone <repo-url> /var/www/boat-engine-scheduler
cd /var/www/boat-engine-scheduler
```

`/var/www/boat-engine-scheduler` 前提であれば、`.env.example` の SQLite パスをそのまま使えます。

### 2. 初回セットアップ

```bash
npm run setup:dev
```

このスクリプトは次をまとめて実行します。

- `.env` が無ければ `.env.example` から作成
- `npm install`
- `npx prisma generate`
- SQLite 用ディレクトリ作成
- DB未作成時のみ `npm run db:init`

`npm run db:init` は `prisma/migrations/0001_init/migration.sql` を読み込み、必要テーブルを作成します。

### 3. ユーザーCSVを投入

初回セットアップでは、まずユーザーCSVを投入します。

```bash
npm run import:users -- public/samples/users.sample.csv
```

サンプルでは以下でログインできます。

- `login_id`: `admin`
- `password`: `ChangeMe123!`

ログイン画面で入力するのは `display_name` ではなく `login_id` です。たとえば `admin,ryudaiwind,管理者ユーザー,管理者` という行を取り込んだ場合、ログイン時の入力は `login_id=admin`、`password=ryudaiwind` です。

### 4. 部員CSVを投入

```bash
npm run import:members -- public/samples/members.sample.csv
```

運用開始後も、CSV更新は CLI から再インポートして反映します。

### 5. 開発サーバーを起動

```bash
npm run dev -- --hostname 0.0.0.0 --port 3100
```

他のアプリが `3000` を使っている場合は、別ポートで起動してください。上記コマンドなら `http://localhost:3100/login` または `http://<サーバーIP>:3100/login` を開きます。

ログインページでは以下の表示にしています。

- 上部見出し: `琉球大学医学部ボードセイリング部`
- アプリ名: `ボート用具運搬`
- 2行目: `担当者登録アプリ`

### 6. 変更反映とやり直し

`public/samples/users.sample.csv` や `public/samples/members.sample.csv` を編集しただけでは、ログイン情報や部員マスタは変わりません。CSVの変更内容をDBへ反映するには、編集後に必ず再インポートを実行してください。

```bash
npm run import:users -- public/samples/users.sample.csv
npm run import:members -- public/samples/members.sample.csv
```

これまでのユーザー、部員、担当表、集計元データ、取込履歴をすべて消去して初期状態に戻したい場合は、次を順に実行してください。

```bash
npm run db:reset
npm run db:init
npm run import:users -- public/samples/users.sample.csv
npm run import:members -- public/samples/members.sample.csv
```

`npm run db:reset` はSQLiteファイル自体を削除するため、既存データは元に戻せません。必要なら先にバックアップを取ってください。

開発サーバーが複数残っているとポートが自動でずれて、ブラウザ側で読み込み中のままに見えることがあります。不要な開発サーバーを止める場合は次を実行してください。

```bash
pkill -f "next-server"
```

本番では必ずサンプルCSVの初期パスワードを変更してください。

## サンプルCSVの説明

### `public/samples/users.sample.csv`

- 固定列: `login_id,password,display_name,role`
- `role` は `管理者` または `一般`
- 既存 `login_id` は更新、未登録は追加
- CSVに存在しない既存ユーザーは削除されません
- ログイン時に使うのは `display_name` ではなく `login_id`
- CSVを編集しただけではDBは更新されないため、編集後は `npm run import:users -- public/samples/users.sample.csv` の再実行が必要

### `public/samples/members.sample.csv`

- 固定列: `name`
- `氏名` 列でも読み込み可能
- 重複氏名や空欄が1件でもあると全体中止
- 取込は全件入替方式
- CSVに存在しない既存部員は `isActive = false`
- `public/samples/members.sample.csv` を編集したあとは `npm run import:members -- public/samples/members.sample.csv` を再実行して反映
- 担当表や取込履歴も含めて完全にやり直したい場合は、先に `npm run db:reset` と `npm run db:init` を実行

## CSVバリデーション

- 必須列欠落
- 空欄
- `login_id` 重複
- `member name` 重複
- `role` 不正値
- 1件でも不備があれば全件取り込み中止
- エラーは日本語メッセージで表示

## 月担当表CSV出力仕様

1行 = 1日 × 1対象物 × 1役割

| 列名 | 説明 |
| --- | --- |
| `year` | 年 |
| `month` | 月 |
| `target_date` | 対象日 |
| `item_type` | `boat` / `engine` |
| `role_type` | `storage` / `go` / `return` |
| `member_name` | 担当者名。未選択時は空欄 |
| `updated_by` | 最終更新者 |
| `updated_at` | 最終更新日時 |

## 担当回数集計CSV出力仕様

1行 = 1部員

| 列名 | 説明 |
| --- | --- |
| `member_name` | 部員名 |
| `boat_storage_count` | ボート保管回数 |
| `boat_go_count` | ボート行き回数 |
| `boat_return_count` | ボート帰り回数 |
| `engine_storage_count` | エンジン保管回数 |
| `engine_go_count` | エンジン行き回数 |
| `engine_return_count` | エンジン帰り回数 |

## 支払額集計仕様

月次集計画面には、回数集計とは別に支払額集計表を表示します。

| 項目 | 単価 |
| --- | --- |
| ボート保管 | 50円/回 |
| ボート行き | 300円/回 |
| ボート帰り | 300円/回 |
| エンジン保管 | 50円/回 |
| エンジン行き | 200円/回 |
| エンジン帰り | 200円/回 |

支払額集計表では各項目の金額と合計金額を表示します。

## CSV出力画面

`/exports` では以下の3種類を明示的なダウンロードボタンで出力できます。

- 月担当表CSV
- 担当回数集計CSV
- 支払額集計CSV

## 本番デプロイ手順

以下は `mw1.sailripper.top` で公開する前提の具体例です。  
このサーバーでは他アプリが `3000` を使用している想定で、本アプリは `127.0.0.1:3100` で待ち受け、nginx から `https://mw1.sailripper.top` へ公開する構成にしています。

実装中は `/var/www/boat-engine-scheduler` を作業ユーザー所有で使い、公開直前に `boat:boat` 所有へ切り替える流れを推奨します。  
いきなり `boat` 所有にすると、日常の編集・git 操作・Node.js 更新が少しやりにくくなるためです。

本番では、実行中にアプリ本体へ書き込めない状態にするのが重要です。  
この README の本番手順では、最終的に次の状態へ寄せます。

- アプリ本体は `root:boat` 管理
- `boat` ユーザーが書き込めるのは `data/` のみ
- systemd は `ProtectSystem=strict` と `ReadWritePaths=/var/www/boat-engine-scheduler/data` を使う
- `.runtime/standalone` 直下に未知の実行ファイルが混ざると起動失敗にする

### 1. `boat` ユーザー作成

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

重要:
`getent passwd boat` の結果でホームディレクトリが誤って `/www/var/boat-engine-scheduler` のようになっていると、権限管理や `sudo -u boat -H ...` 実行時の作業ディレクトリ解決が崩れます。  
その場合は先に次で修正してください。

```bash
sudo usermod -d /var/www/boat-engine-scheduler boat
getent passwd boat
```

### 2. アプリ配置

すでに `/var/www/boat-engine-scheduler` を作業ユーザー所有で使っている場合は、公開直前に所有者だけを `boat:boat` へ切り替えれば構いません。  
このリポジトリが `/home/du/boat-engine-scheduler` など別の場所にある場合は、`git clone` の代わりに `rsync` で本番ディレクトリへコピーしても問題ありません。

作業ユーザー所有の既存 clone をそのまま本番配置へ切り替える例:

```bash
sudo chown -R boat:boat /var/www/boat-engine-scheduler
sudo -u boat -H bash -c 'test -f /var/www/boat-engine-scheduler/.env || cp /var/www/boat-engine-scheduler/.env.example /var/www/boat-engine-scheduler/.env'
sudo chmod 640 /var/www/boat-engine-scheduler/.env
```

`rsync` を使う例:

```bash
sudo rsync -a --delete /home/du/boat-engine-scheduler/ /var/www/boat-engine-scheduler/
sudo chown -R boat:boat /var/www/boat-engine-scheduler
sudo test -f /var/www/boat-engine-scheduler/.env || sudo -u boat -H bash -c 'cp /var/www/boat-engine-scheduler/.env.example /var/www/boat-engine-scheduler/.env'
sudo chmod 640 /var/www/boat-engine-scheduler/.env
```

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

### 3. 実行物混入チェック

本番では `.runtime/standalone` 直下に想定外のファイルが混ざっていないことを起動前に検査します。  
手動確認したい場合は次を実行してください。

```bash
cd /var/www/boat-engine-scheduler
npm run runtime:verify
```

期待する結果:

- `runtime verification passed` が表示される
- `.runtime/standalone/.rtx` など想定外の実行ファイルがあれば失敗する

### 4. Node.js の確認

この README では、Node.js は NodeSource などで OS に直接インストール済みである前提です。  
systemd からも `/usr/bin/node` を直接使います。

確認:

```bash
node -v
npm -v
which node
which npm
```

期待する状態:

- `node -v` が `v22.x.x` 以上
- `which node` が `/usr/bin/node`
- `which npm` が `/usr/bin/npm` または同等の固定パス

### 5. 依存関係とビルド

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

### 6. 初期ユーザーと部員投入

```bash
sudo -u boat -H bash -c '
cd /var/www/boat-engine-scheduler &&
npm run import:users -- public/samples/users.sample.csv
npm run import:members -- public/samples/members.sample.csv
'
```

### 7. 単体起動確認

```bash
sudo -u boat -H bash -c 'cd /var/www/boat-engine-scheduler && PORT=3100 HOSTNAME=127.0.0.1 /usr/bin/node .runtime/standalone/server.js'
```

ブラウザで `http://127.0.0.1:3100/login` を確認します。  
まだ nginx を通していない段階では、サーバー外部からは見えなくて正常です。

### 8. 本番権限の固定

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

### 9. `mw1.sailripper.top` のDNS確認

`mw1.sailripper.top` がこのVPSのグローバルIPを向いていることを確認してください。

確認例:

```bash
dig +short mw1.sailripper.top
```

返ってきたIPがこのVPSのIPと一致していれば次へ進めます。

## systemd 設定例

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

## 更新反映手順

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

## nginx リバースプロキシ設定例

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

## HTTPS 化手順例

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

## SQLite ファイル配置の考え方

- 推奨: `/var/www/boat-engine-scheduler/data/app.db`
- アプリ更新ディレクトリと分離するとバックアップとロールバックが楽です
- `boat` など systemd の実行ユーザーに書き込み権限を付与してください

例:

```bash
sudo mkdir -p /var/www/boat-engine-scheduler/data
sudo chown -R boat:boat /var/www/boat-engine-scheduler/data
```

## バックアップの考え方

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
- `config/`
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

## セキュリティ上の注意点

- パスワードは bcrypt でハッシュ保存
- セッションは HTTP Only Cookie
- `sameSite=lax` を設定
- 管理系APIは管理者のみ許可
- CSVバリデーションで全件検証
- 本番では `SESSION_SECRET` を必ず長いランダム値にする
- サンプルCSVの初期パスワードは必ず変更する
- nginx 配下で HTTPS を必須にする
- `mw1.sailripper.top` のDNSがVPSを向いてから Certbot を実行する
- 本アプリは他サービスと競合しないよう `3100` で待ち受け、nginx で公開する
- SQLite ファイルと `.env` の権限を絞る
- 本番の systemd 実行ユーザーは `boat` とし、アプリ本体は `root:boat` 管理、`data/` だけを `boat:boat` の書き込み対象にする
- このREADMEの運用例では `boat` ユーザーのホームを `/var/www/boat-engine-scheduler` にしている。`getent passwd boat` の結果が `/www/var/...` など誤ったパスになっていないか確認する
- systemd ではシェル初期化に依存せず、`/usr/bin/node` のような固定パスを使う
- `.runtime/standalone` 直下に想定外の実行ファイルがないことを `npm run runtime:verify` または systemd の `ExecStartPre` で必ず確認する
- 本番サーバーで `curl | bash` を安易に実行しない

## 既知の制約

- 厳密な同時編集競合解決は未実装です
- オフライン編集は未対応です
- 兼任は警告表示のみで、保存禁止にはしていません
- 兼任警告メッセージの表示は行っていません
- 部員名は一意前提です
- PWAは installable ですが、オフラインキャッシュは行っていません

## テスト

```bash
npm test
npm run build:prod
```

このリポジトリでは以下を確認済みです。

- `npm run db:init`
- `npm run import:users -- public/samples/users.sample.csv`
- `npm run import:members -- public/samples/members.sample.csv`
- `npm test`
- `npm run build:prod`

## 今後の改善案

- 部員の表示順を五十音専用ソートへ最適化
- CSV取込結果の詳細エラーレポートを画面上で複数行表示
- 日別編集シートに前後日の移動ボタン追加
- 月カレンダーのPC表示を7列カレンダーへ切替可能にする
- 監査ログを別テーブル化して更新履歴を増やす
