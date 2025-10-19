import React from "react";
import { Card, Button } from "react-bootstrap";

export default function OrderCard({ order, onUpdateStatus }) {
  const { tableId, status, totalAmount, orderItems } = order;

  return (
    <Card className="mb-4 shadow-sm border-0 rounded-3 h-100">
      <Card.Body>
        <Card.Title className="fw-bold text-dark mb-1">
          Bàn {tableId?.tableNumber || "?"}
        </Card.Title>
        <Card.Subtitle className="mb-3 text-muted small">
          Trạng thái: {status}
        </Card.Subtitle>

        {/* Danh sách món ăn */}
        <ul className="mb-3 ps-3">
          {orderItems?.map((item) => (
            <li key={item._id} className="small text-dark">
              {item.itemId?.name} × {item.quantity}
            </li>
          ))}
        </ul>

        {/* Tổng tiền + nút hành động */}
        <div className="d-flex flex-wrap justify-content-between align-items-center">
          <span className="fw-bold text-dark mb-2 mb-md-0">
            Tổng tiền: {totalAmount?.toLocaleString()}₫
          </span>

          {status === "pending" && (
            <Button
              variant="warning"
              size="sm"
              onClick={() => onUpdateStatus(order._id, "confirmed")}
            >
              Xác nhận đơn
            </Button>
          )}
          {status === "confirmed" && (
            <Button
              variant="success"
              size="sm"
              onClick={() => onUpdateStatus(order._id, "served")}
            >
              Đã phục vụ
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}
