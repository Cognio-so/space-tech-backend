import nodemailer from "nodemailer";

const json = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  return res.end(JSON.stringify(payload));
};

const setCors = (req, res) => {
  const raw = process.env.ALLOWED_ORIGINS || "";
  const allowedFromEnv = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed =
    allowedFromEnv.length > 0
      ? allowedFromEnv
      : [
          "http://localhost:8080",
          "http://127.0.0.1:8080",
          "https://spacesoftconsultancy.com",
          "https://www.spacesoftconsultancy.com",
        ];

  const origin = req.headers.origin;
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const readBody = (req) => {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body) return JSON.parse(req.body);
  return {};
};

const normalizePayload = (payload) => {
  const firstName = (payload.firstName || "").toString().trim();
  const lastName = (payload.lastName || "").toString().trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const name = (payload.name || "").toString().trim() || fullName || "Unknown";

  return {
    name,
    email: (payload.email || "").toString().trim(),
    phone: (payload.phone || "").toString().trim(),
    service: (payload.service || "Not specified").toString().trim(),
    message: (payload.message || "").toString().trim(),
  };
};

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end("");
  }

  if (req.method !== "POST") {
    return json(res, 405, { success: false, message: "Method not allowed" });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  const toEmail = process.env.CONTACT_TO_EMAIL || gmailUser;

  if (!gmailUser || !gmailAppPassword) {
    return json(res, 500, { success: false, message: "Missing GMAIL_USER / GMAIL_APP_PASSWORD" });
  }

  try {
    const payload = normalizePayload(readBody(req));

    if (!payload.email) {
      return json(res, 400, { success: false, message: "Email is required" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailAppPassword },
    });

    const subject = `New website enquiry: ${payload.service}`;
    const leadText = [
      `Name: ${payload.name}`,
      `Email: ${payload.email}`,
      `Phone: ${payload.phone || "Not provided"}`,
      `Service: ${payload.service}`,
      "",
      "Message:",
      payload.message || "(empty)",
    ].join("\n");

    await transporter.sendMail({
      from: `"SpaceSoft Website" <${gmailUser}>`,
      to: toEmail,
      replyTo: payload.email,
      subject,
      text: leadText,
    });

    await transporter.sendMail({
      from: `"SpaceSoft Consultancy" <${gmailUser}>`,
      to: payload.email,
      subject: "We received your request",
      text: `Hi ${payload.name},\n\nThanks for reaching out. We received your request and will get back to you soon.\n\n- SpaceSoft Consultancy`,
    });

    return json(res, 200, { success: true });
  } catch (err) {
    console.error("backend/api/contact error:", err);
    return json(res, 500, { success: false, message: "Failed to send email" });
  }
}
