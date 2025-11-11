/**
 * Migration script: Chuyển paymentId → paymentIds
 * 
 * Chạy script này một lần để migrate dữ liệu cũ:
 * node Backend/scripts/migratePaymentIds.js
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const Order = require("../models/Order");
const Payment = require("../models/Payment");

async function migratePaymentIds() {
  try {
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/restaurant", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Đã kết nối database");
    console.log("🔄 Bắt đầu migration paymentId → paymentIds...\n");

    // Tìm tất cả orders có paymentId nhưng chưa có paymentIds hoặc paymentIds rỗng
    const orders = await Order.find({
      $or: [
        { paymentId: { $exists: true, $ne: null } },
        { paymentIds: { $exists: false } },
        { paymentIds: { $size: 0 } }
      ]
    });

    console.log(`📊 Tìm thấy ${orders.length} orders cần migrate\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const order of orders) {
      try {
        // Nếu có paymentId nhưng paymentIds rỗng hoặc không có
        if (order.paymentId && (!order.paymentIds || order.paymentIds.length === 0)) {
          // Kiểm tra payment có tồn tại không
          const payment = await Payment.findById(order.paymentId);
          if (payment) {
            order.paymentIds = [order.paymentId];
            await order.save();
            migratedCount++;
            console.log(`✅ Order ${order._id}: Đã migrate paymentId → paymentIds[0]`);
          } else {
            console.warn(`⚠️ Order ${order._id}: paymentId không tồn tại, bỏ qua`);
            skippedCount++;
          }
        } 
        // Nếu có paymentIds nhưng paymentId null → set paymentId = paymentIds[0]
        else if (order.paymentIds && order.paymentIds.length > 0 && !order.paymentId) {
          order.paymentId = order.paymentIds[0];
          await order.save();
          migratedCount++;
          console.log(`✅ Order ${order._id}: Đã sync paymentIds[0] → paymentId`);
        }
        // Nếu cả hai đều có → không cần migrate
        else {
          skippedCount++;
          console.log(`⏭️ Order ${order._id}: Đã có cả paymentId và paymentIds, bỏ qua`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Lỗi khi migrate order ${order._id}:`, error.message);
      }
    }

    console.log("\n📈 Kết quả migration:");
    console.log(`   ✅ Đã migrate: ${migratedCount} orders`);
    console.log(`   ⏭️ Đã bỏ qua: ${skippedCount} orders`);
    console.log(`   ❌ Lỗi: ${errorCount} orders`);

    // Đóng kết nối
    await mongoose.connection.close();
    console.log("\n✅ Migration hoàn tất!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi migration:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Chạy migration
migratePaymentIds();


 * Migration script: Chuyển paymentId → paymentIds
 * 
 * Chạy script này một lần để migrate dữ liệu cũ:
 * node Backend/scripts/migratePaymentIds.js
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const Order = require("../models/Order");
const Payment = require("../models/Payment");

async function migratePaymentIds() {
  try {
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/restaurant", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Đã kết nối database");
    console.log("🔄 Bắt đầu migration paymentId → paymentIds...\n");

    // Tìm tất cả orders có paymentId nhưng chưa có paymentIds hoặc paymentIds rỗng
    const orders = await Order.find({
      $or: [
        { paymentId: { $exists: true, $ne: null } },
        { paymentIds: { $exists: false } },
        { paymentIds: { $size: 0 } }
      ]
    });

    console.log(`📊 Tìm thấy ${orders.length} orders cần migrate\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const order of orders) {
      try {
        // Nếu có paymentId nhưng paymentIds rỗng hoặc không có
        if (order.paymentId && (!order.paymentIds || order.paymentIds.length === 0)) {
          // Kiểm tra payment có tồn tại không
          const payment = await Payment.findById(order.paymentId);
          if (payment) {
            order.paymentIds = [order.paymentId];
            await order.save();
            migratedCount++;
            console.log(`✅ Order ${order._id}: Đã migrate paymentId → paymentIds[0]`);
          } else {
            console.warn(`⚠️ Order ${order._id}: paymentId không tồn tại, bỏ qua`);
            skippedCount++;
          }
        } 
        // Nếu có paymentIds nhưng paymentId null → set paymentId = paymentIds[0]
        else if (order.paymentIds && order.paymentIds.length > 0 && !order.paymentId) {
          order.paymentId = order.paymentIds[0];
          await order.save();
          migratedCount++;
          console.log(`✅ Order ${order._id}: Đã sync paymentIds[0] → paymentId`);
        }
        // Nếu cả hai đều có → không cần migrate
        else {
          skippedCount++;
          console.log(`⏭️ Order ${order._id}: Đã có cả paymentId và paymentIds, bỏ qua`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Lỗi khi migrate order ${order._id}:`, error.message);
      }
    }

    console.log("\n📈 Kết quả migration:");
    console.log(`   ✅ Đã migrate: ${migratedCount} orders`);
    console.log(`   ⏭️ Đã bỏ qua: ${skippedCount} orders`);
    console.log(`   ❌ Lỗi: ${errorCount} orders`);

    // Đóng kết nối
    await mongoose.connection.close();
    console.log("\n✅ Migration hoàn tất!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi migration:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Chạy migration
migratePaymentIds();

