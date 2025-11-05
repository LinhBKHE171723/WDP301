const Order = require("../../models/Order");
const User = require("../../models/User");
const Table = require("../../models/Table");
const Payment = require("../../models/Payment");
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const { success, error } = require("../../utils/response");
const { classifyCustomer } = require("../../utils/customerClassification");
const { addPaymentToOrder, ensurePaymentIdsSync } = require("../../utils/paymentHelpers");

// Helper function: Tự động fill itemName từ itemId nếu thiếu
const fillItemNameForOrderItems = async (orderItems) => {
  if (!orderItems || orderItems.length === 0) return;
  
  const Item = require("../../models/Item");
  const Menu = require("../../models/Menu");
  const OrderItem = require("../../models/OrderItem");
  
  for (const orderItem of orderItems) {
    // Nếu itemName không có hoặc rỗng, và có itemId
    if ((!orderItem.itemName || orderItem.itemName.trim() === "") && orderItem.itemId) {
      try {
        // Thử tìm trong Item trước
        const item = await Item.findById(orderItem.itemId);
        if (item) {
          orderItem.itemName = item.name;
          // Cập nhật vào database
          await OrderItem.findByIdAndUpdate(orderItem._id, { itemName: item.name });
        } else {
          // Nếu không tìm thấy trong Item, thử Menu
          const menu = await Menu.findById(orderItem.itemId);
          if (menu) {
            orderItem.itemName = menu.name;
            // Cập nhật vào database
            await OrderItem.findByIdAndUpdate(orderItem._id, { itemName: menu.name });
          }
        }
      } catch (err) {
        console.error(`Error filling itemName for OrderItem ${orderItem._id}:`, err);
      }
    }
  }
};

exports.getPreOrders = async (req, res) => {
  try {
    const {
      waiterResponseStatus, // "pending", "approved", "rejected"
      fromDate,
      toDate,
      minAmount,
      maxAmount,
      sortBy = "createdAt", // "createdAt", "totalAmount", "scheduledTime"
      sortOrder = "desc" // "asc", "desc"
    } = req.query;

    // Build query filter
    const filter = { status: "preorder" };

    // Filter theo waiterResponseStatus
    if (waiterResponseStatus) {
      filter["waiterResponse.status"] = waiterResponseStatus;
    }

    // Filter theo khoảng thời gian (createdAt)
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        // Thêm 1 ngày để bao gồm cả ngày toDate
        const toDateEnd = new Date(toDate);
        toDateEnd.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDateEnd;
      }
    }

    // Filter theo khoảng giá trị
    if (minAmount !== undefined || maxAmount !== undefined) {
      filter.totalAmount = {};
      if (minAmount !== undefined) {
        filter.totalAmount.$gte = parseFloat(minAmount);
      }
      if (maxAmount !== undefined) {
        filter.totalAmount.$lte = parseFloat(maxAmount);
      }
    }

    // Build sort options
    const sortOptions = {};
    if (sortBy === "totalAmount") {
      sortOptions.totalAmount = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "scheduledTime") {
      sortOptions.scheduledTime = sortOrder === "asc" ? 1 : -1;
    } else {
      // Default: sort by createdAt
      sortOptions.createdAt = sortOrder === "asc" ? 1 : -1;
    }

    const orders = await Order.find(filter)
      .populate({
        path: "userId",
        select: "name email phone",
      })
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate({
        path: "paymentIds",
        select: "amountPaid status paymentMethod createdAt payTime isDeposit",
      })
      .sort(sortOptions);

    // Tự động fill itemName từ itemId nếu thiếu và tính tổng tiền đã thanh toán
    for (const order of orders) {
      if (order.orderItems && order.orderItems.length > 0) {
        await fillItemNameForOrderItems(order.orderItems);
      }
      // Tính tổng tiền đã thanh toán từ paymentIds
      if (order.paymentIds && Array.isArray(order.paymentIds) && order.paymentIds.length > 0) {
        // Filter và tính tổng: chỉ tính các payment có status = 'paid' và amountPaid > 0
        const paidPayments = order.paymentIds.filter(p => {
          // Kiểm tra payment object có tồn tại và có status = 'paid'
          return p && 
                 typeof p === 'object' && 
                 p.status === 'paid' && 
                 (p.amountPaid || 0) > 0;
        });
        
        // Tính tổng tiền đã thanh toán (tất cả payments)
        order.totalPaid = paidPayments.reduce((sum, p) => {
          return sum + (Number(p.amountPaid) || 0);
        }, 0);
        
        // Tính riêng tiền cọc (chỉ các payment có isDeposit = true)
        // Lưu ý: payment cũ có thể không có field isDeposit, nên check cả undefined
        const depositPayments = paidPayments.filter(p => {
          // Nếu payment có isDeposit = true, hoặc không có isDeposit (backward compatibility: coi là cọc nếu order status là preorder/confirmed)
          return p.isDeposit === true || (p.isDeposit === undefined && order.status === 'preorder');
        });
        order.totalDeposit = depositPayments.reduce((sum, p) => {
          return sum + (Number(p.amountPaid) || 0);
        }, 0);
        
        order.remainingAmount = Math.max(0, (order.totalAmount || 0) - (order.totalPaid || 0));
      } else {
        order.totalPaid = 0;
        order.totalDeposit = 0;
        order.remainingAmount = order.totalAmount || 0;
      }
    }

    return success(res, orders);
  } catch (err) {
    return error(res, err.message);
  }
};

// Lấy thông tin chi tiết khách hàng và lịch sử đơn hàng
exports.getCustomerInfo = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return error(res, "userId là bắt buộc", 400);
    }

    // Lấy thông tin user
    const user = await User.findById(userId).select("name email phone point");
    if (!user) {
      return error(res, "Không tìm thấy khách hàng", 404);
    }

    // Lấy lịch sử đơn hàng
    const orders = await Order.find({ userId: userId })
      .populate("tableId", "tableNumber")
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate({
        path: "paymentIds",
        select: "amountPaid status paymentMethod createdAt payTime isDeposit",
      })
      .sort({ createdAt: -1 })

    // Tự động fill itemName từ itemId nếu thiếu và tính tổng tiền đã thanh toán
    for (const order of orders) {
      if (order.orderItems && order.orderItems.length > 0) {
        await fillItemNameForOrderItems(order.orderItems);
      }
      // Tính tổng tiền đã thanh toán từ paymentIds
      if (order.paymentIds && Array.isArray(order.paymentIds) && order.paymentIds.length > 0) {
        // Filter và tính tổng: chỉ tính các payment có status = 'paid' và amountPaid > 0
        const paidPayments = order.paymentIds.filter(p => {
          // Kiểm tra payment object có tồn tại và có status = 'paid'
          return p && 
                 typeof p === 'object' && 
                 p.status === 'paid' && 
                 (p.amountPaid || 0) > 0;
        });
        
        // Tính tổng tiền đã thanh toán (tất cả payments)
        order.totalPaid = paidPayments.reduce((sum, p) => {
          return sum + (Number(p.amountPaid) || 0);
        }, 0);
        
        // Tính riêng tiền cọc (chỉ các payment có isDeposit = true)
        // Lưu ý: payment cũ có thể không có field isDeposit, nên check cả undefined
        const depositPayments = paidPayments.filter(p => {
          // Nếu payment có isDeposit = true, hoặc không có isDeposit (backward compatibility: coi là cọc nếu order status là preorder/confirmed)
          return p.isDeposit === true || (p.isDeposit === undefined && order.status === 'preorder');
        });
        order.totalDeposit = depositPayments.reduce((sum, p) => {
          return sum + (Number(p.amountPaid) || 0);
        }, 0);
        
        order.remainingAmount = Math.max(0, (order.totalAmount || 0) - (order.totalPaid || 0));
      } else {
        order.totalPaid = 0;
        order.totalDeposit = 0;
        order.remainingAmount = order.totalAmount || 0;
      }
    }

    // Phân loại khách hàng
    const classification = await classifyCustomer(userId);

    return success(res, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        point: user.point || 0,
      },
      classification,
      orders,
    });
  } catch (err) {
    return error(res, err.message);
  }
};

