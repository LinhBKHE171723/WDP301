const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
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
    const { approved, reason } = req.body;

    // Validate input
    if (typeof approved !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "Trường 'approved' phải là boolean"
      });
    }

    if (!approved && (!reason || reason.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: "Lý do từ chối là bắt buộc"
      });
    }

    // Tìm order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Kiểm tra order có đang chờ xác nhận không
    if (order.status !== 'pending' || order.waiterResponse.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng không ở trạng thái chờ xác nhận"
      });
    }

    // Cập nhật waiterResponse
    order.waiterResponse.status = approved ? 'approved' : 'rejected';
    order.waiterResponse.reason = approved ? null : reason.trim();
    order.waiterResponse.respondedAt = new Date();

    // Thêm vào confirmationHistory
    order.confirmationHistory.push({
      action: approved ? 'waiter_approved' : 'waiter_rejected',
      timestamp: new Date(),
      details: approved ? 'Waiter đã xác nhận đơn hàng' : `Waiter từ chối: ${reason.trim()}`
    });

    await order.save();

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate("orderItems")
      .populate("tableId")
      .populate("paymentId")
      .populate("userId", "name");

    // Populate thông tin item trong orderItems
    await populateOrderItemDetails(populatedOrder.orderItems);

    // Emit WebSocket event để thông báo cho customer
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
    res.status(500).json({
      success: false,
      message: error.message
    });
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

