import React from "react";
import Link from "next/link";

export interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  actions,
  children,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`pb-5 mb-6 border-b border-white/[0.08] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs text-[#a3a3bb] hover:text-[#ececf6] mb-2 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>{backLabel}</span>
          </Link>
        )}
        <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#ececf6] tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[#a3a3bb]">{description}</p>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 shrink-0">{actions}</div>
      )}
    </div>
  );
}
