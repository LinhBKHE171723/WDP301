import Client from "./Client";

const kitchenApi = {
  // --- ORDER ---
  getConfirmedOrders: () => Client.get("/kitchen/orders/confirmed"),
  getOrderDetails: (orderId) => Client.get(`/kitchen/orders/${orderId}`),
  startPreparingOrder: (orderId) =>
    Client.patch(`/kitchen/orders/${orderId}/start-preparing`),
  assignChefToItem: (orderItemId, chefName) =>
    Client.patch(`/kitchen/order-items/${orderItemId}/assign-chef`, {
      chefName,
    }),
  markItemReady: (orderItemId) =>
    Client.patch(`/kitchen/order-items/${orderItemId}/ready`),

  // --- ITEM ---
  getAllItems: () => Client.get("/kitchen/items"),
  createItem: (data) => Client.post("/kitchen/items", data),
  updateItem: (itemId, data) => Client.patch(`/kitchen/items/${itemId}`, data),
  deleteItem: (itemId) => Client.delete(`/kitchen/items/${itemId}`),
  markItemAvailable: (itemId) =>
    Client.patch(`/kitchen/items/${itemId}/available`, {}),
  markItemUnavailable: (itemId) =>
    Client.patch(`/kitchen/items/${itemId}/unavailable`, {}),

  // --- MENU ---
  getAllMenus: () => Client.get("/kitchen/menus"),
  createMenu: (data) => Client.post("/kitchen/menus", data),
  updateMenu: (menuId, data) => Client.patch(`/kitchen/menus/${menuId}`, data),
  deleteMenu: (menuId) => Client.delete(`/kitchen/menus/${menuId}`),
  markMenuAvailable: (menuId) =>
    Client.patch(`/kitchen/menus/${menuId}/available`),
  markMenuUnavailable: (menuId) =>
    Client.patch(`/kitchen/menus/${menuId}/unavailable`),

  // --- INVENTORY (Kho nguyên liệu) ---
  getAllIngredients: () => Client.get("/kitchen/ingredients"),
  updateStock: (ingredientId, data) =>
    Client.patch(`/kitchen/ingredients/${ingredientId}`, data),

  createPurchaseOrder: (data) => Client.post("/kitchen/purchase-orders", data),
  getPurchaseOrders: () => Client.get("/kitchen/purchase-orders"),
  createIngredient: (data) => Client.post("/kitchen/ingredients", data),

  // --- CHEF ---
  getAllChefs: () => Client.get("/kitchen/chefs"),
};

export default kitchenApi;
