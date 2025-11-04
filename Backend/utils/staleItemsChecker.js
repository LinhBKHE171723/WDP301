const { reassignStaleItems } = require("./waiterHelpers");
const Order = require("../models/Order");
const Table = require("../models/Table");

/**
 * Kiểm tra và reassign các món "ready" đã quá lâu, sau đó gửi notifications
 * @param {Object} webSocketService - WebSocket service instance
 * @param {Number} thresholdMinutes - Số phút tối đa cho phép (default: 10)
 */
async function checkAndReassignStaleItems(webSocketService, thresholdMinutes = 10) {
  try {
    const checkStartTime = new Date();
    console.log(`\n⏰ [${checkStartTime.toISOString()}] Starting stale items check (threshold: ${thresholdMinutes} minutes)`);
    
    if (!webSocketService) {
      console.warn("⚠️ WebSocket service not available, skipping stale items check");
      return;
    }

    // Gọi hàm reassign stale items
    const reassignedItems = await reassignStaleItems(thresholdMinutes);

    if (reassignedItems.length === 0) {
      console.log(`ℹ️ No stale items found that need reassignment\n`);
      return; // Không có item nào cần reassign
    }

    console.log(`✅ Found ${reassignedItems.length} stale items to reassign`);

    // Xử lý notifications cho từng item đã được reassign
    for (const item of reassignedItems) {
      try {
        // Lấy thông tin Order và Table
        const order = await Order.findById(item.orderId)
          .populate("tableId", "tableNumber")
          .select("_id tableId");

        const tableNumber = order?.tableId?.tableNumber || order?.tableId?.number || "N/A";

        // Gửi notification cho waiter cũ: đơn quá lâu nên đã đổi
        webSocketService.broadcastToWaiter(item.oldWaiterId, "item:reassigned", {
          type: "item_reassigned",
          message: `Món "${item.itemName}" tại bàn ${tableNumber} đã được chuyển sang ${item.newWaiterName} vì quá 10 phút chưa được phục vụ.`,
          orderId: item.orderId.toString(),
          orderItemId: item.orderItemId.toString(),
          tableNumber: tableNumber,
          itemName: item.itemName,
          newWaiterName: item.newWaiterName,
          ...(item.comboItemIndex !== undefined && { comboItemIndex: item.comboItemIndex }),
        });

        // Gửi notification cho waiter mới: nhận được order như thường
        if (item.itemType === "comboItem") {
          webSocketService.broadcastToWaiter(item.newWaiterId, "item:ready", {
            type: "item_ready",
            message: `Món combo "${item.itemName}" đã sẵn sàng để phục vụ tại bàn ${tableNumber}.`,
            orderId: item.orderId.toString(),
            orderItemId: item.orderItemId.toString(),
            comboItemIndex: item.comboItemIndex,
            tableNumber: tableNumber,
            itemName: item.itemName,
          });
        } else {
          webSocketService.broadcastToWaiter(item.newWaiterId, "item:ready", {
            type: "item_ready",
            message: `Món "${item.itemName}" đã sẵn sàng để phục vụ tại bàn ${tableNumber}.`,
            orderId: item.orderId.toString(),
            orderItemId: item.orderItemId.toString(),
            tableNumber: tableNumber,
            itemName: item.itemName,
          });
        }

        // Broadcast order update để UI refresh
        const fullOrder = await Order.findById(item.orderId)
          .populate({
            path: "orderItems",
            select: "itemName itemType comboItems quantity note status assignedChef servedBy readyAt",
            populate: [
              { path: "assignedChef", select: "name username" },
              { path: "servedBy", select: "name username email" },
            ],
          })
          .populate("tableId")
          .populate("paymentId");

        if (fullOrder) {
          // Populate comboItems servedBy
          if (fullOrder.orderItems) {
            for (const oi of fullOrder.orderItems) {
              if (oi.comboItems && oi.comboItems.length > 0) {
                for (const ci of oi.comboItems) {
                  if (ci.servedBy && typeof ci.servedBy === "string") {
                    const User = require("../models/User");
                    const waiter = await User.findById(ci.servedBy).select("name username email");
                    if (waiter) {
                      ci.servedBy = waiter;
                    }
                  }
                }
              }
            }
          }
          webSocketService.broadcastToOrder(item.orderId, "order:updated", fullOrder);
        }
      } catch (error) {
        console.error(`❌ Error processing notification for reassigned item ${item.orderItemId}:`, error);
      }
    }

    console.log(`✅ Sent notifications for ${reassignedItems.length} reassigned items`);
  } catch (error) {
    console.error("❌ Error in checkAndReassignStaleItems:", error);
  }
}

module.exports = { checkAndReassignStaleItems };

