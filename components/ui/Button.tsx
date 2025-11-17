import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text' | 'capsule' | 'destructive';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

/**
 * Apple HIG準拠のボタンコンポーネント
 * - 最小タッチターゲット: 44×44px
 * - システムカラーとセマンティックカラーの使用
 * - アクセシビリティ対応（WCAG 2.1 AA）
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  const baseClasses = 'btn-apple-base';

  const variantClasses = {
    primary: 'btn-apple-primary',
    secondary: 'btn-apple-secondary',
    text: 'btn-apple-text',
    capsule: 'btn-apple-capsule',
    destructive: 'btn-apple-primary bg-apple-red-light dark:bg-apple-red-dark hover:opacity-90',
  };

  const sizeClasses = {
    small: 'px-apple-md py-2 text-apple-subhead',
    medium: 'px-apple-lg py-3 text-apple-body',
    large: 'px-apple-xl py-4 text-apple-headline',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled || loading ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${disabledClass} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <LoadingSpinner />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
};

const LoadingSpinner: React.FC = () => (
  <svg
    className="animate-spin h-5 w-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/**
 * ボタングループコンポーネント
 */
export interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex gap-apple-sm ${className}`} role="group">
      {children}
    </div>
  );
};
