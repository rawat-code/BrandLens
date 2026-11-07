"use client";

import React, { createContext, useContext, useState } from "react";

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  value,
  defaultValue = "",
  onValueChange,
  children,
  className = "",
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeValue = value !== undefined ? value : internalValue;

  const handleChange = (newVal: string) => {
    if (value === undefined) {
      setInternalValue(newVal);
    }
    onValueChange?.(newVal);
  };

  return (
    <TabsContext.Provider value={{ value: activeValue, onChange: handleChange }}>
      <div className={`w-full ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabListProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "line" | "pills";
}

export function TabList({
  variant = "line",
  children,
  className = "",
  ...props
}: TabListProps) {
  const baseStyle =
    variant === "line"
      ? "flex items-center gap-6 border-b border-[#ddd5c4]"
      : "inline-flex items-center gap-0 border border-[#ddd5c4] bg-[#fffdf8] rounded-none p-0";

  return (
    <div role="tablist" className={`${baseStyle} ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface TabTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  variant?: "line" | "pills";
}

export function TabTrigger({
  value,
  variant = "line",
  children,
  className = "",
  ...props
}: TabTriggerProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabTrigger must be used within Tabs");

  const isSelected = ctx.value === value;

  const style =
    variant === "line"
      ? `pb-2.5 pt-1 text-sm font-medium transition-colors relative cursor-pointer ${
          isSelected
            ? "text-[#1f1c18] border-b-2 border-[#1f1c18]"
            : "text-[#5e574c] hover:text-[#1f1c18] border-b-2 border-transparent"
        }`
      : `px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.04em] transition-colors cursor-pointer border-r last:border-r-0 border-[#ddd5c4] ${
          isSelected
            ? "bg-[#1f1c18] text-[#f5f1e8]"
            : "bg-[#fffdf8] text-[#5e574c] hover:bg-[#f5f1e8] hover:text-[#1f1c18]"
        }`;

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isSelected}
      onClick={() => ctx.onChange(value)}
      className={`${style} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabContent({
  value,
  children,
  className = "",
  ...props
}: TabContentProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabContent must be used within Tabs");

  if (ctx.value !== value) return null;

  return (
    <div
      role="tabpanel"
      tabIndex={0}
      className={`focus:outline-none pt-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
