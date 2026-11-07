'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { PageHeader } from '@/components/ui/PageHeader';

interface SettingsClientViewProps {
  initialOrg: {
    id: string;
    name: string;
    created_at?: string;
  };
  counts: {
    guidelines: number;
    facts: number;
    terms: number;
    contents: number;
  };
  onOrgNameChange?: (newName: string) => void;
}

export function SettingsClientView({
  initialOrg,
  counts: initialCounts,
  onOrgNameChange,
}: SettingsClientViewProps) {
  const router = useRouter();
  const [orgName, setOrgName] = useState(initialOrg.name);
  const [editedName, setEditedName] = useState(initialOrg.name);
  const [counts, setCounts] = useState(initialCounts);

  // Name edit state
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Start fresh modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedName.trim()) {
      setNameMessage({ type: 'error', text: 'Organisation name cannot be empty.' });
      return;
    }

    setIsSavingName(true);
    setNameMessage(null);

    try {
      const res = await fetch('/api/settings/org', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update organisation name');
      }

      setOrgName(data.org.name);
      setEditedName(data.org.name);
      setNameMessage({ type: 'success', text: 'Organisation name updated.' });
      if (onOrgNameChange) {
        onOrgNameChange(data.org.name);
      }
      router.refresh();
    } catch (err: unknown) {
      setNameMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleStartFresh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmationInput.trim().toLowerCase() !== orgName.trim().toLowerCase()) {
      setResetMessage({
        type: 'error',
        text: `Confirmation name does not match "${orgName}".`,
      });
      return;
    }

    setIsResetting(true);
    setResetMessage(null);

    try {
      const res = await fetch('/api/settings/start-fresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationName: confirmationInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset organisation brand data');
      }

      setCounts({ guidelines: 0, facts: 0, terms: 0, contents: 0 });
      setIsModalOpen(false);
      setConfirmationInput('');
      setResetMessage({
        type: 'success',
        text: 'All brand guidelines, facts, terms, and content drafts have been cleared.',
      });
      router.refresh();
    } catch (err: unknown) {
      setResetMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setIsResetting(false);
    }
  };

  const canConfirmReset = confirmationInput.trim().toLowerCase() === orgName.trim().toLowerCase();

  return (
    <div className="max-w-4xl w-full mx-auto space-y-8">
      <PageHeader
        title="Settings"
        description="Organisation configuration, repository counts, and reset controls."
      />

      {resetMessage && (
        <div
          role="alert"
          className={`p-4 text-xs flex items-center justify-between border ${
            resetMessage.type === 'success'
              ? 'bg-[#fffdf8] text-[#1f6b3a] border-[#1f6b3a]'
              : 'bg-[#fffdf8] text-[#b3261e] border-[#b3261e]'
          }`}
        >
          <div>
            <span className="font-medium">{resetMessage.text}</span>
            {resetMessage.type === 'success' && (
              <p className="text-xs text-[#5e574c] mt-0.5">
                Visit the{' '}
                <Link href="/library" className="underline text-[#1f1c18] hover:text-[#5e574c]">
                  library
                </Link>{' '}
                to import new brand guidelines.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setResetMessage(null)}
            className="text-xs font-mono uppercase underline text-[#5e574c] hover:text-[#1f1c18]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section 1: Organisation Details */}
      <section className="bg-[#fffdf8] border border-[#ddd5c4] p-6 space-y-6">
        <div>
          <h2 className="font-serif text-2xl font-medium text-[#1f1c18] tracking-tight">
            Organisation details
          </h2>
          <p className="text-sm text-[#5e574c] mt-1">
            Display name shown across review reports, notifications, and approval queues.
          </p>
        </div>

        <form onSubmit={handleSaveName} className="space-y-4">
          {nameMessage && (
            <div
              role="alert"
              className={`p-3 text-xs font-mono border ${
                nameMessage.type === 'success'
                  ? 'bg-[#fffdf8] text-[#1f6b3a] border-[#1f6b3a]'
                  : 'bg-[#fffdf8] text-[#b3261e] border-[#b3261e]'
              }`}
            >
              {nameMessage.text}
            </div>
          )}

          <div>
            <label htmlFor="org-name" className="block text-[11px] font-mono uppercase tracking-wider text-[#5e574c] mb-1.5">
              Organisation name
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Input
                id="org-name"
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                required
                maxLength={100}
                placeholder="e.g. Verdant Skin"
                disabled={isSavingName}
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSavingName || !editedName.trim() || editedName.trim() === orgName}
                isLoading={isSavingName}
                className="shrink-0"
              >
                {isSavingName ? 'Saving...' : 'Save name'}
              </Button>
            </div>
          </div>

          <dl className="pt-4 border-t border-[#ddd5c4] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <dt className="text-[11px] font-mono uppercase tracking-wider text-[#5e574c]">Organisation identifier</dt>
              <dd className="font-mono text-[#1f1c18] mt-0.5 select-all">{initialOrg.id}</dd>
            </div>
            {initialOrg.created_at && (
              <div>
                <dt className="text-[11px] font-mono uppercase tracking-wider text-[#5e574c]">Created</dt>
                <dd className="font-mono text-[#1f1c18] mt-0.5">{new Date(initialOrg.created_at).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>
        </form>
      </section>

      {/* Section 2: Workspace Data Summary */}
      <section className="bg-[#fffdf8] border border-[#ddd5c4] p-6 space-y-4">
        <div>
          <h2 className="font-serif text-2xl font-medium text-[#1f1c18] tracking-tight">
            Current inventory
          </h2>
          <p className="text-sm text-[#5e574c] mt-1">
            Registered governance items and content submissions in this workspace.
          </p>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-4 bg-[#f5f1e8] border border-[#ddd5c4] text-center">
            <dd className="text-2xl font-mono font-semibold text-[#1f1c18]">{counts.guidelines}</dd>
            <dt className="text-[11px] font-mono uppercase tracking-wider text-[#5e574c] mt-1">Guidelines</dt>
          </div>
          <div className="p-4 bg-[#f5f1e8] border border-[#ddd5c4] text-center">
            <dd className="text-2xl font-mono font-semibold text-[#1f1c18]">{counts.facts}</dd>
            <dt className="text-[11px] font-mono uppercase tracking-wider text-[#5e574c] mt-1">Clinical facts</dt>
          </div>
          <div className="p-4 bg-[#f5f1e8] border border-[#ddd5c4] text-center">
            <dd className="text-2xl font-mono font-semibold text-[#1f1c18]">{counts.terms}</dd>
            <dt className="text-[11px] font-mono uppercase tracking-wider text-[#5e574c] mt-1">Terminology</dt>
          </div>
          <div className="p-4 bg-[#f5f1e8] border border-[#ddd5c4] text-center">
            <dd className="text-2xl font-mono font-semibold text-[#1f1c18]">{counts.contents}</dd>
            <dt className="text-[11px] font-mono uppercase tracking-wider text-[#5e574c] mt-1">Submissions</dt>
          </div>
        </dl>
      </section>

      {/* Section 3: Danger Zone */}
      <section className="bg-[#fffdf8] border border-[#ddd5c4] border-t-4 border-t-[#b3261e] p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-medium text-[#b3261e] tracking-tight">
              Start fresh
            </h2>
            <p className="text-sm text-[#5e574c] mt-1">
              Permanently clear all library items, content submissions, and review findings.
            </p>
          </div>
          <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 border border-[#b3261e] text-[#b3261e]">
            Irreversible
          </span>
        </div>

        <div className="text-sm text-[#1f1c18] leading-relaxed space-y-3">
          <p>
            This action deletes all guidelines, clinical facts, terminology entries, content drafts, and
            associated findings.
          </p>

          <dl className="p-4 bg-[#f5f1e8] border border-[#ddd5c4] space-y-2 text-xs">
            <div>
              <dt className="font-mono uppercase tracking-wider text-[#5e574c]">Items deleted</dt>
              <dd className="text-[#1f1c18] mt-0.5">
                {counts.guidelines} guidelines, {counts.facts} clinical facts, {counts.terms} terminology entries, and {counts.contents} content submissions.
              </dd>
            </div>
            <div>
              <dt className="font-mono uppercase tracking-wider text-[#5e574c]">Items preserved</dt>
              <dd className="text-[#1f6b3a] font-medium mt-0.5">
                User accounts, role assignments, and append-only audit log records are kept intact.
              </dd>
            </div>
          </dl>

          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                setConfirmationInput('');
                setIsModalOpen(true);
              }}
            >
              Start fresh...
            </Button>
          </div>
        </div>
      </section>

      {/* Confirmation Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Reset brand data"
        description="This action is permanent and cannot be undone."
      >
        <div className="space-y-4 text-sm text-[#1f1c18]">
          <p>
            To confirm deletion, type the organisation name{' '}
            <strong className="font-mono bg-[#f5f1e8] px-1.5 py-0.5 border border-[#ddd5c4]">
              {orgName}
            </strong>{' '}
            below:
          </p>

          <form onSubmit={handleStartFresh} className="space-y-4">
            <div>
              <Input
                id="confirm-org-name"
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder={`Type "${orgName}" to confirm`}
                autoFocus
                disabled={isResetting}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isResetting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                disabled={!canConfirmReset || isResetting}
                isLoading={isResetting}
              >
                {isResetting ? 'Clearing data...' : 'Delete brand data'}
              </Button>
            </div>
          </form>
        </div>
      </Dialog>
    </div>
  );
}
