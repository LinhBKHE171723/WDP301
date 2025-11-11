const Order = require("../models/Order");

/**
 * Kiểm tra và gửi thông báo nhắc nhở cho đơn đặt trước sắp đến giờ
 * @param {Object} webSocketService - WebSocket service instance
 * @param {Number} reminderMinutes - Số phút trước khi đến giờ để nhắc (default: 30)
 */
async function checkUpcomingPreOrders(webSocketService, reminderMinutes = 30) {
  try {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + reminderMinutes * 60 * 1000);

    // Tìm các đơn đặt trước có scheduledTime trong khoảng [now, reminderTime]
    // và waiterResponse.status = "approved" hoặc "pending"
    const upcomingOrders = await Order.find({
      status: "preorder",
      scheduledTime: {
        $gte: now,
        $lte: reminderTime
      },
      "waiterResponse.status": { $in: ["pending", "approved"] }
    })
      .populate({
        path: "userId",
        select: "name email phone",
      })
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price",
      })
      .populate("tableId", "tableNumber")
      .sort({ scheduledTime: 1 });

    if (upcomingOrders.length === 0) {
      return;
    }

    console.log(`⏰ Found ${upcomingOrders.length} upcoming pre-orders (within ${reminderMinutes} minutes)`);

    // Gửi WebSocket notifications
    if (webSocketService) {
      for (const order of upcomingOrders) {
        const minutesUntil = Math.round((new Date(order.scheduledTime) - now) / (60 * 1000));
        
        // Broadcast to all admins
        webSocketService.broadcastToAllAdmins("preorder:upcoming_reminder", {
          order,
          minutesUntil,
          message: `Đơn đặt trước sắp đến giờ (còn ${minutesUntil} phút)`
        });

        // Broadcast to waiters if order is approved
        if (order.waiterResponse.status === "approved") {
          webSocketService.broadcastToAllWaiters("preorder:upcoming_reminder", {
            order,
            minutesUntil,
            message: `Đơn đặt trước sắp đến giờ (còn ${minutesUntil} phút)`
          });
        }
      }
    }

    return upcomingOrders;
  } catch (error) {
    console.error("❌ Error in checkUpcomingPreOrders:", error);
    return [];
  }
}

module.exports = { checkUpcomingPreOrders };



/**
 * Kiểm tra và gửi thông báo nhắc nhở cho đơn đặt trước sắp đến giờ
 * @param {Object} webSocketService - WebSocket service instance
 * @param {Number} reminderMinutes - Số phút trước khi đến giờ để nhắc (default: 30)
 */
async function checkUpcomingPreOrders(webSocketService, reminderMinutes = 30) {
  try {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + reminderMinutes * 60 * 1000);

    // Tìm các đơn đặt trước có scheduledTime trong khoảng [now, reminderTime]
    // và waiterResponse.status = "approved" hoặc "pending"
    const upcomingOrders = await Order.find({
      status: "preorder",
      scheduledTime: {
        $gte: now,
        $lte: reminderTime
      },
      "waiterResponse.status": { $in: ["pending", "approved"] }
    })
      .populate({
        path: "userId",
        select: "name email phone",
      })
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price",
      })
      .populate("tableId", "tableNumber")
      .sort({ scheduledTime: 1 });

    if (upcomingOrders.length === 0) {
      return;
    }

    console.log(`⏰ Found ${upcomingOrders.length} upcoming pre-orders (within ${reminderMinutes} minutes)`);

    // Gửi WebSocket notifications
    if (webSocketService) {
      for (const order of upcomingOrders) {
        const minutesUntil = Math.round((new Date(order.scheduledTime) - now) / (60 * 1000));
        
        // Broadcast to all admins
        webSocketService.broadcastToAllAdmins("preorder:upcoming_reminder", {
          order,
          minutesUntil,
          message: `Đơn đặt trước sắp đến giờ (còn ${minutesUntil} phút)`
        });

        // Broadcast to waiters if order is approved
        if (order.waiterResponse.status === "approved") {
          webSocketService.broadcastToAllWaiters("preorder:upcoming_reminder", {
            order,
            minutesUntil,
            message: `Đơn đặt trước sắp đến giờ (còn ${minutesUntil} phút)`
          });
        }
      }
    }

    return upcomingOrders;
  } catch (error) {
    console.error("❌ Error in checkUpcomingPreOrders:", error);
    return [];
  }
}

module.exports = { checkUpcomingPreOrders };

