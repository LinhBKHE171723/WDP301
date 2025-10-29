import React, { useState } from "react";
import kitchenApi from "../../api/kitchenApi"; // Import file api
import { toast } from "react-toastify"; // Import toast

export default function OrderDetails({
  selectedOrder,
  setShowChefModal,
  setCurrentItem,
  setOrders, // Prop này được truyền từ KitchenDashboard
}) {
  const [loading, setLoading] = useState(false);

  // Hàm xử lý khi nhấn nút "Hoàn thành"
  const handleMarkAsReady = async (orderItemId) => {
    setLoading(true);
    try {
      // 1. Gọi API
      await kitchenApi.markItemReady(orderItemId);
      toast.success("Đã hoàn thành món!");

      // 2. Cập nhật state local
      setOrders((prevOrders) =>
        prevOrders.map((order) => {
          if (order._id !== selectedOrder._id) return order;

          // Handle cả items (API format) và orderItems (WebSocket format)
          const currentItems = order.items || order.orderItems || [];
          const updatedItems = currentItems.map((item) => {
            const itemId = item.orderItemId || item._id;
            return itemId === orderItemId
              ? { ...item, status: "ready" } // Chuyển status item sang "ready"
              : item;
          });

          // Tính toán lại số món còn lại
          const newItemsRemaining = updatedItems.filter(
            (item) => item.status !== "ready"
          ).length;

          // Nếu không còn món nào, chuyển status của cả order sang "ready"
          const newOrderStatus =
            newItemsRemaining === 0 ? "ready" : order.status;

          // Giữ nguyên cấu trúc dữ liệu (items hoặc orderItems)
          return {
            ...order,
            items: order.items ? updatedItems : undefined,
            orderItems: order.orderItems ? updatedItems : undefined,
            itemsRemaining: newItemsRemaining,
            status: newOrderStatus,
          };
        })
      );
    } catch (err) {
      console.error("Lỗi khi hoàn thành món:", err);
      toast.error("Không thể hoàn thành món. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedOrder) {
    return (
      <div className="col-span-7 bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center h-96 text-gray-500">
        <svg
          className="w-16 h-16 mb-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7v3m0 0v3m0-3h3m-3 0H9"
          />
        </svg>
        <p className="text-lg">Chọn một order để xem chi tiết</p>
      </div>
    );
  }

  // Kiểm tra xem tất cả các món đã sẵn sàng chưa
  // Handle cả items (từ API format) và orderItems (từ WebSocket raw data)
  const orderItems = selectedOrder.items || selectedOrder.orderItems || [];
  const isAllItemsReady = orderItems.length > 0 && orderItems.every(
    (item) => item.status === "ready"
  );

  return (
    <div className="col-span-7 bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Chi tiết Order #{selectedOrder._id?.slice(-4)}
      </h2>

      {/* Nếu tất cả sẵn sàng, hiển thị thông báo */}
      {isAllItemsReady ? (
        <div className="flex flex-col items-center justify-center h-80 text-green-600">
          <svg
            className="w-20 h-20 mb-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-2xl font-bold">🎉 Order đã hoàn thành!</p>
          <p className="text-gray-500">Sẵn sàng để phục vụ.</p>
        </div>
      ) : (
        /* Ngược lại, hiển thị danh sách món ăn */
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          {orderItems.map((item) => {
            // Normalize item structure (handle cả API format và raw WebSocket data)
            const normalizedItem = {
              orderItemId: item.orderItemId || item._id,
              itemName: item.itemName || (item.itemId?.name) || "Món đã xóa",
              quantity: item.quantity,
              note: item.note,
              status: item.status,
              chef: item.chef || (item.assignedChef?.name) || item.assignedChef
            };
            
            return (
            <div
              key={normalizedItem.orderItemId}
              className="p-4 border rounded-lg bg-gray-50 flex items-start justify-between space-x-4"
            >
              {/* Phần thông tin (bên trái) */}
              <div className="flex-grow">
                <h4 className="font-semibold text-lg text-gray-900">
                  {normalizedItem.itemName} (x{normalizedItem.quantity})
                </h4>

                {normalizedItem.note && (
                  <p className="text-sm italic text-red-600 font-medium">
                    Ghi chú: {normalizedItem.note}
                  </p>
                )}

                {/* HIỂN THỊ TÊN CHEF */}
                {normalizedItem.chef ? (
                  <p className="text-sm text-blue-600 font-medium mt-1">
                    👨‍🍳 Bếp phụ trách: {normalizedItem.chef}
                  </p>
                ) : (
                  normalizedItem.status === "pending" && (
                    <p className="text-sm text-gray-500 italic mt-1">
                      (Chưa giao bếp)
                    </p>
                  )
                )}
              </div>

              {/* Phần trạng thái/hành động (bên phải) */}
              <div className="flex-shrink-0 flex flex-col items-end min-w-[100px]">
                {normalizedItem.status === "pending" && (
                  <button
                    onClick={() => {
                      setCurrentItem(normalizedItem.orderItemId);
                      setShowChefModal(true);
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Giao Bếp
                  </button>
                )}

                {/* NÚT HOÀN THÀNH */}
                {normalizedItem.status === "preparing" && (
                  <button
                    onClick={() => handleMarkAsReady(normalizedItem.orderItemId)}
                    disabled={loading}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors disabled:bg-gray-400"
                  >
                    {loading ? "..." : "Hoàn thành"}
                  </button>
                )}

                {normalizedItem.status === "ready" && (
                  <span className="text-green-700 font-medium text-sm px-3 py-1 bg-green-100 rounded-full">
                    ✅ Sẵn sàng
                  </span>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
