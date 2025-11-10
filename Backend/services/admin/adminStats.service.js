const Order = require("../../models/Order");
const OrderItem = require("../../models/OrderItem");
const Item = require("../../models/Item");
const Menu = require("../../models/Menu");
const PurchaseOrder = require("../../models/PurchaseOrder");
const mongoose = require("mongoose");

const VN_TZ = "Asia/Ho_Chi_Minh";

/* ----------------- HÀM CẮT THỜI GIAN THEO NGÀY/THÁNG/NĂM ----------------- */
function truncateDate(date, unit) {
  const d = new Date(date);
  switch (unit) {
    case "year":
      d.setMonth(0, 1);
      d.setHours(0, 0, 0, 0);
      break;
    case "month":
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      break;
    case "week":
      const dayOfWeek = d.getDay();
      const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      d.setDate(d.getDate() + distanceToMonday);
      d.setHours(0, 0, 0, 0);
      break;
    case "day":
    default:
      d.setHours(0, 0, 0, 0);
      break;
  }
  return d;
}

const TYPE_TO_TRUNC = {
  daily: {
    unit: "day",
    label: (d) => d.toLocaleDateString("vi-VN"),
  },
  weekly: {
    unit: "week",
    label: (d) => {
      const week = Math.ceil(d.getDate() / 7);
      return `Tuần ${week} - ${d.getMonth() + 1}/${d.getFullYear()}`;
    },
  },
  monthly: {
    unit: "month",
    label: (d) => `${d.getMonth() + 1}/${d.getFullYear()}`,
  },
  yearly: {
    unit: "year",
    label: (d) => `${d.getFullYear()}`,
  },
};

/* -------------------------------------------------------------------------- */
/*                             GET REVENUE STATS                              */
/* -------------------------------------------------------------------------- */
exports.getRevenueStats = async ({ type = "daily", from, to }) => {
  const { fromDate, toDate, conf } = normalizeTimeInputs(type, from, to);

  // 1️⃣ Lấy đơn hàng đã thanh toán kèm orderItems
  const paidOrders = await Order.find({
    status: "paid",
    createdAt: { $gte: fromDate, $lte: toDate },
  }).select("_id createdAt totalAmount orderItems");

  // 2️⃣ Lấy tất cả OrderItem của các đơn hàng đã thanh toán
  const allOrderItemIds = paidOrders.flatMap((order) => order.orderItems);
  const allOrderItems = await OrderItem.find({ _id: { $in: allOrderItemIds } })
    .select("_id expense quantity");

  // 3️⃣ Tạo map để tra cứu OrderItem nhanh theo _id
  const orderItemMap = new Map();
  for (const orderItem of allOrderItems) {
    orderItemMap.set(orderItem._id.toString(), orderItem);
  }

  // 4️⃣ Gom nhóm doanh thu & chi phí theo ngày / tuần / tháng / năm
  const statsByTime = new Map();

  // 👉 Tính doanh thu và chi phí từ các đơn hàng đã thanh toán
  for (const order of paidOrders) {
    const timeBucket = truncateDate(order.createdAt, conf.unit);
    const key = timeBucket.toISOString();

    const current = statsByTime.get(key) || {
      time: timeBucket,
      revenue: 0,
      cost: 0,
      waste: 0,
    };

    // Doanh thu: từ totalAmount của order
    current.revenue += order.totalAmount || 0;

    // Chi phí: tính từ OrderItem.expense (giá vốn tại thời điểm đặt món)
    for (const orderItemId of order.orderItems) {
      const orderItem = orderItemMap.get(orderItemId.toString());
      if (orderItem) {
        const expensePerUnit = orderItem.expense || 0;
        const quantity = orderItem.quantity || 0;
        current.cost += expensePerUnit * quantity;
      }
    }

    statsByTime.set(key, current);
  }

  // 5️⃣ Tính waste từ các PurchaseOrder đã hết hạn trong khoảng thời gian
  const expiredPurchaseOrders = await PurchaseOrder.find({
    status: "expired",
    expiryDate: { $gte: fromDate, $lte: toDate }, // Dựa trên expiryDate
  }).select("expiryDate quantity usedQuantity price");

  for (const po of expiredPurchaseOrders) {
    const remaining = Math.max(po.quantity - po.usedQuantity, 0);
    const wasteAmount = remaining * (po.price || 0);

    if (wasteAmount > 0 && po.expiryDate) {
      const timeBucket = truncateDate(po.expiryDate, conf.unit);
      const key = timeBucket.toISOString();

      const current = statsByTime.get(key) || {
        time: timeBucket,
        revenue: 0,
        cost: 0,
        waste: 0,
      };

      current.waste += wasteAmount;
      statsByTime.set(key, current);
    }
  }

  // 6️⃣ Chuyển map → mảng, tính lợi nhuận
  const rows = Array.from(statsByTime.values())
    .sort((a, b) => a.time - b.time)
    .map((row) => {
      const profit = row.revenue - row.cost - (row.waste || 0);
      const label = conf.label(new Date(row.time));
      return {
        time: row.time.toISOString(),
        timeLabel: label,
        revenue: row.revenue || 0,
        cost: row.cost || 0,
        waste: row.waste || 0,
        profit,
        revenueVND: fmtVND(row.revenue),
        costVND: fmtVND(row.cost),
        wasteVND: fmtVND(row.waste || 0),
        profitVND: fmtVND(profit),
      };
    });

  return rows;
};

