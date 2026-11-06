'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

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
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-[#ff7a8a] text-xs flex items-start gap-3 shadow-lg"
        >
          <svg className="w-4 h-4 text-[#ff7a8a] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <strong className="font-medium text-[#ececf6] block">Submission error</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <Card variant="panel" className="p-6 md:p-8 space-y-6">
        {/* Title */}
        <div>
          <label
            htmlFor="content-title"
            className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1.5"
          >
            Content title <span className="text-[#ff7a8a]">*</span>
          </label>
          <Input
            id="content-title"
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Spring Botanical Dew Serum Launch Copy"
          />
        </div>

        {/* Channel & Audience grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Channel */}
          <div>
            <label
              htmlFor="content-channel"
              className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1.5"
            >
              Publication channel <span className="text-[#ff7a8a]">*</span>
            </label>
            <Select
              id="content-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="instagram" className="bg-[#171724]">Instagram / Social Media</option>
              <option value="blog" className="bg-[#171724]">Brand Blog & Editorial</option>
              <option value="newsletter" className="bg-[#171724]">Email Newsletter</option>
              <option value="packaging" className="bg-[#171724]">Product Packaging & Labels</option>
              <option value="ad_copy" className="bg-[#171724]">Paid Advertising / Search Ads</option>
              <option value="press_release" className="bg-[#171724]">Press Release / Public Notice</option>
              <option value="website" className="bg-[#171724]">E-Commerce / Website Copy</option>
            </Select>
          </div>

          {/* Target Audience */}
          <div>
            <label
              htmlFor="content-audience"
              className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1.5"
            >
              Target audience (optional)
            </label>
            <Input
              id="content-audience"
              type="text"
              maxLength={100}
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. Sensitive skin consumers, Dermatologists"
            />
          </div>
        </div>

        {/* Confidentiality Toggle (Rule 4) */}
        <div className="p-4 rounded-xl bg-[#171724] border border-white/[0.06] flex items-start gap-3">
          <input
            id="confidential-toggle"
            type="checkbox"
            checked={confidential}
            onChange={(e) => setConfidential(e.target.checked)}
            className="mt-1 h-4 w-4 rounded bg-[#11111a] border-white/20 text-indigo-500 focus:ring-indigo-400"
          />
          <label htmlFor="confidential-toggle" className="text-xs cursor-pointer select-none">
            <span className="font-medium text-[#ececf6] block">
              Mark content as confidential
            </span>
            <span className="text-[#a3a3bb] block mt-0.5 leading-relaxed">
              When checked, this text will strictly be audited using deterministic organization rules.
              It will never be transmitted to external AI services.
            </span>
          </label>
        </div>

        {/* Content Body Editor */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="content-body"
              className="block text-xs font-mono uppercase text-[#a3a3bb]"
            >
              Copy draft text <span className="text-[#ff7a8a]">*</span>
            </label>
            <span
              className={`text-xs font-mono ${
                isAtLimit
                  ? 'text-[#ff7a8a] font-bold'
                  : isNearLimit
                  ? 'text-[#f5b74f]'
                  : 'text-[#7b7b94]'
              }`}
            >
              {charCount.toLocaleString()} / {MAX_CHAR_LIMIT.toLocaleString()} chars
            </span>
          </div>

          <Textarea
            id="content-body"
            required
            rows={12}
            maxLength={MAX_CHAR_LIMIT}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type or paste your copy draft here. It will be checked against brand guidelines, approved facts, and registered terminology..."
          />
        </div>

        {/* Initial Version Note */}
        <div>
          <label
            htmlFor="version-note"
            className="block text-xs font-mono uppercase text-[#a3a3bb] mb-1.5"
          >
            Version note (optional)
          </label>
          <Input
            id="version-note"
            type="text"
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Initial concept draft for Q3 campaign"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="md">
              ← Cancel
            </Button>
          </Link>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting || !title.trim() || !body.trim() || isAtLimit}
            isLoading={isSubmitting}
          >
            {isSubmitting ? 'Creating draft...' : 'Create draft & open workbench →'}
          </Button>
        </div>
      </Card>
    </form>
  );
}
