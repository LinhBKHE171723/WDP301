import React, { useEffect, useState } from "react";
import Header from "../components/waiter/Header";
import OrderCard from "../components/waiter/OrderCard";
import NotificationBell from "../components/waiter/NotificationBell";
import waiterApi from "../api/waiterApi";
import { Container, Spinner, Row, Col } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function WaiterDashboard() {
    const { token, logout } = useAuth();

    // State lưu danh sách order mà waiter đang xử lý
    const [orders, setOrders] = useState([]);

    // Hiển thị loading khi đang fetch dữ liệu
    const [loading, setLoading] = useState(true);

    /**
     * 🔹 Lấy danh sách order đang phục vụ
     * Gọi API GET /api/waiter/orders
     */
    const fetchOrders = async () => {
        try {
            const res = await waiterApi.getActiveOrders();
            setOrders(res.orders || []);
        } catch (err) {
            console.error("Error loading orders:", err.message);
            toast.error("Không thể tải danh sách đơn hàng!");
        } finally {
            setLoading(false);
        }
    };

    /**
     * 🔹 Cập nhật trạng thái đơn hàng (pending → confirmed → served)
     * PUT /api/waiter/orders/:orderId
     */
    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await waiterApi.updateOrderStatus(orderId, newStatus);
            setOrders((prev) =>
                prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
            );
            toast.success(`✅ Cập nhật đơn #${orderId.slice(-4)} thành ${newStatus}`);
        } catch (err) {
            toast.error("❌ Lỗi khi cập nhật trạng thái đơn!");
        }
    };

    // Gọi API khi component mount
    useEffect(() => {
        fetchOrders();
    }, []);

    return (
        <div className="min-vh-100 bg-light d-flex flex-column">
            {/* Header cố định trên cùng */}
            <Header onLogout={logout} />

            {/* Nội dung chính */}
            <Container className="flex-grow-1 mt-4 pb-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                    <h4 className="fw-bold text-dark mb-3 mb-md-0">
                        🧾 Danh sách ORDER đang phục vụ
                    </h4>
                    <NotificationBell />
                </div>

                {/* Trạng thái loading */}
                {loading ? (
                    <div className="text-center mt-5">
                        <Spinner animation="border" variant="warning" />
                    </div>
                ) : orders.length === 0 ? (
                    <p className="text-muted text-center">
                        Hiện tại chưa có ORDER nào.
                    </p>
                ) : (
                    // Hiển thị các OrderCard trong lưới responsive
                    <Row>
                        {orders.map((order) => (
                            <Col key={order._id} xs={12} md={6} lg={4}>
                                <OrderCard
                                    order={order}
                                    onUpdateStatus={handleUpdateStatus}
                                />
                            </Col>
                        ))}
                    </Row>
                )}
            </Container>

            {/* Toast hiển thị thông báo popup */}
            <ToastContainer position="top-right" autoClose={3000} />
        </div>
    );
}
