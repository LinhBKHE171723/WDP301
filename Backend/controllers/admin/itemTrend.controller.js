// Service chứa logic tính toán chính
const itemTrendService = require("../../services/admin/itemTrend.service.js"); 
// Hàm helper để trả về response chuẩn
const { success, error } = require("../../utils/response"); 

exports.getItemTrendStats = async (req, res) => {
    try {
        const { itemId, type, from, to } = req.query;
        
        if (!itemId) {
            return error(res, "Thiếu tham số itemId.", 400); // 400 Bad Request
        }

        const data = await itemTrendService.getItemTrend({ itemId, type, from, to });
        
        return success(res, data);

    } catch (err) {
        console.error("Lỗi khi lấy Item Trend Stats:", err.message);
        
        const status = err.message.includes("Không tìm thấy") ? 404 : 500;
        
        return error(res, err.message, status);
    }
};