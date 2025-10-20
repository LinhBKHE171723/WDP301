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
    console.log("🚀 Bắt đầu seeding database...");

    // =====================================================
    // 1️⃣ XOÁ TOÀN BỘ DỮ LIỆU CŨ
    // =====================================================
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
    console.log("🧹 Toàn bộ dữ liệu cũ đã được xoá sạch!");

    // =====================================================
    // 2️⃣ TẠO NGƯỜI DÙNG MẪU
    // =====================================================
    const [customer, waiter, chef] = await Promise.all([
      User.create({
        name: "Nguyễn Văn Khách",
        username: "customer01",
        password: "password123",
        email: "customer@example.com",
        phone: "0123456789",
        role: "customer",
        point: 100,
      }),
      User.create({
        name: "Trần Thị Phục Vụ",
        username: "waiter01",
        password: "password123",
        email: "waiter@example.com",
        phone: "0987654321",
        role: "waiter",
      }),
      User.create({
        name: "Đầu Bếp Trưởng",
        username: "chef01",
        password: "password123",
        email: "chef@example.com",
        phone: "0908888999",
        role: "chef",
      }),
    ]);
    console.log("👤 Users created.");

    // =====================================================
    // 3️⃣ TẠO NGUYÊN LIỆU (INGREDIENTS)
    // =====================================================
    const ingredients = await Ingredient.insertMany([
      { name: "Thịt bò", unit: "kg", stockQuantity: 50, minStock: 10 },
      { name: "Cá hồi", unit: "kg", stockQuantity: 30, minStock: 5 },
      { name: "Khoai tây", unit: "kg", stockQuantity: 40, minStock: 8 },
      { name: "Rau xà lách", unit: "bó", stockQuantity: 60, minStock: 10 },
      { name: "Trứng gà", unit: "quả", stockQuantity: 100, minStock: 20 },
      { name: "Bột mì", unit: "kg", stockQuantity: 25, minStock: 5 },
      { name: "Tôm tươi", unit: "kg", stockQuantity: 45, minStock: 10 },
      { name: "Phô mai", unit: "kg", stockQuantity: 20, minStock: 5 },
      { name: "Thịt xông khói", unit: "kg", stockQuantity: 25, minStock: 5 },
      { name: "Sốt cà chua", unit: "chai", stockQuantity: 15, minStock: 3 },
    ]);
    console.log("🥬 Ingredients created.");

    // =====================================================
    // 4️⃣ TẠO MÓN ĂN (ITEMS)
    // =====================================================
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
        image: "bo-bit-tet.jpg",
      },
      {
        name: "Cá Hồi Áp Chảo",
        description: "Cá hồi Na Uy sốt chanh dây",
        category: "Món chính",
        price: 280000,
        ingredients: [ingredients.find((i) => i.name === "Cá hồi")._id],
        image: "ca-hoi-ap-chao.jpg",
      },
      {
        name: "Tôm Tempura",
        description: "Tôm chiên xù kiểu Nhật, ăn kèm nước chấm gừng",
        category: "Món chính",
        price: 180000,
        ingredients: [
          ingredients.find((i) => i.name === "Tôm tươi")._id,
          ingredients.find((i) => i.name === "Bột mì")._id,
        ],
        image: "tom-tempura.jpg",
      },
      {
        name: "Salad Rau Củ",
        description: "Rau củ tươi trộn dầu giấm",
        category: "Khai vị",
        price: 70000,
        ingredients: [ingredients.find((i) => i.name === "Rau xà lách")._id],
        image: "salad-rau-cu.jpg",
      },
      {
        name: "Mì Ý Carbonara",
        description: "Mì Ý kem trứng và thịt xông khói",
        category: "Món chính",
        price: 220000,
        ingredients: [
          ingredients.find((i) => i.name === "Trứng gà")._id,
          ingredients.find((i) => i.name === "Bột mì")._id,
          ingredients.find((i) => i.name === "Thịt xông khói")._id,
        ],
        image: "mi-y-carbonara.jpg",
      },
      {
        name: "Pizza Phô Mai",
        description: "Pizza phô mai kéo sợi với sốt cà chua nhà làm",
        category: "Món chính",
        price: 200000,
        ingredients: [
          ingredients.find((i) => i.name === "Phô mai")._id,
          ingredients.find((i) => i.name === "Bột mì")._id,
          ingredients.find((i) => i.name === "Sốt cà chua")._id,
        ],
        image: "pizza-pho-mai.jpg",
      },
    ]);
    console.log("🍽️ Items created.");

    // =====================================================
    // 5️⃣ TẠO MENU
    // =====================================================
    const menus = await Menu.insertMany([
      {
        name: "Menu Trưa Gọn Nhẹ",
        description: "Phù hợp cho bữa trưa nhanh gọn",
        items: [
          items.find((i) => i.name === "Salad Rau Củ")._id,
          items.find((i) => i.name === "Bò Bít Tết")._id,
        ],
        price: 300000,
      },
      {
        name: "Menu Tối Sang Trọng",
        description: "Thực đơn đặc biệt cho buổi tối",
        items: [
          items.find((i) => i.name === "Cá Hồi Áp Chảo")._id,
          items.find((i) => i.name === "Tôm Tempura")._id,
          items.find((i) => i.name === "Mì Ý Carbonara")._id,
        ],
        price: 450000,
      },
    ]);
    console.log("📜 Menus created.");

    // =====================================================
    // 6️⃣ TẠO 10 BÀN
    // =====================================================
    const tables = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        Table.create({
          tableNumber: i + 1,
          qrCode: `QR_TABLE_${i + 1}`,
          status: i < 5 ? "occupied" : "available",
        })
      )
    );
    console.log("🍽️ Tables created.");

    // =====================================================
    // 7️⃣ TẠO ORDER + ORDER ITEMS + PAYMENT
    // =====================================================
    const orderStatuses = [
      "pending",
      "waiting_confirm",
      "confirmed",
      "preparing",
      "ready",
      "served",
    ];
    const itemStatuses = ["pending", "preparing", "ready", "served"];

    for (let i = 0; i < 10; i++) {
      const table = tables[i];
      const numItems = Math.floor(Math.random() * 2) + 3; // 3–4 món
      const selectedOrderItems = [];

      for (let j = 0; j < numItems; j++) {
        const randomItem = items[Math.floor(Math.random() * items.length)];
        const orderItem = await OrderItem.create({
          itemId: randomItem._id,
          itemName: randomItem.name,
          itemType: "item",
          quantity: Math.floor(Math.random() * 2) + 1,
          price: randomItem.price,
          assignedChef: chef._id,
          status:
            itemStatuses[Math.floor(Math.random() * itemStatuses.length)],
          note: j === 0 ? "Không cay" : "",
        });
        selectedOrderItems.push(orderItem);
      }

      const payment = await Payment.create({
        paymentMethod: "card",
        status: "unpaid",
        amountPaid: 0,
      });

      const order = await Order.create({
        userId: customer._id,
        servedBy: i < 5 ? waiter._id : null, // Waiter phục vụ 5 bàn đầu
        tableId: table._id,
        orderItems: selectedOrderItems.map((oi) => oi._id),
        paymentId: payment._id,
        status: orderStatuses[Math.floor(Math.random() * orderStatuses.length)],
        totalAmount: selectedOrderItems.reduce(
          (sum, oi) => sum + oi.price * oi.quantity,
          0
        ),
        discount: 0,
      });

      // Gán reference ngược
      await Promise.all([
        ...selectedOrderItems.map(async (oi) => {
          oi.orderId = order._id;
          await oi.save();
        }),
        Payment.updateOne({ _id: payment._id }, { orderId: order._id }),
        Table.updateOne(
          { _id: table._id },
          { $push: { orders: order._id }, status: "occupied" }
        ),
      ]);
    }
    console.log("🧾 Orders & Payments created.");

    // =====================================================
    // 8️⃣ FEEDBACK MẪU
    // =====================================================
    const oneOrder = await Order.findOne();
    await Feedback.create({
      orderId: oneOrder._id,
      userId: customer._id,
      rating: 5,
      comment: "Món ăn ngon, phục vụ nhanh!",
    });
    console.log("💬 Feedback created.");

    // =====================================================
    // 9️⃣ PURCHASE ORDER (nhập nguyên liệu)
    // =====================================================
    const beef = ingredients.find((i) => i.name === "Thịt bò");
    await PurchaseOrder.create({
      ingredientId: beef._id,
      quantity: 20,
      unit: "kg",
      price: 2500000,
    });
    console.log("📦 Purchase order created.");

    console.log("✅ SEED DATABASE THÀNH CÔNG!");
  } catch (error) {
    console.error("❌ Lỗi khi seed database:", error);
  }
};

module.exports = seedDatabase;
