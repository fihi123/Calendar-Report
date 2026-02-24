import React from 'react';
import { ReportData, ProductionMetric, LotData, isMultiLot, getYieldMode } from '../types';
import ChartComponent from './ChartComponent';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

interface Props {
  data: ReportData;
}

const calculateYield = (lot: LotData, reportType: ReportData['reportType']) => {
  let yieldRate = '0.0';
  let lossKg = '0.00';
  let lossRate = '0.00';
  const yieldMode = getYieldMode(reportType);

  if (yieldMode === 'packaging') {
    const theo = lot.yield.theoretical_qty || 0;
    const actual = lot.yield.actual_qty || 0;
    const bulk = lot.yield.used_bulk || 0;
    const unitWeight = lot.yield.unit_weight || 0;
    if (theo > 0) yieldRate = ((actual / theo) * 100).toFixed(1);
    if (bulk > 0 && unitWeight > 0) {
      const usedWeightKg = (actual * unitWeight) / 1000;
      const lossVal = bulk - usedWeightKg;
      lossKg = lossVal.toFixed(2);
      lossRate = ((lossVal / bulk) * 100).toFixed(2);
    }
  } else {
    const planned = lot.yield.planned || 0;
    const obtained = lot.yield.obtained || 0;
    const samples = lot.yield.samples || 0;
    if (planned > 0) yieldRate = (((obtained + samples) / planned) * 100).toFixed(1);
  }

  return { yieldRate, lossKg, lossRate };
};

const calculateAggregate = (lots: LotData[], reportType: ReportData['reportType']) => {
  const yieldMode = getYieldMode(reportType);
  if (yieldMode === 'packaging') {
    const totalTheo = lots.reduce((sum, lot) => sum + (lot.yield.theoretical_qty || 0), 0);
    const totalActual = lots.reduce((sum, lot) => sum + (lot.yield.actual_qty || 0), 0);
    return totalTheo > 0 ? ((totalActual / totalTheo) * 100).toFixed(1) : '0.0';
  } else {
    const totalPlanned = lots.reduce((sum, lot) => sum + (lot.yield.planned || 0), 0);
    const totalOutput = lots.reduce((sum, lot) => sum + (lot.yield.obtained || 0) + (lot.yield.samples || 0), 0);
    return totalPlanned > 0 ? ((totalOutput / totalPlanned) * 100).toFixed(1) : '0.0';
  }
};

