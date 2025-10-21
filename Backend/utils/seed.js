const mongoose = require("mongoose");
const User = require("../models/User");
const Ingredient = require("../models/Ingredient");
const Item = require("../models/Item");
const Menu = require("../models/Menu");
const Table = require("../models/Table");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Payment = require("../models/Payment");
const Feedback = require("../models/Feedback");
const PurchaseOrder = require("../models/PurchaseOrder");

const seedDatabase = async () => {
  try {
    // --- USER ---
    if ((await User.countDocuments()) === 0) {
      const customer = await User.create({
        name: "Khach Hang A",
        username: "customer01",
        password: "password123", 
        email: "customer@example.com",
        phone: "0123456789",
        role: "customer",
        point: 100,
      });

      const waiter = await User.create({
        name: "Nhan Vien Phuc Vu",
        username: "waiter01",
        password: "password123",
        email: "waiter@example.com",
        phone: "0987654321",
        role: "waiter",
      });
    }

    // --- INGREDIENT ---
    if ((await Ingredient.countDocuments()) === 0) {
      await Ingredient.create({
        name: "Thịt bò",
        unit: "kg",
        stockQuantity: 50,
        minStock: 10,
      });
    }

    // --- ITEM ---
    if ((await Item.countDocuments()) === 0) {
      const ingredient = await Ingredient.findOne({ name: "Thịt bò" });
      await Item.create({
        name: "Bò Bít Tết",
        description: "Bò bít tết hảo hạng",
        category: "Món chính",
        price: 250000,
        ingredients: [ingredient._id],
        image: "bo_bit_tet.jpg",
      });
    }

    // --- MENU ---
    if ((await Menu.countDocuments()) === 0) {
      const item = await Item.findOne({ name: "Bò Bít Tết" });
      await Menu.create({
        name: "Menu Tối Đặc Biệt",
        description: "Thực đơn dành cho buổi tối",
        items: [item._id],
        price: 250000,
      });
    }

    // --- TABLE ---
    if ((await Table.countDocuments()) === 0) {
      await Table.create({
        tableNumber: 1,
        qrCode: "some_qr_code_string_for_table_1",
        status: "available",
      });
    }

    // --- ORDER FLOW (ORDER, ORDERITEM, PAYMENT, FEEDBACK) ---
    if ((await Order.countDocuments()) === 0) {
      // Lấy dữ liệu đã tạo ở trên
      const customer = await User.findOne({ role: "customer" });
      const waiter = await User.findOne({ role: "waiter" });
      const table = await Table.findOne({ tableNumber: 1 });
      const item = await Item.findOne({ name: "Bò Bít Tết" });

      // 1. Tạo OrderItem
      const orderItem = await OrderItem.create({
        itemId: item._id,
        quantity: 2,
        note: "Chín vừa",
      });

      // 2. Tạo Payment
      const payment = await Payment.create({
        paymentMethod: "card",
        status: "unpaid",
        amountPaid: 0,
      });

      // 3. Tạo Order chính
      const order = await Order.create({
        userId: customer._id,
        servedBy: waiter._id,
        tableId: table._id,
        orderItems: [orderItem._id],
        paymentId: payment._id,
        status: "pending",
        totalAmount: item.price * orderItem.quantity,
        discount: 0,
      });

      // Cập nhật lại tham chiếu ngược từ các document con
      orderItem.orderId = order._id;
      await orderItem.save();

      payment.orderId = order._id;
      await payment.save();

      // 4. Tạo Feedback (tùy chọn)
      await Feedback.create({
        orderId: order._id,
        userId: customer._id,
        rating: 5,
        comment: "Món ăn rất ngon!",
      });
    }

    // --- PURCHASE ORDER ---
    if ((await PurchaseOrder.countDocuments()) === 0) {
      const ingredient = await Ingredient.findOne({ name: "Thịt bò" });
      await PurchaseOrder.create({
        ingredientId: ingredient._id,
        quantity: 20,
        unit: "kg",
        price: 2500000,
      });
    }

    console.log("✅ Database seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
};

module.exports = seedDatabase;
