const Order = require("../models/Order");
const Payment = require("../models/Payment");
const { groupSplitOrderItemsForCustomer, populateOrderItemDetails } = require("../utils/customerHelpers");

function calculateWaitTime(createdAt) {
  if (!createdAt) return 0;
  const start = new Date(createdAt).getTime();
  if (Number.isNaN(start)) return 0;
  const diffMs = Date.now() - start;
  return diffMs > 0 ? Math.round(diffMs / 60000) : 0;
}

function buildOrderNumber(order) {
  if (!order) return "ĐH-UNKNOWN";
  if (order.orderNumber) return String(order.orderNumber).trim();
  if (order.code) return order.code;
  if (order._id) return order._id.toString();
  return "ĐH-UNKNOWN";
}

function formatOrder(order) {
  if (!order) return null;

  // orderItems đã được populate và group trong getPreparingOrders
  // Chỉ cần lọc bỏ các items không hợp lệ và format
  let orderItemsToFormat = order.orderItems || [];
  
  if (orderItemsToFormat.length > 0) {
    // Lọc bỏ các items không hợp lệ (buffer, ObjectId chưa populate)
    orderItemsToFormat = orderItemsToFormat.filter(item => {
      if (!item) return false;
      if (Buffer.isBuffer(item)) return false;
      if (typeof item === 'string') return false;
      if (typeof item !== 'object') return false;
      // Kiểm tra xem có phải là ObjectId không
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(item) && item.constructor?.name === 'ObjectId') {
        return false; // Skip pure ObjectId
      }
      return true;
    });
  }

  const items = orderItemsToFormat.map((item) => {
    const price = item.price ?? 0;
    return {
      id: item._id ? item._id.toString() : undefined,
      name: item.itemName || item.itemId?.name || "Món ăn",
      quantity: item.quantity ?? 0,
      price,
      note: item.note || "",
      status: item.status,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

  let tableNumber = "Mang đi";
  if (order.tableId) {
    if (typeof order.tableId === "object" && order.tableId !== null) {
      const num = order.tableId.tableNumber ?? order.tableId.number;
      tableNumber = num ? `Bàn ${num}` : "Chưa có số bàn";
    } else if (typeof order.tableId === "string") {
      tableNumber = `Bàn ${order.tableId}`;
    }
  }

  return {
    id: order._id ? order._id.toString() : undefined,
    orderNumber: buildOrderNumber(order),
    tableNumber,
    items,
    totalAmount: order.totalAmount ?? subtotal,
    remainingAmount: order.remainingAmount ?? (order.totalAmount ?? subtotal), // Số tiền còn lại cần thanh toán
    totalPaid: order.totalPaid ?? 0, // Tổng tiền đã thanh toán (bao gồm tiền cọc nếu có)
    orderTime: order.createdAt,
    waitTime: calculateWaitTime(order.createdAt),
    status: order.status,
  };
}

function formatOrders(orders = []) {
  return orders.map(formatOrder).filter(Boolean);
}

// Export formatOrder để có thể sử dụng ở file khác
exports.formatOrder = formatOrder;

exports.getPreparingOrders = async (_req, res) => {
  try {
    const orders = await Order.find({ status: { $in: ["confirmed", "preparing", "served"] } })
      .sort({ createdAt: 1 })
      .populate("tableId", "tableNumber");

    // Import payment helpers
    const { calculateRemainingAmount, calculateTotalPaid, ensurePaymentIdsSync } = require("../utils/paymentHelpers");

    // Populate orderItems một cách rõ ràng và đảm bảo có đầy đủ field
    const OrderItem = require("../models/OrderItem");
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      
      // Đảm bảo paymentIds được sync
      await ensurePaymentIdsSync(order);
      
      // Tính remainingAmount cho order này
      const totalPaid = await calculateTotalPaid(order._id);
      const remainingAmount = Math.max(0, order.totalAmount - totalPaid);
      
      if (order.orderItems && order.orderItems.length > 0) {
        // Lấy OrderItem IDs (có thể là ObjectIds hoặc strings)
        const orderItemIds = order.orderItems.map(item => {
          if (typeof item === 'object' && item._id) {
            return item._id;
          }
          return item;
        }).filter(id => id);
        
        // Fetch OrderItems với đầy đủ field
        const populatedOrderItems = await OrderItem.find({ _id: { $in: orderItemIds } })
          .populate({ path: 'itemId', select: 'name' });
        
        // Debug: log để kiểm tra
        if (populatedOrderItems.length > 0 && populatedOrderItems.length !== orderItemIds.length) {
          console.log(`⚠️ Fetched ${populatedOrderItems.length} OrderItems but expected ${orderItemIds.length}`);
        }
        
        // Populate orderItemDetails
        await populateOrderItemDetails(populatedOrderItems);
        
        // Group orderItems - đảm bảo populatedOrderItems là array hợp lệ
        if (populatedOrderItems && populatedOrderItems.length > 0) {
          const groupedItems = groupSplitOrderItemsForCustomer(populatedOrderItems);
          // Convert order sang plain object và gán orderItems
          const orderPlain = order.toObject ? order.toObject({ getters: true }) : { ...order };
          orderPlain.orderItems = groupedItems;
          // Thêm remainingAmount và totalPaid
          orderPlain.remainingAmount = remainingAmount;
          orderPlain.totalPaid = totalPaid;
          // Thay thế order trong array bằng plain object
          orders[i] = orderPlain;
        } else {
          const orderPlain = order.toObject ? order.toObject({ getters: true }) : { ...order };
          orderPlain.orderItems = [];
          orderPlain.remainingAmount = remainingAmount;
          orderPlain.totalPaid = totalPaid;
          orders[i] = orderPlain;
        }
      } else {
        // Convert order sang plain object ngay cả khi không có orderItems
        const orderPlain = order.toObject ? order.toObject({ getters: true }) : { ...order };
        orderPlain.remainingAmount = remainingAmount;
        orderPlain.totalPaid = totalPaid;
        orders[i] = orderPlain;
      }
    }

    return res.status(200).json({
      message: "Lấy danh sách đơn đang chuẩn bị thành công",
      data: formatOrders(orders),
    });
  } catch (error) {
    console.error("[cashier] getPreparingOrders error:", error);
    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách đơn đang chuẩn bị",
      error: error.message,
    });
  }
};

