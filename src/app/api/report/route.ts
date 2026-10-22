import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TokenUsage } from "@/models/TokenUsage";
import { getEffectiveApiKey, getLocalDateKey } from "@/lib/gemini";

const REPORT_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemma-4-31b-it",
];

interface ChatMsgInput {
  role: "user" | "assistant";
  content: string;
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
        { success: false, error: "Chưa cấu hình GEMINI_API_KEY." },
        { status: 400 }
      );
    }

    const messages: ChatMsgInput[] = Array.isArray(body.messages)
      ? body.messages
      : [];
    const reportType: "handover" | "8d" =
      body.reportType === "8d" ? "8d" : "handover";
    const reportLang: "vi" | "en" | "zh" =
      body.reportLang === "en" || body.reportLang === "zh"
        ? body.reportLang
        : "vi";
    const sessionTitle: string = body.sessionTitle || "Sự cố kỹ thuật trạm Test";

    if (messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Chưa có nội dung hội thoại nào để tổng hợp báo cáo. Hãy trò chuyện hoặc chọn 1 phiên từ Lịch sử trước.",
        },
        { status: 400 }
      );
    }

    const transcript = messages
      .map(
        (m, idx) =>
          `[${idx + 1}] ${m.role === "user" ? "TE ENGINEER" : "AI ASSISTANT"}:\n${m.content}`
      )
      .join("\n\n---\n\n");

    const nowStr = new Date().toLocaleString("vi-VN", {
      hour12: false,
    });

    const langDirective =
      reportLang === "en"
        ? `NGÔN NGỮ XUẤT BÁO CÁO (OUTPUT LANGUAGE): **TIẾNG ANH (100% PROFESSIONAL FACTORY ENGLISH)**.
Sử dụng thuật ngữ chuẩn kỹ thuật kiểm thử phần cứng quốc tế (ICT, FCT, RF, Pogo Pin, Fixture, Golden Sample, False Fail, Contact Resistance, Retest OK, SOP, PM Checklist).`
        : reportLang === "zh"
          ? `NGÔN NGỮ XUẤT BÁO CÁO (OUTPUT LANGUAGE): **TIẾNG TRUNG GIẢN THỂ (100% 简体中文 - 电子制造厂标准工程术语)**.
Sử dụng đúng thuật ngữ chuyên ngành Test Engineer trong nhà máy điện tử (Foxconn/Luxshare/Pegatron): 工站 (Station), 治具 (Fixture/Jig), 探针 (Pogo Pin), 误测/假fail (False Fail), 根本原因 (Root Cause), 临时围堵措施 (Containment), 永久改善对策 (Corrective Action), 预防再发 (Preventive Action), 金样 (Golden Sample), 首Pass良率 (FPY).`
          : `NGÔN NGỮ XUẤT BÁO CÁO (OUTPUT LANGUAGE): **TIẾNG VIỆT (Chuẩn thuật ngữ Kỹ sư Test TE nhà máy)**.`;

    let formatInstruction = "";

    if (reportType === "handover") {
      if (reportLang === "en") {
        formatInstruction = `Synthesize the troubleshooting conversation into a concise **TE SHIFT HANDOVER REPORT** in **English**, formatted cleanly line-by-line for mobile reading (Teams / Zalo / WeChat / Email):

📋 TE SHIFT HANDOVER REPORT
🕒 Time: ${nowStr}
📌 Issue / Topic: (Concise summary of error code & station)
━━━━━━━━━━━━━━━━━━━━
1. ⚠️ SYMPTOM & ERROR CODE:
- Station / Equipment: ...
- Error Code / Failed Item: ...
- Observed Symptom: ...

2. 🔍 ROOT CAUSE:
- ...

3. 🛠️ ACTION TAKEN IN SHIFT:
- ...

4. 👀 NEXT SHIFT FOLLOW-UP:
- Current Status: (Running Normally / Monitoring)
- Handover Notes: ...`;
      } else if (reportLang === "zh") {
        formatInstruction = `Hãy tổng hợp cuộc hội thoại trên thành **BÁO CÁO GIAO CA KỸ THUẬT TEST (测试工程交接班报告)** hoàn toàn bằng **Tiếng Trung (简体中文)**, trình bày từng dòng rõ ràng để gửi WeChat / Zalo / DingTalk / Teams:

📋 测试工程交接班报告 (TE SHIFT HANDOVER)
🕒 时间: ${nowStr}
📌 异常主题: (简述工站与错误代码)
━━━━━━━━━━━━━━━━━━━━
1. ⚠️ 不良现象与错误代码 (SYMPTOM):
- 测试工站 / 设备: ...
- 错误代码 / 测试项: ...
- 异常现象描述: ...

2. 🔍 根本原因分析 (ROOT CAUSE):
- ...

3. 🛠️ 当班处理对策 (ACTION TAKEN):
- ...

4. 👀 下班次跟进事项 (NEXT SHIFT FOLLOW-UP):
- 当前状态: (已恢复正常生产 / 持续监控中)
- 交接注意事项: ...`;
      } else {
        formatInstruction = `Hãy tổng hợp cuộc hội thoại xử lý sự cố trên thành **BÁO CÁO GIAO CA NHANH (SHIFT HANDOVER REPORT)** bằng **Tiếng Việt**, trình bày rõ ràng từng dòng để gửi Zalo / Microsoft Teams / Line:

📋 BÁO CÁO GIAO CA KỸ THUẬT TEST (TE SHIFT HANDOVER)
🕒 Thời gian: ${nowStr}
📌 Chủ đề / Sự cố: (Tóm tắt ngắn gọn tên lỗi và trạm máy)
━━━━━━━━━━━━━━━━━━━━
1. ⚠️ HIỆN TƯỢNG & MÃ LỖI (SYMPTOM):
- Trạm Test / Thiết bị: ...
- Mã lỗi / Bài đo Fail: ...
- Triệu chứng ghi nhận: ...

2. 🔍 NGUYÊN NHÂN GỐC (ROOT CAUSE):
- ...

3. 🛠️ HÀNH ĐỘNG ĐÃ XỬ LÝ TRONG CA (ACTION TAKEN):
- ...

4. 👀 HƯỚNG DẪN THEO DÕI CA SAU (NEXT SHIFT FOLLOW-UP):
- Tình trạng hiện tại: (Đã chạy lại ổn định / Đang theo dõi thêm)
- Lưu ý bàn giao ca sau: ...`;
      }
    } else {
      // 8D / CAPA Report
      if (reportLang === "en") {
        formatInstruction = `Synthesize the troubleshooting conversation into a formal **8D / CAPA ENGINEERING INCIDENT REPORT** in **English** for PE / QE / Production Management:

📑 8D / CAPA ENGINEERING INCIDENT REPORT
🕒 Date: ${nowStr}
📌 Incident Title: (Error code, station & issue summary)
━━━━━━━━━━━━━━━━━━━━
• [D1 & D2] PROBLEM DESCRIPTION:
  - Station / Line: ...
  - Error Code / Spec Limit: ...
  - Detailed Symptom: ...

• [D3] CONTAINMENT ACTION:
  - Golden Sample verification / Suspect PCBA isolation / Fixture check...

• [D4] ROOT CAUSE ANALYSIS (5 WHYS):
  - Direct Technical Cause (Hardware / Fixture / Pogo Pin / Signal / SW): ...
  - Systemic / Maintenance Cause: ...

• [D5 & D6] PERMANENT CORRECTIVE ACTION & VERIFICATION:
  - Repair / Calibration / Replacement steps performed: ...
  - Verification Results (e.g. measured values & continuous PASS count): ...

• [D7] PREVENTIVE ACTION:
  - PM Checklist update / SOP revision / Spec optimization...`;
      } else if (reportLang === "zh") {
        formatInstruction = `Hãy tổng hợp cuộc hội thoại trên thành **BÁO CÁO PHÂN TÍCH & KHẮC PHỤC SỰ CỐ 8D (8D 异常分析与改善报告)** hoàn toàn bằng **Tiếng Trung (简体中文)** chuẩn nhà máy điện tử:

📑 8D 工程异常分析与改善报告 (TE CAPA REPORT)
🕒 日期: ${nowStr}
📌 异常标题: (工站、错误代码及异常简述)
━━━━━━━━━━━━━━━━━━━━
• [D1 & D2] 问题描述 (PROBLEM DESCRIPTION):
  - 发生工站 / 线体: ...
  - 错误代码 / 规格范围: ...
  - 异常现象详述: ...

• [D3] 临时围堵措施 (CONTAINMENT ACTION):
  - 金样 (Golden Sample) 确认 / 疑似不良品隔离 / 治具点检...

• [D4] 根本原因分析 (ROOT CAUSE ANALYSIS - 5 WHYS):
  - 直接技术原因 (硬件 / 治具探针 / 信号衰减 / 软件): ...
  - 系统与管理原因: ...

• [D5 & D6] 永久改善对策与效果验证 (CORRECTIVE ACTION & VERIFICATION):
  - 已执行的维修、校准或更换探针/零件步骤: ...
  - 验证结果 (实测数值恢复情况及连续过板 PASS 数量): ...

• [D7] 预防再发措施 (PREVENTIVE ACTION):
  - 更新治具定期保养 (PM) 点检表 / 修订 SOP 标准作业指导书...`;
      } else {
        formatInstruction = `Hãy tổng hợp cuộc hội thoại xử lý sự cố trên thành **BÁO CÁO KỸ THUẬT CHUẨN 8D / CAPA (ENGINEERING INCIDENT REPORT)** bằng **Tiếng Việt**:

📑 BÁO CÁO PHÂN TÍCH & KHẮC PHỤC SỰ CỐ 8D (TE CAPA REPORT)
🕒 Ngày lập: ${nowStr}
📌 Tiêu đề sự cố: (Tên sự cố, mã lỗi & trạm test)
━━━━━━━━━━━━━━━━━━━━
• [D1 & D2] MÔ TẢ SỰ CỐ (PROBLEM DESCRIPTION):
  - Trạm máy / Line: ...
  - Mã lỗi / Thông số kỹ thuật: ...
  - Chi tiết hiện tượng: ...

• [D3] HÀNH ĐỘNG NGĂN CHẶN TẠM THỜI (CONTAINMENT ACTION):
  - Kiểm tra Golden Sample / Cô lập bản mạch nghi ngờ / Kiểm tra jig gá...

• [D4] PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS - 5 WHYS):
  - Nguyên nhân trực tiếp (Hardware / Fixture / Signal / Software): ...
  - Nguyên nhân hệ thống: ...

• [D5 & D6] ĐỐI SÁCH KHẮC PHỤC VĨNH VIỄN (CORRECTIVE ACTION):
  - Các bước hiệu chuẩn, sửa chữa hoặc thay thế linh kiện/kim đo đã thực hiện: ...
  - Cách xác nhận máy hoạt động tốt trở lại (Verification): ...

• [D7] PHÒNG NGỪA TÁI PHÁT (PREVENTIVE ACTION):
  - Đề xuất cập nhật lịch bảo dưỡng định kỳ (PM) / Cập nhật SOP / Tinh chỉnh spec...`;
      }
    }

    const prompt = `Bạn là Kỹ sư Trưởng bộ phận Test (Lead Test Engineer) đa ngôn ngữ (Việt - Anh - Trung) trong nhà máy sản xuất điện tử.
Dưới đây là nhật ký hội thoại chẩn đoán kỹ thuật của ca trực (Tiêu đề phiên: "${sessionTitle}"):

=== NHẬT KÝ HỘI THOẠI ===
${transcript}
=========================

${langDirective}

Nhiệm vụ của bạn:
1. Viết bản báo cáo hoàn chỉnh trong trường "reportText" theo đúng ngôn ngữ đã yêu cầu ở trên (${reportLang === "en" ? "Tiếng Anh" : reportLang === "zh" ? "Tiếng Trung 简体中文" : "Tiếng Việt"}).
2. Trích xuất thông tin tóm tắt vào "extractedNote" để lưu vào Sổ tay Tri thức RAG.

${formatInstruction}

Trả về kết quả dưới dạng một đối tượng JSON hợp lệ theo cấu trúc sau:
{
  "reportText": "Toàn bộ nội dung văn bản báo cáo theo đúng ngôn ngữ đã chọn",
  "extractedNote": {
    "title": "Tiêu đề ngắn gọn để lưu vào Sổ tay kinh nghiệm",
    "category": "Chọn 1 trong: ICT / FCT | SMT / AOI | RF / Wireless | SFC / MES | Fixture / Jig | SOP / Manual | Khác",
    "errorCode": "Mã lỗi trích xuất được (hoặc để trống)",
    "station": "Tên trạm test trích xuất được (hoặc để trống)",
    "tags": "Các từ khóa cách nhau bởi dấu phẩy"
  }
}`;

    let lastError = "";

    for (const modelName of REPORT_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${effectiveKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.25,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
            },
          }),
        });

        const data = await res.json();
        const rawText = (
          data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
        ).trim();

        if (!res.ok || !rawText) {
          lastError = data?.error?.message || `HTTP ${res.status}`;
          continue;
        }

        const meta = data.usageMetadata || {};
        const promptTokens =
          meta.promptTokenCount || Math.ceil(prompt.length / 4);
        const candidatesTokens =
          meta.candidatesTokenCount || Math.ceil(rawText.length / 4);
        const thoughtsTokens = meta.thoughtsTokenCount || 0;
        const totalTokens =
          meta.totalTokenCount ||
          promptTokens + candidatesTokens + thoughtsTokens;

        try {
          await TokenUsage.create({
            dateKey: getLocalDateKey(),
            actionType: "chat",
            modelName,
            promptTokens,
            candidatesTokens,
            thoughtsTokens,
            totalTokens,
          });
        } catch {
          // non-blocking
        }

        let reportText = rawText;
        let extractedNote = {
          title: sessionTitle,
          category: "ICT / FCT",
          errorCode: "",
          station: "",
          tags: "Report, Handover, 8D",
        };

        const cleanedJson = rawText
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```$/i, "")
          .trim();

        const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.reportText) reportText = String(parsed.reportText);
            if (parsed.extractedNote) {
              extractedNote = {
                title: String(parsed.extractedNote.title || sessionTitle),
                category: String(parsed.extractedNote.category || "ICT / FCT"),
                errorCode: String(parsed.extractedNote.errorCode || ""),
                station: String(parsed.extractedNote.station || ""),
                tags: Array.isArray(parsed.extractedNote.tags)
                  ? parsed.extractedNote.tags.join(", ")
                  : String(
                      parsed.extractedNote.tags || "Report, Handover, 8D"
                    ),
              };
            }
          } catch {
            const fieldMatch = cleanedJson.match(
              /"reportText"\s*:\s*"((?:[^"\\]|\\.)*)/
            );
            if (fieldMatch && fieldMatch[1]) {
              reportText = fieldMatch[1]
                .replace(/\\n/g, "\n")
                .replace(/\\"/g, '"');
            }
          }
        }

        return NextResponse.json({
          success: true,
          reportType,
          reportLang,
          modelUsed: modelName,
          reportText,
          extractedNote,
          usage: {
            promptTokens,
            candidatesTokens,
            thoughtsTokens,
            totalTokens,
          },
        });
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: `Không thể tạo báo cáo: ${lastError}`,
      },
      { status: 500 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Lỗi hệ thống khi tạo báo cáo";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
