import React, { useState, useEffect } from "react";
import { Card, Button, Modal, Form, Spinner, Badge } from "react-bootstrap";
import waiterApi from "../../api/waiterApi";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";

export default function OrderCard({
  order,
  onUpdateStatus,
  onWaiterResponse,
  isPending = false,
  availableTables = [],
  onOrderUpdate // Callback để refresh order sau khi đánh dấu đã phục vụ
}) {
  const { tableId, status, totalAmount, orderItems } = order;
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [loading, setLoading] = useState(false);
  const [markingServed, setMarkingServed] = useState({}); // Track which item is being marked
  const { user } = useAuth();
  
  // Helper function để check waiter có quyền phục vụ một món không
  const canMarkItemServed = (orderItem) => {
    if (!orderItem || !user) return false;
    const servedBy = orderItem.servedBy;
    if (!servedBy) return false;
    return (
      (servedBy._id && servedBy._id.toString() === user.id?.toString()) ||
      (typeof servedBy === 'string' && servedBy === user.id?.toString()) ||
      (servedBy.toString && servedBy.toString() === user.id?.toString())
    );
  };

  // Helper function để check waiter có quyền phục vụ một comboItem không
  const canMarkComboItemServed = (comboItem) => {
    if (!comboItem || !user) return false;
    const servedBy = comboItem.servedBy;
    if (!servedBy) return false;
    return (
      (servedBy._id && servedBy._id.toString() === user.id?.toString()) ||
      (typeof servedBy === 'string' && servedBy === user.id?.toString()) ||
      (servedBy.toString && servedBy.toString() === user.id?.toString())
    );
  };

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

  // ✅ Đánh dấu món đơn đã phục vụ
  const handleMarkItemServed = async (orderItemId) => {
    try {
      setMarkingServed(prev => ({ ...prev, [orderItemId]: true }));
      await waiterApi.markOrderItemServed(orderItemId);
      toast.success("Đã đánh dấu món đã phục vụ!");
      
      // Refresh order nếu có callback
      if (onOrderUpdate) {
        onOrderUpdate(order._id);
      }
    } catch (error) {
      console.error("Error marking item as served:", error);
      toast.error(error.response?.data?.message || "Không thể đánh dấu món đã phục vụ!");
    } finally {
      setMarkingServed(prev => ({ ...prev, [orderItemId]: false }));
    }
  };

  // ✅ Đánh dấu món trong combo đã phục vụ
  const handleMarkComboItemServed = async (orderItemId, comboItemIndex) => {
    try {
      const key = `${orderItemId}-${comboItemIndex}`;
      setMarkingServed(prev => ({ ...prev, [key]: true }));
      await waiterApi.markComboItemServed(orderItemId, comboItemIndex);
      toast.success("Đã đánh dấu món trong combo đã phục vụ!");
      
      // Refresh order nếu có callback
      if (onOrderUpdate) {
        onOrderUpdate(order._id);
      }
    } catch (error) {
      console.error("Error marking combo item as served:", error);
      toast.error(error.response?.data?.message || "Không thể đánh dấu món đã phục vụ!");
    } finally {
      const key = `${orderItemId}-${comboItemIndex}`;
      setMarkingServed(prev => ({ ...prev, [key]: false }));
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
          <div className="mb-3">
            {orderItems?.map((item) => {
              const isCombo = item.itemType === 'menu' && item.comboItems && item.comboItems.length > 0;
              const itemName = item.itemName || item.itemId?.name || "Món đã xóa";
              return (
                <div key={item._id} className="mb-3 pb-2 border-bottom">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <div className="flex-grow-1">
                      <div className="fw-semibold small text-dark">
                        {itemName} × {item.quantity}
                        {isCombo && <Badge bg="primary" className="ms-2">Combo</Badge>}
                        {item.servedBy && (
                          <div className="small text-muted mt-1">
                            Phục vụ: <span className="fw-semibold">
                              {item.servedBy.name || item.servedBy}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Status badge cho món đơn (không phải combo) */}
                      {!isCombo && (
                        <div className="mt-1">
                          <Badge bg={
                            item.status === 'ready' ? 'success' :
                            item.status === 'preparing' ? 'warning' :
                            item.status === 'served' ? 'info' :
                            'secondary'
                          } className="me-2">
                            {item.status || 'pending'}
                          </Badge>
                          {!isPending && canMarkItemServed(item) && item.status === 'ready' && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleMarkItemServed(item._id)}
                              disabled={markingServed[item._id]}
                              className="ms-2"
                            >
                              {markingServed[item._id] ? "..." : "✓ Đã phục vụ"}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Hiển thị các món trong combo với status */}
                  {isCombo && (
                    <div className="ps-3 mt-2">
                      {item.comboItems.map((comboItem, idx) => (
                        <div key={idx} className="mb-2 d-flex justify-content-between align-items-center">
                          <div className="flex-grow-1">
                            <small className="text-muted">└ {comboItem.itemName}</small>
                            {comboItem.servedBy && (
                              <small className="text-muted ms-2">
                                (Phục vụ: {comboItem.servedBy.name || comboItem.servedBy})
                              </small>
                            )}
                            <Badge bg={
                              comboItem.status === 'ready' ? 'success' :
                              comboItem.status === 'preparing' ? 'warning' :
                              comboItem.status === 'served' ? 'info' :
                              'secondary'
                            } className="ms-2">
                              {comboItem.status || 'pending'}
                            </Badge>
                          </div>
                          {!isPending && canMarkComboItemServed(comboItem) && comboItem.status === 'ready' && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleMarkComboItemServed(item._id, idx)}
                              disabled={markingServed[`${item._id}-${idx}`]}
                              className="ms-2"
                            >
                              {markingServed[`${item._id}-${idx}`] ? "..." : "✓ Đã phục vụ"}
                            </Button>
                          )}
                        </div>
                      ))}
                      
                      {/* Status badge cho combo tổng thể */}
                      {item.status && (
                        <div className="mt-2">
                          <small className="text-muted">Trạng thái combo: </small>
                          <Badge bg={
                            item.status === 'ready' ? 'success' :
                            item.status === 'preparing' ? 'warning' :
                            item.status === 'served' ? 'info' :
                            'secondary'
                          }>
                            {item.status}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

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