/* -------------------------------------------------------------------------- */
/*                                GET TOP ITEMS                               */
/* -------------------------------------------------------------------------- */
exports.getTopItems = async ({ from, to, limit }) => {
  const { fromDate, toDate } = normalizeTimeInputs("daily", from, to);
  // Nếu không có limit, không giới hạn (đặt giá trị rất cao)
  // Nếu có limit, áp dụng giới hạn trong khoảng hợp lý
  const resultLimit = limit === undefined || limit === null || limit === "" 
    ? 10000  // Không giới hạn khi không có tham số
    : clampInt(limit, 10, 5, 1000);  // Cho phép tối đa 1000 items khi có tham số
  const paidOrders = await Order.find({
    status: "paid",
    createdAt: { $gte: fromDate, $lte: toDate },
  });

  if (paidOrders.length === 0) {
    return [];
  }

  const allOrderItemIds = paidOrders.flatMap((order) => order.orderItems);
  const allOrderItems = await OrderItem.find({ _id: { $in: allOrderItemIds } });

  // Debug: Log số lượng order items
  console.log(`[getTopItems] Total OrderItems found: ${allOrderItems.length}`);
  
  // Tách stats cho items và menus (combo)
  const statsByItem = new Map();
  const statsByMenu = new Map();

  let menuCount = 0;
  let itemCount = 0;

  for (const orderItem of allOrderItems) {
    if (!orderItem.itemId) continue;

    // Chuẩn hóa itemId về string để đảm bảo matching chính xác
    const itemId = orderItem.itemId.toString();
    
    // Nhận biết combo: itemType === 'menu' (combo được lưu trong Menu collection)
    // Khi itemType === 'menu', itemId trong OrderItem trỏ đến Menu collection, không phải Item
    // Fallback: nếu có comboItems array thì cũng coi là combo (đề phòng itemType không được set đúng)
    const itemType = (orderItem.itemType || "item").toLowerCase().trim();
    const hasComboItems = orderItem.comboItems && Array.isArray(orderItem.comboItems) && orderItem.comboItems.length > 0;
    const isCombo = itemType === "menu" || hasComboItems;

    // Tính toán stats
    const qty = orderItem.quantity || 0;
    const price = orderItem.price || 0;
    const revenue = qty * price;
    const expensePerUnit = orderItem.expense || 0;
    const expense = expensePerUnit * qty;

    if (isCombo) {
      // Combo/Menu - itemId trỏ đến Menu collection
      menuCount++;
      const currentStats =
        statsByMenu.get(itemId) || { totalQuantity: 0, totalRevenue: 0, totalExpense: 0 };
      currentStats.totalQuantity += qty;
      currentStats.totalRevenue += revenue;
      currentStats.totalExpense += expense;
      statsByMenu.set(itemId, currentStats);
      console.log(`[getTopItems] Found combo OrderItem: itemId=${itemId}, itemName=${orderItem.itemName || 'N/A'}, qty=${qty}, itemType=${orderItem.itemType}`);
    } else {
      // Item đơn lẻ
      itemCount++;
      const currentStats =
        statsByItem.get(itemId) || { totalQuantity: 0, totalRevenue: 0, totalExpense: 0 };
      currentStats.totalQuantity += qty;
      currentStats.totalRevenue += revenue;
      currentStats.totalExpense += expense;
      statsByItem.set(itemId, currentStats);
    }
  }

  console.log(`[getTopItems] Menu items: ${menuCount}, Regular items: ${itemCount}`);
  console.log(`[getTopItems] Unique menu IDs: ${Array.from(statsByMenu.keys()).length}`);
  console.log(`[getTopItems] Unique item IDs: ${Array.from(statsByItem.keys()).length}`);
  
  if (menuCount > 0) {
    console.log(`[getTopItems] Menu IDs in statsByMenu: ${Array.from(statsByMenu.keys()).join(', ')}`);
  }

  // Lấy items và menus từ database
  const itemIds = Array.from(statsByItem.keys());
  const menuIds = Array.from(statsByMenu.keys());
  
  // Convert string IDs to ObjectIds for Mongoose query
  const itemObjectIds = itemIds.length > 0 ? itemIds.map(id => {
    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        return new mongoose.Types.ObjectId(id);
      }
      console.log(`[getTopItems] WARNING: Invalid item ID format: ${id}`);
      return null;
    } catch (err) {
      console.log(`[getTopItems] ERROR converting item ID ${id}:`, err.message);
      return null;
    }
  }).filter(id => id !== null) : [];
  
  const menuObjectIds = menuIds.length > 0 ? menuIds.map(id => {
    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        return new mongoose.Types.ObjectId(id);
      }
      console.log(`[getTopItems] WARNING: Invalid menu ID format: ${id}`);
      return null;
    } catch (err) {
      console.log(`[getTopItems] ERROR converting menu ID ${id}:`, err.message);
      return null;
    }
  }).filter(id => id !== null) : [];
  
  console.log(`[getTopItems] Converted ${menuObjectIds.length} menu IDs to ObjectIds (from ${menuIds.length} original)`);
  
  const items = itemObjectIds.length > 0 ? await Item.find({ _id: { $in: itemObjectIds } }) : [];
  const menus = menuObjectIds.length > 0 ? await Menu.find({ _id: { $in: menuObjectIds } }) : [];
  
  console.log(`[getTopItems] Found ${items.length} items and ${menus.length} menus in database`);
  if (menuIds.length > 0) {
    console.log(`[getTopItems] Looking for menus with IDs: ${menuIds.join(', ')}`);
    if (menus.length === 0 && menuIds.length > 0) {
      console.log(`[getTopItems] WARNING: No menus found but ${menuIds.length} menu IDs in stats!`);
    }
  }

  const finalResults = [];

  // Xử lý items
  for (const item of items) {
    const itemId = item._id.toString();
    const stats = statsByItem.get(itemId);

    if (stats) {
      const totalExpense = stats.totalExpense;
      const totalProfit = stats.totalRevenue - totalExpense;
      finalResults.push({
        _id: item._id,
        name: item.name,
        category: item.category || "Khác",
        totalQuantity: stats.totalQuantity,
        totalRevenue: stats.totalRevenue,
        totalExpense: totalExpense,
        totalProfit: totalProfit,
      });
    }
  }

  // Xử lý menus (combo)
  // Tạo map để dễ dàng lookup stats bằng menuId (chuẩn hóa về string)
  const menuStatsMap = new Map();
  for (const [menuIdStr, stats] of statsByMenu.entries()) {
    // Chuẩn hóa key về string để dễ match
    const normalizedKey = typeof menuIdStr === 'string' ? menuIdStr : menuIdStr.toString();
    menuStatsMap.set(normalizedKey, stats);
  }

  console.log(`[getTopItems] Processing ${menus.length} menus from database`);
  console.log(`[getTopItems] Menu IDs in stats: ${Array.from(statsByMenu.keys()).join(', ')}`);

  for (const menu of menus) {
    const menuIdStr = menu._id.toString();
    // Thử match với cả string ID và ObjectId
    let stats = menuStatsMap.get(menuIdStr);
    
    // Nếu không tìm thấy, thử tìm với các format khác
    if (!stats) {
      // Thử tìm với ObjectId trực tiếp
      for (const [key, value] of statsByMenu.entries()) {
        const keyStr = typeof key === 'string' ? key : key.toString();
        if (keyStr === menuIdStr || (mongoose.Types.ObjectId.isValid(keyStr) && new mongoose.Types.ObjectId(keyStr).toString() === menuIdStr)) {
          stats = value;
          break;
        }
      }
    }

    if (stats) {
      const totalExpense = stats.totalExpense;
      const totalProfit = stats.totalRevenue - totalExpense;
      console.log(`[getTopItems] Adding combo: ${menu.name}, Qty: ${stats.totalQuantity}, Revenue: ${stats.totalRevenue}, Profit: ${totalProfit}`);
      finalResults.push({
        _id: menu._id,
        name: menu.name,
        category: "Combo", // Đặt category là "Combo" cho tất cả menu
        totalQuantity: stats.totalQuantity,
        totalRevenue: stats.totalRevenue,
        totalExpense: totalExpense,
        totalProfit: totalProfit,
      });
    } else {
      console.log(`[getTopItems] WARNING: Menu ${menu.name} (${menuIdStr}) found in DB but no stats found`);
      console.log(`[getTopItems] Available menu IDs in stats: ${Array.from(statsByMenu.keys()).join(', ')}`);
    }
  }
  
  // Kiểm tra nếu có menuIds nhưng không tìm thấy trong DB
  // Có thể combo được lưu với itemId nhưng không tồn tại trong Menu collection
  // Trong trường hợp này, tạo combo từ OrderItem data
  if (menuIds.length > 0) {
    // Lấy danh sách menu IDs đã được xử lý
    const processedMenuIds = new Set(menus.map(m => m._id.toString()));
    
    // Tìm các menu IDs chưa được xử lý
    const unprocessedMenuIds = menuIds.filter(id => !processedMenuIds.has(id));
    
    if (unprocessedMenuIds.length > 0) {
      console.log(`[getTopItems] Found ${unprocessedMenuIds.length} menu IDs not in database, trying to find manually or create from OrderItem data`);
      
      // Thử tìm menu với ObjectId từng cái một
      for (const menuIdStr of unprocessedMenuIds) {
        try {
          // Thử tìm với ObjectId
          let menu = null;
          if (mongoose.Types.ObjectId.isValid(menuIdStr)) {
            menu = await Menu.findById(menuIdStr);
          }
          
          if (menu) {
            console.log(`[getTopItems] Found menu manually: ${menu.name} (${menuIdStr})`);
            const stats = statsByMenu.get(menuIdStr);
            if (stats) {
              const totalExpense = stats.totalExpense;
              const totalProfit = stats.totalRevenue - totalExpense;
              console.log(`[getTopItems] Adding combo manually: ${menu.name}, Qty: ${stats.totalQuantity}, Revenue: ${stats.totalRevenue}, Profit: ${totalProfit}`);
              finalResults.push({
                _id: menu._id,
                name: menu.name,
                category: "Combo",
                totalQuantity: stats.totalQuantity,
                totalRevenue: stats.totalRevenue,
                totalExpense: totalExpense,
                totalProfit: totalProfit,
              });
            }
          } else {
            // Nếu không tìm thấy trong Menu collection, tạo combo từ OrderItem data
            // Tìm OrderItem đầu tiên có itemId này và có comboItems
            const sampleOrderItem = allOrderItems.find(oi => 
              oi.itemId && oi.itemId.toString() === menuIdStr &&
              oi.comboItems && Array.isArray(oi.comboItems) && oi.comboItems.length > 0
            );
            
            if (sampleOrderItem) {
              const stats = statsByMenu.get(menuIdStr);
              if (stats) {
                const totalExpense = stats.totalExpense;
                const totalProfit = stats.totalRevenue - totalExpense;
                console.log(`[getTopItems] Creating combo from OrderItem data: ${sampleOrderItem.itemName || menuIdStr}, Qty: ${stats.totalQuantity}, Revenue: ${stats.totalRevenue}, Profit: ${totalProfit}`);
                finalResults.push({
                  _id: sampleOrderItem.itemId, // Sử dụng itemId từ OrderItem
                  name: sampleOrderItem.itemName || "Combo", // Sử dụng itemName từ OrderItem
                  category: "Combo",
                  totalQuantity: stats.totalQuantity,
                  totalRevenue: stats.totalRevenue,
                  totalExpense: totalExpense,
                  totalProfit: totalProfit,
                });
              }
            } else {
              console.log(`[getTopItems] Menu ID ${menuIdStr} not found in Menu collection and no OrderItem with comboItems found`);
            }
          }
        } catch (err) {
          console.log(`[getTopItems] Error finding menu ${menuIdStr}:`, err.message);
        }
      }
    }
  }
  
  // Log tổng kết
  console.log(`[getTopItems] Final results: ${finalResults.length} items (${finalResults.filter(r => r.category === "Combo").length} combos, ${finalResults.filter(r => r.category !== "Combo").length} items)`);

  const sortedResults = finalResults.sort(
    (a, b) => b.totalProfit - a.totalProfit
  );
  return sortedResults.slice(0, resultLimit);
};

