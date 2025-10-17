import React from "react";

export default function OrderDetails({
  selectedOrder,
  setShowChefModal,
  setCurrentItem,
}) {
  if (!selectedOrder) {
    return (
      <div className="col-span-7 bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center h-96 text-gray-500">
        <svg className="w-16 h-16 mb-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg">Chọn một order để xem chi tiết</p>
      </div>
    );
  }

  return (
    <div className="col-span-7 bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Order #{selectedOrder._id?.slice(-4)}
      </h2>

      {selectedOrder.items.map((item) => (
        <div
          key={item.orderItemId}
          className="p-4 border rounded-lg mb-2 bg-gray-50 flex justify-between items-center"
        >
          <div>
            <h4 className="font-medium text-gray-900">{item.itemName}</h4>
            <p className="text-sm text-gray-600">Số lượng: {item.quantity}</p>
            {item.note && (
              <p className="text-sm italic text-gray-500">
                Ghi chú: {item.note}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {item.status === "pending" && (
              <button
                onClick={() => {
                  setCurrentItem(item.orderItemId);
                  setShowChefModal(true);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm"
              >
                Giao Chef
              </button>
            )}

            {item.status === "preparing" && (
              <span className="text-yellow-600 font-medium">🍳 Đang làm</span>
            )}

            {item.status === "ready" && (
              <span className="text-green-600 font-medium">✅ Sẵn sàng</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
