// utils/mail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // smtp.gmail.com
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // STARTTLS
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendNewAccountEmail({ to, name, email, tempPassword }) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const html = `
    <p><b>Tài khoản của bạn đã được tạo</b></p>
    <p>Email đăng nhập: ${email}<br/>
       Mật khẩu tạm: <b>${tempPassword}</b></p>
    <p>Vui lòng đăng nhập tại <a href="${appUrl}">${appUrl}</a> và đổi mật khẩu.</p>
  `;

  await transporter.sendMail({
    from: `"Restaurant System" <${process.env.SMTP_USER}>`,
    to,
    subject: "Tài khoản nhân viên đã được tạo",
    html,
  });
}

async function sendPreOrderConfirmationEmail({ to, name, orderId, orderItems, scheduledTime, totalAmount }) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  
  // Format danh sách món
  const itemsList = orderItems.map(item => {
    const itemName = item.itemName || item.itemId?.name || 'Món ăn';
    const quantity = item.quantity || 1;
    const price = item.price || 0;
    const subtotal = price * quantity;
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${itemName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${price.toLocaleString('vi-VN')} đ</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${subtotal.toLocaleString('vi-VN')} đ</td>
      </tr>
    `;
  }).join('');

  // Format thời gian
  const scheduledDate = new Date(scheduledTime);
  const formattedTime = scheduledDate.toLocaleString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
      <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #4CAF50; margin-top: 0;">🍽️ Đặt bàn trước thành công!</h2>
        
        <p>Xin chào <b>${name}</b>,</p>
        
        <p>Cảm ơn bạn đã đặt trước tại nhà hàng của chúng tôi!</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Thông tin đơn hàng:</h3>
          <p><strong>Mã đơn hàng:</strong> #${orderId}</p>
          <p><strong>Thời gian đến ăn:</strong> ${formattedTime}</p>
        </div>

        <h3 style="color: #333; margin-top: 30px;">Danh sách món đã đặt:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #4CAF50; color: white;">
              <th style="padding: 12px; text-align: left;">Món ăn</th>
              <th style="padding: 12px; text-align: center;">Số lượng</th>
              <th style="padding: 12px; text-align: right;">Đơn giá</th>
              <th style="padding: 12px; text-align: right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>

        <div style="text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #4CAF50;">
          <p style="font-size: 18px; font-weight: bold; color: #4CAF50;">
            Tổng tiền: ${totalAmount.toLocaleString('vi-VN')} đ
          </p>
        </div>

        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0;"><strong>📌 Lưu ý:</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Đơn hàng của bạn đang chờ xác nhận từ nhà hàng.</li>
            <li><strong>Nhà hàng sẽ liên hệ lại với bạn để xác nhận đơn hàng trong thời gian sớm nhất.</strong></li>
            <li>Vui lòng đến đúng giờ đã đặt: <strong>${formattedTime}</strong></li>
            <li>Nếu có thay đổi, vui lòng liên hệ nhà hàng trước ít nhất 2 giờ.</li>
          </ul>
        </div>

        <p style="margin-top: 30px; color: #666;">
          Trân trọng,<br>
          <strong>Nhà hàng của chúng tôi</strong>
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Restaurant System" <${process.env.SMTP_USER}>`,
    to,
    subject: `Xác nhận đặt bàn trước - Mã đơn #${orderId}`,
    html,
  });
}

module.exports = { sendNewAccountEmail, sendPreOrderConfirmationEmail };
