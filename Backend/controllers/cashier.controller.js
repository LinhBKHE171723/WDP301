const Order = require("../models/Order");
const Payment = require("../models/Payment");
const webSocketService = require("../services/websocket.service");
const { groupSplitOrderItemsForCustomer, populateOrderItemDetails } = require("../utils/customerHelpers");

function calculateWaitTime(createdAt) {
  if (!createdAt) return 0;
  const start = new Date(createdAt).getTime();
  if (Number.isNaN(start)) return 0;
  const diffMs = Date.now() - start;
  return diffMs > 0 ? Math.round(diffMs / 60000) : 0;
}

function buildOrderNumber(order) {
  if (!order) return "ĐH-UNKNOWN";
  if (order.orderNumber) return String(order.orderNumber).trim();
  if (order.code) return order.code;
  if (order._id) return order._id.toString();
  return "ĐH-UNKNOWN";
}

function formatOrder(order) {
  if (!order) return null;

  // orderItems đã được populate và group trong getPreparingOrders
  // Chỉ cần lọc bỏ các items không hợp lệ và format
  let orderItemsToFormat = order.orderItems || [];
  
  if (orderItemsToFormat.length > 0) {
    // Lọc bỏ các items không hợp lệ (buffer, ObjectId chưa populate)
    orderItemsToFormat = orderItemsToFormat.filter(item => {
      if (!item) return false;
      if (Buffer.isBuffer(item)) return false;
      if (typeof item === 'string') return false;
      if (typeof item !== 'object') return false;
      // Kiểm tra xem có phải là ObjectId không
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(item) && item.constructor?.name === 'ObjectId') {
        return false; // Skip pure ObjectId
      }
      return true;
    });
  }

  const items = orderItemsToFormat.map((item) => {
    const price = item.price ?? 0;
    return {
      id: item._id ? item._id.toString() : undefined,
      name: item.itemName || item.itemId?.name || "Món ăn",
      quantity: item.quantity ?? 0,
      price,
      note: item.note || "",
      status: item.status,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

  let tableNumber = "Mang đi";
  if (order.tableId) {
    if (typeof order.tableId === "object" && order.tableId !== null) {
      const num = order.tableId.tableNumber ?? order.tableId.number;
      tableNumber = num ? `Bàn ${num}` : "Chưa có số bàn";
    } else if (typeof order.tableId === "string") {
      tableNumber = `Bàn ${order.tableId}`;
    }
  }

  return {
    id: order._id ? order._id.toString() : undefined,
    orderNumber: buildOrderNumber(order),
    tableNumber,
    items,
    totalAmount: order.totalAmount ?? subtotal,
    remainingAmount: order.remainingAmount ?? (order.totalAmount ?? subtotal), // Số tiền còn lại cần thanh toán
    totalPaid: order.totalPaid ?? 0, // Tổng tiền đã thanh toán (bao gồm tiền cọc nếu có)
    orderTime: order.createdAt,
    waitTime: calculateWaitTime(order.createdAt),
    status: order.status,
  };
}

function formatOrders(orders = []) {
  return orders.map(formatOrder).filter(Boolean);
}

// Export formatOrder để có thể sử dụng ở file khác
exports.formatOrder = formatOrder;

exports.getPreparingOrders = async (_req, res) => {
  try {
    const orders = await Order.find({ status: { $in: ["confirmed", "preparing", "served"] } })
      .sort({ createdAt: 1 })
      .populate("tableId", "tableNumber");

    // Import payment helpers
    const { calculateRemainingAmount, calculateTotalPaid, ensurePaymentIdsSync } = require("../utils/paymentHelpers");

    // Populate orderItems một cách rõ ràng và đảm bảo có đầy đủ field
    const OrderItem = require("../models/OrderItem");
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      
      // Đảm bảo paymentIds được sync
      await ensurePaymentIdsSync(order);
      
      // Tính remainingAmount cho order này
      const totalPaid = await calculateTotalPaid(order._id);
      const remainingAmount = Math.max(0, order.totalAmount - totalPaid);
      
      if (order.orderItems && order.orderItems.length > 0) {
        // Lấy OrderItem IDs (có thể là ObjectIds hoặc strings)
        const orderItemIds = order.orderItems.map(item => {
          if (typeof item === 'object' && item._id) {
            return item._id;
          }
          return item;
        }).filter(id => id);
        
        // Fetch OrderItems với đầy đủ field
        const populatedOrderItems = await OrderItem.find({ _id: { $in: orderItemIds } })
          .populate({ path: 'itemId', select: 'name' });
        
        // Debug: log để kiểm tra
        if (populatedOrderItems.length > 0 && populatedOrderItems.length !== orderItemIds.length) {
          console.log(`⚠️ Fetched ${populatedOrderItems.length} OrderItems but expected ${orderItemIds.length}`);
        }
        
        // Populate orderItemDetails
        await populateOrderItemDetails(populatedOrderItems);
        
        // Group orderItems - đảm bảo populatedOrderItems là array hợp lệ
        if (populatedOrderItems && populatedOrderItems.length > 0) {
          const groupedItems = groupSplitOrderItemsForCustomer(populatedOrderItems);
          // Convert order sang plain object và gán orderItems
          const orderPlain = order.toObject ? order.toObject({ getters: true }) : { ...order };
          orderPlain.orderItems = groupedItems;
          // Thêm remainingAmount và totalPaid
          orderPlain.remainingAmount = remainingAmount;
          orderPlain.totalPaid = totalPaid;
          // Thay thế order trong array bằng plain object
          orders[i] = orderPlain;
        } else {
          const orderPlain = order.toObject ? order.toObject({ getters: true }) : { ...order };
          orderPlain.orderItems = [];
          orderPlain.remainingAmount = remainingAmount;
          orderPlain.totalPaid = totalPaid;
          orders[i] = orderPlain;
        }
      } else {
        // Convert order sang plain object ngay cả khi không có orderItems
        const orderPlain = order.toObject ? order.toObject({ getters: true }) : { ...order };
        orderPlain.remainingAmount = remainingAmount;
        orderPlain.totalPaid = totalPaid;
        orders[i] = orderPlain;
      }
    }

    return res.status(200).json({
      message: "Lấy danh sách đơn đang chuẩn bị thành công",
      data: formatOrders(orders),
    });
  } catch (error) {
    console.error("[cashier] getPreparingOrders error:", error);
    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách đơn đang chuẩn bị",
      error: error.message,
    });
  }
};

