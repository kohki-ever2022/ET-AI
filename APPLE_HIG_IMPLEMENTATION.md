# Apple Human Interface Guidelines (HIG) 実装ガイド

このプロジェクトは、Apple Human Interface Guidelines 2024-2025年版に基づいた包括的なデザインシステムをTailwind CSSで実装しています。

## 📋 目次

- [概要](#概要)
- [セットアップ](#セットアップ)
- [デザイン原則](#デザイン原則)
- [カラーシステム](#カラーシステム)
- [タイポグラフィ](#タイポグラフィ)
- [コンポーネント](#コンポーネント)
- [レイアウト](#レイアウト)
- [アクセシビリティ](#アクセシビリティ)
- [使用例](#使用例)

## 概要

このデザインシステムは、Appleの3つの基本原則に基づいています：

### 🎯 Clarity（明瞭性）
すべての要素が目的を明確に伝え、ユーザーが直感的に理解できるようにします。

### 🎨 Deference（控えめさ）
UIがコンテンツを邪魔せず、ユーザーの体験を最優先します。

### 📐 Depth（奥行き）
視覚的な階層を適切に表現し、情報の重要度を明確に示します。

## セットアップ

### 必要な依存関係

```bash
npm install -D tailwindcss@^3 postcss autoprefixer @tailwindcss/forms
```

### 設定ファイル

プロジェクトには以下の設定ファイルが含まれています：

- `tailwind.config.js` - Apple HIG仕様の完全な設定
- `postcss.config.js` - PostCSS設定
- `styles/index.css` - カスタムコンポーネントとユーティリティ

### デモページの表示

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開くと、Apple HIGデモページが表示されます。
右下のボタンで実際のアプリとデモページを切り替えられます。

## デザイン原則

### タッチターゲット

すべてのインタラクティブ要素は**44×44px**の最小サイズを確保しています。
これはWCAG 2.2のAAAレベル基準を満たしています。

```tsx
<button className="min-h-touch min-w-touch">ボタン</button>
```

### スペーシング

8pxグリッドシステムを基準としたスペーシング：

```tsx
// 4px, 8px, 12px, 16px, 20px, 24px, 32px...
<div className="p-apple-base">  // 16px
<div className="space-y-apple-md">  // 12px
<div className="mb-apple-xl">  // 24px
```

### 角丸（Border Radius）

連続コーナー（continuous corners）を近似した角丸値：

```tsx
<button className="rounded-apple-button">8px</button>
<div className="rounded-apple-card">20px</div>
<input className="rounded-apple-field">10px</input>
```

## カラーシステム

### セマンティックシステムカラー

Appleは34種類のセマンティックカラーを定義しています。色は**意味で選択**し、固定のRGB値ではありません。

#### テキストカラー（4階層）

```tsx
// プライマリ（最も強調）
<p className="text-primary">メインテキスト</p>

// セカンダリ
<p className="text-secondary">サブテキスト</p>

// ターシャリ
<p className="text-tertiary">補助テキスト</p>

// クォータナリ（最も控えめ）
<p className="text-quaternary">最小強調</p>
```

#### 背景カラー（3層）

```tsx
<div className="bg-primary">最背面レイヤー</div>
<div className="bg-secondary">中間レイヤー</div>
<div className="bg-tertiary">最前面レイヤー</div>
```

#### システムアクセントカラー

9つのシステムカラーが利用可能：

```tsx
<button className="bg-system-blue">Blue - 主要アクション</button>
<button className="bg-system-green">Green - 成功</button>
<button className="bg-system-red">Red - エラー</button>
<button className="bg-apple-orange-light dark:bg-apple-orange-dark">Orange - 警告</button>
```

#### Fill Colors（半透明オーバーレイ）

```tsx
<div className="bg-apple-fill-primary-light dark:bg-apple-fill-primary-dark">
  20%/36%の半透明背景
</div>
```

### ダークモード

すべての色はライト・ダークモード両対応：

```tsx
<div className="bg-apple-bg-primary-light dark:bg-apple-bg-primary-dark">
  自動切り替え対応
</div>
```

または便利なユーティリティクラス：

```tsx
<div className="bg-primary text-primary">
  両モード自動対応
</div>
```

## タイポグラフィ

### SF Proフォント

システムフォント（SF Pro）を使用：

```tsx
<div className="font-sf-pro">Apple標準フォント</div>
```

### 11段階のテキストスタイル

| クラス名 | サイズ | 行高 | ウェイト | 用途 |
|---------|-------|------|---------|------|
| `text-apple-large-title` | 34px | 41px | 400 | 大見出し |
| `text-apple-title-1` | 28px | 34px | 400 | 見出し1 |
| `text-apple-title-2` | 22px | 28px | 400 | 見出し2 |
| `text-apple-title-3` | 20px | 25px | 400 | 見出し3 |
| `text-apple-headline` | 17px | 22px | 600 | 強調見出し |
| `text-apple-body` | 17px | 22px | 400 | 本文 |
| `text-apple-callout` | 16px | 21px | 400 | 吹き出し |
| `text-apple-subhead` | 15px | 20px | 400 | 小見出し |
| `text-apple-footnote` | 13px | 18px | 400 | 脚注 |
| `text-apple-caption-1` | 12px | 16px | 400 | キャプション |
| `text-apple-caption-2` | 11px | 13px | 400 | 最小キャプション |

使用例：

```tsx
<h1 className="text-apple-large-title">Large Title</h1>
<h2 className="text-apple-title-1">Title 1</h2>
<p className="text-apple-body">本文テキスト</p>
<span className="text-apple-footnote">脚注</span>
```

### フォントウェイト

```tsx
<span className="font-sf-regular">400</span>
<span className="font-sf-medium">500</span>
<span className="font-sf-semibold">600</span>
<span className="font-sf-bold">700</span>
<span className="font-sf-heavy">800</span>
```

## コンポーネント

### ボタン

#### Button コンポーネント

```tsx
import { Button } from './components/ui';

// プライマリボタン
<Button variant="primary">送信</Button>

// セカンダリボタン
<Button variant="secondary">キャンセル</Button>

// テキストボタン
<Button variant="text">詳細</Button>

// カプセル型
<Button variant="capsule">カプセル</Button>

// 破壊的アクション
<Button variant="destructive">削除</Button>

// ローディング状態
<Button variant="primary" loading>送信中...</Button>

// サイズ
<Button size="small">小</Button>
<Button size="medium">中</Button>
<Button size="large">大</Button>
<Button fullWidth>全幅</Button>
```

#### カスタムクラスでのボタン

```tsx
<button className="btn-apple-primary">プライマリ</button>
<button className="btn-apple-secondary">セカンダリ</button>
<button className="btn-apple-text">テキスト</button>
```

### 入力フィールド

#### Input コンポーネント

```tsx
import { Input, TextArea, Checkbox, Radio } from './components/ui';

// テキスト入力
<Input
  label="メールアドレス"
  type="email"
  placeholder="example@email.com"
  error="エラーメッセージ"
  helperText="ヘルプテキスト"
  leftIcon={<MailIcon />}
/>

// テキストエリア
<TextArea
  label="メッセージ"
  rows={4}
  helperText="最大500文字"
/>

// チェックボックス
<Checkbox label="利用規約に同意します" />

// ラジオボタン
<Radio name="option" label="オプション1" value="1" />
```

#### カスタムクラスでの入力

```tsx
<input className="input-apple" placeholder="通常" />
<input className="input-apple-error" placeholder="エラー" />
```

### カード

#### Card コンポーネント

```tsx
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription
} from './components/ui';

<Card hover>
  <CardHeader>
    <CardTitle>タイトル</CardTitle>
  </CardHeader>
  <CardContent>
    <CardDescription>説明文</CardDescription>
  </CardContent>
  <CardFooter>
    <Button variant="text">アクション</Button>
  </CardFooter>
</Card>
```

#### カスタムクラスでのカード

```tsx
<div className="card-apple">標準カード</div>
<div className="card-apple-hover">ホバー可能</div>
```

### ダークモード切り替え

```tsx
import { DarkModeToggle, DarkModeSwitch } from './components/ui';

// アイコン切り替え
<DarkModeToggle />

// スイッチ切り替え
<DarkModeSwitch />
```

## レイアウト

### 3ペインレイアウト

```tsx
<div className="flex h-screen">
  {/* サイドバー */}
  <aside className="w-sidebar-ideal min-w-sidebar-min max-w-sidebar-max bg-secondary">
    サイドバー
  </aside>

  {/* コンテンツリスト */}
  <main className="flex-1 border-r">
    リスト
  </main>

  {/* 詳細ペイン */}
  <section className="flex-[2] min-w-[400px]">
    詳細
  </section>
</div>
```

### レスポンシブブレークポイント

```tsx
// 375px - iPhone portrait
<div className="apple-mobile:block">

// 768px - iPad portrait, 2カラム
<div className="apple-tablet:flex">

// 1024px - iPad landscape, 3カラム
<div className="apple-desktop:grid-cols-3">

// 1280px - macOS標準
<div className="apple-wide:max-w-7xl">
```

## アクセシビリティ

### WCAG 2.1 AAレベル準拠

すべてのコンポーネントは以下の基準を満たしています：

✅ **最小タッチターゲット**: 44×44px
✅ **コントラスト比**: 通常テキスト4.5:1以上
✅ **キーボードナビゲーション**: 完全対応
✅ **フォーカスインジケーター**: 明確な表示
✅ **スクリーンリーダー**: ARIA属性の適切な使用
✅ **Reduce Motion**: アニメーション削減対応
✅ **色のみに依存しない**: アイコンとテキストの併用

### フォーカス状態

すべてのインタラクティブ要素に自動適用：

```tsx
// グローバル設定（styles/index.css）
*:focus-visible {
  @apply outline-none ring-2 ring-apple-blue-light dark:ring-apple-blue-dark;
}
```

### Reduce Motion対応

```tsx
// 自動適用（styles/index.css）
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

手動での適用：

```tsx
<button className="transition-transform active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100">
  モーション配慮ボタン
</button>
```

## 使用例

### ログインフォーム

```tsx
import { Button, Input, Card, CardHeader, CardContent, CardTitle } from './components/ui';

function LoginForm() {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>ログイン</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-apple-base">
          <Input
            label="メールアドレス"
            type="email"
            placeholder="example@email.com"
          />
          <Input
            label="パスワード"
            type="password"
            placeholder="8文字以上"
          />
          <Button variant="primary" fullWidth type="submit">
            ログイン
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

### リスト項目

```tsx
<div className="divide-y divide-apple-separator-light dark:divide-apple-separator-dark">
  <div className="list-item-apple">
    <h4 className="font-sf-pro text-apple-body font-sf-semibold text-primary">
      アイテム1
    </h4>
    <p className="font-sf-pro text-apple-subhead text-secondary mt-1">
      説明文
    </p>
  </div>
  <div className="list-item-apple">
    <h4 className="font-sf-pro text-apple-body font-sf-semibold text-primary">
      アイテム2
    </h4>
    <p className="font-sf-pro text-apple-subhead text-secondary mt-1">
      説明文
    </p>
  </div>
</div>
```

### マテリアル効果

```tsx
<div className="apple-material p-apple-lg rounded-apple-card">
  背景ぼかし付きのマテリアル
</div>
```

## ファイル構成

```
/home/user/ET-AI/
├── tailwind.config.js          # Apple HIG完全仕様
├── postcss.config.js           # PostCSS設定
├── styles/
│   └── index.css              # カスタムスタイル・コンポーネント
├── components/
│   ├── ui/
│   │   ├── Button.tsx         # ボタンコンポーネント
│   │   ├── Input.tsx          # 入力コンポーネント
│   │   ├── Card.tsx           # カードコンポーネント
│   │   ├── DarkModeToggle.tsx # ダークモード切り替え
│   │   └── index.ts           # UIコンポーネントエクスポート
│   └── AppleHIGDemo.tsx       # デモページ
├── AppDemo.tsx                # デモとアプリの切り替え
└── APPLE_HIG_IMPLEMENTATION.md # このドキュメント
```

## 参考リンク

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## ライセンス

このデザインシステムの実装は、Apple Human Interface Guidelinesに基づいていますが、
Appleの商標やデザインを侵害するものではありません。教育・学習目的での使用を推奨します。

---

**作成日**: 2025年11月16日
**バージョン**: 1.0.0
**Tailwind CSS**: v3.x
**Apple HIG**: 2024-2025年版
