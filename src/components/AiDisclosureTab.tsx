'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { formatTimestamp } from '@/lib/time';
import type { AiRun } from '@/lib/types';

interface AiDisclosureTabProps {
  aiRun: AiRun | null;
  confidential?: boolean;
}

export function AiDisclosureTab({ aiRun, confidential }: AiDisclosureTabProps) {
  const [showFullPreview, setShowFullPreview] = useState(false);

  if (!aiRun) {
    return (
      <div className="p-8 text-center bg-[#fffdf8] border border-[#ddd5c4] rounded-none">
        <p className="text-sm font-medium text-[#1f1c18]">No AI review run recorded for this content.</p>
        <p className="text-xs text-[#5e574c] mt-1">
          Select &ldquo;Run review&rdquo; to execute the governance audit.
        </p>
      </div>
    );
  }

  const getSkipReasonDescription = (reason: string | null, error: string | null) => {
    if (confidential || reason === 'confidential_content') {
      return {
        title: 'Confidential content policy',
        desc: 'Content marked confidential is strictly audited using deterministic local rules and is never sent to external AI services.',
        type: 'info',
      };
    }
    if (reason === 'missing_gemini_api_key') {
      return {
        title: 'AI configuration omitted',
        desc: 'AI credentials are not configured in this environment. Deterministic rule evaluations ran locally.',
        type: 'warning',
      };
    }
    if (reason === 'ai_service_error' || error) {
      return {
        title: 'AI service unavailable',
        desc: error || 'The AI service encountered a temporary error or timeout. Rule-based findings are safely shown.',
        type: 'error',
      };
    }
    return null;
  };

  const skipInfo = getSkipReasonDescription(aiRun.skipped_reason, aiRun.error);
  const createdTs = formatTimestamp(aiRun.created_at);

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="border border-[#ddd5c4] bg-[#fffdf8] p-5 space-y-4 rounded-none">
        <div className="flex items-center justify-between border-b border-[#ddd5c4] pb-3 flex-wrap gap-2">
          <div>
            <h3 className="font-serif text-lg font-medium text-[#1f1c18]">
              {aiRun.used_ai ? 'AI-assisted review' : 'Deterministic rules only (AI skipped)'}
            </h3>
            <p className="text-xs text-[#5e574c] mt-0.5">
              {aiRun.used_ai
                ? 'Gemini evaluated tone, messaging nuances, and intent preservation.'
                : 'Audited exclusively through organization library rule patterns.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={aiRun.used_ai ? 'ai' : 'neutral'}>
              {aiRun.used_ai ? 'AI used' : 'AI not used'}
            </Badge>
            {aiRun.created_at && (
              <time dateTime={aiRun.created_at} title={createdTs.exact} className="text-xs text-[#5e574c]">
                {createdTs.relative}
              </time>
            )}
          </div>
        </div>

        {/* Skip or Error Banner */}
        {skipInfo && (
          <div
            className={`p-3.5 border text-xs space-y-1 ${
              skipInfo.type === 'error'
                ? 'bg-[#fffdf8] border-[#b3261e] text-[#b3261e]'
                : skipInfo.type === 'warning'
                ? 'bg-[#f6e3b4] border-[#8a5a00] text-[#8a5a00]'
                : 'bg-[#f5f1e8] border-[#ddd5c4] text-[#1f1c18]'
            }`}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.04em] font-medium block">
              {skipInfo.title}
            </span>
            <p className="leading-relaxed text-[#5e574c]">{skipInfo.desc}</p>
          </div>
        )}

        {/* Metrics Table / Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 bg-[#f5f1e8] border border-[#ddd5c4]">
            <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] block">AI model</span>
            <span className="text-xs font-mono text-[#1f1c18] font-medium block mt-1 truncate">
              {aiRun.model || 'None'}
            </span>
          </div>

          <div className="p-3 bg-[#f5f1e8] border border-[#ddd5c4]">
            <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] block">PII redactions</span>
            <span className="text-xs font-mono text-[#1f1c18] font-medium block mt-1">
              {aiRun.redactions} {aiRun.redactions === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="p-3 bg-[#f5f1e8] border border-[#ddd5c4]">
            <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] block">Rule findings</span>
            <span className="text-xs font-mono text-[#1f1c18] font-medium block mt-1">
              {aiRun.rule_count}
            </span>
          </div>

          <div className="p-3 bg-[#f5f1e8] border border-[#ddd5c4]">
            <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] block">AI findings</span>
            <span className="text-xs font-mono text-[#1f1c18] font-medium block mt-1">
              {aiRun.ai_count}
            </span>
          </div>
        </div>
      </div>

      {/* Redacted Data Sent Preview */}
      <div className="border border-[#ddd5c4] bg-[#fffdf8] p-5 space-y-3 rounded-none">
        <div className="flex items-center justify-between border-b border-[#ddd5c4] pb-2">
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c]">
              Data sent to model (redacted preview)
            </h4>
            <p className="text-xs text-[#5e574c] mt-0.5">
              Content is delimited in &lt;content&gt; tags as inert DATA, never instructions.
            </p>
          </div>

          {aiRun.sent_preview && aiRun.sent_preview.length > 200 && (
            <button
              type="button"
              onClick={() => setShowFullPreview((prev) => !prev)}
              className="text-xs text-[#1f1c18] underline underline-offset-2 hover:text-[#5e574c] cursor-pointer"
            >
              {showFullPreview ? 'Show less' : 'Show full'}
            </button>
          )}
        </div>

        <div className="p-3.5 bg-[#f5f1e8] border border-[#ddd5c4] text-[#1f1c18] text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-56 leading-relaxed">
          {aiRun.sent_preview ? (
            showFullPreview
              ? aiRun.sent_preview
              : `${aiRun.sent_preview.slice(0, 300)}${aiRun.sent_preview.length > 300 ? '...' : ''}`
          ) : (
            <span className="text-[#5e574c] italic">No external data transmitted (AI skipped).</span>
          )}
        </div>
      </div>
    </div>
  );
}
