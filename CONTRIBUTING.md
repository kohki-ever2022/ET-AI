# ET-AI 貢献ガイドライン

ET-AIプロジェクトへの貢献を歓迎します！このドキュメントでは、プロジェクトに貢献する際のガイドラインを説明します。

## 📋 目次

- [行動規範](#行動規範)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [ブランチ戦略](#ブランチ戦略)
- [コーディング規約](#コーディング規約)
- [テストガイドライン](#テストガイドライン)
- [コミットメッセージ規約](#コミットメッセージ規約)
- [Pull Requestプロセス](#pull-requestプロセス)

## 行動規範

プロジェクトに参加するすべての人は、以下の行動規範に従うことが期待されます：

- 敬意を持ってコミュニケーションを行う
- 建設的なフィードバックを提供する
- 多様性を尊重する
- プロフェッショナルな態度を維持する

## 開発環境のセットアップ

### 必要要件

- Node.js 20+
- npm 9+
- Git
- Firebase CLI (`npm install -g firebase-tools`)
- 推奨エディタ: VSCode

### セットアップ手順

```bash
# リポジトリのクローン
git clone https://github.com/your-org/ET-AI.git
cd ET-AI

# 依存関係のインストール
npm install
cd functions && npm install && cd ..

# 環境変数の設定
cp .env.example .env.local
# .env.localを編集して必要なAPIキーを設定

# 開発サーバーの起動
npm run dev
```

## ブランチ戦略

### ブランチ命名規則

```
<type>/<short-description>

例:
- feature/add-vector-search
- fix/auth-domain-validation
- refactor/claude-service-types
- docs/update-readme
- test/add-validators-tests
```

### ブランチタイプ

- `feature/`: 新機能の追加
- `fix/`: バグ修正
- `refactor/`: リファクタリング
- `docs/`: ドキュメント更新
- `test/`: テストの追加・修正
- `chore/`: ビルド設定など

## コーディング規約

### TypeScript

- **strict mode**: 必ず有効化
- **any型の使用**: 最小限に抑える（やむを得ない場合のみ）
- **命名規則**:
  - PascalCase: コンポーネント、型、インターフェース
  - camelCase: 関数、変数
  - UPPER_SNAKE_CASE: 定数

### コードスタイル

```typescript
// ✅ Good
interface UserProfile {
  id: string;
  email: string;
  displayName: string;
}

export function validateEmail(email: string): boolean {
  return email.includes('@trias.co.jp');
}

// ❌ Bad
interface userprofile {  // Should be PascalCase
  ID: string;  // Should be camelCase
  Email: string;  // Should be camelCase
}

export function ValidateEmail(Email: string): boolean {  // Should be camelCase
  return Email.includes('@trias.co.jp');
}
```

### JSDoc コメント

すべての公開関数にJSDocコメントを追加：

```typescript
/**
 * メールアドレスのドメインを検証します
 *
 * @param email - 検証するメールアドレス
 * @returns ドメインが @trias.co.jp の場合 true
 *
 * @example
 * ```typescript
 * validateEmailDomain('user@trias.co.jp');  // true
 * validateEmailDomain('user@gmail.com');    // false
 * ```
 */
export function validateEmailDomain(email: string): boolean {
  return email.endsWith('@trias.co.jp');
}
```

## テストガイドライン

### テストカバレッジ目標

| カテゴリ | 目標カバレッジ |
|---------|--------------|
| utils/ | 70%+ |
| services/ | 70%+ |
| components/ | 70%+ |
| **全体** | **70%+** |

### テストファイルの配置

```
__tests__/
├── components/
│   └── ComponentName.test.tsx
├── services/
│   └── serviceName.test.ts
└── utils/
    └── utilityName.test.ts
```

### テストの書き方

```typescript
describe('ServiceName', () => {
  describe('functionName', () => {
    it('should handle valid input', () => {
      const result = functionName('valid-input');
      expect(result).toBe(expected);
    });

    it('should reject invalid input', () => {
      expect(() => functionName('invalid')).toThrow();
    });

    it('should handle edge cases', () => {
      // Edge case test
    });
  });
});
```

### テスト実行

```bash
# 全テスト実行
npm test

# Watch モード
npm run test:watch

# カバレッジ確認
npm run test:coverage
```

## コミットメッセージ規約

### フォーマット

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `style`: コードスタイル変更（機能変更なし）
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルド設定など

### 例

```
feat(auth): Add domain validation for @trias.co.jp

- Implement validateEmailDomain function
- Add unit tests with 90% coverage
- Update auth service documentation

Closes #123
```

## Pull Requestプロセス

### PRを作成する前に

1. ✅ すべてのテストが通過することを確認
   ```bash
   npm test
   ```

2. ✅ TypeScriptコンパイルエラーがないことを確認
   ```bash
   npx tsc --noEmit
   ```

3. ✅ ビルドが成功することを確認
   ```bash
   npm run build
   ```

4. ✅ 新機能には必ずテストを追加

### PRテンプレート

```markdown
## 概要
<!-- 変更内容の簡潔な説明 -->

## 変更内容
- [ ] 新機能の追加
- [ ] バグ修正
- [ ] リファクタリング
- [ ] ドキュメント更新
- [ ] テスト追加

## 関連Issue
Closes #<issue-number>

## テスト方法
<!-- この変更をテストする手順 -->

1. ...
2. ...

## スクリーンショット（UIの変更の場合）
<!-- Before/After のスクリーンショット -->

## チェックリスト
- [ ] テストが通過している
- [ ] TypeScriptコンパイルエラーがない
- [ ] ドキュメントを更新した
- [ ] コーディング規約に従っている
- [ ] セルフレビューを実施した
```

### レビュープロセス

1. **自動チェック**: GitHub Actionsによる自動テスト・ビルド
2. **コードレビュー**: 最低1名の承認が必要
3. **マージ**: Squash and Mergeを使用

## セキュリティ

### 機密情報

- **絶対に含めない**:
  - APIキー
  - パスワード
  - 認証トークン
  - 個人情報

- **.env.local**: Gitにコミットしない（.gitignoreに含まれています）

### セキュリティ脆弱性の報告

セキュリティ脆弱性を発見した場合は、公開のIssueではなく、プライベートに報告してください。

## 質問・サポート

質問がある場合は、以下の方法でお問い合わせください：

1. GitHub Issueで質問する
2. Discussionsで議論する
3. プロジェクトメンテナーに直接連絡する

## ライセンス

貢献したコードは、プロジェクトのライセンスに従います。

---

**Thank you for contributing to ET-AI!** 🎉
