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

export interface ColorMaterial {
  code: string;
  name: string;
  finalContent: number;
  formulation100: number;
  prescriptionContent: number;
}

export interface ColorMatchingData {
  aqueous: ColorMaterial[];
  oil: ColorMaterial[];
}

export interface CorrectionEntry {
  id: string;
  type: string;
  code: string;
  name: string;
  amount: number;
  percentage: number;
  memo: string;
}

export interface LotData {
  id: string;
  name: string;
  metrics: ProductionMetric[];
  yield: YieldData;
  colorMatching?: ColorMatchingData;
  corrections?: CorrectionEntry[];
}

export interface ApprovalEntry {
  department: string;
  position: string;
  name: string;
  date: string;
  signature?: string;
}

export interface ReportData {
  reportType: ReportType;
  title: string;
  date: string;
  language?: 'ko' | 'en';
  info: InfoItem[];
  purpose: string;
  showChart?: boolean;
  summary: string;
  decision?: string;
  lots: LotData[];
  approvals: {
    drafter: ApprovalEntry;
    reviewer: ApprovalEntry;
    approver: ApprovalEntry;
  };
  skipReviewer?: boolean;
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