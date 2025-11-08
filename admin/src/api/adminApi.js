import Client from "./Client";

const adminApi = {
  // Lấy danh sách đơn đặt trước (với filters)
  getPreOrders: (params = {}) => Client.get("/admin/preorders", { params }),
  // Lấy thông tin chi tiết khách hàng và lịch sử đơn hàng
  getCustomerInfo: (userId) => Client.get(`/admin/customers/${userId}/info`),
  // Lấy thống kê thất thoát nguyên liệu hết hạn
  getIngredientWasteStats: () => Client.get("/admin/stats/ingredient-waste"),
  // Approve đơn đặt trước
  approvePreOrder: (orderId, tableId, adminNotes) => 
    Client.patch(`/admin/preorders/${orderId}/approve`, { tableId, adminNotes }),
  // Hủy đơn đặt trước
  cancelPreOrder: (orderId, adminNotes) => 
    Client.patch(`/admin/preorders/${orderId}/cancel`, { adminNotes }),
  // Ghi nhận tiền cọc
  recordDeposit: (orderId, amount, paymentMethod, adminNotes) => 
    Client.post(`/admin/preorders/${orderId}/deposit`, { amount, paymentMethod, adminNotes }),
  // Chỉnh sửa món trong đơn
  modifyPreOrderItems: (orderId, itemsToAdd, itemsToRemove, itemsToUpdate) => 
    Client.patch(`/admin/preorders/${orderId}/items`, { itemsToAdd, itemsToRemove, itemsToUpdate }),
  // Cập nhật thông tin đơn (gán bàn, sửa thời gian)
  updatePreOrder: (orderId, tableId, scheduledTime, adminNotes) => 
    Client.patch(`/admin/preorders/${orderId}`, { tableId, scheduledTime, adminNotes }),
  // Quản lý ghi chú admin
  addAdminNote: (orderId, note) => Client.post(`/admin/preorders/${orderId}/notes`, { note }),
  deleteAdminNote: (orderId, noteId) => Client.delete(`/admin/preorders/${orderId}/notes/${noteId}`),
  updateAdminNote: (orderId, noteId, note) => Client.patch(`/admin/preorders/${orderId}/notes/${noteId}`, { note }),
  // Xuất dữ liệu
  exportPreOrders: (params) => Client.get("/admin/preorders/export", { params, responseType: "blob" }),
  // Hành động hàng loạt
  bulkActionPreOrders: (orderIds, action, options) => 
    Client.post("/admin/preorders/bulk-action", { orderIds, action, ...options }),
  // Lấy danh sách items và menus để thêm vào đơn
  getAllItems: () => Client.get("/customer/items/all"),
  getAllMenus: () => Client.get("/customer/menus/all"),
  // Settings APIs
  getSettings: (category) => Client.get("/admin/settings", { params: category ? { category } : {} }),
  getPreOrderSettings: () => Client.get("/admin/settings/preorder"),
  getSetting: (key) => Client.get(`/admin/settings/${key}`),
  updateSetting: (key, value, description, category) => {
    // Đảm bảo value là number nếu là threshold
    const payloadValue = key === "preorder.largeOrderThreshold" && typeof value === "string" 
      ? Number(value) 
      : value;
    return Client.put(`/admin/settings/${key}`, { value: payloadValue, description, category });
  },
};

export default adminApi;