exports.completeOrderPayment = async (req, res) => {
  const { orderId } = req.params;
  const { paymentMethod = "cash" } = req.body || {};

  try {
    const order = await Order.findById(orderId).populate({
      path: "orderItems",
      select: "price quantity",
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (order.status === "paid") {
      return res.status(400).json({ message: "Đơn hàng đã được thanh toán trước đó" });
    }

    if (!["confirmed", "preparing", "served"].includes(order.status)) {
      return res.status(400).json({
        message: "Chỉ có thể thanh toán các đơn đang ở trạng thái chuẩn bị hoặc đã phục vụ",
      });
    }

    // Tính số tiền còn lại cần thanh toán (có thể đã có tiền cọc)
    const { calculateRemainingAmount, calculateTotalPaid, addPaymentToOrder, ensurePaymentIdsSync } = require("../utils/paymentHelpers");
    
    // Đảm bảo paymentIds được sync
    await ensurePaymentIdsSync(order);
    
    // Tính remainingAmount (nếu có tiền cọc thì chỉ thanh toán số còn lại)
    const remainingAmount = await calculateRemainingAmount(order._id, order.totalAmount);
    const finalAmount = remainingAmount > 0 ? remainingAmount : order.totalAmount;

    // Tạo Payment mới cho số tiền còn lại
    const payment = new Payment({
      orderId: order._id,
      paymentMethod,
      status: "paid",
      amountPaid: finalAmount,
      payTime: new Date(),
      cashierId: req.user.id,
      isDeposit: false, // Đánh dấu đây là thanh toán cuối (không phải cọc)
    });
    await payment.save();

    // Thêm payment vào order.paymentIds
    await addPaymentToOrder(order._id, payment);

    // Kiểm tra đã thanh toán đủ chưa
    const totalPaid = await calculateTotalPaid(order._id);
    if (totalPaid >= order.totalAmount) {
      order.status = "paid";
      await order.save();
      
      // Tích điểm cho khách hàng khi đơn chuyển sang paid
      if (order.userId) {
        try {
          const { addPointsToCustomer } = require("../utils/loyaltyHelpers");
          const { pointsEarned, newTotalPoints } = await addPointsToCustomer(
            order.userId,
            order.totalAmount
          );
          
          if (pointsEarned > 0) {
            console.log(`✅ Tích ${pointsEarned} điểm cho khách hàng ${order.userId}. Tổng điểm: ${newTotalPoints}`);
          }
        } catch (error) {
          console.error("❌ Lỗi khi tích điểm cho khách hàng:", error);
          // Không throw error để không làm gián đoạn quá trình thanh toán
        }
      }
    }

    const populatedOrder = await Order.findById(orderId)
      .populate("tableId", "tableNumber")
      .populate({
        path: "orderItems",
        select: "itemName itemId quantity price note status",
        populate: { path: "itemId", select: "name" },
      });

    // Tính lại remainingAmount và totalPaid sau khi thanh toán
    const newTotalPaid = await calculateTotalPaid(order._id);
    const newRemainingAmount = Math.max(0, order.totalAmount - newTotalPaid);
    
    // Cập nhật vào populatedOrder để formatOrder có thể sử dụng
    populatedOrder.remainingAmount = newRemainingAmount;
    populatedOrder.totalPaid = newTotalPaid;

    // Populate orderItemDetails và group orderItems
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await populateOrderItemDetails(populatedOrder.orderItems);
      populatedOrder.orderItems = groupSplitOrderItemsForCustomer(populatedOrder.orderItems);
    }

    if (webSocketService?.broadcastToAllCashiers) {
      const payload = formatOrder(populatedOrder);
      if (payload) {
        webSocketService.broadcastToAllCashiers("cashier.orders.paid", payload);
      }
    }

    return res.status(200).json({
      message: "Thanh toán đơn hàng thành công",
      data: {
        orderId: order._id,
        amountPaid: finalAmount,
        remainingAmount: remainingAmount,
        totalAmount: order.totalAmount,
        paymentMethod,
      },
    });
  } catch (error) {
    console.error("[cashier] completeOrderPayment error:", error);
    return res.status(500).json({
      message: "Lỗi server khi thanh toán đơn",
      error: error.message,
    });
  }
};