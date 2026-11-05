'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const MAX_CHAR_LIMIT = 10000;

export function ContentForm() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('instagram');
  const [audience, setAudience] = useState('');
  const [confidential, setConfidential] = useState(false);
  const [body, setBody] = useState('');
  const [note, setNote] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const charCount = body.length;
  const isNearLimit = charCount > 9000;
  const isAtLimit = charCount >= MAX_CHAR_LIMIT;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Please provide a title for the content.');
      return;
    }

    if (!body.trim()) {
      setErrorMessage('Content body cannot be empty.');
      return;
    }

    if (body.length > MAX_CHAR_LIMIT) {
      setErrorMessage(`Content body exceeds maximum limit of ${MAX_CHAR_LIMIT.toLocaleString()} characters.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          channel,
          audience: audience.trim() || null,
          confidential,
          body: body.trim(),
          note: note.trim() || 'Initial draft',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create content draft');
      }

      // Redirect to content detail or dashboard
      router.push(`/content/${data.content.id}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 shadow-sm"
        >
          <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <strong className="font-semibold block">Submission Error</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* Title */}
        <div>
          <label
            htmlFor="content-title"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Content Title <span className="text-rose-500">*</span>
          </label>
          <input
            id="content-title"
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Spring Botanical Dew Serum Launch Copy"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>

        {/* Channel & Audience grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Channel */}
          <div>
            <label
              htmlFor="content-channel"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Publication Channel <span className="text-rose-500">*</span>
            </label>
            <select
              id="content-channel"
              required
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            >
              <option value="instagram">Instagram / Social Media</option>
              <option value="blog">Blog / Editorial Guide</option>
              <option value="email">Email Newsletter / Campaign</option>
              <option value="website">Website Landing Page</option>
              <option value="packaging">Packaging / Bottle Label</option>
              <option value="press_release">Press Release / Media Kit</option>
              <option value="other">Other Channel</option>
            </select>
          </div>

          {/* Target Audience */}
          <div>
            <label
              htmlFor="content-audience"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Target Audience
            </label>
            <input
              id="content-audience"
              type="text"
              maxLength={200}
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. Sensitive skin skincare enthusiasts"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>
        </div>

        {/* Confidentiality Guard Checkbox */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-start gap-3">
            <input
              id="content-confidential"
              type="checkbox"
              checked={confidential}
              onChange={(e) => setConfidential(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <div className="text-sm">
              <label
                htmlFor="content-confidential"
                className="font-semibold text-slate-900 cursor-pointer flex items-center gap-1.5"
              >
                <span>Mark content as confidential</span>
                {confidential && (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                    LOCAL RULES ONLY
                  </span>
                )}
              </label>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                When checked, this submission is <strong>never transmitted to external AI services</strong>. In
                strict adherence to brand governance policies, only deterministic local library rules will run on confidential drafts.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body Textarea with 10k Character Counter */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="content-body"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              Content Body <span className="text-rose-500">*</span>
            </label>
            <span
              id="char-count-label"
              className={`text-xs font-mono font-medium ${
                isAtLimit
                  ? 'text-rose-600 font-bold'
                  : isNearLimit
                  ? 'text-amber-600 font-semibold'
                  : 'text-slate-500'
              }`}
            >
              {charCount.toLocaleString()} / {MAX_CHAR_LIMIT.toLocaleString()} characters
            </span>
          </div>
          <textarea
            id="content-body"
            required
            rows={10}
            maxLength={MAX_CHAR_LIMIT}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-describedby="char-count-label"
            placeholder="Type or paste the campaign copy, product claims, or caption here..."
            className="w-full p-4 text-sm font-sans bg-white border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 leading-relaxed"
          />
        </div>

        {/* Version Note */}
        <div>
          <label
            htmlFor="content-note"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Version Note (Optional)
          </label>
          <input
            id="content-note"
            type="text"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Initial draft for Q2 launch approval"
            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href="/dashboard"
          className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting || isAtLimit && body.length > MAX_CHAR_LIMIT}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Creating Draft...</span>
            </>
          ) : (
            <span>Create Draft</span>
          )}
        </button>
      </div>
    </form>
  );
}

