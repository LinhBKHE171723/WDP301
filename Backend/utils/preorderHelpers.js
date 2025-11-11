// Helper functions for pre-order calculations

const Item = require("../models/Item");
const Menu = require("../models/Menu");
const Ingredient = require("../models/Ingredient");
const OrderItem = require("../models/OrderItem");

/**
 * Tính toán nguyên liệu cần thiết cho một pre-order (không trừ kho)
 * @param {String} orderId - Order ID
 * @returns {Object} { ingredients: [{ ingredientId, ingredientName, requiredQuantity, availableQuantity, unit, isSufficient }], hasInsufficient: boolean }
 */
const calculatePreOrderIngredients = async (orderId) => {
  try {
    const Order = require("../models/Order");
    const order = await Order.findById(orderId)
      .populate({
        path: "orderItems"
      });

    if (!order) {
      throw new Error("Không tìm thấy đơn hàng");
    }

    // Map để tổng hợp nguyên liệu (ingredientId -> { name, required, available })
    const ingredientsMap = new Map();

    // Duyệt qua tất cả orderItems
    for (const orderItem of order.orderItems) {
      let item;
      
      // Lấy item hoặc menu
      if (orderItem.itemType === 'item') {
        item = await Item.findById(orderItem.itemId).populate('ingredients.ingredient');
      } else if (orderItem.itemType === 'menu') {
        item = await Menu.findById(orderItem.itemId).populate('items');
      }

      if (!item) continue;

      // Xử lý món đơn
      if (orderItem.itemType === 'item' && item.ingredients) {
        for (const ing of item.ingredients) {
          const ingDoc = ing.ingredient;
          if (!ingDoc || !ingDoc._id) continue;

          const ingredientId = ingDoc._id.toString();
          const requiredQuantity = (ing.quantity || 0) * (orderItem.quantity || 1);

          if (ingredientsMap.has(ingredientId)) {
            ingredientsMap.get(ingredientId).requiredQuantity += requiredQuantity;
          } else {
            const ingredient = await Ingredient.findById(ingredientId);
            ingredientsMap.set(ingredientId, {
              ingredientId: ingredientId,
              ingredientName: ingredient?.name || "Không rõ",
              unit: ingredient?.unit || "",
              requiredQuantity: requiredQuantity,
              availableQuantity: ingredient?.stockQuantity || 0
            });
          }
        }
      }
      
      // Xử lý combo
      if (orderItem.itemType === 'menu' && item.type === 'combo' && item.items && item.items.length > 0) {
        for (const comboItemId of item.items) {
          const comboItem = await Item.findById(comboItemId).populate('ingredients.ingredient');
          if (!comboItem || !comboItem.ingredients) continue;

          for (const ing of comboItem.ingredients) {
            const ingDoc = ing.ingredient;
            if (!ingDoc || !ingDoc._id) continue;

            const ingredientId = ingDoc._id.toString();
            const requiredQuantity = (ing.quantity || 0) * (orderItem.quantity || 1);

            if (ingredientsMap.has(ingredientId)) {
              ingredientsMap.get(ingredientId).requiredQuantity += requiredQuantity;
            } else {
              const ingredient = await Ingredient.findById(ingredientId);
              ingredientsMap.set(ingredientId, {
                ingredientId: ingredientId,
                ingredientName: ingredient?.name || "Không rõ",
                unit: ingredient?.unit || "",
                requiredQuantity: requiredQuantity,
                availableQuantity: ingredient?.stockQuantity || 0
              });
            }
          }
        }
      }
    }

    // Chuyển Map thành Array và tính toán isSufficient
    const ingredients = Array.from(ingredientsMap.values()).map(ing => ({
      ...ing,
      isSufficient: ing.availableQuantity >= ing.requiredQuantity,
      shortage: Math.max(0, ing.requiredQuantity - ing.availableQuantity)
    }));

    const hasInsufficient = ingredients.some(ing => !ing.isSufficient);

    return {
      ingredients,
      hasInsufficient
    };
  } catch (error) {
    console.error("Error calculating pre-order ingredients:", error);
    throw error;
  }
};

/**
 * Lấy ngưỡng để xác định đơn hàng lớn (large order)
 * @returns {Promise<Number>} Ngưỡng giá trị (default: 2000000)
 */
const getLargeOrderThreshold = async () => {
  try {
    const Setting = require("../models/Setting");
    const threshold = await Setting.getSetting("preorder.largeOrderThreshold", 2000000);
    
    // Đảm bảo trả về số
    const numValue = typeof threshold === "number" ? threshold : Number(threshold);
    return !isNaN(numValue) ? numValue : 2000000;
  } catch (error) {
    console.error("Error getting large order threshold:", error);
    return 2000000; // Default value
  }
};

/**
 * Kiểm tra xem đơn hàng có phải là đơn lớn (large order) không
 * @param {Object} order - Order object (có thể chưa populate)
 * @returns {Promise<Boolean>} true nếu là đơn lớn, false nếu là đơn nhỏ
 */
const isLargeOrder = async (order) => {
  try {
    if (!order) {
      return false;
    }

    // Lấy totalAmount từ order (có thể là ObjectId hoặc đã populate)
    let totalAmount = order.totalAmount;
    
    // Nếu order chưa có totalAmount, có thể cần populate hoặc tính lại
    if (totalAmount === undefined || totalAmount === null) {
      // Nếu order là ObjectId, cần populate
      if (typeof order === 'string' || (order._id && !order.totalAmount)) {
        const Order = require("../models/Order");
        const populatedOrder = await Order.findById(order._id || order);
        if (populatedOrder) {
          totalAmount = populatedOrder.totalAmount;
        }
      }
    }

    // Lấy ngưỡng
    const threshold = await getLargeOrderThreshold();

    // So sánh totalAmount với threshold
    return (totalAmount || 0) > threshold;
  } catch (error) {
    console.error("Error checking if order is large:", error);
    return false; // Default: không phải đơn lớn
  }
};

module.exports = {
  calculatePreOrderIngredients,
  getLargeOrderThreshold,
  isLargeOrder
};
