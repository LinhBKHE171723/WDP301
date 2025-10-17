const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Item = require("../models/Item");
const Table = require("../models/Table");
const User = require("../models/User");
exports.getConfirmedOrders = async (req, res) => {
  try {
    // 1. Chỉ lấy các order có trạng thái là 'confirmed'
    // 2. Populate các thông tin cần thiết cho KDS:
    //    - orderItems: để biết có những món nào và trạng thái từng món
    //    - tableId: để biết order này của bàn nào
    const orders = await Order.find({ status: "confirm" })
      .populate({
        path: "orderItems",
        // Populate chi tiết Item (tên món ăn)
        populate: {
          path: "itemId",
          select: "name price", // Chỉ lấy tên và giá món ăn từ Item model
        },
        select: "quantity note status assignedChef", // Chọn các trường từ OrderItem model
      })
      .populate("tableId", "number") // Chỉ lấy số bàn từ Table model
      .sort({ createdAt: 1 }); // Sắp xếp order cũ nhất lên đầu

    const formattedOrders = orders.map((order) => {
      // Tính toán tổng số món CHƯA xong (pending/preparing)
      const pendingItems = order.orderItems.filter(
        (oi) => oi.status === "pending" || oi.status === "preparing"
      ).length;

      return {
        _id: order._id,
        tableNumber: order.tableId ? order.tableId.number : "N/A", // Số bàn
        createdAt: order.createdAt, // Thời gian đặt order
        status: order.status, // Trạng thái của Order (confirmed)
        totalItems: order.orderItems.length,
        itemsRemaining: pendingItems, // Số món còn phải làm
        items: order.orderItems.map((orderItem) => ({
          orderItemId: orderItem._id,
          itemName: orderItem.itemId ? orderItem.itemId.name : "Món đã xóa",
          quantity: orderItem.quantity,
          note: orderItem.note,
          status: orderItem.status, // Trạng thái của món (pending, preparing, ready, served)
          assignedChef: orderItem.assignedChef,
        })),
      };
    });

    res.status(200).json({
      message: "Lấy danh sách order confirmed thành công",
      data: formattedOrders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi Server khi lấy danh sách order confirmed",
      error: error.message,
    });
  }
};

exports.startPreparingOrder = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy Order" });
    }

    if (order.status !== "confirmed") {
      return res.status(400).json({
        message:
          "Order không ở trạng thái 'confirmed'. Bếp chỉ có thể bắt đầu làm các order đã được xác nhận.",
      });
    }

    // 1. Cập nhật trạng thái Order từ 'confirmed' sang 'preparing'
    order.status = "preparing";
    await order.save();

    // 2. Cập nhật trạng thái tất cả OrderItem của Order này sang 'preparing'
    await OrderItem.updateMany(
      { _id: { $in: order.orderItems }, status: "pending" }, // Chỉ update các item đang 'pending'
      { $set: { status: "preparing" } }
    );

    // Lấy lại order đã update để trả về cho client
    const updatedOrder = await Order.findById(orderId)
      .populate({
        path: "orderItems",
        populate: { path: "itemId", select: "name" },
      })
      .populate("tableId", "number");

    res.status(200).json({
      message: `Order ID: ${orderId} đã được chuyển sang trạng thái 'preparing' và các món đã sẵn sàng để chế biến.`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi Server khi bắt đầu chế biến Order",
      error: error.message,
    });
  }
};

