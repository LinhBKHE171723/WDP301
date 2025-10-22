const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function sendMail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: `"Restaurant System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log("✅ Email sent to:", to);
  } catch (error) {
    console.error("❌ FULL SMTP ERROR:", error);
    throw new Error("Email sending failed");
  }
}

module.exports = { sendMail };
