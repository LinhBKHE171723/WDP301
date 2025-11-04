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
 * Track ingredients từ kho (dry-run - không trừ kho, chỉ track)
 * @param {Object} item - Item object đã populate ingredients.ingredient
 * @param {Number} quantity - Số lượng món được đặt
 * @returns {Array} Array of ingredientUsage objects: [{ purchaseOrderId, ingredientId, quantity, price, batchInfo }]
 */
const trackIngredientsFromStockDryRun = async (item, quantity) => {
  if (!item || !item.ingredients || item.ingredients.length === 0) {
    return [];
  }

  // Đảm bảo ingredients đã được populate
  let ingredients = item.ingredients;
  if (ingredients.length > 0 && (!ingredients[0].ingredient || typeof ingredients[0].ingredient === 'string')) {
    const populatedItem = await Item.findById(item._id).populate('ingredients.ingredient');
    if (populatedItem && populatedItem.ingredients) {
      ingredients = populatedItem.ingredients;
    }
  }

  const PurchaseOrder = require("../models/PurchaseOrder");
  const now = new Date();
  const ingredientUsage = [];

  for (const ing of ingredients) {
    const ingDoc = ing.ingredient;
    if (ingDoc && ingDoc._id) {
      const ingredientId = typeof ingDoc === 'object' ? ingDoc._id : ingDoc;
      const ingredient = await Ingredient.findById(ingredientId);
      
      if (!ingredient) {
        console.warn(`⚠️ Không tìm thấy nguyên liệu với ID: ${ingredientId}`);
        continue;
      }

      const quantityToDeduct = quantity * ing.quantity;
      let remainingToDeduct = quantityToDeduct;

      // Tìm tất cả các lô nhập còn valid - sắp xếp theo FIFO (cũ nhất trước)
      const allBatches = await PurchaseOrder.find({
        ingredientId: ingredientId,
        status: 'valid'
      })
      .sort({ time: 1 })
      .lean();

      // Track từ lô cũ nhất trước, ưu tiên lô chưa hết hạn
      for (const batch of allBatches) {
        if (remainingToDeduct <= 0) break;

        // Kiểm tra lô còn hạn không
        const isStillValid = !batch.expiryDate || new Date(batch.expiryDate) > now;
        if (!isStillValid) {
          continue;
        }

        // Số lượng còn lại trong lô này
        const availableInBatch = batch.quantity - batch.usedQuantity;
        
        if (availableInBatch > 0) {
          // Số lượng sẽ trừ từ lô này
          const deductFromBatch = Math.min(remainingToDeduct, availableInBatch);
          
          remainingToDeduct -= deductFromBatch;
          
          const batchInfo = batch.expiryDate 
            ? `lô nhập ${new Date(batch.time).toLocaleDateString()} (hết hạn: ${new Date(batch.expiryDate).toLocaleDateString()})`
            : `lô nhập ${new Date(batch.time).toLocaleDateString()} (không có ngày hết hạn)`;
          
          // Lưu thông tin lô (không trừ kho)
          ingredientUsage.push({
            purchaseOrderId: batch._id,
            ingredientId: ingredientId,
            quantity: deductFromBatch,
            price: batch.price,
            batchInfo: batchInfo
          });
        }
      }
    }
  }

  return ingredientUsage;
};

/**
 * Tính expense với tracking từng lô (FIFO - giá thực tế)
 * @param {Object} itemOrMenu - Item hoặc Menu object (đã populate ingredients nếu cần)
 * @param {String} type - 'item' hoặc 'menu'
 * @param {Number} quantity - Số lượng món được đặt
 * @returns {Object} { expense: Number, ingredientUsage: Array }
 */
