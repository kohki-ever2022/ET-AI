import React, { useEffect, useState } from 'react';

/**
 * ダークモード切り替えコンポーネント
 * - システム設定の検出
 * - ローカルストレージへの保存
 * - スムーズなトランジション
 */
export const DarkModeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // 初期化：ローカルストレージまたはシステム設定から読み込み
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    setIsDark(shouldBeDark);
    updateTheme(shouldBeDark);

    // システムのカラースキーム変更を監視
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setIsDark(e.matches);
        updateTheme(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const updateTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    updateTheme(newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className="min-h-touch min-w-touch p-3 rounded-apple-button-lg hover:bg-apple-fill-quaternary-light dark:hover:bg-apple-fill-quaternary-dark transition-colors duration-apple-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue-light dark:focus-visible:ring-apple-blue-dark focus-visible:ring-offset-2"
      aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
      title={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
};

const SunIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 text-apple-yellow-light dark:text-apple-yellow-dark transition-colors"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const MoonIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 text-apple-indigo-light dark:text-apple-indigo-dark transition-colors"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
);

/**
 * シンプルなトグルスイッチ版のダークモード切り替え
 */
export const DarkModeSwitch: React.FC = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-8 w-14 items-center rounded-apple-capsule transition-colors duration-apple-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue-light dark:focus-visible:ring-apple-blue-dark focus-visible:ring-offset-2 ${
        isDark
          ? 'bg-apple-blue-light dark:bg-apple-blue-dark'
          : 'bg-apple-fill-tertiary-light dark:bg-apple-fill-tertiary-dark'
      }`}
      role="switch"
      aria-checked={isDark}
      aria-label="ダークモード切り替え"
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-apple-button transition-transform duration-apple-normal ${
          isDark ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  );
};
