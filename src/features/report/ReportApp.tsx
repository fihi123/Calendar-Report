import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import ReportPreview from './components/ReportPreview';
import EditorPanel from './components/EditorPanel';
import { ReportData, ReportType } from './types';
import { Printer, Save, FileUp, Menu, X, FileDown, Table, RotateCcw } from 'lucide-react';
import { exportToPdf, exportToExcel } from './utils/exportUtils';

interface CalendarLinkState {
  date: string;
  title: string;
  type: 'manufacturing' | 'packaging';
}

const initialData: ReportData = {
  reportType: 'single-manufacturing',
  title: '시생산/품질 검사 보고서',
  date: new Date().toISOString().split('T')[0],
  info: [
    { id: '1', label: '부서', value: '품질보증팀' },
    { id: '2', label: '작성자', value: '김철수 책임' },
    { id: '3', label: 'LOT No.', value: '2025-BATCH-001' },
    { id: '4', label: '제품명', value: '하이드라 세럼' },
    { id: '5', label: '문서 ID', value: 'SRS-000001' },
  ],
  summary: '금일 시생산 결과 전반적인 물성 양호하며 목표 수율 달성함.',
  decision: '적합',
  lots: [
    {
      id: '1',
      name: 'Default',
      metrics: [
        { name: '충진 중량', min: 14.5, max: 15.5, actual: 15.1, unit: 'g' },
        { name: '캡 토크', min: 5.0, max: 8.0, actual: 6.5, unit: 'kgf' },
        { name: 'pH', min: 4.5, max: 6.5, actual: 5.2, unit: '' },
        { name: '점도', min: 3000, max: 5000, actual: 4120, unit: 'cps' },
      ],
      yield: {
        mode: 'manufacturing',
        planned: 1000,
        obtained: 975,
        samples: 15,
        unit: 'kg',
        used_bulk: 100,
        unit_weight: 50,
        theoretical_qty: 2000,
        actual_qty: 1985,
      },
    },
  ],
  approvals: {
    drafter: { department: '품질보증팀', position: '책임', name: '김철수', date: new Date().toISOString().split('T')[0] },
    reviewer: { department: '품질보증팀', position: '수석', name: '이영희', date: '' },
    approver: { department: '품질보증팀', position: '팀장', name: '박부장', date: '' },
  },
  issues: '- 포장 라인 초기 세팅 시간 지연 (15분)\n- 2호기 노즐 압력 미세 조정 완료',
  conclusion: '',
  images: [],
};

const ReportApp: React.FC = () => {
  const location = useLocation();
  const [reportData, setReportData] = useState<ReportData>(initialData);
  const [showEditor, setShowEditor] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Feature 1: Pre-populate from calendar event
  useEffect(() => {
    const state = location.state as CalendarLinkState | null;
    if (state?.date && state?.title) {
      const reportType: ReportType = state.type === 'packaging'
        ? 'single-filling'
        : 'single-manufacturing';

      setReportData(prev => ({
        ...prev,
        date: state.date,
        reportType,
        info: prev.info.map(item =>
          item.label.includes('제품명') ? { ...item, value: state.title } : item
        ),
      }));

      window.history.replaceState({}, document.title);
    }
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleSave = useCallback(() => {
    const dataStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${reportData.date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [reportData]);

  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      const department = reportData.info.find(i => i.label.includes('부서'))?.value || '';
      const dateStr = new Date(reportData.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
      await exportToPdf(`report_${reportData.date}.pdf`, {
        title: reportData.title,
        department,
        date: dateStr,
      });
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF 내보내기에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  }, [reportData]);

  const handleExportExcel = useCallback(() => {
    try {
      exportToExcel(reportData);
    } catch (err) {
      console.error('Excel export failed:', err);
      alert('엑셀 내보내기에 실패했습니다.');
    }
  }, [reportData]);

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
          <div className="h-5 w-px bg-gray-200 mx-0.5"></div>
          <button onClick={() => setShowEditor(!showEditor)} className="flex items-center gap-1.5 text-gray-500 hover:text-brand-700 hover:bg-gray-100 px-2.5 py-1.5 rounded-md transition-all text-xs font-medium" title="Toggle Editor (Ctrl+E)">
            {showEditor ? <><X size={14} /> Close</> : <><Menu size={14} /> Editor</>}
          </button>
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center gap-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-md transition-all text-xs font-medium"
            title="PDF로 저장"
          >
            <FileDown size={14} />
            <span className="hidden sm:inline">{isExporting ? '변환 중...' : 'PDF 저장'}</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 px-2.5 py-1.5 rounded-md transition-all text-xs font-medium"
            title="엑셀로 다운로드"
          >
            <Table size={14} />
            <span className="hidden sm:inline">엑셀</span>
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 bg-brand-700 text-white hover:bg-brand-800 px-3 py-1.5 rounded-md transition-all text-xs font-bold shadow-sm" title="Print to PDF (Ctrl+P)">
            <Printer size={14} />
            <span className="hidden sm:inline">Print PDF</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden bg-slate-100 relative">
        <div className="flex-1 overflow-y-auto p-6 md:p-12 flex justify-center items-start">
          <ReportPreview data={reportData} />
        </div>

        {/* Editor Sidebar */}
        <div
          className={`
            fixed right-0 top-[calc(3.5rem+2.75rem)] bottom-0 w-full md:w-[500px] bg-white shadow-[0_0_40px_rgba(0,0,0,0.1)] z-20 transform transition-transform duration-300 ease-in-out no-print border-l border-gray-200
            ${showEditor ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          <EditorPanel data={reportData} onChange={setReportData} />
        </div>

        {showEditor && (
          <div
            className="fixed inset-0 bg-black/20 z-10 md:hidden no-print top-[calc(3.5rem+2.75rem)]"
            onClick={() => setShowEditor(false)}
          ></div>
        )}
      </div>
    </div>
  );
};

export default ReportApp;
