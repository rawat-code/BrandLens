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
      className={`pb-5 border-b border-[#ddd5c4] flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between ${className}`}
    >
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs text-[#5e574c] hover:text-[#1f1c18] mb-2 transition-colors duration-120"
          >
            <span>←</span>
            <span>{backLabel}</span>
          </Link>
        )}
        <h1 className="font-serif text-[38px] font-medium text-[#1f1c18] tracking-normal leading-[1.1]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[13px] text-[#5e574c]">{description}</p>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0">{actions}</div>
      )}
    </div>
  );
}
