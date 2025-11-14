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

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load dữ liệu khi edit
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
      setPreview(editMenu.image || null);
    } else {
      setFormData({
        name: "",
        description: "",
        type: "single",
        items: [],
        price: "",
        image: "",
        isAvailable: true,
      });
      setPreview(null);
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

  // Upload lên Cloudinary
  const uploadToCloudinary = async (file) => {
    const sigRes = await kitchenApi.getCloudinarySignature();
    const { signature, timestamp, apiKey, cloudName } = sigRes;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      { method: "POST", body: formData }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Upload ảnh thất bại");
    return data.secure_url;
  };

  // Chọn ảnh
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!formData.name) {
        setError("Vui lòng nhập tên thực đơn.");
        setLoading(false);
        return;
      }

      let imageUrl = formData.image;
      if (imageFile) {
        imageUrl = await uploadToCloudinary(imageFile);
      }

      const payload = {
        ...formData,
        price: Number(formData.price) || 0,
        image: imageUrl,
      };

      let res;
      if (isEdit) {
        res = await kitchenApi.updateMenu(editMenu._id, payload);
        setMenus((prev) =>
          prev.map((m) => (m._id === editMenu._id ? { ...m, ...payload } : m))
        );
        alert(" Cập nhật thực đơn thành công!");
      }

      onClose();
    } catch (err) {
      console.error(err);
      setError(" Lỗi khi lưu thực đơn. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  // UI
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-8 relative animate-fadeIn max-h-[90vh] overflow-y-auto border border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b pb-3">
          <h2 className="text-2xl font-bold text-gray-800">
            {isEdit ? "✏️ Chỉnh sửa Thực Đơn" : "📋 Tạo Thực Đơn Mới"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-semibold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tên thực đơn */}
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-1">
              Tên thực đơn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nhập tên thực đơn..."
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
            />
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-1">
              Mô tả
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Mô tả chi tiết thực đơn..."
              rows="3"
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
            />
          </div>

          {/* Loại thực đơn */}
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-1">
              Loại thực đơn
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
            >
              <option value="single">Đơn món</option>
              <option value="combo">Combo</option>
            </select>
          </div>

          {/* Danh sách món ăn */}
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-1">
              🧾 Chọn món trong thực đơn
            </label>
            <div className="border rounded-xl p-4 max-h-64 overflow-y-auto bg-gray-50">
              {items.length === 0 ? (
                <p className="text-gray-500 italic text-center py-3">
                  Chưa có món ăn nào.
                </p>
              ) : (
                items.map((item) => (
                  <label
                    key={item._id}
                    className="flex items-center justify-between px-2 py-1 hover:bg-gray-100 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.items.includes(item._id)}
                        onChange={() => handleItemSelect(item._id)}
                        className="accent-orange-500 w-5 h-5"
                      />
                      <span className="text-gray-800 text-base">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-gray-500 text-sm">
                      {item.price.toLocaleString("vi-VN")} ₫
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Giá */}
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-1">
              Giá tổng (₫)
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Nhập giá thực đơn..."
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
            />
          </div>

          {/* Upload ảnh đẹp */}
          <div className="border-2 border-dashed border-orange-300 rounded-xl p-5 text-center bg-orange-50 hover:bg-orange-100 transition">
            <label className="block text-gray-700 font-semibold text-lg mb-2">
              📸 Ảnh minh hoạ thực đơn
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Chọn ảnh đại diện đẹp cho thực đơn (JPG, PNG, WEBP)
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block mx-auto mb-4 text-sm text-gray-600"
            />

            {preview ? (
              <div className="flex flex-col items-center space-y-3">
                <img
                  src={preview}
                  alt="preview"
                  className="w-48 h-48 object-cover rounded-lg shadow-md border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setPreview(null);
                    setFormData((prev) => ({ ...prev, image: "" }));
                  }}
                  className="text-red-500 text-sm hover:underline"
                >
                  🗑 Xoá ảnh
                </button>
              </div>
            ) : (
              <div className="text-gray-400 italic text-sm">
                Chưa có ảnh nào được chọn
              </div>
            )}
          </div>

          {/* Trạng thái */}
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="isAvailable"
              checked={formData.isAvailable}
              onChange={handleChange}
              className="w-6 h-6 accent-orange-500"
            />
            <span className="text-lg text-gray-800">
              Thực đơn này hiện đang bán
            </span>
          </label>

          {/* Error */}
          {error && (
            <p className="text-center text-red-600 font-medium text-sm bg-red-50 py-2 rounded-md">
              {error}
            </p>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-4 pt-3 border-t mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg text-lg font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-3 rounded-lg text-lg font-semibold text-white ${
                loading
                  ? "bg-orange-300 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {loading
                ? "Đang lưu..."
                : isEdit
                ? "💾 Lưu thay đổi"
                : "➕ Tạo thực đơn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
