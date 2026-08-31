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

const BASE_URL = process.env.BASE_URL || "https://mail-scheduler.adtv.space";
const API_KEY = process.env.SCHEDULE_API_KEY || "thisisforthepurposesofjustmailing";

const payload = {
  to: process.env.TO || "adeepaktv@proton.me",
  subject: process.env.SUBJECT || "JAV image sending",
  body: process.env.BODY || `"<div style=\"font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;\">
      <h2 style=\"color: #2c3e50;\">\u23f0 Reminder</h2>
      <p style=\"font-size: 16px; color: #333;\">This is a <b>test email</b> to confirm HTML rendering works.</p>
      <ul style=\"color: #555;\">
          <li>Bullet point one<img src='https://www.javdatabase.com/covers/full/1f/1favr00008pl.webp'/></li>
          <li>Bullet point two<img src='https://www.javdatabase.com/covers/full/ju/jums00137pl.webp'/></li>
      </ul>
      <p style=\"margin-top: 20px;\">
          <a href=\"https://example.com\" style=\"background: #3498db; color: white; padding: 10px 16px; text-decoration: none; border-radius: 4px;\">Click here</a>
      </p>
      <p style=\"font-size: 12px; color: #999; margin-top: 30px;\">Sent by Mail Scheduler
      </p>
  </div>"`,
  sendAt: process.env.SEND_AT || "2026-08-31T02:48:00Z",
  isHtml: true,
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
