// Helper functions for customer controller

const Item = require("../models/Item");
const Menu = require("../models/Menu");

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
 * Creates order items from cart data
 * @param {Array} orderItems - Cart items
 * @param {String} orderId - Order ID to associate with items
 * @returns {Object} Result with created order items and total amount
 */
const createOrderItemsFromCart = async (orderItems, orderId) => {
  const createdOrderItems = [];
  let totalAmount = 0;

  for (const orderItem of orderItems) {
    let item;
    
    // Kiểm tra type để xác định tìm trong Menu hay Item
    if (orderItem.type === 'menu') {
      item = await Menu.findById(orderItem.itemId);
      if (!item) {
        throw new Error(`Không tìm thấy menu với ID: ${orderItem.itemId}`);
      }
    } else {
      item = await Item.findById(orderItem.itemId);
      if (!item) {
        throw new Error(`Không tìm thấy món ăn với ID: ${orderItem.itemId}`);
      }
    }

    // Tạo OrderItem với số lượng được yêu cầu
    const OrderItem = require("../models/OrderItem");
    const newOrderItem = new OrderItem({
      orderId: orderId, // ✅ Thêm orderId để liên kết với Order
      itemId: orderItem.itemId,
      itemName: item.name,
      itemType: orderItem.type,
      quantity: orderItem.quantity, // Sử dụng số lượng từ frontend
      price: item.price,
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
  createOrderItemsFromCart
};

