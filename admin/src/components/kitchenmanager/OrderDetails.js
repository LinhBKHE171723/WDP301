import React, { useState } from "react";
import kitchenApi from "../../api/kitchenApi";
import { toast } from "react-toastify";

export default function OrderDetails({
  selectedOrder,
  setShowChefModal,
  setCurrentItem,
  setOrders,
}) {
  const [loading, setLoading] = useState(false);

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

  // Hàm xử lý khi nhấn nút "Hoàn thành" cho từng món trong combo
  const handleMarkComboItemAsReady = async (orderItemId, comboItemIndex) => {
    setLoading(true);
    try {
      // 1. Gọi API để update status của combo item
      await kitchenApi.updateComboItemStatus(
        orderItemId,
        comboItemIndex,
        "ready"
      );
      toast.success("Đã hoàn thành món trong combo!");

      // 2. Cập nhật state local ngay lập tức để tránh bấm lại
      setOrders((prevOrders) =>
        prevOrders.map((order) => {
          if (order._id !== selectedOrder._id) return order;

          // Handle cả items (API format) và orderItems (WebSocket format)
          const currentItems = order.items || order.orderItems || [];
          const updatedItems = currentItems.map((item) => {
            const itemId = item.orderItemId || item._id;
            if (
              itemId === orderItemId &&
              item.comboItems &&
              item.comboItems[comboItemIndex]
            ) {
              // Cập nhật comboItem status
              return {
                ...item,
                comboItems: item.comboItems.map((ci, idx) =>
                  idx === comboItemIndex ? { ...ci, status: "ready" } : ci
                ),
              };
            }
            return item;
          });

          // Giữ nguyên cấu trúc dữ liệu (items hoặc orderItems)
          return {
            ...order,
            items: order.items ? updatedItems : undefined,
            orderItems: order.orderItems ? updatedItems : undefined,
          };
        })
      );
    } catch (err) {
      console.error("Lỗi khi hoàn thành món trong combo:", err);
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
  
  // Helper function để check một item (bao gồm comboItems) đã ready chưa
  const isItemReady = (item) => {
    // Nếu là combo, phải check tất cả comboItems
    if (item.itemType === "menu" && item.comboItems && item.comboItems.length > 0) {
      // Tất cả comboItems phải ready hoặc served
      return item.comboItems.every(
        (ci) => ci.status === "ready" || ci.status === "served"
      );
    }
    // Nếu là item thường, check status của chính nó
    return item.status === "ready" || item.status === "served";
  };
  
  const isAllItemsReady =
    orderItems.length > 0 &&
    orderItems.every((item) => isItemReady(item));

  return (
    <div className="col-span-7 bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          Chi tiết Order #{selectedOrder._id?.slice(-4)}
        </h2>
        {selectedOrder.isPreOrder && (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
            📅 Đơn đặt trước
          </span>
        )}
      </div>

      {/* Thông tin pre-order */}
      {selectedOrder.isPreOrder && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Thông tin đặt trước:
          </h3>
          <div className="space-y-1 text-sm">
            {selectedOrder.scheduledTime && (
              <p className="text-blue-700">
                <span className="font-medium">🕐 Thời gian đến ăn:</span>{" "}
                {new Date(selectedOrder.scheduledTime).toLocaleString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            {selectedOrder.preparationStartTime && (
              <p className="text-purple-700">
                <span className="font-medium">⏰ Bắt đầu chuẩn bị:</span>{" "}
                {new Date(selectedOrder.preparationStartTime).toLocaleString(
                  "vi-VN",
                  {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              </p>
            )}
            {selectedOrder.reservedEndTime && (
              <p className="text-purple-700">
                <span className="font-medium">🔚 Kết thúc dành bàn:</span>{" "}
                {new Date(selectedOrder.reservedEndTime).toLocaleString(
                  "vi-VN",
                  {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              </p>
            )}
          </div>
        </div>
      )}

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
              itemName: item.itemName || item.itemId?.name || "Món đã xóa",
              quantity: item.quantity,
              note: item.note,
              status: item.status,
              itemType: item.itemType,
              comboItems: item.comboItems || [],
              chef: item.chef || item.assignedChef?.name || item.assignedChef,
            };

            const isCombo =
              normalizedItem.itemType === "menu" &&
              normalizedItem.comboItems.length > 0;

            return (
              <div
                key={normalizedItem.orderItemId}
                className="p-4 border rounded-lg bg-gray-50"
              >
                {/* Header cho combo hoặc món đơn */}
                <div className="flex items-start justify-between space-x-4">
                  {/* Phần thông tin (bên trái) */}
                  <div className="flex-grow">
                    <h4 className="font-semibold text-lg text-gray-900">
                      {normalizedItem.itemName}{" "}
                      {isCombo && (
                        <span className="text-sm text-blue-600">(Combo)</span>
                      )}{" "}
                      (x{normalizedItem.quantity})
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

                  {/* Phần trạng thái/hành động (bên phải) - chỉ cho món đơn lẻ */}
                  {!isCombo && (
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
                          onClick={() =>
                            handleMarkAsReady(normalizedItem.orderItemId)
                          }
                          disabled={loading}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors disabled:bg-gray-400"
                        >
                          {loading ? "..." : "Hoàn thành"}
                        </button>
                      )}

                      {normalizedItem.status === "ready" && (
                        <span className="text-green-700 font-medium text-sm px-3 py-1 bg-green-100 rounded-full">
                          Sẵn sàng
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Hiển thị combo items nếu là combo */}
                {isCombo && (
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Các món trong combo:
                    </p>
                    <div className="space-y-2">
                      {normalizedItem.comboItems.map((comboItem, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                        >
                          <div className="flex-grow">
                            <span className="text-sm text-gray-800">
                              {comboItem.itemName}
                            </span>
                            <span
                              className={`ml-2 text-xs px-2 py-1 rounded ${
                                comboItem.status === "ready"
                                  ? "bg-green-100 text-green-700"
                                  : comboItem.status === "preparing"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {comboItem.status === "ready"
                                ? "Sẵn sàng"
                                : comboItem.status === "preparing"
                                ? "🔄 Đang làm"
                                : "⏳ Chờ"}
                            </span>
                            {/* Hiển thị chef đã được gán cho món này */}
                            {comboItem.assignedChef && (
                              <div className="mt-1 text-xs text-blue-600">
                                👨‍🍳{" "}
                                {typeof comboItem.assignedChef === "object" &&
                                comboItem.assignedChef.name
                                  ? comboItem.assignedChef.name
                                  : typeof comboItem.assignedChef ===
                                      "string" &&
                                    comboItem.assignedChef.length > 20
                                  ? comboItem.assignedChef.substring(0, 8) +
                                    "..." // Hiển thị một phần ID nếu chưa populate (fallback)
                                  : comboItem.assignedChef}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Nút Giao Bếp cho từng món trong combo */}
                            {comboItem.status === "pending" && (
                              <button
                                onClick={() => {
                                  // Truyền orderItemId và comboItemIndex để biết giao món nào
                                  setCurrentItem({
                                    orderItemId: normalizedItem.orderItemId,
                                    comboItemIndex: index,
                                    comboItemName: comboItem.itemName,
                                  });
                                  setShowChefModal(true);
                                }}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                              >
                                Giao Bếp
                              </button>
                            )}
                            {/* Nút Hoàn thành cho từng món trong combo - chỉ hiển thị khi status là "preparing" */}
                            {comboItem.status === "preparing" && (
                              <button
                                onClick={() =>
                                  handleMarkComboItemAsReady(
                                    normalizedItem.orderItemId,
                                    index
                                  )
                                }
                                disabled={
                                  loading || comboItem.status !== "preparing"
                                }
                                className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                              >
                                {loading ? "..." : "Hoàn thành"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Trạng thái tổng thể của combo */}
                    <div className="mt-3 pt-2 border-t border-gray-300">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          Trạng thái combo:
                        </span>
                        <span
                          className={`text-sm px-3 py-1 rounded font-medium ${
                            normalizedItem.status === "ready"
                              ? "bg-green-100 text-green-700"
                              : normalizedItem.status === "preparing"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {normalizedItem.status === "ready"
                            ? "✅ Sẵn sàng"
                            : normalizedItem.status === "preparing"
                            ? "🔄 Đang làm"
                            : "⏳ Chờ"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
