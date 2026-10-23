import mongoose, { Schema, Document, Model } from "mongoose";

export interface IKnowledgeItem extends Document {
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
  embedding: number[];
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeItemSchema = new Schema<IKnowledgeItem>(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["note", "document"], default: "note" },
    category: { type: String, default: "ICT / FCT", index: true },
    errorCode: { type: String, default: "", trim: true, index: true },
    station: { type: String, default: "", trim: true },
    symptom: { type: String, default: "" },
    rootCause: { type: String, default: "" },
    solution: { type: String, default: "" },
    content: { type: String, required: true },
    fileName: { type: String, default: "" },
    fileType: { type: String, default: "" },
    tags: { type: [String], default: [] },
    embedding: { type: [Number], default: [] },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for fast sorting in Vault list
KnowledgeItemSchema.index({ pinned: -1, createdAt: -1 });

export const KnowledgeItem: Model<IKnowledgeItem> =
  mongoose.models.KnowledgeItem ||
  mongoose.model<IKnowledgeItem>("KnowledgeItem", KnowledgeItemSchema);

// ================= IN-MEMORY VECTOR RAG CACHE (< 5ms Lookup) =================
export interface CachedKnowledgeVectorItem {
  _id: string;
  title: string;
  type: "note" | "document";
  category: string;
  errorCode?: string;
  station?: string;
  tags: string[];
  content: string;
  embedding: number[];
}

interface VectorCacheGlobal {
  items: CachedKnowledgeVectorItem[] | null;
  expiresAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __teBrainVectorCache: VectorCacheGlobal | undefined;
}

const VECTOR_CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export function invalidateKnowledgeCache() {
  if (global.__teBrainVectorCache) {
    global.__teBrainVectorCache.items = null;
    global.__teBrainVectorCache.expiresAt = 0;
  }
}

export async function getCachedKnowledgeWithVectors(): Promise<
  CachedKnowledgeVectorItem[]
> {
  const now = Date.now();
  if (
    global.__teBrainVectorCache &&
    global.__teBrainVectorCache.items &&
    global.__teBrainVectorCache.expiresAt > now
  ) {
    return global.__teBrainVectorCache.items;
  }

  const rawItems = await KnowledgeItem.find({})
    .select("title type category errorCode station tags content embedding")
    .lean();

  const mapped: CachedKnowledgeVectorItem[] = rawItems.map((item) => ({
    _id: String(item._id),
    title: item.title,
    type: item.type,
    category: item.category,
    errorCode: item.errorCode || "",
    station: item.station || "",
    tags: item.tags || [],
    content: item.content,
    embedding: Array.isArray(item.embedding) ? item.embedding : [],
  }));

  global.__teBrainVectorCache = {
    items: mapped,
    expiresAt: now + VECTOR_CACHE_TTL_MS,
  };

  return mapped;
}
