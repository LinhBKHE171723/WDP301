const User = require("../models/User");
const cloudinary = require("../config/cloudinary");

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
        });
    } catch (err) {
        console.error("❌ Lỗi cập nhật profile:", err);
        res
            .status(500)
            .json({ success: false, message: err.message || "Lỗi server" });
    }
};
