# 勤怠管理システム

Slack連携による効率的な勤怠管理システム。SlackのOAuth認証とWebダッシュボードを使用して、チーム全体の出勤・退勤記録を管理できます。

## 🚀 機能

- **Slack OAuth認証**: Slackアカウントでのセキュアなログイン
- **動的チャンネル選択**: アクセス可能な任意のSlackチャンネルを選択
- **Web UI**: 直感的なWebインターフェースで勤怠記録を管理
- **リアルタイム記録**: Web UIから直接出勤・退勤を記録
- **月次レポート**: 月別の勤怠記録を表示・編集
- **Slack連携**: 従来のスラッシュコマンドも継続サポート

## 🏗️ アーキテクチャ

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend│    │   Go API Server  │    │   DynamoDB      │
│  (Cloudflare)   │◄──►│   (AWS Lambda)   │◄──►│   (AWS)         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
          │                        │
          ▼                        ▼
┌─────────────────┐    ┌──────────────────┐
│   Slack OAuth   │    │   API Gateway    │
│   (slack.com)   │    │   (AWS)          │
└─────────────────┘    └──────────────────┘
```

## 📋 前提条件

- Go 1.23.4+
- Node.js 18+
- AWS CLI設定済み
- Terraform 1.8.0+
- Docker & Docker Compose
- Slackアプリケーションの作成権限

## 🔧 セットアップ

### 1. Slackアプリケーションの設定

1. [Slack API](https://api.slack.com/apps)でアプリを作成
2. OAuth & Permissions設定:
   ```
   OAuth Scopes:
   - users:read
   - channels:read
   - groups:read  
   - channels:history
   - groups:history
   ```
3. Redirect URLsを設定（後でAPI Gateway URLに更新）:
   ```
   https://your-api-gateway-url/auth/slack/callback
   ```
4. Client IDとClient Secretをメモ

### 2. ローカル開発環境

#### サーバー側の起動

```bash
# リポジトリをクローン
cd server/

# 依存関係をインストール
go mod tidy

# DynamoDB Localを起動
make up

# テーブルを初期化
make db_init

# ローカル開発サーバーを起動（ポート8080）
make dev
```

#### フロントエンド側の起動

```bash
# 別ターミナルで実行
cd front/

# 依存関係をインストール
npm install

# 環境変数を設定
echo "VITE_API_URL=http://localhost:8080" > .env.local

# 開発サーバーを起動
npm run dev
```

### 3. 本番環境デプロイ

#### Terraformでインフラをデプロイ

```bash
# サーバーをビルド
cd server/
./build.sh

# dev環境にデプロイ
cd ../terraform/environment/dev/

# 環境変数を設定（terraform.tfvarsファイルを作成）
cat > terraform.tfvars << EOF
otel_endpoint = "your-otel-endpoint"
otel_token = "your-otel-token"  
slack_client_id = "your-slack-client-id"
slack_client_secret = "your-slack-client-secret"
slack_redirect_uri = "https://your-api-gateway-url/auth/slack/callback"
EOF

# デプロイ実行
make apply
```

#### フロントエンドをCloudflare Workersにデプロイ

```bash
cd front/

# wrangler.jsonc を設定
# VITE_API_URL環境変数を実際のAPI Gateway URLに設定

# デプロイ
npm run deploy
```

## 🎯 使用方法

### Web UI での使用

1. **ログイン**
   - ブラウザでフロントエンドURLにアクセス
   - 「Slackでログイン」ボタンをクリック
   - Slack認証を完了

2. **チャンネル選択**
   - 出勤記録ページでチャンネル選択ドロップダウンを使用
   - アクセス可能なチャンネルから選択
   - 選択したチャンネル情報は自動保存

3. **勤怠記録**
   - 「出勤」「退勤」ボタンで記録
   - 月次レポートで過去の記録を確認
   - 必要に応じて記録を編集・削除

### Slackコマンドでの使用（従来機能）

```
/attendance check_in          # 出勤記録
/attendance check_out         # 退勤記録  
/attendance subscribe [場所]   # 勤務場所登録
/attendance monthly           # 月次レポート表示
```

## 🔍 開発・デバッグ

### ローカル開発コマンド

```bash
# サーバー側
cd server/
make dev        # ローカルサーバー起動
make fmt        # コードフォーマット
make db_list    # DynamoDBテーブル確認
make req        # テストリクエスト送信

