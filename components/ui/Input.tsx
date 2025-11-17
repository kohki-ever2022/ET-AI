import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * Apple HIG準拠の入力フィールドコンポーネント
 * - 最小タッチターゲット: 44px高さ
 * - フォーカスインジケーター付き
 * - エラー状態のサポート
 * - アクセシビリティ対応
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = true,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substring(7)}`;
    const hasError = !!error;

    return (
      <div className={`space-y-2 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="font-sf-pro text-apple-subhead text-secondary block"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-apple-md top-1/2 -translate-y-1/2 text-tertiary">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`${hasError ? 'input-apple-error' : 'input-apple'} ${
              leftIcon ? 'pl-12' : ''
            } ${rightIcon ? 'pr-12' : ''} ${className}`}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-apple-md top-1/2 -translate-y-1/2 text-tertiary">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            className="font-sf-pro text-apple-footnote text-system-red"
            role="alert"
          >
            {error}
          </p>
        )}

        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="font-sf-pro text-apple-footnote text-tertiary"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/**
 * テキストエリアコンポーネント
 */
export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = true,
      className = '',
      id,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substring(7)}`;
    const hasError = !!error;

    return (
      <div className={`space-y-2 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={textareaId}
            className="font-sf-pro text-apple-subhead text-secondary block"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`${hasError ? 'input-apple-error' : 'input-apple'} resize-y ${className}`}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
          }
          {...props}
        />

        {error && (
          <p
            id={`${textareaId}-error`}
            className="font-sf-pro text-apple-footnote text-system-red"
            role="alert"
          >
            {error}
          </p>
        )}

        {helperText && !error && (
          <p
            id={`${textareaId}-helper`}
            className="font-sf-pro text-apple-footnote text-tertiary"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

/**
 * チェックボックスコンポーネント
 */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substring(7)}`;

    return (
      <div className="flex items-center gap-apple-sm">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className={`min-w-[20px] min-h-[20px] rounded-apple-button-lg border-2 border-apple-gray3-light dark:border-apple-gray3-dark text-apple-blue-light dark:text-apple-blue-dark focus:ring-2 focus:ring-apple-blue-light dark:focus:ring-apple-blue-dark focus:ring-offset-2 transition-colors ${className}`}
          {...props}
        />
        {label && (
          <label
            htmlFor={checkboxId}
            className="font-sf-pro text-apple-body text-primary cursor-pointer select-none"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

/**
 * ラジオボタンコンポーネント
 */
export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const radioId = id || `radio-${Math.random().toString(36).substring(7)}`;

    return (
      <div className="flex items-center gap-apple-sm">
        <input
          ref={ref}
          type="radio"
          id={radioId}
          className={`min-w-[20px] min-h-[20px] border-2 border-apple-gray3-light dark:border-apple-gray3-dark text-apple-blue-light dark:text-apple-blue-dark focus:ring-2 focus:ring-apple-blue-light dark:focus:ring-apple-blue-dark focus:ring-offset-2 transition-colors ${className}`}
          {...props}
        />
        {label && (
          <label
            htmlFor={radioId}
            className="font-sf-pro text-apple-body text-primary cursor-pointer select-none"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';
