import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TokenUsage } from "@/models/TokenUsage";
import { getEffectiveApiKey, getLocalDateKey } from "@/lib/gemini";

// Dedicated Vision-capable Multimodal Models (Always used for image reading even if user selected a text-only model for chat)
const VISION_MODELS_PRIORITY = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
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

    const { imageBase64, mimeType = "image/jpeg" } = body;
    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "Vui lòng chọn hoặc chụp một bức ảnh." },
        { status: 400 }
      );
    }

    const prompt = `Bạn là Chuyên gia Kỹ sư Kiểm thử (Senior Test Engineer - TE).
Hãy quan sát kỹ bức ảnh này (có thể là màn hình báo lỗi máy test ICT/FCT/RF/AOI/SFC, file log, sơ đồ mạch PCBA, hoặc tài liệu SOP kỹ thuật).
Hãy bóc tách toàn bộ thông tin trên ảnh và trả về DUY NHẤT một đối tượng JSON hợp lệ theo đúng cấu trúc sau (bằng tiếng Việt, giữ nguyên mã lỗi tiếng Anh):
{
  "title": "Tên sự cố / Tiêu đề ngắn gọn (VD: Lỗi FAIL_VDD_3V3 trên trạm FCT)",
  "category": "Chọn 1 trong: ICT / FCT | SMT / AOI | RF / Wireless | SFC / MES | Fixture / Jig | SOP / Manual | Khác",
  "errorCode": "Mã lỗi trích xuất từ ảnh (VD: ERR-FCT-104, SFC-504, FAIL_SHORT... hoặc để trống nếu không có)",
  "station": "Tên trạm test / thiết bị trích xuất từ ảnh (VD: FCT-02, AOI-01... hoặc để trống)",
  "symptom": "Mô tả chi tiết hiện tượng lỗi, thông số đo Fail/Limit hiển thị trên ảnh",
  "rootCause": "Phân tích các nguyên nhân gốc rễ (Root Cause) có khả năng cao nhất gây ra lỗi này",
  "solution": "Các bước xử lý / khắc phục từng bước (Bước 1, Bước 2, Bước 3...) chuẩn SOP Kỹ sư TE",
  "tags": "Các từ khóa cách nhau bằng dấu phẩy (VD: FCT, ShortCircuit, PCB)"
}`;

    let lastError = "";

    for (const visionModel of VISION_MODELS_PRIORITY) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${effectiveKey}`;
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
                      data: imageBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
            },
          }),
        });

        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (res.ok && rawText) {
          const meta = data.usageMetadata || {};
          await TokenUsage.create({
            dateKey: getLocalDateKey(),
            actionType: "extract",
            modelName: visionModel,
            promptTokens: meta.promptTokenCount || 0,
            candidatesTokens: meta.candidatesTokenCount || 0,
            thoughtsTokens: meta.thoughtsTokenCount || 0,
            totalTokens: meta.totalTokenCount || 0,
          });

          // Clean JSON fence if present
          const cleanedJson = rawText
            .replace(/^```json\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();

          const parsed = JSON.parse(cleanedJson);

          return NextResponse.json({
            success: true,
            visionModelUsed: visionModel,
            fields: {
              title: parsed.title || "",
              category: parsed.category || "ICT / FCT",
              errorCode: parsed.errorCode || "",
              station: parsed.station || "",
              symptom: parsed.symptom || "",
              rootCause: parsed.rootCause || "",
              solution: parsed.solution || "",
              tags: Array.isArray(parsed.tags)
                ? parsed.tags.join(", ")
                : parsed.tags || "",
            },
          });
        }

        lastError = data?.error?.message || `HTTP ${res.status}`;
      } catch (e: unknown) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: `Không thể phân tích ảnh: ${lastError}`,
      },
      { status: 500 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Lỗi xử lý AI Vision";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
