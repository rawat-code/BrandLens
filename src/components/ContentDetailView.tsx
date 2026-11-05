'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { RoleBadge } from '@/components/RoleBadge';
import { computeWordDiff, type DiffChange } from '@/lib/diff';
import { HighlightedText } from '@/components/HighlightedText';
import { FindingsGroup } from '@/components/FindingsGroup';
import { AiDisclosureTab } from '@/components/AiDisclosureTab';
import type { Content, ContentVersion, Finding, Profile, UserRole, AiRun } from '@/lib/types';
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
  initialAiRun?: AiRun | null;
}

type BottomTab = 'comments' | 'history' | 'activity' | 'disclosure';
type EditorMode = 'readonly' | 'edit';

export function ContentDetailView({
  profile,
  initialContent,
  initialVersions,
  initialFindings,
  initialComments,
  initialAiRun,
}: ContentDetailViewProps) {
  const [content, setContent] = useState<Content>(initialContent);
  const [versions, setVersions] = useState<ContentVersion[]>(initialVersions);
  const [findings, setFindings] = useState<Finding[]>(initialFindings);
  const [comments, setComments] = useState<CommentWithProfile[]>(initialComments);
  const [activityLogs, setActivityLogs] = useState<AuditEntry[]>([]);
  const [aiRun, setAiRun] = useState<AiRun | null>(initialAiRun || null);

  // Active version for editor
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(content.current_version);
  const currentVersion = versions.find((v) => v.version === selectedVersionNum) || versions[0];
  const [editorBody, setEditorBody] = useState<string>(currentVersion?.body || '');
  const [versionNote, setVersionNote] = useState('');
  const [isSavingVersion, setIsSavingVersion] = useState(false);

  // Editor mode toggle: 'readonly' (highlighted) vs 'edit' (textarea)
  const [editorMode, setEditorMode] = useState<EditorMode>('readonly');

  // Currently focused/active finding
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);

  // Bottom tab
  const [activeTab, setActiveTab] = useState<BottomTab>('comments');

  // Review execution state
  const [isReviewing, setIsReviewing] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState<boolean>(Boolean(initialAiRun?.error));

  // Re-run review prompt banner after accepting a fix
  const [reRunPromptMessage, setReRunPromptMessage] = useState<string | null>(null);

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

  // Dismiss modal state (requires reason per spec)
  const [dismissingFindingId, setDismissingFindingId] = useState<string | null>(null);
  const [dismissReasonText, setDismissReasonText] = useState('');

  // Edit-then-accept modal state
  const [editThenAcceptFinding, setEditThenAcceptFinding] = useState<Finding | null>(null);
  const [customSuggestionText, setCustomSuggestionText] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

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

  // Summary counts of open findings by severity
  const openHighCount = findings.filter((f) => f.status === 'open' && f.severity === 'high').length;
  const openMediumCount = findings.filter((f) => f.status === 'open' && f.severity === 'medium').length;
  const openLowCount = findings.filter((f) => f.status === 'open' && f.severity === 'low').length;
  const totalOpenCount = openHighCount + openMediumCount + openLowCount;

  // Two-way selection handler
  const handleSelectFinding = (findingId: string) => {
    setActiveFindingId(findingId);
    // Smooth scroll to card or excerpt if element exists
    const cardEl = document.getElementById(`card-${findingId}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

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
    setReRunPromptMessage(null);

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
      if (data.aiRun) {
        setAiRun(data.aiRun);
      }
      setAiUnavailable(Boolean(data.aiUnavailable || data.aiRun?.error));

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
      setContent((prev) => ({ ...prev, current_version: updatedVer.version, status: 'draft' }));
      setSelectedVersionNum(updatedVer.version);
      setVersionNote('');
      setEditorMode('readonly');
      setReRunPromptMessage(`Draft saved as Version ${updatedVer.version}. Please re-run review to audit changes.`);
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
    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/findings/${finding.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept suggestion');
      }

      // Mark finding as accepted in state
      setFindings((prev) =>
        prev.map((f) => (f.id === finding.id ? { ...f, status: 'accepted' } : f))
      );

      // Add new version & reset status to draft
      if (data.new_version) {
        const nv = data.new_version as ContentVersion;
        setVersions((prev) => [nv, ...prev]);
        setContent((prev) => ({ ...prev, current_version: nv.version, status: 'draft' }));
        setSelectedVersionNum(nv.version);
        setEditorBody(nv.body);

        setReRunPromptMessage(
          `Applied suggestion for "${finding.rule_key}". Content updated to draft v${nv.version}. Please re-run review to audit the updated text.`
        );
      }

      setBannerMessage({
        text: `Accepted fix for ${finding.rule_key}!`,
        type: 'success',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error accepting finding';
      setBannerMessage({ text: msg, type: 'error' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Open Edit-then-accept Modal
  const handleOpenEditThenAccept = (finding: Finding) => {
    setEditThenAcceptFinding(finding);
    setCustomSuggestionText(finding.suggestion || '');
  };

  // Submit Edit-then-accept
  const handleSubmitEditThenAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editThenAcceptFinding || !customSuggestionText.trim()) return;

    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/findings/${editThenAcceptFinding.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custom_suggestion: customSuggestionText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to apply custom suggestion');
      }

      const appliedText = customSuggestionText.trim();

      // Mark finding as accepted with custom suggestion
      setFindings((prev) =>
        prev.map((f) =>
          f.id === editThenAcceptFinding.id
            ? { ...f, status: 'accepted', suggestion: appliedText }
            : f
        )
      );

      if (data.new_version) {
        const nv = data.new_version as ContentVersion;
        setVersions((prev) => [nv, ...prev]);
        setContent((prev) => ({ ...prev, current_version: nv.version, status: 'draft' }));
        setSelectedVersionNum(nv.version);
        setEditorBody(nv.body);

        setReRunPromptMessage(
          `Applied custom suggestion for "${editThenAcceptFinding.rule_key}". Draft updated to v${nv.version}. Please re-run review.`
        );
      }

      setEditThenAcceptFinding(null);
      setCustomSuggestionText('');
      setBannerMessage({
        text: `Applied refined suggestion for ${editThenAcceptFinding.rule_key}!`,
        type: 'success',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error applying custom suggestion';
      alert(msg);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Open Dismiss Modal (requires reason)
  const handleOpenDismissModal = (findingId: string) => {
    setDismissingFindingId(findingId);
    setDismissReasonText('');
  };

  // Submit Dismiss with Reason
  const handleSubmitDismiss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dismissingFindingId || !dismissReasonText.trim()) return;

    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/findings/${dismissingFindingId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: dismissReasonText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dismiss finding');

      setFindings((prev) =>
        prev.map((f) => (f.id === dismissingFindingId ? { ...f, status: 'dismissed' } : f))
      );
      setDismissingFindingId(null);
      setDismissReasonText('');
      setBannerMessage({ text: 'Finding dismissed with documented reason.', type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error dismissing finding';
      alert(msg);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Submit Dispute with Reason
  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputingFinding || !disputeReasonText.trim()) return;

    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/findings/${disputingFinding.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispute_reason: disputeReasonText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispute finding');

      setFindings((prev) =>
        prev.map((f) =>
          f.id === disputingFinding.id
            ? { ...f, status: 'disputed', dispute_reason: disputeReasonText.trim() }
            : f
        )
      );
      setDisputingFinding(null);
      setDisputeReasonText('');
      setBannerMessage({ text: 'Finding marked as disputed with documented reason.', type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error submitting dispute';
      alert(msg);
    } finally {
      setIsProcessingAction(false);
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
      {/* Top Banner Feedback */}
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
            className="text-xs font-bold underline hover:opacity-75 focus-visible:ring-1 focus-visible:ring-emerald-600 rounded"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Post-Accept / Edit Re-Run Review Prompt */}
      {reRunPromptMessage && (
        <div
          role="status"
          className="p-4 rounded-xl text-xs bg-emerald-50 border-2 border-emerald-500 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🔄</span>
            <div>
              <strong className="font-bold block text-sm">Action Applied Successfully</strong>
              <span>{reRunPromptMessage}</span>
            </div>
          </div>

          <button
            onClick={handleRunReview}
            disabled={isReviewing}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-sm whitespace-nowrap self-start sm:self-auto transition-colors"
          >
            {isReviewing ? 'Auditing...' : 'Re-run Review Now'}
          </button>
        </div>
      )}

      {/* Header bar: Summary Header with Severity Breakdown and Status Chip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Link
              href="/dashboard"
              className="text-xs text-slate-500 hover:text-slate-800 font-medium mr-2"
            >
              ← Dashboard
            </Link>

            {/* Clear Status Chip with Non-Color Indicator */}
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border flex items-center gap-1.5 shadow-sm ${
                content.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : content.status === 'published'
                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                  : content.status === 'needs_changes' || content.status === 'rejected'
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : content.status === 'in_review'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-100 text-slate-800 border-slate-300'
              }`}
            >
              <span>
                {content.status === 'approved' ? '✓' : content.status === 'published' ? '🚀' : content.status === 'needs_changes' ? '⚠️' : '📝'}
              </span>
              <span>{content.status.replace('_', ' ')}</span>
            </span>

            <span className="text-xs px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-medium">
              v{content.current_version}
            </span>

            <span className="text-xs px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium capitalize">
              {content.channel}
            </span>

            {content.confidential && (
              <span className="text-xs px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-200">
                🔒 Confidential (Local Rules Only)
              </span>
            )}
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{content.title}</h1>

          {/* Open Findings Summary Badges by Severity */}
          <div className="flex items-center gap-2.5 mt-2.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500">Open Findings:</span>

            <span
              className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1"
              title="High severity findings (dashed red underline)"
            >
              <span>🚨</span>
              <span>{openHighCount} High</span>
            </span>

            <span
              className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1"
              title="Medium severity findings (dotted amber underline)"
            >
              <span>⚡</span>
              <span>{openMediumCount} Medium</span>
            </span>

            <span
              className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1"
              title="Low severity findings (solid blue underline)"
            >
              <span>ℹ️</span>
              <span>{openLowCount} Low</span>
            </span>

            <span className="text-xs text-slate-500 font-medium">
              ({totalOpenCount} total unresolved)
            </span>
          </div>
        </div>

        {/* Workflow Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Creator submit */}
          {isCreator && isOwnContent && (content.status === 'ai_reviewed' || content.status === 'draft') && (
            <button
              onClick={() => handleTransition('in_review')}
              disabled={isTransitioning}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              Submit for Approval
            </button>
          )}

          {/* Creator publish */}
          {isCreator && isOwnContent && content.status === 'approved' && (
            <button
              onClick={() => handleTransition('published')}
              disabled={isTransitioning}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Mark as Published
            </button>
          )}

          {/* Manager / Reviewer actions when in_review */}
          {(isManager || isReviewer || isAdmin) && content.status === 'in_review' && (
            <>
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
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                Approve
              </button>

              <button
                onClick={() => setTransitionCommentModal('needs_changes')}
                disabled={isTransitioning}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-amber-600"
              >
                Request Changes
              </button>

              <button
                onClick={() => setTransitionCommentModal('rejected')}
                disabled={isTransitioning}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-rose-600"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Dual-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Editor & Highlighted Text Viewer (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div className="flex items-center gap-3">
              <label htmlFor="version-picker" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Version:
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

            {/* Mode Switcher Toggle: Read-only Highlighted vs Edit Text */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setEditorMode('readonly')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  editorMode === 'readonly'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👁️ Highlights View
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('edit')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  editorMode === 'edit'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ✏️ Edit Draft
              </button>
            </div>
          </div>

          {/* Mode 1: Highlighting View */}
          {editorMode === 'readonly' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Click any highlighted phrase to focus and jump to the corresponding card.</span>
                <span className="font-mono">{editorBody.length.toLocaleString()} characters</span>
              </div>

              <HighlightedText
                text={editorBody}
                findings={findings}
                activeFindingId={activeFindingId}
                onSelectFinding={handleSelectFinding}
              />
            </div>
          ) : (
            /* Mode 2: Edit Textarea */
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
          )}
        </div>

        {/* Right Pane: Review Findings (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Governance Findings ({findings.length})
              </h2>
              <p className="text-xs text-slate-500">Grouped by severity &amp; rule categories</p>
            </div>

            <button
              onClick={handleRunReview}
              disabled={isReviewing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
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

          {/* AI Review Unavailable Banner (Rule 8 Graceful Degradation) */}
          {aiUnavailable && (
            <div
              className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-start gap-2.5 shadow-sm"
              role="alert"
            >
              <span className="text-base leading-none">⚠️</span>
              <div className="space-y-0.5">
                <strong className="font-bold block text-amber-950">AI review unavailable</strong>
                <p className="text-amber-900 leading-relaxed">
                  The AI service encountered an error or timed out ({aiRun?.error || 'external service unreachable'}). Deterministic rule-based findings are still active and shown below.
                </p>
              </div>
            </div>
          )}

          {/* Grouped Findings Cards */}
          <div className="max-h-[700px] overflow-y-auto pr-1">
            <FindingsGroup
              findings={findings}
              activeFindingId={activeFindingId}
              onSelectFinding={handleSelectFinding}
              onAcceptFinding={handleAcceptFinding}
              onEditThenAccept={handleOpenEditThenAccept}
              onDisputeFinding={(f) => {
                setDisputingFinding(f);
                setDisputeReasonText('');
              }}
              onDismissFinding={handleOpenDismissModal}
              isProcessingAction={isProcessingAction}
            />
          </div>
        </div>
      </div>

      {/* Bottom Tabs Section: Comments, History, Activity, AI Disclosure */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <nav className="flex space-x-2 border-b border-slate-100 pb-3 flex-wrap gap-y-2" role="tablist">
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
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'disclosure'
                ? 'bg-purple-50 text-purple-900 border border-purple-200 font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>✨</span>
            <span>AI Governance &amp; Disclosure</span>
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

        {/* Tab 4: AI Governance & Disclosure */}
        {activeTab === 'disclosure' && (
          <AiDisclosureTab aiRun={aiRun} confidential={content.confidential} />
        )}
      </div>

      {/* EDIT-THEN-ACCEPT MODAL */}
      {editThenAcceptFinding && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>✏️</span>
              <span>Edit Suggestion &amp; Accept</span>
            </h2>
            <p className="text-xs text-slate-600">
              Refine the suggested fix before applying it to create a new draft version:
            </p>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Original Excerpt:</span>
              <p className="font-mono text-slate-800">&ldquo;{editThenAcceptFinding.excerpt}&rdquo;</p>
            </div>

            <form onSubmit={handleSubmitEditThenAccept} className="space-y-4">
              <div>
                <label htmlFor="custom-suggestion-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Your Refined Replacement Text:
                </label>
                <textarea
                  id="custom-suggestion-input"
                  required
                  rows={3}
                  value={customSuggestionText}
                  onChange={(e) => setCustomSuggestionText(e.target.value)}
                  className="w-full p-3 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditThenAcceptFinding(null)}
                  disabled={isProcessingAction}
                  className="px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAction || !customSuggestionText.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  {isProcessingAction ? 'Applying...' : 'Apply & Create Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISMISS MODAL (Reason Required) */}
      {dismissingFindingId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span>✕</span>
              <span>Dismiss Governance Finding</span>
            </h2>
            <p className="text-xs text-slate-600">
              A reason is required to document why this finding is being dismissed:
            </p>
            <form onSubmit={handleSubmitDismiss} className="space-y-4">
              <textarea
                required
                rows={3}
                value={dismissReasonText}
                onChange={(e) => setDismissReasonText(e.target.value)}
                placeholder="Document reason for dismissing this check..."
                className="w-full p-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDismissingFindingId(null);
                    setDismissReasonText('');
                  }}
                  className="px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAction || !dismissReasonText.trim()}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold rounded"
                >
                  Confirm Dismissal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPUTE MODAL (Reason Required) */}
      {disputingFinding && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span>⚡</span>
              <span>Dispute Governance Finding</span>
            </h2>
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
                  disabled={isProcessingAction || !disputeReasonText.trim()}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded"
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
