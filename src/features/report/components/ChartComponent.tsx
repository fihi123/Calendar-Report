import React from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { LotData } from '../types';

const LOT_COLORS = ['#0369a1', '#7c3aed', '#0891b2', '#c2410c', '#4f46e5', '#059669', '#be185d', '#d97706'];
const LOT_STROKES: string[] = ['', '6 3', '2 2', '8 3 2 3'];

// Marker shape renderers per lot index
const markerShapes = [
  // Circle
  (cx: number, cy: number, color: string, failed: boolean) => (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={2} />
      {failed && <circle cx={cx} cy={cy} r={9} fill="none" stroke="#dc2626" strokeWidth={1.5} />}
    </g>
  ),
  // Diamond
  (cx: number, cy: number, color: string, failed: boolean) => (
    <g>
      <rect x={cx - 5} y={cy - 5} width={10} height={10} fill={color} stroke="white" strokeWidth={2} transform={`rotate(45, ${cx}, ${cy})`} />
      {failed && <rect x={cx - 8} y={cy - 8} width={16} height={16} fill="none" stroke="#dc2626" strokeWidth={1.5} transform={`rotate(45, ${cx}, ${cy})`} />}
    </g>
  ),
  // Square
  (cx: number, cy: number, color: string, failed: boolean) => (
    <g>
      <rect x={cx - 5} y={cy - 5} width={10} height={10} fill={color} stroke="white" strokeWidth={2} rx={2} />
      {failed && <rect x={cx - 8} y={cy - 8} width={16} height={16} fill="none" stroke="#dc2626" strokeWidth={1.5} rx={3} />}
    </g>
  ),
  // Triangle
  (cx: number, cy: number, color: string, failed: boolean) => {
    const pts = `${cx},${cy - 7} ${cx - 6},${cy + 4} ${cx + 6},${cy + 4}`;
    const ptsOuter = `${cx},${cy - 10} ${cx - 9},${cy + 6} ${cx + 9},${cy + 6}`;
    return (
      <g>
        <polygon points={pts} fill={color} stroke="white" strokeWidth={2} />
        {failed && <polygon points={ptsOuter} fill="none" stroke="#dc2626" strokeWidth={1.5} />}
      </g>
    );
  },
];

interface Props {
  lots: LotData[];
  t: (key: string) => string;
}

