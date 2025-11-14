const Order = require("../../models/Order");
const User = require("../../models/User");
const Table = require("../../models/Table");
const Payment = require("../../models/Payment");
const mongoose = require("mongoose");
const { success, error } = require("../../utils/response");

// Helper function: Tự động fill itemName từ itemId nếu thiếu
const fillItemNameForOrderItems = async (orderItems) => {
  if (!orderItems || orderItems.length === 0) return;
  
  const Item = require("../../models/Item");
  const Menu = require("../../models/Menu");
  const OrderItem = require("../../models/OrderItem");
  
  for (const orderItem of orderItems) {
    if ((!orderItem.itemName || orderItem.itemName.trim() === "") && orderItem.itemId) {
      try {
        const item = await Item.findById(orderItem.itemId);
        if (item) {
          orderItem.itemName = item.name;
          await OrderItem.findByIdAndUpdate(orderItem._id, { itemName: item.name });
        } else {
          const menu = await Menu.findById(orderItem.itemId);
          if (menu) {
            orderItem.itemName = menu.name;
            await OrderItem.findByIdAndUpdate(orderItem._id, { itemName: menu.name });
          }
        }
      } catch (err) {
        console.error(`Error filling itemName for OrderItem ${orderItem._id}:`, err);
      }
    }
  }
};

