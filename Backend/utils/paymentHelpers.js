const Order = require("../models/Order");
const Payment = require("../models/Payment");

/**
 * Đồng bộ paymentId và paymentIds
 * - Nếu có paymentId nhưng paymentIds rỗng → thêm vào paymentIds
 * - Nếu có paymentIds nhưng paymentId null → set paymentId = paymentIds[0]
 * @param {Object} order - Order object
 */
async function ensurePaymentIdsSync(order) {
  if (!order) return;

  let needsSave = false;

  // Nếu có paymentId nhưng paymentIds rỗng hoặc không có
  if (order.paymentId && (!order.paymentIds || order.paymentIds.length === 0)) {
    // Kiểm tra payment có tồn tại không
    const payment = await Payment.findById(order.paymentId);
    if (payment) {
      order.paymentIds = [order.paymentId];
      needsSave = true;
    }
  }
  // Nếu có paymentIds nhưng paymentId null → set paymentId = paymentIds[0]
  else if (order.paymentIds && order.paymentIds.length > 0 && !order.paymentId) {
    order.paymentId = order.paymentIds[0];
    needsSave = true;
  }
  // Nếu cả hai đều có nhưng không sync → sync
  else if (order.paymentId && order.paymentIds && order.paymentIds.length > 0) {
    // Kiểm tra paymentId có trong paymentIds chưa
    const paymentIdStr = order.paymentId.toString();
    const isInArray = order.paymentIds.some(id => id.toString() === paymentIdStr);
    
    if (!isInArray) {
      // Nếu paymentId không có trong paymentIds, thêm vào đầu mảng
      order.paymentIds.unshift(order.paymentId);
      needsSave = true;
    }
  }

  if (needsSave) {
    await order.save();
  }
}

/**
 * Tính tổng tiền đã thanh toán của một order
 * @param {string|ObjectId} orderId - Order ID
 * @returns {Promise<number>} Tổng tiền đã thanh toán
 */
async function calculateTotalPaid(orderId) {
  try {
    const order = await Order.findById(orderId).populate("paymentIds");
    
    if (!order || !order.paymentIds || order.paymentIds.length === 0) {
      return 0;
    }

    // Filter và tính tổng: chỉ tính các payment có status = 'paid' và amountPaid > 0
    const paidPayments = order.paymentIds.filter(p => {
      return p && 
             typeof p === 'object' && 
             p.status === 'paid' && 
             (p.amountPaid || 0) > 0;
    });

    const totalPaid = paidPayments.reduce((sum, p) => {
      return sum + (Number(p.amountPaid) || 0);
    }, 0);

    return totalPaid;
  } catch (error) {
    console.error("Error calculating total paid:", error);
    return 0;
  }
}

/**
 * Tính số tiền còn lại cần thanh toán
 * @param {string|ObjectId} orderId - Order ID
 * @param {number} totalAmount - Tổng tiền của order
 * @returns {Promise<number>} Số tiền còn lại
 */
async function calculateRemainingAmount(orderId, totalAmount) {
  try {
    const totalPaid = await calculateTotalPaid(orderId);
    return Math.max(0, totalAmount - totalPaid);
  } catch (error) {
    console.error("Error calculating remaining amount:", error);
    return totalAmount;
  }
}

/**
 * Thêm payment vào order.paymentIds
 * @param {string|ObjectId} orderId - Order ID
 * @param {Object} payment - Payment object hoặc Payment ID
 */
async function addPaymentToOrder(orderId, payment) {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const paymentId = payment._id || payment;

    // Thêm vào paymentIds nếu chưa có
    if (!order.paymentIds) {
      order.paymentIds = [];
    }

    const paymentIdStr = paymentId.toString();
    const isAlreadyAdded = order.paymentIds.some(id => id.toString() === paymentIdStr);

    if (!isAlreadyAdded) {
      order.paymentIds.push(paymentId);
    }

    // Đồng bộ paymentId (nếu chưa có)
    if (!order.paymentId) {
      order.paymentId = paymentId;
    }

    await order.save();
  } catch (error) {
    console.error("Error adding payment to order:", error);
    throw error;
  }
}

module.exports = {
  ensurePaymentIdsSync,
  calculateTotalPaid,
  calculateRemainingAmount,
  addPaymentToOrder,
};



