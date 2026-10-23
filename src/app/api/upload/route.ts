import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  KnowledgeItem,
  invalidateKnowledgeCache,
} from "@/models/KnowledgeItem";
import { extractFileContentWithGemini, generateEmbedding } from "@/lib/gemini";
import mammoth from "mammoth";

function splitIntoChunks(text: string, maxChunkSize = 3200): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length <= maxChunkSize) return [clean];

  const paragraphs = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }
  return chunks.slice(0, 12); // Cap at 12 chunks per file to stay fast
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "SOP / Manual";
    const station = (formData.get("station") as string) || "";
    const tagsRaw = (formData.get("tags") as string) || "";
    const apiKey = req.headers.get("x-gemini-key") || undefined;
    const preferredModel = req.headers.get("x-gemini-model") || undefined;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Vui lòng chọn một file để tải lên." },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";

    if (["txt", "md", "csv", "log", "json", "ini", "xml"].includes(ext)) {
      extractedText = buffer.toString("utf-8");
    } else if (ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (
      ext === "pdf" ||
      ["png", "jpg", "jpeg", "webp"].includes(ext)
    ) {
      const mimeMap: Record<string, string> = {
        pdf: "application/pdf",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
      };
      const mimeType = file.type || mimeMap[ext] || "application/pdf";
      extractedText = await extractFileContentWithGemini({
        base64Data: buffer.toString("base64"),
        mimeType,
        fileName,
        customKey: apiKey,
        preferredModel,
      });
    } else {
      // Fallback: try reading as UTF-8 text
      extractedText = buffer.toString("utf-8");
    }

    if (!extractedText || !extractedText.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Không tìm thấy nội dung văn bản trong file này.",
        },
        { status: 400 }
      );
    }

    const chunks = splitIntoChunks(extractedText, 3200);
    const parsedTags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    // Process and vectorize document chunks in parallel for 4x faster upload
    const createdItems = await Promise.all(
      chunks.map(async (chunkText, i) => {
        const chunkTitle =
          chunks.length === 1
            ? fileName
            : `${fileName} (Phần ${i + 1}/${chunks.length})`;

        const fullContent = `Tài liệu: ${chunkTitle}\nDanh mục: ${category}\n${station ? `Trạm/Thiết bị: ${station}\n` : ""}Nội dung:\n${chunkText}`;
        const embedding = await generateEmbedding(fullContent, apiKey);

        const doc = await KnowledgeItem.create({
          title: chunkTitle,
          type: "document",
          category,
          station,
          content: fullContent,
          fileName,
          fileType: ext.toUpperCase(),
          tags: [...parsedTags, ext.toUpperCase()],
          embedding,
        });

        return {
          _id: String(doc._id),
          title: doc.title,
          type: doc.type,
          category: doc.category,
          fileName: doc.fileName,
          hasEmbedding: doc.embedding.length > 0,
        };
      })
    );

    invalidateKnowledgeCache();

    return NextResponse.json({
      success: true,
      chunksCreated: createdItems.length,
      items: createdItems,
      preview: extractedText.slice(0, 350),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Lỗi khi xử lý và nạp tài liệu";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
