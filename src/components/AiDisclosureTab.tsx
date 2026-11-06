'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import type { AiRun } from '@/lib/types';

interface AiDisclosureTabProps {
  aiRun: AiRun | null;
  confidential?: boolean;
}

export function AiDisclosureTab({ aiRun, confidential }: AiDisclosureTabProps) {
  const [showFullPreview, setShowFullPreview] = useState(false);

  if (!aiRun) {
    return (
      <div className="p-8 text-center rounded-xl border border-white/[0.08] bg-[#11111a]">
        <p className="text-sm font-medium text-[#ececf6]">No AI review run recorded yet for this content.</p>
        <p className="text-xs text-[#a3a3bb] mt-1">
          Click &ldquo;Run review&rdquo; to execute the governance audit pipeline.
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
    <div className="space-y-5">
      {/* Overview Card */}
      <Card variant="panel" className="space-y-4">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                aiRun.used_ai
                  ? 'bg-indigo-500/15 text-[#a5b4fc] border border-indigo-500/30'
                  : 'bg-[#171724] text-[#a3a3bb] border border-white/10'
              }`}
            >
              {aiRun.used_ai ? '✨' : '⚙️'}
            </div>
            <div>
              <CardTitle className="text-sm">
                {aiRun.used_ai ? 'AI-assisted governance active' : 'Deterministic rules only (AI skipped)'}
              </CardTitle>
              <CardDescription>
                {aiRun.used_ai
                  ? 'Gemini evaluated tone, messaging nuances, and intent-preservation.'
                  : 'Audited exclusively through organization library rule patterns.'}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={aiRun.used_ai ? 'ai' : 'neutral'}>
              {aiRun.used_ai ? 'Used AI: Yes' : 'Used AI: No'}
            </Badge>
            {aiRun.created_at && (
              <span className="text-xs text-[#7b7b94] font-mono">
                {new Date(aiRun.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {/* Skip or Error Banner if applicable */}
          {skipInfo && (
            <div
              className={`p-3.5 rounded-lg border text-xs space-y-1 ${
                skipInfo.type === 'error'
                  ? 'bg-[#ff7a8a]/10 border-[#ff7a8a]/30 text-[#ffd0d6]'
                  : skipInfo.type === 'warning'
                  ? 'bg-[#f5b74f]/10 border-[#f5b74f]/30 text-[#fde68a]'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-[#c7d2fe]'
              }`}
            >
              <span className="font-medium text-[#ececf6] block">{skipInfo.title}</span>
              <p className="leading-relaxed text-[#a3a3bb]">{skipInfo.desc}</p>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#171724] rounded-lg border border-white/[0.06]">
              <span className="text-xs text-[#7b7b94] block">AI model</span>
              <span className="text-xs font-medium text-[#ececf6] font-mono truncate block mt-0.5">
                {aiRun.model || 'None'}
              </span>
            </div>

            <div className="p-3 bg-[#171724] rounded-lg border border-white/[0.06]">
              <span className="text-xs text-[#7b7b94] block">PII redactions</span>
              <span className="text-xs font-medium text-[#ececf6] font-mono block mt-0.5">
                {aiRun.redactions} items
              </span>
            </div>

            <div className="p-3 bg-[#171724] rounded-lg border border-white/[0.06]">
              <span className="text-xs text-[#7b7b94] block">Rule findings</span>
              <span className="text-xs font-medium text-[#ececf6] font-mono block mt-0.5">
                {aiRun.rule_count}
              </span>
            </div>

            <div className="p-3 bg-[#171724] rounded-lg border border-white/[0.06]">
              <span className="text-xs text-[#7b7b94] block">AI findings</span>
              <span className="text-xs font-medium text-[#a5b4fc] font-mono block mt-0.5">
                {aiRun.ai_count}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Redacted Data Sent Preview */}
      <Card variant="panel" className="space-y-3">
        <CardHeader>
          <div>
            <CardTitle className="text-xs uppercase tracking-wider font-mono">
              Data sent to model (redacted preview)
            </CardTitle>
            <CardDescription>
              Content is delimited in &lt;content&gt; tags as inert DATA, never instructions.
            </CardDescription>
          </div>

          {aiRun.sent_preview && aiRun.sent_preview.length > 200 && (
            <button
              type="button"
              onClick={() => setShowFullPreview((prev) => !prev)}
              className="text-xs text-[#a5b4fc] hover:underline font-medium cursor-pointer"
            >
              {showFullPreview ? 'Show less' : 'Show full'}
            </button>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          <div className="p-3.5 bg-[#0a0a10] border border-white/[0.08] text-[#ececf6] rounded-lg text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-56">
            {aiRun.sent_preview ? (
              showFullPreview
                ? aiRun.sent_preview
                : `${aiRun.sent_preview.slice(0, 300)}${aiRun.sent_preview.length > 300 ? '...' : ''}`
            ) : (
              <span className="text-[#7b7b94] italic">No external data transmitted (AI skipped).</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