exports.assignChefToItem = async (req, res) => {
  const { orderItemId } = req.params;
  const { chefId } = req.body; // ID của đầu bếp được phân công

  try {
    // 1. Kiểm tra OrderItem có tồn tại không
    const orderItem = await OrderItem.findById(orderItemId);
    if (!orderItem) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy món trong Order" });
    }

    // 2. Kiểm tra chefId có hợp lệ và là vai trò Bếp không (Optional, nhưng nên có)
    const chefToAssign = await User.findById(chefId);
    if (
      !chefToAssign ||
      !["chef", "kitchen_manager"].includes(chefToAssign.role)
    ) {
      return res.status(400).json({
        message: "ID người dùng không hợp lệ hoặc không phải là vai trò bếp.",
      });
    }

    // 3. Kiểm tra trạng thái: Chỉ phân công các món chưa hoàn thành
    if (orderItem.status === "ready" || orderItem.status === "served") {
      return res.status(400).json({
        message: `Món đã hoàn thành/phục vụ và không thể phân công lại.`,
      });
    }

    // 4. Cập nhật assignedChef và chuyển trạng thái sang 'preparing' nếu đang là 'pending'
    orderItem.assignedChef = chefId;
    if (orderItem.status === "pending") {
      orderItem.status = "preparing";
      // Lưu ý: Việc chuyển Order thành 'preparing' thường do bếp trưởng làm,
      // nhưng việc gán món cho đầu bếp cũng ám chỉ món đó đang được làm.
    }
    await orderItem.save();

    // Lấy lại OrderItem với thông tin chef đã populate để phản hồi
    const populatedItem = await OrderItem.findById(orderItemId)
      .populate("assignedChef", "name username")
      .populate("itemId", "name");

    // Emit WebSocket event để cập nhật real-time
    const order = await Order.findById(orderItem.orderId)
      .populate("orderItems")
      .populate("tableId", "tableNumber");
    const io = req.app.get("io");
    if (io) {
      io.to(`order-${orderItem.orderId}`).emit("order-updated", order);
    }

    res.status(200).json({
      message: `Món '${populatedItem.itemId.name}' đã được phân công cho ${chefToAssign.name}.`,
      data: populatedItem,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi Server khi phân công món",
      error: error.message,
    });
  }
};

exports.getMyPreparingItems = async (req, res) => {
  // Lấy ID của chef đang đăng nhập từ middleware
  const myChefId = req.user.id;

  try {
    const preparingItems = await OrderItem.find({
      assignedChef: myChefId,
      status: "preparing",
    })
      .populate("itemId", "name") // Lấy tên món
      .populate("orderId", "tableId createdAt") // Lấy thông tin order (cần cho KDS)
      .populate({
        path: "orderId",
        populate: {
          path: "tableId",
          select: "number", // Lấy số bàn
        },
      })
      .sort({ "orderId.createdAt": 1 }); // Sắp xếp theo thời gian order

    // Xử lý dữ liệu để trả về format gọn hơn
    const formattedItems = preparingItems.map((item) => ({
      orderItemId: item._id,
      orderId: item.orderId._id,
      tableNumber: item.orderId.tableId ? item.orderId.tableId.number : "N/A",
      itemName: item.itemId ? item.itemId.name : "Món đã xóa",
      quantity: item.quantity,
      note: item.note,
      assignedChef: item.assignedChef,
      status: item.status,
      orderedAt: item.orderId.createdAt,
    }));

    res.status(200).json({
      message: `Danh sách ${formattedItems.length} món bạn đang chế biến.`,
      data: formattedItems,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi Server khi lấy danh sách món đang chế biến.",
      error: error.message,
    });
  }
};