/* -------------------------------------------------------------------------- */
/*                               GET TOP STAFF                                */
/* -------------------------------------------------------------------------- */
exports.getTopStaff = async ({ from, to, limit }) => {
  const { fromDate, toDate } = normalizeTimeInputs("daily", from, to);
  const lim = clampInt(limit, 10, 1, 50);
  const OrderItem = require("../../models/OrderItem");
  const Order = require("../../models/Order");

  // Aggregate từ OrderItem thay vì Order
  // Tìm tất cả OrderItems đã served trong khoảng thời gian
  const servedOrderItems = await OrderItem.find({
    status: "served",
    servedBy: { $ne: null }
  }).populate({
    path: "orderId",
    match: {
      status: "paid",
      createdAt: { $gte: fromDate, $lte: toDate }
    },
    select: "totalAmount createdAt"
  });

  // Tìm comboItems đã served
  const servedComboItems = await OrderItem.find({
    "comboItems.status": "served",
    "comboItems.servedBy": { $ne: null },
    orderId: {
      $in: await Order.find({
        status: "paid",
        createdAt: { $gte: fromDate, $lte: toDate }
      }).distinct("_id")
    }
  }).populate({
    path: "orderId",
    select: "totalAmount createdAt"
  });

  // Tạo map để tổng hợp theo waiter
  const waiterMap = new Map();

  // Xử lý OrderItem
  for (const item of servedOrderItems) {
    if (!item.orderId || !item.orderId.totalAmount) continue; // Skip nếu order không match hoặc không có totalAmount
    const waiterId = item.servedBy?.toString();
    if (!waiterId) continue;

    if (!waiterMap.has(waiterId)) {
      waiterMap.set(waiterId, { orderIds: new Set(), itemsCount: 0 });
    }
    waiterMap.get(waiterId).orderIds.add(item.orderId._id.toString());
    waiterMap.get(waiterId).itemsCount += 1;
  }

  // Xử lý comboItems
  for (const item of servedComboItems) {
    if (!item.orderId || !item.orderId.totalAmount) continue;
    if (!item.comboItems || !Array.isArray(item.comboItems)) continue;

    for (const comboItem of item.comboItems) {
      if (comboItem.status === "served" && comboItem.servedBy) {
        const waiterId = comboItem.servedBy.toString();
        if (!waiterMap.has(waiterId)) {
          waiterMap.set(waiterId, { orderIds: new Set(), itemsCount: 0 });
        }
        waiterMap.get(waiterId).orderIds.add(item.orderId._id.toString());
        waiterMap.get(waiterId).itemsCount += 1;
      }
    }
  }

  // Tính revenue cho mỗi waiter
  const results = await Promise.all(
    Array.from(waiterMap.entries()).map(async ([waiterId, data]) => {
      const orderIds = Array.from(data.orderIds);
      const orders = await Order.find({
        _id: { $in: orderIds },
        status: "paid",
        createdAt: { $gte: fromDate, $lte: toDate }
      }).select("totalAmount");

      const revenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const user = await require("../../models/User").findById(waiterId).select("name email");

      return {
        staffId: waiterId,
        staffName: user?.name || null,
        staffEmail: user?.email || null,
        orders: orderIds.length,
        revenue: revenue,
        itemsCount: data.itemsCount
      };
    })
  );

  // Sắp xếp và limit
  results.sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);
  const topResults = results.slice(0, lim);

  return topResults.map((r) => ({
    ...r,
    revenueVND: fmtVND(r.revenue || 0),
  }));
};

