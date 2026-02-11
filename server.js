import http from "node:http";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const PORT = Number(process.env.PORT || 3001);

const setCors = (req, res) => {
  const raw = process.env.ALLOWED_ORIGINS || "";
  const allowedFromEnv = raw
    .split(",")
    .map((value) => value.trim())
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
  res.setHeader("Content-Type", "application/json");
};

const json = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
};

const parseBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
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

const sendEmails = async (payload) => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  const toEmail = process.env.CONTACT_TO_EMAIL || gmailUser;

  if (!gmailUser || !gmailAppPassword) {
    throw new Error("Missing GMAIL_USER / GMAIL_APP_PASSWORD");
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
};

const server = http.createServer(async (req, res) => {
  setCors(req, res);

  if (req.url === "/api/contact" && req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end("");
  }

  if (req.url === "/api/contact" && req.method === "GET") {
    return json(res, 200, { ok: true });
  }

  if (req.url !== "/api/contact" || req.method !== "POST") {
    return json(res, 404, { success: false, message: "Not found" });
  }

  try {
    const payload = normalizePayload(await parseBody(req));
    if (!payload.email) {
      return json(res, 400, { success: false, message: "Email is required" });
    }
    await sendEmails(payload);
    return json(res, 200, { success: true });
  } catch (error) {
    console.error("backend/server error:", error);
    return json(res, 500, { success: false, message: error.message || "Failed to send email" });
  }
});

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
