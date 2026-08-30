const { getJobsCollection } = require("../lib/mongodb");
const { sendMail } = require("../lib/mailer");

const BATCH_SIZE = 20; // cap per invocation so we don't run past the function timeout
const MAX_ATTEMPTS = 3;

module.exports = async function handler(req, res) {
  // This route does the actual work, so it must be locked down.
  // Preferred: an Authorization: Bearer header (Vercel Cron sends this
  // automatically when the secret is named CRON_SECRET; cron-job.org and
  // GitHub Actions can be configured to send it too).
  // Fallback: a ?secret= query param, for schedulers that can't send
  // custom headers on their free tier (e.g. UptimeRobot).
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.authorization;
  const querySecret = req.query.secret;
  const authorized =
    expected && (auth === `Bearer ${expected}` || querySecret === expected);
  if (!authorized) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const jobs = await getJobsCollection();
  const now = new Date();

  const results = { sent: 0, failed: 0, skipped: 0 };

  for (let i = 0; i < BATCH_SIZE; i++) {
    // Atomically claim ONE due job. Using findOneAndUpdate here (rather
    // than "find due jobs, then update them") means that if two worker
    // invocations overlap, they can't both grab the same job and send
    // it twice.
    const claimed = await jobs.findOneAndUpdate(
      { status: "pending", sendAt: { $lte: now } },
      { $set: { status: "processing", updatedAt: new Date() } },
      { sort: { sendAt: 1 }, returnDocument: "after" }
    );

    const job = claimed && claimed.value ? claimed.value : claimed;
    if (!job) break; // nothing left to do

    try {
      await sendMail({
        to: job.to,
        subject: job.subject,
        body: job.body,
        isHtml: job.isHtml,
      });
      await jobs.updateOne(
        { _id: job._id },
        { $set: { status: "sent", updatedAt: new Date() } }
      );
      results.sent++;
    } catch (err) {
      const attempts = (job.attempts || 0) + 1;
      const nextStatus = attempts >= MAX_ATTEMPTS ? "failed" : "pending";
      await jobs.updateOne(
        { _id: job._id },
        {
          $set: {
            status: nextStatus,
            attempts,
            lastError: String(err && err.message ? err.message : err),
            updatedAt: new Date(),
          },
        }
      );
      if (nextStatus === "failed") results.failed++;
      else results.skipped++; // will be retried on a future run
    }
  }

  return res.status(200).json(results);
};
