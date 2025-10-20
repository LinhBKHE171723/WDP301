// backend/seed/seedDatabase.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
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
    console.log("🚀 Bắt đầu seed database...");

    // 1️⃣ Xoá toàn bộ dữ liệu cũ
    await Promise.all([
      User.deleteMany(),
      Ingredient.deleteMany(),
      Item.deleteMany(),
      Menu.deleteMany(),
      Table.deleteMany(),
      Order.deleteMany(),
      OrderItem.deleteMany(),
      Payment.deleteMany(),
      Feedback.deleteMany(),
      PurchaseOrder.deleteMany(),
    ]);
    console.log("🧹 Đã xoá toàn bộ dữ liệu cũ.");

    // 2️⃣ Tạo user mẫu (dùng create để chạy pre('save') → hash mật khẩu)
    const userData = [
      {
        name: "Nguyễn Văn Khách",
        username: "customer01",
        password: "password123",
        email: "customer@example.com",
        phone: "0123456789",
        role: "customer",
        point: 100,
      },
      {
        name: "Trần Thị Phục Vụ 1",
        username: "waiter01",
        password: "password123",
        email: "waiter1@example.com",
        phone: "0987654321",
        role: "waiter",
      },
      {
        name: "Phạm Văn Phục Vụ 2",
        username: "waiter02",
        password: "password123",
        email: "waiter2@example.com",
        phone: "0987654322",
        role: "waiter",
      },
      {
        name: "Lê Thị Phục Vụ 3",
        username: "waiter03",
        password: "password123",
        email: "waiter3@example.com",
        phone: "0987654323",
        role: "waiter",
      },
      {
        name: "Đầu Bếp Trưởng",
        username: "chef01",
        password: "password123",
        email: "chef@example.com",
        phone: "0908888999",
        role: "chef",
      },
      {
        name: "Quản Lý Bếp",
        username: "kitchen01",
        password: "123456",
        email: "kitchen@example.com",
        phone: "0908888988",
        role: "kitchen_manager",
      },
      {
        name: "Admin Nhà Hàng",
        username: "admin01",
        password: "password123",
        email: "admin@example.com",
        phone: "0909999000",
        role: "admin",
      },
    ];

    const users = [];
    for (const data of userData) {
      const user = await User.create(data);
      users.push(user);
    }
    console.log("👤 Đã tạo user mẫu và hash mật khẩu thành công.");

    const customer = users.find((u) => u.role === "customer");
    const waiters = users.filter((u) => u.role === "waiter");
    const chef = users.find((u) => u.role === "chef");

    // 3️⃣ Nguyên liệu
    const ingredients = await Ingredient.insertMany([
      { name: "Thịt bò", unit: "kg", stockQuantity: 50, minStock: 10 },
      { name: "Cá hồi", unit: "kg", stockQuantity: 30, minStock: 5 },
      { name: "Khoai tây", unit: "kg", stockQuantity: 40, minStock: 8 },
      { name: "Rau xà lách", unit: "bó", stockQuantity: 60, minStock: 10 },
      { name: "Trứng gà", unit: "quả", stockQuantity: 100, minStock: 20 },
      { name: "Tôm tươi", unit: "kg", stockQuantity: 45, minStock: 10 },
      { name: "Phô mai", unit: "kg", stockQuantity: 25, minStock: 5 },
      { name: "Bột mì", unit: "kg", stockQuantity: 30, minStock: 8 },
      { name: "Thịt gà", unit: "kg", stockQuantity: 35, minStock: 5 },
      { name: "Ớt chuông", unit: "kg", stockQuantity: 20, minStock: 3 },
      { name: "Cà chua", unit: "kg", stockQuantity: 40, minStock: 8 },
      { name: "Hành tây", unit: "kg", stockQuantity: 25, minStock: 5 },
      { name: "Bơ", unit: "hộp", stockQuantity: 15, minStock: 3 },
      { name: "Nước mắm", unit: "chai", stockQuantity: 50, minStock: 10 },
      { name: "Tỏi", unit: "kg", stockQuantity: 30, minStock: 6 },
    ]);
    console.log("🥬 Đã thêm nguyên liệu mẫu.");

    // 4️⃣ Món ăn
    const items = await Item.insertMany([
      {
        name: "Bò Bít Tết",
        description: "Thịt bò Úc nướng chảo gang, kèm khoai tây chiên",
        category: "Món chính",
        price: 250000,
        ingredients: [
          ingredients.find((i) => i.name === "Thịt bò")._id,
          ingredients.find((i) => i.name === "Khoai tây")._id,
        ],
      },
      {
        name: "Cá Hồi Áp Chảo",
        description: "Cá hồi Na Uy sốt chanh dây",
        category: "Món chính",
        price: 280000,
        ingredients: [ingredients.find((i) => i.name === "Cá hồi")._id],
      },
      {
        name: "Tôm Tempura",
        description: "Tôm chiên xù kiểu Nhật",
        category: "Món chính",
        price: 180000,
        ingredients: [
          ingredients.find((i) => i.name === "Tôm tươi")._id,
          ingredients.find((i) => i.name === "Bột mì")._id,
        ],
      },
      {
        name: "Mì Ý Carbonara",
        description: "Mì Ý kem trứng và thịt xông khói",
        category: "Món chính",
        price: 220000,
        ingredients: [
          ingredients.find((i) => i.name === "Trứng gà")._id,
          ingredients.find((i) => i.name === "Bột mì")._id,
        ],
      },
      {
        name: "Salad Rau Củ",
        description: "Rau củ tươi trộn dầu giấm",
        category: "Khai vị",
        price: 70000,
        ingredients: [ingredients.find((i) => i.name === "Rau xà lách")._id],
      },
    ]);
    console.log("🍽️ Đã thêm món ăn mẫu.");

    // 5️⃣ Bàn ăn (20 bàn)
    const tables = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        Table.create({
          tableNumber: i + 1,
          qrCode: `QR_TABLE_${i + 1}`,
          status: i < 10 ? "occupied" : "available",
        })
      )
    );
    console.log("🍽️ Đã tạo bàn ăn.");

    // 6️⃣ Tạo order cho 10 bàn đầu
    for (let i = 0; i < 10; i++) {
      const table = tables[i];
      const selectedItems = [];
      for (let j = 0; j < 3; j++) {
        const randomItem = items[Math.floor(Math.random() * items.length)];
        const orderItem = await OrderItem.create({
          itemId: randomItem._id,
          itemName: randomItem.name,
          itemType: "item",
          quantity: Math.floor(Math.random() * 2) + 1,
          price: randomItem.price,
          assignedChef: chef._id,
          status: "preparing",
        });
        selectedItems.push(orderItem);
      }

      const payment = await Payment.create({
        paymentMethod: "card",
        status: "unpaid",
        amountPaid: 0,
      });

      const order = await Order.create({
        userId: customer._id,
        servedBy: waiters[i % waiters.length]._id,
        tableId: table._id,
        orderItems: selectedItems.map((oi) => oi._id),
        paymentId: payment._id,
        status: "preparing",
        totalAmount: selectedItems.reduce(
          (sum, oi) => sum + oi.price * oi.quantity,
          0
        ),
        discount: 0,
      });

      table.orderNow = order._id;
      await table.save();
    }

    console.log("✅ SEED DATABASE THÀNH CÔNG!");
  } catch (error) {
    console.error("❌ Lỗi khi seed database:", error);
  }
};

module.exports = seedDatabase;
