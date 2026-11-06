'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Kbd } from '@/components/ui/Kbd';
import type { UserRole } from '@/lib/types';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: UserRole;
  onSignOut?: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  userRole = 'creator',
  onSignOut,
}: CommandPaletteProps) {
  const router = useRouter();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  if (!open) return null;

  const navigate = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const isApprover = userRole === 'manager' || userRole === 'reviewer' || userRole === 'admin';
  const isAdmin = userRole === 'admin';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-lg rounded-xl border border-white/10 bg-[#11111a]/95 backdrop-blur-md shadow-2xl shadow-black/80 overflow-hidden z-10 animate-in fade-in-0 zoom-in-95 duration-100">
        <Command
          label="Command Menu"
          className="w-full flex flex-col"
        >
          <div className="flex items-center px-4 border-b border-white/[0.08] bg-[#171724]/40">
            <svg
              className="w-4 h-4 text-[#7b7b94] mr-3 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Command.Input
              autoFocus
              placeholder="Type a command or search..."
              className="w-full bg-transparent py-3.5 text-sm text-[#ececf6] placeholder-[#7b7b94] focus:outline-none"
            />
            <Kbd className="ml-2">Esc</Kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
            <Command.Empty className="py-8 text-center text-xs text-[#7b7b94]">
              No results found.
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group heading="Actions" className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#7b7b94]">
              {userRole === 'creator' && (
                <Command.Item
                  onSelect={() => navigate('/content/new')}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-[#ececf6] hover:bg-[#171724] cursor-pointer transition-colors aria-selected:bg-[#171724] aria-selected:text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#a5b4fc]">＋</span>
                    <span>New content draft</span>
                  </div>
                  <Kbd>N</Kbd>
                </Command.Item>
              )}

              {onSignOut && (
                <Command.Item
                  onSelect={() => {
                    onOpenChange(false);
                    onSignOut();
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-[#ff7a8a] hover:bg-rose-500/10 cursor-pointer transition-colors aria-selected:bg-rose-500/10"
                >
                  <div className="flex items-center gap-2.5">
                    <span>↪</span>
                    <span>Sign out</span>
                  </div>
                </Command.Item>
              )}
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading="Navigation" className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#7b7b94]">
              <Command.Item
                onSelect={() => navigate('/dashboard')}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-[#ececf6] hover:bg-[#171724] cursor-pointer transition-colors aria-selected:bg-[#171724] aria-selected:text-white"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[#7b7b94]">▦</span>
                  <span>Dashboard</span>
                </div>
              </Command.Item>

              {isApprover && (
                <Command.Item
                  onSelect={() => navigate('/dashboard')}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-[#ececf6] hover:bg-[#171724] cursor-pointer transition-colors aria-selected:bg-[#171724] aria-selected:text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-indigo-400">⚡</span>
                    <span>Review queue</span>
                  </div>
                </Command.Item>
              )}

              <Command.Item
                onSelect={() => navigate('/library?tab=guidelines')}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-[#ececf6] hover:bg-[#171724] cursor-pointer transition-colors aria-selected:bg-[#171724] aria-selected:text-white"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[#7b7b94]">📚</span>
                  <span>Brand library: Guidelines</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => navigate('/library?tab=facts')}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-[#ececf6] hover:bg-[#171724] cursor-pointer transition-colors aria-selected:bg-[#171724] aria-selected:text-white"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[#7b7b94]">🧪</span>
                  <span>Brand library: Clinical facts</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => navigate('/library?tab=terms')}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-[#ececf6] hover:bg-[#171724] cursor-pointer transition-colors aria-selected:bg-[#171724] aria-selected:text-white"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[#7b7b94]">📖</span>
                  <span>Brand library: Terminology</span>
                </div>
              </Command.Item>

              {isAdmin && (
                <Command.Item
                  onSelect={() => navigate('/insights')}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-[#ececf6] hover:bg-[#171724] cursor-pointer transition-colors aria-selected:bg-[#171724] aria-selected:text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#5fd1a0]">📊</span>
                    <span>Insights &amp; Guideline health</span>
                  </div>
                </Command.Item>
              )}

              {isAdmin && (
                <Command.Item
                  onSelect={() => navigate('/settings')}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-[#ececf6] hover:bg-[#171724] cursor-pointer transition-colors aria-selected:bg-[#171724] aria-selected:text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#7b7b94]">⚙</span>
                    <span>Organization settings</span>
                  </div>
                </Command.Item>
              )}

              <Command.Item
                onSelect={() => navigate('/about')}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-[#ececf6] hover:bg-[#171724] cursor-pointer transition-colors aria-selected:bg-[#171724] aria-selected:text-white"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[#7b7b94]">ℹ</span>
                  <span>About &amp; AI disclosure</span>
                </div>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="px-4 py-2 border-t border-white/[0.06] bg-[#0d0d15] flex items-center justify-between text-[11px] text-[#7b7b94]">
            <div className="flex items-center gap-3">
              <span>Use <Kbd className="text-[10px]">↑</Kbd> <Kbd className="text-[10px]">↓</Kbd> to navigate</span>
              <span><Kbd className="text-[10px]">↵</Kbd> to select</span>
            </div>
            <span>BrandLens</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

