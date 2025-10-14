// utils/mail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,            // smtp.gmail.com
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,                          // STARTTLS
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendNewAccountEmail({ to, name, email, tempPassword }) {
  const html = `
    <p><b>Tài khoản của bạn đã được tạo</b></p>
    <p>Email đăng nhập: ${email}<br/>
       Mật khẩu tạm: <b>${tempPassword}</b></p>
    <p>Vui lòng đăng nhập tại <a href="${process.env.APP_URL}">${process.env.APP_URL}</a> và đổi mật khẩu.</p>
  `;

  await transporter.sendMail({
    from: `"Restaurant System" <${process.env.SMTP_USER}>`,
    to,
    subject: "Tài khoản nhân viên đã được tạo",
    html,
  });
}

module.exports = { sendNewAccountEmail };
