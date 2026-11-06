'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RoleBadge } from './RoleBadge';
import { signOut } from '@/app/login/actions';
import { Kbd } from './ui/Kbd';
import { PageTransition } from './ui/Motion';
import { CommandPalette } from './CommandPalette';
import type { Profile, UserRole } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

interface NavItem {
  name: string;
  href: string;
  roles: UserRole[];
  icon: (props: { className?: string }) => React.JSX.Element;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    roles: ['creator', 'manager', 'reviewer', 'admin'],
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    name: 'New content',
    href: '/content/new',
    roles: ['creator', 'manager'],
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  {
    name: 'Library',
    href: '/library',
    roles: ['creator', 'manager', 'reviewer', 'admin'],
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    name: 'Insights',
    href: '/insights',
    roles: ['manager', 'admin'],
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    name: 'About',
    href: '/about',
    roles: ['creator', 'manager', 'reviewer', 'admin'],
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  },
  {
    name: 'Settings',
    href: '/settings',
    roles: ['admin'],
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

interface AppShellProps {
  user: User;
  profile: Profile;
  orgName?: string;
  children: React.ReactNode;
}

export function AppShell({ user, profile, orgName, children }: AppShellProps) {
  const pathname = usePathname();
  const currentOrgName = orgName || profile.org_name || 'Workspace';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const allowedNav = NAV_ITEMS.filter((item) => item.roles.includes(profile.role));

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0a0a10] text-[#ececf6]">
      {/* Mobile Sticky Header */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#11111a]/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-serif font-bold flex items-center justify-center text-xs shadow-md shadow-indigo-950/50 shrink-0">
            BL
          </div>
          <span className="font-serif font-normal text-[#ececf6] tracking-tight text-base shrink-0">
            BrandLens
          </span>
          <span
            className="text-[11px] text-[#a3a3bb] bg-[#171724] border border-white/[0.06] px-2 py-0.5 rounded truncate max-w-[120px]"
            title={currentOrgName}
          >
            {currentOrgName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <RoleBadge role={profile.role} />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-[#a3a3bb] hover:text-[#ececf6] rounded-md hover:bg-[#171724] border border-white/5"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#11111a] border-b border-white/[0.08] px-4 py-3 space-y-1">
          {allowedNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#171724] text-[#ececf6] font-medium border-l-2 border-indigo-400'
                    : 'text-[#a3a3bb] hover:bg-[#171724]/60 hover:text-[#ececf6]'
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? 'text-[#a5b4fc]' : 'text-[#7b7b94]'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs text-[#a3a3bb]">
            <span className="truncate">{user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-xs text-[#ff7a8a] hover:underline"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Left Navigation Sidebar (Desktop) */}
      <aside
        className="hidden md:flex w-64 bg-[#11111a] border-r border-white/[0.08] flex-col shrink-0"
        aria-label="Sidebar Navigation"
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center border-b border-white/[0.08] gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-serif font-bold flex items-center justify-center text-sm shadow-md shadow-indigo-950/60 shrink-0">
            BL
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-serif text-lg font-normal text-[#ececf6] tracking-tight block leading-tight">
              BrandLens
            </span>
            <span
              className="text-[11px] text-[#a3a3bb] font-mono leading-tight truncate block max-w-[150px]"
              title={currentOrgName}
            >
              {currentOrgName}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main Navigation">
          {allowedNav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-[#171724] text-[#ececf6] shadow-sm shadow-black/20'
                    : 'text-[#a3a3bb] hover:bg-[#171724]/60 hover:text-[#ececf6]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isActive && (
                    <span
                      className="absolute left-0 top-2 bottom-2 w-[3px] bg-indigo-400 rounded-r"
                      aria-hidden="true"
                    />
                  )}
                  <item.icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#a5b4fc]' : 'text-[#7b7b94] group-hover:text-[#ececf6]'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Global Keyboard Quick Hint */}
        <div className="px-4 py-2 border-t border-white/[0.04]">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between text-xs text-[#7b7b94] hover:text-[#ececf6] px-1 py-1 rounded transition-colors group cursor-pointer"
            aria-label="Open command palette"
          >
            <span className="group-hover:text-[#ececf6] transition-colors">Command palette</span>
            <Kbd>⌘K</Kbd>
          </button>
        </div>

        {/* User Profile & Sign-out */}
        <div className="p-4 border-t border-white/[0.08] bg-[#0a0a10]/40">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <span className="font-medium text-sm text-[#ececf6] truncate max-w-[125px]">
                {profile.full_name || 'User'}
              </span>
              <RoleBadge role={profile.role} />
            </div>
            <p className="text-xs text-[#7b7b94] truncate" title={user.email}>
              {user.email}
            </p>
          </div>

          <form id="shell-signout-form" action={signOut}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-[#a3a3bb] hover:text-[#ececf6] bg-[#171724] hover:bg-[#1d1d2e] border border-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-[#7b7b94]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <PageTransition key={pathname} className="flex-1 flex flex-col min-w-0">
          {children}
        </PageTransition>
      </main>

      {/* Command Palette Modal */}
      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        userRole={profile.role}
        onSignOut={() => {
          const form = document.getElementById('shell-signout-form') as HTMLFormElement;
          if (form) form.requestSubmit();
        }}
      />
    </div>
  );
}