const LotSection: React.FC<{ lot: LotData; reportType: ReportData['reportType'] }> = ({ lot, reportType }) => {
  const { yieldRate, lossKg, lossRate } = calculateYield(lot, reportType);
  const yieldMode = getYieldMode(reportType);

  const groupedMetrics: Record<string, ProductionMetric[]> = {};
  const ungroupedMetrics: ProductionMetric[] = [];
  lot.metrics.forEach(metric => {
    const match = metric.name.match(/^\[(.*?)]\s*(.*)/) || metric.name.match(/^(.*?)\s*-\s*(.*)/);
    if (match) {
      const groupName = match[1].trim();
      const itemName = match[2].trim();
      if (!groupedMetrics[groupName]) groupedMetrics[groupName] = [];
      groupedMetrics[groupName].push({ ...metric, name: itemName });
    } else {
      ungroupedMetrics.push(metric);
    }
  });
  const hasGroups = Object.keys(groupedMetrics).length > 0;

  return (
    <>
      <table className="report-table mb-4 table-fixed">
        <thead>
          <tr>
            <th className="w-[20%]">항목</th>
            <th className="w-[20%]">규격 (Spec)</th>
            <th className="w-[15%]">실측 (Actual)</th>
            <th className="w-[35%]">분포도 (Distribution)</th>
            <th className="w-[10%]">판정</th>
          </tr>
        </thead>
        <tbody>
          {lot.metrics.length === 0 ? (
            <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">등록된 데이터가 없습니다.</td></tr>
          ) : (
            <>
              {Object.entries(groupedMetrics).map(([groupName, metrics]) => (
                <React.Fragment key={groupName}>
                  <tr className="bg-gray-100">
                    <td colSpan={5} className="font-bold text-[11px] px-3 py-2 border border-black text-gray-800">■ {groupName}</td>
                  </tr>
                  {metrics.map((metric, idx) => <MetricRow key={`${groupName}-${idx}`} metric={metric} />)}
                </React.Fragment>
              ))}
              {ungroupedMetrics.length > 0 && (
                <>
                  {hasGroups && (
                    <tr className="bg-gray-100">
                      <td colSpan={5} className="font-bold text-[11px] px-3 py-2 border border-black text-gray-800">■ 공통 / 기타</td>
                    </tr>
                  )}
                  {ungroupedMetrics.map((metric, idx) => <MetricRow key={`common-${idx}`} metric={metric} />)}
                </>
              )}
            </>
          )}
        </tbody>
      </table>

      {lot.metrics.length > 0 && <ChartComponent data={lot.metrics.map(m => ({ ...m, target: (m.min + m.max) / 2 }))} />}

      <div className="border border-black p-5 mb-4 mt-6 bg-gray-50 shadow-sm print-break-inside-avoid">
        {yieldMode === 'packaging' ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2 text-center">
              <div className="flex-1">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">사용된 벌크</div>
                <div className="text-base font-mono font-bold">{(lot.yield.used_bulk || 0).toLocaleString()} <span className="text-[10px] font-normal text-gray-500">kg</span></div>
              </div>
              <div className="text-gray-300 text-sm">x</div>
              <div className="flex-1">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">개당 충진량</div>
                <div className="text-base font-mono font-bold">{(lot.yield.unit_weight || 0).toLocaleString()} <span className="text-[10px] font-normal text-gray-500">g</span></div>
              </div>
              <div className="text-gray-300 text-sm">=</div>
              <div className="flex-1 bg-indigo-50/50 py-1 rounded">
                <div className="text-[10px] text-indigo-500 uppercase font-bold tracking-wider mb-1">이론 수량</div>
                <div className="text-lg font-mono font-bold text-indigo-700">{(lot.yield.theoretical_qty || 0).toLocaleString()} <span className="text-[10px] font-normal text-indigo-400">ea</span></div>
              </div>
              <div className="h-10 w-px bg-gray-300 mx-2"></div>
              <div className="flex-1">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">실제 수량</div>
                <div className="text-lg font-mono font-bold">{(lot.yield.actual_qty || 0).toLocaleString()} <span className="text-[10px] font-normal text-gray-500">ea</span></div>
              </div>
              <div className="h-10 w-px bg-gray-300 mx-2"></div>
              <div className="flex-1">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">최종 수율</div>
                <div className="text-xl font-bold text-blue-900">{yieldRate}%</div>
              </div>
            </div>
            <div className="border-t border-dashed border-gray-300 pt-3 flex items-center justify-center gap-6">
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded">Loss Analysis</span>
              <div className="text-xs text-gray-600"><span className="font-semibold text-gray-400">손실 중량:</span> <span className="font-mono text-red-700 font-bold ml-1">{lossKg} kg</span></div>
              <div className="h-3 w-px bg-gray-300"></div>
              <div className="text-xs text-gray-600"><span className="font-semibold text-gray-400">손실률:</span> <span className="font-mono text-red-700 font-bold ml-1">{lossRate}%</span></div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2">
            <div className="text-center flex-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">지시량 (Planned)</div>
              <div className="text-lg font-mono font-bold">{(lot.yield.planned || 0).toLocaleString()} <span className="text-xs font-normal text-gray-500">{lot.yield.unit}</span></div>
            </div>
            <div className="text-gray-300 text-2xl font-light">/</div>
            <div className="flex-[2] flex flex-col items-center bg-gray-50 rounded-lg py-1 px-4 mx-2 border border-gray-100">
              <div className="flex items-end gap-2 mb-1">
                <div className="text-center">
                  <span className="text-lg font-mono font-bold text-gray-800">{(lot.yield.obtained || 0).toLocaleString()}</span>
                  <span className="text-[9px] text-gray-500 block uppercase">Net Output</span>
                </div>
                <div className="text-gray-400 pb-2">+</div>
                <div className="text-center">
                  <span className="text-lg font-mono font-bold text-indigo-600">{(lot.yield.samples || 0).toLocaleString()}</span>
                  <span className="text-[9px] text-indigo-400 block uppercase">Samples</span>
                </div>
              </div>
              <div className="border-t border-gray-300 w-full"></div>
              <div className="text-[10px] font-bold text-gray-600 mt-1 uppercase tracking-wider">
                총 생산량: <span className="font-mono text-sm">{((lot.yield.obtained || 0) + (lot.yield.samples || 0)).toLocaleString()}</span> <span className="text-[9px] font-normal">{lot.yield.unit}</span>
              </div>
            </div>
            <div className="h-10 w-px bg-gray-300 mx-2"></div>
            <div className="text-center flex-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">수율 (Yield)</div>
              <div className="text-xl font-bold text-blue-900">{yieldRate}%</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const ReportPreview: React.FC<Props> = ({ data }) => {
  const currentDate = new Date(data.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  const getInfoValue = (labelPart: string) => {
    return data.info.find(i => i.label.includes(labelPart))?.value || '';
  }
  const displayDept = getInfoValue('부서') || '품질팀';

  const getDecisionBadge = (decision: string = '') => {
    if (decision.includes('부적합')) {
      return (
        <div className="flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1 rounded-full border border-red-200">
           <XCircle size={14} className="fill-red-700 text-white" />
           <span className="text-[11px] font-bold uppercase tracking-wider">{decision}</span>
        </div>
      );
    } else if (decision.includes('조건부')) {
      return (
        <div className="flex items-center gap-1.5 bg-orange-100 text-orange-700 px-3 py-1 rounded-full border border-orange-200">
           <AlertTriangle size={14} className="fill-orange-700 text-white" />
           <span className="text-[11px] font-bold uppercase tracking-wider">{decision}</span>
        </div>
      );
    } else if (decision.includes('보류')) {
       return (
        <div className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1 rounded-full border border-gray-200">
           <Clock size={14} className="text-gray-600" />
           <span className="text-[11px] font-bold uppercase tracking-wider">{decision}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200">
           <CheckCircle size={14} className="fill-green-700 text-white" />
           <span className="text-[11px] font-bold uppercase tracking-wider">{decision || '적합'}</span>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col gap-8 print:gap-0 text-gray-900">
      {/* COVER PAGE */}
      <div className="a4-screen cover-page flex flex-col justify-between border-t-8 border-brand-900 selection:bg-yellow-200">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full text-center space-y-8">
             <h1 className="text-5xl font-extrabold font-serif leading-tight text-gray-900 break-keep px-10 mt-10">
               {data.title || '품질 / 생산 보고서'}
             </h1>
             <div className="text-sm text-gray-500 mt-2">
               {data.reportType === 'single-manufacturing' && '단일 제조 보고서'}
               {data.reportType === 'single-filling' && '단일 충진포장 보고서'}
               {data.reportType === 'multi-manufacturing' && '다중호수 제조 보고서'}
               {data.reportType === 'multi-filling' && '다중호수 충진포장 보고서'}
             </div>
             <div className="h-1 w-24 bg-brand-600 mx-auto mt-8 mb-12"></div>
             <div className="w-full max-w-md mx-auto bg-gray-50 border-y border-gray-200 py-6 px-8">
                <table className="w-full text-left">
                  <tbody>
                    {data.info.map(item => (
                      <tr key={item.id}>
                        <th className="py-3 text-sm font-bold text-gray-500 w-28 align-top">{item.label}</th>
                        <td className="py-3 text-lg font-medium">{item.value}</td>
                      </tr>
                    ))}
                    <tr>
                      <th className="py-3 text-sm font-bold text-gray-500 w-28 align-top">작성일</th>
                      <td className="py-3 text-lg font-medium">{currentDate}</td>
                    </tr>
                  </tbody>
                </table>
             </div>
          </div>
        </div>

        <div className="mb-10">
          <div className="text-center mb-4">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Approval Signatures</h3>
          </div>
          <table className="w-full border-collapse border border-black">
            <thead>
              <tr>
                 <th className="border border-black bg-gray-100 py-3 text-center w-1/3 text-sm">담 당 (Drafter)</th>
                 <th className="border border-black bg-gray-100 py-3 text-center w-1/3 text-sm">검 토 (Reviewer)</th>
                 <th className="border border-black bg-gray-100 py-3 text-center w-1/3 text-sm">승 인 (Approver)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {(['drafter', 'reviewer', 'approver'] as const).map(role => (
                  <td key={role} className="border border-black bg-gray-50 text-center align-middle py-1 text-[10px] text-gray-500 font-medium">
                    {data.approvals[role].department}
                  </td>
                ))}
              </tr>
              <tr>
                {(['drafter', 'reviewer', 'approver'] as const).map(role => (
                  <td key={role} className="border border-black bg-gray-50 text-center align-middle py-1 text-[10px] text-gray-500">
                    {data.approvals[role].position}
                  </td>
                ))}
              </tr>
              <tr className="h-16">
                {(['drafter', 'reviewer', 'approver'] as const).map(role => {
                  const entry = data.approvals[role];
                  return (
                    <td key={role} className="border border-black text-center align-middle relative px-2">
                      {(entry.name || entry.signature) && (
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-serif text-lg text-gray-800">{entry.name}</span>
                          {entry.signature && (
                            <img src={entry.signature} alt="서명" className="h-10 object-contain" />
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                {(['drafter', 'reviewer', 'approver'] as const).map(role => (
                  <td key={role} className="border border-black bg-gray-50 text-center align-middle py-1 text-[10px] text-gray-500">
                    {data.approvals[role].date || ''}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL PAGE */}
      <div className="a4-screen relative selection:bg-yellow-200">
        <table className="detail-table w-full">
          <thead>
            <tr>
              <td>
                <div className="flex justify-between items-end border-b-2 border-gray-800 pb-3 mb-8">
                  <div>
                    <h2 className="text-xl font-bold font-serif text-gray-900">{data.title} - 상세 보고서</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Detailed Inspection Report</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-gray-600">{displayDept}</div>
                    <div className="text-[10px] text-gray-400">{currentDate}</div>
                  </div>
                </div>
              </td>
            </tr>
          </thead>
          <tfoot>
            <tr>
              <td>
                <div className="pt-4 border-t-2 border-gray-200 text-center mt-8">
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest">Confidential Document | Unauthorized reproduction prohibited</p>
                </div>
              </td>
            </tr>
          </tfoot>
          <tbody>
            <tr>
              <td>
                <section className="mb-10 print-break-inside-avoid">
                  <h2 className="text-[13px] font-bold border-l-4 border-gray-800 pl-3 mb-4 uppercase tracking-tight">1. 개요 (Overview)</h2>
                  <table className="report-table">
                    <colgroup><col className="w-[15%]" /><col className="w-[35%]" /><col className="w-[15%]" /><col className="w-[35%]" /></colgroup>
                    <tbody>
                      {Array.from({ length: Math.ceil(data.info.length / 2) }).map((_, rowIndex) => {
                         const item1 = data.info[rowIndex * 2];
                         const item2 = data.info[rowIndex * 2 + 1];
                         return (
                           <tr key={rowIndex}>
                             <th>{item1.label}</th><td>{item1.value}</td>
                             <th>{item2 ? item2.label : ''}</th><td>{item2 ? item2.value : ''}</td>
                           </tr>
                         );
                       })}
                    </tbody>
                  </table>
                </section>

                <section className="mb-10 print-break-inside-avoid">
                  <h2 className="text-[13px] font-bold border-l-4 border-gray-800 pl-3 mb-4 uppercase tracking-tight">2. 품질 검사 및 생산 지표 (Inspection Data)</h2>
                  {isMultiLot(data.reportType) ? (
                    <>
                      {data.lots.map((lot, idx) => (
                        <div key={lot.id} className="mb-6">
                          <div className="bg-gray-800 text-white text-[11px] font-bold px-3 py-2 mb-3 flex items-center gap-2">
                            <span>■ {lot.name || `Lot ${idx + 1}`}</span>
                          </div>
                          <LotSection lot={lot} reportType={data.reportType} />
                        </div>
                      ))}
                      <div className="border-2 border-gray-800 p-3 bg-gray-50 mt-4">
                        <div className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-brand-600 rounded-full"></span> 통합 수율 (Aggregate Yield)
                        </div>
                        <div className="text-2xl font-bold text-blue-900 text-center">
                          {calculateAggregate(data.lots, data.reportType)}%
                        </div>
                      </div>
                    </>
                  ) : (
                    <LotSection lot={data.lots[0]} reportType={data.reportType} />
                  )}
                </section>

                <section className="mb-10 print-break-inside-avoid">
                  <h2 className="text-[13px] font-bold border-l-4 border-gray-800 pl-3 mb-4 uppercase tracking-tight">3. 종합 의견 (Summary)</h2>
                  <div className="grid grid-cols-1 gap-0 border border-black divide-y divide-black">
                    <div className="p-4 bg-white min-h-[90px]">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[12px] font-bold text-gray-900 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-gray-900 rounded-full"></span> 종합 요약 (Executive Summary)
                        </h3>
                        {getDecisionBadge(data.decision)}
                      </div>
                      <p className="whitespace-pre-wrap leading-[1.8] text-[11px] text-gray-700 pl-3.5">{data.summary || '내용 없음'}</p>
                    </div>
                    <div className="p-4 bg-white min-h-[90px]">
                      <h3 className="text-[12px] font-bold text-red-700 mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-700 rounded-full"></span> 이슈 및 특이사항 (Issues)
                      </h3>
                      <p className="whitespace-pre-wrap leading-[1.8] text-[11px] text-gray-700 pl-3.5">{data.issues || '특이사항 없음'}</p>
                    </div>
                  </div>
                </section>

                <section className="mb-10 print-break-inside-avoid">
                  <h2 className="text-[13px] font-bold border-l-4 border-gray-800 pl-3 mb-4 uppercase tracking-tight">4. 현장 사진 (Site Photos)</h2>
                  {data.images.length === 0 ? (
                    <div className="border border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center text-gray-400 bg-gray-50">
                      <span className="text-xs">첨부된 사진이 없습니다.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {data.images.map((img, i) => (
                        <div key={i} className="border border-black bg-white p-2 relative shadow-sm break-inside-avoid">
                          <div className="h-48 flex items-center justify-center overflow-hidden bg-gray-100 border border-gray-200">
                             <img src={img} alt={`현장 사진 ${i+1}`} className="max-w-full max-h-full object-contain" crossOrigin="anonymous" />
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-600 uppercase">Figure {i+1}</span>
                            <span className="text-[10px] text-gray-400">Site Photo</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MetricRow: React.FC<{ metric: ProductionMetric }> = ({ metric }) => {
  const { min, max, actual } = metric;
  const isSet = min !== 0 || max !== 0;
  const isPass = isSet && actual >= min && actual <= max;

  let percentage = 0;
  if (isSet && max > min) {
    percentage = ((actual - min) / (max - min)) * 100;
    percentage = Math.max(0, Math.min(100, percentage));
  }

  return (
    <tr>
      <td className="font-semibold bg-gray-50/50 text-center text-[11px]">{metric.name}</td>
      <td className="text-gray-600 text-center font-mono text-[11px]">
        {isSet ? `${min} ~ ${max} ${metric.unit}` : '-'}
      </td>
      <td className="font-bold text-center text-[11px]">{actual}</td>
      <td className="align-middle px-2">
        <div className="gauge-container rounded-sm h-[16px]">
          <div
            className={`gauge-fill ${isPass ? 'pass' : (isSet ? 'fail' : 'neutral')}`}
            style={{ width: isSet ? `${percentage}%` : '0%' }}
          >
            {isSet && <span className="text-[8px]">{percentage.toFixed(0)}%</span>}
          </div>
          {isSet && (
            <>
              <div className="absolute top-0 bottom-0 w-px bg-black/20 left-0"></div>
              <div className="absolute top-0 bottom-0 w-px bg-black/20 right-0"></div>
            </>
          )}
        </div>
      </td>
      <td className={`font-bold text-center text-[11px] ${isPass ? 'text-green-700 bg-green-50' : (isSet ? 'text-red-600 bg-red-50' : 'text-gray-400')}`}>
        {isSet ? (isPass ? 'PASS' : 'FAIL') : '-'}
      </td>
    </tr>
  );
}

export default ReportPreview;