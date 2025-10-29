const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Table = require("../models/Table");
const User = require("../models/User");
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
      .populate('servedBy', 'name email')
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
    if (!approved && (!reason || reason.trim() === '')) {
      return res.status(400).json({ success: false, message: "Lý do từ chối là bắt buộc" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });

    // Validate table selection for approval
    if (approved && !selectedTable && !order.tableId) {
      return res.status(400).json({ success: false, message: "Cần chọn bàn khi xác nhận" });
    }

    if (order.waiterResponse.status !== 'pending') {
      return res.status(400).json({ success: false, message: "Đơn hàng đã được waiter phản hồi trước đó" });
    }

    // nếu waiter xác nhận
    if (approved) {
      let table;
      let finalTableId;
      
      // 🎯 Ưu tiên bàn mà waiter chọn (nếu có)
      if (selectedTable) {
        table = await Table.findById(selectedTable);
        if (!table) {
          return res.status(404).json({ 
            success: false, 
            message: "Bàn không tồn tại" 
          });
        }
        
        // ✅ Cho phép nhiều order trên cùng một bàn
        // Chỉ kiểm tra nếu bàn không tồn tại, không kiểm tra status occupied
        finalTableId = selectedTable;
        console.log(`✅ Waiter chọn bàn: ${table.tableNumber}`);
        
      } else if (order.tableId) {
        // 🔄 Fallback: Sử dụng bàn auto-assigned
        table = await Table.findById(order.tableId);
        if (!table) {
          return res.status(404).json({ 
            success: false, 
            message: "Bàn auto-assigned không tồn tại" 
          });
        }
        
        finalTableId = order.tableId;
        console.log(`✅ Sử dụng bàn auto-assigned: ${table.tableNumber}`);
        
      } else {
        // ❌ Không có bàn nào được chọn
        return res.status(400).json({ 
          success: false, 
          message: "Cần chọn bàn khi xác nhận đơn hàng" 
        });
      }
      
      // 🔄 Cập nhật tableId cho order (nếu khác với bàn hiện tại)
      let oldTableId = null;
      if (order.tableId?.toString() !== finalTableId.toString()) {
        oldTableId = order.tableId;
        order.tableId = new mongoose.Types.ObjectId(finalTableId);
        console.log(`🔄 Order ${order._id} được cập nhật tableId: ${order.tableId}`);
        
        // 🧹 Xử lý bàn cũ (nếu có)
        if (oldTableId) {
          const oldTable = await Table.findById(oldTableId);
          if (oldTable && oldTable.orderNow) {
            oldTable.orderNow = oldTable.orderNow.filter(oid => oid.toString() !== order._id.toString());
            if (oldTable.orderNow.length === 0) {
              oldTable.status = "available";
            }
            await oldTable.save();
            console.log(`🧹 Đã xóa order khỏi bàn cũ: ${oldTable.tableNumber}`);
          }
        }
      }

      // Tìm người phục vụ
      const waiter = await User.findById(waiterId);
      if (!waiter) {
        return res.status(404).json({ 
          success: false, 
          message: "Nhân viên phục vụ không tồn tại" 
        });
      }

      order.servedBy = new mongoose.Types.ObjectId(waiter._id);
      order.waiterResponse.status = 'approved';
      order.waiterResponse.reason = null;
      order.waiterResponse.respondedAt = new Date();

      // Table chuyển sang occupied và thêm order vào mảng
      table.status = 'occupied';
      if (!table.orderNow.includes(order._id)) {
        table.orderNow.push(order._id);
      }
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
    
    console.log(`💾 Order ${order._id} đã được save với tableId: ${order.tableId}`);

    // Populate để trả về cho UI bên phía khách hàng
    const populatedOrder = await Order.findById(order._id)
      .populate("orderItems")
      .populate("tableId")
      .populate("paymentId")
      .populate("userId", "name")
      .populate("servedBy", "name email");

    // Emit WebSocket event để cập nhật real-time cho khách hàng 
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
      .populate('servedBy', 'name email')
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