const calculateExpenseWithTracking = async (itemOrMenu, type, quantity = 1) => {
  if (type === 'menu') {
    // Menu: expense = tổng expense của các items trong menu
    if (!itemOrMenu.items || itemOrMenu.items.length === 0) {
      return { expense: 0, ingredientUsage: [] };
    }
    
    let totalExpense = 0;
    const allIngredientUsage = [];
    
    for (const itemId of itemOrMenu.items) {
      const item = await Item.findById(itemId).populate('ingredients.ingredient');
      if (item && item.ingredients) {
        // Track ingredients cho item này (dry-run, không trừ kho)
        const itemUsage = await trackIngredientsFromStockDryRun(item, quantity);
        allIngredientUsage.push(...itemUsage);
        
        // Tính expense từ ingredientUsage
        const itemExpense = itemUsage.reduce((sum, usage) => sum + (usage.quantity * usage.price), 0);
        totalExpense += itemExpense;
      }
    }
    
    return { expense: totalExpense, ingredientUsage: allIngredientUsage };
  } else {
    // Item: track từng ingredient và tính expense từ giá thực tế
    if (!itemOrMenu.ingredients || itemOrMenu.ingredients.length === 0) {
      return { expense: 0, ingredientUsage: [] };
    }
    
    // Đảm bảo ingredients đã được populate
    let ingredients = itemOrMenu.ingredients;
    if (ingredients.length > 0 && (!ingredients[0].ingredient || typeof ingredients[0].ingredient === 'string')) {
      const populatedItem = await Item.findById(itemOrMenu._id).populate('ingredients.ingredient');
      if (populatedItem && populatedItem.ingredients) {
        ingredients = populatedItem.ingredients;
      }
    }
    
    // Track ingredients từ kho (dry-run, không trừ kho)
    const ingredientUsage = await trackIngredientsFromStockDryRun(itemOrMenu, quantity);
    
    // Tính expense từ ingredientUsage (giá thực tế của từng lô)
    const expense = ingredientUsage.reduce((sum, usage) => sum + (usage.quantity * usage.price), 0);
    
    return { expense, ingredientUsage };
  }
};

/**
 * Tính expense (giá vốn) cho Item hoặc Menu - DEPRECATED (backward compatibility only)
 * @deprecated Không còn dùng priceNow. Nên dùng calculateExpenseWithTracking() để tính từ giá thực tế (FIFO)
 * @param {Object} itemOrMenu - Item hoặc Menu object (đã populate ingredients nếu cần)
 * @param {String} type - 'item' hoặc 'menu'
 * @returns {Number} Expense (giá vốn) - Trả về 0 vì không thể tính chính xác không có priceNow
 */
