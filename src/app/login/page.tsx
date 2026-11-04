'use client';

import { useState, useTransition } from 'react';
import { loginWithEmail, loginAsDemoRole } from './actions';
import type { UserRole } from '@/lib/types';

const DEMO_ROLES: {
  role: UserRole;
  title: string;
  email: string;
  desc: string;
  badgeClass: string;
}[] = [
  {
    role: 'creator',
    title: 'Creator',
    email: 'creator@verdant.demo',
    desc: 'Draft content, run reviews, accept fixes, publish approved work',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  {
    role: 'manager',
    title: 'Manager',
    email: 'manager@verdant.demo',
    desc: 'Review team content, request changes, approve clean drafts',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  {
    role: 'reviewer',
    title: 'Reviewer',
    email: 'reviewer@verdant.demo',
    desc: 'Deep compliance reviews, resolve high-severity flags',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  {
    role: 'admin',
    title: 'Admin',
    email: 'admin@verdant.demo',
    desc: 'Manage guidelines, approved facts, terminology library, audit logs',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600 text-white font-bold text-2xl shadow-sm mb-4">
          BL
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          BrandLens
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Pre-publication brand governance & AI compliance for{' '}
          <span className="font-semibold text-emerald-700">Verdant Skin</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-slate-200 sm:px-10">
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
            >
              <div className="flex">
                <span className="font-medium mr-1">Error:</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-required="true"
                  placeholder="user@verdant.demo"
                  disabled={isPending}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm disabled:opacity-50 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  aria-required="true"
                  disabled={isPending}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm disabled:opacity-50 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-60 transition-colors"
              >
                {isPending && !activeDemo ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-500 font-semibold tracking-wider">
                  Or try a demo role
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-2.5">
              {DEMO_ROLES.map((d) => {
                const isCurrentPending = isPending && activeDemo === d.role;
                return (
                  <button
                    key={d.role}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDemoLogin(d.role)}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 transition disabled:opacity-50 group flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm group-hover:text-emerald-700">
                          {d.title}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border font-medium ${d.badgeClass}`}
                        >
                          {d.email}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{d.desc}</p>
                    </div>
                    <div className="shrink-0 text-slate-400 group-hover:text-emerald-600 self-center">
                      {isCurrentPending ? (
                        <span className="text-xs font-medium text-emerald-600">
                          Loading...
                        </span>
                      ) : (
                        <span className="text-sm font-bold" aria-hidden="true">
                          &rarr;
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

