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
      ? "flex items-center gap-1 border-b border-white/[0.08]"
      : "inline-flex items-center gap-1 p-1 bg-[#171724] rounded-lg border border-white/[0.06]";

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
      ? `px-3.5 py-2 text-sm font-medium transition-colors relative cursor-pointer ${
          isSelected
            ? "text-[#ececf6] border-b-2 border-indigo-400"
            : "text-[#a3a3bb] hover:text-[#ececf6] border-b-2 border-transparent"
        }`
      : `px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
          isSelected
            ? "bg-[#11111a] text-[#ececf6] shadow-sm shadow-black/40 border border-white/10"
            : "text-[#a3a3bb] hover:text-[#ececf6]"
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
      className={`pt-4 focus:outline-none ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
