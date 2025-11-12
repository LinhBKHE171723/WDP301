import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "../ui/admin/card";
import { Input } from "../ui/admin/input";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/admin/dialog";
import { Button } from "../ui/admin/button";
import { Download } from "lucide-react";
import adminApi from "../../api/adminApi";
import waiterApi from "../../api/waiterApi";
import useAdminWebSocket from "../../hooks/useAdminWebSocket";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import PreOrderCalendar from "./PreOrderCalendar";
import "./PreOrderTable.css";

export const formatDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatCurrency = (amount) => {
  if (!amount) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export function PreOrderTable() {
  const { user } = useAuth();
  const userRole = user?.role || "admin";
  const isCashier = userRole === "cashier";
  const isAdmin = userRole === "admin";

  // Read query params from URL
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [preorders, setPreorders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openRow, setOpenRow] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [ingredientsInfo, setIngredientsInfo] = useState(null);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [loadingCustomerInfo, setLoadingCustomerInfo] = useState(false);
  
  // Advanced filters - initialize from URL params
  const [waiterResponseStatus, setWaiterResponseStatus] = useState(searchParams.get("waiterResponseStatus") || "");
  const [fromDate, setFromDate] = useState(searchParams.get("fromDate") || "");
  const [toDate, setToDate] = useState(searchParams.get("toDate") || "");
  const [minAmount, setMinAmount] = useState(searchParams.get("minAmount") || "");
  const [maxAmount, setMaxAmount] = useState(searchParams.get("maxAmount") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "createdAt");
  const [sortOrder, setSortOrder] = useState(searchParams.get("sortOrder") || "desc");
  const [showFilters, setShowFilters] = useState(false);
  const [filterBy, setFilterBy] = useState(searchParams.get("filterBy") || "createdAt");

  // Sync state from URL params when URL changes (e.g., when navigating from dashboard)
  useEffect(() => {
    const urlWaiterStatus = searchParams.get("waiterResponseStatus") || "";
    const urlFromDate = searchParams.get("fromDate") || "";
    const urlToDate = searchParams.get("toDate") || "";
    const urlFilterBy = searchParams.get("filterBy") || "createdAt";
    
    if (urlWaiterStatus !== waiterResponseStatus) setWaiterResponseStatus(urlWaiterStatus);
    if (urlFromDate !== fromDate) setFromDate(urlFromDate);
    if (urlToDate !== toDate) setToDate(urlToDate);
    if (urlFilterBy !== filterBy) setFilterBy(urlFilterBy);
  }, [searchParams]);
  
  // Approve/Cancel modals
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedOrderForAction, setSelectedOrderForAction] = useState(null);
  const [availableTables, setAvailableTables] = useState([]);
  const [approveForm, setApproveForm] = useState({ 
    tableIds: [], // Mảng các bàn đã chọn
    adminNotes: "",
    preparationStartTime: "",
    reservedEndTime: ""
  });
  const [cancelForm, setCancelForm] = useState({ adminNotes: "" });
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositForm, setDepositForm] = useState({ amount: "", paymentMethod: "cash", adminNotes: "" });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ itemsToAdd: [], itemsToRemove: [], itemsToUpdate: [] });
  const [availableItems, setAvailableItems] = useState([]);
  const [availableMenus, setAvailableMenus] = useState([]);
  const [newItemForm, setNewItemForm] = useState({ type: "item", itemId: "", quantity: 1 });
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({ tableIds: [], scheduledTime: "", adminNotes: "" });
  const [updateOverlapWarning, setUpdateOverlapWarning] = useState(null); // { overlappingOrders: [], showConfirm: false }
  const [allTables, setAllTables] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // "table" or "calendar"
  const [overlapWarning, setOverlapWarning] = useState(null); // { overlappingOrders: [], showConfirm: false }

  // WebSocket connection for real-time preorder updates
  const { lastMessage } = useAdminWebSocket();

  // Hàm xử lý approve preorder
  const handleApprovePreOrder = async (forceApprove = false) => {
    try {
      setActionLoading(true);
      await adminApi.approvePreOrder(
        selectedOrderForAction._id,
        approveForm.tableIds, // Gửi mảng tableIds
        approveForm.adminNotes,
        approveForm.preparationStartTime,
        approveForm.reservedEndTime,
        forceApprove
      );
      toast.success(`Đã approve và xác nhận đơn thành công (${approveForm.tableIds.length} bàn)`);
      setApproveModalOpen(false);
      setSelectedOrderForAction(null);
      setOverlapWarning(null);
      setApproveForm({ 
        tableIds: [], 
        adminNotes: "",
        preparationStartTime: "",
        reservedEndTime: ""
      });
      
      // Refresh list (silently, không hiển thị toast nếu lỗi)
      try {
        const response = await adminApi.getPreOrders({
          waiterResponseStatus,
          fromDate,
          toDate,
          minAmount,
          maxAmount,
          sortBy,
          sortOrder
        });
        setPreorders(Array.isArray(response?.data) ? response.data : []);
      } catch (refreshErr) {
        console.error("Lỗi khi refresh danh sách sau khi approve đơn:", refreshErr);
      }
    } catch (err) {
      console.error("Lỗi khi approve đơn:", err);
      // Client.js đã reject với err.response?.data, nên cần truy cập err.message hoặc err.data?.message
      const errorMessage = err?.message || err?.data?.message || err?.response?.data?.message || "Lỗi khi approve đơn";
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Hàm xử lý update preorder
  const handleUpdatePreOrder = async (forceUpdate = false) => {
    try {
      setActionLoading(true);
      await adminApi.updatePreOrder(
        selectedOrderForAction._id,
        updateForm.tableIds.length > 0 ? updateForm.tableIds : undefined, // Gửi tableIds nếu có
        updateForm.scheduledTime || undefined,
        updateForm.adminNotes,
        forceUpdate // Gửi forceUpdate
      );
      toast.success("Đã cập nhật đơn đặt trước thành công");
      setUpdateModalOpen(false);
      setSelectedOrderForAction(null);
      setUpdateForm({ tableIds: [], scheduledTime: "", adminNotes: "" });
      setUpdateOverlapWarning(null);
      
      // Refresh list (silently, không hiển thị toast nếu lỗi)
      try {
        const response = await adminApi.getPreOrders({
          waiterResponseStatus,
          fromDate,
          toDate,
          minAmount,
          maxAmount,
          sortBy,
          sortOrder
        });
        setPreorders(Array.isArray(response?.data) ? response.data : []);
      } catch (refreshErr) {
        console.error("Lỗi khi refresh danh sách sau khi cập nhật đơn:", refreshErr);
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật đơn:", err);
      console.log("🔍 Full err object:", JSON.stringify(err, null, 2));
      // Kiểm tra xem có conflicts trong response không
      // Client.js interceptor đã extract err.response.data thành err, nên check err.conflicts trực tiếp
      const conflicts = err?.conflicts || err?.response?.data?.conflicts || err?.data?.conflicts;
      console.log("🔍 Debug conflicts:", conflicts, "type:", typeof conflicts, "isArray:", Array.isArray(conflicts));
      if (conflicts && Array.isArray(conflicts) && conflicts.length > 0 && !forceUpdate) {
        console.log("✅ Có conflicts, sẽ hiển thị modal thay vì toast");
        // Parse conflicts thành format giống approve
        const overlappingOrders = conflicts.map(c => ({
          _id: c.orderId,
          userId: { name: c.customerName },
          tableIds: c.tableIds ? c.tableIds.map(tid => ({ _id: tid })) : (c.otherTableIds ? c.otherTableIds.map(tid => ({ _id: tid })) : []),
          scheduledTime: c.scheduledTime,
          preparationStartTime: c.preparationStartTime,
          reservedEndTime: c.reservedEndTime
        }));
        console.log("🔍 Debug overlappingOrders:", overlappingOrders);
        setUpdateOverlapWarning({
          overlappingOrders,
          showConfirm: false
        });
        setActionLoading(false);
        return; // Không hiển thị toast, hiển thị modal cảnh báo
      }
      const errorMessage = err?.message || err?.data?.message || err?.response?.data?.message || "Lỗi khi cập nhật đơn";
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch available tables
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await waiterApi.getAvailableTables();
        setAvailableTables(Array.isArray(response?.data || response) ? (response?.data || response) : []);
      } catch (err) {
        console.error("Lỗi khi load danh sách bàn:", err);
      }
    };
    fetchTables();
  }, []);

  // Fetch all tables (for assign table)
  useEffect(() => {
    const fetchAllTables = async () => {
      try {
        const response = await waiterApi.getAllTables();
        setAllTables(Array.isArray(response?.tables || response?.data || response) ? (response?.tables || response?.data || response) : []);
      } catch (err) {
        console.error("Lỗi khi load danh sách tất cả bàn:", err);
      }
    };
    fetchAllTables();
  }, []);

  // Fetch available items and menus
  useEffect(() => {
    const fetchItemsAndMenus = async () => {
      try {
        const [itemsRes, menusRes] = await Promise.all([
          adminApi.getAllItems(),
          adminApi.getAllMenus()
        ]);
        setAvailableItems(Array.isArray(itemsRes?.data) ? itemsRes.data : []);
        setAvailableMenus(Array.isArray(menusRes?.data) ? menusRes.data : []);
      } catch (err) {
        console.error("Lỗi khi load danh sách món:", err);
      }
    };
    fetchItemsAndMenus();
  }, []);

  // Fetch preorders from API with filters
  useEffect(() => {
    const fetchPreOrders = async () => {
      try {
        setLoading(true);
        // Build query params
        const params = {};
        if (waiterResponseStatus) params.waiterResponseStatus = waiterResponseStatus;
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;
        if (minAmount) params.minAmount = minAmount;
        if (maxAmount) params.maxAmount = maxAmount;
        if (sortBy) params.sortBy = sortBy;
        if (sortOrder) params.sortOrder = sortOrder;
        if (filterBy) params.filterBy = filterBy;
        
        const response = await adminApi.getPreOrders(params);
        const ordersData = response?.data || [];
        setPreorders(Array.isArray(ordersData) ? ordersData : []);
      } catch (err) {
        console.error("Lỗi khi load đơn đặt trước:", err);
        setPreorders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPreOrders();
  }, [waiterResponseStatus, fromDate, toDate, minAmount, maxAmount, sortBy, sortOrder, filterBy]);

  // Sync URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (waiterResponseStatus) params.set("waiterResponseStatus", waiterResponseStatus);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    if (minAmount) params.set("minAmount", minAmount);
    if (maxAmount) params.set("maxAmount", maxAmount);
    if (sortBy && sortBy !== "createdAt") params.set("sortBy", sortBy);
    if (sortOrder && sortOrder !== "desc") params.set("sortOrder", sortOrder);
    if (filterBy && filterBy !== "createdAt") params.set("filterBy", filterBy);
    
    setSearchParams(params, { replace: true });
  }, [waiterResponseStatus, fromDate, toDate, minAmount, maxAmount, sortBy, sortOrder, filterBy, setSearchParams]);

  // Listen for preorder updates via WebSocket to update the list
  // Note: Toast notifications are handled by AdminPreOrderNotification component
  useEffect(() => {
    if (!lastMessage) return;

    const messageType = lastMessage.type;
    const orderData = lastMessage.data;
      
    if (!orderData || !orderData._id) return;

    const orderId = String(orderData._id || orderData.id || '');
    
    if (!orderId) {
      console.warn('⚠️ WebSocket event missing orderId:', messageType, orderData);
      return;
    }
    
    // Debug log để kiểm tra WebSocket events
    console.log(`📨 PreOrderTable received WebSocket event: ${messageType}`, {
      orderId,
      status: orderData.status,
      waiterResponseStatus: orderData.waiterResponse?.status,
      hasOrderId: !!orderData._id,
      orderDataKeys: Object.keys(orderData || {})
    });

    // Handle new preorder event
    // Admin chỉ nhận đơn lớn, Cashier chỉ nhận đơn nhỏ (backend đã filter)
    if (messageType === 'preorder:new') {
        // Show toast notification
        const customerName = orderData.preorderName || orderData.userId?.name || "Khách hàng";
        const orderTotal = formatCurrency(orderData.totalAmount || 0);
        toast.info(`🆕 Đơn đặt trước mới từ ${customerName} - ${orderTotal}`, {
          position: "top-right",
          autoClose: 5000,
        });
        
        setPreorders((prevPreorders) => {
          // Check if preorder already exists (avoid duplicates)
          const exists = prevPreorders.some(
          (order) => String(order._id) === orderId
          );
          
          if (exists) {
            // Update existing preorder if it already exists
            return prevPreorders.map((order) =>
            String(order._id) === orderId ? orderData : order
            );
          } else {
            // Add new preorder to the beginning of the list
          return [orderData, ...prevPreorders];
        }
      });
      
      console.log('✅ New preorder received via WebSocket:', orderId);
    }
    // Handle cancelled preorder - remove from list (vì status đã thành "cancelled", không còn là "preorder")
    else if (messageType === 'preorder:cancelled') {
      // Show toast notification
      const customerName = orderData.preorderName || orderData.userId?.name || "Khách hàng";
      toast.warning(`❌ Đơn đặt trước từ ${customerName} đã bị hủy`, {
        position: "top-right",
        autoClose: 3000,
      });
      
      setPreorders((prevPreorders) => {
        const filtered = prevPreorders.filter(
          (order) => String(order._id) !== orderId
        );
        if (filtered.length !== prevPreorders.length) {
          console.log('✅ Preorder cancelled, removed from list:', orderId);
        }
        return filtered;
      });
    }
    // Handle preorder:approved - Khi approve, order sẽ chuyển sang "confirmed" nên cần remove ngay
    else if (messageType === 'preorder:approved') {
      const customerName = orderData.preorderName || orderData.userId?.name || "Khách hàng";
      toast.success(`✅ Đơn đặt trước từ ${customerName} đã được duyệt`, {
        position: "top-right",
        autoClose: 3000,
      });
      
      // Khi approve preorder, order sẽ chuyển sang "confirmed" → remove khỏi danh sách "Đơn đặt trước"
      setPreorders((prevPreorders) => {
        const filtered = prevPreorders.filter(
          (order) => {
            const currentOrderId = String(order._id || order);
            return currentOrderId !== orderId;
          }
        );
        if (filtered.length !== prevPreorders.length) {
          console.log(`✅ Preorder approved - removed from list:`, orderId, `(status: ${orderData.status})`);
        } else {
          console.log(`⚠️ Preorder ${orderId} not found in list to remove`);
        }
        return filtered;
      });
      
      // Đóng modal nếu đang mở cho order này
      if (openRow === orderId) {
        setOpenRow(null);
      }
    }
    // Handle updated preorder (modified, deposit recorded, etc.) - KHÔNG bao gồm approved
    else if (
      messageType === 'preorder:updated' ||
      messageType === 'preorder:deposit_recorded' ||
      messageType === 'preorder:items_modified'
    ) {
      // Show toast notifications for important events
      const customerName = orderData.preorderName || orderData.userId?.name || "Khách hàng";
      if (messageType === 'preorder:deposit_recorded') {
        const depositAmount = formatCurrency(orderData.totalDeposit || orderData.totalPaid || 0);
        toast.success(`💰 Đã ghi nhận tiền cọc ${depositAmount} từ ${customerName}`, {
          position: "top-right",
          autoClose: 3000,
        });
      }
      
      setPreorders((prevPreorders) => {
        const exists = prevPreorders.some(
          (order) => {
            const currentOrderId = String(order._id || order);
            return currentOrderId === orderId;
          }
        );
        
        // Nếu order không còn là "preorder" (đã chuyển sang confirmed, cancelled, etc.), remove khỏi list
        if (orderData.status && orderData.status !== 'preorder') {
          const filtered = prevPreorders.filter(
            (order) => {
              const currentOrderId = String(order._id || order);
              return currentOrderId !== orderId;
            }
          );
          if (filtered.length !== prevPreorders.length) {
            console.log(`✅ Preorder ${messageType} - removed from list (status changed to ${orderData.status}):`, orderId);
          }
          return filtered;
        }
        
        if (exists) {
          // Update existing preorder (vẫn là preorder)
          return prevPreorders.map((order) => {
            const currentOrderId = String(order._id || order);
            return currentOrderId === orderId ? orderData : order;
          });
        }
        // Nếu không tồn tại và order vẫn là "preorder", thêm vào list
        else {
          return [orderData, ...prevPreorders];
        }
      });
      
      console.log(`✅ Preorder ${messageType} received via WebSocket:`, orderId, orderData);
      
      // Nếu modal đang mở cho order này, đóng và mở lại để refresh data
      if (openRow === orderId && messageType === 'preorder:deposit_recorded') {
        console.log("🔄 Refreshing modal for order with deposit:", orderId);
        // Đóng modal tạm thời để trigger re-open với data mới
        setTimeout(() => {
          setOpenRow(orderId);
        }, 100);
      }
    }
    // Handle order:confirmed (khi approve với autoConfirm)
    // Lưu ý: Backend emit cả preorder:approved và order:confirmed khi approve
    // Cả hai events đều cần remove order khỏi danh sách "Đơn đặt trước"
    // Nhưng để tránh duplicate, chỉ xử lý nếu chưa bị remove bởi preorder:approved
    else if (messageType === 'order:confirmed') {
      console.log(`📨 Handling order:confirmed event for order ${orderId}, status: ${orderData.status}`);
      
      setPreorders((prevPreorders) => {
        // Remove khỏi list vì đã chuyển sang confirmed
        const filtered = prevPreorders.filter(
          (order) => {
            const currentOrderId = String(order._id || order);
            return currentOrderId !== orderId;
          }
        );
        if (filtered.length !== prevPreorders.length) {
          console.log('✅ Order confirmed, removed from preorder list:', orderId);
        } else {
          console.log(`⚠️ Order ${orderId} not found in preorder list (may have been removed by preorder:approved event)`);
        }
        return filtered;
      });
      
      // Đóng modal nếu đang mở cho order này
      if (openRow === orderId) {
        setOpenRow(null);
      }
    }
  }, [lastMessage, openRow]);

  // Filter preorders based on search
  const filtered = useMemo(() => {
    if (!search.trim()) return preorders;
    const searchLower = search.toLowerCase();
    return preorders.filter((order) => {
      const customerName = order?.preorderName || order?.userId?.name || "";
      const customerEmail = order?.userId?.email || "";
      const customerPhone = order?.userId?.phone || "";
      const orderId = order?._id || "";
      const searchText = `${customerName} ${customerEmail} ${customerPhone} ${orderId}`.toLowerCase();
      return searchText.includes(searchLower);
    });
  }, [preorders, search]);

  // Handle export preorders
  const handleExportPreOrders = async () => {
    try {
      setExportLoading(true);
      const params = {};
      
      // Apply current filters
      if (waiterResponseStatus) params.waiterResponseStatus = waiterResponseStatus;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (minAmount) params.minAmount = minAmount;
      if (maxAmount) params.maxAmount = maxAmount;
      params.format = "xlsx";

      const blob = await adminApi.exportPreOrders(params);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `don-dat-truoc-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Đã xuất file Excel thành công");
    } catch (err) {
      console.error("Lỗi khi xuất file:", err);
      toast.error(err?.message || "Không thể xuất file Excel");
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="preorder-container">
        <div className="preorder-header">
          <h1 className="preorder-title">Đơn đặt trước</h1>
        </div>
        <Card className="preorder-card">
          <div className="preorder-loading">
            <div className="preorder-loading-spinner"></div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="preorder-container">
      <div className="preorder-header">
        <h1 className="preorder-title">Đơn đặt trước</h1>
        {isAdmin && (
          <span className="preorder-badge admin">
            Đơn lớn (Admin)
          </span>
        )}
        {isCashier && (
          <span className="preorder-badge cashier">
            Đơn nhỏ (Cashier)
          </span>
        )}
      </div>

      <Card className="preorder-card">
        {/* View Mode Switcher */}
        <div className="flex gap-2 mb-4 border-b">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            onClick={() => setViewMode("table")}
            className="rounded-b-none"
          >
            Danh sách
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            onClick={() => setViewMode("calendar")}
            className="rounded-b-none"
          >
            Lịch
          </Button>
        </div>

        {/* Calendar View */}
        {viewMode === "calendar" && (
          <div className="p-4">
            <PreOrderCalendar preorders={preorders} />
          </div>
        )}

        {/* Table View */}
        {viewMode === "table" && (
          <>
            {/* Search */}
            <div className="preorder-search-container">
          <Input
            placeholder="Tìm theo tên, email, SĐT, mã đơn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="preorder-search-input"
          />
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setWaiterResponseStatus("");
              setFromDate("");
              setToDate("");
              setMinAmount("");
              setMaxAmount("");
              setSortBy("createdAt");
              setSortOrder("desc");
              setFilterBy("createdAt");
              setSearchParams({}, { replace: true }); // Clear URL params
            }}
            className="preorder-filter-btn"
          >
            Xóa bộ lọc
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="preorder-filter-btn"
          >
            {showFilters ? "Ẩn bộ lọc" : "Hiện bộ lọc"}
          </Button>
          <Button
            variant="default"
            onClick={handleExportPreOrders}
            disabled={exportLoading}
            className="preorder-filter-btn"
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "8px",
              color: "white",
              backgroundColor: "#2563eb"
            }}
          >
            <Download size={16} />
            {exportLoading ? "Đang xuất..." : "Xuất Excel"}
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="preorder-filters">
            <div className="preorder-filters-grid">
              {/* Waiter Response Status */}
              <div className="preorder-filter-group">
                <label>Trạng thái waiter</label>
                <select
                  value={waiterResponseStatus}
                  onChange={(e) => setWaiterResponseStatus(e.target.value)}
                >
                  <option value="">Tất cả</option>
                  <option value="pending">Chờ xác nhận</option>
                  <option value="approved">Đã xác nhận</option>
                  <option value="rejected">Đã từ chối</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="preorder-filter-group">
                <label>Từ ngày</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>

              <div className="preorder-filter-group">
                <label>Đến ngày</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>

              {/* Amount Range */}
              <div className="preorder-filter-group">
                <label>Số tiền tối thiểu (₫)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                />
              </div>

              <div className="preorder-filter-group">
                <label>Số tiền tối đa (₫)</label>
                <Input
                  type="number"
                  placeholder="Không giới hạn"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                />
              </div>

              {/* Sort By */}
              <div className="preorder-filter-group">
                <label>Sắp xếp theo</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="createdAt">Ngày tạo</option>
                  <option value="totalAmount">Tổng tiền</option>
                  <option value="scheduledTime">Thời gian đặt</option>
                </select>
              </div>

              {/* Sort Order */}
              <div className="preorder-filter-group">
                <label>Thứ tự</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="desc">Giảm dần</option>
                  <option value="asc">Tăng dần</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="preorder-table-wrapper">
          <table className="preorder-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Thời gian đặt</th>
                <th>Tổng tiền</th>
                <th>Trạng thái waiter</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const orderId = order?._id || "";
                const orderShort = orderId ? `${String(orderId).slice(-8)}...` : "-";
                const customer = order?.userId || {};
                // Ưu tiên dùng preorderName (tên lúc đặt) nếu có, nếu không thì dùng tên từ User
                const customerName = order?.preorderName || customer?.name || "Khách ẩn danh";
                const customerEmail = customer?.email || "-";
                const customerPhone = customer?.phone || "-";
                const scheduledTime = order?.scheduledTime;
                const totalAmount = order?.totalAmount || 0;
                const orderItems = order?.orderItems || [];
                const waiterResponseStatus = order?.waiterResponse?.status || "pending";
                // Lấy userId - userId đã được populate nên customer là object User
                // customer._id sẽ là Mongoose ObjectId, cần convert sang string
                const userId = customer?._id ? String(customer._id) : (order?.userId ? String(order.userId) : null);
                
                // Badge cho waiter response status
                const getWaiterStatusBadge = (status) => {
                  const badges = {
                    pending: "preorder-status-badge pending",
                    approved: "preorder-status-badge approved",
                    rejected: "preorder-status-badge rejected"
                  };
                  const labels = {
                    pending: "Chờ xác nhận",
                    approved: "Đã xác nhận",
                    rejected: "Đã từ chối"
                  };
                  return (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${badges[status] || badges.pending}`}>
                      {labels[status] || labels.pending}
                    </span>
                  );
                };

                return (
                  <tr key={orderId}>
                    <td>
                      <span className="preorder-id">{orderShort}</span>
                    </td>
                    <td>
                      <span className="preorder-customer-name">{customerName}</span>
                    </td>
                    <td>
                      <span className="preorder-customer-email">{customerEmail}</span>
                    </td>
                    <td>
                      <span className="preorder-customer-phone">{customerPhone}</span>
                    </td>
                    <td>
                      {scheduledTime ? formatDate(scheduledTime) : "-"}
                    </td>
                    <td>
                      <span className="preorder-amount">{formatCurrency(totalAmount)}</span>
                    </td>
                    <td>
                      {getWaiterStatusBadge(waiterResponseStatus)}
                    </td>
                    <td>
                      <Dialog
                        open={openRow === orderId}
                        onOpenChange={(v) => {
                          setOpenRow(v ? orderId : null);
                          if (!v) {
                            setCustomerInfo(null);
                            setIngredientsInfo(null);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            className="preorder-action-btn view"
                            onClick={async () => {
                              setOpenRow(orderId);
                              // Fetch customer info when opening dialog
                              if (userId) {
                                try {
                                  setLoadingCustomerInfo(true);
                                  // userId đã được convert sang string ở trên
                                  console.log("Fetching customer info for userId:", userId);
                                  const response = await adminApi.getCustomerInfo(userId);
                                  console.log("Customer info response:", response);
                                  if (response?.data) {
                                    setCustomerInfo(response.data);
                                  } else {
                                    console.warn("Response không có data:", response);
                                    setCustomerInfo(null);
                                  }
                                } catch (err) {
                                  console.error("Lỗi khi load thông tin khách hàng:", err);
                                  console.error("Error details:", err.response?.data || err.message);
                                  setCustomerInfo(null);
                                } finally {
                                  setLoadingCustomerInfo(false);
                                }
                              } else {
                                console.warn("Không có userId để fetch thông tin khách hàng. Order userId:", order?.userId, "Customer:", customer);
                                setCustomerInfo(null);
                              }
                              
                              // Load thông tin nguyên liệu
                              try {
                                setLoadingIngredients(true);
                                const ingredientsResponse = await adminApi.getPreOrderIngredients(orderId);
                                if (ingredientsResponse?.data) {
                                  setIngredientsInfo(ingredientsResponse.data);
                                } else {
                                  setIngredientsInfo(null);
                                }
                              } catch (err) {
                                console.error("Lỗi khi load thông tin nguyên liệu:", err);
                                setIngredientsInfo(null);
                              } finally {
                                setLoadingIngredients(false);
                              }
                            }}
                          >
                            Xem chi tiết
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[98vw] w-full max-h-[90vh] overflow-y-auto border-2 border-black">
                          <DialogHeader>
                            <DialogTitle>Chi tiết đơn đặt trước</DialogTitle>
                            <DialogDescription>
                              Mã đơn: {orderId}
                            </DialogDescription>
                          </DialogHeader>

                          <div className="grid grid-cols-[1.2fr_1.8fr] gap-8">
                            {/* Cột trái: Chi tiết đơn hàng */}
                            <div className="space-y-4">
                              <h3 className="font-semibold text-lg text-gray-800 border-b pb-2">
                                Chi tiết đơn hàng
                              </h3>

                              {/* Thông tin khách hàng cơ bản */}
                              <div className="border-b pb-3">
                                <h4 className="font-semibold text-gray-800 mb-2">
                                  Thông tin khách hàng
                                </h4>
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                  <div>
                                    <span className="text-gray-500">Tên người dùng:</span>{" "}
                                    <span className="font-medium">{customer?.name || "Khách ẩn danh"}</span>
                                  </div>
                                  {order?.preorderName && order.preorderName !== customer?.name && (
                                    <div>
                                      <span className="text-gray-500">Tên liên hệ:</span>{" "}
                                      <span className="font-medium text-blue-600">{order.preorderName}</span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-gray-500">Email:</span>{" "}
                                    <span className="font-medium">{customerEmail}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">SĐT:</span>{" "}
                                    <span className="font-medium">{customerPhone}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Thời gian đặt:</span>{" "}
                                    <span className="font-medium">
                                      {scheduledTime ? formatDate(scheduledTime) : "-"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Bàn:</span>{" "}
                                    <span className="font-medium">
                                      {(() => {
                                        // Ưu tiên tableIds (nhiều bàn), fallback về tableId (1 bàn)
                                        if (order?.tableIds && Array.isArray(order.tableIds) && order.tableIds.length > 0) {
                                          const tableNumbers = order.tableIds
                                            .map(t => t?.tableNumber || t)
                                            .filter(Boolean);
                                          return tableNumbers.length > 0 
                                            ? `Bàn ${tableNumbers.join(", ")}`
                                            : "Chưa gán bàn";
                                        } else if (order?.tableId) {
                                          const tableNumber = order.tableId?.tableNumber || order.tableId;
                                          return tableNumber ? `Bàn ${tableNumber}` : "Chưa gán bàn";
                                        }
                                        return "Chưa gán bàn";
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Chi tiết món ăn */}
                              {orderItems.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-2">
                                    Chi tiết món ăn
                                  </h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm border-collapse border border-gray-200">
                                      <thead>
                                        <tr className="bg-gray-50 border-b">
                                          <th className="text-left p-2">Món ăn</th>
                                          <th className="text-left p-2">Loại</th>
                                          <th className="text-left p-2">SL</th>
                                          <th className="text-left p-2">Đơn giá</th>
                                          <th className="text-left p-2">Thành tiền</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {orderItems.map((item, i) => {
                                          const itemTotal = (item?.price || 0) * (item?.quantity || 0);
                                          return (
                                            <tr key={i} className="border-b">
                                              <td className="p-2">
                                                {item?.itemName || "Không rõ"}
                                              </td>
                                              <td className="p-2">
                                                {item?.itemType === "menu" ? "Combo" : "Món đơn"}
                                              </td>
                                              <td className="p-2">{item?.quantity || 1}</td>
                                              <td className="p-2">
                                                {formatCurrency(item?.price || 0)}
                                              </td>
                                              <td className="p-2 font-medium">
                                                {formatCurrency(itemTotal)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                      <tfoot>
                                        <tr className="bg-gray-50 font-semibold">
                                          <td colSpan={4} className="p-2 text-right">
                                            Tổng tiền:
                                          </td>
                                          <td className="p-2">
                                            {formatCurrency(
                                              orderItems.reduce((sum, item) => {
                                                return sum + ((item?.price || 0) * (item?.quantity || 0));
                                              }, 0)
                                            )}
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {orderItems.length === 0 && (
                                <div className="text-sm text-gray-500">
                                  Không có món ăn nào trong đơn này.
                                </div>
                              )}

                              {/* Thông tin thanh toán */}
                              <div className="border-t pt-3">
                                <h4 className="font-semibold text-gray-800 mb-2">
                                  Thông tin thanh toán
                                </h4>
                                <div className="space-y-3">
                                  {/* Tính tổng tiền gốc từ orderItems */}
                                  {(() => {
                                    const subtotal = orderItems.reduce((sum, item) => {
                                      return sum + ((item?.price || 0) * (item?.quantity || 0));
                                    }, 0);
                                    const discount = order?.discount || 0;
                                    const finalTotal = totalAmount;
                                    
                                    if (discount > 0) {
                                      return (
                                        <>
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Tổng tiền gốc:</span>
                                            <span className="font-semibold text-gray-900">
                                              {formatCurrency(subtotal)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between" style={{ color: '#28a745', fontWeight: 'bold' }}>
                                            <span className="text-gray-600">Giảm giá (khách hàng thân thiết):</span>
                                            <span className="font-semibold">
                                              -{formatCurrency(discount)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between border-t pt-2">
                                            <span className="text-gray-600 font-semibold">Tổng tiền đơn:</span>
                                            <span className="font-semibold text-gray-900">
                                              {formatCurrency(finalTotal)}
                                            </span>
                                          </div>
                                        </>
                                      );
                                    } else {
                                      return (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Tổng tiền đơn:</span>
                                          <span className="font-semibold text-gray-900">
                                            {formatCurrency(finalTotal)}
                                          </span>
                                        </div>
                                      );
                                    }
                                  })()}
                                  
                                  {/* Danh sách tất cả payments */}
                                  {order?.paymentIds && Array.isArray(order.paymentIds) && order.paymentIds.length > 0 ? (
                                    <div>
                                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                                        Lịch sử thanh toán ({order.paymentIds.length} payment)
                                      </h5>
                                      <div className="max-h-48 overflow-y-auto border rounded-lg">
                                        <table className="w-full text-xs">
                                          <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                              <th className="text-left p-2 border-b">Loại</th>
                                              <th className="text-left p-2 border-b">Số tiền</th>
                                              <th className="text-left p-2 border-b">Phương thức</th>
                                              <th className="text-left p-2 border-b">Thời gian</th>
                                              <th className="text-left p-2 border-b">Trạng thái</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {order.paymentIds.map((payment, idx) => {
                                              const paymentDate = payment?.payTime || payment?.createdAt;
                                              const paymentMethodLabels = {
                                                cash: "Tiền mặt",
                                                card: "Thẻ",
                                                momo: "MoMo",
                                                zaloPay: "ZaloPay"
                                              };
                                              const statusLabels = {
                                                paid: "Đã thanh toán",
                                                unpaid: "Chưa thanh toán"
                                              };
                                              return (
                                                <tr key={payment?._id || idx} className="border-b hover:bg-gray-50">
                                                  <td className="p-2">
                                                    {payment?.isDeposit ? (
                                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                                        Cọc
                                                      </span>
                                                    ) : (
                                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                                        Thanh toán
                                                      </span>
                                                    )}
                                                  </td>
                                                  <td className="p-2 font-semibold">
                                                    {formatCurrency(payment?.amountPaid || 0)}
                                                  </td>
                                                  <td className="p-2">
                                                    {paymentMethodLabels[payment?.paymentMethod] || payment?.paymentMethod || "-"}
                                                  </td>
                                                  <td className="p-2 text-gray-600">
                                                    {paymentDate ? formatDate(paymentDate) : "-"}
                                                  </td>
                                                  <td className="p-2">
                                                    <span className={`text-xs ${
                                                      payment?.status === 'paid' 
                                                        ? 'text-green-600 font-medium' 
                                                        : 'text-gray-500'
                                                    }`}>
                                                      {statusLabels[payment?.status] || payment?.status || "-"}
                                                    </span>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                          <tfoot className="bg-gray-50">
                                            <tr>
                                              <td className="p-2 font-semibold" colSpan={2}>
                                                Tổng đã thanh toán:
                                              </td>
                                              <td className="p-2 font-semibold text-green-600">
                                                {formatCurrency(
                                                  order.paymentIds
                                                    .filter(p => p?.status === 'paid')
                                                    .reduce((sum, p) => sum + (Number(p?.amountPaid) || 0), 0)
                                                )}
                                              </td>
                                              <td className="p-2 font-semibold" colSpan={1}>
                                                Còn lại:
                                              </td>
                                              <td className="p-2 font-semibold text-orange-600">
                                                {formatCurrency(
                                                  Math.max(0, totalAmount - 
                                                    order.paymentIds
                                                      .filter(p => p?.status === 'paid')
                                                      .reduce((sum, p) => sum + (Number(p?.amountPaid) || 0), 0)
                                                  )
                                                )}
                                              </td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-gray-500 text-xs italic border rounded-lg p-3 bg-gray-50">
                                      Chưa có thanh toán nào
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOrderForAction(order);
                                    setDepositForm({ amount: "", paymentMethod: "cash", adminNotes: "" });
                                    setDepositModalOpen(true);
                                  }}
                                  disabled={waiterResponseStatus === "rejected"}
                                  className="mt-3 w-full bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400"
                                >
                                  {waiterResponseStatus === "rejected" 
                                    ? "Không thể nhập cọc (đơn đã bị từ chối)" 
                                    : "Nhập tiền cọc"}
                                </Button>
                              </div>
                            </div>

                            {/* Cột phải: Nguyên liệu và Chi tiết khách hàng */}
                            <div className="space-y-4 border-l pl-8">
                              {/* Thông tin nguyên liệu */}
                              <div>
                                <h3 className="font-semibold text-lg text-gray-800 border-b pb-2 mb-3">
                                  Nguyên liệu cần thiết
                                </h3>
                                {loadingIngredients ? (
                                  <div className="text-center text-gray-500 py-4">
                                    Đang tải thông tin nguyên liệu...
                                  </div>
                                ) : ingredientsInfo ? (
                                  <div className="space-y-3">
                                    {ingredientsInfo.hasInsufficient && (
                                      <div className="bg-red-50 border-2 border-red-500 rounded-lg p-3 mb-3">
                                        <p className="text-red-700 font-semibold text-sm">
                                          ⚠️ Cảnh báo: Thiếu nguyên liệu!
                                        </p>
                                        <p className="text-red-600 text-xs mt-1">
                                          Một số nguyên liệu không đủ để thực hiện đơn này. Vui lòng nhập thêm trước khi xác nhận.
                                        </p>
                                      </div>
                                    )}
                                    <div className="max-h-96 overflow-y-auto border rounded-lg">
                                      <table className="w-full text-sm border-collapse">
                                        <thead className="bg-gray-50 sticky top-0">
                                          <tr>
                                            <th className="text-left p-2 border-b">Nguyên liệu</th>
                                            <th className="text-right p-2 border-b">Cần</th>
                                            <th className="text-right p-2 border-b">Có</th>
                                            <th className="text-right p-2 border-b">Thiếu</th>
                                            <th className="text-center p-2 border-b">Trạng thái</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {ingredientsInfo.ingredients.map((ing, idx) => (
                                            <tr 
                                              key={ing.ingredientId || idx} 
                                              className={`border-b hover:bg-gray-50 ${
                                                !ing.isSufficient ? 'bg-red-50' : ''
                                              }`}
                                            >
                                              <td className="p-2 font-medium">
                                                {ing.ingredientName}
                                                {ing.unit && <span className="text-gray-500 text-xs ml-1">({ing.unit})</span>}
                                              </td>
                                              <td className="p-2 text-right">
                                                {ing.requiredQuantity.toLocaleString('vi-VN')}
                                              </td>
                                              <td className="p-2 text-right">
                                                {ing.availableQuantity.toLocaleString('vi-VN')}
                                              </td>
                                              <td className="p-2 text-right">
                                                {ing.shortage > 0 ? (
                                                  <span className="text-red-600 font-semibold">
                                                    {ing.shortage.toLocaleString('vi-VN')}
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-400">-</span>
                                                )}
                                              </td>
                                              <td className="p-2 text-center">
                                                {ing.isSufficient ? (
                                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                                                    ✅ Đủ
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                                                    ❌ Thiếu
                                                  </span>
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    {ingredientsInfo.ingredients.length === 0 && (
                                      <div className="text-sm text-gray-500 text-center py-4">
                                        Không có nguyên liệu nào cần thiết cho đơn này.
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500 text-center py-4">
                                    Không thể tải thông tin nguyên liệu.
                                  </div>
                                )}
                              </div>
                              
                              <h3 className="font-semibold text-lg text-gray-800 border-b pb-2">
                                Chi tiết khách hàng
                              </h3>

                              {loadingCustomerInfo ? (
                                <div className="text-center text-gray-500 py-8">
                                  Đang tải thông tin khách hàng...
                                </div>
                              ) : customerInfo ? (
                                <>
                                  {/* Thống kê */}
                                  {customerInfo.classification?.metrics && (
                                    <div className="border-b pb-3">
                                      <h4 className="font-semibold text-gray-800 mb-2">
                                        Thống kê
                                      </h4>
                                      <div className="grid grid-cols-1 gap-2 text-sm">
                                        <div>
                                          <span className="text-gray-500">Tổng số đơn:</span>{" "}
                                          <span className="font-medium">
                                            {customerInfo.classification.metrics.orderCount || 0}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Đơn đã thanh toán:</span>{" "}
                                          <span className="font-medium">
                                            {customerInfo.classification.metrics.paidCount || 0}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Tổng chi tiêu:</span>{" "}
                                          <span className="font-medium">
                                            {formatCurrency(
                                              customerInfo.classification.metrics.totalSpent || 0
                                            )}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Điểm tích lũy:</span>{" "}
                                          <span className="font-medium">
                                            {customerInfo.user?.point || 0} điểm
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Tần suất:</span>{" "}
                                          <span className="font-medium">
                                            {customerInfo.classification.metrics.visitFrequency ||
                                              "0 lần/tháng"}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Đánh giá trung bình:</span>{" "}
                                          <span className="font-medium">
                                            {customerInfo.classification.metrics.avgRating || "Chưa có"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Lịch sử đơn hàng */}
                                  {customerInfo.orders && customerInfo.orders.length > 0 && (
                                    <div>
                                      <h4 className="font-semibold text-gray-800 mb-3">
                                        Lịch sử đơn hàng ({customerInfo.orders.length} đơn gần nhất)
                                      </h4>
                                      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg shadow-sm">
                                        <table className="w-full text-sm">
                                          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                                            <tr>
                                              <th className="text-left p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider border-b border-gray-200">
                                                Mã đơn
                                              </th>
                                              <th className="text-left p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider border-b border-gray-200">
                                                Tên lúc đặt
                                              </th>
                                              <th className="text-left p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider border-b border-gray-200">
                                                Trạng thái
                                              </th>
                                              <th className="text-left p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider border-b border-gray-200">
                                                Ngày
                                              </th>
                                              <th className="text-left p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider border-b border-gray-200">
                                                Tổng tiền
                                              </th>
                                              <th className="text-left p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider border-b border-gray-200">
                                                Lý do hủy
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="bg-white divide-y divide-gray-100">
                                            {customerInfo.orders.map((order) => {
                                              // Helper function để lấy lý do hủy
                                              const getCancellationReason = (order) => {
                                                if (order.status !== "cancelled") return null;
                                                
                                                // Kiểm tra waiter reject
                                                if (order.waiterResponse?.status === "rejected" && order.waiterResponse?.reason) {
                                                  return {
                                                    type: "Waiter",
                                                    reason: order.waiterResponse.reason
                                                  };
                                                }
                                                
                                                // Kiểm tra admin cancel trong confirmationHistory
                                                if (order.confirmationHistory && order.confirmationHistory.length > 0) {
                                                  const cancelHistory = order.confirmationHistory
                                                    .filter(h => h.action === "admin_cancelled" || h.action === "waiter_rejected")
                                                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
                                                  
                                                  if (cancelHistory) {
                                                    if (cancelHistory.action === "waiter_rejected") {
                                                      // Extract reason từ details: "Waiter từ chối: {reason}"
                                                      const reasonMatch = cancelHistory.details.match(/Waiter từ chối:\s*(.+)/);
                                                      if (reasonMatch) {
                                                        return {
                                                          type: "Waiter",
                                                          reason: reasonMatch[1]
                                                        };
                                                      }
                                                    } else if (cancelHistory.action === "admin_cancelled") {
                                                      // Extract reason từ details: "Admin {id} hủy đơn: {reason}"
                                                      const reasonMatch = cancelHistory.details.match(/Admin\s+\w+\s+hủy đơn:?\s*(.+)/);
                                                      if (reasonMatch && reasonMatch[1]) {
                                                        return {
                                                          type: "Admin",
                                                          reason: reasonMatch[1]
                                                        };
                                                      }
                                                      // Nếu không có lý do cụ thể, hiển thị "Không có lý do"
                                                      return {
                                                        type: "Admin",
                                                        reason: "Không có lý do"
                                                      };
                                                    }
                                                  }
                                                }
                                                
                                                return null;
                                              };
                                              
                                              const cancellationReason = getCancellationReason(order);
                                              
                                              return (
                                                <tr 
                                                  key={order._id} 
                                                  className="hover:bg-gray-50 transition-colors duration-150"
                                                >
                                                  <td className="p-3">
                                                    <span className="font-mono text-xs font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                                  {String(order._id).slice(-6)}
                                                    </span>
                                                </td>
                                                  <td className="p-3">
                                                    <span className="text-sm text-gray-700">
                                                      {order.preorderName || customerInfo.user?.name || customer?.name || "-"}
                                                    </span>
                                                  </td>
                                                  <td className="p-3">
                                                  <span
                                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                      order.status === "paid"
                                                          ? "bg-green-100 text-green-800 border border-green-200"
                                                        : order.status === "cancelled"
                                                          ? "bg-red-100 text-red-800 border border-red-200"
                                                        : order.status === "preorder"
                                                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                                                          : "bg-gray-100 text-gray-800 border border-gray-200"
                                                    }`}
                                                  >
                                                    {order.status === "paid"
                                                      ? "Đã thanh toán"
                                                      : order.status === "cancelled"
                                                      ? "Đã hủy"
                                                      : order.status === "preorder"
                                                      ? "Đặt trước"
                                                      : order.status || "Chờ xử lý"}
                                                  </span>
                                                </td>
                                                  <td className="p-3 text-xs text-gray-600">
                                                  {formatDate(order.createdAt)}
                                                </td>
                                                  <td className="p-3">
                                                    <span className="font-semibold text-gray-900">
                                                  {formatCurrency(order.totalAmount || 0)}
                                                    </span>
                                                  </td>
                                                  <td className="p-3">
                                                    {cancellationReason ? (
                                                      <div className="flex items-start gap-1.5">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                          cancellationReason.type === "Waiter" 
                                                            ? "bg-orange-100 text-orange-700 border border-orange-200" 
                                                            : "bg-red-100 text-red-700 border border-red-200"
                                                        }`}>
                                                          {cancellationReason.type === "Waiter" ? "W" : "A"}
                                                        </span>
                                                        <span className="text-xs text-gray-700 flex-1 leading-relaxed">
                                                          {cancellationReason.reason}
                                                        </span>
                                                      </div>
                                                    ) : (
                                                      <span className="text-gray-300 text-xs italic">-</span>
                                                    )}
                                                </td>
                                              </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {(!customerInfo.orders || customerInfo.orders.length === 0) && (
                                    <div className="text-sm text-gray-500">
                                      Chưa có lịch sử đơn hàng.
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-sm text-gray-500">
                                  Không thể tải thông tin khách hàng.
                                </div>
                              )}
                            </div>
                          </div>

                          <DialogFooter className="flex gap-2 flex-wrap">
                            {/* Hiển thị button Approve chỉ khi đơn ở trạng thái pending */}
                            {waiterResponseStatus === "pending" && (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedOrderForAction(order);
                                  setApproveForm({ tableIds: [], adminNotes: "", preparationStartTime: "", reservedEndTime: "" });
                                  setApproveModalOpen(true);
                                }}
                                className="bg-green-50 text-green-700 hover:bg-green-100"
                              >
                                Approve
                              </Button>
                            )}
                            
                            {/* Hiển thị button Sửa món và Hủy đơn cho cả đơn pending và đã approved */}
                            {(waiterResponseStatus === "pending" || waiterResponseStatus === "approved") && (
                              <>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedOrderForAction(order);
                                    setEditForm({ itemsToAdd: [], itemsToRemove: [], itemsToUpdate: [] });
                                    setEditModalOpen(true);
                                  }}
                                  className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                                >
                                  Sửa món
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedOrderForAction(order);
                                    setCancelForm({ adminNotes: "" });
                                    setCancelModalOpen(true);
                                  }}
                                  className="bg-red-50 text-red-700 hover:bg-red-100"
                                >
                                  Hủy đơn
                                </Button>
                              </>
                            )}
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedOrderForAction(order);
                                // Format datetime-local: convert to local timezone
                                let scheduledTimeFormatted = "";
                                if (order.scheduledTime) {
                                  const d = new Date(order.scheduledTime);
                                  const year = d.getFullYear();
                                  const month = String(d.getMonth() + 1).padStart(2, "0");
                                  const day = String(d.getDate()).padStart(2, "0");
                                  const hours = String(d.getHours()).padStart(2, "0");
                                  const minutes = String(d.getMinutes()).padStart(2, "0");
                                  scheduledTimeFormatted = `${year}-${month}-${day}T${hours}:${minutes}`;
                                }
                                // Lấy bàn hiện tại của order
                                const currentTableIds = order?.tableIds && Array.isArray(order.tableIds) && order.tableIds.length > 0
                                  ? order.tableIds.map(t => t._id?.toString() || t.toString())
                                  : (order?.tableId ? [order.tableId._id?.toString() || order.tableId.toString()] : []);
                                
                                setUpdateForm({ 
                                  tableIds: currentTableIds,
                                  scheduledTime: scheduledTimeFormatted,
                                  adminNotes: ""
                                });
                                setUpdateModalOpen(true);
                              }}
                              className="bg-purple-50 text-purple-700 hover:bg-purple-100"
                            >
                              Sửa thời gian
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setOpenRow(null);
                                setCustomerInfo(null);
                              }}
                            >
                              Đóng
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="preorder-empty">
                    <div className="preorder-empty-text">
                      {preorders.length === 0
                        ? "Chưa có đơn đặt trước nào."
                        : "Không tìm thấy đơn đặt trước phù hợp."}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {filtered.length > 0 && (
          <div className="p-3 text-sm text-gray-600 border-t">
            Tổng số: {filtered.length} đơn đặt trước
          </div>
        )}
          </>
        )}

      {/* Approve Modal */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve đơn đặt trước</DialogTitle>
            <DialogDescription>
              Mã đơn: {selectedOrderForAction?._id ? String(selectedOrderForAction._id).slice(-8) : "-"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chọn bàn (có thể chọn nhiều bàn) *
              </label>
              
              {/* Hiển thị các bàn đã chọn dưới dạng Badge */}
              {approveForm.tableIds.length > 0 && (
                <div className="mb-3 p-2 bg-gray-50 rounded-md border border-gray-200">
                  <div className="text-xs text-gray-600 mb-2">✅ Đã chọn {approveForm.tableIds.length} bàn:</div>
                  <div className="flex flex-wrap gap-2">
                    {approveForm.tableIds.map((tableIdStr) => {
                      const table = allTables.find(t => t._id === tableIdStr);
                      if (!table) return null;
                      return (
                        <span
                          key={tableIdStr}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                        >
                          <span>Bàn {table.tableNumber}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setApproveForm({ 
                                ...approveForm, 
                                tableIds: approveForm.tableIds.filter(id => id !== tableIdStr) 
                              });
                              setOverlapWarning(null);
                            }}
                            className="ml-1 text-green-700 hover:text-green-900 font-bold text-lg leading-none"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dropdown để thêm bàn mới */}
              <select
                value=""
                onChange={(e) => {
                  const newTableId = e.target.value;
                  if (newTableId && !approveForm.tableIds.includes(newTableId)) {
                    setApproveForm({ 
                      ...approveForm, 
                      tableIds: [...approveForm.tableIds, newTableId] 
                    });
                    setOverlapWarning(null);
                  }
                  e.target.value = ""; // Reset dropdown
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">+ Thêm bàn phục vụ</option>
                {allTables
                  .filter(table => !approveForm.tableIds.includes(table._id))
                  .map((table) => (
                    <option key={table._id} value={table._id}>
                      Bàn {table.tableNumber}
                    </option>
                  ))}
              </select>
              
              {approveForm.tableIds.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Vui lòng chọn ít nhất 1 bàn trước khi xác nhận
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thời gian bắt đầu chuẩn bị *
              </label>
              <DatePicker
                selected={approveForm.preparationStartTime ? new Date(approveForm.preparationStartTime) : null}
                onChange={(date) => {
                  if (date) {
                    // Format to datetime-local format (YYYY-MM-DDTHH:mm)
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    const hours = String(date.getHours()).padStart(2, "0");
                    const minutes = String(date.getMinutes()).padStart(2, "0");
                    const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
                    setApproveForm({ ...approveForm, preparationStartTime: formatted });
                    setOverlapWarning(null); // Clear cảnh báo khi thay đổi
                  } else {
                    setApproveForm({ ...approveForm, preparationStartTime: "" });
                    setOverlapWarning(null);
                  }
                }}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholderText="Chọn ngày và giờ"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Thời gian bắt đầu chuẩn bị món cho đơn này (định dạng 24 giờ)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thời gian kết thúc dành bàn *
              </label>
              <DatePicker
                selected={approveForm.reservedEndTime ? new Date(approveForm.reservedEndTime) : null}
                onChange={(date) => {
                  if (date) {
                    // Format to datetime-local format (YYYY-MM-DDTHH:mm)
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    const hours = String(date.getHours()).padStart(2, "0");
                    const minutes = String(date.getMinutes()).padStart(2, "0");
                    const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
                    setApproveForm({ ...approveForm, reservedEndTime: formatted });
                    setOverlapWarning(null); // Clear cảnh báo khi thay đổi
                  } else {
                    setApproveForm({ ...approveForm, reservedEndTime: "" });
                    setOverlapWarning(null);
                  }
                }}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholderText="Chọn ngày và giờ"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Thời gian kết thúc dành bàn (để tránh order khác trùng vào khoảng thời gian này) (định dạng 24 giờ)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú (tùy chọn)
              </label>
              <Input
                type="text"
                placeholder="Nhập ghi chú..."
                value={approveForm.adminNotes}
                onChange={(e) => setApproveForm({ ...approveForm, adminNotes: e.target.value })}
              />
            </div>
            
            {/* Cảnh báo overlap */}
            {overlapWarning && overlapWarning.overlappingOrders.length > 0 && !overlapWarning.showConfirm && (
              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
                <h4 className="font-semibold text-red-700 mb-2">⚠️ Cảnh báo: Bị trùng lấn thời gian</h4>
                <p className="text-sm text-red-600 mb-3">
                  Khoảng thời gian bạn chọn bị trùng với {overlapWarning.overlappingOrders.length} đơn khác ở các bàn đã chọn:
                </p>
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {overlapWarning.overlappingOrders.map((order, idx) => {
                    // Lấy danh sách bàn trùng
                    const otherTableIds = [];
                    if (order.tableIds && order.tableIds.length > 0) {
                      otherTableIds.push(...order.tableIds.map(t => t._id?.toString() || t.toString()));
                    } else if (order.tableId) {
                      otherTableIds.push(order.tableId._id?.toString() || order.tableId.toString());
                    }
                    const commonTables = approveForm.tableIds.filter(tid => otherTableIds.includes(tid));
                    const commonTableNumbers = commonTables.map(tid => {
                      const table = allTables.find(t => t._id === tid);
                      return table ? `Bàn ${table.tableNumber}` : tid;
                    }).join(", ");
                    
                    return (
                      <div key={idx} className="text-sm bg-white p-2 rounded border border-red-200">
                        <div className="font-medium">Mã đơn: {String(order._id).slice(-8)}</div>
                        <div className="text-gray-600">
                          Khách: {order.userId?.name || 'Khách vãng lai'}
                        </div>
                        <div className="text-red-600 font-medium">
                          Bàn trùng: {commonTableNumbers || 'N/A'}
                        </div>
                        {order.preparationStartTime && order.reservedEndTime ? (
                          <div className="text-gray-600">
                            Thời gian: {new Date(order.preparationStartTime).toLocaleString('vi-VN')} - {new Date(order.reservedEndTime).toLocaleString('vi-VN')}
                          </div>
                        ) : order.scheduledTime ? (
                          <div className="text-gray-600">
                            Thời gian đặt: {new Date(order.scheduledTime).toLocaleString('vi-VN')}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOverlapWarning(null);
                    }}
                    className="flex-1"
                  >
                    Quay lại để sửa
                  </Button>
                  <Button
                    onClick={async () => {
                      // Gọi approve với forceApprove = true
                      await handleApprovePreOrder(true);
                    }}
                    className="flex-1 bg-yellow-600 text-white hover:bg-yellow-700"
                  >
                    Tiếp tục (vẫn approve)
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApproveModalOpen(false);
                setSelectedOrderForAction(null);
                setOverlapWarning(null);
                setApproveForm({ 
                  tableIds: [], 
                  adminNotes: "",
                  preparationStartTime: "",
                  reservedEndTime: ""
                });
              }}
            >
              Hủy
            </Button>
            <Button
              data-approve-button
              onClick={async () => {
                if (approveForm.tableIds.length === 0) {
                  toast.error("Vui lòng chọn ít nhất 1 bàn");
                  return;
                }
                if (!approveForm.preparationStartTime) {
                  toast.error("Vui lòng nhập thời gian bắt đầu chuẩn bị");
                  return;
                }
                if (!approveForm.reservedEndTime) {
                  toast.error("Vui lòng nhập thời gian kết thúc dành bàn");
                  return;
                }
                
                // Kiểm tra overlap trước khi approve - check tất cả các bàn đã chọn
                const prepStart = new Date(approveForm.preparationStartTime);
                const reservedEnd = new Date(approveForm.reservedEndTime);
                const overlappingOrders = preorders.filter(order => {
                  // Bỏ qua đơn hiện tại
                  if (order._id.toString() === selectedOrderForAction._id.toString()) {
                    return false;
                  }
                  
                  // Lấy danh sách bàn của đơn khác
                  const otherTableIds = [];
                  if (order.tableIds && order.tableIds.length > 0) {
                    otherTableIds.push(...order.tableIds.map(t => t._id?.toString() || t.toString()));
                  } else if (order.tableId) {
                    otherTableIds.push(order.tableId._id?.toString() || order.tableId.toString());
                  }
                  
                  // Kiểm tra xem có bàn nào trùng không
                  const hasCommonTable = approveForm.tableIds.some(tid => otherTableIds.includes(tid));
                  if (!hasCommonTable) {
                    return false; // Không có bàn trùng
                  }
                  
                  // Kiểm tra overlap với đơn đã có reservedEndTime
                  if (order.reservedEndTime) {
                    const orderStart = order.preparationStartTime 
                      ? new Date(order.preparationStartTime) 
                      : new Date(order.scheduledTime);
                    const orderEnd = new Date(order.reservedEndTime);
                    
                    // Overlap: prepStart < orderEnd && orderStart < reservedEnd
                    if (prepStart < orderEnd && orderStart < reservedEnd) {
                      return true;
                    }
                  } else if (order.scheduledTime) {
                    // Nếu đơn chưa có reservedEndTime, kiểm tra scheduledTime trong vòng 2 giờ
                    const orderTime = new Date(order.scheduledTime);
                    const timeDiff = Math.abs(prepStart.getTime() - orderTime.getTime());
                    const twoHours = 2 * 60 * 60 * 1000;
                    if (timeDiff < twoHours) {
                      return true;
                    }
                  }
                  
                  return false;
                });
                
                // Nếu có overlap và chưa confirm, hiển thị cảnh báo
                if (overlappingOrders.length > 0 && !overlapWarning?.showConfirm) {
                  setOverlapWarning({
                    overlappingOrders,
                    showConfirm: false
                  });
                  return;
                }
                
                // Nếu đã confirm hoặc không có overlap, tiếp tục approve
                await handleApprovePreOrder();
              }}
              disabled={actionLoading || approveForm.tableIds.length === 0 || !approveForm.preparationStartTime || !approveForm.reservedEndTime}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {actionLoading ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy đơn đặt trước</DialogTitle>
            <DialogDescription>
              Mã đơn: {selectedOrderForAction?._id ? String(selectedOrderForAction._id).slice(-8) : "-"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú hủy đơn
              </label>
              <textarea
                value={cancelForm.adminNotes}
                onChange={(e) => setCancelForm({ ...cancelForm, adminNotes: e.target.value })}
                placeholder="Nhập ghi chú về lý do hủy đơn..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelModalOpen(false);
                setSelectedOrderForAction(null);
                setCancelForm({ adminNotes: "" });
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={async () => {
                try {
                  setActionLoading(true);
                  await adminApi.cancelPreOrder(
                    selectedOrderForAction._id,
                    cancelForm.adminNotes
                  );
                  toast.success("Đã hủy đơn thành công");
                  setCancelModalOpen(false);
                  setSelectedOrderForAction(null);
                  setCancelForm({ adminNotes: "" });
                  
                  // Refresh list (silently, không hiển thị toast nếu lỗi)
                  try {
                    const response = await adminApi.getPreOrders({
                      waiterResponseStatus,
                      fromDate,
                      toDate,
                      minAmount,
                      maxAmount,
                      sortBy,
                      sortOrder
                    });
                    setPreorders(Array.isArray(response?.data) ? response.data : []);
                  } catch (refreshErr) {
                    // Chỉ log lỗi, không hiển thị toast vì đã có toast thành công rồi
                    console.error("Lỗi khi refresh danh sách sau khi hủy đơn:", refreshErr);
                    // Có thể tự động refresh lại sau khi WebSocket update
                  }
                } catch (err) {
                  console.error("Lỗi khi hủy đơn:", err);
                  const errorMessage = err?.message || err?.data?.message || err?.response?.data?.message || "Lỗi khi hủy đơn";
                  toast.error(errorMessage);
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={actionLoading}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {actionLoading ? "Đang xử lý..." : "Xác nhận hủy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit Modal */}
      <Dialog open={depositModalOpen} onOpenChange={setDepositModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nhập tiền cọc</DialogTitle>
            <DialogDescription>
              Mã đơn: {selectedOrderForAction?._id ? String(selectedOrderForAction._id).slice(-8) : "-"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số tiền cọc (₫) *
              </label>
              <Input
                type="number"
                placeholder="Nhập số tiền..."
                value={depositForm.amount}
                onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                min="0"
                required
              />
              {selectedOrderForAction && (
                <p className="text-xs text-gray-500 mt-1">
                  Tổng tiền: {formatCurrency(selectedOrderForAction.totalAmount || 0)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phương thức thanh toán *
              </label>
              <select
                value={depositForm.paymentMethod}
                onChange={(e) => setDepositForm({ ...depositForm, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                required
              >
                <option value="cash">Tiền mặt</option>
                <option value="card">Thẻ</option>
                <option value="momo">MoMo</option>
                <option value="zaloPay">ZaloPay</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú (tùy chọn)
              </label>
              <Input
                type="text"
                placeholder="Nhập ghi chú..."
                value={depositForm.adminNotes}
                onChange={(e) => setDepositForm({ ...depositForm, adminNotes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDepositModalOpen(false);
                setSelectedOrderForAction(null);
                setDepositForm({ amount: "", paymentMethod: "cash", adminNotes: "" });
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={async () => {
                if (!depositForm.amount || parseFloat(depositForm.amount) <= 0) {
                  toast.error("Vui lòng nhập số tiền cọc hợp lệ");
                  return;
                }
                try {
                  setActionLoading(true);
                  await adminApi.recordDeposit(
                    selectedOrderForAction._id,
                    parseFloat(depositForm.amount),
                    depositForm.paymentMethod,
                    depositForm.adminNotes
                  );
                  toast.success("Đã ghi nhận tiền cọc thành công");
                  setDepositModalOpen(false);
                  setSelectedOrderForAction(null);
                  setDepositForm({ amount: "", paymentMethod: "cash", adminNotes: "" });
                  
                  // Refresh list (silently, không hiển thị toast nếu lỗi)
                  try {
                    const response = await adminApi.getPreOrders({
                      waiterResponseStatus,
                      fromDate,
                      toDate,
                      minAmount,
                      maxAmount,
                      sortBy,
                      sortOrder
                    });
                    setPreorders(Array.isArray(response?.data) ? response.data : []);
                  } catch (refreshErr) {
                    console.error("Lỗi khi refresh danh sách sau khi ghi nhận tiền cọc:", refreshErr);
                  }
                } catch (err) {
                  console.error("Lỗi khi ghi nhận tiền cọc:", err);
                  const errorMessage = err?.message || err?.data?.message || err?.response?.data?.message || "Lỗi khi ghi nhận tiền cọc";
                  toast.error(errorMessage);
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={actionLoading || !depositForm.amount || parseFloat(depositForm.amount) <= 0}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {actionLoading ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Items Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa món trong đơn</DialogTitle>
            <DialogDescription>
              Mã đơn: {selectedOrderForAction?._id ? String(selectedOrderForAction._id).slice(-8) : "-"}
            </DialogDescription>
          </DialogHeader>
          {selectedOrderForAction && (
            <div className="space-y-4">
              {/* Danh sách món hiện tại */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Món hiện tại</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">Món</th>
                        <th className="p-2 text-left">Loại</th>
                        <th className="p-2 text-left">SL</th>
                        <th className="p-2 text-left">Đơn giá</th>
                        <th className="p-2 text-left">Thành tiền</th>
                        <th className="p-2 text-left">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrderForAction.orderItems?.map((item, idx) => {
                        const itemTotal = (item?.price || 0) * (item?.quantity || 0);
                        const isRemoved = editForm.itemsToRemove.includes(item._id);
                        const updateItem = editForm.itemsToUpdate.find(u => u.orderItemId === item._id);
                        const currentQuantity = updateItem ? updateItem.newQuantity : item.quantity;
                        
                        return (
                          <tr key={item._id || idx} className={isRemoved ? "bg-red-50 opacity-50" : ""}>
                            <td className="p-2">{item.itemName || "Không rõ"}</td>
                            <td className="p-2">{item.itemType === "menu" ? "Combo" : "Món đơn"}</td>
                            <td className="p-2">
                              {isRemoved ? (
                                <span className="text-red-600">Đã xóa</span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={currentQuantity}
                                    onChange={(e) => {
                                      const newQty = parseInt(e.target.value) || 1;
                                      if (newQty !== item.quantity) {
                                        setEditForm(prev => {
                                          const existing = prev.itemsToUpdate.find(u => u.orderItemId === item._id);
                                          const updated = existing 
                                            ? prev.itemsToUpdate.map(u => u.orderItemId === item._id ? { ...u, newQuantity: newQty } : u)
                                            : [...prev.itemsToUpdate, { orderItemId: item._id, newQuantity: newQty }];
                                          return { ...prev, itemsToUpdate: updated };
                                        });
                                      } else {
                                        setEditForm(prev => ({
                                          ...prev,
                                          itemsToUpdate: prev.itemsToUpdate.filter(u => u.orderItemId !== item._id)
                                        }));
                                      }
                                    }}
                                    className="w-16 px-2 py-1 border rounded text-center"
                                  />
                                </div>
                              )}
                            </td>
                            <td className="p-2">{formatCurrency(item?.price || 0)}</td>
                            <td className="p-2 font-medium">
                              {formatCurrency(currentQuantity * (item?.price || 0))}
                            </td>
                            <td className="p-2">
                              {!isRemoved && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditForm(prev => ({
                                      ...prev,
                                      itemsToRemove: [...prev.itemsToRemove, item._id],
                                      itemsToUpdate: prev.itemsToUpdate.filter(u => u.orderItemId !== item._id)
                                    }));
                                  }}
                                  className="bg-red-50 text-red-700 hover:bg-red-100 text-xs"
                                >
                                  Xóa
                                </Button>
                              )}
                              {isRemoved && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditForm(prev => ({
                                      ...prev,
                                      itemsToRemove: prev.itemsToRemove.filter(id => id !== item._id)
                                    }));
                                  }}
                                  className="bg-green-50 text-green-700 hover:bg-green-100 text-xs"
                                >
                                  Khôi phục
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Lưu ý: Chỉ có thể chỉnh sửa món có trạng thái "pending"
                </p>
              </div>

              {/* Thêm món mới */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-800 mb-3">Thêm món mới</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Loại</label>
                    <select
                      value={newItemForm.type}
                      onChange={(e) => {
                        setNewItemForm({ ...newItemForm, type: e.target.value, itemId: "" });
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    >
                      <option value="item">Món đơn</option>
                      <option value="menu">Combo</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Chọn món</label>
                    <select
                      value={newItemForm.itemId}
                      onChange={(e) => setNewItemForm({ ...newItemForm, itemId: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    >
                      <option value="">-- Chọn món --</option>
                      {newItemForm.type === "item"
                        ? availableItems.map((item) => (
                            <option key={item._id} value={item._id}>
                              {item.name} - {formatCurrency(item.price)}
                            </option>
                          ))
                        : availableMenus.map((menu) => (
                            <option key={menu._id} value={menu._id}>
                              {menu.name} - {formatCurrency(menu.price)}
                            </option>
                          ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Số lượng</label>
                    <input
                      type="number"
                      min="1"
                      value={newItemForm.quantity}
                      onChange={(e) => setNewItemForm({ ...newItemForm, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!newItemForm.itemId) {
                      toast.error("Vui lòng chọn món");
                      return;
                    }
                    const selectedItem = newItemForm.type === "item"
                      ? availableItems.find(i => i._id === newItemForm.itemId)
                      : availableMenus.find(m => m._id === newItemForm.itemId);
                    
                    if (selectedItem) {
                      setEditForm(prev => ({
                        ...prev,
                        itemsToAdd: [...prev.itemsToAdd, {
                          itemId: newItemForm.itemId,
                          type: newItemForm.type,
                          quantity: newItemForm.quantity
                        }]
                      }));
                      setNewItemForm({ type: "item", itemId: "", quantity: 1 });
                      toast.success(`Đã thêm ${selectedItem.name} vào danh sách`);
                    }
                  }}
                  className="mt-2 bg-green-50 text-green-700 hover:bg-green-100"
                >
                  + Thêm vào đơn
                </Button>
                
                {/* Danh sách món đã thêm (chưa lưu) */}
                {editForm.itemsToAdd.length > 0 && (
                  <div className="mt-3 border rounded p-2 bg-blue-50">
                    <p className="text-xs font-medium text-gray-700 mb-1">Món sẽ được thêm:</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {editForm.itemsToAdd.map((item, idx) => {
                        const itemData = item.type === "item"
                          ? availableItems.find(i => i._id === item.itemId)
                          : availableMenus.find(m => m._id === item.itemId);
                        return (
                          <li key={idx} className="flex justify-between items-center">
                            <span>
                              {itemData?.name || "Không rõ"} x{item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditForm(prev => ({
                                  ...prev,
                                  itemsToAdd: prev.itemsToAdd.filter((_, i) => i !== idx)
                                }));
                              }}
                              className="text-xs h-6 px-2 bg-red-50 text-red-700 hover:bg-red-100"
                            >
                              Xóa
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {/* Tổng tiền mới */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Tổng tiền hiện tại:</span>
                  <span className="font-semibold">{formatCurrency(selectedOrderForAction.totalAmount || 0)}</span>
                </div>
                {(editForm.itemsToRemove.length > 0 || editForm.itemsToUpdate.length > 0 || editForm.itemsToAdd.length > 0) && (
                  <div className="text-sm text-gray-600 mt-2">
                    ⚠️ Tổng tiền sẽ được tính lại sau khi lưu
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditModalOpen(false);
                setSelectedOrderForAction(null);
                setEditForm({ itemsToAdd: [], itemsToRemove: [], itemsToUpdate: [] });
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={async () => {
                try {
                  setActionLoading(true);
                  await adminApi.modifyPreOrderItems(
                    selectedOrderForAction._id,
                    editForm.itemsToAdd,
                    editForm.itemsToRemove,
                    editForm.itemsToUpdate
                  );
                  toast.success("Đã chỉnh sửa món thành công");
                  setEditModalOpen(false);
                  setSelectedOrderForAction(null);
                  setEditForm({ itemsToAdd: [], itemsToRemove: [], itemsToUpdate: [] });
                  
                  // Refresh list (silently, không hiển thị toast nếu lỗi)
                  try {
                    const response = await adminApi.getPreOrders({
                      waiterResponseStatus,
                      fromDate,
                      toDate,
                      minAmount,
                      maxAmount,
                      sortBy,
                      sortOrder
                    });
                    setPreorders(Array.isArray(response?.data) ? response.data : []);
                  } catch (refreshErr) {
                    console.error("Lỗi khi refresh danh sách sau khi chỉnh sửa món:", refreshErr);
                  }
                } catch (err) {
                  console.error("Lỗi khi chỉnh sửa món:", err);
                  const errorMessage = err?.message || err?.data?.message || err?.response?.data?.message || "Lỗi khi chỉnh sửa món";
                  toast.error(errorMessage);
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={actionLoading || (editForm.itemsToRemove.length === 0 && editForm.itemsToUpdate.length === 0 && editForm.itemsToAdd.length === 0)}
              className="bg-yellow-600 text-white hover:bg-yellow-700"
            >
              {actionLoading ? "Đang xử lý..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update PreOrder Modal (Sửa thời gian đặt trước và bàn) */}
      <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập nhật đơn đặt trước</DialogTitle>
            <DialogDescription>
              Mã đơn: {selectedOrderForAction?._id ? String(selectedOrderForAction._id).slice(-8) : "-"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chọn bàn (tùy chọn)
              </label>
              
              {/* Hiển thị các bàn đã chọn dưới dạng Badge */}
              {updateForm.tableIds.length > 0 && (
                <div className="mb-3 p-2 bg-gray-50 rounded-md border border-gray-200">
                  <div className="text-xs text-gray-600 mb-2">✅ Đã chọn {updateForm.tableIds.length} bàn:</div>
                  <div className="flex flex-wrap gap-2">
                    {updateForm.tableIds.map((tableIdStr) => {
                      const table = allTables.find(t => t._id === tableIdStr);
                      if (!table) return null;
                      return (
                        <span
                          key={tableIdStr}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          <span>Bàn {table.tableNumber}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setUpdateForm({ 
                                ...updateForm, 
                                tableIds: updateForm.tableIds.filter(id => id !== tableIdStr) 
                              });
                              setUpdateOverlapWarning(null); // Clear cảnh báo khi thay đổi
                            }}
                            className="ml-1 text-blue-700 hover:text-blue-900 font-bold text-lg leading-none"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                onChange={(e) => {
                  const newTableId = e.target.value;
                  if (newTableId && !updateForm.tableIds.includes(newTableId)) {
                    setUpdateForm({ 
                      ...updateForm, 
                      tableIds: [...updateForm.tableIds, newTableId] 
                    });
                    setUpdateOverlapWarning(null); // Clear cảnh báo khi thay đổi
                  }
                  e.target.value = ""; // Reset dropdown
                }}
              >
                <option value="">+ Thêm bàn</option>
                {allTables
                  .filter(table => !updateForm.tableIds.includes(table._id))
                  .map((table) => (
                    <option key={table._id} value={table._id}>
                      Bàn {table.tableNumber}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Có thể chọn nhiều bàn cho đơn này
              </p>
            </div>
            
            {/* Hiển thị cảnh báo overlap cho update */}
            {updateOverlapWarning && updateOverlapWarning.overlappingOrders.length > 0 && !updateOverlapWarning.showConfirm && (
              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
                <h4 className="font-semibold text-red-700 mb-2">⚠️ Cảnh báo: Bị trùng lấn thời gian</h4>
                <p className="text-sm text-red-600 mb-3">
                  Khoảng thời gian bạn chọn bị trùng với {updateOverlapWarning.overlappingOrders.length} đơn khác ở các bàn đã chọn:
                </p>
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {updateOverlapWarning.overlappingOrders.map((order, idx) => {
                    // Lấy danh sách bàn trùng
                    const otherTableIds = [];
                    if (order.tableIds && order.tableIds.length > 0) {
                      otherTableIds.push(...order.tableIds.map(t => t._id?.toString() || t.toString()));
                    } else if (order.tableId) {
                      otherTableIds.push(order.tableId._id?.toString() || order.tableId.toString());
                    }
                    const commonTables = updateForm.tableIds.filter(tid => otherTableIds.includes(tid));
                    const commonTableNumbers = commonTables.map(tid => {
                      const table = allTables.find(t => t._id === tid);
                      return table ? `Bàn ${table.tableNumber}` : tid;
                    }).join(", ");
                    
                    return (
                      <div key={idx} className="text-sm bg-white p-2 rounded border border-red-200">
                        <div className="font-medium">Mã đơn: {String(order._id).slice(-8)}</div>
                        <div className="text-gray-600">
                          Khách: {order.userId?.name || 'Khách vãng lai'}
                        </div>
                        <div className="text-red-600 font-medium">
                          Bàn trùng: {commonTableNumbers || 'N/A'}
                        </div>
                        {order.preparationStartTime && order.reservedEndTime ? (
                          <div className="text-gray-600">
                            Thời gian: {new Date(order.preparationStartTime).toLocaleString('vi-VN')} - {new Date(order.reservedEndTime).toLocaleString('vi-VN')}
                          </div>
                        ) : order.scheduledTime ? (
                          <div className="text-gray-600">
                            Thời gian đặt: {new Date(order.scheduledTime).toLocaleString('vi-VN')}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUpdateOverlapWarning(null);
                    }}
                    className="flex-1"
                  >
                    Quay lại để sửa
                  </Button>
                  <Button
                    onClick={() => {
                      // Gọi update với forceUpdate = true
                      handleUpdatePreOrder(true);
                    }}
                    className="flex-1 bg-yellow-600 text-white hover:bg-yellow-700"
                  >
                    Vẫn tiếp tục
                  </Button>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thời gian đến ăn *
              </label>
              <DatePicker
                selected={updateForm.scheduledTime ? new Date(updateForm.scheduledTime) : null}
                onChange={(date) => {
                  if (date) {
                    // Format to datetime-local format (YYYY-MM-DDTHH:mm)
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    const hours = String(date.getHours()).padStart(2, "0");
                    const minutes = String(date.getMinutes()).padStart(2, "0");
                    const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
                    setUpdateForm({ ...updateForm, scheduledTime: formatted });
                    setUpdateOverlapWarning(null); // Clear cảnh báo khi thay đổi
                  } else {
                    setUpdateForm({ ...updateForm, scheduledTime: "" });
                    setUpdateOverlapWarning(null);
                  }
                }}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholderText="Chọn ngày và giờ"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Thời gian khách hàng muốn đến ăn (định dạng 24 giờ)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú (tùy chọn)
              </label>
              <Input
                type="text"
                placeholder="Nhập ghi chú..."
                value={updateForm.adminNotes}
                onChange={(e) => setUpdateForm({ ...updateForm, adminNotes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUpdateModalOpen(false);
                setSelectedOrderForAction(null);
                setUpdateForm({ tableIds: [], scheduledTime: "", adminNotes: "" });
                setUpdateOverlapWarning(null);
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={() => handleUpdatePreOrder(updateOverlapWarning?.showConfirm || false)}
              disabled={actionLoading}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              {actionLoading ? "Đang xử lý..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </Card>
    </div>
  );
}

