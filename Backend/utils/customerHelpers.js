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
    const newOrderItemData = {
      orderId: null, // Sẽ được cập nhật sau khi tạo Order
      itemId: orderItem.itemId,
      itemName: item.name,
      itemType: orderItem.type,
      quantity: orderItem.quantity, // Sử dụng số lượng từ frontend
      price: item.price,
      expense: expense, // Giá vốn tại thời điểm đặt món
      status: "pending", // Đảm bảo status là pending
      note: orderItem.note || "",
    };

    // Nếu là combo (menu với type === 'combo'), tạo comboItems
    if (orderItem.type === 'menu' && item.type === 'combo' && item.items && item.items.length > 0) {
      // Populate items để lấy thông tin từng món
      const comboItemsData = [];
      for (const comboItemId of item.items) {
        const comboItem = await Item.findById(comboItemId);
        if (comboItem) {
          comboItemsData.push({
            itemId: comboItem._id,
            itemName: comboItem.name,
            status: "pending",
            assignedChef: null,
          });
        }
      }
      newOrderItemData.comboItems = comboItemsData;
    }

    const newOrderItem = new OrderItem(newOrderItemData);
    await newOrderItem.save();
    createdOrderItems.push(newOrderItem._id);
    totalAmount += item.price * orderItem.quantity; // Tính tổng tiền theo số lượng

    // Trừ nguyên liệu từ kho khi đặt món
    try {
      // Xử lý món đơn (itemType === 'item')
      if (orderItem.type === 'item') {
        // Item đã được populate ingredients ở trên
        await deductIngredientsFromStock(item, orderItem.quantity);
      }
      
      // Xử lý combo (itemType === 'menu' và có comboItems)
      if (orderItem.type === 'menu' && item.type === 'combo' && item.items && item.items.length > 0) {
        // Trừ nguyên liệu cho từng item trong combo
        for (const comboItemId of item.items) {
          const comboItem = await Item.findById(comboItemId).populate('ingredients.ingredient');
          if (comboItem) {
            // Số lượng mỗi comboItem = orderItem.quantity (mỗi combo có bao nhiêu phần comboItem)
            await deductIngredientsFromStock(comboItem, orderItem.quantity);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Lỗi khi trừ nguyên liệu cho OrderItem:`, error);
      // Không throw error để không làm gián đoạn quá trình tạo order
      // Có thể log và báo admin sau
    }
  }

  return {
    createdOrderItems,
    totalAmount
  };
};

/**
 * Trừ nguyên liệu từ kho khi đặt món
 * @param {Object} item - Item object đã populate ingredients.ingredient
 * @param {Number} quantity - Số lượng món được đặt
 */
const deductIngredientsFromStock = async (item, quantity) => {
  if (!item || !item.ingredients || item.ingredients.length === 0) {
    return;
  }

  // Đảm bảo ingredients đã được populate
  let ingredients = item.ingredients;
  if (ingredients.length > 0 && (!ingredients[0].ingredient || typeof ingredients[0].ingredient === 'string')) {
    const populatedItem = await Item.findById(item._id).populate('ingredients.ingredient');
    if (populatedItem && populatedItem.ingredients) {
      ingredients = populatedItem.ingredients;
    }
  }

  for (const ing of ingredients) {
    const ingDoc = ing.ingredient;
    if (ingDoc && ingDoc._id) {
      const ingredientId = typeof ingDoc === 'object' ? ingDoc._id : ingDoc;
      const ingredient = await Ingredient.findById(ingredientId);
      
      if (ingredient) {
        const quantityToDeduct = quantity * ing.quantity;
        ingredient.stockQuantity = Math.max(0, ingredient.stockQuantity - quantityToDeduct);
        await ingredient.save();
        console.log(`📦 Đã trừ ${quantityToDeduct} ${ingredient.unit} của ${ingredient.name} (còn lại: ${ingredient.stockQuantity})`);
      } else {
        console.warn(`⚠️ Không tìm thấy nguyên liệu với ID: ${ingredientId}`);
      }
    }
  }
};

/**
 * Hoàn nguyên liệu vào kho cho món chưa phục vụ
 * @param {Object} orderItem - OrderItem object (có thể chưa populate)
 */
const returnIngredientsToStock = async (orderItem) => {
  if (!orderItem) {
    return;
  }

  // Nếu orderItem là ObjectId, cần populate
  const OrderItem = require("../models/OrderItem");
  let populatedOrderItem = orderItem;
  if (typeof orderItem === 'string' || (orderItem._id && !orderItem.itemId)) {
    populatedOrderItem = await OrderItem.findById(orderItem).populate('itemId');
  }

  if (!populatedOrderItem) {
    console.warn(`⚠️ Không tìm thấy OrderItem để hoàn nguyên liệu`);
    return;
  }

  try {
    // Xử lý món đơn (itemType === 'item')
    if (populatedOrderItem.itemType === 'item') {
      const item = await Item.findById(populatedOrderItem.itemId).populate('ingredients.ingredient');
      if (item && item.ingredients) {
        for (const ing of item.ingredients) {
          const ingDoc = ing.ingredient;
          if (ingDoc && ingDoc._id) {
            const ingredientId = typeof ingDoc === 'object' ? ingDoc._id : ingDoc;
            const ingredient = await Ingredient.findById(ingredientId);
            
            if (ingredient) {
              const quantityToReturn = populatedOrderItem.quantity * ing.quantity;
              ingredient.stockQuantity = (ingredient.stockQuantity || 0) + quantityToReturn;
              await ingredient.save();
              console.log(`✅ Đã hoàn ${quantityToReturn} ${ingredient.unit} của ${ingredient.name} (tổng kho: ${ingredient.stockQuantity})`);
            } else {
              console.warn(`⚠️ Không tìm thấy nguyên liệu với ID: ${ingredientId} để hoàn lại`);
            }
          }
        }
      }
    }

    // Xử lý combo (itemType === 'menu' và có comboItems)
    if (populatedOrderItem.itemType === 'menu' && populatedOrderItem.comboItems && populatedOrderItem.comboItems.length > 0) {
      // Hoàn nguyên liệu cho từng comboItem chưa phục vụ
      for (const comboItem of populatedOrderItem.comboItems) {
        // Chỉ hoàn nguyên liệu cho comboItem chưa được phục vụ
        if (comboItem.status && comboItem.status !== 'served' && comboItem.status !== 'cancelled') {
          const item = await Item.findById(comboItem.itemId).populate('ingredients.ingredient');
          if (item && item.ingredients) {
            // Số lượng mỗi comboItem = orderItem.quantity (mỗi combo có bao nhiêu phần comboItem)
            const comboItemQuantity = populatedOrderItem.quantity;
            
            for (const ing of item.ingredients) {
              const ingDoc = ing.ingredient;
              if (ingDoc && ingDoc._id) {
                const ingredientId = typeof ingDoc === 'object' ? ingDoc._id : ingDoc;
                const ingredient = await Ingredient.findById(ingredientId);
                
                if (ingredient) {
                  const quantityToReturn = comboItemQuantity * ing.quantity;
                  ingredient.stockQuantity = (ingredient.stockQuantity || 0) + quantityToReturn;
                  await ingredient.save();
                  console.log(`✅ Đã hoàn ${quantityToReturn} ${ingredient.unit} của ${ingredient.name} từ comboItem ${comboItem.itemName} (tổng kho: ${ingredient.stockQuantity})`);
                } else {
                  console.warn(`⚠️ Không tìm thấy nguyên liệu với ID: ${ingredientId} để hoàn lại từ comboItem`);
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`❌ Lỗi khi hoàn nguyên liệu cho OrderItem ${populatedOrderItem._id}:`, error);
  }
};

/**
 * Hoàn nguyên liệu cho tất cả order items chưa phục vụ trong order
 * @param {Object} order - Order object với orderItems đã populate hoặc array of orderItem IDs
 */
const returnIngredientsForUnservedItems = async (order) => {
  const OrderItem = require("../models/OrderItem");
  
  try {
    // Lấy orderItems
    let orderItemIds = [];
    if (Array.isArray(order.orderItems)) {
      orderItemIds = order.orderItems.map(item => {
        return typeof item === 'object' && item._id ? item._id : item;
      });
    }
    
    if (orderItemIds.length === 0) {
      return;
    }
    
    // Populate orderItems để có đầy đủ thông tin
    const populatedOrderItems = await OrderItem.find({ _id: { $in: orderItemIds } });
    
    for (const orderItem of populatedOrderItems) {
      // Kiểm tra orderItem chưa được phục vụ
      if (orderItem.status !== 'served') {
        // Hoàn nguyên liệu cho orderItem chưa phục vụ (bao gồm cả comboItems nếu có)
        // Gọi trực tiếp returnIngredientsToStock để tránh circular dependency
        await returnIngredientsToStock(orderItem);
        
        // Đặt status thành cancelled
        orderItem.status = 'cancelled';
        
        // Đặt tất cả comboItems chưa served thành cancelled
        if (orderItem.comboItems && orderItem.comboItems.length > 0) {
          for (let i = 0; i < orderItem.comboItems.length; i++) {
            if (orderItem.comboItems[i].status !== 'served') {
              orderItem.comboItems[i].status = 'cancelled';
            }
          }
        }
        
        await orderItem.save();
        console.log(`🔄 Đã đặt OrderItem ${orderItem._id} thành cancelled và hoàn nguyên liệu`);
      } else {
        // Nếu orderItem đã served nhưng có comboItems chưa served, chỉ xử lý comboItems
        if (orderItem.comboItems && orderItem.comboItems.length > 0) {
          let hasUnservedComboItem = false;
          
          // Hoàn nguyên liệu cho từng comboItem chưa served
          for (let i = 0; i < orderItem.comboItems.length; i++) {
            const comboItem = orderItem.comboItems[i];
            
            if (comboItem.status !== 'served' && comboItem.status !== 'cancelled') {
              hasUnservedComboItem = true;
              
              // Hoàn nguyên liệu cho comboItem này
              const item = await Item.findById(comboItem.itemId).populate('ingredients.ingredient');
              if (item && item.ingredients) {
                const comboItemQuantity = orderItem.quantity;
                
                for (const ing of item.ingredients) {
                  const ingDoc = ing.ingredient;
                  if (ingDoc && ingDoc._id) {
                    const ingredientId = typeof ingDoc === 'object' ? ingDoc._id : ingDoc;
                    const ingredient = await Ingredient.findById(ingredientId);
                    
                    if (ingredient) {
                      const quantityToReturn = comboItemQuantity * ing.quantity;
                      ingredient.stockQuantity = (ingredient.stockQuantity || 0) + quantityToReturn;
                      await ingredient.save();
                      console.log(`✅ Đã hoàn ${quantityToReturn} ${ingredient.unit} của ${ingredient.name} từ comboItem ${comboItem.itemName || comboItem.itemId}`);
                    }
                  }
                }
              }
              
              // Đặt status thành cancelled
              orderItem.comboItems[i].status = 'cancelled';
            }
          }
          
          if (hasUnservedComboItem) {
            await orderItem.save();
            console.log(`🔄 Đã hoàn nguyên liệu và đặt comboItems chưa phục vụ của OrderItem ${orderItem._id} thành cancelled`);
          }
        }
      }
    }
    
    console.log(`✅ Đã hoàn tất việc hoàn nguyên liệu và đặt status cancelled cho các món chưa phục vụ`);
  } catch (error) {
    console.error(`❌ Lỗi khi hoàn nguyên liệu cho order:`, error);
    throw error;
  }
};

module.exports = {
  populateOrderItemDetails,
  validateTableAvailability,
  createOrderItemsFromCart,
  calculateExpense,
  deductIngredientsFromStock,
  returnIngredientsToStock,
  returnIngredientsForUnservedItems
};

