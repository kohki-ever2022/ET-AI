import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Apple HIG準拠のカードコンポーネント
 * - 20px角丸（連続コーナー近似）
 * - セマンティック背景色
 * - オプショナルなホバー効果
 */
export const Card: React.FC<CardProps> = ({
  children,
  hover = false,
  className = '',
  onClick,
}) => {
  const hoverClass = hover ? 'card-apple-hover' : 'card-apple';
  const clickableClass = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={`${hoverClass} ${clickableClass} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
};

/**
 * カードヘッダー
 */
export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = '',
  action,
}) => {
  return (
    <div
      className={`p-apple-base border-b border-apple-separator-light dark:border-apple-separator-dark flex items-center justify-between ${className}`}
    >
      <div className="flex-1">{children}</div>
      {action && <div className="ml-apple-md">{action}</div>}
    </div>
  );
};

/**
 * カードコンテンツ
 */
export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = '',
}) => {
  return <div className={`p-apple-base space-y-apple-md ${className}`}>{children}</div>;
};

/**
 * カードフッター
 */
export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`p-apple-base border-t border-apple-separator-light dark:border-apple-separator-dark ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * カードタイトル
 */
export interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '' }) => {
  return (
    <h3 className={`font-sf-pro text-apple-headline text-primary ${className}`}>
      {children}
    </h3>
  );
};

/**
 * カード説明文
 */
export interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({
  children,
  className = '',
}) => {
  return (
    <p className={`font-sf-pro text-apple-body text-secondary ${className}`}>
      {children}
    </p>
  );
};
