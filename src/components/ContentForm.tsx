'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';

const MAX_CHAR_LIMIT = 10000;

const SAMPLE_POST = {
  title: 'Verdant Skin Botanical Dew Drops Launch Copy',
  channel: 'instagram',
  audience: 'Conscious consumers seeking clean hydration',
  confidential: false,
  body: `Meet Verdant Skin's newest miracle! Our 100% all-natural Botanical Dew Drops are clinically proven to cure chronic eczema and erase deep wrinkles in just 48 hours.

Formulated with pure unrefined jojoba and wild sea kelp, this formula completely eliminates fine lines without any side effects. Don't let harsh chemical toxins destroy your moisture barrier—switch to chemical-free clean beauty today.

Tap the link in bio to shop now and get 20% off your first bottle!`,
  note: 'Sample draft containing medical claims and absolute phrasing for review testing',
};

export function ContentForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('instagram');
  const [audience, setAudience] = useState('');
  const [confidential, setConfidential] = useState(false);
  const [body, setBody] = useState('');
  const [note, setNote] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File import state
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [importNotice, setImportNotice] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const charCount = body.length;
  const isNearLimit = charCount > 9000;
  const isAtLimit = charCount >= MAX_CHAR_LIMIT;

  const handleLoadSample = () => {
    setTitle(SAMPLE_POST.title);
    setChannel(SAMPLE_POST.channel);
    setAudience(SAMPLE_POST.audience);
    setConfidential(SAMPLE_POST.confidential);
    setBody(SAMPLE_POST.body);
    setNote(SAMPLE_POST.note);
    setImportNotice({
      type: 'success',
      message: 'Loaded sample post with deliberate claim & terminology violations for review.',
    });
    setErrorMessage(null);
  };

  const processUploadedFile = async (file: File) => {
    setIsUploadingFile(true);
    setImportNotice(null);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/content/import-file', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract text from document');
      }

      setBody(data.text);

      // Auto-suggest title if current title is blank
      if (!title.trim() && data.fileName) {
        const cleanedName = data.fileName
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase());
        setTitle(cleanedName);
      }

      if (data.truncated) {
        setImportNotice({
          type: 'warning',
          message: data.warning || 'Document text was truncated to 10,000 characters limit.',
        });
      } else {
        setImportNotice({
          type: 'success',
          message: `Successfully extracted ${data.charCount.toLocaleString()} characters from "${data.fileName}" (${data.fileType.toUpperCase()}). File discarded from memory.`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error reading uploaded file';
      setImportNotice({
        type: 'error',
        message: msg,
      });
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

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
      {/* Sample Post Pre-filler */}
      <div className="bg-[#f5f1e8] border border-[#ddd5c4] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-xs">
          <strong className="text-[#1f1c18] block font-medium">Quick start for review</strong>
          <span className="text-[#5e574c]">
            Load an example post with realistic medical claims and terminology tensions to test the review engine.
          </span>
        </div>
        <button
          type="button"
          onClick={handleLoadSample}
          className="self-start sm:self-auto px-3 py-1.5 bg-[#fffdf8] hover:bg-[#ede7da] text-[#1f1c18] border border-[#1f1c18] font-mono text-xs uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
        >
          Try with a sample post
        </button>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="p-4 bg-[#fffdf8] border border-[#b3261e] text-[#b3261e] text-xs flex items-start gap-3"
        >
          <span className="font-mono uppercase font-semibold text-[11px] shrink-0 mt-0.5">
            Error
          </span>
          <div>
            <strong className="font-medium text-[#1f1c18] block">Submission failed</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <div className="bg-[#fffdf8] border border-[#ddd5c4] p-6 sm:p-8 space-y-6">
        {/* Title */}
        <div>
          <label
            htmlFor="content-title"
            className="block text-[11px] font-mono uppercase tracking-wider text-[#5e574c] mb-1.5"
          >
            Content title <span className="text-[#b3261e]">*</span>
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
              className="block text-[11px] font-mono uppercase tracking-wider text-[#5e574c] mb-1.5"
            >
              Publication channel <span className="text-[#b3261e]">*</span>
            </label>
            <Select
              id="content-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="instagram">Instagram / Social Media</option>
              <option value="blog">Brand Blog & Editorial</option>
              <option value="newsletter">Email Newsletter</option>
              <option value="packaging">Product Packaging & Labels</option>
              <option value="ad_copy">Paid Advertising / Search Ads</option>
              <option value="press_release">Press Release / Public Notice</option>
              <option value="website">E-Commerce / Website Copy</option>
            </Select>
          </div>

          {/* Target Audience */}
          <div>
            <label
              htmlFor="content-audience"
              className="block text-[11px] font-mono uppercase tracking-wider text-[#5e574c] mb-1.5"
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
        <div className="p-4 bg-[#f5f1e8] border border-[#ddd5c4] flex items-start gap-3">
          <input
            id="confidential-toggle"
            type="checkbox"
            checked={confidential}
            onChange={(e) => setConfidential(e.target.checked)}
            className="mt-1 h-4 w-4 rounded-none border border-[#1f1c18] text-[#1f1c18] focus:ring-[#1f1c18] accent-[#1f1c18]"
          />
          <label htmlFor="confidential-toggle" className="text-xs cursor-pointer select-none">
            <span className="font-medium text-[#1f1c18] block">
              Mark content as confidential
            </span>
            <span className="text-[#5e574c] block mt-0.5 leading-relaxed">
              When checked, this text is audited exclusively with deterministic organisation rules.
              It will never be sent to external AI services.
            </span>
          </label>
        </div>

        {/* Document Import Dropzone */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#5e574c]">
              Import from document
            </span>
            <span className="text-[11px] font-mono text-[#5e574c]">
              .docx, .pdf &middot; Max 5 MB &middot; In-memory only
            </span>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed p-4 text-center transition-colors ${
              isDraggingFile
                ? 'border-[#1f1c18] bg-[#ede7da]'
                : 'border-[#ddd5c4] bg-[#faf8f4] hover:border-[#8f887b]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload-input"
            />
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <span className="text-xs text-[#5e574c]">
                {isUploadingFile
                  ? 'Extracting text in-memory...'
                  : 'Drag & drop a Word or PDF file, or'}
              </span>
              <button
                type="button"
                disabled={isUploadingFile}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 bg-[#fffdf8] hover:bg-[#ede7da] text-[#1f1c18] border border-[#ddd5c4] font-mono text-[11px] uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isUploadingFile ? 'Processing...' : 'Browse file'}
              </button>
            </div>
          </div>

          {importNotice && (
            <div
              className={`p-3 text-xs border flex items-start justify-between gap-3 ${
                importNotice.type === 'success'
                  ? 'bg-[#eef5ee] border-[#2d6a4f] text-[#2d6a4f]'
                  : importNotice.type === 'warning'
                  ? 'bg-[#fffbf0] border-[#8a5a00] text-[#8a5a00]'
                  : 'bg-[#fffdf8] border-[#b3261e] text-[#b3261e]'
              }`}
            >
              <span>{importNotice.message}</span>
              <button
                type="button"
                onClick={() => setImportNotice(null)}
                className="font-mono text-[11px] underline hover:no-underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Content Body Editor */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="content-body"
              className="block text-[11px] font-mono uppercase tracking-wider text-[#5e574c]"
            >
              Copy draft text <span className="text-[#b3261e]">*</span>
            </label>
            <span
              className={`text-xs font-mono ${
                isAtLimit
                  ? 'text-[#b3261e] font-semibold'
                  : isNearLimit
                  ? 'text-[#8a5a00]'
                  : 'text-[#5e574c]'
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
            placeholder="Type or paste draft copy here. It will be audited against brand guidelines, verified clinical facts, and approved terminology."
          />
        </div>

        {/* Initial Version Note */}
        <div>
          <label
            htmlFor="version-note"
            className="block text-[11px] font-mono uppercase tracking-wider text-[#5e574c] mb-1.5"
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
        <div className="pt-4 border-t border-[#ddd5c4] flex items-center justify-between gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="md">
              Cancel
            </Button>
          </Link>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting || !title.trim() || !body.trim() || isAtLimit}
            isLoading={isSubmitting}
          >
            {isSubmitting ? 'Creating draft...' : 'Create draft'}
          </Button>
        </div>
      </div>
    </form>
  );
}
