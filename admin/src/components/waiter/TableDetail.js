import React, { useEffect, useState } from "react";
import { Container, Card, Spinner, Table as BSTable } from "react-bootstrap";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "./Header"
import NotificationBell from "./NotificationBell";
import waiterApi from "../../api/waiterApi";
import { useAuth } from "../../context/AuthContext";

export default function TableDetail() {
  const { tableId } = useParams();
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const { logout, user } = useAuth();

  const fetchTableDetails = async () => {
    try {
      const res = await waiterApi.getTableDetails(tableId);
      setTable(res.table);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải chi tiết bàn!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableDetails();
  }, [tableId]);

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">
      {/* Header giữ nguyên */}
      <Header onLogout={logout} user={user} />

      <Container className="flex-grow-1 mt-4 pb-5">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
          <h4 className="fw-bold text-dark mb-3 mb-md-0">
            🪑 Chi tiết bàn
          </h4>
          <NotificationBell />
        </div>

        {loading ? (
          <div className="text-center mt-5">
            <Spinner animation="border" variant="warning" />
          </div>
        ) : !table ? (
          <p className="text-center text-muted mt-4">Không tìm thấy thông tin bàn.</p>
        ) : (
          <>
            <Card className="p-3 mb-4 shadow-sm border-0">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                <div>
                  <h5 className="fw-bold mb-2">Bàn #{table.tableNumber}</h5>
                  <p className="mb-1 text-muted">QR Code: {table.qrCode}</p>
                  <p
                    className={`fw-semibold ${
                      table.status === "occupied"
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    Trạng thái:{" "}
                    {table.status === "occupied" ? "Đang có khách" : "Trống"}
                  </p>
                </div>
              </div>
            </Card>

            <h5 className="fw-bold mb-3">🧾 Danh sách Order của bàn</h5>
            {table.orders?.length === 0 ? (
              <p className="text-muted">Chưa có order nào.</p>
            ) : (
              table.orders.map((order) => (
                <Card
                  key={order._id}
                  className="p-3 mb-4 shadow-sm border-start border-4 border-warning bg-white"
                >
                  <div className="d-flex flex-wrap justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold mb-1">Order #{order._id.slice(-5)}</h6>
                    <span className="badge bg-secondary">{order.status}</span>
                  </div>
                  <p className="mb-1 text-muted">
                    Tổng tiền:{" "}
                    <span className="fw-semibold text-dark">
                      {order.totalAmount.toLocaleString()}₫
                    </span>
                  </p>

                  <div className="table-responsive mt-3">
                    <BSTable striped bordered hover size="sm" responsive>
                      <thead className="table-warning">
                        <tr>
                          <th>Món ăn</th>
                          <th>Số lượng</th>
                          <th>Giá</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.orderItems.map((oi) => (
                          <tr key={oi._id}>
                            <td>{oi.itemId?.name}</td>
                            <td>{oi.quantity}</td>
                            <td>{oi.price.toLocaleString()}₫</td>
                            <td>{oi.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </BSTable>
                  </div>
                </Card>
              ))
            )}
          </>
        )}
      </Container>
    </div>
  );
}
