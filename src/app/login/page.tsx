import React from 'react';
import { AuthCard } from '@/components/auth/AuthCard';

interface LoginPageProps {
  searchParams: Promise<{ tab?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const initialMode = params?.tab === 'signup' ? 'signup' : 'signin';
  const initialError = params?.error || null;

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#1f1c18] flex items-center justify-center p-6 sm:p-10">
      <AuthCard initialMode={initialMode} initialError={initialError} />
    </div>
  );
}
