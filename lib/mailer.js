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

async function sendMail({ to, subject, body, isHtml }) {
  // BUG FIX: `isHtml` was previously not destructured here at all, so
  // api/process.js's `isHtml: job.isHtml` was silently dropped — every
  // email was sent with BOTH `text: body` and `html: body` regardless of
  // the flag. That means an isHtml:false job with a raw '&' or '<' in the
  // body (e.g. an unescaped title from an upstream scraper) could render
  // oddly in HTML-preferring clients, since it was never actually treated
  // as plain text end-to-end.
  const t = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  return t.sendMail({
    from,
    to,
    subject,
    // nodemailer auto-generates a plain-text fallback from `html` when
    // `text` is omitted, so this now genuinely respects isHtml both ways.
    ...(isHtml ? { html: body } : { text: body }),
    // Default quoted-printable transfer encoding inserts a soft line-break
    // every 76 chars into the raw MIME body. A long line — e.g. an <img
    // src="..."> with a full URL plus attributes in an HTML body — can
    // exceed that, and the break sometimes lands mid-URL. Desktop webmail
    // decodes it back correctly; some mobile app MIME parsers don't,
    // silently breaking things like embedded images. Confirmed via this
    // exact bug in a client of this service (jav-tracker) — base64 avoids
    // the whole class of corruption.
    encoding: "base64",
  });
}

module.exports = { sendMail };
