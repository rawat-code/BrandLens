import Link from "next/link";

export default function NotFound() {
  return (
    <main
      className="min-h-screen bg-[#f5f1e8] flex flex-col items-center justify-center px-4 py-16 text-center"
      role="main"
      aria-labelledby="not-found-heading"
    >
      <div className="max-w-md w-full bg-[#fffdf8] border border-[#ddd5c4] p-8 text-center rounded-none shadow-none">
        <div className="font-mono text-xs uppercase tracking-[0.04em] text-[#5e574c] mb-2">
          404 · Not found
        </div>
        <h1
          id="not-found-heading"
          className="font-serif text-[32px] font-medium text-[#1f1c18] leading-[1.1]"
        >
          Page not found
        </h1>
        <p className="mt-3 text-sm text-[#5e574c] leading-[1.55]">
          The requested page does not exist or has moved. Return to the dashboard to continue review work.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#f5f1e8] bg-[#1f1c18] hover:bg-[#1f1c18]/90 rounded-none transition-opacity duration-120 cursor-pointer"
          >
            Return to dashboard
          </Link>
          <Link
            href="/library"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#1f1c18] bg-[#fffdf8] hover:bg-[#f5f1e8] border border-[#1f1c18] rounded-none transition-colors duration-120 cursor-pointer"
          >
            View library
          </Link>
        </div>
      </div>
    </main>
  );
}
