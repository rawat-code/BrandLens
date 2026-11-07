import React from "react";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`bg-[#ddd5c4]/50 border border-[#ddd5c4] rounded-none ${className}`}
      {...props}
    />
  );
}
