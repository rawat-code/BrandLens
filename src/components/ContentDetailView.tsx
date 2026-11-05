'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { RoleBadge } from '@/components/RoleBadge';
import { computeWordDiff, type DiffChange } from '@/lib/diff';
import type { Content, ContentVersion, Finding, Profile, UserRole } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

export interface CommentWithProfile {
  id: string;
  content_id: string;
  author: string;
  body: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    role: string;
  } | null;
}

interface AuditEntry {
  id: string | number;
  actor: string;
  action: string;
  detail: Record<string, unknown> | null;
  created_at: string;
}

interface ContentDetailViewProps {
  user?: User;
  profile: Profile;
  initialContent: Content;
  initialVersions: ContentVersion[];
  initialFindings: Finding[];
  initialComments: CommentWithProfile[];
}

type BottomTab = 'comments' | 'history' | 'activity' | 'disclosure';

export function ContentDetailView({
  profile,
  initialContent,
  initialVersions,
  initialFindings,
  initialComments,
}: ContentDetailViewProps) {
  const [content, setContent] = useState<Content>(initialContent);
  const [versions, setVersions] = useState<ContentVersion[]>(initialVersions);
  const [findings, setFindings] = useState<Finding[]>(initialFindings);
  const [comments, setComments] = useState<CommentWithProfile[]>(initialComments);
  const [activityLogs, setActivityLogs] = useState<AuditEntry[]>([]);

  // Active version for editor
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(content.current_version);
  const currentVersion = versions.find((v) => v.version === selectedVersionNum) || versions[0];
  const [editorBody, setEditorBody] = useState<string>(currentVersion?.body || '');
  const [versionNote, setVersionNote] = useState('');
  const [isSavingVersion, setIsSavingVersion] = useState(false);

  // Bottom tab
  const [activeTab, setActiveTab] = useState<BottomTab>('comments');

  // Review execution state
  const [isReviewing, setIsReviewing] = useState(false);

  // Workflow transition state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionCommentModal, setTransitionCommentModal] = useState<'needs_changes' | 'rejected' | null>(null);
  const [transitionCommentText, setTransitionCommentText] = useState('');

  // Comment input state
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Dispute modal state
  const [disputingFinding, setDisputingFinding] = useState<Finding | null>(null);
  const [disputeReasonText, setDisputeReasonText] = useState('');

  // History diff selection
  const [diffCompareVersion, setDiffCompareVersion] = useState<number>(
    versions.length > 1 ? versions[1].version : 1
  );

  // Feedback banner state
  const [bannerMessage, setBannerMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isCreator = profile.role === 'creator';
  const isManager = profile.role === 'manager';
  const isReviewer = profile.role === 'reviewer';
  const isAdmin = profile.role === 'admin';
  const isOwnContent = content.created_by === profile.id;

  const openHighSevRequiringReviewer = findings.some(
    (f) => f.severity === 'high' && f.requires_reviewer && f.status === 'open'
  );

  // Load activity logs when activity tab is clicked
  const handleTabChange = async (tab: BottomTab) => {
    setActiveTab(tab);
    if (tab === 'activity' && activityLogs.length === 0) {
      try {
        const res = await fetch(`/api/content/${content.id}/activity`);
        const data = await res.json();
        if (data.logs) {
          setActivityLogs(data.logs);
        }
      } catch (err) {
        console.error('Error fetching activity:', err);
      }
    }
  };

  // Run Review Pipeline
  const handleRunReview = async () => {
    setIsReviewing(true);
    setBannerMessage(null);
    try {
      const res = await fetch(`/api/content/${content.id}/review`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute review');
      }

      setFindings(data.findings || []);
      if (data.content) {
        setContent(data.content);
      }
      setBannerMessage({
        text: `Review completed. Found ${data.findings.length} issue(s) cited against governance rules.`,
        type: 'success',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Review failed';
      setBannerMessage({ text: msg, type: 'error' });
    } finally {
      setIsReviewing(false);
    }
  };

  // Save as new version
  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorBody.trim()) return;

    setIsSavingVersion(true);
    setBannerMessage(null);

    try {
      const res = await fetch(`/api/content/${content.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: editorBody.trim(),
          note: versionNote.trim() || `Draft revision v${content.current_version + 1}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save version');
      }

      const updatedVer = data.version as ContentVersion;
      setVersions((prev) => [updatedVer, ...prev]);
      setContent((prev) => ({ ...prev, current_version: updatedVer.version }));
      setSelectedVersionNum(updatedVer.version);
      setVersionNote('');
      setBannerMessage({ text: `Saved as Version ${updatedVer.version}!`, type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save version';
      setBannerMessage({ text: msg, type: 'error' });
    } finally {
      setIsSavingVersion(false);
    }
  };

  // Accept Finding Suggestion
  const handleAcceptFinding = async (finding: Finding) => {
    try {
      const res = await fetch(`/api/content/${content.id}/findings/${finding.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept suggestion');
      }

      // Update finding in state
      setFindings((prev) => prev.map((f) => (f.id === finding.id ? data.finding : f)));

      // Add new version
      if (data.version) {
        setVersions((prev) => [data.version, ...prev]);
        setContent((prev) => ({ ...prev, current_version: data.version.version }));
        setSelectedVersionNum(data.version.version);
        setEditorBody(data.version.body);
      }

      setBannerMessage({
        text: `Accepted fix for ${finding.rule_key}. Created Version ${data.version?.version || ''}.`,
        type: 'success',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error accepting finding';
      setBannerMessage({ text: msg, type: 'error' });
    }
  };

  // Dismiss Finding
  const handleDismissFinding = async (findingId: string) => {
    try {
      const res = await fetch(`/api/content/${content.id}/findings/${findingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dismiss');
      setFindings((prev) => prev.map((f) => (f.id === findingId ? data.finding : f)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error dismissing finding';
      setBannerMessage({ text: msg, type: 'error' });
    }
  };

  // Submit Dispute
  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputingFinding || !disputeReasonText.trim()) return;

    try {
      const res = await fetch(`/api/content/${content.id}/findings/${disputingFinding.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dispute',
          dispute_reason: disputeReasonText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispute finding');

      setFindings((prev) => prev.map((f) => (f.id === disputingFinding.id ? data.finding : f)));
      setDisputingFinding(null);
      setDisputeReasonText('');
      setBannerMessage({ text: 'Finding marked as disputed with reason.', type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error submitting dispute';
      alert(msg);
    }
  };

  // Workflow State Transition
  const handleTransition = async (toStatus: string, comment?: string) => {
    setIsTransitioning(true);
    setBannerMessage(null);

    try {
      const res = await fetch(`/api/content/${content.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toStatus,
          comment: comment?.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'State transition rejected');
      }

      setContent(data.content);
      setTransitionCommentModal(null);
      setTransitionCommentText('');

      // Refresh comments if a comment was added
      if (comment) {
        const cRes = await fetch(`/api/content/${content.id}/comments`);
        const cData = await cRes.json();
        if (cData.comments) setComments(cData.comments);
      }

      setBannerMessage({
        text: `Content successfully transitioned to "${toStatus.replace('_', ' ')}"!`,
        type: 'success',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Workflow transition failed';
      setBannerMessage({ text: msg, type: 'error' });
    } finally {
      setIsTransitioning(false);
    }
  };

  // Add Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setIsPostingComment(true);
    try {
      const res = await fetch(`/api/content/${content.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newCommentText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post comment');

      setComments((prev) => [...prev, data.comment]);
      setNewCommentText('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to post comment';
      alert(msg);
    } finally {
      setIsPostingComment(false);
    }
  };

  // Word diff between selected version and compare version
  const compareVersionObj = versions.find((v) => v.version === diffCompareVersion);
  const diffTokens: DiffChange[] =
    currentVersion && compareVersionObj
      ? computeWordDiff(compareVersionObj.body, currentVersion.body)
      : [];

  return (
    <div className="p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Banner Message */}
      {bannerMessage && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-sm flex items-center justify-between shadow-sm border ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{bannerMessage.text}</span>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-xs font-bold underline hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Link
              href="/dashboard"
              className="text-xs text-slate-500 hover:text-slate-800 font-medium mr-2"
            >
              ← Dashboard
            </Link>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                content.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : content.status === 'published'
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : content.status === 'needs_changes' || content.status === 'rejected'
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : content.status === 'in_review'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {content.status.replace('_', ' ')}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-medium">
              v{content.current_version}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium capitalize">
              {content.channel}
            </span>
            {content.confidential && (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-200">
                🔒 Confidential (Local Rules Only)
              </span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{content.title}</h1>
          {content.audience && (
            <p className="text-xs text-slate-500 mt-1">
              Audience: <span className="text-slate-700 font-medium">{content.audience}</span>
            </p>
          )}
        </div>

        {/* Workflow Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Creator submit */}
          {isCreator && isOwnContent && (content.status === 'ai_reviewed' || content.status === 'draft') && (
            <button
              onClick={() => handleTransition('in_review')}
              disabled={isTransitioning}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              Submit for Approval
            </button>
          )}

          {/* Creator publish */}
          {isCreator && isOwnContent && content.status === 'approved' && (
            <button
              onClick={() => handleTransition('published')}
              disabled={isTransitioning}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              Mark as Published
            </button>
          )}

          {/* Manager / Reviewer actions when in_review */}
          {(isManager || isReviewer || isAdmin) && content.status === 'in_review' && (
            <>
              {/* Approval button with separation of duties & high-severity guardrails */}
              <button
                onClick={() => handleTransition('approved')}
                disabled={
                  isTransitioning ||
                  (isManager && isOwnContent) ||
                  (isManager && openHighSevRequiringReviewer) ||
                  (isReviewer && isOwnContent)
                }
                title={
                  isManager && isOwnContent
                    ? 'Cannot approve own content'
                    : isManager && openHighSevRequiringReviewer
                    ? 'Open high-severity findings require Reviewer role'
                    : 'Approve content draft'
                }
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                Approve
              </button>

              <button
                onClick={() => setTransitionCommentModal('needs_changes')}
                disabled={isTransitioning}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                Request Changes
              </button>

              <button
                onClick={() => setTransitionCommentModal('rejected')}
                disabled={isTransitioning}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Dual-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pane: Editor (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <label htmlFor="version-picker" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Viewing Version:
              </label>
              <select
                id="version-picker"
                value={selectedVersionNum}
                onChange={(e) => {
                  const num = parseInt(e.target.value, 10);
                  setSelectedVersionNum(num);
                  const v = versions.find((ver) => ver.version === num);
                  if (v) setEditorBody(v.body);
                }}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                {versions.map((ver) => (
                  <option key={ver.id} value={ver.version}>
                    v{ver.version} {ver.note ? `(${ver.note})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-mono text-slate-500">
              {editorBody.length.toLocaleString()} / 10,000 characters
            </span>
          </div>

          <form onSubmit={handleSaveVersion} className="space-y-4">
            <div>
              <label htmlFor="content-editor-textarea" className="sr-only">
                Edit Content Draft
              </label>
              <textarea
                id="content-editor-textarea"
                rows={14}
                maxLength={10000}
                value={editorBody}
                onChange={(e) => setEditorBody(e.target.value)}
                placeholder="Draft body content..."
                className="w-full p-4 text-sm font-sans bg-slate-50/50 border border-slate-200 rounded-xl shadow-inner focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 leading-relaxed font-normal"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <input
                type="text"
                value={versionNote}
                onChange={(e) => setVersionNote(e.target.value)}
                placeholder="Note for new version (e.g. Applied tone edits)..."
                className="text-xs px-3 py-2 border border-slate-300 rounded-lg w-full sm:w-72 focus:outline-none focus:border-emerald-600"
              />

              <button
                type="submit"
                disabled={isSavingVersion || editorBody === currentVersion?.body}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap"
              >
                {isSavingVersion ? 'Saving...' : 'Save as New Version'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Pane: Review Findings (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Governance Findings ({findings.length})
                </h2>
                <p className="text-xs text-slate-500">Rule-based compliance &amp; cited fix suggestions</p>
              </div>

              <button
                onClick={handleRunReview}
                disabled={isReviewing}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                {isReviewing ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Auditing...</span>
                  </>
                ) : (
                  <span>Run Review</span>
                )}
              </button>
            </div>

            {/* Findings List */}
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {findings.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <svg className="w-10 h-10 text-emerald-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs font-bold text-slate-800">No issues flagged</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click &ldquo;Run Review&rdquo; to scan this version against the organization library.
                  </p>
                </div>
              ) : (
                findings.map((f) => (
                  <div
                    key={f.id}
                    className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                      f.status === 'accepted'
                        ? 'bg-emerald-50/40 border-emerald-200 opacity-70'
                        : f.status === 'disputed'
                        ? 'bg-amber-50/40 border-amber-200 opacity-80'
                        : f.status === 'dismissed'
                        ? 'bg-slate-50 border-slate-200 opacity-50'
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                            f.severity === 'high'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : f.severity === 'medium'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}
                        >
                          {f.severity}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase">
                          {f.category}
                        </span>
                      </div>

                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          f.status === 'accepted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : f.status === 'disputed'
                            ? 'bg-amber-100 text-amber-800'
                            : f.status === 'dismissed'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {f.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Source Citation */}
                    {f.source_quote && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="font-semibold text-slate-800 block text-xs">
                          {f.source_type === 'guideline' ? '📜 Guideline Citation' : '📖 Library Standard'}:
                        </span>
                        <span className="italic font-medium text-slate-700">&ldquo;{f.source_quote}&rdquo;</span>
                      </div>
                    )}

                    {/* Reason */}
                    <p className="text-xs text-slate-700 leading-relaxed">{f.reason}</p>

                    {/* Excerpt */}
                    {f.excerpt && (
                      <div className="text-xs text-slate-500 font-mono bg-slate-100/70 p-2 rounded">
                        &hellip;{f.excerpt}&hellip;
                      </div>
                    )}

                    {/* Suggestion Box */}
                    {f.suggestion && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-900">Suggested Fix:</span>
                          {f.intent_check && (
                            <span className="text-xs text-emerald-800 font-medium">
                              Intent: {f.intent_check}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-emerald-950 font-mono">
                          {f.suggestion}
                        </p>
                      </div>
                    )}

                    {/* Finding Actions (Rule 2: AI suggests, humans decide) */}
                    {f.status === 'open' && (
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                        {f.suggestion && (
                          <button
                            onClick={() => handleAcceptFinding(f)}
                            className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                          >
                            Accept Fix
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setDisputingFinding(f);
                            setDisputeReasonText('');
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded transition-colors"
                        >
                          Dispute
                        </button>
                        <button
                          onClick={() => handleDismissFinding(f.id)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Tabs Section: Comments, History, Activity, AI Disclosure */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <nav className="flex space-x-2 border-b border-slate-100 pb-3" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'comments'}
            onClick={() => handleTabChange('comments')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'comments'
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Comments ({comments.length})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => handleTabChange('history')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'history'
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Version History &amp; Diff ({versions.length})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'activity'}
            onClick={() => handleTabChange('activity')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'activity'
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Audit Activity Trail
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'disclosure'}
            onClick={() => handleTabChange('disclosure')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'disclosure'
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            AI Governance &amp; Disclosure
          </button>
        </nav>

        {/* Tab 1: Comments */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No feedback comments yet.</p>
              ) : (
                comments.map((cm) => (
                  <div key={cm.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {cm.profiles?.full_name || 'Team Member'}
                        </span>
                        {cm.profiles?.role && (
                          <RoleBadge role={cm.profiles.role as UserRole} />
                        )}
                      </div>
                      <span className="text-slate-400 font-mono">
                        {new Date(cm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{cm.body}</p>
                  </div>
                ))
              )}
            </div>

            {/* Post comment */}
            <form onSubmit={handlePostComment} className="flex gap-3">
              <input
                type="text"
                required
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write an internal review comment..."
                className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                disabled={isPostingComment || !newCommentText.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {isPostingComment ? 'Posting...' : 'Comment'}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: History & Word-level Diff */}
        {activeTab === 'history' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700">Compare Current (v{selectedVersionNum}) against:</span>
                <select
                  value={diffCompareVersion}
                  onChange={(e) => setDiffCompareVersion(parseInt(e.target.value, 10))}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                >
                  {versions.map((ver) => (
                    <option key={ver.id} value={ver.version}>
                      Version {ver.version} ({ver.note || 'Draft'})
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-xs text-slate-400">
                Word-level diff: <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">+Add</span> <span className="bg-rose-100 text-rose-800 line-through px-1.5 py-0.5 rounded font-mono">-Del</span>
              </span>
            </div>

            {/* Diff View Box */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 font-sans text-xs leading-relaxed">
              {diffTokens.map((token, idx) => {
                if (token.type === 'insert') {
                  return (
                    <span key={idx} className="bg-emerald-100 text-emerald-900 font-semibold px-0.5 rounded">
                      {token.value}
                    </span>
                  );
                }
                if (token.type === 'delete') {
                  return (
                    <span key={idx} className="bg-rose-100 text-rose-800 line-through px-0.5 rounded opacity-75">
                      {token.value}
                    </span>
                  );
                }
                return <span key={idx}>{token.value}</span>;
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Activity Audit Log */}
        {activeTab === 'activity' && (
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No activity recorded yet.</p>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-slate-900 uppercase tracking-wider">{log.action}</span>
                    <span className="text-slate-500 ml-2">{JSON.stringify(log.detail)}</span>
                  </div>
                  <span className="text-slate-400 font-mono">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: AI Governance Disclosure */}
        {activeTab === 'disclosure' && (
          <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
            <h3 className="font-bold text-sm text-slate-900">Governance Guardrails &amp; Compliance Disclosure</h3>
            <p>
              In accordance with BrandLens policies, AI serves strictly in an advisory capacity.
              <strong> AI never approves, publishes, or rewrites content autonomously.</strong> All suggestions require human approval, applied one at a time.
            </p>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <strong className="block text-slate-900">Engineering Attribution:</strong>
              <p>Platform constructed with agentic pair-programming assistance via <strong>Google Antigravity</strong>.</p>
            </div>
          </div>
        )}
      </div>

      {/* DISPUTE MODAL */}
      {disputingFinding && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Dispute Governance Finding</h2>
            <p className="text-xs text-slate-600">
              Explain why this finding does not apply to this specific copy context:
            </p>
            <form onSubmit={handleSubmitDispute} className="space-y-4">
              <textarea
                required
                rows={3}
                value={disputeReasonText}
                onChange={(e) => setDisputeReasonText(e.target.value)}
                placeholder="Provide reason for dispute..."
                className="w-full p-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDisputingFinding(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded"
                >
                  Submit Dispute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSITION COMMENT MODAL (Required for Request Changes and Reject) */}
      {transitionCommentModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              {transitionCommentModal === 'needs_changes' ? 'Request Changes' : 'Reject Content Draft'}
            </h2>
            <p className="text-xs text-slate-600">
              A review comment is required to explain what modifications are necessary:
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTransition(transitionCommentModal, transitionCommentText);
              }}
              className="space-y-4"
            >
              <textarea
                required
                rows={3}
                value={transitionCommentText}
                onChange={(e) => setTransitionCommentText(e.target.value)}
                placeholder="Specify feedback for the creator..."
                className="w-full p-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTransitionCommentModal(null);
                    setTransitionCommentText('');
                  }}
                  className="px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!transitionCommentText.trim() || isTransitioning}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded"
                >
                  {isTransitioning ? 'Submitting...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
