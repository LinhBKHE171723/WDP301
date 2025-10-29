// Service chứa logic tính toán chính
const itemTrendService = require("../../services/admin/itemTrend.service.js"); 
// Hàm helper để trả về response chuẩn
const { success, error } = require("../../utils/response"); 

/**
 * Lấy dữ liệu xu hướng hiệu suất của một món ăn cụ thể.
 * Đây là API chính thức cho trang Chi tiết Món ăn.
 * * @endpoint GET /api/admin/items/trend
 * @param {string} req.query.itemId - ID của món ăn (bắt buộc)
 * @param {string} req.query.type - Loại nhóm (daily, weekly, monthly, yearly)
 * @param {string} req.query.from - Ngày bắt đầu
 * @param {string} req.query.to - Ngày kết thúc
 */
exports.getItemTrendStats = async (req, res) => {
    try {
        // 1. Lấy các tham số từ query string của URL
        const { itemId, type, from, to } = req.query;
        
        // 2. Kiểm tra tham số quan trọng nhất
        if (!itemId) {
            return error(res, "Thiếu tham số itemId.", 400); // 400 Bad Request
        }

        // 3. Gọi service để thực hiện logic và lấy dữ liệu
        //    Tất cả các tính toán phức tạp đều nằm trong itemTrend.service.js
        const data = await itemTrendService.getItemTrend({ itemId, type, from, to });
        
        // 4. Trả về dữ liệu thành công cho FE
        return success(res, data);

    } catch (err) {
        // 5. Nếu có lỗi xảy ra (ví dụ: không tìm thấy món ăn), bắt lỗi và trả về thông báo
        console.error("Lỗi khi lấy Item Trend Stats:", err.message);
        
        // Xác định mã lỗi phù hợp
        const status = err.message.includes("Không tìm thấy") ? 404 : 500;
        
        return error(res, err.message, status);
    }
};