/* -------------------------------------------------------------------------- */
/*                      GET ITEMS SALES BY TIME PERIOD                         */
/* -------------------------------------------------------------------------- */
exports.getItemsSalesByTimePeriod = async ({ type = "daily", from, to, topN = 10, itemIds = null }) => {
  const { fromDate, toDate, conf } = normalizeTimeInputs(type, from, to);
  // Nếu topN >= 1000, coi như yêu cầu lấy tất cả (dùng cho fetch available items)
  // Nếu không, giới hạn trong khoảng hợp lý (5-100)
  const topCount = topN >= 1000 ? 100000 : clampInt(topN, 10, 5, 100);
  
  // Xử lý itemIds - có thể là string (comma-separated) hoặc array
  let selectedItemIds = null;
  if (itemIds) {
    if (typeof itemIds === 'string') {
      selectedItemIds = itemIds.split(',').filter(id => id.trim()).map(id => id.trim());
    } else if (Array.isArray(itemIds)) {
      selectedItemIds = itemIds.filter(id => id);
    }
    // Convert to ObjectIds nếu hợp lệ
    if (selectedItemIds && selectedItemIds.length > 0) {
      selectedItemIds = selectedItemIds
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));
    }
  }

  // Lấy tất cả đơn hàng đã thanh toán trong khoảng thời gian
  const paidOrders = await Order.find({
    status: "paid",
    createdAt: { $gte: fromDate, $lte: toDate },
  });

  if (paidOrders.length === 0) {
    return [];
  }

  // Lấy tất cả OrderItems và populate orderId để lấy createdAt
  const allOrderItemIds = paidOrders.flatMap((order) => order.orderItems);
  const allOrderItems = await OrderItem.find({ _id: { $in: allOrderItemIds } })
    .populate("orderId", "createdAt");

  // Map để lưu trữ stats theo thời gian và item
  // Structure: Map<timeKey, Map<itemId, { name, quantity, revenue }>>
  const statsByTimeAndItem = new Map();

  // Populate item và menu names
  const itemIdsSet = new Set();
  const menuIdsSet = new Set();

  for (const orderItem of allOrderItems) {
    if (!orderItem.itemId) continue;
    const itemId = orderItem.itemId.toString();
    const itemType = (orderItem.itemType || "item").toLowerCase().trim();
    const hasComboItems = orderItem.comboItems && Array.isArray(orderItem.comboItems) && orderItem.comboItems.length > 0;
    const isCombo = itemType === "menu" || hasComboItems;

    if (isCombo) {
      menuIdsSet.add(itemId);
      console.log(`[getItemsSalesByTimePeriod] Found combo: itemId=${itemId}, itemName=${orderItem.itemName || 'N/A'}, itemType=${orderItem.itemType}`);
    } else {
      itemIdsSet.add(itemId);
    }
  }
  
  console.log(`[getItemsSalesByTimePeriod] Total items: ${itemIdsSet.size}, Total combos: ${menuIdsSet.size}`);

  // Lấy items và menus từ database
  const itemObjectIds = Array.from(itemIdsSet).filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
  const menuObjectIds = Array.from(menuIdsSet).filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));

  const items = itemObjectIds.length > 0 ? await Item.find({ _id: { $in: itemObjectIds } }) : [];
  const menus = menuObjectIds.length > 0 ? await Menu.find({ _id: { $in: menuObjectIds } }) : [];

  console.log(`[getItemsSalesByTimePeriod] Found ${items.length} items and ${menus.length} menus in database`);

  // Tạo map để tra cứu tên nhanh
  const itemNameMap = new Map();
  for (const item of items) {
    itemNameMap.set(item._id.toString(), item.name);
  }
  for (const menu of menus) {
    itemNameMap.set(menu._id.toString(), menu.name);
    console.log(`[getItemsSalesByTimePeriod] Added combo to map: ${menu.name} (${menu._id})`);
  }

  // Xử lý từng orderItem và nhóm theo thời gian
  for (const orderItem of allOrderItems) {
    if (!orderItem.itemId || !orderItem.orderId) continue;

    const order = orderItem.orderId;
    if (!order || !order.createdAt) continue;

    const timeBucket = truncateDate(order.createdAt, conf.unit);
    const timeKey = timeBucket.toISOString();
    const itemId = orderItem.itemId.toString();

    // Lấy hoặc tạo map cho khoảng thời gian này
    if (!statsByTimeAndItem.has(timeKey)) {
      statsByTimeAndItem.set(timeKey, new Map());
    }
    const itemsMap = statsByTimeAndItem.get(timeKey);

    // Lấy hoặc tạo stats cho item này trong khoảng thời gian này
    if (!itemsMap.has(itemId)) {
      const itemName = itemNameMap.get(itemId) || orderItem.itemName || "Không rõ";
      // Lưu cả _id để có thể filter sau này (luôn lưu dạng string để dễ so sánh)
      const itemObjId = mongoose.Types.ObjectId.isValid(itemId) ? itemId : null;
      itemsMap.set(itemId, {
        _id: itemObjId, // Lưu dạng string thay vì ObjectId
        name: itemName,
        quantity: 0,
        revenue: 0,
      });
      
      // Log để debug combo
      if (itemName.includes("Combo") || itemName.includes("combo")) {
        console.log(`[getItemsSalesByTimePeriod] Setting up combo in stats: ${itemName} (${itemId})`);
      }
    }

    const stats = itemsMap.get(itemId);
    const qty = orderItem.quantity || 0;
    const price = orderItem.price || 0;
    stats.quantity += qty;
    stats.revenue += qty * price;
  }

  // Nếu không có selectedItemIds, tính top N items dựa trên tổng quantity trong toàn bộ khoảng thời gian
  let topNItemIds = null;
  if (!selectedItemIds || selectedItemIds.length === 0) {
    // Tính tổng quantity cho mỗi item trong toàn bộ khoảng thời gian
    const totalQuantityByItem = new Map();
    for (const [timeKey, itemsMap] of statsByTimeAndItem.entries()) {
      for (const [itemIdStr, item] of itemsMap.entries()) {
        const currentTotal = totalQuantityByItem.get(itemIdStr) || 0;
        totalQuantityByItem.set(itemIdStr, currentTotal + item.quantity);
      }
    }
    
    // Sắp xếp và lấy top N itemIds
    const sortedItems = Array.from(totalQuantityByItem.entries())
      .sort((a, b) => b[1] - a[1]) // Sắp xếp theo tổng quantity giảm dần
      .slice(0, topCount); // Lấy top N
    
    topNItemIds = sortedItems.map(([itemIdStr]) => itemIdStr);
  }

  // Chuyển đổi sang format output và filter/lấy items
  const result = [];
  for (const [timeKey, itemsMap] of statsByTimeAndItem.entries()) {
    const timeBucket = new Date(timeKey);
    let itemsArray = Array.from(itemsMap.values());
    
    // Nếu có selectedItemIds, filter theo đó
    if (selectedItemIds && selectedItemIds.length > 0) {
      // Convert itemsMap entries to array với itemId
      const itemsWithId = Array.from(itemsMap.entries()).map(([itemIdStr, item]) => ({
        ...item,
        _id: item._id ? item._id.toString() : (mongoose.Types.ObjectId.isValid(itemIdStr) ? itemIdStr : null),
        itemId: itemIdStr, // Lưu itemId string để filter
      }));
      
      itemsArray = itemsWithId.filter(item => {
        return selectedItemIds.some(selectedId => selectedId.toString() === item.itemId);
      }).map(({ itemId, ...rest }) => rest); // Bỏ itemId khỏi output nhưng giữ _id
    } else if (topNItemIds && topNItemIds.length > 0) {
      // Filter theo top N items đã tính toán
      const itemsWithId = Array.from(itemsMap.entries()).map(([itemIdStr, item]) => ({
        ...item,
        _id: item._id ? item._id.toString() : (mongoose.Types.ObjectId.isValid(itemIdStr) ? itemIdStr : null),
        itemId: itemIdStr, // Lưu itemId string để filter
      }));
      
      itemsArray = itemsWithId.filter(item => {
        return topNItemIds.includes(item.itemId);
      }).map(({ itemId, ...rest }) => rest); // Bỏ itemId khỏi output nhưng giữ _id
    }
    
    // Sắp xếp lại theo quantity để đảm bảo thứ tự
    itemsArray.sort((a, b) => b.quantity - a.quantity);

    result.push({
      time: timeKey,
      label: conf.label(timeBucket),
      items: itemsArray,
    });
  }

  // Sắp xếp theo thời gian
  result.sort((a, b) => new Date(a.time) - new Date(b.time));

  return result;
};

