import React, { forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle" | "link";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "secondary",
      size = "md",
      isLoading = false,
      icon,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center font-medium transition-colors select-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-sm shadow-indigo-950/40 border border-indigo-400/30 active:scale-[0.98]",
      secondary:
        "bg-[#171724] hover:bg-[#1d1d2e] text-[#ececf6] border border-white/10 active:scale-[0.98]",
      ghost:
        "bg-transparent hover:bg-[#171724] text-[#a3a3bb] hover:text-[#ececf6] active:scale-[0.98]",
      danger:
        "bg-rose-500/10 hover:bg-rose-500/20 text-[#ff7a8a] border border-rose-500/25 active:scale-[0.98]",
      subtle:
        "bg-[#11111a] hover:bg-[#171724] text-[#ececf6] border border-white/5 active:scale-[0.98]",
      link: "bg-transparent text-[#a5b4fc] hover:underline p-0 h-auto font-normal",
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: "text-xs px-2.5 py-1 rounded-md gap-1.5",
      md: "text-sm px-3.5 py-1.5 rounded-lg gap-2",
      lg: "text-base px-4 py-2 rounded-lg gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${base} ${variantStyles[variant]} ${variant !== "link" ? sizeStyles[size] : ""} ${className}`}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

