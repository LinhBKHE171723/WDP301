import React, { useState } from "react";
import kitchenApi from "../../api/kitchenApi";
import AddMenuModal from "./AddMenuModal";

export default function MenusManager({ menus, items = [], setMenus }) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);

  // ✅ Xử lý đổi trạng thái hoạt động
  const handleToggleAvailable = async (id, currentStatus) => {
    try {
      setLoading(true);
      if (currentStatus) await kitchenApi.markMenuUnavailable(id);
      else await kitchenApi.markMenuAvailable(id);

      setMenus((prev) =>
        prev.map((m) =>
          m._id === id ? { ...m, isAvailable: !m.isAvailable } : m
        )
      );
    } catch (err) {
      alert("❌ Lỗi khi cập nhật trạng thái thực đơn!");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Xóa thực đơn
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa thực đơn này?")) return;
    try {
      setLoading(true);
      await kitchenApi.deleteMenu(id);
      setMenus((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      alert("❌ Lỗi khi xóa thực đơn!");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Hiển thị danh sách món trong thực đơn
  const resolveItemNames = (menu) => {
    if (!menu.items || menu.items.length === 0) return "Không có món";

    if (typeof menu.items[0] === "object") {
      return menu.items.map((i) => i.name).join(", ");
    }

    return menu.items
      .map((id) => items.find((i) => i._id === id)?.name || "Không xác định")
      .join(", ");
  };

  const filteredMenus = (menus || []).filter(
    (m) => m && m.name && m.name.toLowerCase().includes(search.toLowerCase())
  );

  // ✅ Mở modal thêm
  const handleAddMenu = () => {
    setEditingMenu(null);
    setShowModal(true);
  };

  // ✅ Mở modal sửa
  const handleEditMenu = (menu) => {
    setEditingMenu(menu);
    setShowModal(true);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý Thực đơn</h2>
        <button
          onClick={handleAddMenu}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          + Tạo thực đơn
        </button>
      </div>

      {/* Tìm kiếm */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm thực đơn..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {loading && (
        <p className="text-orange-600 mb-2 text-sm animate-pulse">
          ⏳ Đang xử lý...
        </p>
      )}

      {/* Table */}
      <table className="w-full text-sm text-gray-700 border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left">Tên thực đơn</th>
            <th className="px-4 py-2 text-left">Danh sách món</th>
            <th className="px-4 py-2 text-left">Giá</th>
            <th className="px-4 py-2 text-left">Trạng thái</th>
            <th className="px-4 py-2 text-left">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {filteredMenus.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center py-4 text-gray-500">
                Chưa có thực đơn nào.
              </td>
            </tr>
          ) : (
            filteredMenus.map((menu) => (
              <tr key={menu._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{menu.name}</td>
                <td className="px-4 py-2">{resolveItemNames(menu)}</td>
                <td className="px-4 py-2 font-semibold text-gray-900">
                  {menu.price ? `${menu.price.toLocaleString("vi-VN")} ₫` : "-"}
                </td>
                <td className="px-4 py-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={menu.isAvailable}
                      onChange={() =>
                        handleToggleAvailable(menu._id, menu.isAvailable)
                      }
                      className="sr-only"
                    />
                    <div className="relative">
                      <div className="block bg-gray-300 w-12 h-6 rounded-full"></div>
                      <div
                        className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${
                          menu.isAvailable ? "translate-x-6 bg-green-500" : ""
                        }`}
                      ></div>
                    </div>
                    <span
                      className={`ml-2 text-sm font-medium ${
                        menu.isAvailable ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {menu.isAvailable ? "Đang bán" : "Ngừng bán"}
                    </span>
                  </label>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleEditMenu(menu)}
                    className="text-orange-600 hover:text-orange-900 mr-3"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(menu._id)}
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

      {/* Modal thêm/sửa thực đơn */}
      {showModal && (
        <AddMenuModal
          show={showModal}
          onClose={() => setShowModal(false)}
          setMenus={setMenus}
          items={items}
          editMenu={editingMenu}
        />
      )}
    </div>
  );
}
