const Order = require("../../models/Order");
const User = require("../../models/User"); // Đảm bảo bạn đã import User model

// ===============================================
// HÀM CHÍNH: LẤY BÁO CÁO KHÁCH HÀNG
// ===============================================

/**
 * Lấy báo cáo khách hàng thân thiết, xử lý bằng JS thuần.
 * @param {object} filters - Các bộ lọc (from, to, minSpent, minOrders).
 * @returns {Array<object>} Danh sách khách hàng đã được xếp hạng.
 */
exports.getCustomerReport = async (filters = {}) => {
  // ---- BƯỚC 1: CHUẨN BỊ VÀ LẤY DỮ LIỆU THÔ ----

  const { fromDate, toDate } = normalizeTimeInputs(filters.from, filters.to);

  // Tìm tất cả đơn hàng đã hoàn thành và có thông tin khách hàng (userId)
  const completedOrders = await Order.find({
    status: { $in: ["paid", "served"] },
    userId: { $ne: null }, // Chỉ lấy đơn có userId
    createdAt: { $gte: fromDate, $lte: toDate },
  }).populate("userId", "name email phone"); // "Join" để lấy thông tin user

  // ---- BƯỚC 2: NHÓM VÀ TÍNH TOÁN CÁC CHỈ SỐ BẰNG JAVASCRIPT ----

  const customerStats = {}; // Dùng object để nhóm đơn hàng theo userId

  for (const order of completedOrders) {
    // Bỏ qua nếu không có thông tin user (dù đã lọc, để chắc chắn)
    if (!order.userId) continue;

    const userId = order.userId._id.toString();

    // Nếu chưa thấy khách hàng này, khởi tạo thông tin
    if (!customerStats[userId]) {
      customerStats[userId] = {
        userId: order.userId._id,
        name: order.userId.name,
        email: order.userId.email,
        phone: order.userId.phone,
        totalSpent: 0,
        orderCount: 0,
        lastVisit: new Date(0), // Khởi tạo ngày rất cũ để so sánh
      };
    }

    // Cộng dồn các chỉ số vào cho khách hàng
    const stats = customerStats[userId];
    stats.totalSpent += order.totalAmount || 0;
    stats.orderCount += 1;
    if (order.createdAt > stats.lastVisit) {
      stats.lastVisit = order.createdAt;
    }
  }

  // Chuyển object thành mảng để dễ dàng filter và sort
  let customerList = Object.values(customerStats);

  // ---- BƯỚC 3: ÁP DỤNG CÁC BỘ LỌC TÙY CHỌN ----

  if (filters.minSpent) {
    customerList = customerList.filter(
      (c) => c.totalSpent >= parseFloat(filters.minSpent)
    );
  }
  if (filters.minOrders) {
    customerList = customerList.filter(
      (c) => c.orderCount >= parseInt(filters.minOrders, 10)
    );
  }

  // ---- BƯỚC 4: SẮP XẾP, XẾP HẠNG VÀ TRẢ VỀ KẾT QUẢ ----

  // Sắp xếp theo tổng chi tiêu từ cao đến thấp
  customerList.sort((a, b) => b.totalSpent - a.totalSpent);

  // Thêm hạng và định dạng lại dữ liệu
  return customerList.map((customer, index) => ({
    ...customer,
    rank: `Hạng ${index + 1}`,
    formattedTotalSpent: fmtVND(customer.totalSpent),
    formattedLastVisit: customer.lastVisit.toLocaleDateString('vi-VN'),
  }));
};

// ===============================================
// CÁC HÀM HỖ TRỢ (Tương tự file itemTrend.service.js)
// ===============================================

function normalizeTimeInputs(from, to) {
  const toDate = to ? new Date(to) : new Date();
  toDate.setHours(23, 59, 59, 999); // Lấy đến cuối ngày `to`

  let fromDate;
  if (from) {
    fromDate = new Date(from);
  } else {
    // Mặc định lấy từ đầu năm nếu không có `from`
    fromDate = new Date(new Date().getFullYear(), 0, 1);
  }
  fromDate.setHours(0, 0, 0, 0); // Lấy từ đầu ngày `from`

  return { fromDate, toDate };
}

function fmtVND(n) {
  if (typeof n !== 'number') return '0 ₫';
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
}