// Admin approve đơn đặt trước
exports.approvePreOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { tableId, adminNotes } = req.body;
    const adminId = req.user.id; // Lấy từ middleware auth

    // Tìm order
    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    // Kiểm tra order là preorder
    if (order.status !== "preorder") {
      return error(res, "Chỉ có thể approve đơn đặt trước", 400);
    }

    // Kiểm tra waiterResponse chưa được approve/reject
    if (order.waiterResponse.status !== "pending") {
      return error(res, "Đơn hàng đã được phản hồi trước đó", 400);
    }

    // Validate table selection
    if (!tableId && !order.tableId) {
      return error(res, "Cần chọn bàn khi xác nhận", 400);
    }

    let table;
    let finalTableId;

    // Ưu tiên bàn mà admin chọn
    if (tableId) {
      table = await Table.findById(tableId);
      if (!table) {
        return error(res, "Bàn không tồn tại", 404);
      }
      finalTableId = tableId;
    } else if (order.tableId) {
      table = await Table.findById(order.tableId);
      if (!table) {
        return error(res, "Bàn auto-assigned không tồn tại", 404);
      }
      finalTableId = order.tableId;
    }

    // Cập nhật tableId cho order (nếu khác với bàn hiện tại)
    let oldTableId = null;
    if (order.tableId?.toString() !== finalTableId.toString()) {
      oldTableId = order.tableId;
      order.tableId = new mongoose.Types.ObjectId(finalTableId);

      // Xử lý bàn cũ (nếu có)
      if (oldTableId) {
        const oldTable = await Table.findById(oldTableId);
        if (oldTable && oldTable.orderNow) {
          oldTable.orderNow = oldTable.orderNow.filter(oid => oid.toString() !== orderId);
          if (oldTable.orderNow.length === 0) {
            oldTable.status = "available";
          }
          await oldTable.save();
        }
      }
    }

    // Admin approve → tự động confirm luôn (không cần chờ customer)
    order.waiterResponse.status = "approved";
    order.waiterResponse.reason = null;
    order.waiterResponse.respondedAt = new Date();
    order.status = "confirmed";
    order.customerConfirmed = true;

    // Gọi splitLargeOrderItems để chia OrderItem lớn thành nhiều OrderItem nhỏ hơn
    const { splitLargeOrderItems } = require("../../utils/customerHelpers");
    const splitCount = await splitLargeOrderItems(order._id);
    if (splitCount > 0) {
      console.log(`✅ Đã chia ${splitCount} OrderItem lớn thành nhiều OrderItem nhỏ hơn sau khi admin approve`);
    }

    // Reload order sau khi chia để có OrderItem mới
    await order.populate("orderItems");

    // Cập nhật table status
    table.status = "occupied";
    if (!table.orderNow.includes(order._id)) {
      table.orderNow.push(order._id);
    }
    await table.save();

    // Lưu lịch sử
    if (!order.confirmationHistory) {
      order.confirmationHistory = [];
    }
    order.confirmationHistory.push({
      action: "admin_approved",
      timestamp: new Date(),
      details: `Admin ${adminId} approve và confirm đơn (bàn ${table.tableNumber})`
    });

    if (adminNotes) {
      order.confirmationHistory.push({
        action: "admin_note",
        timestamp: new Date(),
        details: `Ghi chú admin: ${adminNotes}`
      });
    }

    await order.save();

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate("tableId", "tableNumber status")
      .populate("userId", "name email phone");

    // Tự động fill itemName từ itemId nếu thiếu
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await fillItemNameForOrderItems(populatedOrder.orderItems);
    }

    // Emit WebSocket event
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "order:confirmed", populatedOrder);
      webSocketService.broadcastToAllKitchen("order:confirmed", populatedOrder);
      webSocketService.broadcastToAllAdmins("preorder:approved", populatedOrder);
    }

    return success(res, populatedOrder, "Đã approve và xác nhận đơn hàng thành công");
  } catch (err) {
    console.error("Error in approvePreOrder:", err);
    return error(res, err.message);
  }
};

// Admin hủy đơn đặt trước
exports.cancelPreOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.user.id; // Lấy từ middleware auth

    // Tìm order
    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    // Kiểm tra order là preorder
    if (order.status !== "preorder") {
      return error(res, "Chỉ có thể hủy đơn đặt trước", 400);
    }

    // Chuyển status từ "preorder" → "cancelled"
    order.status = "cancelled";

    // KHÔNG động vào waiterResponse (vì đây là admin hủy, không liên quan đến waiter)
    // waiterResponse chỉ được set khi waiter reject đơn

    // Lưu lịch sử
    if (!order.confirmationHistory) {
      order.confirmationHistory = [];
    }
    order.confirmationHistory.push({
      action: "admin_cancelled",
      timestamp: new Date(),
      details: `Admin ${adminId} hủy đơn${adminNotes && adminNotes.trim() ? `: ${adminNotes.trim()}` : ""}`
    });

    // Lưu adminNotes vào mảng adminNotes (nếu có)
    if (adminNotes && adminNotes.trim()) {
      if (!order.adminNotes) {
        order.adminNotes = [];
      }
      order.adminNotes.push({
        note: adminNotes.trim(),
        createdBy: new mongoose.Types.ObjectId(adminId),
        createdAt: new Date()
      });
    }

    // Hoàn tiền nếu đã thanh toán (nếu có logic refund)
    // TODO: Implement refund logic nếu cần

    await order.save();

    // Xử lý bàn nếu có
    if (order.tableId) {
      const table = await Table.findById(order.tableId);
      if (table && table.orderNow) {
        table.orderNow = table.orderNow.filter(oid => oid.toString() !== orderId);
        if (table.orderNow.length === 0) {
          table.status = "available";
        }
        await table.save();
      }
    }

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate("tableId", "tableNumber")
      .populate("userId", "name email phone");

    // Tự động fill itemName từ itemId nếu thiếu
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await fillItemNameForOrderItems(populatedOrder.orderItems);
    }

    // Emit WebSocket event
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "preorder:cancelled", populatedOrder);
      webSocketService.broadcastToAllAdmins("preorder:cancelled", populatedOrder);
    }

    return success(res, populatedOrder, "Đã hủy đơn đặt trước thành công");
  } catch (err) {
    console.error("Error in cancelPreOrder:", err);
    return error(res, err.message);
  }
};

// Admin ghi nhận tiền cọc
exports.recordDeposit = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount, paymentMethod = "cash", adminNotes } = req.body;
    const adminId = req.user.id; // Lấy từ middleware auth

    // Validate
    if (!amount || amount <= 0) {
      return error(res, "Số tiền cọc phải lớn hơn 0", 400);
    }

    // Tìm order
    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    // Kiểm tra order là preorder hoặc confirmed
    if (!["preorder", "confirmed"].includes(order.status)) {
      return error(res, "Chỉ có thể ghi nhận tiền cọc cho đơn đặt trước hoặc đã xác nhận", 400);
    }

    // Đảm bảo paymentIds được sync
    await ensurePaymentIdsSync(order);

    // Tính tổng tiền đã thanh toán
    const { calculateTotalPaid } = require("../../utils/paymentHelpers");
    const totalPaid = await calculateTotalPaid(order._id);
    const remainingAmount = order.totalAmount - totalPaid;

    // Kiểm tra số tiền cọc không vượt quá số tiền còn lại
    if (amount > remainingAmount) {
      return error(res, `Số tiền cọc (${amount.toLocaleString('vi-VN')}₫) không được vượt quá số tiền còn lại (${remainingAmount.toLocaleString('vi-VN')}₫)`, 400);
    }

    // Tạo Payment mới cho tiền cọc
    const depositPayment = new Payment({
      orderId: order._id,
      paymentMethod,
      status: "paid",
      amountPaid: amount,
      payTime: new Date(),
      cashierId: adminId, // Admin ghi nhận tiền cọc
      isDeposit: true, // Đánh dấu đây là tiền cọc
    });
    await depositPayment.save();

    // Thêm payment vào order.paymentIds
    await addPaymentToOrder(order._id, depositPayment);

    // Tính lại số tiền còn lại sau khi đã thêm deposit
    const newTotalPaid = await calculateTotalPaid(order._id);
    const newRemainingAmount = Math.max(0, order.totalAmount - newTotalPaid);

    // Tìm hoặc tạo payment "unpaid" để hiển thị số tiền còn lại
    // Tìm payment unpaid (không phải deposit) - ưu tiên tìm payment có isDeposit = false hoặc undefined
    let unpaidPayment = await Payment.findOne({
      orderId: order._id,
      status: "unpaid",
      $or: [
        { isDeposit: false },
        { isDeposit: { $exists: false } }
      ]
    });

    // Nếu không tìm thấy, thử tìm bất kỳ payment unpaid nào (backward compatibility)
    if (!unpaidPayment) {
      unpaidPayment = await Payment.findOne({
        orderId: order._id,
        status: "unpaid"
      });
    }

    if (unpaidPayment) {
      // Cập nhật số tiền còn lại vào payment unpaid
      unpaidPayment.amountPaid = newRemainingAmount;
      unpaidPayment.isDeposit = false; // Đảm bảo isDeposit = false
      await unpaidPayment.save();
      
      // Đảm bảo payment unpaid có trong paymentIds
      await ensurePaymentIdsSync(order);
      const updatedOrder = await Order.findById(order._id);
      if (updatedOrder.paymentIds && !updatedOrder.paymentIds.some(pId => pId.toString() === unpaidPayment._id.toString())) {
        await addPaymentToOrder(order._id, unpaidPayment);
      }
    } else {
      // Tạo payment unpaid mới nếu chưa có
      const newUnpaidPayment = new Payment({
        orderId: order._id,
        paymentMethod: "cash",
        status: "unpaid",
        amountPaid: newRemainingAmount,
        isDeposit: false,
      });
      await newUnpaidPayment.save();
      await addPaymentToOrder(order._id, newUnpaidPayment);
    }

    // Lưu lịch sử
    if (!order.confirmationHistory) {
      order.confirmationHistory = [];
    }
    order.confirmationHistory.push({
      action: "admin_deposit_recorded",
      timestamp: new Date(),
      details: `Admin ${adminId} ghi nhận tiền cọc: ${amount.toLocaleString('vi-VN')}₫ (${paymentMethod})`
    });

    if (adminNotes) {
      order.confirmationHistory.push({
        action: "admin_note",
        timestamp: new Date(),
        details: `Ghi chú admin: ${adminNotes}`
      });
    }

    await order.save();

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate({
        path: "paymentIds",
        select: "amountPaid status paymentMethod createdAt payTime isDeposit",
      })
      .populate("tableId", "tableNumber")
      .populate("userId", "name email phone");

    // Tự động fill itemName từ itemId nếu thiếu
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await fillItemNameForOrderItems(populatedOrder.orderItems);
    }

    // Tính tổng tiền đã thanh toán từ paymentIds
    if (populatedOrder.paymentIds && Array.isArray(populatedOrder.paymentIds) && populatedOrder.paymentIds.length > 0) {
      // Filter và tính tổng: chỉ tính các payment có status = 'paid' và amountPaid > 0
      const paidPayments = populatedOrder.paymentIds.filter(p => {
        // Kiểm tra payment object có tồn tại và có status = 'paid'
        return p && 
               typeof p === 'object' && 
               p.status === 'paid' && 
               (p.amountPaid || 0) > 0;
      });
      
      // Tính tổng tiền đã thanh toán (tất cả payments)
      populatedOrder.totalPaid = paidPayments.reduce((sum, p) => {
        return sum + (Number(p.amountPaid) || 0);
      }, 0);
      
      // Tính riêng tiền cọc (chỉ các payment có isDeposit = true)
      const depositPayments = paidPayments.filter(p => p.isDeposit === true);
      populatedOrder.totalDeposit = depositPayments.reduce((sum, p) => {
        return sum + (Number(p.amountPaid) || 0);
      }, 0);
      
      populatedOrder.remainingAmount = Math.max(0, (populatedOrder.totalAmount || 0) - (populatedOrder.totalPaid || 0));
    } else {
      populatedOrder.totalPaid = 0;
      populatedOrder.totalDeposit = 0;
      populatedOrder.remainingAmount = populatedOrder.totalAmount || 0;
    }

    // Emit WebSocket event
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "preorder:deposit_recorded", populatedOrder);
      webSocketService.broadcastToAllAdmins("preorder:deposit_recorded", populatedOrder);
      webSocketService.broadcastToAllCashiers("preorder:deposit_recorded", populatedOrder);
    }

    return success(res, populatedOrder, "Đã ghi nhận tiền cọc thành công");
  } catch (err) {
    console.error("Error in recordDeposit:", err);
    return error(res, err.message);
  }
};