# フロントエンド側
cd front/
npm run dev         # 開発サーバー
npm run build       # ビルド
npm run typecheck   # 型チェック
```

### API エンドポイント

#### 認証
- `GET /auth/slack` - Slack OAuth開始
- `GET /auth/slack/callback` - OAuth コールバック
- `GET /api/v1/slack/channels` - チャンネル一覧取得

#### 勤怠管理
- `POST /api/v1/attendance/check-in` - 出勤記録
- `POST /api/v1/attendance/check-out` - 退勤記録
- `GET /api/v1/attendance/monthly` - 月次勤怠取得
- `PUT /api/v1/attendance/edit` - 勤怠編集
- `DELETE /api/v1/attendance/:id` - 勤怠削除

## 🗄️ データベース構造

### AttendanceLog テーブル
```
Partition Key: UserID (String)
Sort Key: Timestamp (String)
Attributes:
- WorkplaceID (String)
- Action (String) - "start" or "end"
- TeamID (String)
- ChannelID (String)
```

### WorkplaceBindings テーブル
```
Partition Key: CompositeKey (String) - "teamid#channelid#userid"
Attributes:
- TeamID, ChannelID, UserID
- WorkplaceName (String)
```

## 🔐 環境変数

### サーバー側（Lambda）
```
ENV=local|dev|prod
TABLE_NAME=AttendanceLog
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=your-callback-url
OTEL_ENDPOINT=your-otel-endpoint
OTEL_TOKEN=your-otel-token
```

### フロントエンド側（Cloudflare Workers）
```
VITE_API_URL=your-api-gateway-url
```

## 🚨 トラブルシューティング

### よくある問題

1. **Slack認証エラー**
   - Redirect URLがSlackアプリ設定と一致しているか確認
   - OAuth Scopesが正しく設定されているか確認

2. **チャンネル一覧が表示されない**
   - アクセストークンが正しく保存されているか確認
   - 必要なScopeが付与されているか確認

3. **ローカル開発でCORSエラー**
   - フロントエンドの`VITE_API_URL`がサーバーURLと一致しているか確認

4. **DynamoDB接続エラー**
   - ローカル: `make up`でDynamoDB Localが起動しているか確認
   - AWS: IAMロールの権限を確認

### ログの確認

```bash
# ローカルサーバーログ
cd server && make dev

# Lambdaログ（AWS）
aws logs tail /aws/lambda/attendance-api-server-dev --follow

# DynamoDBテーブル確認
make db_list
```

## 📚 参考資料

- [Slack API Documentation](https://api.slack.com/)
- [AWS Lambda Go](https://docs.aws.amazon.com/lambda/latest/dg/golang-handler.html)
- [React Router v7](https://reactrouter.com/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)

## 🤝 コントリビューション

1. フォークを作成
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチをプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

---

## 🔧 システム要件

- **CPU**: 最低1GB RAM（推奨2GB以上）
- **Storage**: 最低500MB（ログとキャッシュ用）
- **Network**: インターネット接続必須（Slack API通信）

## 🎉 開発者向け情報

### アーキテクチャの詳細

このシステムはClean Architectureパターンを採用：

```
src/
├── domain/          # ビジネスエンティティ
├── usecase/         # ビジネスロジック
├── adapter/
│   ├── infrastructure/  # データベース操作
│   └── presentation/    # HTTPハンドラー
└── driver/          # 外部インターフェース
```

### パフォーマンス考慮事項

- DynamoDBのパーティション設計でホットキーを回避
- フロントエンドでのチャンネル情報キャッシュ
- Lambda Cold Start最適化

システムの構築と運用について質問がある場合は、イシューを作成してください！