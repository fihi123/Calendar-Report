import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { LotData, ProductionMetric } from '../types';

const LOT_COLORS = ['#0369a1', '#7c3aed', '#0891b2', '#c2410c', '#4f46e5', '#059669', '#be185d', '#d97706'];

interface Props {
  lots: LotData[];
  t: (key: string) => string;
}

const ChartComponent: React.FC<Props> = ({ lots, t }) => {
  const [viewMode, setViewMode] = useState<'normalized' | 'raw'>('normalized');
  const isSingle = lots.length <= 1;

  // Collect all unique metric names across lots
  const metricNames = Array.from(new Set(lots.flatMap(lot => lot.metrics.map(m => m.name))));

  // Build chart data: one row per metric, columns per lot
  const buildNormalizedData = () =>
    metricNames.map(name => {
      const row: Record<string, any> = { name };
      lots.forEach((lot, lotIdx) => {
        const m = lot.metrics.find(met => met.name === name);
        if (m) {
          const range = m.max - m.min;
          const compliance = range > 0 ? Math.round(((m.actual - m.min) / range) * 100 * 10) / 10 : 0;
          const isPass = (m.min !== 0 || m.max !== 0) && m.actual >= m.min && m.actual <= m.max;
          const lotKey = isSingle ? 'compliance' : (lot.name || `Lot ${lotIdx + 1}`);
          row[lotKey] = compliance;
          row[`${lotKey}_pass`] = isPass;
          row[`${lotKey}_actual`] = m.actual;
          row[`${lotKey}_min`] = m.min;
          row[`${lotKey}_max`] = m.max;
          row[`${lotKey}_unit`] = m.unit;
        }
      });
      return row;
    });

  const buildRawData = () =>
    metricNames.map(name => {
      const row: Record<string, any> = { name };
      lots.forEach((lot, lotIdx) => {
        const m = lot.metrics.find(met => met.name === name);
        if (m) {
          const lotKey = isSingle ? 'actual' : (lot.name || `Lot ${lotIdx + 1}`);
          row[lotKey] = m.actual;
          // Store spec for tooltip
          row[`${lotKey}_min`] = m.min;
          row[`${lotKey}_max`] = m.max;
          row[`${lotKey}_unit`] = m.unit;
        }
      });
      // For single lot, also add spec bars
      if (isSingle && lots[0]) {
        const m = lots[0].metrics.find(met => met.name === name);
        if (m) { row.min = m.min; row.max = m.max; }
      }
      return row;
    });

  const normalizedData = buildNormalizedData();
  const rawData = buildRawData();

  const lotKeys = isSingle
    ? (viewMode === 'normalized' ? ['compliance'] : ['actual'])
    : lots.map((lot, idx) => lot.name || `Lot ${idx + 1}`);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    if (!row) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs max-w-[240px]">
        <p className="font-bold text-gray-800 mb-1.5">{label}</p>
        {payload.filter((p: any) => p.value != null).map((p: any, i: number) => {
          const key = p.dataKey;
          const unit = row[`${key}_unit`] || '';
          const min = row[`${key}_min`];
          const max = row[`${key}_max`];
          const actual = row[`${key}_actual`];
          const isPass = row[`${key}_pass`];

          return (
            <div key={i} className="mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill || p.color }}></span>
                <span className="text-gray-600">{p.name}:</span>
                <span className="font-mono font-bold" style={{ color: p.fill || p.color }}>
                  {p.value}{viewMode === 'normalized' ? '%' : ` ${unit}`}
                </span>
              </div>
              {viewMode === 'normalized' && actual != null && (
                <div className="pl-3.5 text-gray-400">
                  {t('table.actual')}: {actual} {unit} ({min}~{max})
                  {isPass != null && (
                    <span className={`ml-1 font-bold ${isPass ? 'text-green-600' : 'text-red-600'}`}>
                      {isPass ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              )}
              {viewMode === 'raw' && min != null && (
                <div className="pl-3.5 text-gray-400">{t('table.spec')}: {min}~{max} {unit}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (metricNames.length === 0) return null;

  return (
    <div className="w-full mt-6 border border-gray-300 rounded-lg p-4 bg-white print-break-inside-avoid shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 bg-brand-700 rounded-full"></span>
          Data Visualization
          {!isSingle && <span className="text-[9px] font-normal text-gray-400 normal-case tracking-normal ml-1">({lots.length} lots)</span>}
        </h3>
        <div className="flex bg-gray-100 rounded-md p-0.5 print:hidden">
          <button
            onClick={() => setViewMode('normalized')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all ${
              viewMode === 'normalized' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t('chart.compliance')}
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all ${
              viewMode === 'raw' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t('chart.rawValue')}
          </button>
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'normalized' ? (
            <BarChart data={normalizedData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }} barGap={2} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" fontSize={10} tick={{ fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} dy={10} />
              <YAxis fontSize={10} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} domain={[0, 'auto']} unit="%" />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              {!isSingle && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />}
              <ReferenceLine y={100} stroke="#16a34a" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Max', position: 'right', fontSize: 9, fill: '#16a34a' }} />
              <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Min', position: 'right', fontSize: 9, fill: '#dc2626' }} />
              {lotKeys.map((key, idx) => (
                <Bar key={key} dataKey={key} name={isSingle ? t('chart.compliance') : key} fill={LOT_COLORS[idx % LOT_COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={isSingle ? 50 : 35} />
              ))}
            </BarChart>
          ) : (
            <BarChart data={rawData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }} barGap={2} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" fontSize={10} tick={{ fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} dy={10} />
              <YAxis fontSize={10} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
              {lotKeys.map((key, idx) => (
                <Bar key={key} dataKey={key} name={isSingle ? 'Actual' : key} fill={LOT_COLORS[idx % LOT_COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={isSingle ? 40 : 30} />
              ))}
              {isSingle && (
                <>
                  <Bar dataKey="min" name="Min Spec" fill="#cbd5e1" radius={[2, 2, 0, 0]} maxBarSize={15} />
                  <Bar dataKey="max" name="Max Spec" fill="#94a3b8" radius={[2, 2, 0, 0]} maxBarSize={15} />
                </>
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartComponent;
