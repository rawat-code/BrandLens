import { requireRole } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';

export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const { user, profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);

  return (
    <AppShell user={user} profile={profile}>
      <div className="p-8 max-w-4xl w-full mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">About BrandLens</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pre-publication brand-governance & compliance review platform for {profile.org_name || 'your organisation'}.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-semibold text-slate-900">Governance & Product Philosophy</h2>
          <p>
            When a creator submits marketing copy, BrandLens automatically audits it against the organization&apos;s
            approved guidelines, verified facts, and terminology library. Every issue found cites its exact source,
            explains the risk, and suggests an intent-preserving fix.
          </p>
          <div className="border-l-4 border-emerald-500 bg-emerald-50/50 p-4 rounded-r-lg space-y-2">
            <h3 className="font-semibold text-emerald-900">Core Non-Negotiable Rules:</h3>
            <ul className="list-disc list-inside space-y-1 text-emerald-800 text-xs">
              <li><strong>No Source, No Flag:</strong> Every finding cites an approved guideline, fact, or term.</li>
              <li><strong>AI Suggests, Humans Decide:</strong> Suggestions are applied only when a human clicks Accept.</li>
              <li><strong>Separation of Duties:</strong> Creators can never approve their own content.</li>
              <li><strong>Confidentiality Protection:</strong> Confidential items never leave the server.</li>
              <li><strong>Automated Redaction:</strong> PII and secrets are sanitized before AI analysis.</li>
              <li><strong>Append-Only Audit Log:</strong> Every action and decision is permanently recorded.</li>
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
