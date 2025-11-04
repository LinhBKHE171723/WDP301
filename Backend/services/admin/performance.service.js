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

  // B1: Lấy danh sách tất cả nhân viên phục vụ (chỉ loại bỏ tài khoản bị banned)
  const waiters = await User.find({ role: "waiter", accountStatus: "active" }).select(
    "name email status accountStatus"
  );

  // B2: Tính toán hiệu suất và chuyên cần cho từng người
  const OrderItem = require("../../models/OrderItem");
  const Payment = require("../../models/Payment");
  
  const performanceData = await Promise.all(
    waiters.map(async (waiter) => {
      // Cách 1: Filter theo Payment.payTime (chính xác nhất - thời gian thanh toán thực tế)
      const paymentsInRange = await Payment.find({
        status: 'paid',
        payTime: { $gte: fromDate, $lte: toDate },
      }).select('orderId');

      const orderIdsFromPayments = paymentsInRange.map(p => p.orderId).filter(id => id != null);

      // Cách 2: Backup - Nếu không có payTime, filter theo Order.updatedAt khi status = 'paid'
      // Lấy các orders có status = 'paid' và updatedAt trong khoảng thời gian
      const paidOrdersByUpdateTime = await Order.find({
        status: 'paid',
        updatedAt: { $gte: fromDate, $lte: toDate },
        _id: { $nin: orderIdsFromPayments }, // Loại bỏ những orders đã có trong payments
      }).select('_id');

      // Gộp orderIds từ cả 2 nguồn
      const allPaidOrderIds = [
        ...orderIdsFromPayments,
        ...paidOrdersByUpdateTime.map(o => o._id)
      ];

      // Tìm tất cả OrderItem mà waiter đã phục vụ (status = "served") trong các orders đã thanh toán
      const servedOrderItems = await OrderItem.find({
        servedBy: waiter._id,
        status: "served",
        orderId: { $in: allPaidOrderIds }
      }).select("orderId");

      // Tìm comboItems mà waiter đã phục vụ
      const servedComboOrderItems = await OrderItem.find({
        "comboItems.servedBy": waiter._id,
        "comboItems.status": "served",
        orderId: { $in: allPaidOrderIds }
      }).select("orderId");

      // Lấy danh sách orderIds unique mà waiter đã tham gia phục vụ
      const waiterOrderIds = [
        ...new Set([
          ...servedOrderItems.map(item => item.orderId.toString()),
          ...servedComboOrderItems.map(item => item.orderId.toString())
        ])
      ].map(id => new mongoose.Types.ObjectId(id));

      // Tính hiệu suất dựa trên các orders mà waiter đã phục vụ ít nhất 1 món
      const orders = await Order.find({
        _id: { $in: waiterOrderIds },
        status: "paid",
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

  // Lấy danh sách tất cả đầu bếp (chỉ loại bỏ tài khoản bị banned)
  const chefs = await User.find({ role: 'chef', accountStatus: 'active' }).select('name email status accountStatus');

  // Lấy Payment model để filter theo payTime
  const Payment = require("../../models/Payment");

  const performanceData = await Promise.all(
    chefs.map(async (chef) => {
      // Cách 1: Filter theo Payment.payTime (chính xác nhất - thời gian thanh toán thực tế)
      const paymentsInRange = await Payment.find({
        status: 'paid',
        payTime: { $gte: fromDate, $lte: toDate },
      }).select('orderId');

      const orderIdsFromPayments = paymentsInRange.map(p => p.orderId).filter(id => id != null);

      // Cách 2: Backup - Nếu không có payTime, filter theo Order.updatedAt khi status = 'paid'
      // Lấy các orders có status = 'paid' và updatedAt trong khoảng thời gian
      const paidOrdersByUpdateTime = await Order.find({
        status: 'paid',
        updatedAt: { $gte: fromDate, $lte: toDate },
        _id: { $nin: orderIdsFromPayments }, // Loại bỏ những orders đã có trong payments
      }).select('_id orderItems');

      // Gộp orderIds từ cả 2 nguồn
      const allPaidOrderIds = [
        ...orderIdsFromPayments,
        ...paidOrdersByUpdateTime.map(o => o._id)
      ];

      // Lấy các đơn hàng đã thanh toán
      const paidOrders = await Order.find({
        _id: { $in: allPaidOrderIds },
        status: 'paid',
      }).select('orderItems');

      // Lấy tất cả _id của OrderItem trong đơn hàng
      const allOrderItemIds = paidOrders.flatMap(o => o.orderItems);

      // Lấy tất cả OrderItems để duyệt và đếm
      const allOrderItems = await OrderItem.find({
        _id: { $in: allOrderItemIds },
      }).select('assignedChef comboItems');

      let itemsCookedCount = 0;

      // Đếm số món đã nấu của chef đó
      for (const orderItem of allOrderItems) {
        // Đếm món đơn: nếu OrderItem có assignedChef là chef này
        if (orderItem.assignedChef && orderItem.assignedChef.toString() === chef._id.toString()) {
          itemsCookedCount += 1;
        }

        // Đếm món trong combo: nếu có comboItems, đếm các món có assignedChef là chef này
        if (orderItem.comboItems && Array.isArray(orderItem.comboItems) && orderItem.comboItems.length > 0) {
          for (const comboItem of orderItem.comboItems) {
            if (comboItem.assignedChef && comboItem.assignedChef.toString() === chef._id.toString()) {
              itemsCookedCount += 1;
            }
          }
        }
      }

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



