# 🤝 開発ガイド

このプロジェクトへの貢献を歓迎します！このガイドでは、開発環境のセットアップから本番デプロイまでの流れを説明します。

## 📋 開発フロー

1. **Issue作成** → 2. **ブランチ作成** → 3. **開発** → 4. **テスト** → 5. **PR作成** → 6. **レビュー** → 7. **マージ**

## 🛠️ 開発環境セットアップ

### 必要なツール

```bash
# バージョン確認
go version        # 1.23.4+
node --version    # 18+  
terraform version # 1.8.0+
docker --version
aws --version
```

### 初回セットアップ

```bash
# リポジトリクローン
git clone <repository-url>
cd attendance

# 開発ブランチ作成
git checkout -b feature/your-feature-name

# サーバー依存関係
cd server && go mod tidy

# フロントエンド依存関係  
cd ../front && npm install

# 開発環境起動（2つのターミナル）
# Terminal 1: サーバー
cd server && make up && make db_init && make dev

# Terminal 2: フロントエンド
cd front && echo "VITE_API_URL=http://localhost:8080" > .env.local && npm run dev
```

## 🏗️ アーキテクチャ理解

### バックエンド（Go + Clean Architecture）

```
server/src/
├── domain/                 # ビジネスエンティティ
│   └── attendance.go      # 勤怠記録の構造体
├── usecase/               # ビジネスロジック  
│   ├── attendance_log.go  # 勤怠記録の操作
│   └── port/             # インターフェース定義
├── adapter/              # アダプター層
│   ├── infrastructure/   # DynamoDB操作
│   └── presentation/     # HTTPハンドラー
└── driver/               # 外部インターフェース
    ├── router/          # ルーティング
    └── db/              # DB接続
```

### フロントエンド（React Router 7）

```
front/app/
├── routes/               # ページコンポーネント
│   ├── home.tsx         # ホームページ
│   ├── login.tsx        # ログインページ
│   ├── attendance.tsx   # 勤怠記録ページ
│   └── auth.callback.tsx # OAuth コールバック
├── components/          # 再利用コンポーネント
│   ├── ChannelSelector.tsx    # チャンネル選択
│   └── AttendanceActions.tsx  # 勤怠アクション
└── root.tsx            # ルートコンポーネント
```

## 💻 開発時の注意点

### コーディング規約

**Go（サーバー側）**
```bash
# フォーマット
make fmt

# 命名規則
- Public: PascalCase (AttendanceLog)
- Private: camelCase (attendanceLog)
- 定数: UPPER_SNAKE_CASE
```

**TypeScript（フロントエンド）**
```bash
# 型チェック
npm run typecheck

# 命名規則  
- コンポーネント: PascalCase (ChannelSelector)
- 変数・関数: camelCase (selectedChannel)
- 型: PascalCase (SlackUser)
```

### Git規約

**ブランチ命名**
```
feature/add-channel-selector
bugfix/fix-oauth-callback
hotfix/security-patch
docs/update-readme
```

**コミットメッセージ**
```
feat: チャンネル選択機能を追加
fix: OAuth認証時のエラーハンドリングを修正
docs: READMEにクイックスタートガイドを追加  
refactor: DynamoDB接続処理をリファクタリング
test: 勤怠記録APIのテストケース追加
```

## 🧪 テスト

### ローカルテスト

```bash
# サーバー側テスト
cd server
go test ./...

# フロントエンド側テスト
cd front  
npm run test

# 結合テスト
make req  # APIテストリクエスト
```

### 動作確認チェックリスト

- [ ] Slack OAuth認証が正常動作
- [ ] チャンネル一覧が取得できる
- [ ] 出勤・退勤記録が正常に作成される
- [ ] 月次レポートが表示される
- [ ] エラーハンドリングが適切
- [ ] レスポンシブデザインが機能
- [ ] 既存機能が破綻していない

## 🚀 デプロイ手順

### ステージング環境

```bash
# サーバービルド
cd server && ./build.sh

# dev環境デプロイ
cd terraform/environment/dev
terraform plan
make apply

# フロントエンドデプロイ
cd front && npm run deploy
```

### 本番環境

```bash
# prod環境デプロイ（慎重に）
cd terraform/environment/prod
terraform plan  # 変更内容を必ず確認
make apply

# 動作確認必須
curl https://your-prod-api/health
```

## 📝 機能追加の手順

### 例: 新しい勤怠機能追加

1. **設計**
   ```bash
   # Issue作成して設計を議論
   # データベース設計
   # API設計
   # UI設計
   ```

2. **バックエンド実装**
   ```bash
   # 1. domain層にエンティティ追加
   vi server/src/domain/new_feature.go
   
   # 2. usecase層にビジネスロジック追加
   vi server/src/usecase/new_feature.go
   
   # 3. infrastructure層にDB操作追加  
   vi server/src/adapter/infrastructure/new_feature.go
   
   # 4. presentation層にAPI追加
   vi server/src/adapter/presentation/handler.go
   
   # 5. ルーター追加
   vi server/src/driver/router/router.go
   ```

3. **フロントエンド実装**
   ```bash
   # 1. コンポーネント作成
   vi front/app/components/NewFeature.tsx
   
   # 2. ページ追加（必要に応じて）
   vi front/app/routes/new-feature.tsx
   
   # 3. 既存ページに統合
   vi front/app/routes/attendance.tsx
   ```

4. **テスト**
   ```bash
   # バックエンドテスト
   cd server && go test ./...
   
   # フロントエンドテスト
   cd front && npm run typecheck
   
   # 動作確認
   make dev  # サーバー起動
   npm run dev  # フロントエンド起動
   ```

## 🐛 デバッグガイド

### よくある問題と解決方法

**DynamoDB接続エラー**
```bash
# ローカルDynamoDB確認
docker ps | grep dynamodb
make db_list

# テーブル初期化
make db_init
```

**CORS エラー**
```bash
# 環境変数確認
cat front/.env.local
echo $VITE_API_URL

# サーバー起動確認
curl http://localhost:8080/health
```

**型エラー**
```bash
# TypeScript型チェック
cd front && npm run typecheck

# Go型チェック
cd server && go build ./...
```

### ログ確認

```bash
# サーバーログ（ローカル）
cd server && make dev  # コンソール出力

# DynamoDBログ
docker logs dynamodb-local

# AWSログ（本番）
aws logs tail /aws/lambda/attendance-api-server-dev --follow
```

## 📖 参考資料

### 外部ドキュメント
- [Slack API](https://api.slack.com/web)
- [AWS Lambda Go](https://docs.aws.amazon.com/lambda/latest/dg/golang-handler.html)
- [React Router v7](https://reactrouter.com/start/library/routing)
- [DynamoDB](https://docs.aws.amazon.com/dynamodb/)

### コードリファレンス
- `server/src/adapter/presentation/handler.go` - API実装例
- `front/app/components/ChannelSelector.tsx` - React コンポーネント例
- `terraform/module/` - インフラ設定例

## ❓ 質問・サポート

1. **技術的な質問**: GitHub Issues で `question` ラベル
2. **バグ報告**: GitHub Issues で `bug` ラベル  
3. **機能要望**: GitHub Issues で `enhancement` ラベル
4. **緊急の問題**: Discord/Slack の開発チャンネル

---

**貢献ありがとうございます！ 🎉**