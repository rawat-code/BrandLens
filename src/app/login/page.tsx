'use client';

import React, { useState, useTransition } from 'react';
import { loginWithEmail, loginAsDemoRole } from './actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { UserRole } from '@/lib/types';

const DEMO_ROLES: {
  role: UserRole;
  title: string;
  email: string;
  desc: string;
}[] = [
  {
    role: 'creator',
    title: 'Creator',
    email: 'creator@verdant.demo',
    desc: 'Draft content, run reviews, accept fixes, publish approved work',
  },
  {
    role: 'manager',
    title: 'Manager',
    email: 'manager@verdant.demo',
    desc: 'Review team content, request changes, approve clean drafts',
  },
  {
    role: 'reviewer',
    title: 'Reviewer',
    email: 'reviewer@verdant.demo',
    desc: 'Evaluate citations and resolve high-severity issues',
  },
  {
    role: 'admin',
    title: 'Admin',
    email: 'admin@verdant.demo',
    desc: 'Manage guidelines, approved facts, terminology, audit logs',
  },
];

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [activeDemo, setActiveDemo] = useState<UserRole | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await loginWithEmail(formData);
      if (res?.error) {
        setErrorMessage(res.error);
      }
    });
  };

  const handleDemoLogin = (role: UserRole) => {
    setErrorMessage(null);
    setActiveDemo(role);
    startTransition(async () => {
      const res = await loginAsDemoRole(role);
      if (res?.error) {
        setErrorMessage(res.error);
        setActiveDemo(null);
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#1f1c18] flex items-center justify-center p-6 sm:p-10">
      {/* Centred Paper Panel on Page Background */}
      <div className="w-full max-w-md bg-[#fffdf8] border border-[#ddd5c4] p-8 sm:p-10 rounded-none space-y-6">
        {/* Header: BrandLens in Newsreader + One Plain Sentence */}
        <div className="space-y-2 border-b border-[#ddd5c4] pb-5">
          <h1 className="font-serif text-[38px] font-medium text-[#1f1c18] leading-[1.1] tracking-tight">
            BrandLens
          </h1>
          <p className="text-sm text-[#5e574c] leading-[1.55]">
            Pre-publication brand governance review citing organization guidelines, facts, and terminology.
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3 bg-[#fffdf8] border border-[#b3261e] text-xs text-[#b3261e]"
          >
            {errorMessage}
          </div>
        )}

        {/* Sign in form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] block mb-1.5"
            >
              Email address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@organization.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] block mb-1.5"
            >
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            disabled={isPending}
            isLoading={isPending && activeDemo === null}
          >
            Sign in
          </Button>
        </form>

        {/* Compact Demo Accounts List */}
        <div className="border-t border-[#ddd5c4] pt-5 space-y-3">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] block">
              Demo workspace: Verdant Skin (fictional)
            </span>
            <p className="text-[12px] text-[#5e574c] mt-0.5">
              Select a persona to sign in directly:
            </p>
          </div>

          <div className="border border-[#ddd5c4] divide-y divide-[#ddd5c4]">
            {DEMO_ROLES.map((persona) => {
              const isSelected = activeDemo === persona.role && isPending;

              return (
                <button
                  key={persona.role}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDemoLogin(persona.role)}
                  className="w-full p-3 text-left bg-[#fffdf8] hover:bg-[#f5f1e8] transition-colors duration-120 flex items-center justify-between gap-3 cursor-pointer disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-[#1f1c18]">
                        {persona.title}
                      </span>
                      <span className="font-mono text-[10px] text-[#5e574c]">
                        {persona.email}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5e574c] truncate mt-0.5">
                      {persona.desc}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] uppercase text-[#1f1c18] shrink-0">
                    {isSelected ? 'Signing in...' : 'Select'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
