import { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/admin/card";
import { Input } from "../ui/admin/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/admin/dialog";
import { Button } from "../ui/admin/button";
import adminApi from "../../api/adminApi";
import waiterApi from "../../api/waiterApi";
import useAdminWebSocket from "../../hooks/useAdminWebSocket";
import { toast } from "react-toastify";

const formatDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (amount) => {
  if (!amount) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export function PreOrderTable() {
  const [search, setSearch] = useState("");
  const [preorders, setPreorders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openRow, setOpenRow] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [loadingCustomerInfo, setLoadingCustomerInfo] = useState(false);
  
  // Advanced filters
  const [waiterResponseStatus, setWaiterResponseStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);
  
  // Approve/Cancel modals
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedOrderForAction, setSelectedOrderForAction] = useState(null);
  const [availableTables, setAvailableTables] = useState([]);
  const [approveForm, setApproveForm] = useState({ tableId: "", adminNotes: "" });
  const [cancelForm, setCancelForm] = useState({ adminNotes: "" });
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositForm, setDepositForm] = useState({ amount: "", paymentMethod: "cash", adminNotes: "" });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ itemsToAdd: [], itemsToRemove: [], itemsToUpdate: [] });
  const [availableItems, setAvailableItems] = useState([]);
  const [availableMenus, setAvailableMenus] = useState([]);
  const [newItemForm, setNewItemForm] = useState({ type: "item", itemId: "", quantity: 1 });
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({ tableId: "", scheduledTime: "", adminNotes: "" });
  const [allTables, setAllTables] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // WebSocket connection for real-time preorder updates
  const { lastMessage } = useAdminWebSocket();

  // Fetch available tables
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await waiterApi.getAvailableTables();
        setAvailableTables(Array.isArray(response?.data || response) ? (response?.data || response) : []);
      } catch (err) {
        console.error("Lỗi khi load danh sách bàn:", err);
      }
    };
    fetchTables();
  }, []);

  // Fetch all tables (for assign table)
  useEffect(() => {
    const fetchAllTables = async () => {
      try {
        const response = await waiterApi.getAllTables();
        setAllTables(Array.isArray(response?.tables || response?.data || response) ? (response?.tables || response?.data || response) : []);
      } catch (err) {
        console.error("Lỗi khi load danh sách tất cả bàn:", err);
      }
    };
    fetchAllTables();
  }, []);

  // Fetch available items and menus
  useEffect(() => {
    const fetchItemsAndMenus = async () => {
      try {
        const [itemsRes, menusRes] = await Promise.all([
          adminApi.getAllItems(),
          adminApi.getAllMenus()
        ]);
        setAvailableItems(Array.isArray(itemsRes?.data) ? itemsRes.data : []);
        setAvailableMenus(Array.isArray(menusRes?.data) ? menusRes.data : []);
      } catch (err) {
        console.error("Lỗi khi load danh sách món:", err);
      }
    };
    fetchItemsAndMenus();
  }, []);

  // Fetch preorders from API with filters
  useEffect(() => {
    const fetchPreOrders = async () => {
      try {
        setLoading(true);
        // Build query params
        const params = {};
        if (waiterResponseStatus) params.waiterResponseStatus = waiterResponseStatus;
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;
        if (minAmount) params.minAmount = minAmount;
        if (maxAmount) params.maxAmount = maxAmount;
        if (sortBy) params.sortBy = sortBy;
        if (sortOrder) params.sortOrder = sortOrder;
        
        const response = await adminApi.getPreOrders(params);
        const ordersData = response?.data || [];
        setPreorders(Array.isArray(ordersData) ? ordersData : []);
      } catch (err) {
        console.error("Lỗi khi load đơn đặt trước:", err);
        setPreorders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPreOrders();
  }, [waiterResponseStatus, fromDate, toDate, minAmount, maxAmount, sortBy, sortOrder]);

  // Listen for preorder updates via WebSocket to update the list
  // Note: Toast notifications are handled by AdminPreOrderNotification component
  useEffect(() => {
    if (!lastMessage) return;

    const messageType = lastMessage.type;
    const orderData = lastMessage.data;
      
    if (!orderData || !orderData._id) return;

    const orderId = String(orderData._id);

    // Handle new preorder event
    if (messageType === 'preorder:new' || messageType === 'preorder:needs_waiter_confirm') {
        setPreorders((prevPreorders) => {
          // Check if preorder already exists (avoid duplicates)
          const exists = prevPreorders.some(
          (order) => String(order._id) === orderId
          );
          
          if (exists) {
            // Update existing preorder if it already exists
            return prevPreorders.map((order) =>
            String(order._id) === orderId ? orderData : order
            );
          } else {
            // Add new preorder to the beginning of the list
          return [orderData, ...prevPreorders];
        }
      });
      
      console.log('✅ New preorder received via WebSocket:', orderId);
    }
    // Handle cancelled preorder - remove from list (vì status đã thành "cancelled", không còn là "preorder")
    else if (messageType === 'preorder:cancelled') {
      setPreorders((prevPreorders) => {
        const filtered = prevPreorders.filter(
          (order) => String(order._id) !== orderId
        );
        if (filtered.length !== prevPreorders.length) {
          console.log('✅ Preorder cancelled, removed from list:', orderId);
        }
        return filtered;
      });
    }
    // Handle updated preorder (approved, modified, deposit recorded, etc.)
    else if (
      messageType === 'preorder:approved' ||
      messageType === 'preorder:updated' ||
      messageType === 'preorder:deposit_recorded' ||
      messageType === 'preorder:items_modified'
    ) {
      setPreorders((prevPreorders) => {
        const exists = prevPreorders.some(
          (order) => String(order._id) === orderId
        );
        
        // Nếu order không còn là "preorder" (đã chuyển sang confirmed, cancelled, etc.), remove khỏi list
        if (orderData.status !== 'preorder') {
          const filtered = prevPreorders.filter(
            (order) => String(order._id) !== orderId
          );
          if (filtered.length !== prevPreorders.length) {
            console.log(`✅ Preorder ${messageType} - removed from list (status changed to ${orderData.status}):`, orderId);
          }
          return filtered;
        }
        
        if (exists) {
          // Update existing preorder (vẫn là preorder)
          return prevPreorders.map((order) =>
            String(order._id) === orderId ? orderData : order
          );
        }
        // Nếu không tồn tại và order vẫn là "preorder", thêm vào list
        else {
          return [orderData, ...prevPreorders];
        }
      });
      
      console.log(`✅ Preorder ${messageType} received via WebSocket:`, orderId, orderData);
      
      // Nếu modal đang mở cho order này, đóng và mở lại để refresh data
      if (openRow === orderId && messageType === 'preorder:deposit_recorded') {
        console.log("🔄 Refreshing modal for order with deposit:", orderId);
        // Đóng modal tạm thời để trigger re-open với data mới
        setTimeout(() => {
          setOpenRow(orderId);
        }, 100);
      }
    }
    // Handle order:confirmed (khi approve với autoConfirm)
    else if (messageType === 'order:confirmed') {
      setPreorders((prevPreorders) => {
        // Remove khỏi list vì đã chuyển sang confirmed
        const filtered = prevPreorders.filter(
          (order) => String(order._id) !== orderId
        );
        if (filtered.length !== prevPreorders.length) {
          console.log('✅ Order confirmed, removed from preorder list:', orderId);
        }
        return filtered;
      });
    }
  }, [lastMessage]);

  // Filter preorders based on search
  const filtered = useMemo(() => {
    if (!search.trim()) return preorders;
    const searchLower = search.toLowerCase();
    return preorders.filter((order) => {
      const customerName = order?.userId?.name || "";
      const customerEmail = order?.userId?.email || "";
      const customerPhone = order?.userId?.phone || "";
      const orderId = order?._id || "";
      const searchText = `${customerName} ${customerEmail} ${customerPhone} ${orderId}`.toLowerCase();
      return searchText.includes(searchLower);
    });
  }, [preorders, search]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-2xl font-semibold">Đơn đặt trước</div>
        <Card>
          <div className="p-6 text-center text-gray-500">Đang tải...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-2xl font-semibold">Đơn đặt trước</div>

      <Card>
        {/* Search */}
        <div className="flex items-center gap-3 p-4">
          <Input
            placeholder="Tìm theo tên, email, SĐT, mã đơn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setWaiterResponseStatus("");
              setFromDate("");
              setToDate("");
              setMinAmount("");
              setMaxAmount("");
              setSortBy("createdAt");
              setSortOrder("desc");
            }}
          >
            Xóa bộ lọc
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? "Ẩn bộ lọc" : "Hiện bộ lọc"}
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="border-t p-4 space-y-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Waiter Response Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trạng thái waiter
                </label>
                <select
                  value={waiterResponseStatus}
                  onChange={(e) => setWaiterResponseStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Tất cả</option>
                  <option value="pending">Chờ xác nhận</option>
                  <option value="approved">Đã xác nhận</option>
                  <option value="rejected">Đã từ chối</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Từ ngày
                </label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Đến ngày
                </label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Amount Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số tiền tối thiểu (₫)
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số tiền tối đa (₫)
                </label>
                <Input
                  type="number"
                  placeholder="Không giới hạn"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sắp xếp theo
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="createdAt">Ngày tạo</option>
                  <option value="totalAmount">Tổng tiền</option>
                  <option value="scheduledTime">Thời gian đặt</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thứ tự
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="desc">Giảm dần</option>
                  <option value="asc">Tăng dần</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-sm text-gray-700">
                <th className="p-3">Mã đơn</th>
                <th className="p-3">Khách hàng</th>
                <th className="p-3">Email</th>
                <th className="p-3">Số điện thoại</th>
                <th className="p-3">Thời gian đặt</th>
                <th className="p-3">Tổng tiền</th>
                <th className="p-3">Trạng thái waiter</th>
                <th className="p-3">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const orderId = order?._id || "";
                const orderShort = orderId ? `${String(orderId).slice(-8)}...` : "-";
                const customer = order?.userId || {};
                const customerName = customer?.name || "Khách ẩn danh";
                const customerEmail = customer?.email || "-";
                const customerPhone = customer?.phone || "-";
                const scheduledTime = order?.scheduledTime;
                const totalAmount = order?.totalAmount || 0;
                const orderItems = order?.orderItems || [];
                const waiterResponseStatus = order?.waiterResponse?.status || "pending";
                // Lấy userId - userId đã được populate nên customer là object User
                // customer._id sẽ là Mongoose ObjectId, cần convert sang string
                const userId = customer?._id ? String(customer._id) : (order?.userId ? String(order.userId) : null);
                
                // Badge cho waiter response status
                const getWaiterStatusBadge = (status) => {
                  const badges = {
                    pending: "bg-yellow-100 text-yellow-800",
                    approved: "bg-green-100 text-green-800",
                    rejected: "bg-red-100 text-red-800"
                  };
                  const labels = {
                    pending: "Chờ xác nhận",
                    approved: "Đã xác nhận",
                    rejected: "Đã từ chối"
                  };
                  return (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${badges[status] || badges.pending}`}>
                      {labels[status] || labels.pending}
                    </span>
                  );
                };

                return (
                  <tr
                    key={orderId}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="p-3 text-sm font-mono text-gray-600">
                      {orderShort}
                    </td>
                    <td className="p-3 font-medium">{customerName}</td>
                    <td className="p-3 text-sm text-gray-600">{customerEmail}</td>
                    <td className="p-3 text-sm text-gray-600">{customerPhone}</td>
                    <td className="p-3 text-sm text-gray-600">
                      {scheduledTime ? formatDate(scheduledTime) : "-"}
                    </td>
                    <td className="p-3 text-sm font-semibold">
                      {formatCurrency(totalAmount)}
                    </td>
                    <td className="p-3">
                      {getWaiterStatusBadge(waiterResponseStatus)}
                    </td>
                    <td className="p-3">
                      <Dialog
                        open={openRow === orderId}
                        onOpenChange={(v) => {
                          setOpenRow(v ? orderId : null);
                          if (!v) {
                            setCustomerInfo(null);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              setOpenRow(orderId);
                              // Fetch customer info when opening dialog
                              if (userId) {
                                try {
                                  setLoadingCustomerInfo(true);
                                  // userId đã được convert sang string ở trên
                                  console.log("Fetching customer info for userId:", userId);
                                  const response = await adminApi.getCustomerInfo(userId);
                                  console.log("Customer info response:", response);
                                  if (response?.data) {
                                    setCustomerInfo(response.data);
                                  } else {
                                    console.warn("Response không có data:", response);
                                    setCustomerInfo(null);
                                  }
                                } catch (err) {
                                  console.error("Lỗi khi load thông tin khách hàng:", err);
                                  console.error("Error details:", err.response?.data || err.message);
                                  setCustomerInfo(null);
                                } finally {
                                  setLoadingCustomerInfo(false);
                                }
                              } else {
                                console.warn("Không có userId để fetch thông tin khách hàng. Order userId:", order?.userId, "Customer:", customer);
                                setCustomerInfo(null);
                              }
                            }}
                          >
                            Xem chi tiết
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[98vw] w-full max-h-[90vh] overflow-y-auto border-2 border-black">
                          <DialogHeader>
                            <DialogTitle>Chi tiết đơn đặt trước</DialogTitle>
                            <DialogDescription>
                              Mã đơn: {orderId}
                            </DialogDescription>
                          </DialogHeader>

                          <div className="grid grid-cols-[1.2fr_1.8fr] gap-8">
                            {/* Cột trái: Chi tiết đơn hàng */}
                            <div className="space-y-4">
                              <h3 className="font-semibold text-lg text-gray-800 border-b pb-2">
                                Chi tiết đơn hàng
                              </h3>

                              {/* Thông tin khách hàng cơ bản */}
                              <div className="border-b pb-3">
                                <h4 className="font-semibold text-gray-800 mb-2">
                                  Thông tin khách hàng
                                </h4>
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                  <div>
                                    <span className="text-gray-500">Tên:</span>{" "}
                                    <span className="font-medium">{customerName}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Email:</span>{" "}
                                    <span className="font-medium">{customerEmail}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">SĐT:</span>{" "}
                                    <span className="font-medium">{customerPhone}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Thời gian đặt:</span>{" "}
                                    <span className="font-medium">
                                      {scheduledTime ? formatDate(scheduledTime) : "-"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Chi tiết món ăn */}
                              {orderItems.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-2">
                                    Chi tiết món ăn
                                  </h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm border-collapse border border-gray-200">
                                      <thead>
                                        <tr className="bg-gray-50 border-b">
                                          <th className="text-left p-2">Món ăn</th>
                                          <th className="text-left p-2">Loại</th>
                                          <th className="text-left p-2">SL</th>
                                          <th className="text-left p-2">Đơn giá</th>
                                          <th className="text-left p-2">Thành tiền</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {orderItems.map((item, i) => {
                                          const itemTotal = (item?.price || 0) * (item?.quantity || 0);
                                          return (
                                            <tr key={i} className="border-b">
                                              <td className="p-2">
                                                {item?.itemName || "Không rõ"}
                                              </td>
                                              <td className="p-2">
                                                {item?.itemType === "menu" ? "Combo" : "Món đơn"}
                                              </td>
                                              <td className="p-2">{item?.quantity || 1}</td>
                                              <td className="p-2">
                                                {formatCurrency(item?.price || 0)}
                                              </td>
                                              <td className="p-2 font-medium">
                                                {formatCurrency(itemTotal)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                      <tfoot>
                                        <tr className="bg-gray-50 font-semibold">
                                          <td colSpan={4} className="p-2 text-right">
                                            Tổng tiền:
                                          </td>
                                          <td className="p-2">{formatCurrency(totalAmount)}</td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {orderItems.length === 0 && (
                                <div className="text-sm text-gray-500">
                                  Không có món ăn nào trong đơn này.
                                </div>
                              )}

                              {/* Thông tin thanh toán */}
                              <div className="border-t pt-3">
                                <h4 className="font-semibold text-gray-800 mb-2">
                                  Thông tin thanh toán
                                </h4>
                                <div className="space-y-3">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Tổng tiền đơn:</span>
                                    <span className="font-semibold text-gray-900">
                                      {formatCurrency(totalAmount)}
                                    </span>
                                  </div>
                                  
                                  {/* Danh sách tất cả payments */}
                                  {order?.paymentIds && Array.isArray(order.paymentIds) && order.paymentIds.length > 0 ? (
                                    <div>
                                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                                        Lịch sử thanh toán ({order.paymentIds.length} payment)
                                      </h5>
                                      <div className="max-h-48 overflow-y-auto border rounded-lg">
                                        <table className="w-full text-xs">
                                          <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                              <th className="text-left p-2 border-b">Loại</th>
                                              <th className="text-left p-2 border-b">Số tiền</th>
                                              <th className="text-left p-2 border-b">Phương thức</th>
                                              <th className="text-left p-2 border-b">Thời gian</th>
                                              <th className="text-left p-2 border-b">Trạng thái</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {order.paymentIds.map((payment, idx) => {
                                              const paymentDate = payment?.payTime || payment?.createdAt;
                                              const paymentMethodLabels = {
                                                cash: "Tiền mặt",
                                                card: "Thẻ",
                                                momo: "MoMo",
                                                zaloPay: "ZaloPay"
                                              };
                                              const statusLabels = {
                                                paid: "Đã thanh toán",
                                                unpaid: "Chưa thanh toán"
                                              };
                                              return (
                                                <tr key={payment?._id || idx} className="border-b hover:bg-gray-50">
                                                  <td className="p-2">
                                                    {payment?.isDeposit ? (
                                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                                        Cọc
                                                      </span>
                                                    ) : (
                                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                                        Thanh toán
                                                      </span>
                                                    )}
                                                  </td>
                                                  <td className="p-2 font-semibold">
                                                    {formatCurrency(payment?.amountPaid || 0)}
                                                  </td>
                                                  <td className="p-2">
                                                    {paymentMethodLabels[payment?.paymentMethod] || payment?.paymentMethod || "-"}
                                                  </td>
                                                  <td className="p-2 text-gray-600">
                                                    {paymentDate ? formatDate(paymentDate) : "-"}
                                                  </td>
                                                  <td className="p-2">
                                                    <span className={`text-xs ${
                                                      payment?.status === 'paid' 
                                                        ? 'text-green-600 font-medium' 
                                                        : 'text-gray-500'
                                                    }`}>
                                                      {statusLabels[payment?.status] || payment?.status || "-"}
                                                    </span>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                          <tfoot className="bg-gray-50">
                                            <tr>
                                              <td className="p-2 font-semibold" colSpan={2}>
                                                Tổng đã thanh toán:
                                              </td>
                                              <td className="p-2 font-semibold text-green-600">
                                                {formatCurrency(
                                                  order.paymentIds
                                                    .filter(p => p?.status === 'paid')
                                                    .reduce((sum, p) => sum + (Number(p?.amountPaid) || 0), 0)
                                                )}
                                              </td>
                                              <td className="p-2 font-semibold" colSpan={1}>
                                                Còn lại:
                                              </td>
                                              <td className="p-2 font-semibold text-orange-600">
                                                {formatCurrency(
                                                  Math.max(0, totalAmount - 
                                                    order.paymentIds
                                                      .filter(p => p?.status === 'paid')
                                                      .reduce((sum, p) => sum + (Number(p?.amountPaid) || 0), 0)
                                                  )
                                                )}
                                              </td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-gray-500 text-xs italic border rounded-lg p-3 bg-gray-50">
                                      Chưa có thanh toán nào
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOrderForAction(order);
                                    setDepositForm({ amount: "", paymentMethod: "cash", adminNotes: "" });
                                    setDepositModalOpen(true);
                                  }}
                                  disabled={waiterResponseStatus === "rejected"}
                                  className="mt-3 w-full bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400"
                                >
                                  {waiterResponseStatus === "rejected" 
                                    ? "Không thể nhập cọc (đơn đã bị từ chối)" 
                                    : "Nhập tiền cọc"}
                                </Button>
                              </div>
                            </div>

                            {/* Cột phải: Chi tiết khách hàng */}
                            <div className="space-y-4 border-l pl-8">
                              <h3 className="font-semibold text-lg text-gray-800 border-b pb-2">
                                Chi tiết khách hàng
                              </h3>

                              {loadingCustomerInfo ? (
                                <div className="text-center text-gray-500 py-8">
                                  Đang tải thông tin khách hàng...
                                </div>
                              ) : customerInfo ? (
                                <>
                                  {/* Thống kê */}
                                  {customerInfo.classification?.metrics && (
                                    <div className="border-b pb-3">
                                      <h4 className="font-semibold text-gray-800 mb-2">
                                        Thống kê
                                      </h4>
                                      <div className="grid grid-cols-1 gap-2 text-sm">
                                        <div>
                                          <span className="text-gray-500">Tổng số đơn:</span>{" "}
                                          <span className="font-medium">
                                            {customerInfo.classification.metrics.orderCount || 0}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Đơn đã thanh toán:</span>{" "}
                                          <span className="font-medium">
                                            {customerInfo.classification.metrics.paidCount || 0}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Tổng chi tiêu:</span>{" "}
                                          <span className="font-medium">
                                            {formatCurrency(
                                              customerInfo.classification.metrics.totalSpent || 0
                                            )}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Điểm tích lũy:</span>{" "}
                                          <span className="font-medium">
                                            {customerInfo.user?.point || 0} điểm
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Tần suất:</span>{" "}
                                          <span className="font-medium">
                                            {customerInfo.classification.metrics.visitFrequency ||
                                              "0 lần/tháng"}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Đánh giá trung bình:</span>{" "}
                                          <span className="font-medium">
                                            {customerInfo.classification.metrics.avgRating || "Chưa có"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Lịch sử đơn hàng */}
                                  {customerInfo.orders && customerInfo.orders.length > 0 && (
                                    <div>
                                      <h4 className="font-semibold text-gray-800 mb-3">
                                        Lịch sử đơn hàng ({customerInfo.orders.length} đơn gần nhất)
                                      </h4>
                                      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg shadow-sm">
                                        <table className="w-full text-sm">
                                          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                                            <tr>
                                              <th className="text-left p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider border-b border-gray-200">
                                                Mã đơn
                                              </th>
                                              <th className="text-left p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider border-b border-gray-200">
                                                Trạng thái
                                              </th>
                                              <th className="text-left p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider border-b border-gray-200">
                                                Ngày
                                              </th>
                                              <th className="text-left p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider border-b border-gray-200">
                                                Tổng tiền
                                              </th>
                                              <th className="text-left p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider border-b border-gray-200">
                                                Lý do hủy
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="bg-white divide-y divide-gray-100">
                                            {customerInfo.orders.map((order) => {
                                              // Helper function để lấy lý do hủy
                                              const getCancellationReason = (order) => {
                                                if (order.status !== "cancelled") return null;
                                                
                                                // Kiểm tra waiter reject
                                                if (order.waiterResponse?.status === "rejected" && order.waiterResponse?.reason) {
                                                  return {
                                                    type: "Waiter",
                                                    reason: order.waiterResponse.reason
                                                  };
                                                }
                                                
                                                // Kiểm tra admin cancel trong confirmationHistory
                                                if (order.confirmationHistory && order.confirmationHistory.length > 0) {
                                                  const cancelHistory = order.confirmationHistory
                                                    .filter(h => h.action === "admin_cancelled" || h.action === "waiter_rejected")
                                                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
                                                  
                                                  if (cancelHistory) {
                                                    if (cancelHistory.action === "waiter_rejected") {
                                                      // Extract reason từ details: "Waiter từ chối: {reason}"
                                                      const reasonMatch = cancelHistory.details.match(/Waiter từ chối:\s*(.+)/);
                                                      if (reasonMatch) {
                                                        return {
                                                          type: "Waiter",
                                                          reason: reasonMatch[1]
                                                        };
                                                      }
                                                    } else if (cancelHistory.action === "admin_cancelled") {
                                                      // Extract reason từ details: "Admin {id} hủy đơn: {reason}"
                                                      const reasonMatch = cancelHistory.details.match(/Admin\s+\w+\s+hủy đơn:?\s*(.+)/);
                                                      if (reasonMatch && reasonMatch[1]) {
                                                        return {
                                                          type: "Admin",
                                                          reason: reasonMatch[1]
                                                        };
                                                      }
                                                      // Nếu không có lý do cụ thể, hiển thị "Không có lý do"
                                                      return {
                                                        type: "Admin",
                                                        reason: "Không có lý do"
                                                      };
                                                    }
                                                  }
                                                }
                                                
                                                return null;
                                              };
                                              
                                              const cancellationReason = getCancellationReason(order);
                                              
                                              return (
                                                <tr 
                                                  key={order._id} 
                                                  className="hover:bg-gray-50 transition-colors duration-150"
                                                >
                                                  <td className="p-3">
                                                    <span className="font-mono text-xs font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                                  {String(order._id).slice(-6)}
                                                    </span>
                                                </td>
                                                  <td className="p-3">
                                                  <span
                                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                      order.status === "paid"
                                                          ? "bg-green-100 text-green-800 border border-green-200"
                                                        : order.status === "cancelled"
                                                          ? "bg-red-100 text-red-800 border border-red-200"
                                                        : order.status === "preorder"
                                                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                                                          : "bg-gray-100 text-gray-800 border border-gray-200"
                                                    }`}
                                                  >
                                                    {order.status === "paid"
                                                      ? "Đã thanh toán"
                                                      : order.status === "cancelled"
                                                      ? "Đã hủy"
                                                      : order.status === "preorder"
                                                      ? "Đặt trước"
                                                      : order.status || "Chờ xử lý"}
                                                  </span>
                                                </td>
                                                  <td className="p-3 text-xs text-gray-600">
                                                  {formatDate(order.createdAt)}
                                                </td>
                                                  <td className="p-3">
                                                    <span className="font-semibold text-gray-900">
                                                  {formatCurrency(order.totalAmount || 0)}
                                                    </span>
                                                  </td>
                                                  <td className="p-3">
                                                    {cancellationReason ? (
                                                      <div className="flex items-start gap-1.5">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                          cancellationReason.type === "Waiter" 
                                                            ? "bg-orange-100 text-orange-700 border border-orange-200" 
                                                            : "bg-red-100 text-red-700 border border-red-200"
                                                        }`}>
                                                          {cancellationReason.type === "Waiter" ? "W" : "A"}
                                                        </span>
                                                        <span className="text-xs text-gray-700 flex-1 leading-relaxed">
                                                          {cancellationReason.reason}
                                                        </span>
                                                      </div>
                                                    ) : (
                                                      <span className="text-gray-300 text-xs italic">-</span>
                                                    )}
                                                </td>
                                              </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {(!customerInfo.orders || customerInfo.orders.length === 0) && (
                                    <div className="text-sm text-gray-500">
                                      Chưa có lịch sử đơn hàng.
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-sm text-gray-500">
                                  Không thể tải thông tin khách hàng.
                                </div>
                              )}
                            </div>
                          </div>

                          <DialogFooter className="flex gap-2 flex-wrap">
                            {/* Chỉ hiển thị các button action khi đơn ở trạng thái phù hợp */}
                            {waiterResponseStatus === "pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedOrderForAction(order);
                                    setApproveForm({ tableId: "", adminNotes: "" });
                                    setApproveModalOpen(true);
                                  }}
                                  className="bg-green-50 text-green-700 hover:bg-green-100"
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedOrderForAction(order);
                                    setEditForm({ itemsToAdd: [], itemsToRemove: [], itemsToUpdate: [] });
                                    setEditModalOpen(true);
                                  }}
                                  className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                                >
                                  Sửa món
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedOrderForAction(order);
                                    setCancelForm({ adminNotes: "" });
                                    setCancelModalOpen(true);
                                  }}
                                  className="bg-red-50 text-red-700 hover:bg-red-100"
                                >
                                  Hủy đơn
                                </Button>
                              </>
                            )}
                            {(waiterResponseStatus === "approved" || order?.status === "confirmed") && (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedOrderForAction(order);
                                  setDepositForm({ amount: "", paymentMethod: "cash", adminNotes: "" });
                                  setDepositModalOpen(true);
                                }}
                                className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                              >
                                Nhập tiền cọc
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedOrderForAction(order);
                                // Format datetime-local: convert to local timezone
                                let scheduledTimeFormatted = "";
                                if (order.scheduledTime) {
                                  const d = new Date(order.scheduledTime);
                                  const year = d.getFullYear();
                                  const month = String(d.getMonth() + 1).padStart(2, "0");
                                  const day = String(d.getDate()).padStart(2, "0");
                                  const hours = String(d.getHours()).padStart(2, "0");
                                  const minutes = String(d.getMinutes()).padStart(2, "0");
                                  scheduledTimeFormatted = `${year}-${month}-${day}T${hours}:${minutes}`;
                                }
                                setUpdateForm({ 
                                  tableId: order.tableId ? String(order.tableId._id || order.tableId) : "", 
                                  scheduledTime: scheduledTimeFormatted,
                                  adminNotes: ""
                                });
                                setUpdateModalOpen(true);
                              }}
                              className="bg-purple-50 text-purple-700 hover:bg-purple-100"
                            >
                              Gán bàn / Sửa thời gian
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setOpenRow(null);
                                setCustomerInfo(null);
                              }}
                            >
                              Đóng
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={8}>
                    {preorders.length === 0
                      ? "Chưa có đơn đặt trước nào."
                      : "Không tìm thấy đơn đặt trước phù hợp."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {filtered.length > 0 && (
          <div className="p-3 text-sm text-gray-600 border-t">
            Tổng số: {filtered.length} đơn đặt trước
          </div>
        )}
      </Card>

      {/* Approve Modal */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve đơn đặt trước</DialogTitle>
            <DialogDescription>
              Mã đơn: {selectedOrderForAction?._id ? String(selectedOrderForAction._id).slice(-8) : "-"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chọn bàn *
              </label>
              <select
                value={approveForm.tableId}
                onChange={(e) => setApproveForm({ ...approveForm, tableId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                required
              >
                <option value="">-- Chọn bàn --</option>
                {availableTables.map((table) => (
                  <option key={table._id} value={table._id}>
                    Bàn {table.tableNumber}
                  </option>
                ))}
              </select>
    </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú (tùy chọn)
              </label>
              <Input
                type="text"
                placeholder="Nhập ghi chú..."
                value={approveForm.adminNotes}
                onChange={(e) => setApproveForm({ ...approveForm, adminNotes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApproveModalOpen(false);
                setSelectedOrderForAction(null);
                setApproveForm({ tableId: "", adminNotes: "" });
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={async () => {
                if (!approveForm.tableId) {
                  toast.error("Vui lòng chọn bàn");
                  return;
                }
                try {
                  setActionLoading(true);
                  await adminApi.approvePreOrder(
                    selectedOrderForAction._id,
                    approveForm.tableId,
                    approveForm.adminNotes
                  );
                  toast.success("Đã approve và xác nhận đơn thành công");
                  setApproveModalOpen(false);
                  setSelectedOrderForAction(null);
                  setApproveForm({ tableId: "", adminNotes: "" });
                  
                  // Refresh list (silently, không hiển thị toast nếu lỗi)
                  try {
                    const response = await adminApi.getPreOrders({
                      waiterResponseStatus,
                      fromDate,
                      toDate,
                      minAmount,
                      maxAmount,
                      sortBy,
                      sortOrder
                    });
                    setPreorders(Array.isArray(response?.data) ? response.data : []);
                  } catch (refreshErr) {
                    console.error("Lỗi khi refresh danh sách sau khi approve đơn:", refreshErr);
                  }
                } catch (err) {
                  console.error("Lỗi khi approve đơn:", err);
                  toast.error(err.response?.data?.message || "Lỗi khi approve đơn");
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={actionLoading || !approveForm.tableId}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {actionLoading ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy đơn đặt trước</DialogTitle>
            <DialogDescription>
              Mã đơn: {selectedOrderForAction?._id ? String(selectedOrderForAction._id).slice(-8) : "-"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú hủy đơn
              </label>
              <textarea
                value={cancelForm.adminNotes}
                onChange={(e) => setCancelForm({ ...cancelForm, adminNotes: e.target.value })}
                placeholder="Nhập ghi chú về lý do hủy đơn..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelModalOpen(false);
                setSelectedOrderForAction(null);
                setCancelForm({ adminNotes: "" });
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={async () => {
                try {
                  setActionLoading(true);
                  await adminApi.cancelPreOrder(
                    selectedOrderForAction._id,
                    cancelForm.adminNotes
                  );
                  toast.success("Đã hủy đơn thành công");
                  setCancelModalOpen(false);
                  setSelectedOrderForAction(null);
                  setCancelForm({ adminNotes: "" });
                  
                  // Refresh list (silently, không hiển thị toast nếu lỗi)
                  try {
                    const response = await adminApi.getPreOrders({
                      waiterResponseStatus,
                      fromDate,
                      toDate,
                      minAmount,
                      maxAmount,
                      sortBy,
                      sortOrder
                    });
                    setPreorders(Array.isArray(response?.data) ? response.data : []);
                  } catch (refreshErr) {
                    // Chỉ log lỗi, không hiển thị toast vì đã có toast thành công rồi
                    console.error("Lỗi khi refresh danh sách sau khi hủy đơn:", refreshErr);
                    // Có thể tự động refresh lại sau khi WebSocket update
                  }
                } catch (err) {
                  console.error("Lỗi khi hủy đơn:", err);
                  toast.error(err.response?.data?.message || "Lỗi khi hủy đơn");
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={actionLoading}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {actionLoading ? "Đang xử lý..." : "Xác nhận hủy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit Modal */}
      <Dialog open={depositModalOpen} onOpenChange={setDepositModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nhập tiền cọc</DialogTitle>
            <DialogDescription>
              Mã đơn: {selectedOrderForAction?._id ? String(selectedOrderForAction._id).slice(-8) : "-"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số tiền cọc (₫) *
              </label>
              <Input
                type="number"
                placeholder="Nhập số tiền..."
                value={depositForm.amount}
                onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                min="0"
                required
              />
              {selectedOrderForAction && (
                <p className="text-xs text-gray-500 mt-1">
                  Tổng tiền: {formatCurrency(selectedOrderForAction.totalAmount || 0)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phương thức thanh toán *
              </label>
              <select
                value={depositForm.paymentMethod}
                onChange={(e) => setDepositForm({ ...depositForm, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                required
              >
                <option value="cash">Tiền mặt</option>
                <option value="card">Thẻ</option>
                <option value="momo">MoMo</option>
                <option value="zaloPay">ZaloPay</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú (tùy chọn)
              </label>
              <Input
                type="text"
                placeholder="Nhập ghi chú..."
                value={depositForm.adminNotes}
                onChange={(e) => setDepositForm({ ...depositForm, adminNotes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDepositModalOpen(false);
                setSelectedOrderForAction(null);
                setDepositForm({ amount: "", paymentMethod: "cash", adminNotes: "" });
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={async () => {
                if (!depositForm.amount || parseFloat(depositForm.amount) <= 0) {
                  toast.error("Vui lòng nhập số tiền cọc hợp lệ");
                  return;
                }
                try {
                  setActionLoading(true);
                  await adminApi.recordDeposit(
                    selectedOrderForAction._id,
                    parseFloat(depositForm.amount),
                    depositForm.paymentMethod,
                    depositForm.adminNotes
                  );
                  toast.success("Đã ghi nhận tiền cọc thành công");
                  setDepositModalOpen(false);
                  setSelectedOrderForAction(null);
                  setDepositForm({ amount: "", paymentMethod: "cash", adminNotes: "" });
                  
                  // Refresh list (silently, không hiển thị toast nếu lỗi)
                  try {
                    const response = await adminApi.getPreOrders({
                      waiterResponseStatus,
                      fromDate,
                      toDate,
                      minAmount,
                      maxAmount,
                      sortBy,
                      sortOrder
                    });
                    setPreorders(Array.isArray(response?.data) ? response.data : []);
                  } catch (refreshErr) {
                    console.error("Lỗi khi refresh danh sách sau khi ghi nhận tiền cọc:", refreshErr);
                  }
                } catch (err) {
                  console.error("Lỗi khi ghi nhận tiền cọc:", err);
                  toast.error(err.response?.data?.message || "Lỗi khi ghi nhận tiền cọc");
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={actionLoading || !depositForm.amount || parseFloat(depositForm.amount) <= 0}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {actionLoading ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Items Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa món trong đơn</DialogTitle>
            <DialogDescription>
              Mã đơn: {selectedOrderForAction?._id ? String(selectedOrderForAction._id).slice(-8) : "-"}
            </DialogDescription>
          </DialogHeader>
          {selectedOrderForAction && (
            <div className="space-y-4">
              {/* Danh sách món hiện tại */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Món hiện tại</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">Món</th>
                        <th className="p-2 text-left">Loại</th>
                        <th className="p-2 text-left">SL</th>
                        <th className="p-2 text-left">Đơn giá</th>
                        <th className="p-2 text-left">Thành tiền</th>
                        <th className="p-2 text-left">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrderForAction.orderItems?.map((item, idx) => {
                        const itemTotal = (item?.price || 0) * (item?.quantity || 0);
                        const isRemoved = editForm.itemsToRemove.includes(item._id);
                        const updateItem = editForm.itemsToUpdate.find(u => u.orderItemId === item._id);
                        const currentQuantity = updateItem ? updateItem.newQuantity : item.quantity;
                        
                        return (
                          <tr key={item._id || idx} className={isRemoved ? "bg-red-50 opacity-50" : ""}>
                            <td className="p-2">{item.itemName || "Không rõ"}</td>
                            <td className="p-2">{item.itemType === "menu" ? "Combo" : "Món đơn"}</td>
                            <td className="p-2">
                              {isRemoved ? (
                                <span className="text-red-600">Đã xóa</span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={currentQuantity}
                                    onChange={(e) => {
                                      const newQty = parseInt(e.target.value) || 1;
                                      if (newQty !== item.quantity) {
                                        setEditForm(prev => {
                                          const existing = prev.itemsToUpdate.find(u => u.orderItemId === item._id);
                                          const updated = existing 
                                            ? prev.itemsToUpdate.map(u => u.orderItemId === item._id ? { ...u, newQuantity: newQty } : u)
                                            : [...prev.itemsToUpdate, { orderItemId: item._id, newQuantity: newQty }];
                                          return { ...prev, itemsToUpdate: updated };
                                        });
                                      } else {
                                        setEditForm(prev => ({
                                          ...prev,
                                          itemsToUpdate: prev.itemsToUpdate.filter(u => u.orderItemId !== item._id)
                                        }));
                                      }
                                    }}
                                    className="w-16 px-2 py-1 border rounded text-center"
                                  />
                                </div>
                              )}
                            </td>
                            <td className="p-2">{formatCurrency(item?.price || 0)}</td>
                            <td className="p-2 font-medium">
                              {formatCurrency(currentQuantity * (item?.price || 0))}
                            </td>
                            <td className="p-2">
                              {!isRemoved && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditForm(prev => ({
                                      ...prev,
                                      itemsToRemove: [...prev.itemsToRemove, item._id],
                                      itemsToUpdate: prev.itemsToUpdate.filter(u => u.orderItemId !== item._id)
                                    }));
                                  }}
                                  className="bg-red-50 text-red-700 hover:bg-red-100 text-xs"
                                >
                                  Xóa
                                </Button>
                              )}
                              {isRemoved && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditForm(prev => ({
                                      ...prev,
                                      itemsToRemove: prev.itemsToRemove.filter(id => id !== item._id)
                                    }));
                                  }}
                                  className="bg-green-50 text-green-700 hover:bg-green-100 text-xs"
                                >
                                  Khôi phục
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Lưu ý: Chỉ có thể chỉnh sửa món có trạng thái "pending"
                </p>
              </div>

              {/* Thêm món mới */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-800 mb-3">Thêm món mới</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Loại</label>
                    <select
                      value={newItemForm.type}
                      onChange={(e) => {
                        setNewItemForm({ ...newItemForm, type: e.target.value, itemId: "" });
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    >
                      <option value="item">Món đơn</option>
                      <option value="menu">Combo</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Chọn món</label>
                    <select
                      value={newItemForm.itemId}
                      onChange={(e) => setNewItemForm({ ...newItemForm, itemId: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    >
                      <option value="">-- Chọn món --</option>
                      {newItemForm.type === "item"
                        ? availableItems.map((item) => (
                            <option key={item._id} value={item._id}>
                              {item.name} - {formatCurrency(item.price)}
                            </option>
                          ))
                        : availableMenus.map((menu) => (
                            <option key={menu._id} value={menu._id}>
                              {menu.name} - {formatCurrency(menu.price)}
                            </option>
                          ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Số lượng</label>
                    <input
                      type="number"
                      min="1"
                      value={newItemForm.quantity}
                      onChange={(e) => setNewItemForm({ ...newItemForm, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!newItemForm.itemId) {
                      toast.error("Vui lòng chọn món");
                      return;
                    }
                    const selectedItem = newItemForm.type === "item"
                      ? availableItems.find(i => i._id === newItemForm.itemId)
                      : availableMenus.find(m => m._id === newItemForm.itemId);
                    
                    if (selectedItem) {
                      setEditForm(prev => ({
                        ...prev,
                        itemsToAdd: [...prev.itemsToAdd, {
                          itemId: newItemForm.itemId,
                          type: newItemForm.type,
                          quantity: newItemForm.quantity
                        }]
                      }));
                      setNewItemForm({ type: "item", itemId: "", quantity: 1 });
                      toast.success(`Đã thêm ${selectedItem.name} vào danh sách`);
                    }
                  }}
                  className="mt-2 bg-green-50 text-green-700 hover:bg-green-100"
                >
                  + Thêm vào đơn
                </Button>
                
                {/* Danh sách món đã thêm (chưa lưu) */}
                {editForm.itemsToAdd.length > 0 && (
                  <div className="mt-3 border rounded p-2 bg-blue-50">
                    <p className="text-xs font-medium text-gray-700 mb-1">Món sẽ được thêm:</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {editForm.itemsToAdd.map((item, idx) => {
                        const itemData = item.type === "item"
                          ? availableItems.find(i => i._id === item.itemId)
                          : availableMenus.find(m => m._id === item.itemId);
                        return (
                          <li key={idx} className="flex justify-between items-center">
                            <span>
                              {itemData?.name || "Không rõ"} x{item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditForm(prev => ({
                                  ...prev,
                                  itemsToAdd: prev.itemsToAdd.filter((_, i) => i !== idx)
                                }));
                              }}
                              className="text-xs h-6 px-2 bg-red-50 text-red-700 hover:bg-red-100"
                            >
                              Xóa
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {/* Tổng tiền mới */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Tổng tiền hiện tại:</span>
                  <span className="font-semibold">{formatCurrency(selectedOrderForAction.totalAmount || 0)}</span>
                </div>
                {(editForm.itemsToRemove.length > 0 || editForm.itemsToUpdate.length > 0 || editForm.itemsToAdd.length > 0) && (
                  <div className="text-sm text-gray-600 mt-2">
                    ⚠️ Tổng tiền sẽ được tính lại sau khi lưu
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditModalOpen(false);
                setSelectedOrderForAction(null);
                setEditForm({ itemsToAdd: [], itemsToRemove: [], itemsToUpdate: [] });
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={async () => {
                try {
                  setActionLoading(true);
                  await adminApi.modifyPreOrderItems(
                    selectedOrderForAction._id,
                    editForm.itemsToAdd,
                    editForm.itemsToRemove,
                    editForm.itemsToUpdate
                  );
                  toast.success("Đã chỉnh sửa món thành công");
                  setEditModalOpen(false);
                  setSelectedOrderForAction(null);
                  setEditForm({ itemsToAdd: [], itemsToRemove: [], itemsToUpdate: [] });
                  
                  // Refresh list (silently, không hiển thị toast nếu lỗi)
                  try {
                    const response = await adminApi.getPreOrders({
                      waiterResponseStatus,
                      fromDate,
                      toDate,
                      minAmount,
                      maxAmount,
                      sortBy,
                      sortOrder
                    });
                    setPreorders(Array.isArray(response?.data) ? response.data : []);
                  } catch (refreshErr) {
                    console.error("Lỗi khi refresh danh sách sau khi chỉnh sửa món:", refreshErr);
                  }
                } catch (err) {
                  console.error("Lỗi khi chỉnh sửa món:", err);
                  toast.error(err.response?.data?.message || "Lỗi khi chỉnh sửa món");
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={actionLoading || (editForm.itemsToRemove.length === 0 && editForm.itemsToUpdate.length === 0 && editForm.itemsToAdd.length === 0)}
              className="bg-yellow-600 text-white hover:bg-yellow-700"
            >
              {actionLoading ? "Đang xử lý..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update PreOrder Modal (Gán bàn / Sửa thời gian) */}
      <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gán bàn / Sửa thời gian đặt trước</DialogTitle>
            <DialogDescription>
              Mã đơn: {selectedOrderForAction?._id ? String(selectedOrderForAction._id).slice(-8) : "-"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chọn bàn
              </label>
              <select
                value={updateForm.tableId}
                onChange={(e) => setUpdateForm({ ...updateForm, tableId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">-- Chưa gán bàn --</option>
                {allTables.map((table) => (
                  <option key={table._id} value={table._id}>
                    Bàn {table.tableNumber} {table.status === "occupied" ? "(Đang sử dụng)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Để trống để xóa bàn đã gán
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thời gian đến ăn
              </label>
              <Input
                type="datetime-local"
                value={updateForm.scheduledTime}
                onChange={(e) => setUpdateForm({ ...updateForm, scheduledTime: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú (tùy chọn)
              </label>
              <Input
                type="text"
                placeholder="Nhập ghi chú..."
                value={updateForm.adminNotes}
                onChange={(e) => setUpdateForm({ ...updateForm, adminNotes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUpdateModalOpen(false);
                setSelectedOrderForAction(null);
                setUpdateForm({ tableId: "", scheduledTime: "", adminNotes: "" });
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={async () => {
                try {
                  setActionLoading(true);
                  await adminApi.updatePreOrder(
                    selectedOrderForAction._id,
                    updateForm.tableId || null,
                    updateForm.scheduledTime || undefined,
                    updateForm.adminNotes
                  );
                  toast.success("Đã cập nhật đơn đặt trước thành công");
                  setUpdateModalOpen(false);
                  setSelectedOrderForAction(null);
                  setUpdateForm({ tableId: "", scheduledTime: "", adminNotes: "" });
                  
                  // Refresh list (silently, không hiển thị toast nếu lỗi)
                  try {
                    const response = await adminApi.getPreOrders({
                      waiterResponseStatus,
                      fromDate,
                      toDate,
                      minAmount,
                      maxAmount,
                      sortBy,
                      sortOrder
                    });
                    setPreorders(Array.isArray(response?.data) ? response.data : []);
                  } catch (refreshErr) {
                    console.error("Lỗi khi refresh danh sách sau khi cập nhật đơn:", refreshErr);
                  }
                } catch (err) {
                  console.error("Lỗi khi cập nhật đơn:", err);
                  toast.error(err.response?.data?.message || "Lỗi khi cập nhật đơn");
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={actionLoading}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              {actionLoading ? "Đang xử lý..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

