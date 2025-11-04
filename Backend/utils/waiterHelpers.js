// Helper functions for waiter assignment based on workload

const OrderItem = require("../models/OrderItem");
const User = require("../models/User");

/**
 * Tính workload của một waiter (số món "ready" chưa phục vụ mà waiter đó đang phụ trách)
 * @param {String|ObjectId} waiterId - ID của waiter
 * @returns {Number} Số món "ready" chưa served mà waiter đó đang phụ trách
 */
exports.calculateWaiterWorkload = async (waiterId) => {
  try {
    // Đếm OrderItem có status = "ready", servedBy = waiterId
    const itemCount = await OrderItem.countDocuments({
      status: "ready",
      servedBy: waiterId,
    });

    // Đếm comboItems có status = "ready", servedBy = waiterId
    const comboItemCount = await OrderItem.countDocuments({
      "comboItems.status": "ready",
      "comboItems.servedBy": waiterId,
    });

    return itemCount + comboItemCount;
  } catch (error) {
    console.error("Error calculating waiter workload:", error);
    return 0;
  }
};

/**
 * Tính workload cho tất cả active waiters cùng lúc (atomic, tránh race condition)
 * @returns {Array} Mảng { waiterId, workload } đã sắp xếp theo workload tăng dần
 */
const calculateAllWaitersWorkload = async () => {
  try {
    // Lấy tất cả active waiters
    const waiters = await User.find({ role: "waiter", status: "active" }).select("_id");

    if (waiters.length === 0) {
      return [];
    }

    const waiterIds = waiters.map((w) => w._id);

    // Tính workload cho OrderItem (món đơn)
    const itemWorkloads = await OrderItem.aggregate([
      {
        $match: {
          status: "ready",
          servedBy: { $in: waiterIds },
        },
      },
      {
        $group: {
          _id: "$servedBy",
          count: { $sum: 1 },
        },
      },
    ]);

    // Tính workload cho comboItems
    const comboItemWorkloads = await OrderItem.aggregate([
      {
        $match: {
          "comboItems.status": "ready",
          "comboItems.servedBy": { $in: waiterIds },
        },
      },
      {
        $unwind: "$comboItems",
      },
      {
        $match: {
          "comboItems.status": "ready",
          "comboItems.servedBy": { $in: waiterIds },
        },
      },
      {
        $group: {
          _id: "$comboItems.servedBy",
          count: { $sum: 1 },
        },
      },
    ]);

    // Tạo map để tổng hợp workload
    const workloadMap = new Map();

    // Khởi tạo workload = 0 cho tất cả waiters
    waiterIds.forEach((id) => {
      workloadMap.set(id.toString(), 0);
    });

    // Cộng workload từ OrderItem
    itemWorkloads.forEach((item) => {
      const id = item._id?.toString();
      if (id) {
        workloadMap.set(id, (workloadMap.get(id) || 0) + item.count);
      }
    });

    // Cộng workload từ comboItems
    comboItemWorkloads.forEach((item) => {
      const id = item._id?.toString();
      if (id) {
        workloadMap.set(id, (workloadMap.get(id) || 0) + item.count);
      }
    });

    // Chuyển thành array và sắp xếp theo workload tăng dần
    const result = Array.from(workloadMap.entries()).map(([waiterId, workload]) => ({
      waiterId,
      workload,
    }));

    result.sort((a, b) => a.workload - b.workload);

    return result;
  } catch (error) {
    console.error("Error calculating all waiters workload:", error);
    return [];
  }
};

/**
 * Tự động chọn và assign waiter có workload thấp nhất cho một OrderItem
 * @param {String|ObjectId} orderItemId - ID của OrderItem
 * @returns {Object|null} Waiter được assign hoặc null nếu không có waiter active
 */
exports.assignWaiterToItem = async (orderItemId) => {
  try {
    // Kiểm tra OrderItem tồn tại
    const orderItem = await OrderItem.findById(orderItemId);
    if (!orderItem) {
      console.error(`OrderItem ${orderItemId} not found`);
      return null;
    }

    // Kiểm tra status phải là "ready"
    if (orderItem.status !== "ready") {
      console.log(`OrderItem ${orderItemId} status is ${orderItem.status}, not ready. Skipping assignment.`);
      return null;
    }

    // Tính workload cho tất cả waiters
    const workloads = await calculateAllWaitersWorkload();

    if (workloads.length === 0) {
      console.log("No active waiters available. OrderItem will have servedBy = null");
      orderItem.servedBy = null;
      await orderItem.save();
      return null;
    }

    // Chọn waiter có workload thấp nhất
    // Nếu bằng nhau, chọn waiter đầu tiên (có thể random sau)
    const selectedWaiter = workloads[0];

    // Assign waiter
    orderItem.servedBy = selectedWaiter.waiterId;
    await orderItem.save();

    console.log(
      `✅ Assigned waiter ${selectedWaiter.waiterId} to OrderItem ${orderItemId} (workload: ${selectedWaiter.workload})`
    );

    // Populate waiter info để trả về
    const waiter = await User.findById(selectedWaiter.waiterId).select("name username email");
    return waiter;
  } catch (error) {
    console.error(`Error assigning waiter to item ${orderItemId}:`, error);
    return null;
  }
};

