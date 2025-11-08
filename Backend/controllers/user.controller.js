const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const streamifier = require("streamifier");
// Lấy thông tin profile người dùng hiện tại
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });

        res.status(200).json({ success: true, user });
    } catch (err) {
        console.error("❌ Lỗi khi lấy profile:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Cập nhật thông tin profile người dùng
exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, avatar } = req.body; // avatar là URL từ frontend (upload trực tiếp)

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { name, phone, avatar },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedUser)
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });

        // Tạo token mới (nếu muốn frontend cập nhật ngay)
        const newToken = jwt.sign(
            {
                id: updatedUser._id,
                role: updatedUser.role,
                username: updatedUser.username,
                avatar: updatedUser.avatar,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(200).json({
            success: true,
            message: "Cập nhật thông tin thành công",
            user: updatedUser,
            token: newToken,
        });
    } catch (err) {
        console.error("❌ Lỗi cập nhật profile:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Gửi mật khẩu tạm về email
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user)
            return res.status(404).json({ success: false, message: "Email không tồn tại!" });

        // Tạo mật khẩu tạm
        const tempPassword = Math.random().toString(36).slice(-8);

        // Gán mật khẩu tạm và lưu để model tự hash
        user.password = tempPassword;
        await user.save();

        // Gửi email
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false, // Gmail dùng TLS port 587 => FALSE
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        await transporter.sendMail({
            from: `Nhà hàng WDP`,
            to: email,
            subject: "Mật khẩu khôi phục tài khoản",
            text: `Mật khẩu tạm của bạn là: ${tempPassword}`
        });

        res.json({ success: true, message: "✅ Đã gửi mật khẩu mới vào email!" });

    } catch (err) {
        console.error("❌ Forgot Password Error:", err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};


// Reset mật khẩu bằng mật khẩu tạm + mật khẩu mới
exports.resetPassword = async (req, res) => {
    try {
        const { email, tempPassword, newPassword } = req.body;

        const user = await User.findOne({ email }).select("+password");
        if (!user)
            return res.status(404).json({ success: false, message: "Tài khoản không tồn tại!" });

        const isMatch = await bcrypt.compare(tempPassword, user.password);
        if (!isMatch)
            return res.status(400).json({ success: false, message: "Mật khẩu tạm không đúng!" });

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: "✅ Đổi mật khẩu thành công!" });

    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};

