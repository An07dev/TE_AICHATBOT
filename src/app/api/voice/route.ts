import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TokenUsage } from "@/models/TokenUsage";
import { getEffectiveApiKey, getLocalDateKey } from "@/lib/gemini";

const MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
];

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const apiKey =
      req.headers.get("x-gemini-key") || body.customApiKey || undefined;
    const effectiveKey = getEffectiveApiKey(apiKey);

    if (!effectiveKey) {
      return NextResponse.json(
        { success: false, error: "Chưa cấu hình GEMINI_API_KEY" },
        { status: 400 }
      );
    }

    const { audioBase64, mimeType = "audio/webm" } = body;
    if (!audioBase64) {
      return NextResponse.json(
        { success: false, error: "Không nhận được dữ liệu âm thanh" },
        { status: 400 }
      );
    }

    const prompt =
      "Hãy chuyển đoạn ghi âm giọng nói của Kỹ sư TE này thành văn bản tiếng Việt chính xác (giữ nguyên các thuật ngữ kỹ thuật như FCT, ICT, AOI, SMT, RF, SFC, MES, Pogo Pin, Golden Sample, mã lỗi ERR-...). Chỉ trả về đúng nội dung văn bản người dùng đã nói, không thêm bất kỳ lời giải thích nào.";

    for (const model of MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`;
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
                      mimeType,
                      data: audioBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 512,
            },
          }),
        });

        const data = await res.json();
        const transcript = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (res.ok && transcript) {
          const meta = data.usageMetadata || {};
          await TokenUsage.create({
            dateKey: getLocalDateKey(),
            actionType: "chat",
            modelName: model,
            promptTokens: meta.promptTokenCount || 0,
            candidatesTokens: meta.candidatesTokenCount || 0,
            thoughtsTokens: meta.thoughtsTokenCount || 0,
            totalTokens: meta.totalTokenCount || 0,
          });

          return NextResponse.json({
            success: true,
            transcript: transcript.trim(),
            modelUsed: model,
          });
        }
      } catch {
        // try next model
      }
    }

    return NextResponse.json(
      { success: false, error: "Không thể nhận diện giọng nói, vui lòng thử lại." },
      { status: 500 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Lỗi xử lý âm thanh";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
