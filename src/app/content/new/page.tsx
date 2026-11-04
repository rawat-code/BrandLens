import { requireRole } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';

export const dynamic = 'force-dynamic';

export default async function NewContentPage() {
  const { user, profile } = await requireRole(['creator', 'manager']);

  return (
    <AppShell user={user} profile={profile}>
      <div className="p-8 max-w-4xl w-full mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create New Content</h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit campaign copy, product descriptions, or social posts for pre-publication brand review.
          </p>
        </div>

        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <p className="text-sm text-slate-600">
            Content editor and review pipeline will be available in the upcoming review engine phase.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
