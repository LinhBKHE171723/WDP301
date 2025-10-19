import React, { useState, useEffect } from "react";
import kitchenApi from "../../api/kitchenApi";

export default function AddItemModal({ show, onClose, setItems, editItem }) {
  const isEdit = Boolean(editItem); // ✅ kiểm tra chế độ
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    image: "",
    ingredients: "",
    isAvailable: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Khi mở modal sửa thì fill dữ liệu cũ
  useEffect(() => {
    if (isEdit && editItem) {
      setFormData({
        name: editItem.name || "",
        description: editItem.description || "",
        category: editItem.category || "",
        price: editItem.price || "",
        image: editItem.image || "",
        ingredients: Array.isArray(editItem.ingredients)
          ? editItem.ingredients.join(", ")
          : "",
        isAvailable: editItem.isAvailable ?? true,
      });
    } else {
      // reset khi thêm mới
      setFormData({
        name: "",
        description: "",
        category: "",
        price: "",
        image: "",
        ingredients: "",
        isAvailable: true,
      });
    }
  }, [editItem, isEdit, show]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { name, price } = formData;
      if (!name || !price) {
        setError("⚠️ Vui lòng nhập tên và giá món ăn.");
        setLoading(false);
        return;
      }

      const formattedIngredients = formData.ingredients
        ? formData.ingredients
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id)
        : [];

      const dataToSend = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: Number(formData.price),
        image: formData.image,
        ingredients: formattedIngredients,
        isAvailable: formData.isAvailable,
      };

      let res;
      if (isEdit) {
        // ✏️ Chế độ sửa
        res = await kitchenApi.updateItem(editItem._id, dataToSend);
        setItems((prev) =>
          prev.map((item) => (item._id === editItem._id ? res.data : item))
        );
        alert("✅ Cập nhật món ăn thành công!");
      } else {
        // ➕ Chế độ thêm mới
        res = await kitchenApi.createItem(dataToSend);
        setItems((prev) => [...prev, res.data]);
        alert("✅ Thêm món ăn thành công!");
      }

      onClose();
    } catch (err) {
      console.error(err);
      setError("❌ Lỗi khi lưu món ăn. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative animate-fadeIn">
        {/* Header */}
        <div className="flex justify-between items-center mb-5 border-b pb-2">
          <h2 className="text-xl font-bold text-gray-800">
            {isEdit ? "✏️ Chỉnh sửa món ăn" : "🍽️ Thêm món ăn mới"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-lg font-semibold"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tên món */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên món ăn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nhập tên món..."
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
              placeholder="Nhập mô tả ngắn..."
              rows="2"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Danh mục */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Danh mục
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="Ví dụ: Món chính, Tráng miệng..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Giá */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giá (₫) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Nhập giá món..."
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
                className="mt-3 rounded-lg shadow-md w-32 h-32 object-cover mx-auto border"
              />
            )}
          </div>

          {/* Ingredients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nguyên liệu (IDs, cách nhau bởi dấu phẩy)
            </label>
            <input
              type="text"
              name="ingredients"
              value={formData.ingredients}
              onChange={handleChange}
              placeholder="Ví dụ: 68ee7a..., 68ee8b..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
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
              Món này hiện có sẵn
            </label>
          </div>

          {/* Error */}
          {error && (
            <p className="text-center text-red-600 font-medium text-sm">
              {error}
            </p>
          )}

          {/* Nút hành động */}
          <div className="flex justify-end space-x-3 pt-2">
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
                : "Thêm món ăn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
