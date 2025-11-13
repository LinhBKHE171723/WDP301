import React, { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import kitchenApi from "../../api/kitchenApi";

export default function PurchaseHistoryManager({ purchaseOrders, onRefresh }) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all"); // all | valid | expired | near
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);
  const perPage = 10;

  const checkStatus = (order) => {
    if (!order.expiryDate) return "valid"; // Nếu không có ngày hết hạn thì coi là còn hạn

    const expiry = new Date(order.expiryDate);
    const now = new Date();
    const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);

    if (diffDays < 0) return "expired";
    if (diffDays <= 3) return "near";
    return "valid";
  };

  //  Lọc danh sách theo filter
  const filteredOrders = useMemo(() => {
    if (filter === "all") return purchaseOrders;
    return purchaseOrders.filter((o) => checkStatus(o) === filter);
  }, [filter, purchaseOrders]);

  //  Sắp xếp giảm dần theo thời gian nhập
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort(
      (a, b) => new Date(b.time) - new Date(a.time)
    );
  }, [filteredOrders]);

  //  Phân trang
  const totalPages = Math.ceil(sortedOrders.length / perPage);
  const displayed = sortedOrders.slice((page - 1) * perPage, page * perPage);

  //  Format ngày giờ
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

  //  Parse ngày từ Excel (hỗ trợ nhiều format)
  const parseExcelDate = (dateValue) => {
    if (!dateValue) return null;

    // Nếu là số (Excel serial date)
    if (typeof dateValue === "number") {
      // Excel serial date: số ngày kể từ 1/1/1900
      const excelEpoch = new Date(1899, 11, 30); // 30/12/1899
      const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
      return date.toISOString().split("T")[0]; // YYYY-MM-DD
    }

    // Nếu là chuỗi
    if (typeof dateValue === "string") {
      // Thử parse các format phổ biến
      let date;

      // Format: MM/DD/YYYY hoặc M/D/YYYY
      if (dateValue.includes("/")) {
        const parts = dateValue.split("/");
        if (parts.length === 3) {
          const [month, day, year] = parts;
          date = new Date(year, month - 1, day);
        }
      }
      // Format: DD-MM-YYYY hoặc YYYY-MM-DD
      else if (dateValue.includes("-")) {
        date = new Date(dateValue);
      }

      // Kiểm tra ngày hợp lệ
      if (date && !isNaN(date.getTime())) {
        return date.toISOString().split("T")[0]; // YYYY-MM-DD
      }
    }

    // Nếu là Date object
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split("T")[0];
    }

    return null;
  };

  // Xử lý upload file Excel
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Validate và chuyển đổi dữ liệu
      const purchaseOrdersData = jsonData.map((row, index) => {
        // Kiểm tra các trường bắt buộc
        if (!row["Mã nguyên liệu"] || !row["Số lượng"]) {
          throw new Error(
            `Dòng ${index + 2}: Thiếu Mã nguyên liệu hoặc Số lượng`
          );
        }

        // Parse ngày hết hạn
        const expiryDate = parseExcelDate(row["Hạn sử dụng"]);

        return {
          ingredientId: row["Mã nguyên liệu"], // ID của ingredient
          quantity: parseFloat(row["Số lượng"]),
          unit: row["Đơn vị"] || "kg",
          price: row["Giá nhập"] ? parseFloat(row["Giá nhập"]) : 0,
          expiryDate: expiryDate,
          note: row["Ghi chú"] || "",
        };
      });

      // Gọi API để tạo purchase orders hàng loạt
      const promises = purchaseOrdersData.map((po) =>
        kitchenApi.createPurchaseOrder(po)
      );

      await Promise.all(promises);

      // Thông báo thành công
      toast.success(` Nhập thành công ${purchaseOrdersData.length} đơn hàng!`, {
        position: "top-right",
        autoClose: 3000,
      });

      // Reset input trước
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      //  Delay nhỏ để backend kịp lưu, sau đó refresh
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (onRefresh) {
        console.log(" Calling onRefresh...");
        await onRefresh();
        console.log(" Data refreshed!");
      }
    } catch (error) {
      console.error(" Lỗi khi import Excel:", error);
      const errorMsg = error.message || "Không thể xử lý file Excel";
      setUploadError(errorMsg);

      // ✅ Thông báo lỗi
      toast.error(` ${errorMsg}`, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setUploading(false);
    }
  };

  //  Tải file Excel mẫu
  const downloadTemplate = () => {
    const template = [
      {
        "Mã nguyên liệu": "673b8f9a1234567890abcdef",
        "Số lượng": 100,
        "Đơn vị": "kg",
        "Giá nhập": 50000,
        "Hạn sử dụng": "2025-12-31",
        "Ghi chú": "Nhập từ nhà cung cấp A",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "MauNhapKho.xlsx");
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          📜 Lịch sử nhập hàng
        </h2>

        <div className="flex items-center space-x-3">
          {/*  Button Import Excel */}
          <div className="flex items-center space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
              id="excel-upload"
            />
            <label
              htmlFor="excel-upload"
              className={`px-4 py-2 rounded-lg font-medium cursor-pointer transition-colors ${
                uploading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {uploading ? "⏳ Đang xử lý..." : "📤 Import Excel"}
            </label>
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              📥 Tải mẫu Excel
            </button>
          </div>

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
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <p className="font-medium">❌ Lỗi: {uploadError}</p>
        </div>
      )}

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
