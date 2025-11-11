const Order = require("../models/Order");
const { error } = require("../utils/response");
const { getLargeOrderThreshold } = require("../utils/preorderHelpers");

/**
 * Middleware kiểm tra quyền xử lý đơn đặt trước
 * - Admin: có thể xử lý tất cả đơn (pass luôn)
 * - Cashier: chỉ có thể xử lý đơn nhỏ (totalAmount <= threshold)
 */
async function checkPreOrderPermission(req, res, next) {
  try {
    const { role } = req.user;
    const { orderId } = req.params;

    // Admin có quyền xử lý tất cả
    if (role === "admin") {
      return next();
    }

    // Cashier cần kiểm tra order size
    if (role === "cashier") {
      if (!orderId) {
        // Nếu không có orderId (ví dụ: getPreOrders), cho phép truy cập
        // Logic filter sẽ được xử lý trong controller
        return next();
      }

      // Lấy order để kiểm tra totalAmount
      const order = await Order.findById(orderId);
      if (!order) {
        return error(res, "Không tìm thấy đơn hàng", 404);
      }

      // Lấy ngưỡng từ settings
      const threshold = await getLargeOrderThreshold();

      // Kiểm tra nếu đơn lớn hơn ngưỡng
      if (order.totalAmount > threshold) {
        return error(
          res,
          "Bạn không có quyền xử lý đơn hàng này. Đơn hàng này cần được xử lý bởi Admin.",
          403
        );
      }

      // Đơn nhỏ → cashier có quyền xử lý
      return next();
    }

    // Role khác không có quyền
    return error(res, "Bạn không có quyền truy cập tài nguyên này.", 403);
  } catch (err) {
    console.error("Error in checkPreOrderPermission:", err);
    return error(res, err.message);
  }
}

module.exports = { checkPreOrderPermission };



