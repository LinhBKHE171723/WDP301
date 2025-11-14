const Order = require("../../models/Order");
const User = require("../../models/User");
const Table = require("../../models/Table");
const Payment = require("../../models/Payment");
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const { success, error } = require("../../utils/response");
const { classifyCustomer } = require("../../utils/customerClassification");
const { addPaymentToOrder, ensurePaymentIdsSync } = require("../../utils/paymentHelpers");
const { getLargeOrderThreshold } = require("../../utils/preorderHelpers");

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
      sortOrder = "desc", // "asc", "desc"
      filterBy = "createdAt" // "createdAt" hoặc "scheduledTime"
    } = req.query;

    // Build query filter
    const filter = {};
    
    // Preorder được nhận diện bởi scheduledTime (không phụ thuộc status)
    // Vì sau khi approve, status chuyển thành "confirmed" nhưng vẫn là preorder
    // Nên luôn filter theo scheduledTime tồn tại
    filter.scheduledTime = { $exists: true, $ne: null };
    
    // Filter theo waiterResponseStatus
    if (waiterResponseStatus) {
      if (waiterResponseStatus === "approved") {
        // Đơn đã approved → có thể đã chuyển sang confirmed/preparing/served
        // Với đơn đã chuyển status, vẫn có waiterResponse.status = "approved" từ khi approve
        filter["waiterResponse.status"] = "approved";
        // Không filter status vì có thể là preorder, confirmed, preparing, hoặc served
      } else {
        // Đơn pending hoặc rejected → chỉ lấy status = "preorder"
        filter.status = "preorder";
        filter["waiterResponse.status"] = waiterResponseStatus;
      }
    }
    // Không filter waiterResponseStatus → lấy tất cả preorders
    // Chỉ cần có scheduledTime là đủ để xác định là preorder

    // Filter theo khoảng thời gian
    // Nếu filterBy=scheduledTime → filter theo scheduledTime (ngày khách đến)
    // Ngược lại → filter theo createdAt (ngày tạo đơn)
    if (fromDate || toDate) {
      const dateField = filterBy === "scheduledTime" ? "scheduledTime" : "createdAt";
      
      filter[dateField] = {};
      if (fromDate) {
        filter[dateField].$gte = new Date(fromDate);
      }
      if (toDate) {
        // Thêm 1 ngày để bao gồm cả ngày toDate
        const toDateEnd = new Date(toDate);
        toDateEnd.setHours(23, 59, 59, 999);
        filter[dateField].$lte = toDateEnd;
      }
    }

    // Filter theo khoảng giá trị
    if (minAmount !== undefined && minAmount !== null && minAmount !== "") {
      if (!filter.totalAmount) filter.totalAmount = {};
      filter.totalAmount.$gte = parseFloat(minAmount);
    }
    if (maxAmount !== undefined && maxAmount !== null && maxAmount !== "") {
      if (!filter.totalAmount) filter.totalAmount = {};
      filter.totalAmount.$lte = parseFloat(maxAmount);
    }

    // Filter theo role để tránh trùng lặp
    // Admin chỉ thấy đơn lớn, Cashier chỉ thấy đơn nhỏ
    const { role } = req.user;
    let threshold;
    try {
      threshold = await getLargeOrderThreshold();
    } catch (thresholdError) {
      console.error("❌ Error getting threshold:", thresholdError);
      threshold = 2000000; // Default threshold
    }
    
    console.log(`👤 User role: ${role}, Threshold: ${threshold}`);
    
    if (role === "admin") {
      // Admin chỉ thấy đơn lớn (> threshold)
      if (filter.totalAmount && Object.keys(filter.totalAmount).length > 0) {
        // Nếu đã có filter, merge logic
        const existingGte = filter.totalAmount.$gte;
        const existingLte = filter.totalAmount.$lte;
        
        // Xóa các filter cũ
        delete filter.totalAmount.$gte;
        delete filter.totalAmount.$lte;
        delete filter.totalAmount.$gt;
        
        // Đảm bảo đơn lớn hơn threshold
        filter.totalAmount.$gt = threshold;
        
        // Nếu có minAmount từ query và lớn hơn threshold, giữ giá trị đó
        if (existingGte !== undefined && !isNaN(existingGte) && existingGte > threshold) {
          filter.totalAmount.$gte = existingGte;
        }
        
        // Nếu có maxAmount từ query, chỉ giữ nếu lớn hơn threshold
        if (existingLte !== undefined && !isNaN(existingLte) && existingLte > threshold) {
          filter.totalAmount.$lte = existingLte;
        }
      } else {
        filter.totalAmount = { $gt: threshold };
      }
      console.log(`🔍 Admin filter - totalAmount > ${threshold}`, JSON.stringify(filter.totalAmount));
    } else if (role === "cashier") {
      // Cashier chỉ thấy đơn nhỏ (<= threshold)
      if (filter.totalAmount) {
        const existingLte = filter.totalAmount.$lte;
        const existingGte = filter.totalAmount.$gte;
        // Đảm bảo đơn nhỏ hơn hoặc bằng threshold
        filter.totalAmount.$lte = threshold;
        // Nếu có maxAmount từ query và nhỏ hơn threshold, dùng giá trị đó
        if (existingLte !== undefined && existingLte < threshold) {
          filter.totalAmount.$lte = existingLte;
        }
        // Xóa $gt nếu có vì cashier chỉ xem đơn nhỏ
        if (filter.totalAmount.$gt !== undefined) {
          delete filter.totalAmount.$gt;
        }
        // Đảm bảo không có $gte lớn hơn threshold
        if (existingGte !== undefined && existingGte > threshold) {
          delete filter.totalAmount.$gte;
        }
      } else {
        filter.totalAmount = { $lte: threshold };
      }
      console.log(`🔍 Cashier filter - totalAmount <= ${threshold}`);
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

    // Debug log để kiểm tra filter (safe serialization)
    try {
      const filterForLog = JSON.parse(JSON.stringify(filter, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }));
      console.log("🔍 PreOrder filter:", JSON.stringify(filterForLog, null, 2));
    } catch (logErr) {
      console.log("🔍 PreOrder filter (raw):", filter);
    }
    
    // Debug: Kiểm tra có bao nhiêu đơn có scheduledTime (không filter)
    const allPreOrdersCount = await Order.countDocuments({ scheduledTime: { $exists: true, $ne: null } });
    console.log(`📊 Total preorders (with scheduledTime): ${allPreOrdersCount}`);
    
    // Debug: Kiểm tra có bao nhiêu đơn match filter (trước khi populate)
    const countBeforePopulate = await Order.countDocuments(filter);
    console.log(`📊 Orders matching filter (before populate): ${countBeforePopulate}`);
    
    const orders = await Order.find(filter)
      .populate({
        path: "userId",
        select: "name email phone",
      })
      .populate({
        path: "tableId",
        select: "tableNumber",
      }) // Backward compatibility
      .populate({
        path: "tableIds",
        select: "tableNumber",
      }) // Nhiều bàn
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price itemId",
      })
      .populate({
        path: "paymentIds",
        select: "amountPaid status paymentMethod createdAt payTime isDeposit",
      })
      .sort(sortOptions);
    
    console.log(`📊 Found ${orders.length} orders matching filter`);

    // Tự động fill itemName từ itemId nếu thiếu và tính tổng tiền đã thanh toán
    for (const order of orders) {
      if (order.orderItems && order.orderItems.length > 0) {
        await fillItemNameForOrderItems(order.orderItems);
        
        // ✅ Tính lại totalAmount từ orderItems nếu totalAmount không có hoặc bằng 0
        if (!order.totalAmount || order.totalAmount <= 0 || isNaN(order.totalAmount)) {
          const calculatedTotal = order.orderItems.reduce((sum, item) => {
            const price = item.price || 0;
            const quantity = item.quantity || 0;
            return sum + (price * quantity);
          }, 0);
          
          if (calculatedTotal > 0) {
            order.totalAmount = calculatedTotal;
            // Cập nhật vào database để lần sau không phải tính lại
            try {
              await Order.findByIdAndUpdate(order._id, { totalAmount: calculatedTotal }, { new: true });
              console.log(`✅ [getPreOrders] Đã tính lại và cập nhật totalAmount=${calculatedTotal} cho order ${order._id}`);
            } catch (err) {
              console.error(`❌ [getPreOrders] Lỗi khi cập nhật totalAmount cho order ${order._id}:`, err);
            }
          }
        }
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
    console.error("❌ Error in getPreOrders:", err);
    console.error("❌ Error stack:", err.stack);
    return error(res, err.message || "Lỗi khi lấy danh sách đơn đặt trước");
  }
};

