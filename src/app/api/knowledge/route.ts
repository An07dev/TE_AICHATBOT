import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { KnowledgeItem } from "@/models/KnowledgeItem";
import { generateEmbedding } from "@/lib/gemini";

const INITIAL_TE_SAMPLES = [
  {
    title: "Lỗi FAIL_VDD_3V3_SHORT trên trạm FCT-02",
    type: "note" as const,
    category: "ICT / FCT",
    errorCode: "ERR-FCT-104",
    station: "FCT-02 (Line B1)",
    symptom:
      "Khi đóng nắp Jig FCT, phần mềm báo lỗi FAIL_VDD_3V3_SHORT, dòng điện vượt ngưỡng > 1.2A và tự ngắt nguồn bảo vệ.",
    rootCause:
      "1. Kim test (Pogo Pin) tại điểm TP14 và TP15 (GND) bị nghiêng do bụi thiếc bám lâu ngày làm chạm chập.\n2. Tụ lọc C402 trên mạch PCBA bị hàn bắc cầu (Solder Bridge) từ lò Reflow.",
    solution:
      "Bước 1: Dùng đồng hồ VOM đo thông mạch giữa TP14 (3V3) và GND trực tiếp trên bản mạch.\nBước 2: Nếu bản mạch không chập -> Kiểm tra đế Jig FCT-02, dùng cồn IPA và bàn chải chống tĩnh điện vệ sinh kim Pogo Pin TP14/TP15, thay kim nếu lò xo yếu.\nBước 3: Nếu bản mạch chập -> Soi kính hiển vi tại cụm nguồn U2 và tụ C402, báo bộ phận PE/SMT điều chỉnh profile nhiệt nếu lặp lại > 3 pcs.",
    tags: ["FCT", "PogoPin", "ShortCircuit", "3V3", "PCBA"],
    pinned: true,
  },
  {
    title: "Lỗi không đẩy được Log lên hệ thống SFC / MES (Error 504 Timeout)",
    type: "note" as const,
    category: "SFC / MES",
    errorCode: "SFC-ERR-504",
    station: "All Stations (ICT/FCT/Packing)",
    symptom:
      "Trạm test hoàn thành bài đo PASS nhưng đứng ở bước 'Uploading to SFC...', sau 15 giây báo lỗi SFC-ERR-504 Gateway Timeout, không in được tem nhãn.",
    rootCause:
      "1. Dịch vụ Local SFC Agent trên máy tính trạm test bị treo cache khi mạng nội bộ VLAN chập chờn.\n2. Sai đồng bộ thời gian (NTP Time Drift > 5 phút) giữa PC trạm test và Server MES.",
    solution:
      "Bước 1: Mở CMD trên máy trạm, gõ `ping 10.12.0.10` (IP MES Server) để kiểm tra kết nối mạng LAN.\nBước 2: Kiểm tra giờ hệ thống Windows, chạy lệnh `w32tm /resync` để đồng bộ lại thời gian chuẩn.\nBước 3: Mở Services (`services.msc`), khởi động lại dịch vụ `SFC_Log_Agent` và kiểm tra thư mục `C:\\SFC_BackupLogs` xem các file `.txt` tồn đọng đã được đẩy hết lên server chưa.",
    tags: ["SFC", "MES", "Network", "Timeout", "LogUpload"],
    pinned: true,
  },
  {
    title: "SOP Hiệu chuẩn (Calibration) & Kiểm tra GR&R Trạm Đo RF Shield Box",
    type: "document" as const,
    category: "RF / Wireless",
    errorCode: "SOP-RF-CAL-01",
    station: "RF-WIFI-BT-01",
    symptom:
      "Tỷ lệ Fail ảo (False Call / Retest OK) tại bài đo TX Power WiFi 5GHz tăng cao (> 4%), giá trị suy hao (Path Loss) lệch 2.5dB.",
    rootCause:
      "Đầu nối cáp SMA bên trong hộp Shield Box bị lỏng sau 5000 chu kỳ đóng mở hoặc chưa cập nhật bảng Golden Sample Offset đầu ca.",
    solution:
      "Quy trình SOP Chuẩn hóa đầu ca:\n1. Sử dụng cờ lê lực chuyên dụng (Torque Wrench 8 in-lbs) siết chặt lại đầu nối SMA từ máy đo LitePoint/CMW500 vào Anten trong Shield Box.\n2. Chạy 3 mẫu Golden Sample (1 PASS chuẩn, 1 FAIL ngưỡng trên, 1 FAIL ngưỡng dưới) để tự động tính lại Path Loss Offset.\n3. Lưu bảng Offset mới vào file cấu hình `RF_Station_Config.ini` và khóa quyền chỉnh sửa bằng mật khẩu TE.",
    tags: ["RF", "Calibration", "ShieldBox", "PathLoss", "GoldenSample"],
    pinned: false,
  },
];

