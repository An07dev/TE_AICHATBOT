import { connectDB } from "./mongodb";
import { TokenUsage } from "@/models/TokenUsage";

const DEFAULT_API_KEY = process.env.GEMINI_API_KEY || "";
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

// Ordered fallback list of fast, free-tier compatible Gemini models
const CHAT_MODELS_FALLBACK = [
  process.env.GEMINI_CHAT_MODEL || "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
];

export function getEffectiveApiKey(customKey?: string): string {
  return (customKey && customKey.trim()) || DEFAULT_API_KEY;
}

export function getLocalDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function recordTokenUsage(params: {
  actionType: "chat" | "embedding" | "extract";
  modelName: string;
  promptTokens: number;
  candidatesTokens: number;
  thoughtsTokens: number;
  totalTokens: number;
}) {
  try {
    await connectDB();
    await TokenUsage.create({
      dateKey: getLocalDateKey(),
      ...params,
    });
  } catch (err) {
    console.error("Failed to record token usage:", err);
  }
}

export async function generateEmbedding(text: string, customKey?: string): Promise<number[]> {
  const apiKey = getEffectiveApiKey(customKey);
  if (!apiKey) {
    throw new Error("Chưa cấu hình GEMINI_API_KEY");
  }

  const cleanText = text.slice(0, 6500);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: {
        parts: [{ text: cleanText }],
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Embedding error:", errText);
    return [];
  }

  const data = await res.json();

  // Count tokens via countTokens endpoint or fallback estimation for embedding call
  let tokenCount = Math.max(1, Math.ceil(cleanText.length / 4));
  try {
    const countRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:countTokens?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: cleanText }] }],
        }),
      }
    );
    if (countRes.ok) {
      const countData = await countRes.json();
      if (typeof countData.totalTokens === "number") {
        tokenCount = countData.totalTokens;
      }
    }
  } catch {
    // use fallback
  }

  await recordTokenUsage({
    actionType: "embedding",
    modelName: EMBEDDING_MODEL,
    promptTokens: tokenCount,
    candidatesTokens: 0,
    thoughtsTokens: 0,
    totalTokens: tokenCount,
  });

  return data?.embedding?.values || [];
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function keywordScoreBoost(
  query: string,
  item: {
    title: string;
    errorCode?: string;
    station?: string;
    tags?: string[];
    content: string;
  }
): number {
  const q = query.toLowerCase().trim();
  let boost = 0;

  if (item.errorCode && q.includes(item.errorCode.toLowerCase())) {
    boost += 0.35;
  }
  if (item.station && q.includes(item.station.toLowerCase())) {
    boost += 0.18;
  }
  if (item.title && q.includes(item.title.toLowerCase())) {
    boost += 0.2;
  }

  const tokens = q.split(/\s+/).filter((w) => w.length >= 2);
  if (tokens.length > 0) {
    const targetText = `${item.title} ${item.errorCode || ""} ${item.station || ""} ${(item.tags || []).join(" ")} ${item.content}`.toLowerCase();
    let matched = 0;
    for (const token of tokens) {
      if (targetText.includes(token)) matched++;
    }
    boost += (matched / tokens.length) * 0.15;
  }

  return boost;
}

export interface RetrievedContext {
  id: string;
  title: string;
  type: string;
  category: string;
  errorCode?: string;
  station?: string;
  content: string;
  score: number;
}

export interface UsageStats {
  promptTokens: number;
  candidatesTokens: number;
  thoughtsTokens: number;
  totalTokens: number;
}

