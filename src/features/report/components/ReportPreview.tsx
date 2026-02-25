import React from 'react';
import { ReportData, ProductionMetric, LotData, isMultiLot, getYieldMode } from '../types';
import { getTranslator } from '../i18n';
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



const LotSection: React.FC<{ lot: LotData; reportType: ReportData['reportType']; t: (key: string) => string }> = ({ lot, reportType, t }) => {
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
      <table className="report-table mb-6 table-fixed">
        <thead>
          <tr>
            <th className="w-[20%]">{t('table.item')}</th>
            <th className="w-[20%]">{t('table.spec')}</th>
            <th className="w-[15%]">{t('table.actual')}</th>
            <th className="w-[35%]">{t('table.distribution')}</th>
            <th className="w-[10%]">{t('table.result')}</th>
          </tr>
        </thead>
        <tbody>
          {lot.metrics.length === 0 ? (
            <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">{t('metrics.noData')}</td></tr>
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
                      <td colSpan={5} className="font-bold text-[11px] px-3 py-2 border border-black text-gray-800">■ {t('metrics.commonOther')}</td>
                    </tr>
                  )}
                  {ungroupedMetrics.map((metric, idx) => <MetricRow key={`common-${idx}`} metric={metric} />)}
                </>
              )}
            </>
          )}
        </tbody>
      </table>

      {/* Color Matching Log - manufacturing only */}
      {reportType.endsWith('-manufacturing') && lot.colorMatching && (lot.colorMatching.aqueous.length > 0 || lot.colorMatching.oil.length > 0) && (
        <div className="mb-6 mt-6">
          <h3 className="text-[13px] font-bold border-l-4 border-amber-500 pl-3 mb-3 text-gray-800">{t('section.colorMatching')}</h3>
          <table className="report-table table-fixed">
            <thead>
              <tr>
                <th className="w-[15%]">{t('editor.colorMatching')}</th>
                <th className="w-[20%]">{t('editor.materialCode')}</th>
                <th className="w-[30%]">{t('editor.materialName')}</th>
                <th className="w-[17%]">{t('editor.amount')}</th>
                <th className="w-[18%]">{t('editor.percentage')}</th>
              </tr>
            </thead>
            <tbody>
              {(['aqueous', 'oil'] as const).map((phase) => {
                const items = lot.colorMatching![phase];
                if (items.length === 0) return null;
                return items.map((mat, idx) => (
                  <tr key={`${phase}-${idx}`}>
                    {idx === 0 && (
                      <td rowSpan={items.length} className="text-center font-bold text-[11px] border border-black align-middle bg-gray-50">{t(`editor.${phase}`)}</td>
                    )}
                    <td className="border border-black px-3 py-1.5 text-xs font-mono">{mat.code}</td>
                    <td className="border border-black px-3 py-1.5 text-xs">{mat.name}</td>
                    <td className="border border-black px-3 py-1.5 text-xs text-right font-mono">{mat.amount}</td>
                    <td className="border border-black px-3 py-1.5 text-xs text-right font-mono">{mat.percentage}%</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Corrections Log - manufacturing only */}
      {reportType.endsWith('-manufacturing') && (lot.corrections || []).length > 0 && (
        <div className="mb-6 mt-6">
          <h3 className="text-[13px] font-bold border-l-4 border-teal-500 pl-3 mb-3 text-gray-800">{t('section.corrections')}</h3>
          <table className="report-table table-fixed">
            <thead>
              <tr>
                <th className="w-[12%]">{t('editor.correctionType')}</th>
                <th className="w-[15%]">{t('editor.materialCode')}</th>
                <th className="w-[20%]">{t('editor.materialName')}</th>
                <th className="w-[13%]">{t('editor.amount')}</th>
                <th className="w-[13%]">{t('editor.percentage')}</th>
                <th className="w-[27%]">{t('editor.memo')}</th>
              </tr>
            </thead>
            <tbody>
              {lot.corrections!.map((entry) => (
                <tr key={entry.id}>
                  <td className="border border-black px-3 py-1.5 text-xs font-semibold text-center">{entry.type}</td>
                  <td className="border border-black px-3 py-1.5 text-xs font-mono">{entry.code}</td>
                  <td className="border border-black px-3 py-1.5 text-xs">{entry.name}</td>
                  <td className="border border-black px-3 py-1.5 text-xs text-right font-mono">{entry.amount}</td>
                  <td className="border border-black px-3 py-1.5 text-xs text-right font-mono">{entry.percentage}%</td>
                  <td className="border border-black px-3 py-1.5 text-xs text-gray-600">{entry.memo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border border-black p-5 mb-6 mt-6 bg-gray-50 shadow-sm print-break-inside-avoid">
        {yieldMode === 'packaging' ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2 text-center">
              <div className="flex-1">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">{t('yield.usedBulk')}</div>
                <div className="text-base font-mono font-bold">{(lot.yield.used_bulk || 0).toLocaleString()} <span className="text-[10px] font-normal text-gray-500">kg</span></div>
              </div>
              <div className="text-gray-300 text-sm">x</div>
              <div className="flex-1">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">{t('yield.unitWeight')}</div>
                <div className="text-base font-mono font-bold">{(lot.yield.unit_weight || 0).toLocaleString()} <span className="text-[10px] font-normal text-gray-500">g</span></div>
              </div>
              <div className="text-gray-300 text-sm">=</div>
              <div className="flex-1 bg-indigo-50/50 py-1 rounded">
                <div className="text-[10px] text-indigo-500 uppercase font-bold tracking-wider mb-1">{t('yield.theoreticalQty')}</div>
                <div className="text-lg font-mono font-bold text-indigo-700">{(lot.yield.theoretical_qty || 0).toLocaleString()} <span className="text-[10px] font-normal text-indigo-400">ea</span></div>
              </div>
              <div className="h-10 w-px bg-gray-300 mx-2"></div>
              <div className="flex-1">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">{t('yield.actualQty')}</div>
                <div className="text-lg font-mono font-bold">{(lot.yield.actual_qty || 0).toLocaleString()} <span className="text-[10px] font-normal text-gray-500">ea</span></div>
              </div>
              <div className="h-10 w-px bg-gray-300 mx-2"></div>
              <div className="flex-1">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">{t('yield.finalYield')}</div>
                <div className="text-xl font-bold text-blue-900">{yieldRate}%</div>
              </div>
            </div>
            <div className="border-t border-dashed border-gray-300 pt-3 flex items-center justify-center gap-6">
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded">{t('yield.lossAnalysis')}</span>
              <div className="text-xs text-gray-600"><span className="font-semibold text-gray-400">{t('yield.lossWeight')}:</span> <span className="font-mono text-red-700 font-bold ml-1">{lossKg} kg</span></div>
              <div className="h-3 w-px bg-gray-300"></div>
              <div className="text-xs text-gray-600"><span className="font-semibold text-gray-400">{t('yield.lossRate')}:</span> <span className="font-mono text-red-700 font-bold ml-1">{lossRate}%</span></div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2">
            <div className="text-center flex-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">{t('yield.planned')}</div>
              <div className="text-lg font-mono font-bold">{(lot.yield.planned || 0).toLocaleString()} <span className="text-xs font-normal text-gray-500">{lot.yield.unit}</span></div>
            </div>
            <div className="text-gray-300 text-2xl font-light">/</div>
            <div className="flex-[2] flex flex-col items-center bg-gray-50 rounded-lg py-1 px-4 mx-2 border border-gray-100">
              <div className="flex items-end gap-2 mb-1">
                <div className="text-center">
                  <span className="text-lg font-mono font-bold text-gray-800">{(lot.yield.obtained || 0).toLocaleString()}</span>
                  <span className="text-[9px] text-gray-500 block uppercase">{t('yield.obtained')}</span>
                </div>
                <div className="text-gray-400 pb-2">+</div>
                <div className="text-center">
                  <span className="text-lg font-mono font-bold text-indigo-600">{(lot.yield.samples || 0).toLocaleString()}</span>
                  <span className="text-[9px] text-indigo-400 block uppercase">{t('yield.samples')}</span>
                </div>
              </div>
              <div className="border-t border-gray-300 w-full"></div>
              <div className="text-[10px] font-bold text-gray-600 mt-1 uppercase tracking-wider">
                {t('yield.total')}: <span className="font-mono text-sm">{((lot.yield.obtained || 0) + (lot.yield.samples || 0)).toLocaleString()}</span> <span className="text-[9px] font-normal">{lot.yield.unit}</span>
              </div>
            </div>
            <div className="h-10 w-px bg-gray-300 mx-2"></div>
            <div className="text-center flex-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">{t('yield.rate')}</div>
              <div className="text-xl font-bold text-blue-900">{yieldRate}%</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const ReportPreview: React.FC<Props> = ({ data }) => {
  const t = getTranslator(data.language || 'ko');
  const locale = data.language === 'en' ? 'en-US' : 'ko-KR';
  const currentDate = new Date(data.date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });

  const getInfoValue = (labelPart: string) => {
    return data.info.find(i => i.label.includes(labelPart))?.value || '';
  }
  const displayDept = getInfoValue('부서') || '공정개발팀';

  const translateDecision = (decision: string = '') => {
    if (decision.includes('부적합') || decision === 'Fail') return t('decision.fail');
    if (decision.includes('조건부') || decision === 'Conditional Pass') return t('decision.conditionalPass');
    if (decision.includes('보류') || decision === 'Hold') return t('decision.hold');
    return t('decision.pass');
  };

  const getDecisionBadge = (decision: string = '') => {
    const label = translateDecision(decision);
    if (decision.includes('부적합')) {
      return (
        <div className="flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1 rounded-full border border-red-200">
           <XCircle size={14} className="fill-red-700 text-white" />
           <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
        </div>
      );
    } else if (decision.includes('조건부')) {
      return (
        <div className="flex items-center gap-1.5 bg-orange-100 text-orange-700 px-3 py-1 rounded-full border border-orange-200">
           <AlertTriangle size={14} className="fill-orange-700 text-white" />
           <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
        </div>
      );
    } else if (decision.includes('보류')) {
       return (
        <div className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1 rounded-full border border-gray-200">
           <Clock size={14} className="text-gray-600" />
           <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200">
           <CheckCircle size={14} className="fill-green-700 text-white" />
           <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
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
               {data.title || '시생산 결과 보고서'}
             </h1>
             <div className="text-sm text-gray-500 mt-2">
               {t(`cover.subtitle.${data.reportType}`)}
             </div>
             <div className="h-1 w-24 bg-brand-600 mx-auto mt-8 mb-12"></div>
             <div className="w-full max-w-md mx-auto bg-gray-50 border-y border-gray-200 py-6 px-8">
                <table className="w-full text-left">
                  <tbody>
                    {data.info
                      .filter(item => ['부서', '작성자', '제품명', 'Department', 'Author', 'Product'].some(k => item.label.includes(k)))
                      .map(item => (
                        <tr key={item.id}>
                          <th className="py-3 text-sm font-bold text-gray-500 w-28 align-top">{item.label}</th>
                          <td className="py-3 text-lg font-medium">{item.value}</td>
                        </tr>
                      ))}
                    <tr>
                      <th className="py-3 text-sm font-bold text-gray-500 w-28 align-top">{t('cover.date')}</th>
                      <td className="py-3 text-lg font-medium">{currentDate}</td>
                    </tr>
                  </tbody>
                </table>
             </div>
          </div>
        </div>

        <div className="mb-10">
          <div className="text-center mb-4">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('cover.approval')}</h3>
          </div>
          <table className="w-full border-collapse border border-black">
            <thead>
              <tr>
                 <th className="border border-black bg-gray-100 py-3 text-center w-1/3 text-sm">{t('cover.drafter')}</th>
                 <th className="border border-black bg-gray-100 py-3 text-center w-1/3 text-sm">{t('cover.reviewer')}</th>
                 <th className="border border-black bg-gray-100 py-3 text-center w-1/3 text-sm">{t('cover.approver')}</th>
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
                            <img src={entry.signature} alt="" className="h-10 object-contain" />
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
                    <h2 className="text-xl font-bold font-serif text-gray-900">{data.title} {t('detail.suffix')}</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">{t('detail.subtitle')}</p>
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
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest">{t('footer.confidential')}</p>
                </div>
              </td>
            </tr>
          </tfoot>
          <tbody>
            <tr>
              <td>
                <section className="mb-10">
                  <h2 className="text-[13px] font-bold border-l-4 border-gray-800 pl-3 mb-4 uppercase tracking-tight">{t('section.overview')}</h2>
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
                  {data.purpose && (
                    <p className="mt-4 text-[13px] text-gray-700 leading-relaxed">
                      <span className="font-bold text-gray-800">{t('section.purpose')} : </span>{data.purpose}
                    </p>
                  )}
                </section>

                <section className="mb-10">
                  <h2 className="text-[13px] font-bold border-l-4 border-gray-800 pl-3 mb-4 uppercase tracking-tight">{t('section.inspection')}</h2>

                  {/* Integrated Chart — all lots combined, at the top */}
                  {data.showChart !== false && data.lots.some(lot => lot.metrics.length > 0) && (
                    <ChartComponent lots={data.lots} t={t} />
                  )}

                  {isMultiLot(data.reportType) ? (
                    <div className="space-y-8 mt-6">
                      {data.lots.map((lot, idx) => (
                        <div key={lot.id}>
                          <div className="bg-gray-800 text-white text-[11px] font-bold px-3 py-2 mb-4 flex items-center gap-2">
                            <span>■ {lot.name || `Lot ${idx + 1}`}</span>
                          </div>
                          <LotSection lot={lot} reportType={data.reportType} t={t} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <LotSection lot={data.lots[0]} reportType={data.reportType} t={t} />
                  )}
                </section>

                <section className="mb-10 print-break-inside-avoid">
                  <h2 className="text-[13px] font-bold border-l-4 border-gray-800 pl-3 mb-4 uppercase tracking-tight">{t('section.summary')}</h2>
                  <div className="grid grid-cols-1 gap-0 border border-black divide-y divide-black">
                    <div className="p-4 bg-white min-h-[90px]">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[12px] font-bold text-gray-900 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-gray-900 rounded-full"></span> {t('summary.executive')}
                        </h3>
                        {getDecisionBadge(data.decision)}
                      </div>
                      <p className="whitespace-pre-wrap leading-[1.8] text-[11px] text-gray-700 pl-3.5">{data.summary || t('summary.noContent')}</p>
                    </div>
                    <div className="p-4 bg-white min-h-[90px]">
                      <h3 className="text-[12px] font-bold text-red-700 mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-700 rounded-full"></span> {t('summary.issues')}
                      </h3>
                      <p className="whitespace-pre-wrap leading-[1.8] text-[11px] text-gray-700 pl-3.5">{data.issues || t('summary.noIssues')}</p>
                    </div>
                  </div>
                </section>

                <section className="mb-10 print-break-inside-avoid">
                  <h2 className="text-[13px] font-bold border-l-4 border-gray-800 pl-3 mb-4 uppercase tracking-tight">{t('section.photos')}</h2>
                  {data.images.length === 0 ? (
                    <div className="border border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center text-gray-400 bg-gray-50">
                      <span className="text-xs">{t('photos.none')}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {data.images.map((img, i) => (
                        <div key={i} className="border border-black bg-white p-2 relative shadow-sm break-inside-avoid">
                          <div className="h-48 flex items-center justify-center overflow-hidden bg-gray-100 border border-gray-200">
                             <img src={img} alt={`${t('photos.figure')} ${i+1}`} className="max-w-full max-h-full object-contain" crossOrigin="anonymous" />
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-600 uppercase">{t('photos.figure')} {i+1}</span>
                            <span className="text-[10px] text-gray-400">{t('section.photos').replace(/^\d+\.\s*/, '')}</span>
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
