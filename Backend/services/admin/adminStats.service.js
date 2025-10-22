const Order = require("../../models/Order");
const OrderItem = require("../../models/OrderItem");
const Item = require("../../models/Item");
const PurchaseOrder = require("../../models/PurchaseOrder");
const mongoose = require("mongoose");

const VN_TZ = "Asia/Ho_Chi_Minh";

const TYPE_TO_TRUNC = {
  daily: { unit: "day", label: (d) => fmtDateYMD(d) }, // 2025-01-31
  weekly: { unit: "week", label: (d) => isoWeekLabel(d) }, // 2025-W05
  monthly: { unit: "month", label: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` },
  yearly: { unit: "year", label: (d) => `${d.getFullYear()}` },
};

exports.getRevenueStats = async ({ type = "daily", from, to }) => {
  const { fromDate, toDate, conf } = normalizeTimeInputs(type, from, to);

  // === Doanh thu (Order đã thanh toán) ===
  const revenuePipeline = [
    { $match: { status: "paid", createdAt: { $gte: fromDate, $lte: toDate } } },
    {
      $addFields: {
        timeBucket: {
          $dateTrunc: { date: "$createdAt", unit: conf.unit, timezone: VN_TZ },
        },
      },
    },
    {
      $group: {
        _id: "$timeBucket",
        revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
      },
    },
    { $project: { _id: 0, time: "$_id", revenue: 1 } },
  ];

  // === Chi phí (chỉ tính PurchaseOrder còn hạn) ===
  const costPipeline = [
    {
      $match: {
        time: { $gte: fromDate, $lte: toDate },
        status: "valid", // ❗ chỉ tính hàng chưa hết hạn
      },
    },
    {
      $addFields: {
        timeBucket: {
          $dateTrunc: { date: "$time", unit: conf.unit, timezone: VN_TZ },
        },
      },
    },
    {
      $group: {
        _id: "$timeBucket",
        cost: { $sum: { $ifNull: ["$price", 0] } },
      },
    },
    { $project: { _id: 0, time: "$_id", cost: 1 } },
  ];

  // === Thất thoát (PurchaseOrder đã hết hạn) ===
  const wastePipeline = [
    {
      $match: {
        time: { $gte: fromDate, $lte: toDate },
        status: "expired", // ❗ chỉ hàng hết hạn
      },
    },
    {
      $addFields: {
        timeBucket: {
          $dateTrunc: { date: "$time", unit: conf.unit, timezone: VN_TZ },
        },
      },
    },
    {
      $group: {
        _id: "$timeBucket",
        waste: { $sum: { $ifNull: ["$price", 0] } },
      },
    },
    { $project: { _id: 0, time: "$_id", waste: 1 } },
  ];

  // Chạy song song 3 pipeline
  const [revRows, costRows, wasteRows] = await Promise.all([
    Order.aggregate(revenuePipeline),
    PurchaseOrder.aggregate(costPipeline),
    PurchaseOrder.aggregate(wastePipeline),
  ]);

  // Gom nhóm theo thời gian
  const byTime = new Map();

  for (const r of revRows) {
    const k = new Date(r.time).toISOString();
    byTime.set(k, { time: new Date(r.time), revenue: r.revenue || 0, cost: 0, waste: 0 });
  }

  for (const c of costRows) {
    const k = new Date(c.time).toISOString();
    const obj = byTime.get(k) || { time: new Date(c.time), revenue: 0, cost: 0, waste: 0 };
    obj.cost = c.cost || 0;
    byTime.set(k, obj);
  }

  for (const w of wasteRows) {
    const k = new Date(w.time).toISOString();
    const obj = byTime.get(k) || { time: new Date(w.time), revenue: 0, cost: 0, waste: 0 };
    obj.waste = w.waste || 0;
    byTime.set(k, obj);
  }

  // Format lại dữ liệu trả ra
  const rows = Array.from(byTime.values())
    .sort((a, b) => a.time - b.time)
    .map((row) => {
      const profit = (row.revenue || 0) - (row.cost || 0) - (row.waste || 0);
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
        wasteVND: fmtVND(row.waste),
        profitVND: fmtVND(profit),
      };
    });

  return rows;
};


// =================================================================
// HÀM ĐƯỢC VIẾT LẠI BẰNG JAVASCRIPT THUẦN THEO YÊU CẦU
// =================================================================
exports.getTopItems = async ({ from, to, limit }) => {
  // B1: Chuẩn hóa thời gian và giới hạn
  const { fromDate, toDate } = normalizeTimeInputs("daily", from, to);
  const resultLimit = clampInt(limit, 10, 5, 100);

  // B2: Tìm tất cả các Order đã thanh toán trong khoảng thời gian
  const paidOrders = await Order.find({
    status: "paid",
    createdAt: { $gte: fromDate, $lte: toDate },
  });

  if (paidOrders.length === 0) {
    return []; // Trả về mảng rỗng nếu không có đơn hàng
  }

  // B3: Lấy tất cả các ID OrderItem từ các đơn hàng trên
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


// ... các hàm helper ở dưới (normalizeTimeInputs, parseDate, etc.) ...

// ===== Helpers =====

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

function isoWeekLabel(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (d.getUTCDay() + 6) % 7; // 0=Mon..6=Sun
  d.setUTCDate(d.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3) / 7);
  const isoYear = d.getUTCFullYear();
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}