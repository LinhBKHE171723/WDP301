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
    console.log("🚀 Bắt đầu seed database...");

    // 1️⃣ Xóa toàn bộ dữ liệu cũ
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

    // 2️⃣ Tạo user mẫu (dùng for để trigger pre-save hash)
    const userData = [
      // Customers
      {
        name: "Nguyễn Văn Khách",
        username: "customer01",
        password: "customer123",
        email: "customer@example.com",
        phone: "0123456789",
        role: "customer",
        point: 100,
      },
      {
        name: "Trần Thị Minh",
        username: "customer02",
        password: "customer123",
        email: "customer02@example.com",
        phone: "0123456790",
        role: "customer",
        point: 250,
      },
      {
        name: "Lê Văn Hùng",
        username: "customer03",
        password: "customer123",
        email: "customer03@example.com",
        phone: "0123456791",
        role: "customer",
        point: 150,
      },
      {
        name: "Phạm Thị Lan",
        username: "customer04",
        password: "customer123",
        email: "customer04@example.com",
        phone: "0123456792",
        role: "customer",
        point: 300,
      },
      {
        name: "Hoàng Văn Nam",
        username: "customer05",
        password: "customer123",
        email: "customer05@example.com",
        phone: "0123456793",
        role: "customer",
        point: 80,
      },
      {
        name: "Ngô Thị Mai",
        username: "customer06",
        password: "customer123",
        email: "customer06@example.com",
        phone: "0123456794",
        role: "customer",
        point: 200,
      },
      {
        name: "Đỗ Văn Tuấn",
        username: "customer07",
        password: "customer123",
        email: "customer07@example.com",
        phone: "0123456795",
        role: "customer",
        point: 120,
      },
      {
        name: "Vũ Thị Hoa",
        username: "customer08",
        password: "customer123",
        email: "customer08@example.com",
        phone: "0123456796",
        role: "customer",
        point: 180,
      },
      {
        name: "Bùi Văn Đức",
        username: "customer09",
        password: "customer123",
        email: "customer09@example.com",
        phone: "0123456797",
        role: "customer",
        point: 90,
      },
      {
        name: "Đinh Thị Linh",
        username: "customer10",
        password: "customer123",
        email: "customer10@example.com",
        phone: "0123456798",
        role: "customer",
        point: 220,
      },
      // Waiters
      {
        name: "Trần Thị Phục Vụ 1",
        username: "waiter01",
        password: "waiter1@123",
        email: "waiter1@example.com",
        phone: "0987654321",
        role: "waiter",
      },
      {
        name: "Phạm Văn Phục Vụ 2",
        username: "waiter02",
        password: "waiter2@123",
        email: "waiter2@example.com",
        phone: "0987654322",
        role: "waiter",
      },
      {
        name: "Lê Thị Phục Vụ 3",
        username: "waiter03",
        password: "waiter3@123",
        email: "waiter3@example.com",
        phone: "0987654323",
        role: "waiter",
      },
      {
        name: "Nguyễn Văn Phục Vụ 4",
        username: "waiter04",
        password: "waiter4@123",
        email: "waiter4@example.com",
        phone: "0987654324",
        role: "waiter",
      },
      {
        name: "Hoàng Thị Phục Vụ 5",
        username: "waiter05",
        password: "waiter5@123",
        email: "waiter5@example.com",
        phone: "0987654325",
        role: "waiter",
      },
      // Chefs
      {
        name: "Bùi Khánh Linh",
        username: "chef01",
        password: "chef@123",
        email: "chef@example.com",
        phone: "0908888999",
        role: "chef",
      },
      {
        name: "Phan Tiến Mạnh",
        username: "chef02",
        password: "chef@123",
        email: "chef02@example.com",
        phone: "0908888998",
        role: "chef",
      },
      {
        name: "Minh Chúc",
        username: "chef03",
        password: "chef@123",
        email: "chef03@example.com",
        phone: "0908888997",
        role: "chef",
      },
      // Kitchen Managers
      {
        name: "Quản Lý Bếp",
        username: "kitchen01",
        password: "kitchen@123",
        email: "kitchen@example.com",
        phone: "0908888988",
        role: "kitchen_manager",
      },
      {
        name: "Phó Quản Lý Bếp",
        username: "kitchen02",
        password: "kitchen@123",
        email: "kitchen02@example.com",
        phone: "0908888987",
        role: "kitchen_manager",
      },
      // Admin
      {
        name: "Admin Nhà Hàng",
        username: "admin01",
        password: "admin@123",
        email: "admin@example.com",
        phone: "0909999000",
        role: "admin",
      },
    ];

    const users = [];
    for (const data of userData) {
      const user = await User.create(data); // middleware hash password
      users.push(user);
      console.log(`✅ Tạo user: ${user.username}`);
    }

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
      // Thêm nguyên liệu mới
      { name: "Thịt heo", unit: "kg", stockQuantity: 8, minStock: 10 }, // Stock thấp để test cảnh báo
      { name: "Cá basa", unit: "kg", stockQuantity: 25, minStock: 5 },
      { name: "Mực tươi", unit: "kg", stockQuantity: 20, minStock: 5 },
      { name: "Cua biển", unit: "kg", stockQuantity: 15, minStock: 3 },
      { name: "Nấm hương", unit: "kg", stockQuantity: 12, minStock: 2 },
      { name: "Rau muống", unit: "bó", stockQuantity: 30, minStock: 5 },
      { name: "Rau cải", unit: "bó", stockQuantity: 25, minStock: 5 },
      { name: "Cà rốt", unit: "kg", stockQuantity: 35, minStock: 8 },
      { name: "Khoai lang", unit: "kg", stockQuantity: 20, minStock: 5 },
      { name: "Bí đỏ", unit: "kg", stockQuantity: 15, minStock: 3 },
      { name: "Dưa chuột", unit: "kg", stockQuantity: 18, minStock: 4 },
      { name: "Cà tím", unit: "kg", stockQuantity: 12, minStock: 3 },
      { name: "Đậu phụ", unit: "miếng", stockQuantity: 50, minStock: 10 },
      { name: "Mì tôm", unit: "gói", stockQuantity: 100, minStock: 20 },
      { name: "Bún tươi", unit: "kg", stockQuantity: 25, minStock: 5 },
      { name: "Phở tươi", unit: "kg", stockQuantity: 20, minStock: 4 },
      { name: "Gạo", unit: "kg", stockQuantity: 200, minStock: 50 },
      { name: "Dầu ăn", unit: "chai", stockQuantity: 30, minStock: 5 },
      { name: "Muối", unit: "kg", stockQuantity: 50, minStock: 10 },
      { name: "Đường", unit: "kg", stockQuantity: 40, minStock: 8 },
      { name: "Tiêu", unit: "kg", stockQuantity: 15, minStock: 3 },
      { name: "Ớt hiểm", unit: "kg", stockQuantity: 8, minStock: 2 },
      { name: "Chanh", unit: "quả", stockQuantity: 60, minStock: 10 },
      { name: "Coca Cola", unit: "lon", stockQuantity: 200, minStock: 50 },
      { name: "Pepsi", unit: "lon", stockQuantity: 150, minStock: 30 },
      { name: "Nước suối", unit: "chai", stockQuantity: 300, minStock: 50 },
      { name: "Trà đá", unit: "ly", stockQuantity: 100, minStock: 20 },
      { name: "Cà phê đen", unit: "ly", stockQuantity: 80, minStock: 15 },
      { name: "Sữa tươi", unit: "hộp", stockQuantity: 50, minStock: 10 },
      { name: "Kem vani", unit: "hộp", stockQuantity: 20, minStock: 5 },
      { name: "Bánh mì", unit: "ổ", stockQuantity: 100, minStock: 20 },
      { name: "Bánh ngọt", unit: "cái", stockQuantity: 30, minStock: 5 },
    ]);
    console.log("🥦 Đã tạo các Ingredient mẫu.");

    // 4️⃣ Món ăn
    const items = await Item.insertMany([
      // Món chính hiện tại
      {
        name: "Bò Bít Tết",
        description: "Thịt bò Úc nướng chảo gang, kèm khoai tây chiên",
        category: "Món chính",
        price: 250000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Thịt bò")._id,
            quantity: 0.3,
          }, // 300g
          {
            ingredient: ingredients.find((i) => i.name === "Khoai tây")._id,
            quantity: 0.2,
          }, // 200g
        ],
      },
      {
        name: "Cá Hồi Áp Chảo",
        description: "Cá hồi Na Uy sốt chanh dây",
        category: "Món chính",
        price: 280000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Cá hồi")._id,
            quantity: 0.25,
          }, // 250g
          {
            ingredient: ingredients.find((i) => i.name === "Bơ")._id,
            quantity: 0.05,
          },
        ],
      },
      {
        name: "Tôm Tempura",
        description: "Tôm chiên xù kiểu Nhật",
        category: "Món chính",
        price: 180000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Tôm tươi")._id,
            quantity: 0.2,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Bột mì")._id,
            quantity: 0.05,
          },
        ],
      },
      {
        name: "Salad Rau Củ",
        description: "Rau củ tươi trộn dầu giấm",
        category: "Khai vị",
        price: 70000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Rau xà lách")._id,
            quantity: 0.1,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Cà chua")._id,
            quantity: 0.05,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Hành tây")._id,
            quantity: 0.03,
          },
        ],
      },
      // Thêm món chính mới
      {
        name: "Pizza Margherita",
        description: "Pizza Ý với phô mai mozzarella và cà chua",
        category: "Món chính",
        price: 200000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Bột mì")._id,
            quantity: 0.2,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Phô mai")._id,
            quantity: 0.15,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Cà chua")._id,
            quantity: 0.1,
          },
        ],
      },
      {
        name: "Pasta Carbonara",
        description: "Mì Ý sốt kem với thịt xông khói",
        category: "Món chính",
        price: 180000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Bột mì")._id,
            quantity: 0.2,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Trứng gà")._id,
            quantity: 0.1,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Phô mai")._id,
            quantity: 0.1,
          },
        ],
      },
      {
        name: "Gà Nướng Mật Ong",
        description: "Gà nướng với sốt mật ong và rau củ",
        category: "Món chính",
        price: 220000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Thịt gà")._id,
            quantity: 0.5,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Cà rốt")._id,
            quantity: 0.1,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Khoai tây")._id,
            quantity: 0.2,
          },
        ],
      },
      {
        name: "Lẩu Hải Sản",
        description: "Lẩu tôm, cá, mực với rau tươi",
        category: "Món chính",
        price: 350000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Tôm tươi")._id,
            quantity: 0.3,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Cá basa")._id,
            quantity: 0.2,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Mực tươi")._id,
            quantity: 0.2,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Rau muống")._id,
            quantity: 0.1,
          },
        ],
      },
      {
        name: "Bún Bò Huế",
        description: "Bún bò cay với thịt bò và chả",
        category: "Món chính",
        price: 120000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Bún tươi")._id,
            quantity: 0.2,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Thịt bò")._id,
            quantity: 0.2,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Rau muống")._id,
            quantity: 0.1,
          },
        ],
      },
      {
        name: "Phở Bò",
        description: "Phở truyền thống với thịt bò tái",
        category: "Món chính",
        price: 100000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Phở tươi")._id,
            quantity: 0.2,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Thịt bò")._id,
            quantity: 0.15,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Hành tây")._id,
            quantity: 0.05,
          },
        ],
      },
      {
        name: "Cơm Tấm Sài Gòn",
        description: "Cơm tấm với sườn nướng và chả",
        category: "Món chính",
        price: 80000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Gạo")._id,
            quantity: 0.2,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Thịt heo")._id,
            quantity: 0.2,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Dưa chuột")._id,
            quantity: 0.05,
          },
        ],
      },
      {
        name: "Cá Kho Tộ",
        description: "Cá basa kho tộ với nước dừa",
        category: "Món chính",
        price: 150000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Cá basa")._id,
            quantity: 0.3,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Nước mắm")._id,
            quantity: 0.05,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Đường")._id,
            quantity: 0.02,
          },
        ],
      },
      // Khai vị
      {
        name: "Súp Gà Nấm",
        description: "Súp gà với nấm hương và rau củ",
        category: "Khai vị",
        price: 60000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Thịt gà")._id,
            quantity: 0.2,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Nấm hương")._id,
            quantity: 0.05,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Cà rốt")._id,
            quantity: 0.1,
          },
        ],
      },
      {
        name: "Salad Cá Ngừ",
        description: "Salad cá ngừ với rau xanh",
        category: "Khai vị",
        price: 90000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Cá hồi")._id,
            quantity: 0.15,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Rau xà lách")._id,
            quantity: 0.1,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Cà chua")._id,
            quantity: 0.05,
          },
        ],
      },
      {
        name: "Gỏi Cuốn Tôm Thịt",
        description: "Gỏi cuốn tôm thịt với rau sống",
        category: "Khai vị",
        price: 80000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Tôm tươi")._id,
            quantity: 0.1,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Thịt heo")._id,
            quantity: 0.1,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Rau xà lách")._id,
            quantity: 0.05,
          },
        ],
      },
      {
        name: "Nem Nướng Nha Trang",
        description: "Nem nướng đặc sản Nha Trang",
        category: "Khai vị",
        price: 120000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Thịt heo")._id,
            quantity: 0.15,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Bánh mì")._id,
            quantity: 0.1,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Rau xà lách")._id,
            quantity: 0.05,
          },
        ],
      },
      // Đồ uống
      {
        name: "Coca Cola",
        description: "Nước ngọt có ga",
        category: "Đồ uống",
        price: 25000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Coca Cola")._id,
            quantity: 1,
          },
        ],
      },
      {
        name: "Pepsi",
        description: "Nước ngọt có ga",
        category: "Đồ uống",
        price: 25000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Pepsi")._id,
            quantity: 1,
          },
        ],
      },
      {
        name: "Nước Suối",
        description: "Nước suối tinh khiết",
        category: "Đồ uống",
        price: 15000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Nước suối")._id,
            quantity: 1,
          },
        ],
      },
      {
        name: "Trà Đá",
        description: "Trà đá truyền thống",
        category: "Đồ uống",
        price: 10000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Trà đá")._id,
            quantity: 1,
          },
        ],
      },
      {
        name: "Cà Phê Đen",
        description: "Cà phê đen đậm đà",
        category: "Đồ uống",
        price: 20000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Cà phê đen")._id,
            quantity: 1,
          },
        ],
      },
      {
        name: "Sinh Tố Dâu",
        description: "Sinh tố dâu tươi với sữa",
        category: "Đồ uống",
        price: 35000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Sữa tươi")._id,
            quantity: 0.2,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Đường")._id,
            quantity: 0.05,
          },
        ],
      },
      {
        name: "Nước Cam Ép",
        description: "Nước cam tươi ép",
        category: "Đồ uống",
        price: 30000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Chanh")._id,
            quantity: 1,
          },
        ],
      },
      {
        name: "Trà Sữa Trân Châu",
        description: "Trà sữa với trân châu đen",
        category: "Đồ uống",
        price: 40000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Sữa tươi")._id,
            quantity: 0.2,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Đường")._id,
            quantity: 0.05,
          },
        ],
      },
      // Tráng miệng
      {
        name: "Kem Vani",
        description: "Kem vani mát lạnh",
        category: "Tráng miệng",
        price: 25000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Kem vani")._id,
            quantity: 1,
          },
        ],
      },
      {
        name: "Bánh Flan",
        description: "Bánh flan caramel",
        category: "Tráng miệng",
        price: 30000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Trứng gà")._id,
            quantity: 0.1,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Sữa tươi")._id,
            quantity: 0.2,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Đường")._id,
            quantity: 0.05,
          },
        ],
      },
      {
        name: "Chè Đậu Đỏ",
        description: "Chè đậu đỏ ngọt ngào",
        category: "Tráng miệng",
        price: 20000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Đường")._id,
            quantity: 0.05,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Sữa tươi")._id,
            quantity: 0.2,
          },
        ],
      },
      {
        name: "Bánh Tiramisu",
        description: "Bánh tiramisu Ý",
        category: "Tráng miệng",
        price: 45000,
        ingredients: [
          {
            ingredient: ingredients.find((i) => i.name === "Bánh ngọt")._id,
            quantity: 0.1,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Sữa tươi")._id,
            quantity: 0.2,
          },
          {
            ingredient: ingredients.find((i) => i.name === "Cà phê đen")._id,
            quantity: 0.05,
          },
        ],
      },
      {
        name: "Trái Cây Tươi",
        description: "Đĩa trái cây tươi theo mùa",
        category: "Tráng miệng",
        price: 35000,
        ingredients: [],
      },
    ]);
    console.log("🍱 Đã tạo các Item mẫu và tính expense tự động.");

    // 5️⃣ Tạo menu mẫu
    const menus = await Menu.insertMany([
      {
        name: "Combo Bò Bít Tết",
        description: "Bò bít tết + Salad + Nước uống",
        items: [
          items.find((i) => i.name === "Bò Bít Tết")._id,
          items.find((i) => i.name === "Salad Rau Củ")._id,
        ],
        price: 300000,
        type: "combo",
        isAvailable: true,
      },
      {
        name: "Combo Hải Sản",
        description: "Cá hồi + Tôm tempura + Salad",
        items: [
          items.find((i) => i.name === "Cá Hồi Áp Chảo")._id,
          items.find((i) => i.name === "Tôm Tempura")._id,
          items.find((i) => i.name === "Salad Rau Củ")._id,
        ],
        price: 450000,
        type: "combo",
        isAvailable: true,
      },
      {
        name: "Combo Gia Đình",
        description: "Tất cả món chính + Salad",
        items: items
          .filter((i) => i.category === "Món chính")
          .map((item) => item._id),
        price: 600000,
        type: "combo",
        isAvailable: true,
      },
      // Thêm combo mới
      {
        name: "Combo Lunch",
        description: "Cơm tấm + Canh + Nước uống",
        items: [
          items.find((i) => i.name === "Cơm Tấm Sài Gòn")._id,
          items.find((i) => i.name === "Súp Gà Nấm")._id,
          items.find((i) => i.name === "Trà Đá")._id,
        ],
        price: 120000,
        type: "combo",
        isAvailable: true,
      },
      {
        name: "Combo Dinner",
        description: "Pizza + Pasta + Salad + Đồ uống",
        items: [
          items.find((i) => i.name === "Pizza Margherita")._id,
          items.find((i) => i.name === "Pasta Carbonara")._id,
          items.find((i) => i.name === "Salad Cá Ngừ")._id,
          items.find((i) => i.name === "Coca Cola")._id,
        ],
        price: 500000,
        type: "combo",
        isAvailable: true,
      },
      {
        name: "Combo Couple",
        description: "Lẩu hải sản + Gỏi cuốn + Đồ uống",
        items: [
          items.find((i) => i.name === "Lẩu Hải Sản")._id,
          items.find((i) => i.name === "Gỏi Cuốn Tôm Thịt")._id,
          items.find((i) => i.name === "Trà Sữa Trân Châu")._id,
        ],
        price: 550000,
        type: "combo",
        isAvailable: true,
      },
      {
        name: "Combo Party",
        description: "Tất cả món + Đồ uống + Tráng miệng",
        items: [
          items.find((i) => i.name === "Bò Bít Tết")._id,
          items.find((i) => i.name === "Lẩu Hải Sản")._id,
          items.find((i) => i.name === "Pizza Margherita")._id,
          items.find((i) => i.name === "Coca Cola")._id,
          items.find((i) => i.name === "Kem Vani")._id,
        ],
        price: 800000,
        type: "combo",
        isAvailable: false, // Test unavailable menu
      },
      {
        name: "Combo Vietnamese",
        description: "Phở + Bún + Nem + Đồ uống",
        items: [
          items.find((i) => i.name === "Phở Bò")._id,
          items.find((i) => i.name === "Bún Bò Huế")._id,
          items.find((i) => i.name === "Nem Nướng Nha Trang")._id,
          items.find((i) => i.name === "Nước Cam Ép")._id,
        ],
        price: 350000,
        type: "combo",
        isAvailable: true,
      },
      {
        name: "Combo Dessert",
        description: "Tất cả món tráng miệng",
        items: items
          .filter((i) => i.category === "Tráng miệng")
          .map((item) => item._id),
        price: 200000,
        type: "combo",
        isAvailable: true,
      },
    ]);
    console.log("🍽️ Đã tạo các Menu mẫu.");

    // 5️⃣ Bàn ăn (35 bàn)
    const tables = await Promise.all(
      Array.from({ length: 35 }, (_, i) =>
        Table.create({
          tableNumber: i + 1,
          qrCode: `QR_TABLE_${i + 1}`,
          status: i < 15 ? "occupied" : "available", // 15 bàn occupied, 20 bàn available
          orderNow: [], // Khởi tạo mảng rỗng
        })
      )
    );

    // 6️⃣ Tạo orders với nhiều trạng thái khác nhau
    const customers = users.filter((u) => u.role === "customer");
    const chefs = users.filter((u) => u.role === "chef");

    // Helper function để tạo orderItem với status phù hợp
    const createOrderItems = async (items, status, assignedChef = null) => {
      const selectedItems = [];
      for (let j = 0; j < Math.min(3, items.length); j++) {
        const randomItem = items[Math.floor(Math.random() * items.length)];
        const orderItem = await OrderItem.create({
          itemId: randomItem._id,
          itemName: randomItem.name,
          itemType: "item",
          quantity: Math.floor(Math.random() * 2) + 1,
          price: randomItem.price,
          assignedChef: assignedChef,
          status: status,
        });
        selectedItems.push(orderItem);
      }
      return selectedItems;
    };

    // Helper function để tạo confirmation history
    const createConfirmationHistory = (actions) => {
      return actions.map((action) => ({
        action: action,
        timestamp: new Date(),
        details: getActionDetails(action),
      }));
    };

    const getActionDetails = (action) => {
      const details = {
        order_created: "Customer tạo đơn hàng mới",
        waiter_approved: "Waiter đã xác nhận đơn hàng",
        waiter_rejected: "Waiter từ chối đơn hàng",
        customer_confirmed: "Customer xác nhận đơn hàng",
        order_modified: "Customer sửa đổi đơn hàng",
      };
      return details[action] || action;
    };

    let orderCount = 0;

    // A. pending orders đã được xóa để test hệ thống sạch

    // B. pending orders (waiter approved, customer chưa confirm) đã được xóa để test hệ thống sạch

    // C. rejected orders đã được xóa để test hệ thống sạch

    // thiếu confirmed và xoá ready, vì ready bị bỏ còn confirmed để demo với kitchen cho đẹp

    // E. preparing - 5 orders
    for (let i = 0; i < 5; i++) {
      const table = tables[i];
      const customer = customers[i % customers.length];
      const waiter = waiters[i % waiters.length];
      const chef = chefs[i % chefs.length];

      const orderItems = await createOrderItems(items, "preparing", chef._id);
      const totalAmount = orderItems.reduce(
        (sum, oi) => sum + oi.price * oi.quantity,
        0
      );

      const payment = await Payment.create({
        paymentMethod: "cash",
        status: "unpaid",
        amountPaid: 0,
        totalAmount: totalAmount,
      });

      const order = await Order.create({
        userId: customer._id,
        servedBy: waiter._id,
        tableId: table._id,
        orderItems: orderItems.map((oi) => oi._id),
        paymentId: payment._id,
        status: "preparing",
        totalAmount: totalAmount,
        discount: 0,
        waiterResponse: {
          status: "approved",
          respondedAt: new Date(),
        },
        customerConfirmed: true,
        confirmationHistory: createConfirmationHistory([
          "order_created",
          "waiter_approved",
          "customer_confirmed",
        ]),
      });

      await OrderItem.updateMany(
        { _id: { $in: orderItems.map((oi) => oi._id) } },
        { orderId: order._id }
      );

      payment.orderId = order._id;
      await payment.save();
      // Sau khi tạo xong order
      if (["confirmed", "preparing", "served"].includes(order.status)) {
        table.status = "occupied";
        if (!table.orderNow || !table.orderNow.includes(order._id)) {
          if (!table.orderNow) table.orderNow = [];
          table.orderNow.push(order._id);
        }
      } else {
        table.status = "available";
        // Không thêm vào orderNow nếu không active
      }
      await table.save();
      orderCount++;
    }

   

    // G. served - 4 orders
    for (let i = 5; i < 9; i++) {
      const table = tables[i];
      const customer = customers[i % customers.length];
      const waiter = waiters[i % waiters.length];
      const chef = chefs[i % chefs.length];

      const orderItems = await createOrderItems(items, "served", chef._id);
      const totalAmount = orderItems.reduce(
        (sum, oi) => sum + oi.price * oi.quantity,
        0
      );

      const payment = await Payment.create({
        paymentMethod: "cash",
        status: "unpaid",
        amountPaid: 0,
        totalAmount: totalAmount,
      });

      const order = await Order.create({
        userId: customer._id,
        servedBy: waiter._id,
        tableId: table._id,
        orderItems: orderItems.map((oi) => oi._id),
        paymentId: payment._id,
        status: "served",
        totalAmount: totalAmount,
        discount: 0,
        servedAt: new Date(),
        waiterResponse: {
          status: "approved",
          respondedAt: new Date(),
        },
        customerConfirmed: true,
        confirmationHistory: createConfirmationHistory([
          "order_created",
          "waiter_approved",
          "customer_confirmed",
        ]),
      });

      await OrderItem.updateMany(
        { _id: { $in: orderItems.map((oi) => oi._id) } },
        { orderId: order._id }
      );

      payment.orderId = order._id;
      await payment.save();
      // Sau khi tạo xong order
      if (["confirmed", "preparing", "served"].includes(order.status)) {
        table.status = "occupied";
        if (!table.orderNow || !table.orderNow.includes(order._id)) {
          if (!table.orderNow) table.orderNow = [];
          table.orderNow.push(order._id);
        }
      } else {
        table.status = "available";
        // Không thêm vào orderNow nếu không active
      }
      await table.save();
      orderCount++;
    }

    // H. paid - 6 orders (completed, created 1-2 weeks ago)
    for (let i = 9; i < 15; i++) {
      const table = tables[i];
      const customer = customers[i % customers.length];
      const waiter = waiters[i % waiters.length];
      const chef = chefs[i % chefs.length];

      const orderItems = await createOrderItems(items, "served", chef._id);
      const totalAmount = orderItems.reduce(
        (sum, oi) => sum + oi.price * oi.quantity,
        0
      );

      const payment = await Payment.create({
        paymentMethod: "card",
        status: "paid",
        amountPaid: totalAmount,
        totalAmount: totalAmount,
      });

      const createdAt = new Date(
        Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000
      ); // 1-2 tuần trước
      const servedAt = new Date(
        createdAt.getTime() + Math.random() * 2 * 60 * 60 * 1000
      ); // 2 giờ sau khi tạo

      const order = await Order.create({
        userId: customer._id,
        servedBy: waiter._id,
        tableId: table._id,
        orderItems: orderItems.map((oi) => oi._id),
        paymentId: payment._id,
        status: "paid",
        totalAmount: totalAmount,
        discount: 0,
        servedAt: servedAt,
        waiterResponse: {
          status: "approved",
          respondedAt: new Date(createdAt.getTime() + 5 * 60 * 1000), // 5 phút sau
        },
        customerConfirmed: true,
        confirmationHistory: createConfirmationHistory([
          "order_created",
          "waiter_approved",
          "customer_confirmed",
        ]),
        createdAt: createdAt,
      });

      await OrderItem.updateMany(
        { _id: { $in: orderItems.map((oi) => oi._id) } },
        { orderId: order._id }
      );

      payment.orderId = order._id;
      await payment.save();
      // Sau khi tạo xong order
      if (["confirmed", "preparing", "served"].includes(order.status)) {
        table.status = "occupied";
        if (!table.orderNow || !table.orderNow.includes(order._id)) {
          if (!table.orderNow) table.orderNow = [];
          table.orderNow.push(order._id);
        }
      } else {
        table.status = "available";
        // Không thêm vào orderNow nếu không active
      }
      await table.save();
      orderCount++;
    }

    // I. cancelled - 3 orders
    for (let i = 15; i < 18; i++) {
      const table = tables[i];
      const customer = customers[i % customers.length];
      const waiter = waiters[i % waiters.length];

      const orderItems = await createOrderItems(items, "pending");
      const totalAmount = orderItems.reduce(
        (sum, oi) => sum + oi.price * oi.quantity,
        0
      );

      const payment = await Payment.create({
        paymentMethod: "cash",
        status: "unpaid",
        amountPaid: 0,
        totalAmount: totalAmount,
      });

      const order = await Order.create({
        userId: customer._id,
        servedBy: waiter._id,
        tableId: table._id,
        orderItems: orderItems.map((oi) => oi._id),
        paymentId: payment._id,
        status: "cancelled",
        totalAmount: totalAmount,
        discount: 0,
        waiterResponse: {
          status: "pending",
        },
        customerConfirmed: false,
        confirmationHistory: createConfirmationHistory(["order_created"]),
      });

      await OrderItem.updateMany(
        { _id: { $in: orderItems.map((oi) => oi._id) } },
        { orderId: order._id }
      );

      payment.orderId = order._id;
      await payment.save();
      // Sau khi tạo xong order
      if (["confirmed", "preparing", "served"].includes(order.status)) {
        table.status = "occupied";
        if (!table.orderNow || !table.orderNow.includes(order._id)) {
          if (!table.orderNow) table.orderNow = [];
          table.orderNow.push(order._id);
        }
      } else {
        table.status = "available";
        // Không thêm vào orderNow nếu không active
      }
      await table.save();
      orderCount++;
    }

    console.log(`📋 Đã tạo ${orderCount} orders với các trạng thái khác nhau.`);

    // J. Tạo bàn có nhiều orders đang hoạt động - 3 bàn (table 18, 19, 20)
    // Mỗi bàn sẽ có 2-3 orders với status preparing/served
    for (let tableIdx = 18; tableIdx < 21; tableIdx++) {
      const table = tables[tableIdx];
      const numOrders = tableIdx === 18 ? 2 : 3; // Bàn 18 có 2 orders, bàn 19-20 có 3 orders
      
      for (let orderIdx = 0; orderIdx < numOrders; orderIdx++) {
        const customer = customers[(tableIdx + orderIdx) % customers.length];
        const waiter = waiters[tableIdx % waiters.length];
        const chef = chefs[tableIdx % chefs.length];
        
        // Random status: preparing hoặc served
        const orderStatus = orderIdx % 2 === 0 ? "preparing" : "served";
        const orderItems = await createOrderItems(items, orderStatus, chef._id);
        const totalAmount = orderItems.reduce((sum, oi) => sum + oi.price * oi.quantity, 0);
        
        const payment = await Payment.create({
          paymentMethod: "cash",
          status: "unpaid",
          amountPaid: 0,
          totalAmount: totalAmount,
        });
        
        const order = await Order.create({
          userId: customer._id,
          servedBy: waiter._id,
          tableId: table._id,
          orderItems: orderItems.map((oi) => oi._id),
          paymentId: payment._id,
          status: orderStatus,
          totalAmount: totalAmount,
          discount: 0,
          servedAt: orderStatus === "served" ? new Date() : null,
          waiterResponse: { status: "approved", respondedAt: new Date() },
          customerConfirmed: true,
          confirmationHistory: createConfirmationHistory([
            "order_created",
            "waiter_approved",
            "customer_confirmed",
          ]),
        });
        
        await OrderItem.updateMany(
          { _id: { $in: orderItems.map((oi) => oi._id) } },
          { orderId: order._id }
        );
        
        payment.orderId = order._id;
        await payment.save();
        
        // Push order vào mảng orderNow của bàn
        if (!table.orderNow || !table.orderNow.includes(order._id)) {
          if (!table.orderNow) table.orderNow = [];
          table.orderNow.push(order._id);
        }
        table.status = "occupied";
        
        orderCount++;
      }
      
      await table.save();
      console.log(`✅ Bàn ${table.tableNumber} có ${table.orderNow.length} orders đang hoạt động`);
    }

    // 7️⃣ Purchase Orders
    const purchaseOrders = await PurchaseOrder.insertMany([
      {
        ingredientId: ingredients.find((i) => i.name === "Thịt bò")._id,
        quantity: 20,
        unit: "kg",
        price: 2000000,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
      },
      {
        ingredientId: ingredients.find((i) => i.name === "Cá hồi")._id,
        quantity: 15,
        unit: "kg",
        price: 1500000,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45),
      },
      {
        ingredientId: ingredients.find((i) => i.name === "Rau xà lách")._id,
        quantity: 50,
        unit: "bó",
        price: 500000,
        expiryDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
      },
      // Thêm purchase orders mới
      {
        ingredientId: ingredients.find((i) => i.name === "Thịt heo")._id,
        quantity: 25,
        unit: "kg",
        price: 1800000,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60), // +60 ngày
        status: "valid",
      },
      {
        ingredientId: ingredients.find((i) => i.name === "Cá basa")._id,
        quantity: 30,
        unit: "kg",
        price: 1200000,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // +30 ngày
        status: "valid",
      },
      {
        ingredientId: ingredients.find((i) => i.name === "Tôm tươi")._id,
        quantity: 20,
        unit: "kg",
        price: 2000000,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5), // +5 ngày (gần hết hạn)
        status: "valid",
      },
      {
        ingredientId: ingredients.find((i) => i.name === "Mực tươi")._id,
        quantity: 15,
        unit: "kg",
        price: 1500000,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // +3 ngày (gần hết hạn)
        status: "valid",
      },
      {
        ingredientId: ingredients.find((i) => i.name === "Phô mai")._id,
        quantity: 10,
        unit: "kg",
        price: 800000,
        expiryDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // hết hạn 5 ngày trước
        status: "expired",
      },
      {
        ingredientId: ingredients.find((i) => i.name === "Bột mì")._id,
        quantity: 50,
        unit: "kg",
        price: 600000,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 120), // +120 ngày
        status: "valid",
      },
      {
        ingredientId: ingredients.find((i) => i.name === "Gạo")._id,
        quantity: 100,
        unit: "kg",
        price: 1000000,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180), // +180 ngày
        status: "valid",
      },
      {
        ingredientId: ingredients.find((i) => i.name === "Coca Cola")._id,
        quantity: 200,
        unit: "lon",
        price: 500000,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // +365 ngày
        status: "valid",
      },
      {
        ingredientId: ingredients.find((i) => i.name === "Sữa tươi")._id,
        quantity: 30,
        unit: "hộp",
        price: 400000,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // +7 ngày
        status: "valid",
      },
    ]);
    console.log("📦 Đã tạo các PurchaseOrder mẫu.");

    // 8️⃣ Feedbacks
    await Feedback.insertMany([
      {
        userId: customers[0]._id,
        rating: 5,
        comment: "Đồ ăn rất ngon, phục vụ nhanh!",
      },
      {
        userId: customers[1]._id,
        rating: 4,
        comment: "Không gian đẹp, hơi ồn một chút.",
      },
      // Thêm feedbacks mới
      {
        userId: customers[2]._id,
        rating: 5,
        comment: "Món bò bít tết tuyệt vời, sẽ quay lại!",
      },
      {
        userId: customers[3]._id,
        rating: 3,
        comment: "Đồ ăn ổn nhưng giá hơi cao.",
      },
      {
        userId: customers[4]._id,
        rating: 4,
        comment: "Nhân viên thân thiện, không gian sạch sẽ.",
      },
      {
        userId: customers[5]._id,
        rating: 5,
        comment: "Combo gia đình rất đáng giá!",
      },
      {
        userId: customers[6]._id,
        rating: 2,
        comment: "Chờ đợi quá lâu, đồ ăn không nóng.",
      },
      {
        userId: customers[7]._id,
        rating: 4,
        comment: "Pizza ngon, giá hợp lý.",
      },
      {
        userId: customers[8]._id,
        rating: 5,
        comment: "Lẩu hải sản tươi ngon, gia đình rất thích.",
      },
      {
        userId: customers[9]._id,
        rating: 3,
        comment: "Đồ uống ngon nhưng hơi ít.",
      },
      {
        userId: customers[0]._id,
        rating: 4,
        comment: "Phở bò đậm đà, nước dùng ngon.",
      },
      {
        userId: customers[1]._id,
        rating: 5,
        comment: "Bún bò Huế cay vừa phải, rất ngon!",
      },
      {
        userId: customers[2]._id,
        rating: 4,
        comment: "Salad tươi ngon, rau củ đa dạng.",
      },
      {
        userId: customers[3]._id,
        rating: 3,
        comment: "Không gian đẹp nhưng hơi chật.",
      },
      {
        userId: customers[4]._id,
        rating: 5,
        comment: "Đầu bếp nấu rất ngon, sẽ giới thiệu bạn bè.",
      },
      {
        userId: customers[5]._id,
        rating: 4,
        comment: "Gà nướng mật ong thơm ngon.",
      },
      {
        userId: customers[6]._id,
        rating: 2,
        comment: "Phục vụ chậm, đồ ăn không đúng yêu cầu.",
      },
      {
        userId: customers[7]._id,
        rating: 4,
        comment: "Tráng miệng ngon, kem vani mát lạnh.",
      },
      {
        userId: customers[8]._id,
        rating: 5,
        comment: "Cá hồi áp chảo tuyệt vời, sẽ quay lại.",
      },
      {
        userId: customers[9]._id,
        rating: 3,
        comment: "Giá cả hợp lý nhưng khẩu phần hơi nhỏ.",
      },
    ]);
    console.log("💬 Đã tạo các Feedback mẫu.");

    console.log("✅ SEED DATABASE THÀNH CÔNG!");
  } catch (error) {
    console.error("❌ Lỗi khi seed database:", error);
  }

  // 🧹 Cleanup: đồng bộ lại logic table - order
  const tables = await Table.find().populate("orderNow");
  for (const table of tables) {
    // Đảm bảo orderNow là mảng
    if (!table.orderNow) {
      table.orderNow = [];
    }
    
    // Filter ra các orders active (populated orders)
    const activeOrders = table.orderNow.filter(order => 
      order && order.status && ["confirmed", "preparing", "served"].includes(order.status)
    );
    
    // Chuyển về array of ObjectIds
    table.orderNow = activeOrders.map(o => o._id);
    
    if (activeOrders.length > 0) {
      table.status = "occupied";
    } else {
      table.status = "available";
    }
    
    await table.save();
  }
  console.log("✅ Đã đồng bộ bàn và đơn hàng đúng logic mới!");

};

module.exports = seedDatabase;