/**
 * Tự động chọn và assign waiter có workload thấp nhất cho một comboItem
 * @param {String|ObjectId} orderItemId - ID của OrderItem (combo)
 * @param {Number} comboItemIndex - Index của comboItem trong mảng comboItems
 * @returns {Object|null} Waiter được assign hoặc null nếu không có waiter active
 */
exports.assignWaiterToComboItem = async (orderItemId, comboItemIndex) => {
  try {
    // Kiểm tra OrderItem tồn tại
    const orderItem = await OrderItem.findById(orderItemId);
    if (!orderItem) {
      console.error(`OrderItem ${orderItemId} not found`);
      return null;
    }

    // Kiểm tra comboItemIndex hợp lệ
    if (!orderItem.comboItems || !orderItem.comboItems[comboItemIndex]) {
      console.error(`ComboItem index ${comboItemIndex} not found in OrderItem ${orderItemId}`);
      return null;
    }

    const comboItem = orderItem.comboItems[comboItemIndex];

    // Kiểm tra status phải là "ready"
    if (comboItem.status !== "ready") {
      console.log(
        `ComboItem at index ${comboItemIndex} status is ${comboItem.status}, not ready. Skipping assignment.`
      );
      return null;
    }

    // Tính workload cho tất cả waiters
    const workloads = await calculateAllWaitersWorkload();

    if (workloads.length === 0) {
      console.log("No active waiters available. ComboItem will have servedBy = null");
      orderItem.comboItems[comboItemIndex].servedBy = null;
      await orderItem.save();
      return null;
    }

    // Chọn waiter có workload thấp nhất
    const selectedWaiter = workloads[0];

    // Assign waiter
    orderItem.comboItems[comboItemIndex].servedBy = selectedWaiter.waiterId;
    await orderItem.save();

    console.log(
      `✅ Assigned waiter ${selectedWaiter.waiterId} to ComboItem ${orderItemId}[${comboItemIndex}] (workload: ${selectedWaiter.workload})`
    );

    // Populate waiter info để trả về
    const waiter = await User.findById(selectedWaiter.waiterId).select("name username email");
    return waiter;
  } catch (error) {
    console.error(`Error assigning waiter to combo item ${orderItemId}[${comboItemIndex}]:`, error);
    return null;
  }
};

/**
 * Tự động reassign tất cả món "ready" chưa served của một waiter cho waiter active khác
 * Được gọi khi waiter status chuyển từ "active" → "inactive"
 * @param {String|ObjectId} waiterId - ID của waiter vừa inactive
 * @returns {Number} Số món đã được reassign
 */
exports.reassignWaiterItems = async (waiterId) => {
  try {
    console.log(`🔄 Reassigning items for waiter ${waiterId}`);

    // Tìm tất cả OrderItem có status = "ready", servedBy = waiterId
    const orderItems = await OrderItem.find({
      status: "ready",
      servedBy: waiterId,
    });

    let reassignedCount = 0;

    // Reassign từng OrderItem
    for (const orderItem of orderItems) {
      const assignedWaiter = await exports.assignWaiterToItem(orderItem._id);
      if (assignedWaiter) {
        reassignedCount++;
      }
    }

    // Tìm tất cả OrderItem có comboItems với status = "ready", servedBy = waiterId
    const comboOrderItems = await OrderItem.find({
      "comboItems.status": "ready",
      "comboItems.servedBy": waiterId,
    });

    // Reassign từng comboItem
    for (const orderItem of comboOrderItems) {
      if (orderItem.comboItems && Array.isArray(orderItem.comboItems)) {
        for (let i = 0; i < orderItem.comboItems.length; i++) {
          const comboItem = orderItem.comboItems[i];
          if (
            comboItem.status === "ready" &&
            comboItem.servedBy &&
            comboItem.servedBy.toString() === waiterId.toString()
          ) {
            const assignedWaiter = await exports.assignWaiterToComboItem(orderItem._id, i);
            if (assignedWaiter) {
              reassignedCount++;
            }
          }
        }
      }
    }

    console.log(`✅ Reassigned ${reassignedCount} items for waiter ${waiterId}`);
    return reassignedCount;
  } catch (error) {
    console.error(`Error reassigning items for waiter ${waiterId}:`, error);
    return 0;
  }
};

