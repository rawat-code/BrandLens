import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const next = searchParams.get('next') ?? '/dashboard';

  if (error || errorDescription) {
    const message = errorDescription || error || 'Google authentication failed';
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
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

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('No authorization code was received.')}`
  );
}