// Lấy thông tin nguyên liệu cần thiết cho pre-order
exports.getPreOrderIngredients = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return error(res, "orderId là bắt buộc", 400);
    }

    const { calculatePreOrderIngredients } = require("../../utils/preorderHelpers");
    const result = await calculatePreOrderIngredients(orderId);

    return success(res, result, "Lấy thông tin nguyên liệu thành công");
  } catch (err) {
    console.error("Error in getPreOrderIngredients:", err);
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
        
        // ✅ Tính lại totalAmount từ orderItems nếu totalAmount không có hoặc bằng 0
        if (!order.totalAmount || order.totalAmount <= 0 || isNaN(order.totalAmount)) {
          const calculatedTotal = order.orderItems.reduce((sum, item) => {
            const price = item.price || 0;
            const quantity = item.quantity || 0;
            return sum + (price * quantity);
          }, 0);
          
          if (calculatedTotal > 0) {
            order.totalAmount = calculatedTotal;
            // Cập nhật vào database để lần sau không phải tính lại
            try {
              await Order.findByIdAndUpdate(order._id, { totalAmount: calculatedTotal }, { new: true });
              console.log(`✅ [getCustomerInfo] Đã tính lại và cập nhật totalAmount=${calculatedTotal} cho order ${order._id}`);
            } catch (err) {
              console.error(`❌ [getCustomerInfo] Lỗi khi cập nhật totalAmount cho order ${order._id}:`, err);
            }
          }
        }
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
    const { tableId, tableIds, adminNotes, preparationStartTime, reservedEndTime, forceApprove } = req.body; // Hỗ trợ cả tableId (backward) và tableIds (mới)
    
    // Validate thời gian
    if (preparationStartTime && reservedEndTime) {
      const prepStart = new Date(preparationStartTime);
      const reservedEnd = new Date(reservedEndTime);
      if (isNaN(prepStart.getTime()) || isNaN(reservedEnd.getTime())) {
        return error(res, "Thời gian không hợp lệ", 400);
      }
      if (reservedEnd <= prepStart) {
        return error(res, "Thời gian kết thúc phải sau thời gian bắt đầu chuẩn bị", 400);
      }
    }
    const adminId = req.user.id; // Lấy từ middleware auth

    // Tìm order (dùng let để có thể reload sau khi splitLargeOrderItems)
    let order = await Order.findById(orderId);
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

    // Xử lý tableIds: ưu tiên tableIds[], fallback về tableId (backward compatibility)
    console.log(`🔍 Debug approvePreOrder: orderId=${orderId}, tableIds=`, tableIds, `(type: ${typeof tableIds}, isArray: ${Array.isArray(tableIds)}), tableId=`, tableId);
    
    let finalTableIds = [];
    if (tableIds) {
      // Xử lý cả trường hợp tableIds là string (comma-separated) hoặc array
      if (typeof tableIds === 'string') {
        // Nếu là string, split bằng dấu phẩy
        finalTableIds = tableIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
        console.log(`🔍 Debug: tableIds is string, split by comma =`, finalTableIds);
      } else if (Array.isArray(tableIds) && tableIds.length > 0) {
        // Filter out null, undefined, empty string, và convert tất cả thành string
        finalTableIds = tableIds
          .filter(id => id != null && id !== "" && id !== undefined)
          .map(id => {
            // Nếu là ObjectId, convert thành string; nếu đã là string, giữ nguyên
            if (id && typeof id === 'object' && id.toString) {
              return id.toString();
            }
            return String(id).trim();
          })
          .filter(id => id.length > 0);
        console.log(`🔍 Debug: tableIds from request (array) =`, tableIds, `→ filtered =`, finalTableIds);
      }
    }
    
    // Fallback về tableId nếu finalTableIds vẫn rỗng
    if (finalTableIds.length === 0 && tableId) {
      // Xử lý cả trường hợp tableId là array hoặc string
      if (Array.isArray(tableId)) {
        // Nếu là array, xử lý tương tự như tableIds
        finalTableIds = tableId
          .filter(id => id != null && id !== "" && id !== undefined)
          .map(id => {
            if (id && typeof id === 'object' && id.toString) {
              return id.toString();
            }
            return String(id).trim();
          })
          .filter(id => id.length > 0);
        console.log(`🔍 Debug: using tableId (array) =`, finalTableIds);
      } else if (typeof tableId === 'string') {
        // Nếu là string, có thể là comma-separated hoặc single ID
        const splitIds = tableId.split(',').map(id => id.trim()).filter(id => id.length > 0);
        finalTableIds = splitIds;
        console.log(`🔍 Debug: using tableId (string, split by comma) =`, finalTableIds);
      } else {
        // Single value (ObjectId hoặc string)
        finalTableIds = [String(tableId).trim()];
        console.log(`🔍 Debug: using tableId (single) =`, finalTableIds);
      }
    } else if (finalTableIds.length === 0 && order.tableIds && order.tableIds.length > 0) {
      finalTableIds = order.tableIds.map(id => id.toString()).filter(id => id != null && id !== ""); // Sử dụng bàn hiện có
      console.log(`🔍 Debug: using order.tableIds =`, finalTableIds);
    } else if (finalTableIds.length === 0 && order.tableId) {
      finalTableIds = [order.tableId.toString()]; // Fallback về tableId cũ
      console.log(`🔍 Debug: using order.tableId (fallback) =`, finalTableIds);
    }

    // Validate table selection
    if (finalTableIds.length === 0) {
      return error(res, "Cần chọn ít nhất 1 bàn khi xác nhận", 400);
    }

    console.log(`🔍 Debug: finalTableIds (before conversion) =`, finalTableIds, `(types:`, finalTableIds.map(id => typeof id).join(", "), `)`);

    // Convert finalTableIds thành ObjectId để query MongoDB
    const finalTableIdsObjectIds = [];
    const invalidIds = [];
    for (const id of finalTableIds) {
      if (!id || id === "" || id === null || id === undefined) {
        invalidIds.push(`"${id}" (empty/null)`);
        continue;
      }
      try {
        // Ensure it's a string before converting
        const idString = String(id).trim();
        if (idString.length === 0) {
          invalidIds.push(`"${id}" (empty after trim)`);
          continue;
        }
        // Check if it's a valid ObjectId format
        if (!mongoose.Types.ObjectId.isValid(idString)) {
          invalidIds.push(`"${idString}" (invalid ObjectId format)`);
          continue;
        }
        const objectId = new mongoose.Types.ObjectId(idString);
        finalTableIdsObjectIds.push(objectId);
      } catch (err) {
        console.error(`❌ Invalid tableId format: ${id} (type: ${typeof id})`, err);
        invalidIds.push(`"${id}" (${err.message})`);
      }
    }

    if (invalidIds.length > 0) {
      console.error(`❌ Invalid table IDs:`, invalidIds);
      return error(res, `Một hoặc nhiều bàn có ID không hợp lệ: ${invalidIds.join(", ")}`, 400);
    }

    if (finalTableIdsObjectIds.length === 0) {
      return error(res, "Không có bàn hợp lệ nào được chọn", 400);
    }

    console.log(`✅ Debug: finalTableIdsObjectIds (after conversion) =`, finalTableIdsObjectIds.map(id => id.toString()));

    // Validate tất cả các bàn tồn tại
    const tables = await Table.find({ _id: { $in: finalTableIdsObjectIds } });
    if (tables.length !== finalTableIdsObjectIds.length) {
      return error(res, "Một hoặc nhiều bàn không tồn tại", 404);
    }

    // Lưu oldTableIds để cleanup sau
    const oldTableIds = order.tableIds && order.tableIds.length > 0 
      ? order.tableIds.map(id => id.toString())
      : (order.tableId ? [order.tableId.toString()] : []);

    // Kiểm tra trùng bàn trước khi approve (chỉ khi có thời gian chuẩn bị và kết thúc)
    if (preparationStartTime && reservedEndTime) {
      const prepStart = new Date(preparationStartTime);
      const reservedEnd = new Date(reservedEndTime);
      
      // Tìm các preorder khác đã được gán cùng bàn (trong tableIds) và có thời gian trùng lấn
      // Check cả tableId và tableIds
      const overlappingOrders = await Order.find({
        _id: { $ne: orderId }, // Bỏ qua đơn hiện tại
        scheduledTime: { $exists: true, $ne: null }, // Chỉ kiểm tra preorders
        $and: [
          {
            $or: [
              { status: "preorder" },
              { "waiterResponse.status": "approved" } // Bao gồm cả đơn đã approve
            ]
          },
          {
            $or: [
              { tableId: { $in: finalTableIdsObjectIds } }, // Check tableId
              { tableIds: { $in: finalTableIdsObjectIds } } // Check tableIds
            ]
          }
        ]
      }).populate("tableId", "tableNumber").populate("tableIds", "tableNumber").populate("userId", "name email phone");
      
      // Kiểm tra overlap với từng đơn và từng bàn
      const conflicts = [];
      for (const otherOrder of overlappingOrders) {
        // Lấy danh sách bàn của đơn khác
        const otherTableIds = [];
        if (otherOrder.tableIds && otherOrder.tableIds.length > 0) {
          otherTableIds.push(...otherOrder.tableIds.map(t => t._id?.toString() || t.toString()));
        } else if (otherOrder.tableId) {
          otherTableIds.push(otherOrder.tableId._id?.toString() || otherOrder.tableId.toString());
        }
        
        // Kiểm tra xem có bàn nào trùng không
        const commonTables = finalTableIds.filter(tid => otherTableIds.includes(tid));
        if (commonTables.length === 0) continue; // Không có bàn trùng, bỏ qua
        
        let hasConflict = false;
        
        if (otherOrder.reservedEndTime) {
          // Đơn đã có reservedEndTime → kiểm tra overlap chính xác
          const otherStart = otherOrder.preparationStartTime 
            ? new Date(otherOrder.preparationStartTime) 
            : new Date(otherOrder.scheduledTime);
          const otherEnd = new Date(otherOrder.reservedEndTime);
          
          // Overlap: prepStart < otherEnd && otherStart < reservedEnd
          if (prepStart < otherEnd && otherStart < reservedEnd) {
            hasConflict = true;
          }
        } else if (otherOrder.scheduledTime) {
          // Đơn chưa có reservedEndTime → kiểm tra scheduledTime trong vòng 2 giờ
          const otherTime = new Date(otherOrder.scheduledTime);
          const timeDiff = Math.abs(prepStart.getTime() - otherTime.getTime());
          const twoHours = 2 * 60 * 60 * 1000;
          if (timeDiff < twoHours) {
            hasConflict = true;
          }
        }
        
        if (hasConflict) {
          // Lấy tên các bàn trùng
          const commonTableNumbers = commonTables.map(tid => {
            const table = tables.find(t => t._id.toString() === tid);
            return table ? `Bàn ${table.tableNumber}` : tid;
          }).join(", ");
          
          conflicts.push({
            orderId: otherOrder._id,
            customerName: otherOrder.userId?.name || "Khách vãng lai",
            tableNumbers: commonTableNumbers,
            scheduledTime: otherOrder.scheduledTime,
            preparationStartTime: otherOrder.preparationStartTime,
            reservedEndTime: otherOrder.reservedEndTime
          });
        }
      }
      
      // Nếu có conflict và admin chưa force approve, trả về cảnh báo
      if (conflicts.length > 0 && !forceApprove) {
        const conflictDetails = conflicts.map(c => 
          `Mã đơn: ${String(c.orderId).slice(-8)}, Khách: ${c.customerName}, Bàn trùng: ${c.tableNumbers}`
        ).join("; ");
        return error(res, `Các bàn đã được đặt trước trong khoảng thời gian này. Các đơn trùng: ${conflictDetails}`, 400);
      }
      
      // Nếu có conflict nhưng admin force approve, log cảnh báo nhưng vẫn tiếp tục
      if (conflicts.length > 0 && forceApprove) {
        console.warn(`⚠️ Admin force approve preorder ${orderId} despite conflicts:`, conflicts);
      }
    }

    // Cập nhật tableIds cho order (sử dụng finalTableIdsObjectIds đã convert)
    order.tableIds = finalTableIdsObjectIds;
    // tableId sẽ được tự động sync = tableIds[0] bởi middleware

    // 🧹 Xử lý bàn cũ: xóa order khỏi các bàn không còn được sử dụng
    const tablesToRemove = oldTableIds.filter(oldId => !finalTableIds.includes(oldId));
    for (const oldTableId of tablesToRemove) {
      const oldTable = await Table.findById(oldTableId);
      if (oldTable && oldTable.orderNow) {
        oldTable.orderNow = oldTable.orderNow.filter(oid => oid.toString() !== orderId);
        if (oldTable.orderNow.length === 0) {
          oldTable.status = "available";
        }
        await oldTable.save();
        console.log(`🧹 Đã xóa order khỏi bàn cũ: ${oldTable.tableNumber}`);
      }
    }

    // Lưu các thay đổi cần apply vào order (trước khi splitLargeOrderItems)
    const orderUpdates = {
      waiterResponse: {
        status: "approved",
        reason: null,
        respondedAt: new Date()
      },
      status: "confirmed",
      customerConfirmed: true
    };
    
    // Lưu thời gian chuẩn bị và kết thúc dành bàn
    if (preparationStartTime) {
      orderUpdates.preparationStartTime = new Date(preparationStartTime);
    }
    if (reservedEndTime) {
      orderUpdates.reservedEndTime = new Date(reservedEndTime);
    }

    // Gọi splitLargeOrderItems để chia OrderItem lớn thành nhiều OrderItem nhỏ hơn
    const { splitLargeOrderItems } = require("../../utils/customerHelpers");
    const splitCount = await splitLargeOrderItems(order._id);
    if (splitCount > 0) {
      console.log(`✅ Đã chia ${splitCount} OrderItem lớn thành nhiều OrderItem nhỏ hơn sau khi admin approve`);
    }

    // ⚠️ QUAN TRỌNG: Reload order sau khi splitLargeOrderItems vì nó đã save order (tăng version)
    // Nếu không reload, sẽ bị VersionError khi save lại
    order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng sau khi chia OrderItem", 404);
    }

    // Apply lại các thay đổi đã lưu
    order.tableIds = finalTableIdsObjectIds; // Cập nhật lại tableIds
    order.waiterResponse.status = orderUpdates.waiterResponse.status;
    order.waiterResponse.reason = orderUpdates.waiterResponse.reason;
    order.waiterResponse.respondedAt = orderUpdates.waiterResponse.respondedAt;
    order.status = orderUpdates.status;
    order.customerConfirmed = orderUpdates.customerConfirmed;
    if (orderUpdates.preparationStartTime) {
      order.preparationStartTime = orderUpdates.preparationStartTime;
    }
    if (orderUpdates.reservedEndTime) {
      order.reservedEndTime = orderUpdates.reservedEndTime;
    }

    // Reload order sau khi chia để có OrderItem mới
    await order.populate("orderItems");

    // Trừ nguyên liệu từ kho khi approve pre-order
    const { deductIngredientsFromStock } = require("../../utils/customerHelpers");
    const OrderItem = require("../../models/OrderItem");
    const Item = require("../../models/Item");
    const Menu = require("../../models/Menu");
    
    try {
      // Populate orderItems với itemId để lấy thông tin món
      const populatedOrderItems = await OrderItem.find({ _id: { $in: order.orderItems } })
        .populate("itemId");
      
      for (const orderItem of populatedOrderItems) {
        try {
          let item;
          
          // Lấy item hoặc menu tùy theo itemType
          if (orderItem.itemType === 'item') {
            item = await Item.findById(orderItem.itemId).populate('ingredients.ingredient');
          } else if (orderItem.itemType === 'menu') {
            item = await Menu.findById(orderItem.itemId).populate('items');
          }
          
          if (item) {
            // Trừ nguyên liệu cho món đơn
            if (orderItem.itemType === 'item') {
              await deductIngredientsFromStock(item, orderItem.quantity);
            } 
            // Trừ nguyên liệu cho combo
            else if (orderItem.itemType === 'menu' && item.type === 'combo' && item.items && item.items.length > 0) {
              for (const comboItemId of item.items) {
                const comboItem = await Item.findById(comboItemId).populate('ingredients.ingredient');
                if (comboItem) {
                  await deductIngredientsFromStock(comboItem, orderItem.quantity);
                }
              }
            }
          }
        } catch (error) {
          console.error(`❌ Lỗi khi trừ nguyên liệu cho OrderItem ${orderItem._id} khi approve pre-order:`, error);
          // Không throw error để không làm gián đoạn quá trình approve
        }
      }
      
      console.log(`✅ Đã trừ nguyên liệu từ kho cho pre-order ${orderId} sau khi admin approve`);
    } catch (error) {
      console.error(`❌ Lỗi khi trừ nguyên liệu cho pre-order ${orderId}:`, error);
      // Không throw error để không làm gián đoạn quá trình approve
      // Admin có thể kiểm tra lại sau
    }

    // ✅ Thêm order vào các bàn mới
    const tableNumbers = [];
    for (const table of tables) {
      table.status = "occupied";
      if (!table.orderNow.some(oid => oid.toString() === order._id.toString())) {
        table.orderNow.push(order._id);
      }
      await table.save();
      tableNumbers.push(table.tableNumber);
      console.log(`✅ Đã thêm order vào bàn: ${table.tableNumber}`);
    }

    // Lưu lịch sử
    if (!order.confirmationHistory) {
      order.confirmationHistory = [];
    }
    order.confirmationHistory.push({
      action: "admin_approved",
      timestamp: new Date(),
      details: `Admin ${adminId} approve và confirm đơn (${tableNumbers.length} bàn: ${tableNumbers.join(", ")})`
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
      .populate("tableId", "tableNumber status") // Backward compatibility
      .populate("tableIds", "tableNumber status") // Nhiều bàn
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

    // Tìm order (dùng let để có thể reload sau khi splitLargeOrderItems)
    let order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    // Cho phép hủy đơn đặt trước (preorder) hoặc đơn đã được approve (waiterResponse.status === "approved")
    // Đơn đã approve có thể có status là "preorder", "confirmed", hoặc "preparing"
    const isPreOrder = order.status === "preorder";
    const isApprovedPreOrder = order.waiterResponse?.status === "approved" && 
                               (order.status === "preorder" || order.status === "confirmed" || order.status === "preparing");
    
    if (!isPreOrder && !isApprovedPreOrder) {
      return error(res, "Chỉ có thể hủy đơn đặt trước hoặc đơn đã được chấp nhận", 400);
    }

    // Chuyển status → "cancelled"
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

    // Xử lý bàn nếu có (xử lý cả tableId và tableIds - merged tables)
    const { cleanupTablesForOrder } = require("../utils/customerHelpers");
    await cleanupTablesForOrder(order, orderId);

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

    // Tìm order (dùng let để có thể reload sau khi splitLargeOrderItems)
    let order = await Order.findById(orderId);
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

    // Tìm order (dùng let để có thể reload sau khi splitLargeOrderItems)
    let order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    // Cho phép sửa đơn đặt trước (preorder) hoặc đơn đã được approve (waiterResponse.status === "approved")
    const isPreOrder = order.status === "preorder";
    const isApprovedPreOrder = order.waiterResponse?.status === "approved" && 
                               (order.status === "preorder" || order.status === "confirmed" || order.status === "preparing");
    
    if (!isPreOrder && !isApprovedPreOrder) {
      return error(res, "Chỉ có thể chỉnh sửa đơn đặt trước hoặc đơn đã được chấp nhận", 400);
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
    const { tableId, tableIds, scheduledTime, adminNotes, forceUpdate } = req.body; // Hỗ trợ cả tableId (backward) và tableIds (mới), forceUpdate để bỏ qua conflict
    const adminId = req.user.id;

    // Tìm order (dùng let để có thể reload sau khi splitLargeOrderItems)
    let order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    // Cho phép cập nhật đơn đặt trước (preorder) hoặc đơn đã được approve (waiterResponse.status === "approved")
    const isPreOrder = order.status === "preorder";
    const isApprovedPreOrder = order.waiterResponse?.status === "approved" && 
                               (order.status === "preorder" || order.status === "confirmed" || order.status === "preparing");
    
    if (!isPreOrder && !isApprovedPreOrder) {
      return error(res, "Chỉ có thể cập nhật đơn đặt trước hoặc đơn đã được chấp nhận", 400);
    }

    const changes = [];
    let finalTableIdsObjectIds = []; // Khai báo ở ngoài để dùng cho validation conflict

    // Xử lý tableIds: ưu tiên tableIds[], fallback về tableId (backward compatibility)
    let finalTableIds = [];
    if (tableIds !== undefined) {
      // Xử lý cả trường hợp tableIds là string (comma-separated) hoặc array
      if (typeof tableIds === 'string') {
        finalTableIds = tableIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
      } else if (Array.isArray(tableIds) && tableIds.length > 0) {
        finalTableIds = tableIds
          .filter(id => id != null && id !== "" && id !== undefined)
          .map(id => {
            if (id && typeof id === 'object' && id.toString) {
              return id.toString();
            }
            return String(id).trim();
          })
          .filter(id => id.length > 0);
      } else if (tableIds === null || tableIds === "") {
        // Xóa tất cả bàn
        finalTableIds = [];
      }
    } else if (tableId !== undefined) {
      // Fallback về tableId nếu không có tableIds
      if (tableId === null || tableId === "") {
        // Xóa tất cả bàn
        finalTableIds = [];
      } else if (Array.isArray(tableId)) {
        finalTableIds = tableId
          .filter(id => id != null && id !== "" && id !== undefined)
          .map(id => String(id).trim())
          .filter(id => id.length > 0);
      } else if (typeof tableId === 'string') {
        const splitIds = tableId.split(',').map(id => id.trim()).filter(id => id.length > 0);
        finalTableIds = splitIds;
      } else {
        finalTableIds = [String(tableId).trim()];
      }
    }

    // Cập nhật tableIds (nếu có thay đổi)
    if (tableIds !== undefined || tableId !== undefined) {
      // Lấy danh sách bàn cũ để so sánh
      const oldTableIds = (order.tableIds && order.tableIds.length > 0)
        ? order.tableIds.map(id => id.toString())
        : (order.tableId ? [order.tableId.toString()] : []);

      // Xóa order khỏi các bàn cũ không còn được sử dụng
      const tablesToRemove = oldTableIds.filter(oldId => !finalTableIds.includes(oldId));
      for (const oldTableId of tablesToRemove) {
        const oldTable = await Table.findById(oldTableId);
        if (oldTable && oldTable.orderNow) {
          oldTable.orderNow = oldTable.orderNow.filter(oid => oid.toString() !== orderId);
          if (oldTable.orderNow.length === 0) {
            oldTable.status = "available";
          }
          await oldTable.save();
        }
      }

      // Validate và convert finalTableIds thành ObjectId
      if (finalTableIds.length > 0) {
        const invalidIds = [];
        finalTableIdsObjectIds = []; // Reset array
        for (const id of finalTableIds) {
          if (!id || id === "" || id === null || id === undefined) {
            invalidIds.push(`"${id}" (empty/null)`);
            continue;
          }
          try {
            const idString = String(id).trim();
            if (idString.length === 0) {
              invalidIds.push(`"${id}" (empty after trim)`);
              continue;
            }
            if (!mongoose.Types.ObjectId.isValid(idString)) {
              invalidIds.push(`"${idString}" (invalid ObjectId format)`);
              continue;
            }
            const objectId = new mongoose.Types.ObjectId(idString);
            finalTableIdsObjectIds.push(objectId);
          } catch (err) {
            console.error(`❌ Invalid tableId format: ${id}`, err);
            invalidIds.push(`"${id}" (${err.message})`);
          }
        }

        if (invalidIds.length > 0) {
          return error(res, `Một hoặc nhiều bàn có ID không hợp lệ: ${invalidIds.join(", ")}`, 400);
        }

        // Validate tất cả các bàn tồn tại
        const tables = await Table.find({ _id: { $in: finalTableIdsObjectIds } });
        if (tables.length !== finalTableIdsObjectIds.length) {
          return error(res, "Một hoặc nhiều bàn không tồn tại", 404);
        }

        // Cập nhật tableIds
        order.tableIds = finalTableIdsObjectIds;
        // tableId sẽ được tự động sync = tableIds[0] bởi middleware

        // Thêm order vào các bàn mới
        const tableNumbers = [];
        for (const table of tables) {
          table.status = "occupied";
          if (!table.orderNow.some(oid => oid.toString() === order._id.toString())) {
            table.orderNow.push(order._id);
          }
          await table.save();
          tableNumbers.push(table.tableNumber);
        }

        if (tableNumbers.length > 0) {
          if (oldTableIds.length === 0) {
            changes.push(`Gán bàn: ${tableNumbers.join(", ")}`);
          } else {
            // Lấy số bàn cũ
            const oldTables = await Table.find({ _id: { $in: oldTableIds.map(id => new mongoose.Types.ObjectId(id)) } });
            const oldTableNumbers = oldTables.map(t => t.tableNumber);
            if (oldTableNumbers.sort().join(",") !== tableNumbers.sort().join(",")) {
              changes.push(`Cập nhật bàn từ ${oldTableNumbers.join(", ")} sang ${tableNumbers.join(", ")}`);
            }
          }
        }
      } else {
        // Xóa tất cả bàn
        order.tableIds = [];
        order.tableId = null;
        changes.push("Xóa tất cả bàn");
      }
    }

    // Cập nhật scheduledTime (nếu có)
    if (scheduledTime !== undefined) {
      const newScheduledTime = new Date(scheduledTime);
      if (isNaN(newScheduledTime.getTime())) {
        return error(res, "Thời gian đặt trước không hợp lệ", 400);
      }

      // Validate: thời gian không được trong quá khứ (cho phép ít nhất 1 giờ trước)
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      if (newScheduledTime < oneHourFromNow) {
        return error(res, "Thời gian đặt trước phải ít nhất 1 giờ từ bây giờ", 400);
      }

      const oldTime = order.scheduledTime ? new Date(order.scheduledTime).toLocaleString("vi-VN") : "Chưa có";
      const newTime = newScheduledTime.toLocaleString("vi-VN");
      changes.push(`Đổi thời gian từ ${oldTime} sang ${newTime}`);

      order.scheduledTime = newScheduledTime;
    }

    // Kiểm tra trùng bàn và thời gian với các đơn khác (nếu có thay đổi bàn hoặc thời gian)
    if ((tableIds !== undefined || tableId !== undefined || scheduledTime !== undefined)) {
      // Sử dụng scheduledTime mới nếu có, nếu không dùng scheduledTime hiện tại
      const checkScheduledTime = scheduledTime !== undefined ? new Date(scheduledTime) : (order.scheduledTime ? new Date(order.scheduledTime) : null);
      
      if (checkScheduledTime) {
        // Lấy bàn để kiểm tra conflict
        let checkTableIdsObjectIds = [];
        if (tableIds !== undefined || tableId !== undefined) {
          // Nếu đã có finalTableIdsObjectIds (từ phần xử lý tableIds ở trên), dùng nó
          if (finalTableIdsObjectIds.length > 0) {
            checkTableIdsObjectIds = finalTableIdsObjectIds;
          } else {
            // Nếu không có (trường hợp xóa bàn), không cần check conflict
            checkTableIdsObjectIds = [];
          }
        } else {
          // Không thay đổi bàn, dùng bàn hiện tại
          if (order.tableIds && order.tableIds.length > 0) {
            checkTableIdsObjectIds = order.tableIds;
          } else if (order.tableId) {
            checkTableIdsObjectIds = [order.tableId];
          }
        }

        if (checkTableIdsObjectIds.length > 0) {
          // Tìm các preorder khác đã được gán cùng bàn và có thời gian trùng lấn
          const overlappingOrders = await Order.find({
            _id: { $ne: orderId }, // Bỏ qua đơn hiện tại
            scheduledTime: { $exists: true, $ne: null },
            $and: [
              {
                $or: [
                  { status: "preorder" },
                  { "waiterResponse.status": "approved" } // Bao gồm cả đơn đã approve
                ]
              },
              {
                $or: [
                  { tableId: { $in: checkTableIdsObjectIds } }, // Check tableId
                  { tableIds: { $in: checkTableIdsObjectIds } } // Check tableIds
                ]
              }
            ]
          }).populate("tableId", "tableNumber").populate("tableIds", "tableNumber").populate("userId", "name email phone");
          
          // Kiểm tra overlap với từng đơn và từng bàn
          const conflicts = [];
          for (const otherOrder of overlappingOrders) {
            // Lấy danh sách bàn của đơn khác
            const otherTableIds = [];
            if (otherOrder.tableIds && otherOrder.tableIds.length > 0) {
              otherTableIds.push(...otherOrder.tableIds.map(t => t._id?.toString() || t.toString()));
            } else if (otherOrder.tableId) {
              otherTableIds.push(otherOrder.tableId._id?.toString() || otherOrder.tableId.toString());
            }
            
            // Kiểm tra xem có bàn nào trùng không
            const checkTableIdsStr = checkTableIdsObjectIds.map(id => id.toString());
            const commonTables = checkTableIdsStr.filter(tid => otherTableIds.includes(tid));
            if (commonTables.length === 0) continue; // Không có bàn trùng, bỏ qua
            
            let hasConflict = false;
            
            if (otherOrder.reservedEndTime && order.reservedEndTime) {
              // Cả 2 đơn đều có reservedEndTime → kiểm tra overlap chính xác
              const thisStart = order.preparationStartTime 
                ? new Date(order.preparationStartTime) 
                : checkScheduledTime;
              const thisEnd = new Date(order.reservedEndTime);
              const otherStart = otherOrder.preparationStartTime 
                ? new Date(otherOrder.preparationStartTime) 
                : new Date(otherOrder.scheduledTime);
              const otherEnd = new Date(otherOrder.reservedEndTime);
              
              // Overlap: thisStart < otherEnd && otherStart < thisEnd
              if (thisStart < otherEnd && otherStart < thisEnd) {
                hasConflict = true;
              }
            } else {
              // Một trong 2 đơn chưa có reservedEndTime → kiểm tra scheduledTime trong vòng 2 giờ
              const otherTime = new Date(otherOrder.scheduledTime);
              const timeDiff = Math.abs(checkScheduledTime.getTime() - otherTime.getTime());
              const twoHours = 2 * 60 * 60 * 1000;
              if (timeDiff < twoHours) {
                hasConflict = true;
              }
            }
            
            if (hasConflict) {
              // Lấy tên các bàn trùng
              const allTablesForCheck = await Table.find({ _id: { $in: checkTableIdsObjectIds } });
              const commonTableNumbers = commonTables.map(tid => {
                const table = allTablesForCheck.find(t => t._id.toString() === tid);
                return table ? `Bàn ${table.tableNumber}` : tid;
              }).join(", ");
              
              // Lấy tableIds của đơn khác (để frontend có thể so sánh)
              const otherTableIdsArray = [];
              if (otherOrder.tableIds && otherOrder.tableIds.length > 0) {
                otherTableIdsArray.push(...otherOrder.tableIds.map(t => t._id?.toString() || t.toString()));
              } else if (otherOrder.tableId) {
                otherTableIdsArray.push(otherOrder.tableId._id?.toString() || otherOrder.tableId.toString());
              }
              
              conflicts.push({
                orderId: otherOrder._id,
                customerName: otherOrder.userId?.name || "Khách vãng lai",
                tableNumbers: commonTableNumbers, // String để hiển thị
                tableIds: commonTables, // Array of table IDs trùng
                otherTableIds: otherTableIdsArray, // Tất cả tableIds của đơn khác
                scheduledTime: otherOrder.scheduledTime,
                preparationStartTime: otherOrder.preparationStartTime,
                reservedEndTime: otherOrder.reservedEndTime
              });
            }
          }
          
          // Nếu có conflict và chưa force update, trả về cảnh báo với conflicts data
          if (conflicts.length > 0 && !forceUpdate) {
            // Trả về error nhưng kèm theo conflicts data để frontend có thể hiển thị modal
            return res.status(400).json({
              success: false,
              message: `Các bàn đã được đặt trước trong khoảng thời gian này. Các đơn trùng: ${conflicts.map(c => `Mã đơn: ${String(c.orderId).slice(-8)}, Khách: ${c.customerName}, Bàn trùng: ${c.tableNumbers}`).join("; ")}`,
              conflicts: conflicts // Thêm conflicts data để frontend parse
            });
          }
          
          // Nếu có conflict nhưng admin force update, log cảnh báo nhưng vẫn tiếp tục
          if (conflicts.length > 0 && forceUpdate) {
            console.warn(`⚠️ Admin force update preorder ${orderId} despite conflicts:`, conflicts);
          }
        }
      }
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
      .populate("tableId", "tableNumber status") // Backward compatibility
      .populate("tableIds", "tableNumber status") // Nhiều bàn
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

          // Xử lý bàn (xử lý cả tableId và tableIds - merged tables)
          const { cleanupTablesForOrder } = require("../utils/customerHelpers");
          await cleanupTablesForOrder(order, orderId);
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
        
        // ✅ Tính lại totalAmount từ orderItems nếu totalAmount không có hoặc bằng 0
        if (!order.totalAmount || order.totalAmount <= 0 || isNaN(order.totalAmount)) {
          const calculatedTotal = order.orderItems.reduce((sum, item) => {
            const price = item.price || 0;
            const quantity = item.quantity || 0;
            return sum + (price * quantity);
          }, 0);
          
          if (calculatedTotal > 0) {
            order.totalAmount = calculatedTotal;
            // Cập nhật vào database để lần sau không phải tính lại
            try {
              await Order.findByIdAndUpdate(order._id, { totalAmount: calculatedTotal }, { new: true });
              console.log(`✅ [getCustomerInfo] Đã tính lại và cập nhật totalAmount=${calculatedTotal} cho order ${order._id}`);
            } catch (err) {
              console.error(`❌ [getCustomerInfo] Lỗi khi cập nhật totalAmount cho order ${order._id}:`, err);
            }
          }
        }
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
    const { tableId, tableIds, adminNotes, preparationStartTime, reservedEndTime, forceApprove } = req.body; // Hỗ trợ cả tableId (backward) và tableIds (mới)
    
    // Validate thời gian
    if (preparationStartTime && reservedEndTime) {
      const prepStart = new Date(preparationStartTime);
      const reservedEnd = new Date(reservedEndTime);
      if (isNaN(prepStart.getTime()) || isNaN(reservedEnd.getTime())) {
        return error(res, "Thời gian không hợp lệ", 400);
      }
      if (reservedEnd <= prepStart) {
        return error(res, "Thời gian kết thúc phải sau thời gian bắt đầu chuẩn bị", 400);
      }
    }
    const adminId = req.user.id; // Lấy từ middleware auth

    // Tìm order (dùng let để có thể reload sau khi splitLargeOrderItems)
    let order = await Order.findById(orderId);
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

    // Xử lý tableIds: ưu tiên tableIds[], fallback về tableId (backward compatibility)
    console.log(`🔍 Debug approvePreOrder: orderId=${orderId}, tableIds=`, tableIds, `(type: ${typeof tableIds}, isArray: ${Array.isArray(tableIds)}), tableId=`, tableId);
    
    let finalTableIds = [];
    if (tableIds) {
      // Xử lý cả trường hợp tableIds là string (comma-separated) hoặc array
      if (typeof tableIds === 'string') {
        // Nếu là string, split bằng dấu phẩy
        finalTableIds = tableIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
        console.log(`🔍 Debug: tableIds is string, split by comma =`, finalTableIds);
      } else if (Array.isArray(tableIds) && tableIds.length > 0) {
        // Filter out null, undefined, empty string, và convert tất cả thành string
        finalTableIds = tableIds
          .filter(id => id != null && id !== "" && id !== undefined)
          .map(id => {
            // Nếu là ObjectId, convert thành string; nếu đã là string, giữ nguyên
            if (id && typeof id === 'object' && id.toString) {
              return id.toString();
            }
            return String(id).trim();
          })
          .filter(id => id.length > 0);
        console.log(`🔍 Debug: tableIds from request (array) =`, tableIds, `→ filtered =`, finalTableIds);
      }
    }
    
    // Fallback về tableId nếu finalTableIds vẫn rỗng
    if (finalTableIds.length === 0 && tableId) {
      // Xử lý cả trường hợp tableId là array hoặc string
      if (Array.isArray(tableId)) {
        // Nếu là array, xử lý tương tự như tableIds
        finalTableIds = tableId
          .filter(id => id != null && id !== "" && id !== undefined)
          .map(id => {
            if (id && typeof id === 'object' && id.toString) {
              return id.toString();
            }
            return String(id).trim();
          })
          .filter(id => id.length > 0);
        console.log(`🔍 Debug: using tableId (array) =`, finalTableIds);
      } else if (typeof tableId === 'string') {
        // Nếu là string, có thể là comma-separated hoặc single ID
        const splitIds = tableId.split(',').map(id => id.trim()).filter(id => id.length > 0);
        finalTableIds = splitIds;
        console.log(`🔍 Debug: using tableId (string, split by comma) =`, finalTableIds);
      } else {
        // Single value (ObjectId hoặc string)
        finalTableIds = [String(tableId).trim()];
        console.log(`🔍 Debug: using tableId (single) =`, finalTableIds);
      }
    } else if (finalTableIds.length === 0 && order.tableIds && order.tableIds.length > 0) {
      finalTableIds = order.tableIds.map(id => id.toString()).filter(id => id != null && id !== ""); // Sử dụng bàn hiện có
      console.log(`🔍 Debug: using order.tableIds =`, finalTableIds);
    } else if (finalTableIds.length === 0 && order.tableId) {
      finalTableIds = [order.tableId.toString()]; // Fallback về tableId cũ
      console.log(`🔍 Debug: using order.tableId (fallback) =`, finalTableIds);
    }

    // Validate table selection
    if (finalTableIds.length === 0) {
      return error(res, "Cần chọn ít nhất 1 bàn khi xác nhận", 400);
    }

    console.log(`🔍 Debug: finalTableIds (before conversion) =`, finalTableIds, `(types:`, finalTableIds.map(id => typeof id).join(", "), `)`);

    // Convert finalTableIds thành ObjectId để query MongoDB
    const finalTableIdsObjectIds = [];
    const invalidIds = [];
    for (const id of finalTableIds) {
      if (!id || id === "" || id === null || id === undefined) {
        invalidIds.push(`"${id}" (empty/null)`);
        continue;
      }
      try {
        // Ensure it's a string before converting
        const idString = String(id).trim();
        if (idString.length === 0) {
          invalidIds.push(`"${id}" (empty after trim)`);
          continue;
        }
        // Check if it's a valid ObjectId format
        if (!mongoose.Types.ObjectId.isValid(idString)) {
          invalidIds.push(`"${idString}" (invalid ObjectId format)`);
          continue;
        }
        const objectId = new mongoose.Types.ObjectId(idString);
        finalTableIdsObjectIds.push(objectId);
      } catch (err) {
        console.error(`❌ Invalid tableId format: ${id} (type: ${typeof id})`, err);
        invalidIds.push(`"${id}" (${err.message})`);
      }
    }

    if (invalidIds.length > 0) {
      console.error(`❌ Invalid table IDs:`, invalidIds);
      return error(res, `Một hoặc nhiều bàn có ID không hợp lệ: ${invalidIds.join(", ")}`, 400);
    }

    if (finalTableIdsObjectIds.length === 0) {
      return error(res, "Không có bàn hợp lệ nào được chọn", 400);
    }

    console.log(`✅ Debug: finalTableIdsObjectIds (after conversion) =`, finalTableIdsObjectIds.map(id => id.toString()));

    // Validate tất cả các bàn tồn tại
    const tables = await Table.find({ _id: { $in: finalTableIdsObjectIds } });
    if (tables.length !== finalTableIdsObjectIds.length) {
      return error(res, "Một hoặc nhiều bàn không tồn tại", 404);
    }

    // Lưu oldTableIds để cleanup sau
    const oldTableIds = order.tableIds && order.tableIds.length > 0 
      ? order.tableIds.map(id => id.toString())
      : (order.tableId ? [order.tableId.toString()] : []);

    // Kiểm tra trùng bàn trước khi approve (chỉ khi có thời gian chuẩn bị và kết thúc)
    if (preparationStartTime && reservedEndTime) {
      const prepStart = new Date(preparationStartTime);
      const reservedEnd = new Date(reservedEndTime);
      
      // Tìm các preorder khác đã được gán cùng bàn (trong tableIds) và có thời gian trùng lấn
      // Check cả tableId và tableIds
      const overlappingOrders = await Order.find({
        _id: { $ne: orderId }, // Bỏ qua đơn hiện tại
        scheduledTime: { $exists: true, $ne: null }, // Chỉ kiểm tra preorders
        $and: [
          {
            $or: [
              { status: "preorder" },
              { "waiterResponse.status": "approved" } // Bao gồm cả đơn đã approve
            ]
          },
          {
            $or: [
              { tableId: { $in: finalTableIdsObjectIds } }, // Check tableId
              { tableIds: { $in: finalTableIdsObjectIds } } // Check tableIds
            ]
          }
        ]
      }).populate("tableId", "tableNumber").populate("tableIds", "tableNumber").populate("userId", "name email phone");
      
      // Kiểm tra overlap với từng đơn và từng bàn
      const conflicts = [];
      for (const otherOrder of overlappingOrders) {
        // Lấy danh sách bàn của đơn khác
        const otherTableIds = [];
        if (otherOrder.tableIds && otherOrder.tableIds.length > 0) {
          otherTableIds.push(...otherOrder.tableIds.map(t => t._id?.toString() || t.toString()));
        } else if (otherOrder.tableId) {
          otherTableIds.push(otherOrder.tableId._id?.toString() || otherOrder.tableId.toString());
        }
        
        // Kiểm tra xem có bàn nào trùng không
        const commonTables = finalTableIds.filter(tid => otherTableIds.includes(tid));
        if (commonTables.length === 0) continue; // Không có bàn trùng, bỏ qua
        
        let hasConflict = false;
        
        if (otherOrder.reservedEndTime) {
          // Đơn đã có reservedEndTime → kiểm tra overlap chính xác
          const otherStart = otherOrder.preparationStartTime 
            ? new Date(otherOrder.preparationStartTime) 
            : new Date(otherOrder.scheduledTime);
          const otherEnd = new Date(otherOrder.reservedEndTime);
          
          // Overlap: prepStart < otherEnd && otherStart < reservedEnd
          if (prepStart < otherEnd && otherStart < reservedEnd) {
            hasConflict = true;
          }
        } else if (otherOrder.scheduledTime) {
          // Đơn chưa có reservedEndTime → kiểm tra scheduledTime trong vòng 2 giờ
          const otherTime = new Date(otherOrder.scheduledTime);
          const timeDiff = Math.abs(prepStart.getTime() - otherTime.getTime());
          const twoHours = 2 * 60 * 60 * 1000;
          if (timeDiff < twoHours) {
            hasConflict = true;
          }
        }
        
        if (hasConflict) {
          // Lấy tên các bàn trùng
          const commonTableNumbers = commonTables.map(tid => {
            const table = tables.find(t => t._id.toString() === tid);
            return table ? `Bàn ${table.tableNumber}` : tid;
          }).join(", ");
          
          conflicts.push({
            orderId: otherOrder._id,
            customerName: otherOrder.userId?.name || "Khách vãng lai",
            tableNumbers: commonTableNumbers,
            scheduledTime: otherOrder.scheduledTime,
            preparationStartTime: otherOrder.preparationStartTime,
            reservedEndTime: otherOrder.reservedEndTime
          });
        }
      }
      
      // Nếu có conflict và admin chưa force approve, trả về cảnh báo
      if (conflicts.length > 0 && !forceApprove) {
        const conflictDetails = conflicts.map(c => 
          `Mã đơn: ${String(c.orderId).slice(-8)}, Khách: ${c.customerName}, Bàn trùng: ${c.tableNumbers}`
        ).join("; ");
        return error(res, `Các bàn đã được đặt trước trong khoảng thời gian này. Các đơn trùng: ${conflictDetails}`, 400);
      }
      
      // Nếu có conflict nhưng admin force approve, log cảnh báo nhưng vẫn tiếp tục
      if (conflicts.length > 0 && forceApprove) {
        console.warn(`⚠️ Admin force approve preorder ${orderId} despite conflicts:`, conflicts);
      }
    }

    // Cập nhật tableIds cho order (sử dụng finalTableIdsObjectIds đã convert)
    order.tableIds = finalTableIdsObjectIds;
    // tableId sẽ được tự động sync = tableIds[0] bởi middleware

    // 🧹 Xử lý bàn cũ: xóa order khỏi các bàn không còn được sử dụng
    const tablesToRemove = oldTableIds.filter(oldId => !finalTableIds.includes(oldId));
    for (const oldTableId of tablesToRemove) {
      const oldTable = await Table.findById(oldTableId);
      if (oldTable && oldTable.orderNow) {
        oldTable.orderNow = oldTable.orderNow.filter(oid => oid.toString() !== orderId);
        if (oldTable.orderNow.length === 0) {
          oldTable.status = "available";
        }
        await oldTable.save();
        console.log(`🧹 Đã xóa order khỏi bàn cũ: ${oldTable.tableNumber}`);
      }
    }

    // Lưu các thay đổi cần apply vào order (trước khi splitLargeOrderItems)
    const orderUpdates = {
      waiterResponse: {
        status: "approved",
        reason: null,
        respondedAt: new Date()
      },
      status: "confirmed",
      customerConfirmed: true
    };
    
    // Lưu thời gian chuẩn bị và kết thúc dành bàn
    if (preparationStartTime) {
      orderUpdates.preparationStartTime = new Date(preparationStartTime);
    }
    if (reservedEndTime) {
      orderUpdates.reservedEndTime = new Date(reservedEndTime);
    }

    // Gọi splitLargeOrderItems để chia OrderItem lớn thành nhiều OrderItem nhỏ hơn
    const { splitLargeOrderItems } = require("../../utils/customerHelpers");
    const splitCount = await splitLargeOrderItems(order._id);
    if (splitCount > 0) {
      console.log(`✅ Đã chia ${splitCount} OrderItem lớn thành nhiều OrderItem nhỏ hơn sau khi admin approve`);
    }

    // ⚠️ QUAN TRỌNG: Reload order sau khi splitLargeOrderItems vì nó đã save order (tăng version)
    // Nếu không reload, sẽ bị VersionError khi save lại
    order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng sau khi chia OrderItem", 404);
    }

    // Apply lại các thay đổi đã lưu
    order.tableIds = finalTableIdsObjectIds; // Cập nhật lại tableIds
    order.waiterResponse.status = orderUpdates.waiterResponse.status;
    order.waiterResponse.reason = orderUpdates.waiterResponse.reason;
    order.waiterResponse.respondedAt = orderUpdates.waiterResponse.respondedAt;
    order.status = orderUpdates.status;
    order.customerConfirmed = orderUpdates.customerConfirmed;
    if (orderUpdates.preparationStartTime) {
      order.preparationStartTime = orderUpdates.preparationStartTime;
    }
    if (orderUpdates.reservedEndTime) {
      order.reservedEndTime = orderUpdates.reservedEndTime;
    }

    // Reload order sau khi chia để có OrderItem mới
    await order.populate("orderItems");

    // Trừ nguyên liệu từ kho khi approve pre-order
    const { deductIngredientsFromStock } = require("../../utils/customerHelpers");
    const OrderItem = require("../../models/OrderItem");
    const Item = require("../../models/Item");
    const Menu = require("../../models/Menu");
    
    try {
      // Populate orderItems với itemId để lấy thông tin món
      const populatedOrderItems = await OrderItem.find({ _id: { $in: order.orderItems } })
        .populate("itemId");
      
      for (const orderItem of populatedOrderItems) {
        try {
          let item;
          
          // Lấy item hoặc menu tùy theo itemType
          if (orderItem.itemType === 'item') {
            item = await Item.findById(orderItem.itemId).populate('ingredients.ingredient');
          } else if (orderItem.itemType === 'menu') {
            item = await Menu.findById(orderItem.itemId).populate('items');
          }
          
          if (item) {
            // Trừ nguyên liệu cho món đơn
            if (orderItem.itemType === 'item') {
              await deductIngredientsFromStock(item, orderItem.quantity);
            } 
            // Trừ nguyên liệu cho combo
            else if (orderItem.itemType === 'menu' && item.type === 'combo' && item.items && item.items.length > 0) {
              for (const comboItemId of item.items) {
                const comboItem = await Item.findById(comboItemId).populate('ingredients.ingredient');
                if (comboItem) {
                  await deductIngredientsFromStock(comboItem, orderItem.quantity);
                }
              }
            }
          }
        } catch (error) {
          console.error(`❌ Lỗi khi trừ nguyên liệu cho OrderItem ${orderItem._id} khi approve pre-order:`, error);
          // Không throw error để không làm gián đoạn quá trình approve
        }
      }
      
      console.log(`✅ Đã trừ nguyên liệu từ kho cho pre-order ${orderId} sau khi admin approve`);
    } catch (error) {
      console.error(`❌ Lỗi khi trừ nguyên liệu cho pre-order ${orderId}:`, error);
      // Không throw error để không làm gián đoạn quá trình approve
      // Admin có thể kiểm tra lại sau
    }

    // ✅ Thêm order vào các bàn mới
    const tableNumbers = [];
    for (const table of tables) {
      table.status = "occupied";
      if (!table.orderNow.some(oid => oid.toString() === order._id.toString())) {
        table.orderNow.push(order._id);
      }
      await table.save();
      tableNumbers.push(table.tableNumber);
      console.log(`✅ Đã thêm order vào bàn: ${table.tableNumber}`);
    }

    // Lưu lịch sử
    if (!order.confirmationHistory) {
      order.confirmationHistory = [];
    }
    order.confirmationHistory.push({
      action: "admin_approved",
      timestamp: new Date(),
      details: `Admin ${adminId} approve và confirm đơn (${tableNumbers.length} bàn: ${tableNumbers.join(", ")})`
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
      .populate("tableId", "tableNumber status") // Backward compatibility
      .populate("tableIds", "tableNumber status") // Nhiều bàn
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

    // Tìm order (dùng let để có thể reload sau khi splitLargeOrderItems)
    let order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    // Cho phép hủy đơn đặt trước (preorder) hoặc đơn đã được approve (waiterResponse.status === "approved")
    // Đơn đã approve có thể có status là "preorder", "confirmed", hoặc "preparing"
    const isPreOrder = order.status === "preorder";
    const isApprovedPreOrder = order.waiterResponse?.status === "approved" && 
                               (order.status === "preorder" || order.status === "confirmed" || order.status === "preparing");
    
    if (!isPreOrder && !isApprovedPreOrder) {
      return error(res, "Chỉ có thể hủy đơn đặt trước hoặc đơn đã được chấp nhận", 400);
    }

    // Chuyển status → "cancelled"
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

    // Xử lý bàn nếu có (xử lý cả tableId và tableIds - merged tables)
    const { cleanupTablesForOrder } = require("../utils/customerHelpers");
    await cleanupTablesForOrder(order, orderId);

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

    // Tìm order (dùng let để có thể reload sau khi splitLargeOrderItems)
    let order = await Order.findById(orderId);
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

    // Tìm order (dùng let để có thể reload sau khi splitLargeOrderItems)
    let order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    // Cho phép sửa đơn đặt trước (preorder) hoặc đơn đã được approve (waiterResponse.status === "approved")
    const isPreOrder = order.status === "preorder";
    const isApprovedPreOrder = order.waiterResponse?.status === "approved" && 
                               (order.status === "preorder" || order.status === "confirmed" || order.status === "preparing");
    
    if (!isPreOrder && !isApprovedPreOrder) {
      return error(res, "Chỉ có thể chỉnh sửa đơn đặt trước hoặc đơn đã được chấp nhận", 400);
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
    const { tableId, tableIds, scheduledTime, adminNotes, forceUpdate } = req.body; // Hỗ trợ cả tableId (backward) và tableIds (mới), forceUpdate để bỏ qua conflict
    const adminId = req.user.id;

    // Tìm order (dùng let để có thể reload sau khi splitLargeOrderItems)
    let order = await Order.findById(orderId);
    if (!order) {
      return error(res, "Không tìm thấy đơn hàng", 404);
    }

    // Cho phép cập nhật đơn đặt trước (preorder) hoặc đơn đã được approve (waiterResponse.status === "approved")
    const isPreOrder = order.status === "preorder";
    const isApprovedPreOrder = order.waiterResponse?.status === "approved" && 
                               (order.status === "preorder" || order.status === "confirmed" || order.status === "preparing");
    
    if (!isPreOrder && !isApprovedPreOrder) {
      return error(res, "Chỉ có thể cập nhật đơn đặt trước hoặc đơn đã được chấp nhận", 400);
    }

    const changes = [];
    let finalTableIdsObjectIds = []; // Khai báo ở ngoài để dùng cho validation conflict

    // Xử lý tableIds: ưu tiên tableIds[], fallback về tableId (backward compatibility)
    let finalTableIds = [];
    if (tableIds !== undefined) {
      // Xử lý cả trường hợp tableIds là string (comma-separated) hoặc array
      if (typeof tableIds === 'string') {
        finalTableIds = tableIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
      } else if (Array.isArray(tableIds) && tableIds.length > 0) {
        finalTableIds = tableIds
          .filter(id => id != null && id !== "" && id !== undefined)
          .map(id => {
            if (id && typeof id === 'object' && id.toString) {
              return id.toString();
            }
            return String(id).trim();
          })
          .filter(id => id.length > 0);
      } else if (tableIds === null || tableIds === "") {
        // Xóa tất cả bàn
        finalTableIds = [];
      }
    } else if (tableId !== undefined) {
      // Fallback về tableId nếu không có tableIds
      if (tableId === null || tableId === "") {
        // Xóa tất cả bàn
        finalTableIds = [];
      } else if (Array.isArray(tableId)) {
        finalTableIds = tableId
          .filter(id => id != null && id !== "" && id !== undefined)
          .map(id => String(id).trim())
          .filter(id => id.length > 0);
      } else if (typeof tableId === 'string') {
        const splitIds = tableId.split(',').map(id => id.trim()).filter(id => id.length > 0);
        finalTableIds = splitIds;
      } else {
        finalTableIds = [String(tableId).trim()];
      }
    }

    // Cập nhật tableIds (nếu có thay đổi)
    if (tableIds !== undefined || tableId !== undefined) {
      // Lấy danh sách bàn cũ để so sánh
      const oldTableIds = (order.tableIds && order.tableIds.length > 0)
        ? order.tableIds.map(id => id.toString())
        : (order.tableId ? [order.tableId.toString()] : []);

      // Xóa order khỏi các bàn cũ không còn được sử dụng
      const tablesToRemove = oldTableIds.filter(oldId => !finalTableIds.includes(oldId));
      for (const oldTableId of tablesToRemove) {
        const oldTable = await Table.findById(oldTableId);
        if (oldTable && oldTable.orderNow) {
          oldTable.orderNow = oldTable.orderNow.filter(oid => oid.toString() !== orderId);
          if (oldTable.orderNow.length === 0) {
            oldTable.status = "available";
          }
          await oldTable.save();
        }
      }

      // Validate và convert finalTableIds thành ObjectId
      if (finalTableIds.length > 0) {
        const invalidIds = [];
        finalTableIdsObjectIds = []; // Reset array
        for (const id of finalTableIds) {
          if (!id || id === "" || id === null || id === undefined) {
            invalidIds.push(`"${id}" (empty/null)`);
            continue;
          }
          try {
            const idString = String(id).trim();
            if (idString.length === 0) {
              invalidIds.push(`"${id}" (empty after trim)`);
              continue;
            }
            if (!mongoose.Types.ObjectId.isValid(idString)) {
              invalidIds.push(`"${idString}" (invalid ObjectId format)`);
              continue;
            }
            const objectId = new mongoose.Types.ObjectId(idString);
            finalTableIdsObjectIds.push(objectId);
          } catch (err) {
            console.error(`❌ Invalid tableId format: ${id}`, err);
            invalidIds.push(`"${id}" (${err.message})`);
          }
        }

        if (invalidIds.length > 0) {
          return error(res, `Một hoặc nhiều bàn có ID không hợp lệ: ${invalidIds.join(", ")}`, 400);
        }

        // Validate tất cả các bàn tồn tại
        const tables = await Table.find({ _id: { $in: finalTableIdsObjectIds } });
        if (tables.length !== finalTableIdsObjectIds.length) {
          return error(res, "Một hoặc nhiều bàn không tồn tại", 404);
        }

        // Cập nhật tableIds
        order.tableIds = finalTableIdsObjectIds;
        // tableId sẽ được tự động sync = tableIds[0] bởi middleware

        // Thêm order vào các bàn mới
        const tableNumbers = [];
        for (const table of tables) {
          table.status = "occupied";
          if (!table.orderNow.some(oid => oid.toString() === order._id.toString())) {
            table.orderNow.push(order._id);
          }
          await table.save();
          tableNumbers.push(table.tableNumber);
        }

        if (tableNumbers.length > 0) {
          if (oldTableIds.length === 0) {
            changes.push(`Gán bàn: ${tableNumbers.join(", ")}`);
          } else {
            // Lấy số bàn cũ
            const oldTables = await Table.find({ _id: { $in: oldTableIds.map(id => new mongoose.Types.ObjectId(id)) } });
            const oldTableNumbers = oldTables.map(t => t.tableNumber);
            if (oldTableNumbers.sort().join(",") !== tableNumbers.sort().join(",")) {
              changes.push(`Cập nhật bàn từ ${oldTableNumbers.join(", ")} sang ${tableNumbers.join(", ")}`);
            }
          }
        }
      } else {
        // Xóa tất cả bàn
        order.tableIds = [];
        order.tableId = null;
        changes.push("Xóa tất cả bàn");
      }
    }

    // Cập nhật scheduledTime (nếu có)
    if (scheduledTime !== undefined) {
      const newScheduledTime = new Date(scheduledTime);
      if (isNaN(newScheduledTime.getTime())) {
        return error(res, "Thời gian đặt trước không hợp lệ", 400);
      }

      // Validate: thời gian không được trong quá khứ (cho phép ít nhất 1 giờ trước)
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      if (newScheduledTime < oneHourFromNow) {
        return error(res, "Thời gian đặt trước phải ít nhất 1 giờ từ bây giờ", 400);
      }

      const oldTime = order.scheduledTime ? new Date(order.scheduledTime).toLocaleString("vi-VN") : "Chưa có";
      const newTime = newScheduledTime.toLocaleString("vi-VN");
      changes.push(`Đổi thời gian từ ${oldTime} sang ${newTime}`);

      order.scheduledTime = newScheduledTime;
    }

    // Kiểm tra trùng bàn và thời gian với các đơn khác (nếu có thay đổi bàn hoặc thời gian)
    if ((tableIds !== undefined || tableId !== undefined || scheduledTime !== undefined)) {
      // Sử dụng scheduledTime mới nếu có, nếu không dùng scheduledTime hiện tại
      const checkScheduledTime = scheduledTime !== undefined ? new Date(scheduledTime) : (order.scheduledTime ? new Date(order.scheduledTime) : null);
      
      if (checkScheduledTime) {
        // Lấy bàn để kiểm tra conflict
        let checkTableIdsObjectIds = [];
        if (tableIds !== undefined || tableId !== undefined) {
          // Nếu đã có finalTableIdsObjectIds (từ phần xử lý tableIds ở trên), dùng nó
          if (finalTableIdsObjectIds.length > 0) {
            checkTableIdsObjectIds = finalTableIdsObjectIds;
          } else {
            // Nếu không có (trường hợp xóa bàn), không cần check conflict
            checkTableIdsObjectIds = [];
          }
        } else {
          // Không thay đổi bàn, dùng bàn hiện tại
          if (order.tableIds && order.tableIds.length > 0) {
            checkTableIdsObjectIds = order.tableIds;
          } else if (order.tableId) {
            checkTableIdsObjectIds = [order.tableId];
          }
        }

        if (checkTableIdsObjectIds.length > 0) {
          // Tìm các preorder khác đã được gán cùng bàn và có thời gian trùng lấn
          const overlappingOrders = await Order.find({
            _id: { $ne: orderId }, // Bỏ qua đơn hiện tại
            scheduledTime: { $exists: true, $ne: null },
            $and: [
              {
                $or: [
                  { status: "preorder" },
                  { "waiterResponse.status": "approved" } // Bao gồm cả đơn đã approve
                ]
              },
              {
                $or: [
                  { tableId: { $in: checkTableIdsObjectIds } }, // Check tableId
                  { tableIds: { $in: checkTableIdsObjectIds } } // Check tableIds
                ]
              }
            ]
          }).populate("tableId", "tableNumber").populate("tableIds", "tableNumber").populate("userId", "name email phone");
          
          // Kiểm tra overlap với từng đơn và từng bàn
          const conflicts = [];
          for (const otherOrder of overlappingOrders) {
            // Lấy danh sách bàn của đơn khác
            const otherTableIds = [];
            if (otherOrder.tableIds && otherOrder.tableIds.length > 0) {
              otherTableIds.push(...otherOrder.tableIds.map(t => t._id?.toString() || t.toString()));
            } else if (otherOrder.tableId) {
              otherTableIds.push(otherOrder.tableId._id?.toString() || otherOrder.tableId.toString());
            }
            
            // Kiểm tra xem có bàn nào trùng không
            const checkTableIdsStr = checkTableIdsObjectIds.map(id => id.toString());
            const commonTables = checkTableIdsStr.filter(tid => otherTableIds.includes(tid));
            if (commonTables.length === 0) continue; // Không có bàn trùng, bỏ qua
            
            let hasConflict = false;
            
            if (otherOrder.reservedEndTime && order.reservedEndTime) {
              // Cả 2 đơn đều có reservedEndTime → kiểm tra overlap chính xác
              const thisStart = order.preparationStartTime 
                ? new Date(order.preparationStartTime) 
                : checkScheduledTime;
              const thisEnd = new Date(order.reservedEndTime);
              const otherStart = otherOrder.preparationStartTime 
                ? new Date(otherOrder.preparationStartTime) 
                : new Date(otherOrder.scheduledTime);
              const otherEnd = new Date(otherOrder.reservedEndTime);
              
              // Overlap: thisStart < otherEnd && otherStart < thisEnd
              if (thisStart < otherEnd && otherStart < thisEnd) {
                hasConflict = true;
              }
            } else {
              // Một trong 2 đơn chưa có reservedEndTime → kiểm tra scheduledTime trong vòng 2 giờ
              const otherTime = new Date(otherOrder.scheduledTime);
              const timeDiff = Math.abs(checkScheduledTime.getTime() - otherTime.getTime());
              const twoHours = 2 * 60 * 60 * 1000;
              if (timeDiff < twoHours) {
                hasConflict = true;
              }
            }
            
            if (hasConflict) {
              // Lấy tên các bàn trùng
              const allTablesForCheck = await Table.find({ _id: { $in: checkTableIdsObjectIds } });
              const commonTableNumbers = commonTables.map(tid => {
                const table = allTablesForCheck.find(t => t._id.toString() === tid);
                return table ? `Bàn ${table.tableNumber}` : tid;
              }).join(", ");
              
              // Lấy tableIds của đơn khác (để frontend có thể so sánh)
              const otherTableIdsArray = [];
              if (otherOrder.tableIds && otherOrder.tableIds.length > 0) {
                otherTableIdsArray.push(...otherOrder.tableIds.map(t => t._id?.toString() || t.toString()));
              } else if (otherOrder.tableId) {
                otherTableIdsArray.push(otherOrder.tableId._id?.toString() || otherOrder.tableId.toString());
              }
              
              conflicts.push({
                orderId: otherOrder._id,
                customerName: otherOrder.userId?.name || "Khách vãng lai",
                tableNumbers: commonTableNumbers, // String để hiển thị
                tableIds: commonTables, // Array of table IDs trùng
                otherTableIds: otherTableIdsArray, // Tất cả tableIds của đơn khác
                scheduledTime: otherOrder.scheduledTime,
                preparationStartTime: otherOrder.preparationStartTime,
                reservedEndTime: otherOrder.reservedEndTime
              });
            }
          }
          
          // Nếu có conflict và chưa force update, trả về cảnh báo với conflicts data
          if (conflicts.length > 0 && !forceUpdate) {
            // Trả về error nhưng kèm theo conflicts data để frontend có thể hiển thị modal
            return res.status(400).json({
              success: false,
              message: `Các bàn đã được đặt trước trong khoảng thời gian này. Các đơn trùng: ${conflicts.map(c => `Mã đơn: ${String(c.orderId).slice(-8)}, Khách: ${c.customerName}, Bàn trùng: ${c.tableNumbers}`).join("; ")}`,
              conflicts: conflicts // Thêm conflicts data để frontend parse
            });
          }
          
          // Nếu có conflict nhưng admin force update, log cảnh báo nhưng vẫn tiếp tục
          if (conflicts.length > 0 && forceUpdate) {
            console.warn(`⚠️ Admin force update preorder ${orderId} despite conflicts:`, conflicts);
          }
        }
      }
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
      .populate("tableId", "tableNumber status") // Backward compatibility
      .populate("tableIds", "tableNumber status") // Nhiều bàn
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

          // Xử lý bàn (xử lý cả tableId và tableIds - merged tables)
          const { cleanupTablesForOrder } = require("../utils/customerHelpers");
          await cleanupTablesForOrder(order, orderId);
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

