import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITokenUsage extends Document {
  dateKey: string; // YYYY-MM-DD
  actionType: "chat" | "embedding" | "extract";
  modelName: string;
  promptTokens: number;
  candidatesTokens: number;
  thoughtsTokens: number;
  totalTokens: number;
  createdAt: Date;
}

const TokenUsageSchema = new Schema<ITokenUsage>(
  {
    dateKey: { type: String, required: true, index: true },
    actionType: {
      type: String,
      enum: ["chat", "embedding", "extract"],
      default: "chat",
    },
    modelName: { type: String, required: true },
    promptTokens: { type: Number, default: 0 },
    candidatesTokens: { type: Number, default: 0 },
    thoughtsTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TokenUsageSchema.index({ createdAt: -1 });
TokenUsageSchema.index({ dateKey: 1, createdAt: -1 });

export const TokenUsage: Model<ITokenUsage> =
  mongoose.models.TokenUsage ||
  mongoose.model<ITokenUsage>("TokenUsage", TokenUsageSchema);
