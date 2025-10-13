// services/admin.user.service.js
const User = require("../models/User");
const { sendMail } = require("./email.service");
const { createEmailVerification } = require("./../services/auth.service");

class AdminUserService {
  // LIST + filter + search + pagination
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

  // CREATE nhân viên (không password), gửi email xác minh
  static async create({ name, username, email, phone, role }) {
    // email/username unique theo schema hiện tại của bạn
    const user = await User.create({
      name,
      username,
      email,
      phone,
      role,
      password: null,     // chưa có mật khẩu
      status: "inactive",  // chờ xác minh email
    });

    // tạo token xác minh và gửi mail
    const token = await createEmailVerification(user._id);
    const be = process.env.BACKEND_URL || "http://localhost:5000";
    const verifyLink = `${be}/api/auth/verify/${token}`;

    await sendMail({
      to: email,
      subject: "Xác minh tài khoản nhân viên",
      html: `
        <p>Xin chào ${name || ""},</p>
        <p>Vui lòng xác minh tài khoản nhân viên của bạn bằng cách bấm vào liên kết dưới đây:</p>
        <p><a href="${verifyLink}" target="_blank">${verifyLink}</a></p>
        <p>Liên kết có hiệu lực trong 24 giờ.</p>
        <p>Trân trọng,<br/>Restaurant System</p>
      `,
    });

    return user;
  }

  // UPDATE thông tin (không cho đổi email)
  static async update(id, data) {
    const { email, password, ...updateData } = data;
    const user = await User.findByIdAndUpdate(id, updateData, { new: true });
    if (!user) throw { status: 404, message: "User not found" };
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
