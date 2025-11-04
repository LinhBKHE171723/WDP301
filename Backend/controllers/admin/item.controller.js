const Item = require("../../models/Item");
const { success, error } = require("../../utils/response");

/**
 * Lấy danh sách rút gọn các món ăn để hiển thị trong bộ lọc.
 * Chỉ trả về ID và Tên.
 */
exports.listForFilter = async (req, res) => {
  try {
    const items = await Item.find(
      { isAvailable: true },
      '_id name'
    ).sort('name');

    return success(res, items);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách món ăn:", err);
    return error(res, "Không thể lấy danh sách món ăn.");
  }
};