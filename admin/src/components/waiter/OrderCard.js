import React, { useState, useEffect } from "react";
import { Card, Button, Modal, Form, Spinner } from "react-bootstrap";
import waiterApi from "../../api/waiterApi";
import { toast } from "react-toastify";

export default function OrderCard({
  order,
  onUpdateStatus,
  onWaiterResponse,
  isPending = false,
  availableTables = []
}) {
  const { tableId, status, totalAmount, orderItems } = order;
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [loading, setLoading] = useState(false);

  // Tự động chọn bàn hiện tại nếu order đã có tableId
  useEffect(() => {
    if (tableId && !selectedTable) {
      setSelectedTable(tableId._id);
    }
  }, [tableId, selectedTable]);

  // ✅ Xác nhận đơn hàng
  const handleApprove = async () => {
    // Chỉ validate nếu order chưa có tableId và waiter không chọn bàn
    if (!selectedTable && !tableId) {
      toast.warning("⚠️ Vui lòng chọn bàn trước khi xác nhận!");
      return;
    }

    try {
      setLoading(true);
      // Nếu không có selectedTable nhưng có tableId, sử dụng tableId
      const finalSelectedTable = selectedTable || (tableId ? tableId._id : null);
      
      const response = await waiterApi.respondToOrder(order._id, true, null, finalSelectedTable);
      onWaiterResponse(order._id, "approved");
      toast.success("✅ Đã xác nhận đơn hàng và gán bàn thành công!");
    } catch (error) {
      console.error('❌ Error details:', error);
      
      if (error.response?.status === 409) {
        toast.error("❌ Bàn này đã được chọn bởi waiter khác!");
      } else {
        toast.error("❌ Lỗi khi xác nhận đơn hàng!");
      }
    } finally {
      setLoading(false);
    }
  };

  // ❌ Từ chối đơn hàng
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
      console.error(error);
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
            {orderItems?.map((item) => {
              const isCombo = item.itemType === 'menu' && item.comboItems && item.comboItems.length > 0;
              return (
                <li key={item._id} className="small text-dark mb-2">
                  <div className="fw-semibold">
                    {item.itemName || item.itemId?.name || "Món đã xóa"} × {item.quantity}
                    {isCombo && <span className="text-primary ms-1">(Combo)</span>}
                  </div>
                  {/* Hiển thị các món trong combo */}
                  {isCombo && (
                    <ul className="ps-3 mt-1 mb-0" style={{ fontSize: '0.85em' }}>
                      {item.comboItems.map((comboItem, idx) => (
                        <li key={idx} className="text-muted">
                          • {comboItem.itemName}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          {/* ✅ Chọn bàn phục vụ (chỉ hiện khi isPending) */}
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
                {/* Hiển thị bàn hiện tại nếu có */}
                {tableId && (
                  <option value={tableId._id} style={{backgroundColor: '#e8f5e8'}}>
                    Bàn {tableId.tableNumber} (Đã gán tự động)
                  </option>
                )}
                {availableTables.map((t) => (
                  <option key={t?._id} value={t?._id}>
                    Bàn {t?.tableNumber}
                  </option>
                ))}
              </Form.Select>
              {/* Thông báo nếu order đã có bàn */}
              {tableId && (
                <Form.Text className="text-success small">
                  ✅ Đơn hàng đã được gán tự động cho bàn {tableId.tableNumber}. Bạn có thể chọn bàn khác nếu cần.
                </Form.Text>
              )}
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

      {/* 🟥 Modal nhập lý do từ chối */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Từ chối đơn hàng</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-secondary">
                Lý do từ chối đơn hàng:
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Nhập lý do từ chối (ví dụ: khách hủy, sai món, quá tải...)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={loading}
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
