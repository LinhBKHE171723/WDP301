const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const streamifier = require("streamifier");
const Shift = require("../models/Shift");
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

// Gửi link reset password về email
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user)
            return res.status(404).json({ success: false, message: "Email không tồn tại!" });

        // Tạo JWT token để reset password (hết hạn sau 1 giờ)
        const resetToken = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        // Lưu token và thời gian hết hạn vào database
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 giờ = 3600000ms
        await user.save();

        // Tạo link reset password
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

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
            subject: "Khôi phục mật khẩu tài khoản",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #ea580c;">Khôi phục mật khẩu</h2>
                    <p>Xin chào <b>${user.name}</b>,</p>
                    <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
                    <p>Vui lòng click vào link bên dưới để đặt lại mật khẩu:</p>
                    <p style="margin: 20px 0;">
                        <a href="${resetLink}" 
                           style="background-color: #ea580c; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Đặt lại mật khẩu
                        </a>
                    </p>
                    <p>Hoặc copy link sau vào trình duyệt:</p>
                    <p style="word-break: break-all; color: #666;">${resetLink}</p>
                    <p style="color: #999; font-size: 12px; margin-top: 30px;">
                        <b>Lưu ý:</b> Link này chỉ có hiệu lực trong 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, 
                        vui lòng bỏ qua email này.
                    </p>
                </div>
            `
        });

        res.json({ success: true, message: "Đã gửi link đặt lại mật khẩu vào email!" });

    } catch (err) {
        console.error("❌ Forgot Password Error:", err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};


// Verify token reset password (để frontend kiểm tra token có hợp lệ không)
exports.verifyResetToken = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ success: false, message: "Token không được để trống!" });
        }

        // Giải mã token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn!" });
        }

        // Tìm user và kiểm tra token trong database
        const user = await User.findOne({
            _id: decoded.id,
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() } // Token chưa hết hạn
        }).select("+resetPasswordToken +resetPasswordExpires");

        if (!user) {
            return res.status(400).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn!" });
        }

        res.json({ success: true, message: "Token hợp lệ", email: user.email });

    } catch (err) {
        console.error("❌ Verify Reset Token Error:", err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};

// Reset mật khẩu bằng token
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: "Token và mật khẩu mới không được để trống!" });
        }

        // Giải mã token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn!" });
        }

        // Tìm user và kiểm tra token trong database
        const user = await User.findOne({
            _id: decoded.id,
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() } // Token chưa hết hạn
        }).select("+resetPasswordToken +resetPasswordExpires");

        if (!user) {
            return res.status(400).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn!" });
        }

        // Đổi mật khẩu
        user.password = newPassword;
        // Xóa token và expiry sau khi đổi mật khẩu thành công
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ success: true, message: "Đổi mật khẩu thành công!" });

    } catch (err) {
        console.error("❌ Reset Password Error:", err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};

// ===================== Lấy shift hôm nay =====================
// helper: lấy start và end của ngày hôm nay
const getTodayRange = () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return { startOfDay, endOfDay };
};

exports.getTodayShift = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startOfDay, endOfDay } = getTodayRange();

        // Tìm shift trong ngày hôm nay
        // Ưu tiên shift đã check-in (có startTime), nếu không có thì lấy shift pending mới nhất
        let shift = await Shift.findOne({
            userId,
            date: { $gte: startOfDay, $lte: endOfDay },
            startTime: { $exists: true, $ne: null } // Ưu tiên shift đã check-in
        })
        .sort({ createdAt: -1 })
        .populate("workShiftId");

        // Nếu không có shift đã check-in, lấy shift pending mới nhất
        if (!shift) {
            shift = await Shift.findOne({
                userId,
                date: { $gte: startOfDay, $lte: endOfDay }
            })
            .sort({ createdAt: -1 })
            .populate("workShiftId");
        }

        res.json({ success: true, shift });
    } catch (err) {
        console.error("❌ Lỗi getTodayShift:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ===================== Check-in =====================
exports.checkIn = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startOfDay, endOfDay } = getTodayRange();

        // Tìm shift đã check-in trước, nếu không có thì lấy shift pending mới nhất
        let shift = await Shift.findOne({
            userId,
            date: { $gte: startOfDay, $lte: endOfDay },
            startTime: { $exists: true, $ne: null }
        })
        .sort({ createdAt: -1 })
        .populate("workShiftId");

        if (shift && shift.startTime) {
            return res.status(400).json({ success: false, message: "Bạn đã check-in rồi." });
        }

        // Nếu không có shift đã check-in, lấy shift pending mới nhất
        if (!shift) {
            shift = await Shift.findOne({
                userId,
                date: { $gte: startOfDay, $lte: endOfDay }
            })
            .sort({ createdAt: -1 })
            .populate("workShiftId");
        }

        if (!shift) return res.status(404).json({ success: false, message: "Không có ca làm hôm nay." });

        const now = new Date();

        // Tính thời gian bắt đầu ca làm chuẩn
        const scheduledStart = new Date(shift.date);
        const [h, m] = shift.workShiftId.startTime.split(":").map(Number);
        scheduledStart.setHours(h, m, 0, 0);

        shift.startTime = now;
        shift.status = now > scheduledStart ? "late" : "checked_in";

        await shift.save();

        // Cập nhật status user → active khi check-in
        await User.findByIdAndUpdate(userId, { status: "active" });

        res.json({ success: true, message: "Check-in thành công!", shift });
    } catch (err) {
        console.error("❌ Lỗi checkIn:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ===================== Check-out =====================
exports.checkOut = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startOfDay, endOfDay } = getTodayRange();

        // Tìm shift đã check-in (có startTime)
        const shift = await Shift.findOne({
            userId,
            date: { $gte: startOfDay, $lte: endOfDay },
            startTime: { $exists: true, $ne: null }
        })
        .sort({ createdAt: -1 })
        .populate("workShiftId");

        if (!shift || !shift.startTime)
            return res.status(400).json({ success: false, message: "Bạn chưa check-in." });

        if (shift.endTime)
            return res.status(400).json({ success: false, message: "Bạn đã check-out rồi." });

        const now = new Date();

        // Tính thời gian kết thúc ca làm chuẩn
        const scheduledEnd = new Date(shift.date);
        const [eh, em] = shift.workShiftId.endTime.split(":").map(Number);
        scheduledEnd.setHours(eh, em, 0, 0);

        shift.endTime = now;
        shift.status = now < scheduledEnd ? "early_leave" : "checked_out";

        await shift.save();

        // Cập nhật status user → inactive sau check-out
        await User.findByIdAndUpdate(userId, { status: "inactive" });

        res.json({ success: true, message: "Check-out thành công!", shift });
    } catch (err) {
        console.error("❌ Lỗi checkOut:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};