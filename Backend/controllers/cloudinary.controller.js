const cloudinary = require("../config/cloudinary");

exports.getCloudinarySignature = async (req, res) => {
  try {
    console.log("🪄 Backend: Bắt đầu tạo chữ ký upload Cloudinary");

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp },
      process.env.CLOUDINARY_API_SECRET
    );

    return res.status(200).json({
      success: true,
      signature,
      timestamp,
    });
  } catch (err) {
    console.error("❌ Lỗi tạo signature:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
