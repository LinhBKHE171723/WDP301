const express = require("express");
const router = express.Router();
const {
  authRequired,
  roleRequired,
} = require("../middlewares/auth.middleware");

const {
  getConfirmedOrders,
  startPreparingOrder,
  markItemReady,
  assignChefToItem,
  getMyPreparingItems,
  getOrderDetails,
} = require("../controllers/kitchen.order.controller");

const {
  createItem,
  getAllItems,
  updateItem,
  deleteItem,
  getItemById,
  markItemAvailable,
  markItemUnavailable,
} = require("../controllers/kitchen.item.controller");

const {
  createMenu,
  getAllMenus,
  getMenuById,
  updateMenu,
  deleteMenu,
  markMenuAvailable,
  markMenuUnavailable,
} = require("../controllers/kitchen.menu.controller");
const { getAllChef } = require("../controllers/kitchen.chef.controller");

const inv = require("../controllers/kitchen.inventory.controller");

const KITCHEN_ROLES = ["chef"];

// router.use(authRequired, roleRequired(...KITCHEN_ROLES));

// 1. Order List (GET)
router.get("/orders/confirmed", getConfirmedOrders);

// 2. Món đang làm của Chef (GET)
router.get("/my-preparing-items", getMyPreparingItems);

// 3. Bếp xác nhận bắt đầu chế biến Order (PATCH)
router.patch("/orders/:orderId/start-preparing", startPreparingOrder);

// 4. Đầu bếp xác nhận món hoàn thành (PATCH)
router.patch("/order-items/:orderItemId/ready", markItemReady);

// 5. Phân công món (PATCH)
router.patch("/order-items/:orderItemId/assign-chef", assignChefToItem);

// 6. Lấy danh sách các order
router.get("/orders/:orderId", getOrderDetails);

//--- CRUD Món ăn ---

// 1. Tạo Món ăn (Create)
router.post("/items", createItem);

// 2. Lấy danh sách Món ăn (Read All)
router.get("/items", getAllItems);

// 3. Lấy chi tiết Món ăn (Read One)
router.get("/items/:itemId", getItemById);

// 4. Cập nhật Món ăn (Update)
router.patch("/items/:itemId", updateItem);

// 5. Xóa Món ăn (Delete)
router.delete("/items/:itemId", deleteItem);

// 6. Đánh dấu Món ăn là có sẵn (Available)
router.patch("/items/:itemId/available", markItemAvailable);

// 7. Đánh dấu Món ăn là không có sẵn (Unavailable)
router.patch("/items/:itemId/unavailable", markItemUnavailable);

//--- CRUD Menu ---

// 1. Tạo menu (món hoặc combo)
router.post("/menus", createMenu);

// 2. Lấy danh sách menu
router.get("/menus", getAllMenus);

// 3. Lấy 1 menu cụ thể
router.get("/menus/:menuId", getMenuById);

// 4. Cập nhật menu
router.patch("/menus/:menuId", updateMenu);

// 5. Xóa menu
router.delete("/menus/:menuId", deleteMenu);

// 6. Đánh dấu menu là có sẵn
router.patch("/menus/:menuId/available", markMenuAvailable);

// 7. Đánh dấu menu là không có sẵn
router.patch("/menus/:menuId/unavailable", markMenuUnavailable);

// --- Quản lý nguyên liệu ---
router.get("/ingredients", inv.getAllIngredients);
router.post("/ingredients", inv.createIngredient);
router.patch("/ingredients/:ingredientId", inv.updateStock);

// --- Quản lý đơn nhập kho ---
router.post("/purchase-orders", inv.createPurchaseOrder);
router.get("/purchase-orders", inv.getPurchaseHistory);
router.put("/ingredients/:id", inv.updateIngredient);
router.delete("/ingredients/:id", inv.deleteIngredient);

// --- Quản lý nhân viên bếp ---
router.get("/chefs", getAllChef);
module.exports = router;
