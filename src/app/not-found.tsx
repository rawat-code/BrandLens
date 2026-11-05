import Link from "next/link";

export default function NotFound() {
  return (
    <main
      className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4 py-16 text-center"
      role="main"
      aria-labelledby="not-found-heading"
    >
      <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-lg" aria-hidden="true">
          404
        </div>
        <h1
          id="not-found-heading"
          className="text-xl font-bold text-stone-900 tracking-tight"
        >
          Page not found
        </h1>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed">
          The page you are looking for doesn’t exist or has been moved. Check the URL or return to your workspace.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/library"
            className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 transition-colors"
          >
            Brand Library
          </Link>
        </div>
      </div>
    </main>
  );
}