// Admin chỉnh sửa món trong đơn đặt trước
exports.modifyPreOrderItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { itemsToAdd = [], itemsToRemove = [], itemsToUpdate = [] } = req.body;
    const adminId = req.user.id;

    // Tìm order
    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    // Kiểm tra order là preorder
    if (order.status !== "preorder") {
      return error(res, "Chỉ có thể chỉnh sửa đơn đặt trước", 400);
    }

    const OrderItem = require("../../models/OrderItem");
    const { createOrderItemsFromCart, returnIngredientsToStock, deductIngredientsFromStock } = require("../../utils/customerHelpers");
    const Item = require("../../models/Item");
    const Menu = require("../../models/Menu");
    let totalAmountChange = 0;
    const modifications = [];

    // 1. Xóa món (itemsToRemove: array of orderItemId)
    for (const orderItemId of itemsToRemove) {
      const orderItem = await OrderItem.findById(orderItemId);
      if (!orderItem || orderItem.orderId.toString() !== orderId) {
        continue;
      }

      // Chỉ cho phép xóa món có status pending
      if (orderItem.status !== 'pending') {
        return error(res, `Không thể xóa món "${orderItem.itemName}" vì đã được xử lý`, 400);
      }

      // Tính số tiền cần trừ
      const itemAmount = orderItem.price * orderItem.quantity;
      totalAmountChange -= itemAmount;

      // Hoàn nguyên liệu
      await returnIngredientsToStock(orderItem);

      // Xóa OrderItem
      await OrderItem.findByIdAndDelete(orderItemId);
      order.orderItems = order.orderItems.filter(id => id.toString() !== orderItemId);

      modifications.push(`Xóa: ${orderItem.itemName} x${orderItem.quantity}`);
    }

    // 2. Cập nhật số lượng (itemsToUpdate: [{orderItemId, newQuantity}])
    for (const { orderItemId, newQuantity } of itemsToUpdate) {
      if (!newQuantity || newQuantity < 1) {
        return error(res, "Số lượng mới phải lớn hơn 0", 400);
      }

      const orderItem = await OrderItem.findById(orderItemId);
      if (!orderItem || orderItem.orderId.toString() !== orderId) {
        continue;
      }

      // Chỉ cho phép cập nhật món có status pending
      if (orderItem.status !== 'pending') {
        return error(res, `Không thể cập nhật món "${orderItem.itemName}" vì đã được xử lý`, 400);
      }

      const oldQuantity = orderItem.quantity;
      const quantityDiff = newQuantity - oldQuantity;

      if (quantityDiff === 0) continue;

      // Tính số tiền thay đổi
      totalAmountChange += orderItem.price * quantityDiff;

      // Cập nhật số lượng
      orderItem.quantity = newQuantity;

      // Xử lý nguyên liệu
      if (quantityDiff > 0) {
        // Tăng số lượng: trừ thêm nguyên liệu
        let item;
        if (orderItem.itemType === 'menu') {
          item = await Menu.findById(orderItem.itemId).populate('items');
        } else {
          item = await Item.findById(orderItem.itemId).populate('ingredients.ingredient');
        }

        if (item) {
          try {
            if (orderItem.itemType === 'item') {
              await deductIngredientsFromStock(item, quantityDiff);
            } else if (orderItem.itemType === 'menu' && item.type === 'combo' && item.items) {
              for (const comboItemId of item.items) {
                const comboItem = await Item.findById(comboItemId).populate('ingredients.ingredient');
                if (comboItem) {
                  await deductIngredientsFromStock(comboItem, quantityDiff);
                }
              }
            }
          } catch (error) {
            console.error(`❌ Lỗi khi trừ nguyên liệu cho OrderItem ${orderItemId}:`, error);
          }
        }
      } else {
        // Giảm số lượng: hoàn nguyên liệu
        const returnQuantity = Math.abs(quantityDiff);
        // Tạo temporary orderItem với quantity mới để hoàn đúng số lượng
        const tempOrderItem = { ...orderItem.toObject(), quantity: returnQuantity };
        await returnIngredientsToStock(tempOrderItem);
      }

      await orderItem.save();
      modifications.push(`Cập nhật: ${orderItem.itemName} từ ${oldQuantity} → ${newQuantity}`);
    }

    // 3. Thêm món (itemsToAdd: [{itemId, type, quantity, note?}])
    if (itemsToAdd.length > 0) {
      const { createdOrderItems, totalAmount: additionalAmount } = await createOrderItemsFromCart(itemsToAdd);

      // Cập nhật orderId cho các OrderItem mới
      await OrderItem.updateMany(
        { _id: { $in: createdOrderItems } },
        { orderId: order._id }
      );

      // Thêm vào order
      order.orderItems.push(...createdOrderItems);
      totalAmountChange += additionalAmount;

      for (const itemData of itemsToAdd) {
        let itemName = "Món";
        if (itemData.type === 'menu') {
          const menu = await Menu.findById(itemData.itemId);
          if (menu) itemName = menu.name;
        } else {
          const item = await Item.findById(itemData.itemId);
          if (item) itemName = item.name;
        }
        modifications.push(`Thêm: ${itemName} x${itemData.quantity}`);
      }
    }

    // Cập nhật totalAmount
    order.totalAmount = Math.max(0, order.totalAmount + totalAmountChange);

    // Reset confirmation flow khi order được modify
    order.waiterResponse.status = 'pending';
    order.waiterResponse.reason = null;
    order.waiterResponse.respondedAt = null;
    order.customerConfirmed = false;

    // Lưu lịch sử
    if (!order.confirmationHistory) {
      order.confirmationHistory = [];
    }
    order.confirmationHistory.push({
      action: "admin_modified_items",
      timestamp: new Date(),
      details: `Admin ${adminId} chỉnh sửa món: ${modifications.join(', ')}`
    });

    await order.save();

    // Cập nhật Payment với totalAmount mới (nếu có)
    const { ensurePaymentIdsSync } = require("../../utils/paymentHelpers");
    await ensurePaymentIdsSync(order);
    if (order.paymentIds && order.paymentIds.length > 0) {
      // Cập nhật totalAmount cho payment đầu tiên (nếu có)
      const firstPayment = await Payment.findById(order.paymentIds[0]);
      if (firstPayment) {
        firstPayment.totalAmount = order.totalAmount;
        await firstPayment.save();
      }
    }

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate("tableId", "tableNumber")
      .populate("userId", "name email phone");

    // Tự động fill itemName từ itemId nếu thiếu
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await fillItemNameForOrderItems(populatedOrder.orderItems);
    }

    // Emit WebSocket event
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "preorder:items_modified", populatedOrder);
      webSocketService.broadcastToAllAdmins("preorder:items_modified", populatedOrder);
    }

    return success(res, populatedOrder, "Đã chỉnh sửa món thành công");
  } catch (err) {
    console.error("Error in modifyPreOrderItems:", err);
    return error(res, err.message);
  }
};

// Admin cập nhật thông tin đơn đặt trước (gán bàn, sửa thời gian)
exports.updatePreOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { tableId, scheduledTime, adminNotes } = req.body;
    const adminId = req.user.id;

    // Tìm order
    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    // Kiểm tra order là preorder
    if (order.status !== "preorder") {
      return error(res, "Chỉ có thể cập nhật đơn đặt trước", 400);
    }

    const changes = [];

    // Cập nhật tableId (nếu có)
    if (tableId !== undefined) {
      if (tableId === null || tableId === "") {
        // Xóa bàn (set tableId = null)
        if (order.tableId) {
          const oldTable = await Table.findById(order.tableId);
          if (oldTable && oldTable.orderNow) {
            oldTable.orderNow = oldTable.orderNow.filter(oid => oid.toString() !== orderId);
            if (oldTable.orderNow.length === 0) {
              oldTable.status = "available";
            }
            await oldTable.save();
          }
          changes.push(`Xóa bàn ${oldTable?.tableNumber || ""}`);
        }
        order.tableId = null;
      } else {
        // Gán bàn mới
        const newTable = await Table.findById(tableId);
        if (!newTable) {
          return error(res, "Bàn không tồn tại", 404);
        }

        // Xử lý bàn cũ (nếu có)
        if (order.tableId && order.tableId.toString() !== tableId) {
          const oldTable = await Table.findById(order.tableId);
          if (oldTable && oldTable.orderNow) {
            oldTable.orderNow = oldTable.orderNow.filter(oid => oid.toString() !== orderId);
            if (oldTable.orderNow.length === 0) {
              oldTable.status = "available";
            }
            await oldTable.save();
          }
          changes.push(`Đổi bàn từ ${oldTable?.tableNumber || ""} sang ${newTable.tableNumber}`);
        } else if (!order.tableId) {
          changes.push(`Gán bàn ${newTable.tableNumber}`);
        }

        order.tableId = new mongoose.Types.ObjectId(tableId);
      }
    }

    // Cập nhật scheduledTime (nếu có)
    if (scheduledTime !== undefined) {
      const newScheduledTime = new Date(scheduledTime);
      if (isNaN(newScheduledTime.getTime())) {
        return error(res, "Thời gian đặt trước không hợp lệ", 400);
      }

      const oldTime = order.scheduledTime ? new Date(order.scheduledTime).toLocaleString("vi-VN") : "Chưa có";
      const newTime = newScheduledTime.toLocaleString("vi-VN");
      changes.push(`Đổi thời gian từ ${oldTime} sang ${newTime}`);

      order.scheduledTime = newScheduledTime;
    }

    // Lưu lịch sử
    if (!order.confirmationHistory) {
      order.confirmationHistory = [];
    }
    if (changes.length > 0) {
      order.confirmationHistory.push({
        action: "admin_updated_preorder",
        timestamp: new Date(),
        details: `Admin ${adminId} cập nhật: ${changes.join(", ")}`
      });
    }

    if (adminNotes) {
      order.confirmationHistory.push({
        action: "admin_note",
        timestamp: new Date(),
        details: `Ghi chú admin: ${adminNotes}`
      });
    }

    await order.save();

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate("tableId", "tableNumber status")
      .populate("userId", "name email phone");

    // Tự động fill itemName từ itemId nếu thiếu
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await fillItemNameForOrderItems(populatedOrder.orderItems);
    }

    // Emit WebSocket event
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "preorder:updated", populatedOrder);
      webSocketService.broadcastToAllAdmins("preorder:updated", populatedOrder);
    }

    return success(res, populatedOrder, "Đã cập nhật đơn đặt trước thành công");
  } catch (err) {
    console.error("Error in updatePreOrder:", err);
    return error(res, err.message);
  }
};

