import React from 'react';
import { AuthCard } from '@/components/auth/AuthCard';

interface SignupPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const initialError = params?.error || null;

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#1f1c18] flex items-center justify-center p-6 sm:p-10">
      <AuthCard initialMode="signup" initialError={initialError} />
    </div>
  );
}
