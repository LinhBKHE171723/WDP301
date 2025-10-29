const Order = require("../../models/Order");
const OrderItem = require("../../models/OrderItem");
const Item = require("../../models/Item");
const { Types } = require("mongoose");

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

function truncateDate(date, unit) {
  const d = new Date(date);
  switch (unit) {
    case "year": d.setMonth(0, 1); break;
    case "month": d.setDate(1); break;
    case "week":
      const dayOfWeek = d.getDay();
      const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      d.setDate(d.getDate() + distanceToMonday);
      break;
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtVND(n) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n || 0);
}

/* -------------------------------------------------------------------------- */
/*                              GET ITEM TREND                                */
/* -------------------------------------------------------------------------- */
exports.getItemTrend = async ({ itemId, type = "daily", from, to }) => {
  if (!Types.ObjectId.isValid(itemId)) {
    throw new Error("Invalid itemId");
  }

  const conf = TYPE_TO_TRUNC[type] || TYPE_TO_TRUNC.daily;
  const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 86400000);
  const toDate = to ? new Date(to) : new Date();

  // 1️⃣ Lấy item + giá vốn (expense) & nguyên liệu hiện tại
  const item = await Item.findById(itemId).populate({
    path: "ingredients.ingredient",
    select: "priceNow name unit"
  });

  if (!item) throw new Error("Item not found");

  // 2️⃣ Lấy toàn bộ Order chứa món này trong khoảng thời gian
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
      serviceTimes: [],
    };

    // Duyệt các orderItem trong đơn
    for (const orderItemId of order.orderItems) {
      const orderItem = await OrderItem.findById(orderItemId);

      if (!orderItem || !orderItem.itemId || orderItem.itemId.toString() !== itemId.toString())
        continue;

      const qty = orderItem.quantity || 0;
      const price = orderItem.price || item.price;
      const revenue = qty * price;

      // ✅ Tính giá vốn món tại thời điểm đó (dựa trên Ingredient.priceNow)
      let expenseAtTime = 0;
      if (item.ingredients?.length) {
        for (const ing of item.ingredients) {
          const ingDoc = ing.ingredient;
          if (ingDoc && ingDoc.priceNow != null) {
            expenseAtTime += ingDoc.priceNow * ing.quantity;
          }
        }
      }
      const totalExpense = expenseAtTime * qty;

      // ✅ Gộp dữ liệu
      current.totalQuantity += qty;
      current.totalRevenue += revenue;
      current.totalExpense += totalExpense;
      current.totalProfit += revenue - totalExpense;

      if (order.status === "cancelled") current.cancelled += qty;
    }

    statsByTime.set(key, current);
  }

  // 3️⃣ Chuyển map → mảng & tính trung bình
  const trend = Array.from(statsByTime.values())
    .sort((a, b) => a.time - b.time)
    .map((row) => ({
      time: row.time.toISOString(),
      label: conf.label(row.time),
      totalQuantity: row.totalQuantity,
      totalRevenue: row.totalRevenue,
      totalExpense: row.totalExpense,
      totalProfit: row.totalProfit,
      cancellationRate:
        row.totalQuantity === 0 ? 0 : (row.cancelled / row.totalQuantity) * 100,
      formattedRevenue: fmtVND(row.totalRevenue),
      formattedExpense: fmtVND(row.totalExpense),
      formattedProfit: fmtVND(row.totalProfit),
    }));

  // 4️⃣ Tổng kết summary
  const totalQuantity = trend.reduce((s, t) => s + t.totalQuantity, 0);
  const totalRevenue = trend.reduce((s, t) => s + t.totalRevenue, 0);
  const totalExpense = trend.reduce((s, t) => s + t.totalExpense, 0);
  const totalProfit = trend.reduce((s, t) => s + t.totalProfit, 0);
  const totalCancelled = trend.reduce(
    (s, t) => s + (t.cancellationRate / 100) * t.totalQuantity,
    0
  );

  const summary = {
    totalQuantity,
    totalRevenue,
    totalExpense,
    totalProfit,
    totalCancelled,
    cancellationRate:
      totalQuantity === 0 ? 0 : (totalCancelled / totalQuantity) * 100,
    formattedRevenue: fmtVND(totalRevenue),
    formattedExpense: fmtVND(totalExpense),
    formattedProfit: fmtVND(totalProfit),
  };

  return { summary, trend };
};
