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
const Shift = require("../models/Shift");
const WorkShift = require("../models/WorkShift");

const seedDatabase = async () => {
  try {
    console.log("🚀 Bắt đầu seed database...");

    // 1️⃣ Drop tất cả các collections (bảng) trước
    console.log("🗑️ Đang drop tất cả các collections...");
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      try {
        await db.dropCollection(collection.name);
        console.log(`  ✅ Đã drop collection: ${collection.name}`);
      } catch (error) {
        console.warn(`  ⚠️ Không thể drop collection ${collection.name}:`, error.message);
      }
    }
    console.log("🧹 Đã drop tất cả các collections.");

    // 2️⃣ Tạo user mẫu (dùng for để trigger pre-save hash)
    // Helper function để tạo tên ngẫu nhiên
    const firstNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đỗ", "Bùi", "Đinh", "Ngô", "Võ", "Dương", "Lý", "Phan", "Tạ", "Hồ", "Đặng", "Bạch", "Lương", "Chu"];
    const middleNames = ["Văn", "Thị", "Đức", "Minh", "Hùng", "Lan", "Mai", "Tuấn", "Hoa", "Linh", "Anh", "Dũng", "Hương", "Quang", "Thảo", "Nam", "Hải", "Phương", "Long", "Tâm"];
    const lastNames = ["An", "Bình", "Chi", "Dũng", "Giang", "Hoa", "Hùng", "Khanh", "Linh", "Mai", "Nam", "Phong", "Quang", "Sơn", "Thảo", "Tuấn", "Vinh", "Yến", "Đức", "Hương"];
    
    const generateRandomName = () => {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      return `${firstName} ${middleName} ${lastName}`;
    };
    
    const generatePhoneNumber = (index) => {
      const base = 1000000000 + index;
      return `0${base.toString().slice(-9)}`;
    };
    
    const userData = [
      // Waiters (waiter01-04 active, waiter05 inactive)
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
        status: "active",
      },
      {
        name: "Nguyễn Văn Phục Vụ 4",
        username: "waiter04",
        password: "waiter4@123",
        email: "waiter4@example.com",
        phone: "0987654324",
        role: "waiter",
        status: "active",
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
        status: "active",
      },
      {
        name: "Phan Tiến Mạnh",
        username: "chef02",
        password: "chef@123",
        email: "chef02@example.com",
        phone: "0908888998",
        role: "chef",
        status: "active",
      },
      {
        name: "Minh Chúc",
        username: "chef03",
        password: "chef@123",
        email: "chef03@example.com",
        phone: "0908888997",
        role: "chef",
        status: "active",
      },
      // Kitchen Managers
      {
        name: "Quản Lý Bếp",
        username: "kitchen01",
        password: "kitchen@123",
        email: "kitchen@example.com",
        phone: "0908888988",
        role: "kitchen_manager",
        status: "active",
      },
      {
        name: "Phó Quản Lý Bếp",
        username: "kitchen02",
        password: "kitchen@123",
        email: "kitchen02@example.com",
        phone: "0908888987",
        role: "kitchen_manager",
        status: "active",
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
      // Cashiers
      {
        name: "Nguyễn Thị Thu Ngân 1",
        username: "cashier01",
        password: "cashier@123",
        email: "cashier1@example.com",
        phone: "0911111111",
        role: "cashier",
        status: "active",
      },
      {
        name: "Trần Văn Thu Ngân 2",
        username: "cashier02",
        password: "cashier@123",
        email: "cashier2@example.com",
        phone: "0911111112",
        role: "cashier",
        status: "active",
      },
      {
        name: "Lê Thị Thu Ngân 3",
        username: "cashier03",
        password: "cashier@123",
        email: "cashier3@example.com",
        phone: "0911111113",
        role: "cashier",
        status: "inactive",
      },
    ];

    const users = [];
    for (const data of userData) {
      const user = await User.create(data); // middleware hash password
      users.push(user);
      console.log(`✅ Tạo user: ${user.username}`);
    }

    // 2.1️⃣ Tạo nhiều customers với các loại khác nhau
    console.log("👥 Bắt đầu tạo customers với các loại khác nhau...");
    const TOTAL_CUSTOMERS = 20; // Tổng số customers
    const customerTypes = {
      VIP: { count: 2, minOrders: 5, maxOrders: 10, minPoints: 500, maxPoints: 1000, cancelRate: 0.05 }, // VIP: nhiều orders, điểm cao, ít cancel
      BAD: { count: 1, minOrders: 1, maxOrders: 2, minPoints: 0, maxPoints: 50, cancelRate: 0.45 }, // Bad: ít orders, điểm thấp, nhiều cancel
      FREQUENT_HIGH_VALUE: { count: 3, minOrders: 4, maxOrders: 8, minPoints: 200, maxPoints: 400, cancelRate: 0.1 }, // Thường xuyên, giá trị cao
      FREQUENT_LOW_VALUE: { count: 3, minOrders: 3, maxOrders: 7, minPoints: 100, maxPoints: 250, cancelRate: 0.15 }, // Thường xuyên, giá trị thấp
      INFREQUENT_HIGH_VALUE: { count: 3, minOrders: 2, maxOrders: 5, minPoints: 150, maxPoints: 300, cancelRate: 0.2 }, // Không thường xuyên, giá trị cao
      INFREQUENT_LOW_VALUE: { count: 3, minOrders: 1, maxOrders: 3, minPoints: 50, maxPoints: 150, cancelRate: 0.25 }, // Không thường xuyên, giá trị thấp
      REGULAR: { count: 5, minOrders: 3, maxOrders: 7, minPoints: 80, maxPoints: 200, cancelRate: 0.15 } // Bình thường
    };
    
    const allCustomers = [];
    let customerIndex = 1;
    
    for (const [type, config] of Object.entries(customerTypes)) {
      for (let i = 0; i < config.count; i++) {
        const name = generateRandomName();
        const username = `customer${customerIndex.toString().padStart(3, '0')}`;
        const phone = generatePhoneNumber(customerIndex);
        
        allCustomers.push({
          name,
          username,
          password: "customer123",
          email: `${username}@example.com`,
          phone,
          role: "customer",
          point: Math.floor(Math.random() * (config.maxPoints - config.minPoints + 1)) + config.minPoints,
          customerType: type,
          expectedOrders: Math.floor(Math.random() * (config.maxOrders - config.minOrders + 1)) + config.minOrders,
          cancelRate: config.cancelRate
        });
        
        customerIndex++;
      }
    }
    
    // Lưu customerType và expectedOrders trước khi tạo (vì không phải field trong schema)
    const customerMetadata = new Map(); // Map userId -> { customerType, expectedOrders, cancelRate }
    
    // Tạo customers trong database
    const createdCustomers = [];
    for (const customerData of allCustomers) {
      const { customerType, expectedOrders, cancelRate, ...userData } = customerData;
      const user = await User.create(userData);
      
      // Lưu metadata
      customerMetadata.set(user._id.toString(), { customerType, expectedOrders, cancelRate });
      
      createdCustomers.push(user);
      if (createdCustomers.length % 50 === 0) {
        console.log(`  ✅ Đã tạo ${createdCustomers.length}/${TOTAL_CUSTOMERS} customers...`);
      }
    }
    
    console.log(`✅ Đã tạo ${createdCustomers.length} customers với các loại khác nhau.`);
    
    // Lưu thông tin customer types để dùng sau
    const customersByType = {};
    for (const customer of createdCustomers) {
      const metadata = customerMetadata.get(customer._id.toString());
      if (metadata) {
        const type = metadata.customerType;
        if (!customersByType[type]) {
          customersByType[type] = [];
        }
        customersByType[type].push(customer);
      }
    }

    const customers = createdCustomers;
    const waiters = users.filter((u) => u.role === "waiter");
    const chefs = users.filter((u) => u.role === "chef");
    const kitchenManagers = users.filter((u) => u.role === "kitchen_manager");
    const cashiers = users.filter((u) => u.role === "cashier");

    // 2.5️⃣ Tạo Shift Data cho nhân viên
    console.log("📅 Bắt đầu tạo Shift data...");
    
    // Tạo WorkShift trước (Ca sáng và Ca chiều)
    console.log("📋 Tạo WorkShift...");
    const morningWorkShift = await WorkShift.create({
      name: "Ca sáng",
      startTime: "07:00",
      endTime: "15:00",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      isActive: true,
    });
    
    const afternoonWorkShift = await WorkShift.create({
      name: "Ca chiều",
      startTime: "15:00",
      endTime: "23:00",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      isActive: true,
    });
    
    console.log(`✅ Đã tạo 2 WorkShift: ${morningWorkShift.name} và ${afternoonWorkShift.name}`);
    
    const shifts = [];
    const shiftOneMonthAgo = new Date();
    shiftOneMonthAgo.setMonth(shiftOneMonthAgo.getMonth() - 1);
    const shiftToday = new Date();
    const shiftTotalDays = Math.floor((shiftToday - shiftOneMonthAgo) / (1000 * 60 * 60 * 24));

    // Helper function để tạo shifts cho một nhân viên
    const createShiftsForEmployee = (employee, daysToWork, morningWorkShiftId, afternoonWorkShiftId) => {
      const employeeShifts = [];
      const shiftDays = [];
      
      // Chọn ngẫu nhiên các ngày làm việc (không làm tất cả các ngày)
      while (shiftDays.length < daysToWork) {
        const randomDay = Math.floor(Math.random() * shiftTotalDays);
        if (!shiftDays.includes(randomDay)) {
          shiftDays.push(randomDay);
        }
      }
      shiftDays.sort((a, b) => a - b);

      for (const dayOffset of shiftDays) {
        const shiftDate = new Date(shiftOneMonthAgo);
        shiftDate.setDate(shiftDate.getDate() + dayOffset);
        
        // Chọn ca làm việc: ca sáng (7h-15h) hoặc ca chiều (15h-23h)
        const isMorningShift = Math.random() > 0.5;
        let startHour, endHour, workShiftId;
        
        if (isMorningShift) {
          // Ca sáng: 7:00-15:00
          startHour = 7 + Math.floor(Math.random() * 2); // 7-8 giờ
          endHour = 14 + Math.floor(Math.random() * 2); // 14-15 giờ
          workShiftId = morningWorkShiftId;
        } else {
          // Ca chiều: 15:00-23:00
          startHour = 15 + Math.floor(Math.random() * 2); // 15-16 giờ
          endHour = 22 + Math.floor(Math.random() * 2); // 22-23 giờ
          workShiftId = afternoonWorkShiftId;
        }
        
        const startMinute = Math.floor(Math.random() * 60);
        const endMinute = Math.floor(Math.random() * 60);
        
        const startTime = new Date(shiftDate);
        startTime.setHours(startHour, startMinute, 0);
        
        const endTime = new Date(shiftDate);
        endTime.setHours(endHour, endMinute, 0);
        
        // Đảm bảo endTime sau startTime
        if (endTime <= startTime) {
          endTime.setHours(endTime.getHours() + 1);
        }
        
        employeeShifts.push({
          userId: employee._id,
          workShiftId: workShiftId,
          date: shiftDate,
          startTime: startTime,
          endTime: endTime,
          status: "checked_out", // Đã check out
        });
      }

      return employeeShifts;
    };

    // Tạo shifts cho waiters (active waiters)
    const activeWaitersForShift = waiters.filter(w => w.status === "active");
    for (const waiter of activeWaitersForShift) {
      const daysToWork = 10 + Math.floor(Math.random() * 6); // 10-15 ngày
      const waiterShifts = createShiftsForEmployee(waiter, daysToWork, morningWorkShift._id, afternoonWorkShift._id);
      shifts.push(...waiterShifts);
    }

    // Tạo shifts cho chefs
    for (const chef of chefs) {
      const daysToWork = 10 + Math.floor(Math.random() * 6); // 10-15 ngày
      const chefShifts = createShiftsForEmployee(chef, daysToWork, morningWorkShift._id, afternoonWorkShift._id);
      shifts.push(...chefShifts);
    }

    // Tạo shifts cho kitchen managers
    for (const manager of kitchenManagers) {
      const daysToWork = 10 + Math.floor(Math.random() * 6); // 10-15 ngày
      const managerShifts = createShiftsForEmployee(manager, daysToWork, morningWorkShift._id, afternoonWorkShift._id);
      shifts.push(...managerShifts);
    }

    // Tạo shifts cho cashiers (active cashiers)
    const activeCashiersForShift = cashiers.filter(c => c.status === "active");
    for (const cashier of activeCashiersForShift) {
      const daysToWork = 10 + Math.floor(Math.random() * 6); // 10-15 ngày
      const cashierShifts = createShiftsForEmployee(cashier, daysToWork, morningWorkShift._id, afternoonWorkShift._id);
      shifts.push(...cashierShifts);
    }

    await Shift.insertMany(shifts);
    console.log(`✅ Đã tạo ${shifts.length} shifts cho nhân viên.`);

    // 3️⃣ Nguyên liệu
    // Lưu ý: stockQuantity sẽ được cập nhật tự động bởi post-save hook của PurchaseOrder
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
    // 🪑 5️⃣ Tạo bàn ăn (20 bàn)
    // ===============================
    const tables = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        Table.create({
          tableNumber: i + 1,
          qrCode: `QR_TABLE_${i + 1}`,
          status: i < 8 ? "occupied" : "available",
          orderNow: [],
        })
      )
    );

    // ===============================
    // 📦 5.5️⃣ Purchase Orders - TẠO TRƯỚC Orders để có thể tính expense chính xác
    // ===============================
    console.log("📦 Bắt đầu tạo Purchase Orders...");
    
    // Lưu giá trị ban đầu của stockQuantity trước khi set = 0
    const originalStockQuantities = {};
    for (const ingredient of ingredients) {
      originalStockQuantities[ingredient.name] = ingredient.stockQuantity;
      ingredient.stockQuantity = 0;
      await ingredient.save();
    }
    
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
          price: batch.price || 0, // Giá phải được set trong batch
          time: time,
          expiryDate: expiryDate,
          usedQuantity: 0,
          status: expiryDate && expiryDate < new Date() ? 'expired' : 'valid'
        });
        totalQuantity += batch.quantity;
      });
      
      // Kiểm tra xem tổng có khớp với stockQuantity không (sau khi post-save hook cộng)
      // Lưu ý: stockQuantity ban đầu = 0, sẽ được cộng bởi post-save hook
    };

    // Tạo PurchaseOrders cho từng ingredient, chia thành nhiều lô để test FIFO
    // LƯU Ý: Tăng số lượng lên nhiều lần (x3-5) để đủ cho ~100-200 orders trong 30 ngày
    // Ví dụ: Thịt bò có 50kg ban đầu → tăng lên 200kg để đủ cho tất cả orders
    
    // Thịt bò: 50kg × 4 = 200kg
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Thịt bò"),
      [
        { quantity: 80, daysAgo: 10, daysFromNow: 15, price: 95000 }, // Lô cũ, hết hạn sau 15 ngày
        { quantity: 120, daysAgo: 2, daysFromNow: 30, price: 105000 }  // Lô mới, hết hạn sau 30 ngày
      ]
    );

    // Cá hồi: 30kg × 4 = 120kg
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Cá hồi"),
      [
        { quantity: 60, daysAgo: 8, daysFromNow: 7, price: 95000 },   // Lô cũ, hết hạn sau 7 ngày
        { quantity: 60, daysAgo: 1, daysFromNow: 20, price: 105000 } // Lô mới, hết hạn sau 20 ngày
      ]
    );

    // Khoai tây: 40kg × 4 = 160kg
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Khoai tây"),
      [
        { quantity: 80, daysAgo: 15, daysFromNow: 45, price: 19000 },
        { quantity: 80, daysAgo: 3, daysFromNow: 60, price: 21000 }
      ]
    );

    // Rau xà lách: 60 bó × 4 = 240 bó
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Rau xà lách"),
      [
        { quantity: 120, daysAgo: 5, daysFromNow: 3, price: 9500 },  // Lô cũ, hết hạn sau 3 ngày
        { quantity: 120, daysAgo: 1, daysFromNow: 7, price: 10500 } // Lô mới, hết hạn sau 7 ngày
      ]
    );

    // Trứng gà: 100 quả × 4 = 400 quả
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Trứng gà"),
      [
        { quantity: 200, daysAgo: 7, daysFromNow: 14, price: 2900 },
        { quantity: 200, daysAgo: 2, daysFromNow: 21, price: 3100 }
      ]
    );

    // Tôm tươi: 45kg × 4 = 180kg
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Tôm tươi"),
      [
        { quantity: 80, daysAgo: 6, daysFromNow: 4, price: 95000 },   // Lô cũ, hết hạn sau 4 ngày
        { quantity: 100, daysAgo: 1, daysFromNow: 15, price: 105000 }  // Lô mới, hết hạn sau 15 ngày
      ]
    );

    // Phô mai: 25kg × 4 = 100kg
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Phô mai"),
      [
        { quantity: 40, daysAgo: 12, daysFromNow: 18, price: 75000 },
        { quantity: 60, daysAgo: 3, daysFromNow: 30, price: 85000 }
      ]
    );

    // Bột mì: 30kg × 4 = 120kg
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Bột mì"),
      [
        { quantity: 60, daysAgo: 20, daysFromNow: 100, price: 11500 },
        { quantity: 60, daysAgo: 5, daysFromNow: 120, price: 12500 }
      ]
    );

    // Thịt gà: 35kg × 4 = 140kg
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Thịt gà"),
      [
        { quantity: 60, daysAgo: 10, daysFromNow: 10, price: 68000 },
        { quantity: 80, daysAgo: 2, daysFromNow: 25, price: 72000 }
      ]
    );

    // Thịt heo: 8kg × 4 = 32kg (vẫn thấp để test cảnh báo)
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Thịt heo"),
      [
        { quantity: 32, daysAgo: 3, daysFromNow: 5, price: 70000 }
      ]
    );

    // Thêm một số lô đã HẾT HẠN để test hệ thống
    // Rau xà lách: thêm lô đã hết hạn (hết hạn 2 ngày trước)
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Rau xà lách"),
      [
        { quantity: 10, daysAgo: 5, daysFromNow: -2, price: 9000 } // Đã hết hạn 2 ngày trước
      ]
    );

    // Cá hồi: thêm lô sắp hết hạn (hết hạn sau 1 ngày)
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Cá hồi"),
      [
        { quantity: 10, daysAgo: 3, daysFromNow: 1, price: 98000 } // Sắp hết hạn (1 ngày)
      ]
    );

    // Tôm tươi: thêm lô đã hết hạn (hết hạn 5 ngày trước)
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Tôm tươi"),
      [
        { quantity: 5, daysAgo: 10, daysFromNow: -5, price: 93000 } // Đã hết hạn 5 ngày trước
      ]
    );

    // Trứng gà: thêm lô sắp hết hạn (hết hạn sau 2 ngày)
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Trứng gà"),
      [
        { quantity: 20, daysAgo: 5, daysFromNow: 2, price: 2800 } // Sắp hết hạn (2 ngày)
      ]
    );

    // Thịt bò: thêm lô đã hết hạn (hết hạn 3 ngày trước) - nhưng vẫn còn một ít trong kho
    createPurchaseOrdersForIngredient(
      ingredients.find((i) => i.name === "Thịt bò"),
      [
        { quantity: 10, daysAgo: 8, daysFromNow: -3, price: 92000 } // Đã hết hạn 3 ngày trước
      ]
    );

    // Tạo PurchaseOrders cho các nguyên liệu còn lại (đơn giản hóa: 1 lô mỗi ingredient)
    const remainingIngredients = ingredients.filter(ing => 
      !['Thịt bò', 'Cá hồi', 'Khoai tây', 'Rau xà lách', 'Trứng gà', 'Tôm tươi', 
        'Phô mai', 'Bột mì', 'Thịt gà', 'Thịt heo'].includes(ing.name)
    );

    // Giá mặc định cho các nguyên liệu còn lại (có thể điều chỉnh)
    const defaultPrices = {
      'Ớt chuông': 25000, 'Cà chua': 15000, 'Hành tây': 20000, 'Bơ': 80000,
      'Nước mắm': 40000, 'Tỏi': 50000, 'Cá basa': 40000, 'Mực tươi': 100000,
      'Cua biển': 180000, 'Nấm hương': 150000, 'Rau muống': 8000, 'Rau cải': 7000,
      'Cà rốt': 18000, 'Khoai lang': 15000, 'Bí đỏ': 12000, 'Dưa chuột': 16000,
      'Cà tím': 20000, 'Đậu phụ': 5000, 'Mì tôm': 5000, 'Bún tươi': 15000,
      'Phở tươi': 20000, 'Gạo': 10000, 'Dầu ăn': 45000, 'Muối': 8000,
      'Đường': 15000, 'Tiêu': 250000, 'Ớt hiểm': 80000, 'Chanh': 2000,
      'Coca Cola': 2500, 'Pepsi': 2500, 'Nước suối': 5000, 'Trà đá': 3000,
      'Cà phê đen': 5000, 'Sữa tươi': 13333, 'Kem vani': 50000, 'Bánh mì': 10000,
      'Bánh ngọt': 20000
    };

    remainingIngredients.forEach(ingredient => {
      const defaultPrice = defaultPrices[ingredient.name] || 10000; // Giá mặc định 10000 nếu không có
      
      // Tăng số lượng lên 3-5 lần để đủ cho ~100-200 orders
      // Lấy giá trị ban đầu từ originalStockQuantities (trước khi set = 0)
      const originalStockQty = originalStockQuantities[ingredient.name] || 0;
      // Tạm thời dùng multiplier 3-5 tùy theo loại nguyên liệu
      // Đồ uống và gạo có multiplier thấp hơn vì số lượng ban đầu đã lớn
      const multiplier = ingredient.name.includes('Coca') || ingredient.name.includes('Pepsi') || 
                        ingredient.name.includes('Nước suối') || ingredient.name.includes('Gạo') ? 3 : 4;
      
      const totalQuantity = originalStockQty * multiplier;
      
      // Tạo 1-2 lô tùy theo số lượng
      if (totalQuantity > 100) {
        // Chia thành 2 lô nếu số lượng lớn
        const qty1 = Math.floor(totalQuantity / 2);
        const qty2 = totalQuantity - qty1;
        createPurchaseOrdersForIngredient(ingredient, [
          { quantity: qty1, daysAgo: 5, daysFromNow: 30, price: defaultPrice * 0.95 },
          { quantity: qty2, daysAgo: 1, daysFromNow: 60, price: defaultPrice * 1.05 }
        ]);
      } else {
        // 1 lô nếu số lượng nhỏ
        createPurchaseOrdersForIngredient(ingredient, [
          { quantity: totalQuantity, daysAgo: 3, daysFromNow: 30, price: defaultPrice }
        ]);
      }
    });

    // Insert tất cả PurchaseOrders
    // LƯU Ý: insertMany KHÔNG trigger post-save hooks, nên cần tính lại stockQuantity thủ công
    const createdPurchaseOrders = await PurchaseOrder.insertMany(purchaseOrders);
    console.log(`📦 Đã tạo ${createdPurchaseOrders.length} PurchaseOrders cho ${ingredients.length} nguyên liệu.`);
    
    // Tính lại stockQuantity cho mỗi ingredient từ các PurchaseOrders
    // (vì insertMany không trigger post-save hook)
    for (const ingredient of ingredients) {
      const ingredientPurchaseOrders = createdPurchaseOrders.filter(
        po => po.ingredientId.toString() === ingredient._id.toString()
      );
      
      // Tính tổng quantity từ tất cả PurchaseOrders
      const totalQuantity = ingredientPurchaseOrders.reduce((sum, po) => sum + po.quantity, 0);
      
      // Cập nhật stockQuantity
      ingredient.stockQuantity = totalQuantity;
      await ingredient.save();
      
      console.log(`✅ Đã cập nhật ${ingredient.name}: stockQuantity = ${totalQuantity} (từ ${ingredientPurchaseOrders.length} lô nhập)`);
    }

    // ===============================
    // 🍽️ 6️⃣ Tạo orders mẫu
    // ===============================


    // ===============================
    // ⚙️ Helper functions
    // ===============================

    // Helper function - Thực sự trừ kho và tính expense từ giá thực tế (FIFO)
    const { deductIngredientsFromStock } = require("./customerHelpers");
    
    const createOrderItems = async (items, status, assignedChef = null, waiter = null) => {
      const selectedItems = [];
      for (let j = 0; j < Math.min(3, items.length); j++) {
        const randomItem = items[Math.floor(Math.random() * items.length)];
        
        // Populate ingredients để trừ kho
        const populatedItem = await Item.findById(randomItem._id).populate('ingredients.ingredient');
        if (!populatedItem) continue;
        
        const quantity = Math.floor(Math.random() * 2) + 1;
        
        // Thực sự trừ kho và lấy ingredientUsage (FIFO - giá thực tế)
        const ingredientUsage = await deductIngredientsFromStock(populatedItem, quantity);
        
        // Tính expense từ ingredientUsage (giá thực tế của từng lô)
        const expense = ingredientUsage.reduce((sum, usage) => sum + (usage.quantity * usage.price), 0);
        
        // Gán servedBy nếu status là "served" hoặc "paid" và có waiter
        const servedBy = (status === "served" || status === "paid") && waiter ? waiter._id : null;
        
        const orderItem = await OrderItem.create({
          itemId: randomItem._id,
          itemName: randomItem.name,
          itemType: "item",
          quantity: quantity,
          price: randomItem.price,
          expense: expense, // Giá vốn tại thời điểm đặt món (từ giá thực tế FIFO)
          ingredientUsage: ingredientUsage, // Track từng lô nguyên liệu đã dùng (thực tế đã trừ kho)
          assignedChef,
          servedBy,
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

    // Tạo order items với expense biến động ngẫu nhiên (cho testing variation)
    const createOrderItemsWithVariableExpense = async (items, status, assignedChef = null, waiter = null) => {
      const selectedItems = [];
      const numItems = getRandomInt(1, 5); // 1-5 items mỗi order
      
      for (let j = 0; j < numItems; j++) {
        const randomItem = items[Math.floor(Math.random() * items.length)];
        
        // Populate ingredients để trừ kho
        const populatedItem = await Item.findById(randomItem._id).populate('ingredients.ingredient');
        if (!populatedItem) continue;
        
        const quantity = getRandomInt(1, 3); // 1-3 quantity
        
        // Thực sự trừ kho và lấy ingredientUsage (FIFO - giá thực tế)
        const ingredientUsage = await deductIngredientsFromStock(populatedItem, quantity);
        
        // Tính expense từ ingredientUsage (giá thực tế của từng lô)
        const expense = ingredientUsage.reduce((sum, usage) => sum + (usage.quantity * usage.price), 0);
        
        // Gán servedBy nếu status là "served" hoặc "paid" và có waiter
        const servedBy = (status === "served" || status === "paid") && waiter ? waiter._id : null;
        
        const orderItem = await OrderItem.create({
          itemId: randomItem._id,
          itemName: randomItem.name,
          itemType: "item",
          quantity: quantity,
          price: randomItem.price,
          expense: expense, // Giá vốn tại thời điểm đặt món (từ giá thực tế FIFO)
          ingredientUsage: ingredientUsage, // Track từng lô nguyên liệu đã dùng (thực tế đã trừ kho, giá thực tế)
          assignedChef,
          servedBy,
          status,
        });
        selectedItems.push(orderItem);
      }
      return selectedItems;
    };

    // Helper function để tạo order items với giá trị cao (cho customers ăn nhiều)
    const createHighValueOrderItems = async (items, status, assignedChef = null, waiter = null) => {
      const selectedItems = [];
      // Chỉ chọn các món có giá cao (>= 200000)
      const highValueItems = items.filter(item => item.price >= 200000);
      const numItems = getRandomInt(2, 5); // 2-5 items, nhiều hơn
      
      for (let j = 0; j < numItems; j++) {
        const randomItem = highValueItems[Math.floor(Math.random() * highValueItems.length)];
        
        const populatedItem = await Item.findById(randomItem._id).populate('ingredients.ingredient');
        if (!populatedItem) continue;
        
        const quantity = getRandomInt(1, 3); // 1-3 quantity
        
        const ingredientUsage = await deductIngredientsFromStock(populatedItem, quantity);
        const expense = ingredientUsage.reduce((sum, usage) => sum + (usage.quantity * usage.price), 0);
        const servedBy = (status === "served" || status === "paid") && waiter ? waiter._id : null;
        
        const orderItem = await OrderItem.create({
          itemId: randomItem._id,
          itemName: randomItem.name,
          itemType: "item",
          quantity: quantity,
          price: randomItem.price,
          expense: expense,
          ingredientUsage: ingredientUsage,
          assignedChef,
          servedBy,
          status,
        });
        selectedItems.push(orderItem);
      }
      return selectedItems;
    };

    // Helper function để tạo order items với giá trị thấp (cho customers ăn ít)
    const createLowValueOrderItems = async (items, status, assignedChef = null, waiter = null) => {
      const selectedItems = [];
      // Chỉ chọn các món có giá thấp (< 150000)
      const lowValueItems = items.filter(item => item.price < 150000);
      const numItems = getRandomInt(1, 3); // 1-3 items, ít hơn
      
      for (let j = 0; j < numItems; j++) {
        const randomItem = lowValueItems[Math.floor(Math.random() * lowValueItems.length)];
        
        const populatedItem = await Item.findById(randomItem._id).populate('ingredients.ingredient');
        if (!populatedItem) continue;
        
        const quantity = getRandomInt(1, 2); // 1-2 quantity, ít hơn
        
        const ingredientUsage = await deductIngredientsFromStock(populatedItem, quantity);
        const expense = ingredientUsage.reduce((sum, usage) => sum + (usage.quantity * usage.price), 0);
        const servedBy = (status === "served" || status === "paid") && waiter ? waiter._id : null;
        
        const orderItem = await OrderItem.create({
          itemId: randomItem._id,
          itemName: randomItem.name,
          itemType: "item",
          quantity: quantity,
          price: randomItem.price,
          expense: expense,
          ingredientUsage: ingredientUsage,
          assignedChef,
          servedBy,
          status,
        });
        selectedItems.push(orderItem);
      }
      return selectedItems;
    };

    // Helper function để tạo combo order items
    const createComboOrderItems = async (menus, items, status, assignedChef = null, waiter = null) => {
      const selectedItems = [];
      // Chỉ chọn các combo available
      const availableMenus = menus.filter(menu => menu.isAvailable && menu.type === "combo");
      if (availableMenus.length === 0) {
        console.log("⚠️ No available combos found, skipping combo order items");
        return selectedItems;
      }
      
      // Chọn 1-2 combos
      const numCombos = getRandomInt(1, 2);
      
      for (let j = 0; j < numCombos; j++) {
        const randomMenu = availableMenus[Math.floor(Math.random() * availableMenus.length)];
        
        // Populate menu items để lấy thông tin
        const populatedMenu = await Menu.findById(randomMenu._id).populate('items');
        if (!populatedMenu || !populatedMenu.items || populatedMenu.items.length === 0) continue;
        
        const quantity = getRandomInt(1, 2);
        
        // Tính expense cho combo: tổng expense của tất cả items trong combo
        let totalExpense = 0;
        let allIngredientUsage = [];
        
        for (const comboItemId of populatedMenu.items) {
          const comboItem = await Item.findById(comboItemId).populate('ingredients.ingredient');
          if (!comboItem) continue;
          
          // Trừ kho cho từng item trong combo
          const ingredientUsage = await deductIngredientsFromStock(comboItem, quantity);
          const expense = ingredientUsage.reduce((sum, usage) => sum + (usage.quantity * usage.price), 0);
          totalExpense += expense;
          allIngredientUsage = allIngredientUsage.concat(ingredientUsage);
        }
        
        // Tạo comboItems array
        const comboItemsData = [];
        for (const comboItemId of populatedMenu.items) {
          const comboItem = await Item.findById(comboItemId);
          if (comboItem) {
            // Set status, assignedChef, và servedBy cho comboItems dựa trên status của OrderItem
            const comboItemStatus = (status === "served" || status === "paid") ? "served" : status;
            const comboItemAssignedChef = assignedChef || null;
            const comboItemServedBy = (comboItemStatus === "served" && waiter) ? waiter._id : null;
            
            comboItemsData.push({
              itemId: comboItem._id,
              itemName: comboItem.name,
              status: comboItemStatus,
              assignedChef: comboItemAssignedChef,
              servedBy: comboItemServedBy,
            });
          }
        }
        
        const servedBy = (status === "served" || status === "paid") && waiter ? waiter._id : null;
        
        const orderItem = await OrderItem.create({
          itemId: randomMenu._id, // itemId trỏ đến Menu collection
          itemName: randomMenu.name,
          itemType: "menu", // Quan trọng: itemType = "menu" để nhận biết combo
          quantity: quantity,
          price: randomMenu.price,
          expense: totalExpense,
          ingredientUsage: allIngredientUsage,
          comboItems: comboItemsData, // Thêm comboItems array
          assignedChef,
          servedBy,
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
    const activeWaiters = waiters.filter(w => w.status === "active"); // Chỉ dùng active waiters
    const activeCashiers = cashiers.filter(c => c.status === "active"); // Active cashiers
    let waiterIndex = 0; // Round-robin index cho waiters
    let cashierIndex = 0; // Round-robin index cho cashiers
    const getNextWaiter = () => {
      const waiter = activeWaiters[waiterIndex % activeWaiters.length];
      waiterIndex++;
      return waiter;
    };
    const getNextCashier = () => {
      if (activeCashiers.length === 0) return null;
      const cashier = activeCashiers[cashierIndex % activeCashiers.length];
      cashierIndex++;
      return cashier;
    };

    // A. pending orders đã được xóa để test hệ thống sạch

    // B. pending orders (waiter approved, customer chưa confirm) đã được xóa để test hệ thống sạch

    // C. rejected orders đã được xóa để test hệ thống sạch

    // thiếu confirmed và xoá ready, vì ready bị bỏ còn confirmed để demo với kitchen cho đẹp

    // E. preparing - 5 orders
    for (let i = 0; i < 5; i++) {
      const table = tables[i];
      const customer = customers[i % customers.length];
      const waiter = getNextWaiter(); // Round-robin distribution
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
      const waiter = getNextWaiter(); // Round-robin distribution
      const chef = chefs[i % chefs.length];

      const orderItems = await createOrderItems(items, "served", chef._id, waiter);
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
      const waiter = getNextWaiter(); // Round-robin distribution
      const chef = chefs[i % chefs.length];

      // 20% orders sẽ có combo (khoảng 1-2 orders trong 6 orders)
      const isComboOrder = (i === 9 || i === 12); // 2 orders có combo
      const orderItems = isComboOrder 
        ? await createComboOrderItems(menus, items, "served", chef._id, waiter)
        : await createOrderItems(items, "served", chef._id, waiter);
      
      // Fallback nếu không có combo available
      const finalOrderItems = orderItems.length === 0 
        ? await createOrderItems(items, "served", chef._id, waiter)
        : orderItems;
      const totalAmount = finalOrderItems.reduce(
        (sum, oi) => sum + oi.price * oi.quantity,
        0
      );

      const cashier = getNextCashier(); // Round-robin distribution
      const payment = await Payment.create({
        paymentMethod: "card",
        status: "paid",
        amountPaid: totalAmount,
        totalAmount: totalAmount,
        cashierId: cashier ? cashier._id : null,
      });

      const order = await Order.create({
        userId: customer._id,
        servedBy: waiter._id,
        tableId: table._id,
        orderItems: finalOrderItems.map((oi) => oi._id),
        paymentId: payment._id,
        status: "paid",
        waiterResponse: { status: "approved", respondedAt: new Date() },
        customerConfirmed: true,
        actions: ["order_created", "waiter_approved", "customer_confirmed"],
        paid: true,
      });

      await OrderItem.updateMany(
        { _id: { $in: finalOrderItems.map((oi) => oi._id) } },
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

    // I. Tạo orders cho tất cả customers dựa trên customerType và expectedOrders
    console.log("🔄 Bắt đầu tạo orders cho tất cả customers dựa trên loại...");
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const today = new Date();
    const totalDays = Math.floor((today - oneMonthAgo) / (1000 * 60 * 60 * 24));
    
    // Helper function để tạo orders cho một customer
    const createOrdersForCustomer = async (customer, customerType) => {
      const customerOrders = [];
      const metadata = customerMetadata.get(customer._id.toString());
      const expectedOrders = metadata?.expectedOrders || customerTypes[customerType].minOrders;
      const cancelRate = metadata?.cancelRate || customerTypes[customerType].cancelRate;
      const numCancelled = Math.floor(expectedOrders * cancelRate);
      
      // Tạo danh sách ngày để phân bổ orders (tần suất cao = phân bố đều, tần suất thấp = tập trung)
      const isFrequent = customerType.includes('FREQUENT') || customerType === 'VIP';
      const orderDays = [];
      
      if (isFrequent) {
        // Phân bố đều trong 3 tháng
        const daysPerOrder = Math.floor(totalDays / expectedOrders);
        for (let i = 0; i < expectedOrders; i++) {
          const dayOffset = i * daysPerOrder + Math.floor(Math.random() * daysPerOrder);
          orderDays.push(Math.min(dayOffset, totalDays - 1));
        }
      } else {
        // Tập trung trong một số ngày nhất định
        const clusterDays = Math.floor(totalDays * 0.3); // 30% số ngày
        for (let i = 0; i < expectedOrders; i++) {
          orderDays.push(Math.floor(Math.random() * clusterDays));
        }
      }
      
      for (let i = 0; i < expectedOrders; i++) {
        const randomTable = tables[Math.floor(Math.random() * tables.length)];
        const randomWaiter = getNextWaiter(); // Round-robin distribution
        const randomChef = chefs[Math.floor(Math.random() * chefs.length)];
        
        const dayOffset = orderDays[i];
        const orderDate = new Date(oneMonthAgo);
        orderDate.setDate(orderDate.getDate() + dayOffset);
        const orderCreatedAt = getRandomTimeInDay(orderDate);
        const orderUpdatedAt = new Date(orderCreatedAt.getTime() + getRandomInt(30, 120) * 60 * 1000);
        const paymentTime = new Date(orderCreatedAt.getTime() + getRandomInt(60, 180) * 60 * 1000);
        
        const isCancelled = i < numCancelled;
        const orderStatus = isCancelled ? "cancelled" : "paid";
        
        // Chọn helper function dựa trên customerType
        // 20% orders sẽ có combo
        const isComboOrder = Math.random() < 0.2;
        let orderItems;
        
        if (isComboOrder) {
          // Tạo combo order items
          orderItems = await createComboOrderItems(
            menus,
            items,
            isCancelled ? "pending" : "served",
            randomChef._id,
            isCancelled ? null : randomWaiter
          );
          // Nếu không có combo available, fallback về items thông thường
          if (orderItems.length === 0) {
            orderItems = await createOrderItemsWithVariableExpense(
              items,
              isCancelled ? "pending" : "served",
              randomChef._id,
              isCancelled ? null : randomWaiter
            );
          }
        } else if (customerType.includes('HIGH_VALUE') || customerType === 'VIP') {
          orderItems = await createHighValueOrderItems(
            items,
            isCancelled ? "pending" : "served",
            randomChef._id,
            isCancelled ? null : randomWaiter
          );
        } else if (customerType.includes('LOW_VALUE')) {
          orderItems = await createLowValueOrderItems(
            items,
            isCancelled ? "pending" : "served",
            randomChef._id,
            isCancelled ? null : randomWaiter
          );
        } else {
          orderItems = await createOrderItemsWithVariableExpense(
            items,
            isCancelled ? "pending" : "served",
            randomChef._id,
            isCancelled ? null : randomWaiter
          );
        }
        
        const totalAmount = orderItems.reduce((sum, oi) => sum + oi.price * oi.quantity, 0);
        
        const paymentMethods = ["cash", "card", "momo", "zaloPay"];
        const paymentMethod = paymentMethods[getRandomInt(0, paymentMethods.length - 1)];
        
        // Set cashierId cho paid payments
        const cashier = !isCancelled ? getNextCashier() : null;
        
        const payment = await Payment.create({
          paymentMethod: paymentMethod,
          status: isCancelled ? "unpaid" : "paid",
          amountPaid: isCancelled ? 0 : totalAmount,
          totalAmount: totalAmount,
          payTime: isCancelled ? null : paymentTime,
          cashierId: cashier ? cashier._id : null,
        });
        
        const order = await Order.create({
          userId: customer._id,
          servedBy: randomWaiter._id,
          tableId: randomTable._id,
          orderItems: orderItems.map((oi) => oi._id),
          paymentId: payment._id,
          status: orderStatus,
          totalAmount: totalAmount,
          waiterResponse: { 
            status: isCancelled ? "pending" : "approved", 
            respondedAt: isCancelled ? null : orderCreatedAt 
          },
          customerConfirmed: !isCancelled,
          actions: isCancelled ? ["order_created"] : ["order_created", "waiter_approved", "customer_confirmed"],
          paid: !isCancelled,
          createdAt: orderCreatedAt,
          updatedAt: orderUpdatedAt,
        });
        
        await OrderItem.updateMany(
          { _id: { $in: orderItems.map((oi) => oi._id) } },
          { orderId: order._id }
        );
        
        payment.orderId = order._id;
        await payment.save();
        
        customerOrders.push(order);
      }
      
      return customerOrders;
    };
    
    // Tạo orders cho tất cả customers
    let totalOrdersCreated = 0;
    for (const [type, customerList] of Object.entries(customersByType)) {
      console.log(`  📦 Đang tạo orders cho ${customerList.length} customers loại ${type}...`);
      for (const customer of customerList) {
        const orders = await createOrdersForCustomer(customer, type);
        totalOrdersCreated += orders.length;
        orderCount += orders.length;
        
        if (totalOrdersCreated % 50 === 0) {
          console.log(`    ✅ Đã tạo ${totalOrdersCreated} orders...`);
        }
      }
      console.log(`  ✅ Đã tạo orders cho ${customerList.length} customers loại ${type}`);
    }
    
    console.log(`✅ Đã tạo tổng cộng ${totalOrdersCreated} orders cho ${customers.length} customers.`);

    // I. cancelled - 3 orders (sample cancelled orders không liên kết với customers cụ thể)
    for (let i = 10; i < 13 && i < tables.length; i++) {
      const table = tables[i];
      const customer = customers[Math.floor(Math.random() * customers.length)];
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

    // J. Tạo bàn có nhiều orders đang hoạt động - 3 bàn (table 17, 18, 19)
    // Mỗi bàn sẽ có 2-3 orders với status preparing/served
    for (let tableIdx = 17; tableIdx < 20 && tableIdx < tables.length; tableIdx++) {
      const table = tables[tableIdx];
      const numOrders = tableIdx === 17 ? 2 : 3; // Bàn 17 có 2 orders, bàn 18-19 có 3 orders
      
      for (let orderIdx = 0; orderIdx < numOrders; orderIdx++) {
        const customer = customers[(tableIdx + orderIdx) % customers.length];
        const waiter = waiters[tableIdx % waiters.length];
        const chef = chefs[tableIdx % chefs.length];
        
        // Random status: preparing hoặc served
        const orderStatus = orderIdx % 2 === 0 ? "preparing" : "served";
        const waiterForOrder = getNextWaiter(); // Round-robin distribution
        const orderItems = await createOrderItems(items, orderStatus, chef._id, orderStatus === "served" ? waiterForOrder : null);
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

    // 8️⃣ Feedbacks - Link với paid orders và phản ánh đúng loại customer
    console.log("💬 Bắt đầu tạo Feedbacks từ paid orders...");
    
    // Lấy tất cả paid orders
    const allPaidOrders = await Order.find({ status: "paid" }).populate("userId");
    
    // Chọn 30-40% orders để tạo feedback
    const feedbackPercentage = 0.3 + Math.random() * 0.1; // 30-40%
    const numFeedbacks = Math.floor(allPaidOrders.length * feedbackPercentage);
    const ordersForFeedback = [];
    
    // Shuffle và chọn ngẫu nhiên
    const shuffled = [...allPaidOrders].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numFeedbacks && i < shuffled.length; i++) {
      ordersForFeedback.push(shuffled[i]);
    }
    
    const feedbacks = [];
    // Định nghĩa lại vipCustomers và badCustomers để dùng trong feedbacks
    const vipCustomersForFeedback = customersByType['VIP'] || [];
    const badCustomersForFeedback = customersByType['BAD'] || [];
    const vipCustomerIds = vipCustomersForFeedback.map(c => c._id.toString());
    const badCustomerIds = badCustomersForFeedback.map(c => c._id.toString());

    // Comments mẫu theo rating
    const commentsByRating = {
      5: [
        "Đồ ăn rất ngon, phục vụ nhanh!",
        "Món bò bít tết tuyệt vời, sẽ quay lại!",
        "Lẩu hải sản tươi ngon, gia đình rất thích.",
        "Cá hồi áp chảo tuyệt vời, sẽ quay lại.",
        "Đầu bếp nấu rất ngon, sẽ giới thiệu bạn bè.",
        "Trải nghiệm tuyệt vời, nhà hàng đáng giá 5 sao!",
      ],
      4: [
        "Không gian đẹp, hơi ồn một chút.",
        "Nhân viên thân thiện, không gian sạch sẽ.",
        "Pizza ngon, giá hợp lý.",
        "Phở bò đậm đà, nước dùng ngon.",
        "Salad tươi ngon, rau củ đa dạng.",
        "Gà nướng mật ong thơm ngon.",
        "Tráng miệng ngon, kem vani mát lạnh.",
      ],
      3: [
        "Đồ ăn ổn nhưng giá hơi cao.",
        "Đồ uống ngon nhưng hơi ít.",
        "Không gian đẹp nhưng hơi chật.",
        "Giá cả hợp lý nhưng khẩu phần hơi nhỏ.",
        "Tổng thể ổn, không có gì đặc biệt.",
      ],
      2: [
        "Chờ đợi quá lâu, đồ ăn không nóng.",
        "Phục vụ chậm, đồ ăn không đúng yêu cầu.",
        "Chất lượng không như mong đợi.",
        "Không gian hơi chật, phục vụ chậm.",
      ],
      1: [
        "Rất thất vọng, sẽ không quay lại.",
        "Đồ ăn không ngon, phục vụ kém.",
        "Giá cao nhưng chất lượng không tương xứng.",
        "Trải nghiệm tồi tệ nhất.",
      ],
    };
    
    for (const order of ordersForFeedback) {
      if (!order.userId) continue; // Skip nếu không có userId
      
      const customerId = order.userId._id.toString();
      let rating;
      let commentPool;
      
      // Xác định rating dựa trên loại customer
      if (vipCustomerIds.includes(customerId)) {
        // Customer VIP: 4-5 sao
        rating = Math.random() > 0.3 ? 5 : 4; // 70% 5 sao, 30% 4 sao
        commentPool = commentsByRating[rating];
      } else if (badCustomerIds.includes(customerId)) {
        // Customer xấu: 1-2 sao
        rating = Math.random() > 0.5 ? 1 : 2; // 50% mỗi loại
        commentPool = commentsByRating[rating];
      } else {
        // Customer bình thường: 3-4 sao ngẫu nhiên
        rating = Math.random() > 0.5 ? 3 : 4;
        commentPool = commentsByRating[rating];
      }
      
      const comment = commentPool[Math.floor(Math.random() * commentPool.length)];
      
      // Lấy order items để tìm waiters và chefs đã phục vụ
      const orderItems = await OrderItem.find({ orderId: order._id })
        .populate('servedBy', '_id name')
        .populate('assignedChef', '_id name');
      
      // Tìm tất cả waiters đã phục vụ (từ order items và combo items)
      const waiterIds = new Set();
      const chefIds = new Set();
      
      for (const item of orderItems) {
        // Lấy waiter từ OrderItem chính (chỉ khi status là "served")
        if (item.servedBy && item.status === "served") {
          const waiterId = item.servedBy._id ? item.servedBy._id.toString() : item.servedBy.toString();
          waiterIds.add(waiterId);
        }
        
        // Lấy chef từ OrderItem chính (chỉ khi có assignedChef)
        if (item.assignedChef) {
          const chefId = item.assignedChef._id ? item.assignedChef._id.toString() : item.assignedChef.toString();
          chefIds.add(chefId);
        }
        
        // Lấy waiter và chef từ comboItems (comboItems không được populate, nên cần fetch từ DB nếu cần)
        if (item.comboItems && Array.isArray(item.comboItems)) {
          for (const comboItem of item.comboItems) {
            // Chỉ lấy waiter/chef từ comboItems có status "served"
            if (comboItem.status === "served") {
              if (comboItem.servedBy) {
                // comboItem.servedBy là ObjectId (string hoặc ObjectId)
                const waiterId = comboItem.servedBy.toString ? comboItem.servedBy.toString() : comboItem.servedBy;
                waiterIds.add(waiterId);
              }
              if (comboItem.assignedChef) {
                // comboItem.assignedChef là ObjectId (string hoặc ObjectId)
                const chefId = comboItem.assignedChef.toString ? comboItem.assignedChef.toString() : comboItem.assignedChef;
                chefIds.add(chefId);
              }
            }
          }
        }
      }
      
      // Tạo waiterRating và chefRating (70-80% feedback có rating cho waiter/chef)
      // waiterRating và chefRating cũng phản ánh customer type (VIP cao, BAD thấp)
      let waiterRating = null;
      let chefRating = null;
      
      if (waiterIds.size > 0 && Math.random() > 0.2) { // 80% có waiterRating
        // waiterRating thường gần với rating tổng thể, nhưng có thể chênh lệch 1 sao
        // Đảm bảo waiterRating phản ánh customer type: VIP cao, BAD thấp
        let baseWaiterRating = rating;
        
        // Điều chỉnh baseWaiterRating dựa trên customer type
        if (vipCustomerIds.includes(customerId)) {
          // VIP customers: waiterRating thường cao hơn hoặc bằng rating tổng thể
          baseWaiterRating = Math.max(rating, rating + (Math.random() > 0.7 ? 1 : 0));
        } else if (badCustomerIds.includes(customerId)) {
          // BAD customers: waiterRating thường thấp hơn hoặc bằng rating tổng thể
          baseWaiterRating = Math.min(rating, rating - (Math.random() > 0.7 ? 1 : 0));
        }
        
        const variation = Math.random() > 0.5 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        waiterRating = Math.max(1, Math.min(5, baseWaiterRating + variation));
      }
      
      if (chefIds.size > 0 && Math.random() > 0.2) { // 80% có chefRating
        // chefRating thường gần với rating tổng thể, nhưng có thể chênh lệch 1 sao
        // Đảm bảo chefRating phản ánh customer type: VIP cao, BAD thấp
        let baseChefRating = rating;
        
        // Điều chỉnh baseChefRating dựa trên customer type
        if (vipCustomerIds.includes(customerId)) {
          // VIP customers: chefRating thường cao hơn hoặc bằng rating tổng thể
          baseChefRating = Math.max(rating, rating + (Math.random() > 0.7 ? 1 : 0));
        } else if (badCustomerIds.includes(customerId)) {
          // BAD customers: chefRating thường thấp hơn hoặc bằng rating tổng thể
          baseChefRating = Math.min(rating, rating - (Math.random() > 0.7 ? 1 : 0));
        }
        
        const variation = Math.random() > 0.5 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        chefRating = Math.max(1, Math.min(5, baseChefRating + variation));
      }
      
      feedbacks.push({
        orderId: order._id,
        userId: order.userId._id,
        rating: rating,
        comment: comment,
        waiterRating: waiterRating || undefined,
        chefRating: chefRating || undefined,
      });
    }
    
    await Feedback.insertMany(feedbacks);
    console.log(`✅ Đã tạo ${feedbacks.length} feedbacks từ ${ordersForFeedback.length} paid orders.`);

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

    // ===============================
    // 📊 Kiểm tra và verify tồn kho
    // ===============================
    console.log("\n📊 Kiểm tra tồn kho sau khi seed...");
    const allIngredients = await Ingredient.find();
    const allPurchaseOrders = await PurchaseOrder.find();
    const allOrderItems = await OrderItem.find();
    
    for (const ingredient of allIngredients) {
      // Tính tổng quantity nhập từ Purchase Orders
      const totalPurchased = allPurchaseOrders
        .filter(po => po.ingredientId.toString() === ingredient._id.toString())
        .reduce((sum, po) => sum + po.quantity, 0);
      
      // Tính tổng quantity đã dùng từ OrderItems (từ ingredientUsage)
      let totalUsed = 0;
      for (const orderItem of allOrderItems) {
        if (orderItem.ingredientUsage && Array.isArray(orderItem.ingredientUsage)) {
          const usedForThisIngredient = orderItem.ingredientUsage
            .filter(usage => usage.ingredientId && usage.ingredientId.toString() === ingredient._id.toString())
            .reduce((sum, usage) => sum + (usage.quantity || 0), 0);
          totalUsed += usedForThisIngredient;
        }
      }
      
      // Tính stockQuantity lý thuyết
      const expectedStock = totalPurchased - totalUsed;
      
      // So sánh với stockQuantity thực tế
      const actualStock = ingredient.stockQuantity || 0;
      const difference = Math.abs(expectedStock - actualStock);
      
      if (difference > 0.01) {
        console.warn(
          `⚠️ ${ingredient.name}: ` +
          `Nhập=${totalPurchased}, Đã dùng=${totalUsed}, ` +
          `Lý thuyết=${expectedStock.toFixed(2)}, Thực tế=${actualStock.toFixed(2)}, ` +
          `Chênh lệch=${difference.toFixed(2)}`
        );
      } else {
        console.log(
          `✅ ${ingredient.name}: ` +
          `Nhập=${totalPurchased}, Đã dùng=${totalUsed}, ` +
          `Tồn kho=${actualStock.toFixed(2)} (khớp)`
        );
      }
    }

    console.log("✅ SEED DATABASE THÀNH CÔNG!");
  } catch (error) {
    console.error("❌ Lỗi khi seed database:", error);
    throw error; // Re-throw để caller biết có lỗi
  }
};

module.exports = seedDatabase;