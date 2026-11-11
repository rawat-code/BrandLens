'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Role } from '@/lib/types';

interface StartHereCardProps {
  role?: Role | null;
  onDismiss?: () => void;
}

interface Step {
  title: string;
  desc: string;
}

const ROLE_GUIDES: Record<Role, { heading: string; steps: Step[]; actionLabel: string; actionHref: string }> = {
  creator: {
    heading: 'Creator Workflow: Draft, Review & Refine',
    steps: [
      {
        title: '1. Draft or Import Copy',
        desc: 'Create new copy or import existing .docx or .pdf documents with zero document storage.',
      },
      {
        title: '2. Run Verifiable Review',
        desc: 'Audit text against Verdant Skin guidelines, clinical facts, and approved terms. Every finding cites a source.',
      },
      {
        title: '3. Accept Edits & Submit',
        desc: 'Accept non-destructive suggestions (with meaning checks) and submit for manager or reviewer sign-off.',
      },
    ],
    actionLabel: 'Create new draft',
    actionHref: '/content/new',
  },
  manager: {
    heading: 'Manager Workflow: Supervise & Approve',
    steps: [
      {
        title: '1. Inspect Submissions',
        desc: 'Review submitted drafts from across the team. Creator-manager separation of duties is strictly enforced.',
      },
      {
        title: '2. Review Source Citations',
        desc: 'Verify that all flagged claims cite approved facts and guidelines before making decision.',
      },
      {
        title: '3. Approve or Request Changes',
        desc: 'Approve compliant content or request revisions with required human feedback comments.',
      },
    ],
    actionLabel: 'Review queue',
    actionHref: '/dashboard',
  },
  reviewer: {
    heading: 'Reviewer Workflow: Regulatory & Clinical Audit',
    steps: [
      {
        title: '1. Audit High-Severity Claims',
        desc: 'Focus on high-severity findings requiring formal reviewer authorization before publication.',
      },
      {
        title: '2. Inspect Verbatim Citations',
        desc: 'Check [✓ Verified verbatim] tags and detect stale source rules updated since review creation.',
      },
      {
        title: '3. Human Sign-Off',
        desc: 'Sign off or reject with full audit trail logging every reviewer action.',
      },
    ],
    actionLabel: 'Review queue',
    actionHref: '/dashboard',
  },
  admin: {
    heading: 'Administrator Workflow: Library & Governance Health',
    steps: [
      {
        title: '1. Curate Guidelines & Facts',
        desc: 'Add and update brand voice guidelines, verified clinical facts, and approved terminology.',
      },
      {
        title: '2. Resolve Policy Conflicts',
        desc: 'Inspect automated contradiction detection in Insights to eliminate tensions across brand rules.',
      },
      {
        title: '3. Review Governance Audit Log',
        desc: 'Audit append-only records of all transitions, guideline revisions, and intent override decisions.',
      },
    ],
    actionLabel: 'Manage library',
    actionHref: '/library',
  },
};

const STORAGE_KEY = 'brandlens_guide_dismissed';

export function StartHereCard({ role }: StartHereCardProps) {
  const [isDismissed, setIsDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setIsDismissed(false);
    }
  }, []);

  if (!mounted || isDismissed) {
    return null;
  }

  const effectiveRole: Role = role && ROLE_GUIDES[role] ? role : 'creator';
  const guide = ROLE_GUIDES[effectiveRole];

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsDismissed(true);
  };

  return (
    <aside
      aria-label="Getting started guide"
      className="bg-[#faf8f4] border border-[#ddd5c4] p-5 sm:p-6 mb-6"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-5 h-5 bg-[#1f1c18] text-[#f5f1e8] font-mono text-[11px] font-bold">
            i
          </span>
          <h2 className="font-serif text-lg font-medium text-[#1f1c18]">
            {guide.heading}
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-[#ede7da] text-[#5e574c] border border-[#ddd5c4]">
            {effectiveRole} guide
          </span>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-[#5e574c] hover:text-[#1f1c18] text-xs font-mono underline hover:no-underline cursor-pointer"
        >
          Dismiss guide
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {guide.steps.map((step, idx) => (
          <div
            key={idx}
            className="bg-[#fffdf8] border border-[#ddd5c4] p-4 flex flex-col justify-between"
          >
            <div>
              <strong className="block text-xs font-mono uppercase tracking-wider text-[#1f1c18] mb-1.5">
                {step.title}
              </strong>
              <p className="text-xs text-[#5e574c] leading-relaxed">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#ddd5c4] text-xs">
        <span className="text-[#5e574c]">
          Pre-publication governance for demo brand <strong className="text-[#1f1c18]">Verdant Skin</strong>.
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/content/new"
            className="text-xs font-mono text-[#1f1c18] underline hover:no-underline"
          >
            Try sample post &rarr;
          </Link>
          <Link
            href={guide.actionHref}
            className="px-3 py-1.5 bg-[#1f1c18] hover:bg-[#332f29] text-[#f5f1e8] font-mono text-[11px] uppercase tracking-wider transition-colors"
          >
            {guide.actionLabel}
          </Link>
        </div>
      </div>
    </aside>
  );
}
