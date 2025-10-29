import React, { useState, useEffect } from "react";
import kitchenApi from "../../api/kitchenApi";

export default function AddItemModal({ show, onClose, setItems, editItem }) {
  const isEdit = Boolean(editItem);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    image: "",
    isAvailable: true,
  });

  const [ingredientsList, setIngredientsList] = useState([]); // 🔹 danh sách nguyên liệu từ API
  const [selectedIngredients, setSelectedIngredients] = useState([]); // 🔹 [{ ingredient, quantity }]
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Lấy danh sách nguyên liệu khi mở modal
  useEffect(() => {
    if (show) {
      kitchenApi
        .getAllIngredients()
        .then((res) => {
          setIngredientsList(res || []);
        })
        .catch((err) => {
          console.error("❌ Lỗi lấy nguyên liệu:", err);
        });
    }
  }, [show]);

  // ✅ Load dữ liệu khi edit
  useEffect(() => {
    if (isEdit && editItem) {
      setFormData({
        name: editItem.name || "",
        description: editItem.description || "",
        category: editItem.category || "",
        price: editItem.price || "",
        image: editItem.image || "",
        isAvailable: editItem.isAvailable ?? true,
      });
      setPreview(editItem.image || null);
      setSelectedIngredients(editItem.ingredients || []);
    } else {
      setFormData({
        name: "",
        description: "",
        category: "",
        price: "",
        image: "",
        isAvailable: true,
      });
      setSelectedIngredients([]);
      setPreview(null);
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // ☁️ Upload Cloudinary
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

  // 🧩 Chọn nguyên liệu
  const handleSelectIngredient = (ingredientId) => {
    setSelectedIngredients((prev) => {
      const exists = prev.find((i) => i.ingredient === ingredientId);
      if (exists) {
        // Nếu đã chọn → bỏ chọn
        return prev.filter((i) => i.ingredient !== ingredientId);
      } else {
        // Nếu chưa có → thêm vào với quantity mặc định = 1
        return [...prev, { ingredient: ingredientId, quantity: 1 }];
      }
    });
  };

  // 🔢 Thay đổi số lượng
  const handleQuantityChange = (ingredientId, value) => {
    setSelectedIngredients((prev) =>
      prev.map((i) =>
        i.ingredient === ingredientId
          ? { ...i, quantity: value === "" ? "" : Number(value) }
          : i
      )
    );
  };

  // 🧾 Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!formData.name || !formData.price) {
        setError("⚠️ Vui lòng nhập tên và giá món ăn.");
        setLoading(false);
        return;
      }

      let imageUrl = formData.image;
      if (imageFile) {
        imageUrl = await uploadToCloudinary(imageFile);
      }

      const payload = {
        ...formData,
        price: Number(formData.price),
        image: imageUrl,
        ingredients: selectedIngredients,
      };

      let res;
      if (isEdit) {
        res = await kitchenApi.updateItem(editItem._id, payload);
        setItems((prev) =>
          prev.map((item) => (item._id === editItem._id ? res.data : item))
        );
        alert("✅ Cập nhật món ăn thành công!");
      } else {
        res = await kitchenApi.createItem(payload);
        setItems((prev) => [...prev, res.data]);
        alert("✅ Thêm món ăn thành công!");
      }

      onClose();
    } catch (err) {
      console.error("❌ Lỗi khi lưu món ăn:", err);
      setError("❌ Lỗi khi lưu món ăn. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  // 🖼️ UI
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-8 relative animate-fadeIn max-h-[90vh] overflow-y-auto border border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b pb-3">
          <h2 className="text-2xl font-bold text-gray-800">
            {isEdit ? "✏️ Chỉnh sửa món ăn" : "🍽️ Thêm món ăn mới"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-semibold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Thông tin cơ bản */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Tên món ăn"
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
            />
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="Danh mục (VD: Món chính, Món phụ...)"
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
            />
          </div>

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Mô tả món ăn (thành phần, hương vị, v.v.)"
            rows={3}
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
          />

          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            placeholder="Giá (₫)"
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
          />

          {/* Upload ảnh */}
          <div className="border-2 border-dashed border-orange-300 rounded-xl p-5 text-center bg-orange-50 hover:bg-orange-100 transition">
            <label className="block text-gray-700 font-medium mb-2">
              📸 Hình ảnh món ăn
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Chọn một ảnh đẹp để hiển thị trong menu (định dạng: JPG, PNG,
              WEBP)
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block mx-auto mb-4 text-sm text-gray-600"
            />
            {preview ? (
              <div className="flex justify-center">
                <img
                  src={preview}
                  alt="preview"
                  className="w-48 h-48 object-cover rounded-lg shadow-md border border-gray-200"
                />
              </div>
            ) : (
              <div className="text-gray-400 italic text-sm">
                Chưa có ảnh nào được chọn
              </div>
            )}
          </div>

          {/* Danh sách nguyên liệu */}
          <div>
            <h3 className="font-semibold text-gray-800 text-lg mb-2">
              🧂 Chọn nguyên liệu:
            </h3>
            <div className="border rounded-xl p-4 max-h-72 overflow-y-auto bg-gray-50">
              {ingredientsList.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center">
                  Không có nguyên liệu nào.
                </p>
              ) : (
                ingredientsList.map((ing) => {
                  const selected = selectedIngredients.find(
                    (i) => i.ingredient === ing._id
                  );
                  return (
                    <div
                      key={ing._id}
                      className="flex items-center justify-between border-b py-2 last:border-none"
                    >
                      <div>
                        <label className="font-medium text-gray-800 text-base">
                          <input
                            type="checkbox"
                            className="mr-2 accent-orange-500"
                            checked={!!selected}
                            onChange={() => handleSelectIngredient(ing._id)}
                          />
                          {ing.name}
                        </label>
                        <p className="text-xs text-gray-500">
                          Đơn vị:{" "}
                          <span className="font-medium">{ing.unit}</span> | Tồn
                          kho:{" "}
                          <span className="text-orange-600 font-semibold">
                            {ing.stockQuantity}
                          </span>
                        </p>
                      </div>

                      {selected && (
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={selected.quantity}
                            onChange={(e) =>
                              handleQuantityChange(ing._id, e.target.value)
                            }
                            placeholder="0"
                            className="w-24 border rounded px-3 py-1.5 text-right text-lg"
                          />
                          <span className="text-sm text-gray-600">g</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
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
              Món này hiện có sẵn trong thực đơn
            </span>
          </label>

          {/* Thông báo lỗi */}
          {error && (
            <p className="text-red-600 text-center text-sm bg-red-50 py-2 rounded-md">
              {error}
            </p>
          )}

          {/* Nút hành động */}
          <div className="flex justify-end space-x-4 pt-3">
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
                : "➕ Thêm món ăn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
