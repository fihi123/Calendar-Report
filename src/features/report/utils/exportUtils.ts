import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
import { ReportData, getYieldMode, isMultiLot } from '../types';

export const exportToPdf = async (filename?: string) => {
  const pages = document.querySelectorAll('.a4-screen');
  if (pages.length === 0) return;

  const wrapper = document.createElement('div');
  pages.forEach((page) => {
    const clone = page.cloneNode(true) as HTMLElement;
    wrapper.appendChild(clone);
  });

  const opt = {
    margin: 0,
    filename: filename || `report_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait' as const,
    },
    pagebreak: {
      mode: ['css', 'legacy'],
      before: '.a4-screen',
    },
  };

  await html2pdf().set(opt).from(wrapper).save();
};

export const exportToExcel = (data: ReportData) => {
  const wb = XLSX.utils.book_new();
  const yieldMode = getYieldMode(data.reportType);

  // Sheet 1: Report Info
  const infoRows: (string | number)[][] = [
    ['보고서 제목', data.title],
    ['작성일', data.date],
    ['보고서 유형', data.reportType],
    ['최종 판정', data.decision || ''],
    [],
    ['항목', '내용'],
  ];
  data.info.forEach((item) => {
    infoRows.push([item.label, item.value]);
  });
  infoRows.push([]);
  infoRows.push(['결재 - 담당', data.approvals.drafter]);
  infoRows.push(['결재 - 검토', data.approvals.reviewer]);
  infoRows.push(['결재 - 승인', data.approvals.approver]);
  infoRows.push([]);
  infoRows.push(['종합 의견', data.summary]);
  infoRows.push(['이슈 사항', data.issues]);
  if (data.conclusion) {
    infoRows.push(['결론', data.conclusion]);
  }

  const infoSheet = XLSX.utils.aoa_to_sheet(infoRows);
  infoSheet['!cols'] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, infoSheet, '보고서 정보');

  // One sheet per lot
  data.lots.forEach((lot, idx) => {
    const sheetName = isMultiLot(data.reportType)
      ? (lot.name || `Lot ${idx + 1}`)
      : '검사 데이터';

    const rows: (string | number)[][] = [
      ['항목명', 'Min', 'Max', '실측값', '단위', '판정'],
    ];

    lot.metrics.forEach((m) => {
      const hasSpec = m.min !== 0 || m.max !== 0;
      const isPass = hasSpec && m.actual >= m.min && m.actual <= m.max;
      rows.push([
        m.name,
        m.min,
        m.max,
        m.actual,
        m.unit,
        hasSpec ? (isPass ? 'PASS' : 'FAIL') : '-',
      ]);
    });

    rows.push([]);
    rows.push(['--- 수율 (Yield) ---', '', '', '', '', '']);

    if (yieldMode === 'manufacturing') {
      rows.push(['지시량 (Planned)', lot.yield.planned || 0, '', '', lot.yield.unit, '']);
      rows.push(['수득량 (Obtained)', lot.yield.obtained || 0, '', '', lot.yield.unit, '']);
      rows.push(['샘플 (Samples)', lot.yield.samples || 0, '', '', lot.yield.unit, '']);
      const planned = lot.yield.planned || 0;
      const obtained = lot.yield.obtained || 0;
      const samples = lot.yield.samples || 0;
      const yieldRate = planned > 0 ? (((obtained + samples) / planned) * 100).toFixed(1) : '0.0';
      rows.push(['수율 (%)', `${yieldRate}%`, '', '', '', '']);
    } else {
      rows.push(['사용된 벌크 (kg)', lot.yield.used_bulk || 0, '', '', '', '']);
      rows.push(['개당 충진량 (g)', lot.yield.unit_weight || 0, '', '', '', '']);
      rows.push(['이론 수량 (ea)', lot.yield.theoretical_qty || 0, '', '', '', '']);
      rows.push(['실제 수량 (ea)', lot.yield.actual_qty || 0, '', '', '', '']);
      const theo = lot.yield.theoretical_qty || 0;
      const actual = lot.yield.actual_qty || 0;
      const yieldRate = theo > 0 ? ((actual / theo) * 100).toFixed(1) : '0.0';
      rows.push(['수율 (%)', `${yieldRate}%`, '', '', '', '']);
    }

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = [
      { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, sheet, sheetName.substring(0, 31));
  });

  const outputFilename = `report_${data.date || 'export'}.xlsx`;
  XLSX.writeFile(wb, outputFilename);
};
