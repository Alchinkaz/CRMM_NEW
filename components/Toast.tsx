
import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 min-w-[300px] max-w-sm px-4 py-3 rounded-2xl shadow-lg border backdrop-blur-md animate-in slide-in-from-right-full fade-in duration-300 ${
              toast.type === 'success' ? 'bg-white/90 border-green-200 text-green-800 dark:bg-slate-800/90 dark:border-green-900/50 dark:text-green-300' :
              toast.type === 'error' ? 'bg-white/90 border-red-200 text-red-800 dark:bg-slate-800/90 dark:border-red-900/50 dark:text-red-300' :
              toast.type === 'warning' ? 'bg-white/90 border-yellow-200 text-yellow-800 dark:bg-slate-800/90 dark:border-yellow-900/50 dark:text-yellow-300' :
              'bg-white/90 border-blue-200 text-blue-800 dark:bg-slate-800/90 dark:border-blue-900/50 dark:text-blue-300'
            }`}
          >
            <div className="shrink-0">
                {toast.type === 'success' && <CheckCircle size={20} />}
                {toast.type === 'error' && <AlertOctagon size={20} />}
                {toast.type === 'warning' && <AlertTriangle size={20} />}
                {toast.type === 'info' && <Info size={20} />}
            </div>
            <div className="flex-1 text-sm font-medium">{toast.message}</div>
            <button 
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
            >
                <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