// Admin thêm ghi chú cho đơn đặt trước
exports.addAdminNote = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { note } = req.body;
    const adminId = req.user.id;

    if (!note || !note.trim()) {
      return error(res, "Ghi chú không được để trống", 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    if (!order.adminNotes) {
      order.adminNotes = [];
    }

    order.adminNotes.push({
      note: note.trim(),
      createdBy: adminId,
      createdAt: new Date()
    });

    await order.save();

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate("tableId", "tableNumber")
      .populate("userId", "name email phone")
      .populate("adminNotes.createdBy", "name username");

    // Tự động fill itemName từ itemId nếu thiếu
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await fillItemNameForOrderItems(populatedOrder.orderItems);
    }

    return success(res, populatedOrder, "Đã thêm ghi chú thành công");
  } catch (err) {
    console.error("Error in addAdminNote:", err);
    return error(res, err.message);
  }
};

// Admin xóa ghi chú
exports.deleteAdminNote = async (req, res) => {
  try {
    const { orderId, noteId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    if (!order.adminNotes || order.adminNotes.length === 0) {
      return error(res, "Không có ghi chú nào", 404);
    }

    // Tìm và xóa note
    const noteIndex = order.adminNotes.findIndex(n => n._id.toString() === noteId);
    if (noteIndex === -1) {
      return error(res, "Không tìm thấy ghi chú", 404);
    }

    order.adminNotes.splice(noteIndex, 1);
    await order.save();

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate("tableId", "tableNumber")
      .populate("userId", "name email phone")
      .populate("adminNotes.createdBy", "name username");

    // Tự động fill itemName từ itemId nếu thiếu
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await fillItemNameForOrderItems(populatedOrder.orderItems);
    }

    return success(res, populatedOrder, "Đã xóa ghi chú thành công");
  } catch (err) {
    console.error("Error in deleteAdminNote:", err);
    return error(res, err.message);
  }
};

// Admin cập nhật ghi chú
exports.updateAdminNote = async (req, res) => {
  try {
    const { orderId, noteId } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return error(res, "Ghi chú không được để trống", 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    if (!order.adminNotes || order.adminNotes.length === 0) {
      return error(res, "Không có ghi chú nào", 404);
    }

    // Tìm và cập nhật note
    const noteToUpdate = order.adminNotes.find(n => n._id.toString() === noteId);
    if (!noteToUpdate) {
      return error(res, "Không tìm thấy ghi chú", 404);
    }

    noteToUpdate.note = note.trim();
    noteToUpdate.updatedAt = new Date();
    await order.save();

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate("tableId", "tableNumber")
      .populate("userId", "name email phone")
      .populate("adminNotes.createdBy", "name username");

    // Tự động fill itemName từ itemId nếu thiếu
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await fillItemNameForOrderItems(populatedOrder.orderItems);
    }

    return success(res, populatedOrder, "Đã cập nhật ghi chú thành công");
  } catch (err) {
    console.error("Error in updateAdminNote:", err);
    return error(res, err.message);
  }
};

