import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
import { ReportData, getYieldMode, isMultiLot } from '../types';

export interface PdfHeaderInfo {
  title: string;
  department: string;
  date: string;
}

const HEADER_HEIGHT_MM = 18;

const renderHeaderImage = async (info: PdfHeaderInfo): Promise<string> => {
  const { default: html2canvas } = await import('html2canvas');

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:170mm;padding:0;background:white;';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1f2937;padding-bottom:6px;';

  const leftDiv = document.createElement('div');
  const h2 = document.createElement('h2');
  h2.textContent = `${info.title} - 상세 보고서`;
  h2.style.cssText = 'font-size:14px;font-weight:bold;color:#111827;margin:0;';
  const sub = document.createElement('p');
  sub.textContent = 'Detailed Inspection Report';
  sub.style.cssText = 'font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:2px 0 0;';
  leftDiv.appendChild(h2);
  leftDiv.appendChild(sub);

  const rightDiv = document.createElement('div');
  rightDiv.style.cssText = 'text-align:right;';
  const deptSpan = document.createElement('div');
  deptSpan.textContent = info.department;
  deptSpan.style.cssText = 'font-size:10px;font-weight:bold;color:#4b5563;';
  const dateSpan = document.createElement('div');
  dateSpan.textContent = info.date;
  dateSpan.style.cssText = 'font-size:8px;color:#9ca3af;';
  rightDiv.appendChild(deptSpan);
  rightDiv.appendChild(dateSpan);

  wrapper.appendChild(leftDiv);
  wrapper.appendChild(rightDiv);
  container.appendChild(wrapper);
  document.body.appendChild(container);

  const canvas = await html2canvas(container, { scale: 3, backgroundColor: '#ffffff', logging: false });
  document.body.removeChild(container);

  return canvas.toDataURL('image/png');
};

export const exportToPdf = async (filename?: string, headerInfo?: PdfHeaderInfo) => {
  const pages = document.querySelectorAll('.a4-screen');
  if (pages.length === 0) return;

  const wrapper = document.createElement('div');
  pages.forEach((page, index) => {
    const clone = page.cloneNode(true) as HTMLElement;
    if (index > 0) {
      clone.classList.add('pdf-page-break');
    }
    wrapper.appendChild(clone);
  });

  const topMargin = headerInfo ? HEADER_HEIGHT_MM : 0;

  const opt = {
    margin: [topMargin, 0, 0, 0] as [number, number, number, number],
    filename: filename || `report_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
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
      before: '.pdf-page-break',
    },
  };

  if (!headerInfo) {
    await html2pdf().set(opt).from(wrapper).save();
    return;
  }

  const headerDataUrl = await renderHeaderImage(headerInfo);

  const worker = html2pdf().set(opt).from(wrapper);
  const pdf = await worker.toPdf().get('pdf');

  const totalPages = pdf.internal.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const headerImgWidth = pageWidth - 40;
  const headerImgHeight = HEADER_HEIGHT_MM - 4;

  for (let i = 2; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.addImage(headerDataUrl, 'PNG', 20, 3, headerImgWidth, headerImgHeight);
  }

  pdf.save(opt.filename);
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
  (['drafter', 'reviewer', 'approver'] as const).forEach(role => {
    const label = role === 'drafter' ? '담당' : role === 'reviewer' ? '검토' : '승인';
    const entry = data.approvals[role];
    infoRows.push([`결재 - ${label}`, `${entry.department} ${entry.position} ${entry.name} (${entry.date || ''})`]);
  });
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
