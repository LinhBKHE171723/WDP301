const Order = require("../../models/Order");
const OrderItem = require("../../models/OrderItem");
const Item = require("../../models/Item");
const PurchaseOrder = require("../../models/PurchaseOrder");
const mongoose = require("mongoose"); // Thêm import mongoose

const VN_TZ = "Asia/Ho_Chi_Minh";

const TYPE_TO_TRUNC = {
  daily: { unit: "day", label: (d) => fmtDateYMD(d) }, // 2025-01-31
  weekly: { unit: "week", label: (d) => isoWeekLabel(d) }, // 2025-W05
  monthly: { unit: "month", label: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` },
  yearly: { unit: "year", label: (d) => `${d.getFullYear()}` },
};

// ===== Public APIs =====
exports.getRevenueStats = async ({ type = "daily", from, to }) => {
  const { fromDate, toDate, conf } = normalizeTimeInputs(type, from, to);

  const revenuePipeline = [
    { $match: { status: "paid", createdAt: { $gte: fromDate, $lte: toDate } } },
    { $addFields: { timeBucket: { $dateTrunc: { date: "$createdAt", unit: conf.unit, timezone: VN_TZ } } } },
    { $group: { _id: "$timeBucket", revenue: { $sum: { $ifNull: ["$totalAmount", 0] } } } },
    { $project: { _id: 0, time: "$_id", revenue: 1 } },
  ];

  const costPipeline = [
    { $match: { time: { $gte: fromDate, $lte: toDate } } },
    { $addFields: { timeBucket: { $dateTrunc: { date: "$time", unit: conf.unit, timezone: VN_TZ } } } },
    { $group: { _id: "$timeBucket", cost: { $sum: { $ifNull: ["$price", 0] } } } },
    { $project: { _id: 0, time: "$_id", cost: 1 } },
  ];

  const [revRows, costRows] = await Promise.all([
    Order.aggregate(revenuePipeline),
    PurchaseOrder.aggregate(costPipeline),
  ]);

  const byTime = new Map();
  for (const r of revRows) {
    const k = new Date(r.time).toISOString();
    byTime.set(k, { time: new Date(r.time), revenue: r.revenue || 0, cost: 0 });
  }
  for (const c of costRows) {
    const k = new Date(c.time).toISOString();
    const obj = byTime.get(k) || { time: new Date(c.time), revenue: 0, cost: 0 };
    obj.cost = c.cost || 0;
    byTime.set(k, obj);
  }

  const rows = Array.from(byTime.values())
    .sort((a, b) => a.time - b.time)
    .map((row) => {
      const profit = (row.revenue || 0) - (row.cost || 0);
      const label = conf.label(new Date(row.time));
      return {
        time: row.time.toISOString(),
        timeLabel: label,
        revenue: row.revenue || 0,
        cost: row.cost || 0,
        profit,
        revenueVND: fmtVND(row.revenue),
        costVND: fmtVND(row.cost),
        profitVND: fmtVND(profit),
      };
    });

  return rows;
};

// File: services/admin/adminStats.service.js

// ... các hàm khác như getRevenueStats, getTopStaff ...

// HÀM ĐÃ ĐƯỢC SỬA LỖI HOÀN CHỈNH
exports.getTopItems = async ({ from, to, limit }) => {
  // Sử dụng helper để lấy khoảng thời gian chính xác (đã bao gồm cuối ngày)
  const { fromDate, toDate } = normalizeTimeInputs("daily", from, to);
  const resultLimit = clampInt(limit, 10, 5, 100);

  const pipeline = [
    // === BƯỚC 1: Bắt đầu từ collection `Orders` ===
    // Lọc ra các đơn hàng đã thanh toán trong đúng khoảng thời gian
    {
      $match: {
        createdAt: { $gte: fromDate, $lte: toDate },
        status: "paid",
      },
    },

    // === BƯỚC 2: "Mở" mảng orderItems ra ===
    // Biến mỗi ID trong mảng `orderItems` thành một document riêng lẻ
    { $unwind: "$orderItems" },

    // === BƯỚC 3: Gom nhóm theo món ăn để tính tổng số lượng ===
    // Dùng $lookup để lấy thông tin từ collection `orderitems`
    {
      $lookup: {
        from: "orderitems", // Tên collection `OrderItem` trong CSDL
        localField: "orderItems",
        foreignField: "_id",
        as: "orderItemInfo",
      },
    },
    { $unwind: "$orderItemInfo" },

    // Gom nhóm theo itemId để tính tổng số lượng bán được
    {
      $group: {
        _id: "$orderItemInfo.itemId",
        totalQuantity: { $sum: "$orderItemInfo.quantity" },
      },
    },

    // === BƯỚC 4: Lấy thông tin chi tiết của món ăn ===
    // Dùng $lookup để join với collection `items`
    {
      $lookup: {
        from: "items", // Tên collection `Item` trong CSDL
        localField: "_id",
        foreignField: "_id",
        as: "itemDetails",
      },
    },
    { $unwind: "$itemDetails" },

    // === BƯỚC 5: Tính toán và định dạng lại kết quả cuối cùng ===
    {
      $project: {
        _id: "$_id", // Giữ lại ID của món ăn
        name: "$itemDetails.name",
        category: "$itemDetails.category",
        totalQuantity: "$totalQuantity",
        // Tính tổng doanh thu = tổng số lượng * giá món ăn
        totalRevenue: { $multiply: ["$totalQuantity", "$itemDetails.price"] },
      },
    },

    // Sắp xếp theo doanh thu giảm dần
    { $sort: { totalRevenue: -1 } },

    // Giới hạn số lượng kết quả
    { $limit: resultLimit },
  ];

  // Thực thi pipeline trên model `Order`
  const results = await Order.aggregate(pipeline);
  return results;
};


// ... các hàm helper ở dưới (normalizeTimeInputs, parseDate, etc.) ...
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
    revenueVND: fmtVND(r.revenue),
  }));
};

// ===== Helpers =====

// *** HÀM ĐÃ ĐƯỢC SỬA LỖI ***
function normalizeTimeInputs(type, from, to) {
    const conf = TYPE_TO_TRUNC[(type || "daily").toLowerCase()] || TYPE_TO_TRUNC.daily;
    const now = new Date();

    // Lấy ngày kết thúc, nếu không có thì lấy ngày hiện tại
    let toDate = parseDate(to, now);
    // >> SỬA LỖI: Set giờ về cuối ngày (23:59:59) để bao gồm tất cả bản ghi trong ngày đó
    toDate.setHours(23, 59, 59, 999);

    // Lấy ngày bắt đầu, nếu không có thì mặc định lùi 30 ngày
    const defaultFrom = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    let fromDate = parseDate(from, defaultFrom);
    // >> SỬA LỖI: Set giờ về đầu ngày (00:00:00) để đảm bảo tính nhất quán
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