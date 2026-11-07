"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type ToastType = "info" | "success" | "warning" | "error";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (message: string) => {
        if (typeof window !== "undefined") {
          console.log(`[Toast]: ${message}`);
        }
      },
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          const borderStyle = {
            info: "border-[#1f1c18] text-[#1f1c18]",
            success: "border-[#1f6b3a] text-[#1f6b3a]",
            warning: "border-[#8a5a00] text-[#8a5a00]",
            error: "border-[#b3261e] text-[#b3261e]",
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 bg-[#fffdf8] border ${borderStyle} rounded-none shadow-none text-sm flex items-start justify-between gap-3 transition-opacity duration-120`}
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-current shrink-0" />
                <span className="text-[#1f1c18]">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-[#5e574c] hover:text-[#1f1c18] shrink-0 p-0.5 rounded-none"
                aria-label="Dismiss message"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
