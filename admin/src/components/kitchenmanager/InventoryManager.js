import React, { useState } from "react";
import kitchenApi from "../../api/kitchenApi";

export default function InventoryManager({ ingredients, onRefresh }) {
  const [selectedIng, setSelectedIng] = useState(null);
  const [addAmount, setAddAmount] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editIng, setEditIng] = useState(null);
  const [newIng, setNewIng] = useState({
    name: "",
    unit: "",
    stockQuantity: "",
    minStock: "",
    priceNow: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ✅ Hiển thị định dạng tồn kho
  const displayQuantity = (ing) => {
    if (!ing || ing.stockQuantity == null) return "";
    if (ing.unit === "kg") {
      const grams = ing.stockQuantity * 1000;
      return `${grams.toLocaleString("vi-VN")} g`;
    }
    return `${ing.stockQuantity.toLocaleString("vi-VN")} ${ing.unit}`;
  };

  // ✅ Thêm nguyên liệu mới
  const handleAddIngredient = async () => {
    if (!newIng.name || !newIng.unit) {
      alert("Vui lòng nhập đầy đủ tên và đơn vị!");
      return;
    }

    const payload = {
      ...newIng,
      stockQuantity: Number(newIng.stockQuantity) || 0,
      minStock: Number(newIng.minStock) || 0,
      priceNow: Number(newIng.priceNow) || 0,
    };

    setLoading(true);
    try {
      await kitchenApi.createIngredient(payload);
      setMessage(`✅ Đã thêm nguyên liệu: ${newIng.name}`);
      setShowAddModal(false);
      setNewIng({
        name: "",
        unit: "",
        stockQuantity: "",
        minStock: "",
        priceNow: "",
      });
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error(err);
      setMessage("❌ Lỗi khi thêm nguyên liệu.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Nhập thêm tồn kho
  const handleUpdateStock = async () => {
    if (!selectedIng || addAmount.trim() === "") {
      alert("Chưa chọn nguyên liệu hoặc chưa nhập số lượng!");
      return;
    }

    const amount = Number(addAmount);
    let price = Number(selectedIng.priceNow);

    if (isNaN(amount) || amount <= 0) {
      alert("Vui lòng nhập số lượng hợp lệ!");
      return;
    }

    if (isNaN(price) || price <= 0) {
      alert("Vui lòng nhập giá nhập hợp lệ!");
      return;
    }

    setLoading(true);
    try {
      await kitchenApi.createPurchaseOrder({
        ingredientId: selectedIng._id,
        quantity: amount,
        unit: selectedIng.unit,
        price,
        supplier: "Nhập trực tiếp",
        note: `Nhập thêm ${amount} ${selectedIng.unit} cho ${
          selectedIng.name
        } (giá ${price.toLocaleString("vi-VN")}₫)`,
      });

      setMessage(
        `✅ Đã nhập thêm ${amount.toLocaleString("vi-VN")} ${
          selectedIng.unit
        } cho ${selectedIng.name}.`
      );
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật kho:", err);
      setMessage(err?.response?.data?.message || "❌ Không thể nhập hàng.");
    } finally {
      setLoading(false);
      setSelectedIng(null);
      setAddAmount("");
    }
  };

  // ✅ Mở modal sửa
  const handleEditIngredient = (ing) => {
    setEditIng({ ...ing });
    setShowEditModal(true);
  };

  // ✅ Lưu chỉnh sửa
  const handleSaveEdit = async () => {
    if (!editIng.name || !editIng.unit) {
      alert("Tên và đơn vị không được để trống!");
      return;
    }

    setLoading(true);
    try {
      await kitchenApi.updateIngredient(editIng._id, {
        name: editIng.name,
        unit: editIng.unit,
        priceNow: Number(editIng.priceNow) || 0,
        stockQuantity: Number(editIng.stockQuantity) || 0,
        minStock: Number(editIng.minStock) || 0,
      });

      setMessage(`✏️ Đã cập nhật nguyên liệu ${editIng.name}.`);
      setShowEditModal(false);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error(err);
      setMessage("❌ Lỗi khi cập nhật nguyên liệu.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Xóa nguyên liệu
  const handleDeleteIngredient = (ing) => {
    setEditIng(ing);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      await kitchenApi.deleteIngredient(editIng._id);
      setMessage(`🗑️ Đã xóa nguyên liệu ${editIng.name}.`);
      setShowDeleteModal(false);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error(err);
      setMessage("❌ Lỗi khi xóa nguyên liệu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          📦 Quản lý kho nguyên liệu
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          ➕ Thêm nguyên liệu
        </button>
      </div>

      {/* THÔNG BÁO */}
      {message && (
        <div className="mb-4 text-center font-medium text-green-700 bg-green-50 border border-green-300 p-2 rounded-lg">
          {message}
        </div>
      )}

      {/* BẢNG KHO */}
      {ingredients.length === 0 ? (
        <p className="text-gray-500 italic text-center py-4">
          Không có nguyên liệu nào trong kho.
        </p>
      ) : (
        <table className="w-full border-collapse text-sm text-gray-700">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Tên nguyên liệu</th>
              <th className="px-4 py-2 text-left">Đơn vị</th>
              <th className="px-4 py-2 text-left">Tồn kho</th>
              <th className="px-4 py-2 text-left">💰 Giá nhập / đơn vị</th>
              <th className="px-4 py-2 text-left">Tối thiểu</th>
              <th className="px-4 py-2 text-left">Trạng thái</th>
              <th className="px-4 py-2 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing) => (
              <tr key={ing._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{ing.name}</td>
                <td className="px-4 py-2">{ing.unit}</td>
                <td className="px-4 py-2">{displayQuantity(ing)}</td>
                <td className="px-4 py-2">
                  {ing.priceNow
                    ? `${ing.priceNow.toLocaleString("vi-VN")} ₫`
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  {ing.minStock.toLocaleString("vi-VN")}
                </td>
                <td
                  className={`px-4 py-2 font-semibold ${
                    ing.stockQuantity <= ing.minStock
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {ing.stockQuantity <= ing.minStock
                    ? "⚠️ Cần nhập thêm"
                    : "✅ Đủ hàng"}
                </td>
                <td className="px-4 py-2 text-center space-x-2">
                  <button
                    onClick={() => setSelectedIng(ing)}
                    className="px-3 py-1 text-sm rounded bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    + Nhập thêm
                  </button>
                  <button
                    onClick={() => handleEditIngredient(ing)}
                    className="px-3 py-1 text-sm rounded bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    ✏️ Sửa
                  </button>
                  <button
                    onClick={() => handleDeleteIngredient(ing)}
                    className="px-3 py-1 text-sm rounded bg-red-500 hover:bg-red-600 text-white"
                  >
                    🗑️ Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ✅ MODAL: Nhập thêm tồn kho */}
      {selectedIng && (
        <Modal>
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-[550px]">
            <h3 className="text-2xl font-bold mb-4 text-center text-gray-800">
              ➕ Nhập thêm nguyên liệu
            </h3>
            <p className="text-center mb-2">
              Nguyên liệu: <strong>{selectedIng.name}</strong>
            </p>
            <p className="text-center text-sm text-gray-500 mb-4">
              Hiện tại: {displayQuantity(selectedIng)}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Số lượng thêm
                </label>
                <input
                  type="number"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
                  placeholder="Nhập số lượng muốn thêm..."
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Giá nhập (VNĐ)
                </label>
                <input
                  type="number"
                  value={selectedIng.priceNow || ""}
                  onChange={(e) =>
                    setSelectedIng({
                      ...selectedIng,
                      priceNow: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
                  placeholder="Nhập giá nhập mới..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setSelectedIng(null)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-5 py-2 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateStock}
                disabled={loading}
                className={`px-5 py-2 rounded-lg text-white font-medium ${
                  loading
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading ? "Đang lưu..." : "Xác nhận nhập thêm"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ✅ MODAL: Thêm nguyên liệu mới */}
      {showAddModal && (
        <Modal>
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-[550px]">
            <h3 className="text-2xl font-bold mb-6 text-gray-800 text-center">
              ➕ Thêm nguyên liệu mới
            </h3>

            <div className="space-y-4">
              {[
                { label: "Tên nguyên liệu", key: "name", required: true },
                { label: "Đơn vị tính", key: "unit", required: true },
                { label: "Số lượng ban đầu", key: "stockQuantity" },
                { label: "Mức tồn tối thiểu", key: "minStock" },
                { label: "Giá nhập hiện tại (VNĐ)", key: "priceNow" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block font-semibold mb-1 text-gray-700">
                    {f.label}{" "}
                    {f.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={newIng[f.key]}
                    onChange={(e) =>
                      setNewIng({ ...newIng, [f.key]: e.target.value })
                    }
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-400 outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-5 py-2 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleAddIngredient}
                disabled={loading}
                className={`px-5 py-2 rounded-lg text-white font-medium ${
                  loading
                    ? "bg-orange-300 cursor-not-allowed"
                    : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                {loading ? "Đang lưu..." : "Thêm nguyên liệu"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ✅ MODAL: Sửa nguyên liệu */}
      {showEditModal && (
        <Modal>
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-[550px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6 text-gray-800 text-center">
              ✏️ Chỉnh sửa nguyên liệu
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Tên nguyên liệu
                </label>
                <input
                  type="text"
                  value={editIng.name}
                  onChange={(e) =>
                    setEditIng({ ...editIng, name: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Đơn vị tính
                </label>
                <input
                  type="text"
                  value={editIng.unit}
                  onChange={(e) =>
                    setEditIng({ ...editIng, unit: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Giá nhập (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={editIng.priceNow}
                    onChange={(e) =>
                      setEditIng({ ...editIng, priceNow: e.target.value })
                    }
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Mức tồn tối thiểu
                  </label>
                  <input
                    type="number"
                    value={editIng.minStock}
                    onChange={(e) =>
                      setEditIng({ ...editIng, minStock: e.target.value })
                    }
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Số lượng tồn kho
                </label>
                <input
                  type="number"
                  value={editIng.stockQuantity}
                  onChange={(e) =>
                    setEditIng({
                      ...editIng,
                      stockQuantity: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-5 py-2 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className={`px-5 py-2 rounded-lg text-white font-medium ${
                  loading
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ✅ MODAL: Xóa nguyên liệu */}
      {showDeleteModal && (
        <Modal>
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-[400px] text-center">
            <h3 className="text-xl font-bold mb-4">Xóa nguyên liệu?</h3>
            <p className="mb-6">
              Bạn có chắc muốn xóa <strong>{editIng?.name}</strong> khỏi danh
              sách?
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-5 py-2 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg"
              >
                {loading ? "Đang xóa..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ✅ Modal tái sử dụng */
function Modal({ children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      {children}
    </div>
  );
}
