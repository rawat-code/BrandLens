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
  // Guideline
  const [gTitle, setGTitle] = useState('');
  const [gCategory, setGCategory] = useState('tone');
  const [gBody, setGBody] = useState('');
  const [gClarification, setGClarification] = useState('');

  // Fact
  const [fStatement, setFStatement] = useState('');
  const [fSourceNote, setFSourceNote] = useState('');
  const [fOwner, setFOwner] = useState('');
  const [fExpiresAt, setFExpiresAt] = useState('');
  const [fStatus, setFStatus] = useState<'approved' | 'retired' | 'expired'>('approved');

  // Term
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
    } else {
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
    } else {
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

  const handleParseImport = () => {
    setImportError(null);
    if (!importRawText.trim()) {
      setImportError('Please paste markdown text to parse.');
      return;
    }

    try {
      const parsed = parseGuidelinesMarkdown(importRawText, importDefaultCategory);
      if (parsed.length === 0) {
        setImportError('No guidelines could be parsed from the provided text. Make sure sections have headings.');
        return;
      }
      setParsedGuidelines(parsed);
      setImportStep('preview');
    } catch (err: unknown) {
      setImportError((err as Error).message);
    }
  };

  const handleImportSubmit = async () => {
    setIsImporting(true);
    setImportError(null);

    try {
      const res = await fetch('/api/library/guidelines/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guidelines: parsedGuidelines }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import guidelines');
      }

      setGuidelines((prev) => [...data.guidelines, ...prev]);
      setActiveTab('guidelines');
      setIsImportModalOpen(false);
      setImportRawText('');
      setParsedGuidelines([]);
      setImportStep('input');
      setImportSuccess(`Successfully imported ${data.count} guidelines into your brand library!`);
    } catch (err: unknown) {
      setImportError((err as Error).message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'edit' && !editingItem) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (activeTab === 'guidelines') {
        const payload = {
          title: gTitle,
          category: gCategory,
          body: gBody,
          clarification: gClarification.trim() || null,
        };

        const url =
          modalMode === 'create'
            ? '/api/library/guidelines'
            : `/api/library/guidelines/${editingItem?.id}`;
        const method = modalMode === 'create' ? 'POST' : 'PUT';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to save guideline');
        }

        if (modalMode === 'create') {
          setGuidelines((prev) => [data.guideline, ...prev]);
        } else {
          setGuidelines((prev) =>
            prev.map((g) => (g.id === editingItem?.id ? data.guideline : g))
          );
        }
      } else if (activeTab === 'facts') {
        const payload = {
          statement: fStatement,
          source_note: fSourceNote.trim() || null,
          owner: fOwner.trim() || null,
          expires_at: fExpiresAt ? new Date(fExpiresAt).toISOString() : null,
          status: fStatus,
        };

        const url =
          modalMode === 'create'
            ? '/api/library/facts'
            : `/api/library/facts/${editingItem?.id}`;
        const method = modalMode === 'create' ? 'POST' : 'PUT';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to save fact');
        }

        if (modalMode === 'create') {
          setFacts((prev) => [data.fact, ...prev]);
        } else {
          setFacts((prev) =>
            prev.map((f) => (f.id === editingItem?.id ? data.fact : f))
          );
        }
      } else {
        const payload = {
          term: tTerm,
          kind: tKind,
          replacement: tReplacement.trim() || null,
          note: tNote.trim() || null,
        };

        const url =
          modalMode === 'create'
            ? '/api/library/terms'
            : `/api/library/terms/${editingItem?.id}`;
        const method = modalMode === 'create' ? 'POST' : 'PUT';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to save term');
        }

        if (modalMode === 'create') {
          setTerms((prev) => [data.term, ...prev]);
        } else {
          setTerms((prev) =>
            prev.map((t) => (t.id === editingItem?.id ? data.term : t))
          );
        }
      }

      closeModal();
    } catch (err: unknown) {
      setFormError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetireFact = async (factId: string) => {
    try {
      const res = await fetch(`/api/library/facts/${factId}/retire`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to retire fact');
        return;
      }

      setFacts((prev) =>
        prev.map((f) => (f.id === factId ? { ...f, status: 'retired' as const } : f))
      );
    } catch {
      alert('Network error while retiring fact');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const url = `/api/library/${deleteTarget.type}/${deleteTarget.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete item');
      }

      if (deleteTarget.type === 'guidelines') {
        setGuidelines((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      } else if (deleteTarget.type === 'facts') {
        setFacts((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      } else {
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

  // Filtered entries based on search
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
    <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Governance library"
        description="Approved guidelines, clinical facts, and terminology standards that govern brand communications."
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
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                }
              >
                Import markdown
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={openCreateModal}
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              >
                {activeTab === 'guidelines' && 'Add guideline'}
                {activeTab === 'facts' && 'Add fact'}
                {activeTab === 'terms' && 'Add term'}
              </Button>
            </div>
          ) : (
            <span className="text-xs text-[#7b7b94] bg-[#171724] px-3 py-1.5 rounded-lg border border-white/[0.06]">
              Read-only view • Admins manage library
            </span>
          )
        }
      />

      {/* Import Success Banner */}
      {importSuccess && (
        <div
          role="alert"
          className="p-3.5 bg-[#5fd1a0]/10 border border-[#5fd1a0]/30 rounded-xl text-xs text-[#5fd1a0] flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span className="font-medium text-[#ececf6]">{importSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportSuccess(null)}
            className="text-xs font-mono underline hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        {/* Navigation Tabs */}
        <nav
          className="flex space-x-1"
          role="tablist"
          aria-label="Library sections"
        >
          {[
            { id: 'guidelines' as TabType, label: 'Brand guidelines', count: guidelines.length },
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
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#171724] text-[#ececf6] border border-white/10'
                  : 'text-[#a3a3bb] hover:text-[#ececf6]'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 text-[#7b7b94]">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            id="library-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#171724] text-[#ececf6] placeholder-[#7b7b94] border border-white/[0.08] rounded-lg focus:outline-none focus:border-indigo-400"
          />
          <svg
            className="w-3.5 h-3.5 text-[#7b7b94] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Main Tab Panels */}
      {/* 1. Guidelines Tab */}
      {activeTab === 'guidelines' && (
        <div role="tabpanel" aria-label="Brand guidelines" className="space-y-4">
          {filteredGuidelines.length === 0 ? (
            <div className="text-center py-12 bg-[#11111a] rounded-xl border border-white/[0.08] p-8">
              <h3 className="text-sm font-medium text-[#ececf6]">No guidelines found</h3>
              <p className="text-xs text-[#a3a3bb] mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No brand guidelines matched "${searchQuery}". Clear query to see all items.`
                  : 'No guidelines have been configured yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGuidelines.map((g) => (
                <div
                  key={g.id}
                  className="p-5 rounded-xl border border-white/[0.08] bg-[#11111a] hover:border-white/15 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Badge variant="indigo">
                        {g.category}
                      </Badge>
                      <span className="text-[11px] text-[#7b7b94] font-mono bg-[#171724] px-2 py-0.5 rounded border border-white/[0.06]">
                        v{g.version}
                      </span>
                    </div>

                    <h3 className="font-medium text-[#ececf6] text-sm leading-snug">
                      {g.title}
                    </h3>

                    <p className="text-xs text-[#a3a3bb] leading-relaxed whitespace-pre-line">
                      {g.body}
                    </p>

                    {g.clarification && (
                      <div className="p-3 bg-[#171724] border border-white/[0.06] rounded-lg text-xs text-[#fde68a]">
                        <strong className="font-medium text-[#ececf6] block mb-0.5">Application guidance:</strong>
                        <span>{g.clarification}</span>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(g)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDeleteTarget({
                            type: 'guidelines',
                            id: g.id,
                            title: g.title,
                          })
                        }
                        className="text-[#ff7a8a] hover:text-white"
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Facts Tab */}
      {activeTab === 'facts' && (
        <div role="tabpanel" aria-label="Approved facts" className="space-y-4">
          {filteredFacts.length === 0 ? (
            <div className="text-center py-12 bg-[#11111a] rounded-xl border border-white/[0.08] p-8">
              <h3 className="text-sm font-medium text-[#ececf6]">No verified facts found</h3>
              <p className="text-xs text-[#a3a3bb] mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No verified facts matched "${searchQuery}". Clear query to see all items.`
                  : 'No clinical or scientific facts have been registered yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFacts.map((f) => {
                const isExpiredByDate = f.expires_at ? new Date(f.expires_at) < new Date() : false;
                const isRetired = f.status === 'retired';
                const isActive = f.status === 'approved' && !isExpiredByDate;

                return (
                  <div
                    key={f.id}
                    className={`p-5 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                      !isActive
                        ? 'bg-[#11111a]/60 border-rose-500/20 opacity-80'
                        : 'bg-[#11111a] border-white/[0.08] hover:border-white/15'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Badge variant={isActive ? 'success' : 'high'}>
                          {isActive ? 'APPROVED' : isRetired ? 'RETIRED' : 'EXPIRED'}
                        </Badge>
                        {f.owner && (
                          <span className="text-xs text-[#7b7b94] font-mono">
                            Owner: {f.owner}
                          </span>
                        )}
                      </div>

                      <blockquote className="text-xs sm:text-sm font-mono text-[#ececf6] border-l-2 border-indigo-400 pl-3 italic">
                        &ldquo;{f.statement}&rdquo;
                      </blockquote>

                      {f.source_note && (
                        <div className="text-xs text-[#a3a3bb]">
                          <span className="text-[#ececf6] font-medium">Source: </span>
                          {f.source_note}
                        </div>
                      )}

                      {f.expires_at && (
                        <div className="text-xs text-[#7b7b94] font-mono">
                          <span>Expires: </span>
                          <span className={isExpiredByDate ? 'text-[#ff7a8a]' : 'text-[#ececf6]'}>
                            {new Date(f.expires_at).toLocaleDateString()}
                          </span>
                          {isExpiredByDate && (
                            <span className="ml-1.5 text-[#ff7a8a]">(Date passed)</span>
                          )}
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2">
                        {isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetireFact(f.id)}
                            className="text-[#f5b74f] hover:text-[#fde68a]"
                          >
                            Retire fact
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(f)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setDeleteTarget({
                              type: 'facts',
                              id: f.id,
                              title: f.statement,
                            })
                          }
                          className="text-[#ff7a8a] hover:text-white"
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Terminology Tab */}
      {activeTab === 'terms' && (
        <div role="tabpanel" aria-label="Terminology dictionary" className="space-y-4">
          {filteredTerms.length === 0 ? (
            <div className="text-center py-12 bg-[#11111a] rounded-xl border border-white/[0.08] p-8">
              <h3 className="text-sm font-medium text-[#ececf6]">No terms found</h3>
              <p className="text-xs text-[#a3a3bb] mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No terminology standards matched "${searchQuery}". Clear query to see all items.`
                  : 'No terminology rules have been created yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTerms.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-white/[0.08] bg-[#11111a] hover:border-white/15 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-medium text-sm text-[#ececf6]">
                        {t.term}
                      </span>
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
                    </div>

                    {t.replacement && (
                      <div className="p-2 bg-[#171724] rounded-lg border border-white/[0.06] text-xs">
                        <span className="text-[#7b7b94] font-mono uppercase text-[10px] block">Suggested replacement:</span>
                        <span className="font-mono text-[#5fd1a0]">{t.replacement}</span>
                      </div>
                    )}

                    {t.note && (
                      <p className="text-xs text-[#a3a3bb] leading-relaxed">
                        {t.note}
                      </p>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(t)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDeleteTarget({
                            type: 'terms',
                            id: t.id,
                            title: t.term,
                          })
                        }
                        className="text-[#ff7a8a] hover:text-white"
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT DIALOG */}
      <Dialog
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`${modalMode === 'create' ? 'Add new ' : 'Edit '}${
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
            className="mb-4 p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg text-xs text-[#ff7a8a]"
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* GUIDELINE FORM */}
          {activeTab === 'guidelines' && (
            <>
              <div>
                <label htmlFor="guideline-title" className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1">
                  Title *
                </label>
                <Input
                  id="guideline-title"
                  type="text"
                  required
                  value={gTitle}
                  onChange={(e) => setGTitle(e.target.value)}
                  placeholder="e.g. Tone: Empathic, Transparent, Non-Aggressive"
                />
              </div>

              <div>
                <label htmlFor="guideline-category" className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1">
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
                <label htmlFor="guideline-body" className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1">
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
                <label htmlFor="guideline-clarification" className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1">
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
                <label htmlFor="fact-statement" className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1">
                  Fact statement *
                </label>
                <Textarea
                  id="fact-statement"
                  required
                  rows={3}
                  value={fStatement}
                  onChange={(e) => setFStatement(e.target.value)}
                  placeholder="e.g. 78% of study participants observed smoother skin within 4 weeks."
                />
              </div>

              <div>
                <label htmlFor="fact-source" className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1">
                  Source note / citation
                </label>
                <Input
                  id="fact-source"
                  type="text"
                  value={fSourceNote}
                  onChange={(e) => setFSourceNote(e.target.value)}
                  placeholder="e.g. Clinical Study VS-2025-04, Third-Party Lab"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="fact-owner" className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1">
                    Owner / department
                  </label>
                  <Input
                    id="fact-owner"
                    type="text"
                    value={fOwner}
                    onChange={(e) => setFOwner(e.target.value)}
                    placeholder="e.g. Dr. Maya Lin, R&D"
                  />
                </div>

                <div>
                  <label htmlFor="fact-expires" className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1">
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
                <label htmlFor="fact-status" className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1">
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
                <label htmlFor="term-text" className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1">
                  Term / phrase *
                </label>
                <Input
                  id="term-text"
                  type="text"
                  required
                  value={tTerm}
                  onChange={(e) => setTTerm(e.target.value)}
                  placeholder="e.g. anti-aging, miracle cure, clean beauty"
                />
              </div>

              <div>
                <label htmlFor="term-kind" className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1">
                  Classification *
                </label>
                <Select
                  id="term-kind"
                  value={tKind}
                  onChange={(e) => setTKind(e.target.value as 'banned' | 'caution' | 'preferred')}
                >
                  <option value="banned">Banned (Flagged as High severity)</option>
                  <option value="caution">Caution (Flagged as Medium severity)</option>
                  <option value="preferred">Preferred (Recommended alternative)</option>
                </Select>
              </div>

              <div>
                <label htmlFor="term-replacement" className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1">
                  Suggested replacement (optional)
                </label>
                <Input
                  id="term-replacement"
                  type="text"
                  value={tReplacement}
                  onChange={(e) => setTReplacement(e.target.value)}
                  placeholder="e.g. age-supporting, clinically tested"
                />
              </div>

              <div>
                <label htmlFor="term-note" className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1">
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

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
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
        description="Are you sure you want to permanently delete this library entry?"
      >
        {deleteTarget && (
          <div className="space-y-4 text-xs sm:text-sm text-[#a3a3bb]">
            <div className="p-3 bg-[#11111a] rounded-lg border border-white/[0.06] font-mono text-xs text-[#ff7a8a]">
              &ldquo;{deleteTarget.title}&rdquo;
            </div>
            <p>
              This entry will no longer be cited in future reviews. Past review audit logs referencing it remain intact.
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
        description="Paste brand document sections or markdown tables to parse into individual guidelines."
        maxWidth="lg"
      >
        {importError && (
          <div
            role="alert"
            className="mb-4 p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg text-xs text-[#ff7a8a]"
          >
            {importError}
          </div>
        )}

        {importStep === 'input' ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="import-category" className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1">
                Default fallback category
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
              <label htmlFor="import-textarea" className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1">
                Paste markdown text
              </label>
              <Textarea
                id="import-textarea"
                rows={10}
                value={importRawText}
                onChange={(e) => setImportRawText(e.target.value)}
                placeholder="# Tone of Voice&#10;Write with clear empathy. Avoid aggressive superlatives.&#10;&#10;# Prohibited Claims&#10;Never state a product can cure or medically treat acne without prescription registration."
                className="font-mono"
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
                Parse &amp; preview →
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[#a3a3bb]">
              Parsed <strong className="text-[#ececf6]">{parsedGuidelines.length}</strong> guidelines. Review the preview below before committing:
            </p>

            <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.06] rounded-lg border border-white/[0.08] bg-[#11111a]">
              {parsedGuidelines.map((pg, idx) => (
                <div key={idx} className="p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#ececf6]">{pg.title}</span>
                    <Badge variant="indigo">{pg.category}</Badge>
                  </div>
                  <p className="text-[#a3a3bb] line-clamp-2">{pg.body}</p>
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
                ← Back to edit
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
