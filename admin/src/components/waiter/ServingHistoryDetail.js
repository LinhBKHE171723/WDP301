import React, { useEffect, useState } from "react";
import { Container, Card, Spinner, Button } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import Header from "./Header";
import waiterApi from "../../api/waiterApi";
import { toast } from "react-toastify";

export default function ServingHistoryDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    try {
      const res = await waiterApi.getServingHistoryDetails(orderId);
      setOrder(res.order);
    } catch {
      toast.error("Không thể tải chi tiết đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, []);

  return (
    <div className="min-vh-100 bg-light">
      <Header />
      <Container className="pt-4 pb-5">
        <Button variant="secondary" className="mb-3" onClick={() => navigate(-1)}>
          ⬅ Quay lại
        </Button>

        {loading ? (
          <div className="text-center mt-5"><Spinner animation="border" /></div>
        ) : (
          <Card className="shadow-sm p-4">
            <h4 className="fw-bold mb-3">Chi tiết đơn #{order._id.slice(-6)}</h4>
            <p>🍽 Bàn: {order.tableId?.tableNumber}</p>
            <p>👤 Khách: {order.userId?.name}</p>
            <p className="mb-3">🕒 Phục vụ lúc: {new Date(order.servedAt).toLocaleString()}</p>

            <h5 className="fw-bold mt-4">Danh sách món</h5>
            {order.orderItems.map((item) => (
              <div key={item._id} className="border-bottom py-2">
                <b>{item.itemId?.name}</b> × {item.quantity} — {item.price}đ
              </div>
            ))}
          </Card>
        )}
      </Container>
    </div>
  );
}
