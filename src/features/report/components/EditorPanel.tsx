import React, { useState, useRef, useEffect } from 'react';
import { ReportData, ProductionMetric, ReportType, LotData, isMultiLot, getYieldMode } from '../types';
import { Sparkles, Plus, Trash2, BarChart2, FileSpreadsheet, Upload, ChevronRight, Download, ChevronDown, Package, Factory, Calculator, AlertCircle, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { analyzeData } from '../services/geminiService';
import { parseExcelMetrics, parseExcelToLots, downloadTemplate, downloadFullTemplate } from '../utils/excelParser';

interface Props {
  data: ReportData;
  onChange: (data: ReportData) => void;
}

const EditorPanel: React.FC<Props> = ({ data, onChange }) => {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showFullTemplateMenu, setShowFullTemplateMenu] = useState(false);
  const [activeLotIndex, setActiveLotIndex] = useState(0);
  const templateMenuRef = useRef<HTMLDivElement>(null);
  const fullTemplateMenuRef = useRef<HTMLDivElement>(null);

  const activeLot = data.lots[activeLotIndex] || data.lots[0];
  const yieldMode = getYieldMode(data.reportType);

  const updateActiveLot = (updater: (lot: LotData) => LotData) => {
    const newLots = [...data.lots];
    const idx = Math.min(activeLotIndex, newLots.length - 1);
    newLots[idx] = updater(newLots[idx]);
    onChange({ ...data, lots: newLots });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(event.target as Node)) setShowTemplateMenu(false);
      if (fullTemplateMenuRef.current && !fullTemplateMenuRef.current.contains(event.target as Node)) setShowFullTemplateMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReportTypeChange = (type: ReportType) => {
    const yieldMode = getYieldMode(type);
    const wasMulti = isMultiLot(data.reportType);
    const willBeMulti = isMultiLot(type);
    let newLots = data.lots.map(lot => ({ ...lot, yield: { ...lot.yield, mode: yieldMode } }));
    if (wasMulti && !willBeMulti) { newLots = [newLots[0]]; setActiveLotIndex(0); }
    onChange({ ...data, reportType: type, lots: newLots });
  };

  const handleTextChange = (field: keyof ReportData, value: any) => { onChange({ ...data, [field]: value }); };
  const handleDeepChange = (parent: keyof ReportData, field: string, value: any) => {
    onChange({ ...data, [parent]: { ...(data[parent] as Record<string, unknown>), [field]: value } });
  };

  const handlePackagingChange = (field: string, value: number) => {
    updateActiveLot(lot => {
      const currentYield = { ...lot.yield, [field]: value };
      if (field === 'used_bulk' || field === 'unit_weight') {
        const bulk = field === 'used_bulk' ? value : (currentYield.used_bulk || 0);
        const unitWeight = field === 'unit_weight' ? value : (currentYield.unit_weight || 0);
        if (bulk > 0 && unitWeight > 0) currentYield.theoretical_qty = Math.floor((bulk * 1000) / unitWeight);
      }
      return { ...lot, yield: currentYield };
    });
  };

  const handleInfoChange = (id: string, field: 'label' | 'value', val: string) => {
    const newInfo = data.info.map(item => item.id === id ? { ...item, [field]: val } : item);
    onChange({ ...data, info: newInfo });
  };
  const addInfoItem = () => { onChange({ ...data, info: [...data.info, { id: Date.now().toString(), label: '항목명', value: '' }] }); };
  const removeInfoItem = (id: string) => { onChange({ ...data, info: data.info.filter(item => item.id !== id) }); };

  const addLot = () => {
    const yieldMode = getYieldMode(data.reportType);
    const newLot: LotData = { id: Date.now().toString(), name: `${data.lots.length + 1}호`, metrics: [], yield: { mode: yieldMode, planned: 0, obtained: 0, samples: 0, unit: 'kg', used_bulk: 0, unit_weight: 0, theoretical_qty: 0, actual_qty: 0 } };
    const newLots = [...data.lots, newLot];
    onChange({ ...data, lots: newLots });
    setActiveLotIndex(newLots.length - 1);
  };
  const removeLot = (index: number) => {
    if (data.lots.length <= 1) return;
    const newLots = data.lots.filter((_, i) => i !== index);
    onChange({ ...data, lots: newLots });
    setActiveLotIndex(Math.min(activeLotIndex, newLots.length - 1));
  };
  const handleLotNameChange = (index: number, name: string) => {
    const newLots = [...data.lots]; newLots[index] = { ...newLots[index], name }; onChange({ ...data, lots: newLots });
  };

  const handleMetricChange = (index: number, field: keyof ProductionMetric, value: string | number) => {
    updateActiveLot(lot => { const newMetrics = [...lot.metrics]; newMetrics[index] = { ...newMetrics[index], [field]: value }; return { ...lot, metrics: newMetrics }; });
  };
  const addMetric = () => { updateActiveLot(lot => ({ ...lot, metrics: [...lot.metrics, { name: 'New Item', min: 0, max: 0, actual: 0, unit: '' }] })); };
  const removeMetric = (index: number) => { updateActiveLot(lot => ({ ...lot, metrics: lot.metrics.filter((_, i) => i !== index) })); };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const metrics = await parseExcelMetrics(file);
        if (metrics.length > 0) {
          if (confirm('현재 입력된 항목들을 삭제하고 덮어쓰시겠습니까?\n(취소 시 기존 항목 뒤에 추가됩니다)')) {
            updateActiveLot(lot => ({ ...lot, metrics }));
          } else {
            updateActiveLot(lot => ({ ...lot, metrics: [...lot.metrics, ...metrics] }));
          }
        } else { alert('데이터를 인식할 수 없습니다. 양식을 확인해주세요.'); }
      } catch (err) { console.error(err); alert('엑셀 파일 읽기 실패'); }
      e.target.value = '';
    }
  };

  const handleFullExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await parseExcelToLots(file);
      if (result.lots.length === 0 || result.lots.every(l => l.metrics.length === 0)) { alert('데이터를 인식할 수 없습니다. 양식을 확인해주세요.'); return; }
      const newData = { ...data };
      if (result.reportType) newData.reportType = result.reportType;
      if (confirm('엑셀 데이터로 전체 보고서를 덮어쓰시겠습니까?')) { newData.lots = result.lots; setActiveLotIndex(0); }
      onChange(newData);
    } catch (err) { console.error(err); alert('엑셀 파일 읽기 실패'); }
    e.target.value = '';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (ev) => { onChange({ ...data, images: [...data.images, ev.target?.result as string] }); };
        reader.readAsDataURL(file);
      });
    }
  };
  const removeImage = (idx: number) => { onChange({ ...data, images: data.images.filter((_, i) => i !== idx) }); };

  const handleAIAnalyze = async () => {
    setIsGenerating('analysis');
    const metricsStr = activeLot.metrics.map(m => `${m.name}: Min ${m.min}, Max ${m.max}, Actual ${m.actual} (${m.unit})`).join('\n');
    const analysis = await analyzeData(metricsStr);
    const newSummary = data.summary ? data.summary + "\n\n[AI Analysis]\n" + analysis : analysis;
    onChange({ ...data, summary: newSummary });
    setIsGenerating(null);
  };

  const calculateLoss = () => {
    if (getYieldMode(data.reportType) !== 'packaging') return null;
    const bulk = activeLot.yield.used_bulk || 0;
    const unitWeight = activeLot.yield.unit_weight || 0;
    const actualQty = activeLot.yield.actual_qty || 0;
    if (bulk === 0 || unitWeight === 0) return null;
    const usedWeightKg = (actualQty * unitWeight) / 1000;
    const lossKg = bulk - usedWeightKg;
    const lossRate = (lossKg / bulk) * 100;
    return { lossKg, lossRate };
  };
  const lossData = calculateLoss();

  const SectionTitle = ({ title, icon }: { title: string; icon?: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
      {icon && <span className="text-brand-600">{icon}</span>}
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</h3>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-white border-l border-gray-200 text-gray-800">
      <div className="p-6 pb-24 space-y-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="bg-gradient-to-br from-brand-500 to-brand-700 text-white p-1.5 rounded-lg shadow-sm"><Sparkles size={18} /></span>
          Editor
        </h2>

        {/* Report Type Selector */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <SectionTitle title="보고서 유형 (Report Type)" />
          <div className="grid grid-cols-2 gap-2">
            {([
              { type: 'single-manufacturing' as ReportType, label: '단일 제조', icon: Factory },
              { type: 'single-filling' as ReportType, label: '단일 충진포장', icon: Package },
              { type: 'multi-manufacturing' as ReportType, label: '다중호수 제조', icon: Factory },
              { type: 'multi-filling' as ReportType, label: '다중호수 충진포장', icon: Package },
            ]).map((option) => (
              <button key={option.type} onClick={() => handleReportTypeChange(option.type)}
                className={`py-2.5 px-3 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all ${data.reportType === option.type ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500 ring-offset-1' : 'border-gray-200 text-gray-400 bg-white hover:bg-gray-50'}`}>
                <option.icon size={14} />{option.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <label className="flex-1 cursor-pointer">
              <div className="w-full py-2 border border-dashed border-green-300 text-green-600 rounded-lg hover:bg-green-50 text-xs font-medium flex items-center justify-center gap-2 transition-colors"><Upload size={14} /> 엑셀 가져오기</div>
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFullExcelImport} />
            </label>
            <div ref={fullTemplateMenuRef} className="relative flex-1">
              <button onClick={() => setShowFullTemplateMenu(!showFullTemplateMenu)} className="w-full py-2 border border-dashed border-brand-300 text-brand-600 rounded-lg hover:bg-brand-50 text-xs font-medium flex items-center justify-center gap-2 transition-colors">
                <Download size={14} /> 양식 다운로드 <ChevronDown size={10} />
              </button>
              {showFullTemplateMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                  {([
                    { type: 'single-manufacturing' as ReportType, label: '단일 제조', desc: '단일 품목 제조 검사 양식' },
                    { type: 'single-filling' as ReportType, label: '단일 충진포장', desc: '단일 품목 충진/포장 양식' },
                    { type: 'multi-manufacturing' as ReportType, label: '다중호수 제조', desc: '호수별 시트 (21호, 23호...)' },
                    { type: 'multi-filling' as ReportType, label: '다중호수 충진포장', desc: '호수별 시트 충진/포장 양식' },
                  ]).map((option) => (
                    <button key={option.type} onClick={() => { downloadFullTemplate(option.type); setShowFullTemplateMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex flex-col border-b border-gray-50 last:border-0">
                      <span className="font-bold text-gray-800">{option.label}</span>
                      <span className="text-gray-400 text-[10px]">{option.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Lot Tabs */}
        {isMultiLot(data.reportType) && (
          <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <SectionTitle title="호수 관리 (Lot Management)" />
            <div className="flex flex-wrap gap-2 items-center">
              {data.lots.map((lot, idx) => (
                <div key={lot.id} className="flex items-center gap-1">
                  <button onClick={() => setActiveLotIndex(idx)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeLotIndex === idx ? 'bg-brand-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {lot.name || `Lot ${idx + 1}`}
                  </button>
                  {data.lots.length > 1 && <button onClick={() => removeLot(idx)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>}
                </div>
              ))}
              <button onClick={addLot} className="px-3 py-1.5 border border-dashed border-gray-300 text-gray-400 rounded-lg hover:border-brand-500 hover:text-brand-600 text-xs font-medium flex items-center gap-1"><Plus size={12} /> 호수 추가</button>
            </div>
            <div className="mt-3">
              <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">호수명</label>
              <input type="text" value={data.lots[activeLotIndex]?.name || ''} onChange={(e) => handleLotNameChange(activeLotIndex, e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-brand-500" placeholder="예: 21호" />
            </div>
          </section>
        )}

        {/* Basic Info */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <SectionTitle title="기본 정보 (Info)" />
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">보고서 제목</label>
              <input type="text" value={data.title} onChange={(e) => handleTextChange('title', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none" />
            </div>
            <div className="mt-4">
              <label className="text-xs font-semibold text-gray-500 mb-2 block">상세 항목 (목록 편집 가능)</label>
              <div className="space-y-2">
                {data.info.map((item) => (
                  <div key={item.id} className="flex gap-2 items-center group">
                     <div className="w-1/3"><input type="text" value={item.label} onChange={(e) => handleInfoChange(item.id, 'label', e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-500 outline-none font-medium text-gray-600" placeholder="항목명" /></div>
                     <div className="flex-1"><input type="text" value={item.value} onChange={(e) => handleInfoChange(item.id, 'value', e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-500 outline-none" placeholder="내용" /></div>
                     <button onClick={() => removeInfoItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100" title="삭제"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              <button onClick={addInfoItem} className="w-full py-2 border border-dashed border-gray-300 text-gray-400 rounded hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all flex justify-center items-center gap-1 text-[10px] font-medium mt-3"><Plus size={12} /> 항목 추가</button>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="text-xs font-semibold text-gray-500 mb-2 block">결재 라인</label>
            <div className="grid grid-cols-3 gap-2">
               {['drafter', 'reviewer', 'approver'].map((role) => (
                 <div key={role}><input type="text" placeholder={role === 'drafter' ? '담당' : role === 'reviewer' ? '검토' : '승인'} value={data.approvals[role as keyof typeof data.approvals]} onChange={(e) => handleDeepChange('approvals', role, e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs text-center focus:border-brand-500 outline-none" /></div>
               ))}
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">검사 항목 (Metrics)</h3>
            <div className="flex gap-2 relative">
               <div ref={templateMenuRef} className="relative">
                 <button onClick={() => setShowTemplateMenu(!showTemplateMenu)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-1.5 rounded-md transition-colors border border-gray-300 flex items-center gap-1" title="양식 다운로드"><Download size={16} /><ChevronDown size={12} /></button>
                 {showTemplateMenu && (
                   <div className="absolute top-full right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                     <button onClick={() => { downloadTemplate('raw'); setShowTemplateMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex flex-col"><span className="font-bold text-gray-800">기본 양식 (Raw Data)</span><span className="text-gray-500 text-[10px]">단일 품목, 평균 자동 계산</span></button>
                     <button onClick={() => { downloadTemplate('multi_sheet'); setShowTemplateMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex flex-col border-t border-gray-100"><span className="font-bold text-gray-800">다중 홋수/품목 (Multi-Sheet)</span><span className="text-gray-500 text-[10px]">시트별로 21호, 23호 구분</span></button>
                     <button onClick={() => { downloadTemplate('summary'); setShowTemplateMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex flex-col border-t border-gray-100"><span className="font-bold text-gray-800">요약 양식 (Summary)</span><span className="text-gray-500 text-[10px]">결과값 직접 입력 리스트</span></button>
                   </div>
                 )}
               </div>
               <label className="cursor-pointer group relative">
                 <div className="bg-green-50 hover:bg-green-100 text-green-700 p-1.5 rounded-md transition-colors border border-green-200"><FileSpreadsheet size={16} /></div>
                 <span className="absolute bottom-full right-0 mb-2 w-max px-2 py-1 text-[10px] text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">엑셀 업로드</span>
                 <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} />
               </label>
               <button onClick={handleAIAnalyze} disabled={!!isGenerating} className="bg-purple-50 hover:bg-purple-100 text-purple-700 p-1.5 rounded-md transition-colors border border-purple-200" title="AI 데이터 분석"><BarChart2 size={16} /></button>
            </div>
          </div>
          <div className="space-y-3">
             <div className="grid grid-cols-12 gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center px-1">
               <span className="col-span-4 text-left">Item</span><span className="col-span-2">Min</span><span className="col-span-2">Max</span><span className="col-span-2">Act</span><span className="col-span-2">Unit</span>
             </div>
            {activeLot.metrics.map((metric, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-1 items-center bg-gray-50 p-1.5 rounded-lg border border-transparent hover:border-gray-200 hover:bg-white transition-all group">
                <div className="col-span-4"><input type="text" value={metric.name} onChange={(e) => handleMetricChange(idx, 'name', e.target.value)} className="w-full p-1 text-xs bg-transparent border-b border-transparent focus:border-brand-500 outline-none font-medium" placeholder="Name" /></div>
                <div className="col-span-2"><input type="number" value={metric.min} onChange={(e) => handleMetricChange(idx, 'min', Number(e.target.value))} className="w-full p-1 text-xs bg-transparent border-b border-transparent focus:border-brand-500 outline-none text-center" /></div>
                <div className="col-span-2"><input type="number" value={metric.max} onChange={(e) => handleMetricChange(idx, 'max', Number(e.target.value))} className="w-full p-1 text-xs bg-transparent border-b border-transparent focus:border-brand-500 outline-none text-center" /></div>
                <div className="col-span-2"><input type="number" value={metric.actual} onChange={(e) => handleMetricChange(idx, 'actual', Number(e.target.value))} className="w-full p-1 text-xs bg-transparent border-b border-transparent focus:border-brand-500 outline-none font-bold text-center text-brand-700" /></div>
                <div className="col-span-2 flex items-center">
                  <input type="text" value={metric.unit} onChange={(e) => handleMetricChange(idx, 'unit', e.target.value)} className="w-full p-1 text-xs bg-transparent border-b border-transparent focus:border-brand-500 outline-none text-center text-gray-400" />
                  <button onClick={() => removeMetric(idx)} className="ml-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
            <button onClick={addMetric} className="w-full py-2.5 border border-dashed border-gray-300 text-gray-400 rounded-lg hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all flex justify-center items-center gap-2 text-xs font-medium"><Plus size={14} /> Add New Item</button>
          </div>
        </section>

        {/* Yield */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
           <SectionTitle title="수율 (Yield)" />
           {yieldMode === 'manufacturing' ? (
             <div className="space-y-4">
               <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">지시량 (Planned)</label>
                    <input type="number" value={activeLot.yield.planned || 0} onChange={(e) => updateActiveLot(lot => ({ ...lot, yield: { ...lot.yield, planned: Number(e.target.value) } }))} className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-brand-500 transition-colors" />
                  </div>
                  <div className="pb-3 text-gray-400"><ChevronRight size={16} /></div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">수득량 (Obtained)</label>
                    <input type="number" value={activeLot.yield.obtained || 0} onChange={(e) => updateActiveLot(lot => ({ ...lot, yield: { ...lot.yield, obtained: Number(e.target.value) } }))} className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-brand-500 transition-colors" />
                  </div>
                  <div className="w-16">
                     <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Unit</label>
                     <input type="text" value={activeLot.yield.unit} onChange={(e) => updateActiveLot(lot => ({ ...lot, yield: { ...lot.yield, unit: e.target.value } }))} className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm text-center outline-none focus:border-brand-500 transition-colors" />
                  </div>
               </div>
               <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-indigo-400 mb-1 block uppercase flex items-center gap-1"><FlaskIcon /> 유관부서 전달 (Samples)</label>
                    <input type="number" value={activeLot.yield.samples || 0} onChange={(e) => updateActiveLot(lot => ({ ...lot, yield: { ...lot.yield, samples: Number(e.target.value) } }))} className="w-full p-2 bg-white border border-indigo-200 rounded text-sm outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div className="text-[10px] text-gray-400 pt-5">연구소, 품질, 영업팀 등으로 전달된 샘플 물량은<br/>생산 실적(수율)에 포함됩니다.</div>
               </div>
             </div>
           ) : (
             <div className="space-y-4">
               <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">사용된 벌크 (Used Bulk)</label>
                    <div className="relative"><input type="number" value={activeLot.yield.used_bulk || 0} onChange={(e) => handlePackagingChange('used_bulk', Number(e.target.value))} className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-brand-500 transition-colors pl-8" /><span className="absolute left-3 top-2.5 text-gray-400 text-xs">kg</span></div>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">이론 충진량 (Unit Weight)</label>
                    <div className="relative"><input type="number" value={activeLot.yield.unit_weight || 0} onChange={(e) => handlePackagingChange('unit_weight', Number(e.target.value))} className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-brand-500 transition-colors pl-8" /><span className="absolute left-3 top-2.5 text-gray-400 text-xs">g</span></div>
                  </div>
               </div>
               <div className="flex items-center gap-2 text-[10px] text-gray-400"><Calculator size={10} /><span>Theoretical Qty = (Bulk * 1000) / Unit Weight</span></div>
               <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">이론 충진 수량 (Theoretical)</label>
                    <div className="relative"><input type="number" value={activeLot.yield.theoretical_qty || 0} onChange={(e) => handlePackagingChange('theoretical_qty', Number(e.target.value))} className="w-full p-2 bg-indigo-50 border border-indigo-200 rounded text-sm outline-none focus:border-brand-500 transition-colors pl-8" /><span className="absolute left-3 top-2.5 text-gray-400 text-xs">ea</span></div>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">실제 충진 수량 (Actual)</label>
                    <div className="relative"><input type="number" value={activeLot.yield.actual_qty || 0} onChange={(e) => handlePackagingChange('actual_qty', Number(e.target.value))} className="w-full p-2 bg-white border border-gray-300 ring-1 ring-gray-100 rounded text-sm outline-none focus:border-brand-500 transition-colors pl-8 font-bold text-brand-700" /><span className="absolute left-3 top-2.5 text-gray-400 text-xs">ea</span></div>
                  </div>
               </div>
               {lossData && (
                 <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 text-red-700"><AlertCircle size={14} /><span className="font-semibold">예상 손실 (Loss)</span></div>
                    <div className="flex gap-4">
                       <div><span className="text-gray-500 mr-1">중량:</span><span className="font-mono font-bold text-red-800">{lossData.lossKg.toFixed(2)}kg</span></div>
                       <div><span className="text-gray-500 mr-1">손실률:</span><span className="font-mono font-bold text-red-800">{lossData.lossRate.toFixed(2)}%</span></div>
                    </div>
                 </div>
               )}
             </div>
           )}
        </section>

        {/* Photos */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">현장 사진</h3>
             <label className="cursor-pointer bg-brand-50 hover:bg-brand-100 text-brand-700 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors border border-brand-200"><Upload size={12} />Add Photo<input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" /></label>
          </div>
          <div className="grid grid-cols-3 gap-3">
             {data.images.map((img, idx) => (
               <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                 <img src={img} alt="thumb" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => removeImage(idx)} className="bg-white/20 hover:bg-red-500 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors"><Trash2 size={14} /></button>
                 </div>
               </div>
             ))}
             {data.images.length === 0 && <div className="col-span-3 py-6 text-center text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">No photos uploaded</div>}
          </div>
        </section>

        {/* Summary & Decision */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow group">
           <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
             <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">종합 결과 (Result)</h3>
           </div>
           <div className="mb-4">
             <label className="text-xs font-semibold text-gray-500 mb-2 block">최종 판정 (Final Decision)</label>
             <div className="flex gap-2">
               {[
                 { label: '적합', value: '적합', icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200' },
                 { label: '조건부', value: '조건부 적합', icon: AlertTriangle, color: 'text-orange-600 bg-orange-50 border-orange-200' },
                 { label: '부적합', value: '부적합', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
                 { label: '보류', value: '보류', icon: Clock, color: 'text-gray-600 bg-gray-50 border-gray-200' },
               ].map((option) => (
                 <button key={option.value} onClick={() => handleTextChange('decision', option.value)}
                   className={`flex-1 py-2 px-1 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${data.decision === option.value ? `${option.color} ring-2 ring-offset-1 ring-brand-500` : 'border-gray-200 text-gray-400 bg-white hover:bg-gray-50'}`}>
                   <option.icon size={16} />{option.label}
                 </button>
               ))}
             </div>
           </div>
           <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">종합 의견 (Summary)</label>
                <textarea value={data.summary} onChange={(e) => handleTextChange('summary', e.target.value)} className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm leading-relaxed resize-none outline-none focus:bg-white focus:border-brand-500 transition-colors" placeholder="종합 의견을 입력하세요..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">이슈 및 특이사항 (Issues)</label>
                <textarea value={data.issues} onChange={(e) => handleTextChange('issues', e.target.value)} className="w-full h-20 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm leading-relaxed resize-none outline-none focus:bg-white focus:border-brand-500 transition-colors" placeholder="특이사항을 입력하세요..." />
              </div>
           </div>
        </section>
      </div>
    </div>
  );
};

const FlaskIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
    <path d="M8.5 2h7" />
    <path d="M7 16h10" />
  </svg>
)

export default EditorPanel;