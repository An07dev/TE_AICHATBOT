import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TokenUsage } from "@/models/TokenUsage";
import { getEffectiveApiKey, getLocalDateKey } from "@/lib/gemini";

// Fast models first for low-latency voice transcription
const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
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

    const { audioBase64, mimeType = "audio/mp4", lang = "vi" } = body;
    if (!audioBase64) {
      return NextResponse.json(
        { success: false, error: "Không nhận được dữ liệu âm thanh" },
        { status: 400 }
      );
    }

    // Strip any ";codecs=..." suffix (e.g. "audio/mp4;codecs=mp4a.40.2" on iOS Safari
    // or "audio/webm;codecs=opus" on Chrome) because Gemini inlineData requires clean MIME types
    const rawMime = String(mimeType || "audio/mp4")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const cleanMimeType =
      rawMime === "audio/x-m4a" || rawMime === "audio/m4a"
        ? "audio/mp4"
        : rawMime || "audio/mp4";

    const langHint =
      lang === "zh"
        ? "tiếng Trung Giản Thể (简体中文)"
        : lang === "en"
          ? "tiếng Anh (English)"
          : "tiếng Việt";

    const prompt = `Hãy chuyển đoạn ghi âm giọng nói của Kỹ sư TE này thành văn bản chính xác (ưu tiên ngôn ngữ người nói đang dùng, đặc biệt là ${langHint}, và giữ nguyên các thuật ngữ kỹ thuật như FCT, ICT, AOI, SMT, RF, SFC, MES, Pogo Pin, Golden Sample, Cpk, mã lỗi ERR-...). Chỉ trả về đúng nội dung văn bản người dùng đã nói, tuyệt đối không thêm bất kỳ lời giải thích hay dấu ngoặc kép nào. Nếu hoàn toàn chỉ có tiếng ồn không có giọng nói, trả về chuỗi rỗng.`;

    let lastErrorDetail = "";

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
                      mimeType: cleanMimeType,
                      data: audioBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          lastErrorDetail = data?.error?.message || `HTTP ${res.status}`;
          continue;
        }

        const parts = data?.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find(
          (p: { text?: string; thought?: boolean }) =>
            typeof p.text === "string" && !p.thought
        );
        const transcript = (textPart?.text || parts[0]?.text || "").trim();

        if (transcript) {
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
            transcript,
            modelUsed: model,
          });
        }
      } catch (e) {
        lastErrorDetail = e instanceof Error ? e.message : "Network error";
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          lastErrorDetail ||
          "Không nghe rõ giọng nói, vui lòng nói to hơn hoặc thử lại.",
      },
      { status: 500 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Lỗi xử lý âm thanh";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
