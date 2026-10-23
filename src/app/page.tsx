"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  PlusCircle,
  FolderKanban,
  Settings,
  Send,
  Upload,
  Search,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Trash2,
  BookmarkPlus,
  Camera,
  X,
  RefreshCw,
  Database,
  KeyRound,
  Tag,
  Wrench,
  BookOpen,
  ChevronRight,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  BarChart3,
  Download,
  Copy,
  Activity,
  History,
  FileText,
  MessageSquarePlus,
  Lock,
  ShieldCheck,
  Delete,
} from "lucide-react";
import {
  parseAndAnalyzeTestLog,
  SAMPLE_FACTORY_CSV_LOG,
  LogAnalysisResult,
} from "@/lib/logAnalyzer";
import { AppLang, LANG_OPTIONS, UI_TEXT } from "@/lib/i18n";

interface KnowledgeItemType {
  _id: string;
  title: string;
  type: "note" | "document";
  category: string;
  errorCode?: string;
  station?: string;
  symptom?: string;
  rootCause?: string;
  solution?: string;
  content: string;
  fileName?: string;
  fileType?: string;
  tags: string[];
  pinned: boolean;
  hasEmbedding: boolean;
  createdAt: string;
}

interface SourceRef {
  id: string;
  title: string;
  type: string;
  errorCode?: string;
  station?: string;
  score: number;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  sources?: SourceRef[];
  modelUsed?: string;
  imagePreview?: string;
  createdAt?: string;
}

interface ChatSessionItem {
  _id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
  messages: ChatMsg[];
}

const TE_CATEGORIES = [
  "ICT / FCT",
  "SMT / AOI",
  "RF / Wireless",
  "SFC / MES",
  "Fixture / Jig",
  "SOP / Manual",
  "Khác",
];

const AVAILABLE_MODELS = [
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    badge: "Khuyên dùng • Siêu tốc",
    desc: "Phản hồi ~2s, hạn mức Free Tier cao, tối ưu tra cứu SOP tại chuyền",
    context: "1,048,576",
    output: "65,536",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    badge: "Tiết kiệm Token",
    desc: "Phản hồi tức thì, tốn ít Token nhất (Không dùng Thinking)",
    context: "1,048,576",
    output: "65,536",
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    badge: "Ổn định",
    desc: "Độ ổn định cao, có suy luận sâu cho phân tích lỗi phức tạp",
    context: "1,048,576",
    output: "65,536",
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    badge: "Thinking Sâu",
    desc: "Cân bằng tốc độ & suy luận sâu (Thinking), đa phương thức",
    context: "1,048,576",
    output: "65,536",
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    badge: "Mới nhất",
    desc: "Model Flash thế hệ 3.8 mới nhất của Google",
    context: "1,048,576",
    output: "65,536",
  },
  {
    id: "gemma-4-31b-it",
    name: "Gemma 4 31B IT",
    badge: "Open Model",
    desc: "Mô hình mở 31 tỷ tham số của Google",
    context: "262,144",
    output: "32,768",
  },
];

const QUICK_PROMPTS = [
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
];

