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
      // Waiters (chỉ waiter01 và waiter02 active, còn lại inactive)
      {
        name: "Trần Thị Phục Vụ 1",
        username: "waiter01",
        password: "waiter1@123",
        email: "waiter1@example.com",
        phone: "0987654321",
        role: "waiter",
        status: "active",
      },
      {
        name: "Phạm Văn Phục Vụ 2",
        username: "waiter02",
        password: "waiter2@123",
        email: "manhamsterdam2003@gmail.com",
        phone: "0987654322",
        role: "waiter",
        status: "active",
      },
      {
        name: "Lê Thị Phục Vụ 3",
        username: "waiter03",
        password: "waiter3@123",
        email: "waiter3@example.com",
        phone: "0987654323",
        role: "waiter",
        status: "inactive",
      },
      {
        name: "Nguyễn Văn Phục Vụ 4",
        username: "waiter04",
        password: "waiter4@123",
        email: "waiter4@example.com",
        phone: "0987654324",
        role: "waiter",
        status: "inactive",
      },
      {
        name: "Hoàng Thị Phục Vụ 5",
        username: "waiter05",
        password: "waiter5@123",
        email: "waiter5@example.com",
        phone: "0987654325",
        role: "waiter",
        status: "inactive",
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

    const customers = users.filter((u) => u.role === "customer");
    const waiters = users.filter((u) => u.role === "waiter");
    const chefs = users.filter((u) => u.role === "chef");

    // 3️⃣ Nguyên liệu
    const ingredients = await Ingredient.insertMany([
      { name: "Thịt bò", unit: "kg", stockQuantity: 50, minStock: 10, priceNow: 100000 }, // 2000000/20
      { name: "Cá hồi", unit: "kg", stockQuantity: 30, minStock: 5, priceNow: 100000 }, // 1500000/15
      { name: "Khoai tây", unit: "kg", stockQuantity: 40, minStock: 8, priceNow: 20000 },
      { name: "Rau xà lách", unit: "bó", stockQuantity: 60, minStock: 10, priceNow: 10000 }, // 500000/50
      { name: "Trứng gà", unit: "quả", stockQuantity: 100, minStock: 20, priceNow: 3000 },
      { name: "Tôm tươi", unit: "kg", stockQuantity: 45, minStock: 10, priceNow: 100000 }, // 2000000/20
      { name: "Phô mai", unit: "kg", stockQuantity: 25, minStock: 5, priceNow: 80000 }, // 800000/10
      { name: "Bột mì", unit: "kg", stockQuantity: 30, minStock: 8, priceNow: 12000 }, // 600000/50
      { name: "Thịt gà", unit: "kg", stockQuantity: 35, minStock: 5, priceNow: 70000 },
      { name: "Ớt chuông", unit: "kg", stockQuantity: 20, minStock: 3, priceNow: 25000 },
      { name: "Cà chua", unit: "kg", stockQuantity: 40, minStock: 8, priceNow: 15000 },
      { name: "Hành tây", unit: "kg", stockQuantity: 25, minStock: 5, priceNow: 20000 },
      { name: "Bơ", unit: "hộp", stockQuantity: 15, minStock: 3, priceNow: 80000 },
      { name: "Nước mắm", unit: "chai", stockQuantity: 50, minStock: 10, priceNow: 40000 },
      { name: "Tỏi", unit: "kg", stockQuantity: 30, minStock: 6, priceNow: 50000 },
      // Thêm nguyên liệu mới
      { name: "Thịt heo", unit: "kg", stockQuantity: 8, minStock: 10, priceNow: 72000 }, // 1800000/25 - Stock thấp để test cảnh báo
      { name: "Cá basa", unit: "kg", stockQuantity: 25, minStock: 5, priceNow: 40000 }, // 1200000/30
      { name: "Mực tươi", unit: "kg", stockQuantity: 20, minStock: 5, priceNow: 100000 }, // 1500000/15
      { name: "Cua biển", unit: "kg", stockQuantity: 15, minStock: 3, priceNow: 180000 },
      { name: "Nấm hương", unit: "kg", stockQuantity: 12, minStock: 2, priceNow: 150000 },
      { name: "Rau muống", unit: "bó", stockQuantity: 30, minStock: 5, priceNow: 8000 },
      { name: "Rau cải", unit: "bó", stockQuantity: 25, minStock: 5, priceNow: 7000 },
      { name: "Cà rốt", unit: "kg", stockQuantity: 35, minStock: 8, priceNow: 18000 },
      { name: "Khoai lang", unit: "kg", stockQuantity: 20, minStock: 5, priceNow: 15000 },
      { name: "Bí đỏ", unit: "kg", stockQuantity: 15, minStock: 3, priceNow: 12000 },
      { name: "Dưa chuột", unit: "kg", stockQuantity: 18, minStock: 4, priceNow: 16000 },
      { name: "Cà tím", unit: "kg", stockQuantity: 12, minStock: 3, priceNow: 20000 },
      { name: "Đậu phụ", unit: "miếng", stockQuantity: 50, minStock: 10, priceNow: 5000 },
      { name: "Mì tôm", unit: "gói", stockQuantity: 100, minStock: 20, priceNow: 5000 },
      { name: "Bún tươi", unit: "kg", stockQuantity: 25, minStock: 5, priceNow: 15000 },
      { name: "Phở tươi", unit: "kg", stockQuantity: 20, minStock: 4, priceNow: 20000 },
      { name: "Gạo", unit: "kg", stockQuantity: 200, minStock: 50, priceNow: 10000 }, // 1000000/100
      { name: "Dầu ăn", unit: "chai", stockQuantity: 30, minStock: 5, priceNow: 45000 },
      { name: "Muối", unit: "kg", stockQuantity: 50, minStock: 10, priceNow: 8000 },
      { name: "Đường", unit: "kg", stockQuantity: 40, minStock: 8, priceNow: 15000 },
      { name: "Tiêu", unit: "kg", stockQuantity: 15, minStock: 3, priceNow: 250000 },
      { name: "Ớt hiểm", unit: "kg", stockQuantity: 8, minStock: 2, priceNow: 80000 },
      { name: "Chanh", unit: "quả", stockQuantity: 60, minStock: 10, priceNow: 2000 },
      { name: "Coca Cola", unit: "lon", stockQuantity: 200, minStock: 50, priceNow: 2500 }, // 500000/200
      { name: "Pepsi", unit: "lon", stockQuantity: 150, minStock: 30, priceNow: 2500 },
      { name: "Nước suối", unit: "chai", stockQuantity: 300, minStock: 50, priceNow: 5000 },
      { name: "Trà đá", unit: "ly", stockQuantity: 100, minStock: 20, priceNow: 3000 },
      { name: "Cà phê đen", unit: "ly", stockQuantity: 80, minStock: 15, priceNow: 5000 },
      { name: "Sữa tươi", unit: "hộp", stockQuantity: 50, minStock: 10, priceNow: 13333 }, // 400000/30
      { name: "Kem vani", unit: "hộp", stockQuantity: 20, minStock: 5, priceNow: 50000 },
      { name: "Bánh mì", unit: "ổ", stockQuantity: 100, minStock: 20, priceNow: 10000 },
      { name: "Bánh ngọt", unit: "cái", stockQuantity: 30, minStock: 5, priceNow: 20000 },
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
        image: "https://barona.vn/storage/meo-vat/50/bo-bit-tet-kieu-viet-nam.jpg",
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
        image: "https://cores.com.vn/upload/elfinder/cach-lam-ca-hoi-tai-nha.jpg",
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
        image: "https://product.hstatic.net/200000438645/product/z6113115772659_f817b46e6c391caf8a1fd67dae63ab67_b05ba067a12f4c1dadf15985a4f91b81_master.jpg",
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
        image: "https://i-giadinh.vnecdn.net/2021/10/26/saladrauqua-1635240739-5476-1635240778.jpg",
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
        image: "https://assets.tmecosys.com/image/upload/t_web_rdp_recipe_584x480/img/recipe/ras/Assets/5802fab5-fdce-468a-a830-43e8001f5a72/Derivates/c00dc34a-e73d-42f0-a86e-e2fd967d33fe.jpg",
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
        image: "https://www.simplyrecipes.com/thmb/0UeN5LhKq-ze3BcZJ7_Yp803T24=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Simply-Pasta-Carbonara-LEAD-1-c477cc25c7294cd9a3fc51ece176481f.jpg",
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
        image: "https://nhahangphuongnguyen.com.vn/images/upload/mon-dac-biet/ga-nuong-mat-ong.jpg",
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
        image: "https://cdn.dealtoday.vn/img/s630x0/440956a3cf2042ceb23cf517261ac4ca.jpg?sign=-pdHmcfb6n59cqEo5BaHkA",
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
        image: "https://tourhue.vn/wp-content/uploads/2024/08/quan-bun-bo-hue-1.png",
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
        image: "https://media-cdn-v2.laodong.vn/Storage/NewsPortal/2023/2/25/1151612/5.jpg",
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
        image: "https://media-cdn-v2.laodong.vn/storage/newsportal/2023/11/29/1273358/Com-Tam-2-01.jpeg",
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
        image: "https://www.huongnghiepaau.com/wp-content/uploads/2016/05/ca-loc-kho-to-tham-dam-gia-vi.jpg",
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
        image: "https://file.hstatic.net/200000385717/article/khoi-benh-ngay-voi-nhung-meo-tri-cam-cum-sieu-hieu-qua2_1737be89b9694e4c80e14844d3ff455e.jpg",
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
        image: "https://cdn.zsoft.solutions/poseidon-web/app/media/Nau-an/7.2024/salad-ca-ngu-lua-chon-bo-duong-thumb.jpg",
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
        image: "https://saithanhfoods.vn/wp-content/uploads/2021/11/Goi-cuon-tom-thit-5.jpg",
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
        image: "https://cdn.tgdd.vn/2021/09/CookDish/cach-lam-nem-nuong-nha-trang-bang-noi-chien-khong-dau-thom-avt-1200x676.jpg",
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
        image: "https://product.hstatic.net/200000534989/product/dsc08341-enhanced-nr_1_e6d5d0a13c8f42c2bd7cea59e03ce199_master.jpg",
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
        image: "https://product.hstatic.net/200000534989/product/dsc08410-enhanced-nr_1_81edadf400df40fcbdcca8749abcbb90_master.jpg",
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
        image: "https://dailynuockhoang.vn/wp-content/uploads/2018/07/aquafina-355ml-new-2023.jpg",
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
        image: "https://static-images.vnncdn.net/files/publish/2023/11/27/so-sanh-tac-dung-cua-tra-da-va-tra-nong-1486.jpg?width=0&s=aVlyLGr05-5PFiESLiAmLQ",
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
        image: "https://cdn.nhathuoclongchau.com.vn/unsafe/800x0/https://cms-prod.s3-sgn09.fptcloud.com/bai_vietca_phe_den_bao_nhieu_calo_uong_nhieu_co_tot_khong_html_1_ebb28c9c42.png",
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
        image: "https://file.hstatic.net/200000031322/file/dau_33be0f21aa3441c398c752a921e84a50_grande.png",
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
        image: "https://suckhoedoisong.qltns.mediacdn.vn/324455921873985536/2023/11/7/uong-nuoc-cam-16993504421751885406385.jpg",
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
        image: "https://www.huongnghiepaau.com/wp-content/uploads/2019/10/tra-sua-chocolate.jpg",
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
        image: "https://luckyhotelhanoi.com/uploads/images/2021/12/image_1200_61aecbe63bcc1.jpg",
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
        image: "https://superfoods.vn/wp-content/uploads/2023/08/banh-flan-1.jpg",
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
        image: "https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(75)/cach_nau_che_dau_do_nhanh_mem_166945_2_c470d072e4.jpg",
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
        image: "https://cdn.tgdd.vn/Files/2021/08/08/1373908/tiramisu-la-gi-y-nghia-cua-banh-tiramisu-202108082258460504.jpg",
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
        image: "https://cdn.nguyenkimmall.com/images/companies/_1/Content/dien-lanh/tu-lanh/trai-cay-tu-lanh.jpg",
        ingredients: [],
      },
    ]);
    console.log("🍱 Đã tạo các Item mẫu.");

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
        image: "https://amp.sieuthithitbo.net/uploads/files/2024/05/10/loi-vai-bo-my-steak-house.png",
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
        image: "https://static.hotdeal.vn/images/1587/1586927/60x60/355615-1-trong-3-combo-hai-san-dac-biet-danh-cho-4-6-nguoi-tai-3f-ampbeer.jpg",
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
        image: "https://lh7-us.googleusercontent.com/2pWKOz9VESI0Oa2Pc4K8nECPCvYXwfx2T-xeIV23jk1NtbgvWc4eum96bjELDWMMLyE2yluKhxkS5bVfe00LghPc_RA6PgqNGHVQvM1pD3HoH7kihI_0DsdoZzCdIpIZa26ZzUoOSoOWZSczklFD8i8",
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
        image: "https://mms.img.susercontent.com/vn-11134513-7r98o-lxxzpe5juj15ce@resize_ss1242x600!@crop_w1242_h600_cT",
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
        image: "https://www.shutterstock.com/image-photo/top-view-food-platter-combo-600nw-2348142025.jpg",
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
        image: "https://haisantuoisongnguyenanh.vn/wp-content/uploads/2021/12/lau-hai-san-6-nguoi-an-1.jpg",
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
        image: "https://namanhcatering.com/wp-content/uploads/2023/06/thuc-don-set-menu-2-min.jpg",
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
        image: "https://statics.vinpearl.com/Vietnamese-bun-07_1686412378.jpg",
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
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZ4FMWRnVqMMVw07jpCwQog-lCryZ3dMeWnA&s",
        type: "combo",
        isAvailable: true,
      },
    ]);
    console.log("🍽️ Đã tạo các Menu mẫu.");

    // ===============================
    // 🪑 5️⃣ Tạo bàn ăn (35 bàn)
    // ===============================
    const tables = await Promise.all(
      Array.from({ length: 35 }, (_, i) =>
        Table.create({
          tableNumber: i + 1,
          qrCode: `QR_TABLE_${i + 1}`,
          status: i < 15 ? "occupied" : "available",
          orderNow: [],
        })
      )
    );

    // 6️⃣ Tạo orders với nhiều trạng thái khác nhau


    // ===============================
    // ⚙️ Helper functions
    // ===============================

    // Helper function tính expense từ ingredients
    const calculateItemExpense = async (item) => {
      if (!item.ingredients || item.ingredients.length === 0) {
        return 0;
      }
      
      // Luôn populate ingredients vì items từ insertMany() chưa được populate
      // và ingredients.ingredient chỉ là ObjectId references
      const populatedItem = await Item.findById(item._id).populate('ingredients.ingredient');
      
      if (!populatedItem || !populatedItem.ingredients) {
        return 0;
      }
      
      let totalExpense = 0;
      for (const ing of populatedItem.ingredients) {
        const ingDoc = ing.ingredient;
        if (ingDoc && typeof ingDoc.priceNow === 'number') {
          totalExpense += ingDoc.priceNow * ing.quantity;
        }
      }
      return totalExpense;
    };

    const createOrderItems = async (items, status, assignedChef = null) => {
      const selectedItems = [];
      for (let j = 0; j < Math.min(3, items.length); j++) {
        const randomItem = items[Math.floor(Math.random() * items.length)];
        
        // Tính expense tại thời điểm tạo OrderItem
        const expense = await calculateItemExpense(randomItem);
        
        const orderItem = await OrderItem.create({
          itemId: randomItem._id,
          itemName: randomItem.name,
          itemType: "item",
          quantity: Math.floor(Math.random() * 2) + 1,
          price: randomItem.price,
          expense: expense, // Giá vốn tại thời điểm đặt món
          assignedChef,
          status,
        });
        selectedItems.push(orderItem);
      }
      return selectedItems;
    };

    const createConfirmationHistory = (actions) =>
      actions.map((action) => ({
        action,
        timestamp: new Date(),
        details: getActionDetails(action),
      }));

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

    // Helper functions cho việc tạo nhiều paid orders
    const getRandomInt = (min, max) => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const getRandomExpenseMultiplier = () => {
      // Random multiplier từ 0.8 đến 1.2 (±20%)
      return 0.8 + Math.random() * 0.4;
    };

    const getRandomTimeInDay = (date) => {
      // Random giờ trong ngày từ 8h đến 22h
      const hour = getRandomInt(8, 22);
      const minute = getRandomInt(0, 59);
      const second = getRandomInt(0, 59);
      const newDate = new Date(date);
      newDate.setHours(hour, minute, second);
      return newDate;
    };

    // Tạo order items với expense biến động ngẫu nhiên
    const createOrderItemsWithVariableExpense = async (items, status, assignedChef = null) => {
      const selectedItems = [];
      const numItems = getRandomInt(1, 5); // 1-5 items mỗi order
      
      for (let j = 0; j < numItems; j++) {
        const randomItem = items[Math.floor(Math.random() * items.length)];
        
        // Tính expense base tại thời điểm tạo OrderItem
        const baseExpense = await calculateItemExpense(randomItem);
        
        // Áp dụng multiplier ngẫu nhiên (0.8x - 1.2x)
        const expenseMultiplier = getRandomExpenseMultiplier();
        const finalExpense = baseExpense * expenseMultiplier;
        
        const orderItem = await OrderItem.create({
          itemId: randomItem._id,
          itemName: randomItem.name,
          itemType: "item",
          quantity: getRandomInt(1, 3), // 1-3 quantity
          price: randomItem.price,
          expense: Math.round(finalExpense), // Làm tròn expense
          assignedChef,
          status,
        });
        selectedItems.push(orderItem);
      }
      return selectedItems;
    };

    // ===============================
    // 📌 Cập nhật table theo order
    // ===============================
    const updateTableOrders = async (table, order) => {
      const canAttach =
        order.waiterResponse?.status === "approved" &&
        ["pending", "preparing", "served"].includes(order.status);

      const shouldRemove =
        ["paid", "cancelled"].includes(order.status) ||
        ["pending", "rejected"].includes(order.waiterResponse?.status);

      if (canAttach) {
        table.status = "occupied";
        if (!Array.isArray(table.orderNow)) table.orderNow = [];
        if (!table.orderNow.some((id) => id.toString() === order._id.toString())) {
          table.orderNow.push(order._id);
        }
      } else if (shouldRemove) {
        table.orderNow = (table.orderNow || []).filter(
          (id) => id.toString() !== order._id.toString()
        );
        if (table.orderNow.length === 0) table.status = "available";
      }

      await table.save();
    };

    // ===============================
    // 🍽️ 6️⃣ Tạo orders mẫu
    // ===============================
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
        waiterResponse: { status: "approved", respondedAt: new Date() },
        customerConfirmed: true,
        actions: ["order_created", "waiter_approved", "customer_confirmed"],
        chef: true,
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
        waiterResponse: { status: "approved", respondedAt: new Date() },
        customerConfirmed: true,
        actions: ["order_created", "waiter_approved", "customer_confirmed"],
        chef: true,
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

      const order = await Order.create({
        userId: customer._id,
        servedBy: waiter._id,
        tableId: table._id,
        orderItems: orderItems.map((oi) => oi._id),
        paymentId: payment._id,
        status: "paid",
        waiterResponse: { status: "approved", respondedAt: new Date() },
        customerConfirmed: true,
        actions: ["order_created", "waiter_approved", "customer_confirmed"],
        paid: true,
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

    // I. Tạo nhiều paid orders phân bố trong 3 tháng với expense biến động
    console.log("🔄 Bắt đầu tạo paid orders phân bố trong 3 tháng...");
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const today = new Date();
    
    let bulkOrderCount = 0;
    const totalDays = Math.floor((today - threeMonthsAgo) / (1000 * 60 * 60 * 24));
    
    // Tạo orders cho mỗi ngày trong 90 ngày
    for (let day = 0; day < totalDays; day++) {
      const currentDate = new Date(threeMonthsAgo);
      currentDate.setDate(currentDate.getDate() + day);
      
      // Mỗi ngày tạo 15-25 orders ngẫu nhiên
      const ordersPerDay = getRandomInt(15, 25);
      
      for (let i = 0; i < ordersPerDay; i++) {
        const randomTable = tables[getRandomInt(0, tables.length - 1)];
        const randomCustomer = customers[getRandomInt(0, customers.length - 1)];
        const randomWaiter = waiters[getRandomInt(0, waiters.length - 1)];
        const randomChef = chefs[getRandomInt(0, chefs.length - 1)];
        
        // Tạo order items với expense biến động
        const orderItems = await createOrderItemsWithVariableExpense(
          items,
          "served",
          randomChef._id
        );
        
        const totalAmount = orderItems.reduce(
          (sum, oi) => sum + oi.price * oi.quantity,
          0
        );
        
        // Random time trong ngày
        const orderCreatedAt = getRandomTimeInDay(currentDate);
        const orderUpdatedAt = new Date(orderCreatedAt.getTime() + getRandomInt(30, 120) * 60 * 1000); // 30-120 phút sau
        const paymentTime = new Date(orderCreatedAt.getTime() + getRandomInt(60, 180) * 60 * 1000); // Thanh toán sau 60-180 phút
        
        // Random payment method
        const paymentMethods = ["cash", "card", "momo", "zaloPay"];
        const paymentMethod = paymentMethods[getRandomInt(0, paymentMethods.length - 1)];
        
        // Tạo payment
        const payment = await Payment.create({
          paymentMethod: paymentMethod,
          status: "paid",
          amountPaid: totalAmount,
          totalAmount: totalAmount,
          payTime: paymentTime,
        });
        
        // Tạo order với createdAt và updatedAt cụ thể
        const order = await Order.create({
          userId: randomCustomer._id,
          servedBy: randomWaiter._id,
          tableId: randomTable._id,
          orderItems: orderItems.map((oi) => oi._id),
          paymentId: payment._id,
          status: "paid",
          totalAmount: totalAmount,
          waiterResponse: { status: "approved", respondedAt: orderCreatedAt },
          customerConfirmed: true,
          actions: ["order_created", "waiter_approved", "customer_confirmed"],
          paid: true,
          createdAt: orderCreatedAt,
          updatedAt: orderUpdatedAt,
        });
        
        // Update order items với orderId
        await OrderItem.updateMany(
          { _id: { $in: orderItems.map((oi) => oi._id) } },
          { orderId: order._id }
        );
        
        // Update payment với orderId
        payment.orderId = order._id;
        await payment.save();
        
        // Không update table vì orders đã paid (không còn active)
        
        bulkOrderCount++;
        
        // Log tiến độ mỗi 100 orders
        if (bulkOrderCount % 100 === 0) {
          console.log(`  ✅ Đã tạo ${bulkOrderCount} paid orders...`);
        }
      }
      
      // Log tiến độ mỗi 10 ngày
      if (day % 10 === 0 && day > 0) {
        console.log(`  📅 Đã tạo orders cho ${day}/${totalDays} ngày (${bulkOrderCount} orders tổng cộng)...`);
      }
    }
    
    orderCount += bulkOrderCount;
    console.log(`✅ Đã tạo ${bulkOrderCount} paid orders phân bố trong ${totalDays} ngày.`);

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
        waiterResponse: { status: "pending" },
        customerConfirmed: false,
        actions: ["order_created"],
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

    // 7️⃣ Purchase Orders - Tạo lô nhập khớp với stockQuantity của từng ingredient
    // Chia thành nhiều lô với expiryDate khác nhau để test FIFO
    const purchaseOrders = [];
    const now = Date.now();
    
    // Helper function để tạo PurchaseOrder cho một ingredient
    const createPurchaseOrdersForIngredient = (ingredient, batches) => {
      // batches = [{ quantity, daysFromNow, price }]
      let totalQuantity = 0;
      batches.forEach((batch, index) => {
        const daysAgo = batch.daysAgo || 0; // Nếu không có daysAgo, mặc định là 0 (hôm nay)
        const time = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
        const expiryDate = batch.daysFromNow 
          ? new Date(now + batch.daysFromNow * 24 * 60 * 60 * 1000)
          : null;
        
        purchaseOrders.push({
          ingredientId: ingredient._id,
          quantity: batch.quantity,
          unit: ingredient.unit,
          price: batch.price || ingredient.priceNow,
          time: time,
          expiryDate: expiryDate,
          usedQuantity: 0,
          status: expiryDate && expiryDate < new Date() ? 'expired' : 'valid'
        });
        totalQuantity += batch.quantity;
      });
      
      // Kiểm tra xem tổng có khớp với stockQuantity không
      if (Math.abs(totalQuantity - ingredient.stockQuantity) > 0.01) {
        console.warn(`⚠️ Cảnh báo: Tổng quantity của PurchaseOrders (${totalQuantity}) không khớp với stockQuantity (${ingredient.stockQuantity}) của ${ingredient.name}`);
      }
    };

    // Tạo PurchaseOrders cho từng ingredient, chia thành nhiều lô để test FIFO
    // Ví dụ: Thịt bò có 50kg -> chia thành 2 lô: 20kg (cũ, hết hạn sớm) và 30kg (mới, hết hạn muộn)
    
    // Thịt bò: 50kg
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Thịt bò"),
      [
        { quantity: 20, daysAgo: 10, daysFromNow: 15, price: 95000 }, // Lô cũ, hết hạn sau 15 ngày
        { quantity: 30, daysAgo: 2, daysFromNow: 30, price: 105000 }  // Lô mới, hết hạn sau 30 ngày
      ]
    );

    // Cá hồi: 30kg
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Cá hồi"),
      [
        { quantity: 15, daysAgo: 8, daysFromNow: 7, price: 95000 },   // Lô cũ, hết hạn sau 7 ngày
        { quantity: 15, daysAgo: 1, daysFromNow: 20, price: 105000 } // Lô mới, hết hạn sau 20 ngày
      ]
    );

    // Khoai tây: 40kg
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Khoai tây"),
      [
        { quantity: 20, daysAgo: 15, daysFromNow: 45, price: 19000 },
        { quantity: 20, daysAgo: 3, daysFromNow: 60, price: 21000 }
      ]
    );

    // Rau xà lách: 60 bó
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Rau xà lách"),
      [
        { quantity: 30, daysAgo: 5, daysFromNow: 3, price: 9500 },  // Lô cũ, hết hạn sau 3 ngày
        { quantity: 30, daysAgo: 1, daysFromNow: 7, price: 10500 } // Lô mới, hết hạn sau 7 ngày
      ]
    );

    // Trứng gà: 100 quả
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Trứng gà"),
      [
        { quantity: 50, daysAgo: 7, daysFromNow: 14, price: 2900 },
        { quantity: 50, daysAgo: 2, daysFromNow: 21, price: 3100 }
      ]
    );

    // Tôm tươi: 45kg
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Tôm tươi"),
      [
        { quantity: 20, daysAgo: 6, daysFromNow: 4, price: 95000 },   // Lô cũ, hết hạn sau 4 ngày
        { quantity: 25, daysAgo: 1, daysFromNow: 15, price: 105000 }  // Lô mới, hết hạn sau 15 ngày
      ]
    );

    // Phô mai: 25kg
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Phô mai"),
      [
        { quantity: 10, daysAgo: 12, daysFromNow: 18, price: 75000 },
        { quantity: 15, daysAgo: 3, daysFromNow: 30, price: 85000 }
      ]
    );

    // Bột mì: 30kg
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Bột mì"),
      [
        { quantity: 15, daysAgo: 20, daysFromNow: 100, price: 11500 },
        { quantity: 15, daysAgo: 5, daysFromNow: 120, price: 12500 }
      ]
    );

    // Thịt gà: 35kg
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Thịt gà"),
      [
        { quantity: 15, daysAgo: 10, daysFromNow: 10, price: 68000 },
        { quantity: 20, daysAgo: 2, daysFromNow: 25, price: 72000 }
      ]
    );

    // Thịt heo: 8kg (stock thấp để test)
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Thịt heo"),
      [
        { quantity: 8, daysAgo: 3, daysFromNow: 5, price: 70000 }
      ]
    );

    // Tạo PurchaseOrders cho các nguyên liệu còn lại (đơn giản hóa: 1 lô mỗi ingredient)
    const remainingIngredients = ingredients.filter(ing => 
      !['Thịt bò', 'Cá hồi', 'Khoai tây', 'Rau xà lách', 'Trứng gà', 'Tôm tươi', 
        'Phô mai', 'Bột mì', 'Thịt gà', 'Thịt heo'].includes(ing.name)
    );

    remainingIngredients.forEach(ingredient => {
      // Tạo 1-2 lô tùy theo số lượng
      if (ingredient.stockQuantity > 50) {
        // Chia thành 2 lô nếu số lượng lớn
        const qty1 = Math.floor(ingredient.stockQuantity / 2);
        const qty2 = ingredient.stockQuantity - qty1;
        createPurchaseOrdersForIngredient(ingredient, [
          { quantity: qty1, daysAgo: 5, daysFromNow: 30, price: ingredient.priceNow * 0.95 },
          { quantity: qty2, daysAgo: 1, daysFromNow: 60, price: ingredient.priceNow * 1.05 }
        ]);
      } else {
        // 1 lô nếu số lượng nhỏ
        createPurchaseOrdersForIngredient(ingredient, [
          { quantity: ingredient.stockQuantity, daysAgo: 3, daysFromNow: 30, price: ingredient.priceNow }
        ]);
      }
    });

    // Insert tất cả PurchaseOrders
    // LƯU Ý: Post-save hook của PurchaseOrder sẽ tự động cộng quantity vào stockQuantity
    // Nhưng vì Ingredient đã có stockQuantity từ trước, nên cần tính lại từ các PurchaseOrders
    const createdPurchaseOrders = await PurchaseOrder.insertMany(purchaseOrders);
    console.log(`📦 Đã tạo ${createdPurchaseOrders.length} PurchaseOrders cho ${ingredients.length} nguyên liệu.`);
    
    // Tính lại stockQuantity và priceNow cho mỗi ingredient từ các PurchaseOrders
    for (const ingredient of ingredients) {
      const ingredientPurchaseOrders = createdPurchaseOrders.filter(
        po => po.ingredientId.toString() === ingredient._id.toString()
      );
      
      // Tính tổng quantity và giá trung bình có trọng số
      let totalQuantity = 0;
      let totalValue = 0;
      
      ingredientPurchaseOrders.forEach(po => {
        totalQuantity += po.quantity;
        totalValue += po.quantity * po.price;
      });
      
      // Cập nhật lại stockQuantity và priceNow
      ingredient.stockQuantity = totalQuantity;
      ingredient.priceNow = totalQuantity > 0 ? totalValue / totalQuantity : ingredient.priceNow;
      await ingredient.save();
      
      console.log(`✅ Đã cập nhật lại ${ingredient.name}: stockQuantity = ${ingredient.stockQuantity}, priceNow = ${ingredient.priceNow.toFixed(2)}`);
    }

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

    // 🧹 Cleanup: đồng bộ lại logic table - order
    const allTables = await Table.find().populate("orderNow");
    for (const table of allTables) {
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

    console.log("✅ SEED DATABASE THÀNH CÔNG!");
  } catch (error) {
    console.error("❌ Lỗi khi seed database:", error);
    throw error; // Re-throw để caller biết có lỗi
  }
};

module.exports = seedDatabase;