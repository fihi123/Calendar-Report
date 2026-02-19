import { GoogleGenAI, Type } from "@google/genai";
import { AIParsedEvent } from "../types";

const apiKey = process.env.API_KEY || '';
let ai: GoogleGenAI | null = null;
try {
  if (apiKey) ai = new GoogleGenAI({ apiKey });
} catch (e) {
  console.warn("Gemini API initialization skipped:", e);
}

export const parseEventFromText = async (text: string, currentDate: Date, memberNames: string[] = []): Promise<AIParsedEvent | null> => {
  if (!apiKey) {
    console.error("API Key is missing");
    return null;
  }

  const prompt = `
    You are a scheduling assistant for a manufacturing facility.
    Extract the event details from the following user request.
    The current date is ${currentDate.toISOString()}.

    Classify the 'type' of the event strictly into one of these categories:
    - 'manufacturing': If the text mentions mixing, brewing, making, processing, or "제조".
    - 'packaging': If the text mentions filling, boxing, labeling, packing, or "충진", "포장", "충진포장".
    - 'meeting': For discussions or meetings.
    - 'other': For anything else.

    If the user mentions a name, try to fuzzy match it to one of these members: ${memberNames.length > 0 ? memberNames.join(', ') : 'No members configured'}.
    If no specific time is given, assume a full day event or a reasonable shift (e.g. 8am - 5pm).

    Return JSON.

    Request: "${text}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            startDate: { type: Type.STRING, description: "ISO 8601 Date string" },
            endDate: { type: Type.STRING, description: "ISO 8601 Date string" },
            assigneeName: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['manufacturing', 'packaging', 'meeting', 'other'] }
          },
          required: ['title', 'startDate', 'endDate', 'type']
        }
      }
    });

    const resultText = response.text;
    if (!resultText) return null;

    const parsed = JSON.parse(resultText) as AIParsedEvent;
    return parsed;
  } catch (error) {
    console.error("Gemini parsing error:", error);
    return null;
  }
};

export const generateWeeklySummary = async (events: any[]): Promise<string> => {
  if (!apiKey) return "API Key missing.";

  const prompt = `
    Analyze the following manufacturing and packaging schedule for the team and provide a brief, professional summary of the workload and focus for this period.
    Highlight any major production bottlenecks (manufacturing vs packaging balance).
    Keep it under 3 sentences.

    Events: ${JSON.stringify(events.map(e => ({ title: e.title, member: e.memberId, type: e.type, start: e.start, end: e.end })))}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Summary error:", error);
    return "Failed to generate summary.";
  }
};