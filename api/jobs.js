const { getJobsCollection } = require("../lib/mongodb");

const VALID_STATUSES = ["pending", "processing", "sent", "failed"];

module.exports = async function handler(req, res) {
  if (req.method === "HEAD") {
    // UptimeRobot's free-plan HTTP monitor sends HEAD by default.
    // Run the same auth/logic path but return no body, per HTTP spec.
  } else if (req.method !== "GET") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // This lists recipient addresses/subjects across every job, so it's
  // gated behind the same key as scheduling (if you've set one).
  // Accepts either an x-api-key header or an ?apiKey= query param, since
  // some free-tier monitoring services (e.g. UptimeRobot) can't send
  // custom headers.
  if (process.env.SCHEDULE_API_KEY) {
    const key = req.headers["x-api-key"] || req.query.apiKey;
    if (key !== process.env.SCHEDULE_API_KEY) {
      return res.status(401).json({ error: "Invalid or missing API key" });
    }
  }

  const { status, limit, before } = req.query;

  const filter = {};
  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `'status' must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }
    filter.status = status;
  }

  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

  // Cursor-style pagination on _id: pass the last id from the previous
  // page as `before` to get the next page, oldest-inserted-first.
  const { ObjectId } = require("mongodb");
  if (before) {
    if (!ObjectId.isValid(before)) {
      return res.status(400).json({ error: "'before' must be a valid id" });
    }
    filter._id = { $lt: new ObjectId(before) };
  }

  const jobs = await getJobsCollection();
  const results = await jobs
    .find(filter, { projection: { body: 0 } }) // never bulk-return email bodies
    .sort({ _id: -1 }) // newest first
    .limit(pageSize)
    .toArray();

  if (req.method === "HEAD") {
    return res.status(200).end();
  }

  return res.status(200).json({
    count: results.length,
    nextBefore:
      results.length === pageSize ? results[results.length - 1]._id : null,
    jobs: results,
  });
};
