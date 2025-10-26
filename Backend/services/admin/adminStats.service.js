const Order = require("../../models/Order");
const OrderItem = require("../../models/OrderItem");
const Item = require("../../models/Item");
const PurchaseOrder = require("../../models/PurchaseOrder");
const mongoose = require("mongoose");

const VN_TZ = "Asia/Ho_Chi_Minh";

function truncateDate(date, unit) {
  // Tạo một bản sao để không thay đổi ngày gốc
  const d = new Date(date);

  switch (unit) {
    case "year":
      d.setMonth(0, 1); // Tháng 1, ngày 1
      d.setHours(0, 0, 0, 0);
      break;
    case "month":
      d.setDate(1); // Ngày đầu tiên của tháng
      d.setHours(0, 0, 0, 0);
      break;
    case "week":
      const dayOfWeek = d.getDay(); // 0=Chủ Nhật, 1=Thứ Hai, ..., 6=Thứ Bảy
      // Lùi về ngày thứ Hai gần nhất
      const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      d.setDate(d.getDate() + distanceToMonday);
      d.setHours(0, 0, 0, 0);
      break;
    case "day":
    default:
      d.setHours(0, 0, 0, 0); // Đầu ngày
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

exports.getRevenueStats = async ({ type = "daily", from, to }) => {
  const { fromDate, toDate, conf } = normalizeTimeInputs(type, from, to);

  const paidOrdersPromise = Order.find({
    status: "paid",
    createdAt: { $gte: fromDate, $lte: toDate },
  });

  const purchaseOrdersPromise = PurchaseOrder.find({
    time: { $gte: fromDate, $lte: toDate },
  });

  // Chạy song song 2 câu lệnh truy vấn để tiết kiệm thời gian
  const [paidOrders, allPurchaseOrders] = await Promise.all([
    paidOrdersPromise,
    purchaseOrdersPromise,
  ]);

  // B3: Gom nhóm và tính toán thủ công bằng JavaScript
  const statsByTime = new Map();

  // Xử lý doanh thu từ các đơn hàng đã thanh toán
  for (const order of paidOrders) {
    const timeBucket = truncateDate(order.createdAt, conf.unit);
    const key = timeBucket.toISOString();

    const currentStats = statsByTime.get(key) || { time: timeBucket, revenue: 0, cost: 0, waste: 0 };
    currentStats.revenue += order.totalAmount || 0;
    statsByTime.set(key, currentStats);
  }

  // Xử lý chi phí và thất thoát từ các đơn nhập hàng
  // Xử lý chi phí từ các đơn nhập hàng
for (const po of allPurchaseOrders) {
  const timeBucket = truncateDate(po.time, conf.unit);
  const key = timeBucket.toISOString();

  const currentStats = statsByTime.get(key) || { time: timeBucket, revenue: 0, cost: 0 };
  
  currentStats.cost += po.price || 0;
  
  statsByTime.set(key, currentStats);
}


  // B4: Định dạng dữ liệu cuối cùng để trả về
  const rows = Array.from(statsByTime.values())
    .sort((a, b) => a.time - b.time) // Sắp xếp theo thứ tự thời gian
    .map((row) => {
      const profit = row.revenue - row.cost - row.waste;
      const label = conf.label(new Date(row.time));
      return {
        time: row.time.toISOString(),
        timeLabel: label,
        revenue: row.revenue,
        cost: row.cost,
        waste: row.waste,
        profit: profit,
        revenueVND: fmtVND(row.revenue),
        costVND: fmtVND(row.cost),
        profitVND: fmtVND(profit),
      };
    });

  return rows;
};


exports.getTopItems = async ({ from, to, limit }) => {
  const { fromDate, toDate } = normalizeTimeInputs("daily", from, to);
  const resultLimit = clampInt(limit, 10, 5, 100);
  const paidOrders = await Order.find({
    status: "paid",
    createdAt: { $gte: fromDate, $lte: toDate },
  });

  if (paidOrders.length === 0) {
    return []; 
  }

  const allOrderItemIds = paidOrders.flatMap(order => order.orderItems);
  const allOrderItems = await OrderItem.find({ _id: { $in: allOrderItemIds } });

  // B4: Gom nhóm thủ công bằng JavaScript để tính số lượng và doanh thu
  const statsByItem = new Map();
  for (const orderItem of allOrderItems) {
    // Bỏ qua nếu orderItem không có itemId (dữ liệu cũ/lỗi)
    if (!orderItem.itemId) continue;

    const itemId = orderItem.itemId.toString();
    const currentStats = statsByItem.get(itemId) || { totalQuantity: 0, totalRevenue: 0 };

    currentStats.totalQuantity += orderItem.quantity;
    // Doanh thu được tính bằng giá bán đã lưu tại thời điểm đặt hàng
    currentStats.totalRevenue += orderItem.quantity * orderItem.price;

    statsByItem.set(itemId, currentStats);
  }

  // B5: Lấy thông tin chi tiết (tên, danh mục, và giá vốn HIỆN TẠI)
  const itemIds = Array.from(statsByItem.keys());
  const items = await Item.find({ _id: { $in: itemIds } });

  // B6: Kết hợp dữ liệu và tính toán các chỉ số cuối cùng
  const finalResults = [];
  for (const item of items) {
    const itemId = item._id.toString();
    const stats = statsByItem.get(itemId);

    if (stats) {
      // Giá vốn được tính bằng giá vốn HIỆN TẠI của món ăn
      const totalExpense = stats.totalQuantity * item.expense;
      const totalProfit = stats.totalRevenue - totalExpense;

      finalResults.push({
        _id: item._id,
        name: item.name,
        category: item.category,
        totalQuantity: stats.totalQuantity,
        totalRevenue: stats.totalRevenue,
        totalExpense: totalExpense,
        totalProfit: totalProfit,
      });
    }
  }

  // B7: Sắp xếp kết quả theo lợi nhuận giảm dần và giới hạn số lượng
  const sortedResults = finalResults.sort((a, b) => b.totalProfit - a.totalProfit);

  return sortedResults.slice(0, resultLimit);
};


function normalizeTimeInputs(type, from, to) {
    const conf = TYPE_TO_TRUNC[(type || "daily").toLowerCase()] || TYPE_TO_TRUNC.daily;
    const now = new Date();

    let toDate = parseDate(to, now);
    toDate.setHours(23, 59, 59, 999);

    const defaultFrom = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    let fromDate = parseDate(from, defaultFrom);
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

