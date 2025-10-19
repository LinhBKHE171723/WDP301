const Menu = require("../models/Menu");
const Item = require("../models/Item");
const Table = require("../models/Table");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Payment = require("../models/Payment");
const Feedback = require("../models/Feedback");

// Lấy thông tin bàn theo số bàn
exports.getTableByNumber = async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const table = await Table.findOne({ tableNumber: parseInt(tableNumber) });
    
    if (!table) {
      return res.status(404).json({ 
        success: false, 
        message: "Không tìm thấy bàn" 
      });
    }

    // Kiểm tra status của bàn
    if (table.status === 'occupied') {
      return res.status(400).json({
        success: false,
        message: "Bàn này đang được sử dụng. Vui lòng chọn bàn khác."
      });
    }

    if (table.status === 'reserved') {
      return res.status(400).json({
        success: false,
        message: "Bàn này đã được đặt trước. Vui lòng chọn bàn khác."
      });
    }

    // Chỉ cho phép vào menu khi bàn có status 'available'
    if (table.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: "Bàn này hiện không khả dụng. Vui lòng chọn bàn khác."
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
    const { tableId, orderItems, customerName, customerPhone } = req.body;

    // Kiểm tra bàn có tồn tại không (chỉ khi có tableId)
    if (tableId) {
      const table = await Table.findById(tableId);
      if (!table) {
        return res.status(404).json({ 
          success: false, 
          message: "Không tìm thấy bàn" 
        });
      }
    }

    // Tạo OrderItems (không merge ở DB để có thể track từng suất riêng biệt)
    const createdOrderItems = [];
    let totalAmount = 0;

    console.log('📦 Creating order items:', orderItems);

    for (const orderItem of orderItems) {
      let item;
      
      console.log('🔍 Processing order item:', orderItem);
      
      // Kiểm tra type để xác định tìm trong Menu hay Item
      if (orderItem.type === 'menu') {
        item = await Menu.findById(orderItem.itemId);
        if (!item) {
          console.log('❌ Menu not found:', orderItem.itemId);
          return res.status(404).json({ 
            success: false, 
            message: `Không tìm thấy menu với ID: ${orderItem.itemId}` 
          });
        }
      } else {
        item = await Item.findById(orderItem.itemId);
        if (!item) {
          console.log('❌ Item not found:', orderItem.itemId);
          return res.status(404).json({ 
            success: false, 
            message: `Không tìm thấy món ăn với ID: ${orderItem.itemId}` 
          });
        }
      }

      console.log('✅ Found item:', item.name, 'Price:', item.price);

      // Tạo OrderItem riêng biệt cho mỗi suất (quantity = 1)
      for (let i = 0; i < orderItem.quantity; i++) {
        const newOrderItem = new OrderItem({
          itemId: orderItem.itemId,
          itemName: item.name,
          itemType: orderItem.type,
          quantity: 1, // Mỗi OrderItem chỉ có quantity = 1
          price: item.price,
          note: orderItem.note || "",
        });

        console.log('💾 Saving order item:', newOrderItem);
        await newOrderItem.save();
        console.log('✅ Order item saved with ID:', newOrderItem._id);
        
        createdOrderItems.push(newOrderItem._id);
        totalAmount += item.price;
      }
    }

    console.log('📋 Created order items:', createdOrderItems);
    console.log('💰 Total amount:', totalAmount);

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
      tableId: tableId,
      orderItems: createdOrderItems,
      paymentId: payment._id,
      status: "pending",
      totalAmount: totalAmount,
      discount: 0,
      customerName: customerName || "Khách vãng lai",
      customerPhone: customerPhone || ""
    });

    await order.save();
    console.log('✅ Order saved with ID:', order._id);

    // Cập nhật OrderItems với orderId
    console.log('🔗 Updating order items with orderId:', order._id);
    const updateResult = await OrderItem.updateMany(
      { _id: { $in: createdOrderItems } },
      { orderId: order._id }
    );
    console.log('✅ Order items updated:', updateResult);

    // Cập nhật Payment với orderId
    payment.orderId = order._id;
    await payment.save();

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate("orderItems")
      .populate("tableId")
      .populate("paymentId");

    // Emit WebSocket event để cập nhật real-time
    const io = req.app.get("io");
    if (io) {
      io.to(`order-${order._id}`).emit("order-updated", populatedOrder);
    }

    res.status(201).json({
      success: true,
      message: "Đặt món thành công",
      data: populatedOrder
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
      .populate('paymentId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Populate thông tin item trong orderItems
    for (let i = 0; i < order.orderItems.length; i++) {
      const orderItem = order.orderItems[i];
      if (orderItem.itemId) {
        // Tìm trong cả Item và Menu
        let item = await Item.findById(orderItem.itemId);
        if (!item) {
          item = await Menu.findById(orderItem.itemId);
        }
        orderItem.itemId = item;
      }
    }

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

    for (const orderItem of orderItems) {
      let item;
      
      // Kiểm tra type để xác định tìm trong Menu hay Item
      if (orderItem.type === 'menu') {
        item = await Menu.findById(orderItem.itemId);
        if (!item) {
          return res.status(404).json({ 
            success: false, 
            message: `Không tìm thấy menu với ID: ${orderItem.itemId}` 
          });
        }
      } else {
        item = await Item.findById(orderItem.itemId);
        if (!item) {
          return res.status(404).json({ 
            success: false, 
            message: `Không tìm thấy món ăn với ID: ${orderItem.itemId}` 
          });
        }
      }

      // Tạo OrderItem riêng biệt cho mỗi suất (quantity = 1)
      for (let i = 0; i < orderItem.quantity; i++) {
        const newOrderItem = new OrderItem({
          orderId: orderId,
          itemId: orderItem.itemId,
          itemName: item.name,
          itemType: orderItem.type,
          quantity: 1, // Mỗi OrderItem chỉ có quantity = 1
          price: item.price,
          status: "pending",
          note: orderItem.note || "",
        });

        await newOrderItem.save();
        createdOrderItems.push(newOrderItem._id);
        additionalAmount += item.price;
        console.log(`➕ Added new item: ${item.name} (suất ${i + 1})`);
      }
    }

    // Cập nhật order với orderItems mới và totalAmount
    order.orderItems.push(...createdOrderItems);
    order.totalAmount += additionalAmount;
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
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'];
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
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Emit WebSocket event để cập nhật real-time
    const io = req.app.get("io");
    if (io) {
      io.to(`order-${order._id}`).emit("order-updated", order);
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái đơn hàng thành công",
      data: order
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
