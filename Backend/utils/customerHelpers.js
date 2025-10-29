// Helper functions for customer controller

const Item = require("../models/Item");
const Menu = require("../models/Menu");
const Ingredient = require("../models/Ingredient");

/**
 * Populates order item details by finding items in both Item and Menu collections
 * @param {Array} orderItems - Array of order items
 * @returns {Array} Order items with populated itemId
 */
const populateOrderItemDetails = async (orderItems) => {
  for (let i = 0; i < orderItems.length; i++) {
    const orderItem = orderItems[i];
    if (orderItem.itemId) {
      // Tìm trong cả Item và Menu
      let item = await Item.findById(orderItem.itemId);
      if (!item) {
        item = await Menu.findById(orderItem.itemId);
      }
      orderItem.itemId = item;
    }
  }
  return orderItems;
};

/**
 * Validates table availability for customer access
 * @param {Object} table - Table object
 * @returns {Object} Validation result with success and message
 */
const validateTableAvailability = (table) => {
  if (!table) {
    return {
      success: false,
      message: "Không tìm thấy bàn"
    };
  }

  if (table.status === 'occupied') {
    return {
      success: false,
      message: "Bàn này đang được sử dụng. Vui lòng chọn bàn khác."
    };
  }

  if (table.status === 'reserved') {
    return {
      success: false,
      message: "Bàn này đã được đặt trước. Vui lòng chọn bàn khác."
    };
  }

  if (table.status !== 'available') {
    return {
      success: false,
      message: "Bàn này hiện không khả dụng. Vui lòng chọn bàn khác."
    };
  }

  return {
    success: true,
    message: "Bàn có thể sử dụng"
  };
};

/**
 * Tính expense (giá vốn) cho Item hoặc Menu tại thời điểm hiện tại
 * @param {Object} itemOrMenu - Item hoặc Menu object (đã populate ingredients nếu cần)
 * @param {String} type - 'item' hoặc 'menu'
 * @returns {Number} Expense (giá vốn)
 */
const calculateExpense = async (itemOrMenu, type) => {
  if (type === 'menu') {
    // Menu: expense = tổng expense của các items trong menu
    if (!itemOrMenu.items || itemOrMenu.items.length === 0) {
      return 0;
    }
    
    let totalExpense = 0;
    for (const itemId of itemOrMenu.items) {
      const item = await Item.findById(itemId).populate('ingredients.ingredient');
      if (item && item.ingredients) {
        for (const ing of item.ingredients) {
          const ingDoc = ing.ingredient;
          if (ingDoc && ingDoc.priceNow != null) {
            totalExpense += ingDoc.priceNow * ing.quantity;
          }
        }
      }
    }
    return totalExpense;
  } else {
    // Item: expense = tổng (ingredient.priceNow * quantity) của tất cả ingredients
    if (!itemOrMenu.ingredients || itemOrMenu.ingredients.length === 0) {
      return 0;
    }
    
    let totalExpense = 0;
    // Nếu ingredients chưa được populate, cần populate
    let ingredients = itemOrMenu.ingredients;
    if (ingredients.length > 0 && !ingredients[0].ingredient || typeof ingredients[0].ingredient === 'string') {
      // Chưa populate, cần populate
      const populatedItem = await Item.findById(itemOrMenu._id).populate('ingredients.ingredient');
      ingredients = populatedItem.ingredients;
    }
    
    for (const ing of ingredients) {
      const ingDoc = ing.ingredient;
      if (ingDoc && ingDoc.priceNow != null) {
        totalExpense += ingDoc.priceNow * ing.quantity;
      }
    }
    return totalExpense;
  }
};

/**
 * Creates order items from cart data
 * @param {Array} orderItems - Cart items
 * @returns {Object} Result with created order items and total amount
 */
const createOrderItemsFromCart = async (orderItems) => {
  const createdOrderItems = [];
  let totalAmount = 0;

  for (const orderItem of orderItems) {
    let item;
    
    // Kiểm tra type để xác định tìm trong Menu hay Item
    if (orderItem.type === 'menu') {
      item = await Menu.findById(orderItem.itemId).populate('items');
      if (!item) {
        throw new Error(`Không tìm thấy menu với ID: ${orderItem.itemId}`);
      }
    } else {
      item = await Item.findById(orderItem.itemId).populate('ingredients.ingredient');
      if (!item) {
        throw new Error(`Không tìm thấy món ăn với ID: ${orderItem.itemId}`);
      }
    }

    // Tính expense tại thời điểm đặt món
    const expense = await calculateExpense(item, orderItem.type);

    // Tạo OrderItem với số lượng được yêu cầu
    const OrderItem = require("../models/OrderItem");
    const newOrderItem = new OrderItem({
      orderId: null, // Sẽ được cập nhật sau khi tạo Order
      itemId: orderItem.itemId,
      itemName: item.name,
      itemType: orderItem.type,
      quantity: orderItem.quantity, // Sử dụng số lượng từ frontend
      price: item.price,
      expense: expense, // Giá vốn tại thời điểm đặt món
      status: "pending", // Đảm bảo status là pending
      note: orderItem.note || "",
    });

    await newOrderItem.save();
    createdOrderItems.push(newOrderItem._id);
    totalAmount += item.price * orderItem.quantity; // Tính tổng tiền theo số lượng
  }

  return {
    createdOrderItems,
    totalAmount
  };
};

module.exports = {
  populateOrderItemDetails,
  validateTableAvailability,
  createOrderItemsFromCart,
  calculateExpense
};

