const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "Missing SMTP_HOST, SMTP_USER, or SMTP_PASS environment variables"
    );
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === "true", // true for port 465, false for 587/25
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Best-effort plain-text fallback generated from an HTML body, for mail
// clients that don't render HTML. Not a full HTML parser — good enough
// for typical email markup (paragraphs, line breaks, basic tags).
function stripHtml(html) {
  return String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function sendMail({ to, subject, body, isHtml }) {
  const t = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const mail = { from, to, subject };

  if (isHtml) {
    // Body is HTML: send as-is, and derive a readable plain-text version
    // for clients/spam filters that prefer it.
    mail.html = body;
    mail.text = stripHtml(body);
  } else {
    // Body is plain text: send as text, and wrap it for HTML clients so
    // line breaks are preserved (HTML collapses raw newlines otherwise).
    mail.text = body;
    mail.html = `<pre style="font-family: inherit; white-space: pre-wrap; margin: 0;">${escapeHtml(
      body
    )}</pre>`;
  }

  return t.sendMail(mail);
}

module.exports = { sendMail };
