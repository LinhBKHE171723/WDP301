/**
 * @file performance.controller.js
 * @description Controller để xử lý các yêu cầu liên quan đến hiệu suất nhân viên.
 */

const performanceService = require("../../services/admin/performance.service.js");

/**
 * Lấy thống kê hiệu suất của tất cả nhân viên phục vụ (Waiter).
 */
exports.getWaiterStats = async (req, res) => {
  try {
    // Lấy tham số 'from' và 'to' từ query string của URL
    const { from, to } = req.query;
    const data = await performanceService.getWaitersPerformance({ from, to });
    res.status(200).json({
      success: true,
      message: "Lấy dữ liệu hiệu suất nhân viên phục vụ thành công.",
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Lấy thống kê hiệu suất của tất cả đầu bếp (Chef).
 */
exports.getChefStats = async (req, res) => {
  try {
    const { from, to } = req.query;
    const data = await performanceService.getChefsPerformance({ from, to });
    res.status(200).json({
      success: true,
      message: "Lấy dữ liệu hiệu suất đầu bếp thành công.",
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Lấy thống kê hiệu suất của tất cả thu ngân (Cashier).
 */
exports.getCashierStats = async (req, res) => {
  try {
    const { from, to } = req.query;
    const data = await performanceService.getCashiersPerformance({ from, to });
    res.status(200).json({
      success: true,
      message: "Lấy dữ liệu hiệu suất thu ngân thành công.",
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};