function FormattedMessage({
  content,
  isUser,
}: {
  content: string;
  isUser: boolean;
}) {
  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`[^`]+`|\*[^*\n]+\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return (
          <strong
            key={idx}
            className={
              isUser ? "font-bold text-white" : "font-semibold text-cyan-200"
            }
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-800/90 border border-slate-700 text-amber-300 font-mono text-[12px]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return (
          <em key={idx} className="italic text-slate-200">
            {part.slice(1, -1)}
          </em>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const lines = content.split("\n");

  return (
    <div className="space-y-1.5 text-[13.5px] leading-relaxed">
      {lines.map((rawLine, i) => {
        const line = rawLine.trim();
        if (!line || line === "---") {
          return <div key={i} className="h-1" />;
        }

        if (
          line.startsWith("### ") ||
          line.startsWith("## ") ||
          line.startsWith("# ")
        ) {
          const cleanHeading = line.replace(/^#+\s*/, "");
          return (
            <h4
              key={i}
              className="font-bold text-cyan-300 text-sm pt-2 pb-0.5 border-b border-slate-800/80"
            >
              {renderInline(cleanHeading)}
            </h4>
          );
        }

        if (line.startsWith("* ") || line.startsWith("- ")) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="text-cyan-400 font-bold mt-0.5">•</span>
              <div className="flex-1">{renderInline(line.slice(2))}</div>
            </div>
          );
        }

        const numMatch = line.match(/^(\d+\.)\s+(.*)/);
        if (numMatch) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="text-cyan-400 font-semibold shrink-0">
                {numMatch[1]}
              </span>
              <div className="flex-1">{renderInline(numMatch[2])}</div>
            </div>
          );
        }

        return (
          <p key={i} className="break-words">
            {renderInline(rawLine)}
          </p>
        );
      })}
    </div>
  );
}

export default function TEBrainApp() {
  // Global UI & AI Language state (VI / EN / ZH)
  const [appLang, setAppLang] = useState<AppLang>("vi");
  const [langDropdownOpen, setLangDropdownOpen] = useState<boolean>(false);
  const t = UI_TEXT[appLang];
  const currentLangOption =
    LANG_OPTIONS.find((l) => l.code === appLang) || LANG_OPTIONS[0];

  // Master PIN Auth Gate state
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [verifyingPin, setVerifyingPin] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<
    "chat" | "analytics" | "quick-note" | "vault" | "settings"
  >("chat");

  // Sub-tabs for clean, uncluttered views
  const [chatSubTab, setChatSubTab] = useState<
    "conversation" | "history" | "report"
  >("conversation");
  const [analyticsSubTab, setAnalyticsSubTab] = useState<
    "pareto" | "cpk" | "ai-report"
  >("pareto");
  const [settingsSubTab, setSettingsSubTab] = useState<
    "models" | "tokens" | "database"
  >("tokens");
  const [noteSubTab, setNoteSubTab] = useState<"note" | "translate">("note");

  // AI Chinese-Vietnamese Technical Document Translator & SOP Standardizer state
  const [transInput, setTransInput] = useState<string>("");
  const [transDirection, setTransDirection] = useState<
    "zh-vi" | "vi-zh" | "auto-en"
  >("zh-vi");
  const [transMode, setTransMode] = useState<
    "sop" | "bilingual" | "troubleshooting"
  >("sop");
  const [transImage, setTransImage] = useState<{
    mimeType: string;
    data: string;
  } | null>(null);
  const [transImagePreview, setTransImagePreview] = useState<string | null>(
    null
  );
  const [translatingSop, setTranslatingSop] = useState<boolean>(false);
  const [savingTransToVault, setSavingTransToVault] = useState<boolean>(false);
  const [transResult, setTransResult] = useState<{
    translatedContent: string;
    suggestedTitle: string;
    suggestedCategory: string;
    suggestedStation: string;
    suggestedErrorCode: string;
    suggestedTags: string;
    glossary: Array<{ zh: string; pinyin: string; vi: string; en: string }>;
    modelUsed: string;
  } | null>(null);
  const [extractingTransDoc, setExtractingTransDoc] = useState<boolean>(false);
  const transImageInputRef = useRef<HTMLInputElement>(null);
  const transDocInputRef = useRef<HTMLInputElement>(null);

  // Session History & Incident Report state
  const [chatSessions, setChatSessions] = useState<ChatSessionItem[]>([]);
  const [reportType, setReportType] = useState<"handover" | "8d">("handover");
  const [reportLang, setReportLang] = useState<"vi" | "en" | "zh">("vi");
  const [generatedReport, setGeneratedReport] = useState<string>("");
  const [reportModelUsed, setReportModelUsed] = useState<string>("");
  const [reportExtractedNote, setReportExtractedNote] = useState<{
    title: string;
    category: string;
    errorCode: string;
    station: string;
    tags: string;
  } | null>(null);
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [savingReportToVault, setSavingReportToVault] =
    useState<boolean>(false);

  // Log Analytics state
  const [logResult, setLogResult] = useState<LogAnalysisResult | null>(() => {
    try {
      return parseAndAnalyzeTestLog(
        SAMPLE_FACTORY_CSV_LOG,
        "FCT02_RF_ShiftA_Log.csv"
      );
    } catch {
      return null;
    }
  });
  const [aiLogReport, setAiLogReport] = useState<string>("");
  const [aiLogSources, setAiLogSources] = useState<SourceRef[]>([]);
  const [aiLogLoading, setAiLogLoading] = useState<boolean>(false);
  const logFileInputRef = useRef<HTMLInputElement>(null);

  // Knowledge state
  const [items, setItems] = useState<KnowledgeItemType[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    notes: 0,
    documents: 0,
    vectorized: 0,
  });
  const [loadingKnowledge, setLoadingKnowledge] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Tất cả");
  const [selectedItemModal, setSelectedItemModal] =
    useState<KnowledgeItemType | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Chào Kỹ sư TE! Tôi là **TE Brain AI** — trợ lý cá nhân đã kết nối trực tiếp với **MongoDB** và **Gemini RAG**.\n\nBạn có thể chạm vào câu hỏi mẫu, bấm **Mic 🎙️** để nói tiếng Việt, hoặc gửi **Mã lỗi / Ảnh chụp màn hình** để tra cứu ngay!",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [attachedImage, setAttachedImage] = useState<{
    mimeType: string;
    data: string;
    preview: string;
  } | null>(null);

  // Voice & TTS state
  const [isListening, setIsListening] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<
    "chat" | "symptom" | "rootCause" | "solution"
  >("chat");
  const [transcribingAudio, setTranscribingAudio] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [autoReadTTS, setAutoReadTTS] = useState<boolean>(false);
  const [handsFreeAutoSend, setHandsFreeAutoSend] = useState<boolean>(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioCacheRef = useRef<Map<string, string[]>>(new Map());

  // Quick Note Form state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteCategory, setNoteCategory] = useState("ICT / FCT");
  const [noteErrorCode, setNoteErrorCode] = useState("");
  const [noteStation, setNoteStation] = useState("");
  const [noteSymptom, setNoteSymptom] = useState("");
  const [noteRootCause, setNoteRootCause] = useState("");
  const [noteSolution, setNoteSolution] = useState("");
  const [noteTags, setNoteTags] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Upload File state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("SOP / Manual");
  const [uploadStation, setUploadStation] = useState("");
  const [uploadTags, setUploadTags] = useState("");

  // Settings state
  const [customApiKey, setCustomApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash-lite");
  const [systemStatus, setSystemStatus] = useState({
    mongodbConnected: true,
    geminiConfigured: true,
    maskedKey: "AQ.Ab8R...fgPg",
    totalKnowledge: 0,
  });
  const [tokenTelemetry, setTokenTelemetry] = useState({
    activeModel: "gemini-3.5-flash-lite",
    limits: {
      inputTokenLimit: 1048576,
      outputTokenLimit: 65536,
      freeTierRpdLimit: 1500,
      freeTierTpmLimit: 1000000,
      dailyTokenQuota: 1500000,
    },
    today: {
      requests: 0,
      promptTokens: 0,
      candidatesTokens: 0,
      thoughtsTokens: 0,
      totalTokens: 0,
    },
    allTime: {
      requests: 0,
      promptTokens: 0,
      candidatesTokens: 0,
      thoughtsTokens: 0,
      totalTokens: 0,
    },
    recentLogs: [] as Array<{
      id: string;
      actionType: "chat" | "embedding" | "extract";
      modelName: string;
      promptTokens: number;
      candidatesTokens: number;
      thoughtsTokens: number;
      totalTokens: number;
      createdAt: string;
    }>,
  });
  const [dbStorage, setDbStorage] = useState({
    dbName: "te_brain_db",
    collections: 0,
    objects: 0,
    dataSize: 0,
    storageSize: 0,
    indexSize: 0,
    totalDbSize: 0,
    fsUsedSize: 0,
    fsTotalSize: 0,
    fsFreeSize: 0,
    atlasFreeLimitBytes: 512 * 1024 * 1024,
    atlasFreeRemainingBytes: 512 * 1024 * 1024,
  });

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const visionInputRef = useRef<HTMLInputElement>(null);
  const [visionScanning, setVisionScanning] = useState(false);
  const [visionPreview, setVisionPreview] = useState<string | null>(null);

  const compressImageFile = (
    file: File
  ): Promise<{ mimeType: string; data: string; preview: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Không thể đọc file ảnh"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Định dạng ảnh không hợp lệ"));
        img.onload = () => {
          const maxDim = 1280;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            const raw = String(reader.result);
            resolve({
              mimeType: file.type || "image/jpeg",
              data: raw.split(",")[1],
              preview: raw,
            });
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve({
            mimeType: "image/jpeg",
            data: dataUrl.split(",")[1],
            preview: dataUrl,
          });
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchKnowledge = async () => {
    try {
      setLoadingKnowledge(true);
      const savedKey = localStorage.getItem("te_brain_gemini_key") || "";
      const res = await fetch("/api/knowledge", {
        headers: savedKey ? { "x-gemini-key": savedKey } : {},
      });
      const data = await res.json();
      if (data.success) {
        const nextItems = data.items || [];
        const nextStats = data.stats || {
          total: 0,
          notes: 0,
          documents: 0,
          vectorized: 0,
        };
        setItems(nextItems);
        setStats(nextStats);
        try {
          localStorage.setItem(
            "te_brain_cache_knowledge",
            JSON.stringify({ items: nextItems, stats: nextStats })
          );
        } catch {
          // ignore storage quota
        }
      }
    } catch (e) {
      console.error("Failed to load knowledge:", e);
    } finally {
      setLoadingKnowledge(false);
    }
  };

  const fetchSystemStatus = async (overrideModel?: string) => {
    try {
      const savedKey = localStorage.getItem("te_brain_gemini_key") || "";
      const savedModel =
        overrideModel ||
        localStorage.getItem("te_brain_selected_model") ||
        selectedModel ||
        "gemini-3.6-flash";
      const headers: Record<string, string> = {
        "x-gemini-model": savedModel,
      };
      if (savedKey) headers["x-gemini-key"] = savedKey;

      const res = await fetch("/api/chat", {
        cache: "no-store",
        headers,
      });
      const data = await res.json();
      if (data.status) setSystemStatus(data.status);
      if (data.tokenTelemetry) setTokenTelemetry(data.tokenTelemetry);
      if (data.dbStorage) setDbStorage(data.dbStorage);
      if (Array.isArray(data.sessions)) {
        setChatSessions(data.sessions);
        try {
          localStorage.setItem(
            "te_brain_cache_sessions",
            JSON.stringify(data.sessions)
          );
        } catch {
          // ignore storage quota
        }
      }
    } catch {
      // ignore
    }
  };

  const handleVerifyPin = async (codeToVerify?: string) => {
    const cleanPin = (codeToVerify ?? pinInput).trim();
    if (!cleanPin || verifyingPin) return;

    setVerifyingPin(true);
    setPinError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: cleanPin }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPinError(data.error || "Mã PIN không chính xác!");
        setPinInput("");
        return;
      }

      setIsAuthenticated(true);
      setPinInput("");
      setPinError("");
      const savedModel =
        localStorage.getItem("te_brain_selected_model") || "gemini-3.6-flash";
      fetchKnowledge();
      fetchSystemStatus(savedModel);
      showToast("🔓 Đã mở khóa trạm TE Brain AI!");
    } catch {
      setPinError("Không thể kết nối máy chủ xác thực.");
    } finally {
      setVerifyingPin(false);
    }
  };

  const handlePinDigitPress = (digit: string) => {
    if (verifyingPin) return;
    setPinError("");
    if (digit === "CLEAR") {
      setPinInput("");
      return;
    }
    if (digit === "BACK") {
      setPinInput((prev) => prev.slice(0, -1));
      return;
    }
    if (pinInput.length < 6) {
      const next = `${pinInput}${digit}`;
      setPinInput(next);
      if (next.length === 6) {
        handleVerifyPin(next);
      }
    }
  };

  const handleSwitchLang = (nextLang: AppLang) => {
    setAppLang(nextLang);
    setReportLang(nextLang);
    localStorage.setItem("te_brain_lang", nextLang);
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant") {
        return [{ role: "assistant", content: UI_TEXT[nextLang].welcomeMessage }];
      }
      return prev;
    });
    const langInfo = LANG_OPTIONS.find((l) => l.code === nextLang);
    showToast(`${langInfo?.flag || "🌐"} ${langInfo?.name || nextLang}`);
  };

  const handleLockApp = async () => {
    stopSpeaking();
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setPinInput("");
    showToast("🔒 Đã khóa bảo mật TE Brain AI.");
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === "settings" || dbStorage.totalDbSize === 0) {
      fetchSystemStatus();
    }
  }, [activeTab, dbStorage.totalDbSize, isAuthenticated]);

  useEffect(() => {
    const savedKey = localStorage.getItem("te_brain_gemini_key") || "";
    const savedModel =
      localStorage.getItem("te_brain_selected_model") || "gemini-3.6-flash";
    const savedLang = localStorage.getItem("te_brain_lang") as AppLang | null;
    if (savedKey) setCustomApiKey(savedKey);
    setSelectedModel(savedModel);
    if (savedLang && (savedLang === "vi" || savedLang === "en" || savedLang === "zh")) {
      setAppLang(savedLang);
      setReportLang(savedLang);
      setMessages([{ role: "assistant", content: UI_TEXT[savedLang].welcomeMessage }]);
    }

    // 1. Instant 0ms Stale-While-Revalidate Hydration from localStorage
    try {
      const cachedKnowledge = localStorage.getItem("te_brain_cache_knowledge");
      if (cachedKnowledge) {
        const parsed = JSON.parse(cachedKnowledge);
        if (Array.isArray(parsed.items)) {
          setItems(parsed.items);
          setLoadingKnowledge(false);
        }
        if (parsed.stats) setStats(parsed.stats);
      }
      const cachedSessions = localStorage.getItem("te_brain_cache_sessions");
      if (cachedSessions) {
        const parsedSessions = JSON.parse(cachedSessions);
        if (Array.isArray(parsedSessions)) setChatSessions(parsedSessions);
      }
      const savedDraft = localStorage.getItem("te_brain_note_draft");
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        if (draft.noteTitle) setNoteTitle(draft.noteTitle);
        if (draft.noteCategory) setNoteCategory(draft.noteCategory);
        if (draft.noteErrorCode) setNoteErrorCode(draft.noteErrorCode);
        if (draft.noteStation) setNoteStation(draft.noteStation);
        if (draft.noteSymptom) setNoteSymptom(draft.noteSymptom);
        if (draft.noteRootCause) setNoteRootCause(draft.noteRootCause);
        if (draft.noteSolution) setNoteSolution(draft.noteSolution);
        if (draft.noteTags) setNoteTags(draft.noteTags);
      }
    } catch {
      // ignore parse errors
    }

    fetch("/api/auth", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setIsAuthenticated(true);
          fetchKnowledge();
          fetchSystemStatus(savedModel);
        }
      })
      .catch(() => { })
      .finally(() => setAuthChecked(true));
  }, []);

  // Auto-save Quick Note draft to localStorage so factory engineers never lose typed notes
  useEffect(() => {
    try {
      if (
        noteTitle ||
        noteErrorCode ||
        noteStation ||
        noteSymptom ||
        noteRootCause ||
        noteSolution ||
        noteTags
      ) {
        localStorage.setItem(
          "te_brain_note_draft",
          JSON.stringify({
            noteTitle,
            noteCategory,
            noteErrorCode,
            noteStation,
            noteSymptom,
            noteRootCause,
            noteSolution,
            noteTags,
          })
        );
      } else {
        localStorage.removeItem("te_brain_note_draft");
      }
    } catch {
      // ignore
    }
  }, [
    noteTitle,
    noteCategory,
    noteErrorCode,
    noteStation,
    noteSymptom,
    noteRootCause,
    noteSolution,
    noteTags,
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const handleImageAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setAttachedImage(compressed);
    } catch {
      showToast("Không thể xử lý ảnh đính kèm", "error");
    }
  };

  const handleVisionAutoFill = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVisionScanning(true);
    try {
      const compressed = await compressImageFile(file);
      setVisionPreview(compressed.preview);

      const savedKey = localStorage.getItem("te_brain_gemini_key") || "";
      const res = await fetch("/api/vision-autofill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(savedKey ? { "x-gemini-key": savedKey } : {}),
        },
        body: JSON.stringify({
          imageBase64: compressed.data,
          mimeType: compressed.mimeType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể phân tích ảnh");
      }

      const f = data.fields || {};
      if (f.title) setNoteTitle(f.title);
      if (f.category && TE_CATEGORIES.includes(f.category)) {
        setNoteCategory(f.category);
      }
      if (f.errorCode) setNoteErrorCode(f.errorCode);
      if (f.station) setNoteStation(f.station);
      if (f.symptom) setNoteSymptom(f.symptom);
      if (f.rootCause) setNoteRootCause(f.rootCause);
      if (f.solution) setNoteSolution(f.solution);
      if (f.tags) setNoteTags(f.tags);

      showToast(
        `📸 Đã quét ảnh (${data.visionModelUsed}) & tự động điền toàn bộ Form!`
      );
      fetchSystemStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi quét ảnh";
      showToast(msg, "error");
    } finally {
      setVisionScanning(false);
      if (visionInputRef.current) visionInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (presetQuestion?: string) => {
    const q = (presetQuestion ?? chatInput).trim();
    if (!q || chatLoading) return;

    // Unlock HTMLAudioElement synchronously on user tap if Auto-Read TTS is active (iOS Safari requirement)
    if (autoReadTTS) {
      unlockAudioForIOS();
    }

    const currentImage = attachedImage;
    const userMessage: ChatMsg = {
      role: "user",
      content: q,
      imagePreview: currentImage?.preview,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!presetQuestion) setChatInput("");
    setAttachedImage(null);
    setChatLoading(true);

    try {
      const savedKey = localStorage.getItem("te_brain_gemini_key") || "";
      const activeM =
        localStorage.getItem("te_brain_selected_model") || selectedModel;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-model": activeM,
          ...(savedKey ? { "x-gemini-key": savedKey } : {}),
        },
        body: JSON.stringify({
          question: q,
          selectedModel: activeM,
          lang: appLang,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          imageInline: currentImage
            ? { mimeType: currentImage.mimeType, data: currentImage.data }
            : undefined,
          sessionId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể kết nối AI");
      }

      if (data.sessionId) setSessionId(data.sessionId);

      setMessages((prev) => {
        const next = [
          ...prev,
          {
            role: "assistant" as const,
            content: data.answer,
            sources: data.sources || [],
            modelUsed: data.modelUsed,
          },
        ];
        if (autoReadTTS) {
          setTimeout(() => speakMessage(data.answer, next.length - 1), 150);
        }
        return next;
      });
      fetchSystemStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ **Lỗi kết nối:** ${msg}. Vui lòng kiểm tra lại trong mục Hệ thống.`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSaveQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) {
      showToast("Vui lòng nhập Tên lỗi hoặc Tiêu đề ghi chú!", "error");
      return;
    }

    setSavingNote(true);
    try {
      const savedKey = localStorage.getItem("te_brain_gemini_key") || "";
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(savedKey ? { "x-gemini-key": savedKey } : {}),
        },
        body: JSON.stringify({
          title: noteTitle,
          type: "note",
          category: noteCategory,
          errorCode: noteErrorCode,
          station: noteStation,
          symptom: noteSymptom,
          rootCause: noteRootCause,
          solution: noteSolution,
          tags: noteTags,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể lưu ghi chú");
      }

      showToast("Đã nạp Ghi chú & tạo Vector AI thành công!");
      setNoteTitle("");
      setNoteErrorCode("");
      setNoteStation("");
      setNoteSymptom("");
      setNoteRootCause("");
      setNoteSolution("");
      setNoteTags("");
      setVisionPreview(null);
      try {
        localStorage.removeItem("te_brain_note_draft");
      } catch {
        // ignore
      }
      await fetchKnowledge();
      setActiveTab("vault");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi lưu ghi chú";
      showToast(msg, "error");
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveChatAnswerToNote = (msg: ChatMsg, idx: number) => {
    const prevUserQuestion =
      idx > 0 && messages[idx - 1]?.role === "user"
        ? messages[idx - 1].content
        : "Kinh nghiệm xử lý sự cố từ AI";
    setNoteTitle(prevUserQuestion.slice(0, 80));
    setNoteSolution(msg.content);
    setNoteTags("AI-Saved, Troubleshooting");
    setActiveTab("quick-note");
    showToast("Đã điền sẵn nội dung vào Sổ tay, hãy kiểm tra và bấm Lưu!");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const savedKey = localStorage.getItem("te_brain_gemini_key") || "";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", uploadCategory);
      formData.append("station", uploadStation);
      formData.append("tags", uploadTags);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: savedKey ? { "x-gemini-key": savedKey } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể xử lý file");
      }

      showToast(
        `Đã nạp "${file.name}" (${data.chunksCreated} Vector) vào Kho Tri Thức!`
      );
      setUploadStation("");
      setUploadTags("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchKnowledge();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi tải file";
      showToast(msg, "error");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.filter((item) => item._id !== id));
        if (selectedItemModal?._id === id) setSelectedItemModal(null);
        showToast("Đã xóa mục tri thức khỏi MongoDB.");
      }
    } catch {
      showToast("Không thể xóa mục này.", "error");
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === "Tất cả" || item.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;
    const searchable =
      `${item.title} ${item.errorCode || ""} ${item.station || ""} ${item.content} ${(item.tags || []).join(" ")}`.toLowerCase();
    return matchesCategory && searchable.includes(q);
  });

  const openSourceDetail = (sourceId: string) => {
    const found = items.find((i) => i._id === sourceId);
    if (found) setSelectedItemModal(found);
  };

  // ================= LOG ANALYZER FUNCTIONS =================
  const handleLogFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const analyzed = parseAndAnalyzeTestLog(text, file.name);
      setLogResult(analyzed);
      setAiLogReport("");
      setAiLogSources([]);
      setAnalyticsSubTab("pareto");
      showToast(
        `📊 Đã phân tích ${analyzed.totalRecords} lượt đo từ "${file.name}"!`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Không thể đọc định dạng file log";
      showToast(msg, "error");
    } finally {
      if (logFileInputRef.current) logFileInputRef.current.value = "";
    }
  };

  const handleLoadSampleLog = () => {
    try {
      const analyzed = parseAndAnalyzeTestLog(
        SAMPLE_FACTORY_CSV_LOG,
        "FCT02_RF_ShiftA_Log.csv"
      );
      setLogResult(analyzed);
      setAiLogReport("");
      setAiLogSources([]);
      showToast("⚡ Đã nạp dữ liệu Log mẫu (FCT-02 & RF)!");
    } catch {
      showToast("Lỗi nạp log mẫu", "error");
    }
  };

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_FACTORY_CSV_LOG], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "FCT02_RF_ShiftA_Sample.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("⬇️ Đã tải file mẫu FCT02_RF_ShiftA_Sample.csv!");
  };

  const handleGenerateLogAIReport = async () => {
    if (!logResult || aiLogLoading) return;
    setAnalyticsSubTab("ai-report");
    setAiLogLoading(true);
    try {
      const savedKey = localStorage.getItem("te_brain_gemini_key") || "";
      const activeM =
        localStorage.getItem("te_brain_selected_model") || selectedModel;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-model": activeM,
          ...(savedKey ? { "x-gemini-key": savedKey } : {}),
        },
        body: JSON.stringify({
          question: logResult.aiSummaryPrompt,
          selectedModel: activeM,
          lang: appLang,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể tạo báo cáo AI");
      }
      setAiLogReport(data.answer);
      setAiLogSources(data.sources || []);
      fetchSystemStatus();
      showToast("🤖 Đã tạo Báo cáo Bàn giao Ca thành công!");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Lỗi khi phân tích bằng AI";
      showToast(msg, "error");
    } finally {
      setAiLogLoading(false);
    }
  };

  // ================= SESSION HISTORY & INCIDENT REPORT FUNCTIONS =================
  const handleStartNewSession = () => {
    stopSpeaking();
    setSessionId(undefined);
    setMessages([
      {
        role: "assistant",
        content: t.welcomeMessage,
      },
    ]);
    setGeneratedReport("");
    setReportExtractedNote(null);
    setChatSubTab("conversation");
    showToast(`➕ ${t.newSessionBtn}`);
  };

  const handleOpenSession = (
    session: ChatSessionItem,
    jumpToReport = false
  ) => {
    stopSpeaking();
    setSessionId(session._id);
    if (Array.isArray(session.messages) && session.messages.length > 0) {
      setMessages(session.messages);
    }
    setGeneratedReport("");
    setReportExtractedNote(null);
    if (jumpToReport) {
      setChatSubTab("report");
      showToast(`📋 Đã nạp phiên "${session.title}" để xuất báo cáo!`);
    } else {
      setChatSubTab("conversation");
      showToast(`💬 Đã mở lại phiên "${session.title}"`);
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      const res = await fetch(`/api/chat?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setChatSessions((prev) => prev.filter((s) => s._id !== id));
        if (sessionId === id) {
          setSessionId(undefined);
        }
        showToast("🗑️ Đã xóa phiên trò chuyện.");
      }
    } catch {
      showToast("Không thể xóa phiên trò chuyện.", "error");
    }
  };

  const handleClearAllSessions = async () => {
    try {
      const res = await fetch("/api/chat?all=true", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setChatSessions([]);
        setSessionId(undefined);
        showToast("🗑️ Đã xóa toàn bộ lịch sử phiên chat.");
      }
    } catch {
      showToast("Lỗi khi xóa toàn bộ lịch sử.", "error");
    }
  };

  const handleGenerateIncidentReport = async (
    overrideType?: "handover" | "8d",
    overrideLang?: "vi" | "en" | "zh"
  ) => {
    const activeReportType = overrideType || reportType;
    const activeReportLang = overrideLang || reportLang;
    if (overrideType) setReportType(overrideType);
    if (overrideLang) setReportLang(overrideLang);

    // Filter out the initial default greeting if there are user messages
    const realMessages = messages.filter(
      (m, idx) =>
        !(idx === 0 && m.role === "assistant" && messages.length > 1)
    );

    if (realMessages.length === 0 || (messages.length === 1 && messages[0].role === "assistant")) {
      showToast(
        "Chưa có nội dung hội thoại xử lý sự cố! Hãy chat với AI hoặc mở 1 phiên từ tab Lịch sử trước.",
        "error"
      );
      return;
    }

    setReportLoading(true);
    try {
      const savedKey = localStorage.getItem("te_brain_gemini_key") || "";
      const currentSessionObj = chatSessions.find((s) => s._id === sessionId);
      const sessionTitle =
        currentSessionObj?.title ||
        realMessages.find((m) => m.role === "user")?.content.slice(0, 60) ||
        "Sự cố kỹ thuật trạm Test";

      const res = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(savedKey ? { "x-gemini-key": savedKey } : {}),
        },
        body: JSON.stringify({
          messages: realMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          reportType: activeReportType,
          reportLang: activeReportLang,
          sessionTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể tổng hợp báo cáo");
      }

      setGeneratedReport(data.reportText);
      setReportModelUsed(data.modelUsed || "gemini-3.6-flash");
      if (data.extractedNote) {
        setReportExtractedNote(data.extractedNote);
      }
      fetchSystemStatus();
      const langLabel =
        activeReportLang === "en"
          ? "Tiếng Anh"
          : activeReportLang === "zh"
            ? "Tiếng Trung"
            : "Tiếng Việt";
      showToast(
        activeReportType === "handover"
          ? `📋 Đã tạo Báo cáo Giao Ca (${langLabel})!`
          : `📑 Đã tạo Báo cáo 8D / CAPA (${langLabel})!`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Lỗi khi tổng hợp báo cáo";
      showToast(msg, "error");
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadReportTxt = () => {
    if (!generatedReport) return;
    const blob = new Blob([generatedReport], {
      type: "text/plain;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const prefix = reportType === "8d" ? "TE_8D_CAPA_Report" : "TE_Shift_Handover";
    a.download = `${prefix}_${reportLang.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("⬇️ Đã tải file báo cáo (.TXT) về máy!");
  };

  const handleSaveReportDirectlyToVault = async () => {
    if (!generatedReport || savingReportToVault) return;
    setSavingReportToVault(true);
    try {
      const savedKey = localStorage.getItem("te_brain_gemini_key") || "";
      const noteMeta = reportExtractedNote || {
        title: `Báo cáo ${reportType === "8d" ? "8D/CAPA" : "Giao ca"} (${new Date().toLocaleDateString("vi-VN")})`,
        category: "ICT / FCT",
        errorCode: "",
        station: "",
        tags: "Report, 8D, Handover",
      };

      const mappedCategory = TE_CATEGORIES.includes(noteMeta.category)
        ? noteMeta.category
        : "ICT / FCT";

      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(savedKey ? { "x-gemini-key": savedKey } : {}),
        },
        body: JSON.stringify({
          title: noteMeta.title,
          type: "note",
          category: mappedCategory,
          errorCode: noteMeta.errorCode,
          station: noteMeta.station,
          symptom: "",
          rootCause: "",
          solution: generatedReport,
          tags: noteMeta.tags,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể lưu vào Kho Tri Thức");
      }

      await fetchKnowledge();
      fetchSystemStatus();
      showToast("🧠 Đã lưu biên bản sự cố & tạo Vector vào Kho Tri Thức RAG!");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Lỗi khi lưu báo cáo vào Sổ tay";
      showToast(msg, "error");
    } finally {
      setSavingReportToVault(false);
    }
  };

  // ================= VOICE & TTS FUNCTIONS (iOS / iPhone + Android + Desktop) =================
  const cleanTextForSpeech = (raw: string) => {
    const codeWord =
      appLang === "zh" ? " 代码 " : appLang === "en" ? " code block " : " đoạn mã ";
    return raw
      .replace(/```[\s\S]*?```/g, codeWord)
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/^#+\s*/gm, "")
      .replace(/\[([^\]]+)\]/g, "$1")
      .replace(/[-•]/g, " ")
      .replace(/\n+/g, ". ")
      .trim();
  };

  const base64ToBlobUrl = (base64: string, mimeType = "audio/mpeg"): string => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return URL.createObjectURL(blob);
  };

  const stopSpeaking = () => {
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.onended = null;
        audioPlayerRef.current.onerror = null;
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      } catch {
        // ignore
      }
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    setSpeakingIdx(null);
  };

  // Unlock persistent HTMLAudioElement synchronously during a user tap gesture (Required by iPhone / iOS Safari)
  const unlockAudioForIOS = () => {
    try {
      const SILENT_WAV =
        "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
      const player = audioPlayerRef.current || new Audio();
      player.setAttribute("playsinline", "true");
      player.preload = "auto";
      audioPlayerRef.current = player;
      if (player.paused) {
        player.src = SILENT_WAV;
        const p = player.play();
        if (p !== undefined) {
          p.catch(() => {
            // ignore
          });
        }
      }
    } catch {
      // ignore
    }
  };

  const speakMessage = async (text: string, idx: number) => {
    if (speakingIdx === idx) {
      stopSpeaking();
      return;
    }

    stopSpeaking();
    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) return;

    setSpeakingIdx(idx);

    // CRITICAL FOR iPHONE / iOS SAFARI:
    // Unlock the HTMLAudioElement SYNCHRONOUSLY inside the user's tap gesture BEFORE awaiting fetch("/api/tts")
    unlockAudioForIOS();
    const player = audioPlayerRef.current!;
    const cacheKey = `${appLang}:${cleaned.slice(0, 120)}:${cleaned.length}`;

    try {
      let chunks: string[] = ttsAudioCacheRef.current.get(cacheKey) || [];

      if (chunks.length === 0) {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleaned, lang: appLang }),
        });
        const data = await res.json();

        chunks =
          Array.isArray(data.audioChunks) && data.audioChunks.length > 0
            ? data.audioChunks
            : data.audioBase64
              ? [data.audioBase64]
              : [];

        if (res.ok && data.success && chunks.length > 0) {
          ttsAudioCacheRef.current.set(cacheKey, chunks);
        }
      }

      if (chunks.length > 0) {
        let currentChunkIdx = 0;
        let currentBlobUrl: string | null = null;

        const playNextChunk = async () => {
          if (currentBlobUrl) {
            URL.revokeObjectURL(currentBlobUrl);
            currentBlobUrl = null;
          }

          if (currentChunkIdx >= chunks.length) {
            setSpeakingIdx(null);
            return;
          }

          const b64 = chunks[currentChunkIdx++];
          currentBlobUrl = base64ToBlobUrl(b64, "audio/mpeg");
          player.src = currentBlobUrl;
          player.playbackRate = 1.05;

          player.onended = () => {
            playNextChunk();
          };

          player.onerror = () => {
            if (currentBlobUrl) {
              URL.revokeObjectURL(currentBlobUrl);
              currentBlobUrl = null;
            }
            setSpeakingIdx(null);
          };

          try {
            await player.play();
          } catch {
            if (currentBlobUrl) {
              URL.revokeObjectURL(currentBlobUrl);
              currentBlobUrl = null;
            }
            setSpeakingIdx(null);
          }
        };

        await playNextChunk();
        return;
      }
    } catch {
      // Fallback to Web Speech API below
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(cleaned);
        const activeSpeechLang =
          LANG_OPTIONS.find((l) => l.code === appLang)?.speechLang || "vi-VN";
        utterance.lang = activeSpeechLang;
        utterance.rate = 1.05;
        utterance.onend = () => setSpeakingIdx(null);
        utterance.onerror = () => setSpeakingIdx(null);
        window.speechSynthesis.speak(utterance);
      } catch {
        setSpeakingIdx(null);
      }
    } else {
      setSpeakingIdx(null);
      showToast(
        appLang === "zh"
          ? "当前浏览器不支持语音播报"
          : appLang === "en"
            ? "Audio playback not supported on this browser"
            : "Trình duyệt này chưa hỗ trợ phát âm thanh",
        "error"
      );
    }
  };

  const applyRecognizedText = (
    transcript: string,
    target: "chat" | "symptom" | "rootCause" | "solution",
    shouldAutoSend: boolean
  ) => {
    const clean = transcript.trim();
    if (!clean) return;

    if (target === "chat") {
      if (shouldAutoSend) {
        setChatInput("");
        handleSendMessage(clean);
      } else {
        setChatInput((prev) => (prev ? `${prev} ${clean}` : clean));
      }
    } else if (target === "symptom") {
      setNoteSymptom((prev) => (prev ? `${prev} ${clean}` : clean));
    } else if (target === "rootCause") {
      setNoteRootCause((prev) => (prev ? `${prev} ${clean}` : clean));
    } else if (target === "solution") {
      setNoteSolution((prev) => (prev ? `${prev}\n${clean}` : clean));
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  };

  const startGeminiAudioFallback = async (
    target: "chat" | "symptom" | "rootCause" | "solution"
  ) => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      showToast(
        appLang === "zh"
          ? "浏览器不支持麦克风录音 (请使用 HTTPS 或 Safari/Chrome)"
          : appLang === "en"
            ? "Microphone not supported on this browser"
            : "Trình duyệt không hỗ trợ thu âm Micro!",
        "error"
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Pick best supported MIME type (iOS Safari uses audio/mp4, Chrome/Android uses audio/webm)
      const preferredMimeTypes = [
        "audio/mp4",
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg",
        "audio/wav",
      ];
      let chosenMime = "";
      if (
        typeof MediaRecorder !== "undefined" &&
        typeof MediaRecorder.isTypeSupported === "function"
      ) {
        for (const candidate of preferredMimeTypes) {
          if (MediaRecorder.isTypeSupported(candidate)) {
            chosenMime = candidate;
            break;
          }
        }
      }

      const recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const rawMime = recorder.mimeType || chosenMime || "audio/mp4";
        // Strip ";codecs=..." parameter so Gemini API inlineData accepts the MIME type on iOS & Android
        const cleanMime = rawMime.split(";")[0].trim() || "audio/mp4";

        const audioBlob = new Blob(audioChunksRef.current, {
          type: cleanMime,
        });

        if (audioBlob.size < 100) {
          setIsListening(false);
          return;
        }

        setTranscribingAudio(true);
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const resultStr = String(reader.result || "");
            const base64String = resultStr.includes(",")
              ? resultStr.split(",")[1]
              : "";
            if (!base64String) {
              setTranscribingAudio(false);
              return;
            }

            const savedKey = localStorage.getItem("te_brain_gemini_key") || "";
            const res = await fetch("/api/voice", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(savedKey ? { "x-gemini-key": savedKey } : {}),
              },
              body: JSON.stringify({
                audioBase64: base64String,
                mimeType: cleanMime,
                lang: appLang,
              }),
            });
            const data = await res.json();
            if (data.success && data.transcript) {
              applyRecognizedText(data.transcript, target, handsFreeAutoSend);
              showToast(`🎙️ "${data.transcript.slice(0, 48)}"`);
              fetchSystemStatus();
            } else {
              showToast(
                data.error ||
                (appLang === "zh"
                  ? "未听清语音，请重试"
                  : appLang === "en"
                    ? "Could not recognize speech, please try again"
                    : "Không nghe rõ, vui lòng nói lại."),
                "error"
              );
            }
            setTranscribingAudio(false);
          };
          reader.readAsDataURL(audioBlob);
        } catch {
          setTranscribingAudio(false);
          showToast(
            appLang === "zh"
              ? "语音转文字失败"
              : appLang === "en"
                ? "Speech transcription error"
                : "Lỗi chuyển giọng nói thành văn bản.",
            "error"
          );
        }
      };

      mediaRecorderRef.current = recorder;
      // Pass 250ms timeslice so iOS Safari flushes audio data chunks continuously
      recorder.start(250);
      setVoiceTarget(target);
      setIsListening(true);
      showToast(`🎙️ ${t.listeningVoice}`);
    } catch {
      showToast(
        appLang === "zh"
          ? "请在浏览器设置中允许麦克风权限！"
          : appLang === "en"
            ? "Please allow Microphone permission in your browser!"
            : "Vui lòng cấp quyền Micro cho trình duyệt!",
        "error"
      );
    }
  };

  const toggleVoiceInput = (
    target: "chat" | "symptom" | "rootCause" | "solution" = "chat"
  ) => {
    stopSpeaking();

    if (isListening) {
      stopVoiceInput();
      return;
    }

    // CRITICAL FOR iPHONE / iPAD (iOS WebKit):
    // On iOS Safari / Chrome iOS / Home Screen PWA, webkitSpeechRecognition often fails with
    // "not-allowed" or "service-not-allowed", AND iOS blocks getUserMedia() if it is called
    // inside an async onerror callback instead of directly inside the user's tap gesture.
    // Using MediaRecorder + Gemini Audio STT directly on iOS guarantees 100% reliability!
    const isIOS =
      typeof navigator !== "undefined" &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

    if (isIOS) {
      startGeminiAudioFallback(target);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec =
      typeof window !== "undefined"
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).SpeechRecognition ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        const activeSpeechLang =
          LANG_OPTIONS.find((l) => l.code === appLang)?.speechLang || "vi-VN";
        recognition.lang = activeSpeechLang;
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setVoiceTarget(target);
          setIsListening(true);
          showToast(`🎙️ ${t.listeningVoice}`);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          const transcript = event?.results?.[0]?.[0]?.transcript || "";
          if (transcript) {
            applyRecognizedText(transcript, target, handsFreeAutoSend);
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
          setIsListening(false);
          if (event?.error !== "aborted" && event?.error !== "no-speech") {
            startGeminiAudioFallback(target);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          recognitionRef.current = null;
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch {
        // fallback
      }
    }

    startGeminiAudioFallback(target);
  };

  const handleTransDocUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";

    // If image selected via file picker, route to image OCR handler
    if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
      await handleTransImageSelect(e);
      return;
    }

    setExtractingTransDoc(true);
    try {
      // Fast local read for plain text files (.txt, .csv, .log, .md, .json, .ini)
      if (["txt", "csv", "log", "md", "json", "ini", "xml"].includes(ext)) {
        const textContent = await file.text();
        setTransInput(textContent.trim().slice(0, 12000));
        showToast(
          appLang === "zh"
            ? `📂 已读取文件: ${file.name}`
            : appLang === "en"
              ? `📂 Loaded file: ${file.name}`
              : `📂 Đã nạp nội dung từ file: ${file.name}`
        );
        return;
      }

      // Server extraction for .pdf, .docx, etc.
      const savedKey = localStorage.getItem("te_brain_gemini_key") || "";
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/translate-sop", {
        method: "PUT",
        headers: savedKey ? { "x-gemini-key": savedKey } : undefined,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể đọc file tài liệu này");
      }

      setTransInput(data.extractedText || "");
      showToast(
        appLang === "zh"
          ? `📂 已提取文档内容: ${file.name}`
          : appLang === "en"
            ? `📂 Extracted text from: ${file.name}`
            : `📂 Đã trích xuất văn bản từ: ${file.name}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi đọc file tài liệu";
      showToast(msg, "error");
    } finally {
      setExtractingTransDoc(false);
      e.target.value = "";
    }
  };

  const handleTransImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setTransImage({
        mimeType: compressed.mimeType,
        data: compressed.data,
      });
      setTransImagePreview(compressed.preview);
      showToast(
        appLang === "zh"
          ? "📸 已附上中文文档图片，请点击翻译按钮"
          : appLang === "en"
            ? "📸 Chinese document photo attached!"
            : "📸 Đã đính kèm ảnh tài liệu tiếng Trung! Bấm nút Dịch bên dưới."
      );
    } catch {
      showToast("Không thể đọc file ảnh!", "error");
    } finally {
      e.target.value = "";
    }
  };

  const handleTranslateSop = async () => {
    if (!transInput.trim() && !transImage) {
      showToast(
        appLang === "zh"
          ? "请输入需要翻译的文档内容或上传图片"
          : appLang === "en"
            ? "Please enter text or attach a photo to translate"
            : "Vui lòng dán văn bản tiếng Trung/Việt hoặc chụp ảnh tài liệu!",
        "error"
      );
      return;
    }

    setTranslatingSop(true);
    try {
      const savedKey = localStorage.getItem("te_brain_gemini_key") || "";
      const res = await fetch("/api/translate-sop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(savedKey ? { "x-gemini-key": savedKey } : {}),
        },
        body: JSON.stringify({
          text: transInput,
          imageInline: transImage || undefined,
          direction: transDirection,
          mode: transMode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Lỗi dịch thuật tài liệu");
      }

      setTransResult({
        translatedContent: data.translatedContent,
        suggestedTitle: data.suggestedTitle,
        suggestedCategory: data.suggestedCategory,
        suggestedStation: data.suggestedStation,
        suggestedErrorCode: data.suggestedErrorCode,
        suggestedTags: data.suggestedTags,
        glossary: data.glossary || [],
        modelUsed: data.modelUsed || "gemini-3.5-flash-lite",
      });
      showToast(
        appLang === "zh"
          ? "✅ 工程文档翻译与 SOP 标准化完成！"
          : appLang === "en"
            ? "✅ Technical document translated & standardized!"
            : "✅ Đã dịch chuẩn thuật ngữ TE & chuẩn hóa SOP thành công!"
      );
      fetchSystemStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi kết nối AI";
      showToast(msg, "error");
    } finally {
      setTranslatingSop(false);
    }
  };

  const handleSaveTranslatedSopToVault = async () => {
    if (!transResult) return;
    setSavingTransToVault(true);
    try {
      const savedKey = localStorage.getItem("te_brain_gemini_key") || "";
      const glossaryAppendix =
        transResult.glossary.length > 0
          ? `\n\n### 📚 Bảng Thuật Ngữ Kỹ Thuật TE (Trung - Pinyin - Việt - Anh)\n` +
          transResult.glossary
            .map(
              (g) =>
                `- **${g.zh}** (*${g.pinyin}*): ${g.vi} (${g.en})`
            )
            .join("\n")
          : "";

      const fullContent = `${transResult.translatedContent}${glossaryAppendix}${transInput.trim()
        ? `\n\n---\n**[Văn bản gốc / Original Source]:**\n${transInput.trim()}`
        : ""
        }`;

      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(savedKey ? { "x-gemini-key": savedKey } : {}),
        },
        body: JSON.stringify({
          title: transResult.suggestedTitle,
          type: "document",
          category: TE_CATEGORIES.includes(transResult.suggestedCategory)
            ? transResult.suggestedCategory
            : "SOP / Manual",
          errorCode: transResult.suggestedErrorCode,
          station: transResult.suggestedStation,
          content: fullContent,
          tags: transResult.suggestedTags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể lưu vào Kho Tri Thức");
      }

      showToast(
        appLang === "zh"
          ? "💾 已将该标准化 SOP 存入 RAG 向量知识库！"
          : appLang === "en"
            ? "💾 Saved standardized SOP to RAG Knowledge Vault!"
            : "💾 Đã lưu bản SOP chuẩn hóa vào Kho Tri Thức RAG thành công!"
      );
      fetchKnowledge();
      fetchSystemStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi lưu tài liệu";
      showToast(msg, "error");
    } finally {
      setSavingTransToVault(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="h-dvh w-full bg-[#070b12] text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/logo.png"
            alt="TE Brain AI Logo"
            className="w-14 h-14 rounded-2xl object-contain bg-white p-1 shadow-lg shadow-cyan-500/20 animate-pulse"
          />
          <span className="text-xs text-slate-400 font-medium">
            {t.checkingAuth}
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-dvh w-full bg-[#070b12] text-slate-100 flex items-center justify-center px-4 overflow-hidden">
        <div className="w-full max-w-sm bg-[#0b111e] border border-slate-800/90 rounded-3xl p-6 shadow-2xl space-y-4">
          {/* Language Switcher on Lock Screen */}
          <div className="flex items-center justify-center gap-1.5">
            {LANG_OPTIONS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => handleSwitchLang(l.code)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1 ${appLang === l.code
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
              >
                <span>{l.flag}</span>
                <span>{l.short}</span>
              </button>
            ))}
          </div>

          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <img
              src="/logo.png"
              alt="TE Brain AI Logo"
              className="w-16 h-16 rounded-2xl object-contain bg-white p-1 shadow-lg shadow-cyan-500/25"
            />
            <div>
              <h1 className="font-bold text-base text-white tracking-tight">
                {t.lockTitle}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.lockSubtitle}
              </p>
            </div>
          </div>

          {/* 6 PIN Dots Indicator + Hidden/Direct Keyboard Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyPin();
            }}
            className="space-y-3"
          >
            <div className="flex items-center justify-center gap-3 py-1">
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const filled = i < pinInput.length;
                return (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${filled
                      ? "bg-cyan-400 scale-110 shadow-sm shadow-cyan-400/60"
                      : "bg-slate-800 border border-slate-700"
                      }`}
                  />
                );
              })}
            </div>

            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setPinError("");
                setPinInput(val);
                if (val.length === 6) {
                  handleVerifyPin(val);
                }
              }}
              placeholder={t.pinPlaceholder}
              className="w-full h-9 rounded-xl bg-slate-950/90 border border-slate-800 focus:border-cyan-500 focus:outline-none text-center font-mono text-xs tracking-widest text-cyan-300 placeholder-slate-600"
              autoFocus
            />

            {pinError && (
              <div className="px-3 py-2 rounded-xl bg-rose-950/80 border border-rose-500/40 text-center text-xs text-rose-200 flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}
          </form>

          {/* 3x4 Touch Numeric Keypad for Mobile */}
          <div className="grid grid-cols-3 gap-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                disabled={verifyingPin}
                onClick={() => handlePinDigitPress(num)}
                className="h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-800/90 text-base font-bold text-white transition flex items-center justify-center shadow-sm"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              disabled={verifyingPin}
              onClick={() => handlePinDigitPress("CLEAR")}
              className="h-12 rounded-2xl bg-slate-950 hover:bg-slate-900 active:scale-95 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-rose-300 transition flex items-center justify-center"
            >
              {t.clearAll}
            </button>

            <button
              type="button"
              disabled={verifyingPin}
              onClick={() => handlePinDigitPress("0")}
              className="h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-800/90 text-base font-bold text-white transition flex items-center justify-center shadow-sm"
            >
              0
            </button>

            <button
              type="button"
              disabled={verifyingPin}
              onClick={() => handlePinDigitPress("BACK")}
              className="h-12 rounded-2xl bg-slate-950 hover:bg-slate-900 active:scale-95 border border-slate-800 text-slate-300 hover:text-cyan-300 transition flex items-center justify-center"
              title="Back"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-center text-slate-500">
            {t.sessionRemembered}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh w-full bg-[#070b12] text-slate-100 flex justify-center overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-3 z-50 px-4 py-2.5 rounded-2xl shadow-2xl border flex items-center gap-2 text-xs font-medium transition-all duration-300 max-w-[92vw] ${toast.type === "success"
            ? "bg-emerald-950/95 border-emerald-500/50 text-emerald-200"
            : "bg-rose-950/95 border-rose-500/50 text-rose-200"
            }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* App Shell */}
      <div className="w-full max-w-3xl h-dvh flex flex-col bg-[#0b111e] border-x border-slate-800/60 overflow-hidden">
        {/* 1. Sleek Top Header */}
        <header className="shrink-0 bg-[#0b111e]/95 backdrop-blur-md border-b border-slate-800/80 px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="/logo.png"
              alt="TE Brain AI Logo"
              className="w-8 h-8 rounded-xl object-contain bg-white p-0.5 shadow-md shadow-cyan-500/20 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-bold text-xs sm:text-sm tracking-tight text-white truncate">
                TE Brain AI
              </h1>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 whitespace-nowrap">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {t.online}
                </span>
                <span>•</span>
                <span className="text-cyan-300/90">
                  {stats.total} {t.itemsCount}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Compact Language Dropdown (VI / EN / ZH) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangDropdownOpen((prev) => !prev)}
                className="h-7.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-cyan-300 flex items-center gap-1.5 transition"
                title={currentLangOption.name}
              >
                <span>{currentLangOption.flag}</span>
                <span>{currentLangOption.short}</span>
                <ChevronRight
                  className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${langDropdownOpen ? "-rotate-90" : "rotate-90"
                    }`}
                />
              </button>

              {langDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setLangDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-36 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1 z-50 overflow-hidden">
                    {LANG_OPTIONS.map((l) => {
                      const active = appLang === l.code;
                      return (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => {
                            handleSwitchLang(l.code);
                            setLangDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition ${active
                            ? "bg-cyan-500/20 text-cyan-300 font-bold"
                            : "text-slate-200 hover:bg-slate-800"
                            }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{l.flag}</span>
                            <span>{l.name}</span>
                          </span>
                          {active && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => {
                fetchKnowledge();
                fetchSystemStatus();
                showToast(t.refresh);
              }}
              className="h-7.5 w-7.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 flex items-center justify-center transition"
              title={t.refresh}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleLockApp}
              className="h-7.5 w-7.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-amber-400 hover:text-rose-300 border border-slate-700/80 flex items-center justify-center transition"
              title={t.lockScreen}
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* 2. Main Content Area */}
        {activeTab === "chat" ? (
          /* ================= TAB 1: AI CHATBOT + SESSION HISTORY + 8D/HANDOVER REPORT ================= */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Single Slim Top Toolbar (Combines Sub-tabs & Quick Icon Actions in 1 row) */}
            <div className="shrink-0 bg-slate-950/85 border-b border-slate-800/80 px-2.5 py-1.5 flex items-center justify-between gap-1.5">
              {/* Left: 3 Compact Sub-Tabs */}
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setChatSubTab("conversation")}
                  className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1 whitespace-nowrap ${chatSubTab === "conversation"
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <Bot className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.subChat}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setChatSubTab("history");
                    fetchSystemStatus();
                  }}
                  className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1 whitespace-nowrap ${chatSubTab === "history"
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <History className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {t.subHistory} ({chatSessions.length})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setChatSubTab("report")}
                  className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1 whitespace-nowrap ${chatSubTab === "report"
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.subReport}</span>
                </button>
              </div>

              {/* Right: Compact Icon Controls (Auto-Read, Hands-Free, New Chat) */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoReadTTS;
                    setAutoReadTTS(next);
                    if (next) {
                      unlockAudioForIOS();
                    } else {
                      stopSpeaking();
                    }
                    showToast(
                      next
                        ? "🔊 Đã BẬT tự động đọc câu trả lời!"
                        : "🔇 Đã TẮT tự động đọc."
                    );
                  }}
                  title={`Tự động đọc: ${autoReadTTS ? "BẬT" : "TẮT"}`}
                  className={`h-7.5 w-7.5 rounded-lg border flex items-center justify-center transition ${autoReadTTS
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                >
                  {autoReadTTS ? (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = !handsFreeAutoSend;
                    setHandsFreeAutoSend(next);
                    if (next) {
                      setAutoReadTTS(true);
                      unlockAudioForIOS();
                    }
                    showToast(
                      next
                        ? "🎙️ Đã BẬT Rảnh tay (Nói xong tự gửi & đọc)!"
                        : "Đã TẮT chế độ Rảnh tay."
                    );
                  }}
                  title={`Rảnh tay: ${handsFreeAutoSend ? "BẬT" : "TẮT"}`}
                  className={`h-7.5 w-7.5 rounded-lg border flex items-center justify-center transition ${handsFreeAutoSend
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleStartNewSession}
                  title="Tạo phiên trò chuyện mới"
                  className="h-7.5 w-7.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-cyan-300 flex items-center justify-center transition"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ================= SUB-TAB 1: ACTIVE CONVERSATION ================= */}
            {chatSubTab === "conversation" && (
              <>
                {/* Scrollable Messages Area */}
                <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5">
                  {/* Show Quick Prompts ONLY when user hasn't sent any question yet */}
                  {!messages.some((m) => m.role === "user") && (
                    <div className="space-y-1.5 pb-1">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        {t.quickAskLabel}
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {t.quickPrompts.map((item, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendMessage(item.full)}
                            disabled={chatLoading}
                            className="text-left px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800/90 hover:border-cyan-500/40 text-[11px] text-slate-200 transition flex items-center justify-between gap-1"
                          >
                            <span className="truncate font-medium">
                              {item.short}
                            </span>
                            <ChevronRight className="w-3 h-3 text-cyan-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message List */}
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"
                        }`}
                    >
                      <div
                        className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-3.5 py-3 shadow-md ${msg.role === "user"
                          ? "bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-br-xs"
                          : "bg-slate-900/95 border border-slate-800 text-slate-100 rounded-bl-xs"
                          }`}
                      >
                        {msg.imagePreview && (
                          <div className="mb-2">
                            <img
                              src={msg.imagePreview}
                              alt="Uploaded TE capture"
                              className="max-h-44 rounded-xl border border-white/20 object-cover"
                            />
                          </div>
                        )}

                        <FormattedMessage
                          content={msg.content}
                          isUser={msg.role === "user"}
                        />

                        {/* Cited Sources */}
                        {msg.role === "assistant" &&
                          msg.sources &&
                          msg.sources.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-slate-800/90 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" />
                                  {t.citedSources} ({msg.sources.length})
                                </span>
                                {msg.modelUsed && (
                                  <span className="text-[10px] font-mono text-slate-500">
                                    {msg.modelUsed}
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1">
                                {msg.sources.map((src, sIdx) => (
                                  <button
                                    key={sIdx}
                                    onClick={() => openSourceDetail(src.id)}
                                    className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/90 hover:bg-cyan-950/50 border border-slate-800 hover:border-cyan-500/40 text-xs text-slate-200 transition"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {src.errorCode && (
                                        <span className="font-mono font-bold text-amber-400 shrink-0">
                                          [{src.errorCode}]
                                        </span>
                                      )}
                                      <span className="truncate">
                                        {src.title}
                                      </span>
                                    </div>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-mono shrink-0">
                                      {Math.min(99, Math.round(src.score * 100))}
                                      %
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Action Bar under Assistant Message */}
                        {msg.role === "assistant" && (
                          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => speakMessage(msg.content, idx)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${speakingIdx === idx
                                ? "bg-rose-500/20 border-rose-400 text-rose-300 animate-pulse"
                                : "bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-cyan-300"
                                }`}
                            >
                              {speakingIdx === idx ? (
                                <>
                                  <Square className="w-3 h-3 fill-current" />
                                  <span>{t.stopListening}</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5" />
                                  <span>{t.listenGuide}</span>
                                </>
                              )}
                            </button>

                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSaveChatAnswerToNote(msg, idx)
                                }
                                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 transition"
                              >
                                <BookmarkPlus className="w-3.5 h-3.5" />
                                <span>{t.saveToNote}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex items-start">
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-xs px-3.5 py-2.5 text-xs text-slate-300 flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shrink-0" />
                        <span>{t.searchingRag}</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Bottom Chat Input Bar */}
                <div className="shrink-0 bg-[#0b111e] border-t border-slate-800/90 px-3 py-2">
                  {attachedImage && (
                    <div className="mb-2 inline-flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-1.5 pr-3">
                      <img
                        src={attachedImage.preview}
                        alt="Preview"
                        className="w-9 h-9 rounded-lg object-cover"
                      />
                      <span className="text-xs text-cyan-300">
                        {t.attachedImageLabel}
                      </span>
                      <button
                        onClick={() => setAttachedImage(null)}
                        className="p-1 text-slate-400 hover:text-rose-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {(isListening || transcribingAudio) &&
                    voiceTarget === "chat" && (
                      <div className="mb-2 flex items-center justify-between bg-rose-950/80 border border-rose-500/50 rounded-xl px-3 py-1.5 text-xs text-rose-200">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                          <span>
                            {transcribingAudio
                              ? t.transcribingVoice
                              : t.listeningVoice}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={stopVoiceInput}
                          className="px-2 py-0.5 rounded bg-rose-500/30 text-white font-semibold text-[11px]"
                        >
                          {t.doneBtn}
                        </button>
                      </div>
                    )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageAttach}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      title="Đính kèm ảnh lỗi"
                      className="h-10 w-10 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-cyan-400 border border-slate-700/80 flex items-center justify-center shrink-0 transition"
                    >
                      <Camera className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleVoiceInput("chat")}
                      disabled={transcribingAudio}
                      title="Nói bằng giọng nói"
                      className={`h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 transition ${isListening && voiceTarget === "chat"
                        ? "bg-rose-600 border-rose-400 text-white animate-pulse"
                        : "bg-slate-800/90 hover:bg-slate-800 text-emerald-400 border-slate-700/80"
                        }`}
                    >
                      {isListening && voiceTarget === "chat" ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </button>

                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={t.chatPlaceholder}
                      className="flex-1 h-10 rounded-xl bg-slate-900 border border-slate-700/90 focus:border-cyan-500 focus:outline-none px-3 text-xs sm:text-sm text-white placeholder-slate-400 min-w-0"
                    />

                    <button
                      type="submit"
                      disabled={chatLoading || !chatInput.trim()}
                      className="h-10 w-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/20 transition"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </>
            )}

            {/* ================= SUB-TAB 2: SESSION HISTORY MANAGER ================= */}
            {chatSubTab === "history" && (
              <div className="flex-1 overflow-y-auto px-3.5 py-3.5 space-y-3">
                {/* Top Action Bar */}
                <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-3">
                  <div>
                    <h3 className="text-xs font-bold text-white">
                      {t.historyTitle}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {t.historySavedCount} {chatSessions.length} {t.historySessionsInDb}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleStartNewSession}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      <span>{t.newSessionBtn}</span>
                    </button>

                    {chatSessions.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllSessions}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-xs text-slate-300 hover:text-rose-300 transition"
                        title="Xóa toàn bộ lịch sử"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Session Cards List */}
                {chatSessions.length === 0 ? (
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
                    <History className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs font-semibold text-slate-300">
                      {t.emptyHistoryTitle}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {t.emptyHistoryDesc}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {chatSessions.map((s) => {
                      const isCurrent = sessionId === s._id;
                      return (
                        <div
                          key={s._id}
                          className={`rounded-2xl p-3.5 border transition space-y-2.5 ${isCurrent
                            ? "bg-cyan-950/25 border-cyan-500/50"
                            : "bg-slate-900 border-slate-800"
                            }`}
                        >
                          {/* Row 1: Title + Status Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-white leading-snug">
                              {s.title}
                            </h4>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-semibold shrink-0">
                                {t.activeBadge}
                              </span>
                            )}
                          </div>

                          {/* Row 2: Metadata (Vertical / Separated clearly) */}
                          <div className="space-y-1 text-xs border-y border-slate-800/80 py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">
                                {t.exchangeCount}
                              </span>
                              <span className="font-mono font-semibold text-slate-200">
                                {s.messageCount} {t.messagesUnit}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">
                                {t.updatedAtLabel}
                              </span>
                              <span className="font-mono text-slate-300">
                                {new Date(s.updatedAt).toLocaleString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Row 3: Clean Action Buttons */}
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <div className="flex items-center gap-1.5 flex-1">
                              <button
                                type="button"
                                onClick={() => handleOpenSession(s, false)}
                                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 border border-slate-700 transition flex items-center justify-center gap-1.5"
                              >
                                <Bot className="w-3.5 h-3.5" />
                                <span>{t.reopenChatBtn}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenSession(s, true)}
                                className="flex-1 py-2 px-3 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/35 text-xs font-semibold text-indigo-200 border border-indigo-500/40 transition flex items-center justify-center gap-1.5"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>{t.exportReportBtn}</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteSession(s._id)}
                              className="p-2 rounded-xl bg-slate-950 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 transition shrink-0"
                              title="Xóa phiên này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ================= SUB-TAB 3: 8D / SHIFT HANDOVER REPORT GENERATOR ================= */}
            {chatSubTab === "report" && (
              <div className="flex-1 overflow-y-auto px-3.5 py-3.5 space-y-3.5">
                {/* Report Configuration Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      {t.reportHeaderTitle}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {t.reportHeaderDesc}
                    </p>
                  </div>

                  {/* Report Template Selector */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-300 block">
                      {t.step1Template}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setReportType("handover")}
                        className={`p-3 rounded-xl border text-left transition space-y-1 ${reportType === "handover"
                          ? "bg-cyan-950/40 border-cyan-500 text-white"
                          : "bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-cyan-300">
                            {t.handoverTitle}
                          </span>
                          {reportType === "handover" && (
                            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {t.handoverDesc}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setReportType("8d")}
                        className={`p-3 rounded-xl border text-left transition space-y-1 ${reportType === "8d"
                          ? "bg-indigo-950/40 border-indigo-400 text-white"
                          : "bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-indigo-300">
                            {t.eightDTitle}
                          </span>
                          {reportType === "8d" && (
                            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {t.eightDDesc}
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Report Output Language Selector (3 Main Languages: VI / EN / ZH) */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-300 block">
                      {t.step2Lang}
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          code: "vi" as const,
                          flag: "🇻🇳",
                          label: "Tiếng Việt",
                          sub: "Vietnamese",
                        },
                        {
                          code: "en" as const,
                          flag: "🇺🇸",
                          label: "English",
                          sub: "Tiếng Anh",
                        },
                        {
                          code: "zh" as const,
                          flag: "🇨🇳",
                          label: "简体中文",
                          sub: "Tiếng Trung",
                        },
                      ].map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => setReportLang(lang.code)}
                          className={`py-2 px-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-0.5 ${reportLang === lang.code
                            ? "bg-cyan-500/20 border-cyan-400 text-white shadow-sm"
                            : "bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                            }`}
                        >
                          <span className="text-xs font-bold flex items-center gap-1">
                            <span>{lang.flag}</span>
                            <span>{lang.label}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {lang.sub}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    type="button"
                    onClick={() => handleGenerateIncidentReport()}
                    disabled={reportLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
                  >
                    {reportLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t.generatingReportBtn}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>
                          {t.generateReportBtn}{" "}
                          {reportType === "8d" ? "8D / CAPA" : "Shift Handover"} (
                          {reportLang.toUpperCase()})
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Generated Report Result & 1-Click Actions */}
                {generatedReport ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                      <div>
                        <span className="text-xs font-bold text-emerald-300 block">
                          {reportType === "8d"
                            ? t.eightDTitle
                            : t.handoverTitle}
                        </span>
                        {reportModelUsed && (
                          <span className="text-[10px] font-mono text-slate-500">
                            Model: {reportModelUsed}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedReport);
                          showToast(
                            "📋 Đã sao chép báo cáo! Dán ngay vào Zalo / Teams / WeChat."
                          );
                        }}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t.copyReportBtn}</span>
                      </button>
                    </div>

                    {/* Clean Report Text Area */}
                    <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3">
                      <FormattedMessage
                        content={generatedReport}
                        isUser={false}
                      />
                    </div>

                    {/* Bottom Action Buttons (Separated cleanly) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDownloadReportTxt}
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition"
                      >
                        <Download className="w-4 h-4 text-cyan-400" />
                        <span>{t.downloadTxtBtn}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveReportDirectlyToVault}
                        disabled={savingReportToVault}
                        className="py-2.5 px-3 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-500/40 text-xs font-semibold text-emerald-200 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                      >
                        <BookmarkPlus className="w-4 h-4 text-emerald-400" />
                        <span>
                          {savingReportToVault
                            ? t.savingToVaultBtn
                            : t.saveToVaultBtn}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 text-center space-y-2">
                    <p className="text-xs text-slate-300 font-medium">
                      {t.emptyReportTitle}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {t.emptyReportDesc}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ================= OTHER TABS ================= */
          <main className="flex-1 overflow-y-auto">
            {/* ================= TAB 2: LOG ANALYTICS (CLEAN SEGMENTED UI) ================= */}
            {activeTab === "analytics" && (
              <div className="px-3.5 py-3.5 space-y-3.5 pb-8">
                {/* Compact File Header Bar */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold block">
                        {t.analyzingFileLabel}
                      </span>
                      <h2 className="font-mono font-bold text-xs sm:text-sm text-white truncate">
                        {logResult ? logResult.fileName : t.noFileSelected}
                      </h2>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        ref={logFileInputRef}
                        type="file"
                        accept=".csv,.txt,.log,.tsv"
                        onChange={handleLogFileSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 transition"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{t.uploadLogBtn}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadSampleCsv}
                        title={t.sampleLogBtn}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {logResult && (
                  <>
                    {/* 4 Balanced KPI Summary Cards (2x2 Grid) */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                        <span className="text-[11px] text-slate-400 block">
                          {t.kpiFpy}
                        </span>
                        <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">
                          {logResult.fpyRate}%
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          PASS: {logResult.passCount}/{logResult.totalRecords}
                        </span>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                        <span className="text-[11px] text-slate-400 block">
                          {t.kpiTotalFail}
                        </span>
                        <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                          {logResult.failCount}
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          SN: {logResult.uniqueUnits}
                        </span>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                        <span className="text-[11px] text-slate-400 block">
                          {t.kpiFalseCall}
                        </span>
                        <div className="text-lg font-bold font-mono text-cyan-300 mt-0.5">
                          {logResult.falseCallRate}%
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Retest PASS: {logResult.retestOkCount}
                        </span>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                        <span className="text-[11px] text-slate-400 block">
                          {t.kpiMinCpk}
                        </span>
                        {logResult.cpkItems.length > 0 ? (
                          <>
                            <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                              {logResult.cpkItems[0].cpk}
                            </div>
                            <span className="text-[11px] text-slate-500 block mt-0.5 truncate">
                              {logResult.cpkItems[0].testItem}
                            </span>
                          </>
                        ) : (
                          <div className="text-xs text-slate-500 mt-2">
                            N/A
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Clean 3-Part Segmented Control */}
                    <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setAnalyticsSubTab("pareto")}
                        className={`py-2 rounded-lg text-xs font-semibold transition ${analyticsSubTab === "pareto"
                          ? "bg-cyan-500 text-slate-950 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                          }`}
                      >
                        {t.tabTopDefects} ({logResult.pareto.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setAnalyticsSubTab("cpk")}
                        className={`py-2 rounded-lg text-xs font-semibold transition ${analyticsSubTab === "cpk"
                          ? "bg-cyan-500 text-slate-950 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                          }`}
                      >
                        {t.tabCpkIndex} ({logResult.cpkItems.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setAnalyticsSubTab("ai-report")}
                        className={`py-2 rounded-lg text-xs font-semibold transition ${analyticsSubTab === "ai-report"
                          ? "bg-cyan-500 text-slate-950 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                          }`}
                      >
                        {t.tabAiReport}
                      </button>
                    </div>

                    {/* SUB-VIEW 1: PARETO TOP DEFECTS */}
                    {analyticsSubTab === "pareto" && (
                      <div className="space-y-2.5">
                        {logResult.pareto.map((p, idx) => (
                          <div
                            key={p.errorCode}
                            className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5"
                          >
                            {/* Row 1: Rank + Error Code | Count + % */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="font-mono font-bold text-sm text-white truncate">
                                  {p.errorCode}
                                </span>
                              </div>
                              <span className="font-mono text-xs font-bold text-rose-400 shrink-0">
                                {p.count} {t.defectsCountUnit} ({p.percentOfFails}%)
                              </span>
                            </div>

                            {/* Row 2: Progress Bar */}
                            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-rose-500 to-amber-400 rounded-full"
                                style={{
                                  width: `${Math.max(8, p.percentOfFails)}%`,
                                }}
                              />
                            </div>

                            {/* Row 3: Details stacked on separate lines + AI Action Button */}
                            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
                              <div className="space-y-1 min-w-0">
                                <div className="text-slate-400 truncate">
                                  {t.stationLabel}{" "}
                                  <strong className="text-slate-200 font-semibold">
                                    {p.station}
                                  </strong>
                                </div>
                                <div className="text-slate-400 truncate">
                                  {t.testItemLabel}{" "}
                                  <strong className="text-cyan-300 font-mono">
                                    {p.testItem}
                                  </strong>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab("chat");
                                  handleSendMessage(
                                    appLang === "zh"
                                      ? `工站 ${p.station} 在测试项 ${p.testItem} 出现错误 ${p.errorCode}（共 ${p.count} 次不良，占比 ${p.percentOfFails}%）。请提供根因分析与 SOP 维修对策？`
                                      : appLang === "en"
                                        ? `Station ${p.station} failed with ${p.errorCode} at test item ${p.testItem} (${p.count} fails, ${p.percentOfFails}%). What is the root cause and SOP troubleshooting guide?`
                                        : `Trạm ${p.station} bị lỗi ${p.errorCode} tại bài đo ${p.testItem} (${p.count} lỗi, chiếm ${p.percentOfFails}%). Hướng dẫn nguyên nhân và cách xử lý SOP?`
                                  );
                                }}
                                className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-semibold text-xs shrink-0 transition"
                              >
                                {t.askAiFixBtn}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* SUB-VIEW 2: CPK PROCESS CAPABILITY */}
                    {analyticsSubTab === "cpk" && (
                      <div className="space-y-2.5">
                        {logResult.cpkItems.map((c) => (
                          <div
                            key={`${c.station}-${c.testItem}`}
                            className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5"
                          >
                            {/* Header: Test Item + Status Badge */}
                            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                              <div>
                                <span className="font-mono font-bold text-sm text-white block">
                                  {c.testItem}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {t.stationLabel} {c.station} ({c.sampleCount}{" "}
                                  {t.samplesUnit})
                                </span>
                              </div>

                              <span
                                className={`px-2.5 py-1 rounded-xl font-mono text-xs font-bold border ${c.status === "good"
                                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                                  : c.status === "warning"
                                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                                    : "bg-rose-500/15 border-rose-500/40 text-rose-300"
                                  }`}
                              >
                                Cpk = {c.cpk}{" "}
                                {c.status === "good"
                                  ? t.cpkGood
                                  : c.status === "warning"
                                    ? t.cpkWarn
                                    : "(NG < 1.0)"}
                              </span>
                            </div>

                            {/* Clean Vertical Rows for Spec Limits */}
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">
                                  {t.cpkSpecLimits}
                                </span>
                                <strong className="text-slate-200 font-mono">
                                  {c.lsl} {c.unit} → {c.usl} {c.unit}
                                </strong>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">
                                  {t.cpkMean}
                                </span>
                                <strong className="text-cyan-300 font-mono">
                                  {c.mean} {c.unit}
                                </strong>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">
                                  {t.cpkStdDev}
                                </span>
                                <strong className="text-amber-300 font-mono">
                                  {c.stdDev} (Cp = {c.cp})
                                </strong>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">
                                  {t.cpkMinMax}
                                </span>
                                <strong className="text-slate-200 font-mono">
                                  {c.min} {c.unit} / {c.max} {c.unit}
                                </strong>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* SUB-VIEW 3: AI SHIFT HANDOVER REPORT */}
                    {analyticsSubTab === "ai-report" && (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {t.aiLogDesc}
                        </p>

                        <button
                          type="button"
                          disabled={aiLogLoading}
                          onClick={handleGenerateLogAIReport}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition"
                        >
                          {aiLogLoading ? (
                            <>
                              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                              <span>{t.aiLogGenerating}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>
                                {aiLogReport
                                  ? t.aiLogRegenerateBtn
                                  : t.aiLogGenerateBtn}
                              </span>
                            </>
                          )}
                        </button>

                        {aiLogReport && (
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3 mt-2">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                              <span className="text-xs font-bold text-cyan-300">
                                {t.aiLogReportTitle}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => speakMessage(aiLogReport, 999)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 text-xs font-medium flex items-center gap-1"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                  <span>
                                    {speakingIdx === 999
                                      ? t.stopListening
                                      : t.listenGuide}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(aiLogReport);
                                    showToast("📋 Copied!");
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </button>
                              </div>
                            </div>

                            <FormattedMessage
                              content={aiLogReport}
                              isUser={false}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ================= TAB 3: QUICK TROUBLESHOOTING NOTE + AI SOP TRANSLATOR ================= */}
            {activeTab === "quick-note" && (
              <div className="px-3.5 py-3 space-y-3 pb-8">
                {/* Slim 2 Sub-tabs Switcher */}
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setNoteSubTab("note")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 whitespace-nowrap ${noteSubTab === "note"
                      ? "bg-cyan-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    <span>{t.subQuickNote}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteSubTab("translate")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 whitespace-nowrap ${noteSubTab === "translate"
                      ? "bg-cyan-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    <span>{t.subTranslateSop}</span>
                  </button>
                </div>

                {noteSubTab === "note" ? (
                  <>
                    {/* Vision Auto-Fill Button Card */}
                    <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-xs sm:text-sm text-white">
                            {t.visionTitle}
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            {t.visionDesc}
                          </p>
                        </div>
                        <input
                          ref={visionInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleVisionAutoFill}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={visionScanning}
                          onClick={() => visionInputRef.current?.click()}
                          className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-semibold text-xs flex items-center gap-1.5 shrink-0 transition"
                        >
                          <Camera className="w-4 h-4 text-cyan-300" />
                          <span>
                            {visionScanning
                              ? t.visionScanningBtn
                              : t.visionScanBtn}
                          </span>
                        </button>
                      </div>

                      {visionPreview && (
                        <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={visionPreview}
                              alt="Scanned"
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <span className="text-xs text-emerald-400 font-medium">
                              {t.visionAutoFilled}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setVisionPreview(null)}
                            className="p-1 text-slate-400 hover:text-rose-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSaveQuickNote} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          {t.noteTitleLabel}
                        </label>
                        <input
                          type="text"
                          required
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          placeholder={t.noteTitlePlaceholder}
                          className="w-full rounded-xl bg-slate-900 border border-slate-700/80 focus:border-cyan-500 focus:outline-none px-3.5 py-2.5 text-sm text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          {t.noteCategoryLabel}
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {TE_CATEGORIES.map((cat) => (
                            <button
                              type="button"
                              key={cat}
                              onClick={() => setNoteCategory(cat)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${noteCategory === cat
                                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                                : "bg-slate-900 border-slate-800 text-slate-400"
                                }`}
                            >
                              {cat === "Khác" ? t.otherCategory : cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            {t.noteErrorCodeLabel}
                          </label>
                          <input
                            type="text"
                            value={noteErrorCode}
                            onChange={(e) => setNoteErrorCode(e.target.value)}
                            placeholder={t.noteErrorCodePlaceholder}
                            className="w-full rounded-xl bg-slate-900 border border-slate-700/80 focus:border-cyan-500 focus:outline-none px-3 py-2 text-xs sm:text-sm font-mono text-amber-300"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            {t.noteStationLabel}
                          </label>
                          <input
                            type="text"
                            value={noteStation}
                            onChange={(e) => setNoteStation(e.target.value)}
                            placeholder={t.noteStationPlaceholder}
                            className="w-full rounded-xl bg-slate-900 border border-slate-700/80 focus:border-cyan-500 focus:outline-none px-3 py-2 text-xs sm:text-sm text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-300">
                            {t.noteSymptomLabel}
                          </label>
                          <button
                            type="button"
                            onClick={() => toggleVoiceInput("symptom")}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${isListening && voiceTarget === "symptom"
                              ? "bg-rose-600 border-rose-400 text-white"
                              : "bg-slate-800 border-slate-700 text-cyan-300"
                              }`}
                          >
                            <Mic className="w-3 h-3" />
                            <span>
                              {isListening && voiceTarget === "symptom"
                                ? t.voiceListeningShort
                                : t.voiceDictateBtn}
                            </span>
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={noteSymptom}
                          onChange={(e) => setNoteSymptom(e.target.value)}
                          placeholder={t.noteSymptomPlaceholder}
                          className="w-full rounded-xl bg-slate-900 border border-slate-700/80 focus:border-cyan-500 focus:outline-none px-3.5 py-2 text-sm text-white"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-300">
                            {t.noteRootCauseLabel}
                          </label>
                          <button
                            type="button"
                            onClick={() => toggleVoiceInput("rootCause")}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${isListening && voiceTarget === "rootCause"
                              ? "bg-rose-600 border-rose-400 text-white"
                              : "bg-slate-800 border-slate-700 text-cyan-300"
                              }`}
                          >
                            <Mic className="w-3 h-3" />
                            <span>
                              {isListening && voiceTarget === "rootCause"
                                ? t.voiceListeningShort
                                : t.voiceDictateBtn}
                            </span>
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={noteRootCause}
                          onChange={(e) => setNoteRootCause(e.target.value)}
                          placeholder={t.noteRootCausePlaceholder}
                          className="w-full rounded-xl bg-slate-900 border border-slate-700/80 focus:border-cyan-500 focus:outline-none px-3.5 py-2 text-sm text-white"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-emerald-400">
                            {t.noteSolutionLabel}
                          </label>
                          <button
                            type="button"
                            onClick={() => toggleVoiceInput("solution")}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${isListening && voiceTarget === "solution"
                              ? "bg-rose-600 border-rose-400 text-white"
                              : "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                              }`}
                          >
                            <Mic className="w-3 h-3" />
                            <span>
                              {isListening && voiceTarget === "solution"
                                ? t.voiceListeningShort
                                : t.voiceDictateBtn}
                            </span>
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          required
                          value={noteSolution}
                          onChange={(e) => setNoteSolution(e.target.value)}
                          placeholder={t.noteSolutionPlaceholder}
                          className="w-full rounded-xl bg-slate-900 border border-emerald-500/40 focus:border-emerald-400 focus:outline-none px-3.5 py-2 text-sm text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          {t.noteTagsLabel}
                        </label>
                        <input
                          type="text"
                          value={noteTags}
                          onChange={(e) => setNoteTags(e.target.value)}
                          placeholder={t.noteTagsPlaceholder}
                          className="w-full rounded-xl bg-slate-900 border border-slate-700/80 focus:border-cyan-500 focus:outline-none px-3.5 py-2 text-sm text-white"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={savingNote}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>
                          {savingNote ? t.savingNoteBtn : t.saveNoteBtn}
                        </span>
                      </button>
                    </form>
                  </>
                ) : (
                  /* ================= SUB-TAB 2: COMPACT AI CHINESE-VIETNAMESE SOP TRANSLATOR ================= */
                  <div className="space-y-2.5">
                    {/* Unified Control + Input Card */}
                    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3 space-y-2.5">
                      {/* Row 1: Compact Single-Line Direction Segmented Bar */}
                      <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
                        {(
                          [
                            { id: "zh-vi", label: t.dirZhToVi },
                            { id: "vi-zh", label: t.dirViToZh },
                            { id: "auto-en", label: t.dirAutoToEn },
                          ] as const
                        ).map((dir) => (
                          <button
                            key={dir.id}
                            type="button"
                            onClick={() => setTransDirection(dir.id)}
                            className={`py-1.5 px-1.5 rounded-lg text-[11px] font-semibold transition text-center whitespace-nowrap truncate ${transDirection === dir.id
                              ? "bg-cyan-500/20 border border-cyan-400/60 text-cyan-300"
                              : "text-slate-400 hover:text-slate-200"
                              }`}
                          >
                            {dir.label}
                          </button>
                        ))}
                      </div>

                      {/* Row 2: Compact Single-Line Output Mode Segmented Bar */}
                      <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
                        {(
                          [
                            { id: "sop", label: t.modeSopLabel },
                            { id: "bilingual", label: t.modeBilingualLabel },
                            {
                              id: "troubleshooting",
                              label: t.modeTroubleLabel,
                            },
                          ] as const
                        ).map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setTransMode(m.id)}
                            className={`py-1.5 px-1.5 rounded-lg text-[11px] font-semibold transition text-center whitespace-nowrap truncate ${transMode === m.id
                              ? "bg-emerald-500/20 border border-emerald-400/60 text-emerald-300"
                              : "text-slate-400 hover:text-slate-200"
                              }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>

                      {/* Row 3: Slim Label + Mini Action Pills on 1 Line */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-[11px] font-semibold text-slate-400 truncate">
                          {t.transInputLabel}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            ref={transDocInputRef}
                            type="file"
                            accept=".pdf,.docx,.txt,.md,.csv,.log,.json,.ini,.png,.jpg,.jpeg,.webp"
                            onChange={handleTransDocUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            disabled={extractingTransDoc}
                            onClick={() => transDocInputRef.current?.click()}
                            className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-[11px] font-medium flex items-center gap-1 whitespace-nowrap transition disabled:opacity-50"
                          >
                            <Upload className="w-3 h-3 shrink-0" />
                            <span>
                              {extractingTransDoc
                                ? t.extractingDocBtn
                                : t.uploadDocForTransBtn}
                            </span>
                          </button>

                          <input
                            ref={transImageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleTransImageSelect}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => transImageInputRef.current?.click()}
                            className="px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 text-cyan-300 text-[11px] font-medium flex items-center gap-1 whitespace-nowrap transition"
                          >
                            <Camera className="w-3 h-3 shrink-0" />
                            <span>{t.scanChineseImgBtn}</span>
                          </button>

                          {(transInput || transImage) && (
                            <button
                              type="button"
                              onClick={() => {
                                setTransInput("");
                                setTransImage(null);
                                setTransImagePreview(null);
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 text-[11px] whitespace-nowrap"
                            >
                              {t.clearInputBtn}
                            </button>
                          )}
                        </div>
                      </div>

                      {transImagePreview && (
                        <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={transImagePreview}
                              alt="Chinese SOP"
                              className="w-10 h-10 rounded-lg object-cover border border-cyan-500/40"
                            />
                            <span className="text-xs text-cyan-300 font-medium">
                              📸 Đã đính kèm ảnh tài liệu
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTransImage(null);
                              setTransImagePreview(null);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <textarea
                        rows={4}
                        value={transInput}
                        onChange={(e) => setTransInput(e.target.value)}
                        placeholder={t.transInputPlaceholder}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none p-3 text-xs sm:text-sm text-white leading-relaxed"
                      />

                      <button
                        type="button"
                        disabled={translatingSop}
                        onClick={handleTranslateSop}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-md shadow-cyan-500/15 flex items-center justify-center gap-1.5 transition"
                      >
                        {translatingSop ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>{t.translatingActionBtn}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>{t.translateActionBtn}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Step 4: Standardized Result + TE Glossary + 1-Click Save to RAG */}
                    {transResult && (
                      <div className="space-y-3">
                        {/* Standardized Document Card */}
                        <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-3.5 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                                {t.transResultHeader}
                              </span>
                              <h4 className="font-bold text-xs sm:text-sm text-white">
                                {transResult.suggestedTitle}
                              </h4>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  speakMessage(
                                    transResult.translatedContent,
                                    888
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>
                                  {speakingIdx === 888
                                    ? t.stopListening
                                    : t.listenGuide}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    transResult.translatedContent
                                  );
                                  showToast("📋 Copied!");
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </button>
                            </div>
                          </div>

                          <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3">
                            <FormattedMessage
                              content={transResult.translatedContent}
                              isUser={false}
                            />
                          </div>

                          {/* 1-Click Save to RAG Vault */}
                          <button
                            type="button"
                            disabled={savingTransToVault}
                            onClick={handleSaveTranslatedSopToVault}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition"
                          >
                            {savingTransToVault ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>{t.savingToVaultBtn}</span>
                              </>
                            ) : (
                              <span>{t.saveTransToVaultBtn}</span>
                            )}
                          </button>
                        </div>

                        {/* Extracted TE Glossary Table with Pinyin */}
                        {transResult.glossary.length > 0 && (
                          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                            <h4 className="font-bold text-xs text-amber-300">
                              {t.glossaryHeader}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {transResult.glossary.map((g, idx) => (
                                <div
                                  key={idx}
                                  className="bg-slate-950 border border-slate-800/90 rounded-xl p-2.5 flex items-start justify-between gap-2"
                                >
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-sm text-amber-300">
                                        {g.zh}
                                      </span>
                                      <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/50 px-1.5 py-0.5 rounded">
                                        {g.pinyin}
                                      </span>
                                    </div>
                                    <p className="text-xs font-semibold text-white">
                                      🇻🇳 {g.vi}
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                      🇺🇸 {g.en}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 4: KNOWLEDGE VAULT ================= */}
            {activeTab === "vault" && (
              <div className="px-3.5 py-3.5 space-y-3.5 pb-8">
                {/* Quick Shortcut to Chinese-Vietnamese SOP Translator */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("quick-note");
                    setNoteSubTab("translate");
                  }}
                  className="w-full py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-blue-950/70 to-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-cyan-200 text-xs font-semibold flex items-center justify-between gap-2 transition"
                >
                  <span className="text-left">{t.vaultTranslateShortcut}</span>
                </button>

                {/* Compact Upload Box */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm text-white">
                        {t.vaultUploadTitle}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {t.vaultUploadDesc}
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.md,.csv,.log,.json,.ini,.png,.jpg,.jpeg,.webp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingFile}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingFile ? t.vaultUploadingBtn : t.vaultUploadBtn}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Search & Category Filter */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.searchPlaceholder}
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:outline-none pl-10 pr-4 py-2 text-xs sm:text-sm text-white"
                    />
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {["Tất cả", ...TE_CATEGORIES].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${selectedCategory === cat
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                          : "bg-slate-900 border-slate-800 text-slate-400"
                          }`}
                      >
                        {cat === "Tất cả"
                          ? t.allCategories
                          : cat === "Khác"
                            ? t.otherCategory
                            : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items List */}
                {loadingKnowledge ? (
                  <div className="py-10 text-center text-xs text-slate-400">
                    {t.vaultLoading}
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="py-10 text-center bg-slate-900/50 rounded-2xl border border-slate-800 p-5 text-xs text-slate-400">
                    {t.vaultEmpty}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredItems.map((item) => (
                      <div
                        key={item._id}
                        onClick={() => setSelectedItemModal(item)}
                        className="cursor-pointer bg-slate-900 hover:bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-3.5 space-y-2 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {item.errorCode && (
                                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  {item.errorCode}
                                </span>
                              )}
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                {item.category === "Khác"
                                  ? t.otherCategory
                                  : item.category}
                              </span>
                              {item.station && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-300">
                                  {item.station}
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-xs sm:text-sm text-white pt-0.5">
                              {item.title}
                            </h4>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(item._id);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {item.solution || item.symptom || item.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 5: SETTINGS (CLEAN 3-SUBTAB LAYOUT) ================= */}
            {activeTab === "settings" && (
              <div className="px-3.5 py-3.5 space-y-3.5 pb-8">
                {/* Segmented Switcher for System Tab */}
                <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab("tokens")}
                    className={`py-2 rounded-lg text-xs font-semibold transition ${settingsSubTab === "tokens"
                      ? "bg-cyan-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    {t.tabTokens}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsSubTab("database")}
                    className={`py-2 rounded-lg text-xs font-semibold transition ${settingsSubTab === "database"
                      ? "bg-cyan-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    {t.tabDatabase}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsSubTab("models")}
                    className={`py-2 rounded-lg text-xs font-semibold transition ${settingsSubTab === "models"
                      ? "bg-cyan-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    {t.tabModels}
                  </button>
                </div>

                {/* SETTINGS SUB-VIEW 1: TOKEN USAGE & LIMITS */}
                {settingsSubTab === "tokens" && (
                  <div className="space-y-3">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">
                          {t.tokenTodayTitle} ({tokenTelemetry.activeModel})
                        </span>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                2,
                                (tokenTelemetry.today.totalTokens /
                                  tokenTelemetry.limits.dailyTokenQuota) *
                                100
                              )
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="space-y-1.5 pt-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">
                            {t.tokenDailyQuotaLabel}
                          </span>
                          <strong className="text-slate-200 font-mono">
                            {tokenTelemetry.limits.dailyTokenQuota.toLocaleString()} tokens
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">
                            {t.tokenRemainingLabel}
                          </span>
                          <strong className="text-emerald-400 font-mono">
                            {Math.max(
                              0,
                              tokenTelemetry.limits.dailyTokenQuota -
                              tokenTelemetry.today.totalTokens
                            ).toLocaleString()}{" "}
                            tokens
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">
                            {t.tokenRpdLabel}
                          </span>
                          <strong className="text-white font-mono">
                            {tokenTelemetry.today.requests} /{" "}
                            {tokenTelemetry.limits.freeTierRpdLimit} {t.callsUnit}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* 4 Balanced Token Breakdown Boxes */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                        <span className="text-[11px] text-slate-400 block">
                          {t.tokenPromptBox}
                        </span>
                        <span className="text-base font-bold font-mono text-white mt-0.5 block">
                          {tokenTelemetry.today.promptTokens.toLocaleString()}
                        </span>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                        <span className="text-[11px] text-slate-400 block">
                          {t.tokenThinkingBox}
                        </span>
                        <span className="text-base font-bold font-mono text-amber-300 mt-0.5 block">
                          {tokenTelemetry.today.thoughtsTokens.toLocaleString()}
                        </span>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                        <span className="text-[11px] text-slate-400 block">
                          {t.tokenOutputBox}
                        </span>
                        <span className="text-base font-bold font-mono text-emerald-300 mt-0.5 block">
                          {tokenTelemetry.today.candidatesTokens.toLocaleString()}
                        </span>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                        <span className="text-[11px] text-slate-400 block">
                          {t.tokenCumulativeBox} ({tokenTelemetry.allTime.requests}{" "}
                          {t.callsUnit})
                        </span>
                        <span className="text-base font-bold font-mono text-cyan-300 mt-0.5 block">
                          {tokenTelemetry.allTime.totalTokens.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Official Spec Limits */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs">
                      <span className="font-bold text-slate-200 block">
                        {t.modelSpecLimitsTitle} ({tokenTelemetry.activeModel})
                      </span>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <span className="text-slate-400">{t.maxContextLabel}</span>
                        <strong className="text-slate-200 font-mono">
                          {tokenTelemetry.limits.inputTokenLimit.toLocaleString()} tokens
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{t.maxOutputLabel}</span>
                        <strong className="text-slate-200 font-mono">
                          {tokenTelemetry.limits.outputTokenLimit.toLocaleString()} tokens
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{t.tpmLimitLabel}</span>
                        <strong className="text-slate-200 font-mono">
                          {tokenTelemetry.limits.freeTierTpmLimit.toLocaleString()}{" "}
                          {t.perMinuteUnit}
                        </strong>
                      </div>
                    </div>

                    {/* Recent Token Call Logs */}
                    {tokenTelemetry.recentLogs.length > 0 && (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                        <span className="text-xs font-bold text-slate-200 block">
                          {t.recentTokenLogsTitle} (
                          {tokenTelemetry.recentLogs.length} {t.callsUnit})
                        </span>
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                          {tokenTelemetry.recentLogs.map((log) => (
                            <div
                              key={log.id}
                              className="bg-slate-950 border border-slate-800/90 rounded-xl p-2.5 space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-[10px] font-semibold uppercase shrink-0">
                                    {log.actionType === "chat"
                                      ? "Chat RAG"
                                      : log.actionType === "embedding"
                                        ? "Vector"
                                        : "Vision"}
                                  </span>
                                  <span className="text-xs font-mono text-slate-200 truncate">
                                    {log.modelName}
                                  </span>
                                </div>
                                <span className="text-xs font-mono font-bold text-cyan-300 shrink-0">
                                  {log.totalTokens.toLocaleString()} tokens
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                                <div className="flex items-center justify-between bg-slate-900 rounded px-2 py-1">
                                  <span className="text-slate-400">In:</span>
                                  <span className="text-slate-200">
                                    {log.promptTokens}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between bg-slate-900 rounded px-2 py-1">
                                  <span className="text-slate-400">Think:</span>
                                  <span className="text-amber-300">
                                    {log.thoughtsTokens}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between bg-slate-900 rounded px-2 py-1">
                                  <span className="text-slate-400">Out:</span>
                                  <span className="text-emerald-300">
                                    {log.candidatesTokens}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SETTINGS SUB-VIEW 2: MONGODB STORAGE & REMAINING SPACE */}
                {settingsSubTab === "database" && (
                  <div className="space-y-3">
                    {/* Local Disk Space Card */}
                    {dbStorage.fsTotalSize > 0 && (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Database className="w-4 h-4 text-emerald-400" />
                            <span>{t.localDiskTitle}</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {t.freeSpacePrefix}{" "}
                            {formatBytes(dbStorage.fsFreeSize)}
                          </span>
                        </div>

                        <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                (dbStorage.fsUsedSize / dbStorage.fsTotalSize) *
                                100
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="space-y-1.5 pt-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">
                              {t.diskUsedTotalLabel}
                            </span>
                            <strong className="text-slate-200 font-mono">
                              {formatBytes(dbStorage.fsUsedSize)} /{" "}
                              {formatBytes(dbStorage.fsTotalSize)}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">
                              {t.diskFreeLabel}
                            </span>
                            <strong className="text-emerald-400 font-mono">
                              {formatBytes(dbStorage.fsFreeSize)} (
                              {(
                                (dbStorage.fsFreeSize / dbStorage.fsTotalSize) *
                                100
                              ).toFixed(1)}
                              %)
                            </strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cloud 512MB Quota Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">
                          {t.atlasQuotaTitle}
                        </span>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                2,
                                (dbStorage.totalDbSize /
                                  dbStorage.atlasFreeLimitBytes) *
                                100
                              )
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="space-y-1.5 pt-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">
                            {t.atlasRemainingLabel}
                          </span>
                          <strong className="text-cyan-300 font-mono">
                            {formatBytes(dbStorage.atlasFreeRemainingBytes)}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">
                            {t.atlasEstDocsLabel}
                          </span>
                          <strong className="text-white font-mono">
                            ~
                            {Math.floor(
                              dbStorage.atlasFreeRemainingBytes / 28000
                            ).toLocaleString()}{" "}
                            {t.vectorDocsUnit}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* 4 Balanced DB Detail Cards */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                        <span className="text-[11px] text-slate-400 block">
                          {t.dbDataSizeBox}
                        </span>
                        <span className="text-base font-bold font-mono text-white mt-0.5 block">
                          {formatBytes(dbStorage.dataSize)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {dbStorage.objects} {t.dbRecordsUnit} (
                          {dbStorage.collections} {t.dbTablesUnit})
                        </span>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                        <span className="text-[11px] text-slate-400 block">
                          {t.dbStorageSizeBox}
                        </span>
                        <span className="text-base font-bold font-mono text-emerald-300 mt-0.5 block">
                          {formatBytes(dbStorage.storageSize)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {t.dbCompressedNote}
                        </span>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                        <span className="text-[11px] text-slate-400 block">
                          {t.dbIndexSizeBox}
                        </span>
                        <span className="text-base font-bold font-mono text-amber-300 mt-0.5 block">
                          {formatBytes(dbStorage.indexSize)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {t.dbFastQueryNote}
                        </span>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                        <span className="text-[11px] text-slate-400 block">
                          {t.dbTotalOccupiedBox}
                        </span>
                        <span className="text-base font-bold font-mono text-cyan-300 mt-0.5 block">
                          {formatBytes(dbStorage.totalDbSize)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Storage + Index
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SETTINGS SUB-VIEW 3: MODEL SELECTOR & API KEY */}
                {settingsSubTab === "models" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {AVAILABLE_MODELS.map((m) => {
                        const isSelected = selectedModel === m.id;
                        const localizedMeta =
                          t.modelDescriptions[m.id] || {
                            badge: m.badge,
                            desc: m.desc,
                          };
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(m.id);
                              localStorage.setItem(
                                "te_brain_selected_model",
                                m.id
                              );
                              fetchSystemStatus(m.id);
                              showToast(`Model: ${m.name}`);
                            }}
                            className={`w-full text-left rounded-2xl p-3.5 border transition flex items-start justify-between gap-2.5 ${isSelected
                              ? "bg-cyan-950/40 border-cyan-400"
                              : "bg-slate-900 border-slate-800 hover:border-slate-700"
                              }`}
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-xs sm:text-sm text-white">
                                  {m.name}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isSelected
                                    ? "bg-cyan-500 text-slate-950"
                                    : "bg-slate-800 text-slate-300"
                                    }`}
                                >
                                  {localizedMeta.badge}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">
                                {localizedMeta.desc}
                              </p>
                              <div className="space-y-1 pt-1.5 mt-1 border-t border-slate-800/70 text-[11px] font-mono">
                                <div className="flex items-center justify-between text-slate-400">
                                  <span>{t.maxContextShort}</span>
                                  <span className="text-slate-200 font-semibold">
                                    {m.context} tokens
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-400">
                                  <span>{t.maxOutputShort}</span>
                                  <span className="text-slate-200 font-semibold">
                                    {m.output} tokens
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${isSelected
                                ? "border-cyan-400 bg-cyan-500 text-slate-950"
                                : "border-slate-700 bg-slate-950"
                                }`}
                            >
                              {isSelected && (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* API Key Input Box */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                      <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-cyan-400" />
                        <span>
                          {t.changeApiKeyTitle} ({t.currentKeyLabel}{" "}
                          {systemStatus.maskedKey})
                        </span>
                      </h3>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={customApiKey}
                          onChange={(e) => setCustomApiKey(e.target.value)}
                          placeholder={t.apiKeyPlaceholder}
                          className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customApiKey.trim()) {
                              localStorage.setItem(
                                "te_brain_gemini_key",
                                customApiKey.trim()
                              );
                              showToast("✅ Saved API Key!");
                            } else {
                              localStorage.removeItem("te_brain_gemini_key");
                              showToast("ℹ️ Using Default Server Key");
                            }
                            fetchSystemStatus();
                          }}
                          className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition"
                        >
                          {t.saveBtn}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        )}

        {/* 3. Balanced 5-Tab Bottom Navigation Bar */}
        <nav className="shrink-0 bg-[#0b111e] border-t border-slate-800/90 px-1.5 py-1.5 grid grid-cols-5 gap-1">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition ${activeTab === "chat"
              ? "text-cyan-400 bg-cyan-500/10 font-semibold"
              : "text-slate-400 hover:text-slate-200"
              }`}
          >
            <Bot className="w-5 h-5" />
            <span className="text-[10px]">{t.navChat}</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition ${activeTab === "analytics"
              ? "text-cyan-400 bg-cyan-500/10 font-semibold"
              : "text-slate-400 hover:text-slate-200"
              }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px]">{t.navAnalytics}</span>
          </button>

          <button
            onClick={() => setActiveTab("quick-note")}
            className={`flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition ${activeTab === "quick-note"
              ? "text-cyan-400 bg-cyan-500/10 font-semibold"
              : "text-slate-400 hover:text-slate-200"
              }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span className="text-[10px]">{t.navQuickNote}</span>
          </button>

          <button
            onClick={() => setActiveTab("vault")}
            className={`flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition relative ${activeTab === "vault"
              ? "text-cyan-400 bg-cyan-500/10 font-semibold"
              : "text-slate-400 hover:text-slate-200"
              }`}
          >
            <FolderKanban className="w-5 h-5" />
            <span className="text-[10px]">{t.navVault}</span>
            {stats.total > 0 && (
              <span className="absolute top-0.5 right-3 text-[9px] font-bold px-1.5 rounded-full bg-cyan-500 text-slate-950">
                {stats.total}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("settings");
              fetchSystemStatus();
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition ${activeTab === "settings"
              ? "text-cyan-400 bg-cyan-500/10 font-semibold"
              : "text-slate-400 hover:text-slate-200"
              }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px]">{t.navSettings}</span>
          </button>
        </nav>
      </div>

      {/* Modal View Full Knowledge Detail */}
      {selectedItemModal && (
        <div
          onClick={() => setSelectedItemModal(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[85vh] bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 overflow-y-auto space-y-3.5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                    {selectedItemModal.category === "Khác"
                      ? t.otherCategory
                      : selectedItemModal.category}
                  </span>
                  {selectedItemModal.errorCode && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      {selectedItemModal.errorCode}
                    </span>
                  )}
                  {selectedItemModal.station && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      📍 {selectedItemModal.station}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {selectedItemModal.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItemModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
              {selectedItemModal.content}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => {
                  const q =
                    appLang === "zh"
                      ? `请详细说明如何检查与处理此异常：“${selectedItemModal.title}” ${selectedItemModal.errorCode
                        ? `(${selectedItemModal.errorCode})`
                        : ""
                      }`
                      : appLang === "en"
                        ? `Provide detailed SOP troubleshooting steps for: "${selectedItemModal.title}" ${selectedItemModal.errorCode
                          ? `(${selectedItemModal.errorCode})`
                          : ""
                        }`
                        : `Hướng dẫn chi tiết cách kiểm tra và xử lý: "${selectedItemModal.title}" ${selectedItemModal.errorCode
                          ? `(${selectedItemModal.errorCode})`
                          : ""
                        }`;
                  setSelectedItemModal(null);
                  setActiveTab("chat");
                  handleSendMessage(q);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
              >
                <Bot className="w-4 h-4" />
                <span>{t.modalAskAiBtn}</span>
              </button>

              <button
                onClick={() => handleDeleteItem(selectedItemModal._id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-xs transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t.modalDeleteBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
