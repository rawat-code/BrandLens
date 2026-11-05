'use client';

interface BarItem {
  label: string;
  count: number;
  percentage: number;
  sublabel?: string;
}

interface SimpleBarChartProps {
  title: string;
  description?: string;
  items: BarItem[];
  tableHeaders: [string, string, string]; // [Label col, Count col, Pct col]
  barColorClass?: string;
  emptyMessage?: string;
}

export function SimpleBarChart({
  title,
  description,
  items,
  tableHeaders,
  barColorClass = 'bg-emerald-600',
  emptyMessage = 'No data available for this timeframe.',
}: SimpleBarChartProps) {
  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
          {emptyMessage}
        </div>
      ) : (
        <>
          {/* Visual Accessible Bar Chart */}
          <div className="space-y-3 pt-1" role="region" aria-label={`${title} graphical chart`}>
            {items.slice(0, 6).map((item) => {
              const widthPct = Math.max(Math.round((item.count / maxCount) * 100), 4);
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[200px]" title={item.label}>
                      {item.label}
                    </span>
                    <span className="font-bold text-slate-900 ml-2">
                      {item.count}{' '}
                      <span className="font-normal text-slate-500 text-[11px]">
                        ({item.percentage}%)
                      </span>
                    </span>
                  </div>
                  {/* Accessible graphical bar */}
                  <div
                    className="w-full bg-slate-100 rounded-full h-3 overflow-hidden"
                    aria-hidden="true"
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Accessible Table Underneath */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <details className="group">
              <summary className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer list-none flex items-center justify-between py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded">
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 group-open:rotate-90 transition-transform">
                    ▶
                  </span>
                  <span>View Accessible Data Table</span>
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {items.length} {items.length === 1 ? 'row' : 'rows'}
                </span>
              </summary>

              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-semibold text-slate-700">
                        {tableHeaders[0]}
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold text-slate-700 text-right">
                        {tableHeaders[1]}
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold text-slate-700 text-right">
                        {tableHeaders[2]}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {items.map((row) => (
                      <tr key={row.label} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-800 font-medium">{row.label}</td>
                        <td className="px-3 py-2 text-slate-700 text-right">{row.count}</td>
                        <td className="px-3 py-2 text-slate-500 text-right">{row.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </>
      )}
    </div>
  );
}
