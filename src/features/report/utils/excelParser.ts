import * as XLSX from 'xlsx';
import { ProductionMetric, ReportType, LotData, getYieldMode } from '../types';

export interface ExcelParseResult {
  reportType?: ReportType;
  lots: LotData[];
}

const detectReportType = (workbook: XLSX.WorkBook): ReportType | undefined => {
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

  if (jsonData.length > 0) {
    const headers = jsonData[0].map((h: any) => String(h || '').trim().toLowerCase());
    const typeIdx = headers.findIndex((h: string) => h === 'type');
    if (typeIdx >= 0 && jsonData.length > 1) {
      const typeValue = String(jsonData[1][typeIdx] || '').trim().toLowerCase();
      const mapping: Record<string, ReportType> = {
        'single-manufacturing': 'single-manufacturing',
        'single-filling': 'single-filling',
        'multi-manufacturing': 'multi-manufacturing',
        'multi-filling': 'multi-filling',
      };
      return mapping[typeValue];
    }
  }
  return undefined;
};

const parseSheetMetrics = (jsonData: any[][], headers: string[], skipColIdx: number): ProductionMetric[] => {
  const metrics: ProductionMetric[] = [];

  const isSummaryMode = headers.some(h =>
    ['항목', '항목명', 'item', 'name'].includes(h.toLowerCase()) &&
    (headers.some(sub => ['min', '최소', '하한'].includes(sub.toLowerCase())) ||
     headers.some(sub => ['actual', '실측', '결과'].includes(sub.toLowerCase())))
  );

  if (isSummaryMode) {
    const getIdx = (keywords: string[]) => headers.findIndex(h => keywords.includes(h.toLowerCase()));
    const nameIdx = getIdx(['항목', '항목명', 'item', 'name', 'test item']);
    const minIdx = getIdx(['min', '최소', '하한', 'spec min']);
    const maxIdx = getIdx(['max', '최대', '상한', 'spec max']);
    const actIdx = getIdx(['actual', '실측', '실측값', 'result', '결과']);
    const unitIdx = getIdx(['unit', '단위']);

    for (let r = 1; r < jsonData.length; r++) {
      const row = jsonData[r];
      if (!row || row.length === 0) continue;
      const rawName = nameIdx >= 0 ? row[nameIdx] : (row[0] || `Item ${r}`);
      if (!rawName) continue;
      metrics.push({
        name: rawName,
        min: minIdx >= 0 ? parseFloat(row[minIdx]) || 0 : 0,
        max: maxIdx >= 0 ? parseFloat(row[maxIdx]) || 0 : 0,
        actual: actIdx >= 0 ? parseFloat(row[actIdx]) || 0 : 0,
        unit: unitIdx >= 0 ? (row[unitIdx] || '') : '',
      });
    }
  } else {
    headers.forEach((header, colIndex) => {
      if (!header || header === '' || colIndex === skipColIdx) return;
      if (header.startsWith('(') && header.endsWith(')')) return;

      let sum = 0, count = 0;
      for (let r = 1; r < jsonData.length; r++) {
        const row = jsonData[r];
        if (row[colIndex] !== undefined) {
          const val = parseFloat(row[colIndex]);
          if (!isNaN(val)) { sum += val; count++; }
        }
      }

      let unit = '';
      const lh = header.toLowerCase();
      if (lh.includes('weight') || lh.includes('중량')) unit = 'g';
      else if (lh.includes('torque') || lh.includes('토크')) unit = 'kgf';
      else if (lh.includes('ph')) unit = 'pH';
      else if (lh.includes('viscosity') || lh.includes('점도')) unit = 'cps';
      else if (lh.includes('temp') || lh.includes('온도')) unit = '℃';

      metrics.push({
        name: header,
        min: 0, max: 0,
        actual: count > 0 ? parseFloat((sum / count).toFixed(2)) : 0,
        unit,
      });
    });
  }

  return metrics;
};

