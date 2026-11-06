"use client";

import React, { useEffect, useRef } from "react";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  }[maxWidth];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "dialog-title" : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0a0a10]/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Surface */}
      <div
        ref={dialogRef}
        className={`relative w-full ${widthClass} bg-[#171724] border border-white/[0.12] rounded-xl shadow-2xl shadow-black/80 z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
      >
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            {title && (
              <h2
                id="dialog-title"
                className="text-base font-medium text-[#ececf6]"
              >
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-[#a3a3bb]">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#a3a3bb] hover:text-[#ececf6] p-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <svg
              className="w-4 h-4"
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
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

