/**
 * @file performance.service.js
 * @description Service để tổng hợp và thống kê hiệu suất nhân viên.
 */

const Order = require("../../models/Order");
const OrderItem = require("../../models/OrderItem");
const User = require("../../models/User");
const Shift = require("../../models/Shift"); // Model chấm công/ca làm việc
const mongoose = require("mongoose");

// ===== HÀM HELPER CHUNG =====

/**
 * Chuẩn hóa đầu vào thời gian (từ ngày, đến ngày).
 * @param {string} from - Ngày bắt đầu (chuỗi ISO hoặc Date)
 * @param {string} to - Ngày kết thúc (chuỗi ISO hoặc Date)
 * @returns {{fromDate: Date, toDate: Date}}
 */
function normalizeTimeInputs(from, to) {
  const now = new Date();
  let toDate = to ? new Date(to) : now;
  // Đặt thời gian về cuối ngày để bao gồm tất cả bản ghi trong ngày
  toDate.setHours(23, 59, 59, 999);

  let fromDate = from
    ? new Date(from)
    : new Date(new Date().setDate(now.getDate() - 30)); // Mặc định là 30 ngày trước
  // Đặt thời gian về đầu ngày
  fromDate.setHours(0, 0, 0, 0);

  return { fromDate, toDate };
}

exports.getWaitersPerformance = async ({ from, to }) => {
  const { fromDate, toDate } = normalizeTimeInputs(from, to);

  // B1: Lấy danh sách tất cả nhân viên phục vụ đang hoạt động
  const waiters = await User.find({ role: "waiter", status: "active" }).select(
    "name email"
  );

  // B2: Tính toán hiệu suất và chuyên cần cho từng người
  const performanceData = await Promise.all(
    waiters.map(async (waiter) => {
      // Tính hiệu suất dựa trên Order
      const orders = await Order.find({
        servedBy: waiter._id,
        status: "paid",
        createdAt: { $gte: fromDate, $lte: toDate },
      });

      const totalRevenue = orders.reduce(
        (sum, order) => sum + (order.totalAmount || 0),
        0
      );
      const orderCount = orders.length;

      // Tính chuyên cần dựa trên Shift/Attendance
      const shifts = await Shift.find({
        userId: waiter._id,
        date: { $gte: fromDate, $lte: toDate },
      });
      
      // (Giả sử bạn có logic để xác định đi muộn)
      const lateCount = shifts.filter(s => s.status === 'checked_in' /* && s.isLate */).length; 
      const daysWorked = shifts.length;

      return {
        employee: waiter,
        performance: {
          totalRevenue,
          orderCount,
          averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
        },
        attendance: {
          daysWorked,
          lateCount,
          // Cần thêm logic để tính ngày vắng
          absentCount: 0, 
        },
      };
    })
  );

  // B3: Sắp xếp theo doanh thu giảm dần
  performanceData.sort((a, b) => b.performance.totalRevenue - a.performance.totalRevenue);

  return performanceData;
};


exports.getChefsPerformance = async ({ from, to }) => {
  const { fromDate, toDate } = normalizeTimeInputs(from, to);

  const chefs = await User.find({ role: 'chef', status: 'active' }).select('name email');

  const performanceData = await Promise.all(
    chefs.map(async (chef) => {
      // Lấy các đơn hàng đã thanh toán
      const paidOrders = await Order.find({
        status: 'paid',
        createdAt: { $gte: fromDate, $lte: toDate },
      }).select('orderItems');

      // Lấy tất cả _id của OrderItem trong đơn hàng
      const allOrderItemIds = paidOrders.flatMap(o => o.orderItems);

      // Đếm số món đã nấu của chef đó
      const itemsCookedCount = await OrderItem.countDocuments({
        assignedChef: chef._id,
        _id: { $in: allOrderItemIds },
      });

      // Chấm công
      const shifts = await Shift.find({
        userId: chef._id,
        date: { $gte: fromDate, $lte: toDate },
      });
      const daysWorked = shifts.length;

      return {
        employee: chef,
        performance: {
          itemsCookedCount,
        },
        attendance: {
          daysWorked,
          absentCount: 0,
        },
      };
    })
  );

  performanceData.sort((a, b) => b.performance.itemsCookedCount - a.performance.itemsCookedCount);

  return performanceData;
};



