import { NextRequest, NextResponse } from "next/server";

function splitTextIntoChunks(text: string, maxLen = 170): string[] {
  const sentences = text
    .replace(/\r\n/g, " ")
    .replace(/\n+/g, ". ")
    .split(/(?<=[.!?।,;:。！？；，])\s*/);

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
      // If Chinese text without spaces, slice by character count
      if (/[\u4e00-\u9fff]/.test(trimmed) && !trimmed.includes(" ")) {
        for (let i = 0; i < trimmed.length; i += maxLen) {
          chunks.push(trimmed.slice(i, i + maxLen));
        }
        continue;
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

  return chunks.slice(0, 16); // Up to ~2700 chars of speech
}

export async function POST(req: NextRequest) {
  try {
    const { text, lang } = await req.json();
    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: "Không có nội dung cần đọc" },
        { status: 400 }
      );
    }

    const chunks = splitTextIntoChunks(text.trim(), 170);
    const defaultTl =
      lang === "zh" ? "zh-CN" : lang === "en" ? "en" : "vi";

    // Fetch all TTS chunks in parallel so response returns in ~200ms (critical for iOS Safari)
    const chunkBuffers = await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const hasChinese = /[\u4e00-\u9fff]/.test(chunk);
          const tl = hasChinese ? "zh-CN" : defaultTl;
          const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=${tl}&client=gtx&q=${encodeURIComponent(
            chunk
          )}`;
          const res = await fetch(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            },
          });
          if (res.ok) {
            const arr = await res.arrayBuffer();
            return Buffer.from(arr);
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    const validBuffers = chunkBuffers.filter((b): b is Buffer => b !== null && b.length > 0);

    if (validBuffers.length === 0) {
      return NextResponse.json(
        { success: false, error: "Không thể tạo âm thanh đọc hướng dẫn" },
        { status: 500 }
      );
    }

    const combinedMp3 = Buffer.concat(validBuffers);
    const audioChunks = validBuffers.map((b) => b.toString("base64"));

    return NextResponse.json({
      success: true,
      audioBase64: combinedMp3.toString("base64"),
      audioChunks,
      mimeType: "audio/mpeg",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi đọc giọng nói";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
