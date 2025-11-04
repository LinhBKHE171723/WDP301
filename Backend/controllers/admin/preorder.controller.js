const Order = require("../../models/Order");
const User = require("../../models/User");
const { success, error } = require("../../utils/response");
const { classifyCustomer } = require("../../utils/customerClassification");

exports.getPreOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: "preorder" })
      .populate({
        path: "userId",
        select: "name email phone",
      })
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price",
      })
      .sort({ createdAt: -1 });

    return success(res, orders);
  } catch (err) {
    return error(res, err.message);
  }
};

// Lấy thông tin chi tiết khách hàng và lịch sử đơn hàng
exports.getCustomerInfo = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return error(res, "userId là bắt buộc", 400);
    }

    // Lấy thông tin user
    const user = await User.findById(userId).select("name email phone point");
    if (!user) {
      return error(res, "Không tìm thấy khách hàng", 404);
    }

    // Lấy lịch sử đơn hàng
    const orders = await Order.find({ userId: userId })
      .populate("tableId", "tableNumber")
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price",
      })
      .sort({ createdAt: -1 })

    // Phân loại khách hàng
    const classification = await classifyCustomer(userId);

    return success(res, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        point: user.point || 0,
      },
      classification,
      orders,
    });
  } catch (err) {
    return error(res, err.message);
  }
};

