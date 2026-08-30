const { ObjectId } = require("mongodb");
const { getJobsCollection } = require("../lib/mongodb");

module.exports = async function handler(req, res) {
  if (req.method === "HEAD") {
    // UptimeRobot's free-plan HTTP monitor sends HEAD by default.
  } else if (req.method !== "GET") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Valid 'id' query param is required" });
  }

  const jobs = await getJobsCollection();
  const job = await jobs.findOne(
    { _id: new ObjectId(id) },
    { projection: { body: 0 } } // don't echo back the full email body
  );

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  if (req.method === "HEAD") {
    return res.status(200).end();
  }

  return res.status(200).json(job);
};
