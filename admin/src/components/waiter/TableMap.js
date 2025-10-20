import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "./Header"
import NotificationBell from "./NotificationBell";
import waiterApi from "../../api/waiterApi";
import { useAuth } from "../../context/AuthContext";

export default function TableMap() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const fetchTables = async () => {
    try {
      const res = await waiterApi.getAllTables();
      setTables(res.tables || []);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách bàn!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">
      {/* Header cố định */}
      <Header onLogout={logout} user={user} />

      {/* Nội dung chính */}
      <Container className="flex-grow-1 mt-4 pb-5">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
          <h4 className="fw-bold text-dark mb-3 mb-md-0">
            🍽️ Sơ đồ bàn hiện tại
          </h4>
          <NotificationBell />
        </div>

        {loading ? (
          <div className="text-center mt-5">
            <Spinner animation="border" variant="warning" />
          </div>
        ) : (
          <Row>
            {tables.map((table) => (
              <Col
                key={table._id}
                xs={6}
                sm={6}
                md={4}
                lg={3}
                xl={2}
                className="mb-4"
              >
                <Card
                  className={`shadow-sm border-3 text-center p-3 h-100 ${
                    table.status === "occupied"
                      ? "border-danger bg-light"
                      : "border-success bg-white"
                  }`}
                  onClick={() => navigate(`/waiter/tables/${table._id}`)}
                  style={{
                    cursor: "pointer",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "scale(1.03)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                >
                  <Card.Body className="d-flex flex-column justify-content-center">
                    <h5 className="fw-bold">Bàn #{table.tableNumber}</h5>
                    <p
                      className={`mb-1 ${
                        table.status === "occupied"
                          ? "text-danger"
                          : "text-success"
                      } fw-semibold`}
                    >
                      {table.status === "occupied" ? "Đang có khách" : "Trống"}
                    </p>
                    {table.orders?.length > 0 && (
                      <p className="small text-muted mb-0">
                        🧾 {table.orders.length} đơn gần nhất
                      </p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Container>
    </div>
  );
}
