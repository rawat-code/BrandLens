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
      "inline-flex items-center justify-center font-medium transition-opacity duration-120 select-none disabled:opacity-40 disabled:pointer-events-none cursor-pointer rounded-none";

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-[#1f1c18] hover:bg-[#1f1c18]/90 text-[#f5f1e8] border border-[#1f1c18] focus-visible:ring-1 focus-visible:ring-[#f5f1e8] focus-visible:ring-inset",
      secondary:
        "bg-[#fffdf8] hover:bg-[#f5f1e8] text-[#1f1c18] border border-[#1f1c18]",
      ghost:
        "bg-transparent hover:bg-[#ddd5c4]/30 text-[#1f1c18]",
      danger:
        "bg-[#fffdf8] hover:bg-[#b3261e]/10 text-[#b3261e] border border-[#b3261e]",
      subtle:
        "bg-[#fffdf8] hover:bg-[#f5f1e8] text-[#1f1c18] border border-[#ddd5c4]",
      link: "bg-transparent text-[#1f1c18] underline underline-offset-4 hover:text-[#5e574c] p-0 h-auto font-normal",
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: "text-xs px-2.5 py-1 gap-1.5",
      md: "text-sm px-3.5 py-1.5 gap-2",
      lg: "text-base px-4 py-2 gap-2.5",
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
