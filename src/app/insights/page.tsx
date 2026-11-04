import { requireRole } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const { user, profile } = await requireRole(['manager', 'admin']);

  return (
    <AppShell user={user} profile={profile}>
      <div className="p-8 max-w-5xl w-full mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Compliance Insights</h1>
          <p className="text-sm text-slate-500 mt-1">
            Aggregated governance trends and violation analytics
          </p>
        </div>

        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <p className="text-sm text-slate-600">
            Insights dashboard will display rule violation frequency, AI confidence distributions, and review turnaround times.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
