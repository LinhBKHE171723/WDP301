// services/admin.user.service.js
const User = require("../models/User");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const SALT_ROUNDS = 10;
const ALLOWED_ROLES = ["admin", "cashier", "waiter", "chef"];

// ===== Tạo mật khẩu ngẫu nhiên =====
function genTempPassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  let pwd = "";
  for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

// ===== Cấu hình gửi email qua Gmail (đã có trong .env) =====
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

class AdminUserService {

  // 📌 LIST USERS (không đổi)
  static async list({ page = 1, limit = 10, role, status, q }) {
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(filter),
    ]);
    return { items, total, page: Number(page), pages: Math.ceil(total / limit) || 1 };
  }


  // 📌 CREATE NHÂN VIÊN – Gửi mật khẩu vào email
  static async create({ name, username, email, phone, role }) {
    if (!name || !email) {
      const err = new Error("Thiếu name hoặc email");
      err.status = 400;
      throw err;
    }

    // Check email trùng
    const existedEmail = await User.findOne({ email });
    if (existedEmail) {
      const err = new Error("Email đã tồn tại");
      err.status = 409;
      throw err;
    }

    // Check role hợp lệ
    if (role && !ALLOWED_ROLES.includes(role)) {
      const err = new Error("Role không hợp lệ");
      err.status = 400;
      throw err;
    }

    // Check/ơr sinh username nếu chưa có
    let finalUsername = (username || "").trim();
    if (!finalUsername) {
      const base = email.split("@")[0];
      let candidate = base.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      let i = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const exists = await User.findOne({ username: candidate });
        if (!exists) break;
        candidate = `${base}_${i++}`;
      }
      finalUsername = candidate;
    }

    // Tạo mật khẩu random + hash
    const tempPassword = genTempPassword(10);
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    // Lưu DB
    const user = await User.create({
      name,
      email,
      username: finalUsername,
      phone: phone || "",
      role: role || "waiter",
      status: "active",
      password: passwordHash, // LƯU HASH
    });

    // Gửi email ngắn gọn
    const html = `
      <p><b>Tài khoản của bạn đã được tạo</b></p>
      <p>Email đăng nhập: ${email}<br/>
      Mật khẩu tạm: <b>${tempPassword}</b></p>
      <p>Vui lòng đăng nhập tại <a href="${process.env.APP_URL}">${process.env.APP_URL}</a> và đổi mật khẩu.</p>
    `;
    await transporter.sendMail({
      from: `"Restaurant System" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Tài khoản nhân viên đã được tạo",
      html,
    });

    // Ẩn password khi trả về
    const safe = user.toObject();
    delete safe.password;
    return safe;
  }


  // 📌 UPDATE USER (không đổi email)
// 📌 UPDATE USER (Không cho đổi email & password, giữ nguyên nếu FE không gửi)
static async update(id, data) {
  const { email, password, _id, createdAt, updatedAt, ...updateData } = data;
  const existingUser = await User.findById(id);
  if (!existingUser) throw { status: 404, message: "User not found" };
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined || updateData[key] === null) {
      delete updateData[key]; 
    }
  });

  const user = await User.findByIdAndUpdate(id, updateData, {
    new: true, 
    runValidators: true,
  });

  return user;
}


  static async updateStatus(id, status) {
    const user = await User.findByIdAndUpdate(id, { status }, { new: true });
    if (!user) throw { status: 404, message: "User not found" };
    return user;
  }

  static async updateRole(id, role) {
    const user = await User.findByIdAndUpdate(id, { role }, { new: true });
    if (!user) throw { status: 404, message: "User not found" };
    return user;
  }

  static async remove(id) {
    const user = await User.findByIdAndDelete(id);
    if (!user) throw { status: 404, message: "User not found" };
    return true;
  }
}

module.exports = AdminUserService;
