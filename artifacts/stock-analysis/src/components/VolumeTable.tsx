import React from 'react';
import { useSortableData } from '@/hooks/use-analysis';
import { formatNumber, formatCurrency, formatPercent, cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { VolumeStatRecord } from '@workspace/api-client-react';

export function VolumeTable({ data }: { data: VolumeStatRecord[] }) {
  const { items, requestSort, sortKey, sortDirection } = useSortableData(data, 'totalVolume');

  const SortIcon = ({ column }: { column: keyof VolumeStatRecord }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-20" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 text-primary" />
      : <ArrowDown className="w-4 h-4 ml-1 text-primary" />;
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-white/10 bg-black/20">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-white/5 uppercase tracking-wider text-xs font-display text-muted-foreground">
          <tr>
            {[
              { key: 'symbol', label: 'Symbol' },
              { key: 'totalVolume', label: 'Total Volume' },
              { key: 'avgVolume', label: 'Avg Daily Volume' },
              { key: 'tradingDays', label: 'Trading Days' },
              { key: 'avgDailyReturn', label: 'Avg Return' },
              { key: 'avgPriceRange', label: 'Avg Range' },
            ].map(({ key, label }) => (
              <th 
                key={key}
                onClick={() => requestSort(key as keyof VolumeStatRecord)}
                className="px-6 py-4 cursor-pointer hover:bg-white/10 transition-colors select-none"
              >
                <div className="flex items-center">
                  {label}
                  <SortIcon column={key as keyof VolumeStatRecord} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 font-mono">
          {items.map((row, i) => (
            <tr key={row.symbol} className="hover:bg-white-[0.02] transition-colors">
              <td className="px-6 py-4 font-bold text-primary">{row.symbol}</td>
              <td className="px-6 py-4">{formatNumber(row.totalVolume)}</td>
              <td className="px-6 py-4">{formatNumber(row.avgVolume)}</td>
              <td className="px-6 py-4">{row.tradingDays}</td>
              <td className={cn(
                "px-6 py-4 font-semibold",
                row.avgDailyReturn > 0 ? "text-emerald-400" : row.avgDailyReturn < 0 ? "text-rose-400" : "text-muted-foreground"
              )}>
                {row.avgDailyReturn > 0 ? '+' : ''}{formatCurrency(row.avgDailyReturn, 4)}
              </td>
              <td className="px-6 py-4 text-amber-200/80">{formatCurrency(row.avgPriceRange, 4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
