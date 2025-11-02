import React, { useState, useMemo } from "react";

export default function PurchaseHistoryManager({ purchaseOrders }) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all"); // all | valid | expired | near
  const perPage = 10;

  // ✅ Hàm kiểm tra trạng thái hạn dùng
  const checkStatus = (order) => {
    if (!order.expiryDate) return "valid"; // Nếu không có ngày hết hạn thì coi là còn hạn

    const expiry = new Date(order.expiryDate);
    const now = new Date();
    const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);

    if (diffDays < 0) return "expired";
    if (diffDays <= 3) return "near"; // ≤ 3 ngày là gần hết hạn
    return "valid";
  };

  // ✅ Lọc danh sách theo filter
  const filteredOrders = useMemo(() => {
    if (filter === "all") return purchaseOrders;
    return purchaseOrders.filter((o) => checkStatus(o) === filter);
  }, [filter, purchaseOrders]);

  // ✅ Sắp xếp giảm dần theo thời gian nhập
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort(
      (a, b) => new Date(b.time) - new Date(a.time)
    );
  }, [filteredOrders]);

  // ✅ Phân trang
  const totalPages = Math.ceil(sortedOrders.length / perPage);
  const displayed = sortedOrders.slice((page - 1) * perPage, page * perPage);

  // ✅ Format ngày giờ
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          📜 Lịch sử nhập hàng
        </h2>

        {/* ✅ Bộ lọc trạng thái */}
        <div className="flex space-x-2">
          {[
            { key: "all", label: "Tất cả" },
            { key: "valid", label: "✅ Còn hạn" },
            { key: "near", label: "⚠️ Gần hết hạn" },
            { key: "expired", label: "❌ Hết hạn" },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => {
                setFilter(btn.key);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-sm font-medium border ${
                filter === btn.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {displayed.length === 0 ? (
        <p className="text-gray-500 italic text-center py-4">
          Không có đơn nhập hàng phù hợp.
        </p>
      ) : (
        <>
          <table className="w-full border-collapse text-sm text-gray-700">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Nguyên liệu</th>
                <th className="px-4 py-2 text-left">Số lượng</th>
                <th className="px-4 py-2 text-left">Đơn vị</th>
                <th className="px-4 py-2 text-left">💰 Giá nhập</th>
                <th className="px-4 py-2 text-left">🕒 Ngày nhập</th>
                <th className="px-4 py-2 text-left">📅 Hạn sử dụng</th>
                <th className="px-4 py-2 text-left">Trạng thái</th>
                <th className="px-4 py-2 text-left">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((order) => {
                const status = checkStatus(order);
                return (
                  <tr key={order._id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">
                      {order.ingredientId?.name || "—"}
                    </td>
                    <td className="px-4 py-2">
                      {order.quantity?.toLocaleString("vi-VN") || 0}
                    </td>
                    <td className="px-4 py-2">{order.unit}</td>
                    <td className="px-4 py-2">
                      {order.price
                        ? `${order.price.toLocaleString("vi-VN")} ₫`
                        : "—"}
                    </td>
                    <td className="px-4 py-2">{formatDate(order.time)}</td>
                    <td className="px-4 py-2">
                      {order.expiryDate ? formatDate(order.expiryDate) : "—"}
                    </td>
                    <td
                      className={`px-4 py-2 font-semibold ${
                        status === "expired"
                          ? "text-red-600"
                          : status === "near"
                          ? "text-orange-500"
                          : "text-green-600"
                      }`}
                    >
                      {status === "expired"
                        ? "Hết hạn"
                        : status === "near"
                        ? "Gần hết hạn"
                        : "Còn hạn"}
                    </td>
                    <td className="px-4 py-2 text-gray-600 italic">
                      {order.note || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <p className="text-gray-600 text-sm">
              Trang {page}/{totalPages} — Tổng {filteredOrders.length} đơn nhập
            </p>

            <div className="flex space-x-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className={`px-3 py-1 rounded ${
                  page === 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gray-300 hover:bg-gray-400 text-gray-800"
                }`}
              >
                ← Trước
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className={`px-3 py-1 rounded ${
                  page === totalPages
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gray-300 hover:bg-gray-400 text-gray-800"
                }`}
              >
                Sau →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
