'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/login/actions';
import { PageTransition } from './ui/Motion';
import { CommandPalette } from './CommandPalette';
import type { Profile, UserRole } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

interface NavItem {
  name: string;
  href: string;
  roles: UserRole[];
}

interface AppShellProps {
  user: User;
  profile: Profile;
  orgName?: string;
  children: React.ReactNode;
}

export function AppShell({ user: _user, profile, orgName, children }: AppShellProps) {
  const pathname = usePathname();
  const currentOrgName = orgName || profile.org_name || 'Verdant Skin';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const isReviewRole = profile.role === 'manager' || profile.role === 'reviewer';

  const navItems: NavItem[] = [
    {
      name: isReviewRole ? 'Review queue' : 'Content',
      href: '/dashboard',
      roles: ['creator', 'manager', 'reviewer', 'admin'],
    },
    {
      name: 'New content',
      href: '/content/new',
      roles: ['creator', 'manager'],
    },
    {
      name: 'Library',
      href: '/library',
      roles: ['creator', 'manager', 'reviewer', 'admin'],
    },
    {
      name: 'Insights',
      href: '/insights',
      roles: ['manager', 'admin'],
    },
    {
      name: 'Settings',
      href: '/settings',
      roles: ['admin'],
    },
    {
      name: 'About',
      href: '/about',
      roles: ['creator', 'manager', 'reviewer', 'admin'],
    },
  ];

  const allowedNav = navItems.filter((item) => item.roles.includes(profile.role));

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f1e8] text-[#1f1c18]">
      {/* Top Bar (Paper background, bottom border) */}
      <header className="sticky top-0 z-40 bg-[#fffdf8] border-b border-[#ddd5c4] w-full print:hidden">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-10 h-14 flex items-center justify-between gap-6">
          {/* Left: BrandLens in Newsreader 20px + Nav Links */}
          <div className="flex items-center gap-8 min-w-0">
            <Link
              href="/dashboard"
              className="font-serif text-[20px] font-medium text-[#1f1c18] tracking-tight shrink-0 select-none"
            >
              BrandLens
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
              {allowedNav.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`text-sm py-4 transition-colors relative ${
                      isActive
                        ? 'text-[#1f1c18] font-medium border-b-2 border-[#1f1c18]'
                        : 'text-[#5e574c] hover:text-[#1f1c18]'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: organisation name, role and sign-out link in secondary text (12px) */}
          <div className="hidden md:flex items-center gap-4 text-[12px] text-[#5e574c] shrink-0">
            <span className="font-medium text-[#1f1c18]">{currentOrgName}</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.04em] px-1.5 py-0.5 bg-[#f5f1e8] border border-[#ddd5c4] text-[#1f1c18]">
              {profile.role}
            </span>
            <span className="text-[#ddd5c4]">|</span>
            <form id="shell-signout-form" action={signOut}>
              <button
                type="submit"
                className="text-[12px] text-[#5e574c] hover:text-[#1f1c18] underline underline-offset-2 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </form>
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden items-center gap-3">
            <span className="font-mono text-[11px] uppercase px-1.5 py-0.5 bg-[#f5f1e8] border border-[#ddd5c4] text-[#1f1c18]">
              {profile.role}
            </span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-[#5e574c] hover:text-[#1f1c18] border border-[#ddd5c4] bg-[#fffdf8]"
              aria-label="Toggle navigation menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#ddd5c4] bg-[#fffdf8] px-6 py-3 space-y-2">
            {allowedNav.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-1.5 text-sm ${
                    isActive ? 'text-[#1f1c18] font-medium underline underline-offset-4' : 'text-[#5e574c]'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
            <div className="pt-3 border-t border-[#ddd5c4] flex items-center justify-between text-[12px] text-[#5e574c]">
              <span>{currentOrgName} ({profile.role})</span>
              <form action={signOut}>
                <button type="submit" className="text-[#b3261e] underline underline-offset-2">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-6 sm:px-10 py-[30px]">
        <PageTransition key={pathname} className="w-full">
          {children}
        </PageTransition>
      </main>

      {/* Global Command Palette */}
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
