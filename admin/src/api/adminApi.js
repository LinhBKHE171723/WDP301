import Client from "./Client";

const adminApi = {
  // Lấy danh sách đơn đặt trước
  getPreOrders: () => Client.get("/admin/preorders"),
  // Lấy thông tin chi tiết khách hàng và lịch sử đơn hàng
  getCustomerInfo: (userId) => Client.get(`/admin/customers/${userId}/info`),
};

export default adminApi;

