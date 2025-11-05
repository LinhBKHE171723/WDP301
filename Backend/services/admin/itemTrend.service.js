const Order = require("../../models/Order");
const OrderItem = require("../../models/OrderItem");
const Item = require("../../models/Item");
const { Types } = require("mongoose");

const TYPE_TO_TRUNC = {
  daily: { unit: "day", label: (d) => d.toLocaleDateString("vi-VN") },
  weekly: {
    unit: "week",
    label: (d) => `Tuần ${Math.ceil(d.getDate() / 7)} - ${d.getMonth() + 1}/${d.getFullYear()}`,
  },
  monthly: { unit: "month", label: (d) => `${d.getMonth() + 1}/${d.getFullYear()}` },
  yearly: { unit: "year", label: (d) => `${d.getFullYear()}` },
};

function truncateDate(date, unit) {
  const d = new Date(date);
  if (unit === "year") d.setMonth(0, 1);
  if (unit === "month") d.setDate(1);
  if (unit === "week") {
    const dayOfWeek = d.getDay();
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    d.setDate(d.getDate() + distanceToMonday);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDate(v, fallback) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? fallback : d;
}

function fmtVND(n) {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n || 0);
  } catch {
    return `${(n || 0).toLocaleString("vi-VN")} ₫`;
  }
}

exports.getItemTrend = async ({ itemId, type = "daily", from, to }) => {
  if (!itemId || !Types.ObjectId.isValid(itemId)) throw new Error("Item ID không hợp lệ.");

  const conf = TYPE_TO_TRUNC[type] || TYPE_TO_TRUNC.daily;
  const toDate = parseDate(to, new Date());
  const fromDate = parseDate(from, new Date(Date.now() - 7 * 86400000));

  const item = await Item.findById(itemId);
  if (!item) throw new Error("Item not found");

  const orders = await Order.find({
    status: { $in: ["paid", "served", "cancelled"] },
    createdAt: { $gte: fromDate, $lte: toDate },
  }).populate("orderItems");

  const statsByTime = new Map();

  for (const order of orders) {
    const timeBucket = truncateDate(order.createdAt, conf.unit);
    const key = timeBucket.toISOString();
    const current = statsByTime.get(key) || {
      time: timeBucket,
      totalQuantity: 0,
      totalRevenue: 0,
      totalExpense: 0,
      totalProfit: 0,
      cancelled: 0,
    };

    // Nếu populate không đầy đủ, fallback lấy trực tiếp trong DB
    const orderItemsList =
      Array.isArray(order.orderItems) && order.orderItems.length
        ? order.orderItems
        : await OrderItem.find({ orderId: order._id });

    for (const oi of orderItemsList) {
      const orderItem =
        typeof oi === "object" && oi.itemId ? oi : await OrderItem.findById(oi);
      if (!orderItem || !orderItem.itemId || orderItem.itemId.toString() !== itemId.toString())
        continue;

      const qty = orderItem.quantity || 0;
      const price = orderItem.price || item.price;
      const expense = orderItem.expense || 0;
      const revenue = qty * price;
      const totalExpense = expense * qty;
      const profit = revenue - totalExpense;

      current.totalQuantity += qty;
      current.totalRevenue += revenue;
      current.totalExpense += totalExpense;
      current.totalProfit += profit;

      // ✅ Đếm số lượng hủy
      if (orderItem.status && orderItem.status.toLowerCase() === "cancelled") {
        current.cancelled += qty;
      }
    }

    statsByTime.set(key, current);
  }

  const trend = Array.from(statsByTime.values())
    .sort((a, b) => a.time - b.time)
    .map((row) => ({
      time: row.time.toISOString(),
      label: conf.label(row.time),
      totalQuantity: row.totalQuantity,
      totalRevenue: row.totalRevenue,
      totalExpense: row.totalExpense,
      totalProfit: row.totalProfit,
      cancelled: row.cancelled,
      cancellationRate:
        row.totalQuantity === 0 ? 0 : (row.cancelled / row.totalQuantity) * 100,
      formattedRevenue: fmtVND(row.totalRevenue),
      formattedExpense: fmtVND(row.totalExpense),
      formattedProfit: fmtVND(row.totalProfit),
    }));

  const totalQuantity = trend.reduce((s, t) => s + t.totalQuantity, 0);
  const totalRevenue = trend.reduce((s, t) => s + t.totalRevenue, 0);
  const totalExpense = trend.reduce((s, t) => s + t.totalExpense, 0);
  const totalProfit = trend.reduce((s, t) => s + t.totalProfit, 0);
  const totalCancelled = trend.reduce((s, t) => s + (t.cancelled || 0), 0);

  const summary = {
    totalQuantity,
    totalRevenue,
    totalExpense,
    totalProfit,
    totalCancelled,
    cancellationRate: totalQuantity === 0 ? 0 : (totalCancelled / totalQuantity) * 100,
    formattedRevenue: fmtVND(totalRevenue),
    formattedExpense: fmtVND(totalExpense),
    formattedProfit: fmtVND(totalProfit),
  };

  return { summary, trend };
};
