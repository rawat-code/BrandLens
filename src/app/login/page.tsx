'use client';

import React, { useState, useTransition } from 'react';
import { loginWithEmail, loginAsDemoRole } from './actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConstellationCanvas } from '@/components/ui/ConstellationCanvas';
import type { UserRole } from '@/lib/types';

const DEMO_ROLES: {
  role: UserRole;
  title: string;
  email: string;
  desc: string;
  color: string;
}[] = [
  {
    role: 'creator',
    title: 'Creator',
    email: 'creator@verdant.demo',
    desc: 'Draft content, run reviews, accept fixes, publish approved work',
    color: 'border-[#5fd1a0]/30 text-[#5fd1a0] hover:border-[#5fd1a0]/60',
  },
  {
    role: 'manager',
    title: 'Manager',
    email: 'manager@verdant.demo',
    desc: 'Review team content, request changes, approve clean drafts',
    color: 'border-indigo-400/30 text-[#a5b4fc] hover:border-indigo-400/60',
  },
  {
    role: 'reviewer',
    title: 'Reviewer',
    email: 'reviewer@verdant.demo',
    desc: 'Deep compliance reviews, resolve high-severity flags',
    color: 'border-violet-400/30 text-[#c084fc] hover:border-violet-400/60',
  },
  {
    role: 'admin',
    title: 'Admin',
    email: 'admin@verdant.demo',
    desc: 'Manage guidelines, approved facts, terminology library, audit logs',
    color: 'border-[#f5b74f]/30 text-[#f5b74f] hover:border-[#f5b74f]/60',
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
    <div className="min-h-screen bg-[#0a0a10] text-[#ececf6] grid grid-cols-1 lg:grid-cols-12 relative overflow-hidden">
      {/* Constellation Canvas Drift Background */}
      <ConstellationCanvas />

      {/* Left Editorial Panel */}
      <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-10 lg:p-14 relative z-10 border-b lg:border-b-0 lg:border-r border-white/[0.08] backdrop-blur-[2px]">
        {/* Brand Top Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-serif font-bold flex items-center justify-center text-sm shadow-md shadow-indigo-950/60">
              BL
            </div>
            <div>
              <span className="font-serif text-xl font-normal text-[#ececf6] tracking-tight block leading-tight">
                BrandLens
              </span>
              <span className="text-xs text-[#7b7b94]">Pre-publication brand governance</span>
            </div>
          </div>
        </div>

        {/* Editorial Value Proposition */}
        <div className="my-8 lg:my-0 max-w-xl">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[#ececf6] leading-[1.15]">
            Every claim cited. Every fix reviewed. Human decided.
          </h1>
          <p className="mt-4 text-sm sm:text-base text-[#a3a3bb] leading-relaxed">
            Content is verified against your approved guidelines, facts, and terminology before it reaches the public.
            AI suggests fixes with exact library citations; your team makes every final decision.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#171724] border border-white/[0.08] text-xs text-[#a3a3bb]">
            <span className="w-2 h-2 rounded-full bg-[#5fd1a0] animate-pulse" />
            <span>Demo workspace: <strong className="text-[#ececf6] font-medium">Verdant Skin (fictional)</strong></span>
          </div>

          {/* Quick Demo Personas Selection */}
          <div className="mt-8">
            <p className="text-xs font-medium text-[#7b7b94] uppercase tracking-wider mb-3">
              Fast-track with a demo role:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_ROLES.map((d) => {
                const isCurrentPending = isPending && activeDemo === d.role;
                return (
                  <button
                    key={d.role}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDemoLogin(d.role)}
                    className={`text-left p-3 rounded-lg bg-[#11111a] hover:bg-[#171724] border transition-all disabled:opacity-50 group flex flex-col justify-between cursor-pointer ${d.color}`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-medium text-sm text-[#ececf6] group-hover:text-white">
                        {d.title}
                      </span>
                      <span className="text-[11px] font-mono text-[#7b7b94]">
                        {isCurrentPending ? 'Signing in...' : 'Enter →'}
                      </span>
                    </div>
                    <p className="text-xs text-[#7b7b94] line-clamp-2">
                      {d.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#7b7b94]">
          <span>AI never publishes, approves or rewrites on its own.</span>
          <span className="font-mono text-[11px]">v1.0-release</span>
        </div>
      </div>

      {/* Right Authentication Panel */}
      <div className="lg:col-span-5 flex flex-col justify-center p-6 sm:p-10 lg:p-12 relative z-10 bg-[#0e0e17]/80">
        <div className="max-w-md w-full mx-auto">
          <div className="bg-[#11111a] p-6 sm:p-8 rounded-xl border border-white/[0.08] shadow-2xl shadow-black/80">
            <div className="mb-6">
              <h2 className="font-serif text-2xl font-normal text-[#ececf6] tracking-tight">
                Sign in
              </h2>
              <p className="mt-1 text-xs text-[#a3a3bb]">
                Enter your credentials or use a demo role on the left
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-xs text-[#ff7a8a] flex items-center gap-2"
              >
                <svg className="w-4 h-4 shrink-0 text-[#ff7a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-[#a3a3bb] mb-1.5"
                >
                  Email address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-required="true"
                  placeholder="name@company.com"
                  disabled={isPending}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-[#a3a3bb] mb-1.5"
                >
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  aria-required="true"
                  disabled={isPending}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isPending}
                  isLoading={isPending && !activeDemo}
                  className="w-full"
                >
                  {isPending && !activeDemo ? 'Signing in...' : 'Sign in'}
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-white/[0.06] text-center">
              <p className="text-xs text-[#7b7b94]">
                Protected by role-based governance & audit logs
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
