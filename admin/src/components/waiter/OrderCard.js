import React, { useState } from "react";
import { Card, Button, Modal, Form } from "react-bootstrap";
import waiterApi from "../../api/waiterApi";

export default function OrderCard({ order, onUpdateStatus, onWaiterResponse, isPending = false }) {
  const { tableId, status, totalAmount, orderItems } = order;
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    try {
      setLoading(true);
      await waiterApi.respondToOrder(order._id, true);
      onWaiterResponse(order._id, "approved");
    } catch (error) {
      console.error("Error approving order:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }

    try {
      setLoading(true);
      await waiterApi.respondToOrder(order._id, false, rejectReason);
      onWaiterResponse(order._id, "rejected");
      setShowRejectModal(false);
      setRejectReason("");
    } catch (error) {
      console.error("Error rejecting order:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
                {item.itemName} × {item.quantity}
              </li>
            ))}
          </ul>

          {/* Tổng tiền + nút hành động */}
          <div className="d-flex flex-wrap justify-content-between align-items-center">
            <span className="fw-bold text-dark mb-2 mb-md-0">
              Tổng tiền: {totalAmount?.toLocaleString()}₫
            </span>

            {isPending && (
              <div className="d-flex gap-2">
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleApprove}
                  disabled={loading}
                >
                  ✓ Xác nhận
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowRejectModal(true)}
                  disabled={loading}
                >
                  ✗ Từ chối
                </Button>
              </div>
            )}

            {!isPending && status === "confirmed" && (
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

      {/* Reject Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Từ chối đơn hàng</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Lý do từ chối <span className="text-danger">*</span></Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="VD: Món không có sẵn, bàn đã đầy..."
                required
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleReject} disabled={loading}>
            {loading ? "Đang xử lý..." : "Từ chối đơn hàng"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
