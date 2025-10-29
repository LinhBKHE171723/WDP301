import React, { useState } from "react";
import kitchenApi from "../../api/kitchenApi";
import { toast } from "react-toastify";
export default function ChefModal({
  chefs,
  itemId,
  orders,
  setOrders,
  onClose,
}) {
  const [loading, setLoading] = useState(false);

  const handleSelectChef = async (chef) => {
    try {
      setLoading(true);
      // 🧩 Gọi API thật
      const res = await kitchenApi.assignChefToItem(itemId, chef._id);
      toast.success(res.data?.message || "Giao món thành công!");

      // Cập nhật lại UI local
      setOrders((prevOrders) =>
        prevOrders.map((order) => ({
          ...order,
          items: order.items.map((i) =>
            i.orderItemId === itemId
              ? { ...i, chef: chef.name, status: "preparing" }
              : i
          ),
        }))
      );

      onClose();
    } catch (err) {
      console.error("Lỗi khi giao đầu bếp:", err);
      // Hiển thị thông báo lỗi chi tiết từ backend
      // err.response có thể là response từ axios interceptor (đã bị unwrap)
      // hoặc err.response.data nếu từ axios error
      const errorMessage = err.response?.message || err.message || err.error?.message || "Không thể giao món. Vui lòng thử lại.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
        <h3 className="text-lg font-bold mb-4 text-gray-800">
          Chọn đầu bếp để giao món
        </h3>

        {chefs.length === 0 ? (
          <p className="text-gray-500 text-center">
            Chưa có đầu bếp nào trong hệ thống.
          </p>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {chefs.map((chef) => (
              <div
                key={chef._id}
                onClick={() => handleSelectChef(chef)}
                className="p-3 border rounded-lg cursor-pointer hover:border-orange-400 flex items-center justify-between transition-all"
              >
                <div>
                  <div className="font-medium text-gray-900">{chef.name}</div>
                  <div className="text-sm text-gray-500">{chef.email}</div>
                </div>
                <div className="text-orange-500 font-bold">
                  {loading ? "..." : "Chọn"}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-right mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
