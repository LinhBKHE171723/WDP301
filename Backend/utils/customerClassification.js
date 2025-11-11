const Order = require("../models/Order");
const Feedback = require("../models/Feedback");
const User = require("../models/User");

/**
 * Phân loại khách hàng dựa trên hành vi thực tế
 * @param {String} userId - ID của khách hàng
 * @param {Object} options - Tùy chọn: { fromDate, toDate, minOrders }
 * @returns {Object} { category, score, metrics }
 * 
 * Category: 'vip' | 'normal' | 'bad'
 */
async function classifyCustomer(userId, options = {}) {
  const { fromDate, toDate, minOrders = 3 } = options;
  
  // 1. Lấy tất cả orders của khách hàng
  const orderQuery = {
    userId: userId
  };
  // Chỉ thêm filter createdAt nếu có cả fromDate và toDate
  if (fromDate && toDate) {
    orderQuery.createdAt = { $gte: fromDate, $lte: toDate };
  }
  const allOrders = await Order.find(orderQuery).sort({ createdAt: 1 });
  
  if (allOrders.length < minOrders) {
    return {
      category: 'normal',
      score: 0,
      metrics: {
        orderCount: allOrders.length,
        reason: 'Chưa đủ số đơn để đánh giá'
      }
    };
  }

  // 2. Tính các metrics
  const paidOrders = allOrders.filter(o => o.status === 'paid');
  const cancelledOrders = allOrders.filter(o => o.status === 'cancelled');
  
  const totalSpent = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const orderCount = allOrders.length;
  const paidCount = paidOrders.length;
  const cancelledCount = cancelledOrders.length;
  const cancelRate = orderCount > 0 ? (cancelledCount / orderCount) * 100 : 0;
  
  // 3. Tính tần suất ghé thăm (orders/tháng)
  const firstOrder = allOrders[0];
  const lastOrder = allOrders[allOrders.length - 1];
  const daysDiff = (lastOrder.createdAt - firstOrder.createdAt) / (1000 * 60 * 60 * 24);
  
  let visitFrequency = 0;
  if (daysDiff <= 0 || daysDiff < 30) {
    // Nếu khoảng thời gian quá ngắn (< 30 ngày) hoặc chỉ có 1 đơn (daysDiff = 0)
    // Tính frequency như thể đã dùng ít nhất 1 tháng
    // Điều này tránh tần suất quá cao khi khách hàng mới chỉ có vài đơn trong thời gian ngắn
    visitFrequency = orderCount / 1; // Tính như thể đã trải qua 1 tháng
  } else {
    // Nếu đã có đủ thời gian (>= 30 ngày), tính frequency bình thường
    const monthsDiff = daysDiff / 30;
    visitFrequency = monthsDiff > 0 ? orderCount / monthsDiff : 0;
  }
  
  // 4. Lấy feedback
  const feedbacks = await Feedback.find({ userId: userId }).sort({ createdAt: -1 });
  const avgRating = feedbacks.length > 0
    ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
    : null;
  const lowRatingCount = feedbacks.filter(f => f.rating <= 2).length;
  const highRatingCount = feedbacks.filter(f => f.rating >= 4).length;
  
  // 5. Lấy điểm tích lũy
  const user = await User.findById(userId);
  const points = user?.point || 0;
  
  // 6. Tính điểm (score) để phân loại
  let score = 0;
  
  // Điểm từ chi tiêu
  if (totalSpent >= 5000000) score += 30; // >5 triệu
  else if (totalSpent >= 2000000) score += 20; // >2 triệu
  else if (totalSpent >= 1000000) score += 10; // >1 triệu
  
  // Điểm từ tần suất
  if (visitFrequency >= 4) score += 20; // ≥4 lần/tháng
  else if (visitFrequency >= 2) score += 15; // ≥2 lần/tháng
  else if (visitFrequency >= 1) score += 10; // ≥1 lần/tháng
  
  // Điểm từ số lượng orders
  if (orderCount >= 20) score += 15;
  else if (orderCount >= 10) score += 10;
  else if (orderCount >= 5) score += 5;
  
  // Điểm từ feedback
  if (avgRating !== null) {
    if (avgRating >= 4.5) score += 15;
    else if (avgRating >= 4.0) score += 10;
    else if (avgRating >= 3.5) score += 5;
    else if (avgRating <= 2.0) score -= 20; // Trừ điểm nếu rating thấp
  }
  
  // Điểm từ điểm tích lũy
  if (points >= 500) score += 10;
  else if (points >= 200) score += 5;
  
  // Trừ điểm nếu tỷ lệ hủy cao
  if (cancelRate > 30) score -= 30; // Hủy >30%
  else if (cancelRate > 20) score -= 20; // Hủy >20%
  else if (cancelRate > 10) score -= 10; // Hủy >10%
  
  // Trừ điểm nếu có nhiều feedback xấu
  if (lowRatingCount >= 3) score -= 15;
  else if (lowRatingCount >= 2) score -= 10;
  
  // 7. Phân loại
  let category = 'normal';
  let reason = '';
  
  if (score >= 50) {
    category = 'vip';
    reason = 'Khách hàng thân thiết (điểm cao từ chi tiêu, tần suất, feedback tốt)';
  } else if (score <= -20 || cancelRate > 40 || (avgRating !== null && avgRating <= 2.0 && feedbacks.length >= 2)) {
    category = 'bad';
    reason = 'Khách hàng có vấn đề (hủy nhiều, feedback xấu, rating thấp)';
  } else {
    category = 'normal';
    reason = 'Khách hàng bình thường';
  }
  
  return {
    category,
    score,
    metrics: {
      orderCount,
      paidCount,
      cancelledCount,
      cancelRate: cancelRate.toFixed(1) + '%',
      totalSpent,
      visitFrequency: visitFrequency.toFixed(2) + ' lần/tháng',
      avgRating: avgRating ? avgRating.toFixed(1) : 'Chưa có',
      highRatingCount,
      lowRatingCount,
      points,
      reason
    }
  };
}

/**
 * Phân loại tất cả khách hàng
 * @param {Object} options - Tùy chọn filter
 * @returns {Array} Danh sách khách hàng đã phân loại
 */
async function classifyAllCustomers(options = {}) {
  const { fromDate, toDate } = options;
  
  const orderQuery = {
    userId: { $ne: null }
  };
  // Chỉ thêm filter createdAt nếu có cả fromDate và toDate
  if (fromDate && toDate) {
    orderQuery.createdAt = { $gte: fromDate, $lte: toDate };
  }
  
  // Lấy tất cả userId có orders
  const orders = await Order.find(orderQuery).distinct('userId');
  
  const results = [];
  for (const userId of orders) {
    const classification = await classifyCustomer(userId, options);
    const user = await User.findById(userId);
    
    results.push({
      userId,
      name: user?.name,
      email: user?.email,
      phone: user?.phone,
      ...classification
    });
  }
  
  return results;
}

module.exports = {
  classifyCustomer,
  classifyAllCustomers
};