/* -------------------------------------------------------------------------- */
/*                        GET INGREDIENT WASTE STATS                          */
/* -------------------------------------------------------------------------- */
exports.getIngredientWasteStats = async () => {
  const now = new Date();
  
  // Tính thời gian cho hôm nay
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  
  // Tính thời gian cho tháng này
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  thisMonthStart.setHours(0, 0, 0, 0);
  
  // Tính thời gian cho năm này
  const thisYearStart = new Date(now.getFullYear(), 0, 1);
  thisYearStart.setHours(0, 0, 0, 0);
  
  // Lấy tất cả PurchaseOrder đã hết hạn
  const expiredPurchaseOrders = await PurchaseOrder.find({
    status: "expired"
  }).select("expiryDate quantity usedQuantity price");
  
  let today = 0;
  let thisMonth = 0;
  let thisYear = 0;
  let total = 0;
  
  for (const po of expiredPurchaseOrders) {
    const remaining = Math.max(po.quantity - po.usedQuantity, 0);
    const wasteAmount = remaining * (po.price || 0);
    
    if (wasteAmount > 0 && po.expiryDate) {
      const expiryDate = new Date(po.expiryDate);
      
      total += wasteAmount;
      
      // Kiểm tra năm này
      if (expiryDate >= thisYearStart) {
        thisYear += wasteAmount;
        
        // Kiểm tra tháng này
        if (expiryDate >= thisMonthStart) {
          thisMonth += wasteAmount;
          
          // Kiểm tra hôm nay
          if (expiryDate >= todayStart && expiryDate <= todayEnd) {
            today += wasteAmount;
          }
        }
      }
    }
  }
  
  return {
    today,
    thisMonth,
    thisYear,
    total,
    todayVND: fmtVND(today),
    thisMonthVND: fmtVND(thisMonth),
    thisYearVND: fmtVND(thisYear),
    totalVND: fmtVND(total)
  };
};

/* ------------------------- HÀM HỖ TRỢ ĐỊNH DẠNG ------------------------- */
function normalizeTimeInputs(type, from, to) {
  const conf =
    TYPE_TO_TRUNC[(type || "daily").toLowerCase()] || TYPE_TO_TRUNC.daily;
  const now = new Date();

  let toDate = parseDate(to, now);
  // Set giờ về cuối ngày (23:59:59) để bao gồm tất cả bản ghi trong ngày đó
  toDate.setHours(23, 59, 59, 999);

  const defaultFrom = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  let fromDate = parseDate(from, defaultFrom);
  // Set giờ về đầu ngày (00:00:00) để đảm bảo tính nhất quán
  fromDate.setHours(0, 0, 0, 0);

  return { conf, fromDate, toDate };
}
function parseDate(v, fallback) {
  if (!v) return fallback;
  const d = new Date(v);
  return isNaN(d.getTime()) ? fallback : d;
}

function clampInt(v, defVal, min, max) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return defVal;
  return Math.max(min, Math.min(n, max));
}

function fmtVND(n) {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n || 0);
  } catch {
    return `${(n || 0).toLocaleString("vi-VN")} ₫`;
  }
}

function fmtDateYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
