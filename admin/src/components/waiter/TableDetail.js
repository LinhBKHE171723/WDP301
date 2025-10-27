import React, { useEffect, useState } from "react";
import { Container, Card, Spinner, Table as BSTable } from "react-bootstrap";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "./Header";
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
      console.log("🚀 Table details:", res.table);
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
      <Header onLogout={logout} user={user} />

      <Container className="flex-grow-1 mt-4 pb-5">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
          <h4 className="fw-bold text-dark mb-3 mb-md-0">Chi tiết bàn</h4>
          <NotificationBell />
        </div>

        {loading ? (
          <div className="text-center mt-5">
            <Spinner animation="border" variant="warning" />
          </div>
        ) : !table ? (
          <p className="text-center text-muted mt-4">
            Không tìm thấy thông tin bàn.
          </p>
        ) : (
          <>
            <Card className="p-3 mb-4 shadow-sm border-0">
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

                {/* Hiển thị người phục vụ nếu có orderNow */}
                {table.orderNow && (
                  <p className="fw-semibold text-dark mb-1">
                    Nhân viên phục vụ:{" "}
                    <span className="text-primary">
                      {table?.orderNow?.servedBy?.name ?? "Không rõ"}
                    </span>
                  </p>
                )}
              </div>
            </Card>

            <h5 className="fw-bold mb-3">🧾 Order hiện tại</h5>
            {!table.orderNow ? (
              <p className="text-muted">Bàn này hiện chưa có order nào.</p>
            ) : (
              <Card className="p-3 mb-4 shadow-sm border-start border-4 border-warning bg-white">
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-2">
                  <h6 className="fw-bold mb-1">
                    Order #{table.orderNow._id.slice(-5)}
                  </h6>
                  <span className="badge bg-secondary">
                    {table.orderNow.status}
                  </span>
                </div>
                <p className="mb-1 text-muted">
                  Tổng tiền:{" "}
                  <span className="fw-semibold text-dark">
                    {table.orderNow.totalAmount?.toLocaleString()}₫
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
                      {table.orderNow.orderItems?.map((oi) => (
                        <tr key={oi._id}>
                          <td>{oi.itemId?.name || "N/A"}</td>
                          <td>{oi.quantity}</td>
                          <td>{oi.price?.toLocaleString()}₫</td>
                          <td>{oi.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </BSTable>
                </div>
              </Card>
            )}
          </>
        )}
      </Container>
    </div>
  );
}
