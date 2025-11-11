import React from "react";

export default function OrderQueue({ orders, selectedOrder, onSelectOrder }) {
  return (
    <div className="col-span-5 bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Hàng đợi Order</h2>
      <div className="space-y-3 h-[75vh] overflow-y-auto">
        {orders.map((order) => {
          const borderColor =
            order.waitTime > 300
              ? "border-red-300"
              : order.waitTime > 180
              ? "border-yellow-300"
              : "border-gray-200";

          return (
            <div
              key={order._id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-orange-400 ${borderColor} ${
                selectedOrder?._id === order._id
                  ? "border-orange-500 ring-2 ring-orange-200"
                  : ""
              }`}
              onClick={() => onSelectOrder(order)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">
                    Order #{order._id.slice(-4)}
                  </span>
                  {order.isPreOrder && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      📅 Đặt trước
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-600">
                  ⏱ {Math.floor((order.waitTime || 0) / 60)}:
                  {String((order.waitTime || 0) % 60).padStart(2, "0")}
                </span>
              </div>
              {order.isPreOrder && order.scheduledTime && (
                <p className="text-xs text-blue-600 mt-1 font-medium">
                  🕐 Đến ăn: {new Date(order.scheduledTime).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
              {order.isPreOrder && order.preparationStartTime && (
                <p className="text-xs text-purple-600 mt-0.5">
                  ⏰ Bắt đầu chuẩn bị: {new Date(order.preparationStartTime).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                Trạng thái:{" "}
                <span className="font-medium text-orange-600">
                  {order.status}
                </span>
              </p>
              <p className="text-gray-500 text-sm">
                Tổng món: {order.totalItems} | Còn lại: {order.itemsRemaining}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
