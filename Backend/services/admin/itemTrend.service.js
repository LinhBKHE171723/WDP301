const mongoose = require('mongoose');
const Order = require("../../models/Order");
const Item = require("../../models/Item");

exports.getItemTrend = async ({ itemId, type, from, to }) => {
    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
        throw new Error("Item ID không hợp lệ.");
    }
    const item = await Item.findById(itemId).select('price');
    if (!item) {
        throw new Error("Không tìm thấy món ăn.");
    }
    const itemPrice = item.price || 0;
    const { conf, fromDate, toDate } = normalizeTimeInputs(type, from, to);

    const ordersInDateRange = await Order.find({
        createdAt: { $gte: fromDate, $lte: toDate }
    }).populate('orderItems'); // Lấy kèm các món ăn trong đơn hàng

    const relevantOrderItems = [];
    for (const order of ordersInDateRange) {
        for (const orderItem of order.orderItems) {
            // Chỉ lấy các orderItem của món ăn đang cần phân tích
            if (orderItem.itemId.toString() === itemId) {
                relevantOrderItems.push({
                    ...orderItem.toObject(),
                    orderStatus: order.status,
                    orderCreatedAt: order.createdAt,
                    orderServedAt: order.servedAt,
                });
            }
        }
    }
    
    const groupedData = {};
    for (const orderItem of relevantOrderItems) {
        const timeLabel = conf.label(orderItem.orderCreatedAt);
        // Khởi tạo nhóm nếu chưa tồn tại
        if (!groupedData[timeLabel]) {
            groupedData[timeLabel] = {
                time: orderItem.orderCreatedAt,
                totalQuantity: 0,
                totalRevenue: 0,
                totalQuantityCancelled: 0,
                totalServiceTimeMs: 0,
                completedCount: 0,
            };
        }
        // Cộng dồn dữ liệu vào nhóm tương ứng
        const group = groupedData[timeLabel];
        group.totalQuantity += orderItem.quantity;
        const isCompleted = ["served", "paid"].includes(orderItem.orderStatus);
        if (isCompleted) {
            group.completedCount += 1;
            group.totalRevenue += orderItem.quantity * itemPrice;
            if (orderItem.orderServedAt) {
                const serviceTime = orderItem.orderServedAt.getTime() - orderItem.orderCreatedAt.getTime();
                group.totalServiceTimeMs += serviceTime;
            }
        }
        if (orderItem.orderStatus === "cancelled") {
            group.totalQuantityCancelled += orderItem.quantity;
        }
    }

    const trend = Object.values(groupedData).sort((a, b) => a.time - b.time);
    const summary = calculateSummary(trend);

    // Trả về kết quả cuối cùng cho controller
    return {
        summary: {
            ...summary,
            cancellationRate: parseFloat(
                (summary.totalQuantity > 0 ? (summary.totalQuantityCancelled / summary.totalQuantity) * 100 : 0).toFixed(2)
            ),
            avgServiceTimeMinutes: parseFloat(
                (summary.completedCount > 0 ? (summary.totalServiceTimeMs / summary.completedCount / 60000) : 0).toFixed(2)
            ),
            formattedRevenue: fmtVND(summary.totalRevenue),
        },
        trend: formatTrendData(trend, conf),
    };
};


// Tính toán các chỉ số tổng hợp
function calculateSummary(trendData) {
    return trendData.reduce((acc, current) => {
        acc.totalQuantity += current.totalQuantity;
        acc.totalRevenue += current.totalRevenue;
        acc.totalQuantityCancelled += current.totalQuantityCancelled;
        acc.totalServiceTimeMs += current.totalServiceTimeMs;
        acc.completedCount += current.completedCount;
        return acc;
    }, {
        totalQuantity: 0, totalRevenue: 0, totalQuantityCancelled: 0,
        totalServiceTimeMs: 0, completedCount: 0,
    });
}

// Định dạng dữ liệu trend để trả về cho FE
function formatTrendData(trendData, conf) {
    return trendData.map(item => ({
        time: item.time,
        label: conf.label(item.time),
        totalQuantity: item.totalQuantity,
        totalRevenue: item.totalRevenue,
        formattedRevenue: fmtVND(item.totalRevenue),
        cancellationRate: item.totalQuantity > 0 ? (item.totalQuantityCancelled / item.totalQuantity) * 100 : 0,
        avgServiceTimeMinutes: item.completedCount > 0 ? (item.totalServiceTimeMs / item.completedCount / 60000) : 0, // 60000 ms = 1 min
    }));
}

// Cấu hình nhóm thời gian
const TYPE_CONFIG = {
    monthly: { label: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` },
    daily:   { label: (d) => d.toISOString().split('T')[0] },
    yearly:  { label: (d) => `${d.getFullYear()}` },
};

// Chuẩn hóa đầu vào thời gian
function normalizeTimeInputs(type, from, to) {
    const conf = TYPE_CONFIG[(type || "monthly").toLowerCase()] || TYPE_CONFIG.monthly;
    const toDate = to ? new Date(to) : new Date();
    toDate.setHours(23, 59, 59, 999);
    let fromDate = from ? new Date(from) : new Date(new Date().setDate(toDate.getDate() - 30));
    fromDate.setHours(0, 0, 0, 0);
    return { conf, fromDate, toDate };
}

// Định dạng tiền tệ VND
function fmtVND(n) {
    if (typeof n !== 'number') return '0 ₫';
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
}