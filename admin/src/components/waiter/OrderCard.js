import React, { useState, useEffect } from "react";
import { Card, Button, Modal, Form, Spinner } from "react-bootstrap";
import waiterApi from "../../api/waiterApi";
import { toast } from "react-toastify";

export default function OrderCard({ order, onUpdateStatus, onWaiterResponse, isPending = false }) {
  const { tableId, status, totalAmount, orderItems } = order;
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Thêm state quản lý bàn trống
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");

  // Lấy danh sách bàn trống khi component mount
  useEffect(() => {
    if (isPending) fetchAvailableTables();
  }, [isPending]);

  const fetchAvailableTables = async () => {
    try {
      const res = await waiterApi.getAvailableTables();
      setAvailableTables(res.data || []);
    } catch (error) {
      console.error("Error fetching available tables:", error);
      toast.error("Không thể tải danh sách bàn trống!");
    }
  };

  const handleApprove = async () => {
    if (!selectedTable) {
      toast.warning("⚠️ Vui lòng chọn bàn trước khi xác nhận!");
      return;
    }

    try {
      setLoading(true);
      await waiterApi.respondToOrder(order._id, true, selectedTable);
      onWaiterResponse(order._id, "approved");
      toast.success("✅ Đã xác nhận đơn hàng và gán bàn thành công!");
    } catch (error) {
      console.error("Error approving order:", error);
      if (error.response?.status === 409) {
        toast.error("❌ Bàn này đã được chọn bởi waiter khác!");
        // Refresh lại danh sách bàn trống
        fetchAvailableTables();
      } else {
        toast.error("❌ Lỗi khi xác nhận đơn hàng!");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.warning("⚠️ Vui lòng nhập lý do từ chối");
      return;
    }

    try {
      setLoading(true);
      await waiterApi.respondToOrder(order._id, false, rejectReason);
      onWaiterResponse(order._id, "rejected");
      setShowRejectModal(false);
      setRejectReason("");
      toast.info("Đã từ chối đơn hàng!");
    } catch (error) {
      console.error("Error rejecting order:", error);
      toast.error("❌ Lỗi khi từ chối đơn hàng!");
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

          {/* 🔹 Form chọn bàn */}
          {isPending && (
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-secondary">
                Chọn bàn phục vụ:
              </Form.Label>
              <Form.Select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Chọn bàn trống --</option>
                {availableTables.map((t) => (
                  <option key={t._id} value={t._id}>
                    Bàn {t.tableNumber} ({t.capacity} người)
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}

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
                  {loading ? (
                    <Spinner size="sm" animation="border" />
                  ) : (
                    "✓ Xác nhận"
                  )}
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
              <Form.Label>
                Lý do từ chối <span className="text-danger">*</span>
              </Form.Label>
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