// Lấy lịch sử tất cả orders với filters
exports.getOrdersHistory = async (req, res) => {
  try {
    const {
      search, // Tìm theo mã đơn, tên khách, email, phone
      status, // pending, confirmed, preparing, served, paid, cancelled
      paymentStatus, // paid, unpaid
      orderType, // preorder, regular
      fromDate,
      toDate,
      tableId,
      waiterId, // servedBy từ orderItems
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    // Build query filter
    const filter = {};

    // Filter theo status
    if (status) {
      if (status === "all") {
        // Không filter
      } else {
        filter.status = status;
      }
    }

    // Filter theo orderType (preorder có scheduledTime hoặc status = "preorder", regular không có)
    if (orderType) {
      if (orderType === "preorder") {
        filter.$or = [
          { scheduledTime: { $exists: true, $ne: null } },
          { status: "preorder" }
        ];
      } else if (orderType === "regular") {
        filter.$and = [
          {
            $or: [
              { scheduledTime: { $exists: false } },
              { scheduledTime: null }
            ]
          },
          { status: { $ne: "preorder" } }
        ];
      }
    }

    // Filter theo date range
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

    // Filter theo table
    if (tableId) {
      filter.tableId = tableId;
    }

    // Filter theo waiter (tìm trong orderItems có servedBy)
    if (waiterId) {
      // Sẽ filter sau khi populate orderItems
    }

    // Search: tìm theo mã đơn, tên khách, email, phone
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      
      // Tìm orders có _id match hoặc userId match
      const users = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex }
        ]
      }).select("_id");
      
      const userIds = users.map(u => u._id);
      
      // Tìm orders có _id match (mã đơn)
      const orderIdMatch = mongoose.Types.ObjectId.isValid(search) 
        ? mongoose.Types.ObjectId(search) 
        : null;
      
      filter.$or = [
        { userId: { $in: userIds } }
      ];
      
      if (orderIdMatch) {
        filter.$or.push({ _id: orderIdMatch });
      }
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Query orders (không pagination nếu có filter waiter hoặc paymentStatus)
    const needsFullQuery = waiterId || (paymentStatus && paymentStatus !== "all");
    
    let orders = await Order.find(filter)
      .populate({
        path: "userId",
        select: "name email phone",
      })
      .populate({
        path: "tableId",
        select: "tableNumber",
      })
      .populate({
        path: "orderItems",
        select: "itemName itemType quantity price servedBy assignedChef comboItems",
        populate: [
          {
            path: "servedBy",
            select: "name email",
          },
          {
            path: "assignedChef",
            select: "name email",
          },
          {
            path: "comboItems.servedBy",
            select: "name email",
          },
          {
            path: "comboItems.assignedChef",
            select: "name email",
          }
        ]
      })
      .populate({
        path: "paymentIds",
        select: "amountPaid status paymentMethod createdAt payTime isDeposit",
      })
      .sort(sortOptions);

    // Filter theo waiter sau khi populate
    if (waiterId) {
      orders = orders.filter(order => {
        if (!order.orderItems || order.orderItems.length === 0) return false;
        // Kiểm tra trong orderItems
        const hasWaiterInItems = order.orderItems.some(item => 
          item.servedBy && item.servedBy._id.toString() === waiterId
        );
        // Kiểm tra trong comboItems
        const hasWaiterInComboItems = order.orderItems.some(item => 
          item.comboItems && item.comboItems.some(comboItem =>
            comboItem.servedBy && comboItem.servedBy._id.toString() === waiterId
          )
        );
        return hasWaiterInItems || hasWaiterInComboItems;
      });
    }

    // Tính tổng tiền đã thanh toán và fill itemName
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
              console.log(`✅ [getOrdersHistory] Đã tính lại và cập nhật totalAmount=${calculatedTotal} cho order ${order._id}`);
            } catch (err) {
              console.error(`❌ [getOrdersHistory] Lỗi khi cập nhật totalAmount cho order ${order._id}:`, err);
            }
          }
        }
      }
      
      // Tính tổng tiền đã thanh toán
      if (order.paymentIds && Array.isArray(order.paymentIds) && order.paymentIds.length > 0) {
        const totalPaid = order.paymentIds
          .filter(p => p.status === "paid" && p.amountPaid > 0)
          .reduce((sum, p) => sum + (p.amountPaid || 0), 0);
        order.totalPaid = totalPaid;
        order.remainingAmount = (order.totalAmount || 0) - totalPaid;
      } else {
        order.totalPaid = 0;
        order.remainingAmount = order.totalAmount || 0;
      }

      // Xác định payment status
      if (order.status === "paid") {
        order.paymentStatus = "paid";
      } else if (order.totalPaid > 0 && order.remainingAmount > 0) {
        order.paymentStatus = "partial";
      } else if (order.totalPaid > 0) {
        order.paymentStatus = "paid";
      } else {
        order.paymentStatus = "unpaid";
      }

      // Xác định order type: preorder nếu có scheduledTime (không null) hoặc status = "preorder"
      // Ưu tiên kiểm tra status trước (đơn giản và chính xác nhất)
      if (order.status === "preorder") {
        order.isPreOrder = true;
      } else {
        // Nếu không phải status "preorder", kiểm tra scheduledTime
        const hasScheduledTime = order.scheduledTime !== null && 
                                  order.scheduledTime !== undefined &&
                                  order.scheduledTime !== '';
        order.isPreOrder = hasScheduledTime;
      }
      
      // Debug log để kiểm tra
      if (order.status === "preorder" && !order.isPreOrder) {
        console.log(`⚠️ Order ${order._id} has status="preorder" but isPreOrder=false. scheduledTime:`, order.scheduledTime);
      }

      // Lấy danh sách waiters đã phục vụ (từ orderItems)
      const waiters = new Set();
      if (order.orderItems && order.orderItems.length > 0) {
        order.orderItems.forEach(item => {
          if (item.servedBy) {
            waiters.add(item.servedBy._id.toString());
          }
          // Kiểm tra comboItems
          if (item.comboItems && item.comboItems.length > 0) {
            item.comboItems.forEach(comboItem => {
              if (comboItem.servedBy) {
                waiters.add(comboItem.servedBy._id.toString());
              }
            });
          }
        });
      }
      order.servedBy = Array.from(waiters).map(id => {
        const item = order.orderItems.find(oi => 
          oi.servedBy && oi.servedBy._id.toString() === id
        );
        return item ? item.servedBy : null;
      }).filter(Boolean);
    }

    // Filter theo paymentStatus sau khi tính toán
    if (paymentStatus && paymentStatus !== "all") {
      if (paymentStatus === "paid") {
        orders = orders.filter(o => o.paymentStatus === "paid");
      } else if (paymentStatus === "unpaid") {
        orders = orders.filter(o => o.paymentStatus === "unpaid");
      } else if (paymentStatus === "partial") {
        orders = orders.filter(o => o.paymentStatus === "partial");
      }
    }

    // Count total trước khi pagination
    const total = orders.length;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    orders = orders.slice(skip, skip + parseInt(limit));

    return success(res, {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("Error in getOrdersHistory:", err);
    return error(res, err.message);
  }
};

