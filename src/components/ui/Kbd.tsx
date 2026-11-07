import React from "react";

export type KbdProps = React.HTMLAttributes<HTMLElement>;

export function Kbd({ children, className = "", ...props }: KbdProps) {
  return (
    <kbd
      className={`inline-flex items-center justify-center px-1.5 py-0.5 font-mono text-[11px] font-medium bg-[#f5f1e8] border border-[#ddd5c4] rounded-none text-[#5e574c] select-none uppercase tracking-[0.04em] ${className}`}
      {...props}
    >
      {children}
    </kbd>
  );
}
