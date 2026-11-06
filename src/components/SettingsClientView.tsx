'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
        text: 'All brand guidelines, facts, terms, and sample content have been cleared. Ready to load your brand!',
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
    <div className="p-6 md:p-8 max-w-4xl w-full mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Organisation Settings
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 border border-purple-200">
              Admin Only
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage your brand identity, workspace details, and governance data state.
          </p>
        </div>
      </div>

      {/* Global Success / Alert Banner */}
      {resetMessage && (
        <div
          role="alert"
          className={`p-4 rounded-xl border text-sm flex items-start justify-between gap-4 ${
            resetMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="space-y-1">
            <p className="font-semibold">{resetMessage.text}</p>
            {resetMessage.type === 'success' && (
              <p className="text-xs text-emerald-700">
                You can now head to the{' '}
                <Link href="/library" className="underline font-bold hover:text-emerald-900">
                  Brand Library
                </Link>{' '}
                to import your brand&apos;s guidelines, facts, and terminology.
              </p>
            )}
          </div>
          <button
            onClick={() => setResetMessage(null)}
            className="text-xs font-semibold px-2 py-1 rounded hover:bg-black/5"
            aria-label="Dismiss alert"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Card 1: Organisation Details */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Organisation Details</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              The display name rendered throughout the dashboard, sidebar, and review reports.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveName} className="p-6 space-y-4">
          {nameMessage && (
            <div
              role="alert"
              className={`p-3 rounded-lg text-xs font-medium border ${
                nameMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {nameMessage.text}
            </div>
          )}

          <div>
            <label htmlFor="org-name" className="block text-sm font-medium text-slate-700">
              Organisation / Brand Name
            </label>
            <div className="mt-1 flex flex-col sm:flex-row gap-3">
              <input
                id="org-name"
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                required
                maxLength={100}
                placeholder="e.g. Acme Corp, Verdant Skin"
                disabled={isSavingName}
                className="flex-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isSavingName || !editedName.trim() || editedName.trim() === orgName}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isSavingName ? 'Saving...' : 'Save Name'}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-6 text-xs text-slate-500">
            <div>
              <span className="font-medium text-slate-700">Organisation ID:</span>{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono select-all">
                {initialOrg.id}
              </code>
            </div>
            {initialOrg.created_at && (
              <div>
                <span className="font-medium text-slate-700">Created:</span>{' '}
                {new Date(initialOrg.created_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Card 2: Workspace Data Summary */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Current Workspace Data</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <span className="text-2xl font-bold text-slate-900 block">{counts.guidelines}</span>
            <span className="text-xs text-slate-500 font-medium">Guidelines</span>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <span className="text-2xl font-bold text-slate-900 block">{counts.facts}</span>
            <span className="text-xs text-slate-500 font-medium">Clinical Facts</span>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <span className="text-2xl font-bold text-slate-900 block">{counts.terms}</span>
            <span className="text-xs text-slate-500 font-medium">Terminology Terms</span>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <span className="text-2xl font-bold text-slate-900 block">{counts.contents}</span>
            <span className="text-xs text-slate-500 font-medium">Content Drafts</span>
          </div>
        </div>
      </div>

      {/* Card 3: Danger Zone (Start Fresh) */}
      <div className="bg-red-50/40 rounded-xl border border-red-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-red-100/50 border-b border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-700 text-base" aria-hidden="true">⚠️</span>
            <h2 className="text-base font-semibold text-red-950">Danger Zone: Start Fresh</h2>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-200/80 text-red-900">
            Irreversible
          </span>
        </div>

        <div className="p-6 space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            The <strong>Start fresh</strong> action permanently deletes all guidelines, clinical facts,
            terminology dictionaries, content submissions, and review findings for this organisation.
          </p>
          <div className="p-3 bg-white/80 rounded-lg border border-red-200/60 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-900">What will happen:</div>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              <li>All {counts.guidelines} guidelines, {counts.facts} facts, and {counts.terms} terms will be erased.</li>
              <li>All {counts.contents} content drafts, review histories, and comments will be deleted.</li>
              <li><strong>User accounts and append-only audit logs are safely preserved.</strong></li>
              <li>You can immediately load your real brand materials from the Library page.</li>
            </ul>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setConfirmationInput('');
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Start fresh...
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 text-xl">
                ⚠️
              </div>
              <div className="space-y-1">
                <h3 id="modal-title" className="text-lg font-bold text-slate-900">
                  Reset Brand Data: Start Fresh
                </h3>
                <p className="text-xs text-slate-500">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              To prevent accidental deletion, please type the exact organisation name{' '}
              <strong className="text-slate-900 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                {orgName}
              </strong>{' '}
              below to confirm:
            </p>

            <form onSubmit={handleStartFresh} className="space-y-4">
              <div>
                <label htmlFor="confirm-org-name" className="sr-only">
                  Confirm organisation name
                </label>
                <input
                  id="confirm-org-name"
                  type="text"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  placeholder={`Type "${orgName}" to confirm`}
                  autoFocus
                  disabled={isResetting}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isResetting}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canConfirmReset || isResetting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <span className="animate-spin text-xs">⟳</span>
                      <span>Clearing Data...</span>
                    </>
                  ) : (
                    'I understand, delete brand data'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
