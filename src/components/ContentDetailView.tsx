'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RoleBadge } from '@/components/RoleBadge';
import { computeWordDiff, type DiffChange } from '@/lib/diff';
import { HighlightedText } from '@/components/HighlightedText';
import { FindingsGroup } from '@/components/FindingsGroup';
import { AiDisclosureTab } from '@/components/AiDisclosureTab';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Input';
import { formatTimestamp } from '@/lib/time';
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

  // Editor mode toggle: 'readonly' (highlighted text) vs 'edit' (textarea)
  const [editorMode, setEditorMode] = useState<EditorMode>('readonly');

  // Currently focused/active finding
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);

  // Bottom tab
  const [activeTab, setActiveTab] = useState<BottomTab>('comments');

  // Review execution state
  const [isReviewing, setIsReviewing] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState<boolean>(Boolean(initialAiRun?.error));

  // Post-fix prompt message
  const [reRunPromptMessage, setReRunPromptMessage] = useState<string | null>(null);

  // Workflow transition state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionCommentModal, setTransitionCommentModal] = useState<'needs_changes' | 'rejected' | null>(null);
  const [transitionCommentText, setTransitionCommentText] = useState('');

  // Comment input state
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

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

  // Approval blocking rules
  let approvalBlockReason: string | null = null;
  if (content.status === 'in_review') {
    if (isCreator) {
      approvalBlockReason = 'Creators cannot approve content';
    } else if (isOwnContent) {
      approvalBlockReason = 'Creators cannot approve own content';
    } else if (isManager && openHighSevRequiringReviewer) {
      approvalBlockReason = 'Open high-severity findings require Reviewer role';
    }
  }

  // Two-way selection handler: scroll to and focus the note
  const handleSelectFinding = useCallback((findingId: string) => {
    setActiveFindingId(findingId);
    const noteEl = document.getElementById(`note-${findingId}`);
    if (noteEl) {
      noteEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      noteEl.focus();
    }
  }, []);

  // Keyboard navigation: J (next), K (previous), Enter (focus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (!findings.length) return;

      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        const currentIndex = findings.findIndex((f) => f.id === activeFindingId);
        const nextIndex = currentIndex < findings.length - 1 ? currentIndex + 1 : 0;
        handleSelectFinding(findings[nextIndex].id);
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        const currentIndex = findings.findIndex((f) => f.id === activeFindingId);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : findings.length - 1;
        handleSelectFinding(findings[prevIndex].id);
      } else if (e.key === 'Enter' && activeFindingId) {
        const noteEl = document.getElementById(`note-${activeFindingId}`);
        if (noteEl) {
          noteEl.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [findings, activeFindingId, handleSelectFinding]);

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
        throw new Error(data.error || 'Review execution failed');
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
        text: `Review completed with ${data.findings.length} findings cited against organization rules.`,
        type: 'success',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Review failed';
      setBannerMessage({ text: msg, type: 'error' });
    } finally {
      setIsReviewing(false);
    }
  };

  // Save new version
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
      setReRunPromptMessage(`Draft saved as Version ${updatedVer.version}. Select "Run review" to audit changes.`);
      setBannerMessage({ text: `Saved Version ${updatedVer.version}`, type: 'success' });
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
        `Applied fix for ${finding.category}. Version ${data.new_version?.version || 'created'}. Re-run review to audit.`
      );
      setBannerMessage({ text: 'Suggestion accepted and draft version updated.', type: 'success' });
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
        `Custom edit saved to Version ${data.new_version?.version || 'created'}. Re-run review to audit.`
      );
      setBannerMessage({ text: 'Custom modification applied.', type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error applying edit';
      setBannerMessage({ text: msg, type: 'error' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Dismiss Finding with reason
  const handleDismissFinding = async (findingId: string, reason?: string) => {
    if (!reason || !reason.trim()) return;

    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/findings/${findingId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dismiss finding');

      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status: 'dismissed' as const } : f))
      );
      setBannerMessage({ text: 'Finding dismissed and documented in audit log.', type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to dismiss finding';
      setBannerMessage({ text: msg, type: 'error' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Dispute Finding with reason
  const handleDisputeFinding = async (finding: Finding, reason?: string) => {
    if (!reason || !reason.trim()) return;

    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/findings/${finding.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispute finding');

      setFindings((prev) =>
        prev.map((f) =>
          f.id === finding.id
            ? { ...f, status: 'disputed' as const, dispute_reason: reason.trim() }
            : f
        )
      );
      setBannerMessage({ text: 'Finding disputed. Reviewers will evaluate your justification.', type: 'success' });
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
        throw new Error(data.error || 'Workflow transition blocked');
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
        text: `Content marked as "${toStatus.replace('_', ' ')}".`,
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

  const statusLabel = content.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const channelLabel = content.channel ? content.channel.charAt(0).toUpperCase() + content.channel.slice(1) : 'General';
  const metaLine = `${statusLabel} · Version ${content.current_version} · ${channelLabel} · Submitted by ${profile.full_name || 'Creator'}`;

  return (
    <div className="space-y-8">
      {/* Feedback banner */}
      {bannerMessage && (
        <div
          role="alert"
          className={`p-3.5 border rounded-none text-xs flex items-center justify-between ${
            bannerMessage.type === 'success'
              ? 'bg-[#fffdf8] border-[#1f6b3a] text-[#1f6b3a]'
              : 'bg-[#fffdf8] border-[#b3261e] text-[#b3261e]'
          }`}
        >
          <span>{bannerMessage.text}</span>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-xs underline hover:opacity-75 cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Post-Accept / Edit re-run review prompt banner */}
      {reRunPromptMessage && (
        <div
          role="status"
          className="p-3.5 border border-[#ddd5c4] bg-[#fffdf8] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div>
            <strong className="font-medium text-[#1f1c18] block">Draft modified</strong>
            <span className="text-[#5e574c]">{reRunPromptMessage}</span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRunReview}
            disabled={isReviewing}
          >
            {isReviewing ? 'Auditing...' : 'Run review'}
          </Button>
        </div>
      )}

      {/* Confidential content banner */}
      {content.confidential && (
        <div className="p-3.5 bg-[#fffdf8] border border-[#ddd5c4] text-xs">
          <strong className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#8a5a00] block">
            Confidential content
          </strong>
          <p className="text-xs text-[#5e574c] mt-0.5 leading-relaxed">
            This content is marked confidential. It is audited solely against deterministic organization library rules and is never sent to external AI services.
          </p>
        </div>
      )}

      {/* Header (Newsreader 38px, meta line, workflow buttons, 1px rule) */}
      <header className="space-y-3 pb-5 border-b border-[#ddd5c4]">
        <div className="flex flex-col lg:flex-row lg:items-baseline justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h1 className="font-serif text-[38px] font-medium text-[#1f1c18] leading-[1.1] tracking-normal break-words">
              {content.title}
            </h1>
            <p className="text-[13px] text-[#5e574c]">
              {metaLine}
            </p>
          </div>

          {/* Workflow Action Buttons */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* Creator actions */}
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
                  variant="secondary"
                  size="md"
                  onClick={() => setTransitionCommentModal('needs_changes')}
                  disabled={isTransitioning}
                >
                  Request changes
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleTransition('approved')}
                    disabled={isTransitioning || Boolean(approvalBlockReason)}
                  >
                    Approve
                  </Button>

                  {approvalBlockReason && (
                    <span className="text-[12px] text-[#5e574c] max-w-[190px] leading-tight">
                      {approvalBlockReason}
                    </span>
                  )}
                </div>

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
      </header>

      {/* Two columns: Reading pane (1fr) and Margin notes (440px), gap 40px */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10 items-start">
        {/* Left Column: Reading Pane */}
        <div className="space-y-4 min-w-0">
          {/* Top Controls: Version picker & Edit toggle & Run review */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#ddd5c4] pb-3 gap-3">
            <div className="flex items-center gap-3">
              <label htmlFor="version-picker" className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c]">
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
                className="font-mono text-[11px] bg-[#fffdf8] text-[#1f1c18] border border-[#ddd5c4] rounded-none px-2.5 py-1 focus:outline-2 focus:outline-[#1f1c18]"
              >
                {versions.map((ver) => (
                  <option key={ver.id} value={ver.version}>
                    v{ver.version} {ver.note ? `(${ver.note})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={editorMode === 'readonly' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setEditorMode('readonly')}
              >
                Reading text
              </Button>
              <Button
                variant={editorMode === 'edit' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setEditorMode('edit')}
              >
                Edit draft
              </Button>
            </div>
          </div>

          {/* Reading view or edit textarea */}
          {editorMode === 'readonly' ? (
            <div className="space-y-2">
              <HighlightedText
                text={editorBody}
                findings={findings}
                activeFindingId={activeFindingId}
                onSelectFinding={handleSelectFinding}
              />
              <div className="flex items-center justify-between text-[12px] text-[#5e574c] pt-1">
                <span>Select any numbered note or highlighted span to focus its margin note.</span>
                <span className="font-mono">{editorBody.length.toLocaleString()} / 10,000 characters</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveVersion} className="space-y-4">
              <textarea
                rows={16}
                maxLength={10000}
                value={editorBody}
                onChange={(e) => setEditorBody(e.target.value)}
                placeholder="Draft body content..."
                aria-label="Edit content draft"
                className="w-full p-[34px] font-serif text-[20px] leading-[1.8] bg-[#fffdf8] text-[#1f1c18] border border-[#ddd5c4] rounded-none focus:outline-2 focus:outline-[#1f1c18] resize-y"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <input
                  type="text"
                  value={versionNote}
                  onChange={(e) => setVersionNote(e.target.value)}
                  placeholder="Revision note (e.g., Updated SPF claims)..."
                  aria-label="Revision note"
                  className="text-xs px-3 py-2 bg-[#fffdf8] text-[#1f1c18] placeholder-[#5e574c] border border-[#ddd5c4] rounded-none w-full sm:w-80 focus:outline-2 focus:outline-[#1f1c18]"
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

        {/* Right Column: Margin Notes on Paper (440px) */}
        <aside
          aria-label="Margin review findings"
          className="space-y-4 lg:sticky lg:top-20 self-start w-full"
        >
          <div className="flex items-baseline justify-between border-b border-[#ddd5c4] pb-2">
            <div>
              <h2 className="font-serif text-[20px] font-medium text-[#1f1c18]">
                Margin notes ({findings.length})
              </h2>
              <p className="text-[12px] text-[#5e574c] mt-0.5">
                Proofreader citations against library
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleRunReview}
              disabled={isReviewing}
              isLoading={isReviewing}
            >
              {isReviewing ? 'Auditing...' : 'Run review'}
            </Button>
          </div>

          {/* AI Review Unavailable Banner if degraded */}
          {aiUnavailable && (
            <div
              className="p-3 border border-[#ddd5c4] bg-[#fffdf8] text-xs"
              role="alert"
            >
              <strong className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#8a5a00] block">
                AI review unavailable
              </strong>
              <p className="text-xs text-[#5e574c] mt-0.5 leading-relaxed">
                The AI service could not be reached. Deterministic rule-based findings remain active.
              </p>
            </div>
          )}

          {/* While a review runs, show skeleton notes (static grey blocks, no shimmer) */}
          {isReviewing ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-4 bg-[#fffdf8] border border-[#ddd5c4] border-t-4 border-t-[#ddd5c4] space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
              <FindingsGroup
                findings={findings}
                activeFindingId={activeFindingId}
                onSelectFinding={handleSelectFinding}
                onAcceptFinding={handleAcceptFinding}
                onEditThenAccept={handleOpenEditThenAccept}
                onDisputeFinding={handleDisputeFinding}
                onDismissFinding={handleDismissFinding}
                isProcessingAction={isProcessingAction}
              />
            </div>
          )}
        </aside>
      </div>

      {/* Tabs below: Comments, History, Activity, AI disclosure */}
      <section aria-label="Review details and audit tabs" className="border-t border-[#ddd5c4] pt-8 space-y-6">
        <nav className="flex space-x-6 border-b border-[#ddd5c4] pb-0 flex-wrap" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'comments'}
            onClick={() => handleTabChange('comments')}
            className={`pb-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'comments'
                ? 'text-[#1f1c18] border-b-2 border-[#1f1c18]'
                : 'text-[#5e574c] hover:text-[#1f1c18]'
            }`}
          >
            Comments ({comments.length})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => handleTabChange('history')}
            className={`pb-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'text-[#1f1c18] border-b-2 border-[#1f1c18]'
                : 'text-[#5e574c] hover:text-[#1f1c18]'
            }`}
          >
            History &amp; diff ({versions.length})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'activity'}
            onClick={() => handleTabChange('activity')}
            className={`pb-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'activity'
                ? 'text-[#1f1c18] border-b-2 border-[#1f1c18]'
                : 'text-[#5e574c] hover:text-[#1f1c18]'
            }`}
          >
            Activity trail
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'disclosure'}
            onClick={() => handleTabChange('disclosure')}
            className={`pb-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'disclosure'
                ? 'text-[#1f1c18] border-b-2 border-[#1f1c18]'
                : 'text-[#5e574c] hover:text-[#1f1c18]'
            }`}
          >
            AI disclosure
          </button>
        </nav>

        {/* Tab 1: Comments */}
        {activeTab === 'comments' && (
          <div className="space-y-4 max-w-2xl">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-xs text-[#5e574c] italic">No review comments yet.</p>
              ) : (
                comments.map((cm) => {
                  const ts = formatTimestamp(cm.created_at);
                  return (
                    <div key={cm.id} className="p-3.5 border border-[#ddd5c4] bg-[#fffdf8] space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#1f1c18]">
                            {cm.profiles?.full_name || 'Team member'}
                          </span>
                          {cm.profiles?.role && (
                            <RoleBadge role={cm.profiles.role as UserRole} />
                          )}
                        </div>
                        <time dateTime={cm.created_at} title={ts.exact} className="text-[#5e574c] font-mono text-[11px]">
                          {ts.relative}
                        </time>
                      </div>
                      <p className="text-xs text-[#1f1c18] leading-relaxed pt-1">{cm.body}</p>
                    </div>
                  );
                })
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
                aria-label="Comment text"
                className="flex-1 px-3.5 py-2 text-xs bg-[#fffdf8] text-[#1f1c18] placeholder-[#5e574c] border border-[#ddd5c4] rounded-none focus:outline-2 focus:outline-[#1f1c18]"
              />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                disabled={isPostingComment || !newCommentText.trim()}
              >
                {isPostingComment ? 'Posting...' : 'Post comment'}
              </Button>
            </form>
          </div>
        )}

        {/* Tab 2: History & Diff */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#5e574c]">Compare Version {selectedVersionNum} against:</span>
                <select
                  value={diffCompareVersion}
                  onChange={(e) => setDiffCompareVersion(parseInt(e.target.value, 10))}
                  aria-label="Compare version select"
                  className="bg-[#fffdf8] text-[#1f1c18] border border-[#ddd5c4] rounded-none px-2.5 py-1 text-xs"
                >
                  {versions.map((ver) => (
                    <option key={ver.id} value={ver.version}>
                      Version {ver.version} ({ver.note || 'Draft'})
                    </option>
                  ))}
                </select>
              </div>

              <span className="font-mono text-[11px] text-[#5e574c]">
                Word diff: <span className="text-[#1f6b3a] underline">+Add</span> · <span className="text-[#b3261e] line-through">-Delete</span>
              </span>
            </div>

            {/* Side-by-side or inline Diff block */}
            <div className="p-4 bg-[#fffdf8] border border-[#ddd5c4] font-mono text-xs leading-relaxed max-h-80 overflow-y-auto">
              {diffTokens.map((token, idx) => {
                if (token.type === 'insert') {
                  return (
                    <span key={idx} className="text-[#1f6b3a] underline underline-offset-2 font-medium">
                      {token.value}
                    </span>
                  );
                }
                if (token.type === 'delete') {
                  return (
                    <span key={idx} className="text-[#b3261e] line-through opacity-75">
                      {token.value}
                    </span>
                  );
                }
                return <span key={idx} className="text-[#1f1c18]">{token.value}</span>;
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Activity trail */}
        {activeTab === 'activity' && (
          <div className="space-y-2 max-h-80 overflow-y-auto max-w-3xl">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-[#5e574c] italic">No activity recorded yet.</p>
            ) : (
              <div className="border border-[#ddd5c4] bg-[#fffdf8]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#fffdf8] border-b border-[#ddd5c4] font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c]">
                    <tr>
                      <th className="px-4 py-2 font-medium">Action</th>
                      <th className="px-4 py-2 font-medium">Details</th>
                      <th className="px-4 py-2 font-medium text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ddd5c4]">
                    {activityLogs.map((log) => {
                      const ts = formatTimestamp(log.created_at);
                      return (
                        <tr key={log.id} className="hover:bg-[#f5f1e8]">
                          <td className="px-4 py-2.5 font-mono text-[11px] uppercase text-[#1f1c18]">
                            {log.action}
                          </td>
                          <td className="px-4 py-2.5 text-[#5e574c] font-mono text-[11px]">
                            {JSON.stringify(log.detail)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-[11px] text-[#5e574c]">
                            <time dateTime={log.created_at} title={ts.exact}>
                              {ts.relative}
                            </time>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: AI disclosure */}
        {activeTab === 'disclosure' && (
          <AiDisclosureTab aiRun={aiRun} confidential={content.confidential} />
        )}
      </section>

      {/* EDIT-THEN-ACCEPT DIALOG */}
      <Dialog
        isOpen={Boolean(editThenAcceptFinding)}
        onClose={() => setEditThenAcceptFinding(null)}
        title="Edit suggestion and accept"
        description="Refine the replacement text before applying it to create a new draft version:"
      >
        {editThenAcceptFinding && (
          <form onSubmit={handleSubmitEditThenAccept} className="space-y-4">
            <div className="p-3 bg-[#f5f1e8] border border-[#ddd5c4] text-xs space-y-1">
              <span className="font-mono text-[10px] uppercase text-[#5e574c] block">Original excerpt:</span>
              <p className="font-mono text-[#b3261e] line-through">&ldquo;{editThenAcceptFinding.excerpt}&rdquo;</p>
            </div>

            <div>
              <label htmlFor="custom-suggestion-input" className="block text-xs font-medium text-[#1f1c18] mb-1.5">
                Replacement text:
              </label>
              <Textarea
                id="custom-suggestion-input"
                required
                rows={3}
                value={customSuggestionText}
                onChange={(e) => setCustomSuggestionText(e.target.value)}
                className="font-mono text-xs"
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
                {isProcessingAction ? 'Applying...' : 'Apply and create version'}
              </Button>
            </div>
          </form>
        )}
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
            aria-label="Transition comment"
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
