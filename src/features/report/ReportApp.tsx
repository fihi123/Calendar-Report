import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ReportPreview from './components/ReportPreview';
import EditorPanel from './components/EditorPanel';
import { ReportData, ReportType } from './types';
import { Printer, Save, FileUp, Menu, X, RotateCcw, Languages } from 'lucide-react';
import { buildDefaultValueMap, type Lang } from './i18n';

interface CalendarLinkState {
  eventId?: string;
  date: string;
  title: string;
  type: 'manufacturing' | 'packaging';
  mode?: 'write' | 'view';
  memberName?: string;
  memberRole?: string;
}

const initialData: ReportData = {
  reportType: 'single-manufacturing',
  title: '시생산 결과 보고서',
  language: 'ko',
  date: new Date().toISOString().split('T')[0],
  info: [
    { id: '1', label: '제목', value: '' },
    { id: '2', label: '목적', value: '' },
    { id: '3', label: '참석자', value: '' },
    { id: '4', label: '설비 정보', value: '' },
    { id: '5', label: '벌크', value: '' },
    { id: '6', label: '부자재', value: '' },
  ],
  purpose: '',
  showChart: true,
  summary: '',
  decision: '적합',
  lots: [
    {
      id: '1',
      name: '',
      metrics: [],
      yield: {
        mode: 'manufacturing',
        planned: 0,
        obtained: 0,
        samples: 0,
        unit: 'kg',
        used_bulk: 0,
        unit_weight: 0,
        theoretical_qty: 0,
        actual_qty: 0,
      },
      colorMatching: { aqueous: [], oil: [] },
      corrections: [],
    },
  ],
  approvals: {
    drafter: { department: '', position: '', name: '', date: '' },
    reviewer: { department: '', position: '', name: '', date: '' },
    approver: { department: '공정개발팀', position: '본부장', name: '신병모', date: '' },
  },
  issues: '',
  conclusion: '',
  images: [],
};

