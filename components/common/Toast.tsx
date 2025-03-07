"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Toast {
  id: number;
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = new Date().getTime();
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-md shadow-md transition-all animate-in fade-in slide-in-from-right-5 ${toast.variant === 'destructive'
              ? 'bg-red-100 border-l-4 border-red-500 text-red-700'
              : 'bg-green-100 border-l-4 border-green-500 text-green-700'
              }`}
          >
            <div className="flex justify-between">
              <h3 className="font-semibold">{toast.title}</h3>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <p className="text-sm">{toast.description}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}; 