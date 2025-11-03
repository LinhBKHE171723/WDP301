import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Spinner, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "./Header";
import waiterApi from "../../api/waiterApi";
import { useAuth } from "../../context/AuthContext";

export default function TableMap() {
  const [tables, setTables] = useState([]);
  const [filteredTables, setFilteredTables] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterOrderStatus, setFilterOrderStatus] = useState("all");

  const navigate = useNavigate();

  const fetchTables = async () => {
    try {
      const res = await waiterApi.getAllTables(); // trả về danh sách bàn, có populate orderNow & servedBy
      setTables(res.tables || []);
      setFilteredTables(res.tables || []);
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

  useEffect(() => {
    let filtered = [...tables];

    // Lọc theo trạng thái bàn
    if (filterStatus !== "all") {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }

    // Lọc theo trạng thái order
    if (filterOrderStatus !== "all") {
      filtered = filtered.filter((t) => 
        t.orderNow && t.orderNow.some(order => order.status === filterOrderStatus)
      );
    }

    // Bỏ filter theo waiter vì mỗi order có thể có nhiều waiter phục vụ các món khác nhau
    // (Filter này không còn phù hợp với cấu trúc mới)

    setFilteredTables(filtered);
  }, [filterStatus, filterOrderStatus, tables]);

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">
      <Header />

      <Container className="flex-grow-1 mt-4 pb-5">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
          <h4 className="fw-bold text-dark mb-3 mb-md-0">
            🍽️ Sơ đồ bàn hiện tại
          </h4>
        </div>

        {/* Bộ lọc */}
        <Card className="p-3 mb-4 shadow-sm border-0">
          <Row className="g-3">
            <Col xs={12} md={4}>
              <Form.Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Tất cả trạng thái bàn</option>
                <option value="available">Trống</option>
                <option value="occupied">Đang có khách</option>
              </Form.Select>
            </Col>
            <Col xs={12} md={4}>
              <Form.Select
                value={filterOrderStatus}
                onChange={(e) => setFilterOrderStatus(e.target.value)}
              >
                <option value="all">Tất cả trạng thái order</option>
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="preparing">Đang chế biến</option>
                <option value="ready">Sẵn sàng</option>
                <option value="served">Đã phục vụ</option>
                <option value="paid">Đã thanh toán</option>
                <option value="cancelled">Đã huỷ</option>
              </Form.Select>
            </Col>
            {/* Bỏ filter theo waiter vì mỗi order có thể có nhiều waiter */}
          </Row>
        </Card>

        {/* Nội dung chính */}
        {loading ? (
          <div className="text-center mt-5">
            <Spinner animation="border" variant="warning" />
          </div>
        ) : (
          <Row>
            {filteredTables.length === 0 ? (
              <p className="text-center text-muted">Không có bàn phù hợp.</p>
            ) : (
              filteredTables.map((table) => {
                const isOccupied = table.status === "occupied";
                return (
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
                        isOccupied
                          ? "border-danger bg-light"
                          : "border-success bg-white"
                      }`}
                      onClick={() => navigate(`/waiter/tables/details/${table._id}`)}
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
                      <Card.Body>
                        <h5 className="fw-bold">Bàn #{table.tableNumber}</h5>
                        <p
                          className={`fw-semibold mb-1 ${
                            isOccupied ? "text-danger" : "text-success"
                          }`}
                        >
                          {isOccupied ? "Đang có khách" : "Trống"}
                        </p>

                        {table.orderNow && table.orderNow.length > 0 && (
                          <>
                            <p className="small text-muted mb-1">
                              🧾 Orders: {table.orderNow.length} đơn hàng
                            </p>
                            {table.orderNow.slice(0, 2).map((order, index) => (
                              <div key={order._id} className="small text-muted mb-1">
                                <p className="mb-0">
                                  #{order._id.slice(-5)} - {order.status}
                                </p>
                                {/* Mỗi món có thể có waiter riêng, không hiển thị order.servedBy */}
                              </div>
                            ))}
                            {table.orderNow.length > 2 && (
                              <p className="small text-muted">
                                ... và {table.orderNow.length - 2} đơn hàng khác
                              </p>
                            )}
                          </>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })
            )}
          </Row>
        )}
      </Container>
    </div>
  );
}
