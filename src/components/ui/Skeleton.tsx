import React from "react";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-[#171724] border border-white/[0.04] rounded-md ${className}`}
      {...props}
    />
  );
}