/**
 * Tự động assign các món "ready" chưa được assign (servedBy = null) cho waiter active
 * Được gọi khi waiter status chuyển từ "inactive" → "active"
 * @param {String|ObjectId} waiterId - ID của waiter vừa active
 * @returns {Number} Số món đã được assign
 */
exports.assignNullItemsToWaiter = async (waiterId) => {
  try {
    // Kiểm tra waiter có active không
    const waiter = await User.findById(waiterId);
    if (!waiter || waiter.role !== "waiter" || waiter.status !== "active") {
      console.log(`Waiter ${waiterId} is not active. Skipping null items assignment.`);
      return 0;
    }

    console.log(`🔄 Assigning null items to waiter ${waiterId}`);

    // Tính workload của waiter này
    const currentWorkload = await exports.calculateWaiterWorkload(waiterId);

    // Tính workload của tất cả waiters
    const workloads = await calculateAllWaitersWorkload();

    // Tìm waiter này trong danh sách workload
    const waiterWorkload = workloads.find((w) => w.waiterId.toString() === waiterId.toString());
    const waiterWorkloadValue = waiterWorkload ? waiterWorkload.workload : currentWorkload;

    // Tìm waiter có workload thấp nhất
    if (workloads.length === 0) {
      console.log("No active waiters found. Cannot assign null items.");
      return 0;
    }

    const minWorkload = workloads[0].workload;
    const minWorkloadWaiters = workloads.filter((w) => w.workload === minWorkload);

    // Nếu waiter này có workload thấp nhất hoặc bằng, assign các món null cho họ
    let assignedCount = 0;

    if (waiterWorkloadValue <= minWorkload) {
      // Tìm tất cả OrderItem có status = "ready", servedBy = null
      const nullItems = await OrderItem.find({
        status: "ready",
        servedBy: null,
      }).limit(10); // Giới hạn để tránh assign quá nhiều cùng lúc

      for (const orderItem of nullItems) {
        orderItem.servedBy = waiterId;
        await orderItem.save();
        assignedCount++;
      }

      // Tìm comboItems có status = "ready", servedBy = null
      const comboOrderItems = await OrderItem.find({
        "comboItems.status": "ready",
        "comboItems.servedBy": null,
      }).limit(10);

      for (const orderItem of comboOrderItems) {
        if (orderItem.comboItems && Array.isArray(orderItem.comboItems)) {
          for (let i = 0; i < orderItem.comboItems.length; i++) {
            const comboItem = orderItem.comboItems[i];
            if (comboItem.status === "ready" && !comboItem.servedBy) {
              orderItem.comboItems[i].servedBy = waiterId;
              await orderItem.save();
              assignedCount++;
              break; // Chỉ assign 1 comboItem mỗi OrderItem để tránh assign quá nhiều
            }
          }
        }
      }
    }

    if (assignedCount > 0) {
      console.log(`✅ Assigned ${assignedCount} null items to waiter ${waiterId}`);
    }

    return assignedCount;
  } catch (error) {
    console.error(`Error assigning null items to waiter ${waiterId}:`, error);
    return 0;
  }
};

/**
 * Tự động reassign các món "ready" đã quá lâu (stale) chưa được phục vụ
 * @param {Number} thresholdMinutes - Số phút tối đa cho phép món "ready" chưa được phục vụ (default: 10)
 * @returns {Array} Danh sách các item đã được reassign với thông tin { itemType, orderItemId, comboItemIndex?, oldWaiterId, newWaiterId }
 */
