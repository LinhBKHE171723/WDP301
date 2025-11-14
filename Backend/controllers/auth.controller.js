const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

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

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email đã được sử dụng"
      });
    }

    // Auto-generate username nếu không có
    let finalUsername = username;
    if (!finalUsername) {
      finalUsername = email.split('@')[0] + Math.floor(Math.random() * 1000);
    }

    // Kiểm tra username đã tồn tại
    const existingUsername = await User.findOne({ username: finalUsername });
    if (existingUsername) {
      finalUsername = finalUsername + Math.floor(Math.random() * 1000);
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

// Forgot password cho customer (chỉ cho phép customer)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Email không tồn tại!" 
      });
    }

    // Chỉ cho phép customer
    if (user.role !== "customer") {
      return res.status(403).json({ 
        success: false, 
        message: "Chức năng này chỉ dành cho khách hàng!" 
      });
    }

    // Tạo JWT token để reset password (hết hạn sau 1 giờ)
    const resetToken = jwt.sign(
      { id: user._id, email: user.email, role: "customer" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Lưu token và thời gian hết hạn vào database
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 giờ
    await user.save();

    // Tạo link reset password (customer frontend)
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const resetLink = `${clientUrl}/reset-password?token=${resetToken}`;

    // Gửi email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
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

    res.json({ 
      success: true, 
      message: "Đã gửi link đặt lại mật khẩu vào email!" 
    });

  } catch (err) {
    console.error("❌ Forgot Password Error:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Verify token reset password cho customer
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: "Token không được để trống!" 
      });
    }

    // Giải mã token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ 
        success: false, 
        message: "Token không hợp lệ hoặc đã hết hạn!" 
      });
    }

    // Kiểm tra role phải là customer
    if (decoded.role !== "customer") {
      return res.status(403).json({ 
        success: false, 
        message: "Token không hợp lệ!" 
      });
    }

    // Tìm user và kiểm tra token trong database
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: "Token không hợp lệ hoặc đã hết hạn!" 
      });
    }

    res.json({ 
      success: true, 
      message: "Token hợp lệ", 
      email: user.email 
    });

  } catch (err) {
    console.error("❌ Verify Reset Token Error:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Reset password cho customer bằng token
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Token và mật khẩu mới không được để trống!" 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: "Mật khẩu phải có ít nhất 6 ký tự!" 
      });
    }

    // Giải mã token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ 
        success: false, 
        message: "Token không hợp lệ hoặc đã hết hạn!" 
      });
    }

    // Kiểm tra role phải là customer
    if (decoded.role !== "customer") {
      return res.status(403).json({ 
        success: false, 
        message: "Token không hợp lệ!" 
      });
    }

    // Tìm user và kiểm tra token trong database
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: "Token không hợp lệ hoặc đã hết hạn!" 
      });
    }

    // Đổi mật khẩu
    user.password = newPassword;
    // Xóa token và expiry sau khi đổi mật khẩu thành công
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ 
      success: true, 
      message: "Đổi mật khẩu thành công!" 
    });

  } catch (err) {
    console.error("❌ Reset Password Error:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
