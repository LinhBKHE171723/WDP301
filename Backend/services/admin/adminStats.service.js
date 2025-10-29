const Order = require("../../models/Order");
const OrderItem = require("../../models/OrderItem");
const Item = require("../../models/Item");
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

  // 1️⃣ Lấy đơn hàng đã thanh toán
  const paidOrdersPromise = Order.find({
    status: "paid",
    createdAt: { $gte: fromDate, $lte: toDate },
  }).select("_id createdAt totalAmount");

  // 2️⃣ Lấy phiếu nhập hàng trong khoảng thời gian
  const purchaseOrdersPromise = PurchaseOrder.find({
    time: { $gte: fromDate, $lte: toDate },
  }).populate("ingredientId", "name");

  const [paidOrders, purchaseOrders] = await Promise.all([
    paidOrdersPromise,
    purchaseOrdersPromise,
  ]);

  // 3️⃣ Gom nhóm doanh thu & chi phí theo ngày / tuần / tháng / năm
  const statsByTime = new Map();

  // 👉 Doanh thu: cộng dồn theo ngày tạo đơn hàng
  for (const order of paidOrders) {
    const timeBucket = truncateDate(order.createdAt, conf.unit);
    const key = timeBucket.toISOString();

    const current = statsByTime.get(key) || {
      time: timeBucket,
      revenue: 0,
      cost: 0,
      waste: 0,
    };

    current.revenue += order.totalAmount || 0;
    statsByTime.set(key, current);
  }

  // 👉 Chi phí: cộng dồn tổng giá trị nhập hàng từ PurchaseOrder
  for (const po of purchaseOrders) {
    const timeBucket = truncateDate(po.time, conf.unit);
    const key = timeBucket.toISOString();

    const current = statsByTime.get(key) || {
      time: timeBucket,
      revenue: 0,
      cost: 0,
      waste: 0,
    };

    // ✅ “po.price” ở đây là tổng giá trị nhập của phiếu (đã có sẵn trong DB)
    //    Nếu bạn muốn hiển thị thêm chi tiết nguyên liệu, có thể log ingredientId.name
    current.cost += po.price || 0;

    statsByTime.set(key, current);
  }

  // 4️⃣ Chuyển map → mảng, tính lợi nhuận
  const rows = Array.from(statsByTime.values())
    .sort((a, b) => a.time - b.time)
    .map((row) => {
      const profit = row.revenue - row.cost - row.waste;
      const label = conf.label(new Date(row.time));
      return {
        time: row.time.toISOString(),
        timeLabel: label,
        revenue: row.revenue,
        cost: row.cost,
        waste: row.waste,
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
      statsByItem.get(itemId) || { totalQuantity: 0, totalRevenue: 0 };

    currentStats.totalQuantity += orderItem.quantity;
    currentStats.totalRevenue += orderItem.quantity * orderItem.price;
    statsByItem.set(itemId, currentStats);
  }

  const itemIds = Array.from(statsByItem.keys());
  const items = await Item.find({ _id: { $in: itemIds } });

  const finalResults = [];
  for (const item of items) {
    const itemId = item._id.toString();
    const stats = statsByItem.get(itemId);

    if (stats) {
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

  const sortedResults = finalResults.sort(
    (a, b) => b.totalProfit - a.totalProfit
  );
  return sortedResults.slice(0, resultLimit);
};

/* ------------------------- HÀM HỖ TRỢ ĐỊNH DẠNG ------------------------- */
function normalizeTimeInputs(type, from, to) {
  const conf =
    TYPE_TO_TRUNC[(type || "daily").toLowerCase()] || TYPE_TO_TRUNC.daily;
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
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(n || 0);
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
