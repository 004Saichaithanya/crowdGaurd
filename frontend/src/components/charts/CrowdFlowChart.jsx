import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function CrowdFlowChart({ data }) {
  // Use provided history data, or mock if empty
  const chartData = data && data.length > 5 ? data : [
    { time: '08:00', count: 42 },
    { time: '10:00', count: 55 },
    { time: '12:00', count: 85 }, // peak
    { time: '14:00', count: 48 },
    { time: '16:00', count: 30 },
  ];

  return (
    <div className="glass-card p-6 h-full flex flex-col border ghost-border group">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xs font-bold tracking-[0.15em] text-on-surface-variant uppercase">Crowd Flow Velocity</h3>
        <button className="text-on-surface-variant hover:text-white pb-2 flex space-x-0.5">
           <div className="w-1 h-1 rounded-full bg-current"></div>
           <div className="w-1 h-1 rounded-full bg-current"></div>
           <div className="w-1 h-1 rounded-full bg-current"></div>
        </button>
      </div>
      
      <div className="flex-1 w-full min-h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barSize={12}>
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#a3aac4' }} 
              dy={10}
            />
            <Tooltip 
              cursor={{fill: 'rgba(255,255,255,0.05)'}} 
              contentStyle={{ backgroundColor: '#192540', border: '1px solid rgba(64, 72, 93, 0.15)', borderRadius: '8px' }}
              itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
              labelStyle={{ color: '#a3aac4', fontSize: '10px', marginBottom: '4px' }}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {
                chartData.map((entry, index) => {
                   // Highlight highest value
                   const max = Math.max(...chartData.map(d => d.count));
                   const isMax = entry.count === max;
                   return <Cell key={`cell-${index}`} fill={isMax ? '#ff716c' : '#2aa7ff'} fillOpacity={isMax ? 1 : 0.4} />
                })
              }
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
