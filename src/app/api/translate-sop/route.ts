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
BỘ QUY TẮC TỪ ĐIỂN CỨNG NGÀNH TEST ENGINEERING (TE / SMT / FATP NHÀ MÁY ĐIỆN TỬ - KÈM PINYIN CHUẨN):
Tuyệt đối KHÔNG dịch word-by-word kiểu Google Dịch. Bắt buộc dùng đúng thuật ngữ chuyên ngành tại xưởng sản xuất điện tử và đúng phiên âm Pinyin dưới đây:
- 治具 / 测试治具 (cè shì zhì jù) / 夹具 (jiā jù) <-> Jig / Fixture kiểm thử (Test Fixture / Jig)
- 探针 (tàn zhēn) / 顶针 (dǐng zhēn) / 测试针 (cè shì zhēn) <-> Kim test Pogo Pin (Pogo Pin / Test Probe)
- 针床 (zhēn chuáng) / 针板 (zhēn bǎn) <-> Đế kim / Bàn kim (Pin Plate / Bed of Nails)
- 误测 (wù cè) / 假不良 (jiǎ bù liáng) / 假Fail <-> Lỗi giả / NTF (No Trouble Found / False Call)
- 金样 (jīn yàng) / 黄金样品 (huáng jīn yàng pǐn) <-> Bản mẫu chuẩn (Golden Sample)
- 不良品 (bù liáng pǐn) / 故障品 (gù zhàng pǐn) / 坏机 (huài jī) <-> Bản mạch lỗi / Hàng NG (FAIL / Defective Unit)
- 良品 (liáng pǐn) / 好机 (hǎo jī) <-> Bản mạch đạt / Hàng OK (PASS / Good Unit)
- 上位机 (shàng wèi jī) / 测试软件 (cè shì ruǎn jiàn) <-> Phần mềm điều khiển trạm test trên Host PC (Host Test UI)
- 下位机 (xià wèi jī) / 控制板 (kòng zhì bǎn) <-> Mạch điều khiển dưới Jig / PLC / MCU Firmware
- 过站 (guò zhàn) / 卡站 (kǎ zhàn) / 跳站 (tiào zhàn) <-> Qua trạm / Chặn trạm (Interlock) / Nhảy cóc trạm trên hệ thống SFC / MES
- 点检 (diǎn jiǎn) / 首件点检 (shǒu jiàn diǎn jiǎn - FAI) <-> Kiểm tra định kỳ đầu ca / Kiểm tra mẫu đầu chuyền (Daily Check / First Article Inspection)
- 点检表 (diǎn jiǎn biǎo) / 保养表 (bǎo yǎng biǎo) <-> Bảng Checklist kiểm tra định kỳ (PM Checklist)
- 屏蔽箱 (píng bì xiāng) / 隔离箱 (gé lí xiāng) <-> Hộp chắn sóng RF (RF Shielding Box)
- 吸波材料 (xī bō cái liào) / 屏蔽条 (píng bì tiáo) <-> Vật liệu hấp thụ sóng RF / Gioăng chống nhiễu RF (RF Absorber / Gasket)
- 网分 (wǎng fēn - VNA) / 综测仪 (zōng cè yí) <-> Máy phân tích mạng Vector (VNA) / Máy đo tổng hợp RF (CMW500 / MT8870)
- 衰减器 (shuāi jiǎn qì) / 耦合板 (ǒu hé bǎn) / 射频线 (shè pín xiàn) <-> Bộ suy hao (Attenuator) / Anten ghép nối (Coupler) / Cáp RF đồng trục
- 插损 (chā sǔn - Insertion Loss) / 驻波比 (zhù bō bǐ - VSWR) <-> Suy hao chèn (Insertion Loss) / Tỷ số sóng đứng (VSWR)
- 气缸 (qì gāng) / 气压 (qì yā) / 电磁阀 (diàn cí fá) <-> Xy-lanh khí nén / Áp suất khí nén / Van điện từ (Solenoid Valve)
- 下压到位 (xià yā dào wèi) / 传感器 (chuán gǎn qì) / 光栅 (guāng zhà) <-> Hành trình ép Jig chạm đích / Cảm biến (Sensor) / Rèm quang an toàn (Light Curtain)
- 虚焊 (xū hàn) / 假焊 (jiǎ hàn) / 冷焊 (lěng hàn) <-> Hàn giả / Hở chân hàn (Cold Solder / Open Joint)
- 连锡 (lián xī) / 短路 (duǎn lù) / 桥接 (qiáo jiē) <-> Chập cầu thiếc / Ngắn mạch (Solder Bridge / Short Circuit)
- 少锡 (shǎo xī) / 锡珠 (xī zhū) / 偏移 (piān yí) / 立碑 (lì bēi) <-> Thiếu thiếc / Bi thiếc (Solder Ball) / Lệch linh kiện / Dựng bia (Tombstone)
- 锡膏 (xī gāo) / 钢网 (gāng wǎng) / 回流焊 (huí liú hàn) <-> Kem hàn (Solder Paste) / Khuôn in (Stencil) / Lò hàn (Reflow Oven)
- 直通率 (zhí tōng lǜ - FPY) / 良率 (liáng lǜ - Yield) / 重测率 (chóng cè lǜ) <-> Tỷ lệ đạt lần đầu (FPY) / Hiệu suất (Yield) / Tỷ lệ test lại
- 不良现象 (bù liáng xiàn xiàng) / 根本原因 (gēn běn yuán yīn) / 临时对策 (lín shí duì cè) / 永久对策 (yǒng jiǔ duì cè) <-> Hiện tượng lỗi (Symptom) / Nguyên nhân gốc (Root Cause) / Đối sách tạm thời (Containment Action) / Đối sách vĩnh viễn (Corrective Action)
`;

function cleanHybridChineseVietnamese(text: string): string {
  return text
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "  ")
    // Ensure markdown headings (###) always start on a new line
    .replace(/([^\n])\s*(#{2,4}\s+)/g, "$1\n\n$2")
    .replace(/điểm\s*检/gi, "kiểm tra định kỳ (点检)")
    .replace(/ngắn\s*路/gi, "ngắn mạch (短路)")
    .replace(/hở\s*路/gi, "hở mạch (开路)")
    .replace(/qua\s*站/gi, "qua trạm (过站)")
    .replace(/chặn\s*站/gi, "chặn trạm (卡站)");
}

function safeParseTranslationJson(rawOutput: string) {
  const cleaned = rawOutput
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Sanitize unescaped LaTeX backslashes like \pm, \ge, \le, \Omega inside JSON strings
    const sanitized = cleaned.replace(/\\(?![/bfnrtu"\\])/g, "\\\\");
    return JSON.parse(sanitized);
  }
}

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

    let directionAndModeInstruction = "";

    if (direction === "vi-zh") {
      // VIETNAMESE -> SIMPLIFIED CHINESE (For reporting to Chinese HQ / Specialists)
      if (mode === "bilingual") {
        directionAndModeInstruction = `
