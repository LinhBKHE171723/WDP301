const User = require("../models/User");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  try {
    //  Lấy usernameOrEmail và mật khẩu người dùng nhập từ body request
    const { usernameOrEmail, password } = req.body;

    // 1. Tìm user trong DB

    console.log("--- Login Attempt ---");
    console.log("UsernameOrEmail:", usernameOrEmail);
    console.log("Password:", password);

    //  Tìm user trong MongoDB theo username hoặc email
    //  -> `.select("+password")`: vì trong model có `select: false`, nên phải bật lại để lấy password ra
    const user = await User.findOne({
      $or: [
        { email: usernameOrEmail },
        { username: usernameOrEmail }
      ]
    }).select("+password");

    console.log("User found in DB:", user ? (user.email || user.username) : "Not Found");
    // Nếu không tìm thấy user → trả lỗi 401 (Unauthorized)
    if (!user) {
      return res
        .status(401)
        .json({ message: "Tên đăng nhập/email hoặc mật khẩu không chính xác." });
    }

    //  So sánh mật khẩu người dùng nhập với mật khẩu đã băm trong DB
    const isMatch = await user.comparePassword(password);
    console.log("Password match result (isMatch):", isMatch);
    // ❌ Nếu mật khẩu không khớp → báo lỗi
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Tên đăng nhập/email hoặc mật khẩu không chính xác." });
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
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
