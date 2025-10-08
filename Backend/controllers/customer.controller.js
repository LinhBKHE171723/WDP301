const Menu = require("../models/Menu");
const Item = require("../models/Item");
const Table = require("../models/Table");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Payment = require("../models/Payment");

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

    // Kiểm tra bàn có tồn tại không
    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ 
        success: false, 
        message: "Không tìm thấy bàn" 
      });
    }

    // Tạo OrderItems
    const createdOrderItems = [];
    let totalAmount = 0;

    for (const orderItem of orderItems) {
      const item = await Item.findById(orderItem.itemId);
      if (!item) {
        return res.status(404).json({ 
          success: false, 
          message: `Không tìm thấy món ăn với ID: ${orderItem.itemId}` 
        });
      }

      const newOrderItem = new OrderItem({
        itemId: orderItem.itemId,
        quantity: orderItem.quantity,
        note: orderItem.note || "",
        price: item.price
      });

      await newOrderItem.save();
      createdOrderItems.push(newOrderItem._id);
      totalAmount += item.price * orderItem.quantity;
    }

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
