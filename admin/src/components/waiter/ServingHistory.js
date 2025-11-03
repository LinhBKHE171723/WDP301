import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Spinner, Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import waiterApi from "../../api/waiterApi";
import { toast } from "react-toastify";

export default function ServingHistory() {
    const [orders, setOrders] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState(""); // Tìm theo tên khách
    const [tableFilter, setTableFilter] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const navigate = useNavigate();

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const res = await waiterApi.getServingHistory(page, search, tableFilter, fromDate, toDate);

            setOrders(res.orders || []);
            setPage(res.page);
            setTotalPages(res.totalPages);
        } catch (err) {
            toast.error("Không thể tải lịch sử phục vụ");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [page, search, tableFilter, fromDate, toDate]);

    const resetFilters = () => {
        setSearch("");
        setTableFilter("all");
        setFromDate("");
        setToDate("");
        setPage(1);
    };

    return (
        <div className="min-vh-100 bg-light d-flex flex-column">
            <Header />

            <Container className="flex-grow-1 mt-4 pb-5">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="fw-bold">Lịch sử phục vụ của bạn</h4>
                </div>

                {/* Filter Section */}
                <Card className="p-3 mb-4 shadow-sm border-0">
                    <Row className="g-3">
                        <Col md={4}>
                            <Form.Control
                                type="text"
                                placeholder="🔍 Tìm theo tên khách..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </Col>

                        <Col md={2}>
                            <Form.Control
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </Col>

                        <Col md={2}>
                            <Form.Control
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </Col>

                        <Col md={2}>
                            <Form.Select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
                                <option value="all">Tất cả bàn</option>
                                {[...new Set(orders.map(o => o.tableId?.tableNumber).filter(Boolean))].map(num => (
                                    <option key={num} value={num}>Bàn {num}</option>
                                ))}
                            </Form.Select>
                        </Col>

                        <Col md={2}>
                            <Button variant="outline-secondary" className="w-100" onClick={resetFilters}>
                                Reset
                            </Button>
                        </Col>
                    </Row>
                </Card>



                {/* Orders List */}
                {loading ? (
                    <div className="text-center mt-5">
                        <Spinner animation="border" />
                    </div>
                ) : orders.length === 0 ? (
                    <p className="text-center text-muted">Không có dữ liệu phù hợp.</p>
                ) : (
                    <Row>
                        {orders.map((order) => (
                            <Col key={order._id} xs={12} md={6} lg={4} className="mb-4">
                                <Card
                                    className="shadow-sm border-0 p-3"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => navigate(`/waiter/orders/history/${order._id}`)}
                                >
                                    <Card.Body>
                                        <h5 className="fw-bold">Đơn #{order._id.slice(-6)}</h5>
                                        <p className="mb-1">🍽 Bàn: <b>{order.tableId?.tableNumber || "-"}</b></p>
                                        <p className="mb-1">👤 Khách: {order.userId?.name || "Không rõ"}</p>
                                        <p className="mb-0 text-muted small">👥 Phục vụ: {order.servedBy?.name || "Bạn"}</p>
                                        <p className="mb-0 text-muted small">🕒 Thời gian: {new Date(order.createdAt).toLocaleString()}</p>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}

                {/* Pagination */}
                <div className="d-flex justify-content-center gap-2 mt-4">
                    <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
                        ⬅ Trước
                    </Button>
                    <span className="fw-bold d-flex align-items-center">
                        Trang {page} / {totalPages}
                    </span>
                    <Button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                        Sau ➡
                    </Button>
                </div>
            </Container>
        </div>
    );
}
