import { MongoClient } from "mongodb";
import mongoose from "mongoose";

export function normalizeMongoUri(
  rawUri: string | undefined | null,
): string {
  const value = rawUri?.trim();

  if (!value) {
    throw new Error(
      "Please define MONGODB_URI in the environment."
    );
  }

  return value;
}

export function getMongoUri(): string {
  const rawUri =
    process.env.MONGODB_URI ||
    process.env.MONGODB_URI_DIRECT;

  if (!rawUri?.trim()) {
    return "";
  }

  return rawUri.trim();
}

const MONGODB_URI = getMongoUri();

function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

console.log(
  "MONGODB_URI loaded:",
  Boolean(MONGODB_URI)
);

/*
 * ============================================
 * MONGODB NATIVE CLIENT
 * ============================================
 *
 * Used when we need the MongoDB client directly.
 */

const options = {};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  var _mongoClientPromise:
    | Promise<MongoClient>
    | undefined;

  var _mongoose:
    | {
        conn: typeof mongoose | null;
        promise:
          | Promise<typeof mongoose | null>
          | null;
      }
    | undefined;
}

if (MONGODB_URI && !isBuildPhase()) {
  /*
   * Prevent creating multiple MongoDB clients
   * during Next.js development hot reloads.
   */

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = new MongoClient(
        MONGODB_URI,
        options
      );

      global._mongoClientPromise =
        client.connect();
    }

    clientPromise =
      global._mongoClientPromise;
  } else {
    client = new MongoClient(
      MONGODB_URI,
      options
    );

    clientPromise =
      client.connect();
  }
}

/*
 * ============================================
 * MONGOOSE CONNECTION
 * ============================================
 *
 * Our Mongoose models use this connection.
 *
 * The database selected by MONGODB_URI
 * is the authoritative database for:
 *
 * Booking
 * Payment
 * User
 * Consultant
 * CustomerSession
 * PasswordResetToken
 * RateLimit
 * SlotHold
 * RazorpayWebhookEvent
 */

const mongooseCache =
  global._mongoose || {
    conn: null,
    promise: null,
  };

if (process.env.NODE_ENV === "development") {
  global._mongoose =
    mongooseCache;
}

export async function connectMongoose() {
  if (isBuildPhase()) {
    console.warn(
      "MongoDB connection skipped during Next.js build/static generation.",
    );
    return null;
  }

  if (!MONGODB_URI) {
    console.warn(
      "MongoDB is not configured; skipping Mongoose connection."
    );
    return null;
  }

  if (mongooseCache.conn) {
    return mongooseCache.conn;
  }

  if (!mongooseCache.promise) {
    mongooseCache.promise =
      mongoose.connect(MONGODB_URI).catch((error) => {
        console.error(
          "MongoDB connection failed; database features will remain unavailable.",
          error
        );
        mongooseCache.promise = null;
        return null;
      });
  }

  const connection =
    await mongooseCache.promise;

  mongooseCache.conn =
    connection ?? null;

  return mongooseCache.conn;
}

export function getClientPromise(): Promise<MongoClient> {
  if (!MONGODB_URI) {
    return Promise.reject(
      new Error(
        "MongoDB is not configured. Please define MONGODB_URI in the environment.",
      ),
    );
  }

  if (isBuildPhase()) {
    return Promise.reject(
      new Error(
        "MongoDB client creation is skipped during Next.js build/static generation.",
      ),
    );
  }

  if (!clientPromise) {
    client = new MongoClient(MONGODB_URI, options);
    clientPromise = client.connect();
  }

  return clientPromise;
}

export default getClientPromise;
