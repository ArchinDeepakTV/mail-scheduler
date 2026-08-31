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

async function sendMail({ to, subject, body }) {
  const t = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  return t.sendMail({
    from,
    to,
    subject,
    text: body,
    html: body,
  });
}

module.exports = { sendMail };
