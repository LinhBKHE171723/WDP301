const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const jwt = require("jsonwebtoken");

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


exports.updateProfile = async (req, res) => {
    try {
        console.log("User ID từ JWT:", req.user);
        console.log("📦 req.body:", req.body);
        console.log("📁 req.file:", req.file);
        const userId = req.user.id; // lấy từ JWT middleware
        const { name, phone } = req.body;
        let avatar = req.body.avatar;

        // Nếu có file upload từ frontend (multer)
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "restaurant_profiles",
            });
            avatar = result.secure_url;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name, phone, avatar },
            { new: true, runValidators: true }
        ).select("-password"); // Ẩn mật khẩu

        // Tạo token mới với thông tin cập nhật để cậP nhật giao diện
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

        if (!updatedUser) {
            return res
                .status(404)
                .json({ success: false, message: "Không tìm thấy người dùng" });
        }

        // Trả về user đã cập nhật
        res.status(200).json({
            success: true,
            message: "Cập nhật thông tin thành công",
            user: updatedUser,
            token: newToken, // 👈 trả token mới về
        });
    } catch (err) {
        console.error("❌ Lỗi cập nhật profile:", err);
        res
            .status(500)
            .json({ success: false, message: err.message || "Lỗi server" });
    }
};
