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
    // Log unexpected errors internally without displaying raw stacks to user
    console.error("App boundary error caught:", error);
  }, [error]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12 text-center"
    >
      <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-8 shadow-sm">
        <div
          className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-700 font-bold text-lg"
          aria-hidden="true"
        >
          !
        </div>
        <h2 className="text-xl font-bold text-stone-900 tracking-tight">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed">
          An unexpected error occurred while processing this page. Your data has not been lost.
        </p>

        {error.digest && (
          <p className="mt-3 text-xs font-mono text-stone-400">
            Reference code: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors cursor-pointer"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
