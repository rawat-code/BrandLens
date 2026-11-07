import React, { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5e574c]">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full bg-[#fffdf8] text-[#1f1c18] placeholder-[#5e574c]/70 border rounded-none px-3 py-2 text-sm transition-opacity duration-120 focus:border-[#1f1c18] focus:outline-2 focus:outline-[#1f1c18] focus:outline-offset-1 disabled:opacity-50 disabled:bg-[#f5f1e8] ${
            icon ? "pl-9" : ""
          } ${
            error
              ? "border-[#b3261e] focus:border-[#b3261e] focus:outline-[#b3261e]"
              : "border-[#ddd5c4] hover:border-[#1f1c18]"
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 font-mono text-[11px] text-[#b3261e] uppercase tracking-[0.04em]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <textarea
          ref={ref}
          className={`w-full bg-[#fffdf8] text-[#1f1c18] placeholder-[#5e574c]/70 border rounded-none px-3.5 py-2.5 text-sm leading-relaxed transition-opacity duration-120 focus:border-[#1f1c18] focus:outline-2 focus:outline-[#1f1c18] focus:outline-offset-1 disabled:opacity-50 disabled:bg-[#f5f1e8] resize-y ${
            error
              ? "border-[#b3261e] focus:border-[#b3261e] focus:outline-[#b3261e]"
              : "border-[#ddd5c4] hover:border-[#1f1c18]"
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 font-mono text-[11px] text-[#b3261e] uppercase tracking-[0.04em]">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", error, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={`w-full bg-[#fffdf8] text-[#1f1c18] border rounded-none pl-3.5 pr-9 py-2 text-sm transition-opacity duration-120 focus:border-[#1f1c18] focus:outline-2 focus:outline-[#1f1c18] focus:outline-offset-1 disabled:opacity-50 disabled:bg-[#f5f1e8] appearance-none cursor-pointer ${
            error
              ? "border-[#b3261e] focus:border-[#b3261e] focus:outline-[#b3261e]"
              : "border-[#ddd5c4] hover:border-[#1f1c18]"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#5e574c]">
          <svg
            className="w-4 h-4 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
        {error && <p className="mt-1 font-mono text-[11px] text-[#b3261e] uppercase tracking-[0.04em]">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
