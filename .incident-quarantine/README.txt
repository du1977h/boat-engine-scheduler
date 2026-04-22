このディレクトリは 2026-04-22 の調査で隔離した不審ファイルの保管先です。

隔離した対象:
- .local/bin/.X11-linux
- .config/.X11-linux/
- .config/systemd/user/php-fpm-pool.service

理由:
- アプリ本体と無関係な Go 製実行バイナリ
- user systemd unit から上記バイナリを自動起動する設定
- "seo-continuous-deployer" など、通常の Next.js / Node.js 運用と無関係な文字列を含む

注意:
- 証跡保全のため削除ではなく隔離している
- 解析が済むまで再配置しない
- 本番環境では別VPSへの再構築を優先し、この隔離だけで安全になったと見なさない