NGÔN NGỮ & CHẾ ĐỘ ĐẦU RA BẮT BUỘC (VIỆT ➔ TRUNG SONG NGỮ ĐỐI CHIẾU):
- Dịch từ Tiếng Việt sang **Tiếng Trung Giản Thể chuẩn Nhà máy Điện tử (简体中文 - 电子制造/测试工程标准术语)**.
- Trình bày từng đoạn/mục theo cặp song ngữ đối chiếu:
  + **🇨🇳 中文专业表述 (Bản Tiếng Trung gửi Chuyên gia/HQ):** [Câu tiếng Trung chuẩn thuật ngữ nhà máy]
  + **🇻🇳 Nguyên bản / Đối chiếu Tiếng Việt:** [Câu tiếng Việt tương ứng]
- Tiêu đề gợi ý (\`suggestedTitle\`) viết bằng Tiếng Trung kèm Tiếng Việt trong ngoặc.`;
      } else if (mode === "troubleshooting") {
        directionAndModeInstruction = `
NGÔN NGỮ & CHẾ ĐỘ ĐẦU RA BẮT BUỘC (VIỆT ➔ BÁO CÁO FA / 8D TIẾNG TRUNG GIẢN THỂ 100%):
- Dịch và chuẩn hóa toàn bộ báo cáo Tiếng Việt sang **100% TIẾNG TRUNG GIẢN THỂ CHUẨN NHÀ MÁY (简体中文)** (kèm thuật ngữ Tiếng Việt trong ngoặc ở các tiêu đề mục để kỹ sư dễ kiểm tra) nhằm gửi báo cáo trực tiếp cho Sếp / Chuyên gia Trung Quốc / R&D HQ:
  ### 📌 1. 工站与异常代码 (Trạm & Mã lỗi)
  ### ⚠️ 2. 不良现象描述 (Hiện tượng lỗi / Symptom)
  ### 🔍 3. 根本原因分析 (Nguyên nhân gốc / Root Cause)
  ### 🛠️ 4. 改善对策与排查步骤 (Đối sách tạm thời & Vĩnh viễn / Action)
  ### 🛡️ 5. 效果验证与预防措施 (Xác nhận Golden Sample & Phòng ngừa / Verification)`;
      } else {
        directionAndModeInstruction = `
NGÔN NGỮ & CHẾ ĐỘ ĐẦU RA BẮT BUỘC (VIỆT ➔ QUY TRÌNH SOP TIẾNG TRUNG GIẢN THỂ 100%):
- Dịch và chuẩn hóa toàn bộ nội dung sang **100% TIẾNG TRUNG GIẢN THỂ CHUẨN NHÀ MÁY (简体中文 SOP 标准作业指导书)**:
  ### 🎯 1. 目的与适用工站 (Mục đích & Phạm vi trạm)
  ### 🧰 2. 测试设备、治具与金样准备 (Thiết bị, Jig & Golden Sample)
  ### 📋 3. 标准作业与点检步骤 (Các bước thao tác chuẩn)
  ### ✅ 4. 判定标准与规格限值 (Tiêu chuẩn PASS/FAIL & Spec)
  ### ⚡ 5. ESD静电防护与保养注意事项 (Lưu ý An toàn ESD & PM)`;
      }
    } else if (direction === "auto-en") {
      // CHINESE / VIETNAMESE -> ENGLISH (For Customer Audit)
      if (mode === "bilingual") {
        directionAndModeInstruction = `
NGÔN NGỮ & CHẾ ĐỘ ĐẦU RA BẮT BUỘC (BILINGUAL ENGLISH - VIETNAMESE/CHINESE):
- Dịch và chuẩn hóa sang **Tiếng Anh Kỹ thuật Chuẩn Quốc tế (Professional Test Engineering English)** song song với ngôn ngữ gốc:
  + **🇺🇸 English Standard (Audit Ready):** [Professional TE English translation]
  + **🇻🇳/🇨🇳 Original / Vietnamese Reference:** [Bản dịch Tiếng Việt / Nguyên bản]`;
      } else if (mode === "troubleshooting") {
        directionAndModeInstruction = `
NGÔN NGỮ & CHẾ ĐỘ ĐẦU RA BẮT BUỘC (100% PROFESSIONAL TEST ENGINEERING ENGLISH - FA REPORT):
- Dịch và chuẩn hóa toàn bộ nội dung sang **100% TIẾNG ANH KỸ THUẬT (ENGLISH)** chuẩn báo cáo FA/8D cho Khách hàng quốc tế:
  ### 📌 1. Station & Error Code Identification
  ### ⚠️ 2. Failure Symptom & Impact (FPY / NTF Rate)
  ### 🔍 3. Root Cause Analysis (RCA)
  ### 🛠️ 4. Containment & Corrective Actions (Step-by-Step)
  ### 🛡️ 5. Golden Sample Verification & Preventive Actions`;
      } else {
        directionAndModeInstruction = `
NGÔN NGỮ & CHẾ ĐỘ ĐẦU RA BẮT BUỘC (100% PROFESSIONAL TEST ENGINEERING ENGLISH - ISO SOP):
- Dịch và chuẩn hóa toàn bộ nội dung sang **100% TIẾNG ANH KỸ THUẬT (ENGLISH)** chuẩn quy trình SOP/WI quốc tế:
  ### 🎯 1. Purpose & Station Scope
  ### 🧰 2. Test Equipment, Fixture & Golden Sample Preparation
  ### 📋 3. Step-by-Step Standard Operating Procedure (SOP)
  ### ✅ 4. Pass/Fail Criteria & Specification Limits
  ### ⚡ 5. ESD Control, Safety & Preventive Maintenance (PM)`;
      }
    } else {
      // DEFAULT: CHINESE -> VIETNAMESE (zh-vi)
      if (mode === "bilingual") {
        directionAndModeInstruction = `
NGÔN NGỮ & CHẾ ĐỘ ĐẦU RA BẮT BUỘC (TRUNG ➔ VIỆT SONG NGỮ ĐỐI CHIẾU TỪNG ĐOẠN - BẮT BUỘC HIỂN THỊ CẢ 2 NGÔN NGỮ):
- Tuyệt đối KHÔNG được chỉ in mỗi tiếng Việt. Bắt buộc chia tài liệu thành từng mục/đoạn và luôn hiển thị song song 2 dòng đối chiếu nhau:
  ### 🇨🇳 Nguyên bản Tiếng Trung (中文原文)
  [Trích dẫn nguyên văn từng câu/mục Tiếng Trung gốc]
  ### 🇻🇳 Bản dịch Chuẩn TE Tiếng Việt (越文工程标准翻译)
  [Bản dịch Tiếng Việt chuyên ngành TE tương ứng 100%, giữ mã lỗi và chú thích thuật ngữ]`;
      } else if (mode === "troubleshooting") {
        directionAndModeInstruction = `
NGÔN NGỮ & CHẾ ĐỘ ĐẦU RA BẮT BUỘC (TRUNG ➔ VIỆT CHUẨN HÓA BẢNG MÃ LỖI & HƯỚNG DẪN XỬ LÝ SỰ CỐ FA):
- Dịch từ Tiếng Trung sang **100% TIẾNG VIỆT CHUYÊN NGÀNH TE** (kèm thuật ngữ gốc chữ Hán trong ngoặc đơn ở những từ khóa quan trọng để kỹ sư dễ đối chiếu trên màn hình máy):
  ### 📌 1. Thông tin Trạm & Mã lỗi (Station & Error Code)
  ### ⚠️ 2. Hiện tượng lỗi (Symptom / 不良现象)
  ### 🔍 3. Phân tích Nguyên nhân gốc (Root Cause / 根本原因)
  ### 🛠️ 4. Các bước Kiểm tra & Xử lý (Step-by-step Action / 排查与对策)
  ### 🛡️ 5. Tiêu chuẩn Xác nhận & Phòng ngừa tái phát (Verification & Prevention / 验证与预防)`;
      } else {
        directionAndModeInstruction = `
NGÔN NGỮ & CHẾ ĐỘ ĐẦU RA BẮT BUỘC (TRUNG ➔ VIỆT CHUẨN HÓA QUY TRÌNH SOP / WI NHÀ MÁY):
- Dịch từ Tiếng Trung sang **100% TIẾNG VIỆT CHUYÊN NGÀNH TE** (kèm thuật ngữ gốc chữ Hán trong ngoặc đơn ở những từ khóa quan trọng) và biên tập thành Quy trình SOP 5 bước chuẩn ISO:
  ### 🎯 1. Mục đích & Phạm vi Trạm áp dụng (Purpose & Station Scope)
  ### 🧰 2. Thiết bị, Jig/Fixture & Dụng cụ chuẩn bị (Equipment, Fixture & Golden Sample)
  ### 📋 3. Quy trình Thao tác Từng bước (Step-by-Step Standard Procedure)
  ### ✅ 4. Tiêu chuẩn Phán định PASS / FAIL & Thông số Spec (Criteria & Spec Limits)
  ### ⚡ 5. Lưu ý An toàn, ESD & Bảo dưỡng định kỳ (ESD, Safety & PM Notes)`;
      }
    }

    const prompt = `Bạn là Chuyên gia Ngôn ngữ Kỹ thuật & Kỹ sư Trưởng Kiểm thử (Principal Test Engineer - TE) thông thạo Tiếng Trung Nhà máy (简体/繁体中文), Tiếng Việt và Tiếng Anh chuyên ngành Sản xuất Điện tử (SMT, ICT, FCT, RF, AOI, Jig/Fixture, SFC/MES).

${TE_FACTORY_GLOSSARY_RULES}

${directionAndModeInstruction}

${station ? `Gợi ý Trạm áp dụng: ${station}` : ""}

QUY TẮC TRÌNH BÀY QUAN TRỌNG:
1. KHÔNG dùng cú pháp LaTeX (như $\\pm$, $\\ge$, \\text{}). Hãy dùng trực tiếp ký tự Unicode chuẩn: ±, ≥, ≤, Ω, °C, ~, % để hiển thị đẹp mắt và không làm lỗi chuỗi JSON.
2. Tuyệt đối KHÔNG ghép nửa chữ Việt nửa chữ Hán (ví dụ: phải viết "ngắn mạch (短路)", không được viết "ngắn路").
3. Trích xuất 5 đến 8 thuật ngữ kỹ thuật chuyên ngành TE quan trọng nhất có trong bài vào mảng \`glossary\` (gồm chữ Hán \`zh\`, phiên âm \`pinyin\` có dấu thanh điệu chuẩn, nghĩa tiếng Việt chuyên ngành TE \`vi\`, và tiếng Anh \`en\`).

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

    const responseSchema = {
      type: "OBJECT",
      properties: {
        translatedContent: { type: "STRING" },
        suggestedTitle: { type: "STRING" },
        suggestedCategory: { type: "STRING" },
        suggestedStation: { type: "STRING" },
        suggestedErrorCode: { type: "STRING" },
        suggestedTags: { type: "STRING" },
        glossary: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              zh: { type: "STRING" },
              pinyin: { type: "STRING" },
              vi: { type: "STRING" },
              en: { type: "STRING" },
            },
            required: ["zh", "pinyin", "vi", "en"],
          },
        },
      },
      required: [
        "translatedContent",
        "suggestedTitle",
        "suggestedCategory",
        "suggestedStation",
        "suggestedErrorCode",
        "suggestedTags",
        "glossary",
      ],
    };

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
              responseSchema,
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
            parsed = safeParseTranslationJson(rawOutput);
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
            translatedContent: cleanHybridChineseVietnamese(
              parsed.translatedContent || rawOutput
            ),
            suggestedTitle: cleanHybridChineseVietnamese(
              parsed.suggestedTitle ||
                "Tài liệu SOP Kỹ thuật TE (Đã chuẩn hóa)"
            ),
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
