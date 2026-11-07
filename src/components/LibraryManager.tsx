'use client';

import React, { useState } from 'react';
import type { Guideline, Fact, Term, Profile } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import {
  parseGuidelinesMarkdown,
  type ParsedGuideline,
  type GuidelineCategory,
} from '@/lib/library/markdown-parser';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';

interface LibraryManagerProps {
  user?: User;
  profile: Profile;
  initialGuidelines: Guideline[];
  initialFacts: Fact[];
  initialTerms: Term[];
}

type TabType = 'guidelines' | 'facts' | 'terms';

export function LibraryManager({
  profile,
  initialGuidelines,
  initialFacts,
  initialTerms,
}: LibraryManagerProps) {
  const isAdmin = profile.role === 'admin';

  const [activeTab, setActiveTab] = useState<TabType>('guidelines');
  const [searchQuery, setSearchQuery] = useState('');

  // Data state
  const [guidelines, setGuidelines] = useState<Guideline[]>(initialGuidelines);
  const [facts, setFacts] = useState<Fact[]>(initialFacts);
  const [terms, setTerms] = useState<Term[]>(initialTerms);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<Guideline | Fact | Term | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Import guidelines state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importDefaultCategory, setImportDefaultCategory] = useState<GuidelineCategory>('general');
  const [parsedGuidelines, setParsedGuidelines] = useState<ParsedGuideline[]>([]);
  const [importStep, setImportStep] = useState<'input' | 'preview'>('input');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: TabType;
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form fields
  const [gTitle, setGTitle] = useState('');
  const [gCategory, setGCategory] = useState('tone');
  const [gBody, setGBody] = useState('');
  const [gClarification, setGClarification] = useState('');

  const [fStatement, setFStatement] = useState('');
  const [fSourceNote, setFSourceNote] = useState('');
  const [fOwner, setFOwner] = useState('');
  const [fExpiresAt, setFExpiresAt] = useState('');
  const [fStatus, setFStatus] = useState<'approved' | 'retired' | 'expired'>('approved');

  const [tTerm, setTTerm] = useState('');
  const [tKind, setTKind] = useState<'banned' | 'caution' | 'preferred'>('banned');
  const [tReplacement, setTReplacement] = useState('');
  const [tNote, setTNote] = useState('');

  const openCreateModal = () => {
    setModalMode('create');
    setEditingItem(null);
    setFormError(null);

    if (activeTab === 'guidelines') {
      setGTitle('');
      setGCategory('tone');
      setGBody('');
      setGClarification('');
    } else if (activeTab === 'facts') {
      setFStatement('');
      setFSourceNote('');
      setFOwner('');
      setFExpiresAt('');
      setFStatus('approved');
    } else if (activeTab === 'terms') {
      setTTerm('');
      setTKind('banned');
      setTReplacement('');
      setTNote('');
    }

    setIsModalOpen(true);
  };

  const openEditModal = (item: Guideline | Fact | Term) => {
    setModalMode('edit');
    setEditingItem(item);
    setFormError(null);

    if (activeTab === 'guidelines') {
      const g = item as Guideline;
      setGTitle(g.title);
      setGCategory(g.category);
      setGBody(g.body);
      setGClarification(g.clarification || '');
    } else if (activeTab === 'facts') {
      const f = item as Fact;
      setFStatement(f.statement);
      setFSourceNote(f.source_note || '');
      setFOwner(f.owner || '');
      setFExpiresAt(f.expires_at ? f.expires_at.split('T')[0] : '');
      setFStatus(f.status);
    } else if (activeTab === 'terms') {
      const t = item as Term;
      setTTerm(t.term);
      setTKind(t.kind);
      setTReplacement(t.replacement || '');
      setTNote(t.note || '');
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormError(null);
  };

  const handleRetireFact = async (factId: string) => {
    try {
      const res = await fetch(`/api/library/facts/${factId}/retire`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to retire fact');

      setFacts((prev) =>
        prev.map((f) => (f.id === factId ? { ...f, status: 'retired' as const } : f))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error retiring fact';
      alert(message);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      let url = '';
      let method = 'POST';
      let payload: Record<string, unknown> = {};

      if (activeTab === 'guidelines') {
        url = editingItem ? `/api/library/guidelines/${editingItem.id}` : '/api/library/guidelines';
        method = editingItem ? 'PUT' : 'POST';
        payload = {
          title: gTitle.trim(),
          category: gCategory,
          body: gBody.trim(),
          clarification: gClarification.trim() || null,
        };
      } else if (activeTab === 'facts') {
        url = editingItem ? `/api/library/facts/${editingItem.id}` : '/api/library/facts';
        method = editingItem ? 'PUT' : 'POST';
        payload = {
          statement: fStatement.trim(),
          source_note: fSourceNote.trim() || null,
          owner: fOwner.trim() || null,
          expires_at: fExpiresAt ? new Date(fExpiresAt).toISOString() : null,
          status: fStatus,
        };
      } else if (activeTab === 'terms') {
        url = editingItem ? `/api/library/terms/${editingItem.id}` : '/api/library/terms';
        method = editingItem ? 'PUT' : 'POST';
        payload = {
          term: tTerm.trim(),
          kind: tKind,
          replacement: tReplacement.trim() || null,
          note: tNote.trim() || null,
        };
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      if (activeTab === 'guidelines') {
        const item = data.guideline as Guideline;
        if (editingItem) {
          setGuidelines((prev) => prev.map((g) => (g.id === item.id ? item : g)));
        } else {
          setGuidelines((prev) => [item, ...prev]);
        }
      } else if (activeTab === 'facts') {
        const item = data.fact as Fact;
        if (editingItem) {
          setFacts((prev) => prev.map((f) => (f.id === item.id ? item : f)));
        } else {
          setFacts((prev) => [item, ...prev]);
        }
      } else if (activeTab === 'terms') {
        const item = data.term as Term;
        if (editingItem) {
          setTerms((prev) => prev.map((t) => (t.id === item.id ? item : t)));
        } else {
          setTerms((prev) => [item, ...prev]);
        }
      }

      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParseImport = () => {
    setImportError(null);
    if (!importRawText.trim()) {
      setImportError('Please enter markdown text to parse');
      return;
    }

    try {
      const parsed = parseGuidelinesMarkdown(importRawText, importDefaultCategory);
      if (!parsed.length) {
        setImportError('Could not find any guidelines. Check formatting headings.');
        return;
      }
      setParsedGuidelines(parsed);
      setImportStep('preview');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to parse markdown');
    }
  };

  const handleImportSubmit = async () => {
    setIsImporting(true);
    setImportError(null);

    try {
      const res = await fetch('/api/library/guidelines/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawMarkdown: importRawText,
          defaultCategory: importDefaultCategory,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }

      const importedItems = (data.guidelines || []) as Guideline[];
      setGuidelines((prev) => [...importedItems, ...prev]);
      setIsImportModalOpen(false);
      setImportRawText('');
      setParsedGuidelines([]);
      setImportStep('input');
      setImportSuccess(`Imported ${importedItems.length} guidelines into library.`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/library/${deleteTarget.type}/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete item');
      }

      if (deleteTarget.type === 'guidelines') {
        setGuidelines((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      } else if (deleteTarget.type === 'facts') {
        setFacts((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      } else if (deleteTarget.type === 'terms') {
        setTerms((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      }

      setDeleteTarget(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting item';
      alert(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const q = searchQuery.toLowerCase().trim();

  const filteredGuidelines = guidelines.filter(
    (g) =>
      !q ||
      g.title.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.body.toLowerCase().includes(q) ||
      (g.clarification && g.clarification.toLowerCase().includes(q))
  );

  const filteredFacts = facts.filter(
    (f) =>
      !q ||
      f.statement.toLowerCase().includes(q) ||
      (f.owner && f.owner.toLowerCase().includes(q)) ||
      (f.source_note && f.source_note.toLowerCase().includes(q)) ||
      f.status.toLowerCase().includes(q)
  );

  const filteredTerms = terms.filter(
    (t) =>
      !q ||
      t.term.toLowerCase().includes(q) ||
      t.kind.toLowerCase().includes(q) ||
      (t.replacement && t.replacement.toLowerCase().includes(q)) ||
      (t.note && t.note.toLowerCase().includes(q))
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Library"
        description="Approved guidelines, verified facts, and terminology standards that govern brand communications."
        actions={
          isAdmin ? (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setImportError(null);
                  setImportStep('input');
                  setIsImportModalOpen(true);
                }}
              >
                Import markdown
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={openCreateModal}
              >
                {activeTab === 'guidelines' && 'Add guideline'}
                {activeTab === 'facts' && 'Add fact'}
                {activeTab === 'terms' && 'Add term'}
              </Button>
            </div>
          ) : (
            <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] bg-[#fffdf8] px-2.5 py-1 border border-[#ddd5c4]">
              Read-only · Admins manage library
            </span>
          )
        }
      />

      {/* Import Success Banner */}
      {importSuccess && (
        <div
          role="alert"
          className="p-3 bg-[#fffdf8] border border-[#1f6b3a] text-xs text-[#1f6b3a] flex items-center justify-between"
        >
          <span>{importSuccess}</span>
          <button
            type="button"
            onClick={() => setImportSuccess(null)}
            className="text-xs underline hover:opacity-75 cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Controls: Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Segmented Paper Tabs */}
        <div className="inline-flex items-center border border-[#ddd5c4] bg-[#fffdf8] rounded-none p-0 overflow-x-auto">
          {[
            { id: 'guidelines' as TabType, label: 'Guidelines', count: guidelines.length },
            { id: 'facts' as TabType, label: 'Approved facts', count: facts.length },
            { id: 'terms' as TabType, label: 'Terminology', count: terms.length },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
              }}
              className={`px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.04em] transition-colors cursor-pointer border-r last:border-r-0 border-[#ddd5c4] ${
                activeTab === tab.id
                  ? 'bg-[#1f1c18] text-[#f5f1e8]'
                  : 'bg-[#fffdf8] text-[#5e574c] hover:bg-[#f5f1e8] hover:text-[#1f1c18]'
              }`}
            >
              <span>{tab.label}</span>
              <span className="ml-1.5 opacity-75">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            id="library-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            aria-label={`Search ${activeTab}`}
            className="w-full bg-[#fffdf8] text-[#1f1c18] placeholder-[#5e574c] border border-[#ddd5c4] rounded-none px-3 py-1.5 text-xs focus:border-[#1f1c18] focus:outline-none"
          />
        </div>
      </div>

      {/* 1. Guidelines Ledger Table */}
      {activeTab === 'guidelines' && (
        <div className="border border-[#ddd5c4] bg-[#fffdf8] overflow-x-auto">
          {filteredGuidelines.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5e574c]">
              No brand guidelines matched your query.
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#fffdf8] border-b border-[#ddd5c4] font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] sticky top-14 z-10">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Category</th>
                  <th scope="col" className="px-5 py-3 font-medium">Title and rule body</th>
                  <th scope="col" className="px-5 py-3 font-medium">Version</th>
                  {isAdmin && <th scope="col" className="px-5 py-3 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ddd5c4]">
                {filteredGuidelines.map((g) => (
                  <tr key={g.id} className="hover:bg-[#f5f1e8] transition-colors duration-120">
                    <td className="px-5 py-3.5 align-top">
                      <span className="font-mono text-[11px] uppercase tracking-[0.04em] px-1.5 py-0.5 bg-[#f5f1e8] border border-[#ddd5c4] text-[#1f1c18] whitespace-nowrap inline-block">
                        {g.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 align-top max-w-xl">
                      <div className="font-medium text-[#1f1c18] text-sm">
                        {g.title}
                      </div>
                      <p className="text-xs text-[#5e574c] mt-1 leading-relaxed">
                        {g.body}
                      </p>
                      {g.clarification && (
                        <div className="mt-2 p-2.5 bg-[#f5f1e8] border border-[#ddd5c4] text-xs">
                          <strong className="font-mono text-[10px] uppercase text-[#1f1c18] block mb-0.5">
                            Application guidance:
                          </strong>
                          <span className="text-[#5e574c]">{g.clarification}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 align-top font-mono text-[12px] text-[#5e574c] whitespace-nowrap">
                      v{g.version}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3.5 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3 text-xs">
                          <button
                            type="button"
                            onClick={() => openEditModal(g)}
                            className="font-medium text-[#1f1c18] underline underline-offset-2 hover:text-[#5e574c] cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                type: 'guidelines',
                                id: g.id,
                                title: g.title,
                              })
                            }
                            className="font-medium text-[#b3261e] underline underline-offset-2 hover:opacity-75 cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 2. Facts Ledger Table */}
      {activeTab === 'facts' && (
        <div className="border border-[#ddd5c4] bg-[#fffdf8] overflow-x-auto">
          {filteredFacts.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5e574c]">
              No verified clinical facts found.
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#fffdf8] border-b border-[#ddd5c4] font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] sticky top-14 z-10">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 font-medium">Statement</th>
                  <th scope="col" className="px-5 py-3 font-medium">Source citation</th>
                  <th scope="col" className="px-5 py-3 font-medium">Owner</th>
                  {isAdmin && <th scope="col" className="px-5 py-3 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ddd5c4]">
                {filteredFacts.map((f) => {
                  const isExpiredByDate = f.expires_at ? new Date(f.expires_at) < new Date() : false;
                  const isRetired = f.status === 'retired';
                  const isActive = f.status === 'approved' && !isExpiredByDate;
                  const expiryDateFormatted = f.expires_at ? new Date(f.expires_at).toLocaleDateString() : '';

                  return (
                    <tr key={f.id} className="hover:bg-[#f5f1e8] transition-colors duration-120">
                      <td className="px-5 py-3.5 align-top whitespace-nowrap">
                        {isActive ? (
                          <Badge variant="success">Approved</Badge>
                        ) : isRetired ? (
                          <Badge variant="neutral">Retired</Badge>
                        ) : (
                          <span className="font-mono text-[11px] uppercase tracking-[0.04em] px-1.5 py-0.5 bg-[#fffdf8] border border-[#b3261e] text-[#b3261e] inline-block">
                            Expired ({expiryDateFormatted})
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 align-top max-w-md">
                        <blockquote className="source-quote text-[15px] text-[#1f1c18] border-l-2 border-[#1f1c18] pl-3 leading-relaxed">
                          &ldquo;{f.statement}&rdquo;
                        </blockquote>
                      </td>
                      <td className="px-5 py-3.5 align-top text-xs text-[#5e574c] max-w-xs">
                        {f.source_note || '—'}
                      </td>
                      <td className="px-5 py-3.5 align-top font-mono text-[12px] text-[#5e574c] whitespace-nowrap">
                        {f.owner || '—'}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3.5 align-top text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-3 text-xs">
                            {isActive && (
                              <button
                                type="button"
                                onClick={() => handleRetireFact(f.id)}
                                className="font-medium text-[#8a5a00] underline underline-offset-2 hover:opacity-75 cursor-pointer"
                              >
                                Retire
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditModal(f)}
                              className="font-medium text-[#1f1c18] underline underline-offset-2 hover:text-[#5e574c] cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'facts',
                                  id: f.id,
                                  title: f.statement,
                                })
                              }
                              className="font-medium text-[#b3261e] underline underline-offset-2 hover:opacity-75 cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 3. Terms Ledger Table */}
      {activeTab === 'terms' && (
        <div className="border border-[#ddd5c4] bg-[#fffdf8] overflow-x-auto">
          {filteredTerms.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5e574c]">
              No terminology standards found.
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#fffdf8] border-b border-[#ddd5c4] font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] sticky top-14 z-10">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Term</th>
                  <th scope="col" className="px-5 py-3 font-medium">Classification</th>
                  <th scope="col" className="px-5 py-3 font-medium">Suggested replacement</th>
                  <th scope="col" className="px-5 py-3 font-medium">Usage guidance</th>
                  {isAdmin && <th scope="col" className="px-5 py-3 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ddd5c4]">
                {filteredTerms.map((t) => (
                  <tr key={t.id} className="hover:bg-[#f5f1e8] transition-colors duration-120">
                    <td className="px-5 py-3.5 align-top font-mono text-[13px] font-medium text-[#1f1c18] whitespace-nowrap">
                      {t.term}
                    </td>
                    <td className="px-5 py-3.5 align-top whitespace-nowrap">
                      <Badge
                        variant={
                          t.kind === 'banned'
                            ? 'high'
                            : t.kind === 'caution'
                            ? 'medium'
                            : 'success'
                        }
                      >
                        {t.kind}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 align-top font-mono text-[12px] text-[#1f6b3a] whitespace-nowrap">
                      {t.replacement ? `+ ${t.replacement}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 align-top text-xs text-[#5e574c] max-w-sm">
                      {t.note || '—'}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3.5 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3 text-xs">
                          <button
                            type="button"
                            onClick={() => openEditModal(t)}
                            className="font-medium text-[#1f1c18] underline underline-offset-2 hover:text-[#5e574c] cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                type: 'terms',
                                id: t.id,
                                title: t.term,
                              })
                            }
                            className="font-medium text-[#b3261e] underline underline-offset-2 hover:opacity-75 cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CREATE / EDIT DIALOG */}
      <Dialog
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`${modalMode === 'create' ? 'Add ' : 'Edit '}${
          activeTab === 'guidelines'
            ? 'brand guideline'
            : activeTab === 'facts'
            ? 'approved fact'
            : 'terminology entry'
        }`}
      >
        {formError && (
          <div
            role="alert"
            className="mb-4 p-3 bg-[#fffdf8] border border-[#b3261e] text-xs text-[#b3261e]"
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* GUIDELINE FORM */}
          {activeTab === 'guidelines' && (
            <>
              <div>
                <label htmlFor="guideline-title" className="block text-xs font-mono uppercase text-[#5e574c] mb-1">
                  Title *
                </label>
                <Input
                  id="guideline-title"
                  type="text"
                  required
                  value={gTitle}
                  onChange={(e) => setGTitle(e.target.value)}
                  placeholder="e.g., Tone: Empathic, Transparent, Non-Aggressive"
                />
              </div>

              <div>
                <label htmlFor="guideline-category" className="block text-xs font-mono uppercase text-[#5e574c] mb-1">
                  Category *
                </label>
                <Select
                  id="guideline-category"
                  required
                  value={gCategory}
                  onChange={(e) => setGCategory(e.target.value)}
                >
                  <option value="tone">Tone</option>
                  <option value="messaging">Messaging</option>
                  <option value="claim">Claim Guardrail</option>
                  <option value="fact">Fact Citation</option>
                  <option value="visual">Visual &amp; Layout</option>
                  <option value="accessibility">Accessibility</option>
                  <option value="security">Security &amp; Privacy</option>
                  <option value="terminology">Terminology</option>
                </Select>
              </div>

              <div>
                <label htmlFor="guideline-body" className="block text-xs font-mono uppercase text-[#5e574c] mb-1">
                  Rule body *
                </label>
                <Textarea
                  id="guideline-body"
                  required
                  rows={4}
                  value={gBody}
                  onChange={(e) => setGBody(e.target.value)}
                  placeholder="Specify the exact brand rule or instruction..."
                />
              </div>

              <div>
                <label htmlFor="guideline-clarification" className="block text-xs font-mono uppercase text-[#5e574c] mb-1">
                  Application guidance / clarification (optional)
                </label>
                <Textarea
                  id="guideline-clarification"
                  rows={2}
                  value={gClarification}
                  onChange={(e) => setGClarification(e.target.value)}
                  placeholder="Clarify practical edge cases or examples..."
                />
              </div>
            </>
          )}

          {/* FACT FORM */}
          {activeTab === 'facts' && (
            <>
              <div>
                <label htmlFor="fact-statement" className="block text-xs font-mono uppercase text-[#5e574c] mb-1">
                  Fact statement *
                </label>
                <Textarea
                  id="fact-statement"
                  required
                  rows={3}
                  value={fStatement}
                  onChange={(e) => setFStatement(e.target.value)}
                  placeholder="e.g., 78% of study participants observed smoother skin within 4 weeks."
                />
              </div>

              <div>
                <label htmlFor="fact-source" className="block text-xs font-mono uppercase text-[#5e574c] mb-1">
                  Source note / citation
                </label>
                <Input
                  id="fact-source"
                  type="text"
                  value={fSourceNote}
                  onChange={(e) => setFSourceNote(e.target.value)}
                  placeholder="e.g., Clinical Study VS-2025-04, Third-Party Lab"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="fact-owner" className="block text-xs font-mono uppercase text-[#5e574c] mb-1">
                    Owner / department
                  </label>
                  <Input
                    id="fact-owner"
                    type="text"
                    value={fOwner}
                    onChange={(e) => setFOwner(e.target.value)}
                    placeholder="e.g., Dr. Maya Lin, R&D"
                  />
                </div>

                <div>
                  <label htmlFor="fact-expires" className="block text-xs font-mono uppercase text-[#5e574c] mb-1">
                    Expires at (optional)
                  </label>
                  <Input
                    id="fact-expires"
                    type="date"
                    value={fExpiresAt}
                    onChange={(e) => setFExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="fact-status" className="block text-xs font-mono uppercase text-[#5e574c] mb-1">
                  Status
                </label>
                <Select
                  id="fact-status"
                  value={fStatus}
                  onChange={(e) => setFStatus(e.target.value as 'approved' | 'retired' | 'expired')}
                >
                  <option value="approved">Approved &amp; active</option>
                  <option value="retired">Retired</option>
                  <option value="expired">Expired</option>
                </Select>
              </div>
            </>
          )}

          {/* TERM FORM */}
          {activeTab === 'terms' && (
            <>
              <div>
                <label htmlFor="term-text" className="block text-xs font-mono uppercase text-[#5e574c] mb-1">
                  Term / phrase *
                </label>
                <Input
                  id="term-text"
                  type="text"
                  required
                  value={tTerm}
                  onChange={(e) => setTTerm(e.target.value)}
                  placeholder="e.g., anti-aging, miracle cure, clean beauty"
                />
              </div>

              <div>
                <label htmlFor="term-kind" className="block text-xs font-mono uppercase text-[#5e574c] mb-1">
                  Classification *
                </label>
                <Select
                  id="term-kind"
                  value={tKind}
                  onChange={(e) => setTKind(e.target.value as 'banned' | 'caution' | 'preferred')}
                >
                  <option value="banned">Banned (High severity)</option>
                  <option value="caution">Caution (Medium severity)</option>
                  <option value="preferred">Preferred (Recommended alternative)</option>
                </Select>
              </div>

              <div>
                <label htmlFor="term-replacement" className="block text-xs font-mono uppercase text-[#5e574c] mb-1">
                  Suggested replacement (optional)
                </label>
                <Input
                  id="term-replacement"
                  type="text"
                  value={tReplacement}
                  onChange={(e) => setTReplacement(e.target.value)}
                  placeholder="e.g., age-supporting, clinically tested"
                />
              </div>

              <div>
                <label htmlFor="term-note" className="block text-xs font-mono uppercase text-[#5e574c] mb-1">
                  Usage guidance / note (optional)
                </label>
                <Textarea
                  id="term-note"
                  rows={2}
                  value={tNote}
                  onChange={(e) => setTNote(e.target.value)}
                  placeholder="Explain why this term is banned or how to use it safely..."
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#ddd5c4]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={closeModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              {modalMode === 'create' ? 'Save item' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Confirm deletion"
        description="Are you sure you want to delete this library item?"
      >
        {deleteTarget && (
          <div className="space-y-4 text-xs text-[#5e574c]">
            <div className="p-3 bg-[#f5f1e8] border border-[#ddd5c4] font-mono text-xs text-[#b3261e]">
              &ldquo;{deleteTarget.title}&rdquo;
            </div>
            <p>
              This entry will no longer be cited in future reviews. Past audit logs remain intact.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={confirmDelete}
                disabled={isDeleting}
                isLoading={isDeleting}
              >
                Delete item
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* IMPORT GUIDELINES DIALOG */}
      <Dialog
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import guidelines from markdown"
        description="Paste markdown sections to parse into individual guideline entries."
        maxWidth="lg"
      >
        {importError && (
          <div
            role="alert"
            className="mb-4 p-3 bg-[#fffdf8] border border-[#b3261e] text-xs text-[#b3261e]"
          >
            {importError}
          </div>
        )}

        {importStep === 'input' ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="import-category" className="block text-xs font-mono uppercase text-[#5e574c] mb-1">
                Default category
              </label>
              <Select
                id="import-category"
                value={importDefaultCategory}
                onChange={(e) => setImportDefaultCategory(e.target.value as GuidelineCategory)}
              >
                <option value="general">General / Auto-Detect</option>
                <option value="tone">Tone of Voice</option>
                <option value="messaging">Brand Messaging</option>
                <option value="claim">Claim Guardrails</option>
                <option value="visual">Visual Standards</option>
                <option value="accessibility">Accessibility</option>
                <option value="security">Security &amp; Privacy</option>
              </Select>
            </div>

            <div>
              <label htmlFor="import-textarea" className="block text-xs font-mono uppercase text-[#5e574c] mb-1">
                Paste markdown text
              </label>
              <Textarea
                id="import-textarea"
                rows={10}
                value={importRawText}
                onChange={(e) => setImportRawText(e.target.value)}
                placeholder="# Tone of Voice&#10;Write with clear empathy. Avoid aggressive superlatives.&#10;&#10;# Prohibited Claims&#10;Never state a product can cure or medically treat acne."
                className="font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsImportModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleParseImport}
              >
                Parse and preview
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[#5e574c]">
              Parsed <strong className="text-[#1f1c18] font-mono">{parsedGuidelines.length}</strong> guidelines. Review the preview below before importing:
            </p>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#ddd5c4] border border-[#ddd5c4] bg-[#fffdf8]">
              {parsedGuidelines.map((pg, idx) => (
                <div key={idx} className="p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#1f1c18]">{pg.title}</span>
                    <span className="font-mono text-[10px] uppercase text-[#5e574c] px-1 py-0.5 bg-[#f5f1e8] border border-[#ddd5c4]">
                      {pg.category}
                    </span>
                  </div>
                  <p className="text-[#5e574c] line-clamp-2">{pg.body}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setImportStep('input')}
                disabled={isImporting}
              >
                Back to edit
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleImportSubmit}
                disabled={isImporting}
                isLoading={isImporting}
              >
                {isImporting ? 'Importing...' : `Import ${parsedGuidelines.length} guidelines`}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