exports.reassignStaleItems = async (thresholdMinutes = 10) => {
  try {
    const thresholdMs = thresholdMinutes * 60 * 1000;
    const staleThreshold = new Date(Date.now() - thresholdMs);

    console.log(`🔍 Checking for stale items (threshold: ${thresholdMinutes} minutes, staleThreshold: ${staleThreshold.toISOString()})`);

    const reassignedItems = [];

    // Debug: Tìm tất cả OrderItems có status = "ready" và servedBy != null (để so sánh)
    const allReadyItems = await OrderItem.find({
      status: "ready",
      servedBy: { $ne: null },
    }).select("itemName readyAt updatedAt servedBy createdAt");

    console.log(`📋 Total ready items with servedBy: ${allReadyItems.length}`);
    if (allReadyItems.length > 0) {
      allReadyItems.forEach(item => {
        const readyAtStr = item.readyAt ? item.readyAt.toISOString() : 'null';
        const updatedAtStr = item.updatedAt ? item.updatedAt.toISOString() : 'null';
        const ageMinutes = item.readyAt 
          ? Math.round((Date.now() - item.readyAt.getTime()) / 60000)
          : item.updatedAt 
            ? Math.round((Date.now() - item.updatedAt.getTime()) / 60000)
            : 'unknown';
        console.log(`  📦 ${item.itemName || item._id}: readyAt=${readyAtStr}, updatedAt=${updatedAtStr}, age=${ageMinutes}min, servedBy=${item.servedBy}`);
      });
    }

    // Tìm các OrderItem (món đơn) đã ready quá lâu
    // Bao gồm cả items có readyAt = null (items cũ trước khi có feature này)
    const staleOrderItems = await OrderItem.find({
      status: "ready",
      servedBy: { $ne: null },
      $or: [
        { readyAt: { $lt: staleThreshold, $ne: null } },
        { readyAt: null, updatedAt: { $lt: staleThreshold } }, // Items cũ không có readyAt, dùng updatedAt
      ],
    });

    console.log(`📊 Found ${staleOrderItems.length} stale OrderItems (món đơn)`);

    for (const orderItem of staleOrderItems) {
      console.log(`  🔍 Processing stale OrderItem: ${orderItem.itemName || orderItem._id} (readyAt: ${orderItem.readyAt ? orderItem.readyAt.toISOString() : 'null'}, updatedAt: ${orderItem.updatedAt ? orderItem.updatedAt.toISOString() : 'null'}, servedBy: ${orderItem.servedBy})`);
      const oldWaiterId = orderItem.servedBy;
      
      // Reassign
      const newWaiter = await exports.assignWaiterToItem(orderItem._id);
      
      if (newWaiter && newWaiter._id.toString() !== oldWaiterId.toString()) {
        reassignedItems.push({
          itemType: "orderItem",
          orderItemId: orderItem._id,
          orderId: orderItem.orderId,
          itemName: orderItem.itemName,
          oldWaiterId: oldWaiterId,
          newWaiterId: newWaiter._id,
          newWaiterName: newWaiter.name,
        });
        console.log(
          `🔄 Reassigned stale OrderItem ${orderItem._id} from waiter ${oldWaiterId} to ${newWaiter._id}`
        );
      }
    }

    // Tìm các comboItems đã ready quá lâu
    // Lưu ý: MongoDB không support $or trong nested field một cách trực tiếp,
    // nên sẽ filter trong code thay vì trong query
    const staleComboOrderItems = await OrderItem.find({
      "comboItems.status": "ready",
      "comboItems.servedBy": { $ne: null },
    });

    let staleComboCount = 0;

    for (const orderItem of staleComboOrderItems) {
      if (orderItem.comboItems && Array.isArray(orderItem.comboItems)) {
        for (let i = 0; i < orderItem.comboItems.length; i++) {
          const comboItem = orderItem.comboItems[i];
          
          // Kiểm tra nếu comboItem này stale
          // Logic: Nếu có readyAt thì check readyAt < threshold
          // Nếu không có readyAt (items cũ), dùng updatedAt của OrderItem làm fallback
          const isStale = 
            comboItem.status === "ready" &&
            comboItem.servedBy &&
            (
              (comboItem.readyAt && comboItem.readyAt < staleThreshold) ||
              (!comboItem.readyAt && orderItem.updatedAt && orderItem.updatedAt < staleThreshold) // Items cũ: dùng OrderItem.updatedAt
            );
          
          if (isStale) {
            console.log(`  🔍 Found stale comboItem: ${comboItem.itemName || 'N/A'} (readyAt: ${comboItem.readyAt ? comboItem.readyAt.toISOString() : 'null'}, updatedAt: ${orderItem.updatedAt ? orderItem.updatedAt.toISOString() : 'null'})`);
            staleComboCount++;
            const oldWaiterId = comboItem.servedBy;
            
            // Reassign
            const newWaiter = await exports.assignWaiterToComboItem(orderItem._id, i);
            
            if (newWaiter && newWaiter._id.toString() !== oldWaiterId.toString()) {
              reassignedItems.push({
                itemType: "comboItem",
                orderItemId: orderItem._id,
                orderId: orderItem.orderId,
                comboItemIndex: i,
                itemName: comboItem.itemName,
                oldWaiterId: oldWaiterId,
                newWaiterId: newWaiter._id,
                newWaiterName: newWaiter.name,
              });
              console.log(
                `🔄 Reassigned stale ComboItem ${orderItem._id}[${i}] from waiter ${oldWaiterId} to ${newWaiter._id}`
              );
            }
          }
        }
      }
    }

    console.log(`📊 Found ${staleComboCount} stale ComboItems`);

    if (reassignedItems.length > 0) {
      console.log(`✅ Successfully reassigned ${reassignedItems.length} items`);
    } else {
      console.log(`ℹ️ No items needed reassignment`);
    }

    return reassignedItems;
  } catch (error) {
    console.error("Error reassigning stale items:", error);
    return [];
  }
};

