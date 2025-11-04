const itemTrendService = require("../../services/admin/itemTrend.service.js"); // Require service MỚI
const { success, error } = require("../../utils/response"); // Giả định đường dẫn này là đúng
const Item = require("../../models/Item"); // Cần Item model để query món ăn

/**
 * [TEST API] Lấy dữ liệu xu hướng hiệu suất của một món ăn cụ thể.
 * Endpoint: GET /api/admin/test/item-trend?itemId=<ID>&type=monthly&from=...&to=...
 */
exports.getItemTrendStats = async (req, res) => {
    try {
        const { itemId, type = "monthly", from, to } = req.query;
        
        // Gọi hàm xử lý logic từ Service mới
        const data = await itemTrendService.getItemTrend({ itemId, type, from, to });
        
        return success(res, data);
    } catch (err) {
        // Xử lý lỗi (ví dụ: Item ID không hợp lệ/không tồn tại)
        const status = err.message.includes("Không tìm thấy món ăn") || err.message.includes("Item ID không hợp lệ") ? 400 : 500;
        console.error("Lỗi khi test Item Trend Stats:", err.message);
        return error(res, err.message || "Lỗi server khi lấy dữ liệu xu hướng món ăn (Test).", status);
    }
};

/**
 * [TEST API] Lấy danh sách các món ăn đang bán để hiển thị trong select box.
 * Endpoint: GET /api/admin/test/items
 */
exports.listItems = async (req, res) => {
    try {
        // Chỉ trả về _id và name, và chỉ lấy các món đang bán (isAvailable: true)
        // Sắp xếp theo tên để dễ chọn
        const items = await Item.find({ isAvailable: true }).select("_id name").sort("name").lean();
        return success(res, items);
    } catch (err) {
        console.error("Lỗi server khi lấy danh sách Item:", err.message);
        return error(res, "Lỗi server khi lấy danh sách món ăn (Test).", 500);
    }
};