export async function generateRAGResponse(params: {
  question: string;
  contexts: RetrievedContext[];
  history?: { role: "user" | "assistant"; content: string }[];
  imageInline?: { mimeType: string; data: string };
  customKey?: string;
  preferredModel?: string;
}): Promise<{ answer: string; modelUsed: string; usage: UsageStats }> {
  const apiKey = getEffectiveApiKey(params.customKey);
  if (!apiKey) {
    throw new Error("Chưa có GEMINI_API_KEY. Vui lòng kiểm tra cài đặt.");
  }

  const contextBlock =
    params.contexts.length > 0
      ? params.contexts
          .map(
            (c, idx) =>
              `--- [TÀI LIỆU #${idx + 1}] ---\nTiêu đề: ${c.title}\nPhân loại: ${c.category} (${c.type === "note" ? "Sổ tay xử lý lỗi" : "Tài liệu SOP/File"})\n${c.errorCode ? `Mã lỗi: ${c.errorCode}\n` : ""}${c.station ? `Trạm Test/Máy: ${c.station}\n` : ""}Nội dung chi tiết:\n${c.content}\n`
          )
          .join("\n")
      : "Hiện chưa có ghi chú hoặc tài liệu trùng khớp hoàn toàn trong Kho Tri Thức cá nhân.";

  const systemInstruction = `Bạn là "TE Brain AI" — Trợ lý Kỹ sư Kiểm thử (Test Engineer - TE) cá nhân đắc lực và chuyên nghiệp.
Nhiệm vụ của bạn:
1. Ưu tiên tuyệt đối việc khai thác thông tin từ [KHO TRI THỨC CÁ NHÂN CỦA TÔI] bên dưới để giải đáp thắc mắc về mã lỗi, trạm test (ICT, FCT, AOI, SMT, RF, SFC/MES, Jig/Fixture), SOP và hướng dẫn xử lý sự cố (Troubleshooting).
2. Khi sử dụng thông tin từ kho tri thức, hãy trích dẫn rõ tên tài liệu/mã lỗi (ví dụ: "Theo ghi chú [Mã lỗi / Tên tài liệu]...").
3. Trình bày câu trả lời súc tích, rõ ràng, dễ đọc nhanh trên màn hình điện thoại khi đang đứng tại chuyền sản xuất / trạm máy:
   - **Chẩn đoán / Nguyên nhân gốc (Root Cause)**
   - **Các bước xử lý (Action / SOP từng bước)**
   - **Lưu ý kiểm tra / Phòng ngừa**
4. Nếu câu hỏi chưa có trong Kho Tri Thức cá nhân, hãy báo rõ "Trong kho dữ liệu cá nhân chưa có ca lỗi này, dưới đây là gợi ý chuyên môn TE để bạn kiểm tra:" rồi đưa ra hướng dẫn kỹ thuật chuẩn xác để người dùng xử lý và lưu lại vào sổ tay.`;

  const historyText =
    params.history && params.history.length > 0
      ? params.history
          .slice(-6)
          .map((m) => `${m.role === "user" ? "Kỹ sư TE" : "TE Brain AI"}: ${m.content}`)
          .join("\n\n")
      : "";

  const fullPrompt = `${systemInstruction}

=== [KHO TRI THỨC CÁ NHÂN CỦA TÔI] ===
${contextBlock}

${historyText ? `=== [LỊCH SỬ HỘI THOẠI GẦN ĐÂY] ===\n${historyText}\n` : ""}
=== [CÂU HỎI HIỆN TẠI CỦA KỸ SƯ TE] ===
${params.question}`;

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text: fullPrompt },
  ];

  if (params.imageInline && params.imageInline.data) {
    parts.push({
      inlineData: {
        mimeType: params.imageInline.mimeType,
        data: params.imageInline.data,
      },
    });
  }

  let lastError = "";
  const hasImage = Boolean(params.imageInline && params.imageInline.data);
  const preferredIsVisionCapable =
    params.preferredModel && !params.preferredModel.startsWith("gemma-");

  const modelQueue =
    params.preferredModel && (!hasImage || preferredIsVisionCapable)
      ? [params.preferredModel, ...CHAT_MODELS_FALLBACK]
      : CHAT_MODELS_FALLBACK;
  const uniqueModels = Array.from(new Set(modelQueue));

  for (const model of uniqueModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const meta = data.usageMetadata || {};
        const usage: UsageStats = {
          promptTokens: meta.promptTokenCount || 0,
          candidatesTokens: meta.candidatesTokenCount || 0,
          thoughtsTokens: meta.thoughtsTokenCount || 0,
          totalTokens: meta.totalTokenCount || 0,
        };

        await recordTokenUsage({
          actionType: "chat",
          modelName: model,
          ...usage,
        });

        return {
          answer: data.candidates[0].content.parts[0].text,
          modelUsed: model,
          usage,
        };
      }
      lastError = data?.error?.message || `HTTP ${res.status}`;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(`Không thể kết nối Gemini API: ${lastError}`);
}

export async function extractFileContentWithGemini(params: {
  base64Data: string;
  mimeType: string;
  fileName: string;
  customKey?: string;
  preferredModel?: string;
}): Promise<string> {
  const apiKey = getEffectiveApiKey(params.customKey);
  if (!apiKey) {
    throw new Error("Chưa cấu hình GEMINI_API_KEY");
  }

  const prompt = `Hãy trích xuất toàn bộ nội dung văn bản, bảng biểu, mã lỗi (Error Code), thông số kỹ thuật (Spec/Limit), và quy trình hướng dẫn (SOP/Troubleshooting) từ tài liệu "${params.fileName}" này một cách đầy đủ, chi tiết và có cấu trúc rõ ràng để lưu vào cơ sở dữ liệu tri thức cho Kỹ sư TE.`;

  const modelQueue = params.preferredModel
    ? [params.preferredModel, ...CHAT_MODELS_FALLBACK]
    : CHAT_MODELS_FALLBACK;
  const uniqueModels = Array.from(new Set(modelQueue));
  for (const model of uniqueModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: params.mimeType,
                    data: params.base64Data,
                  },
                },
              ],
            },
          ],
        }),
      });

      const data = await res.json();
      if (res.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const meta = data.usageMetadata || {};
        await recordTokenUsage({
          actionType: "extract",
          modelName: model,
          promptTokens: meta.promptTokenCount || 0,
          candidatesTokens: meta.candidatesTokenCount || 0,
          thoughtsTokens: meta.thoughtsTokenCount || 0,
          totalTokens: meta.totalTokenCount || 0,
        });

        return data.candidates[0].content.parts[0].text;
      }
    } catch {
      // continue to next model
    }
  }

  throw new Error("Không thể trích xuất nội dung từ file này bằng Gemini AI.");
}
