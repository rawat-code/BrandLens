'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/lib/types';

export async function loginWithEmail(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Please enter both email and password.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/dashboard');
}

export async function loginAsDemoRole(role: UserRole) {
  const emailMap: Record<UserRole, string> = {
    creator: 'creator@verdant.demo',
    manager: 'manager@verdant.demo',
    reviewer: 'reviewer@verdant.demo',
    admin: 'admin@verdant.demo',
  };

  const email = emailMap[role];
  const password = process.env.DEMO_PASSWORD?.trim() || '12110';

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: `Demo login failed: ${error.message}. Has the seed script been run?` };
  }

  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
