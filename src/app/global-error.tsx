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
      <body className="bg-stone-50 text-stone-900 font-sans min-h-screen flex items-center justify-center p-4">
        <main
          role="alert"
          aria-live="assertive"
          className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-8 shadow-sm text-center"
        >
          <div
            className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-700 font-bold text-lg"
            aria-hidden="true"
          >
            !
          </div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            Application Error
          </h1>
          <p className="mt-2 text-sm text-stone-600 leading-relaxed">
            A critical application error occurred. We have safely logged the incident.
          </p>

          {error.digest && (
            <p className="mt-3 text-xs font-mono text-stone-400">
              Reference code: {error.digest}
            </p>
          )}

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors cursor-pointer"
            >
              Reload application
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
