const User = require("../models/User");

// Lấy danh sách tất cả nhân viên bếp (role = "chef")
exports.getAllChef = async (req, res) => {
  try {
    const chefs = await User.find({ role: "chef", status: "active" }).select(
      "name username email avatar status"
    ); // chỉ lấy các trường cần thiết

    res.status(200).json({
      success: true,
      total: chefs.length,
      chefs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách đầu bếp.",
    });
  }
};
