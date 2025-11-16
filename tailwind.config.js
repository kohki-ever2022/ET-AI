/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./AppDemo.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        apple: {
          // Label colors - 4階層の視覚的ヒエラルキー
          label: {
            light: '#000000',
            dark: '#FFFFFF'
          },
          'label-secondary': {
            light: 'rgba(60, 60, 67, 0.6)',
            dark: 'rgba(235, 235, 245, 0.6)'
          },
          'label-tertiary': {
            light: 'rgba(60, 60, 67, 0.3)',
            dark: 'rgba(235, 235, 245, 0.3)'
          },
          'label-quaternary': {
            light: 'rgba(60, 60, 67, 0.18)',
            dark: 'rgba(235, 235, 245, 0.18)'
          },

          // Background colors - 非グループ化コンテンツ用
          'bg-primary': {
            light: '#FFFFFF',
            dark: '#000000'
          },
          'bg-secondary': {
            light: '#F2F2F7',
            dark: '#1C1C1E'
          },
          'bg-tertiary': {
            light: '#FFFFFF',
            dark: '#2C2C2E'
          },

          // Grouped Background colors - グループ化コンテンツ用
          'bg-grouped-primary': {
            light: '#F2F2F7',
            dark: '#000000'
          },
          'bg-grouped-secondary': {
            light: '#FFFFFF',
            dark: '#1C1C1E'
          },
          'bg-grouped-tertiary': {
            light: '#F2F2F7',
            dark: '#2C2C2E'
          },

          // System colors - 9色のアクセントパレット
          blue: {
            light: '#007AFF',
            dark: '#0A84FF'
          },
          green: {
            light: '#34C759',
            dark: '#30D158'
          },
          red: {
            light: '#FF3B30',
            dark: '#FF453A'
          },
          orange: {
            light: '#FF9500',
            dark: '#FF9F0A'
          },
          purple: {
            light: '#AF52DE',
            dark: '#BF5AF2'
          },
          pink: {
            light: '#FF2D55',
            dark: '#FF375F'
          },
          teal: {
            light: '#5AC8FA',
            dark: '#64D2FF'
          },
          yellow: {
            light: '#FFCC00',
            dark: '#FFD60A'
          },
          indigo: {
            light: '#5856D6',
            dark: '#5E5CE6'
          },

          // Fill colors - 半透明オーバーレイ（4段階）
          'fill-primary': {
            light: 'rgba(120, 120, 128, 0.2)',
            dark: 'rgba(120, 120, 128, 0.36)'
          },
          'fill-secondary': {
            light: 'rgba(120, 120, 128, 0.16)',
            dark: 'rgba(120, 120, 128, 0.32)'
          },
          'fill-tertiary': {
            light: 'rgba(118, 118, 128, 0.12)',
            dark: 'rgba(118, 118, 128, 0.24)'
          },
          'fill-quaternary': {
            light: 'rgba(116, 116, 128, 0.08)',
            dark: 'rgba(118, 118, 128, 0.18)'
          },

          // Grays - グレースケールシステム
          gray: '#8E8E93',
          gray2: {
            light: '#AEAEB2',
            dark: '#636366'
          },
          gray3: {
            light: '#C7C7CC',
            dark: '#48484A'
          },
          gray4: {
            light: '#D1D1D6',
            dark: '#3A3A3C'
          },
          gray5: {
            light: '#E5E5EA',
            dark: '#2C2C2E'
          },
          gray6: {
            light: '#F2F2F7',
            dark: '#1C1C1E'
          },

          // Separator colors
          separator: {
            light: 'rgba(60, 60, 67, 0.29)',
            dark: 'rgba(84, 84, 88, 0.65)'
          },
          'separator-opaque': {
            light: '#C6C6C8',
            dark: '#38383A'
          },
        }
      },
      // SF Proフォントとタイポグラフィスケール（11段階）
      fontSize: {
        'apple-large-title': ['34px', { lineHeight: '41px', fontWeight: '400', letterSpacing: '0.37px' }],
        'apple-title-1': ['28px', { lineHeight: '34px', fontWeight: '400', letterSpacing: '0.36px' }],
        'apple-title-2': ['22px', { lineHeight: '28px', fontWeight: '400', letterSpacing: '0.35px' }],
        'apple-title-3': ['20px', { lineHeight: '25px', fontWeight: '400', letterSpacing: '0.38px' }],
        'apple-headline': ['17px', { lineHeight: '22px', fontWeight: '600', letterSpacing: '-0.43px' }],
        'apple-body': ['17px', { lineHeight: '22px', fontWeight: '400', letterSpacing: '-0.43px' }],
        'apple-callout': ['16px', { lineHeight: '21px', fontWeight: '400', letterSpacing: '-0.32px' }],
        'apple-subhead': ['15px', { lineHeight: '20px', fontWeight: '400', letterSpacing: '-0.24px' }],
        'apple-footnote': ['13px', { lineHeight: '18px', fontWeight: '400', letterSpacing: '-0.08px' }],
        'apple-caption-1': ['12px', { lineHeight: '16px', fontWeight: '400', letterSpacing: '0px' }],
        'apple-caption-2': ['11px', { lineHeight: '13px', fontWeight: '400', letterSpacing: '0.07px' }],
      },
      fontFamily: {
        'sf-pro': [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'SF Pro Display',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
      },
      fontWeight: {
        'sf-ultralight': '100',
        'sf-thin': '200',
        'sf-light': '300',
        'sf-regular': '400',
        'sf-medium': '500',
        'sf-semibold': '600',
        'sf-bold': '700',
        'sf-heavy': '800',
        'sf-black': '900',
      },
      // スペーシングシステム（8pxグリッド基準）
      spacing: {
        'apple-xs': '4px',     // マイクロスペーシング
        'apple-sm': '8px',     // 小
        'apple-md': '12px',    // 中
        'apple-base': '16px',  // 標準マージン/パディング
        'apple-lg': '20px',    // 大
        'apple-xl': '24px',    // セクション区切り
        'apple-2xl': '32px',   // 主要セクション区切り
        'apple-3xl': '40px',   // 大きなセクション
        'apple-4xl': '48px',   // ページ区切り
      },
      // タッチターゲット最小サイズ（44×44pt）
      minWidth: {
        'touch': '44px',
        'sidebar-min': '180px',
        'sidebar-ideal': '220px',
      },
      minHeight: {
        'touch': '44px',
      },
      width: {
        'sidebar-ideal': '220px',
        'sidebar-max': '300px',
      },
      maxWidth: {
        'sidebar-max': '300px',
        'content': '980px',
        'reading': '680px',
      },
      // 角丸（Corner Radius）の標準値
      borderRadius: {
        'apple-button': '8px',         // ボタン（小）
        'apple-button-lg': '12px',     // ボタン（大）
        'apple-card': '20px',          // カード、モーダル
        'apple-field': '10px',         // 入力フィールド
        'apple-cell': '10px',          // テーブルセル（グループ化）
        'apple-capsule': '9999px',     // カプセル型（完全な丸み）
      },
      // 影（Shadow/Elevation）の使用基準
      boxShadow: {
        'apple-card': '0 12px 24px 0 rgba(0, 0, 0, 0.15)',
        'apple-modal': '0 4px 16px 0 rgba(0, 0, 0, 0.12)',
        'apple-hover': '0 2px 8px 0 rgba(0, 0, 0, 0.08)',
        'apple-floating': '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
        'apple-button': '0 1px 4px 0 rgba(0, 0, 0, 0.1)',
      },
      // レスポンシブブレークポイント
      screens: {
        'apple-mobile': '375px',      // iPhone portrait
        'apple-tablet': '768px',      // iPad portrait, 2カラム
        'apple-desktop': '1024px',    // iPad landscape, 3カラム
        'apple-wide': '1280px',       // macOS標準
        'apple-ultrawide': '1920px',  // 大画面ディスプレイ
      },
      // アニメーション・トランジション
      transitionDuration: {
        'apple-fast': '150ms',
        'apple-normal': '250ms',
        'apple-slow': '350ms',
      },
      transitionTimingFunction: {
        'apple-ease': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        'apple-ease-in': 'cubic-bezier(0.42, 0, 1, 1)',
        'apple-ease-out': 'cubic-bezier(0, 0, 0.58, 1)',
        'apple-ease-in-out': 'cubic-bezier(0.42, 0, 0.58, 1)',
      },
      // Z-index階層
      zIndex: {
        'sidebar': '10',
        'header': '20',
        'dropdown': '30',
        'modal-backdrop': '40',
        'modal': '50',
        'popover': '60',
        'tooltip': '70',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
  ],
}
