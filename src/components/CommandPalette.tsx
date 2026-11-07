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
        className="fixed inset-0 bg-[#1f1c18]/40 transition-opacity duration-120"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-lg rounded-none border border-[#ddd5c4] bg-[#fffdf8] shadow-none overflow-hidden z-10">
        <Command
          label="Command Menu"
          className="w-full flex flex-col"
        >
          <div className="flex items-center px-4 border-b border-[#ddd5c4] bg-[#fffdf8]">
            <Command.Input
              autoFocus
              placeholder="Type a command or search..."
              className="w-full bg-transparent py-3 text-sm text-[#1f1c18] placeholder-[#5e574c] focus:outline-none"
            />
            <Kbd className="ml-2">Esc</Kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
            <Command.Empty className="py-8 text-center text-xs text-[#5e574c]">
              No results found.
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group heading="Actions" className="px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c]">
              {(userRole === 'creator' || userRole === 'manager') && (
                <Command.Item
                  onSelect={() => navigate('/content/new')}
                  className="flex items-center justify-between px-3 py-2 text-[#1f1c18] hover:bg-[#f5f1e8] cursor-pointer transition-colors aria-selected:bg-[#f5f1e8]"
                >
                  <span>New content</span>
                  <Kbd>N</Kbd>
                </Command.Item>
              )}

              {onSignOut && (
                <Command.Item
                  onSelect={() => {
                    onOpenChange(false);
                    onSignOut();
                  }}
                  className="flex items-center justify-between px-3 py-2 text-[#b3261e] hover:bg-[#b3261e]/10 cursor-pointer transition-colors aria-selected:bg-[#b3261e]/10"
                >
                  <span>Sign out</span>
                </Command.Item>
              )}
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading="Navigation" className="px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c]">
              <Command.Item
                onSelect={() => navigate('/dashboard')}
                className="flex items-center justify-between px-3 py-2 text-[#1f1c18] hover:bg-[#f5f1e8] cursor-pointer transition-colors aria-selected:bg-[#f5f1e8]"
              >
                <span>{userRole === 'creator' ? 'Content' : 'Review queue'}</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigate('/library?tab=guidelines')}
                className="flex items-center justify-between px-3 py-2 text-[#1f1c18] hover:bg-[#f5f1e8] cursor-pointer transition-colors aria-selected:bg-[#f5f1e8]"
              >
                <span>Library: Guidelines</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigate('/library?tab=facts')}
                className="flex items-center justify-between px-3 py-2 text-[#1f1c18] hover:bg-[#f5f1e8] cursor-pointer transition-colors aria-selected:bg-[#f5f1e8]"
              >
                <span>Library: Facts</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigate('/library?tab=terms')}
                className="flex items-center justify-between px-3 py-2 text-[#1f1c18] hover:bg-[#f5f1e8] cursor-pointer transition-colors aria-selected:bg-[#f5f1e8]"
              >
                <span>Library: Terms</span>
              </Command.Item>

              {(userRole === 'manager' || isAdmin) && (
                <Command.Item
                  onSelect={() => navigate('/insights')}
                  className="flex items-center justify-between px-3 py-2 text-[#1f1c18] hover:bg-[#f5f1e8] cursor-pointer transition-colors aria-selected:bg-[#f5f1e8]"
                >
                  <span>Insights</span>
                </Command.Item>
              )}

              {isAdmin && (
                <Command.Item
                  onSelect={() => navigate('/settings')}
                  className="flex items-center justify-between px-3 py-2 text-[#1f1c18] hover:bg-[#f5f1e8] cursor-pointer transition-colors aria-selected:bg-[#f5f1e8]"
                >
                  <span>Settings</span>
                </Command.Item>
              )}

              <Command.Item
                onSelect={() => navigate('/about')}
                className="flex items-center justify-between px-3 py-2 text-[#1f1c18] hover:bg-[#f5f1e8] cursor-pointer transition-colors aria-selected:bg-[#f5f1e8]"
              >
                <span>About</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="px-4 py-2 border-t border-[#ddd5c4] bg-[#f5f1e8] flex items-center justify-between text-[11px] text-[#5e574c]">
            <div className="flex items-center gap-3">
              <span>Use <Kbd className="text-[10px]">↑</Kbd> <Kbd className="text-[10px]">↓</Kbd> to navigate</span>
              <span><Kbd className="text-[10px]">↵</Kbd> to select</span>
            </div>
            <span className="font-serif">BrandLens</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
