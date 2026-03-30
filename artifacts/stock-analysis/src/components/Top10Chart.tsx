import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { formatNumber } from '@/lib/utils';
import type { Top10Record } from '@workspace/api-client-react';

export function Top10Chart({ data }: { data: Top10Record[] }) {
  // Sort data 1-10
  const sortedData = [...data].sort((a, b) => a.rank - b.rank);

  return (
    <div className="w-full">
      <div className="h-[400px] w-full mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis 
              dataKey="symbol" 
              stroke="rgba(255,255,255,0.5)" 
              tick={{ fill: 'rgba(255,255,255,0.7)', fontFamily: 'Fira Code', fontSize: 12 }} 
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.5)" 
              tick={{ fill: 'rgba(255,255,255,0.7)', fontFamily: 'Fira Code', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                borderColor: 'rgba(6, 182, 212, 0.3)',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                fontFamily: 'Fira Code'
              }}
              formatter={(value: number) => [formatNumber(value), 'Avg Volume']}
            />
            <Bar dataKey="avgVolume" radius={[4, 4, 0, 0]}>
              {sortedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`hsl(190, 90%, ${45 + (index * 2)}%)`} 
                  fillOpacity={1 - (index * 0.05)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-white/10 bg-black/20">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-white/5 uppercase tracking-wider text-xs font-display text-muted-foreground">
            <tr>
              <th className="px-6 py-4">Rank</th>
              <th className="px-6 py-4">Symbol</th>
              <th className="px-6 py-4">Avg Volume</th>
              <th className="px-6 py-4">Total Volume</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {sortedData.map((row) => (
              <tr key={row.symbol} className="hover:bg-white-[0.02] transition-colors">
                <td className="px-6 py-4">
                  <span className="bg-white/10 text-white px-2 py-1 rounded-md text-xs">#{row.rank}</span>
                </td>
                <td className="px-6 py-4 font-bold text-primary">{row.symbol}</td>
                <td className="px-6 py-4">{formatNumber(row.avgVolume)}</td>
                <td className="px-6 py-4 text-muted-foreground">{formatNumber(row.totalVolume)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
