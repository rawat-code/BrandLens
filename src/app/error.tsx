"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App boundary error caught:", error);
  }, [error]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12 text-center"
    >
      <div className="max-w-md w-full bg-[#fffdf8] border border-[#ddd5c4] p-8 rounded-none shadow-none text-center">
        <div className="font-mono text-xs uppercase tracking-[0.04em] text-[#b3261e] mb-2">
          System error
        </div>
        <h2 className="font-serif text-[32px] font-medium text-[#1f1c18] leading-[1.1]">
          Action could not complete
        </h2>
        <p className="mt-3 text-sm text-[#5e574c] leading-[1.55]">
          An unexpected error occurred while processing this request. Your data has not been lost.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-[#5e574c]">
            Reference code: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#f5f1e8] bg-[#1f1c18] hover:bg-[#1f1c18]/90 rounded-none transition-opacity duration-120 cursor-pointer"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#1f1c18] bg-[#fffdf8] hover:bg-[#f5f1e8] border border-[#1f1c18] rounded-none transition-colors duration-120 cursor-pointer"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
