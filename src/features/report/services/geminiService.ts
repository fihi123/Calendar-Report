import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
let ai: GoogleGenAI | null = null;
try {
  if (apiKey) ai = new GoogleGenAI({ apiKey });
} catch (e) {
  console.warn("Gemini API initialization skipped:", e);
}

export const generateReportContent = async (
  section: string,
  context: string,
  currentContent: string
): Promise<string> => {
  if (!apiKey) {
    console.warn("No API Key found");
    return "API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.";
  }

  const model = 'gemini-3-flash-preview';

  const prompt = `
    당신은 전문적인 제조/생산 관리 보고서 작성 전문가입니다.
    다음 요청에 따라 보고서의 '${section}' 섹션을 작성하거나 수정해주세요.

    맥락(Context): ${context}

    현재 내용(Current Content, if any): "${currentContent}"

    요청사항: 위 내용을 바탕으로 전문적이고 간결하며 명확한 비즈니스 톤으로 내용을 생성/보강해주세요.
    한국어로 작성하세요. 마크다운 형식은 사용하지 말고, 일반 텍스트로 작성하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "내용을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 생성 중 오류가 발생했습니다.";
  }
};

export const analyzeData = async (metrics: string): Promise<string> => {
  if (!apiKey) return "API Key Missing";

  const model = 'gemini-3-flash-preview';
  const prompt = `
    다음 생산 지표 데이터를 분석하여 주요 인사이트, 달성률, 문제점 등을 포함한 3줄 요약을 작성해주세요.

    데이터:
    ${metrics}

    한국어로 작성하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "분석 실패";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "데이터 분석 중 오류가 발생했습니다.";
  }
}