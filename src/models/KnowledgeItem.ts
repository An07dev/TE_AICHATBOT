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
    category: { type: String, default: "ICT / FCT" },
    errorCode: { type: String, default: "", trim: true },
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

export const KnowledgeItem: Model<IKnowledgeItem> =
  mongoose.models.KnowledgeItem ||
  mongoose.model<IKnowledgeItem>("KnowledgeItem", KnowledgeItemSchema);
