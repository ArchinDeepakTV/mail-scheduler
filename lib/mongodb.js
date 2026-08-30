const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "mail_scheduler";

if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable");
}

// Vercel functions can be reused between invocations (warm starts).
// Caching the client on the global object avoids opening a new
// connection to Atlas on every single request, which is the #1
// cause of "too many connections" errors on serverless.
let cached = global._mongoCached;
if (!cached) {
  cached = global._mongoCached = { client: null, promise: null };
}

async function getDb() {
  if (cached.client) {
    return cached.client.db(dbName);
  }
  if (!cached.promise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
    });
    cached.promise = client.connect().then((c) => {
      cached.client = c;
      return c;
    });
  }
  const client = await cached.promise;
  return client.db(dbName);
}

async function getJobsCollection() {
  const db = await getDb();
  const col = db.collection("jobs");
  // Index used by the worker to find due jobs quickly, and to
  // enforce that we only ever pick up jobs that are still pending.
  await col.createIndex({ status: 1, sendAt: 1 });
  return col;
}

module.exports = { getDb, getJobsCollection };
