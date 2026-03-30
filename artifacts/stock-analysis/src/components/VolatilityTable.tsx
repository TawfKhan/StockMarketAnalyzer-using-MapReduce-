import React from 'react';
import { useSortableData } from '@/hooks/use-analysis';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { VolatilityRecord } from '@workspace/api-client-react';

export function VolatilityTable({ data }: { data: VolatilityRecord[] }) {
  const { items, requestSort, sortKey, sortDirection } = useSortableData(data, 'avgPriceRange');

  const maxRange = Math.max(...data.map(d => d.avgPriceRange));

  const SortIcon = ({ column }: { column: keyof VolatilityRecord }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-20" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 text-primary" />
      : <ArrowDown className="w-4 h-4 ml-1 text-primary" />;
  };

  const getVolatilityColor = (val: number) => {
    const ratio = val / maxRange;
    if (ratio > 0.7) return "text-rose-400";
    if (ratio > 0.4) return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-white/10 bg-black/20">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-white/5 uppercase tracking-wider text-xs font-display text-muted-foreground">
          <tr>
            {[
              { key: 'symbol', label: 'Symbol' },
              { key: 'avgPriceRange', label: 'Avg Price Range (Volatility)' },
              { key: 'avgDailyReturn', label: 'Avg Daily Return' },
              { key: 'tradingDays', label: 'Trading Days' },
            ].map(({ key, label }) => (
              <th 
                key={key}
                onClick={() => requestSort(key as keyof VolatilityRecord)}
                className="px-6 py-4 cursor-pointer hover:bg-white/10 transition-colors select-none"
              >
                <div className="flex items-center">
                  {label}
                  <SortIcon column={key as keyof VolatilityRecord} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 font-mono">
          {items.map((row) => (
            <tr key={row.symbol} className="hover:bg-white-[0.02] transition-colors">
              <td className="px-6 py-4 font-bold text-primary">{row.symbol}</td>
              <td className={cn("px-6 py-4 font-bold", getVolatilityColor(row.avgPriceRange))}>
                {formatCurrency(row.avgPriceRange, 4)}
                <div className="w-32 h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full", 
                      row.avgPriceRange / maxRange > 0.7 ? "bg-rose-500" : 
                      row.avgPriceRange / maxRange > 0.4 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${(row.avgPriceRange / maxRange) * 100}%` }}
                  />
                </div>
              </td>
              <td className={cn(
                "px-6 py-4 font-semibold",
                row.avgDailyReturn > 0 ? "text-emerald-400" : row.avgDailyReturn < 0 ? "text-rose-400" : "text-muted-foreground"
              )}>
                {row.avgDailyReturn > 0 ? '+' : ''}{formatCurrency(row.avgDailyReturn, 4)}
              </td>
              <td className="px-6 py-4">{row.tradingDays}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
