export type Lang = 'ko' | 'en';

const translations: Record<Lang, Record<string, string>> = {
  ko: {
    // Cover
    'cover.subtitle.single-manufacturing': '단일 제조 보고서',
    'cover.subtitle.single-filling': '단일 충진포장 보고서',
    'cover.subtitle.multi-manufacturing': '다중호수 제조 보고서',
    'cover.subtitle.multi-filling': '다중호수 충진포장 보고서',
    'cover.date': '작성일',
    'cover.approval': '결재',
    'cover.drafter': '담 당',
    'cover.reviewer': '검 토',
    'cover.approver': '승 인',

    // Detail page
    'detail.suffix': '- 상세 보고서',
    'detail.subtitle': '세부 검사 보고서',
    'section.overview': '1. 개요',
    'section.inspection': '2. 품질 검사 및 생산 지표',
    'section.summary': '3. 종합 의견',
    'section.photos': '4. 현장 사진',

    // Table headers
    'table.item': '항목',
    'table.spec': '규격',
    'table.actual': '실측',
    'table.distribution': '분포도',
    'table.result': '판정',

    // Yield - manufacturing
    'yield.planned': '지시량',
    'yield.obtained': '수득량',
    'yield.samples': '유관부서 전달',
    'yield.total': '총 생산량',
    'yield.rate': '수율',
    // Yield - packaging
    'yield.usedBulk': '사용된 벌크',
    'yield.unitWeight': '개당 충진량',
    'yield.theoreticalQty': '이론 수량',
    'yield.actualQty': '실제 수량',
    'yield.finalYield': '최종 수율',
    'yield.lossAnalysis': '손실 분석',
    'yield.lossWeight': '손실 중량',
    'yield.lossRate': '손실률',
    'yield.aggregate': '통합 수율',

    // Decision
    'decision.pass': '적합',
    'decision.conditionalPass': '조건부 적합',
    'decision.fail': '부적합',
    'decision.hold': '보류',

    // Summary
    'summary.executive': '종합 요약',
    'summary.issues': '이슈 및 특이사항',
    'summary.noContent': '내용 없음',
    'summary.noIssues': '특이사항 없음',

    // Photos
    'photos.none': '첨부된 사진이 없습니다.',
    'photos.figure': '그림',

    // Footer
    'footer.confidential': '기밀 문서 | 무단 복제 금지',

    // Metrics
    'metrics.noData': '등록된 데이터가 없습니다.',
    'metrics.commonOther': '공통 / 기타',

    // Editor
    'editor.reportType': '보고서 유형',
    'editor.singleMfg': '단일 제조',
    'editor.singleFill': '단일 충진포장',
    'editor.multiMfg': '다중호수 제조',
    'editor.multiFill': '다중호수 충진포장',
    'editor.excelImport': '엑셀 가져오기',
    'editor.templateDownload': '양식 다운로드',
    'editor.lotManagement': '호수 관리',
    'editor.lotAdd': '호수 추가',
    'editor.lotName': '호수명',
    'editor.basicInfo': '기본 정보',
    'editor.title': '보고서 제목',
    'editor.detailItems': '상세 항목 (목록 편집 가능)',
    'editor.itemName': '항목명',
    'editor.content': '내용',
    'editor.addItem': '항목 추가',
    'editor.approvalLine': '결재 라인',
    'editor.drafter': '담당',
    'editor.reviewer': '검토',
    'editor.approver': '승인',
    'editor.dept': '부서',
    'editor.position': '직급',
    'editor.name': '이름',
    'editor.metrics': '검사 항목',
    'editor.addMetric': '항목 추가',
    'editor.yield': '수율',
    'editor.photos': '현장 사진',
    'editor.addPhoto': '사진 추가',
    'editor.photoAdd': '추가',
    'editor.dragOrClick': '사진을 드래그하거나 위 버튼을 클릭하세요',
    'editor.dropHere': '여기에 놓으세요!',
    'editor.delete': '삭제',
    'editor.result': '종합 결과',
    'editor.finalDecision': '최종 판정',
    'editor.summaryInput': '종합 의견',
    'editor.summaryPlaceholder': '종합 의견을 입력하세요...',
    'editor.issuesInput': '이슈 및 특이사항',
    'editor.issuesPlaceholder': '특이사항을 입력하세요...',
    'editor.samplesNote': '연구소, 품질, 영업팀 등으로 전달된 샘플 물량은\n생산 실적(수율)에 포함됩니다.',
    'editor.loss': '예상 손실',
    'editor.lossWeight': '중량',
    'editor.lossRate': '손실률',
    'editor.overwriteConfirm': '현재 입력된 항목들을 삭제하고 덮어쓰시겠습니까?\n(취소 시 기존 항목 뒤에 추가됩니다)',
    'editor.fullOverwriteConfirm': '엑셀 데이터로 전체 보고서를 덮어쓰시겠습니까?',
    'editor.parseError': '데이터를 인식할 수 없습니다. 양식을 확인해주세요.',
    'editor.excelError': '엑셀 파일 읽기 실패',
    'editor.excelUpload': '엑셀 업로드',
    'editor.rawTemplate': '기본 양식 (Raw Data)',
    'editor.rawTemplateDesc': '단일 품목, 평균 자동 계산',
    'editor.multiSheetTemplate': '다중 호수/품목 (Multi-Sheet)',
    'editor.multiSheetTemplateDesc': '시트별로 21호, 23호 구분',
    'editor.summaryTemplate': '요약 양식 (Summary)',
    'editor.summaryTemplateDesc': '결과값 직접 입력 리스트',
    'editor.singleMfgDesc': '단일 품목 제조 검사 양식',
    'editor.singleFillDesc': '단일 품목 충진/포장 양식',
    'editor.multiMfgDesc': '호수별 시트 (21호, 23호...)',
    'editor.multiFillDesc': '호수별 시트 충진/포장 양식',
    'editor.lotNamePlaceholder': '예: 21호',

    // Default data values
    'default.title': '시생산 결과 보고서',
    'default.label.department': '부서',
    'default.label.author': '작성자',
    'default.label.lotNo': 'LOT No.',
    'default.label.product': '제품명',
    'default.label.docId': '문서 ID',
    'default.dept.process': '공정개발팀',
    'default.position.manager': '책임',
    'default.position.senior': '수석',
    'default.position.teamLead': '팀장',
    'default.summary': '금일 시생산 결과 전반적인 물성 양호하며 목표 수율 달성함.',
    'default.issues': '- 포장 라인 초기 세팅 시간 지연 (15분)\n- 2호기 노즐 압력 미세 조정 완료',
    'default.metric.fillWeight': '충진 중량',
    'default.metric.capTorque': '캡 토크',
    'default.metric.viscosity': '점도',

    // Color Matching & Corrections
    'section.colorMatching': '조색 기록',
    'section.corrections': '보정 원료 기록',
    'editor.colorMatching': '조색 기록',
    'editor.aqueous': '수상 색소',
    'editor.oil': '유상 색소',
    'editor.materialCode': '원료 코드',
    'editor.materialName': '원료명',
    'editor.amount': '투입량(g)',
    'editor.percentage': '함량(%)',
    'editor.addMaterial': '원료 추가',
    'editor.corrections': '보정 원료',
    'editor.addCorrection': '보정 추가',
    'editor.correctionType': '보정 유형',
    'editor.memo': '메모',
    'editor.correctionTypes.viscosity': '점도',
    'editor.correctionTypes.hardness': '경도',
    'editor.correctionTypes.ph': 'pH',
    'editor.correctionTypes.color': '색상',
    'editor.correctionTypes.other': '기타',
    'editor.batchSizeRef': '지시량 기준',
    'editor.batchSizeNotSet': '수율 섹션에서 지시량을 입력하면 자동 계산됩니다.',
  },
  en: {
    // Cover
    'cover.subtitle.single-manufacturing': 'Single Product Manufacturing Report',
    'cover.subtitle.single-filling': 'Single Product Filling/Packaging Report',
    'cover.subtitle.multi-manufacturing': 'Multi-Lot Manufacturing Report',
    'cover.subtitle.multi-filling': 'Multi-Lot Filling/Packaging Report',
    'cover.date': 'Date',
    'cover.approval': 'Approval',
    'cover.drafter': 'Drafter',
    'cover.reviewer': 'Reviewer',
    'cover.approver': 'Approver',

    // Detail page
    'detail.suffix': '- Detailed Report',
    'detail.subtitle': 'Detailed Inspection Report',
    'section.overview': '1. Overview',
    'section.inspection': '2. Inspection Data & Production Metrics',
    'section.summary': '3. Summary & Opinion',
    'section.photos': '4. Site Photos',

    // Table headers
    'table.item': 'Item',
    'table.spec': 'Spec',
    'table.actual': 'Actual',
    'table.distribution': 'Distribution',
    'table.result': 'Result',

    // Yield - manufacturing
    'yield.planned': 'Planned',
    'yield.obtained': 'Obtained',
    'yield.samples': 'Samples',
    'yield.total': 'Total Output',
    'yield.rate': 'Yield',
    // Yield - packaging
    'yield.usedBulk': 'Used Bulk',
    'yield.unitWeight': 'Unit Weight',
    'yield.theoreticalQty': 'Theoretical Qty',
    'yield.actualQty': 'Actual Qty',
    'yield.finalYield': 'Final Yield',
    'yield.lossAnalysis': 'Loss Analysis',
    'yield.lossWeight': 'Loss Weight',
    'yield.lossRate': 'Loss Rate',
    'yield.aggregate': 'Aggregate Yield',

    // Decision
    'decision.pass': 'Pass',
    'decision.conditionalPass': 'Conditional Pass',
    'decision.fail': 'Fail',
    'decision.hold': 'Hold',

    // Summary
    'summary.executive': 'Executive Summary',
    'summary.issues': 'Issues & Remarks',
    'summary.noContent': 'No content',
    'summary.noIssues': 'No issues',

    // Photos
    'photos.none': 'No photos attached.',
    'photos.figure': 'Figure',

    // Footer
    'footer.confidential': 'Confidential Document | Unauthorized reproduction prohibited',

    // Metrics
    'metrics.noData': 'No data registered.',
    'metrics.commonOther': 'Common / Other',

    // Editor
    'editor.reportType': 'Report Type',
    'editor.singleMfg': 'Single Mfg',
    'editor.singleFill': 'Single Filling',
    'editor.multiMfg': 'Multi-Lot Mfg',
    'editor.multiFill': 'Multi-Lot Filling',
    'editor.excelImport': 'Import Excel',
    'editor.templateDownload': 'Download Template',
    'editor.lotManagement': 'Lot Management',
    'editor.lotAdd': 'Add Lot',
    'editor.lotName': 'Lot Name',
    'editor.basicInfo': 'Basic Info',
    'editor.title': 'Report Title',
    'editor.detailItems': 'Detail Items (editable list)',
    'editor.itemName': 'Field Name',
    'editor.content': 'Content',
    'editor.addItem': 'Add Item',
    'editor.approvalLine': 'Approval Line',
    'editor.drafter': 'Drafter',
    'editor.reviewer': 'Reviewer',
    'editor.approver': 'Approver',
    'editor.dept': 'Dept.',
    'editor.position': 'Title',
    'editor.name': 'Name',
    'editor.metrics': 'Metrics',
    'editor.addMetric': 'Add Item',
    'editor.yield': 'Yield',
    'editor.photos': 'Site Photos',
    'editor.addPhoto': 'Add Photo',
    'editor.photoAdd': 'Add',
    'editor.dragOrClick': 'Drag photos here or click the button above',
    'editor.dropHere': 'Drop here!',
    'editor.delete': 'Delete',
    'editor.result': 'Result',
    'editor.finalDecision': 'Final Decision',
    'editor.summaryInput': 'Summary',
    'editor.summaryPlaceholder': 'Enter summary...',
    'editor.issuesInput': 'Issues & Remarks',
    'editor.issuesPlaceholder': 'Enter issues...',
    'editor.samplesNote': 'Samples distributed to R&D, QA, Sales, etc.\nare included in production output (yield).',
    'editor.loss': 'Estimated Loss',
    'editor.lossWeight': 'Weight',
    'editor.lossRate': 'Loss Rate',
    'editor.overwriteConfirm': 'Overwrite current items?\n(Cancel to append after existing items)',
    'editor.fullOverwriteConfirm': 'Overwrite entire report with Excel data?',
    'editor.parseError': 'Cannot parse data. Please check the format.',
    'editor.excelError': 'Failed to read Excel file',
    'editor.excelUpload': 'Upload Excel',
    'editor.rawTemplate': 'Raw Data Template',
    'editor.rawTemplateDesc': 'Single product, auto-calculated averages',
    'editor.multiSheetTemplate': 'Multi-Sheet Template',
    'editor.multiSheetTemplateDesc': 'Separate sheets per lot (21, 23...)',
    'editor.summaryTemplate': 'Summary Template',
    'editor.summaryTemplateDesc': 'Direct value entry list',
    'editor.singleMfgDesc': 'Single product manufacturing inspection',
    'editor.singleFillDesc': 'Single product filling/packaging',
    'editor.multiMfgDesc': 'Sheets per lot (Lot 21, 23...)',
    'editor.multiFillDesc': 'Sheets per lot filling/packaging',
    'editor.lotNamePlaceholder': 'e.g. Lot 21',

    // Default data values
    'default.title': 'Pilot Production Report',
    'default.label.department': 'Department',
    'default.label.author': 'Author',
    'default.label.lotNo': 'LOT No.',
    'default.label.product': 'Product Name',
    'default.label.docId': 'Document ID',
    'default.dept.process': 'Process Engineering',
    'default.position.manager': 'Manager',
    'default.position.senior': 'Senior',
    'default.position.teamLead': 'Team Lead',
    'default.summary': 'Overall physical properties satisfactory; target yield achieved in today\'s pilot production.',
    'default.issues': '- Packaging line initial setup delayed (15 min)\n- Nozzle pressure fine-tuning completed on Machine #2',
    'default.metric.fillWeight': 'Fill Weight',
    'default.metric.capTorque': 'Cap Torque',
    'default.metric.viscosity': 'Viscosity',

    // Color Matching & Corrections
    'section.colorMatching': 'Color Matching Log',
    'section.corrections': 'Correction Materials Log',
    'editor.colorMatching': 'Color Matching',
    'editor.aqueous': 'Aqueous Pigments',
    'editor.oil': 'Oil Pigments',
    'editor.materialCode': 'Code',
    'editor.materialName': 'Material',
    'editor.amount': 'Amount(g)',
    'editor.percentage': 'Content(%)',
    'editor.addMaterial': 'Add Material',
    'editor.corrections': 'Corrections',
    'editor.addCorrection': 'Add Correction',
    'editor.correctionType': 'Type',
    'editor.memo': 'Memo',
    'editor.correctionTypes.viscosity': 'Viscosity',
    'editor.correctionTypes.hardness': 'Hardness',
    'editor.correctionTypes.ph': 'pH',
    'editor.correctionTypes.color': 'Color',
    'editor.correctionTypes.other': 'Other',
    'editor.batchSizeRef': 'Based on batch size',
    'editor.batchSizeNotSet': 'Enter batch size in Yield section for auto-calculation.',
  },
};

export const getTranslator = (lang: Lang) => {
  const dict = translations[lang] || translations.ko;
  return (key: string): string => dict[key] || translations.ko[key] || key;
};

// Keys whose default data values should be translated on language switch
const translatableDefaultKeys = [
  'default.title',
  'default.label.department',
  'default.label.author',
  'default.label.lotNo',
  'default.label.product',
  'default.label.docId',
  'default.dept.process',
  'default.position.manager',
  'default.position.senior',
  'default.position.teamLead',
  'default.summary',
  'default.issues',
  'default.metric.fillWeight',
  'default.metric.capTorque',
  'default.metric.viscosity',
] as const;

/**
 * Build a value→value mapping from one language to another for known default texts.
 * e.g. '부서' → 'Department', '공정개발팀' → 'Process Engineering'
 */
export const buildDefaultValueMap = (fromLang: Lang, toLang: Lang): Map<string, string> => {
  const map = new Map<string, string>();
  const fromDict = translations[fromLang];
  const toDict = translations[toLang];
  for (const key of translatableDefaultKeys) {
    const fromVal = fromDict[key];
    const toVal = toDict[key];
    if (fromVal && toVal && fromVal !== toVal) {
      map.set(fromVal, toVal);
    }
  }
  return map;
};
