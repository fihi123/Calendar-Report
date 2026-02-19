import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ProductionMetric } from '../types';

interface Props {
  data: ProductionMetric[];
}

const ChartComponent: React.FC<Props> = ({ data }) => {
  return (
    <div className="w-full h-64 mt-6 border border-gray-300 rounded-lg p-4 bg-white print-break-inside-avoid shadow-sm">
      <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-brand-700 rounded-full"></span>
        Data Visualization
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="name" fontSize={10} tick={{fill: '#64748b'}} axisLine={{stroke: '#cbd5e1'}} tickLine={false} dy={10} />
          <YAxis fontSize={10} tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ fontSize: '12px', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '8px 12px' }} cursor={{fill: '#f8fafc'}} />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
          <Bar dataKey="actual" name="Actual" fill="#0369a1" radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Bar dataKey="min" name="Min Spec" fill="#cbd5e1" radius={[2, 2, 0, 0]} maxBarSize={15} />
          <Bar dataKey="max" name="Max Spec" fill="#94a3b8" radius={[2, 2, 0, 0]} maxBarSize={15} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChartComponent;