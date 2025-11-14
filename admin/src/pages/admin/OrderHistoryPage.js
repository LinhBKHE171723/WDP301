import { useEffect, useState } from "react";
import { Card } from "../../components/ui/admin/card";
import { Input } from "../../components/ui/admin/input";
import { Button } from "../../components/ui/admin/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/admin/dialog";
import adminApi from "../../api/adminApi";
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

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [waiterFilter, setWaiterFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      };

      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      if (paymentFilter !== "all") params.paymentStatus = paymentFilter;
      if (orderTypeFilter !== "all") params.orderType = orderTypeFilter;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (tableFilter) params.tableId = tableFilter;
      if (waiterFilter) params.waiterId = waiterFilter;

      const response = await adminApi.getOrdersHistory(params);
      setOrders(response.data?.orders || []);
      setTotalPages(response.data?.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Lỗi khi load lịch sử đơn hàng:", err);
      toast.error("Không thể tải lịch sử đơn hàng");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, paymentFilter, orderTypeFilter, fromDate, toDate, tableFilter, waiterFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setOrderTypeFilter("all");
    setFromDate("");
    setToDate("");
    setTableFilter("");
    setWaiterFilter("");
    setPage(1);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "bg-yellow-100 text-yellow-800",
      preorder: "bg-blue-100 text-blue-800",
      confirmed: "bg-green-100 text-green-800",
      preparing: "bg-orange-100 text-orange-800",
      served: "bg-purple-100 text-purple-800",
      paid: "bg-emerald-100 text-emerald-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusText = (status) => {
    const texts = {
      pending: "Chờ xử lý",
      preorder: "Đặt trước",
      confirmed: "Đã xác nhận",
      preparing: "Đang chuẩn bị",
      served: "Đã phục vụ",
      paid: "Đã thanh toán",
      cancelled: "Đã hủy",
    };
    return texts[status] || status;
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    const badges = {
      paid: "bg-green-100 text-green-800",
      unpaid: "bg-red-100 text-red-800",
      partial: "bg-yellow-100 text-yellow-800",
    };
    return badges[paymentStatus] || "bg-gray-100 text-gray-800";
  };

  const getPaymentStatusText = (paymentStatus) => {
    const texts = {
      paid: "Đã thanh toán",
      unpaid: "Chưa thanh toán",
      partial: "Thanh toán một phần",
    };
    return texts[paymentStatus] || paymentStatus;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Lịch sử đơn hàng</h1>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="w-full sm:w-auto"
        >
          {showFilters ? "Ẩn bộ lọc" : "Hiện bộ lọc"}
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Tìm theo mã đơn, tên khách, email, SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <div className="flex gap-2">
              <Button onClick={handleSearch} className="flex-1 sm:flex-none">Tìm kiếm</Button>
              <Button variant="outline" onClick={resetFilters} className="flex-1 sm:flex-none">
                Xóa bộ lọc
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium mb-1">Trạng thái</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">Tất cả</option>
                  <option value="pending">Chờ xử lý</option>
                  <option value="preorder">Đặt trước</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="preparing">Đang chuẩn bị</option>
                  <option value="served">Đã phục vụ</option>
                  <option value="paid">Đã thanh toán</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Thanh toán</label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">Tất cả</option>
                  <option value="paid">Đã thanh toán</option>
                  <option value="unpaid">Chưa thanh toán</option>
                  <option value="partial">Thanh toán một phần</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Loại đơn</label>
                <select
                  value={orderTypeFilter}
                  onChange={(e) => setOrderTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">Tất cả</option>
                  <option value="preorder">Đặt trước</option>
                  <option value="regular">Đơn thường</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Từ ngày</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Đến ngày</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Orders Table */}
      <Card>
        {loading ? (
          <div className="p-8 text-center">Đang tải...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Không tìm thấy đơn hàng nào
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã đơn</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Bàn</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Loại</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Thanh toán</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng tiền</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">Thời gian tạo</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-4 py-3 text-sm">
                        <span className="font-mono text-xs">
                          {String(order._id).slice(-8)}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-sm">
                        {order.userId ? (
                          <div>
                            <div className="font-medium">{order.userId.name || "-"}</div>
                            <div className="text-xs text-gray-500 hidden sm:block">
                              {order.userId.email || "-"}
                            </div>
                            <div className="text-xs text-gray-500 hidden sm:block">
                              {order.userId.phone || "-"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Khách vãng lai</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-sm hidden sm:table-cell">
                        {order.tableId ? (
                          <span className="font-medium">Bàn {order.tableId.tableNumber}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-sm hidden md:table-cell">
                        {(() => {
                          // Xác định isPreOrder:
                          // 1. Nếu status = "preorder" → chắc chắn là preorder
                          // 2. Nếu không, kiểm tra scheduledTime → nếu có thì vẫn là preorder (đã approve nhưng vẫn có scheduledTime)
                          // 3. Hoặc dùng isPreOrder từ backend
                          const isPreOrder = order.status === "preorder" || 
                                            order.isPreOrder || 
                                            (order.scheduledTime !== null && 
                                             order.scheduledTime !== undefined && 
                                             order.scheduledTime !== '');
                          
                          return isPreOrder ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Đặt trước
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              Đơn thường
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusBadge(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-sm hidden lg:table-cell">
                        {(() => {
                          // Xác định paymentStatus: ưu tiên từ backend, nếu không có thì tính toán
                          let paymentStatus = order.paymentStatus;
                          
                          // Tính toán totalPaid và remainingAmount nếu chưa có
                          let totalPaid = order.totalPaid || 0;
                          let remainingAmount = order.remainingAmount;
                          
                          if (!totalPaid && order.paymentIds && Array.isArray(order.paymentIds) && order.paymentIds.length > 0) {
                            // Tính từ paymentIds nếu backend chưa tính
                            totalPaid = order.paymentIds
                              .filter(p => p.status === "paid" && p.amountPaid > 0)
                              .reduce((sum, p) => sum + (p.amountPaid || 0), 0);
                          }
                          
                          if (remainingAmount === undefined || remainingAmount === null) {
                            remainingAmount = (order.totalAmount || 0) - totalPaid;
                          }
                          
                          if (!paymentStatus) {
                            // Fallback: tính toán từ status và totalPaid
                            if (order.status === "paid") {
                              paymentStatus = "paid";
                            } else if (totalPaid > 0 && remainingAmount > 0) {
                              paymentStatus = "partial";
                            } else if (totalPaid > 0) {
                              paymentStatus = "paid";
                            } else {
                              paymentStatus = "unpaid";
                            }
                          }
                          
                          return (
                            <>
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPaymentStatusBadge(paymentStatus)}`}>
                                {getPaymentStatusText(paymentStatus)}
                              </span>
                              {totalPaid > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Đã trả: {formatCurrency(totalPaid)}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-sm">
                        <div className="font-medium">{formatCurrency(order.totalAmount || 0)}</div>
                        {order.remainingAmount > 0 && (
                          <div className="text-xs text-red-500 hidden sm:block">
                            Còn lại: {formatCurrency(order.remainingAmount)}
                          </div>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-sm hidden xl:table-cell">
                        <div>{formatDate(order.createdAt)}</div>
                        {order.isPreOrder && order.scheduledTime && (
                          <div className="text-xs text-blue-600 mt-1">
                            Đến: {formatDate(order.scheduledTime)}
                          </div>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-sm">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setDetailModalOpen(true);
                          }}
                        >
                          Xem chi tiết
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detail Modal */}
            <Dialog
              open={detailModalOpen}
              onOpenChange={(open) => {
                setDetailModalOpen(open);
                if (!open) {
                  setSelectedOrder(null);
                }
              }}
            >
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-2 border-black">
                <DialogHeader>
                  <DialogTitle>Chi tiết đơn hàng</DialogTitle>
                  <DialogDescription>
                    {selectedOrder && `Mã đơn: ${String(selectedOrder._id).slice(-8)}`}
                  </DialogDescription>
                </DialogHeader>
                {selectedOrder && (
                  <div className="space-y-6">
                    {/* Thông tin khách hàng */}
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Thông tin khách hàng</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Tên:</span>{" "}
                          <span className="font-medium">
                            {selectedOrder.userId?.name || "Khách vãng lai"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Email:</span>{" "}
                          <span className="font-medium">
                            {selectedOrder.userId?.email || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">SĐT:</span>{" "}
                          <span className="font-medium">
                            {selectedOrder.userId?.phone || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Bàn:</span>{" "}
                          <span className="font-medium">
                            {selectedOrder.tableId ? `Bàn ${selectedOrder.tableId.tableNumber}` : "-"}
                          </span>
                        </div>
                        {selectedOrder.scheduledTime && (
                          <div>
                            <span className="text-gray-500">Thời gian đặt:</span>{" "}
                            <span className="font-medium">
                              {formatDate(selectedOrder.scheduledTime)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Chi tiết món ăn */}
                    {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-lg mb-3">Chi tiết món ăn</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-gray-50 border-b">
                                <th className="text-left p-2">Món ăn</th>
                                <th className="text-left p-2">Loại</th>
                                <th className="text-left p-2">SL</th>
                                <th className="text-left p-2">Đơn giá</th>
                                <th className="text-left p-2">Thành tiền</th>
                                <th className="text-left p-2">Người nấu</th>
                                <th className="text-left p-2">Người phục vụ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedOrder.orderItems.map((item, idx) => {
                                // Lấy danh sách chefs và waiters (bao gồm cả comboItems)
                                const chefsList = [];
                                const waitersList = [];
                                
                                if (item.assignedChef) {
                                  const chefId = item.assignedChef._id?.toString() || item.assignedChef.toString();
                                  if (!chefsList.find(c => (c._id?.toString() || c.toString()) === chefId)) {
                                    chefsList.push(item.assignedChef);
                                  }
                                }
                                if (item.servedBy) {
                                  const waiterId = item.servedBy._id?.toString() || item.servedBy.toString();
                                  if (!waitersList.find(w => (w._id?.toString() || w.toString()) === waiterId)) {
                                    waitersList.push(item.servedBy);
                                  }
                                }
                                
                                // Kiểm tra comboItems
                                if (item.comboItems && Array.isArray(item.comboItems)) {
                                  item.comboItems.forEach(comboItem => {
                                    if (comboItem.assignedChef) {
                                      const chefId = comboItem.assignedChef._id?.toString() || comboItem.assignedChef.toString();
                                      if (!chefsList.find(c => (c._id?.toString() || c.toString()) === chefId)) {
                                        chefsList.push(comboItem.assignedChef);
                                      }
                                    }
                                    if (comboItem.servedBy) {
                                      const waiterId = comboItem.servedBy._id?.toString() || comboItem.servedBy.toString();
                                      if (!waitersList.find(w => (w._id?.toString() || w.toString()) === waiterId)) {
                                        waitersList.push(comboItem.servedBy);
                                      }
                                    }
                                  });
                                }
                                
                                return (
                                  <tr key={idx} className="border-b">
                                    <td className="p-2">{item.itemName || "-"}</td>
                                    <td className="p-2">{item.itemType === "menu" ? "Menu" : "Món đơn"}</td>
                                    <td className="p-2">{item.quantity || 0}</td>
                                    <td className="p-2">{formatCurrency(item.price || 0)}</td>
                                    <td className="p-2">
                                      {formatCurrency((item.price || 0) * (item.quantity || 0))}
                                    </td>
                                    <td className="p-2">
                                      {chefsList.length > 0 ? (
                                        <div className="text-xs space-y-0.5">
                                          {chefsList.map((chef, cIdx) => (
                                            <div key={cIdx}>{chef.name || "-"}</div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="p-2">
                                      {waitersList.length > 0 ? (
                                        <div className="text-xs space-y-0.5">
                                          {waitersList.map((waiter, wIdx) => (
                                            <div key={wIdx}>{waiter.name || "-"}</div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">-</span>
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

                    {/* Thông tin thanh toán */}
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Thông tin thanh toán</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Tổng tiền đơn:</span>
                          <span className="font-medium">
                            {formatCurrency(selectedOrder.totalAmount || 0)}
                          </span>
                        </div>
                        {(() => {
                          const totalPaid = selectedOrder.totalPaid || 0;
                          const remainingAmount = selectedOrder.remainingAmount || 0;
                          return (
                            <>
                              {totalPaid > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Đã thanh toán:</span>
                                  <span className="font-medium text-green-600">
                                    {formatCurrency(totalPaid)}
                                  </span>
                                </div>
                              )}
                              {remainingAmount > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Còn lại:</span>
                                  <span className="font-medium text-red-600">
                                    {formatCurrency(remainingAmount)}
                                  </span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-semibold">Trạng thái thanh toán:</span>
                          <span className={`font-semibold ${
                            selectedOrder.paymentStatus === "paid" ? "text-green-600" :
                            selectedOrder.paymentStatus === "partial" ? "text-yellow-600" :
                            "text-red-600"
                          }`}>
                            {selectedOrder.paymentStatus === "paid" ? "Đã thanh toán" :
                             selectedOrder.paymentStatus === "partial" ? "Thanh toán một phần" :
                             "Chưa thanh toán"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Nhân viên phục vụ */}
                    {selectedOrder.servedBy && selectedOrder.servedBy.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-lg mb-3">Nhân viên phục vụ</h3>
                        <div className="space-y-1 text-sm">
                          {selectedOrder.servedBy.map((waiter, idx) => (
                            <div key={idx}>
                              {waiter.name} {waiter.email && `(${waiter.email})`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
      </Card>
    </div>
  );
}

