import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';
import { ContentForm } from '@/components/ContentForm';
import { PageHeader } from '@/components/ui/PageHeader';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New content — BrandLens',
  description: 'Draft marketing copy and communications for brand governance review.',
};

export default async function NewContentPage() {
  const { user, profile } = await requireRole(['creator', 'manager', 'admin']);

  return (
    <AppShell user={user} profile={profile}>
      <div className="max-w-4xl w-full mx-auto space-y-6">
        <PageHeader
          title="New content"
          description="Draft marketing copy, product descriptions, or campaign captions for governance review."
          backHref="/dashboard"
          backLabel="Content"
        />

        <ContentForm />
      </div>
    </AppShell>
  );
}
