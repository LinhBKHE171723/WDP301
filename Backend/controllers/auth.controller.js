const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

exports.register = async (req, res) => {
  try {
    const { name, username, email, password, phone } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Tên, email và mật khẩu là bắt buộc"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự"
      });
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email này đã được sử dụng"
      });
    }

    // Kiểm tra username đã tồn tại chưa (nếu có)
    if (username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          message: "Tên đăng nhập này đã được sử dụng"
        });
      }
    }

    // Tạo username tự động nếu không có
    let finalUsername = username;
    if (!finalUsername) {
      const base = email.split("@")[0];
      let candidate = base.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      let i = 1;
      while (true) {
        const exists = await User.findOne({ username: candidate });
        if (!exists) break;
        candidate = `${base}_${i++}`;
      }
      finalUsername = candidate;
    }

    // Tạo user mới
    const user = await User.create({
      name,
      username: finalUsername,
      email,
      password,
      phone: phone || "",
      role: "customer",
      point: 0
    });

    // Tạo JWT token
    const payload = {
      id: user._id,
      role: user.role,
      username: user.username,
      avatar: user.avatar,
      name: user.name,
      email: user.email,
      phone: user.phone
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      token,
      user: {
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        point: user.point
      }
    });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    //  Lấy email và mật khẩu người dùng nhập từ body request
    const { email, password } = req.body;

    // 1. Tìm user trong DB

    console.log("--- Login Attempt ---");
    console.log("Email:", email);
    console.log("Password:", password);

    //  Tìm user trong MongoDB theo email
    //  -> `.select("+password")`: vì trong model có `select: false`, nên phải bật lại để lấy password ra
    const user = await User.findOne({ email }).select("+password");

    console.log("User found in DB:", user ? user.email : "Not Found");
    // Nếu không tìm thấy user → trả lỗi 401 (Unauthorized)
    if (!user) {
      return res
        .status(401)
        .json({ message: "Email hoặc mật khẩu không chính xác." });
    }

    //  So sánh mật khẩu người dùng nhập với mật khẩu đã băm trong DB
    const isMatch = await user.comparePassword(password);
    console.log("Password match result (isMatch):", isMatch);
    // ❌ Nếu mật khẩu không khớp → báo lỗi
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
      avatar: user.avatar,
      name: user.name,
      email: user.email,
      phone: user.phone
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
        avatar: user.avatar,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
