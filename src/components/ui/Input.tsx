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
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7b7b94]">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full bg-[#171724] text-[#ececf6] placeholder-[#7b7b94] border rounded-lg px-3 py-2 text-sm transition-colors focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/40 disabled:opacity-50 disabled:bg-[#11111a] ${
            icon ? "pl-9" : ""
          } ${
            error
              ? "border-rose-500/60 focus:border-rose-400 focus:ring-rose-400/30"
              : "border-white/10 hover:border-white/15"
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-[#ff7a8a]">{error}</p>}
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
          className={`w-full bg-[#171724] text-[#ececf6] placeholder-[#7b7b94] border rounded-lg px-3.5 py-2.5 text-sm leading-relaxed transition-colors focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/40 disabled:opacity-50 disabled:bg-[#11111a] resize-y ${
            error
              ? "border-rose-500/60 focus:border-rose-400 focus:ring-rose-400/30"
              : "border-white/10 hover:border-white/15"
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-[#ff7a8a]">{error}</p>}
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
          className={`w-full bg-[#171724] text-[#ececf6] border rounded-lg pl-3.5 pr-9 py-2 text-sm transition-colors focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/40 disabled:opacity-50 disabled:bg-[#11111a] appearance-none cursor-pointer ${
            error
              ? "border-rose-500/60 focus:border-rose-400 focus:ring-rose-400/30"
              : "border-white/10 hover:border-white/15"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#7b7b94]">
          <svg
            className="w-4 h-4 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
        {error && <p className="mt-1 text-xs text-[#ff7a8a]">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