// Admin xuất dữ liệu đơn đặt trước ra Excel
exports.exportPreOrders = async (req, res) => {
  try {
    const {
      waiterResponseStatus,
      fromDate,
      toDate,
      minAmount,
      maxAmount,
      format = "xlsx"
    } = req.query;

    // Build query filter (giống getPreOrders)
    const filter = { status: "preorder" };

    if (waiterResponseStatus) {
      filter["waiterResponse.status"] = waiterResponseStatus;
    }

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const toDateEnd = new Date(toDate);
        toDateEnd.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDateEnd;
      }
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      filter.totalAmount = {};
      if (minAmount !== undefined) {
        filter.totalAmount.$gte = parseFloat(minAmount);
      }
      if (maxAmount !== undefined) {
        filter.totalAmount.$lte = parseFloat(maxAmount);
      }
    }

    // Lấy orders
    const orders = await Order.find(filter)
      .populate({
        path: "userId",
        select: "name email phone",
      })
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .sort({ createdAt: -1 });

    // Tự động fill itemName từ itemId nếu thiếu
    for (const order of orders) {
      if (order.orderItems && order.orderItems.length > 0) {
        await fillItemNameForOrderItems(order.orderItems);
      }
    }

    // Tạo workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Đơn đặt trước");

    // Định nghĩa columns
    worksheet.columns = [
      { header: "Mã đơn", key: "orderId", width: 15 },
      { header: "Tên khách hàng", key: "customerName", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Số điện thoại", key: "phone", width: 15 },
      { header: "Thời gian đặt", key: "createdAt", width: 20 },
      { header: "Thời gian đến ăn", key: "scheduledTime", width: 20 },
      { header: "Tổng tiền", key: "totalAmount", width: 15 },
      { header: "Trạng thái waiter", key: "waiterStatus", width: 15 },
      { header: "Danh sách món", key: "items", width: 50 },
    ];

    // Style cho header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Format date helper
    const formatDate = (date) => {
      if (!date) return "";
      const d = new Date(date);
      return d.toLocaleString("vi-VN");
    };

    // Format currency helper
    const formatCurrency = (amount) => {
      if (!amount) return "0";
      return new Intl.NumberFormat("vi-VN").format(amount);
    };

    // Thêm dữ liệu
    for (const order of orders) {
      const customer = order.userId || {};
      const itemsList = (order.orderItems || [])
        .map((item) => `${item.itemName} x${item.quantity}`)
        .join(", ");

      const waiterStatusLabels = {
        pending: "Chờ xác nhận",
        approved: "Đã xác nhận",
        rejected: "Đã từ chối",
      };

      worksheet.addRow({
        orderId: String(order._id).slice(-8),
        customerName: customer.name || "Khách ẩn danh",
        email: customer.email || "",
        phone: customer.phone || "",
        createdAt: formatDate(order.createdAt),
        scheduledTime: formatDate(order.scheduledTime),
        totalAmount: formatCurrency(order.totalAmount),
        waiterStatus: waiterStatusLabels[order.waiterResponse?.status] || "Chờ xác nhận",
        items: itemsList,
      });
    }

    // Set response headers
    const fileName = `don-dat-truoc-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error in exportPreOrders:", err);
    return error(res, err.message);
  }
};

// Admin bulk approve/cancel nhiều đơn đặt trước
exports.bulkActionPreOrders = async (req, res) => {
  try {
    const { orderIds, action, tableId, reason, adminNotes } = req.body;
    const adminId = req.user.id;

    // Validate
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return error(res, "Danh sách đơn hàng không được để trống", 400);
    }

    if (!["approve", "cancel"].includes(action)) {
      return error(res, "Hành động không hợp lệ. Chỉ hỗ trợ 'approve' hoặc 'cancel'", 400);
    }

    if (action === "approve" && !tableId) {
      return error(res, "Cần chọn bàn khi approve", 400);
    }

    // Note: adminNotes không bắt buộc cho cancel action

    // Validate table (nếu approve)
    let table = null;
    if (action === "approve") {
      table = await Table.findById(tableId);
      if (!table) {
        return error(res, "Bàn không tồn tại", 404);
      }
    }

    const results = {
      success: [],
      failed: []
    };

    // Xử lý từng order
    for (const orderId of orderIds) {
      try {
        const order = await Order.findById(orderId);
        if (!order) {
          results.failed.push({ orderId, error: "Không tìm thấy đơn hàng" });
          continue;
        }

        if (order.status !== "preorder") {
          results.failed.push({ orderId, error: "Chỉ có thể xử lý đơn đặt trước" });
          continue;
        }

        if (order.waiterResponse.status !== "pending") {
          results.failed.push({ orderId, error: "Đơn hàng đã được phản hồi trước đó" });
          continue;
        }

        if (action === "approve") {
          // Approve logic (tương tự approvePreOrder)
          order.tableId = new mongoose.Types.ObjectId(tableId);
          order.waiterResponse.status = "approved";
          order.waiterResponse.reason = null;
          order.waiterResponse.respondedAt = new Date();

          // Admin approve → tự động confirm luôn (không cần chờ customer)
          order.status = "confirmed";
          order.customerConfirmed = true;

          const { splitLargeOrderItems } = require("../../utils/customerHelpers");
          await splitLargeOrderItems(order._id);
          await order.populate("orderItems");

          table.status = "occupied";
          if (!table.orderNow.includes(order._id)) {
            table.orderNow.push(order._id);
          }
          await table.save();

          if (!order.confirmationHistory) {
            order.confirmationHistory = [];
          }
          order.confirmationHistory.push({
            action: "admin_approved",
            timestamp: new Date(),
            details: `Admin ${adminId} bulk approve và confirm đơn (bàn ${table.tableNumber})`
          });
        } else {
          // Cancel logic (tương tự cancelPreOrder)
          order.status = "cancelled";

          if (!order.confirmationHistory) {
            order.confirmationHistory = [];
          }
          order.confirmationHistory.push({
            action: "admin_cancelled",
            timestamp: new Date(),
            details: `Admin ${adminId} bulk hủy đơn${adminNotes && adminNotes.trim() ? `: ${adminNotes.trim()}` : ""}`
          });

          // Lưu adminNotes vào mảng adminNotes (nếu có)
          if (adminNotes && adminNotes.trim()) {
            if (!order.adminNotes) {
              order.adminNotes = [];
            }
            order.adminNotes.push({
              note: adminNotes.trim(),
              createdBy: new mongoose.Types.ObjectId(adminId),
              createdAt: new Date()
            });
          }

          if (order.tableId) {
            const orderTable = await Table.findById(order.tableId);
            if (orderTable && orderTable.orderNow) {
              orderTable.orderNow = orderTable.orderNow.filter(oid => oid.toString() !== orderId);
              if (orderTable.orderNow.length === 0) {
                orderTable.status = "available";
              }
              await orderTable.save();
            }
          }
        }


        await order.save();
        results.success.push(orderId);
      } catch (err) {
        console.error(`Error processing order ${orderId}:`, err);
        results.failed.push({ orderId, error: err.message });
      }
    }

    // Emit WebSocket events
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      for (const orderId of results.success) {
        const order = await Order.findById(orderId)
          .populate({
            path: "orderItems",
            select: "itemName itemType quantity price itemId",
          })
          .populate("tableId", "tableNumber")
          .populate("userId", "name email phone");

        // Tự động fill itemName từ itemId nếu thiếu
        if (order.orderItems && order.orderItems.length > 0) {
          await fillItemNameForOrderItems(order.orderItems);
        }

        if (action === "approve") {
          webSocketService.broadcastToOrder(orderId, "order:confirmed", order);
          webSocketService.broadcastToAllKitchen("order:confirmed", order);
          webSocketService.broadcastToAllAdmins("preorder:approved", order);
        } else {
          webSocketService.broadcastToOrder(orderId, "preorder:cancelled", order);
          webSocketService.broadcastToAllAdmins("preorder:cancelled", order);
        }
      }
    }

    return success(res, results, `Đã xử lý ${results.success.length}/${orderIds.length} đơn hàng thành công`);
  } catch (err) {
    console.error("Error in bulkActionPreOrders:", err);
    return error(res, err.message);
  }
};

// Lấy thông tin chi tiết khách hàng và lịch sử đơn hàng
exports.getCustomerInfo = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return error(res, "userId là bắt buộc", 400);
    }

    // Lấy thông tin user
    const user = await User.findById(userId).select("name email phone point");
    if (!user) {
      return error(res, "Không tìm thấy khách hàng", 404);
    }

    // Lấy lịch sử đơn hàng
    const orders = await Order.find({ userId: userId })
      .populate("tableId", "tableNumber")
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate({
        path: "paymentIds",
        select: "amountPaid status paymentMethod createdAt payTime isDeposit",
      })
      .sort({ createdAt: -1 })

    // Tự động fill itemName từ itemId nếu thiếu và tính tổng tiền đã thanh toán
    for (const order of orders) {
      if (order.orderItems && order.orderItems.length > 0) {
        await fillItemNameForOrderItems(order.orderItems);
      }
      // Tính tổng tiền đã thanh toán từ paymentIds
      if (order.paymentIds && Array.isArray(order.paymentIds) && order.paymentIds.length > 0) {
        // Filter và tính tổng: chỉ tính các payment có status = 'paid' và amountPaid > 0
        const paidPayments = order.paymentIds.filter(p => {
          // Kiểm tra payment object có tồn tại và có status = 'paid'
          return p && 
                 typeof p === 'object' && 
                 p.status === 'paid' && 
                 (p.amountPaid || 0) > 0;
        });
        
        // Tính tổng tiền đã thanh toán (tất cả payments)
        order.totalPaid = paidPayments.reduce((sum, p) => {
          return sum + (Number(p.amountPaid) || 0);
        }, 0);
        
        // Tính riêng tiền cọc (chỉ các payment có isDeposit = true)
        // Lưu ý: payment cũ có thể không có field isDeposit, nên check cả undefined
        const depositPayments = paidPayments.filter(p => {
          // Nếu payment có isDeposit = true, hoặc không có isDeposit (backward compatibility: coi là cọc nếu order status là preorder/confirmed)
          return p.isDeposit === true || (p.isDeposit === undefined && order.status === 'preorder');
        });
        order.totalDeposit = depositPayments.reduce((sum, p) => {
          return sum + (Number(p.amountPaid) || 0);
        }, 0);
        
        order.remainingAmount = Math.max(0, (order.totalAmount || 0) - (order.totalPaid || 0));
      } else {
        order.totalPaid = 0;
        order.totalDeposit = 0;
        order.remainingAmount = order.totalAmount || 0;
      }
    }

    // Phân loại khách hàng
    const classification = await classifyCustomer(userId);

    return success(res, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        point: user.point || 0,
      },
      classification,
      orders,
    });
  } catch (err) {
    return error(res, err.message);
  }
};

// Admin approve đơn đặt trước
exports.approvePreOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { tableId, adminNotes } = req.body;
    const adminId = req.user.id; // Lấy từ middleware auth

    // Tìm order
    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    // Kiểm tra order là preorder
    if (order.status !== "preorder") {
      return error(res, "Chỉ có thể approve đơn đặt trước", 400);
    }

    // Kiểm tra waiterResponse chưa được approve/reject
    if (order.waiterResponse.status !== "pending") {
      return error(res, "Đơn hàng đã được phản hồi trước đó", 400);
    }

    // Validate table selection
    if (!tableId && !order.tableId) {
      return error(res, "Cần chọn bàn khi xác nhận", 400);
    }

    let table;
    let finalTableId;

    // Ưu tiên bàn mà admin chọn
    if (tableId) {
      table = await Table.findById(tableId);
      if (!table) {
        return error(res, "Bàn không tồn tại", 404);
      }
      finalTableId = tableId;
    } else if (order.tableId) {
      table = await Table.findById(order.tableId);
      if (!table) {
        return error(res, "Bàn auto-assigned không tồn tại", 404);
      }
      finalTableId = order.tableId;
    }

    // Cập nhật tableId cho order (nếu khác với bàn hiện tại)
    let oldTableId = null;
    if (order.tableId?.toString() !== finalTableId.toString()) {
      oldTableId = order.tableId;
      order.tableId = new mongoose.Types.ObjectId(finalTableId);

      // Xử lý bàn cũ (nếu có)
      if (oldTableId) {
        const oldTable = await Table.findById(oldTableId);
        if (oldTable && oldTable.orderNow) {
          oldTable.orderNow = oldTable.orderNow.filter(oid => oid.toString() !== orderId);
          if (oldTable.orderNow.length === 0) {
            oldTable.status = "available";
          }
          await oldTable.save();
        }
      }
    }

    // Admin approve → tự động confirm luôn (không cần chờ customer)
    order.waiterResponse.status = "approved";
    order.waiterResponse.reason = null;
    order.waiterResponse.respondedAt = new Date();
    order.status = "confirmed";
    order.customerConfirmed = true;

    // Gọi splitLargeOrderItems để chia OrderItem lớn thành nhiều OrderItem nhỏ hơn
    const { splitLargeOrderItems } = require("../../utils/customerHelpers");
    const splitCount = await splitLargeOrderItems(order._id);
    if (splitCount > 0) {
      console.log(`✅ Đã chia ${splitCount} OrderItem lớn thành nhiều OrderItem nhỏ hơn sau khi admin approve`);
    }

    // Reload order sau khi chia để có OrderItem mới
    await order.populate("orderItems");

    // Cập nhật table status
    table.status = "occupied";
    if (!table.orderNow.includes(order._id)) {
      table.orderNow.push(order._id);
    }
    await table.save();

    // Lưu lịch sử
    if (!order.confirmationHistory) {
      order.confirmationHistory = [];
    }
    order.confirmationHistory.push({
      action: "admin_approved",
      timestamp: new Date(),
      details: `Admin ${adminId} approve và confirm đơn (bàn ${table.tableNumber})`
    });

    if (adminNotes) {
      order.confirmationHistory.push({
        action: "admin_note",
        timestamp: new Date(),
        details: `Ghi chú admin: ${adminNotes}`
      });
    }

    await order.save();

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate("tableId", "tableNumber status")
      .populate("userId", "name email phone");

    // Tự động fill itemName từ itemId nếu thiếu
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await fillItemNameForOrderItems(populatedOrder.orderItems);
    }

    // Emit WebSocket event
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "order:confirmed", populatedOrder);
      webSocketService.broadcastToAllKitchen("order:confirmed", populatedOrder);
      webSocketService.broadcastToAllAdmins("preorder:approved", populatedOrder);
    }

    return success(res, populatedOrder, "Đã approve và xác nhận đơn hàng thành công");
  } catch (err) {
    console.error("Error in approvePreOrder:", err);
    return error(res, err.message);
  }
};

// Admin hủy đơn đặt trước
exports.cancelPreOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.user.id; // Lấy từ middleware auth

    // Tìm order
    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    // Kiểm tra order là preorder
    if (order.status !== "preorder") {
      return error(res, "Chỉ có thể hủy đơn đặt trước", 400);
    }

    // Chuyển status từ "preorder" → "cancelled"
    order.status = "cancelled";

    // KHÔNG động vào waiterResponse (vì đây là admin hủy, không liên quan đến waiter)
    // waiterResponse chỉ được set khi waiter reject đơn

    // Lưu lịch sử
    if (!order.confirmationHistory) {
      order.confirmationHistory = [];
    }
    order.confirmationHistory.push({
      action: "admin_cancelled",
      timestamp: new Date(),
      details: `Admin ${adminId} hủy đơn${adminNotes && adminNotes.trim() ? `: ${adminNotes.trim()}` : ""}`
    });

    // Lưu adminNotes vào mảng adminNotes (nếu có)
    if (adminNotes && adminNotes.trim()) {
      if (!order.adminNotes) {
        order.adminNotes = [];
      }
      order.adminNotes.push({
        note: adminNotes.trim(),
        createdBy: new mongoose.Types.ObjectId(adminId),
        createdAt: new Date()
      });
    }

    // Hoàn tiền nếu đã thanh toán (nếu có logic refund)
    // TODO: Implement refund logic nếu cần

    await order.save();

    // Xử lý bàn nếu có
    if (order.tableId) {
      const table = await Table.findById(order.tableId);
      if (table && table.orderNow) {
        table.orderNow = table.orderNow.filter(oid => oid.toString() !== orderId);
        if (table.orderNow.length === 0) {
          table.status = "available";
        }
        await table.save();
      }
    }

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate("tableId", "tableNumber")
      .populate("userId", "name email phone");

    // Tự động fill itemName từ itemId nếu thiếu
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await fillItemNameForOrderItems(populatedOrder.orderItems);
    }

    // Emit WebSocket event
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "preorder:cancelled", populatedOrder);
      webSocketService.broadcastToAllAdmins("preorder:cancelled", populatedOrder);
    }

    return success(res, populatedOrder, "Đã hủy đơn đặt trước thành công");
  } catch (err) {
    console.error("Error in cancelPreOrder:", err);
    return error(res, err.message);
  }
};

// Admin ghi nhận tiền cọc
exports.recordDeposit = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount, paymentMethod = "cash", adminNotes } = req.body;
    const adminId = req.user.id; // Lấy từ middleware auth

    // Validate
    if (!amount || amount <= 0) {
      return error(res, "Số tiền cọc phải lớn hơn 0", 400);
    }

    // Tìm order
    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    // Kiểm tra order là preorder hoặc confirmed
    if (!["preorder", "confirmed"].includes(order.status)) {
      return error(res, "Chỉ có thể ghi nhận tiền cọc cho đơn đặt trước hoặc đã xác nhận", 400);
    }

    // Đảm bảo paymentIds được sync
    await ensurePaymentIdsSync(order);

    // Tính tổng tiền đã thanh toán
    const { calculateTotalPaid } = require("../../utils/paymentHelpers");
    const totalPaid = await calculateTotalPaid(order._id);
    const remainingAmount = order.totalAmount - totalPaid;

    // Kiểm tra số tiền cọc không vượt quá số tiền còn lại
    if (amount > remainingAmount) {
      return error(res, `Số tiền cọc (${amount.toLocaleString('vi-VN')}₫) không được vượt quá số tiền còn lại (${remainingAmount.toLocaleString('vi-VN')}₫)`, 400);
    }

    // Tạo Payment mới cho tiền cọc
    const depositPayment = new Payment({
      orderId: order._id,
      paymentMethod,
      status: "paid",
      amountPaid: amount,
      payTime: new Date(),
      cashierId: adminId, // Admin ghi nhận tiền cọc
      isDeposit: true, // Đánh dấu đây là tiền cọc
    });
    await depositPayment.save();

    // Thêm payment vào order.paymentIds
    await addPaymentToOrder(order._id, depositPayment);

    // Tính lại số tiền còn lại sau khi đã thêm deposit
    const newTotalPaid = await calculateTotalPaid(order._id);
    const newRemainingAmount = Math.max(0, order.totalAmount - newTotalPaid);

    // Tìm hoặc tạo payment "unpaid" để hiển thị số tiền còn lại
    // Tìm payment unpaid (không phải deposit) - ưu tiên tìm payment có isDeposit = false hoặc undefined
    let unpaidPayment = await Payment.findOne({
      orderId: order._id,
      status: "unpaid",
      $or: [
        { isDeposit: false },
        { isDeposit: { $exists: false } }
      ]
    });

    // Nếu không tìm thấy, thử tìm bất kỳ payment unpaid nào (backward compatibility)
    if (!unpaidPayment) {
      unpaidPayment = await Payment.findOne({
        orderId: order._id,
        status: "unpaid"
      });
    }

    if (unpaidPayment) {
      // Cập nhật số tiền còn lại vào payment unpaid
      unpaidPayment.amountPaid = newRemainingAmount;
      unpaidPayment.isDeposit = false; // Đảm bảo isDeposit = false
      await unpaidPayment.save();
      
      // Đảm bảo payment unpaid có trong paymentIds
      await ensurePaymentIdsSync(order);
      const updatedOrder = await Order.findById(order._id);
      if (updatedOrder.paymentIds && !updatedOrder.paymentIds.some(pId => pId.toString() === unpaidPayment._id.toString())) {
        await addPaymentToOrder(order._id, unpaidPayment);
      }
    } else {
      // Tạo payment unpaid mới nếu chưa có
      const newUnpaidPayment = new Payment({
        orderId: order._id,
        paymentMethod: "cash",
        status: "unpaid",
        amountPaid: newRemainingAmount,
        isDeposit: false,
      });
      await newUnpaidPayment.save();
      await addPaymentToOrder(order._id, newUnpaidPayment);
    }

    // Lưu lịch sử
    if (!order.confirmationHistory) {
      order.confirmationHistory = [];
    }
    order.confirmationHistory.push({
      action: "admin_deposit_recorded",
      timestamp: new Date(),
      details: `Admin ${adminId} ghi nhận tiền cọc: ${amount.toLocaleString('vi-VN')}₫ (${paymentMethod})`
    });

    if (adminNotes) {
      order.confirmationHistory.push({
        action: "admin_note",
        timestamp: new Date(),
        details: `Ghi chú admin: ${adminNotes}`
      });
    }

    await order.save();

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate({
        path: "paymentIds",
        select: "amountPaid status paymentMethod createdAt payTime isDeposit",
      })
      .populate("tableId", "tableNumber")
      .populate("userId", "name email phone");

    // Tự động fill itemName từ itemId nếu thiếu
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await fillItemNameForOrderItems(populatedOrder.orderItems);
    }

    // Tính tổng tiền đã thanh toán từ paymentIds
    if (populatedOrder.paymentIds && Array.isArray(populatedOrder.paymentIds) && populatedOrder.paymentIds.length > 0) {
      // Filter và tính tổng: chỉ tính các payment có status = 'paid' và amountPaid > 0
      const paidPayments = populatedOrder.paymentIds.filter(p => {
        // Kiểm tra payment object có tồn tại và có status = 'paid'
        return p && 
               typeof p === 'object' && 
               p.status === 'paid' && 
               (p.amountPaid || 0) > 0;
      });
      
      // Tính tổng tiền đã thanh toán (tất cả payments)
      populatedOrder.totalPaid = paidPayments.reduce((sum, p) => {
        return sum + (Number(p.amountPaid) || 0);
      }, 0);
      
      // Tính riêng tiền cọc (chỉ các payment có isDeposit = true)
      const depositPayments = paidPayments.filter(p => p.isDeposit === true);
      populatedOrder.totalDeposit = depositPayments.reduce((sum, p) => {
        return sum + (Number(p.amountPaid) || 0);
      }, 0);
      
      populatedOrder.remainingAmount = Math.max(0, (populatedOrder.totalAmount || 0) - (populatedOrder.totalPaid || 0));
    } else {
      populatedOrder.totalPaid = 0;
      populatedOrder.totalDeposit = 0;
      populatedOrder.remainingAmount = populatedOrder.totalAmount || 0;
    }

    // Emit WebSocket event
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "preorder:deposit_recorded", populatedOrder);
      webSocketService.broadcastToAllAdmins("preorder:deposit_recorded", populatedOrder);
      webSocketService.broadcastToAllCashiers("preorder:deposit_recorded", populatedOrder);
    }

    return success(res, populatedOrder, "Đã ghi nhận tiền cọc thành công");
  } catch (err) {
    console.error("Error in recordDeposit:", err);
    return error(res, err.message);
  }
};

// Admin chỉnh sửa món trong đơn đặt trước
exports.modifyPreOrderItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { itemsToAdd = [], itemsToRemove = [], itemsToUpdate = [] } = req.body;
    const adminId = req.user.id;

    // Tìm order
    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    // Kiểm tra order là preorder
    if (order.status !== "preorder") {
      return error(res, "Chỉ có thể chỉnh sửa đơn đặt trước", 400);
    }

    const OrderItem = require("../../models/OrderItem");
    const { createOrderItemsFromCart, returnIngredientsToStock, deductIngredientsFromStock } = require("../../utils/customerHelpers");
    const Item = require("../../models/Item");
    const Menu = require("../../models/Menu");
    let totalAmountChange = 0;
    const modifications = [];

    // 1. Xóa món (itemsToRemove: array of orderItemId)
    for (const orderItemId of itemsToRemove) {
      const orderItem = await OrderItem.findById(orderItemId);
      if (!orderItem || orderItem.orderId.toString() !== orderId) {
        continue;
      }

      // Chỉ cho phép xóa món có status pending
      if (orderItem.status !== 'pending') {
        return error(res, `Không thể xóa món "${orderItem.itemName}" vì đã được xử lý`, 400);
      }

      // Tính số tiền cần trừ
      const itemAmount = orderItem.price * orderItem.quantity;
      totalAmountChange -= itemAmount;

      // Hoàn nguyên liệu
      await returnIngredientsToStock(orderItem);

      // Xóa OrderItem
      await OrderItem.findByIdAndDelete(orderItemId);
      order.orderItems = order.orderItems.filter(id => id.toString() !== orderItemId);

      modifications.push(`Xóa: ${orderItem.itemName} x${orderItem.quantity}`);
    }

    // 2. Cập nhật số lượng (itemsToUpdate: [{orderItemId, newQuantity}])
    for (const { orderItemId, newQuantity } of itemsToUpdate) {
      if (!newQuantity || newQuantity < 1) {
        return error(res, "Số lượng mới phải lớn hơn 0", 400);
      }

      const orderItem = await OrderItem.findById(orderItemId);
      if (!orderItem || orderItem.orderId.toString() !== orderId) {
        continue;
      }

      // Chỉ cho phép cập nhật món có status pending
      if (orderItem.status !== 'pending') {
        return error(res, `Không thể cập nhật món "${orderItem.itemName}" vì đã được xử lý`, 400);
      }

      const oldQuantity = orderItem.quantity;
      const quantityDiff = newQuantity - oldQuantity;

      if (quantityDiff === 0) continue;

      // Tính số tiền thay đổi
      totalAmountChange += orderItem.price * quantityDiff;

      // Cập nhật số lượng
      orderItem.quantity = newQuantity;

      // Xử lý nguyên liệu
      if (quantityDiff > 0) {
        // Tăng số lượng: trừ thêm nguyên liệu
        let item;
        if (orderItem.itemType === 'menu') {
          item = await Menu.findById(orderItem.itemId).populate('items');
        } else {
          item = await Item.findById(orderItem.itemId).populate('ingredients.ingredient');
        }

        if (item) {
          try {
            if (orderItem.itemType === 'item') {
              await deductIngredientsFromStock(item, quantityDiff);
            } else if (orderItem.itemType === 'menu' && item.type === 'combo' && item.items) {
              for (const comboItemId of item.items) {
                const comboItem = await Item.findById(comboItemId).populate('ingredients.ingredient');
                if (comboItem) {
                  await deductIngredientsFromStock(comboItem, quantityDiff);
                }
              }
            }
          } catch (error) {
            console.error(`❌ Lỗi khi trừ nguyên liệu cho OrderItem ${orderItemId}:`, error);
          }
        }
      } else {
        // Giảm số lượng: hoàn nguyên liệu
        const returnQuantity = Math.abs(quantityDiff);
        // Tạo temporary orderItem với quantity mới để hoàn đúng số lượng
        const tempOrderItem = { ...orderItem.toObject(), quantity: returnQuantity };
        await returnIngredientsToStock(tempOrderItem);
      }

      await orderItem.save();
      modifications.push(`Cập nhật: ${orderItem.itemName} từ ${oldQuantity} → ${newQuantity}`);
    }

    // 3. Thêm món (itemsToAdd: [{itemId, type, quantity, note?}])
    if (itemsToAdd.length > 0) {
      const { createdOrderItems, totalAmount: additionalAmount } = await createOrderItemsFromCart(itemsToAdd);

      // Cập nhật orderId cho các OrderItem mới
      await OrderItem.updateMany(
        { _id: { $in: createdOrderItems } },
        { orderId: order._id }
      );

      // Thêm vào order
      order.orderItems.push(...createdOrderItems);
      totalAmountChange += additionalAmount;

      for (const itemData of itemsToAdd) {
        let itemName = "Món";
        if (itemData.type === 'menu') {
          const menu = await Menu.findById(itemData.itemId);
          if (menu) itemName = menu.name;
        } else {
          const item = await Item.findById(itemData.itemId);
          if (item) itemName = item.name;
        }
        modifications.push(`Thêm: ${itemName} x${itemData.quantity}`);
      }
    }

    // Cập nhật totalAmount
    order.totalAmount = Math.max(0, order.totalAmount + totalAmountChange);

    // Reset confirmation flow khi order được modify
    order.waiterResponse.status = 'pending';
    order.waiterResponse.reason = null;
    order.waiterResponse.respondedAt = null;
    order.customerConfirmed = false;

    // Lưu lịch sử
    if (!order.confirmationHistory) {
      order.confirmationHistory = [];
    }
    order.confirmationHistory.push({
      action: "admin_modified_items",
      timestamp: new Date(),
      details: `Admin ${adminId} chỉnh sửa món: ${modifications.join(', ')}`
    });

    await order.save();

    // Cập nhật Payment với totalAmount mới (nếu có)
    const { ensurePaymentIdsSync } = require("../../utils/paymentHelpers");
    await ensurePaymentIdsSync(order);
    if (order.paymentIds && order.paymentIds.length > 0) {
      // Cập nhật totalAmount cho payment đầu tiên (nếu có)
      const firstPayment = await Payment.findById(order.paymentIds[0]);
      if (firstPayment) {
        firstPayment.totalAmount = order.totalAmount;
        await firstPayment.save();
      }
    }

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate("tableId", "tableNumber")
      .populate("userId", "name email phone");

    // Tự động fill itemName từ itemId nếu thiếu
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await fillItemNameForOrderItems(populatedOrder.orderItems);
    }

    // Emit WebSocket event
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "preorder:items_modified", populatedOrder);
      webSocketService.broadcastToAllAdmins("preorder:items_modified", populatedOrder);
    }

    return success(res, populatedOrder, "Đã chỉnh sửa món thành công");
  } catch (err) {
    console.error("Error in modifyPreOrderItems:", err);
    return error(res, err.message);
  }
};

// Admin cập nhật thông tin đơn đặt trước (gán bàn, sửa thời gian)
exports.updatePreOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { tableId, scheduledTime, adminNotes } = req.body;
    const adminId = req.user.id;

    // Tìm order
    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    // Kiểm tra order là preorder
    if (order.status !== "preorder") {
      return error(res, "Chỉ có thể cập nhật đơn đặt trước", 400);
    }

    const changes = [];

    // Cập nhật tableId (nếu có)
    if (tableId !== undefined) {
      if (tableId === null || tableId === "") {
        // Xóa bàn (set tableId = null)
        if (order.tableId) {
          const oldTable = await Table.findById(order.tableId);
          if (oldTable && oldTable.orderNow) {
            oldTable.orderNow = oldTable.orderNow.filter(oid => oid.toString() !== orderId);
            if (oldTable.orderNow.length === 0) {
              oldTable.status = "available";
            }
            await oldTable.save();
          }
          changes.push(`Xóa bàn ${oldTable?.tableNumber || ""}`);
        }
        order.tableId = null;
      } else {
        // Gán bàn mới
        const newTable = await Table.findById(tableId);
        if (!newTable) {
          return error(res, "Bàn không tồn tại", 404);
        }

        // Xử lý bàn cũ (nếu có)
        if (order.tableId && order.tableId.toString() !== tableId) {
          const oldTable = await Table.findById(order.tableId);
          if (oldTable && oldTable.orderNow) {
            oldTable.orderNow = oldTable.orderNow.filter(oid => oid.toString() !== orderId);
            if (oldTable.orderNow.length === 0) {
              oldTable.status = "available";
            }
            await oldTable.save();
          }
          changes.push(`Đổi bàn từ ${oldTable?.tableNumber || ""} sang ${newTable.tableNumber}`);
        } else if (!order.tableId) {
          changes.push(`Gán bàn ${newTable.tableNumber}`);
        }

        order.tableId = new mongoose.Types.ObjectId(tableId);
      }
    }

    // Cập nhật scheduledTime (nếu có)
    if (scheduledTime !== undefined) {
      const newScheduledTime = new Date(scheduledTime);
      if (isNaN(newScheduledTime.getTime())) {
        return error(res, "Thời gian đặt trước không hợp lệ", 400);
      }

      const oldTime = order.scheduledTime ? new Date(order.scheduledTime).toLocaleString("vi-VN") : "Chưa có";
      const newTime = newScheduledTime.toLocaleString("vi-VN");
      changes.push(`Đổi thời gian từ ${oldTime} sang ${newTime}`);

      order.scheduledTime = newScheduledTime;
    }

    // Lưu lịch sử
    if (!order.confirmationHistory) {
      order.confirmationHistory = [];
    }
    if (changes.length > 0) {
      order.confirmationHistory.push({
        action: "admin_updated_preorder",
        timestamp: new Date(),
        details: `Admin ${adminId} cập nhật: ${changes.join(", ")}`
      });
    }

    if (adminNotes) {
      order.confirmationHistory.push({
        action: "admin_note",
        timestamp: new Date(),
        details: `Ghi chú admin: ${adminNotes}`
      });
    }

    await order.save();

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate("tableId", "tableNumber status")
      .populate("userId", "name email phone");

    // Tự động fill itemName từ itemId nếu thiếu
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await fillItemNameForOrderItems(populatedOrder.orderItems);
    }

    // Emit WebSocket event
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      webSocketService.broadcastToOrder(order._id, "preorder:updated", populatedOrder);
      webSocketService.broadcastToAllAdmins("preorder:updated", populatedOrder);
    }

    return success(res, populatedOrder, "Đã cập nhật đơn đặt trước thành công");
  } catch (err) {
    console.error("Error in updatePreOrder:", err);
    return error(res, err.message);
  }
};

// Admin thêm ghi chú cho đơn đặt trước
exports.addAdminNote = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { note } = req.body;
    const adminId = req.user.id;

    if (!note || !note.trim()) {
      return error(res, "Ghi chú không được để trống", 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    if (!order.adminNotes) {
      order.adminNotes = [];
    }

    order.adminNotes.push({
      note: note.trim(),
      createdBy: adminId,
      createdAt: new Date()
    });

    await order.save();

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate("tableId", "tableNumber")
      .populate("userId", "name email phone")
      .populate("adminNotes.createdBy", "name username");

    // Tự động fill itemName từ itemId nếu thiếu
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await fillItemNameForOrderItems(populatedOrder.orderItems);
    }

    return success(res, populatedOrder, "Đã thêm ghi chú thành công");
  } catch (err) {
    console.error("Error in addAdminNote:", err);
    return error(res, err.message);
  }
};

// Admin xóa ghi chú
exports.deleteAdminNote = async (req, res) => {
  try {
    const { orderId, noteId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    if (!order.adminNotes || order.adminNotes.length === 0) {
      return error(res, "Không có ghi chú nào", 404);
    }

    // Tìm và xóa note
    const noteIndex = order.adminNotes.findIndex(n => n._id.toString() === noteId);
    if (noteIndex === -1) {
      return error(res, "Không tìm thấy ghi chú", 404);
    }

    order.adminNotes.splice(noteIndex, 1);
    await order.save();

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate("tableId", "tableNumber")
      .populate("userId", "name email phone")
      .populate("adminNotes.createdBy", "name username");

    // Tự động fill itemName từ itemId nếu thiếu
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await fillItemNameForOrderItems(populatedOrder.orderItems);
    }

    return success(res, populatedOrder, "Đã xóa ghi chú thành công");
  } catch (err) {
    console.error("Error in deleteAdminNote:", err);
    return error(res, err.message);
  }
};

// Admin cập nhật ghi chú
exports.updateAdminNote = async (req, res) => {
  try {
    const { orderId, noteId } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return error(res, "Ghi chú không được để trống", 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    if (!order.adminNotes || order.adminNotes.length === 0) {
      return error(res, "Không có ghi chú nào", 404);
    }

    // Tìm và cập nhật note
    const noteToUpdate = order.adminNotes.find(n => n._id.toString() === noteId);
    if (!noteToUpdate) {
      return error(res, "Không tìm thấy ghi chú", 404);
    }

    noteToUpdate.note = note.trim();
    noteToUpdate.updatedAt = new Date();
    await order.save();

    // Populate để trả về thông tin đầy đủ
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate("tableId", "tableNumber")
      .populate("userId", "name email phone")
      .populate("adminNotes.createdBy", "name username");

    // Tự động fill itemName từ itemId nếu thiếu
    if (populatedOrder.orderItems && populatedOrder.orderItems.length > 0) {
      await fillItemNameForOrderItems(populatedOrder.orderItems);
    }

    return success(res, populatedOrder, "Đã cập nhật ghi chú thành công");
  } catch (err) {
    console.error("Error in updateAdminNote:", err);
    return error(res, err.message);
  }
};

// Admin xuất dữ liệu đơn đặt trước ra Excel
exports.exportPreOrders = async (req, res) => {
  try {
    const {
      waiterResponseStatus,
      fromDate,
      toDate,
      minAmount,
      maxAmount,
      format = "xlsx"
    } = req.query;

    // Build query filter (giống getPreOrders)
    const filter = { status: "preorder" };

    if (waiterResponseStatus) {
      filter["waiterResponse.status"] = waiterResponseStatus;
    }

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const toDateEnd = new Date(toDate);
        toDateEnd.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDateEnd;
      }
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      filter.totalAmount = {};
      if (minAmount !== undefined) {
        filter.totalAmount.$gte = parseFloat(minAmount);
      }
      if (maxAmount !== undefined) {
        filter.totalAmount.$lte = parseFloat(maxAmount);
      }
    }

    // Lấy orders
    const orders = await Order.find(filter)
      .populate({
        path: "userId",
        select: "name email phone",
      })
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .sort({ createdAt: -1 });

    // Tự động fill itemName từ itemId nếu thiếu
    for (const order of orders) {
      if (order.orderItems && order.orderItems.length > 0) {
        await fillItemNameForOrderItems(order.orderItems);
      }
    }

    // Tạo workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Đơn đặt trước");

    // Định nghĩa columns
    worksheet.columns = [
      { header: "Mã đơn", key: "orderId", width: 15 },
      { header: "Tên khách hàng", key: "customerName", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Số điện thoại", key: "phone", width: 15 },
      { header: "Thời gian đặt", key: "createdAt", width: 20 },
      { header: "Thời gian đến ăn", key: "scheduledTime", width: 20 },
      { header: "Tổng tiền", key: "totalAmount", width: 15 },
      { header: "Trạng thái waiter", key: "waiterStatus", width: 15 },
      { header: "Danh sách món", key: "items", width: 50 },
    ];

    // Style cho header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Format date helper
    const formatDate = (date) => {
      if (!date) return "";
      const d = new Date(date);
      return d.toLocaleString("vi-VN");
    };

    // Format currency helper
    const formatCurrency = (amount) => {
      if (!amount) return "0";
      return new Intl.NumberFormat("vi-VN").format(amount);
    };

    // Thêm dữ liệu
    for (const order of orders) {
      const customer = order.userId || {};
      const itemsList = (order.orderItems || [])
        .map((item) => `${item.itemName} x${item.quantity}`)
        .join(", ");

      const waiterStatusLabels = {
        pending: "Chờ xác nhận",
        approved: "Đã xác nhận",
        rejected: "Đã từ chối",
      };

      worksheet.addRow({
        orderId: String(order._id).slice(-8),
        customerName: customer.name || "Khách ẩn danh",
        email: customer.email || "",
        phone: customer.phone || "",
        createdAt: formatDate(order.createdAt),
        scheduledTime: formatDate(order.scheduledTime),
        totalAmount: formatCurrency(order.totalAmount),
        waiterStatus: waiterStatusLabels[order.waiterResponse?.status] || "Chờ xác nhận",
        items: itemsList,
      });
    }

    // Set response headers
    const fileName = `don-dat-truoc-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error in exportPreOrders:", err);
    return error(res, err.message);
  }
};

