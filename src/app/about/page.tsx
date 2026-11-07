import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'About — BrandLens',
  description: 'Brand governance review architecture, model transparency, and boundaries.',
};

export default async function AboutPage() {
  const { user, profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);

  return (
    <AppShell user={user} profile={profile}>
      <div className="max-w-4xl w-full mx-auto space-y-6">
        <PageHeader
          title="About"
          description={`Pre-publication brand governance and compliance review platform for ${profile.org_name || 'Verdant Skin'}.`}
        />

        <Card variant="panel" className="space-y-5">
          <CardHeader>
            <CardTitle>Governance &amp; product philosophy</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5 pt-0 text-sm text-[#ececf6] leading-relaxed">
            <p className="text-[#a3a3bb]">
              When a creator submits marketing copy, BrandLens automatically audits it against the organization&apos;s
              approved guidelines, verified facts, and terminology library. Every issue found cites its exact source,
              explains the risk, and suggests an intent-preserving fix that keeps the creator&apos;s original voice.
            </p>

            <div className="border-l-2 border-indigo-400 bg-[#171724] p-4 rounded-r-xl space-y-3">
              <h3 className="font-medium text-[#ececf6] text-xs uppercase font-mono tracking-wider">
                Core non-negotiable rules
              </h3>
              <ul className="space-y-2 text-xs text-[#a3a3bb]">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                  <span>
                    <strong className="text-[#ececf6]">No source, no flag:</strong> Every finding must cite a guideline, fact, or term from the organization library. Items without an exact citation are marked &ldquo;Needs human check&rdquo; and never shown as verdicts.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                  <span>
                    <strong className="text-[#ececf6]">AI suggests, humans decide:</strong> Suggestions are applied only when a user explicitly clicks Accept, one at a time. AI never approves, publishes, or rewrites on its own.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                  <span>
                    <strong className="text-[#ececf6]">Separation of duties:</strong> Creators can never approve their own content. High-severity governance flags require dedicated reviewer clearance.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                  <span>
                    <strong className="text-[#ececf6]">Confidentiality protection:</strong> Content marked confidential is never transmitted to external AI services. Only deterministic local rules execute.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                  <span>
                    <strong className="text-[#ececf6]">Automated PII redaction:</strong> Emails, phone numbers, and credential tokens are sanitized before any prompt is assembled.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                  <span>
                    <strong className="text-[#ececf6]">Append-only audit log:</strong> Every state change, edit, dispute, and approval decision is permanently preserved in the audit trail.
                  </span>
                </li>
              </ul>
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#7b7b94]">
              <span>Demo organization: <strong>Verdant Skin (fictional)</strong></span>
              <span className="font-mono">v1.0-release</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
