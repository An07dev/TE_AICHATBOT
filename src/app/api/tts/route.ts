import { NextRequest, NextResponse } from "next/server";

function splitTextIntoChunks(text: string, maxLen = 175): string[] {
  const sentences = text
    .replace(/\r\n/g, " ")
    .replace(/\n+/g, ". ")
    .split(/(?<=[.!?।,;:])\s+/);

  const chunks: string[] = [];
  let current = "";

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;

    if (trimmed.length > maxLen) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      const words = trimmed.split(/\s+/);
      let temp = "";
      for (const w of words) {
        if ((temp + " " + w).length > maxLen) {
          if (temp) chunks.push(temp.trim());
          temp = w;
        } else {
          temp = temp ? `${temp} ${w}` : w;
        }
      }
      if (temp) current = temp;
    } else if ((current + " " + trimmed).length > maxLen) {
      if (current) chunks.push(current.trim());
      current = trimmed;
    } else {
      current = current ? `${current} ${trimmed}` : trimmed;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.slice(0, 18); // Up to ~3000 chars of speech
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: "Không có nội dung cần đọc" },
        { status: 400 }
      );
    }

    const chunks = splitTextIntoChunks(text.trim(), 175);
    const buffers: Buffer[] = [];

    for (const chunk of chunks) {
      const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=vi&client=gtx&q=${encodeURIComponent(
        chunk
      )}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      if (res.ok) {
        const arr = await res.arrayBuffer();
        buffers.push(Buffer.from(arr));
      }
    }

    if (buffers.length === 0) {
      return NextResponse.json(
        { success: false, error: "Không thể tạo âm thanh tiếng Việt" },
        { status: 500 }
      );
    }

    const combinedMp3 = Buffer.concat(buffers);
    return NextResponse.json({
      success: true,
      audioBase64: combinedMp3.toString("base64"),
      mimeType: "audio/mpeg",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi đọc giọng nói";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
