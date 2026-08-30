// Schedules an email by calling POST /api/schedule.
// Equivalent to the curl command, but in JS using the built-in fetch (Node 18+).
//
// Usage:
//   node schedule-email.js
//
// Configure the values below, or pass them as env vars, e.g.:
//   BASE_URL=https://your-project.vercel.app \
//   SCHEDULE_API_KEY=your-key \
//   TO=someone@example.com \
//   SUBJECT="Reminder" \
//   BODY="Don't forget the thing." \
//   SEND_AT=2026-09-01T09:00:00Z \
//   node schedule-email.js

const BASE_URL = process.env.BASE_URL || "https://<your-project>.vercel.app";
const API_KEY = process.env.SCHEDULE_API_KEY || "<your SCHEDULE_API_KEY>";

const payload = {
  to: process.env.TO || "someone@example.com",
  subject: process.env.SUBJECT || "Reminder",
  body: process.env.BODY || "Don't forget the thing.",
  sendAt: process.env.SEND_AT || "2026-09-01T09:00:00Z",
  isHtml: process.env.IS_HTML === "true",
};

async function scheduleEmail() {
  const res = await fetch(`${BASE_URL}/api/schedule`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`Request failed (${res.status}):`, data);
    process.exit(1);
  }

  console.log("Scheduled:", data);
  return data;
}

scheduleEmail().catch((err) => {
  console.error("Error scheduling email:", err);
  process.exit(1);
});
