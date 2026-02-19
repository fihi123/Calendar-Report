export interface ProductionMetric {
  name: string;
  min: number;
  max: number;
  actual: number;
  unit: string;
}

export interface InfoItem {
  id: string;
  label: string;
  value: string;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
}

export type YieldMode = 'manufacturing' | 'packaging';

export interface YieldData {
  mode: YieldMode;
  planned?: number;
  obtained?: number;
  samples?: number;
  used_bulk?: number;
  unit_weight?: number;
  theoretical_qty?: number;
  actual_qty?: number;
  unit: string;
}

export type ReportType =
  | 'single-manufacturing'
  | 'single-filling'
  | 'multi-manufacturing'
  | 'multi-filling';

export interface LotData {
  id: string;
  name: string;
  metrics: ProductionMetric[];
  yield: YieldData;
}

export interface ReportData {
  reportType: ReportType;
  title: string;
  date: string;
  info: InfoItem[];
  summary: string;
  decision?: string;
  lots: LotData[];
  approvals: {
    drafter: string;
    reviewer: string;
    approver: string;
  };
  issues: string;
  conclusion: string;
  images: string[];
}

export enum ReportStatus {
  DRAFT = '작성 중',
  REVIEW = '검토',
  FINAL = '완료'
}

export const isMultiLot = (type: ReportType): boolean =>
  type.startsWith('multi-');

export const getYieldMode = (type: ReportType): YieldMode =>
  type.endsWith('-filling') ? 'packaging' : 'manufacturing';