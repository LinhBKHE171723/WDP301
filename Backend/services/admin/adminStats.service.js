const Order = require("../../models/Order");
const OrderItem = require("../../models/OrderItem");
const Item = require("../../models/Item");
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

  // 5️⃣ Chuyển map → mảng, tính lợi nhuận
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
  const resultLimit = clampInt(limit, 10, 5, 100);
  const paidOrders = await Order.find({
    status: "paid",
    createdAt: { $gte: fromDate, $lte: toDate },
  });

  if (paidOrders.length === 0) {
    return [];
  }

  const allOrderItemIds = paidOrders.flatMap((order) => order.orderItems);
  const allOrderItems = await OrderItem.find({ _id: { $in: allOrderItemIds } });

  const statsByItem = new Map();
  for (const orderItem of allOrderItems) {
    if (!orderItem.itemId) continue;

    const itemId = orderItem.itemId.toString();
    const currentStats =
      statsByItem.get(itemId) || { totalQuantity: 0, totalRevenue: 0, totalExpense: 0 };

    const qty = orderItem.quantity || 0;
    const price = orderItem.price || 0;
    const revenue = qty * price;
    
    // ✅ Dùng expense từ OrderItem (snapshot tại thời điểm đặt món)
    const expensePerUnit = orderItem.expense || 0; // Nếu null thì = 0 (cho orders cũ)
    const expense = expensePerUnit * qty;

    currentStats.totalQuantity += qty;
    currentStats.totalRevenue += revenue;
    currentStats.totalExpense += expense; // Tính tổng expense từ các OrderItem
    statsByItem.set(itemId, currentStats);
  }

  const itemIds = Array.from(statsByItem.keys());
  const items = await Item.find({ _id: { $in: itemIds } });

  const finalResults = [];
  for (const item of items) {
    const itemId = item._id.toString();
    const stats = statsByItem.get(itemId);

    if (stats) {
      // ✅ Expense đã được tính từ OrderItem.expense, không cần dùng item.expense nữa
      const totalExpense = stats.totalExpense; // Đã tính từ orderItem.expense
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

  const pipeline = [
    { $match: { status: "paid", createdAt: { $gte: fromDate, $lte: toDate }, servedBy: { $ne: null } } },
    {
      $group: {
        _id: "$servedBy",
        orders: { $sum: 1 },
        revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
      }
    },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        staffId: "$_id",
        staffName: { $ifNull: ["$user.name", null] },
        staffEmail: { $ifNull: ["$user.email", null] },
        orders: 1,
        revenue: 1,
      }
    },
    { $sort: { revenue: -1, orders: -1 } },
    { $limit: lim },
  ];

  const rows = await Order.aggregate(pipeline);
  return rows.map((r) => ({
    ...r,
    revenueVND: fmtVND(r.revenue || 0),
  }));
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
