# Mail Scheduler

Schedule an email to be sent at a future time. Runs on Vercel, stores jobs in
MongoDB Atlas so nothing is lost on a restart/redeploy.

## Why it works this way

Vercel functions are serverless — there's no process that can just "wait"
until send time. Instead:

1. `POST /api/schedule` writes a job to MongoDB with status `pending`.
2. `POST /api/process` (the worker) looks for jobs whose `sendAt` has
   passed, sends them via SMTP, and marks them `sent`.
3. Something has to call the worker on a schedule. **You're on the Hobby
   plan, and Hobby's built-in Vercel Cron can only fire once a day** — not
   frequent enough for timely delivery. So:
   - A **free external scheduler** (e.g. cron-job.org, or a GitHub Actions
     workflow) hits `/api/process` every 1–5 minutes. This is your real
     trigger.
   - Vercel's own daily cron (already wired up in `vercel.json`) is kept
     as a once-a-day safety net in case the external scheduler ever misses
     a run.
   - If you later upgrade to Pro, you can just point Vercel Cron itself at
     `/api/process` every minute and drop the external scheduler.

## 1. MongoDB Atlas

1. Create a free cluster at https://www.mongodb.com/cloud/atlas.
2. Create a database user and allow network access from anywhere
   (0.0.0.0/0) or from Vercel's IPs.
3. Copy the connection string into `MONGODB_URI`.

## 2. SMTP (Gmail example)

1. Turn on 2-Step Verification on the Gmail account.
2. Create an "App Password" (Google Account → Security → App Passwords).
3. Use `smtp.gmail.com`, port `587`, `SMTP_SECURE=false`, and the app
   password (not your normal login password) as `SMTP_PASS`.
   Any other SMTP provider (Zoho, Outlook, your own mail server) works the
   same way — just change the host/port.

## 3. Deploy

```bash
npm install
vercel # or: vercel --prod
```

Set all the variables from `.env.example` in your Vercel project's
Environment Variables settings (Project → Settings → Environment Variables).
Redeploy after adding them.

## 4. Wire up the external scheduler (Hobby plan)

**Option A: cron-job.org (free, 1-minute precision)**
1. Create an account, add a new cron job.
2. URL: `https://<your-project>.vercel.app/api/process`
3. Method: `POST`
4. Schedule: every 1 minute (or however precise you need delivery to be).
5. Custom header: `Authorization: Bearer <your CRON_SECRET>`

**Option B: UptimeRobot (free, 5-minute precision)**
UptimeRobot's free plan can't send custom headers, so pass the secret in
the URL instead — `/api/process` accepts either form.
1. Create an account, add a new **HTTP(s)** monitor.
2. URL: `https://<your-project>.vercel.app/api/process?secret=<your CRON_SECRET>`
3. Monitoring interval: 5 minutes (the free-plan minimum).
4. Leave everything else default — a plain GET is enough to trigger the worker.

Either way, the request just needs to reach `/api/process` with the right
secret; it doesn't matter which service does it.

## API

### Schedule an email

```bash
curl -X POST https://<your-project>.vercel.app/api/schedule \
  -H "Content-Type: application/json" \
  -H "x-api-key: <your SCHEDULE_API_KEY>" \
  -d '{
    "to": "someone@example.com",
    "subject": "Reminder",
    "body": "Don'\''t forget the thing.",
    "sendAt": "2026-09-01T09:00:00Z"
  }'
```

Response:
```json
{ "id": "66f...", "status": "pending", "sendAt": "2026-09-01T09:00:00.000Z" }
```

### Check status of one job

```bash
curl "https://<your-project>.vercel.app/api/status?id=66f..."
```

Returns the job document (`pending` / `processing` / `sent` / `failed`,
`attempts`, `lastError`).

### List / check status of all jobs

```bash
curl "https://<your-project>.vercel.app/api/jobs?status=pending&limit=50" \
  -H "x-api-key: <your SCHEDULE_API_KEY>"
```
To use in uptimerobot
```bash
https://<your-project>.vercel.app/api/jobs?status=pending&limit=50&apiKey=<your SCHEDULE_API_KEY>

```

- `status` (optional) — filter to one of `pending`, `processing`, `sent`, `failed`. Omit to get all.
- `limit` (optional) — page size, default 50, max 200.
- `before` (optional) — pass the `nextBefore` value from the previous response to get the next page (newest-first, paginating backwards in time).

Response:
```json
{
  "count": 2,
  "nextBefore": "66f0a1...",
  "jobs": [
    { "_id": "66f...", "to": "a@example.com", "subject": "...", "status": "pending", "sendAt": "...", "attempts": 0 },
    { "_id": "66f...", "to": "b@example.com", "subject": "...", "status": "sent", "sendAt": "...", "attempts": 1 }
  ]
}
```

Email bodies are never included in list results — fetch `/api/status?id=...`
for the full document if you need the body of a specific job. This endpoint
requires the same `x-api-key` as scheduling, since it exposes recipient
addresses across every job.

## Notes

- `sendAt` must be an ISO 8601 datetime (UTC recommended, e.g.
  `2026-09-01T09:00:00Z`) and in the future.
- Failed sends are retried up to 3 times before being marked `failed`
  permanently — check `lastError` on the job to see why.
- The worker claims jobs atomically (`findOneAndUpdate`), so overlapping
  invocations from your scheduler can't double-send the same email.
- `BATCH_SIZE` in `api/process.js` caps how many emails one invocation
  sends (default 20) so it doesn't run past the function timeout.
