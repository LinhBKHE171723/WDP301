import React, { useState, useEffect } from "react";
import kitchenApi from "../../api/kitchenApi";

export default function AddItemModal({ show, onClose, setItems, editItem }) {
  const isEdit = Boolean(editItem);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    image: "", // Sẽ giữ URL ảnh cũ (nếu có)
    ingredients: "",
    isAvailable: true,
  });

  // 👇 1. Thêm state để giữ file ảnh và link xem trước
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);

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
        image: editItem.image || "", // 👈 URL ảnh hiện tại
        ingredients: Array.isArray(editItem.ingredients)
          ? editItem.ingredients.join(", ")
          : "",
        isAvailable: editItem.isAvailable ?? true,
      });
      // 👇 Set preview là ảnh cũ
      setPreview(editItem.image || null);
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
      // 👇 Reset preview
      setPreview(null);
    }

    // 👇 Reset file và lỗi mỗi khi modal mở
    setImageFile(null);
    setError("");
  }, [editItem, isEdit, show]); // `show` được thêm vào để reset mỗi khi mở

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // 👇 2. Hàm xử lý khi người dùng chọn file
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file); // 👈 Lưu file vào state
      setPreview(URL.createObjectURL(file)); // 👈 Tạo link xem trước
    }
  };

  // 👇 3. Hàm handleSubmit được CẬP NHẬT để gửi FormData
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

      // ‼️ Tạo đối tượng FormData để gửi file
      const data = new FormData();

      // Thêm tất cả dữ liệu text vào FormData
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("category", formData.category);
      data.append("price", Number(formData.price));
      data.append("ingredients", formData.ingredients); // Backend sẽ tự split
      data.append("isAvailable", formData.isAvailable);

      // ‼️ Thêm file ảnh (nếu có file mới)
      // Tên 'itemImage' phải khớp với backend: fileParser.single('itemImage')
      if (imageFile) {
        data.append("itemImage", imageFile);
      }

      let res;
      if (isEdit) {
        // ✏️ Chế độ sửa (Gửi FormData)
        res = await kitchenApi.updateItem(editItem._id, data);
        setItems((prev) =>
          prev.map((item) => (item._id === editItem._id ? res.data : item))
        );
        alert("✅ Cập nhật món ăn thành công!");
      } else {
        // ➕ Chế độ thêm mới (Gửi FormData)
        res = await kitchenApi.createItem(data);
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
    <div className="fixed inset-0 bg-black bg-opacity-20 flex justify-center items-center z-50">
      {/* Thêm max-h-[90vh] và overflow-y-auto cho form 
        để modal có thể cuộn trên màn hình nhỏ
      */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative animate-fadeIn max-h-[90vh]">
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
        <form
          onSubmit={handleSubmit}
          className="space-y-4 overflow-y-auto max-h-[75vh] pr-2"
        >
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

          {/* 👇 4. HÌNH ẢNH (ĐÃ THAY ĐỔI) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hình ảnh
            </label>
            <input
              type="file" // 👈 Đổi type="file"
              name="itemImage" // 👈 Tên này phải khớp với key trong FormData
              accept="image/png, image/jpeg, image/gif, image/webp" // 👈 Giới hạn loại file
              onChange={handleFileChange} // 👈 Gọi hàm xử lý file
              className="w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-orange-50 file:text-orange-600
                hover:file:bg-orange-100 cursor-pointer"
            />
            {/* 👇 Xem trước ảnh (dùng state 'preview') */}
            {preview && (
              <img
                src={preview}
                alt="Xem trước"
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
