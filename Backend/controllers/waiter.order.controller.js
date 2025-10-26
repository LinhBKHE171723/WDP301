const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Table = require("../models/Table");
const mongoose = require("mongoose");
const { populateOrderItemDetails } = require("../utils/customerHelpers");

// Lấy danh sách đơn hàng cần xác nhận từ waiter
exports.getPendingOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      status: "pending",
      "waiterResponse.status": "pending"
    })
      .populate('tableId', 'tableNumber')
      .populate('orderItems')
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    // Populate thông tin item trong orderItems
    for (const order of orders) {
      await populateOrderItemDetails(order.orderItems);
    }

    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Waiter phản hồi đơn hàng (xác nhận hoặc từ chối)
exports.respondToOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { approved, reason, selectedTable } = req.body;
    const waiterId = req.user.id; // lấy từ middleware auth

    // Validate input
    if (typeof approved !== 'boolean') {
      return res.status(400).json({ success: false, message: "'approved' phải là boolean" });
    }
    if (approved && !selectedTable) {
      return res.status(400).json({ success: false, message: "Cần chọn bàn khi xác nhận" });
    }
    if (!approved && (!reason || reason.trim() === '')) {
      return res.status(400).json({ success: false, message: "Lý do từ chối là bắt buộc" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });

    if (order.waiterResponse.status !== 'pending') {
      return res.status(400).json({ success: false, message: "Đơn hàng đã được waiter phản hồi trước đó" });
    }

    // nếu waiter xác nhận
    if (approved) {
      const table = await Table.findById(selectedTable);
      if (!table) return res.status(404).json({ success: false, message: "Bàn không tồn tại" });
      if (table.status === 'occupied') return res.status(409).json({ success: false, message: "Bàn đã có người chọn" });

      order.servedBy = new mongoose.Types.ObjectId(waiterId);
      order.tableId = new mongoose.Types.ObjectId(table._id);
      order.waiterResponse.status = 'approved';
      order.waiterResponse.reason = null;
      order.waiterResponse.respondedAt = new Date();

      // Table chuyển sang occupied
      table.status = 'occupied';
      await table.save();
    } else {
      // ❌ Từ chối
      order.waiterResponse.status = 'rejected';
      order.waiterResponse.reason = reason.trim();
      order.waiterResponse.respondedAt = new Date();
    }

    // Lưu lịch sử
    order.confirmationHistory.push({
      action: approved ? 'waiter_approved' : 'waiter_rejected',
      timestamp: new Date(),
      details: approved ? `Waiter ${waiterId} xác nhận đơn` : `Waiter từ chối: ${reason.trim()}`
    });

    await order.save();

    // Populate để trả về cho UI
    const populatedOrder = await Order.findById(order._id)
      .populate("orderItems")
      .populate("tableId")
      .populate("paymentId")
      .populate("userId", "name");

    // Emit WebSocket
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      const eventType = approved ? "order:waiter_approved" : "order:waiter_rejected";
      webSocketService.broadcastToOrder(order._id, eventType, {
        order: populatedOrder,
        waiterResponse: order.waiterResponse
      });
    }

    res.status(200).json({
      success: true,
      message: approved ? "Đã xác nhận đơn hàng" : "Đã từ chối đơn hàng",
      data: populatedOrder
    });
  } catch (error) {
    console.error("Error in respondToOrder:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// Lấy danh sách đơn hàng đang phục vụ (đã xác nhận)
exports.getActiveOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ["confirmed", "preparing", "ready"] }
    })
      .populate('tableId', 'tableNumber')
      .populate('orderItems')
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    // Populate thông tin item trong orderItems
    for (const order of orders) {
      await populateOrderItemDetails(order.orderItems);
    }

    res.status(200).json({
      success: true,
      orders: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Cập nhật trạng thái đơn hàng (từ confirmed → served)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['confirmed', 'preparing', 'ready', 'served'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ"
      });
    }

    // Find and update order
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        status,
        servedAt: status === 'served' ? new Date() : order.servedAt
      },
      { new: true }
    ).populate("orderItems")
      .populate("tableId")
      .populate("paymentId")
      .populate("userId", "name");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Populate thông tin item trong orderItems
    await populateOrderItemDetails(order.orderItems);

    // Emit WebSocket event để cập nhật real-time
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "order:updated", order);
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái đơn hàng thành công",
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


