import nodemailer from "nodemailer";

const json = (res, statusCode, payload) => {
  res.status(statusCode).json(payload);
};

const setCorsHeaders = (req, res) => {
  // Public form endpoint: allow cross-origin requests from frontend domains.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const getBody = (req) => req.body || {};

const getTransporter = () => {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
};

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return json(res, 405, { success: false, message: "Method not allowed" });
  }

  try {
    const data = getBody(req);
    const name = (data.name || "").toString().trim();
    const email = (data.email || "").toString().trim();
    const phone = (data.phone || "").toString().trim();
    const service = (data.service || "").toString().trim();
    const message = (data.message || "").toString().trim();

    if (!name || !email || !phone || !service) {
      return json(res, 400, { success: false, message: "Please fill all required fields." });
    }

    const transporter = getTransporter();
    if (!transporter) {
      return json(res, 500, {
        success: false,
        message: "Mail service is not configured.",
      });
    }

    const fromEmail = process.env.GMAIL_USER;
    const toEmail = process.env.CONTACT_TO_EMAIL || fromEmail;

    await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      replyTo: email,
      subject: "New Book a Call Request",
      html: `
        <h2>Book a Call Request</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Service:</b> ${service}</p>
        ${message ? `<p><b>Message:</b> ${message}</p>` : ""}
      `,
    });

    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: "Your call request has been received",
      html: `
        <p>Hi ${name},</p>
        <p>Thanks for booking a call with SpaceTech Consulting. We received your request and will contact you shortly.</p>
        <p>Regards,<br/>SpaceTech Consulting</p>
      `,
    });

    return json(res, 200, { success: true });
  } catch (error) {
    console.error("Book call API error:", error);
    return json(res, 500, { success: false, message: "Failed to send email." });
  }
}