exports.getOrderDetails = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId)
      .populate("tableId", "tableNumber") // Lấy số bàn từ Table
      .populate("servedBy", "name username") // Lấy tên nhân viên phục vụ
      .populate("userId", "name phone") // Lấy thông tin khách hàng (nếu có)
      .populate({
        path: "orderItems",
        // Lồng ghép 1: Lấy thông tin món ăn từ Item
        populate: [
          {
            path: "itemId",
            select: "name category price", // Tên, loại, giá món ăn
          },
          // Lồng ghép 2: Lấy thông tin Chef được phân công từ User
          {
            path: "assignedChef",
            select: "name username", // Tên và username của Chef
          },
        ],
        select: "quantity note status createdAt", // Số lượng, ghi chú, trạng thái của OrderItem
      });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy Order" });
    }

    // Tính toán nhanh tổng quan trạng thái
    const totalItems = order.orderItems.length;
    const itemsPending = order.orderItems.filter(
      (i) => i.status === "pending" || i.status === "preparing"
    ).length;

    res.status(200).json({
      message: "Lấy chi tiết Order thành công",
      data: {
        orderId: order._id,
        status: order.status,
        // Thông tin Bàn
        tableNumber: order.tableId ? order.tableId.tableNumber : "N/A",
        // Thông tin Nhân viên
        servedBy: order.servedBy ? order.servedBy.name : "Chưa gán",
        // Thông tin Khách hàng (Nếu có)
        customerName: order.userId ? order.userId.name : "Khách vãng lai",

        totalAmount: order.totalAmount,
        createdAt: order.createdAt,

        itemSummary: {
          total: totalItems,
          remainingToCook: itemsPending,
        },

        // Danh sách chi tiết món ăn (OrderItem List)
        orderItems: order.orderItems.map((item) => ({
          orderItemId: item._id,
          itemName: item.itemId ? item.itemId.name : "Món đã bị xóa",
          itemCategory: item.itemId ? item.itemId.category : "N/A",
          quantity: item.quantity,
          note: item.note,
          status: item.status,
          // THÔNG TIN BẾP VÀ TRẠNG THÁI
          assignedChef: item.assignedChef
            ? item.assignedChef.name
            : "Chưa phân công",
          isReady: item.status === "ready",
          isServed: item.status === "served",
        })),
      },
    });
  } catch (error) {
    console.error(error);
    if (error.name === "CastError") {
      return res.status(400).json({ message: "ID Order không hợp lệ." });
    }
    res.status(500).json({
      message: "Lỗi Server khi lấy chi tiết Order",
      error: error.message,
    });
  }
};

exports.markItemReady = async (req, res) => {
  const { orderItemId } = req.params;

  try {
    const orderItem = await OrderItem.findById(orderItemId);

    if (!orderItem) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy món ăn (OrderItem)." });
    }

    // 1. Kiểm tra trạng thái hiện tại
    if (orderItem.status !== "preparing") {
      return res.status(400).json({
        message: `Món ăn phải ở trạng thái 'preparing' mới có thể chuyển sang 'ready'. Trạng thái hiện tại: ${orderItem.status}.`,
      });
    }

    // 2. Cập nhật trạng thái
    orderItem.status = "ready";
    await orderItem.save();

    // 3. (Tùy chọn) Kiểm tra và cập nhật trạng thái Order tổng thể
    // Khi tất cả OrderItem của Order đó đều là 'ready' hoặc 'served',
    // Order tổng thể có thể được xem xét chuyển sang 'ready'
    const order = await Order.findById(orderItem.orderId).populate(
      "orderItems"
    );

    const allItemsReadyOrServed = order.orderItems.every(
      (item) => item.status === "ready" || item.status === "served"
    );

    if (allItemsReadyOrServed && order.status === "preparing") {
      order.status = "ready";
      await order.save();
    }

    const populatedItem = await OrderItem.findById(orderItemId).populate(
      "itemId",
      "name"
    );

    // Emit WebSocket event để cập nhật real-time
    const fullOrder = await Order.findById(order._id)
      .populate("orderItems")
      .populate("tableId", "tableNumber");
    const io = req.app.get("io");
    if (io) {
      io.to(`order-${order._id}`).emit("order-updated", fullOrder);
    }

    res.status(200).json({
      message: `Món '${populatedItem.itemId.name}' đã hoàn thành và sẵn sàng phục vụ.`,
      data: {
        orderItemId: orderItem._id,
        status: orderItem.status,
        orderStatus: order.status,
      },
    });
  } catch (error) {
    console.error(error);
    if (error.name === "CastError") {
      return res.status(400).json({ message: "ID OrderItem không hợp lệ." });
    }
    res.status(500).json({
      message: "Lỗi Server khi đánh dấu món hoàn thành",
      error: error.message,
    });
  }
};
