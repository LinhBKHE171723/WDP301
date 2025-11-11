const Setting = require("../models/Setting");
const Order = require("../models/Order");

/**
 * Lấy ngưỡng đơn lớn từ settings
 * @returns {Promise<number>} Ngưỡng giá trị (default: 2000000)
 */
async function getLargeOrderThreshold() {
  try {
    const threshold = await Setting.getSetting("preorder.largeOrderThreshold", 2000000);
    return typeof threshold === "number" ? threshold : 2000000;
  } catch (error) {
    console.error("Error getting large order threshold:", error);
    return 2000000; // Default fallback
  }
}

/**
 * Kiểm tra đơn có phải đơn lớn không (totalAmount > threshold)
 * @param {string|Object} orderOrOrderId - Order object hoặc orderId
 * @returns {Promise<boolean>} true nếu đơn lớn, false nếu đơn nhỏ
 */
async function isLargeOrder(orderOrOrderId) {
  try {
    let order;
    
    if (typeof orderOrOrderId === "string") {
      // Nếu là orderId, tìm order
      order = await Order.findById(orderOrOrderId);
      if (!order) return false;
    } else if (orderOrOrderId && typeof orderOrOrderId === "object") {
      // Nếu là order object
      order = orderOrOrderId;
    } else {
      return false;
    }

    if (!order.totalAmount) return false;

    const threshold = await getLargeOrderThreshold();
    return order.totalAmount > threshold;
  } catch (error) {
    console.error("Error checking if order is large:", error);
    return false;
  }
}

/**
 * Kiểm tra đơn có phải đơn nhỏ không (totalAmount <= threshold)
 * @param {string|Object} orderOrOrderId - Order object hoặc orderId
 * @returns {Promise<boolean>} true nếu đơn nhỏ, false nếu đơn lớn
 */
async function isSmallOrder(orderOrOrderId) {
  const isLarge = await isLargeOrder(orderOrOrderId);
  return !isLarge;
}

module.exports = {
  getLargeOrderThreshold,
  isLargeOrder,
  isSmallOrder,
};



