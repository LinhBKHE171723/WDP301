const customerReportService = require("../../services/admin/customerReport.service");
const { success, error } = require("../../utils/response");

/**
 * @endpoint GET /api/admin/reports/customers
 * @description Lấy danh sách khách hàng thân thiết đã được xếp hạng.
 */
exports.getCustomerReport = async (req, res) => {
  try {
    // Lấy tất cả các bộ lọc có thể có từ query string
    const filters = {
      from: req.query.from,
      to: req.query.to,
      minSpent: req.query.minSpent,
      minOrders: req.query.minOrders,
    };

    const data = await customerReportService.getCustomerReport(filters);

    return success(res, data);
  } catch (err) {
    console.error("Error in getCustomerReport controller:", err);
    return error(res, err.message || "Có lỗi xảy ra khi xử lý báo cáo khách hàng.");
  }
};