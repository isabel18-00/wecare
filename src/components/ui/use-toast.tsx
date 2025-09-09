'use client';

import * as React from 'react';

type ToastVariant = 'default' | 'destructive';

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastContextType = {
  toasts: Toast[];
  toast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const showToast = React.useCallback(({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((currentToasts) => [...currentToasts, { id, title, description, variant }]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const value = React.useMemo(
    () => ({
      toasts,
      toast: showToast,
      dismissToast,
    }),
    [toasts, showToast, dismissToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

type ToastViewportProps = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center justify-between p-4 rounded-md shadow-lg min-w-[300px] ${
            toast.variant === 'destructive' ? 'bg-red-100 text-red-700' : 'bg-white text-gray-900'
          }`}
        >
          <div>
            <p className="font-medium">{toast.title}</p>
            {toast.description && <p className="text-sm">{toast.description}</p>}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="ml-4 text-gray-500 hover:text-gray-700"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
