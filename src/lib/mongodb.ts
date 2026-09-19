import { MongoClient } from "mongodb";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error(
    "Please define MONGODB_URI in .env.local"
  );
}

console.log(
  "MONGODB_URI loaded:",
  Boolean(uri)
);

/*
 * ============================================
 * MONGODB NATIVE CLIENT
 * ============================================
 *
 * Used when we need the MongoDB client directly.
 */

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise:
    | Promise<MongoClient>
    | undefined;

  var _mongoose:
    | {
        conn: typeof mongoose | null;
        promise:
          | Promise<typeof mongoose>
          | null;
      }
    | undefined;
}

/*
 * Prevent creating multiple MongoDB clients
 * during Next.js development hot reloads.
 */

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(
      uri,
      options
    );

    global._mongoClientPromise =
      client.connect();
  }

  clientPromise =
    global._mongoClientPromise;
} else {
  client = new MongoClient(
    uri,
    options
  );

  clientPromise =
    client.connect();
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
  if (mongooseCache.conn) {
    return mongooseCache.conn;
  }

  if (!mongooseCache.promise) {
    mongooseCache.promise =
      mongoose.connect(uri);
  }

  try {
    mongooseCache.conn =
      await mongooseCache.promise;
  } catch (error) {
    mongooseCache.promise = null;
    throw error;
  }

  return mongooseCache.conn;
}

export default clientPromise;