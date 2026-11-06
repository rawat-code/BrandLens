'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { RoleBadge } from '@/components/RoleBadge';
import { computeWordDiff, type DiffChange } from '@/lib/diff';
import { HighlightedText } from '@/components/HighlightedText';
import { FindingsGroup } from '@/components/FindingsGroup';
import { AiDisclosureTab } from '@/components/AiDisclosureTab';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Input';
import { Kbd } from '@/components/ui/Kbd';
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

  // Ordered list of open findings for keyboard navigation
  const openFindingsList = useMemo(() => {
    return findings.filter((f) => f.status === 'open');
  }, [findings]);

  // Two-way selection handler
  const handleSelectFinding = useCallback((findingId: string) => {
    setActiveFindingId(findingId);
    const cardEl = document.getElementById(`card-${findingId}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  // Keyboard navigation: J (next), K (previous), Enter (focus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in form controls
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (!openFindingsList.length) return;

      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        const currentIndex = openFindingsList.findIndex((f) => f.id === activeFindingId);
        const nextIndex = currentIndex < openFindingsList.length - 1 ? currentIndex + 1 : 0;
        handleSelectFinding(openFindingsList[nextIndex].id);
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        const currentIndex = openFindingsList.findIndex((f) => f.id === activeFindingId);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : openFindingsList.length - 1;
        handleSelectFinding(openFindingsList[prevIndex].id);
      } else if (e.key === 'Enter' && activeFindingId) {
        const cardEl = document.getElementById(`card-${activeFindingId}`);
        if (cardEl) {
          cardEl.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openFindingsList, activeFindingId, handleSelectFinding]);

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
      if (!res.ok) throw new Error(data.error || 'Failed to accept finding');

      setFindings((prev) =>
        prev.map((f) => (f.id === finding.id ? { ...f, status: 'accepted' as const } : f))
      );

      if (data.new_version) {
        setVersions((prev) => [data.new_version, ...prev]);
        setContent((prev) => ({ ...prev, current_version: data.new_version.version, status: 'draft' }));
        setSelectedVersionNum(data.new_version.version);
        setEditorBody(data.new_version.body);
      }

      setReRunPromptMessage(
        `Applied fix for "${finding.category}". New Version ${data.new_version?.version || 'created'}. Re-run review to verify.`
      );
      setBannerMessage({ text: 'Suggestion accepted and new draft version created!', type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to accept finding';
      setBannerMessage({ text: msg, type: 'error' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Open Edit-then-Accept Modal
  const handleOpenEditThenAccept = (finding: Finding) => {
    setEditThenAcceptFinding(finding);
    setCustomSuggestionText(finding.suggestion || finding.excerpt || '');
  };

  // Submit Edit-then-Accept
  const handleSubmitEditThenAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editThenAcceptFinding || !customSuggestionText.trim()) return;

    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/findings/${editThenAcceptFinding.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_replacement: customSuggestionText.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply custom edit');

      setFindings((prev) =>
        prev.map((f) => (f.id === editThenAcceptFinding.id ? { ...f, status: 'accepted' as const } : f))
      );

      if (data.new_version) {
        setVersions((prev) => [data.new_version, ...prev]);
        setContent((prev) => ({ ...prev, current_version: data.new_version.version, status: 'draft' }));
        setSelectedVersionNum(data.new_version.version);
        setEditorBody(data.new_version.body);
      }

      setEditThenAcceptFinding(null);
      setCustomSuggestionText('');
      setReRunPromptMessage(
        `Custom edit applied to Version ${data.new_version?.version || 'created'}. Re-run review to confirm.`
      );
      setBannerMessage({ text: 'Custom fix applied and saved as new version!', type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error applying edit';
      setBannerMessage({ text: msg, type: 'error' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Open Dismiss Modal
  const handleOpenDismissModal = (findingId: string) => {
    setDismissingFindingId(findingId);
    setDismissReasonText('');
  };

  // Submit Dismiss
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
        prev.map((f) => (f.id === dismissingFindingId ? { ...f, status: 'dismissed' as const } : f))
      );
      setDismissingFindingId(null);
      setDismissReasonText('');
      setBannerMessage({ text: 'Finding dismissed with documented reason.', type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to dismiss finding';
      setBannerMessage({ text: msg, type: 'error' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Submit Dispute
  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputingFinding || !disputeReasonText.trim()) return;

    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/findings/${disputingFinding.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: disputeReasonText.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispute finding');

      setFindings((prev) =>
        prev.map((f) =>
          f.id === disputingFinding.id
            ? { ...f, status: 'disputed' as const, dispute_reason: disputeReasonText.trim() }
            : f
        )
      );
      setDisputingFinding(null);
      setDisputeReasonText('');
      setBannerMessage({ text: 'Finding disputed. Reviewers will examine your justification.', type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error submitting dispute';
      setBannerMessage({ text: msg, type: 'error' });
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
      setBannerMessage({ text: msg, type: 'error' });
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
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            bannerMessage.type === 'success'
              ? 'bg-[#5fd1a0]/10 text-[#5fd1a0] border-[#5fd1a0]/30'
              : 'bg-[#ff7a8a]/10 text-[#ff7a8a] border-[#ff7a8a]/30'
          }`}
        >
          <span>{bannerMessage.text}</span>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-xs font-mono underline hover:opacity-75 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Post-Accept / Edit Re-Run Review Prompt */}
      {reRunPromptMessage && (
        <div
          role="status"
          className="p-4 rounded-xl text-xs bg-[#5fd1a0]/10 border border-[#5fd1a0]/30 text-[#ececf6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-black/40"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#5fd1a0] animate-pulse" />
            <div>
              <strong className="font-medium text-[#ececf6] block">Action applied successfully</strong>
              <span className="text-[#a3a3bb]">{reRunPromptMessage}</span>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRunReview}
            disabled={isReviewing}
          >
            {isReviewing ? 'Auditing...' : 'Re-run review now'}
          </Button>
        </div>
      )}

      {/* Header bar: Summary Header with Severity Breakdown and Status Chip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Link
              href="/dashboard"
              className="text-xs text-[#a3a3bb] hover:text-[#ececf6] font-medium mr-2 transition-colors"
            >
              ← Content
            </Link>

            {/* Clear Status Chip */}
            <Badge
              variant={
                content.status === 'approved' || content.status === 'published'
                  ? 'success'
                  : content.status === 'needs_changes'
                  ? 'medium'
                  : content.status === 'rejected'
                  ? 'high'
                  : content.status === 'in_review'
                  ? 'low'
                  : 'neutral'
              }
            >
              {content.status.replace('_', ' ')}
            </Badge>

            <span className="text-xs px-2 py-0.5 rounded bg-[#171724] text-[#a3a3bb] font-mono border border-white/[0.06]">
              v{content.current_version}
            </span>

            <span className="text-xs px-2 py-0.5 rounded bg-[#171724] text-[#a3a3bb] capitalize border border-white/[0.06]">
              {content.channel}
            </span>

            {content.confidential && (
              <span className="text-xs px-2 py-0.5 rounded bg-[#f5b74f]/10 text-[#f5b74f] font-medium border border-[#f5b74f]/30">
                Confidential
              </span>
            )}
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#ececf6] tracking-normal leading-snug">
            {content.title}
          </h1>

          {/* Open Findings Summary Badges by Severity */}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="text-xs text-[#7b7b94]">Open findings:</span>

            <Badge variant="high">
              {openHighCount} high
            </Badge>

            <Badge variant="medium">
              {openMediumCount} medium
            </Badge>

            <Badge variant="low">
              {openLowCount} low
            </Badge>

            <span className="text-xs text-[#7b7b94] font-mono">
              ({totalOpenCount} unresolved)
            </span>
          </div>
        </div>

        {/* Workflow Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Creator submit */}
          {isCreator && isOwnContent && (content.status === 'ai_reviewed' || content.status === 'draft') && (
            <Button
              variant="primary"
              size="md"
              onClick={() => handleTransition('in_review')}
              disabled={isTransitioning}
            >
              Submit for approval
            </Button>
          )}

          {/* Creator publish */}
          {isCreator && isOwnContent && content.status === 'approved' && (
            <Button
              variant="primary"
              size="md"
              onClick={() => handleTransition('published')}
              disabled={isTransitioning}
            >
              Mark as published
            </Button>
          )}

          {/* Manager / Reviewer actions when in_review */}
          {(isManager || isReviewer || isAdmin) && content.status === 'in_review' && (
            <>
              <Button
                variant="primary"
                size="md"
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
              >
                Approve
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={() => setTransitionCommentModal('needs_changes')}
                disabled={isTransitioning}
              >
                Request changes
              </Button>

              <Button
                variant="danger"
                size="md"
                onClick={() => setTransitionCommentModal('rejected')}
                disabled={isTransitioning}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Dual-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Editor & Highlighted Text Viewer (7 cols) */}
        <div className="lg:col-span-7 bg-[#11111a] rounded-xl border border-white/[0.08] p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-3 gap-3">
            <div className="flex items-center gap-2.5">
              <label htmlFor="version-picker" className="text-xs font-mono uppercase text-[#7b7b94]">
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
                className="text-xs font-mono bg-[#171724] text-[#ececf6] border border-white/10 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-400"
              >
                {versions.map((ver) => (
                  <option key={ver.id} value={ver.version}>
                    v{ver.version} {ver.note ? `(${ver.note})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Switcher Toggle: Read-only Highlighted vs Edit Text */}
            <div className="flex items-center gap-1 bg-[#171724] p-1 rounded-lg border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setEditorMode('readonly')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  editorMode === 'readonly'
                    ? 'bg-[#11111a] text-[#ececf6] shadow-sm shadow-black/40 border border-white/10'
                    : 'text-[#a3a3bb] hover:text-[#ececf6]'
                }`}
              >
                Highlights view
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('edit')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  editorMode === 'edit'
                    ? 'bg-[#11111a] text-[#ececf6] shadow-sm shadow-black/40 border border-white/10'
                    : 'text-[#a3a3bb] hover:text-[#ececf6]'
                }`}
              >
                Edit draft
              </button>
            </div>
          </div>

          {/* Mode 1: Highlighting View */}
          {editorMode === 'readonly' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#7b7b94]">
                <span>Click any highlighted segment to jump to the cited finding.</span>
                <span className="font-mono">{editorBody.length.toLocaleString()} / 10,000 characters</span>
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
                  Edit content draft
                </label>
                <textarea
                  id="content-editor-textarea"
                  rows={14}
                  maxLength={10000}
                  value={editorBody}
                  onChange={(e) => setEditorBody(e.target.value)}
                  placeholder="Draft body content..."
                  className="w-full p-4 text-sm font-sans bg-[#171724] text-[#ececf6] border border-white/10 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 leading-relaxed font-normal"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <input
                  type="text"
                  value={versionNote}
                  onChange={(e) => setVersionNote(e.target.value)}
                  placeholder="Revision note (e.g. Fixed claims from feedback)..."
                  className="text-xs px-3 py-2 bg-[#171724] text-[#ececf6] placeholder-[#7b7b94] border border-white/10 rounded-lg w-full sm:w-72 focus:outline-none focus:border-indigo-400"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSavingVersion || editorBody === currentVersion?.body}
                >
                  {isSavingVersion ? 'Saving...' : 'Save as new version'}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Right Pane: Review Findings Workbench Centrepiece (5 cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 self-start bg-[#11111a] rounded-xl border border-white/[0.08] p-5 sm:p-6 space-y-4 max-h-[calc(100vh-3rem)] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-[#ececf6]">
                  Governance findings ({findings.length})
                </h2>
                <div className="hidden sm:flex items-center gap-1 text-[11px] text-[#7b7b94]">
                  <Kbd>J</Kbd>
                  <Kbd>K</Kbd>
                </div>
              </div>
              <p className="text-xs text-[#a3a3bb] mt-0.5">Citations against approved guidelines & facts</p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleRunReview}
              disabled={isReviewing}
              isLoading={isReviewing}
              icon={
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0L9.5 5.5L15 7L9.5 8.5L8 14L6.5 8.5L1 7L6.5 5.5L8 0Z" />
                </svg>
              }
            >
              {isReviewing ? 'Auditing...' : 'Run review'}
            </Button>
          </div>

          {/* AI Review Unavailable Banner (Rule 8 Graceful Degradation) */}
          {aiUnavailable && (
            <div
              className="p-3.5 rounded-lg border border-[#f5b74f]/30 bg-[#f5b74f]/10 text-xs flex items-start gap-2.5"
              role="alert"
            >
              <span className="w-2 h-2 rounded-full bg-[#f5b74f] shrink-0 mt-1" />
              <div className="space-y-0.5">
                <strong className="font-medium text-[#fde68a] block">AI review unavailable</strong>
                <p className="text-[#a3a3bb] leading-relaxed">
                  The AI service encountered a temporary error ({aiRun?.error || 'external service unreachable'}). Deterministic rule-based findings remain active.
                </p>
              </div>
            </div>
          )}

          {/* Shimmer skeleton loader when isReviewing is active */}
          {isReviewing ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-4 rounded-xl bg-[#171724] border border-white/[0.04] space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ))}
            </div>
          ) : (
            /* Grouped Findings Cards */
            <div className="max-h-[720px] overflow-y-auto pr-1">
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
          )}
        </div>
      </div>

      {/* Bottom Tabs Section: Comments, History, Activity, AI Disclosure */}
      <Card variant="panel" className="p-5 sm:p-6 space-y-6">
        <nav className="flex space-x-1 border-b border-white/[0.08] pb-3 flex-wrap gap-y-2" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'comments'}
            onClick={() => handleTabChange('comments')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'comments'
                ? 'bg-[#171724] text-[#ececf6] border border-white/10'
                : 'text-[#a3a3bb] hover:text-[#ececf6]'
            }`}
          >
            Comments ({comments.length})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => handleTabChange('history')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#171724] text-[#ececf6] border border-white/10'
                : 'text-[#a3a3bb] hover:text-[#ececf6]'
            }`}
          >
            Version history &amp; diff ({versions.length})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'activity'}
            onClick={() => handleTabChange('activity')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-[#171724] text-[#ececf6] border border-white/10'
                : 'text-[#a3a3bb] hover:text-[#ececf6]'
            }`}
          >
            Activity trail
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'disclosure'}
            onClick={() => handleTabChange('disclosure')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'disclosure'
                ? 'bg-indigo-500/15 text-[#a5b4fc] border border-indigo-500/30'
                : 'text-[#a3a3bb] hover:text-[#ececf6]'
            }`}
          >
            <span>✨</span>
            <span>AI governance &amp; disclosure</span>
          </button>
        </nav>

        {/* Tab 1: Comments */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-xs text-[#7b7b94] italic">No review feedback comments yet.</p>
              ) : (
                comments.map((cm) => (
                  <div key={cm.id} className="p-3.5 rounded-lg border border-white/[0.06] bg-[#171724] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#ececf6]">
                          {cm.profiles?.full_name || 'Team Member'}
                        </span>
                        {cm.profiles?.role && (
                          <RoleBadge role={cm.profiles.role as UserRole} />
                        )}
                      </div>
                      <span className="text-[#7b7b94] font-mono">
                        {new Date(cm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-[#a3a3bb] leading-relaxed">{cm.body}</p>
                  </div>
                ))
              )}
            </div>

            {/* Post comment */}
            <form onSubmit={handlePostComment} className="flex gap-2.5">
              <input
                type="text"
                required
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write an internal review comment..."
                className="flex-1 px-3.5 py-2 text-xs bg-[#171724] text-[#ececf6] placeholder-[#7b7b94] border border-white/10 rounded-lg focus:outline-none focus:border-indigo-400"
              />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                disabled={isPostingComment || !newCommentText.trim()}
              >
                {isPostingComment ? 'Posting...' : 'Comment'}
              </Button>
            </form>
          </div>
        )}

        {/* Tab 2: History & Word-level Diff */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#a3a3bb]">Compare current (v{selectedVersionNum}) against:</span>
                <select
                  value={diffCompareVersion}
                  onChange={(e) => setDiffCompareVersion(parseInt(e.target.value, 10))}
                  className="bg-[#171724] text-[#ececf6] border border-white/10 rounded px-2.5 py-1 text-xs"
                >
                  {versions.map((ver) => (
                    <option key={ver.id} value={ver.version}>
                      Version {ver.version} ({ver.note || 'Draft'})
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-xs text-[#7b7b94]">
                Word diff: <span className="text-[#5fd1a0] font-mono">+Add</span> · <span className="text-[#ff7a8a] line-through font-mono">-Del</span>
              </span>
            </div>

            {/* Diff View Box */}
            <div className="p-4 sm:p-5 rounded-xl border border-white/[0.08] bg-[#0a0a10] font-mono text-xs leading-relaxed max-h-72 overflow-y-auto">
              {diffTokens.map((token, idx) => {
                if (token.type === 'insert') {
                  return (
                    <span key={idx} className="bg-emerald-500/15 text-[#5fd1a0] font-medium underline px-0.5 rounded">
                      {token.value}
                    </span>
                  );
                }
                if (token.type === 'delete') {
                  return (
                    <span key={idx} className="bg-rose-500/15 text-[#ff7a8a] line-through px-0.5 rounded opacity-75">
                      {token.value}
                    </span>
                  );
                }
                return <span key={idx} className="text-[#ececf6]">{token.value}</span>;
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Activity Audit Log */}
        {activeTab === 'activity' && (
          <div className="space-y-2.5 max-h-72 overflow-y-auto">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-[#7b7b94] italic">No activity recorded yet.</p>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-lg border border-white/[0.06] bg-[#171724] text-xs flex items-center justify-between">
                  <div>
                    <span className="font-mono font-medium text-[#ececf6] uppercase tracking-wider">{log.action}</span>
                    <span className="text-[#7b7b94] ml-2 font-mono text-[11px]">{JSON.stringify(log.detail)}</span>
                  </div>
                  <span className="text-[#7b7b94] font-mono">
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
      </Card>

      {/* EDIT-THEN-ACCEPT DIALOG */}
      <Dialog
        isOpen={Boolean(editThenAcceptFinding)}
        onClose={() => setEditThenAcceptFinding(null)}
        title="Edit suggestion and accept"
        description="Refine the replacement text before applying it to create a new draft version:"
      >
        {editThenAcceptFinding && (
          <form onSubmit={handleSubmitEditThenAccept} className="space-y-4">
            <div className="p-3 bg-[#11111a] rounded-lg border border-white/[0.06] text-xs space-y-1">
              <span className="text-[10px] uppercase font-mono text-[#7b7b94] block">Original excerpt:</span>
              <p className="font-mono text-[#ff7a8a] line-through">&ldquo;{editThenAcceptFinding.excerpt}&rdquo;</p>
            </div>

            <div>
              <label htmlFor="custom-suggestion-input" className="block text-xs font-medium text-[#ececf6] mb-1.5">
                Replacement text:
              </label>
              <Textarea
                id="custom-suggestion-input"
                required
                rows={3}
                value={customSuggestionText}
                onChange={(e) => setCustomSuggestionText(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditThenAcceptFinding(null)}
                disabled={isProcessingAction}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isProcessingAction || !customSuggestionText.trim()}
              >
                {isProcessingAction ? 'Applying...' : 'Apply & create version'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* DISMISS DIALOG (Reason Required) */}
      <Dialog
        isOpen={Boolean(dismissingFindingId)}
        onClose={() => {
          setDismissingFindingId(null);
          setDismissReasonText('');
        }}
        title="Dismiss governance finding"
        description="A reason is required to document why this finding is being dismissed in the audit trail:"
      >
        <form onSubmit={handleSubmitDismiss} className="space-y-4">
          <Textarea
            required
            rows={3}
            value={dismissReasonText}
            onChange={(e) => setDismissReasonText(e.target.value)}
            placeholder="Document reason for dismissing this check..."
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDismissingFindingId(null);
                setDismissReasonText('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={isProcessingAction || !dismissReasonText.trim()}
            >
              Confirm dismissal
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DISPUTE DIALOG (Reason Required) */}
      <Dialog
        isOpen={Boolean(disputingFinding)}
        onClose={() => setDisputingFinding(null)}
        title="Dispute governance finding"
        description="Explain why this finding does not apply to this specific copy context:"
      >
        <form onSubmit={handleSubmitDispute} className="space-y-4">
          <Textarea
            required
            rows={3}
            value={disputeReasonText}
            onChange={(e) => setDisputeReasonText(e.target.value)}
            placeholder="Provide justification for dispute..."
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDisputingFinding(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isProcessingAction || !disputeReasonText.trim()}
            >
              Submit dispute
            </Button>
          </div>
        </form>
      </Dialog>

      {/* TRANSITION COMMENT DIALOG (Required for Request Changes and Reject) */}
      <Dialog
        isOpen={Boolean(transitionCommentModal)}
        onClose={() => {
          setTransitionCommentModal(null);
          setTransitionCommentText('');
        }}
        title={transitionCommentModal === 'needs_changes' ? 'Request changes' : 'Reject content draft'}
        description="A review comment is required to explain what modifications are necessary:"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (transitionCommentModal) {
              handleTransition(transitionCommentModal, transitionCommentText);
            }
          }}
          className="space-y-4"
        >
          <Textarea
            required
            rows={3}
            value={transitionCommentText}
            onChange={(e) => setTransitionCommentText(e.target.value)}
            placeholder="Specify feedback for the author..."
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setTransitionCommentModal(null);
                setTransitionCommentText('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!transitionCommentText.trim() || isTransitioning}
            >
              {isTransitioning ? 'Submitting...' : 'Confirm'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
