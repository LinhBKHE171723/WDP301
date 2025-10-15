const User = require("../models/User");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Tìm user trong DB

    console.log("--- Login Attempt ---");
    console.log("Email:", email);
    console.log("Password:", password);

    const user = await User.findOne({ email }).select("+password");

    console.log("User found in DB:", user ? user.email : "Not Found");
    if (!user) {
      return res
        .status(401)
        .json({ message: "Email hoặc mật khẩu không chính xác." });
    }

    // 2. So sánh mật khẩu
    const isMatch = await user.comparePassword(password);
    console.log("Password match result (isMatch):", isMatch);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Email hoặc mật khẩu không chính xác." });
    }

    // 3. Tạo JWT Payload
    const payload = {
      id: user._id,
      role: user.role,
      username: user.username,
    };

    // 4. Ký và tạo Token
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET, // Chuỗi bí mật từ file .env
      { expiresIn: process.env.JWT_EXPIRES_IN } // Thời gian hết hạn
    );

    // 5. Trả về token và thông tin user (loại bỏ mật khẩu)
    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
