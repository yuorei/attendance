# 🚀 クイックスタートガイド

このガイドでは、勤怠管理システムを最速で動作させる手順を説明します。

## ⏱️ 所要時間

- **ローカル開発環境**: 約15分
- **本番環境デプロイ**: 約30分

## 🎯 Step 1: Slackアプリ設定（5分）

1. [Slack API](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. アプリ名とワークスペースを選択
3. **OAuth & Permissions** → **Scopes** → **Bot Token Scopes**に以下を追加:
   ```
   users:read
   channels:read
   groups:read
   channels:history  
   groups:history
   ```
4. **Client ID** と **Client Secret** をメモ（後で使用）

## 🖥️ Step 2: ローカル開発環境（10分）

### 必要なツールの確認

```bash
# Go, Node.js, Dockerがインストールされているか確認
go version    # Go 1.23.4+
node --version # Node.js 18+
docker --version
```

### サーバー起動

```bash
# 1. プロジェクトディレクトリに移動
cd server/

# 2. 依存関係インストール
go mod tidy

# 3. DynamoDB Local起動
make up

# 4. テーブル作成
make db_init

# 5. サーバー起動（ポート8080）
make dev
```

### フロントエンド起動

```bash
# 新しいターミナルで
cd front/

# 1. 依存関係インストール
npm install

# 2. 環境変数設定
echo "VITE_API_URL=http://localhost:8080" > .env.local

# 3. フロントエンド起動
npm run dev
```

## 🌐 Step 3: 動作確認（5分）

1. ブラウザで `http://localhost:5173` にアクセス
2. 「Slackでログイン」ボタンをクリック
3. Slack認証を完了
4. チャンネル選択ドロップダウンからチャンネルを選択
5. 「出勤」「退勤」ボタンで記録をテスト

## ✅ 基本機能テスト

- [ ] Slackログインが成功
- [ ] チャンネル一覧が表示される
- [ ] チャンネル選択ができる
- [ ] 出勤記録ができる
- [ ] 退勤記録ができる
- [ ] 月次レポートが表示される

## 🚀 本番デプロイ（本格運用時）

### AWS環境準備

```bash
# AWS CLI設定（初回のみ）
aws configure

# Terraform初期化
cd terraform/environment/dev/
terraform init
```

### 環境変数設定

```bash
# terraform.tfvars ファイル作成
cat > terraform.tfvars << EOF
otel_endpoint = "dummy-endpoint"
otel_token = "dummy-token"
slack_client_id = "your-slack-client-id"
slack_client_secret = "your-slack-client-secret"  
slack_redirect_uri = "https://your-future-api-gateway-url/auth/slack/callback"
EOF
```

### デプロイ実行

```bash
# サーバービルド
cd ../../../server/
./build.sh

# インフラデプロイ
cd ../terraform/environment/dev/
make apply

# API Gateway URLを確認してSlackアプリの Redirect URL を更新
# terraform output で出力されるAPI Gateway URLをコピー
```

### フロントエンドデプロイ

```bash
cd ../../../front/

# wrangler.jsonc の env.production.vars に API Gateway URL を設定
# {"VITE_API_URL": "https://your-api-gateway-url"}

# Cloudflare Workersにデプロイ
npm run deploy
```

## 🆘 トラブル対応

### よくあるエラーと解決方法

| エラー | 原因 | 解決方法 |
|--------|------|----------|
| `port 8080 already in use` | ポート競合 | `lsof -ti:8080 \| xargs kill -9` |
| `DynamoDB connection refused` | DynamoDB未起動 | `make up` を実行 |
| `Slack OAuth error` | Redirect URL不一致 | Slackアプリ設定を確認 |
| `Channel list empty` | 権限不足 | OAuth Scopesを確認 |
| `CORS error` | API URL設定ミス | `.env.local` を確認 |

### ヘルプコマンド

```bash
# サーバーヘルプ
cd server && make help

# フロントエンドヘルプ  
cd front && npm run --help

# DynamoDBテーブル確認
make db_list

# ログ確認
docker logs dynamodb-local  # DynamoDB
```

## 🔧 開発Tips

### Hot Reload確認

- Go: ファイル変更時に自動再起動される
- React: ブラウザが自動リロードされる

### デバッグ方法

```bash
# API動作確認
curl http://localhost:8080/health

# テストリクエスト送信  
cd server && make req

# フロントエンドビルド確認
cd front && npm run build
```

## 📞 サポート

問題が解決しない場合:

1. [README.md](./README.md) の詳細ドキュメントを確認
2. [Issues](https://github.com/your-repo/issues) でバグレポート
3. [CLAUDE.md](./CLAUDE.md) で技術仕様を確認

---

**🎉 以上でセットアップ完了です！チームの勤怠管理を効率化しましょう！**