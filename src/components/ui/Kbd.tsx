import React from "react";

export type KbdProps = React.HTMLAttributes<HTMLElement>;

export function Kbd({ children, className = "", ...props }: KbdProps) {
  return (
    <kbd
      className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-mono font-medium bg-[#171724] border border-white/10 rounded text-[#a3a3bb] shadow-sm select-none ${className}`}
      {...props}
    >
      {children}
    </kbd>
  );
}
