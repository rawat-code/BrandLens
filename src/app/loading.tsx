export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading workspace..."
      className="min-h-screen bg-slate-50 flex items-center justify-center p-6"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-600">Loading BrandLens...</span>
        <span className="sr-only">Loading content, please wait...</span>
      </div>
    </div>
  );
}

