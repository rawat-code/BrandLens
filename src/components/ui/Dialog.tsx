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
      {/* Backdrop without glass blur */}
      <div
        className="fixed inset-0 bg-[#1f1c18]/40 transition-opacity duration-120"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Surface - Paper sheet with square corners and 1px border */}
      <div
        ref={dialogRef}
        className={`relative w-full ${widthClass} bg-[#fffdf8] border border-[#ddd5c4] rounded-none z-10 overflow-hidden shadow-none transition-opacity duration-120`}
      >
        <div className="px-5 py-4 border-b border-[#ddd5c4] flex items-center justify-between">
          <div>
            {title && (
              <h2
                id="dialog-title"
                className="font-serif text-xl font-normal text-[#1f1c18]"
              >
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-[#5e574c]">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#5e574c] hover:text-[#1f1c18] p-1 rounded-none hover:bg-[#f5f1e8] transition-colors cursor-pointer"
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
