import React, { useEffect, useState, useRef } from "react";
import Header from "../components/waiter/Header";
import OrderCard from "../components/waiter/OrderCard";
import waiterApi from "../api/waiterApi";
import useWaiterWebSocket from "../hooks/useWaiterWebSocket";
import { Container, Spinner, Row, Col } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./WaiterDashboard.css";

export default function WaiterDashboard() {
    const { token, logout, user } = useAuth();
    // State lưu danh sách order mà waiter đang xử lý
    const [orders, setOrders] = useState([]);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' hoặc 'active'

    // Hiển thị loading khi đang fetch dữ liệu
    const [loading, setLoading] = useState(true);
    const [pendingLoading, setPendingLoading] = useState(true);

    // trả về các hàm từ hook WebSocket và chạy hook này ở đây
    // hook này thay đổi state mỗi khi có tin nhắn từ server và sẽ làm component cha WaiterDashboard re-render
    // Truyền userId để server biết waiter nào đang kết nối và chỉ gửi thông báo cho waiter đó
    const { connectionState, lastMessage, subscribeToOrders, subscribeToOrder, unsubscribeFromAllOrders } = useWaiterWebSocket(user?.id);

    // Track các đơn đã hiển thị toast để tránh hiển thị trùng lặp
    const shownNotificationsRef = useRef(new Map()); // Map<orderId, timestamp>

    const [availableTables, setAvailableTables] = useState([]);

    const fetchAvailableTables = async () => {
        try {
            const res = await waiterApi.getAvailableTables();
            setAvailableTables(res || []); // vì interceptor của axios đã trả về res.data rồi
        } catch (error) {
            console.error("Error fetching available tables:", error);
            toast.error("Không thể tải danh sách bàn trống!");
        }
    };
    /**
     * 🔹 Lấy danh sách order đang phục vụ
     * Gọi API GET /api/waiter/orders/active
     */
    const fetchOrders = async () => {
        try {
            const res = await waiterApi.getActiveOrders();
            // API trả về { success: true, data: orders } hoặc { success: true, orders: orders }
            const ordersData = res.data || res.orders || [];
            console.log('📦 Active orders loaded:', ordersData.length, ordersData);
            setOrders(ordersData);

            // Subscribe to all active orders for real-time updates
            if (ordersData.length > 0) {
                const orderIds = ordersData.map(order => order._id);
                subscribeToOrders(orderIds);
            }
        } catch (err) {
            console.error("Error loading orders:", err.message);
            toast.error("Không thể tải danh sách đơn hàng!");
        } finally {
            setLoading(false);
        }
    };

    /**
     * 🔹 Lấy danh sách order cần xác nhận
     * Gọi API GET /api/waiter/orders/pending
     */
    const fetchPendingOrders = async () => {
        try {
            const res = await waiterApi.getPendingOrders();
            const pendingData = res.data || [];
            setPendingOrders(pendingData);

            // Subscribe to all pending orders for real-time updates
            if (pendingData.length > 0) {
                const orderIds = pendingData.map(order => order._id);
                subscribeToOrders(orderIds);
            }
        } catch (err) {
            console.error("Error loading pending orders:", err.message);
            toast.error("Không thể tải danh sách đơn hàng chờ xác nhận!");
        } finally {
            setPendingLoading(false);
        }
    };

    /**
     * 🔹 Cập nhật trạng thái đơn hàng (confirmed → served)
     * PUT /api/waiter/orders/:orderId/status
     */
    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await waiterApi.updateOrderStatus(orderId, newStatus);
            setOrders((prev) =>
                prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
            );
            toast.success(`Cập nhật đơn #${orderId.slice(-4)} thành ${newStatus}`);
        } catch (err) {
            toast.error("❌ Lỗi khi cập nhật trạng thái đơn!");
        }
    };

    /**
     * 🔹 Xử lý khi waiter phản hồi đơn hàng (approve/reject)
     */
    const handleWaiterResponse = async (orderId, response) => {
        try {
            // Remove from pending orders
            setPendingOrders((prev) => prev.filter((o) => o._id !== orderId));

            if (response === 'approved') {
                toast.success(`Đã xác nhận đơn hàng #${orderId.slice(-4)}`);
                // 🔄 Refresh cả 3 danh sách
                fetchOrders();
                fetchPendingOrders();
                fetchAvailableTables(); // 🆕 Cập nhật lại danh sách bàn trống ngay
            } else if (response === 'rejected') {
                toast.warning(`❌ Đã từ chối đơn hàng #${orderId.slice(-4)}`);
            }

            // Refresh both lists
            fetchOrders();
            fetchPendingOrders();
        } catch (err) {
            toast.error("❌ Lỗi khi xử lý phản hồi đơn hàng!");
        }
    };

    // Gọi API khi component mount
    useEffect(() => {
        fetchOrders();
        fetchPendingOrders();
        fetchAvailableTables(); // 🆕 gọi một lần duy nhất khi mount
        // Cleanup: unsubscribe from all orders when component unmounts
        return () => {
            unsubscribeFromAllOrders();
        };
    }, []);


    /** Handle WebSocket messages
     * Cấu trúc logic chính trong WaiterDashboard là:

useWaiterWebSocket → kết nối tới server qua WebSocket để nhận tin nhắn realtime.

Mỗi khi server gửi tin nhắn xuống (vd: đơn bị xác nhận, cập nhật, hủy, …),
thì lastMessage trong hook sẽ thay đổi.

WaiterDashboard có một useEffect lắng nghe lastMessage → xử lý cập nhật UI.
     */
    useEffect(() => {
        if (lastMessage) {
            console.log('📨 Waiter received WebSocket message:', lastMessage);

            switch (lastMessage.type) {
                case 'order:needs_waiter_confirm':
                    // Có đơn hàng mới hoặc được sửa đổi cần xác nhận
                    console.log('🆕 Order needs confirmation:', lastMessage.data);

                    const orderId = lastMessage.data._id;
                    const now = Date.now();
                    
                    // Kiểm tra xem đã hiển thị toast cho đơn này trong 2 giây qua chưa (tránh duplicate)
                    const lastShown = shownNotificationsRef.current.get(orderId);
                    if (lastShown && (now - lastShown) < 2000) {
                        console.log('⏭️ Skipping duplicate notification for order:', orderId);
                        break;
                    }

                    // Subscribe to this order for real-time updates
                    subscribeToOrder(orderId);

                    // Kiểm tra xem đây có phải đơn hàng mới hay được sửa đổi
                    const isExistingOrder = pendingOrders.some(o => o._id === orderId);
                    const message = isExistingOrder
                        ? `🔄 Đơn hàng từ bàn ${lastMessage.data.tableId?.tableNumber} đã được sửa đổi và cần xác nhận lại!`
                        : `🆕 Có đơn hàng mới từ bàn ${lastMessage.data.tableId?.tableNumber} cần xác nhận!`;

                    // Đánh dấu đã hiển thị toast cho đơn này
                    shownNotificationsRef.current.set(orderId, now);

                    // Xóa các đơn đã hiển thị quá 10 giây để tránh memory leak
                    shownNotificationsRef.current.forEach((timestamp, id) => {
                        if (now - timestamp > 10000) {
                            shownNotificationsRef.current.delete(id);
                        }
                    });

                    toast.info(message);

                    // Refresh pending orders
                    fetchPendingOrders();

                    // Auto switch to pending tab if not already there
                    if (activeTab !== 'pending') {
                        setActiveTab('pending');
                    }
                    break;

                case 'order:updated':
                    // Đơn hàng được cập nhật
                    console.log('🔄 Order updated:', lastMessage.data);
                    const updatedOrderData = lastMessage.data;

                    // Cập nhật state ngay lập tức nếu order đã có trong danh sách
                    setOrders(prevOrders => {
                        const orderIndex = prevOrders.findIndex(o => o._id === updatedOrderData._id);
                        if (orderIndex !== -1) {
                            // Cập nhật order trong danh sách
                            const newOrders = [...prevOrders];
                            newOrders[orderIndex] = updatedOrderData;
                            return newOrders;
                        }
                        return prevOrders;
                    });

                    setPendingOrders(prevPending => {
                        const orderIndex = prevPending.findIndex(o => o._id === updatedOrderData._id);
                        if (orderIndex !== -1) {
                            // Cập nhật order trong danh sách
                            const newPending = [...prevPending];
                            newPending[orderIndex] = updatedOrderData;
                            return newPending;
                        }
                        return prevPending;
                    });

                    // Refresh để đảm bảo đồng bộ với server
                    fetchOrders();
                    fetchPendingOrders();
                    break;

                case 'order:confirmed':
                    // Đơn hàng đã được customer xác nhận
                    console.log('✅ Order confirmed by customer:', lastMessage.data);
                    toast.success(`Đơn hàng từ bàn ${lastMessage.data.tableId?.tableNumber} đã được khách xác nhận!`);

                    // Refresh both lists
                    fetchOrders();
                    fetchPendingOrders();

                    // Không tự động chuyển tab, để waiter ở lại tab "Chờ xác nhận"
                    // if (activeTab !== 'active') {
                    //     setActiveTab('active');
                    // }
                    break;

                case 'order:cancelled':
                    // Đơn hàng bị customer hủy
                    console.log('❌ Order cancelled by customer:', lastMessage.data);
                    toast.warning(`❌ Đơn hàng từ bàn ${lastMessage.data.tableId?.tableNumber} đã bị khách hủy!`);

                    // Refresh both lists
                    fetchOrders();
                    fetchPendingOrders();
                    break;

                case 'table:updated':
                    // Bàn được giải phóng hoặc thay đổi trạng thái
                    console.log('🪑 Table status updated:', lastMessage.data);
                    
                    // Fetch lại danh sách bàn trống
                    fetchAvailableTables();
                    
                    // Optionally show a toast
                    if (lastMessage.data.status === 'available') {
                        toast.info(`🪑 Bàn ${lastMessage.data.tableNumber} đã trống`);
                    }
                    break;

                case 'item:ready':
                    // Món đơn đã ready, cần đi phục vụ
                    console.log('🍽️ Item ready:', lastMessage.data);
                    const itemData = lastMessage.data;
                    toast.info(`🔔 ${itemData.itemName} đã sẵn sàng phục vụ tại bàn ${itemData.tableNumber}!`, {
                        autoClose: 5000
                    });
                    // Refresh orders để cập nhật trạng thái
                    fetchOrders();
                    break;

                case 'comboItem:ready':
                    // Món trong combo đã ready, cần đi phục vụ
                    console.log('🍽️ Combo item ready:', lastMessage.data);
                    const comboItemData = lastMessage.data;
                    toast.info(`🔔 ${comboItemData.comboItemName} (trong combo) đã sẵn sàng phục vụ tại bàn ${comboItemData.tableNumber}!`, {
                        autoClose: 5000
                    });
                    // Refresh orders để cập nhật trạng thái
                    fetchOrders();
                    break;

                default:
                    console.log('📨 Unknown message type:', lastMessage.type);
            }
        }
    }, [lastMessage]);

    return (
        <div className="min-vh-100 bg-light d-flex flex-column">
            {/* Header cố định trên cùng */}
            <Header />

            {/* Nội dung chính */}
            <Container className="flex-grow-1 mt-4 pb-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                    <h4 className="fw-bold text-dark mb-3 mb-md-0">
                        Quản lý đơn hàng
                    </h4>
                </div>

                {/* Tabs */}
                <div className="mb-4">
                    <ul className="nav nav-tabs">
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
                                onClick={() => setActiveTab('pending')}
                                data-count={pendingOrders.length}
                            >
                                Chờ xác nhận
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'active' ? 'active' : ''}`}
                                onClick={() => setActiveTab('active')}
                                data-count={orders.length}
                            >
                                Đang phục vụ
                            </button>
                        </li>
                    </ul>
                </div>

                {/* Tab Content */}
                {activeTab === 'pending' && (
                    <>
                        {pendingLoading ? (
                            <div className="text-center mt-5">
                                <Spinner animation="border" variant="warning" />
                            </div>
                        ) : pendingOrders.length === 0 ? (
                            <p className="text-muted text-center">
                                Hiện tại chưa có đơn hàng nào cần xác nhận.
                            </p>
                        ) : (
                            <Row>
                                {pendingOrders.map((order) => (
                                    <Col key={order._id} xs={12} md={6} lg={4}>
                                        <OrderCard
                                            order={order}
                                            onUpdateStatus={handleUpdateStatus}
                                            onWaiterResponse={handleWaiterResponse}
                                            availableTables={availableTables}
                                            isPending={true}
                                        />
                                    </Col>
                                ))}
                            </Row>
                        )}
                    </>
                )}

                {activeTab === 'active' && (
                    <>
                        {loading ? (
                            <div className="text-center mt-5">
                                <Spinner animation="border" variant="warning" />
                            </div>
                        ) : orders.length === 0 ? (
                            <p className="text-muted text-center">
                                Hiện tại chưa có đơn hàng nào đang phục vụ.
                            </p>
                        ) : (
                            <Row>
                                {orders.map((order) => (
                                    <Col key={order._id} xs={12} md={6} lg={4}>
                                        <OrderCard
                                            order={order}
                                            onUpdateStatus={handleUpdateStatus}
                                            onWaiterResponse={handleWaiterResponse}
                                            isPending={false}
                                            onOrderUpdate={fetchOrders} // Refresh orders sau khi đánh dấu đã phục vụ
                                        />
                                    </Col>
                                ))}
                            </Row>
                        )}
                    </>
                )}
            </Container>

        </div>
    );
}
