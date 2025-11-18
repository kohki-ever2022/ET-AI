import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { XIcon } from '../Icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: ToastType, message: string, duration: number = 5000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { id, type, message, duration };

    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onClose: (id: string) => void }> = ({ toasts, onClose }) => {
  return (
    <div
      className="fixed bottom-0 right-0 z-[100] p-apple-base flex flex-col gap-apple-sm pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const bgColor = {
    success: 'bg-apple-green-light dark:bg-apple-green-dark',
    error: 'bg-apple-red-light dark:bg-apple-red-dark',
    warning: 'bg-apple-orange-light dark:bg-apple-orange-dark',
    info: 'bg-apple-blue-light dark:bg-apple-blue-dark',
  }[toast.type];

  const icon = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }[toast.type];

  return (
    <div
      role="alert"
      className={`
        pointer-events-auto
        flex items-center gap-apple-md
        min-w-[300px] max-w-md
        px-apple-base py-apple-md
        ${bgColor} text-white
        rounded-apple-button-lg
        shadow-apple-floating
        backdrop-blur-lg
        transform transition-all duration-300 motion-reduce:transition-none
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
    >
      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center font-sf-semibold text-apple-title-3">
        {icon}
      </div>
      <p className="flex-1 text-apple-body font-sf-pro">{toast.message}</p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors motion-reduce:transition-none"
        aria-label="閉じる"
      >
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};
