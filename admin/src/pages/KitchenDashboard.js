import React, { useState, useEffect } from "react";
import kitchenApi from "../api/kitchenApi";

import OrderQueue from "../components/kitchenmanager/OrderQueue";
import OrderDetails from "../components/kitchenmanager/OrderDetails";
import ItemsManager from "../components/kitchenmanager/ItemsManager";
import MenusManager from "../components/kitchenmanager/MenusManager";
import ChefModal from "../components/kitchenmanager/ChefModal";
import AddItemModal from "../components/kitchenmanager/AddItemModal";
import AddMenuModal from "../components/kitchenmanager/AddMenuModal";
import InventoryManager from "../components/kitchenmanager/InventoryManager";
import PurchaseHistoryManager from "../components/kitchenmanager/PurchaseHistoryManager"; // ✅ import mới

export default function KitchenDashboard() {
  const [activeTab, setActiveTab] = useState("kds");
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [menus, setMenus] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showChefModal, setShowChefModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [chefs] = useState([
    { id: 1, name: "Anh Tuấn", specialty: "Món chính" },
    { id: 2, name: "Chị Lan", specialty: "Đồ uống" },
    { id: 3, name: "Anh Minh", specialty: "Cơm" },
    { id: 4, name: "Chị Hoa", specialty: "Tráng miệng" },
  ]);

  // ✅ Fetch dữ liệu theo tab
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        if (activeTab === "kds") {
          const res = await kitchenApi.getConfirmedOrders();
          setOrders(res.data || []);
        } else if (activeTab === "items") {
          const res = await kitchenApi.getAllItems();
          setItems(res.data || []);
        } else if (activeTab === "menus") {
          const res = await kitchenApi.getAllMenus();
          setMenus(res.data || []);
        } else if (activeTab === "inventory") {
          const res = await kitchenApi.getAllIngredients();
          console.log("📦 Dữ liệu nguyên liệu:", res.data || res);
          setIngredients(res.data || res || []);
        } else if (activeTab === "purchase") {
          const res = await kitchenApi.getPurchaseOrders();
          console.log("📜 Dữ liệu đơn nhập hàng:", res.data || res);
          setPurchaseOrders(res.data || res || []);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "Không thể tải dữ liệu.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  // ✅ Cập nhật thời gian chờ đơn hàng
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders((prev) =>
        prev.map((o) =>
          o.status !== "ready" ? { ...o, waitTime: (o.waitTime || 0) + 1 } : o
        )
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Refresh helpers
  const handleRefreshItems = async () => {
    const res = await kitchenApi.getAllItems();
    setItems(res.data || []);
  };

  const handleRefreshMenus = async () => {
    const res = await kitchenApi.getAllMenus();
    setMenus(res.data || []);
  };

  const handleRefreshIngredients = async () => {
    const res = await kitchenApi.getAllIngredients();
    setIngredients(res.data || res || []);
  };

  const handleRefreshPurchaseOrders = async () => {
    const res = await kitchenApi.getPurchaseOrders();
    setPurchaseOrders(res.data || []);
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      {/* HEADER */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-orange-500 text-white p-2 rounded-lg">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Hệ thống Quản lý Bếp - KDS
            </h1>
          </div>

          <nav className="flex space-x-2">
            {["kds", "items", "menus", "inventory", "purchase"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-orange-500 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab === "kds"
                  ? "Bảng điều khiển Bếp"
                  : tab === "items"
                  ? "Quản lý Món ăn"
                  : tab === "menus"
                  ? "Quản lý Thực đơn"
                  : tab === "inventory"
                  ? "Quản lý Kho"
                  : "Lịch sử Nhập hàng"}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-full mx-auto px-6 py-6">
        {loading && (
          <p className="text-center text-gray-600 animate-pulse">
            Đang tải dữ liệu...
          </p>
        )}
        {error && (
          <p className="text-center text-red-600 font-medium">{error}</p>
        )}

        {/* TAB: Bếp */}
        {!loading && !error && activeTab === "kds" && (
          <div className="grid grid-cols-12 gap-6">
            <OrderQueue
              orders={orders}
              selectedOrder={selectedOrder}
              onSelectOrder={setSelectedOrder}
            />
            <OrderDetails
              selectedOrder={selectedOrder}
              setShowChefModal={setShowChefModal}
              setCurrentItem={setCurrentItem}
            />
          </div>
        )}

        {/* TAB: Quản lý món ăn */}
        {!loading && !error && activeTab === "items" && (
          <ItemsManager
            items={items}
            setItems={setItems}
            onAddItem={() => setShowAddItemModal(true)}
          />
        )}

        {/* TAB: Quản lý thực đơn */}
        {!loading && !error && activeTab === "menus" && (
          <MenusManager menus={menus} items={items} setMenus={setMenus} />
        )}

        {/* TAB: Quản lý kho nguyên liệu */}
        {!loading && !error && activeTab === "inventory" && (
          <InventoryManager
            ingredients={ingredients}
            onRefresh={handleRefreshIngredients}
          />
        )}

        {/* TAB: Lịch sử nhập hàng */}
        {!loading && !error && activeTab === "purchase" && (
          <PurchaseHistoryManager
            purchaseOrders={purchaseOrders}
            onRefresh={handleRefreshPurchaseOrders}
          />
        )}
      </main>

      {/* MODALS */}
      {showChefModal && (
        <ChefModal
          chefs={chefs}
          itemId={currentItem}
          orders={orders}
          setOrders={setOrders}
          onClose={() => setShowChefModal(false)}
        />
      )}

      {showAddItemModal && (
        <AddItemModal
          show={showAddItemModal}
          onClose={() => {
            setShowAddItemModal(false);
            handleRefreshItems();
          }}
          setItems={setItems}
        />
      )}

      {showAddMenuModal && (
        <AddMenuModal
          show={showAddMenuModal}
          onClose={() => {
            setShowAddMenuModal(false);
            handleRefreshMenus();
          }}
          setMenus={setMenus}
          items={items}
        />
      )}
    </div>
  );
}
