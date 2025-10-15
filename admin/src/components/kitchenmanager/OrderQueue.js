import React from "react";

export default function OrderQueue({ orders, selectedOrder, onSelectOrder }) {
  return (
    <div className="col-span-5 bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Hàng đợi Order</h2>
      <div className="space-y-3 max-h-96 overflow-y-auto">
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
                <span className="font-bold text-gray-900">
                  Order #{order._id.slice(-4)}
                </span>
                <span className="text-sm text-gray-600">
                  ⏱ {Math.floor((order.waitTime || 0) / 60)}:
                  {String((order.waitTime || 0) % 60).padStart(2, "0")}
                </span>
              </div>
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
