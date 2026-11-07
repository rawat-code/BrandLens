import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    let msg = error.message;
    if (msg.includes('not enabled') || msg.includes('provider')) {
      msg =
        'Google authentication is not yet enabled in your Supabase project. In Supabase Dashboard, navigate to Authentication > Providers > Google, enable it, and add your Google OAuth Client ID and Secret.';
    }
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
  }

  if (data?.url) {
    return NextResponse.redirect(data.url);
  }

  return NextResponse.redirect(`${origin}/login`);
}

