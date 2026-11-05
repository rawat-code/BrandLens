'use client';

import React, { useState } from 'react';
import type { Guideline, Fact, Term, Profile } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

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
  const [fStatus, setFStatus] = useState<'approved' | 'retired'>('approved');

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
      setFStatus(f.status === 'retired' ? 'retired' : 'approved');
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setFormError(message);
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
        prev.map((f) => (f.id === factId ? { ...f, status: 'retired' } : f))
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Governance Library
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Verdant Skin
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Approved guidelines, clinical facts, and terminology standards that govern brand communications.
          </p>
        </div>

        {/* Action Button & Role info */}
        <div className="flex items-center gap-3">
          {!isAdmin && (
            <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              Read-only view • Admins manage library
            </span>
          )}
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>
                {activeTab === 'guidelines' && 'Add Guideline'}
                {activeTab === 'facts' && 'Add Fact'}
                {activeTab === 'terms' && 'Add Term'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        {/* Navigation Tabs */}
        <nav
          className="flex space-x-2"
          role="tablist"
          aria-label="Library sections"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'guidelines'}
            onClick={() => {
              setActiveTab('guidelines');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
              activeTab === 'guidelines'
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>Brand Guidelines</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'guidelines'
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {guidelines.length}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'facts'}
            onClick={() => {
              setActiveTab('facts');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
              activeTab === 'facts'
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>Approved Facts</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'facts'
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {facts.length}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'terms'}
            onClick={() => {
              setActiveTab('terms');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
              activeTab === 'terms'
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>Terminology</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'terms'
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {terms.length}
            </span>
          </button>
        </nav>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <label htmlFor="library-search" className="sr-only">
            Search library items
          </label>
          <input
            id="library-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Main Tab Panels */}
      {/* 1. Guidelines Tab */}
      {activeTab === 'guidelines' && (
        <div role="tabpanel" aria-label="Brand Guidelines" className="space-y-4">
          {filteredGuidelines.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
              <svg
                className="w-12 h-12 text-slate-300 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <h3 className="text-base font-semibold text-slate-900">No guidelines found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No brand guidelines matched "${searchQuery}". Clear your search query to see all items.`
                  : 'No guidelines have been configured yet.'}
              </p>
              {isAdmin && !searchQuery && (
                <button
                  onClick={openCreateModal}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
                >
                  Create First Guideline
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGuidelines.map((g) => (
                <div
                  key={g.id}
                  className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {g.category}
                      </span>
                      <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        v{g.version}
                      </span>
                    </div>

                    <h3 className="font-semibold text-slate-900 text-base leading-snug">
                      {g.title}
                    </h3>

                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {g.body}
                    </p>

                    {g.clarification && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900">
                        <strong className="font-semibold block mb-0.5">Application Guidance:</strong>
                        <span>{g.clarification}</span>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(g)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            type: 'guidelines',
                            id: g.id,
                            title: g.title,
                          })
                        }
                        className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                      >
                        Delete
                      </button>
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
        <div role="tabpanel" aria-label="Approved Facts" className="space-y-4">
          {filteredFacts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
              <svg
                className="w-12 h-12 text-slate-300 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-base font-semibold text-slate-900">No verified facts found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No verified facts matched "${searchQuery}". Clear your search query to see all items.`
                  : 'No clinical or scientific facts have been registered yet.'}
              </p>
              {isAdmin && !searchQuery && (
                <button
                  onClick={openCreateModal}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
                >
                  Add First Fact
                </button>
              )}
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
                    className={`p-5 rounded-xl border shadow-sm transition-all flex flex-col justify-between ${
                      !isActive
                        ? 'bg-slate-50/80 border-slate-300 opacity-80'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-md font-semibold uppercase tracking-wider border ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}
                        >
                          {isActive ? 'APPROVED' : isRetired ? 'RETIRED' : 'EXPIRED'}
                        </span>
                        {f.owner && (
                          <span className="text-xs text-slate-500 font-medium">
                            Owner: {f.owner}
                          </span>
                        )}
                      </div>

                      <blockquote className="text-sm font-medium text-slate-900 border-l-2 border-emerald-500 pl-3 italic">
                        &ldquo;{f.statement}&rdquo;
                      </blockquote>

                      {f.source_note && (
                        <div className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">Source: </span>
                          {f.source_note}
                        </div>
                      )}

                      {f.expires_at && (
                        <div className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">Expires: </span>
                          {new Date(f.expires_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                          {isExpiredByDate && (
                            <span className="ml-1.5 text-rose-600 font-semibold">(Date Passed)</span>
                          )}
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                        {isActive && (
                          <button
                            onClick={() => handleRetireFact(f.id)}
                            className="px-2.5 py-1 text-xs font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors border border-amber-200"
                            title="Mark fact as retired so creators can no longer cite it as active"
                          >
                            Retire Fact
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(f)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({
                              type: 'facts',
                              id: f.id,
                              title: f.statement,
                            })
                          }
                          className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                        >
                          Delete
                        </button>
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
        <div role="tabpanel" aria-label="Terminology Dictionary" className="space-y-4">
          {filteredTerms.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
              <svg
                className="w-12 h-12 text-slate-300 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
              <h3 className="text-base font-semibold text-slate-900">No terms found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No terminology standards matched "${searchQuery}". Clear your search query to see all items.`
                  : 'No terminology rules have been created yet.'}
              </p>
              {isAdmin && !searchQuery && (
                <button
                  onClick={openCreateModal}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
                >
                  Add First Term
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTerms.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-base text-slate-900 font-mono">
                        {t.term}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider border ${
                          t.kind === 'banned'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : t.kind === 'caution'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {t.kind}
                      </span>
                    </div>

                    {t.replacement && (
                      <div className="p-2 bg-emerald-50/60 rounded border border-emerald-200 text-xs text-emerald-900">
                        <span className="font-semibold block">Suggested Replacement:</span>
                        <span className="font-mono font-medium">{t.replacement}</span>
                      </div>
                    )}

                    {t.note && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t.note}
                      </p>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(t)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            type: 'terms',
                            id: t.id,
                            title: t.term,
                          })
                        }
                        className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeModal();
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 id="modal-title" className="text-lg font-bold text-slate-900">
                {modalMode === 'create' ? 'Add New ' : 'Edit '}
                {activeTab === 'guidelines' && 'Brand Guideline'}
                {activeTab === 'facts' && 'Approved Fact'}
                {activeTab === 'terms' && 'Terminology Entry'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* GUIDELINE FORM */}
              {activeTab === 'guidelines' && (
                <>
                  <div>
                    <label
                      htmlFor="guideline-title"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Title *
                    </label>
                    <input
                      id="guideline-title"
                      type="text"
                      required
                      value={gTitle}
                      onChange={(e) => setGTitle(e.target.value)}
                      placeholder="e.g. Tone: Empathic, Transparent, Non-Aggressive"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="guideline-category"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Category *
                    </label>
                    <select
                      id="guideline-category"
                      required
                      value={gCategory}
                      onChange={(e) => setGCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    >
                      <option value="tone">Tone</option>
                      <option value="messaging">Messaging</option>
                      <option value="claim">Claim Guardrail</option>
                      <option value="fact">Fact Citation</option>
                      <option value="visual">Visual & Layout</option>
                      <option value="accessibility">Accessibility</option>
                      <option value="security">Security & Privacy</option>
                      <option value="terminology">Terminology</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="guideline-body"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Rule Body *
                    </label>
                    <textarea
                      id="guideline-body"
                      required
                      rows={4}
                      value={gBody}
                      onChange={(e) => setGBody(e.target.value)}
                      placeholder="Specify the exact brand rule or instruction..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="guideline-clarification"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Application Guidance / Clarification (Optional)
                    </label>
                    <textarea
                      id="guideline-clarification"
                      rows={2}
                      value={gClarification}
                      onChange={(e) => setGClarification(e.target.value)}
                      placeholder="Clarify practical edge cases or examples..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </>
              )}

              {/* FACT FORM */}
              {activeTab === 'facts' && (
                <>
                  <div>
                    <label
                      htmlFor="fact-statement"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Fact Statement *
                    </label>
                    <textarea
                      id="fact-statement"
                      required
                      rows={3}
                      value={fStatement}
                      onChange={(e) => setFStatement(e.target.value)}
                      placeholder="e.g. 78% of study participants observed smoother skin within 4 weeks."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="fact-source"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Source Note / Citation
                    </label>
                    <input
                      id="fact-source"
                      type="text"
                      value={fSourceNote}
                      onChange={(e) => setFSourceNote(e.target.value)}
                      placeholder="e.g. Clinical Study VS-2025-04, Third-Party Lab"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="fact-owner"
                        className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                      >
                        Owner / Department
                      </label>
                      <input
                        id="fact-owner"
                        type="text"
                        value={fOwner}
                        onChange={(e) => setFOwner(e.target.value)}
                        placeholder="e.g. Dr. Maya Lin, R&D"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="fact-expires"
                        className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                      >
                        Expires At (Optional)
                      </label>
                      <input
                        id="fact-expires"
                        type="date"
                        value={fExpiresAt}
                        onChange={(e) => setFExpiresAt(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="fact-status"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Status
                    </label>
                    <select
                      id="fact-status"
                      value={fStatus}
                      onChange={(e) => setFStatus(e.target.value as 'approved' | 'retired')}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    >
                      <option value="approved">Approved (Active)</option>
                      <option value="retired">Retired (Inactive)</option>
                    </select>
                  </div>
                </>
              )}

              {/* TERM FORM */}
              {activeTab === 'terms' && (
                <>
                  <div>
                    <label
                      htmlFor="term-word"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Term / Phrase *
                    </label>
                    <input
                      id="term-word"
                      type="text"
                      required
                      value={tTerm}
                      onChange={(e) => setTTerm(e.target.value)}
                      placeholder="e.g. cure, 100% natural, gentle"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="term-kind"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Classification *
                    </label>
                    <select
                      id="term-kind"
                      required
                      value={tKind}
                      onChange={(e) => setTKind(e.target.value as 'banned' | 'caution' | 'preferred')}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    >
                      <option value="banned">Banned (Never use in public copy)</option>
                      <option value="caution">Caution (Use only with proper context)</option>
                      <option value="preferred">Preferred (Encouraged brand vocabulary)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="term-replacement"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Suggested Replacement (Optional)
                    </label>
                    <input
                      id="term-replacement"
                      type="text"
                      value={tReplacement}
                      onChange={(e) => setTReplacement(e.target.value)}
                      placeholder="e.g. supports skin barrier, plant-derived"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="term-note"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Rationale / Usage Note (Optional)
                    </label>
                    <textarea
                      id="term-note"
                      rows={2}
                      value={tNote}
                      onChange={(e) => setTNote(e.target.value)}
                      placeholder="e.g. Cosmetics cannot legally promise cures."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                >
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 id="delete-dialog-title" className="text-lg font-bold text-slate-900">
              Confirm Deletion
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete &ldquo;
              <span className="font-semibold text-slate-800">{deleteTarget.title}</span>
              &rdquo;? This action will be recorded in the audit log and cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-rose-600 focus:ring-offset-2"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
