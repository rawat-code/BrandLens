'use client';

import React, { useState } from 'react';
import type { AiRun } from '@/lib/types';

interface AiDisclosureTabProps {
  aiRun: AiRun | null;
  confidential?: boolean;
}

export function AiDisclosureTab({ aiRun, confidential }: AiDisclosureTabProps) {
  const [showFullPreview, setShowFullPreview] = useState(false);

  if (!aiRun) {
    return (
      <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
        <p className="text-xs font-semibold text-slate-700">No AI review run recorded yet for this content.</p>
        <p className="text-xs text-slate-500 mt-1">
          Click &ldquo;Run Review&rdquo; to execute the governance audit pipeline.
        </p>
      </div>
    );
  }

  const getSkipReasonDescription = (reason: string | null, error: string | null) => {
    if (confidential || reason === 'confidential_content') {
      return {
        title: 'Confidential Content Policy',
        desc: 'Content marked confidential is strictly audited using deterministic local rules and is never transmitted to external AI services.',
        type: 'info',
      };
    }
    if (reason === 'missing_gemini_api_key') {
      return {
        title: 'Missing AI Configuration',
        desc: 'AI credentials are not configured in this environment. Deterministic rule evaluations ran locally.',
        type: 'warning',
      };
    }
    if (reason === 'ai_service_error' || error) {
      return {
        title: 'AI Service Error (Graceful Degradation)',
        desc: error || 'The external AI service encountered a temporary timeout or error. Rule-based findings are safely shown.',
        type: 'error',
      };
    }
    return null;
  };

  const skipInfo = getSkipReasonDescription(aiRun.skipped_reason, aiRun.error);

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                aiRun.used_ai
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {aiRun.used_ai ? '✨' : '⚙️'}
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {aiRun.used_ai ? 'AI-Assisted Governance Active' : 'Deterministic Rules Only (AI Skipped)'}
              </h3>
              <p className="text-xs text-slate-500">
                {aiRun.used_ai
                  ? 'Gemini evaluated tone, messaging nuances, and intent-preservation.'
                  : 'Audited exclusively through organization library rule patterns.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${
                aiRun.used_ai
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {aiRun.used_ai ? 'Used AI: Yes' : 'Used AI: No'}
            </span>
            {aiRun.created_at && (
              <span className="text-xs text-slate-500 font-mono">
                {new Date(aiRun.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Skip or Error Banner if applicable */}
        {skipInfo && (
          <div
            className={`p-3.5 rounded-lg border text-xs space-y-1 ${
              skipInfo.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : skipInfo.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <span className="font-bold block">{skipInfo.title}</span>
            <p className="leading-relaxed">{skipInfo.desc}</p>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 block">AI Model</span>
            <span className="text-xs font-bold text-slate-900 font-mono truncate block mt-0.5">
              {aiRun.model || 'None'}
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 block">PII Redactions</span>
            <span className="text-xs font-bold text-slate-900 font-mono block mt-0.5">
              {aiRun.redactions} items
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 block">Rule Findings</span>
            <span className="text-xs font-bold text-slate-900 font-mono block mt-0.5">
              {aiRun.rule_count}
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 block">AI Findings</span>
            <span className="text-xs font-bold text-purple-700 font-mono block mt-0.5">
              {aiRun.ai_count}
            </span>
          </div>
        </div>
      </div>

      {/* Redacted Data Sent Preview */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Data Sent to Model (Redacted Preview)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Content is delimited in &lt;content&gt; tags as inert DATA, never instructions.
            </p>
          </div>

          {aiRun.sent_preview && aiRun.sent_preview.length > 200 && (
            <button
              type="button"
              onClick={() => setShowFullPreview((prev) => !prev)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
            >
              {showFullPreview ? 'Show Less' : 'Show Full'}
            </button>
          )}
        </div>

        <div className="p-3.5 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-56">
          {aiRun.sent_preview ? (
            showFullPreview
              ? aiRun.sent_preview
              : `${aiRun.sent_preview.slice(0, 300)}${aiRun.sent_preview.length > 300 ? '...' : ''}`
          ) : (
            <span className="text-slate-500 italic">No external data transmitted (AI skipped).</span>
          )}
        </div>
      </div>
    </div>
  );
}