export const parseExcelToLots = async (file: File): Promise<ExcelParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const reportType = detectReportType(workbook);
        const sheetNames = workbook.SheetNames;
        const isMultiSheet = sheetNames.length > 1;

        const lots: LotData[] = [];

        sheetNames.forEach((sheetName, sheetIndex) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          if (jsonData.length < 1) return;

          const headers = jsonData[0].map((h: any) => String(h || '').trim());
          const typeColIdx = headers.findIndex(h => h.toLowerCase() === 'type');

          const metrics = parseSheetMetrics(jsonData, headers, typeColIdx);

          const yieldMode = reportType ? getYieldMode(reportType) : 'manufacturing';

          lots.push({
            id: String(sheetIndex + 1),
            name: isMultiSheet ? sheetName : 'Default',
            metrics,
            yield: {
              mode: yieldMode,
              planned: 0, obtained: 0, samples: 0, unit: 'kg',
              used_bulk: 0, unit_weight: 0, theoretical_qty: 0, actual_qty: 0,
            },
          });
        });

        resolve({ reportType, lots });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const parseExcelMetrics = async (file: File): Promise<ProductionMetric[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        let allMetrics: ProductionMetric[] = [];
        const sheetNames = workbook.SheetNames;
        const isMultiSheet = sheetNames.length > 1;

        sheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          if (jsonData.length < 1) return;

          const headers = jsonData[0].map(h => String(h).trim());

          const isSummaryMode = headers.some(h =>
            ['항목', '항목명', 'item', 'name'].includes(h.toLowerCase()) &&
            (headers.some(sub => ['min', '최소', '하한'].includes(sub.toLowerCase())) ||
             headers.some(sub => ['actual', '실측', '결과'].includes(sub.toLowerCase())))
          );

          const sheetMetrics: ProductionMetric[] = [];

          if (isSummaryMode) {
            const getIdx = (keywords: string[]) => headers.findIndex(h => keywords.includes(h.toLowerCase()));

            const nameIdx = getIdx(['항목', '항목명', 'item', 'name', 'test item']);
            const minIdx = getIdx(['min', '최소', '하한', 'spec min']);
            const maxIdx = getIdx(['max', '최대', '상한', 'spec max']);
            const actIdx = getIdx(['actual', '실측', '실측값', 'result', '결과']);
            const unitIdx = getIdx(['unit', '단위']);

            for (let r = 1; r < jsonData.length; r++) {
              const row = jsonData[r];
              if (!row || row.length === 0) continue;

              const rawName = nameIdx >= 0 ? row[nameIdx] : (row[0] || `Item ${r}`);
              if (!rawName) continue;

              const name = rawName;
              const min = minIdx >= 0 ? parseFloat(row[minIdx]) || 0 : 0;
              const max = maxIdx >= 0 ? parseFloat(row[maxIdx]) || 0 : 0;
              const actual = actIdx >= 0 ? parseFloat(row[actIdx]) || 0 : 0;
              const unit = unitIdx >= 0 ? (row[unitIdx] || '') : '';

              sheetMetrics.push({ name, min, max, actual, unit });
            }
          } else {
            headers.forEach((header: string, colIndex: number) => {
              if (!header || header === '') return;
              if (header.startsWith('(') && header.endsWith(')')) return;

              let sum = 0;
              let count = 0;

              for (let r = 1; r < jsonData.length; r++) {
                const row = jsonData[r];
                if (row[colIndex] !== undefined) {
                  const val = parseFloat(row[colIndex]);
                  if (!isNaN(val)) {
                    sum += val;
                    count++;
                  }
                }
              }

              const avgValue = count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;

              let unit = '';
              const lowerHeader = header.toLowerCase();
              if (lowerHeader.includes('weight') || lowerHeader.includes('중량')) unit = 'g';
              else if (lowerHeader.includes('torque') || lowerHeader.includes('토크')) unit = 'kgf';
              else if (lowerHeader.includes('ph')) unit = 'pH';
              else if (lowerHeader.includes('viscosity') || lowerHeader.includes('점도')) unit = 'cps';
              else if (lowerHeader.includes('temp') || lowerHeader.includes('온도')) unit = '℃';

              sheetMetrics.push({
                name: header,
                min: 0,
                max: 0,
                actual: avgValue,
                unit: unit
              });
            });
          }

          if (isMultiSheet) {
            sheetMetrics.forEach(m => {
              if (!m.name.startsWith('[')) {
                m.name = `[${sheetName}] ${m.name}`;
              }
            });
          }

          allMetrics = [...allMetrics, ...sheetMetrics];
        });

        resolve(allMetrics);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const downloadTemplate = (type: 'raw' | 'summary' | 'multi_sheet') => {
  const wb = XLSX.utils.book_new();

  if (type === 'multi_sheet') {
    const headers = ["충진 중량(g)", "캡 토크(kgf)", "pH", "점도(cps)"];
    const ws1 = XLSX.utils.aoa_to_sheet([headers, [15.1, 7.5, 5.2, 4000], [15.0, 7.8, 5.25, 4100]]);
    XLSX.utils.book_append_sheet(wb, ws1, "21호");
    const ws2 = XLSX.utils.aoa_to_sheet([headers, [15.3, 7.2, 5.1, 4200], [15.4, 7.3, 5.15, 4250]]);
    XLSX.utils.book_append_sheet(wb, ws2, "23호");
    XLSX.writeFile(wb, 'SRS_Template_Multi_Shade.xlsx');
  } else if (type === 'raw') {
    const ws = XLSX.utils.aoa_to_sheet([
      ["충진 중량(g)", "캡 토크(kgf)", "pH", "점도(cps)"],
      [15.1, 7.5, 5.2, 4000], [15.0, 7.8, 5.25, 4100], [15.2, 7.6, 5.18, 3950],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, 'SRS_Template_Raw_Data.xlsx');
  } else {
    const ws = XLSX.utils.aoa_to_sheet([
      ["항목명", "Min", "Max", "실측값", "단위"],
      ["pH", 4.0, 6.0, 5.12, "pH"], ["점도", 3000, 5000, 4200, "cps"], ["비중", 0.98, 1.02, 1.00, ""],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Summary");
    XLSX.writeFile(wb, 'SRS_Template_Summary_List.xlsx');
  }
};

export const downloadFullTemplate = (reportType: ReportType) => {
  const wb = XLSX.utils.book_new();
  const isMulti = reportType.startsWith('multi-');
  const isFilling = reportType.endsWith('-filling');
  const typeValue = reportType;

  if (isMulti) {
    const headers = ["Type", "항목명", "Min", "Max", "실측값", "단위"];
    if (isFilling) {
      const ws1 = XLSX.utils.aoa_to_sheet([headers, [typeValue, "충진 중량", 14.5, 15.5, 15.1, "g"], ["", "캡 토크", 5.0, 8.0, 6.5, "kgf"], ["", "기밀", 0, 0, 0, "Pass/Fail"]]);
      XLSX.utils.book_append_sheet(wb, ws1, "21호");
      const ws2 = XLSX.utils.aoa_to_sheet([["항목명", "Min", "Max", "실측값", "단위"], ["충진 중량", 14.5, 15.5, 15.3, "g"], ["캡 토크", 5.0, 8.0, 7.0, "kgf"], ["기밀", 0, 0, 0, "Pass/Fail"]]);
      XLSX.utils.book_append_sheet(wb, ws2, "23호");
      XLSX.writeFile(wb, 'SRS_Full_Multi_Filling.xlsx');
    } else {
      const ws1 = XLSX.utils.aoa_to_sheet([headers, [typeValue, "pH", 4.0, 6.0, 5.12, ""], ["", "점도", 3000, 5000, 4200, "cps"], ["", "비중", 0.98, 1.02, 1.00, ""]]);
      XLSX.utils.book_append_sheet(wb, ws1, "21호");
      const ws2 = XLSX.utils.aoa_to_sheet([["항목명", "Min", "Max", "실측값", "단위"], ["pH", 4.0, 6.0, 5.20, ""], ["점도", 3000, 5000, 4350, "cps"], ["비중", 0.98, 1.02, 1.01, ""]]);
      XLSX.utils.book_append_sheet(wb, ws2, "23호");
      XLSX.writeFile(wb, 'SRS_Full_Multi_Manufacturing.xlsx');
    }
  } else {
    const headers = ["Type", "항목명", "Min", "Max", "실측값", "단위"];
    if (isFilling) {
      const ws = XLSX.utils.aoa_to_sheet([headers, [typeValue, "충진 중량", 14.5, 15.5, 15.1, "g"], ["", "캡 토크", 5.0, 8.0, 6.5, "kgf"], ["", "기밀", 0, 0, 0, "Pass/Fail"], ["", "외관", 0, 0, 0, "Pass/Fail"]]);
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      XLSX.writeFile(wb, 'SRS_Full_Single_Filling.xlsx');
    } else {
      const ws = XLSX.utils.aoa_to_sheet([headers, [typeValue, "pH", 4.5, 6.5, 5.2, ""], ["", "점도", 3000, 5000, 4120, "cps"], ["", "비중", 0.98, 1.02, 1.00, ""], ["", "색차", 0, 3.0, 1.5, "ΔE"]]);
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      XLSX.writeFile(wb, 'SRS_Full_Single_Manufacturing.xlsx');
    }
  }
};