import { requireRole } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';
import { ContentForm } from '@/components/ContentForm';

export const dynamic = 'force-dynamic';

export default async function NewContentPage() {
  const { user, profile } = await requireRole(['creator', 'manager', 'admin']);

  return (
    <AppShell user={user} profile={profile}>
      <div className="p-6 md:p-8 max-w-4xl w-full mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create New Content</h1>
          <p className="text-sm text-slate-500 mt-1">
            Draft marketing copy, product descriptions, or campaign captions for governance and compliance review.
          </p>
        </div>

        <ContentForm />
      </div>
    </AppShell>
  );
}