function buildSearchableContent(data: {
  title: string;
  category?: string;
  errorCode?: string;
  station?: string;
  symptom?: string;
  rootCause?: string;
  solution?: string;
  content?: string;
  tags?: string[];
}) {
  if (data.content && data.content.trim().length > 0 && !data.symptom && !data.solution) {
    return data.content.trim();
  }
  const parts: string[] = [];
  parts.push(`Tiêu đề: ${data.title}`);
  if (data.errorCode) parts.push(`Mã lỗi (Error Code): ${data.errorCode}`);
  if (data.station) parts.push(`Trạm Test / Thiết bị (Station): ${data.station}`);
  if (data.category) parts.push(`Danh mục: ${data.category}`);
  if (data.symptom) parts.push(`Triệu chứng / Hiện tượng (Symptom):\n${data.symptom}`);
  if (data.rootCause) parts.push(`Nguyên nhân gốc (Root Cause):\n${data.rootCause}`);
  if (data.solution) parts.push(`Cách xử lý / SOP khắc phục (Solution):\n${data.solution}`);
  if (data.content) parts.push(`Ghi chú bổ sung:\n${data.content}`);
  if (data.tags && data.tags.length > 0) parts.push(`Từ khóa: ${data.tags.join(", ")}`);
  return parts.join("\n\n");
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const seed = searchParams.get("seed") === "true";
    const apiKey = req.headers.get("x-gemini-key") || undefined;

    let count = await KnowledgeItem.countDocuments();

    if (count === 0 || seed) {
      if (count === 0) {
        for (const sample of INITIAL_TE_SAMPLES) {
          const fullContent = buildSearchableContent(sample);
          let embedding: number[] = [];
          try {
            embedding = await generateEmbedding(fullContent, apiKey);
          } catch {
            embedding = [];
          }
          await KnowledgeItem.create({
            ...sample,
            content: fullContent,
            embedding,
          });
        }
        count = await KnowledgeItem.countDocuments();
      }
    }

    const items = await KnowledgeItem.find({})
      .sort({ pinned: -1, createdAt: -1 })
      .lean();

    const formatted = items.map((item) => ({
      _id: String(item._id),
      title: item.title,
      type: item.type,
      category: item.category,
      errorCode: item.errorCode || "",
      station: item.station || "",
      symptom: item.symptom || "",
      rootCause: item.rootCause || "",
      solution: item.solution || "",
      content: item.content,
      fileName: item.fileName || "",
      fileType: item.fileType || "",
      tags: item.tags || [],
      pinned: Boolean(item.pinned),
      hasEmbedding: Array.isArray(item.embedding) && item.embedding.length > 0,
      createdAt: item.createdAt,
    }));

    return NextResponse.json({
      success: true,
      items: formatted,
      stats: {
        total: formatted.length,
        notes: formatted.filter((i) => i.type === "note").length,
        documents: formatted.filter((i) => i.type === "document").length,
        vectorized: formatted.filter((i) => i.hasEmbedding).length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi kết nối MongoDB";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const apiKey = req.headers.get("x-gemini-key") || body.customApiKey || undefined;

    const {
      title,
      type = "note",
      category = "ICT / FCT",
      errorCode = "",
      station = "",
      symptom = "",
      rootCause = "",
      solution = "",
      content = "",
      tags = [],
      pinned = false,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập tiêu đề hoặc tên lỗi." },
        { status: 400 }
      );
    }

    const parsedTags: string[] = Array.isArray(tags)
      ? tags
      : String(tags)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

    const fullContent = buildSearchableContent({
      title: title.trim(),
      category,
      errorCode: errorCode.trim(),
      station: station.trim(),
      symptom: symptom.trim(),
      rootCause: rootCause.trim(),
      solution: solution.trim(),
      content: content.trim(),
      tags: parsedTags,
    });

    const embedding = await generateEmbedding(fullContent, apiKey);

    const created = await KnowledgeItem.create({
      title: title.trim(),
      type,
      category,
      errorCode: errorCode.trim(),
      station: station.trim(),
      symptom: symptom.trim(),
      rootCause: rootCause.trim(),
      solution: solution.trim(),
      content: fullContent,
      tags: parsedTags,
      pinned: Boolean(pinned),
      embedding,
    });

    return NextResponse.json({
      success: true,
      item: {
        _id: String(created._id),
        title: created.title,
        type: created.type,
        category: created.category,
        errorCode: created.errorCode,
        station: created.station,
        symptom: created.symptom,
        rootCause: created.rootCause,
        solution: created.solution,
        content: created.content,
        tags: created.tags,
        pinned: created.pinned,
        hasEmbedding: created.embedding.length > 0,
        createdAt: created.createdAt,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Không thể lưu dữ liệu";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID cần xóa" }, { status: 400 });
    }
    await KnowledgeItem.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi khi xóa";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
