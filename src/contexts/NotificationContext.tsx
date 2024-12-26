import React, { createContext, useContext, useCallback, useState } from 'react';
import { ToastContainer } from '../components/ui/ToastContainer';
import type { ToastProps } from '../components/ui/Toast';

interface NotificationContextType {
  showNotification: (props: Omit<ToastProps, 'id' | 'onClose'>) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showNotification = useCallback((props: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substring(2);
    setToasts(prev => [...prev, { ...props, id, onClose: removeToast }]);
  }, [removeToast]);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}