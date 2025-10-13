const Feedback = require("../models/Feedback");
const User = require("../models/User");

//  GET /api/admin/feedbacks?from=2025-10-01&to=2025-10-06&rating=4
exports.getAll = async (req, res) => {
  try {
    const { from, to, rating } = req.query;
    const filter = {};

    //  Lọc theo ngày gửi
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    //  Lọc theo số sao
    if (rating) {
      filter.rating = Number(rating);
    }

    const feedbacks = await Feedback.find(filter)
      .populate("userId", "name email")
      .populate("orderId", "_id createdAt")
      .sort({ createdAt: -1 });

    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy danh sách feedback", error: err.message });
  }
};

//  GET /api/admin/feedbacks/:id
exports.getOne = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate("userId", "name email")
      .populate("orderId", "_id createdAt");

    if (!feedback) {
      return res.status(404).json({ message: "Không tìm thấy feedback" });
    }

    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy chi tiết feedback", error: err.message });
  }
};

//  DELETE /api/admin/feedbacks/:id
exports.remove = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);

    if (!feedback) {
      return res.status(404).json({ message: "Không tìm thấy feedback để xoá" });
    }

    res.json({ message: "Feedback đã được xoá thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi xoá feedback", error: err.message });
  }
};
