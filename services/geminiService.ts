import { GoogleGenAI, Type } from "@google/genai";
import { AiVetDiagnosis, Pig } from '../types';

export const GeminiService = {
  analyzeHealth: async (
    symptoms: string, 
    pigContext: Pig
  ): Promise<AiVetDiagnosis | null> => {
    
    if (!process.env.API_KEY) {
      console.error("API Key missing");
      return null;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        你是一位专业的生猪养殖兽医专家。请分析以下病例。
        
        对象信息:
        品种: ${pigContext.breed}
        性别: ${pigContext.gender}
        出生/日龄: ${pigContext.birthDate}
        体重: ${pigContext.weightKg}kg
        当前状态: ${pigContext.healthStatus}
        
        报告症状: "${symptoms}"
        
        请提供结构化的诊断结果、严重程度评估和可操作的建议。
        必须严格遵守现代生物安全和动物福利标准。
        请使用中文回复。
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              diagnosis: { type: Type.STRING, description: "可能的疾病名称" },
              severity: { type: Type.STRING, enum: ['低', '中', '高', '危急'] },
              confidence: { type: Type.NUMBER, description: "置信度 0-100" },
              recommendedActions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "立即采取的措施列表"
              },
              dietaryAdjustments: { type: Type.STRING, description: "饲料或饮水调整建议" },
              requiresIsolation: { type: Type.BOOLEAN }
            },
            required: ["diagnosis", "severity", "recommendedActions", "requiresIsolation"]
          }
        }
      });

      const text = response.text;
      if (!text) return null;
      return JSON.parse(text) as AiVetDiagnosis;

    } catch (error) {
      console.error("Gemini Analysis Failed:", error);
      return null;
    }
  }
};
