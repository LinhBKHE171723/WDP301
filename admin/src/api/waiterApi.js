import Client from "./Client";

const waiterApi = {
  // ==========================
  // 🔸 ORDER MANAGEMENT
  // ==========================

  // Lấy tất cả order waiter đang phụ trách (confirmed / preparing / ready)
  getActiveOrders: () => Client.get("/waiter/orders/active"),

  // Lấy danh sách order cần xác nhận từ waiter
  getPendingOrders: () => Client.get("/waiter/orders/pending"),

  // Lấy chi tiết 1 order cụ thể
  getOrderDetails: (orderId) => Client.get(`/waiter/orders/${orderId}`),

  // Waiter phản hồi đơn hàng (xác nhận hoặc từ chối)
  respondToOrder: (orderId, approved, reason = null, selectedTable = null) =>
    Client.post(`/waiter/orders/${orderId}/respond`, { approved, reason, selectedTable }),

  // Cập nhật trạng thái đơn hàng (confirmed → served)
  updateOrderStatus: (orderId, status) =>
    Client.put(`/waiter/orders/${orderId}/status`, { status }),

  // Xác nhận đã phục vụ xong toàn bộ order
  markOrderServed: (orderId) =>
    Client.patch(`/waiter/orders/${orderId}/served`),

  // ✅ Waiter đánh dấu MÓN cụ thể đã được phục vụ (món trong order)
  markOrderItemServed: (orderItemId) =>
    Client.patch(`/waiter/order-items/${orderItemId}/served`),

  // ✅ Nếu tất cả món trong order đã được phục vụ → cập nhật trạng thái order
  markOrderFullyServed: (orderId) =>
    Client.patch(`/waiter/orders/${orderId}/fully-served`),

  // ==========================
  // 🔸 TABLE MANAGEMENT
  // ==========================

  // Lấy danh sách bàn
  getAllTables: () => Client.get("/waiter/tables"),
  // Lấy chi tiết bàn cụ thể (bao gồm các order liên quan)
  getTableDetails: (tableId) => Client.get(`/waiter/tables/details/${tableId}`),

  // Lấy danh sách bàn trống 
  getAvailableTables: () => Client.get("/waiter/tables/available"),
  // Cập nhật trạng thái bàn (ví dụ: occupied / available)
  updateTableStatus: (tableId, status) =>
    Client.patch(`/waiter/tables/${tableId}/status`, { status }),

  // Check-in khách (gắn khách vào bàn)
  checkInCustomer: (tableId, customerId) =>
    Client.post("/waiter/checkin", { tableId, customerId }),

  // Check-out khách (giải phóng bàn)
  checkOutCustomer: (tableId) =>
    Client.post("/waiter/checkout", { tableId }),

  // ==========================
  // 🔸 ATTENDANCE (điểm danh cá nhân)
  // ==========================

  // Waiter bắt đầu ca làm việc
  checkIn: () => Client.post("/waiter/attendance/checkin"),

  // Waiter kết thúc ca làm việc
  checkOut: () => Client.post("/waiter/attendance/checkout"),

  // Lấy lịch sử điểm danh của waiter
  getAttendanceHistory: () => Client.get("/waiter/attendance/history"),


  // ==========================
  // 🔸 NOTIFICATIONS
  // ==========================

  // Lấy danh sách thông báo (tạm thời fetch qua REST, chưa dùng socket)
  getNotifications: () => Client.get("/waiter/notifications"),

  // Đánh dấu thông báo đã đọc
  markNotificationRead: (notificationId) =>
    Client.patch(`/waiter/notifications/${notificationId}/read`),

  // -------------------------------
  // 🍱 FOOD ITEM MANAGEMENT
  // -------------------------------

  getAllItems: () => Client.get("/waiter/items"),
  getItemById: (itemId) => Client.get(`/waiter/items/${itemId}`),
  updateItemAvailability: (itemId, available) =>
    Client.patch(`/waiter/items/${itemId}/availability`, { available }),
  reportItemOutOfStock: (itemId, reason) =>
    Client.post(`/waiter/items/${itemId}/out-of-stock`, { reason }),
};

export default waiterApi;