import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export async function generateSummary(content: string) {
  const model = "gemini-3-flash-preview";
  const prompt = `قم بتلخيص المحتوى التالي بأسلوب تعليمي مبسط لطلاب الجامعات. اجعل التلخيص منظماً باستخدام نقاط واضحة وعناوين فرعية. المحتوى: ${content}`;
  
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });
  
  return response.text;
}

export async function generateQuiz(content: string) {
  const model = "gemini-3-flash-preview";
  const prompt = `بناءً على المحتوى التالي، قم بإنشاء اختبار شامل مكون من 6 أسئلة متنوعة تغطي الأنواع التالية:
  1. اختيار من متعدد (mcq)
  2. صح وخطأ (boolean)
  3. أكمل الجملة (completion)
  4. توصيل (matching)
  
  يجب أن يكون الرد بتنسيق JSON فقط ويحتوي على مصفوفة من الكائنات.
  - للـ mcq: question, options (4 options), correctAnswer, type: "mcq"
  - للـ boolean: question, options (["صح", "خطأ"]), correctAnswer, type: "boolean"
  - للـ completion: question (يحتوي على ____), correctAnswer, type: "completion"
  - للـ matching: question (عنوان السؤال), pairs (مصفوفة من كائنات {key, value}), type: "matching"
  
  المحتوى: ${content}`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            pairs: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: {
                  key: { type: Type.STRING },
                  value: { type: Type.STRING }
                }
              }
            },
            type: { type: Type.STRING }
          },
          required: ["question", "type"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
}

export async function evaluateSemanticAnswer(question: string, correctAnswer: string, studentAnswer: string) {
  const model = "gemini-3-flash-preview";
  const prompt = `أنت مصحح اختبارات ذكي. قرر ما إذا كانت إجابة الطالب صحيحة من الناحية المعنوية مقارنة بالإجابة النموذجية لسؤال "أكمل". 
  لا تشدد على التطابق الحرفي، ركز على المعنى.
  السؤال: ${question}
  الإجابة النموذجية: ${correctAnswer}
  إجابة الطالب: ${studentAnswer}
  
  رد بكلمة واحدة فقط: "true" إذا كانت صحيحة، أو "false" إذا كانت خاطئة.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text.trim().toLowerCase() === "true";
}
