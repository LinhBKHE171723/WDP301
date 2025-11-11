import Client from "./Client";

const adminApi = {
  // Lấy lịch sử tất cả orders (với filters)
  getOrdersHistory: (params = {}) => Client.get("/admin/orders", { params }),
  // Lấy danh sách đơn đặt trước (với filters)
  getPreOrders: (params = {}) => Client.get("/admin/preorders", { params }),
  // Lấy thông tin nguyên liệu cần thiết cho pre-order
  getPreOrderIngredients: (orderId) => Client.get(`/admin/preorders/${orderId}/ingredients`),
  // Lấy thông tin chi tiết khách hàng và lịch sử đơn hàng
  getCustomerInfo: (userId) => Client.get(`/admin/customers/${userId}/info`),
  // Lấy thống kê thất thoát nguyên liệu hết hạn
  getIngredientWasteStats: () => Client.get("/admin/stats/ingredient-waste"),
  // Approve đơn đặt trước
  // Hỗ trợ cả tableId (backward compatibility) và tableIds[] (mới)
  approvePreOrder: (orderId, tableIds, adminNotes, preparationStartTime, reservedEndTime, forceApprove = false) => 
    Client.patch(`/admin/preorders/${orderId}/approve`, { 
      tableIds: Array.isArray(tableIds) ? tableIds : (tableIds ? [tableIds] : []), // Luôn gửi array
      tableId: Array.isArray(tableIds) && tableIds.length > 0 ? tableIds[0] : (tableIds || null), // Backward compatibility
      adminNotes,
      preparationStartTime,
      reservedEndTime,
      forceApprove
    }),
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
  // Hỗ trợ cả tableId (backward compatibility) và tableIds[] (mới)
  // Hỗ trợ forceUpdate để bỏ qua conflict warning
  updatePreOrder: (orderId, tableIds, scheduledTime, adminNotes, forceUpdate = false) => 
    Client.patch(`/admin/preorders/${orderId}`, { 
      tableIds: Array.isArray(tableIds) ? tableIds : (tableIds ? [tableIds] : []), // Luôn gửi array
      tableId: Array.isArray(tableIds) && tableIds.length > 0 ? tableIds[0] : (tableIds || null), // Backward compatibility
      scheduledTime, 
      adminNotes,
      forceUpdate // Thêm forceUpdate để bỏ qua conflict
    }),
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
  // Work Shift APIs
  getWorkShifts: () => Client.get("/admin/work-shifts"),
  getWorkShift: (id) => Client.get(`/admin/work-shifts/${id}`),
  createWorkShift: (data) => Client.post("/admin/work-shifts", data),
  updateWorkShift: (id, data) => Client.put(`/admin/work-shifts/${id}`, data),
  deleteWorkShift: (id) => Client.delete(`/admin/work-shifts/${id}`),
  // Get employees list for assigning to shifts (lấy tất cả, không phân trang)
  getUsers: (params) => Client.get("/admin/users", { params: { ...params, limit: 1000 } }),


    // --- Quản lý tài khoản ---
  getAllUsers: async (params) => {
    const res = await Client.get("/api/admin/users", { params });
    return res.data;
  },

  updateUser: async (userId, data) => {
    const res = await Client.put(`/api/admin/users/${userId}`, data);
    return res.data;
  },

  createUser: async (data) => {
    const res = await Client.post("/api/admin/users", data);
    return res.data;
  },

  // --- Hiệu suất nhân viên ---
  getEmployeePerformance: async (params) => {
    const res = await Client.get("/api/admin/performance", { params });
    return res.data;
  },

  getShiftDetail: async (userId, from, to) => {
    const res = await Client.get(`/api/admin/performance/shifts/${userId}`, {
      params: { from, to },
    });
    return res.data;
  },

  // --- Thống kê thất thoát nguyên liệu ---
  getIngredientWasteStats: async () => {
    const res = await Client.get("/api/purchaseOrders/expired-summary");
    return res.data;
  },

  // --- Báo cáo khách hàng ---
  getCustomerReports: async (params) => {
    const res = await Client.get("/api/admin/customers/report", { params });
    return res.data;
  },

  // --- Feedback ---
  getFeedbacks: async (params) => {
    const res = await Client.get("/api/admin/feedbacks", { params });
    return res.data;
  },
};

export default adminApi;