const ChartComponent: React.FC<Props> = ({ lots, t }) => {
  const isSingle = lots.length <= 1;
  const metricNames = Array.from(new Set(lots.flatMap(lot => lot.metrics.map(m => m.name))));

  // Normalize: 0% = min, 100% = max
  const normalize = (value: number, min: number, max: number): number => {
    const range = max - min;
    if (range <= 0) return 0;
    return Math.round(((value - min) / range) * 100 * 10) / 10;
  };

  const chartData = metricNames.map(name => {
    const row: Record<string, any> = { name, specRange: [0, 100] };
    const firstMatch = lots.flatMap(l => l.metrics).find(m => m.name === name);
    if (firstMatch) {
      row.rawMin = firstMatch.min;
      row.rawMax = firstMatch.max;
      row.unit = firstMatch.unit;
    }
    lots.forEach((lot, lotIdx) => {
      const m = lot.metrics.find(met => met.name === name);
      if (m) {
        const lotKey = isSingle ? 'value' : (lot.name || `Lot ${lotIdx + 1}`);
        row[lotKey] = normalize(m.actual, m.min, m.max);
        row[`${lotKey}_raw`] = m.actual;
        row[`${lotKey}_pass`] = (m.min !== 0 || m.max !== 0) && m.actual >= m.min && m.actual <= m.max;
      }
    });
    return row;
  });

  const lotKeys = isSingle
    ? ['value']
    : lots.map((lot, idx) => lot.name || `Lot ${idx + 1}`);

  // Custom dot renderer with unique shape per lot
  const renderDot = (lotIdx: number, color: string) => (props: any) => {
    const { cx, cy, payload, dataKey } = props;
    if (cx == null || cy == null) return null;
    const failed = payload[`${dataKey}_pass`] === false;
    const shapeFn = markerShapes[lotIdx % markerShapes.length];
    return shapeFn(cx, cy, color, failed);
  };

  // Custom label showing raw value near the dot
  const renderLabel = (lotIdx: number) => (props: any) => {
    const { x, y, value, index } = props;
    if (x == null || y == null || value == null) return null;
    const row = chartData[index];
    const lotKey = lotKeys[lotIdx];
    const rawVal = row[`${lotKey}_raw`];
    if (rawVal == null) return null;
    // Offset label vertically based on lot index to avoid overlap
    const yOffset = -12 - (lotIdx * 12);
    return (
      <text x={x} y={y + yOffset} textAnchor="middle" fontSize={9} fontWeight="bold" fill={LOT_COLORS[lotIdx % LOT_COLORS.length]}>
        {rawVal}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    if (!row) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs max-w-[280px]">
        <p className="font-bold text-gray-800 mb-2">{label}</p>
        <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-gray-100">
          <span className="w-2 h-2 rounded-sm bg-blue-100 border border-blue-300"></span>
          <span className="text-gray-500">{t('chart.specRange')}:</span>
          <span className="font-mono font-bold text-gray-700">{row.rawMin} ~ {row.rawMax} {row.unit}</span>
        </div>
        {payload.filter((p: any) => p.dataKey !== 'specRange' && p.value != null).map((p: any, i: number) => {
          const rawVal = row[`${p.dataKey}_raw`];
          const isPass = row[`${p.dataKey}_pass`];
          return (
            <div key={i} className="flex items-center gap-1.5 mb-1 py-0.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.stroke || p.color }}></span>
              <span className="text-gray-600 font-medium">{p.name}:</span>
              <span className="font-mono font-bold" style={{ color: p.stroke || p.color }}>
                {rawVal} {row.unit}
              </span>
              {isPass != null && (
                <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${isPass ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                  {isPass ? 'PASS' : 'FAIL'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Custom legend with marker shapes
  const renderLegend = () => (
    <div className="flex justify-center gap-4 pt-1.5 flex-wrap">
      {lotKeys.map((key, idx) => (
        <div key={key} className="flex items-center gap-1.5 text-[10px] text-gray-600">
          <svg width={12} height={12} viewBox="0 0 12 12">
            {idx % 4 === 0 && <circle cx={6} cy={6} r={4} fill={LOT_COLORS[idx % LOT_COLORS.length]} />}
            {idx % 4 === 1 && <rect x={2} y={2} width={8} height={8} fill={LOT_COLORS[idx % LOT_COLORS.length]} transform="rotate(45, 6, 6)" />}
            {idx % 4 === 2 && <rect x={2} y={2} width={8} height={8} rx={1.5} fill={LOT_COLORS[idx % LOT_COLORS.length]} />}
            {idx % 4 === 3 && <polygon points="6,1 2,10 10,10" fill={LOT_COLORS[idx % LOT_COLORS.length]} />}
          </svg>
          <span className="font-semibold">{isSingle ? t('table.actual') : key}</span>
        </div>
      ))}
    </div>
  );

  if (metricNames.length === 0) return null;

  return (
    <div className="w-full mt-3 mb-2 border border-black p-4 bg-white print-break-inside-avoid">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 bg-brand-700 rounded-full"></span>
          Data Visualization
          {!isSingle && <span className="text-[9px] font-normal text-gray-400 normal-case tracking-normal ml-1">({lots.length} lots)</span>}
        </h3>
        <div className="flex items-center gap-3 text-[9px] text-gray-400">
          <span className="flex items-center gap-1"><span className="inline-block w-5 h-2.5 bg-blue-100 border border-blue-300 rounded-sm"></span> {t('chart.specRange')}</span>
          <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500"></span> {t('chart.outOfSpec')}</span>
        </div>
      </div>

      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              fontSize={10}
              tick={{ fill: '#374151', fontWeight: 600 }}
              axisLine={{ stroke: '#9ca3af' }}
              tickLine={{ stroke: '#d1d5db' }}
              dy={6}
            />
            <YAxis
              fontSize={9}
              tick={{ fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              domain={[-20, 120]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* USL / LSL reference lines */}
            <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="6 3" strokeWidth={1.5}>
              <Label value={t('chart.usl')} position="right" fontSize={9} fill="#d97706" fontWeight="bold" />
            </ReferenceLine>
            <ReferenceLine y={0} stroke="#f59e0b" strokeDasharray="6 3" strokeWidth={1.5}>
              <Label value={t('chart.lsl')} position="right" fontSize={9} fill="#d97706" fontWeight="bold" />
            </ReferenceLine>

            {/* Spec range band */}
            <Area dataKey="specRange" fill="#dbeafe" stroke="none" fillOpacity={0.4} legendType="none" isAnimationActive={false} />

            {/* Lot lines with unique markers and value labels */}
            {lotKeys.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={isSingle ? t('table.actual') : key}
                stroke={LOT_COLORS[idx % LOT_COLORS.length]}
                strokeWidth={2}
                strokeDasharray={LOT_STROKES[idx % LOT_STROKES.length]}
                dot={renderDot(idx, LOT_COLORS[idx % LOT_COLORS.length])}
                activeDot={{ r: 8 }}
                legendType="none"
                label={renderLabel(idx)}
                isAnimationActive={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Custom legend with marker shapes */}
      {renderLegend()}
    </div>
  );
};

export default ChartComponent;
