import React, { useState } from 'react';
import {
  Button,
  ButtonGroup,
  Input,
  TextArea,
  Checkbox,
  Radio,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
  DarkModeToggle,
  DarkModeSwitch,
} from './ui';

/**
 * Apple HIG Design System デモページ
 *
 * このページは、Apple Human Interface Guidelinesに基づいた
 * デザインシステムの全コンポーネントを展示しています。
 */
export const AppleHIGDemo: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [selectedRadio, setSelectedRadio] = useState('option1');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 簡単なバリデーション
    if (!email.includes('@')) {
      setEmailError('有効なメールアドレスを入力してください');
      return;
    }

    setEmailError('');
    setLoading(true);

    // デモ用の遅延
    setTimeout(() => {
      setLoading(false);
      alert('フォームが送信されました！');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-secondary">
      {/* ヘッダー */}
      <header className="bg-primary border-b border-apple-separator-light dark:border-apple-separator-dark sticky top-0 z-header">
        <div className="max-w-apple-wide mx-auto px-apple-base py-apple-md flex items-center justify-between">
          <div>
            <h1 className="font-sf-pro text-apple-title-2 font-sf-semibold text-primary">
              Apple HIG Design System
            </h1>
            <p className="font-sf-pro text-apple-subhead text-secondary mt-1">
              Tailwind CSS Implementation
            </p>
          </div>
          <div className="flex items-center gap-apple-sm">
            <DarkModeSwitch />
            <DarkModeToggle />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-apple-wide mx-auto px-apple-base py-apple-xl space-y-apple-4xl">

        {/* イントロダクション */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Apple Human Interface Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                このデモページは、Apple HIGの3つの基本原則に基づいて構築されています：
              </CardDescription>
              <div className="grid grid-cols-1 apple-tablet:grid-cols-3 gap-apple-base mt-apple-base">
                <div className="p-apple-md bg-apple-fill-quaternary-light dark:bg-apple-fill-quaternary-dark rounded-apple-button-lg">
                  <h4 className="font-sf-pro text-apple-headline font-sf-semibold text-primary mb-2">
                    Clarity（明瞭性）
                  </h4>
                  <p className="font-sf-pro text-apple-subhead text-secondary">
                    すべての要素が目的を明確に伝えています
                  </p>
                </div>
                <div className="p-apple-md bg-apple-fill-quaternary-light dark:bg-apple-fill-quaternary-dark rounded-apple-button-lg">
                  <h4 className="font-sf-pro text-apple-headline font-sf-semibold text-primary mb-2">
                    Deference（控えめさ）
                  </h4>
                  <p className="font-sf-pro text-apple-subhead text-secondary">
                    UIがコンテンツを邪魔していません
                  </p>
                </div>
                <div className="p-apple-md bg-apple-fill-quaternary-light dark:bg-apple-fill-quaternary-dark rounded-apple-button-lg">
                  <h4 className="font-sf-pro text-apple-headline font-sf-semibold text-primary mb-2">
                    Depth（奥行き）
                  </h4>
                  <p className="font-sf-pro text-apple-subhead text-secondary">
                    視覚的な階層が適切に表現されています
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* タイポグラフィ */}
        <section>
          <h2 className="font-sf-pro text-apple-title-1 font-sf-semibold text-primary mb-apple-lg">
            Typography
          </h2>
          <Card>
            <CardContent>
              <div className="space-y-apple-md">
                <div>
                  <p className="font-sf-pro text-apple-large-title text-primary">
                    Large Title
                  </p>
                  <p className="font-sf-pro text-apple-caption-1 text-tertiary">
                    34px / 41px line-height
                  </p>
                </div>
                <div className="separator-apple" />
                <div>
                  <p className="font-sf-pro text-apple-title-1 text-primary">Title 1</p>
                  <p className="font-sf-pro text-apple-caption-1 text-tertiary">
                    28px / 34px line-height
                  </p>
                </div>
                <div className="separator-apple" />
                <div>
                  <p className="font-sf-pro text-apple-title-2 text-primary">Title 2</p>
                  <p className="font-sf-pro text-apple-caption-1 text-tertiary">
                    22px / 28px line-height
                  </p>
                </div>
                <div className="separator-apple" />
                <div>
                  <p className="font-sf-pro text-apple-title-3 text-primary">Title 3</p>
                  <p className="font-sf-pro text-apple-caption-1 text-tertiary">
                    20px / 25px line-height
                  </p>
                </div>
                <div className="separator-apple" />
                <div>
                  <p className="font-sf-pro text-apple-headline text-primary">Headline</p>
                  <p className="font-sf-pro text-apple-caption-1 text-tertiary">
                    17px / 22px line-height / Semibold
                  </p>
                </div>
                <div className="separator-apple" />
                <div>
                  <p className="font-sf-pro text-apple-body text-primary">
                    Body - これは本文テキストです。読みやすさを重視しています。
                  </p>
                  <p className="font-sf-pro text-apple-caption-1 text-tertiary">
                    17px / 22px line-height
                  </p>
                </div>
                <div className="separator-apple" />
                <div>
                  <p className="font-sf-pro text-apple-callout text-primary">Callout</p>
                  <p className="font-sf-pro text-apple-caption-1 text-tertiary">
                    16px / 21px line-height
                  </p>
                </div>
                <div className="separator-apple" />
                <div>
                  <p className="font-sf-pro text-apple-subhead text-primary">Subhead</p>
                  <p className="font-sf-pro text-apple-caption-1 text-tertiary">
                    15px / 20px line-height
                  </p>
                </div>
                <div className="separator-apple" />
                <div>
                  <p className="font-sf-pro text-apple-footnote text-primary">Footnote</p>
                  <p className="font-sf-pro text-apple-caption-1 text-tertiary">
                    13px / 18px line-height
                  </p>
                </div>
                <div className="separator-apple" />
                <div>
                  <p className="font-sf-pro text-apple-caption-1 text-primary">Caption 1</p>
                  <p className="font-sf-pro text-apple-caption-2 text-tertiary">
                    12px / 16px line-height
                  </p>
                </div>
                <div className="separator-apple" />
                <div>
                  <p className="font-sf-pro text-apple-caption-2 text-primary">Caption 2</p>
                  <p className="font-sf-pro text-apple-caption-2 text-tertiary">
                    11px / 13px line-height
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* カラーシステム */}
        <section>
          <h2 className="font-sf-pro text-apple-title-1 font-sf-semibold text-primary mb-apple-lg">
            Color System
          </h2>
          <div className="grid grid-cols-1 apple-tablet:grid-cols-2 gap-apple-base">
            {/* システムカラー */}
            <Card>
              <CardHeader>
                <CardTitle>System Colors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-apple-sm">
                  <ColorSwatch color="blue" label="Blue" />
                  <ColorSwatch color="green" label="Green" />
                  <ColorSwatch color="red" label="Red" />
                  <ColorSwatch color="orange" label="Orange" />
                  <ColorSwatch color="purple" label="Purple" />
                  <ColorSwatch color="pink" label="Pink" />
                  <ColorSwatch color="teal" label="Teal" />
                  <ColorSwatch color="yellow" label="Yellow" />
                  <ColorSwatch color="indigo" label="Indigo" />
                </div>
              </CardContent>
            </Card>

            {/* テキストカラー階層 */}
            <Card>
              <CardHeader>
                <CardTitle>Text Hierarchy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-apple-md">
                  <div>
                    <p className="text-primary font-sf-pro text-apple-body">
                      Primary Label
                    </p>
                    <p className="font-sf-pro text-apple-caption-1 text-tertiary">
                      メインコンテンツ用
                    </p>
                  </div>
                  <div>
                    <p className="text-secondary font-sf-pro text-apple-body">
                      Secondary Label
                    </p>
                    <p className="font-sf-pro text-apple-caption-1 text-tertiary">
                      サブコンテンツ用
                    </p>
                  </div>
                  <div>
                    <p className="text-tertiary font-sf-pro text-apple-body">
                      Tertiary Label
                    </p>
                    <p className="font-sf-pro text-apple-caption-1 text-tertiary">
                      補助テキスト用
                    </p>
                  </div>
                  <div>
                    <p className="text-quaternary font-sf-pro text-apple-body">
                      Quaternary Label
                    </p>
                    <p className="font-sf-pro text-apple-caption-1 text-tertiary">
                      最小強調用
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ボタン */}
        <section>
          <h2 className="font-sf-pro text-apple-title-1 font-sf-semibold text-primary mb-apple-lg">
            Buttons
          </h2>
          <div className="grid grid-cols-1 apple-tablet:grid-cols-2 gap-apple-base">
            <Card>
              <CardHeader>
                <CardTitle>Button Variants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-apple-md">
                  <Button variant="primary">Primary Button</Button>
                  <Button variant="secondary">Secondary Button</Button>
                  <Button variant="text">Text Button</Button>
                  <Button variant="capsule">Capsule Button</Button>
                  <Button variant="destructive">Destructive Button</Button>
                  <Button variant="primary" loading>
                    Loading Button
                  </Button>
                  <Button variant="primary" disabled>
                    Disabled Button
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Button Sizes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-apple-md">
                  <Button variant="primary" size="small">
                    Small Button
                  </Button>
                  <Button variant="primary" size="medium">
                    Medium Button
                  </Button>
                  <Button variant="primary" size="large">
                    Large Button
                  </Button>
                  <Button variant="primary" fullWidth>
                    Full Width Button
                  </Button>
                  <ButtonGroup>
                    <Button variant="secondary">Left</Button>
                    <Button variant="secondary">Center</Button>
                    <Button variant="secondary">Right</Button>
                  </ButtonGroup>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* フォーム */}
        <section>
          <h2 className="font-sf-pro text-apple-title-1 font-sf-semibold text-primary mb-apple-lg">
            Form Elements
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>サンプルフォーム</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-apple-base">
                <Input
                  label="メールアドレス"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={emailError}
                  leftIcon={
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  }
                />

                <Input
                  label="パスワード"
                  type="password"
                  placeholder="8文字以上"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText="8文字以上の英数字を含む必要があります"
                />

                <TextArea
                  label="メッセージ"
                  placeholder="メッセージを入力してください..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  helperText="最大500文字まで入力できます"
                />

                <Checkbox
                  label="利用規約に同意します"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                />

                <div className="space-y-apple-sm">
                  <p className="font-sf-pro text-apple-subhead text-secondary">
                    通知設定
                  </p>
                  <Radio
                    name="notifications"
                    label="すべての通知を受け取る"
                    value="option1"
                    checked={selectedRadio === 'option1'}
                    onChange={(e) => setSelectedRadio(e.target.value)}
                  />
                  <Radio
                    name="notifications"
                    label="重要な通知のみ受け取る"
                    value="option2"
                    checked={selectedRadio === 'option2'}
                    onChange={(e) => setSelectedRadio(e.target.value)}
                  />
                  <Radio
                    name="notifications"
                    label="通知を受け取らない"
                    value="option3"
                    checked={selectedRadio === 'option3'}
                    onChange={(e) => setSelectedRadio(e.target.value)}
                  />
                </div>

                <ButtonGroup>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={loading}
                    disabled={!isChecked}
                  >
                    送信
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEmail('');
                      setPassword('');
                      setMessage('');
                      setIsChecked(false);
                      setEmailError('');
                    }}
                  >
                    リセット
                  </Button>
                </ButtonGroup>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* カード例 */}
        <section>
          <h2 className="font-sf-pro text-apple-title-1 font-sf-semibold text-primary mb-apple-lg">
            Cards
          </h2>
          <div className="grid grid-cols-1 apple-tablet:grid-cols-2 apple-desktop:grid-cols-3 gap-apple-base">
            <Card hover>
              <CardHeader>
                <CardTitle>ホバー可能なカード</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  マウスをホバーすると影が変化します。
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button variant="text" size="small">
                  詳細を見る
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>標準カード</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  20pxの角丸を使用した標準的なカードコンポーネントです。
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>アクション付きカード</CardTitle>
                <Button variant="text" size="small">
                  編集
                </Button>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  ヘッダーにアクションボタンを配置できます。
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* アクセシビリティ情報 */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Accessibility (WCAG 2.1 AA準拠)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-apple-sm font-sf-pro text-apple-body text-secondary list-disc list-inside">
                <li>すべてのインタラクティブ要素は44×44pxの最小タッチターゲットを確保</li>
                <li>カラーコントラスト比は通常テキストで4.5:1以上</li>
                <li>キーボードナビゲーション対応</li>
                <li>フォーカスインジケーターの明確な表示</li>
                <li>スクリーンリーダー対応（ARIA属性の適切な使用）</li>
                <li>Reduce Motion設定への対応</li>
                <li>色のみに依存しない情報伝達</li>
              </ul>
            </CardContent>
          </Card>
        </section>

      </main>

      {/* フッター */}
      <footer className="bg-primary border-t border-apple-separator-light dark:border-apple-separator-dark mt-apple-4xl">
        <div className="max-w-apple-wide mx-auto px-apple-base py-apple-xl">
          <p className="font-sf-pro text-apple-footnote text-tertiary text-center">
            Built with Apple Human Interface Guidelines 2024-2025 • Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  );
};

// カラースウォッチコンポーネント
const ColorSwatch: React.FC<{ color: string; label: string }> = ({ color, label }) => {
  return (
    <div className="flex items-center gap-apple-md">
      <div
        className={`w-10 h-10 rounded-apple-button shadow-apple-button bg-apple-${color}-light dark:bg-apple-${color}-dark`}
      />
      <div className="flex-1">
        <p className="font-sf-pro text-apple-body text-primary">{label}</p>
        <p className="font-sf-pro text-apple-caption-1 text-tertiary">
          System {label}
        </p>
      </div>
    </div>
  );
};
