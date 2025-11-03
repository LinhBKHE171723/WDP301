import React, { useEffect, useState } from "react";
import { Container, Card, Spinner, Table as BSTable, Button } from "react-bootstrap";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "./Header";
import waiterApi from "../../api/waiterApi";
import { useAuth } from "../../context/AuthContext";
import useWaiterWebSocket from "../../hooks/useWaiterWebSocket";

export default function TableDetail() {
  const { tableId } = useParams();
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markingServed, setMarkingServed] = useState({}); // Track which item is being marked
  const { logout, user } = useAuth();

  // WebSocket hook - truyền userId để server biết waiter nào đang kết nối
  const { lastMessage, connectionState } = useWaiterWebSocket(user?.id);

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

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      console.log('📨 TableDetail received WebSocket message:', lastMessage);

      // Handle item:ready notification
      if (lastMessage.type === 'item:ready' || lastMessage.type === 'comboItem:ready') {
        const data = lastMessage.data;
        if (data && table) {
          // Refresh table details to show updated status
          fetchTableDetails();
          
          // Show notification
          const itemName = data.itemName || data.comboItemName || "Món ăn";
          toast.info(`🔔 ${itemName} đã sẵn sàng phục vụ tại bàn ${data.tableNumber}!`, {
            autoClose: 5000
          });
        }
      }

      // Handle order:updated
      if (lastMessage.type === 'order:updated') {
        const updatedOrder = lastMessage.data;
        if (table && table.orderNow) {
          setTable(prevTable => {
            if (!prevTable) return prevTable;
            const updatedOrders = prevTable.orderNow.map(order => 
              order._id === updatedOrder._id ? updatedOrder : order
            );
            return { ...prevTable, orderNow: updatedOrders };
          });
        }
      }
    }
  }, [lastMessage, table]);

  // Handle mark item as served
  const handleMarkItemServed = async (orderItemId) => {
    try {
      setMarkingServed(prev => ({ ...prev, [orderItemId]: true }));
      await waiterApi.markOrderItemServed(orderItemId);
      toast.success("Đã đánh dấu món đã phục vụ!");
      fetchTableDetails(); // Refresh
    } catch (error) {
      console.error("Error marking item as served:", error);
      toast.error(error.response?.data?.message || "Không thể đánh dấu món đã phục vụ!");
    } finally {
      setMarkingServed(prev => ({ ...prev, [orderItemId]: false }));
    }
  };

  // Handle mark combo item as served
  const handleMarkComboItemServed = async (orderItemId, comboItemIndex) => {
    try {
      const key = `${orderItemId}-${comboItemIndex}`;
      setMarkingServed(prev => ({ ...prev, [key]: true }));
      await waiterApi.markComboItemServed(orderItemId, comboItemIndex);
      toast.success("Đã đánh dấu món trong combo đã phục vụ!");
      fetchTableDetails(); // Refresh
    } catch (error) {
      console.error("Error marking combo item as served:", error);
      toast.error(error.response?.data?.message || "Không thể đánh dấu món đã phục vụ!");
    } finally {
      const key = `${orderItemId}-${comboItemIndex}`;
      setMarkingServed(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">
      <Header onLogout={logout} user={user} />

      <Container className="flex-grow-1 mt-4 pb-5">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
          <h4 className="fw-bold text-dark mb-3 mb-md-0">Chi tiết bàn</h4>
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
              </div>
            </Card>

            <h5 className="fw-bold mb-3">🧾 Orders hiện tại ({table.orderNow?.length || 0})</h5>
            {!table.orderNow || table.orderNow.length === 0 ? (
              <p className="text-muted">Bàn này hiện chưa có order nào.</p>
            ) : (
              table.orderNow.map((order, index) => (
                <Card key={order._id} className="p-3 mb-4 shadow-sm border-start border-4 border-warning bg-white">
                  <div className="d-flex flex-wrap justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold mb-1">
                      Order #{order._id.slice(-5)}
                    </h6>
                    <span className="badge bg-secondary">
                      {order.status}
                    </span>
                  </div>
                  <p className="mb-1 text-muted">
                    Tổng tiền:{" "}
                    <span className="fw-semibold text-dark">
                      {order.totalAmount?.toLocaleString()}₫
                    </span>
                  </p>
                  {order.servedBy && (
                    <p className="mb-1 text-muted">
                      Phục vụ bởi: <span className="fw-semibold">{order.servedBy.name}</span>
                    </p>
                  )}

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
                        {order.orderItems?.map((oi) => {
                          const isCombo = oi.itemType === 'menu' && oi.comboItems && oi.comboItems.length > 0;
                          const itemName = oi.itemName || oi.itemId?.name || "N/A";
                          const canMarkServed = order.servedBy && user && order.servedBy._id?.toString() === user.id?.toString();
                          return (
                            <React.Fragment key={oi._id}>
                              <tr>
                                <td>
                                  <div className="fw-semibold">
                                    {itemName}
                                    {isCombo && <span className="badge bg-primary ms-2">Combo</span>}
                                  </div>
                                </td>
                            <td>{oi.quantity}</td>
                            <td>{oi.price?.toLocaleString()}₫</td>
                                <td>
                                  <div className="d-flex align-items-center gap-2">
                                    <span className={`badge ${
                                      oi.status === 'ready' ? 'bg-success' :
                                      oi.status === 'preparing' ? 'bg-warning' :
                                      oi.status === 'served' ? 'bg-info' :
                                      'bg-secondary'
                                    }`}>
                                      {oi.status}
                                    </span>
                                    {!isCombo && canMarkServed && oi.status === 'ready' && (
                                      <Button
                                        size="sm"
                                        variant="success"
                                        onClick={() => handleMarkItemServed(oi._id)}
                                        disabled={markingServed[oi._id]}
                                        className="ms-auto"
                                      >
                                        {markingServed[oi._id] ? "..." : "✓ Đã phục vụ"}
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {/* Hiển thị các món trong combo */}
                              {isCombo && oi.comboItems.map((comboItem, idx) => (
                                <tr key={`${oi._id}-combo-${idx}`} className="bg-light">
                                  <td className="ps-4">
                                    <div className="d-flex align-items-center gap-2">
                                      <small className="text-muted">└ {comboItem.itemName}</small>
                                      {canMarkServed && comboItem.status === 'ready' && (
                                        <Button
                                          size="sm"
                                          variant="success"
                                          onClick={() => handleMarkComboItemServed(oi._id, idx)}
                                          disabled={markingServed[`${oi._id}-${idx}`]}
                                          className="ms-auto"
                                        >
                                          {markingServed[`${oi._id}-${idx}`] ? "..." : "✓ Đã phục vụ"}
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                  <td>-</td>
                                  <td>-</td>
                                  <td>
                                    <small className={`badge ${
                                      comboItem.status === 'ready' ? 'bg-success' :
                                      comboItem.status === 'preparing' ? 'bg-warning' :
                                      comboItem.status === 'served' ? 'bg-info' :
                                      'bg-secondary'
                                    }`}>
                                      {comboItem.status}
                                    </small>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
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
