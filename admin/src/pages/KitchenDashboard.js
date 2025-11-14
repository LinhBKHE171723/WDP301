import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import kitchenApi from "../api/kitchenApi";
import useKitchenWebSocket from "../hooks/useKitchenWebSocket";
import { useAuth } from "../context/AuthContext";

import OrderQueue from "../components/kitchenmanager/OrderQueue";
import OrderDetails from "../components/kitchenmanager/OrderDetails";
import ItemsManager from "../components/kitchenmanager/ItemsManager";
import MenusManager from "../components/kitchenmanager/MenusManager";
import ChefModal from "../components/kitchenmanager/ChefModal";
import AddItemModal from "../components/kitchenmanager/AddItemModal";
import AddMenuModal from "../components/kitchenmanager/AddMenuModal";
import InventoryManager from "../components/kitchenmanager/InventoryManager";
import PurchaseHistoryManager from "../components/kitchenmanager/PurchaseHistoryManager";
import ChefAttendanceManager from "../components/kitchenmanager/ChefAttendanceManager"; // import mới

export default function KitchenDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
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
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // WebSocket hook cho real-time updates
  const {
    connectionState,
    lastMessage,
    subscribeToOrders,
    unsubscribeFromAllOrders,
  } = useKitchenWebSocket();

  // Hàm xử lý đăng xuất
  const handleLogout = () => {
    logout();
    navigate("/auth/login");
  };

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest(".profile-dropdown")) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  // Fetch orders function
  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await kitchenApi.getConfirmedOrders();
      const ordersData = res.data || [];
      setOrders(ordersData);

      // Subscribe to all orders for real-time updates
      if (ordersData.length > 0 && connectionState === "connected") {
        const orderIds = ordersData.map((order) => order._id);
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
          const res = await kitchenApi.getItemsWithAvailability();
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
  }, [activeTab, connectionState]); // Added connectionState to dependencies

  //  Subscribe to orders when WebSocket connects
  useEffect(() => {
    if (connectionState === "connected" && orders.length > 0) {
      const orderIds = orders.map((order) => order._id);
      subscribeToOrders(orderIds);
    }

    return () => {
      if (activeTab !== "kds") {
        // Unsubscribe only if not on KDS tab
        unsubscribeFromAllOrders();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState, activeTab, orders.length]);

  //  Format order từ WebSocket để match với format từ API
  const formatOrderFromWebSocket = (rawOrder) => {
    // Debug: Log raw order để kiểm tra
    console.log("📦 [formatOrderFromWebSocket] Raw order:", {
      _id: rawOrder._id,
      status: rawOrder.status,
      hasItems: !!rawOrder.items,
      itemsLength: rawOrder.items?.length || 0,
      hasOrderItems: !!rawOrder.orderItems,
      orderItemsLength: rawOrder.orderItems?.length || 0
    });
    
    // Nếu order đã được format (có items), đảm bảo items có đầy đủ thông tin
    if (rawOrder.items && Array.isArray(rawOrder.items) && rawOrder.items.length > 0) {
      // Đảm bảo mỗi item có itemType và comboItems với status đầy đủ
      const normalizedItems = rawOrder.items.map((item) => {
        // Đảm bảo comboItems được giữ nguyên và có đầy đủ thông tin
        const normalizedComboItems = (item.comboItems || []).map((ci) => ({
          ...ci, // Giữ nguyên tất cả fields từ WebSocket
          itemId: ci.itemId || null,
          itemName: ci.itemName || (ci.itemId && typeof ci.itemId === 'object' ? ci.itemId.name : null) || "Món đã xóa",
          // Quan trọng: Phải giữ nguyên status từ WebSocket, không fallback về "pending"
          status:
            ci.status !== undefined && ci.status !== null
              ? ci.status
              : "pending",
          assignedChef: ci.assignedChef || null,
          servedBy: ci.servedBy || null,
          readyAt: ci.readyAt || null,
        }));
        
        return {
          ...item, // Giữ nguyên tất cả fields từ WebSocket
          itemType: item.itemType || (item.itemId?.type ? "menu" : "item"),
          comboItems: normalizedComboItems, // Đảm bảo comboItems luôn là array
        };
      });
      
      // Tính lại itemsRemaining từ normalizedItems
      const pendingItems = normalizedItems.reduce((count, item) => {
        // Nếu là combo, đếm số comboItems chưa ready
        if (item.itemType === "menu" && item.comboItems && item.comboItems.length > 0) {
          const pendingComboItems = item.comboItems.filter(
            (ci) => ci.status !== "ready" && ci.status !== "served"
          ).length;
          return count + pendingComboItems;
        }
        // Nếu là item thường, check status của chính nó
        if (item.status === "pending" || item.status === "preparing") {
          return count + 1;
        }
        return count;
      }, 0);
      
      console.log("📦 [formatOrderFromWebSocket] Using items array, normalized count:", normalizedItems.length);
      console.log("📦 [formatOrderFromWebSocket] Calculated itemsRemaining:", pendingItems);
      
      return {
        ...rawOrder,
        items: normalizedItems,
        totalItems: normalizedItems.length,
        itemsRemaining: pendingItems, // Đảm bảo tính lại itemsRemaining
      };
    }

    // Nếu là raw order từ WebSocket (có orderItems), format lại
    const orderItems = rawOrder.orderItems || [];
    console.log("📦 [formatOrderFromWebSocket] Using orderItems array, count:", orderItems.length);
    
    // Filter bỏ các items không hợp lệ (null, undefined, hoặc thiếu thông tin cơ bản)
    const validOrderItems = orderItems.filter((oi) => {
      if (!oi) return false;
      // Phải có ít nhất _id hoặc itemName để xác định là OrderItem hợp lệ
      return oi._id || oi.itemName || (oi.itemId && (typeof oi.itemId === 'object' ? oi.itemId.name : true));
    });
    
    if (validOrderItems.length === 0 && orderItems.length > 0) {
      console.warn("⚠️ [formatOrderFromWebSocket] WARNING: All orderItems were filtered out!", {
        originalCount: orderItems.length,
        sample: orderItems[0]
      });
    }
    
    // Tính số món còn lại - phải tính cả comboItems
    const pendingItems = validOrderItems.reduce((count, oi) => {
      // Nếu là combo, đếm số comboItems chưa ready
      if (oi.itemType === "menu" && oi.comboItems && oi.comboItems.length > 0) {
        const pendingComboItems = oi.comboItems.filter(
          (ci) => ci.status !== "ready" && ci.status !== "served"
        ).length;
        return count + pendingComboItems;
      }
      // Nếu là item thường, check status của chính nó
      if (oi.status === "pending" || oi.status === "preparing") {
        return count + 1;
      }
      return count;
    }, 0);

    // Đảm bảo validOrderItems không rỗng - nếu rỗng nhưng orderItems có data, log warning
    if (validOrderItems.length === 0 && orderItems.length > 0) {
      console.error("❌ [formatOrderFromWebSocket] CRITICAL: validOrderItems is empty but orderItems has data!", {
        orderItemsCount: orderItems.length,
        orderItemsSample: orderItems[0],
        rawOrderKeys: Object.keys(rawOrder)
      });
    }
    
    const formattedResult = {
      _id: rawOrder._id,
      tableNumber:
        rawOrder.tableId?.tableNumber || rawOrder.tableId?.number || "N/A",
      createdAt: rawOrder.createdAt,
      status: rawOrder.status,
      totalItems: validOrderItems.length,
      itemsRemaining: pendingItems,
      items: validOrderItems.map((orderItem) => {
        // Handle assignedChef - có thể là object (populated) hoặc ObjectId string
        let chefName = null;
        if (orderItem.assignedChef) {
          if (
            typeof orderItem.assignedChef === "object" &&
            orderItem.assignedChef.name
          ) {
            chefName = orderItem.assignedChef.name;
          } else if (typeof orderItem.assignedChef === "string") {
            // Nếu là ObjectId string, sẽ hiển thị null (không có tên)
            // Frontend sẽ cần fetch tên nếu cần, hoặc backend phải populate
            chefName = null;
          }
        }

        // Đảm bảo itemName luôn có giá trị
        const itemName = orderItem.itemName || 
                        (orderItem.itemId && typeof orderItem.itemId === 'object' ? orderItem.itemId.name : null) ||
                        "Món đã xóa";
        
        return {
          orderItemId: orderItem._id,
          itemName: itemName,
          quantity: orderItem.quantity || 0,
          note: orderItem.note || "",
          status: orderItem.status || "pending",
          itemType: orderItem.itemType || "item", // 'item' hoặc 'menu'
          comboItems: (orderItem.comboItems || []).map((ci) => ({
            ...ci,
            // Đảm bảo comboItem có itemName
            itemName: ci.itemName || (ci.itemId && typeof ci.itemId === 'object' ? ci.itemId.name : null) || "Món đã xóa",
            // Xử lý assignedChef cho comboItem - có thể là object hoặc ObjectId
            assignedChef:
              ci.assignedChef &&
              typeof ci.assignedChef === "object" &&
              ci.assignedChef.name
                ? ci.assignedChef
                : ci.assignedChef || null,
          })), // Mảng các món trong combo nếu có
          chef: chefName,
        };
      }),
    };
    
    console.log("📦 [formatOrderFromWebSocket] Final formatted result:", {
      _id: formattedResult._id,
      status: formattedResult.status,
      totalItems: formattedResult.totalItems,
      itemsRemaining: formattedResult.itemsRemaining,
      itemsCount: formattedResult.items?.length || 0
    });
    
    return formattedResult;
  };

  // Handle WebSocket messages for real-time updates
  useEffect(() => {
    if (lastMessage) {
      console.log(" Kitchen received WebSocket message:", lastMessage);

      switch (lastMessage.type) {
        case "order:updated":
          if (lastMessage.data && activeTab === "kds") {
            // Cập nhật order cho cả confirmed, preparing, và ready (để hiển thị order đã hoàn thành)
            if (
              lastMessage.data.status === "confirmed" ||
              lastMessage.data.status === "preparing" ||
              lastMessage.data.status === "ready"
            ) {
              const formattedOrder = formatOrderFromWebSocket(lastMessage.data);
              console.log("📦 Formatted order with comboItems:", formattedOrder);
              // Debug: Log để kiểm tra orderItems có bị mất không
              console.log("📦 Formatted order items count:", formattedOrder.items?.length || 0);
              if (formattedOrder.items && formattedOrder.items.length > 0) {
                formattedOrder.items.forEach((item, idx) => {
                  console.log(`📦 Item ${idx}:`, {
                    itemName: item.itemName,
                    status: item.status,
                    itemType: item.itemType,
                    comboItemsCount: item.comboItems?.length || 0,
                    comboItems: item.comboItems?.map((ci) => ({
                      itemName: ci.itemName,
                      status: ci.status,
                    })) || []
                  });
                });
              } else {
                console.warn("⚠️ WARNING: Formatted order has no items!", formattedOrder);
              }
              setOrders((prevOrders) => {
                if (!Array.isArray(prevOrders)) return [formattedOrder];
                
                // Tìm order hiện tại để merge comboItems nếu cần
                const existingOrder = prevOrders.find((o) => o._id === formattedOrder._id);
                
                // Nếu order đã tồn tại và có items, đảm bảo merge comboItems đúng cách
                if (existingOrder && existingOrder.items && formattedOrder.items) {
                  console.log("🔄 [WebSocket] Merging order items:", {
                    existingItemsCount: existingOrder.items.length,
                    newItemsCount: formattedOrder.items.length,
                    existingItemsRemaining: existingOrder.itemsRemaining,
                    newItemsRemaining: formattedOrder.itemsRemaining
                  });
                  
                  // Merge items để giữ comboItems từ cả hai nguồn
                  const mergedItems = formattedOrder.items.map((newItem) => {
                    const existingItem = existingOrder.items.find(
                      (ei) => (ei.orderItemId || ei._id) === (newItem.orderItemId || newItem._id)
                    );
                    
                    // Nếu tìm thấy existing item và có comboItems, merge comboItems
                    if (existingItem && existingItem.comboItems && newItem.comboItems) {
                      console.log("🔄 [WebSocket] Merging comboItems for item:", {
                        itemName: newItem.itemName,
                        existingComboItemsCount: existingItem.comboItems.length,
                        newComboItemsCount: newItem.comboItems.length
                      });
                      
                      // Merge comboItems: giữ status mới nhất từ newItem, nhưng giữ các field khác nếu thiếu
                      const mergedComboItems = newItem.comboItems.map((newCi, ciIdx) => {
                        const existingCi = existingItem.comboItems[ciIdx];
                        if (existingCi) {
                          // Merge: ưu tiên data mới, nhưng giữ các field khác nếu thiếu
                          return {
                            ...existingCi, // Giữ tất cả fields cũ
                            ...newCi, // Override với data mới
                          };
                        }
                        return newCi;
                      });
                      
                      // Nếu newItem có ít comboItems hơn existingItem, giữ lại các comboItems cũ
                      if (mergedComboItems.length < existingItem.comboItems.length) {
                        console.warn("⚠️ [WebSocket] WARNING: New item has fewer comboItems than existing!", {
                          itemName: newItem.itemName,
                          existingCount: existingItem.comboItems.length,
                          newCount: mergedComboItems.length
                        });
                        // Giữ lại các comboItems cũ không có trong newItem
                        const missingComboItems = existingItem.comboItems.slice(mergedComboItems.length);
                        mergedComboItems.push(...missingComboItems);
                      }
                      
                      return {
                        ...newItem,
                        comboItems: mergedComboItems,
                      };
                    }
                    
                    // Nếu existingItem có comboItems nhưng newItem không có, giữ lại comboItems từ existing
                    if (existingItem && existingItem.comboItems && existingItem.comboItems.length > 0 && (!newItem.comboItems || newItem.comboItems.length === 0)) {
                      console.warn("⚠️ [WebSocket] WARNING: New item missing comboItems, keeping from existing!", {
                        itemName: newItem.itemName,
                        existingComboItemsCount: existingItem.comboItems.length
                      });
                      return {
                        ...newItem,
                        comboItems: existingItem.comboItems, // Giữ lại comboItems từ existing
                      };
                    }
                    
                    return newItem;
                  });
                  
                  // Nếu newOrder có ít items hơn existingOrder, giữ lại các items cũ
                  if (mergedItems.length < existingOrder.items.length) {
                    console.warn("⚠️ [WebSocket] WARNING: New order has fewer items than existing!", {
                      existingCount: existingOrder.items.length,
                      newCount: mergedItems.length
                    });
                    const missingItems = existingOrder.items.filter(
                      (ei) => !mergedItems.some(
                        (mi) => (mi.orderItemId || mi._id) === (ei.orderItemId || ei._id)
                      )
                    );
                    mergedItems.push(...missingItems);
                  }
                  
                  formattedOrder.items = mergedItems;
                  
                  // Tính lại itemsRemaining sau khi merge
                  const recalculatedItemsRemaining = mergedItems.reduce((count, item) => {
                    if (item.itemType === "menu" && item.comboItems && item.comboItems.length > 0) {
                      const pendingComboItems = item.comboItems.filter(
                        (ci) => ci.status !== "ready" && ci.status !== "served"
                      ).length;
                      return count + pendingComboItems;
                    }
                    if (item.status === "pending" || item.status === "preparing") {
                      return count + 1;
                    }
                    return count;
                  }, 0);
                  
                  formattedOrder.itemsRemaining = recalculatedItemsRemaining;
                  formattedOrder.totalItems = mergedItems.length;
                  
                  console.log("✅ [WebSocket] Merged order:", {
                    itemsCount: mergedItems.length,
                    itemsRemaining: recalculatedItemsRemaining
                  });
                }
                
                const updated = prevOrders.map((order) =>
                  order._id === formattedOrder._id ? formattedOrder : order
                );
                // Nếu order không tồn tại trong danh sách, thêm vào
                const exists = updated.some(
                  (o) => o._id === formattedOrder._id
                );
                if (!exists) {
                  return [...prevOrders, formattedOrder];
                }
                return updated;
              });
              console.log("✅ Updated order in queue:", formattedOrder._id);
            } else {
              // Nếu order không còn confirmed/preparing/ready (ví dụ: paid, cancelled), xóa khỏi danh sách
              setOrders((prevOrders) => {
                if (!Array.isArray(prevOrders)) return [];
                return prevOrders.filter((o) => o._id !== lastMessage.data._id);
              });
              console.log(
                "🗑️ Removed order from queue (not confirmed/preparing/ready):",
                lastMessage.data._id
              );
            }
          }
          break;

        case "order:confirmed":
          // Đơn hàng mới được confirm - thêm vào danh sách
          if (
            lastMessage.data &&
            activeTab === "kds" &&
            lastMessage.data.status === "confirmed"
          ) {
            const formattedOrder = formatOrderFromWebSocket(lastMessage.data);
            setOrders((prevOrders) => {
              if (!Array.isArray(prevOrders)) return [formattedOrder];
              const exists = prevOrders.some(
                (o) => o._id === formattedOrder._id
              );
              if (!exists) {
                subscribeToOrders([formattedOrder._id]);
                return [...prevOrders, formattedOrder];
              }
              return prevOrders;
            });
            console.log(" New confirmed order added:", formattedOrder._id);
          }
          break;

        default:
          console.log(" Unknown message type:", lastMessage.type);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage, activeTab]);

  useEffect(() => {
    const fetchChefs = async () => {
      try {
        //  Chỉ lấy danh sách chef đã check-in (đang làm việc)
        const res = await kitchenApi.getActiveChefs();

        console.log("Active chefs response:", res);
        console.log("Active chefs data:", res?.data);

        setChefs(res?.data || []);
      } catch (err) {
        console.error(" Lỗi khi tải danh sách đầu bếp:", err);
      }
    };
    fetchChefs();
  }, [showChefModal]);

  //  Đồng bộ selectedOrder khi 'orders' thay đổi
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

  //  Cập nhật thời gian chờ đơn hàng
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

  //  Refresh helpers
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

          <div className="flex items-center space-x-4">
            <nav className="flex space-x-2">
              {[
                "kds",
                "items",
                "menus",
                "inventory",
                "purchase",
                "attendance",
              ].map((tab) => (
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
                    : tab === "purchase"
                    ? "Lịch sử Nhập hàng"
                    : "Quản lý Nhân viên"}
                </button>
              ))}
            </nav>

            {/* User info và nút profile/đăng xuất */}
            <div className="flex items-center space-x-3 border-l pl-4">
              {/* User Info */}
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.name || "Kitchen Manager"}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role === "kitchen_manager" ? "Bếp trưởng" : user?.role}
                </p>
              </div>

              {/* Profile Button with Dropdown */}
              <div className="relative profile-dropdown">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 transition-all duration-200 shadow-md hover:shadow-lg ring-2 ring-white ring-offset-2"
                  title="Menu Profile"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt="Avatar"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  )}

                  {/* Online status indicator */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                </button>

                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    {/* User Info trong dropdown (mobile) */}
                    <div className="md:hidden px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">
                        {user?.name || "Kitchen Manager"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user?.email || ""}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate("/profile");
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-orange-50 flex items-center space-x-3 transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-orange-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="text-sm text-gray-700">Xem Profile</span>
                    </button>

                    <hr className="my-1 border-gray-200" />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleLogout();
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center space-x-3 transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      <span className="text-sm text-red-600 font-medium">
                        Đăng xuất
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
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

        {/* TAB: Quản lý điểm danh nhân viên */}
        {!loading && !error && activeTab === "attendance" && (
          <ChefAttendanceManager />
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