const calculateExpense = async (itemOrMenu, type) => {
  // ⚠️ priceNow đã bị loại bỏ, không thể tính expense chính xác
  // Function này chỉ giữ lại cho backward compatibility
  // Nên dùng calculateExpenseWithTracking() thay thế
  console.warn('⚠️ calculateExpense() is deprecated. Use calculateExpenseWithTracking() instead.');
  return 0;
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

    // Tính expense với tracking (FIFO - giá thực tế)
    const expenseResult = await calculateExpenseWithTracking(item, orderItem.type, orderItem.quantity);
    const expense = expenseResult.expense;
    let allIngredientUsage = expenseResult.ingredientUsage;

    // Tạo OrderItem với số lượng được yêu cầu
    const OrderItem = require("../models/OrderItem");
    const newOrderItemData = {
      orderId: null, // Sẽ được cập nhật sau khi tạo Order
      itemId: orderItem.itemId,
      itemName: item.name,
      itemType: orderItem.type,
      quantity: orderItem.quantity, // Sử dụng số lượng từ frontend
      price: item.price,
      expense: expense, // Giá vốn tại thời điểm đặt món (từ giá thực tế)
      ingredientUsage: allIngredientUsage, // Track từng lô nguyên liệu đã dùng
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

    // Trừ nguyên liệu từ kho khi đặt món (actual deduction)
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
 * Trừ nguyên liệu từ kho khi đặt món (theo FIFO - First In First Out)
 * @param {Object} item - Item object đã populate ingredients.ingredient
 * @param {Number} quantity - Số lượng món được đặt
 * @returns {Array} Array of ingredientUsage objects: [{ purchaseOrderId, ingredientId, quantity, price, batchInfo }]
 */
const deductIngredientsFromStock = async (item, quantity) => {
  if (!item || !item.ingredients || item.ingredients.length === 0) {
    return [];
  }

  // Đảm bảo ingredients đã được populate
  let ingredients = item.ingredients;
  if (ingredients.length > 0 && (!ingredients[0].ingredient || typeof ingredients[0].ingredient === 'string')) {
    const populatedItem = await Item.findById(item._id).populate('ingredients.ingredient');
    if (populatedItem && populatedItem.ingredients) {
      ingredients = populatedItem.ingredients;
    }
  }

  const PurchaseOrder = require("../models/PurchaseOrder");
  const now = new Date();
  const ingredientUsage = []; // Array để lưu thông tin các lô đã dùng

  for (const ing of ingredients) {
    const ingDoc = ing.ingredient;
    if (ingDoc && ingDoc._id) {
      const ingredientId = typeof ingDoc === 'object' ? ingDoc._id : ingDoc;
      const ingredient = await Ingredient.findById(ingredientId);
      
      if (!ingredient) {
        console.warn(`⚠️ Không tìm thấy nguyên liệu với ID: ${ingredientId}`);
        continue;
      }

      const quantityToDeduct = quantity * ing.quantity;
      let remainingToDeduct = quantityToDeduct;

      // Tìm tất cả các lô nhập còn valid - sắp xếp theo FIFO (cũ nhất trước)
      const allBatches = await PurchaseOrder.find({
        ingredientId: ingredientId,
        status: 'valid'
      })
      .sort({ time: 1 }) // Sắp xếp theo thời gian nhập (cũ nhất trước - FIFO)
      .lean();

      // Trừ từ lô cũ nhất trước, ưu tiên lô chưa hết hạn
      for (const batch of allBatches) {
        if (remainingToDeduct <= 0) break;

        // Kiểm tra lô còn hạn không (nếu có expiryDate thì phải chưa hết hạn)
        const isStillValid = !batch.expiryDate || new Date(batch.expiryDate) > now;
        if (!isStillValid) {
          continue; // Bỏ qua lô đã hết hạn
        }

        // Số lượng còn lại trong lô này
        const availableInBatch = batch.quantity - batch.usedQuantity;
        
        if (availableInBatch > 0) {
          // Số lượng sẽ trừ từ lô này
          const deductFromBatch = Math.min(remainingToDeduct, availableInBatch);
          
          // Cập nhật usedQuantity của lô
          await PurchaseOrder.findByIdAndUpdate(batch._id, {
            $inc: { usedQuantity: deductFromBatch }
          });
          
          remainingToDeduct -= deductFromBatch;
          
          const batchInfo = batch.expiryDate 
            ? `lô nhập ${new Date(batch.time).toLocaleDateString()} (hết hạn: ${new Date(batch.expiryDate).toLocaleDateString()})`
            : `lô nhập ${new Date(batch.time).toLocaleDateString()} (không có ngày hết hạn)`;
          
          // Lưu thông tin lô đã dùng vào ingredientUsage
          ingredientUsage.push({
            purchaseOrderId: batch._id,
            ingredientId: ingredientId,
            quantity: deductFromBatch,
            price: batch.price, // Giá mua ban đầu của lô
            batchInfo: batchInfo
          });
          
          console.log(`📦 Đã trừ ${deductFromBatch} ${ingredient.unit} từ ${batchInfo} (còn lại trong lô: ${availableInBatch - deductFromBatch})`);
        }
      }

      // Cập nhật stockQuantity tổng của ingredient
      ingredient.stockQuantity = Math.max(0, ingredient.stockQuantity - quantityToDeduct);
      await ingredient.save();
      
      console.log(`📦 Đã trừ tổng ${quantityToDeduct} ${ingredient.unit} của ${ingredient.name} (còn lại trong kho: ${ingredient.stockQuantity})`);
      
      if (remainingToDeduct > 0) {
        console.warn(`⚠️ Cảnh báo: Không đủ nguyên liệu trong các lô còn hạn để trừ ${remainingToDeduct} ${ingredient.unit} của ${ingredient.name}`);
      }
    }
  }

  return ingredientUsage;
};

/**
 * Hoàn nguyên liệu vào lô theo LIFO (Last In First Out) - hoàn vào lô mới nhất trước
 * @param {String} ingredientId - ID của nguyên liệu
 * @param {Number} quantityToReturn - Số lượng cần hoàn lại
 */
const returnIngredientsToBatches = async (ingredientId, quantityToReturn) => {
  const PurchaseOrder = require("../models/PurchaseOrder");
  let remainingToReturn = quantityToReturn;

  // Tìm các lô đã dùng (usedQuantity > 0) - sắp xếp theo LIFO (mới nhất trước)
  const usedBatches = await PurchaseOrder.find({
    ingredientId: ingredientId,
    status: 'valid',
    usedQuantity: { $gt: 0 } // Chỉ lấy lô đã dùng
  })
  .sort({ time: -1 }) // Sắp xếp theo thời gian nhập (mới nhất trước - LIFO)
  .lean();

  // Hoàn lại vào lô mới nhất trước
  for (const batch of usedBatches) {
    if (remainingToReturn <= 0) break;

    // Số lượng có thể hoàn lại vào lô này (không được vượt quá usedQuantity)
    const canReturnToBatch = Math.min(remainingToReturn, batch.usedQuantity);
    
    if (canReturnToBatch > 0) {
      // Giảm usedQuantity của lô
      await PurchaseOrder.findByIdAndUpdate(batch._id, {
        $inc: { usedQuantity: -canReturnToBatch }
      });
      
      remainingToReturn -= canReturnToBatch;
      
      console.log(`✅ Đã hoàn ${canReturnToBatch} vào lô nhập ${new Date(batch.time).toLocaleDateString()} (usedQuantity giảm từ ${batch.usedQuantity} xuống ${batch.usedQuantity - canReturnToBatch})`);
    }
  }

  // Nếu còn dư, có thể tạo một lô ảo hoặc log warning
  if (remainingToReturn > 0) {
    console.warn(`⚠️ Không tìm thấy lô đã dùng để hoàn lại ${remainingToReturn} nguyên liệu. Có thể đã hết hạn hoặc bị xóa.`);
  }

  return remainingToReturn;
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
              
              // Hoàn nguyên liệu vào các lô theo LIFO
              await returnIngredientsToBatches(ingredientId, quantityToReturn);
              
              // Cập nhật stockQuantity tổng
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
      // Hoàn nguyên liệu cho từng comboItem còn PENDING (chưa bắt đầu nấu)
      for (const comboItem of populatedOrderItem.comboItems) {
        // Chỉ hoàn nguyên liệu cho comboItem còn pending (chưa bắt đầu nấu)
        if (comboItem.status === 'pending') {
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
                  
                  // Hoàn nguyên liệu vào các lô theo LIFO
                  await returnIngredientsToBatches(ingredientId, quantityToReturn);
                  
                  // Cập nhật stockQuantity tổng
                  ingredient.stockQuantity = (ingredient.stockQuantity || 0) + quantityToReturn;
                  await ingredient.save();
                  console.log(`✅ Đã hoàn ${quantityToReturn} ${ingredient.unit} của ${ingredient.name} từ comboItem ${comboItem.itemName} (pending, tổng kho: ${ingredient.stockQuantity})`);
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
      // Chỉ hoàn nguyên liệu cho món còn PENDING (chưa bắt đầu nấu)
      // Món đã preparing, ready, hoặc served thì không hoàn vì nguyên liệu đã được sử dụng
      if (orderItem.status === 'pending') {
        // Kiểm tra nếu là combo và có comboItem đã served
        let hasServedComboItem = false;
        if (orderItem.comboItems && orderItem.comboItems.length > 0) {
          for (const comboItem of orderItem.comboItems) {
            if (comboItem.status === 'served') {
              hasServedComboItem = true;
              break;
            }
          }
        }
        
        // Nếu combo có comboItem đã served, combo status phải là served
        if (hasServedComboItem) {
          orderItem.status = 'served';
          console.log(`🔄 Đã đặt combo status thành 'served' vì có comboItem đã được phục vụ (orderItem ban đầu là pending)`);
        } else {
          // Hoàn nguyên liệu cho orderItem còn pending (bao gồm cả comboItems nếu có)
          await returnIngredientsToStock(orderItem);
          
          // Đặt status thành cancelled
          orderItem.status = 'cancelled';
          
          // Đặt tất cả comboItems còn pending thành cancelled
          if (orderItem.comboItems && orderItem.comboItems.length > 0) {
            for (let i = 0; i < orderItem.comboItems.length; i++) {
              if (orderItem.comboItems[i].status === 'pending') {
                orderItem.comboItems[i].status = 'cancelled';
              }
            }
          }
          console.log(`🔄 Đã đặt OrderItem ${orderItem._id} (pending) thành cancelled và hoàn nguyên liệu`);
        }
        
        await orderItem.save();
      } else if (orderItem.status !== 'served' && orderItem.status !== 'cancelled') {
        // Nếu orderItem đã preparing/ready nhưng có comboItems còn pending, chỉ xử lý comboItems pending
        if (orderItem.comboItems && orderItem.comboItems.length > 0) {
          let hasPendingComboItem = false;
          let hasServedComboItem = false;
          
          // Kiểm tra xem có comboItem nào đã served không
          for (const comboItem of orderItem.comboItems) {
            if (comboItem.status === 'served') {
              hasServedComboItem = true;
              break;
            }
          }
          
          // Hoàn nguyên liệu cho từng comboItem còn pending
          for (let i = 0; i < orderItem.comboItems.length; i++) {
            const comboItem = orderItem.comboItems[i];
            
            if (comboItem.status === 'pending') {
              hasPendingComboItem = true;
              
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
                      
                      // Hoàn nguyên liệu vào các lô theo LIFO
                      await returnIngredientsToBatches(ingredientId, quantityToReturn);
                      
                      // Cập nhật stockQuantity tổng
                      ingredient.stockQuantity = (ingredient.stockQuantity || 0) + quantityToReturn;
                      await ingredient.save();
                      console.log(`✅ Đã hoàn ${quantityToReturn} ${ingredient.unit} của ${ingredient.name} từ comboItem ${comboItem.itemName || comboItem.itemId} (pending)`);
                    }
                  }
                }
              }
              
              // Đặt status thành cancelled
              orderItem.comboItems[i].status = 'cancelled';
            }
          }
          
          // Nếu có comboItem đã served, combo status phải là served
          if (hasServedComboItem && orderItem.status !== 'served') {
            orderItem.status = 'served';
            console.log(`🔄 Đã đặt combo status thành 'served' vì có comboItem đã được phục vụ`);
          }
          
          if (hasPendingComboItem || hasServedComboItem) {
            await orderItem.save();
            if (hasPendingComboItem) {
              console.log(`🔄 Đã hoàn nguyên liệu và đặt comboItems pending của OrderItem ${orderItem._id} thành cancelled`);
            }
          }
        }
      }
    }
    
    console.log(`✅ Đã hoàn tất việc hoàn nguyên liệu và đặt status cancelled cho các món còn pending`);
  } catch (error) {
    console.error(`❌ Lỗi khi hoàn nguyên liệu cho order:`, error);
    throw error;
  }
};