exports.completeOrderPayment = async (req, res) => {
  const { orderId } = req.params;
  const { paymentMethod = "cash" } = req.body || {};

  try {
    const order = await Order.findById(orderId)
      .populate({
        path: "orderItems",
        select: "price quantity itemName itemId", // ✅ Thêm itemName và itemId để có thể tính lại totalAmount
      })
      .populate("tableId") // Populate tableId để có thể cập nhật trạng thái bàn
      .populate("tableIds"); // Populate tableIds để hỗ trợ nhiều bàn
    
    // ✅ Đảm bảo orderItems có đầy đủ thông tin price
    if (order.orderItems && order.orderItems.length > 0) {
      const OrderItem = require("../models/OrderItem");
      const { populateOrderItemDetails } = require("../utils/customerHelpers");
      
      // Populate orderItemDetails để có đầy đủ thông tin price
      await populateOrderItemDetails(order.orderItems);
      
      console.log(`🔍 [completeOrderPayment] OrderItems sau khi populate:`, order.orderItems.map(item => ({
        _id: item._id,
        price: item.price,
        quantity: item.quantity,
        itemName: item.itemName
      })));
    }

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (order.status === "paid") {
      return res.status(400).json({ message: "Đơn hàng đã được thanh toán trước đó" });
    }

    if (!["confirmed", "preparing", "served"].includes(order.status)) {
      return res.status(400).json({
        message: "Chỉ có thể thanh toán các đơn đang ở trạng thái chuẩn bị hoặc đã phục vụ",
      });
    }

    // ✅ Đảm bảo order có totalAmount - tính lại từ orderItems nếu thiếu
    if (!order.totalAmount || order.totalAmount <= 0 || isNaN(order.totalAmount)) {
      console.warn(`⚠️ [completeOrderPayment] Order ${orderId} không có totalAmount hoặc totalAmount không hợp lệ (${order.totalAmount}), tính lại từ orderItems`);
      
      if (order.orderItems && order.orderItems.length > 0) {
        // Tính tổng từ orderItems
        const calculatedTotal = order.orderItems.reduce((sum, item) => {
          const price = item.price || 0;
          const quantity = item.quantity || 0;
          return sum + (price * quantity);
        }, 0);
        
        // Cập nhật order.totalAmount
        order.totalAmount = calculatedTotal;
        
        // Cập nhật vào database
        await Order.findByIdAndUpdate(orderId, { totalAmount: calculatedTotal });
        console.log(`✅ [completeOrderPayment] Đã tính lại và cập nhật totalAmount=${calculatedTotal} cho order ${orderId}`);
      } else {
        console.error(`❌ [completeOrderPayment] Order ${orderId} không có orderItems để tính totalAmount`);
        return res.status(400).json({
          message: "Đơn hàng không có thông tin giá trị. Vui lòng liên hệ quản trị viên.",
          error: "Order missing totalAmount and orderItems"
        });
      }
    }

    console.log(`💰 [completeOrderPayment] Order ${orderId} có totalAmount=${order.totalAmount}`);

    // Tính số tiền còn lại cần thanh toán (có thể đã có tiền cọc)
    const { calculateRemainingAmount, calculateTotalPaid, addPaymentToOrder, ensurePaymentIdsSync } = require("../utils/paymentHelpers");
    
    // Đảm bảo paymentIds được sync
    await ensurePaymentIdsSync(order);
    
    // Tính remainingAmount (nếu có tiền cọc thì chỉ thanh toán số còn lại)
    const remainingAmount = await calculateRemainingAmount(order._id, order.totalAmount);
    
    // ✅ Đảm bảo finalAmount luôn > 0 và hợp lệ
    // Nếu remainingAmount <= 0 hoặc không hợp lệ, dùng totalAmount
    let finalAmount = remainingAmount;
    if (!finalAmount || finalAmount <= 0 || isNaN(finalAmount)) {
      console.warn(`⚠️ [completeOrderPayment] remainingAmount không hợp lệ (${remainingAmount}), dùng totalAmount: ${order.totalAmount}`);
      finalAmount = order.totalAmount;
    }
    
    // ✅ Đảm bảo finalAmount không vượt quá totalAmount
    if (finalAmount > order.totalAmount) {
      console.warn(`⚠️ [completeOrderPayment] finalAmount (${finalAmount}) > totalAmount (${order.totalAmount}), điều chỉnh về totalAmount`);
      finalAmount = order.totalAmount;
    }

    // ✅ Đảm bảo finalAmount > 0
    if (finalAmount <= 0) {
      console.error(`❌ [completeOrderPayment] finalAmount không hợp lệ: ${finalAmount}, remainingAmount: ${remainingAmount}, totalAmount: ${order.totalAmount}`);
      return res.status(400).json({
        message: "Số tiền thanh toán không hợp lệ",
        error: `finalAmount: ${finalAmount}, remainingAmount: ${remainingAmount}, totalAmount: ${order.totalAmount}`
      });
    }

    console.log(`💳 [completeOrderPayment] Tạo payment với amountPaid=${finalAmount}, remainingAmount=${remainingAmount}, totalAmount=${order.totalAmount}`);

    // Tạo Payment mới cho số tiền còn lại
    const payment = new Payment({
      orderId: order._id,
      paymentMethod,
      status: "paid",
      amountPaid: finalAmount, // ✅ Đảm bảo amountPaid được set
      payTime: new Date(),
      cashierId: req.user.id,
      isDeposit: false, // Đánh dấu đây là thanh toán cuối (không phải cọc)
    });
    
    // ✅ Log trước khi save
    console.log(`💳 [completeOrderPayment] Payment trước khi save:`, {
      orderId: payment.orderId,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      amountPaid: payment.amountPaid,
      payTime: payment.payTime,
      cashierId: payment.cashierId,
      isDeposit: payment.isDeposit
    });
    
    await payment.save();
    
    // ✅ Verify sau khi save
    const savedPayment = await Payment.findById(payment._id);
    if (!savedPayment || !savedPayment.amountPaid || savedPayment.amountPaid <= 0) {
      console.error(`❌ [completeOrderPayment] Payment sau khi save không có amountPaid hoặc amountPaid <= 0:`, {
        _id: savedPayment?._id,
        amountPaid: savedPayment?.amountPaid,
        status: savedPayment?.status
      });
      // Thử cập nhật lại amountPaid
      await Payment.findByIdAndUpdate(payment._id, { amountPaid: finalAmount }, { new: true });
      console.log(`🔄 [completeOrderPayment] Đã cập nhật lại amountPaid=${finalAmount} cho payment ${payment._id}`);
    } else {
      console.log(`✅ [completeOrderPayment] Payment đã được save thành công với amountPaid=${savedPayment.amountPaid}`);
    }

    // Thêm payment vào order.paymentIds
    await addPaymentToOrder(order._id, payment);

    // ✅ Fetch lại order để đảm bảo có paymentIds mới nhất
    const orderAfterPayment = await Order.findById(orderId).populate("paymentIds");
    
    // Tính totalPaid từ tất cả payments có status "paid"
    const totalPaid = await calculateTotalPaid(order._id);
    
    // ✅ Tính toán chi tiết để debug
    const paidPayments = orderAfterPayment?.paymentIds?.filter(p => 
      p && typeof p === 'object' && p.status === 'paid' && (p.amountPaid || 0) > 0
    ) || [];
    
    const unpaidPayments = orderAfterPayment?.paymentIds?.filter(p => 
      p && typeof p === 'object' && p.status === 'unpaid'
    ) || [];
    
    console.log(`🔍 [completeOrderPayment] Order ${orderId} sau khi thêm payment:`, {
      totalAmount: order.totalAmount,
      totalPaid: totalPaid,
      remainingAmount: order.totalAmount - totalPaid,
      paidPaymentsCount: paidPayments.length,
      paidPayments: paidPayments.map(p => ({
        _id: p?._id,
        status: p?.status,
        amountPaid: p?.amountPaid,
        isDeposit: p?.isDeposit
      })),
      unpaidPaymentsCount: unpaidPayments.length,
      unpaidPayments: unpaidPayments.map(p => ({
        _id: p?._id,
        status: p?.status,
        amountPaid: p?.amountPaid
      })),
      newPayment: {
        _id: payment._id,
        status: payment.status,
        amountPaid: payment.amountPaid
      }
    });
    
    // ✅ Sử dụng tolerance nhỏ để tránh vấn đề floating point
    const tolerance = 0.01; // 1 cent tolerance
    const shouldUpdateToPaid = totalPaid >= order.totalAmount - tolerance;
    
    console.log(`💰 [completeOrderPayment] So sánh: totalPaid=${totalPaid} >= totalAmount=${order.totalAmount} - tolerance=${tolerance} = ${shouldUpdateToPaid}`);
    
    // ✅ LUÔN cập nhật order status sang "paid" nếu đã thanh toán đủ
    if (shouldUpdateToPaid) {
      try {
        // ✅ Sử dụng findByIdAndUpdate để đảm bảo cập nhật trực tiếp vào database
        const updatedOrder = await Order.findByIdAndUpdate(
          orderId,
          { status: "paid" },
          { new: true }
        );
        
        if (!updatedOrder) {
          console.error(`❌ [completeOrderPayment] Không thể cập nhật order ${orderId} sang status "paid" - Order không tồn tại`);
        } else {
          console.log(`✅ [completeOrderPayment] Đã cập nhật order ${orderId} sang status "paid". Order status hiện tại: ${updatedOrder.status}`);
          // Cập nhật biến order để sử dụng ở phần sau
          order.status = "paid";
          
          // ✅ Verify lại order status đã được cập nhật
          const verifyOrder = await Order.findById(orderId);
          if (verifyOrder.status !== "paid") {
            console.error(`❌ [completeOrderPayment] VERIFY FAILED: Order ${orderId} status vẫn là "${verifyOrder.status}" sau khi cập nhật!`);
            // Thử cập nhật lại một lần nữa
            await Order.findByIdAndUpdate(orderId, { status: "paid" }, { new: true });
            console.log(`🔄 [completeOrderPayment] Đã thử cập nhật lại order ${orderId} sang status "paid"`);
          } else {
            console.log(`✅ [completeOrderPayment] VERIFY SUCCESS: Order ${orderId} status đã là "paid"`);
          }
        }
      } catch (error) {
        console.error(`❌ [completeOrderPayment] Lỗi khi cập nhật order status:`, error);
        throw error; // Re-throw để response trả về lỗi
      }
      
      // ✅ KHÔNG cập nhật payment cũ (paymentId) nữa vì đã có payment mới được tạo
      // Payment cũ (unpaid) nên được giữ lại để lưu lịch sử, không cần cập nhật
      // Payment mới đã được tạo với status "paid" và amountPaid đúng
      console.log(`ℹ️ [completeOrderPayment] Bỏ qua cập nhật paymentId (payment cũ) vì đã có payment mới được tạo với _id=${payment._id}`);
      
      // Cập nhật trạng thái bàn: xóa order khỏi table.orderNow và đổi status về "available" nếu không còn order nào
      // Xử lý cả tableId và tableIds (merged tables)
      const { cleanupTablesForOrder } = require("../utils/customerHelpers");
      await cleanupTablesForOrder(order, orderId);
      
      // Tích điểm cho khách hàng khi đơn chuyển sang paid
      if (order.userId) {
        try {
          const { addPointsToCustomer } = require("../utils/loyaltyHelpers");
          const { pointsEarned, newTotalPoints } = await addPointsToCustomer(
            order.userId,
            order.totalAmount
          );
          
          if (pointsEarned > 0) {
            console.log(`✅ Tích ${pointsEarned} điểm cho khách hàng ${order.userId}. Tổng điểm: ${newTotalPoints}`);
          }
        } catch (error) {
          console.error("❌ Lỗi khi tích điểm cho khách hàng:", error);
          // Không throw error để không làm gián đoạn quá trình thanh toán
        }
      }
    }

    const populatedOrder = await Order.findById(orderId)
      .populate("tableId", "tableNumber")
      .populate({
        path: "orderItems",
        select: "itemName itemId quantity price note status",
        populate: { path: "itemId", select: "name" },
      });

    // Tính lại remainingAmount và totalPaid sau khi thanh toán
    const newTotalPaid = await calculateTotalPaid(order._id);
    const newRemainingAmount = Math.max(0, order.totalAmount - newTotalPaid);
    
    // Cập nhật vào populatedOrder để formatOrder có thể sử dụng
    populatedOrder.remainingAmount = newRemainingAmount;
    populatedOrder.totalPaid = newTotalPaid;

    // Populate orderItemDetails và group orderItems
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await populateOrderItemDetails(populatedOrder.orderItems);
      populatedOrder.orderItems = groupSplitOrderItemsForCustomer(populatedOrder.orderItems);
    }

    // Lấy webSocketService từ app
    const webSocketService = req.app.get("webSocketService");

    // Broadcast cho cashiers
    if (webSocketService?.broadcastToAllCashiers) {
      const payload = formatOrder(populatedOrder);
      if (payload) {
        webSocketService.broadcastToAllCashiers("cashier.orders.paid", payload);
        console.log(`✅ [completeOrderPayment] Broadcasted cashier.orders.paid for order ${orderId}`);
      }
    }

    // Broadcast cho customer khi order chuyển sang paid
    if (webSocketService && order.status === "paid") {
      try {
        // Populate thêm paymentId để customer có thông tin thanh toán đầy đủ
        const customerOrder = await Order.findById(orderId)
          .populate({
            path: "orderItems",
            populate: {
              path: "assignedChef",
              select: "name username"
            }
          })
          .populate("tableId")
          .populate("paymentId")
          .populate("paymentIds");

        // Populate orderItemDetails cho customer
        if (customerOrder.orderItems && customerOrder.orderItems.length > 0) {
          await populateOrderItemDetails(customerOrder.orderItems);
          customerOrder.orderItems = groupSplitOrderItemsForCustomer(customerOrder.orderItems);
        }

        // Convert sang plain object trước khi broadcast
        const orderToBroadcast = customerOrder.toObject ? customerOrder.toObject({ getters: true, flattenMaps: true }) : { ...customerOrder };
        
        // Broadcast order:updated cho customer
        webSocketService.broadcastToOrder(orderId, "order:updated", orderToBroadcast);
        console.log(`✅ [completeOrderPayment] Broadcasted order:updated to customer for order ${orderId} (status: paid)`);
      } catch (error) {
        console.error(`❌ [completeOrderPayment] Error broadcasting to customer:`, error);
        // Fallback: broadcast populatedOrder nếu có lỗi
        try {
          const orderToBroadcast = populatedOrder.toObject ? populatedOrder.toObject({ getters: true, flattenMaps: true }) : { ...populatedOrder };
          webSocketService.broadcastToOrder(orderId, "order:updated", orderToBroadcast);
          console.log(`✅ [completeOrderPayment] Fallback broadcast sent for order ${orderId}`);
        } catch (fallbackError) {
          console.error(`❌ [completeOrderPayment] Fallback broadcast also failed:`, fallbackError);
        }
      }
    }

    return res.status(200).json({
      message: "Thanh toán đơn hàng thành công",
      data: {
        orderId: order._id,
        amountPaid: finalAmount,
        remainingAmount: remainingAmount,
        totalAmount: order.totalAmount,
        paymentMethod,
      },
    });
  } catch (error) {
    console.error("[cashier] completeOrderPayment error:", error);
    return res.status(500).json({
      message: "Lỗi server khi thanh toán đơn",
      error: error.message,
    });
  }
};

