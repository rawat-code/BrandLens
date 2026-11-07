import React from "react";

export type StatusState =
  | "draft"
  | "ai_reviewed"
  | "needs_changes"
  | "in_review"
  | "approved"
  | "rejected"
  | "published";

export type FindingStatusState =
  | "open"
  | "accepted"
  | "disputed"
  | "dismissed"
  | "resolved";

export type BadgeVariant =
  | "high"
  | "medium"
  | "low"
  | "success"
  | "neutral"
  | "ai"
  | StatusState
  | FindingStatusState;

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
  // Styles based on Redline tokens (square, 1px border, ink/paper)
  const variantStyles: Record<BadgeVariant, string> = {
    high: "bg-[#fffdf8] text-[#b3261e] border-[#b3261e]",
    medium: "bg-[#f6e3b4] text-[#8a5a00] border-[#8a5a00]",
    low: "bg-[#fffdf8] text-[#1d4f9c] border-[#1d4f9c]",
    success: "bg-[#fffdf8] text-[#1f6b3a] border-[#1f6b3a]",
    neutral: "bg-[#fffdf8] text-[#5e574c] border-[#ddd5c4]",
    ai: "bg-[#f5f1e8] text-[#1f1c18] border-[#1f1c18]",

    // Status chips
    draft: "bg-[#fffdf8] text-[#5e574c] border-[#ddd5c4]",
    ai_reviewed: "bg-[#fffdf8] text-[#1d4f9c] border-[#1d4f9c]",
    needs_changes: "bg-[#f6e3b4] text-[#8a5a00] border-[#8a5a00]",
    in_review: "bg-[#fffdf8] text-[#1f1c18] border-[#1f1c18]",
    approved: "bg-[#fffdf8] text-[#1f6b3a] border-[#1f6b3a]",
    rejected: "bg-[#fffdf8] text-[#b3261e] border-[#b3261e]",
    published: "bg-[#1f1c18] text-[#f5f1e8] border-[#1f1c18]",

    // Finding statuses
    open: "bg-[#fffdf8] text-[#1f1c18] border-[#1f1c18]",
    accepted: "bg-[#fffdf8] text-[#1f6b3a] border-[#1f6b3a]",
    disputed: "bg-[#f6e3b4] text-[#8a5a00] border-[#8a5a00]",
    dismissed: "bg-[#fffdf8] text-[#5e574c] border-[#ddd5c4]",
    resolved: "bg-[#fffdf8] text-[#1f6b3a] border-[#1f6b3a]",
  };

  const defaultIcons: Record<BadgeVariant, React.ReactNode> = {
    // Draft: empty circle
    draft: (
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="5" cy="5" r="3.75" />
      </svg>
    ),
    // AI reviewed: half circle
    ai_reviewed: (
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
        <path d="M5 1A4 4 0 0 0 5 9V1Z" />
        <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
    // Needs changes: triangle
    needs_changes: (
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
        <path d="M5 1.5L9 8.5H1L5 1.5Z" />
      </svg>
    ),
    // In review: filled circle
    in_review: (
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
        <circle cx="5" cy="5" r="4" />
      </svg>
    ),
    // Approved: check
    approved: (
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path d="M1.5 5.2L3.8 7.5L8.5 2.5" />
      </svg>
    ),
    // Rejected: cross
    rejected: (
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path d="M2 2L8 8M8 2L2 8" />
      </svg>
    ),
    // Published: filled square
    published: (
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
        <rect x="1.5" y="1.5" width="7" height="7" />
      </svg>
    ),

    // Finding statuses
    open: (
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="5" cy="5" r="3.75" />
      </svg>
    ),
    accepted: (
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path d="M1.5 5.2L3.8 7.5L8.5 2.5" />
      </svg>
    ),
    disputed: (
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
        <path d="M5 1.5L9 8.5H1L5 1.5Z" />
      </svg>
    ),
    dismissed: (
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <line x1="2" y1="5" x2="8" y2="5" />
      </svg>
    ),
    resolved: (
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path d="M1.5 5.2L3.8 7.5L8.5 2.5" />
      </svg>
    ),

    // Severities
    high: (
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
        <rect x="1" y="1" width="8" height="8" />
      </svg>
    ),
    medium: (
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
        <polygon points="5,1 9,8 1,8" />
      </svg>
    ),
    low: (
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="5" cy="5" r="3.5" />
      </svg>
    ),
    success: (
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path d="M1.5 5.2L3.8 7.5L8.5 2.5" />
      </svg>
    ),
    neutral: (
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <line x1="2" y1="5" x2="8" y2="5" />
      </svg>
    ),
    ai: (
      <span className="font-mono text-[9px] font-semibold">AI</span>
    ),
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-[11px] font-medium tracking-[0.04em] uppercase border rounded-none select-none ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon !== undefined ? icon : defaultIcons[variant]}
      <span>{children}</span>
    </span>
  );
}
