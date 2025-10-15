import React, { useState, useEffect } from "react";
import kitchenApi from "../../api/kitchenApi";

export default function AddMenuModal({
  show,
  onClose,
  items = [],
  setMenus,
  editMenu,
}) {
  const isEdit = Boolean(editMenu);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "single",
    items: [],
    price: "",
    image: "",
    isAvailable: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Khi mở modal sửa -> đổ dữ liệu cũ
  useEffect(() => {
    if (isEdit && editMenu) {
      setFormData({
        name: editMenu.name || "",
        description: editMenu.description || "",
        type: editMenu.type || "single",
        items:
          editMenu.items?.map((i) => (typeof i === "object" ? i._id : i)) || [],
        price: editMenu.price || "",
        image: editMenu.image || "",
        isAvailable: editMenu.isAvailable ?? true,
      });
    } else {
      // reset khi thêm mới
      setFormData({
        name: "",
        description: "",
        type: "single",
        items: [],
        price: "",
        image: "",
        isAvailable: true,
      });
    }
  }, [editMenu, isEdit, show]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleItemSelect = (itemId) => {
    setFormData((prev) => {
      const selected = new Set(prev.items);
      selected.has(itemId) ? selected.delete(itemId) : selected.add(itemId);
      return { ...prev, items: [...selected] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!formData.name) {
        setError("⚠️ Vui lòng nhập tên thực đơn.");
        setLoading(false);
        return;
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        items: formData.items,
        price: Number(formData.price) || 0,
        image: formData.image,
        isAvailable: formData.isAvailable,
      };

      let res;
      if (isEdit) {
        // ✏️ Chế độ sửa
        res = await kitchenApi.updateMenu(editMenu._id, payload);
        setMenus((prev) =>
          prev.map((m) => (m._id === editMenu._id ? res.data.menu : m))
        );

        alert("✅ Cập nhật thực đơn thành công!");
      } else {
        // ➕ Thêm mới
        res = await kitchenApi.createMenu(payload);
        setMenus((prev) => [...prev, res.data]);
        alert("✅ Tạo thực đơn thành công!");
      }

      onClose();
    } catch (err) {
      console.error(err);
      setError("❌ Lỗi khi lưu thực đơn. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative animate-fadeIn">
        {/* Header */}
        <div className="flex justify-between items-center mb-5 border-b pb-2">
          <h2 className="text-xl font-bold text-gray-800">
            {isEdit ? "✏️ Chỉnh sửa Thực Đơn" : "📋 Tạo Thực Đơn Mới"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-lg font-semibold"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
        >
          {/* Tên thực đơn */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên thực đơn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nhập tên thực đơn..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Mô tả chi tiết thực đơn..."
              rows="2"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Loại thực đơn */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại thực đơn
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="single">Đơn món</option>
              <option value="combo">Combo</option>
            </select>
          </div>

          {/* Danh sách món ăn */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chọn món trong thực đơn
            </label>
            <div className="border rounded-lg p-2 max-h-40 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-gray-500 text-sm italic text-center py-3">
                  Chưa có món ăn nào.
                </p>
              ) : (
                items.map((item) => (
                  <label
                    key={item._id}
                    className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-50 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={formData.items.includes(item._id)}
                      onChange={() => handleItemSelect(item._id)}
                      className="text-orange-500 focus:ring-orange-400"
                    />
                    <span className="text-gray-700 text-sm">
                      {item.name}{" "}
                      <span className="text-gray-400 text-xs">
                        ({item.price.toLocaleString("vi-VN")} ₫)
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Giá */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giá tổng (₫)
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Nhập giá thực đơn..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Hình ảnh */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link hình ảnh
            </label>
            <input
              type="text"
              name="image"
              value={formData.image}
              onChange={handleChange}
              placeholder="Nhập URL hình ảnh (tuỳ chọn)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            {formData.image && (
              <img
                src={formData.image}
                alt="preview"
                className="mt-3 rounded-lg shadow-md w-40 h-40 object-cover mx-auto border"
              />
            )}
          </div>

          {/* Trạng thái */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="isAvailable"
              checked={formData.isAvailable}
              onChange={handleChange}
              className="w-5 h-5 text-orange-500 rounded focus:ring-orange-400"
            />
            <label className="text-sm font-medium text-gray-700">
              Thực đơn này hiện đang bán
            </label>
          </div>

          {/* Error */}
          {error && (
            <p className="text-center text-red-600 font-medium text-sm">
              {error}
            </p>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-3 border-t mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-800 font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded-lg font-medium text-white ${
                loading
                  ? "bg-orange-300 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {loading
                ? "Đang lưu..."
                : isEdit
                ? "Lưu thay đổi"
                : "Tạo thực đơn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
