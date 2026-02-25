import React, { useState, useRef, useEffect } from 'react';
import { ReportData, ProductionMetric, ReportType, LotData, ColorMatchingData, CorrectionEntry, isMultiLot, getYieldMode } from '../types';
import { Sparkles, Plus, Trash2, BarChart2, FileSpreadsheet, Upload, ChevronRight, Download, ChevronDown, Package, Factory, Calculator, AlertCircle, CheckCircle, XCircle, AlertTriangle, Clock, Palette, Wrench } from 'lucide-react';
import { analyzeData } from '../services/geminiService';
import { parseExcelMetrics, parseExcelToLots, downloadTemplate, downloadFullTemplate } from '../utils/excelParser';
import SignaturePad from './SignaturePad';
import { getTranslator } from '../i18n';

interface Props {
  data: ReportData;
  onChange: (data: ReportData) => void;
}

const EditorPanel: React.FC<Props> = ({ data, onChange }) => {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showFullTemplateMenu, setShowFullTemplateMenu] = useState(false);
  const [activeLotIndex, setActiveLotIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const templateMenuRef = useRef<HTMLDivElement>(null);
  const fullTemplateMenuRef = useRef<HTMLDivElement>(null);

  const t = getTranslator(data.language || 'ko');
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
  const addInfoItem = () => { onChange({ ...data, info: [...data.info, { id: Date.now().toString(), label: t('editor.itemName'), value: '' }] }); };
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

  // Batch size helper: convert yield.planned to grams for auto-calculation
  const getBatchSizeInGrams = (lot: LotData): number => {
    const planned = lot.yield.planned || 0;
    if (planned <= 0) return 0;
    const unit = (lot.yield.unit || '').toLowerCase();
    if (unit === 'kg') return planned * 1000;
    if (unit === 't' || unit === 'ton') return planned * 1_000_000;
    return planned; // assume grams or same unit
  };

  // Color Matching handlers (aqueous / oil)
  const getColorMatching = (lot: LotData): ColorMatchingData => lot.colorMatching || { aqueous: [], oil: [] };

  const addColorMaterial = (phase: 'aqueous' | 'oil') => {
    updateActiveLot(lot => {
      const cm = getColorMatching(lot);
      return { ...lot, colorMatching: { ...cm, [phase]: [...cm[phase], { code: '', name: '', amount: 0, percentage: 0 }] } };
    });
  };
  const removeColorMaterial = (phase: 'aqueous' | 'oil', index: number) => {
    updateActiveLot(lot => {
      const cm = getColorMatching(lot);
      return { ...lot, colorMatching: { ...cm, [phase]: cm[phase].filter((_, i) => i !== index) } };
    });
  };
  const handleColorMaterialChange = (phase: 'aqueous' | 'oil', index: number, field: string, value: string | number) => {
    updateActiveLot(lot => {
      const cm = getColorMatching(lot);
      const list = [...cm[phase]];
      const item = { ...list[index], [field]: value };
      const batchG = getBatchSizeInGrams(lot);
      if (batchG > 0) {
        if (field === 'amount') item.percentage = Math.round((Number(value) / batchG) * 100 * 10000) / 10000;
        else if (field === 'percentage') item.amount = Math.round(batchG * (Number(value) / 100) * 100) / 100;
      }
      list[index] = item;
      return { ...lot, colorMatching: { ...cm, [phase]: list } };
    });
  };

  // Correction Entry handlers
  const addCorrection = () => {
    const entry: CorrectionEntry = { id: Date.now().toString(), type: t('editor.correctionTypes.viscosity'), code: '', name: '', amount: 0, percentage: 0, memo: '' };
    updateActiveLot(lot => ({ ...lot, corrections: [...(lot.corrections || []), entry] }));
  };
  const removeCorrection = (index: number) => {
    updateActiveLot(lot => ({ ...lot, corrections: (lot.corrections || []).filter((_, i) => i !== index) }));
  };
  const handleCorrectionChange = (index: number, field: string, value: string | number) => {
    updateActiveLot(lot => {
      const corrections = [...(lot.corrections || [])];
      const item = { ...corrections[index], [field]: value };
      const batchG = getBatchSizeInGrams(lot);
      if (batchG > 0) {
        if (field === 'amount') item.percentage = Math.round((Number(value) / batchG) * 100 * 10000) / 10000;
        else if (field === 'percentage') item.amount = Math.round(batchG * (Number(value) / 100) * 100) / 100;
      }
      corrections[index] = item;
      return { ...lot, corrections };
    });
  };

  const correctionTypeOptions = [
    t('editor.correctionTypes.viscosity'),
    t('editor.correctionTypes.hardness'),
    t('editor.correctionTypes.ph'),
    t('editor.correctionTypes.color'),
    t('editor.correctionTypes.other'),
  ];

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const metrics = await parseExcelMetrics(file);
        if (metrics.length > 0) {
          if (confirm(t('editor.overwriteConfirm'))) {
            updateActiveLot(lot => ({ ...lot, metrics }));
          } else {
            updateActiveLot(lot => ({ ...lot, metrics: [...lot.metrics, ...metrics] }));
          }
        } else { alert(t('editor.parseError')); }
      } catch (err) { console.error(err); alert(t('editor.excelError')); }
      e.target.value = '';
    }
  };

  const handleFullExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await parseExcelToLots(file);
      if (result.lots.length === 0 || result.lots.every(l => l.metrics.length === 0)) { alert(t('editor.parseError')); return; }
      const newData = { ...data };
      if (result.reportType) newData.reportType = result.reportType;
      if (confirm(t('editor.fullOverwriteConfirm'))) { newData.lots = result.lots; setActiveLotIndex(0); }
      onChange(newData);
    } catch (err) { console.error(err); alert(t('editor.excelError')); }
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

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).filter(f => f.type.startsWith('image/')).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => { onChange({ ...data, images: [...data.images, ev.target?.result as string] }); };
        reader.readAsDataURL(file);
      });
    }
  };

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
          <SectionTitle title={t('editor.reportType')} />
          <div className="grid grid-cols-2 gap-2">
            {([
              { type: 'single-manufacturing' as ReportType, label: t('editor.singleMfg'), desc: t('editor.singleMfgDesc'), icon: Factory },
              { type: 'single-filling' as ReportType, label: t('editor.singleFill'), desc: t('editor.singleFillDesc'), icon: Package },
              { type: 'multi-manufacturing' as ReportType, label: t('editor.multiMfg'), desc: t('editor.multiMfgDesc'), icon: Factory },
              { type: 'multi-filling' as ReportType, label: t('editor.multiFill'), desc: t('editor.multiFillDesc'), icon: Package },
            ]).map((option) => (
              <button key={option.type} onClick={() => handleReportTypeChange(option.type)}
                className={`py-2.5 px-3 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all ${data.reportType === option.type ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500 ring-offset-1' : 'border-gray-200 text-gray-400 bg-white hover:bg-gray-50'}`}>
                <option.icon size={14} />{option.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <label className="flex-1 cursor-pointer">
              <div className="w-full py-2 border border-dashed border-green-300 text-green-600 rounded-lg hover:bg-green-50 text-xs font-medium flex items-center justify-center gap-2 transition-colors"><Upload size={14} /> {t('editor.excelImport')}</div>
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFullExcelImport} />
            </label>
            <div ref={fullTemplateMenuRef} className="relative flex-1">
              <button onClick={() => setShowFullTemplateMenu(!showFullTemplateMenu)} className="w-full py-2 border border-dashed border-brand-300 text-brand-600 rounded-lg hover:bg-brand-50 text-xs font-medium flex items-center justify-center gap-2 transition-colors">
                <Download size={14} /> {t('editor.templateDownload')} <ChevronDown size={10} />
              </button>
              {showFullTemplateMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                  {([
                    { type: 'single-manufacturing' as ReportType, label: t('editor.singleMfg'), desc: t('editor.singleMfgDesc') },
                    { type: 'single-filling' as ReportType, label: t('editor.singleFill'), desc: t('editor.singleFillDesc') },
                    { type: 'multi-manufacturing' as ReportType, label: t('editor.multiMfg'), desc: t('editor.multiMfgDesc') },
                    { type: 'multi-filling' as ReportType, label: t('editor.multiFill'), desc: t('editor.multiFillDesc') },
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
            <SectionTitle title={t('editor.lotManagement')} />
            <div className="flex flex-wrap gap-2 items-center">
              {data.lots.map((lot, idx) => (
                <div key={lot.id} className="flex items-center gap-1">
                  <button onClick={() => setActiveLotIndex(idx)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeLotIndex === idx ? 'bg-brand-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {lot.name || `Lot ${idx + 1}`}
                  </button>
                  {data.lots.length > 1 && <button onClick={() => removeLot(idx)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>}
                </div>
              ))}
              <button onClick={addLot} className="px-3 py-1.5 border border-dashed border-gray-300 text-gray-400 rounded-lg hover:border-brand-500 hover:text-brand-600 text-xs font-medium flex items-center gap-1"><Plus size={12} /> {t('editor.lotAdd')}</button>
            </div>
            <div className="mt-3">
              <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">{t('editor.lotName')}</label>
              <input type="text" value={data.lots[activeLotIndex]?.name || ''} onChange={(e) => handleLotNameChange(activeLotIndex, e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-brand-500" placeholder={t('editor.lotNamePlaceholder')} />
            </div>
          </section>
        )}

        {/* Basic Info */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <SectionTitle title={t('editor.basicInfo')} />
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{t('editor.title')}</label>
              <input type="text" value={data.title} onChange={(e) => handleTextChange('title', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none" />
            </div>
            <div className="mt-4">
              <label className="text-xs font-semibold text-gray-500 mb-2 block">{t('editor.detailItems')}</label>
              <div className="space-y-2">
                {data.info.map((item) => (
                  <div key={item.id} className="flex gap-2 items-center group">
                     <div className="w-1/3"><input type="text" value={item.label} onChange={(e) => handleInfoChange(item.id, 'label', e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-500 outline-none font-medium text-gray-600" placeholder={t('editor.itemName')} /></div>
                     <div className="flex-1"><input type="text" value={item.value} onChange={(e) => handleInfoChange(item.id, 'value', e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-500 outline-none" placeholder={t('editor.content')} /></div>
                     <button onClick={() => removeInfoItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100" title={t('editor.delete')}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              <button onClick={addInfoItem} className="w-full py-2 border border-dashed border-gray-300 text-gray-400 rounded hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all flex justify-center items-center gap-1 text-[10px] font-medium mt-3"><Plus size={12} /> {t('editor.addItem')}</button>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="text-xs font-semibold text-gray-500 mb-3 block">{t('editor.approvalLine')}</label>
            <div className="grid grid-cols-3 gap-3">
               {(['drafter', 'reviewer', 'approver'] as const).map((role) => {
                 const label = t(`editor.${role}`);
                 const entry = data.approvals[role];
                 const updateField = (field: string, value: string) => {
                   onChange({ ...data, approvals: { ...data.approvals, [role]: { ...entry, [field]: value } } });
                 };
                 return (
                   <div key={role} className="space-y-1.5 bg-gray-50 p-2 rounded-lg border border-gray-100">
                     <div className="text-[10px] font-bold text-gray-400 uppercase text-center">{label}</div>
                     <input type="text" placeholder={t('editor.dept')} value={entry.department} onChange={(e) => updateField('department', e.target.value)} className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-xs text-center focus:border-brand-500 outline-none" />
                     <input type="text" placeholder={t('editor.position')} value={entry.position} onChange={(e) => updateField('position', e.target.value)} className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-xs text-center focus:border-brand-500 outline-none" />
                     <input type="text" placeholder={t('editor.name')} value={entry.name} onChange={(e) => updateField('name', e.target.value)} className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-xs text-center focus:border-brand-500 outline-none font-medium" />
                     <SignaturePad value={entry.signature || ''} onChange={(v) => updateField('signature', v)} />
                     <input type="date" value={entry.date} onChange={(e) => updateField('date', e.target.value)} className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-xs text-center focus:border-brand-500 outline-none text-gray-500" />
                   </div>
                 );
               })}
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{t('editor.metrics')}</h3>
            <div className="flex gap-2 relative">
               <div ref={templateMenuRef} className="relative">
                 <button onClick={() => setShowTemplateMenu(!showTemplateMenu)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-1.5 rounded-md transition-colors border border-gray-300 flex items-center gap-1" title={t('editor.templateDownload')}><Download size={16} /><ChevronDown size={12} /></button>
                 {showTemplateMenu && (
                   <div className="absolute top-full right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                     <button onClick={() => { downloadTemplate('raw'); setShowTemplateMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex flex-col"><span className="font-bold text-gray-800">{t('editor.rawTemplate')}</span><span className="text-gray-500 text-[10px]">{t('editor.rawTemplateDesc')}</span></button>
                     <button onClick={() => { downloadTemplate('multi_sheet'); setShowTemplateMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex flex-col border-t border-gray-100"><span className="font-bold text-gray-800">{t('editor.multiSheetTemplate')}</span><span className="text-gray-500 text-[10px]">{t('editor.multiSheetTemplateDesc')}</span></button>
                     <button onClick={() => { downloadTemplate('summary'); setShowTemplateMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex flex-col border-t border-gray-100"><span className="font-bold text-gray-800">{t('editor.summaryTemplate')}</span><span className="text-gray-500 text-[10px]">{t('editor.summaryTemplateDesc')}</span></button>
                   </div>
                 )}
               </div>
               <label className="cursor-pointer group relative">
                 <div className="bg-green-50 hover:bg-green-100 text-green-700 p-1.5 rounded-md transition-colors border border-green-200"><FileSpreadsheet size={16} /></div>
                 <span className="absolute bottom-full right-0 mb-2 w-max px-2 py-1 text-[10px] text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">{t('editor.excelUpload')}</span>
                 <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} />
               </label>
               <button onClick={handleAIAnalyze} disabled={!!isGenerating} className="bg-purple-50 hover:bg-purple-100 text-purple-700 p-1.5 rounded-md transition-colors border border-purple-200" title="AI Analysis"><BarChart2 size={16} /></button>
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
            <button onClick={addMetric} className="w-full py-2.5 border border-dashed border-gray-300 text-gray-400 rounded-lg hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all flex justify-center items-center gap-2 text-xs font-medium"><Plus size={14} /> {t('editor.addMetric')}</button>
          </div>
        </section>

        {/* Color Matching - manufacturing only */}
        {yieldMode === 'manufacturing' && (
          <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <SectionTitle title={t('editor.colorMatching')} icon={<Palette size={16} />} />
            {getBatchSizeInGrams(activeLot) > 0 ? (
              <div className="mb-3 px-2 py-1.5 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-[10px] text-green-700">
                <Calculator size={10} />
                <span className="font-semibold">{t('editor.batchSizeRef')}: {(activeLot.yield.planned || 0).toLocaleString()}{activeLot.yield.unit} ({getBatchSizeInGrams(activeLot).toLocaleString()}g)</span>
              </div>
            ) : (
              <div className="mb-3 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-md flex items-center gap-2 text-[10px] text-gray-400">
                <AlertCircle size={10} />
                <span>{t('editor.batchSizeNotSet')}</span>
              </div>
            )}
            <div className="space-y-4">
              {(['aqueous', 'oil'] as const).map((phase) => {
                const items = getColorMatching(activeLot)[phase];
                const bgColor = phase === 'aqueous' ? 'bg-blue-50/60 border-blue-200' : 'bg-amber-50/60 border-amber-200';
                const accentColor = phase === 'aqueous' ? 'text-blue-700' : 'text-amber-700';
                const btnColor = phase === 'aqueous' ? 'border-blue-300 text-blue-500 hover:bg-blue-100' : 'border-amber-300 text-amber-500 hover:bg-amber-100';
                return (
                  <div key={phase} className={`${bgColor} border rounded-lg p-3 space-y-2`}>
                    <span className={`text-xs font-bold ${accentColor}`}>{t(`editor.${phase}`)}</span>
                    <div className="grid grid-cols-12 gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center px-1">
                      <span className="col-span-3 text-left">{t('editor.materialCode')}</span><span className="col-span-3 text-left">{t('editor.materialName')}</span><span className="col-span-3">{t('editor.amount')}</span><span className="col-span-2">{t('editor.percentage')}</span><span className="col-span-1"></span>
                    </div>
                    {items.map((mat, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-1 items-center group">
                        <div className="col-span-3"><input type="text" value={mat.code} onChange={(e) => handleColorMaterialChange(phase, idx, 'code', e.target.value)} className="w-full p-1.5 text-xs bg-white border border-gray-200 rounded focus:border-brand-500 outline-none font-mono" placeholder={t('editor.materialCode')} /></div>
                        <div className="col-span-3"><input type="text" value={mat.name} onChange={(e) => handleColorMaterialChange(phase, idx, 'name', e.target.value)} className="w-full p-1.5 text-xs bg-white border border-gray-200 rounded focus:border-brand-500 outline-none" placeholder={t('editor.materialName')} /></div>
                        <div className="col-span-3"><input type="number" value={mat.amount} onChange={(e) => handleColorMaterialChange(phase, idx, 'amount', Number(e.target.value))} className="w-full p-1.5 text-xs bg-white border border-gray-200 rounded focus:border-brand-500 outline-none text-center" step="0.01" /></div>
                        <div className="col-span-2"><input type="number" value={mat.percentage} onChange={(e) => handleColorMaterialChange(phase, idx, 'percentage', Number(e.target.value))} className="w-full p-1.5 text-xs bg-white border border-gray-200 rounded focus:border-brand-500 outline-none text-center" step="0.01" /></div>
                        <div className="col-span-1 flex justify-center"><button onClick={() => removeColorMaterial(phase, idx)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button></div>
                      </div>
                    ))}
                    <button onClick={() => addColorMaterial(phase)} className={`w-full py-1.5 border border-dashed ${btnColor} rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-colors`}><Plus size={10} /> {t('editor.addMaterial')}</button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Corrections - manufacturing only */}
        {yieldMode === 'manufacturing' && (
          <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <SectionTitle title={t('editor.corrections')} icon={<Wrench size={16} />} />
            {getBatchSizeInGrams(activeLot) > 0 ? (
              <div className="mb-3 px-2 py-1.5 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-[10px] text-green-700">
                <Calculator size={10} />
                <span className="font-semibold">{t('editor.batchSizeRef')}: {(activeLot.yield.planned || 0).toLocaleString()}{activeLot.yield.unit} ({getBatchSizeInGrams(activeLot).toLocaleString()}g)</span>
              </div>
            ) : (
              <div className="mb-3 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-md flex items-center gap-2 text-[10px] text-gray-400">
                <AlertCircle size={10} />
                <span>{t('editor.batchSizeNotSet')}</span>
              </div>
            )}
            <div className="space-y-3">
              {(activeLot.corrections || []).length > 0 && (
                <div className="grid grid-cols-12 gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center px-1">
                  <span className="col-span-2 text-left">{t('editor.correctionType')}</span><span className="col-span-2">{t('editor.materialCode')}</span><span className="col-span-2">{t('editor.materialName')}</span><span className="col-span-1">{t('editor.amount')}</span><span className="col-span-1">{t('editor.percentage')}</span><span className="col-span-3">{t('editor.memo')}</span><span className="col-span-1"></span>
                </div>
              )}
              {(activeLot.corrections || []).map((entry, idx) => (
                <div key={entry.id} className="grid grid-cols-12 gap-1 items-center bg-gray-50 p-1.5 rounded-lg border border-transparent hover:border-gray-200 hover:bg-white transition-all group">
                  <div className="col-span-2">
                    <select value={entry.type} onChange={(e) => handleCorrectionChange(idx, 'type', e.target.value)} className="w-full p-1.5 text-xs bg-white border border-gray-200 rounded focus:border-brand-500 outline-none">
                      {correctionTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2"><input type="text" value={entry.code} onChange={(e) => handleCorrectionChange(idx, 'code', e.target.value)} className="w-full p-1.5 text-xs bg-transparent border-b border-transparent focus:border-brand-500 outline-none font-mono" placeholder={t('editor.materialCode')} /></div>
                  <div className="col-span-2"><input type="text" value={entry.name} onChange={(e) => handleCorrectionChange(idx, 'name', e.target.value)} className="w-full p-1.5 text-xs bg-transparent border-b border-transparent focus:border-brand-500 outline-none" placeholder={t('editor.materialName')} /></div>
                  <div className="col-span-1"><input type="number" value={entry.amount} onChange={(e) => handleCorrectionChange(idx, 'amount', Number(e.target.value))} className="w-full p-1.5 text-xs bg-transparent border-b border-transparent focus:border-brand-500 outline-none text-center" step="0.01" /></div>
                  <div className="col-span-1"><input type="number" value={entry.percentage} onChange={(e) => handleCorrectionChange(idx, 'percentage', Number(e.target.value))} className="w-full p-1.5 text-xs bg-transparent border-b border-transparent focus:border-brand-500 outline-none text-center" step="0.01" /></div>
                  <div className="col-span-3"><input type="text" value={entry.memo} onChange={(e) => handleCorrectionChange(idx, 'memo', e.target.value)} className="w-full p-1.5 text-xs bg-transparent border-b border-transparent focus:border-brand-500 outline-none" placeholder={t('editor.memo')} /></div>
                  <div className="col-span-1 flex justify-center"><button onClick={() => removeCorrection(idx)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button></div>
                </div>
              ))}
              <button onClick={addCorrection} className="w-full py-2.5 border border-dashed border-gray-300 text-gray-400 rounded-lg hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all flex justify-center items-center gap-2 text-xs font-medium"><Plus size={14} /> {t('editor.addCorrection')}</button>
            </div>
          </section>
        )}

        {/* Yield */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
           <SectionTitle title={t('editor.yield')} />
           {yieldMode === 'manufacturing' ? (
             <div className="space-y-4">
               <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">{t('yield.planned')}</label>
                    <input type="number" value={activeLot.yield.planned || 0} onChange={(e) => updateActiveLot(lot => ({ ...lot, yield: { ...lot.yield, planned: Number(e.target.value) } }))} className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-brand-500 transition-colors" />
                  </div>
                  <div className="pb-3 text-gray-400"><ChevronRight size={16} /></div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">{t('yield.obtained')}</label>
                    <input type="number" value={activeLot.yield.obtained || 0} onChange={(e) => updateActiveLot(lot => ({ ...lot, yield: { ...lot.yield, obtained: Number(e.target.value) } }))} className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-brand-500 transition-colors" />
                  </div>
                  <div className="w-16">
                     <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Unit</label>
                     <input type="text" value={activeLot.yield.unit} onChange={(e) => updateActiveLot(lot => ({ ...lot, yield: { ...lot.yield, unit: e.target.value } }))} className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm text-center outline-none focus:border-brand-500 transition-colors" />
                  </div>
               </div>
               <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-indigo-400 mb-1 block uppercase flex items-center gap-1"><FlaskIcon /> {t('yield.samples')}</label>
                    <input type="number" value={activeLot.yield.samples || 0} onChange={(e) => updateActiveLot(lot => ({ ...lot, yield: { ...lot.yield, samples: Number(e.target.value) } }))} className="w-full p-2 bg-white border border-indigo-200 rounded text-sm outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div className="text-[10px] text-gray-400 pt-5">{t('editor.samplesNote').split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br/>}</span>)}</div>
               </div>
             </div>
           ) : (
             <div className="space-y-4">
               <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">{t('yield.usedBulk')}</label>
                    <div className="relative"><input type="number" value={activeLot.yield.used_bulk || 0} onChange={(e) => handlePackagingChange('used_bulk', Number(e.target.value))} className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-brand-500 transition-colors pl-8" /><span className="absolute left-3 top-2.5 text-gray-400 text-xs">kg</span></div>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">{t('yield.unitWeight')}</label>
                    <div className="relative"><input type="number" value={activeLot.yield.unit_weight || 0} onChange={(e) => handlePackagingChange('unit_weight', Number(e.target.value))} className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-brand-500 transition-colors pl-8" /><span className="absolute left-3 top-2.5 text-gray-400 text-xs">g</span></div>
                  </div>
               </div>
               <div className="flex items-center gap-2 text-[10px] text-gray-400"><Calculator size={10} /><span>{t('yield.theoreticalQty')} = (Bulk * 1000) / Unit Weight</span></div>
               <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">{t('yield.theoreticalQty')}</label>
                    <div className="relative"><input type="number" value={activeLot.yield.theoretical_qty || 0} onChange={(e) => handlePackagingChange('theoretical_qty', Number(e.target.value))} className="w-full p-2 bg-indigo-50 border border-indigo-200 rounded text-sm outline-none focus:border-brand-500 transition-colors pl-8" /><span className="absolute left-3 top-2.5 text-gray-400 text-xs">ea</span></div>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">{t('yield.actualQty')}</label>
                    <div className="relative"><input type="number" value={activeLot.yield.actual_qty || 0} onChange={(e) => handlePackagingChange('actual_qty', Number(e.target.value))} className="w-full p-2 bg-white border border-gray-300 ring-1 ring-gray-100 rounded text-sm outline-none focus:border-brand-500 transition-colors pl-8 font-bold text-brand-700" /><span className="absolute left-3 top-2.5 text-gray-400 text-xs">ea</span></div>
                  </div>
               </div>
               {lossData && (
                 <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 text-red-700"><AlertCircle size={14} /><span className="font-semibold">{t('editor.loss')}</span></div>
                    <div className="flex gap-4">
                       <div><span className="text-gray-500 mr-1">{t('editor.lossWeight')}:</span><span className="font-mono font-bold text-red-800">{lossData.lossKg.toFixed(2)}kg</span></div>
                       <div><span className="text-gray-500 mr-1">{t('editor.lossRate')}:</span><span className="font-mono font-bold text-red-800">{lossData.lossRate.toFixed(2)}%</span></div>
                    </div>
                 </div>
               )}
             </div>
           )}
        </section>

        {/* Photos */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{t('editor.photos')} ({data.images.length})</h3>
             <label className="cursor-pointer bg-brand-50 hover:bg-brand-100 text-brand-700 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors border border-brand-200"><Upload size={12} />{t('editor.addPhoto')}<input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" /></label>
          </div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg transition-all duration-200 p-3 ${isDragging ? 'border-brand-500 bg-brand-50 scale-[1.01]' : 'border-gray-200 bg-gray-50/50'}`}
          >
            {data.images.length === 0 ? (
              <div className="py-8 text-center">
                <Upload size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs text-gray-400">{isDragging ? t('editor.dropHere') : t('editor.dragOrClick')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {data.images.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shadow-sm">
                    <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => removeImage(idx)} className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors" title={t('editor.delete')}><Trash2 size={14} /></button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                      <span className="text-[9px] text-white font-bold">#{idx + 1}</span>
                    </div>
                  </div>
                ))}
                <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
                  <Plus size={20} className="text-gray-400 mb-1" />
                  <span className="text-[9px] text-gray-400 font-medium">{t('editor.photoAdd')}</span>
                  <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>
        </section>

        {/* Summary & Decision */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow group">
           <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
             <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{t('editor.result')}</h3>
           </div>
           <div className="mb-4">
             <label className="text-xs font-semibold text-gray-500 mb-2 block">{t('editor.finalDecision')}</label>
             <div className="flex gap-2">
               {[
                 { label: t('decision.pass'), value: '적합', icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200' },
                 { label: t('decision.conditionalPass'), value: '조건부 적합', icon: AlertTriangle, color: 'text-orange-600 bg-orange-50 border-orange-200' },
                 { label: t('decision.fail'), value: '부적합', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
                 { label: t('decision.hold'), value: '보류', icon: Clock, color: 'text-gray-600 bg-gray-50 border-gray-200' },
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
                <label className="text-xs font-semibold text-gray-500 mb-1 block">{t('editor.summaryInput')}</label>
                <textarea value={data.summary} onChange={(e) => handleTextChange('summary', e.target.value)} className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm leading-relaxed resize-none outline-none focus:bg-white focus:border-brand-500 transition-colors" placeholder={t('editor.summaryPlaceholder')} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">{t('editor.issuesInput')}</label>
                <textarea value={data.issues} onChange={(e) => handleTextChange('issues', e.target.value)} className="w-full h-20 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm leading-relaxed resize-none outline-none focus:bg-white focus:border-brand-500 transition-colors" placeholder={t('editor.issuesPlaceholder')} />
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
