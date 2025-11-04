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
            <h5 className="fw-bold mt-4">Danh sách món</h5>
            {order.orderItems.map((item) => {
              const isCombo = item.itemType === 'menu' && item.comboItems && item.comboItems.length > 0;
              const itemName = item.itemName || item.itemId?.name || "Món đã xóa";
              return (
                <div key={item._id} className="border-bottom py-2">
                  <div className="fw-bold">
                    {itemName} × {item.quantity} — {item.price}đ
                    {isCombo && <span className="badge bg-primary ms-2">Combo</span>}
                  </div>
                  {/* Hiển thị các món trong combo */}
                  {isCombo && (
                    <ul className="ps-3 mt-2 mb-0" style={{ fontSize: '0.9em' }}>
                      {item.comboItems.map((comboItem, idx) => (
                        <li key={idx} className="text-muted">
                          • {comboItem.itemName}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </Card>
        )}
      </Container>
    </div>
  );
}