/**
 * Tự động cập nhật status của combo (orderItem) dựa trên status của comboItems
 * Logic:
 * - Nếu có comboItem nào = 'preparing', thì combo = 'preparing'
 * - Nếu có comboItem nào = 'ready' (và không có comboItem nào đang preparing), thì combo = 'ready'
 * - Nếu tất cả comboItems = 'served', thì combo = 'served'
 * - Nếu tất cả comboItems = 'pending', thì combo = 'pending'
 * @param {Object} orderItem - OrderItem object có comboItems
 * @returns {String|null} - Status mới của orderItem (null nếu không cần update)
 */
const updateComboStatusBasedOnComboItems = (orderItem) => {
  if (!orderItem || !orderItem.comboItems || orderItem.comboItems.length === 0) {
    return null;
  }

  // Đếm số lượng comboItems theo từng status
  const statusCounts = {
    pending: 0,
    preparing: 0,
    ready: 0,
    served: 0,
    cancelled: 0
  };

  for (const comboItem of orderItem.comboItems) {
    const status = comboItem.status || 'pending';
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status]++;
    }
  }

  const totalComboItems = orderItem.comboItems.length;

  // Nếu tất cả đều served, combo = served
  if (statusCounts.served === totalComboItems) {
    return orderItem.status !== 'served' ? 'served' : null;
  }

  // Nếu có comboItem nào đang preparing, combo = preparing
  if (statusCounts.preparing > 0) {
    return orderItem.status !== 'preparing' ? 'preparing' : null;
  }

  // Nếu có comboItem nào ready (và không có preparing), combo = ready
  if (statusCounts.ready > 0) {
    return orderItem.status !== 'ready' ? 'ready' : null;
  }

  // Nếu tất cả đều pending, combo = pending
  if (statusCounts.pending === totalComboItems) {
    return orderItem.status !== 'pending' ? 'pending' : null;
  }

  // Trường hợp hỗn hợp: có pending và cancelled (nhưng không có preparing/ready/served)
  // Giữ nguyên status hiện tại hoặc chuyển về pending nếu cần
  return null;
};

module.exports = {
  populateOrderItemDetails,
  validateTableAvailability,
  createOrderItemsFromCart,
  calculateExpense,
  calculateExpenseWithTracking,
  deductIngredientsFromStock,
  returnIngredientsToStock,
  returnIngredientsForUnservedItems,
  updateComboStatusBasedOnComboItems
};

