const User = require("../models/User");

exports.getAll = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "customer" } });
    res.status(200).json(users);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi lấy danh sách user", error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, username, password, role, email, phone } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Email hoặc username đã tồn tại." });
    }

    const newUser = await User.create({
      name,
      username,
      password,
      role,
      email,
      phone,
    });

    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: "Tạo tài khoản thành công",
      user: userResponse,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Dữ liệu không hợp lệ", error: err.message });
    }
    res
      .status(500)
      .json({ message: "Tạo tài khoản thất bại", error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { password, ...otherUpdates } = req.body;
    const userId = req.params.id;

    if (password) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }
      user.password = password;
      Object.assign(user, otherUpdates);
      await user.save();

      const userResponse = user.toObject();
      delete userResponse.password;

      return res
        .status(200)
        .json({ message: "Cập nhật thành công", user: userResponse });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, otherUpdates, {
      new: true,
    });
    if (!updatedUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.status(200).json({ message: "Cập nhật thành công", user: updatedUser });
  } catch (err) {
    res.status(400).json({ message: "Cập nhật thất bại", error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
    res.status(200).json({ message: "Xoá thành công" });
  } catch (err) {
    res.status(500).json({ message: "Xoá thất bại", error: err.message });
  }
};
