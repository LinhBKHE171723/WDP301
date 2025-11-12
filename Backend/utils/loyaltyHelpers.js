const Setting = require("../models/Setting");
const User = require("../models/User");

/**
 * Tính điểm tích lũy từ tổng tiền đơn hàng dựa trên setting
 * @param {Number} totalAmount - Tổng tiền đơn hàng
 * @returns {Number} Số điểm tích lũy
 */
async function calculatePointsEarned(totalAmount) {
  const pointRate = await Setting.getSetting("loyalty.pointRate", 1); // Mặc định 1%
  const points = Math.floor((totalAmount * pointRate) / 100);
  return points;
}

/**
 * Tích điểm cho khách hàng khi đơn hàng được thanh toán
 * @param {String} userId - ID của khách hàng
 * @param {Number} totalAmount - Tổng tiền đơn hàng
 * @returns {Object} { pointsEarned, newTotalPoints }
 */
async function addPointsToCustomer(userId, totalAmount) {
  if (!userId) {
    return { pointsEarned: 0, newTotalPoints: 0 };
  }
  
  const user = await User.findById(userId);
  if (!user || user.role !== "customer") {
    return { pointsEarned: 0, newTotalPoints: 0 };
  }
  
  const pointsEarned = await calculatePointsEarned(totalAmount);
  user.point = (user.point || 0) + pointsEarned;
  await user.save();
  
  return { pointsEarned, newTotalPoints: user.point };
}

/**
 * Lấy rank hiện tại của khách hàng dựa trên điểm
 * @param {Number} points - Tổng điểm tích lũy
 * @returns {Object} Rank object { name, minPoints, discount, label }
 */
async function getCustomerRank(points) {
  const ranksData = await Setting.getSetting("loyalty.ranks", [
    { name: "bronze", minPoints: 0, discount: 0, label: "Đồng" },
    { name: "silver", minPoints: 200, discount: 5, label: "Bạc" },
    { name: "gold", minPoints: 500, discount: 10, label: "Vàng" },
    { name: "platinum", minPoints: 1000, discount: 15, label: "Bạch Kim" },
    { name: "diamond", minPoints: 2000, discount: 20, label: "Kim Cương" }
  ]);
  
  // Validate ranks data
  if (!Array.isArray(ranksData) || ranksData.length === 0) {
    // Return default rank if invalid
    return { name: "bronze", minPoints: 0, discount: 0, label: "Đồng" };
  }
  
  // Sắp xếp theo minPoints giảm dần để tìm rank cao nhất mà khách hàng đạt được
  const sortedRanks = [...ranksData].sort((a, b) => b.minPoints - a.minPoints);
  
  for (const rank of sortedRanks) {
    if (points >= rank.minPoints) {
      return rank;
    }
  }
  
  // Trả về rank thấp nhất nếu không match (shouldn't happen, but safety check)
  return sortedRanks[sortedRanks.length - 1];
}

/**
 * Tính discount tự động dựa trên rank của khách hàng
 * @param {String} userId - ID của khách hàng
 * @param {Number} totalAmount - Tổng tiền đơn hàng (trước discount)
 * @returns {Object} { discount, discountAmount, rank, rankLabel }
 */
async function calculateAutoDiscount(userId, totalAmount) {
  if (!userId) {
    return { discount: 0, discountAmount: 0, rank: null, rankLabel: null };
  }
  
  const user = await User.findById(userId);
  if (!user || user.role !== "customer") {
    return { discount: 0, discountAmount: 0, rank: null, rankLabel: null };
  }
  
  const rank = await getCustomerRank(user.point || 0);
  const discountAmount = Math.floor((totalAmount * rank.discount) / 100);
  
  return {
    discount: rank.discount,
    discountAmount,
    rank: rank.name,
    rankLabel: rank.label
  };
}

module.exports = {
  calculatePointsEarned,
  addPointsToCustomer,
  getCustomerRank,
  calculateAutoDiscount
};

