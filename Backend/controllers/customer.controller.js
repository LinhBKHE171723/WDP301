const Menu = require("../models/Menu");
const Item = require("../models/Item");
const Table = require("../models/Table");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Payment = require("../models/Payment");
const Feedback = require("../models/Feedback");
const { populateOrderItemDetails, validateTableAvailability, createOrderItemsFromCart } = require("../utils/customerHelpers");

// Lấy thông tin bàn theo số bàn
exports.getTableByNumber = async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const table = await Table.findOne({ tableNumber: parseInt(tableNumber) });
    
    const validation = validateTableAvailability(table);
    if (!validation.success) {
      return res.status(validation.message.includes('Không tìm thấy') ? 404 : 400).json({
        success: false,
        message: validation.message
      });
    }

    res.status(200).json({
      success: true,
      data: table
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Lấy danh sách menu có sẵn
exports.getAvailableMenus = async (req, res) => {
  try {
    const menus = await Menu.find({ isAvailable: true })
      .populate("items")
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: menus
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Lấy chi tiết menu
exports.getMenuById = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.menuId)
      .populate("items");
    
    if (!menu) {
      return res.status(404).json({ 
        success: false, 
        message: "Không tìm thấy menu" 
      });
    }

    res.status(200).json({
      success: true,
      data: menu
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Lấy danh sách món ăn có sẵn
exports.getAvailableItems = async (req, res) => {
  try {
    const items = await Item.find({ isAvailable: true })
      .populate("ingredients")
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: items
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Lấy chi tiết món ăn
exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId)
      .populate("ingredients");
    
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: "Không tìm thấy món ăn" 
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Tạo đơn hàng mới
exports.createOrder = async (req, res) => {
  try {
    const { tableId, orderItems, userId } = req.body;
    let finalTableId = tableId;

    console.log(`[createOrder] Initial tableId from request: ${tableId}, userId: ${userId}`);
    console.log(`[createOrder] Raw activeOrderIds cookie: ${req.cookies?.activeOrderIds}`);
    console.log(`[createOrder] All cookies received:`, req.cookies);

    // 🔍 Tự động tìm tableId nếu không được cung cấp
    if (!finalTableId) {
      // Case 1: Customer đã đăng nhập - tìm theo userId
      if (userId) {
        const latestActiveOrder = await Order.findOne({
          userId: userId,
          status: { $in: ["confirmed", "preparing", "served"] },
          tableId: { $ne: null }
        })
        .sort({ createdAt: -1 })
        .limit(1);
        
        if (latestActiveOrder?.tableId) {
          finalTableId = latestActiveOrder.tableId;
          console.log(`✅ Auto-assigned tableId from userId: ${finalTableId} (Order ID: ${latestActiveOrder._id}, Status: ${latestActiveOrder.status})`);
        } else {
          console.log(`❌ No active order with tableId found for userId: ${userId}`);
        }
      }
      
      // Case 2: Customer chưa đăng nhập - tìm theo cookie
      if (!finalTableId && req.cookies?.activeOrderIds) {
        try {
          const activeOrderIds = JSON.parse(req.cookies.activeOrderIds);
          console.log(`[createOrder] Parsed activeOrderIds from cookie: ${activeOrderIds}`);

          if (activeOrderIds.length > 0) {
            // Tìm order có tableId gần nhất (ưu tiên active orders)
            let latestOrder = await Order.findOne({
              _id: { $in: activeOrderIds },
              status: { $in: ["confirmed", "preparing", "served"] },
              tableId: { $ne: null }
            })
            .sort({ createdAt: -1 })
            .limit(1);
            
            console.log(`[createOrder] Result of first query (active orders): ${latestOrder ? `ID: ${latestOrder._id}, Status: ${latestOrder.status}, TableId: ${latestOrder.tableId}` : 'Not found'}`);

            // Nếu không tìm thấy order active có tableId, tìm order pending có tableId
            if (!latestOrder) {
              latestOrder = await Order.findOne({
                _id: { $in: activeOrderIds },
                status: "pending",
                tableId: { $ne: null }
              })
              .sort({ createdAt: -1 })
              .limit(1);
              console.log(`[createOrder] Result of second query (pending orders): ${latestOrder ? `ID: ${latestOrder._id}, Status: ${latestOrder.status}, TableId: ${latestOrder.tableId}` : 'Not found'}`);
            }
            
            // Nếu vẫn không tìm thấy, tìm order gần nhất (có thể chưa có tableId)
            if (!latestOrder) {
              latestOrder = await Order.findOne({
                _id: { $in: activeOrderIds }
              })
              .sort({ createdAt: -1 })
              .limit(1);
              console.log(`[createOrder] Result of third query (any order): ${latestOrder ? `ID: ${latestOrder._id}, Status: ${latestOrder.status}, TableId: ${latestOrder.tableId}` : 'Not found'}`);
            }
            
            if (latestOrder?.tableId) {
              finalTableId = latestOrder.tableId;
              console.log(`✅ Auto-assigned tableId from cookie: ${finalTableId} (Order ID: ${latestOrder._id}, Status: ${latestOrder.status})`);
            } else {
              console.log(`⚠️ Found order in cookie but no tableId: ${latestOrder?._id}`);
            }
          } else {
            console.log(`⚠️ Cookie exists but activeOrderIds array is empty`);
          }
        } catch (e) {
          console.error("❌ Error parsing activeOrderIds cookie:", e);
        }
      }
      
      // 🔄 Fallback: Nếu không có cookie, tìm order gần nhất của guest user (trong 2 giờ)
      if (!finalTableId && !userId) {
        console.log(`🔄 Fallback: Tìm order gần nhất của guest user trong 2 giờ`);
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        
        // Tìm order gần nhất của guest user (mở rộng thời gian)
        const latestGuestOrder = await Order.findOne({
          userId: null,
          createdAt: { $gte: twoHoursAgo },
          status: { $in: ["confirmed", "preparing", "served"] },
          tableId: { $ne: null }
        })
        .sort({ createdAt: -1 })
        .limit(1);
        
        if (latestGuestOrder?.tableId) {
          finalTableId = latestGuestOrder.tableId;
          console.log(`✅ Fallback: Auto-assigned tableId from recent guest order: ${finalTableId} (Order ID: ${latestGuestOrder._id}, Status: ${latestGuestOrder.status})`);
          
          // 🔄 Tự động tạo cookie mới với order tìm được
          try {
            const newActiveOrderIds = [latestGuestOrder._id.toString()];
            res.cookie('activeOrderIds', JSON.stringify(newActiveOrderIds), {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
            console.log(`🍪 Auto-created cookie with fallback order: ${JSON.stringify(newActiveOrderIds)}`);
          } catch (e) {
            console.error("❌ Error creating fallback cookie:", e);
          }
        } else {
          console.log(`⚠️ Fallback: Không tìm thấy order gần nhất của guest user trong 2 giờ`);
        }
      }
      
      if (!finalTableId) {
        console.log(`⚠️ Không thể tự động gán tableId - waiter sẽ cần chọn bàn`);
      }
    }

    console.log(`[createOrder] Final tableId before order creation: ${finalTableId}`);

    // Kiểm tra bàn có tồn tại không (chỉ khi có tableId)
    if (finalTableId) {
      const table = await Table.findById(finalTableId);
      if (!table) {
        return res.status(404).json({ 
          success: false, 
          message: "Không tìm thấy bàn" 
        });
      }
    }

    // Tạo OrderItems từ cart data (không cần order._id vì chưa có)
    const { createdOrderItems, totalAmount } = await createOrderItemsFromCart(orderItems);

    // Tạo Payment
    const payment = new Payment({
      paymentMethod: "cash", // Mặc định thanh toán tiền mặt
      status: "unpaid",
      amountPaid: 0,
      totalAmount: totalAmount
    });
    await payment.save();

    // Tạo Order
    const order = new Order({
      tableId: finalTableId,
      orderItems: createdOrderItems,
      paymentId: payment._id,
      status: "pending",
      totalAmount: totalAmount,
      discount: 0,
      userId: userId || null,
      waiterResponse: {
        status: "pending"
      },
      customerConfirmed: false,
      confirmationHistory: [{
        action: 'order_created',
        timestamp: new Date(),
        details: 'Customer tạo đơn hàng mới'
      }]
    });

    await order.save();

    // Cập nhật OrderItems với orderId
    await OrderItem.updateMany(
      { _id: { $in: createdOrderItems } },
      { orderId: order._id }
    );

    // Cập nhật Payment với orderId
    payment.orderId = order._id;
    await payment.save();

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate("orderItems")
      .populate("tableId")
      .populate("paymentId");

    // 🍪 Lưu orderId vào cookie
    let activeOrderIds = [];
    if (req.cookies?.activeOrderIds) {
      try {
        activeOrderIds = JSON.parse(req.cookies.activeOrderIds);
      } catch (e) {
        console.error("Error parsing activeOrderIds:", e);
        activeOrderIds = [];
      }
    }
    
    // Thêm order mới vào cookie
    if (!activeOrderIds.includes(order._id.toString())) {
      activeOrderIds.push(order._id.toString());
    }
    
    // 🔄 Smart recovery: Nếu có tableId từ fallback, thêm các orders khác cùng bàn
    if (finalTableId && !tableId) {
      console.log(`🔄 Smart recovery: Tìm các orders khác cùng bàn ${finalTableId}`);
      const sameTableOrders = await Order.find({
        tableId: finalTableId,
        status: { $in: ["confirmed", "preparing", "served"] },
        _id: { $ne: order._id }
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('_id');
      
      sameTableOrders.forEach(sameOrder => {
        if (!activeOrderIds.includes(sameOrder._id.toString())) {
          activeOrderIds.push(sameOrder._id.toString());
        }
      });
      
      console.log(`🔄 Smart recovery: Thêm ${sameTableOrders.length} orders cùng bàn vào cookie`);
    }
    
    // Giới hạn tối đa 50 orders
    if (activeOrderIds.length > 50) {
      activeOrderIds = activeOrderIds.slice(-50);
    }
    
    // Set cookie
    res.cookie('activeOrderIds', JSON.stringify(activeOrderIds), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    console.log(`🍪 Updated cookie with ${activeOrderIds.length} orders: ${JSON.stringify(activeOrderIds)}`);
    console.log(`🍪 Cookie options: httpOnly=true, secure=${process.env.NODE_ENV === 'production'}, sameSite=lax, maxAge=24h`);

    // Emit WebSocket event để thông báo waiter có đơn hàng mới cần xác nhận
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "order:created", populatedOrder);
      // Broadcast to all waiter connections (not order-specific)
      webSocketService.broadcastToAllWaiters("order:needs_waiter_confirm", populatedOrder);
    }

    res.status(201).json({
      success: true,
      message: "Đặt món thành công",
      data: populatedOrder,
      autoTableAssigned: finalTableId && !tableId // Flag báo tableId tự động
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Lấy danh sách đơn hàng của user đã đăng nhập
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id; // Lấy từ auth middleware
    
    const orders = await Order.find({ userId: userId })
      .populate('tableId', 'tableNumber')
      .populate('orderItems')
      .populate('paymentId')
      .sort({ createdAt: -1 }); // Sắp xếp theo thời gian tạo mới nhất

    // Populate thông tin item trong orderItems
    for (const order of orders) {
      await populateOrderItemDetails(order.orderItems);
    }

    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Lấy thông tin đơn hàng theo ID
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .populate('tableId', 'tableNumber')
      .populate('orderItems')
      .populate('paymentId')
      .populate('servedBy', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Populate thông tin item trong orderItems
    await populateOrderItemDetails(order.orderItems);

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Thêm món mới vào order hiện có
exports.addItemsToOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderItems } = req.body;

    // Kiểm tra order tồn tại
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Kiểm tra order chưa bị hủy
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: "Không thể thêm món vào đơn hàng đã bị hủy"
      });
    }

    // Tạo OrderItems mới (mỗi suất là 1 OrderItem riêng biệt)
    const createdOrderItems = [];
    let additionalAmount = 0;

    const { calculateExpense } = require("../utils/customerHelpers");

    for (const orderItem of orderItems) {
      let item;
      
      // Kiểm tra type để xác định tìm trong Menu hay Item
      if (orderItem.type === 'menu') {
        item = await Menu.findById(orderItem.itemId).populate('items');
        if (!item) {
          return res.status(404).json({ 
            success: false, 
            message: `Không tìm thấy menu với ID: ${orderItem.itemId}` 
          });
        }
      } else {
        item = await Item.findById(orderItem.itemId).populate('ingredients.ingredient');
        if (!item) {
          return res.status(404).json({ 
            success: false, 
            message: `Không tìm thấy món ăn với ID: ${orderItem.itemId}` 
          });
        }
      }

      // Tính expense tại thời điểm đặt món
      const expense = await calculateExpense(item, orderItem.type);

      // Tạo OrderItem với số lượng được yêu cầu
      const newOrderItemData = {
        orderId: orderId,
        itemId: orderItem.itemId,
        itemName: item.name,
        itemType: orderItem.type,
        quantity: orderItem.quantity, // Sử dụng số lượng từ frontend
        price: item.price,
        expense: expense, // Giá vốn tại thời điểm đặt món
        status: "pending",
        note: orderItem.note || "",
      };

      // Nếu là combo (menu với type === 'combo'), tạo comboItems
      if (orderItem.type === 'menu' && item.type === 'combo' && item.items && item.items.length > 0) {
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
      additionalAmount += item.price * orderItem.quantity; // Tính tổng tiền theo số lượng

      // Trừ nguyên liệu từ kho khi thêm món vào order
      const { deductIngredientsFromStock } = require("../utils/customerHelpers");
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
        console.error(`❌ Lỗi khi trừ nguyên liệu cho OrderItem trong addItemsToOrder:`, error);
        // Không throw error để không làm gián đoạn quá trình thêm món
      }
    }

    // Cập nhật order với orderItems mới và totalAmount
    order.orderItems.push(...createdOrderItems);
    order.totalAmount += additionalAmount;
    
    // Reset confirmation flow khi order được modify
    order.waiterResponse.status = 'pending';
    order.waiterResponse.reason = null;
    order.waiterResponse.respondedAt = null;
    order.customerConfirmed = false;
    order.confirmationHistory.push({
      action: 'order_modified',
      timestamp: new Date(),
      details: 'Customer thêm món vào đơn hàng'
    });
    
    await order.save();

    // Cập nhật Payment với totalAmount mới
    const payment = await Payment.findById(order.paymentId);
    if (payment) {
      payment.totalAmount = order.totalAmount;
      await payment.save();
    }

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        populate: {
          path: "assignedChef",
          select: "name username"
        }
      })
      .populate("tableId")
      .populate("paymentId");

    // Emit WebSocket event để cập nhật real-time
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "order:updated", populatedOrder);
      // Thông báo waiter có đơn hàng cần xác nhận lại
      webSocketService.broadcastToAllWaiters("order:needs_waiter_confirm", populatedOrder);
    }

    res.status(200).json({
      success: true,
      message: "Thêm món thành công",
      data: populatedOrder
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Hủy món có status pending
exports.cancelOrderItem = async (req, res) => {
  try {
    const { orderId, orderItemId } = req.params;

    // Kiểm tra order tồn tại
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Kiểm tra orderItem tồn tại và thuộc về order này
    const orderItem = await OrderItem.findById(orderItemId);
    if (!orderItem || orderItem.orderId.toString() !== orderId) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy món trong đơn hàng"
      });
    }

    // Kiểm tra orderItem có status pending
    if (orderItem.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể hủy món có trạng thái chờ xử lý"
      });
    }

    // Tính toán amount cần trừ
    const itemAmount = orderItem.price * orderItem.quantity;

    // Xóa orderItem khỏi DB
    await OrderItem.findByIdAndDelete(orderItemId);

    // Remove khỏi order.orderItems array
    order.orderItems = order.orderItems.filter(id => id.toString() !== orderItemId);
    
    // Cập nhật totalAmount
    order.totalAmount -= itemAmount;
    
    // Reset confirmation flow khi order được modify
    order.waiterResponse.status = 'pending';
    order.waiterResponse.reason = null;
    order.waiterResponse.respondedAt = null;
    order.customerConfirmed = false;
    order.confirmationHistory.push({
      action: 'order_modified',
      timestamp: new Date(),
      details: 'Customer hủy món trong đơn hàng'
    });
    
    await order.save();

    // Cập nhật Payment với totalAmount mới
    const payment = await Payment.findById(order.paymentId);
    if (payment) {
      payment.totalAmount = order.totalAmount;
      await payment.save();
    }

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate("orderItems")
      .populate("tableId")
      .populate("paymentId");

    // Emit WebSocket event để cập nhật real-time
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "order:updated", populatedOrder);
      // Thông báo waiter có đơn hàng cần xác nhận lại
      webSocketService.broadcastToAllWaiters("order:needs_waiter_confirm", populatedOrder);
    }

    res.status(200).json({
      success: true,
      message: "Hủy món thành công",
      data: populatedOrder
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ"
      });
    }

    // Find and update order
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    ).populate("orderItems")
     .populate("tableId")
     .populate("paymentId");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
        shouldClearCookie: true // Flag để frontend biết cần clear cookie
      });
    }

    // Xử lý payment status dựa trên order status
    let payment = null;
    if (order.paymentId) {
      if (status === 'paid') {
        // Nếu order status là 'paid', tự động cập nhật payment status thành 'paid'
        payment = await Payment.findByIdAndUpdate(
          order.paymentId._id,
          { 
            status: 'paid',
            payTime: new Date(),
            amountPaid: order.totalAmount
          },
          { new: true }
        );
      } else {
        // Nếu order status KHÔNG phải 'paid', chuyển payment status về 'unpaid'
        payment = await Payment.findByIdAndUpdate(
          order.paymentId._id,
          { 
            status: 'unpaid',
            payTime: null,
            amountPaid: 0
          },
          { new: true }
        );
      }
    }

    // Hoàn nguyên liệu cho món chưa phục vụ khi thanh toán hoặc hủy đơn
    const { returnIngredientsForUnservedItems } = require("../utils/customerHelpers");
    
    if (status === 'paid' && payment && payment.status === 'paid') {
      // Khi thanh toán: hoàn nguyên liệu cho món chưa phục vụ
      try {
        await returnIngredientsForUnservedItems(order);
      } catch (error) {
        console.error(`❌ Lỗi khi hoàn nguyên liệu cho order ${orderId} khi thanh toán:`, error);
        // Không throw error để không làm gián đoạn quá trình thanh toán
      }
    } else if (status === 'cancelled') {
      // Khi hủy đơn: hoàn nguyên liệu cho tất cả món chưa phục vụ
      try {
        await returnIngredientsForUnservedItems(order);
        console.log(`✅ Đã hoàn nguyên liệu cho tất cả món chưa phục vụ khi hủy order ${orderId}`);
      } catch (error) {
        console.error(`❌ Lỗi khi hoàn nguyên liệu cho order ${orderId} khi hủy:`, error);
        // Không throw error để không làm gián đoạn quá trình hủy đơn
      }
    }

    // Xóa order khỏi table.orderNow khi order chuyển sang paid/cancelled
    if (['paid', 'cancelled'].includes(status) && order.tableId) {
      const table = await Table.findById(order.tableId);
      if (table && table.orderNow) {
        table.orderNow = table.orderNow.filter(oid => oid.toString() !== orderId);
        if (table.orderNow.length === 0) {
          table.status = "available";
        }
        await table.save();
      }
    }

    // 🍪 Cleanup cookie khi order hoàn thành
    if (['paid', 'cancelled'].includes(status)) {
      if (req.cookies?.activeOrderIds) {
        try {
          let activeOrderIds = JSON.parse(req.cookies.activeOrderIds);
          
          // Xóa order này khỏi cookie
          activeOrderIds = activeOrderIds.filter(id => id !== orderId);
          
          // Cleanup: Xóa các orders không còn active nữa
          if (activeOrderIds.length > 0) {
            const stillActiveOrders = await Order.find({
              _id: { $in: activeOrderIds },
              status: { $in: ["pending", "confirmed", "preparing", "served"] }
            }).select('_id');
            
            activeOrderIds = stillActiveOrders.map(o => o._id.toString());
          }
          
          // Update hoặc clear cookie
          if (activeOrderIds.length > 0) {
            res.cookie('activeOrderIds', JSON.stringify(activeOrderIds), {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 24 * 60 * 60 * 1000
            });
            console.log(`🍪 Cleaned cookie, ${activeOrderIds.length} orders remaining`);
          } else {
            res.clearCookie('activeOrderIds');
            console.log(`🍪 Cleared cookie - no active orders`);
          }
        } catch (e) {
          console.error("Error cleaning up cookie:", e);
        }
      }
    }
      
    // Reload order để có payment data mới nhất
    const updatedOrder = await Order.findById(orderId)
      .populate("orderItems")
      .populate("tableId")
      .populate("paymentId");
    
    // Emit WebSocket với order đã cập nhật payment
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "order:updated", updatedOrder);
      
      // Nếu đơn hàng bị hủy, thông báo waiter
      if (status === 'cancelled') {
        webSocketService.broadcastToAllWaiters("order:cancelled", updatedOrder);
      }
    }
    
    return res.status(200).json({
      success: true,
      message: status === 'paid' 
        ? "Cập nhật trạng thái đơn hàng và thanh toán thành công"
        : "Cập nhật trạng thái đơn hàng thành công",
      data: updatedOrder
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Tạo feedback cho order đã thanh toán
exports.createFeedback = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rating, comment } = req.body;

    // Kiểm tra order tồn tại
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Kiểm tra order đã thanh toán chưa
    if (order.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể đánh giá đơn hàng đã thanh toán"
      });
    }

    // Kiểm tra đã có feedback cho order này chưa
    const existingFeedback = await Feedback.findOne({ orderId: orderId });
    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng này đã được đánh giá"
      });
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Đánh giá phải từ 1 đến 5 sao"
      });
    }

    // Tạo feedback mới
    const feedback = new Feedback({
      orderId: orderId,
      userId: order.userId || null, // có thể null nếu khách không đăng nhập
      rating: rating,
      comment: comment || ""
    });

    await feedback.save();

    // Populate để trả về thông tin đầy đủ
    const populatedFeedback = await Feedback.findById(feedback._id)
      .populate("orderId", "_id status totalAmount")
      .populate("userId", "name email");

    res.status(201).json({
      success: true,
      message: "Cảm ơn bạn đã đánh giá!",
      data: populatedFeedback
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Lấy feedback của một order
exports.getOrderFeedback = async (req, res) => {
  try {
    const { orderId } = req.params;

    const feedback = await Feedback.findOne({ orderId: orderId })
      .populate("orderId", "_id status totalAmount")
      .populate("userId", "name email");

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Chưa có đánh giá cho đơn hàng này"
      });
    }

    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Customer xác nhận đơn hàng sau khi waiter đã approve
exports.confirmOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Tìm order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Kiểm tra order có thể xác nhận không
    if (order.status !== 'pending' || order.waiterResponse.status !== 'approved' || order.customerConfirmed) {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng không thể xác nhận"
      });
    }

    // Cập nhật order
    order.customerConfirmed = true;
    order.status = 'confirmed';
    order.confirmationHistory.push({
      action: 'customer_confirmed',
      timestamp: new Date(),
      details: 'Customer xác nhận đơn hàng'
    });

    await order.save();

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        populate: {
          path: "assignedChef",
          select: "name username"
        }
      })
      .populate("tableId")
      .populate("paymentId");

    // Emit WebSocket event để thông báo kitchen có đơn hàng mới
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "order:confirmed", populatedOrder);
      // Broadcast to all kitchen connections
      webSocketService.broadcastToAllKitchen("order:confirmed", populatedOrder);
    }

    res.status(200).json({
      success: true,
      message: "Đã xác nhận đơn hàng thành công",
      data: populatedOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Kiểm tra order có thể feedback không
exports.canFeedback = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Kiểm tra đã có feedback chưa
    const existingFeedback = await Feedback.findOne({ orderId: orderId });
    if (existingFeedback) {
      return res.status(200).json({
        success: true,
        canFeedback: false,
        message: "Đơn hàng này đã được đánh giá",
        feedback: existingFeedback
      });
    }

    // Kiểm tra order đã thanh toán chưa
    const canFeedback = order.status === 'paid';

    res.status(200).json({
      success: true,
      canFeedback: canFeedback,
      message: canFeedback ? "Có thể đánh giá đơn hàng" : "Chỉ có thể đánh giá đơn hàng đã thanh toán",
      orderStatus: order.status
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Update order item status
exports.updateOrderItemStatus = async (req, res) => {
  try {
    const { orderItemId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'preparing', 'ready', 'served'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ"
      });
    }

    // Find and update order item
    const orderItem = await OrderItem.findByIdAndUpdate(
      orderItemId,
      { status },
      { new: true }
    ).populate('itemId');

    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy món ăn trong đơn hàng"
      });
    }

    console.log('🔍 Debug updateOrderItemStatus:');
    console.log('- OrderItem ID:', orderItemId);
    console.log('- OrderItem orderId:', orderItem.orderId);
    console.log('- OrderItem status:', orderItem.status);
    
    // 🔧 Fix: Nếu orderItem.orderId là undefined, tìm Order chứa OrderItem này
    let order;
    if (!orderItem.orderId) {
      console.log('⚠️ OrderItem.orderId is undefined, searching for parent Order...');
      order = await Order.findOne({ orderItems: orderItemId })
        .populate("orderItems")
        .populate("tableId")
        .populate("paymentId");
      
      if (order) {
        console.log('✅ Found parent Order:', order._id);
        // Update OrderItem với orderId đúng
        await OrderItem.findByIdAndUpdate(orderItemId, { orderId: order._id });
        console.log('✅ Updated OrderItem with correct orderId');
      }
    } else {
      order = await Order.findById(orderItem.orderId)
        .populate("orderItems")
        .populate("tableId")
        .populate("paymentId");
    }

    console.log('- Found order:', order ? order._id : 'NOT FOUND');

    if (!order) {
      console.log('❌ Order not found for orderItem.orderId:', orderItem.orderId);
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Emit WebSocket event để cập nhật real-time
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "order:item_updated", {
        orderItem: orderItem,
        order: order
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái món ăn thành công",
      data: {
        orderItem: orderItem,
        order: order
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Update combo item status (từng món trong combo)
exports.updateComboItemStatus = async (req, res) => {
  try {
    const { orderItemId, comboItemIndex } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'preparing', 'ready', 'served'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ"
      });
    }

    // Find order item
    const orderItem = await OrderItem.findById(orderItemId);
    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy món ăn trong đơn hàng"
      });
    }

    // Check if orderItem has comboItems
    if (!orderItem.comboItems || orderItem.comboItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Món ăn này không phải là combo hoặc không có món con"
      });
    }

    // Validate comboItemIndex
    const index = parseInt(comboItemIndex);
    if (isNaN(index) || index < 0 || index >= orderItem.comboItems.length) {
      return res.status(400).json({
        success: false,
        message: "Index món con không hợp lệ"
      });
    }

    // Update combo item status
    orderItem.comboItems[index].status = status;
    
    // Tự động cập nhật status của combo dựa trên comboItems
    const { updateComboStatusBasedOnComboItems } = require("../utils/customerHelpers");
    const oldComboStatus = orderItem.status;
    const newComboStatus = updateComboStatusBasedOnComboItems(orderItem);
    if (newComboStatus && newComboStatus !== oldComboStatus) {
      orderItem.status = newComboStatus;
      console.log(`🔄 Tự động cập nhật combo status từ '${oldComboStatus}' sang '${newComboStatus}' dựa trên comboItems`);
    }
    
    await orderItem.save();

    // Find and populate order
    let order;
    if (!orderItem.orderId) {
      order = await Order.findOne({ orderItems: orderItemId })
        .populate("orderItems")
        .populate("tableId")
        .populate("paymentId");
    } else {
      order = await Order.findById(orderItem.orderId)
        .populate("orderItems")
        .populate("tableId")
        .populate("paymentId");
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Emit WebSocket event để cập nhật real-time
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "order:item_updated", {
        orderItem: orderItem,
        order: order
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái món trong combo thành công",
      data: {
        orderItem: orderItem,
        comboItem: orderItem.comboItems[index],
        order: order
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Test endpoint để update order item status (cho testing)
exports.testUpdateOrderItemStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'preparing', 'ready', 'served'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ"
      });
    }

    // Find order first
    const order = await Order.findById(orderId)
      .populate("orderItems")
      .populate("tableId")
      .populate("paymentId");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    if (!order.orderItems || order.orderItems.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không có món ăn nào"
      });
    }

    // Update first order item (for testing)
    const firstOrderItem = order.orderItems[0];
    const updatedOrderItem = await OrderItem.findByIdAndUpdate(
      firstOrderItem._id,
      { status },
      { new: true }
    ).populate('itemId');

    if (!updatedOrderItem) {
      return res.status(404).json({
        success: false,
        message: "Không thể cập nhật món ăn"
      });
    }

    // Reload order with updated items
    const updatedOrder = await Order.findById(orderId)
      .populate("orderItems")
      .populate("tableId")
      .populate("paymentId");

    // Emit WebSocket event để cập nhật real-time
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "order:item_updated", {
        orderItem: updatedOrderItem,
        order: updatedOrder
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái món ăn thành công",
      data: {
        orderItem: updatedOrderItem,
        order: updatedOrder
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get latest order (for testing purposes)
exports.getLatestOrder = async (req, res) => {
  try {
    const latestOrder = await Order.findOne()
      .populate('tableId', 'tableNumber')
      .populate('orderItems')
      .populate('paymentId')
      .sort({ createdAt: -1 }); // Sắp xếp theo thời gian tạo mới nhất

    if (!latestOrder) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng nào"
      });
    }

    // Populate thông tin item trong orderItems
    await populateOrderItemDetails(latestOrder.orderItems);

    res.status(200).json({
      success: true,
      message: "Lấy đơn hàng mới nhất thành công",
      data: latestOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Customer bắt đầu sửa đơn hàng - xóa bàn và người phục vụ
exports.startEditOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Kiểm tra order tồn tại
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Kiểm tra order chưa bị hủy
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: "Không thể sửa đơn hàng đã bị hủy"
      });
    }

    let oldTable = null;

    // Nếu order có tableId, giải phóng bàn cũ
    if (order.tableId) {
      oldTable = await Table.findById(order.tableId);
      
      if (oldTable) {
        // Kiểm tra bàn này có đang giữ order này không
        if (oldTable.orderNow && oldTable.orderNow.some(oid => oid.toString() === orderId)) {
          // Remove order khỏi mảng
          oldTable.orderNow = oldTable.orderNow.filter(oid => oid.toString() !== orderId);
          // Nếu không còn order nào active, set bàn về available
          if (oldTable.orderNow.length === 0) {
            oldTable.status = "available";
          }
          await oldTable.save();
        }
      }
    }

    // Xóa tableId và servedBy khỏi order
    order.tableId = null;
    order.servedBy = null;
    
    // Reset waiterResponse về pending - nhưng chỉ khi order chưa được confirmed
    // Nếu order đã được confirmed, giữ nguyên status để không xuất hiện lại trong pending list
    if (order.status === 'pending') {
      order.waiterResponse.status = 'pending';
      order.waiterResponse.reason = null;
      order.waiterResponse.respondedAt = null;
    }
    order.customerConfirmed = false;
    
    // Broadcast cập nhật trạng thái bàn cho waiter (nếu có bàn được giải phóng)
    if (oldTable && oldTable._id) {
      // Lưu lại thông tin bàn đã giải phóng để broadcast
      const tableInfo = {
        _id: oldTable._id,
        tableNumber: oldTable.tableNumber,
        status: oldTable.status, // đã là "available" sau khi save
        orderNow: []
      };
      
      const webSocketService = req.app.get("webSocketService");
      if (webSocketService) {
        webSocketService.broadcastTableUpdate(oldTable._id, tableInfo);
      }
    }
    
    // Thêm vào confirmationHistory
    order.confirmationHistory.push({
      action: 'customer_started_edit',
      timestamp: new Date(),
      details: 'Customer bắt đầu sửa đổi đơn hàng - bàn và người phục vụ đã được xóa'
    });
    
    await order.save();

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate("orderItems")
      .populate("tableId")
      .populate("paymentId");

    // Emit WebSocket event - chỉ thông báo customer, KHÔNG thông báo waiter
    // vì order chưa sẵn sàng để waiter approve lại (còn đang edit)
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "order:started_edit", populatedOrder);
      // KHÔNG broadcast cho waiter vì order chỉ bắt đầu edit, chưa gửi lại cho waiter
      // webSocketService.broadcastToAllWaiters("order:needs_waiter_confirm", populatedOrder);
    }

    res.status(200).json({
      success: true,
      message: "Đã bắt đầu sửa đơn hàng. Bàn đã được giải phóng, waiter sẽ chọn bàn mới khi xác nhận.",
      data: populatedOrder
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};