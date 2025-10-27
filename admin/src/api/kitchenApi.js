import Client from "./Client";

const kitchenApi = {
  /* =========================
     ORDER (Đơn bếp)
  ========================== */
  getConfirmedOrders: () => Client.get("/kitchen/orders/confirmed"),
  getOrderDetails: (orderId) => Client.get(`/kitchen/orders/${orderId}`),
  startPreparingOrder: (orderId) =>
    Client.patch(`/kitchen/orders/${orderId}/start-preparing`),
  assignChefToItem: (orderItemId, chefId) =>
    Client.patch(`/kitchen/order-items/${orderItemId}/assign-chef`, { chefId }),
  markItemReady: (orderItemId) =>
    Client.patch(`/kitchen/order-items/${orderItemId}/ready`),

  /* =========================
    ITEM (Món ăn)
  ========================== */
  getAllItems: () => Client.get("/kitchen/items"),
  createItem: (data) => Client.post("/kitchen/items", data),
  updateItem: (itemId, data) => Client.patch(`/kitchen/items/${itemId}`, data),
  deleteItem: (itemId) => Client.delete(`/kitchen/items/${itemId}`),
  markItemAvailable: (itemId) =>
    Client.patch(`/kitchen/items/${itemId}/available`),
  markItemUnavailable: (itemId) =>
    Client.patch(`/kitchen/items/${itemId}/unavailable`),

  /* =========================
     MENU (Combo / Thực đơn)
  ========================== */
  getAllMenus: () => Client.get("/kitchen/menus"),
  createMenu: (data) => Client.post("/kitchen/menus", data),
  updateMenu: (menuId, data) => Client.patch(`/kitchen/menus/${menuId}`, data),
  deleteMenu: (menuId) => Client.delete(`/kitchen/menus/${menuId}`),
  markMenuAvailable: (menuId) =>
    Client.patch(`/kitchen/menus/${menuId}/available`),
  markMenuUnavailable: (menuId) =>
    Client.patch(`/kitchen/menus/${menuId}/unavailable`),

  /* =========================
     INVENTORY (Kho nguyên liệu)
  ========================== */
  // --- Nguyên liệu ---
  getAllIngredients: () => Client.get("/kitchen/ingredients"),
  createIngredient: (data) => Client.post("/kitchen/ingredients", data),
  updateIngredient: (id, data) =>
    Client.put(`/kitchen/ingredients/${id}`, data),
  deleteIngredient: (id) => Client.delete(`/kitchen/ingredients/${id}`),

  // --- Nhập kho ---
  createPurchaseOrder: (data) => Client.post("/kitchen/purchase-orders", data),
  getPurchaseOrders: () => Client.get("/kitchen/purchase-orders"),

  // --- Cập nhật tồn kho thủ công (nếu cần) ---
  updateStock: (ingredientId, data) =>
    Client.patch(`/kitchen/ingredients/${ingredientId}`, data),

  /* =========================
     CHEF (Đầu bếp)
  ========================== */
  getAllChefs: () => Client.get("/kitchen/chefs"),

  /* =========================
      CLOUDINARY
  ========================== */
  getCloudinarySignature: () => Client.get("/cloudinary/upload/signature"),
};

export default kitchenApi;
