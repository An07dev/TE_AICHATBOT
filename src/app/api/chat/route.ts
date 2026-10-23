import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import {
  KnowledgeItem,
  getCachedKnowledgeWithVectors,
} from "@/models/KnowledgeItem";
import { ChatSession } from "@/models/ChatSession";
import { TokenUsage } from "@/models/TokenUsage";
import {
  cosineSimilarity,
  generateEmbedding,
  generateRAGResponse,
  getEffectiveApiKey,
  getLocalDateKey,
  keywordScoreBoost,
  RetrievedContext,
} from "@/lib/gemini";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const apiKey = getEffectiveApiKey(req.headers.get("x-gemini-key") || undefined);
    const [totalKnowledge, sessions, existingLogsCount] = await Promise.all([
      KnowledgeItem.countDocuments(),
      ChatSession.find({}).sort({ updatedAt: -1 }).limit(25).lean(),
      TokenUsage.countDocuments(),
    ]);

    // 1. Backfill initial TokenUsage records if collection is empty but items/chats exist
    const todayKey = getLocalDateKey();

    if (existingLogsCount === 0 && totalKnowledge > 0) {
      const kItems = await KnowledgeItem.find({}).select("content createdAt").lean();
      for (const k of kItems) {
        const estTokens = Math.max(20, Math.ceil((k.content || "").length / 3.8));
        await TokenUsage.create({
          dateKey: todayKey,
          actionType: "embedding",
          modelName: "gemini-embedding-001",
          promptTokens: estTokens,
          candidatesTokens: 0,
          thoughtsTokens: 0,
          totalTokens: estTokens,
        });
      }
      for (const s of sessions) {
        for (const m of s.messages || []) {
          if (m.role === "assistant") {
            const outTokens = Math.max(30, Math.ceil((m.content || "").length / 3.5));
            const promptT = 480;
            const thoughtT = 210;
            await TokenUsage.create({
              dateKey: todayKey,
              actionType: "chat",
              modelName: m.modelUsed || "gemini-3.6-flash",
              promptTokens: promptT,
              candidatesTokens: outTokens,
              thoughtsTokens: thoughtT,
              totalTokens: promptT + outTokens + thoughtT,
            });
          }
        }
      }
    }

    // 2. Aggregate Today & All-time Token Usage from MongoDB
    const allLogs = await TokenUsage.find({}).sort({ createdAt: -1 }).lean();
    const todayLogs = allLogs.filter((l) => l.dateKey === todayKey);

    const sumLogs = (logs: typeof allLogs) =>
      logs.reduce(
        (acc, cur) => {
          acc.requests += 1;
          acc.promptTokens += cur.promptTokens || 0;
          acc.candidatesTokens += cur.candidatesTokens || 0;
          acc.thoughtsTokens += cur.thoughtsTokens || 0;
          acc.totalTokens += cur.totalTokens || 0;
          return acc;
        },
        {
          requests: 0,
          promptTokens: 0,
          candidatesTokens: 0,
          thoughtsTokens: 0,
          totalTokens: 0,
        }
      );

    const todayUsage = sumLogs(todayLogs);
    const allTimeUsage = sumLogs(allLogs);

    // 3. Query real Model Token Limits from Google Gemini API
    let inputTokenLimit = 1048576;
    let outputTokenLimit = 65536;
    const requestedModel = req.headers.get("x-gemini-model") || undefined;
    const activeModel =
      requestedModel || process.env.GEMINI_CHAT_MODEL || "gemini-3.6-flash";

    if (apiKey) {
      try {
        const modelRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}?key=${apiKey}`
        );
        if (modelRes.ok) {
          const modelInfo = await modelRes.json();
          if (modelInfo.inputTokenLimit) inputTokenLimit = modelInfo.inputTokenLimit;
          if (modelInfo.outputTokenLimit) outputTokenLimit = modelInfo.outputTokenLimit;
        }
      } catch {
        // use standard spec defaults
      }
    }

    // 4. Query real MongoDB Storage & Disk Stats via db.stats()
    let dbStorage = {
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
      atlasFreeLimitBytes: 512 * 1024 * 1024, // 512 MB
      atlasFreeRemainingBytes: 512 * 1024 * 1024,
    };

    if (mongoose.connection.db) {
      const rawStats = await mongoose.connection.db.stats();
      const totalDbSize =
        (rawStats.totalSize as number) ||
        ((rawStats.storageSize as number) || 0) + ((rawStats.indexSize as number) || 0);
      const fsTotal = (rawStats.fsTotalSize as number) || 0;
      const fsUsed = (rawStats.fsUsedSize as number) || 0;
      const atlasLimit = 512 * 1024 * 1024;

      dbStorage = {
        dbName: (rawStats.db as string) || "te_brain_db",
        collections: (rawStats.collections as number) || 0,
        objects: (rawStats.objects as number) || 0,
        dataSize: (rawStats.dataSize as number) || 0,
        storageSize: (rawStats.storageSize as number) || 0,
        indexSize: (rawStats.indexSize as number) || 0,
        totalDbSize,
        fsUsedSize: fsUsed,
        fsTotalSize: fsTotal,
        fsFreeSize: Math.max(0, fsTotal - fsUsed),
        atlasFreeLimitBytes: atlasLimit,
        atlasFreeRemainingBytes: Math.max(0, atlasLimit - totalDbSize),
      };
    }

    return NextResponse.json({
      success: true,
      status: {
        mongodbConnected: true,
        geminiConfigured: Boolean(apiKey),
        maskedKey: apiKey
          ? `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`
          : "Chưa cấu hình",
        totalKnowledge,
      },
      tokenTelemetry: {
        activeModel,
        limits: {
          inputTokenLimit, // 1,048,576 tokens per request
          outputTokenLimit, // 65,536 tokens per response
          freeTierRpdLimit: 1500, // 1,500 requests / day
          freeTierTpmLimit: 1000000, // 1,000,000 tokens / minute
          dailyTokenQuota: 1500000, // 1.5M tokens / day reference quota
        },
        today: todayUsage,
        allTime: allTimeUsage,
        recentLogs: allLogs.slice(0, 8).map((l) => ({
          id: String(l._id),
          actionType: l.actionType,
          modelName: l.modelName,
          promptTokens: l.promptTokens,
          candidatesTokens: l.candidatesTokens,
          thoughtsTokens: l.thoughtsTokens,
          totalTokens: l.totalTokens,
          createdAt: l.createdAt,
        })),
      },
      dbStorage,
      sessions: sessions.map((s) => ({
        _id: String(s._id),
        title: s.title,
        messageCount: s.messages?.length || 0,
        updatedAt: s.updatedAt,
        messages: s.messages || [],
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi kiểm tra hệ thống";
    return NextResponse.json(
      {
        success: false,
        status: {
          mongodbConnected: false,
          geminiConfigured: false,
          totalKnowledge: 0,
        },
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const apiKey =
      req.headers.get("x-gemini-key") || body.customApiKey || undefined;
    const preferredModel =
      req.headers.get("x-gemini-model") || body.selectedModel || undefined;

    const { question, history = [], imageInline, sessionId, lang } = body;

    if (!question || !question.trim()) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập câu hỏi hoặc mã lỗi." },
        { status: 400 }
      );
    }

    // 1 & 2. Run Query Embedding + In-Memory Vector Cache retrieval IN PARALLEL for maximum speed
    const [queryEmbedding, allItems] = await Promise.all([
      generateEmbedding(question, apiKey).catch(() => [] as number[]),
      getCachedKnowledgeWithVectors(),
    ]);

    const scored: RetrievedContext[] = allItems.map((item) => {
      const vecScore =
        queryEmbedding.length > 0 &&
        Array.isArray(item.embedding) &&
        item.embedding.length === queryEmbedding.length
          ? cosineSimilarity(queryEmbedding, item.embedding)
          : 0;

      const kwBoost = keywordScoreBoost(question, {
        title: item.title,
        errorCode: item.errorCode,
        station: item.station,
        tags: item.tags,
        content: item.content,
      });

      return {
        id: String(item._id),
        title: item.title,
        type: item.type,
        category: item.category,
        errorCode: item.errorCode,
        station: item.station,
        content: item.content,
        score: Number((vecScore + kwBoost).toFixed(4)),
      };
    });

    // Sort descending by score and take top relevant items (threshold >= 0.62 so greetings like "xin chào" don't show unrelated citations)
    scored.sort((a, b) => b.score - a.score);
    const relevantSources = scored.filter((c) => c.score >= 0.62).slice(0, 4);
    const contextsToUse = scored.slice(0, 3);

    // 3. Call Gemini RAG generator
    const { answer, modelUsed, usage } = await generateRAGResponse({
      question: question.trim(),
      contexts: contextsToUse,
      history,
      imageInline,
      customKey: apiKey,
      preferredModel,
      lang: lang === "en" || lang === "zh" ? lang : "vi",
    });

    const sources = relevantSources.map((c) => ({
      id: c.id,
      title: c.title,
      type: c.type,
      errorCode: c.errorCode,
      station: c.station,
      score: c.score,
    }));

    // 4. Save or update ChatSession in MongoDB
    let sessionDoc = sessionId ? await ChatSession.findById(sessionId) : null;
    if (!sessionDoc) {
      sessionDoc = await ChatSession.create({
        title: question.trim().slice(0, 60),
        messages: [
          { role: "user", content: question.trim(), createdAt: new Date() },
          {
            role: "assistant",
            content: answer,
            sources,
            modelUsed,
            createdAt: new Date(),
          },
        ],
      });
    } else {
      sessionDoc.messages.push(
        { role: "user", content: question.trim(), createdAt: new Date() },
        {
          role: "assistant",
          content: answer,
          sources,
          modelUsed,
          createdAt: new Date(),
        }
      );
      await sessionDoc.save();
    }

    return NextResponse.json({
      success: true,
      answer,
      modelUsed,
      usage,
      sources,
      sessionId: String(sessionDoc._id),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Lỗi khi xử lý câu trả lời AI";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const clearAll = searchParams.get("all");

    if (clearAll === "true") {
      await ChatSession.deleteMany({});
      return NextResponse.json({
        success: true,
        message: "Đã xóa toàn bộ lịch sử phiên trò chuyện.",
      });
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Thiếu ID phiên trò chuyện cần xóa." },
        { status: 400 }
      );
    }

    await ChatSession.findByIdAndDelete(id);
    return NextResponse.json({
      success: true,
      message: "Đã xóa phiên trò chuyện.",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Lỗi khi xóa phiên trò chuyện";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
