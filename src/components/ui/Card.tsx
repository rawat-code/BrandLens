import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "panel" | "raised" | "overlay";
}

export function Card({
  variant = "panel",
  className = "",
  children,
  ...props
}: CardProps) {
  const bg = {
    panel: "bg-[#11111a] border-white/[0.08]",
    raised: "bg-[#171724] border-white/[0.10]",
    overlay: "bg-[#1d1d2e] border-white/[0.14]",
  }[variant];

  return (
    <div
      className={`rounded-xl border ${bg} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-5 py-4 border-b border-white/[0.06] flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-base font-medium text-[#ececf6] ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-[#a3a3bb] mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-5 py-3 border-t border-white/[0.06] bg-[#0a0a10]/20 flex items-center justify-between rounded-b-xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

