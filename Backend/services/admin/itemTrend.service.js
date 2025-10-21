const Order = require("../../models/Order");
const OrderItem = require("../../models/OrderItem");
const Item = require("../../models/Item"); // Chú ý đường dẫn tương đối
const mongoose = require('mongoose');

// ===============================================
// HÀM CHÍNH (getItemTrend)
// ===============================================

/**
 * Lấy dữ liệu xu hướng hiệu suất của một món ăn cụ thể theo các khoảng thời gian (ngày, tuần, tháng, năm).
 * @param {string} itemId ID của món ăn cần phân tích.
 * @param {('daily'|'weekly'|'monthly'|'yearly')} type Loại phân tích thời gian.
 * @param {string} from Ngày bắt đầu (ISO Date string).
 * @param {string} to Ngày kết thúc (ISO Date string).
 * @returns {Array<Object>} Mảng chứa các điểm dữ liệu xu hướng theo thời gian.
 */
exports.getItemTrend = async ({ itemId, type = "monthly", from, to }) => {
    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
        throw new Error("Item ID không hợp lệ.");
    }

    // 1. Kiểm tra Item và lấy giá để tính doanh thu
    const itemExists = await Item.findById(itemId).select('price');
    if (!itemExists) {
        throw new Error("Không tìm thấy món ăn với Item ID đã cung cấp.");
    }
    
    // 2. Chuẩn hóa đầu vào thời gian
    const { conf, fromDate, toDate } = normalizeTimeInputs(type, from, to);
    const itemObjectId = new mongoose.Types.ObjectId(itemId);
    const itemPrice = itemExists.price || 0;

    // 3. Xây dựng Aggregation Pipeline
    const pipeline = [
        // 1. Lọc OrderItem theo itemId (Bắt buộc phải có)
        { $match: { itemId: itemObjectId } },
        
        // 2. Lookup để lấy thông tin Order
        // CHÚ Ý QUAN TRỌNG: Chúng ta không lọc Order theo thời gian ở đây nữa, 
        // mà sẽ lọc sau khi lookup để đảm bảo dữ liệu đầy đủ.
        { $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: '_id',
            as: 'order',
            pipeline: [
                { $project: { createdAt: 1, status: 1, servedAt: 1 } }
            ]
        }},
        // Flatten mảng 'order'
        { $unwind: "$order" }, 
        
        // 3. Lọc Order theo khoảng thời gian sau khi $unwind
        // Nếu không có Order nào trong khoảng thời gian, pipeline sẽ dừng ở đây.
        { $match: { 
            "order.createdAt": { $gte: fromDate, $lte: toDate } 
        } },

        // 4. Tính toán trạng thái và thời gian phục vụ
        { $addFields: {
            orderStatus: "$order.status", 
            isCancelled: { $eq: ["$order.status", "cancelled"] }, 
            isCompleted: { $in: ["$order.status", ["served", "paid"]] }, 
            timeBucket: { $dateTrunc: { date: "$order.createdAt", unit: conf.unit, timezone: VN_TZ } },
            
            // Tính thời gian phục vụ chỉ khi món đã hoàn tất VÀ có servedAt
            serviceTimeMs: { 
                $cond: {
                    if: { $and: ["$isCompleted", "$order.servedAt"] }, 
                    then: { $subtract: ["$order.servedAt", "$order.createdAt"] }, 
                    else: 0
                } 
            }
        }},
        
        // 5. Nhóm theo timeBucket
        { $group: {
            _id: "$timeBucket",
            totalQuantity: { $sum: "$quantity" }, 
            totalQuantityCancelled: { $sum: { $cond: ["$isCancelled", "$quantity", 0] } }, 
            totalRevenue: { 
                $sum: { 
                    $cond: {
                        if: "$isCompleted", 
                        then: { $multiply: ["$quantity", itemPrice] },
                        else: 0
                    }
                } 
            },
            totalServiceTimeMs: { $sum: "$serviceTimeMs" }, 
            serviceCount: { $sum: { $cond: ["$isCompleted", 1, 0] } } 
        }},
        
        // 6. Tính toán các chỉ số phái sinh
        { $addFields: {
            cancellationRate: {
                $cond: {
                    if: { $gt: ["$totalQuantity", 0] },
                    then: { $multiply: [{ $divide: ["$totalQuantityCancelled", "$totalQuantity"] }, 100] },
                    else: 0
                }
            },
            avgServiceTimeSeconds: {
                $cond: {
                    if: { $gt: ["$serviceCount", 0] },
                    then: { $divide: ["$totalServiceTimeMs", { $multiply: ["$serviceCount", 1000] }] }, 
                    else: 0
                }
            }
        }},

        // 7. Sắp xếp và Định dạng kết quả cuối cùng
        { $sort: { _id: 1 } },
        { $project: {
            _id: 0,
            time: "$_id", 
            totalQuantity: 1,
            totalRevenue: 1,
            totalQuantityCancelled: 1,
            cancellationRate: { $round: ["$cancellationRate", 2] },
            avgServiceTimeMinutes: { $round: [{ $divide: ["$avgServiceTimeSeconds", 60] }, 2] },
        }}
    ];

    const results = await OrderItem.aggregate(pipeline);

    // Xử lý và định dạng kết quả (thêm nhãn thời gian và định dạng VND)
    return results.map(r => ({
        ...r,
        label: conf.label(r.time),
        formattedRevenue: fmtVND(r.totalRevenue),
    }));
};


// ===============================================
// HÀM HỖ TRỢ (ĐÃ TÍCH HỢP)
// ===============================================

const VN_TZ = "Asia/Ho_Chi_Minh";

// Hàm tiện ích: Định dạng ngày thành YYYY-MM-DD
function fmtDateYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// Hàm tiện ích: Trích xuất nhãn tuần ISO (ví dụ: 2025-W05)
function isoWeekLabel(date) {
    const year = date.getFullYear();
    const dateCopy = new Date(date.valueOf());
    // Điều chỉnh để tuần bắt đầu từ Thứ Hai (0=Chủ Nhật, 1=Thứ Hai)
    dateCopy.setDate(dateCopy.getDate() + 4 - (dateCopy.getDay() || 7)); 
    const yearStart = new Date(dateCopy.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((dateCopy - yearStart) / 86400000) + yearStart.getDay() + 1) / 7);
    return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

function parseDate(v, fallback) {
  if (!v) return fallback;
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

const TYPE_TO_TRUNC = {
    daily:  { unit: "day",   label: (d) => fmtDateYMD(d) },
    weekly: { unit: "week",  label: (d) => isoWeekLabel(d) },
    monthly:{ unit: "month", label: (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}` },
    yearly: { unit: "year",  label: (d) => `${d.getFullYear()}` },
};

function normalizeTimeInputs(type, from, to) {
    const conf = TYPE_TO_TRUNC[(type || "daily").toLowerCase()] || TYPE_TO_TRUNC.daily;
    const now = new Date();
    const toDate = parseDate(to, now);
    const defaultFrom = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Mặc định 30 ngày
    const fromDate = parseDate(from, defaultFrom);
    return { conf, fromDate, toDate };
}
