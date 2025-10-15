import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet } from "../../api";
import { Spinner, Card } from "react-bootstrap";

function TableDetail() {
  const { id } = useParams();
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/tables/${id}`)
      .then((res) => setTable(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner animation="border" variant="warning" />;
  if (!table) return <div className="text-center mt-4 text-danger">Không tìm thấy bàn</div>;

  return (
    <div className="container py-4">
      <Card className="shadow border-warning">
        <Card.Body>
          <Card.Title className="text-warning fw-bold fs-4">
            Bàn {table.tableNumber}
          </Card.Title>
          <Card.Text>
            <strong>Trạng thái:</strong>{" "}
            <span
              className={
                table.status === "available"
                  ? "text-success"
                  : table.status === "occupied"
                  ? "text-warning"
                  : "text-secondary"
              }
            >
              {table.status === "available"
                ? "Trống"
                : table.status === "occupied"
                ? "Đang phục vụ"
                : "Đã đặt trước"}
            </span>
          </Card.Text>

          {table.orders?.length > 0 ? (
            <>
              <strong>Danh sách order:</strong>
              <ul className="list-group mt-2">
                {table.orders.map((order) => (
                  <li key={order._id} className="list-group-item">
                    Mã Order: {order._id} –{" "}
                    <span className="text-warning">{order.status}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-muted">Chưa có order nào cho bàn này.</p>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default TableDetail;
