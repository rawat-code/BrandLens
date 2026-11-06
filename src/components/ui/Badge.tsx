import React from "react";

export type BadgeVariant =
  | "high"
  | "medium"
  | "low"
  | "success"
  | "neutral"
  | "indigo"
  | "ai";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

export function Badge({
  variant = "neutral",
  icon,
  children,
  className = "",
  ...props
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    high: "bg-[#ff7a8a]/10 text-[#ff7a8a] border-[#ff7a8a]/30",
    medium: "bg-[#f5b74f]/10 text-[#f5b74f] border-[#f5b74f]/30",
    low: "bg-[#7fb4ff]/10 text-[#7fb4ff] border-[#7fb4ff]/30",
    success: "bg-[#5fd1a0]/10 text-[#5fd1a0] border-[#5fd1a0]/30",
    neutral: "bg-[#a3a3bb]/10 text-[#a3a3bb] border-[#a3a3bb]/25",
    indigo: "bg-indigo-500/10 text-[#a5b4fc] border-indigo-500/30",
    ai: "bg-indigo-500/15 text-[#c7d2fe] border-indigo-400/35",
  };

  const defaultIcons: Record<BadgeVariant, React.ReactNode> = {
    high: (
      <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a8a] shrink-0" aria-hidden="true" />
    ),
    medium: (
      <span className="w-1.5 h-1.5 rounded-sm bg-[#f5b74f] shrink-0" aria-hidden="true" />
    ),
    low: (
      <span className="w-1.5 h-1.5 rounded-none bg-[#7fb4ff] shrink-0" aria-hidden="true" />
    ),
    success: (
      <svg
        className="w-2.5 h-2.5 text-[#5fd1a0] shrink-0"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M2 6l3 3 5-6" />
      </svg>
    ),
    neutral: (
      <span className="w-1.5 h-1.5 rounded-full bg-[#a3a3bb]/60 shrink-0" aria-hidden="true" />
    ),
    indigo: (
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" aria-hidden="true" />
    ),
    ai: (
      <svg
        className="w-2.5 h-2.5 text-[#a5b4fc] shrink-0"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M8 0L9.5 5.5L15 7L9.5 8.5L8 14L6.5 8.5L1 7L6.5 5.5L8 0Z" />
      </svg>
    ),
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md border ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon !== undefined ? icon : defaultIcons[variant]}
      <span>{children}</span>
    </span>
  );
}

