import React from "react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-none border border-[#ddd5c4] bg-[#fffdf8] ${className}`}
    >
      {icon && (
        <div className="w-10 h-10 rounded-none bg-[#f5f1e8] border border-[#ddd5c4] flex items-center justify-center text-[#5e574c] mb-3">
          {icon}
        </div>
      )}
      <h3 className="font-serif text-lg font-normal text-[#1f1c18]">{title}</h3>
      <p className="mt-1 text-xs text-[#5e574c] max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
