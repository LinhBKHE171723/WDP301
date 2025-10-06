const User = require("../models/User");
const bcrypt = require("bcrypt");

exports.getAll = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "customer" } }).select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy danh sách user", error: err });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, username, password, role, email, phone } = req.body;
    const hash = await bcrypt.hash(password, 10);

    const user = new User({ name, username, password: hash, role, email, phone });
    await user.save();

    res.status(201).json({ message: "Tạo tài khoản thành công", user: { ...user._doc, password: undefined } });
  } catch (err) {
    res.status(400).json({ message: "Tạo tài khoản thất bại", error: err });
  }
};

exports.update = async (req, res) => {
  try {
    const updates = req.body;
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

    res.json({ message: "Cập nhật thành công", user: { ...user._doc, password: undefined } });
  } catch (err) {
    res.status(400).json({ message: "Cập nhật thất bại", error: err });
  }
};

exports.remove = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    res.json({ message: "Xoá thành công" });
  } catch (err) {
    res.status(500).json({ message: "Xoá thất bại", error: err });
  }
};
