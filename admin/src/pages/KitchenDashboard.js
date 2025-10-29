import React, { useState, useEffect } from "react";
import kitchenApi from "../api/kitchenApi";
import useKitchenWebSocket from "../hooks/useKitchenWebSocket";

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
  const [chefs, setChefs] = useState([]);

  // ✅ WebSocket hook cho real-time updates
  const { connectionState, lastMessage, subscribeToOrders, unsubscribeFromAllOrders } = useKitchenWebSocket();

  // ✅ Fetch dữ liệu theo tab
  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await kitchenApi.getConfirmedOrders();
      const ordersData = res.data || [];
      setOrders(ordersData);
      
      // Subscribe to all orders for real-time updates
      if (ordersData.length > 0 && connectionState === 'connected') {
        const orderIds = ordersData.map(order => order._id);
        subscribeToOrders(orderIds);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        if (activeTab === "kds") {
          await fetchOrders();
        } else if (activeTab === "items") {
          const res = await kitchenApi.getAllItems();
          setItems(res.data || []);
        } else if (activeTab === "menus") {
          const res = await kitchenApi.getAllMenus();
          setMenus(res.data || []);
        } else if (activeTab === "inventory") {
          const res = await kitchenApi.getAllIngredients();
          setIngredients(res.data || res || []);
        } else if (activeTab === "purchase") {
          const res = await kitchenApi.getPurchaseOrders();
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
  }, [activeTab, connectionState]);

  // ✅ Subscribe to orders when WebSocket connects
  useEffect(() => {
    if (connectionState === 'connected' && orders.length > 0) {
      const orderIds = orders.map(order => order._id);
      subscribeToOrders(orderIds);
    }
    
    return () => {
      if (activeTab !== "kds") {
        unsubscribeFromAllOrders();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState, activeTab, orders.length]);

  // ✅ Handle WebSocket messages for real-time updates
  useEffect(() => {
    if (lastMessage) {
      console.log('📨 Kitchen received WebSocket message:', lastMessage);

      switch (lastMessage.type) {
        case 'order:updated':
          // Cập nhật order trong danh sách
          if (lastMessage.data && activeTab === "kds") {
            setOrders((prevOrders) =>
              prevOrders.map((order) =>
                order._id === lastMessage.data._id ? lastMessage.data : order
              )
            );
            console.log('✅ Updated order in queue:', lastMessage.data._id);
          }
          break;

        case 'order:confirmed':
          // Đơn hàng mới được confirm - thêm vào danh sách
          if (lastMessage.data && activeTab === "kds") {
            setOrders((prevOrders) => {
              const exists = prevOrders.some(o => o._id === lastMessage.data._id);
              if (!exists) {
                subscribeToOrders([lastMessage.data._id]);
                return [...prevOrders, lastMessage.data];
              }
              return prevOrders;
            });
            console.log('🆕 New confirmed order added:', lastMessage.data._id);
          }
          break;

        default:
          console.log('📨 Unknown message type:', lastMessage.type);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage, activeTab]);

  useEffect(() => {
    const fetchChefs = async () => {
      try {
        const res = await kitchenApi.getAllChefs();

        setChefs(res?.chefs || []);
      } catch (err) {
        console.error("❌ Lỗi khi tải danh sách đầu bếp:", err);
      }
    };
    fetchChefs();
  }, [showChefModal]);

  // ✅ Đồng bộ selectedOrder khi 'orders' thay đổi
  useEffect(() => {
    if (selectedOrder) {
      const updatedOrder = orders.find((o) => o._id === selectedOrder._id);

      if (updatedOrder) {
        // Cập nhật lại state selectedOrder với dữ liệu mới
        setSelectedOrder(updatedOrder);
      } else {
        setSelectedOrder(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

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
            {/* WebSocket Connection Status */}
            <div className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${
              connectionState === 'connected' 
                ? 'bg-green-100 text-green-700' 
                : connectionState === 'connecting' || connectionState === 'reconnecting'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {connectionState === 'connected' && '🟢 Realtime'}
              {connectionState === 'connecting' && '🟡 Đang kết nối...'}
              {connectionState === 'reconnecting' && '🟡 Đang kết nối lại...'}
              {connectionState === 'disconnected' && '🔴 Mất kết nối'}
            </div>
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
                  ? "Quản lý Combo"
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
              setOrders={setOrders}
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
