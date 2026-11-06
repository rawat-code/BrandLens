'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

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
      setNameMessage({ type: 'success', text: 'Organisation name updated successfully.' });
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
    <div className="p-6 sm:p-8 max-w-4xl w-full mx-auto space-y-6">
      <PageHeader
        title="Settings"
        description="Workspace governance parameters, brand identity, and data lifecycle management."
      />

      {resetMessage && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            resetMessage.type === 'success'
              ? 'bg-[#5fd1a0]/10 text-[#5fd1a0] border-[#5fd1a0]/30'
              : 'bg-rose-500/10 text-[#ff7a8a] border-rose-500/30'
          }`}
        >
          <div>
            <span className="font-medium">{resetMessage.text}</span>
            {resetMessage.type === 'success' && (
              <p className="text-xs text-[#a3a3bb] mt-0.5">
                Head to the{' '}
                <Link href="/library" className="underline text-[#a5b4fc] hover:text-white">
                  Brand library
                </Link>{' '}
                to load fresh brand guidelines.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setResetMessage(null)}
            className="text-xs font-mono underline hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Card 1: Organisation Details */}
      <Card variant="panel">
        <CardHeader>
          <div>
            <CardTitle>Organisation details</CardTitle>
            <CardDescription>
              The display name rendered throughout the workspace and review reports.
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSaveName} className="p-5 sm:p-6 space-y-4">
          {nameMessage && (
            <div
              role="alert"
              className={`p-3 rounded-lg text-xs font-mono border ${
                nameMessage.type === 'success'
                  ? 'bg-[#5fd1a0]/10 text-[#5fd1a0] border-[#5fd1a0]/30'
                  : 'bg-rose-500/10 text-[#ff7a8a] border-rose-500/25'
              }`}
            >
              {nameMessage.text}
            </div>
          )}

          <div>
            <label htmlFor="org-name" className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1.5">
              Organisation / brand name
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

          <div className="pt-3 border-t border-white/[0.06] flex flex-wrap gap-6 text-xs text-[#7b7b94]">
            <div>
              <span className="text-[#a3a3bb]">Organisation ID:</span>{' '}
              <code className="bg-[#171724] px-1.5 py-0.5 rounded text-[11px] font-mono text-[#ececf6] select-all border border-white/[0.06]">
                {initialOrg.id}
              </code>
            </div>
            {initialOrg.created_at && (
              <div>
                <span className="text-[#a3a3bb]">Created:</span>{' '}
                <span className="font-mono text-[#ececf6]">{new Date(initialOrg.created_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </form>
      </Card>

      {/* Card 2: Workspace Data Summary */}
      <Card variant="panel" className="p-5 sm:p-6 space-y-4">
        <div>
          <CardTitle>Current workspace data</CardTitle>
          <CardDescription>
            Inventory of registered guidelines, facts, terms, and submissions.
          </CardDescription>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-[#171724] border border-white/[0.06] text-center">
            <span className="text-2xl font-mono text-[#ececf6] block">{counts.guidelines}</span>
            <span className="text-xs text-[#a3a3bb] mt-0.5 block">Guidelines</span>
          </div>
          <div className="p-4 rounded-xl bg-[#171724] border border-white/[0.06] text-center">
            <span className="text-2xl font-mono text-[#ececf6] block">{counts.facts}</span>
            <span className="text-xs text-[#a3a3bb] mt-0.5 block">Clinical facts</span>
          </div>
          <div className="p-4 rounded-xl bg-[#171724] border border-white/[0.06] text-center">
            <span className="text-2xl font-mono text-[#ececf6] block">{counts.terms}</span>
            <span className="text-xs text-[#a3a3bb] mt-0.5 block">Terminology</span>
          </div>
          <div className="p-4 rounded-xl bg-[#171724] border border-white/[0.06] text-center">
            <span className="text-2xl font-mono text-[#ececf6] block">{counts.contents}</span>
            <span className="text-xs text-[#a3a3bb] mt-0.5 block">Submissions</span>
          </div>
        </div>
      </Card>

      {/* Card 3: Danger Zone (Start Fresh) */}
      <Card variant="panel" className="border-rose-500/25 overflow-hidden">
        <CardHeader className="bg-rose-500/[0.04] border-b border-rose-500/20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff7a8a]" />
            <CardTitle className="text-[#ff7a8a]">Danger zone: Start fresh</CardTitle>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-500/15 text-[#ff7a8a] border border-rose-500/30">
            Irreversible
          </span>
        </CardHeader>

        <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm text-[#a3a3bb] leading-relaxed">
          <p>
            The <strong className="text-[#ececf6]">Start fresh</strong> action permanently clears all guidelines, clinical facts,
            terminology dictionaries, content submissions, and review findings for this organisation.
          </p>

          <div className="p-3 bg-[#171724] rounded-lg border border-white/[0.06] text-xs text-[#a3a3bb] space-y-1">
            <div className="font-medium text-[#ececf6]">What will happen:</div>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              <li>All {counts.guidelines} guidelines, {counts.facts} facts, and {counts.terms} terms will be erased.</li>
              <li>All {counts.contents} content drafts, review histories, and comments will be deleted.</li>
              <li><strong className="text-[#5fd1a0]">User accounts and append-only audit logs are safely preserved.</strong></li>
            </ul>
          </div>

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
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Reset brand data: Start fresh"
        description="This action is permanent and cannot be undone."
      >
        <div className="space-y-4 text-xs sm:text-sm text-[#a3a3bb]">
          <p>
            To prevent accidental deletion, please type the exact organisation name{' '}
            <strong className="text-[#ececf6] font-mono bg-[#11111a] px-1.5 py-0.5 rounded border border-white/10">
              {orgName}
            </strong>{' '}
            below to confirm:
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
                className="font-mono"
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
                {isResetting ? 'Clearing data...' : 'I understand, delete brand data'}
              </Button>
            </div>
          </form>
        </div>
      </Dialog>
    </div>
  );
}
