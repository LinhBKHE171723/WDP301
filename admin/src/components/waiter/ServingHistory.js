import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Spinner, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import NotificationBell from "./NotificationBell";
import waiterApi from "../../api/waiterApi";
import { toast } from "react-toastify";

export default function ServingHistory() {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchHistory = async (pageNum) => {
    try {
      setLoading(true);
      const res = await waiterApi.getServingHistory(pageNum);

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
    fetchHistory(page);
  }, [page]);

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">
      <Header />

      <Container className="flex-grow-1 mt-4 pb-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="fw-bold">Lịch sử phục vụ của bạn</h4>
          <NotificationBell />
        </div>

        {loading ? (
          <div className="text-center mt-5">
            <Spinner animation="border" />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-center text-muted">Chưa có lịch sử phục vụ.</p>
        ) : (
          <Row>
            {orders.map((order) => (
              <Col key={order._id} xs={12} md={6} lg={4} className="mb-4">
                <Card
                  className="shadow-sm border-0 p-3"
                  style={{ cursor: "pointer", transition: "0.2s" }}
                  onClick={() => navigate(`/waiter/orders/history/${order._id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <Card.Body>
                    <h5 className="fw-bold">Đơn #{order._id.slice(-6)}</h5>
                    <p className="mb-1">🍽 Bàn: <b>{order.tableId?.tableNumber || "-"}</b></p>
                    <p className="mb-1">👤 Khách: {order.userId?.name || "Không rõ"}</p>
                    {/* <p className="mb-1 text-muted small">
                      Đã phục vụ lúc: {order.servedAt ? new Date(order.servedAt).toLocaleString() : "-"}
                    </p> */}
                    <p className="mb-0 text-muted small"> Phục vụ bởi: {order.servedBy?.name || "Bạn"}</p>
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
