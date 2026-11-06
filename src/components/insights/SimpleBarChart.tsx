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
  barColorClass = 'bg-gradient-to-r from-indigo-500 to-violet-600',
  emptyMessage = 'No data available for this timeframe.',
}: SimpleBarChartProps) {
  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="bg-[#11111a] p-5 rounded-xl border border-white/[0.08] space-y-4">
      <div>
        <h3 className="text-sm font-medium text-[#ececf6]">{title}</h3>
        {description && <p className="text-xs text-[#a3a3bb] mt-0.5">{description}</p>}
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#7b7b94] italic bg-[#171724] rounded-lg border border-dashed border-white/[0.06]">
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
                    <span className="text-[#ececf6] truncate max-w-[220px]" title={item.label}>
                      {item.label}
                    </span>
                    <span className="font-mono text-[#ececf6] ml-2">
                      {item.count}{' '}
                      <span className="text-[#7b7b94] text-[11px]">
                        ({item.percentage}%)
                      </span>
                    </span>
                  </div>
                  {/* Accessible graphical bar */}
                  <div
                    className="w-full bg-[#171724] rounded-full h-2.5 overflow-hidden"
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
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <details className="group">
              <summary className="text-xs text-[#a3a3bb] hover:text-[#ececf6] cursor-pointer list-none flex items-center justify-between py-1 select-none">
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#7b7b94] group-open:rotate-90 transition-transform">
                    ▶
                  </span>
                  <span>View accessible data table</span>
                </span>
                <span className="text-[11px] font-mono text-[#7b7b94]">
                  {items.length} {items.length === 1 ? 'row' : 'rows'}
                </span>
              </summary>

              <div className="mt-3 overflow-x-auto rounded-lg border border-white/[0.06] bg-[#171724]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#11111a] text-[#7b7b94] font-mono uppercase text-[10px] border-b border-white/[0.06]">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">
                        {tableHeaders[0]}
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium text-right">
                        {tableHeaders[1]}
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium text-right">
                        {tableHeaders[2]}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-[#ececf6]">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="px-3 py-2">{item.label}</td>
                        <td className="px-3 py-2 text-right font-mono">{item.count}</td>
                        <td className="px-3 py-2 text-right font-mono">{item.percentage}%</td>
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
