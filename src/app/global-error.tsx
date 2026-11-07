"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global boundary error caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#f5f1e8] text-[#1f1c18] font-sans min-h-screen flex items-center justify-center p-4">
        <main
          role="alert"
          aria-live="assertive"
          className="max-w-md w-full bg-[#fffdf8] border border-[#ddd5c4] p-8 rounded-none shadow-none text-center"
        >
          <div className="font-mono text-xs uppercase tracking-[0.04em] text-[#b3261e] mb-2">
            Critical error
          </div>
          <h1 className="font-serif text-[32px] font-medium text-[#1f1c18] leading-[1.1]">
            Application error
          </h1>
          <p className="mt-3 text-sm text-[#5e574c] leading-[1.55]">
            A critical application error occurred. The incident has been recorded.
          </p>

          {error.digest && (
            <p className="mt-3 font-mono text-[11px] text-[#5e574c]">
              Reference code: {error.digest}
            </p>
          )}

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#f5f1e8] bg-[#1f1c18] hover:bg-[#1f1c18]/90 rounded-none transition-opacity duration-120 cursor-pointer"
            >
              Reload application
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
