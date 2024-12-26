import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export function Toast({ id, type, message, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const colors = {
    success: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200',
    error: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200',
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
  }[type];

  return (
    <div
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={`flex items-center justify-between p-4 rounded-lg shadow-lg ${colors}`}
    >
      <span>{message}</span>
      <button
        onClick={() => onClose(id)}
        className="ml-4 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}