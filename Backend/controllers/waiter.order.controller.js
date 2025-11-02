const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Table = require("../models/Table");
const User = require("../models/User");
const mongoose = require("mongoose");
const { populateOrderItemDetails } = require("../utils/customerHelpers");
const ExcelJS = require("exceljs");

// Helper function để populate assignedChef cho comboItems
async function populateComboItemsChefs(orderItems) {
  if (!orderItems || !Array.isArray(orderItems)) return;
  
  for (const oi of orderItems) {
    if (oi.comboItems && oi.comboItems.length > 0) {
      for (const ci of oi.comboItems) {
        if (ci.assignedChef) {
          // Kiểm tra xem đã được populate chưa (có _id property)
          if (typeof ci.assignedChef === 'object' && ci.assignedChef._id && ci.assignedChef.name) {
            // Đã được populate, giữ nguyên
            continue;
          } else if (typeof ci.assignedChef === 'string' || (typeof ci.assignedChef === 'object' && ci.assignedChef._id)) {
            // Chỉ là ObjectId, cần populate
            const chefId = typeof ci.assignedChef === 'string' ? ci.assignedChef : ci.assignedChef._id || ci.assignedChef;
            const chef = await User.findById(chefId).select("name username");
            if (chef) {
              ci.assignedChef = chef;
            }
          }
        }
      }
    }
  }
}
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
      .populate({
        path: 'orderItems',
        select: 'itemName itemType comboItems quantity price note status assignedChef', // Đảm bảo có đầy đủ fields
        populate: {
          path: 'assignedChef',
          select: 'name username'
        }
      })
      .populate('userId', 'name')
      .populate('servedBy', 'name email')
      .sort({ createdAt: -1 });

    // Populate thông tin item trong orderItems
    for (const order of orders) {
      await populateOrderItemDetails(order.orderItems);
      
      // Populate assignedChef cho comboItems
      if (order.orderItems && order.orderItems.length > 0) {
        await populateComboItemsChefs(order.orderItems);
      }
    }

    res.status(200).json({
      success: true,
      data: orders // Đổi từ 'orders' sang 'data' để consistent với các API khác
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


// GET /waiter/orders/history
exports.getServingHistory = async (req, res, next) => {
  try {
    const waiterId = req.user.id;

    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    const { search, table, fromDate, toDate } = req.query;

    const query = { servedBy: waiterId };

    // 🔍 Search theo tên khách
    if (search && search.trim() !== "") {
      const users = await User.find({
        name: { $regex: search.trim(), $options: "i" }
      }).select("_id");

      if (users.length > 0) {
        query.userId = { $in: users.map(u => u._id) };
      } else {
        query.userId = null; // đảm bảo trả về rỗng nếu không có ai match
      }
    }


    // 🍽 Filter theo bàn
    if (table && table !== "all") {
      const tableDoc = await Table.findOne({ tableNumber: table });
      if (tableDoc) query.tableId = tableDoc._id;
    }

    // 📅 Filter theo ngày
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(new Date(toDate).setHours(23, 59, 59));
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("tableId", "tableNumber")
        .populate("userId", "name phone"),
      Order.countDocuments(query)
    ]);

    return res.json({
      success: true,
      page,
      totalPages: Math.ceil(total / limit),
      totalOrders: total,
      orders
    });
  } catch (err) {
    next(err);
  }
};



