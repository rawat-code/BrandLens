'use client';

import React, { useState, useTransition } from 'react';
import { createClient as createBrowserSupabase } from '@/lib/supabase/browser';
import { loginWithEmail, signUpWithEmail, loginAsDemoRole } from '@/app/login/actions';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
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

interface AuthCardProps {
  initialMode?: 'signin' | 'signup';
  initialError?: string | null;
}

export function AuthCard({ initialMode = 'signin', initialError = null }: AuthCardProps) {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);
  const [isPending, startTransition] = useTransition();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<UserRole | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const sharedDemoPassword = 'verdant12110';

  const copyToClipboard = async (text: string, fieldKey: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedField(fieldKey);
        setTimeout(() => {
          setCopiedField((prev) => (prev === fieldKey ? null : prev));
        }, 2000);
      }
    } catch {
      // Ignore copy error
    }
  };

  // Google OAuth sign-in and sign-up
  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsGoogleLoading(true);

    try {
      const supabase = createBrowserSupabase();
      const redirectTo = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        let msg = error.message;
        if (msg.includes('not enabled') || msg.includes('provider')) {
          msg =
            'Google authentication is not yet enabled in your Supabase project. In Supabase Dashboard, navigate to Authentication > Providers > Google, toggle it on, and provide your Google OAuth Client ID and Secret.';
        }
        setErrorMessage(msg);
        setIsGoogleLoading(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Google authentication failed.');
      setIsGoogleLoading(false);
    }
  };

  // Email sign in
  const handleSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await loginWithEmail(formData);
      if (res?.error) {
        setErrorMessage(res.error);
      }
    });
  };

  // Email sign up
  const handleSignUp = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await signUpWithEmail(formData);
      if (res?.error) {
        setErrorMessage(res.error);
      } else if (res?.success && res?.message) {
        setSuccessMessage(res.message);
      }
    });
  };

  // Demo personas
  const handleDemoLogin = (role: UserRole) => {
    setErrorMessage(null);
    setSuccessMessage(null);
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
    <div className="w-full max-w-md bg-[#fffdf8] border border-[#ddd5c4] p-8 sm:p-10 rounded-none space-y-6">
      {/* Header */}
      <div className="space-y-2 border-b border-[#ddd5c4] pb-5">
        <h1 className="font-serif text-[38px] font-medium text-[#1f1c18] leading-[1.1] tracking-tight">
          BrandLens
        </h1>
        <p className="text-sm text-[#5e574c] leading-[1.55]">
          Pre-publication brand governance review citing organization guidelines, facts, and terminology.
        </p>
      </div>

      {/* One-Click Demo Personas */}
      <div className="space-y-3 bg-[#fbf9f4] border border-[#ddd5c4] p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.04em] font-semibold text-[#1f1c18]">
            Quick persona sign-in
          </span>
          <span className="font-mono text-[10px] text-[#5e574c] uppercase">
            One-click
          </span>
        </div>
        <p className="text-xs text-[#5e574c]">
          Select a demo persona to explore role-specific permissions and review workflows:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ROLES.map((persona) => {
            const isSelected = activeDemo === persona.role && isPending;
            return (
              <button
                key={persona.role}
                type="button"
                disabled={isPending || isGoogleLoading}
                onClick={() => handleDemoLogin(persona.role)}
                className="p-2.5 text-left border border-[#ddd5c4] bg-[#fffdf8] hover:bg-[#f5f1e8] hover:border-[#1f1c18] transition-all duration-120 cursor-pointer disabled:opacity-50"
                aria-label={`Sign in as ${persona.title}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs text-[#1f1c18]">{persona.title}</span>
                  <span className="font-mono text-[9px] uppercase text-[#5e574c]">
                    {isSelected ? '...' : 'Go →'}
                  </span>
                </div>
                <span className="text-[10px] text-[#5e574c] block truncate mt-0.5">
                  {persona.desc.split(',')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Demo Accounts Panel with Copy Buttons */}
      <details className="border border-[#ddd5c4] bg-[#fffdf8] p-3 text-xs group">
        <summary className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#1f1c18] cursor-pointer flex items-center justify-between font-semibold">
          <span>Demo credentials & manual login info</span>
          <span className="text-[#5e574c] group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="mt-3 pt-3 border-t border-[#ddd5c4] space-y-3">
          <p className="text-[#5e574c] text-[11px] leading-relaxed">
            Demo workspace with synthetic data only. Anyone can sign in with these accounts.
          </p>

          <div className="space-y-2 font-mono text-[11px]">
            {DEMO_ROLES.map((persona) => (
              <div
                key={persona.role}
                className="flex items-center justify-between bg-[#fbf9f4] p-1.5 border border-[#ede7dc]"
              >
                <div className="min-w-0 pr-2">
                  <span className="text-[#1f1c18] font-semibold uppercase text-[10px] block">
                    {persona.title}
                  </span>
                  <span className="text-[#5e574c] truncate block">{persona.email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(persona.email, `email-${persona.role}`)}
                  className="px-2 py-0.5 border border-[#ddd5c4] bg-[#fffdf8] hover:bg-[#f5f1e8] text-[10px] uppercase tracking-wider shrink-0"
                  aria-label={`Copy ${persona.title} email`}
                >
                  {copiedField === `email-${persona.role}` ? 'Copied!' : 'Copy'}
                </button>
              </div>
            ))}

            <div className="flex items-center justify-between bg-[#fbf9f4] p-1.5 border border-[#ede7dc]">
              <div>
                <span className="text-[#1f1c18] font-semibold uppercase text-[10px] block">
                  Shared password
                </span>
                <span className="text-[#5e574c]">{sharedDemoPassword}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(sharedDemoPassword, 'password')}
                className="px-2 py-0.5 border border-[#ddd5c4] bg-[#fffdf8] hover:bg-[#f5f1e8] text-[10px] uppercase tracking-wider shrink-0"
                aria-label="Copy demo password"
              >
                {copiedField === 'password' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </details>

      {/* Mode Segmented Tabs: Sign in vs Create account */}
      <div className="flex border-b border-[#ddd5c4]" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          role="tab"
          aria-selected={authMode === 'signin'}
          onClick={() => {
            setAuthMode('signin');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`flex-1 pb-2.5 text-center font-mono text-[11px] uppercase tracking-[0.04em] transition-colors duration-120 cursor-pointer ${
            authMode === 'signin'
              ? 'border-b-2 border-[#1f1c18] text-[#1f1c18] font-semibold -mb-[1px]'
              : 'text-[#5e574c] hover:text-[#1f1c18]'
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={authMode === 'signup'}
          onClick={() => {
            setAuthMode('signup');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`flex-1 pb-2.5 text-center font-mono text-[11px] uppercase tracking-[0.04em] transition-colors duration-120 cursor-pointer ${
            authMode === 'signup'
              ? 'border-b-2 border-[#1f1c18] text-[#1f1c18] font-semibold -mb-[1px]'
              : 'text-[#5e574c] hover:text-[#1f1c18]'
          }`}
        >
          Create account
        </button>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3 bg-[#fffdf8] border border-[#b3261e] text-xs text-[#b3261e]"
        >
          {errorMessage}
        </div>
      )}

      {/* Success alert */}
      {successMessage && (
        <div
          role="status"
          className="p-3 bg-[#fffdf8] border border-[#1f6b3a] text-xs text-[#1f6b3a]"
        >
          {successMessage}
        </div>
      )}

      {/* Google OAuth Button */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="w-full flex items-center justify-center gap-2.5 py-2.5 text-sm font-medium"
          onClick={handleGoogleAuth}
          disabled={isPending || isGoogleLoading}
          isLoading={isGoogleLoading}
          aria-label={authMode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}
        >
          {!isGoogleLoading && (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.41 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.24C.45 8.14 0 9.9 0 12s.45 3.86 1.24 5.43l4.04-3.14z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.59 1.24 6.57l4.04 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
              />
            </svg>
          )}
          <span>{authMode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}</span>
        </Button>

        {/* Divider rule */}
        <div className="relative flex items-center justify-center pt-2 pb-1">
          <div className="border-t border-[#ddd5c4] w-full" />
          <span className="bg-[#fffdf8] px-3 font-mono text-[10px] uppercase tracking-[0.04em] text-[#5e574c] shrink-0">
            or continue with email
          </span>
        </div>
      </div>

      {/* Form: Sign In */}
      {authMode === 'signin' ? (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label
              htmlFor="signin-email"
              className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] block mb-1.5"
            >
              Email address
            </label>
            <Input
              id="signin-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@organization.com"
            />
          </div>

          <div>
            <label
              htmlFor="signin-password"
              className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] block mb-1.5"
            >
              Password
            </label>
            <Input
              id="signin-password"
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
            disabled={isPending || isGoogleLoading}
            isLoading={isPending && activeDemo === null}
          >
            Sign in
          </Button>
        </form>
      ) : (
        /* Form: Create Account / Sign Up */
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label
              htmlFor="signup-name"
              className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] block mb-1.5"
            >
              Full name
            </label>
            <Input
              id="signup-name"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              placeholder="First and last name"
            />
          </div>

          <div>
            <label
              htmlFor="signup-email"
              className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] block mb-1.5"
            >
              Email address
            </label>
            <Input
              id="signup-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@organization.com or @gmail.com"
            />
          </div>

          <div>
            <label
              htmlFor="signup-password"
              className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] block mb-1.5"
            >
              Password
            </label>
            <Input
              id="signup-password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label
              htmlFor="signup-role"
              className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] block mb-1.5"
            >
              Role in workspace
            </label>
            <Select id="signup-role" name="role" defaultValue="creator">
              <option value="creator">Creator — Draft content, run reviews, submit for approval</option>
              <option value="reviewer">Reviewer — Evaluate citations and resolve high-severity issues</option>
              <option value="manager">Manager — Review team content and approve clean drafts</option>
            </Select>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            disabled={isPending || isGoogleLoading}
            isLoading={isPending && activeDemo === null}
          >
            Create account
          </Button>
        </form>
      )}
    </div>
  );
}
