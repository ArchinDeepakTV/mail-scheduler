// Temporary diagnostic route — confirms whether the domain is serving
// the deployment you think it is. Delete once the deployment issue is sorted.
module.exports = async function handler(req, res) {
  res.status(200).json({
    marker: "v2-debug-build",
    deployedAt: "2026-08-30T19:00:00Z", // bump this string each time you redeploy to test
    vercelEnv: process.env.VERCEL_ENV || null,
    vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    vercelUrl: process.env.VERCEL_URL || null,
  });
};
