const Feedback = require("../models/Feedback");

exports.getAll = async ({ page = 1, limit = 10, rating, search }) => {
  const query = {};

  // Lọc theo rating (1-5)
  if (rating) query.rating = rating;

  // Tìm kiếm theo comment hoặc user.email hoặc user.name
  if (search) {
    query.$or = [{ comment: { $regex: search, $options: "i" } }];
  }

  const skip = (page - 1) * limit;

  const feedbacks = await Feedback.find(query)
    .populate({
      path: "userId",
      select: "name email phone role",
    })
    .populate({
      path: "orderId",
      select: "_id createdAt servedBy",
      populate: {
        path: "servedBy",
        select: "name email role",
      },
    }).sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Feedback.countDocuments(query);

  return {
    total,
    page: Number(page),
    limit: Number(limit),
    feedbacks,
  };
};

exports.getOne = async (id) => {
  return await Feedback.findById(id)
    .populate({
      path: "userId",
      select: "name email phone role",
    })
    .populate({
      path: "orderId",
      select: "_id createdAt",
    });
};

exports.remove = async (id) => {
  return await Feedback.findByIdAndDelete(id);
};
