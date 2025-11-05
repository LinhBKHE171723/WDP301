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
import useAdminWebSocket from "../../hooks/useAdminWebSocket";

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

  // WebSocket connection for real-time preorder updates
  const { lastMessage } = useAdminWebSocket();

  // Fetch preorders from API
  useEffect(() => {
    const fetchPreOrders = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getPreOrders();
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
  }, []);

  // Listen for new preorders via WebSocket to update the list
  // Note: Toast notifications are handled by AdminPreOrderNotification component
  useEffect(() => {
    if (!lastMessage) return;

    // Handle new preorder event
    if (lastMessage.type === 'preorder:new' || lastMessage.type === 'preorder:needs_waiter_confirm') {
      const newPreorder = lastMessage.data;
      
      if (newPreorder && newPreorder._id) {
        const preorderId = String(newPreorder._id);

        setPreorders((prevPreorders) => {
          // Check if preorder already exists (avoid duplicates)
          const exists = prevPreorders.some(
            (order) => String(order._id) === preorderId
          );
          
          if (exists) {
            // Update existing preorder if it already exists
            return prevPreorders.map((order) =>
              String(order._id) === preorderId ? newPreorder : order
            );
          } else {
            // Add new preorder to the beginning of the list
            return [newPreorder, ...prevPreorders];
          }
        });
        
        console.log('✅ New preorder received via WebSocket:', preorderId);
      }
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
            onClick={() => setSearch("")}
          >
            Xóa bộ lọc
          </Button>
        </div>

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
                // Lấy userId - userId đã được populate nên customer là object User
                // customer._id sẽ là Mongoose ObjectId, cần convert sang string
                const userId = customer?._id ? String(customer._id) : (order?.userId ? String(order.userId) : null);

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
                        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Chi tiết đơn đặt trước</DialogTitle>
                            <DialogDescription>
                              Mã đơn: {orderId}
                            </DialogDescription>
                          </DialogHeader>

                          <div className="grid grid-cols-2 gap-6">
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
                            </div>

                            {/* Cột phải: Chi tiết khách hàng */}
                            <div className="space-y-4 border-l pl-6">
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
                                      <h4 className="font-semibold text-gray-800 mb-2">
                                        Lịch sử đơn hàng ({customerInfo.orders.length} đơn gần nhất)
                                      </h4>
                                      <div className="max-h-64 overflow-y-auto">
                                        <table className="w-full text-xs border-collapse border border-gray-200">
                                          <thead>
                                            <tr className="bg-gray-50 border-b sticky top-0">
                                              <th className="text-left p-2">Mã đơn</th>
                                              <th className="text-left p-2">Trạng thái</th>
                                              <th className="text-left p-2">Ngày</th>
                                              <th className="text-left p-2">Tổng tiền</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {customerInfo.orders.map((order) => (
                                              <tr key={order._id} className="border-b">
                                                <td className="p-2 font-mono text-xs">
                                                  {String(order._id).slice(-6)}
                                                </td>
                                                <td className="p-2">
                                                  <span
                                                    className={`px-1.5 py-0.5 rounded text-xs ${
                                                      order.status === "paid"
                                                        ? "bg-green-100 text-green-800"
                                                        : order.status === "cancelled"
                                                        ? "bg-red-100 text-red-800"
                                                        : order.status === "preorder"
                                                        ? "bg-blue-100 text-blue-800"
                                                        : "bg-gray-100 text-gray-800"
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
                                                <td className="p-2">
                                                  {formatDate(order.createdAt)}
                                                </td>
                                                <td className="p-2 font-medium">
                                                  {formatCurrency(order.totalAmount || 0)}
                                                </td>
                                              </tr>
                                            ))}
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

                          <DialogFooter>
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
                  <td className="p-6 text-center text-gray-500" colSpan={7}>
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
    </div>
  );
}

