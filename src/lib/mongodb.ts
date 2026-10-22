import mongoose from "mongoose";

const DEFAULT_MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/te_brain_db";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  uri: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
  uri: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB(customUri?: string) {
  const targetUri = customUri || process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

  if (
    cached.conn &&
    cached.uri === targetUri &&
    mongoose.connection.readyState === 1
  ) {
    return cached.conn;
  }

  if (mongoose.connection.readyState !== 0 && cached.uri !== targetUri) {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect error
    }
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise || cached.uri !== targetUri) {
    cached.uri = targetUri;
    cached.promise = mongoose
      .connect(targetUri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
