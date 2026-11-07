import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'About — BrandLens',
  description: 'Brand governance review architecture, model transparency, and boundaries.',
};

export default async function AboutPage() {
  const { user, profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);

  return (
    <AppShell user={user} profile={profile}>
      <div className="max-w-4xl w-full mx-auto space-y-8">
        <PageHeader
          title="About"
          description={`Pre-publication brand governance and compliance review platform for ${profile.org_name || 'Verdant Skin'}.`}
        />

        {/* Section 1: Governance & Purpose */}
        <section className="bg-[#fffdf8] border border-[#ddd5c4] p-6 sm:p-8 space-y-4">
          <h2 className="font-serif text-2xl font-medium text-[#1f1c18] tracking-tight">
            Governance philosophy
          </h2>
          <p className="text-sm text-[#1f1c18] leading-relaxed">
            BrandLens audits draft copy against approved guidelines, verified facts, and terminology rules
            before publication. The platform pairs deterministic rules with assistive language models, routing
            every piece through a role-based human approval workflow.
          </p>
          <p className="text-sm text-[#5e574c] leading-relaxed">
            AI never approves, publishes, or rewrites copy independently. Humans review findings, decide which
            suggestions to accept, and verify all flagged claims.
          </p>
        </section>

        {/* Section 2: What is checked */}
        <section className="bg-[#fffdf8] border border-[#ddd5c4] p-6 sm:p-8 space-y-4">
          <h2 className="font-serif text-2xl font-medium text-[#1f1c18] tracking-tight">
            What is checked
          </h2>
          <p className="text-sm text-[#5e574c]">
            Each content submission undergoes a multi-layer evaluation:
          </p>

          <dl className="space-y-4 pt-2">
            <div className="border-t border-[#ddd5c4] pt-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-[#1f1c18] font-semibold">
                Approved terminology
              </dt>
              <dd className="text-sm text-[#5e574c] mt-1">
                Deterministic scanning for preferred terms, forbidden vocabulary, and required replacements from the organisation dictionary.
              </dd>
            </div>

            <div className="border-t border-[#ddd5c4] pt-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-[#1f1c18] font-semibold">
                Clinical and factual claims
              </dt>
              <dd className="text-sm text-[#5e574c] mt-1">
                Cross-referencing claims against active clinical facts. Unsupported health or product claims without documented backing are flagged.
              </dd>
            </div>

            <div className="border-t border-[#ddd5c4] pt-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-[#1f1c18] font-semibold">
                Tone and messaging guidelines
              </dt>
              <dd className="text-sm text-[#5e574c] mt-1">
                Evaluation of voice, reading level, superlative claims, and compliance guidelines defined by the organisation.
              </dd>
            </div>

            <div className="border-t border-[#ddd5c4] pt-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-[#1f1c18] font-semibold">
                Accessibility and format standards
              </dt>
              <dd className="text-sm text-[#5e574c] mt-1">
                Channel-specific formatting checks, character limits, contrast rules, and plain language standards.
              </dd>
            </div>
          </dl>
        </section>

        {/* Section 3: How AI is used */}
        <section className="bg-[#fffdf8] border border-[#ddd5c4] p-6 sm:p-8 space-y-4">
          <h2 className="font-serif text-2xl font-medium text-[#1f1c18] tracking-tight">
            How AI is used
          </h2>
          <p className="text-sm text-[#1f1c18] leading-relaxed">
            The AI service operates as an assistant, not an authority. Its scope is strictly bounded:
          </p>

          <dl className="space-y-4 pt-2">
            <div className="border-t border-[#ddd5c4] pt-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-[#1f1c18] font-semibold">
                Second-pass judgement
              </dt>
              <dd className="text-sm text-[#5e574c] mt-1">
                Evaluates nuanced tone and complex claims after deterministic rules complete. AI output is validated against strict schemas before presentation.
              </dd>
            </div>

            <div className="border-t border-[#ddd5c4] pt-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-[#1f1c18] font-semibold">
                Intent-preserving suggestions
              </dt>
              <dd className="text-sm text-[#5e574c] mt-1">
                Generates minimal diff proposals for flagged spans, accompanied by an intent analysis verifying whether the author&apos;s meaning was altered.
              </dd>
            </div>

            <div className="border-t border-[#ddd5c4] pt-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-[#1f1c18] font-semibold">
                No source, no flag enforcement
              </dt>
              <dd className="text-sm text-[#5e574c] mt-1">
                Every finding must cite an approved guideline, fact, or term. Any candidate finding lacking an explicit source is stored as &ldquo;Needs human check&rdquo; and never styled as a definitive violation.
              </dd>
            </div>

            <div className="border-t border-[#ddd5c4] pt-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-[#1f1c18] font-semibold">
                Human-in-the-loop decisions
              </dt>
              <dd className="text-sm text-[#5e574c] mt-1">
                Suggestions are applied only when a human clicks Accept. Creators cannot approve their own content, and managers cannot bypass open high-severity flags requiring reviewer sign-off.
              </dd>
            </div>
          </dl>
        </section>

        {/* Section 4: What is never sent */}
        <section className="bg-[#fffdf8] border border-[#ddd5c4] p-6 sm:p-8 space-y-4">
          <h2 className="font-serif text-2xl font-medium text-[#1f1c18] tracking-tight">
            What is never sent
          </h2>
          <p className="text-sm text-[#1f1c18] leading-relaxed">
            Data privacy boundaries are enforced at the service layer:
          </p>

          <dl className="space-y-4 pt-2">
            <div className="border-t border-[#ddd5c4] pt-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-[#1f1c18] font-semibold">
                Confidential content
              </dt>
              <dd className="text-sm text-[#5e574c] mt-1">
                Submissions flagged as confidential are completely excluded from AI calls. Only local deterministic rules execute against confidential copy.
              </dd>
            </div>

            <div className="border-t border-[#ddd5c4] pt-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-[#1f1c18] font-semibold">
                PII and credentials
              </dt>
              <dd className="text-sm text-[#5e574c] mt-1">
                Emails, phone numbers, and API key patterns are automatically masked by a local redaction pre-pass before prompt assembly.
              </dd>
            </div>

            <div className="border-t border-[#ddd5c4] pt-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-[#1f1c18] font-semibold">
                Prompt injection isolation
              </dt>
              <dd className="text-sm text-[#5e574c] mt-1">
                Draft content is wrapped in strict delimiters and designated as passive data. System prompts instruct the model to disregard instructions contained within the text.
              </dd>
            </div>
          </dl>
        </section>

        {/* Section 5: Known limitations */}
        <section className="bg-[#fffdf8] border border-[#ddd5c4] p-6 sm:p-8 space-y-4">
          <h2 className="font-serif text-2xl font-medium text-[#1f1c18] tracking-tight">
            Known limitations
          </h2>
          <dl className="space-y-4">
            <div className="border-t border-[#ddd5c4] pt-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-[#1f1c18] font-semibold">
                Latency and network timeouts
              </dt>
              <dd className="text-sm text-[#5e574c] mt-1">
                AI evaluation has a 20-second timeout with a single retry. If the model service is unresponsive, the platform gracefully degrades by returning rule-based findings with an explicit advisory banner.
              </dd>
            </div>

            <div className="border-t border-[#ddd5c4] pt-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-[#1f1c18] font-semibold">
                Length constraints
              </dt>
              <dd className="text-sm text-[#5e574c] mt-1">
                Submissions are capped at 10,000 characters per version to ensure reliable evaluation and prevent truncation errors.
              </dd>
            </div>

            <div className="border-t border-[#ddd5c4] pt-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-[#1f1c18] font-semibold">
                Probabilistic judgements
              </dt>
              <dd className="text-sm text-[#5e574c] mt-1">
                AI suggestions may occasionally misread technical context or propose overly conservative edits. Human review and dispute workflows remain the definitive authority.
              </dd>
            </div>
          </dl>
        </section>

        {/* Section 6: Workspace & Demo Notice */}
        <footer className="pt-2 border-t border-[#ddd5c4] flex flex-wrap items-center justify-between gap-4 text-xs text-[#5e574c]">
          <div>
            <span>Demo organisation: </span>
            <strong className="text-[#1f1c18]">Verdant Skin (fictional skincare brand)</strong>
          </div>
          <div className="font-mono">
            Release build 1.0 · Inkloom AI Round 2
          </div>
        </footer>
      </div>
    </AppShell>
  );
}
