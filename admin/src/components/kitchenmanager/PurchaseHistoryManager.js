import React, { useState, useMemo } from "react";

export default function PurchaseHistoryManager({ purchaseOrders }) {
  const [page, setPage] = useState(1);
  const perPage = 10;

  // ✅ Sắp xếp giảm dần theo thời gian
  const sortedOrders = useMemo(() => {
    return [...purchaseOrders].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [purchaseOrders]);

  // ✅ Phân trang
  const totalPages = Math.ceil(sortedOrders.length / perPage);
  const displayed = sortedOrders.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        📜 Lịch sử nhập hàng
      </h2>

      {displayed.length === 0 ? (
        <p className="text-gray-500 italic text-center py-4">
          Chưa có đơn nhập hàng nào.
        </p>
      ) : (
        <>
          <table className="w-full border-collapse text-sm text-gray-700">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Tên nguyên liệu</th>
                <th className="px-4 py-2 text-left">Số lượng</th>
                <th className="px-4 py-2 text-left">Đơn vị</th>
                <th className="px-4 py-2 text-left">Nhà cung cấp</th>
                <th className="px-4 py-2 text-left">Ghi chú</th>
                <th className="px-4 py-2 text-left">Thời gian nhập</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((order) => (
                <tr key={order._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">
                    {order.ingredientId?.name || "—"}
                  </td>
                  <td className="px-4 py-2">{order.quantity}</td>
                  <td className="px-4 py-2">{order.unit}</td>
                  <td className="px-4 py-2">{order.supplier || "—"}</td>
                  <td className="px-4 py-2 text-gray-600 italic">
                    {order.note || "—"}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ✅ Pagination */}
          <div className="flex justify-between items-center mt-4">
            <p className="text-gray-600 text-sm">
              Trang {page}/{totalPages} — Tổng {purchaseOrders.length} đơn nhập
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
