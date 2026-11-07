'use client';

import React from 'react';

interface BarItem {
  label: string;
  count: number;
  percentage: number;
  sublabel?: string;
  secondaryCount?: number;
}

interface SimpleBarChartProps {
  title: string;
  description?: string;
  items: BarItem[];
  tableHeaders: [string, string, string]; // [Label col, Count col, Pct col]
  emptyMessage?: string;
}

export function SimpleBarChart({
  title,
  description,
  items,
  tableHeaders,
  emptyMessage = 'No data available for this timeframe.',
}: SimpleBarChartProps) {
  const maxCount = Math.max(...items.map((i) => i.count), 1);
  const displayItems = items.slice(0, 6);

  // SVG Chart Dimensions
  const rowHeight = 36;
  const labelWidth = 140;
  const barMaxWidth = 260;
  const chartWidth = 480;
  const chartHeight = Math.max(displayItems.length * rowHeight + 10, 80);

  return (
    <div className="bg-[#fffdf8] p-5 border border-[#ddd5c4] rounded-none space-y-4">
      <div className="border-b border-[#ddd5c4] pb-2">
        <h3 className="font-serif text-lg font-medium text-[#1f1c18]">{title}</h3>
        {description && <p className="text-xs text-[#5e574c] mt-0.5">{description}</p>}
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#5e574c] italic bg-[#f5f1e8] border border-[#ddd5c4]">
          {emptyMessage}
        </div>
      ) : (
        <>
          {/* Inline SVG Chart with ink bars and hatch pattern */}
          <div className="overflow-x-auto py-1" role="region" aria-label={`${title} chart`}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full max-w-[480px] h-auto font-sans"
              aria-hidden="true"
            >
              <defs>
                {/* Diagonal hatch pattern for secondary series */}
                <pattern
                  id="hatch-pattern"
                  patternUnits="userSpaceOnUse"
                  width="6"
                  height="6"
                >
                  <path
                    d="M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2"
                    stroke="#5e574c"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>

              {displayItems.map((item, idx) => {
                const y = idx * rowHeight + 8;
                const barWidth = Math.max(Math.round((item.count / maxCount) * barMaxWidth), 6);

                return (
                  <g key={item.label} className="chart-row">
                    {/* Direct Text Label */}
                    <text
                      x="0"
                      y={y + 14}
                      fill="#1f1c18"
                      fontSize="12"
                      fontFamily="var(--font-plex-sans), sans-serif"
                      className="select-none"
                    >
                      {item.label.length > 18 ? `${item.label.slice(0, 18)}...` : item.label}
                    </text>

                    {/* Background track rule */}
                    <rect
                      x={labelWidth}
                      y={y + 2}
                      width={barMaxWidth}
                      height="16"
                      fill="#f5f1e8"
                      stroke="#ddd5c4"
                      strokeWidth="1"
                    />

                    {/* Secondary Series Hatch Pattern (if secondary count present) */}
                    {item.secondaryCount && item.secondaryCount > 0 ? (
                      <rect
                        x={labelWidth}
                        y={y + 2}
                        width={Math.min(
                          Math.round((item.secondaryCount / maxCount) * barMaxWidth),
                          barMaxWidth
                        )}
                        height="16"
                        fill="url(#hatch-pattern)"
                      />
                    ) : null}

                    {/* Primary Ink Bar */}
                    <rect
                      x={labelWidth}
                      y={y + 2}
                      width={barWidth}
                      height="16"
                      fill="#1f1c18"
                    />

                    {/* Direct Value Label */}
                    <text
                      x={labelWidth + barWidth + 8}
                      y={y + 14}
                      fill="#1f1c18"
                      fontSize="11"
                      fontFamily="var(--font-plex-mono), monospace"
                      className="select-none font-medium"
                    >
                      {item.count} ({item.percentage}%)
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Accessible Ledger Data Table Directly Underneath */}
          <div className="pt-3 border-t border-[#ddd5c4]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-[#ddd5c4] font-mono text-[10px] uppercase tracking-[0.04em] text-[#5e574c]">
                <tr>
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    {tableHeaders[0]}
                  </th>
                  <th scope="col" className="py-1.5 px-3 font-medium text-right font-mono">
                    {tableHeaders[1]}
                  </th>
                  <th scope="col" className="py-1.5 pl-3 font-medium text-right font-mono">
                    {tableHeaders[2]}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ddd5c4]">
                {items.map((item) => (
                  <tr key={item.label} className="hover:bg-[#f5f1e8]">
                    <td className="py-1.5 pr-3 text-[#1f1c18]">{item.label}</td>
                    <td className="py-1.5 px-3 text-right font-mono text-[#1f1c18]">
                      {item.count}
                    </td>
                    <td className="py-1.5 pl-3 text-right font-mono text-[#5e574c]">
                      {item.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
