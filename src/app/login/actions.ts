'use server';

import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
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

export async function signUpWithEmail(formData: FormData) {
  const fullName = (formData.get('fullName') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const roleInput = (formData.get('role') as UserRole) || 'creator';

  if (!fullName) {
    return { error: 'Please enter your full name.' };
  }

  if (!email) {
    return { error: 'Please enter your email address.' };
  }

  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters.' };
  }

  const validRoles: UserRole[] = ['creator', 'manager', 'reviewer', 'admin'];
  const role: UserRole = validRoles.includes(roleInput) ? roleInput : 'creator';

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    try {
      const admin = getAdminClient();
      let orgId: string | null = null;
      const { data: org } = await admin
        .from('orgs')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (org) {
        orgId = org.id;
      } else {
        const newOrgId = crypto.randomUUID();
        await admin.from('orgs').insert({ id: newOrgId, name: 'Verdant Skin' });
        orgId = newOrgId;
      }

      await admin.from('profiles').upsert(
        {
          id: data.user.id,
          org_id: orgId,
          full_name: fullName,
          role,
        },
        { onConflict: 'id' }
      );
    } catch (profileErr) {
      console.error('Failed to create profile during signup:', profileErr);
    }
  }

  if (data.session) {
    redirect('/dashboard');
  }

  return {
    success: true,
    message: 'Account created. If email verification is enabled, please check your inbox to confirm your address before signing in.',
  };
}

export async function loginAsDemoRole(role: UserRole) {
  const emailMap: Record<UserRole, string> = {
    creator: 'creator@verdant.demo',
    manager: 'manager@verdant.demo',
    reviewer: 'reviewer@verdant.demo',
    admin: 'admin@verdant.demo',
  };

  const email = emailMap[role];
  const password = process.env.DEMO_PASSWORD?.trim() || 'verdant12110';

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
