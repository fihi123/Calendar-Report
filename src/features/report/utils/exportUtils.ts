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

/**
 * Wrap all table-cell content in flex containers so html2canvas
 * reliably renders vertical + horizontal centering.
 * Skips cells whose closest <table> is .detail-table (layout wrapper).
 * Must be called AFTER the container is appended to the DOM
 * (getComputedStyle needs a live element).
 */
const fixCellAlignment = (root: HTMLElement) => {
  root.querySelectorAll('th, td').forEach(el => {
    const cell = el as HTMLElement;
    // Skip the detail-table layout wrapper cells (they hold entire sections)
    const parentTable = cell.closest('table');
    if (parentTable?.classList.contains('detail-table')) return;

    const computed = window.getComputedStyle(cell);
    const hAlign = computed.textAlign;

    cell.style.verticalAlign = 'middle';
    cell.style.textAlign = hAlign;

    // Wrap cell children in a flex container for reliable centering
    const inner = document.createElement('div');
    const justify = hAlign === 'center' ? 'center'
      : (hAlign === 'right' || hAlign === 'end') ? 'flex-end'
      : 'flex-start';
    inner.style.cssText = `display:flex;align-items:center;justify-content:${justify};width:100%;`;
    while (cell.firstChild) {
      inner.appendChild(cell.firstChild);
    }
    cell.appendChild(inner);
  });
};

export const exportToPdf = async (filename?: string, headerInfo?: PdfHeaderInfo) => {
  const allPages = document.querySelectorAll('.a4-screen');
  if (allPages.length === 0) return;

  const { default: html2canvas } = await import('html2canvas');
  const pdfFilename = filename || `report_${new Date().toISOString().split('T')[0]}.pdf`;

  // ─── 1. Render cover page separately via html2pdf → obtain jsPDF instance ───
  const coverClone = allPages[0].cloneNode(true) as HTMLElement;
  Object.assign(coverClone.style, {
    width: '170mm',
    minHeight: 'auto',
    height: '257mm',      // 297 − 20*2 (page margins)
    maxHeight: '257mm',
    overflow: 'hidden',
    padding: '10mm 0',
    margin: '0',
    background: 'white',
    boxShadow: 'none',
  });

  const coverOff = document.createElement('div');
  coverOff.style.cssText = 'position:fixed;left:-9999px;top:0;width:170mm;background:white;';
  coverOff.appendChild(coverClone);
  document.body.appendChild(coverOff);
  fixCellAlignment(coverOff);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf: any = await html2pdf()
    .set({
      margin: [20, 20, 20, 20] as [number, number, number, number],
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
    })
    .from(coverClone)
    .toPdf()
    .get('pdf');

  document.body.removeChild(coverOff);

  // Ensure cover is exactly 1 page (prevent spill-over from creating blank page)
  while (pdf.internal.getNumberOfPages() > 1) {
    pdf.deletePage(pdf.internal.getNumberOfPages());
  }

  // ─── 2. Render detail pages to canvas, then slice into PDF pages ───
  if (allPages.length > 1) {
    const detailWrapper = document.createElement('div');
    detailWrapper.style.cssText = 'width:170mm;background:white;';

    for (let i = 1; i < allPages.length; i++) {
      const clone = allPages[i].cloneNode(true) as HTMLElement;
      Object.assign(clone.style, {
        width: '100%',
        minHeight: 'auto',
        padding: '0',
        margin: '0',
        background: 'white',
        boxShadow: 'none',
      });
      // Hide print-only hidden elements (e.g. chart view toggle)
      clone.querySelectorAll('.print\\:hidden').forEach(el =>
        ((el as HTMLElement).style.display = 'none')
      );
      detailWrapper.appendChild(clone);
    }

    const detailOff = document.createElement('div');
    detailOff.style.cssText = 'position:fixed;left:-9999px;top:0;width:170mm;background:white;';
    detailOff.appendChild(detailWrapper);
    document.body.appendChild(detailOff);
    fixCellAlignment(detailOff);

    // Collect avoid-break zones (elements that should not be split across pages)
    const avoidEls = detailWrapper.querySelectorAll(
      '.print-break-inside-avoid, .report-table, .recharts-wrapper'
    );
    const wRect = detailWrapper.getBoundingClientRect();
    const avoidZones = wRect.height > 0
      ? Array.from(avoidEls)
          .map(el => {
            const r = (el as HTMLElement).getBoundingClientRect();
            return {
              top: (r.top - wRect.top) / wRect.height,
              bot: (r.bottom - wRect.top) / wRect.height,
            };
          })
          .filter(z => z.bot > z.top + 0.001)
      : [];

    // Render detail content to one continuous canvas
    const detailCanvas = await html2canvas(detailWrapper, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      letterRendering: true,
    });
    document.body.removeChild(detailOff);

    // Page geometry (mm)
    const pageW = pdf.internal.pageSize.getWidth();   // 210
    const pageH = pdf.internal.pageSize.getHeight();  // 297
    const mx = 20;                                     // horizontal margin
    const cw = pageW - mx * 2;                         // 170 content width
    const hdrTopM = headerInfo ? HEADER_HEIGHT_MM : 15; // top margin with header
    const firstTopM = 5;                                // first page: thead already provides header
    const botM = 10;

    // Image dimensions (mm)
    const imgW = cw;
    const imgH = (detailCanvas.height / detailCanvas.width) * imgW;

    // Prepare header image (for pages 2+ only)
    const hdrImg = headerInfo ? await renderHeaderImage(headerInfo) : null;
    const hdrH = HEADER_HEIGHT_MM - 4;

    // Slice canvas into pages with smart break-avoidance
    let remain = imgH;
    let srcY = 0;
    let isFirstSlice = true;

    while (remain > 0.5) {
      // First page: small top margin (thead is part of content)
      // Subsequent pages: larger top margin (header image added above)
      const topM = isFirstSlice ? firstTopM : hdrTopM;
      const slotH = pageH - topM - botM;

      let chunk = Math.min(remain, slotH);
      const startMm = imgH - remain;
      const cutRatio = (startMm + chunk) / imgH;

      // If the cut falls inside an avoid zone, move it before that zone
      for (const z of avoidZones) {
        if (cutRatio > z.top + 0.005 && cutRatio < z.bot - 0.005) {
          const safeChunk = z.top * imgH - startMm;
          if (safeChunk > slotH * 0.25) {
            chunk = safeChunk;
          }
          break;
        }
      }

      const chunkPx = Math.round((chunk / imgH) * detailCanvas.height);

      pdf.addPage();

      // Add header image only on pages 2+ (first page has its own thead header)
      if (hdrImg && !isFirstSlice) {
        pdf.addImage(hdrImg, 'PNG', mx, 3, cw, hdrH);
      }

      // Create canvas slice
      const slice = document.createElement('canvas');
      slice.width = detailCanvas.width;
      slice.height = Math.max(1, chunkPx);
      const ctx = slice.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(
        detailCanvas,
        0, srcY, detailCanvas.width, chunkPx,
        0, 0, slice.width, chunkPx,
      );

      pdf.addImage(slice.toDataURL('image/jpeg', 0.98), 'JPEG', mx, topM, imgW, chunk);

      srcY += chunkPx;
      remain -= chunk;
      isFirstSlice = false;
    }
  }

  pdf.save(pdfFilename);
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
