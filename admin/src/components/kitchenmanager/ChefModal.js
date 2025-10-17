import React from "react";

export default function ChefModal({
  chefs,
  itemId,
  orders,
  setOrders,
  onClose,
}) {
  const handleSelectChef = (chef) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => ({
        ...order,
        items: order.items.map((i) =>
          i.id === itemId ? { ...i, chef: chef.name, status: "cooking" } : i
        ),
      }))
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Chọn Chef</h3>
        <div className="space-y-3">
          {chefs.map((chef) => (
            <div
              key={chef.id}
              onClick={() => handleSelectChef(chef)}
              className="p-3 border rounded-lg cursor-pointer hover:border-orange-400 flex items-center justify-between transition-all"
            >
              <div>
                <div className="font-medium text-gray-900">{chef.name}</div>
                <div className="text-sm text-gray-600">{chef.specialty}</div>
              </div>
              <div className="text-orange-500 font-bold">Chọn</div>
            </div>
          ))}
        </div>
        <div className="text-right mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
