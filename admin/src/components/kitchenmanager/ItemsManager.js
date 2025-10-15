import React, { useState } from "react";
import kitchenApi from "../../api/kitchenApi";
import AddItemModal from "./AddItemModal"; // ✅ import modal dùng chung

export default function ItemsManager({ items, setItems }) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // ✅ item đang được sửa

  // ✅ Toggle trạng thái có sẵn / hết hàng
  const handleToggleAvailable = async (id, currentStatus) => {
    try {
      setLoading(true);
      if (currentStatus) await kitchenApi.markItemUnavailable(id);
      else await kitchenApi.markItemAvailable(id);

      setItems((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, isAvailable: !item.isAvailable } : item
        )
      );
    } catch (err) {
      alert("❌ Lỗi khi cập nhật trạng thái món ăn!");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Xóa món ăn
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa món này?")) return;
    try {
      setLoading(true);
      await kitchenApi.deleteItem(id);
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      alert("❌ Lỗi khi xóa món ăn!");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Lọc theo từ khóa tìm kiếm
  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  // ✅ Mở modal thêm món
  const handleAddItem = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  // ✅ Mở modal sửa món
  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý Món ăn</h2>
        <button
          onClick={handleAddItem}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          + Thêm món ăn
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm món ăn..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {loading && (
        <p className="text-orange-600 mb-2 text-sm animate-pulse">
          ⏳ Đang xử lý...
        </p>
      )}

      <table className="w-full text-sm text-gray-700 border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left">Tên món</th>
            <th className="px-4 py-2 text-left">Mô tả</th>
            <th className="px-4 py-2 text-left">Giá</th>
            <th className="px-4 py-2 text-left">Trạng thái</th>
            <th className="px-4 py-2 text-left">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center text-gray-500 py-4 italic">
                Không tìm thấy món nào.
              </td>
            </tr>
          ) : (
            filtered.map((item) => (
              <tr key={item._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{item.name}</td>
                <td className="px-4 py-2">{item.description}</td>
                <td className="px-4 py-2">
                  {item.price.toLocaleString("vi-VN")} ₫
                </td>
                <td className="px-4 py-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.isAvailable}
                      onChange={() =>
                        handleToggleAvailable(item._id, item.isAvailable)
                      }
                      className="sr-only"
                    />
                    <div className="relative">
                      <div className="block bg-gray-300 w-12 h-6 rounded-full"></div>
                      <div
                        className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${
                          item.isAvailable ? "translate-x-6 bg-green-500" : ""
                        }`}
                      ></div>
                    </div>
                    <span
                      className={`ml-2 text-sm font-medium ${
                        item.isAvailable ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {item.isAvailable ? "Còn hàng" : "Hết hàng"}
                    </span>
                  </label>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleEditItem(item)}
                    className="text-orange-600 hover:text-orange-900 mr-3"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showModal && (
        <AddItemModal
          show={showModal}
          onClose={() => setShowModal(false)}
          setItems={setItems}
          editItem={editingItem}
        />
      )}
    </div>
  );
}
