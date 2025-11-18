# GitHub Secrets セットアップガイド

Firebase Hosting への自動デプロイに必要な GitHub Secrets の設定方法です。

## 必須のSecrets

### 1. FIREBASE_SERVICE_ACCOUNT

Firebase サービスアカウントキー（JSON形式）

**取得方法：**
1. [Firebase Console](https://console.firebase.google.com/) → プロジェクト設定（⚙️）
2. **サービスアカウント** タブ
3. **新しい秘密鍵の生成** をクリック
4. ダウンロードされたJSONファイルを開く

**設定方法：**
1. GitHubリポジトリ → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** をクリック
3. 以下を入力：
   - **Name**: `FIREBASE_SERVICE_ACCOUNT`
   - **Secret**: JSONファイルの**全内容**をコピー&ペースト
   ```json
   {
     "type": "service_account",
     "project_id": "your-project-id",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "...",
     "client_id": "...",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "..."
   }
   ```

**重要：**
- JSON全体（最初の `{` から最後の `}` まで）をコピーしてください
- 改行や空白も含めてそのままコピーしてください
- JSONが壊れているとデプロイが失敗します

### 2. VITE_FIREBASE_PROJECT_ID

Firebase プロジェクトID

**取得方法：**
- Firebase Console → プロジェクト設定 → **プロジェクトID**

**設定方法：**
- **Name**: `VITE_FIREBASE_PROJECT_ID`
- **Secret**: プロジェクトID（例: `et-ai-12345`）

### 3. Firebase 設定情報

以下のSecretsも設定してください：

| Secret名 | 取得場所 |
|---------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase Console → プロジェクト設定 → ウェブアプリ |
| `VITE_FIREBASE_AUTH_DOMAIN` | 同上 |
| `VITE_FIREBASE_STORAGE_BUCKET` | 同上 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | 同上 |
| `VITE_FIREBASE_APP_ID` | 同上 |

### 4. APIキー

| Secret名 | 取得場所 |
|---------|---------|
| `VITE_ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/) |
| `VITE_VOYAGE_API_KEY` | [Voyage AI](https://www.voyageai.com/) |

## 設定確認

すべてのSecretsを設定後、以下で確認できます：

```
GitHub リポジトリ → Settings → Secrets and variables → Actions
```

**必須のSecrets一覧：**
- ✅ FIREBASE_SERVICE_ACCOUNT
- ✅ VITE_FIREBASE_PROJECT_ID
- ✅ VITE_FIREBASE_API_KEY
- ✅ VITE_FIREBASE_AUTH_DOMAIN
- ✅ VITE_FIREBASE_STORAGE_BUCKET
- ✅ VITE_FIREBASE_MESSAGING_SENDER_ID
- ✅ VITE_FIREBASE_APP_ID
- ✅ VITE_ANTHROPIC_API_KEY
- ✅ VITE_VOYAGE_API_KEY

## トラブルシューティング

### エラー: `Input required and not supplied: firebaseServiceAccount`

**原因：** `FIREBASE_SERVICE_ACCOUNT` が設定されていないか、名前が違う

**解決方法：**
1. GitHub Secrets で名前が正確に `FIREBASE_SERVICE_ACCOUNT` になっているか確認
2. 大文字小文字が一致しているか確認
3. JSONが正しく貼り付けられているか確認

### エラー: `invalid_grant` または `invalid JSON`

**原因：** JSONの形式が壊れている

**解決方法：**
1. サービスアカウントキーを再生成
2. テキストエディタでJSONを開き、最初の `{` から最後の `}` まで選択
3. 改行や空白も含めてそのままコピー&ペースト
4. Secret を更新

### デプロイが失敗する

**確認ポイント：**
1. すべての必須Secretsが設定されているか
2. Firebase プロジェクトIDが正しいか
3. サービスアカウントに適切な権限があるか（Firebase Hosting管理者）