// ✅ Lấy lịch sử thanh toán của cashier hiện tại
exports.getPaymentHistory = async (req, res) => {
  try {
    const cashierId = req.user.id; // Lấy từ auth middleware
    const { fromDate, toDate } = req.query;
    
    console.log(`🔍 [getPaymentHistory] Fetching payments cho cashierId: ${cashierId}, fromDate: ${fromDate}, toDate: ${toDate}`);
    
    // Build filter
    const filter = {
      cashierId: cashierId,
      status: "paid",
      isDeposit: false, // Chỉ lấy thanh toán cuối, không phải cọc
    };
    
    // Filter theo date range nếu có
    // ✅ Nếu không có fromDate/toDate, vẫn trả về tất cả payments (không filter date)
    if (fromDate || toDate) {
      filter.payTime = {};
      if (fromDate) {
        const fromDateObj = new Date(fromDate);
        if (!isNaN(fromDateObj.getTime())) {
          filter.payTime.$gte = fromDateObj;
        }
      }
      if (toDate) {
        const toDateObj = new Date(toDate);
        if (!isNaN(toDateObj.getTime())) {
          const toDateEnd = new Date(toDateObj);
          toDateEnd.setHours(23, 59, 59, 999);
          filter.payTime.$lte = toDateEnd;
        }
      }
    }
    
    console.log(`🔍 [getPaymentHistory] Filter:`, JSON.stringify(filter, null, 2));
    
    // Fetch payments
    const payments = await Payment.find(filter)
      .populate({
        path: "orderId",
        select: "orderNumber code totalAmount createdAt updatedAt",
      })
      .sort({ payTime: -1, createdAt: -1 });
    
    console.log(`✅ [getPaymentHistory] Tìm thấy ${payments.length} payments cho cashierId: ${cashierId}`);
    
    // Convert sang format cho frontend
    const history = payments.map(payment => {
      const order = payment.orderId;
      const methodMap = {
        cash: "Tiền mặt",
        card: "Thẻ",
        momo: "QR Code",
        zaloPay: "QR Code",
        qr: "QR Code",
      };
      
      return {
        id: payment._id.toString(),
        orderId: order?._id?.toString() || payment.orderId?.toString() || payment.orderId,
        orderNumber: order?.orderNumber || order?.code || `ĐH-${order?._id || payment.orderId}`,
        amount: payment.amountPaid || 0,
        method: methodMap[payment.paymentMethod] || "Tiền mặt",
        time: payment.payTime || payment.createdAt || new Date().toISOString(),
      };
    });
    
    return res.status(200).json({
      success: true,
      message: "Lấy lịch sử thanh toán thành công",
      data: history,
    });
  } catch (error) {
    console.error("[cashier] getPaymentHistory error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy lịch sử thanh toán",
      error: error.message,
    });
  }
};