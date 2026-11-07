import { createServerClient } from '@supabase/ssr';
import { getAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const next = searchParams.get('next') ?? '/dashboard';
  const targetUrl = new URL(next.startsWith('/') ? next : `/${next}`, origin).toString();

  if (error || errorDescription) {
    const message = errorDescription || error || 'Google authentication failed';
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
  }

  if (code) {
    const cookieStore = await cookies();
    const redirectResponse = NextResponse.redirect(targetUrl);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Missing Supabase configuration')}`
      );
    }

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    });

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('exchangeCodeForSession error in auth callback:', exchangeError);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    const user = data.user;
    if (user) {
      // Ensure profile exists for the user in profiles table
      try {
        const admin = getAdminClient();
        const { data: existingProfile } = await admin
          .from('profiles')
          .select('id, org_id, role')
          .eq('id', user.id)
          .maybeSingle();

        if (!existingProfile) {
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

          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            'Creator';

          await admin.from('profiles').insert({
            id: user.id,
            org_id: orgId,
            full_name: fullName,
            role: 'creator',
          });
        }
      } catch (profileErr) {
        console.error('Error auto-provisioning profile in auth callback:', profileErr);
      }

      return redirectResponse;
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('No authorization code was received.')}`
  );
}