// GET /waiter/orders/history/:orderId
exports.getServingHistoryDetails = async (req, res) => {
  try {
    const waiterId = req.user.id;
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      servedBy: waiterId
    })
      .populate('tableId', 'tableNumber')
      .populate('orderItems')
      .populate('userId', 'name phone email')
      .populate('servedBy', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order không tồn tại hoặc không thuộc quyền của bạn"
      });
    }

    // ✅ Populate chi tiết item
    await populateOrderItemDetails(order.orderItems);

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Đánh dấu món đơn đã phục vụ
exports.markOrderItemServed = async (req, res) => {
  try {
    const { orderItemId } = req.params;
    const waiterId = req.user.id;

    // Tìm OrderItem
    const orderItem = await OrderItem.findById(orderItemId);
    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy món ăn trong đơn hàng"
      });
    }

    // Tìm Order để kiểm tra servedBy
    const order = await Order.findById(orderItem.orderId)
      .populate("servedBy", "name email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Validate: Chỉ waiter được gán order mới có thể đánh dấu đã phục vụ
    if (!order.servedBy || order.servedBy._id.toString() !== waiterId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền đánh dấu món này. Chỉ waiter được gán order mới có thể thực hiện."
      });
    }

    // Validate: OrderItem phải ở trạng thái ready
    if (orderItem.status !== "ready") {
      return res.status(400).json({
        success: false,
        message: `Món ăn phải ở trạng thái 'ready' mới có thể đánh dấu đã phục vụ. Trạng thái hiện tại: ${orderItem.status}`
      });
    }

    // Update status
    orderItem.status = "served";
    await orderItem.save();

    // Kiểm tra: Nếu tất cả OrderItems và comboItems đều served, có thể update Order.status
    const updatedOrder = await Order.findById(order._id).populate("orderItems");
    
    // Kiểm tra tất cả OrderItems
    let allItemsServed = true;
    for (const oi of updatedOrder.orderItems) {
      // Đối với món đơn: OrderItem.status phải là "served"
      // Đối với món combo: OrderItem.status phải là "served" VÀ tất cả comboItems phải là "served"
      if (oi.comboItems && oi.comboItems.length > 0) {
        // Nếu là combo: kiểm tra cả OrderItem.status và tất cả comboItems
        if (oi.status !== "served") {
          allItemsServed = false;
          break;
        }
        const allComboItemsServed = oi.comboItems.every(ci => ci.status === "served");
        if (!allComboItemsServed) {
          allItemsServed = false;
          break;
        }
      } else {
        // Nếu là món đơn: chỉ cần kiểm tra OrderItem.status
        if (oi.status !== "served") {
          allItemsServed = false;
          break;
        }
      }
    }

    if (allItemsServed && updatedOrder.status !== "served") {
      updatedOrder.status = "served";
      updatedOrder.servedAt = new Date();
      await updatedOrder.save();
    }

    // Populate để trả về
    const populatedOrder = await Order.findById(order._id)
      .populate("orderItems")
      .populate("tableId")
      .populate("paymentId")
      .populate("servedBy", "name email");

    // Populate thông tin item trong orderItems
    await populateOrderItemDetails(populatedOrder.orderItems);

    // Emit WebSocket event
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(populatedOrder._id, "order:updated", populatedOrder);
    }

    res.status(200).json({
      success: true,
      message: `Đã đánh dấu món '${orderItem.itemName}' đã phục vụ.`,
      data: populatedOrder
    });
  } catch (error) {
    console.error("Error in markOrderItemServed:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Đánh dấu món trong combo đã phục vụ
exports.markComboItemServed = async (req, res) => {
  try {
    const { orderItemId, comboItemIndex } = req.params;
    const waiterId = req.user.id;

    // Tìm OrderItem
    const orderItem = await OrderItem.findById(orderItemId);
    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy món ăn trong đơn hàng"
      });
    }

    // Kiểm tra có comboItems không
    if (!orderItem.comboItems || orderItem.comboItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Món ăn này không phải là combo hoặc không có món con"
      });
    }

    // Validate comboItemIndex
    const index = parseInt(comboItemIndex);
    if (isNaN(index) || index < 0 || index >= orderItem.comboItems.length) {
      return res.status(400).json({
        success: false,
        message: "Index món con không hợp lệ"
      });
    }

    // Tìm Order để kiểm tra servedBy
    const order = await Order.findById(orderItem.orderId)
      .populate("servedBy", "name email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Validate: Chỉ waiter được gán order mới có thể đánh dấu đã phục vụ
    if (!order.servedBy || order.servedBy._id.toString() !== waiterId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền đánh dấu món này. Chỉ waiter được gán order mới có thể thực hiện."
      });
    }

    // Validate: comboItem phải ở trạng thái ready
    if (orderItem.comboItems[index].status !== "ready") {
      return res.status(400).json({
        success: false,
        message: `Món trong combo phải ở trạng thái 'ready' mới có thể đánh dấu đã phục vụ. Trạng thái hiện tại: ${orderItem.comboItems[index].status}`
      });
    }

    // Update combo item status
    orderItem.comboItems[index].status = "served";
    
    // Tự động cập nhật status của combo dựa trên comboItems
    const { updateComboStatusBasedOnComboItems } = require("../utils/customerHelpers");
    const oldComboStatus = orderItem.status;
    const newComboStatus = updateComboStatusBasedOnComboItems(orderItem);
    if (newComboStatus && newComboStatus !== oldComboStatus) {
      orderItem.status = newComboStatus;
      console.log(`🔄 Tự động cập nhật combo status từ '${oldComboStatus}' sang '${newComboStatus}' sau khi mark comboItem served`);
    }
    
    await orderItem.save();

    // Reload orderItem để có dữ liệu mới nhất sau khi save
    const updatedOrderItem = await OrderItem.findById(orderItemId);

    // Kiểm tra: Nếu tất cả OrderItems và comboItems đều served, có thể update Order.status
    // Reload Order sau khi update OrderItem để có dữ liệu mới nhất
    const updatedOrder = await Order.findById(order._id).populate("orderItems");
    
    // Kiểm tra tất cả OrderItems
    let allItemsServed = true;
    for (const oi of updatedOrder.orderItems) {
      // Đối với món đơn: OrderItem.status phải là "served"
      // Đối với món combo: OrderItem.status phải là "served" VÀ tất cả comboItems phải là "served"
      if (oi.comboItems && oi.comboItems.length > 0) {
        // Nếu là combo: kiểm tra cả OrderItem.status và tất cả comboItems
        if (oi.status !== "served") {
          allItemsServed = false;
          break;
        }
        const allComboItemsServed = oi.comboItems.every(ci => ci.status === "served");
        if (!allComboItemsServed) {
          allItemsServed = false;
          break;
        }
      } else {
        // Nếu là món đơn: chỉ cần kiểm tra OrderItem.status
        if (oi.status !== "served") {
          allItemsServed = false;
          break;
        }
      }
    }

    if (allItemsServed && updatedOrder.status !== "served") {
      updatedOrder.status = "served";
      updatedOrder.servedAt = new Date();
      await updatedOrder.save();
    }

    // Populate để trả về
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        select: "itemName itemType comboItems quantity note status assignedChef",
        populate: {
          path: "assignedChef",
          select: "name username"
        }
      })
      .populate("tableId")
      .populate("paymentId")
      .populate("servedBy", "name email");

    // Populate assignedChef cho comboItems
    if (populatedOrder.orderItems) {
      await populateComboItemsChefs(populatedOrder.orderItems);
    }

    // Populate thông tin item trong orderItems
    await populateOrderItemDetails(populatedOrder.orderItems);

    // Emit WebSocket event
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(populatedOrder._id, "order:updated", populatedOrder);
    }

    const comboItemName = orderItem.comboItems[index].itemName || "Món ăn";
    res.status(200).json({
      success: true,
      message: `Đã đánh dấu món '${comboItemName}' trong combo đã phục vụ.`,
      data: populatedOrder
    });
  } catch (error) {
    console.error("Error in markComboItemServed:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

