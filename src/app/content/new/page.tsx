import { requireRole } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';
import { ContentForm } from '@/components/ContentForm';
import { PageHeader } from '@/components/ui/PageHeader';

export const dynamic = 'force-dynamic';

export default async function NewContentPage() {
  const { user, profile } = await requireRole(['creator', 'manager', 'admin']);

  return (
    <AppShell user={user} profile={profile}>
      <div className="p-6 md:p-8 max-w-4xl w-full mx-auto space-y-6">
        <PageHeader
          title="New content draft"
          description="Draft marketing copy, product descriptions, or campaign captions for governance review."
          backHref="/dashboard"
          backLabel="Content"
        />

        <ContentForm />
      </div>
    </AppShell>
  );
}
