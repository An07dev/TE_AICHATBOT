import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TokenUsage } from "@/models/TokenUsage";
import { getEffectiveApiKey, getLocalDateKey } from "@/lib/gemini";

const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
];

const TE_FACTORY_GLOSSARY_RULES = `
BỘ QUY TẮC TỪ ĐIỂN CỨNG NGÀNH TEST ENGINEERING (TE / SMT / FATP NHÀ MÁY ĐIỆN TỬ):
Tuyệt đối KHÔNG dịch word-by-word kiểu Google Dịch. Bắt buộc dịch theo đúng thuật ngữ chuyên ngành tại xưởng sản xuất điện tử:
- 治具 / 测试治具 / 夹具 -> Jig / Fixture kiểm thử (Tuyệt đối không dịch là "đồ gá trị liệu")
- 探针 / 顶针 / 测试针 -> Kim test Pogo Pin (Không dịch là "kim thăm dò")
- 针床 / 针板 -> Đế kim / Bàn kim (Pin Plate / Bed of Nails)
- 误测 / 假不良 / 假Fail -> Lỗi giả / NTF (No Trouble Found / False Call)
- 金样 / 黄金样品 / 标准样机 -> Bản mẫu chuẩn (Golden Sample)
- 不良品 / 故障品 / 坏机 -> Bản mạch lỗi / Hàng NG (FAIL / Defective Unit)
- 良品 / 好机 -> Bản mạch đạt / Hàng OK (PASS / Good Unit)
- 上位机 / 测试软件 -> Phần mềm điều khiển trạm test trên Host PC (Host Test UI)
- 下位机 / 控制板 -> Mạch điều khiển dưới Jig / PLC / MCU Firmware
- 过站 / 卡站 / 跳站 -> Qua trạm / Chặn trạm (Interlock) / Nhảy cóc trạm trên hệ thống SFC / MES
- 首件 / 首件点检 (FAI) -> Kiểm tra mẫu đầu chuyền / Đầu ca (First Article Inspection)
- 点检表 / 保养表 -> Bảng Checklist kiểm tra định kỳ (PM Checklist)
- 屏蔽箱 / 隔离箱 -> Hộp chắn sóng RF (RF Shielding Box)
- 吸波材料 / 屏蔽条 -> Vật liệu hấp thụ sóng RF / Gioăng chống nhiễu RF (RF Gasket)
- 网分 (VNA) / 综测仪 -> Máy phân tích mạng Vector (VNA) / Máy đo tổng hợp RF (CMW500 / MT8870)
- 衰减器 / 耦合板 / 射频线 -> Bộ suy hao (Attenuator) / Anten ghép nối (Coupler) / Cáp RF đồng trục
- 插损 (Insertion Loss) / 驻波比 (VSWR) -> Suy hao chèn (Insertion Loss) / Tỷ số sóng đứng (VSWR)
- 气缸 / 气压 / 电磁阀 -> Xy-lanh khí nén / Áp suất khí nén / Van điện từ (Solenoid Valve)
- 下压到位 / 传感器 / 光栅 -> Hành trình ép Jig chạm đích / Cảm biến (Sensor) / Rèm quang an toàn (Light Curtain)
- 虚焊 / 假焊 / 冷焊 -> Hàn giả / Hở chân hàn (Cold Solder / Open Joint)
- 连锡 / 短路 / 桥接 -> Chập cầu thiếc / Ngắn mạch (Solder Bridge / Short Circuit)
- 少锡 / 锡珠 / 偏移 / 立碑 -> Thiếu thiếc / Bi thiếc (Solder Ball) / Lệch linh kiện / Dựng bia (Tombstone)
- 锡膏 / 钢网 / 回流焊 -> Kem hàn (Solder Paste) / Khuôn in (Stencil) / Lò hàn (Reflow Oven)
- 直通率 (FPY) / 良率 (Yield) / 重测率 (Retest Rate) -> Tỷ lệ đạt lần đầu (FPY) / Hiệu suất (Yield) / Tỷ lệ test lại
- 不良现象 / 根本原因 / 临时对策 / 永久对策 -> Hiện tượng lỗi (Symptom) / Nguyên nhân gốc (Root Cause) / Đối sách tạm thời (Containment Action) / Đối sách vĩnh viễn (Corrective Action)
`;

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const apiKey =
      req.headers.get("x-gemini-key") || body.customApiKey || undefined;
    const effectiveKey = getEffectiveApiKey(apiKey);

    if (!effectiveKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Chưa cấu hình GEMINI_API_KEY. Vui lòng kiểm tra cài đặt.",
        },
        { status: 400 }
      );
    }

    const {
      text = "",
      imageInline,
      direction = "zh-vi",
      mode = "sop",
      station = "",
    } = body;

    if (!text.trim() && !(imageInline && imageInline.data)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vui lòng nhập văn bản tiếng Trung/Việt hoặc chụp ảnh tài liệu SOP cần dịch.",
        },
        { status: 400 }
      );
    }

    const directionRule =
      direction === "vi-zh"
        ? `HƯỚNG DỊCH & CHUẨN HÓA: Từ **Tiếng Việt / Đa ngôn ngữ ➔ Tiếng Trung Giản Thể chuẩn Nhà máy Điện tử (简体中文 - 电子制造/测试工程标准术语)** kèm chú thích Tiếng Việt ngắn gọn ở các tiêu đề chính để kỹ sư Việt gửi báo cáo cho chuyên gia Trung Quốc / R&D HQ.`
        : direction === "auto-en"
          ? `HƯỚNG DỊCH & CHUẨN HÓA: Từ **Tiếng Trung / Tiếng Việt ➔ Tiếng Anh Kỹ thuật Chuẩn Quốc tế (Professional Test Engineering English)** để phục vụ Audit khách hàng (Apple/Samsung/Dell/Foxconn...).`
          : `HƯỚNG DỊCH & CHUẨN HÓA: Từ **Tiếng Trung (简体/繁体中文) hoặc Trung-Anh hỗn hợp ➔ Tiếng Việt Chuyên ngành Kỹ sư TE (Test Engineer)**. Giữ lại thuật ngữ gốc tiếng Trung/Anh quan trọng hoặc Mã lỗi trong ngoặc đơn ở lần xuất hiện đầu tiên để kỹ sư dễ đối chiếu trên màn hình máy test.`;

    const modeRule =
      mode === "bilingual"
        ? `CHẾ ĐỘ ĐẦU RA ("bilingual" - Song ngữ Đối chiếu Từng Đoạn):
- Trình bày từng mục/đoạn theo cặp đối chiếu rõ ràng:
  + **🇨🇳 Nguyên bản / Tiếng Trung chuẩn:** [Câu gốc hoặc bản chuẩn hóa tiếng Trung]
  + **🇻🇳 Dịch chuẩn TE / Tiếng Việt (hoặc EN):** [Bản dịch chuẩn thuật ngữ TE]
- Giúp kỹ sư Việt Nam và chuyên gia Trung Quốc có thể cùng nhìn vào màn hình điện thoại để chỉ tay đối chiếu từng bước tại line sản xuất.`
        : mode === "troubleshooting"
          ? `CHẾ ĐỘ ĐẦU RA ("troubleshooting" - Chuẩn hóa Bảng Mã Lỗi & Hướng Dẫn Xử Lý Sự Cố FA):
- Bóc tách và chuẩn hóa toàn bộ thông tin thành cấu trúc Xử lý sự cố (Troubleshooting Guide) gồm:
  1. **📌 Thông tin Trạm & Mã lỗi (Station & Error Code)**
  2. **⚠️ Hiện tượng lỗi (Symptom / 不良现象)**
  3. **🔍 Phân tích Nguyên nhân gốc (Root Cause / 根本原因)**
  4. **🛠️ Các bước Kiểm tra & Xử lý (Step-by-step Action / 排查与对策)**
  5. **🛡️ Tiêu chuẩn Xác nhận & Phòng ngừa tái phát (Verification & Prevention / 验证与预防)**`
          : `CHẾ ĐỘ ĐẦU RA ("sop" - Chuẩn hóa thành Quy trình SOP / Work Instruction chuẩn ISO Nhà máy):
- Dù văn bản gốc là tin nhắn rời rạc từ WeChat/Lark hay tài liệu thô, hãy biên tập và chuẩn hóa thành **Quy trình Thao tác Chuẩn (SOP / WI)** chuyên nghiệp gồm 5 phần rõ ràng:
  1. **🎯 1. Mục đích & Phạm vi Trạm áp dụng (Purpose & Station Scope)**
  2. **🧰 2. Thiết bị, Jig/Fixture & Dụng cụ chuẩn bị (Equipment, Fixture & Golden Sample)**
  3. **📋 3. Quy trình Thao tác Từng bước (Step-by-Step Standard Procedure)**
  4. **✅ 4. Tiêu chuẩn Phán định PASS / FAIL & Thông số Spec (Criteria & Spec Limits)**
  5. **⚡ 5. Lưu ý An toàn, ESD & Bảo dưỡng định kỳ (ESD, Safety & PM Notes)**`;

    const prompt = `Bạn là Chuyên gia Ngôn ngữ Kỹ thuật & Kỹ sư Trưởng Kiểm thử (Principal Test Engineer - TE) thôngạo Tiếng Trung Nhà máy (简体/繁体中文), Tiếng Việt và Tiếng Anh chuyên ngành Sản xuất Điện tử (SMT, ICT, FCT, RF, AOI, Jig/Fixture, SFC/MES).

${TE_FACTORY_GLOSSARY_RULES}

${directionRule}

${modeRule}

${station ? `Gợi ý Trạm áp dụng do kỹ sư chọn: ${station}` : ""}

NHIỆM VỤ:
1. Nếu có hình ảnh đính kèm, hãy OCR đọc toàn bộ chữ Hán / tiếng Anh / tiếng Việt, bảng biểu, thông số trên màn hình máy hoặc tài liệu giấy.
2. Thực hiện dịch thuật và chuẩn hóa theo đúng HƯỚNG DỊCH và CHẾ ĐỘ ĐẦU RA bên trên. Trình bày bằng Markdown rõ ràng, chia dòng thoáng, in đậm các thông số Spec/Limit và mã lỗi.
3. Trích xuất danh sách **5 đến 10 thuật ngữ kỹ thuật chuyên ngành TE** quan trọng xuất hiện trong tài liệu này để đưa vào mảng "glossary" (gồm chữ Hán \`zh\`, phiên âm \`pinyin\` có dấu thanh điệu chính xác, nghĩa chuyên ngành TE tiếng Việt \`vi\`, và thuật ngữ tiếng Anh \`en\`).
4. Đề xuất thông tin phân loại để kỹ sư có thể bấm 1 nút lưu thẳng vào Kho Tri Thức RAG (\`suggestedTitle\`, \`suggestedCategory\`, \`suggestedStation\`, \`suggestedErrorCode\`, \`suggestedTags\`).

BẮT BUỘC TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON HỢP LỆ (Không bọc ngoài bằng giải thích thừa) theo cấu trúc sau:
{
  "translatedContent": "Nội dung tài liệu đã dịch và chuẩn hóa trình bày bằng Markdown...",
  "suggestedTitle": "Tiêu đề chuẩn hóa ngắn gọn (VD: SOP Bảo dưỡng Kim Pogo Pin & Xử lý lỗi E-901 Trạm RF)",
  "suggestedCategory": "Một trong: FCT | ICT | AOI | SMT | RF | SFC / MES | Fixture / Jig | SOP / Manual | Khác",
  "suggestedStation": "Tên trạm máy phát hiện được (VD: FCT-02, RF Shielding, ICT...)",
  "suggestedErrorCode": "Mã lỗi phát hiện được nếu có (VD: E-901, NTF, RF_TX_FAIL... hoặc chuỗi rỗng)",
  "suggestedTags": "Các từ khóa cách nhau bởi dấu phẩy (VD: SOP, Pogo Pin, RF, Golden Sample, Dịch Trung-Việt)",
  "glossary": [
    {
      "zh": "测试治具",
      "pinyin": "cè shì zhì jù",
      "vi": "Bộ Jig / Fixture kiểm thử",
      "en": "Test Fixture / Jig"
    }
  ]
}

=== NỘI DUNG TÀI LIỆU / TIN NHẮN CẦN DỊCH & CHUẨN HÓA ===
${text || "(Vui lòng đọc nội dung từ hình ảnh tài liệu đính kèm)"}`;

    const parts: Array<{
      text?: string;
      inlineData?: { mimeType: string; data: string };
    }> = [{ text: prompt }];

    if (imageInline && imageInline.data) {
      parts.push({
        inlineData: {
          mimeType: imageInline.mimeType || "image/jpeg",
          data: imageInline.data,
        },
      });
    }

    let lastError = "";
    for (const model of MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(20000),
        });

        const data = await res.json();
        const candParts = data?.candidates?.[0]?.content?.parts || [];
        const textPart = candParts.find(
          (p: { text?: string; thought?: boolean }) =>
            typeof p.text === "string" && !p.thought
        );
        const rawOutput = (textPart?.text || candParts[0]?.text || "").trim();

        if (res.ok && rawOutput) {
          let parsed: {
            translatedContent?: string;
            suggestedTitle?: string;
            suggestedCategory?: string;
            suggestedStation?: string;
            suggestedErrorCode?: string;
            suggestedTags?: string;
            glossary?: Array<{
              zh: string;
              pinyin: string;
              vi: string;
              en: string;
            }>;
          } = {};

          try {
            const cleanJson = rawOutput
              .replace(/^```json\s*/i, "")
              .replace(/```$/i, "")
              .trim();
            parsed = JSON.parse(cleanJson);
          } catch {
            parsed = {
              translatedContent: rawOutput,
              suggestedTitle: "Tài liệu SOP Kỹ thuật TE (Đã chuẩn hóa)",
              suggestedCategory: "SOP / Manual",
              suggestedStation: station || "FCT",
              suggestedErrorCode: "",
              suggestedTags: "SOP, Trung-Việt, TE",
              glossary: [],
            };
          }

          const meta = data.usageMetadata || {};
          void TokenUsage.create({
            dateKey: getLocalDateKey(),
            actionType: "chat",
            modelName: model,
            promptTokens: meta.promptTokenCount || 0,
            candidatesTokens: meta.candidatesTokenCount || 0,
            thoughtsTokens: meta.thoughtsTokenCount || 0,
            totalTokens: meta.totalTokenCount || 0,
          }).catch(() => {});

          return NextResponse.json({
            success: true,
            translatedContent: parsed.translatedContent || rawOutput,
            suggestedTitle:
              parsed.suggestedTitle ||
              "Tài liệu SOP Kỹ thuật TE (Đã chuẩn hóa)",
            suggestedCategory: parsed.suggestedCategory || "SOP / Manual",
            suggestedStation: parsed.suggestedStation || station || "",
            suggestedErrorCode: parsed.suggestedErrorCode || "",
            suggestedTags:
              parsed.suggestedTags || "SOP, Dịch Trung-Việt, Chuẩn hóa TE",
            glossary: Array.isArray(parsed.glossary) ? parsed.glossary : [],
            modelUsed: model,
          });
        }

        lastError = data?.error?.message || `HTTP ${res.status}`;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: `Không thể dịch tài liệu lúc này: ${lastError}`,
      },
      { status: 500 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Lỗi xử lý dịch thuật SOP";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
