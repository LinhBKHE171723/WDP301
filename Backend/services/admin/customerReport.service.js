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

  // Lấy TẤT CẢ orders (paid và cancelled) để tính reliability
  const allOrders = await Order.find({
    status: { $in: ["paid", "cancelled"] },
    userId: { $ne: null }, // Chỉ lấy đơn có userId
    createdAt: { $gte: fromDate, $lte: toDate },
  }).populate("userId", "name email phone").sort({ createdAt: 1 }); // Sort để tính firstOrderDate và lastOrderDate

  // ---- BƯỚC 2: NHÓM VÀ TÍNH TOÁN CÁC CHỈ SỐ BẰNG JAVASCRIPT ----

  const customerStats = {}; // Dùng object để nhóm đơn hàng theo userId
  const now = new Date();

  for (const order of allOrders) {
    // Bỏ qua nếu không có thông tin user
    if (!order.userId) continue;

    const userId = order.userId._id.toString();

    // Nếu chưa thấy khách hàng này, khởi tạo thông tin
    if (!customerStats[userId]) {
      customerStats[userId] = {
        userId: order.userId._id,
        name: order.userId.name,
        email: order.userId.email,
        phone: order.userId.phone,
        // Reliability metrics
        totalOrders: 0,
        paidOrders: 0,
        cancelledOrders: 0,
        // Monetary metrics
        totalSpent: 0,
        // Frequency metrics
        firstOrderDate: null,
        lastOrderDate: null,
        // Recency metrics
        lastVisit: null,
      };
    }

    const stats = customerStats[userId];

    // Tính Reliability metrics
    stats.totalOrders += 1;
    if (order.status === "paid") {
      stats.paidOrders += 1;
      stats.totalSpent += order.totalAmount || 0;
      
      // Cập nhật lastVisit (chỉ tính từ paid orders)
      if (!stats.lastVisit || order.createdAt > stats.lastVisit) {
        stats.lastVisit = order.createdAt;
      }
    } else if (order.status === "cancelled") {
      stats.cancelledOrders += 1;
    }

    // Tính Frequency metrics (firstOrderDate và lastOrderDate)
    if (!stats.firstOrderDate || order.createdAt < stats.firstOrderDate) {
      stats.firstOrderDate = order.createdAt;
    }
    if (!stats.lastOrderDate || order.createdAt > stats.lastOrderDate) {
      stats.lastOrderDate = order.createdAt;
    }
  }

  // Chuyển object thành mảng để xử lý
  let customerList = Object.values(customerStats);

  // ---- BƯỚC 3: TÍNH TOÁN CÁC METRICS RFM + RELIABILITY ----

  customerList = customerList.map((customer) => {
    // Reliability: (paidOrders / totalOrders) * 100
    const reliability = customer.totalOrders > 0
      ? parseFloat(((customer.paidOrders / customer.totalOrders) * 100).toFixed(1))
      : 0;

    // Monetary: averageOrderValue
    const averageOrderValue = customer.paidOrders > 0
      ? Math.round(customer.totalSpent / customer.paidOrders)
      : 0;

    // Frequency: frequencyPerMonth
    let frequencyPerMonth = 0;
    if (customer.firstOrderDate && customer.lastOrderDate && customer.paidOrders > 0) {
      const daysDiff = (customer.lastOrderDate - customer.firstOrderDate) / (1000 * 60 * 60 * 24);
      const monthsDiff = daysDiff / 30;
      if (monthsDiff > 0) {
        frequencyPerMonth = parseFloat((customer.paidOrders / monthsDiff).toFixed(1));
      } else {
        // Nếu tất cả orders trong cùng ngày, tính frequency = paidOrders
        frequencyPerMonth = customer.paidOrders;
      }
    }

    // Recency: recencyDays
    const recencyDays = customer.lastVisit
      ? Math.floor((now - customer.lastVisit) / (1000 * 60 * 60 * 24))
      : null;

    return {
      ...customer,
      // Reliability metrics
      reliability,
      // Monetary metrics
      averageOrderValue,
      formattedTotalSpent: fmtVND(customer.totalSpent),
      formattedAverageOrderValue: fmtVND(averageOrderValue),
      // Frequency metrics
      frequencyPerMonth,
      // Recency metrics
      recencyDays: recencyDays !== null ? recencyDays : null,
      formattedLastVisit: customer.lastVisit
        ? customer.lastVisit.toLocaleDateString('vi-VN')
        : 'Chưa có',
      // Existing fields
      orderCount: customer.paidOrders,
    };
  });

  // ---- BƯỚC 4: ÁP DỤNG CÁC BỘ LỌC TÙY CHỌN ----

  if (filters.minSpent) {
    customerList = customerList.filter(
      (c) => c.totalSpent >= parseFloat(filters.minSpent)
    );
  }
  if (filters.minOrders) {
    customerList = customerList.filter(
      (c) => c.paidOrders >= parseInt(filters.minOrders, 10)
    );
  }

  // ---- BƯỚC 5: SẮP XẾP, XẾP HẠNG VÀ TRẢ VỀ KẾT QUẢ ----

  // Sắp xếp theo thứ tự ưu tiên: Reliability > Monetary > Frequency > Recency
  customerList.sort((a, b) => {
    // 1. Reliability (từ cao xuống thấp)
    if (b.reliability !== a.reliability) {
      return b.reliability - a.reliability;
    }
    // 2. Monetary (từ cao xuống thấp)
    if (b.totalSpent !== a.totalSpent) {
      return b.totalSpent - a.totalSpent;
    }
    // 3. Frequency (từ cao xuống thấp)
    if (b.frequencyPerMonth !== a.frequencyPerMonth) {
      return b.frequencyPerMonth - a.frequencyPerMonth;
    }
    // 4. Recency (từ gần đến xa - recencyDays nhỏ hơn = gần hơn)
    if (a.recencyDays === null && b.recencyDays === null) return 0;
    if (a.recencyDays === null) return 1;
    if (b.recencyDays === null) return -1;
    return a.recencyDays - b.recencyDays;
  });

  // Thêm hạng và trả về kết quả
  return customerList.map((customer, index) => ({
    ...customer,
    rank: `Hạng ${index + 1}`,
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