// Admin bulk approve/cancel nhiều đơn đặt trước
exports.bulkActionPreOrders = async (req, res) => {
  try {
    const { orderIds, action, tableId, reason, adminNotes } = req.body;
    const adminId = req.user.id;

    // Validate
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return error(res, "Danh sách đơn hàng không được để trống", 400);
    }

    if (!["approve", "cancel"].includes(action)) {
      return error(res, "Hành động không hợp lệ. Chỉ hỗ trợ 'approve' hoặc 'cancel'", 400);
    }

    if (action === "approve" && !tableId) {
      return error(res, "Cần chọn bàn khi approve", 400);
    }

    // Note: adminNotes không bắt buộc cho cancel action

    // Validate table (nếu approve)
    let table = null;
    if (action === "approve") {
      table = await Table.findById(tableId);
      if (!table) {
        return error(res, "Bàn không tồn tại", 404);
      }
    }

    const results = {
      success: [],
      failed: []
    };

    // Xử lý từng order
    for (const orderId of orderIds) {
      try {
        const order = await Order.findById(orderId);
        if (!order) {
          results.failed.push({ orderId, error: "Không tìm thấy đơn hàng" });
          continue;
        }

        if (order.status !== "preorder") {
          results.failed.push({ orderId, error: "Chỉ có thể xử lý đơn đặt trước" });
          continue;
        }

        if (order.waiterResponse.status !== "pending") {
          results.failed.push({ orderId, error: "Đơn hàng đã được phản hồi trước đó" });
          continue;
        }

        if (action === "approve") {
          // Approve logic (tương tự approvePreOrder)
          order.tableId = new mongoose.Types.ObjectId(tableId);
          order.waiterResponse.status = "approved";
          order.waiterResponse.reason = null;
          order.waiterResponse.respondedAt = new Date();

          // Admin approve → tự động confirm luôn (không cần chờ customer)
          order.status = "confirmed";
          order.customerConfirmed = true;

          const { splitLargeOrderItems } = require("../../utils/customerHelpers");
          await splitLargeOrderItems(order._id);
          await order.populate("orderItems");

          table.status = "occupied";
          if (!table.orderNow.includes(order._id)) {
            table.orderNow.push(order._id);
          }
          await table.save();

          if (!order.confirmationHistory) {
            order.confirmationHistory = [];
          }
          order.confirmationHistory.push({
            action: "admin_approved",
            timestamp: new Date(),
            details: `Admin ${adminId} bulk approve và confirm đơn (bàn ${table.tableNumber})`
          });
        } else {
          // Cancel logic (tương tự cancelPreOrder)
          order.status = "cancelled";

          if (!order.confirmationHistory) {
            order.confirmationHistory = [];
          }
          order.confirmationHistory.push({
            action: "admin_cancelled",
            timestamp: new Date(),
            details: `Admin ${adminId} bulk hủy đơn${adminNotes && adminNotes.trim() ? `: ${adminNotes.trim()}` : ""}`
          });

          // Lưu adminNotes vào mảng adminNotes (nếu có)
          if (adminNotes && adminNotes.trim()) {
            if (!order.adminNotes) {
              order.adminNotes = [];
            }
            order.adminNotes.push({
              note: adminNotes.trim(),
              createdBy: new mongoose.Types.ObjectId(adminId),
              createdAt: new Date()
            });
          }

          if (order.tableId) {
            const orderTable = await Table.findById(order.tableId);
            if (orderTable && orderTable.orderNow) {
              orderTable.orderNow = orderTable.orderNow.filter(oid => oid.toString() !== orderId);
              if (orderTable.orderNow.length === 0) {
                orderTable.status = "available";
              }
              await orderTable.save();
            }
          }
        }


        await order.save();
        results.success.push(orderId);
      } catch (err) {
        console.error(`Error processing order ${orderId}:`, err);
        results.failed.push({ orderId, error: err.message });
      }
    }

    // Emit WebSocket events
    const webSocketService = req.app.get("webSocketService");
    if (webSocketService) {
      for (const orderId of results.success) {
        const order = await Order.findById(orderId)
          .populate({
            path: "orderItems",
            select: "itemName itemType quantity price itemId",
          })
          .populate("tableId", "tableNumber")
          .populate("userId", "name email phone");

        // Tự động fill itemName từ itemId nếu thiếu
        if (order.orderItems && order.orderItems.length > 0) {
          await fillItemNameForOrderItems(order.orderItems);
        }

        if (action === "approve") {
          webSocketService.broadcastToOrder(orderId, "order:confirmed", order);
          webSocketService.broadcastToAllKitchen("order:confirmed", order);
          webSocketService.broadcastToAllAdmins("preorder:approved", order);
        } else {
          webSocketService.broadcastToOrder(orderId, "preorder:cancelled", order);
          webSocketService.broadcastToAllAdmins("preorder:cancelled", order);
        }
      }
    }

    return success(res, results, `Đã xử lý ${results.success.length}/${orderIds.length} đơn hàng thành công`);
  } catch (err) {
    console.error("Error in bulkActionPreOrders:", err);
    return error(res, err.message);
  }
};

