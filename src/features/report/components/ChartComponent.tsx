import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { ProductionMetric } from '../types';

interface Props {
  data: ProductionMetric[];
}

const ChartComponent: React.FC<Props> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'normalized' | 'raw'>('normalized');

  const normalizedData = data.map(m => {
    const range = m.max - m.min;
    const compliance = range > 0 ? ((m.actual - m.min) / range) * 100 : 0;
    const isPass = (m.min !== 0 || m.max !== 0) && m.actual >= m.min && m.actual <= m.max;
    return {
      name: m.name,
      compliance: Math.round(compliance * 10) / 10,
      isPass,
      actual: m.actual,
      min: m.min,
      max: m.max,
      unit: m.unit,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;

    if (viewMode === 'normalized') {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
          <p className="font-bold text-gray-800 mb-1">{label}</p>
          <p className="text-gray-600">실측: <span className="font-mono font-bold text-brand-700">{item.actual}</span> {item.unit}</p>
          <p className="text-gray-500">규격: {item.min} ~ {item.max} {item.unit}</p>
          <p className={`font-bold mt-1 ${item.isPass ? 'text-green-600' : 'text-red-600'}`}>
            달성률: {item.compliance}%
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
        <p className="font-bold text-gray-800 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: <span className="font-mono font-bold">{p.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full mt-6 border border-gray-300 rounded-lg p-4 bg-white print-break-inside-avoid shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 bg-brand-700 rounded-full"></span>
          Data Visualization
        </h3>
        <div className="flex bg-gray-100 rounded-md p-0.5 print:hidden">
          <button
            onClick={() => setViewMode('normalized')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all ${
              viewMode === 'normalized'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            달성률 (%)
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all ${
              viewMode === 'raw'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            원본 값
          </button>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'normalized' ? (
            <BarChart data={normalizedData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" fontSize={10} tick={{fill: '#64748b'}} axisLine={{stroke: '#cbd5e1'}} tickLine={false} dy={10} />
              <YAxis fontSize={10} tick={{fill: '#64748b'}} axisLine={false} tickLine={false} domain={[0, 'auto']} unit="%" />
              <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
              <ReferenceLine y={100} stroke="#16a34a" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Max', position: 'right', fontSize: 9, fill: '#16a34a' }} />
              <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Min', position: 'right', fontSize: 9, fill: '#dc2626' }} />
              <Bar dataKey="compliance" name="달성률" radius={[4, 4, 0, 0]} maxBarSize={50}>
                {normalizedData.map((entry, index) => (
                  <Cell key={index} fill={entry.isPass ? '#0369a1' : '#dc2626'} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" fontSize={10} tick={{fill: '#64748b'}} axisLine={{stroke: '#cbd5e1'}} tickLine={false} dy={10} />
              <YAxis fontSize={10} tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
              <Bar dataKey="actual" name="Actual" fill="#0369a1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="min" name="Min Spec" fill="#cbd5e1" radius={[2, 2, 0, 0]} maxBarSize={15} />
              <Bar dataKey="max" name="Max Spec" fill="#94a3b8" radius={[2, 2, 0, 0]} maxBarSize={15} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartComponent;
