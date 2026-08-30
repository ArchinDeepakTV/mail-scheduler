const { getJobsCollection } = require("../lib/mongodb");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Optional: protect this endpoint so randoms on the internet can't
  // use your server as a free email relay. Set SCHEDULE_API_KEY in
  // your Vercel env vars and send it back as x-api-key to use this.
  if (process.env.SCHEDULE_API_KEY) {
    const key = req.headers["x-api-key"];
    if (key !== process.env.SCHEDULE_API_KEY) {
      return res.status(401).json({ error: "Invalid or missing x-api-key" });
    }
  }

  const { to, subject, body, sendAt, isHtml } = req.body || {};

  if (!to || !EMAIL_RE.test(to)) {
    return res.status(400).json({ error: "Valid 'to' email address is required" });
  }
  if (!subject || typeof subject !== "string") {
    return res.status(400).json({ error: "'subject' is required" });
  }
  if (!body || typeof body !== "string") {
    return res.status(400).json({ error: "'body' is required" });
  }
  if (!sendAt) {
    return res.status(400).json({ error: "'sendAt' (ISO 8601 datetime) is required" });
  }
  if (isHtml !== undefined && typeof isHtml !== "boolean") {
    return res.status(400).json({ error: "'isHtml' must be a boolean if provided" });
  }

  const sendAtDate = new Date(sendAt);
  if (isNaN(sendAtDate.getTime())) {
    return res.status(400).json({ error: "'sendAt' must be a valid ISO 8601 datetime" });
  }
  if (sendAtDate.getTime() < Date.now() - 60_000) {
    return res.status(400).json({ error: "'sendAt' must be in the future" });
  }

  const jobs = await getJobsCollection();
  const doc = {
    to,
    subject,
    body,
    isHtml: Boolean(isHtml), // defaults to false (plain text) if omitted
    sendAt: sendAtDate,
    status: "pending", // pending -> processing -> sent | failed
    attempts: 0,
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await jobs.insertOne(doc);

  return res.status(201).json({
    id: result.insertedId,
    status: doc.status,
    sendAt: doc.sendAt,
  });
};
