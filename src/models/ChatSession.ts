import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISourceRef {
  id: string;
  title: string;
  type: string;
  errorCode?: string;
  station?: string;
  score: number;
}

export interface IChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ISourceRef[];
  modelUsed?: string;
  createdAt: Date;
}

export interface IChatSession extends Document {
  title: string;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const SourceRefSchema = new Schema<ISourceRef>(
  {
    id: { type: String, default: "" },
    title: { type: String, default: "" },
    type: { type: String, default: "note" },
    errorCode: { type: String, default: "" },
    station: { type: String, default: "" },
    score: { type: Number, default: 0 },
  },
  { _id: false }
);

const ChatMessageSchema = new Schema<IChatMessage>({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  sources: { type: [SourceRefSchema], default: [] },
  modelUsed: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const ChatSessionSchema = new Schema<IChatSession>(
  {
    title: { type: String, default: "Phiên hỗ trợ kỹ thuật mới" },
    messages: { type: [ChatMessageSchema], default: [] },
  },
  { timestamps: true }
);

if (mongoose.models.ChatSession) {
  delete mongoose.models.ChatSession;
}

export const ChatSession: Model<IChatSession> = mongoose.model<IChatSession>(
  "ChatSession",
  ChatSessionSchema
);
