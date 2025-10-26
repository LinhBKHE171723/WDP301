import React, { useState } from "react";
import kitchenApi from "../../api/kitchenApi";

export default function InventoryManager({ ingredients, onRefresh }) {
  const [selectedIng, setSelectedIng] = useState(null);
  const [addAmount, setAddAmount] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIng, setNewIng] = useState({
    name: "",
    unit: "",
    stockQuantity: 0,
    minStock: 0,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ✅ Hàm thêm nguyên liệu mới
  const handleAddIngredient = async () => {
    if (!newIng.name || !newIng.unit) {
      alert("Vui lòng nhập đầy đủ tên và đơn vị!");
      return;
    }

    setLoading(true);
    try {
      await kitchenApi.createIngredient(newIng);
      setMessage(`✅ Đã thêm nguyên liệu: ${newIng.name}`);
      setShowAddModal(false);
      setNewIng({ name: "", unit: "", stockQuantity: 0, minStock: 0 });
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error(err);
      setMessage("❌ Lỗi khi thêm nguyên liệu.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Hàm cập nhật tồn kho
  const handleUpdateStock = async () => {
    if (!selectedIng || !addAmount) return;
    const amount = Number(addAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Vui lòng nhập số lượng hợp lệ!");
      return;
    }

    setLoading(true);
    try {
      await kitchenApi.createPurchaseOrder({
        ingredientId: selectedIng._id,
        quantity: amount,
        unit: selectedIng.unit,
        supplier: "Nhập trực tiếp",
        note: `Nhập thêm ${amount} ${selectedIng.unit} cho ${selectedIng.name}`,
      });

      setMessage(
        `✅ Đã nhập thêm ${amount} ${selectedIng.unit} cho ${selectedIng.name}`
      );

      if (onRefresh) await onRefresh();

      setSelectedIng(null);
      setAddAmount("");
    } catch (err) {
      console.error("Lỗi khi cập nhật kho:", err);
      setMessage("❌ Cập nhật thất bại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
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

      {message && (
        <div className="mb-4 text-center font-medium text-green-700 bg-green-50 border border-green-300 p-2 rounded-lg">
          {message}
        </div>
      )}

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
                <td className="px-4 py-2">{ing.stockQuantity}</td>
                <td className="px-4 py-2">{ing.minStock}</td>
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
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => setSelectedIng(ing)}
                    className="px-3 py-1 text-sm rounded bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    + Nhập thêm
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ✅ MODAL: Nhập thêm */}
      {selectedIng && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-2">
              Nhập thêm: {selectedIng.name}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Hiện tại: {selectedIng.stockQuantity} {selectedIng.unit}
            </p>

            <input
              type="number"
              min="1"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3"
              placeholder="Nhập số lượng thêm..."
            />

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setSelectedIng(null)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateStock}
                disabled={loading}
                className={`px-4 py-2 rounded text-white ${
                  loading
                    ? "bg-green-300 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {loading ? "Đang lưu..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL: Thêm nguyên liệu */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-[550px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6 text-gray-800 text-center">
              ➕ Thêm nguyên liệu mới
            </h3>

            {/* Tên nguyên liệu */}
            <div className="mb-5">
              <label className="block text-gray-700 font-semibold mb-1">
                Tên nguyên liệu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Thịt bò, Gạo ST25, Dầu ăn..."
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-400 outline-none"
                value={newIng.name}
                onChange={(e) => setNewIng({ ...newIng, name: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Nhập tên rõ ràng để dễ tìm kiếm trong danh sách kho.
              </p>
            </div>

            {/* Đơn vị tính */}
            <div className="mb-5">
              <label className="block text-gray-700 font-semibold mb-1">
                Đơn vị tính <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: kg, bó, chai, gói..."
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-400 outline-none"
                value={newIng.unit}
                onChange={(e) => setNewIng({ ...newIng, unit: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Đơn vị giúp tính toán và nhập hàng chính xác.
              </p>
            </div>

            {/* Số lượng ban đầu */}
            <div className="mb-5">
              <label className="block text-gray-700 font-semibold mb-1">
                Số lượng ban đầu
              </label>
              <input
                type="number"
                min="0"
                placeholder="VD: 10"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-400 outline-none"
                value={newIng.stockQuantity}
                onChange={(e) =>
                  setNewIng({
                    ...newIng,
                    stockQuantity: Number(e.target.value),
                  })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Số lượng hiện có khi nhập kho lần đầu. Có thể để 0.
              </p>
            </div>

            {/* Mức tồn tối thiểu */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-1">
                Mức tồn tối thiểu
              </label>
              <input
                type="number"
                min="0"
                placeholder="VD: 5"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-400 outline-none"
                value={newIng.minStock}
                onChange={(e) =>
                  setNewIng({ ...newIng, minStock: Number(e.target.value) })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Khi tồn kho nhỏ hơn mức này, hệ thống sẽ cảnh báo “Cần nhập
                thêm”.
              </p>
            </div>

            {/* Nút hành động */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleAddIngredient}
                disabled={loading}
                className={`px-5 py-2 rounded-lg text-white font-medium ${
                  loading
                    ? "bg-green-300 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {loading ? "Đang lưu..." : "Thêm nguyên liệu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
