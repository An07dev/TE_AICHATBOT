export type AppLang = "vi" | "en" | "zh";

export const LANG_OPTIONS: Array<{
  code: AppLang;
  flag: string;
  short: string;
  name: string;
  speechLang: string;
}> = [
  {
    code: "vi",
    flag: "🇻🇳",
    short: "VI",
    name: "Tiếng Việt",
    speechLang: "vi-VN",
  },
  {
    code: "en",
    flag: "🇺🇸",
    short: "EN",
    name: "English",
    speechLang: "en-US",
  },
  {
    code: "zh",
    flag: "🇨🇳",
    short: "中文",
    name: "简体中文",
    speechLang: "zh-CN",
  },
];

export const UI_TEXT = {
  vi: {
    // Auth / Lock Screen
    checkingAuth: "Đang kiểm tra phiên bảo mật...",
    lockTitle: "Khóa Bảo Mật TE Brain AI",
    lockSubtitle: "Nhập Mã PIN 6 số để mở khóa trạm kỹ thuật",
    pinPlaceholder: "Gõ hoặc bấm bàn phím số bên dưới",
    clearAll: "Xóa hết",
    sessionRemembered: "Phiên đăng nhập tự động lưu 30 ngày trên thiết bị này",
    // Top Header
    online: "Online",
    itemsCount: "mục",
    refresh: "Làm mới",
    lockScreen: "Khóa màn hình",
    // Bottom Nav Tabs
    navChat: "Chat AI",
    navAnalytics: "Phân tích",
    navQuickNote: "Ghi nhanh",
    navVault: "Kho lưu",
    navSettings: "Hệ thống",
    // Chat Sub-tabs & Toolbar
    subChat: "Chat",
    subHistory: "Lịch sử",
    subReport: "Báo cáo",
    quickAskLabel: "Chạm để hỏi nhanh:",
    chatPlaceholder: "Nhập mã lỗi hoặc bấm Mic để nói...",
    searchingRag: "Đang tra cứu Kho Tri Thức & phân tích...",
    citedSources: "Nguồn trích dẫn",
    listenGuide: "Nghe hướng dẫn",
    stopListening: "Dừng đọc",
    saveToNote: "Lưu vào Sổ tay",
    attachedImageLabel: "Đã đính kèm ảnh màn hình lỗi",
    listeningVoice: "Đang nghe... (Chạm lại Mic khi xong)",
    transcribingVoice: "Đang chuyển giọng nói thành văn bản...",
    doneBtn: "Xong",
    welcomeMessage:
      "Chào Kỹ sư TE! Tôi là **TE Brain AI** — trợ lý cá nhân đã kết nối trực tiếp với **MongoDB Atlas** và **Gemini RAG**.\n\nBạn có thể chạm vào câu hỏi mẫu, bấm **Mic 🎙️** để nói, hoặc gửi **Mã lỗi / Ảnh chụp màn hình** để tra cứu ngay!",
    // History Sub-tab
    historyTitle: "Lịch sử Phiên Hỗ Trợ Kỹ Thuật",
    historySavedCount: "Đã lưu",
    historySessionsInDb: "phiên trong MongoDB",
    newSessionBtn: "Phiên mới",
    emptyHistoryTitle: "Chưa có phiên hội thoại nào được lưu",
    emptyHistoryDesc:
      "Khi bạn trao đổi mã lỗi với AI, toàn bộ lịch sử từng ca sẽ tự động lưu tại đây để mở lại hoặc xuất báo cáo 8D.",
    activeBadge: "Đang mở",
    exchangeCount: "Số lượt trao đổi:",
    messagesUnit: "tin nhắn",
    updatedAtLabel: "Cập nhật lúc:",
    reopenChatBtn: "Mở lại chat",
    exportReportBtn: "Xuất Báo Cáo",
    // Report Sub-tab
    reportHeaderTitle: "Xuất Báo Cáo Sự Cố Tự Động Từ Phiên Chat",
    reportHeaderDesc:
      "AI sẽ tổng hợp toàn bộ mạch chẩn đoán hiện tại thành biên bản chuẩn nhà máy.",
    step1Template: "1. Chọn mẫu báo cáo cần xuất:",
    handoverTitle: "📱 Mẫu Giao Ca Nhanh",
    handoverDesc:
      "Ngắn gọn, gạch đầu dòng rõ ràng để Copy gửi Zalo / Teams / Line / WeChat cho ca sau.",
    eightDTitle: "📑 Mẫu Kỹ Thuật 8D / CAPA",
    eightDDesc:
      "Đầy đủ D1 → D7 (Triệu chứng, Containment, Root Cause, Corrective & Preventive).",
    step2Lang: "2. Chọn ngôn ngữ xuất báo cáo:",
    generateReportBtn: "Tổng hợp",
    generatingReportBtn: "Đang tổng hợp báo cáo...",
    copyReportBtn: "Copy Báo Cáo",
    downloadTxtBtn: "Tải File Báo Cáo (.TXT)",
    saveToVaultBtn: "Lưu thẳng vào Kho Tri Thức RAG",
    savingToVaultBtn: "Đang tạo Vector & Lưu...",
    emptyReportTitle: "Chưa có bản báo cáo nào được tạo cho phiên này.",
    emptyReportDesc:
      "Hãy chọn mẫu Giao Ca Nhanh hoặc Báo Cáo 8D / CAPA ở trên rồi bấm nút Tổng hợp.",
    // Analytics Tab
    analyzingFileLabel: "File Log Đang Phân Tích",
    uploadLogBtn: "Tải Log",
    sampleLogBtn: "Mẫu",
    kpiFpy: "Tỷ lệ đạt (FPY)",
    kpiTotalFail: "Tổng lượt Lỗi (FAIL)",
    kpiFalseCall: "Báo lỗi ảo (Retest OK)",
    kpiMinCpk: "Chỉ số Cpk thấp nhất",
    tabTopDefects: "Top Lỗi",
    tabCpkIndex: "Chỉ số Cpk",
    tabAiReport: "Báo cáo AI",
    stationLabel: "Trạm:",
    testItemLabel: "Bài đo:",
    askAiFixBtn: "Hỏi AI cách sửa →",
    // Quick Note Tab
    visionTitle: "Quét Ảnh Lỗi Tự Động Điền Sổ Tay",
    visionDesc:
      "Chụp màn hình báo lỗi FCT/ICT/RF/AOI/SFC — AI tự nhận diện & điền đủ 8 mục bên dưới",
    visionScanBtn: "Chụp / Chọn Ảnh Màn Hình Lỗi",
    visionScanningBtn: "Đang đọc ảnh & trích xuất...",
    quickNoteHeader: "Ghi Nhanh Kinh Nghiệm Xử Lý Lỗi",
    saveNoteBtn: "Lưu Ghi Chú & Tạo Vector AI",
    // Vault Tab
    searchPlaceholder: "Tìm theo mã lỗi, trạm test, nội dung...",
    allCategories: "Tất cả",
    // Settings Tab
    tabTokens: "Thống kê Token",
    tabDatabase: "Dung lượng DB",
    tabModels: "Chọn Model AI",
    quickPrompts: [
      {
        short: "Lỗi ERR-FCT-104 chập nguồn 3V3",
        full: "Cách xử lý lỗi ERR-FCT-104 chập nguồn 3V3 trên trạm FCT-02?",
      },
      {
        short: "Lỗi SFC-ERR-504 đẩy log MES",
        full: "Trạm test báo lỗi SFC-ERR-504 không đẩy được log lên MES thì làm gì?",
      },
      {
        short: "SOP hiệu chuẩn trạm RF",
        full: "Quy trình hiệu chuẩn Path Loss và Golden Sample cho trạm RF?",
      },
      {
        short: "Checklist giảm False Fail FCT",
        full: "Gợi ý checklist kiểm tra khi tỷ lệ False Fail tăng cao tại trạm FCT",
      },
    ],
  },
  en: {
    // Auth / Lock Screen
    checkingAuth: "Checking security session...",
    lockTitle: "TE Brain AI Security Gate",
    lockSubtitle: "Enter 6-digit PIN to unlock engineering station",
    pinPlaceholder: "Type or tap the numeric keypad below",
    clearAll: "Clear",
    sessionRemembered: "Session remembered for 30 days on this device",
    // Top Header
    online: "Online",
    itemsCount: "items",
    refresh: "Refresh",
    lockScreen: "Lock Screen",
    // Bottom Nav Tabs
    navChat: "AI Chat",
    navAnalytics: "Analytics",
    navQuickNote: "Quick Note",
    navVault: "RAG Vault",
    navSettings: "System",
    // Chat Sub-tabs & Toolbar
    subChat: "Chat",
    subHistory: "History",
    subReport: "Report",
    quickAskLabel: "Quick troubleshooting prompts:",
    chatPlaceholder: "Enter error code or tap Mic to speak...",
    searchingRag: "Searching RAG Vault & analyzing...",
    citedSources: "Cited Sources",
    listenGuide: "Listen",
    stopListening: "Stop",
    saveToNote: "Save to Vault",
    attachedImageLabel: "Attached error screenshot",
    listeningVoice: "Listening... (Tap Mic again when done)",
    transcribingVoice: "Transcribing speech to text...",
    doneBtn: "Done",
    welcomeMessage:
      "Hello Test Engineer! I am **TE Brain AI** — your personal engineering assistant connected to **MongoDB Atlas** and **Gemini RAG**.\n\nTap a quick prompt below, press **Mic 🎙️** to speak, or send an **Error Code / Screenshot** to troubleshoot immediately!",
    // History Sub-tab
    historyTitle: "Troubleshooting Session History",
    historySavedCount: "Saved",
    historySessionsInDb: "sessions in MongoDB",
    newSessionBtn: "New Chat",
    emptyHistoryTitle: "No troubleshooting sessions saved yet",
    emptyHistoryDesc:
      "Your diagnostic conversations are automatically saved here so you can resume them or generate 8D / Handover reports.",
    activeBadge: "Active",
    exchangeCount: "Messages:",
    messagesUnit: "msgs",
    updatedAtLabel: "Updated at:",
    reopenChatBtn: "Resume Chat",
    exportReportBtn: "Export Report",
    // Report Sub-tab
    reportHeaderTitle: "1-Click Automated Incident Report Generator",
    reportHeaderDesc:
      "AI synthesizes the current troubleshooting session into a factory-standard report.",
    step1Template: "1. Select report template:",
    handoverTitle: "📱 Shift Handover Report",
    handoverDesc:
      "Concise bullet points ready to copy & send via Teams / Zalo / WeChat / Line.",
    eightDTitle: "📑 8D / CAPA Engineering Report",
    eightDDesc:
      "Complete D1 → D7 structure (Symptom, Containment, Root Cause, Corrective & Preventive).",
    step2Lang: "2. Select report output language:",
    generateReportBtn: "Generate",
    generatingReportBtn: "Synthesizing report...",
    copyReportBtn: "Copy Report",
    downloadTxtBtn: "Download Report (.TXT)",
    saveToVaultBtn: "Save Directly to RAG Vault",
    savingToVaultBtn: "Vectorizing & Saving...",
    emptyReportTitle: "No report generated for this session yet.",
    emptyReportDesc:
      "Select Shift Handover or 8D / CAPA template above and click Generate.",
    // Analytics Tab
    analyzingFileLabel: "Active Test Log File",
    uploadLogBtn: "Upload Log",
    sampleLogBtn: "Sample",
    kpiFpy: "First Pass Yield (FPY)",
    kpiTotalFail: "Total Failures (FAIL)",
    kpiFalseCall: "False Call (Retest OK)",
    kpiMinCpk: "Lowest Cpk Index",
    tabTopDefects: "Pareto Defects",
    tabCpkIndex: "Cpk Capability",
    tabAiReport: "AI Diagnosis",
    stationLabel: "Station:",
    testItemLabel: "Test Item:",
    askAiFixBtn: "Ask AI how to fix →",
    // Quick Note Tab
    visionTitle: "AI Vision Error Screenshot Auto-Fill",
    visionDesc:
      "Snap a photo of FCT/ICT/RF/AOI/SFC error screen — AI extracts & fills all 8 fields below",
    visionScanBtn: "Capture / Select Error Screenshot",
    visionScanningBtn: "Scanning image & extracting...",
    quickNoteHeader: "Quick Troubleshooting Note Entry",
    saveNoteBtn: "Save Note & Generate AI Vector",
    // Vault Tab
    searchPlaceholder: "Search error code, station, content...",
    allCategories: "All",
    // Settings Tab
    tabTokens: "Token Telemetry",
    tabDatabase: "DB Storage",
    tabModels: "AI Models",
    quickPrompts: [
      {
        short: "ERR-FCT-104 3V3 short circuit",
        full: "How to troubleshoot ERR-FCT-104 3V3 short circuit on station FCT-02?",
      },
      {
        short: "SFC-ERR-504 MES upload timeout",
        full: "Station reports SFC-ERR-504 failed to upload log to MES, how to fix?",
      },
      {
        short: "RF Shield Box calibration SOP",
        full: "What is the SOP for Path Loss calibration and Golden Sample check on RF station?",
      },
      {
        short: "Reduce FCT False Fail checklist",
        full: "Checklist to reduce high False Fail (Retest OK) rate on FCT fixture",
      },
    ],
  },
  zh: {
    // Auth / Lock Screen
    checkingAuth: "正在验证安全会话...",
    lockTitle: "TE Brain AI 安全门禁",
    lockSubtitle: "请输入 6 位 PIN 密码解锁测试工程终端",
    pinPlaceholder: "使用键盘输入或点击下方数字键",
    clearAll: "清空",
    sessionRemembered: "本设备登录状态将自动保存 30 天",
    // Top Header
    online: "在线",
    itemsCount: "条知识",
    refresh: "刷新",
    lockScreen: "锁定屏幕",
    // Bottom Nav Tabs
    navChat: "AI 助手",
    navAnalytics: "日志分析",
    navQuickNote: "快速记录",
    navVault: "知识库",
    navSettings: "系统设置",
    // Chat Sub-tabs & Toolbar
    subChat: "对话",
    subHistory: "历史",
    subReport: "报告",
    quickAskLabel: "点击快速查询常见异常：",
    chatPlaceholder: "输入错误代码或点击麦克风语音提问...",
    searchingRag: "正在检索 RAG 知识库并分析...",
    citedSources: "参考知识源",
    listenGuide: "语音播报",
    stopListening: "停止播报",
    saveToNote: "存入手册",
    attachedImageLabel: "已附上异常屏幕截图",
    listeningVoice: "正在聆听... (说完请再次点击麦克风)",
    transcribingVoice: "正在将语音转换为文字...",
    doneBtn: "完成",
    welcomeMessage:
      "您好，测试工程师 (TE)！我是 **TE Brain AI** — 已直连 **MongoDB Atlas** 与 **Gemini RAG** 向量知识库。\n\n您可以直接点击下方常见问题、点击 **麦克风 🎙️** 语音提问，或发送 **错误代码 / 报错截图** 进行快速排查！",
    // History Sub-tab
    historyTitle: "工程排障会话历史",
    historySavedCount: "已保存",
    historySessionsInDb: "个会话于 MongoDB",
    newSessionBtn: "新会话",
    emptyHistoryTitle: "暂无已保存的排障会话",
    emptyHistoryDesc:
      "当您与 AI 排查机台故障时，对话记录将自动保存在此处，方便随时重新打开或一键生成 8D 报告。",
    activeBadge: "当前会话",
    exchangeCount: "交互消息：",
    messagesUnit: "条",
    updatedAtLabel: "更新时间：",
    reopenChatBtn: "继续对话",
    exportReportBtn: "导出报告",
    // Report Sub-tab
    reportHeaderTitle: "从当前排障对话自动生成工程报告",
    reportHeaderDesc:
      "AI 将自动汇总当前对话的故障现象、根本原因与改善对策，生成标准工厂报告。",
    step1Template: "1. 选择报告模板：",
    handoverTitle: "📱 交接班快速报告 (Shift Handover)",
    handoverDesc: "条理清晰、简明扼要，适合直接复制发送至微信 / 钉钉 / Teams / Zalo 交接群。",
    eightDTitle: "📑 8D / CAPA 工程异常改善报告",
    eightDDesc:
      "完整 D1 → D7 结构（问题描述、临时围堵、5 Whys 根因分析、永久对策与预防再发）。",
    step2Lang: "2. 选择报告输出语言：",
    generateReportBtn: "一键生成",
    generatingReportBtn: "正在生成报告...",
    copyReportBtn: "复制报告",
    downloadTxtBtn: "下载报告文件 (.TXT)",
    saveToVaultBtn: "直接存入 RAG 知识库",
    savingToVaultBtn: "正在生成向量并保存...",
    emptyReportTitle: "当前会话尚未生成报告",
    emptyReportDesc: "请在上方选择“交接班报告”或“8D 报告”模板及输出语言，然后点击一键生成。",
    // Analytics Tab
    analyzingFileLabel: "当前分析的测试日志文件",
    uploadLogBtn: "上传日志",
    sampleLogBtn: "示例数据",
    kpiFpy: "直通率 (FPY)",
    kpiTotalFail: "不良总数 (FAIL)",
    kpiFalseCall: "误测率 (Retest OK)",
    kpiMinCpk: "最低 Cpk 指标",
    tabTopDefects: "不良柏拉图",
    tabCpkIndex: "Cpk 制程能力",
    tabAiReport: "AI 诊断报告",
    stationLabel: "工站:",
    testItemLabel: "测试项:",
    askAiFixBtn: "询问 AI 维修对策 →",
    // Quick Note Tab
    visionTitle: "AI 视觉识别报错截图自动填表",
    visionDesc:
      "拍摄或上传 FCT/ICT/RF/AOI/SFC 报错画面 — AI 自动识别并填入下方 8 个字段",
    visionScanBtn: "拍摄 / 选择机台报错截图",
    visionScanningBtn: "正在识别图片并提取字段...",
    quickNoteHeader: "快速录入机台排障经验",
    saveNoteBtn: "保存记录并生成 AI 向量",
    // Vault Tab
    searchPlaceholder: "搜索错误代码、测试工站、关键字...",
    allCategories: "全部",
    // Settings Tab
    tabTokens: "Token 统计",
    tabDatabase: "数据库容量",
    tabModels: "切换 AI 模型",
    quickPrompts: [
      {
        short: "ERR-FCT-104 3V3 电源短路排查",
        full: "如何排查 FCT-02 工站上的 ERR-FCT-104 3V3 电源短路故障？",
      },
      {
        short: "SFC-ERR-504 无法上传 MES 日志",
        full: "测试机台报错 SFC-ERR-504 无法上传日志到 MES 系统该如何处理？",
      },
      {
        short: "RF 屏蔽箱线损校准 SOP",
        full: "RF 射频工站线损 (Path Loss) 校准与金样 (Golden Sample) 点检流程是什么？",
      },
      {
        short: "降低 FCT 治具误测率 (False Fail)",
        full: "当 FCT 工站误测率 (Retest OK) 偏高时，有哪些探针与治具点检清单？",
      },
    ],
  },
};