const ReportApp: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<ReportData>(initialData);
  const [showEditor, setShowEditor] = useState(true);
  const [linkedEventId, setLinkedEventId] = useState<string | null>(null);
  const prevLangRef = useRef<Lang>(reportData.language || 'ko');

  // Translate known default data values when language changes
  useEffect(() => {
    const currentLang: Lang = reportData.language || 'ko';
    const prevLang = prevLangRef.current;
    if (currentLang === prevLang) return;
    prevLangRef.current = currentLang;

    const valMap = buildDefaultValueMap(prevLang, currentLang);
    const mapValue = (v: string) => valMap.get(v) ?? v;

    setReportData(prev => ({
      ...prev,
      title: mapValue(prev.title),
      purpose: mapValue(prev.purpose),
      summary: mapValue(prev.summary),
      issues: mapValue(prev.issues),
      info: prev.info.map(item => ({
        ...item,
        label: mapValue(item.label),
        value: mapValue(item.value),
      })),
      lots: prev.lots.map(lot => ({
        ...lot,
        metrics: lot.metrics.map(m => ({ ...m, name: mapValue(m.name) })),
      })),
      approvals: {
        drafter: { ...prev.approvals.drafter, department: mapValue(prev.approvals.drafter.department), position: mapValue(prev.approvals.drafter.position) },
        reviewer: { ...prev.approvals.reviewer, department: mapValue(prev.approvals.reviewer.department), position: mapValue(prev.approvals.reviewer.position) },
        approver: { ...prev.approvals.approver, department: mapValue(prev.approvals.approver.department), position: mapValue(prev.approvals.approver.position) },
      },
    }));
  }, [reportData.language]);

  // Feature 1: Pre-populate from calendar event or load saved report
  useEffect(() => {
    const state = location.state as CalendarLinkState | null;
    if (!state?.date || !state?.title) return;

    const reportType: ReportType = state.type === 'packaging'
      ? 'single-filling'
      : 'single-manufacturing';

    if (state.eventId) {
      setLinkedEventId(state.eventId);
    }

    // View mode: load saved report data from Firestore
    if (state.mode === 'view' && state.eventId) {
      const eventId = state.eventId;
      (async () => {
        try {
          const snap = await getDoc(doc(db, 'teamsync', 'reports', 'items', eventId));
          if (snap.exists()) {
            setReportData({ ...initialData, ...snap.data() as Partial<ReportData> });
            window.history.replaceState({}, document.title);
            return;
          }
        } catch {
          // Fallback: try localStorage
          try {
            const saved = localStorage.getItem(`teamsync-report-${eventId}`);
            if (saved) {
              setReportData({ ...initialData, ...JSON.parse(saved) });
              window.history.replaceState({}, document.title);
              return;
            }
          } catch { /* ignore */ }
        }

        // If no saved data found, fall through to write mode
        setReportData(prev => ({
          ...prev,
          date: state.date,
          reportType,
          info: prev.info.map(item => {
            if (item.label.includes('제목')) return { ...item, value: state.title };
            return item;
          }),
          approvals: {
            ...prev.approvals,
            drafter: {
              ...prev.approvals.drafter,
              department: '공정개발팀',
              name: state.memberName || prev.approvals.drafter.name,
              position: state.memberRole || prev.approvals.drafter.position,
              date: state.date,
            },
          },
        }));
        window.history.replaceState({}, document.title);
      })();
      return;
    }

    // Write mode: pre-populate from calendar event
    setReportData(prev => ({
      ...prev,
      date: state.date,
      reportType,
      info: prev.info.map(item => {
        if (item.label.includes('제품명') || item.label.includes('Product')) return { ...item, value: state.title };
        if (item.label.includes('작성자') || item.label.includes('Author')) return { ...item, value: state.memberName ? `${state.memberName} ${state.memberRole || ''}`.trim() : item.value };
        if (item.label.includes('부서') || item.label.includes('Department')) return { ...item, value: '공정개발팀' };
        return item;
      }),
      approvals: {
        ...prev.approvals,
        drafter: {
          ...prev.approvals.drafter,
          department: '공정개발팀',
          name: state.memberName || prev.approvals.drafter.name,
          position: state.memberRole || prev.approvals.drafter.position,
          date: state.date,
        },
      },
    }));

    window.history.replaceState({}, document.title);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleSave = useCallback(async () => {
    const dataStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${reportData.date}.json`;
    a.click();
    URL.revokeObjectURL(url);

    if (!linkedEventId) return;

    try {
      // Save report data to Firestore
      await setDoc(doc(db, 'teamsync', 'reports', 'items', linkedEventId), reportData);
      // Also save locally as fallback
      localStorage.setItem(`teamsync-report-${linkedEventId}`, dataStr);

      // Update completion records in Firestore
      const completedSnap = await getDoc(doc(db, 'teamsync', 'completed-reports'));
      const records: { eventId: string; decision: string; issues: string }[] =
        completedSnap.exists() ? (completedSnap.data().records || []) : [];

      const newRecord = {
        eventId: linkedEventId,
        decision: reportData.decision || '적합',
        issues: reportData.issues || '',
      };
      const existing = records.findIndex(r => r.eventId === linkedEventId);
      if (existing >= 0) {
        records[existing] = newRecord;
      } else {
        records.push(newRecord);
      }
      await setDoc(doc(db, 'teamsync', 'completed-reports'), { records }, { merge: true });
      localStorage.setItem('teamsync-completed-reports', JSON.stringify(records));
    } catch (err) {
      console.warn('Firestore save failed, data saved locally:', err);
    }

    navigate('/calendar');
  }, [reportData, linkedEventId, navigate]);



  const handleReset = useCallback(() => {
    if (confirm('보고서를 초기화하시겠습니까? 현재 작성된 내용이 모두 삭제됩니다.')) {
      setReportData({
        ...initialData,
        date: new Date().toISOString().split('T')[0],
      });
    }
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);

          if (!json.info && (json.author || json.department)) {
            json.info = [
              { id: '1', label: '부서', value: json.department || '' },
              { id: '2', label: '작성자', value: json.author || '' },
            ];
          }
          if (json.yield && !json.yield.mode) {
            json.yield = {
              mode: 'manufacturing',
              planned: json.yield.input || 0,
              obtained: json.yield.output || 0,
              samples: 0,
              unit: json.yield.unit || 'kg',
            };
          }
          if (!json.decision) {
            json.decision = '적합';
          }
          if (!json.lots && json.metrics) {
            json.lots = [{
              id: '1',
              name: 'Default',
              metrics: json.metrics,
              yield: json.yield || initialData.lots[0].yield,
            }];
            delete json.metrics;
            delete json.yield;
          }
          if (json.approvals && typeof json.approvals.drafter === 'string') {
            (['drafter', 'reviewer', 'approver'] as const).forEach(role => {
              json.approvals[role] = { department: '', position: '', name: json.approvals[role] || '', date: '' };
            });
          }
          if (!json.reportType) {
            json.reportType = 'single-manufacturing';
          }

          setReportData({ ...initialData, ...json });
        } catch {
          alert('파일 형식이 올바르지 않습니다.');
        }
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        setShowEditor(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handlePrint]);

  return (
    <div className="flex flex-col h-full overflow-hidden font-sans">
      {/* Toolbar */}
      <div className="h-11 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0 no-print select-none">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Smart Report System</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-gray-500 hover:text-brand-700 hover:bg-gray-100 px-2.5 py-1.5 rounded-md transition-all text-xs" title="Load JSON (Ctrl+O)">
            <FileUp size={14} />
            <span className="hidden sm:inline font-medium">Load</span>
            <input type="file" onChange={handleUpload} accept=".json" className="hidden" />
          </label>
          <button onClick={handleSave} className="flex items-center gap-1.5 text-gray-500 hover:text-brand-700 hover:bg-gray-100 px-2.5 py-1.5 rounded-md transition-all text-xs" title="Save JSON (Ctrl+S)">
            <Save size={14} />
            <span className="hidden sm:inline font-medium">Save</span>
          </button>
          <div className="h-5 w-px bg-gray-200 mx-0.5"></div>
          <button onClick={handleReset} className="flex items-center gap-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 px-2.5 py-1.5 rounded-md transition-all text-xs font-medium" title="초기화">
            <RotateCcw size={14} />
            <span className="hidden sm:inline">초기화</span>
          </button>
          <button
            onClick={() => setReportData(prev => ({ ...prev, language: prev.language === 'en' ? 'ko' : 'en' }))}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all text-xs font-bold border ${
              reportData.language === 'en'
                ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
            }`}
            title="한국어/English 전환"
          >
            <Languages size={14} />
            <span>{reportData.language === 'en' ? 'EN' : '한'}</span>
          </button>
          <div className="h-5 w-px bg-gray-200 mx-0.5"></div>
          <button onClick={() => setShowEditor(!showEditor)} className="flex items-center gap-1.5 text-gray-500 hover:text-brand-700 hover:bg-gray-100 px-2.5 py-1.5 rounded-md transition-all text-xs font-medium" title="Toggle Editor (Ctrl+E)">
            {showEditor ? <><X size={14} /> Close</> : <><Menu size={14} /> Editor</>}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 bg-brand-700 text-white hover:bg-brand-800 px-3 py-1.5 rounded-md transition-all text-xs font-bold shadow-sm" title="Print to PDF (Ctrl+P)">
            <Printer size={14} />
            <span className="hidden sm:inline">Print PDF</span>
          </button>
        </div>
      </div>

      {/* Main Content — side-by-side on desktop */}
      <div className="flex flex-1 overflow-hidden bg-slate-100 relative">
        {/* Report Preview — left side, fills remaining space */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start">
          <ReportPreview data={reportData} />
        </div>

        {/* Editor Panel — right side on desktop */}
        {/* Desktop (lg+): inline flex panel */}
        {showEditor && (
          <div className="hidden lg:flex w-[55%] min-w-[480px] max-w-[720px] border-l border-gray-200 bg-white no-print">
            <EditorPanel data={reportData} onChange={setReportData} />
          </div>
        )}

        {/* Mobile/Tablet: keep slide-over editor */}
        <div
          className={`
            lg:hidden fixed right-0 top-[calc(3.5rem+2.75rem)] bottom-0 w-full md:w-[500px] bg-white shadow-[0_0_40px_rgba(0,0,0,0.1)] z-20 transform transition-transform duration-300 ease-in-out no-print border-l border-gray-200
            ${showEditor ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          <EditorPanel data={reportData} onChange={setReportData} />
        </div>

        {showEditor && (
          <div
            className="fixed inset-0 bg-black/20 z-10 lg:hidden no-print top-[calc(3.5rem+2.75rem)]"
            onClick={() => setShowEditor(false)}
          ></div>
        )}
      </div>
    </div>
  );
};

export default ReportApp;
