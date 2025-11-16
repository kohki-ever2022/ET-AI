import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";
import { ChatMessage, Knowledge } from '../types';
import { buildSystemPrompt, getCompliancePrompt, IR_BASIC_KNOWLEDGE, CORE_CONSTRAINTS } from './promptService';
import { validatePrompt } from './promptValidationService';

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Using a placeholder. Please provide a valid API key for the app to function.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "YOUR_API_KEY_HERE" });

const model = 'gemini-2.5-pro';

export const generateReport = async (context: string): Promise<string> => {
  console.log("Generating new compliance report...");
  try {
    const prompt = getCompliancePrompt(context);
    
    // Reports are a one-shot generation, so we use a simpler prompt structure
    const fullPrompt: Content[] = [
        { role: 'user', parts: [{ text: prompt }] }
    ];
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model,
        contents: fullPrompt,
        config: {
            systemInstruction: CORE_CONSTRAINTS,
        },
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating report:", error);
    return "レポートの生成中にエラーが発生しました。システム管理者にお問い合わせください。";
  }
};

export const sendMessageStream = async (
  history: ChatMessage[],
  newMessage: string,
  documentContext?: string | null,
  // Mock knowledge base for RAG simulation
  knowledgeDB?: { ir: Knowledge[], relevant: Knowledge[] }
) => {
  const validationError = validatePrompt(newMessage);
  if (validationError) {
      throw new Error(validationError);
  }
  
  // Build the layered system prompt
  const systemInstruction = await buildSystemPrompt(knowledgeDB?.ir || [], knowledgeDB?.relevant || []);

  const contents: Content[] = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  let userMessageContent = newMessage;
  if (documentContext) {
    userMessageContent = `以下のドキュメントコンテキストを参考にして、次の質問に答えてください。コンテキスト内の情報にのみ基づいて回答し、外部の知識は使用しないでください。\n\n---ドキュメントコンテキスト---\n${documentContext}\n---ここまで---\n\n質問：\n${newMessage}`;
  }
  contents.push({ role: 'user', parts: [{ text: userMessageContent }] });

  try {
    return await ai.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction,
      },
    });
  } catch (error) {
    console.error("Error sending message:", error);
    throw new Error("メッセージの送信中にエラーが発生しました。");
  }
};
