import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/admin/dialog';
import { formatCurrency } from './PreOrderTable';

const localizer = momentLocalizer(moment);

// Format date cho calendar
const formatDate = (iso) => {
  if (!iso) return null;
  return new Date(iso);
};

// Kiểm tra overlap giữa 2 preorders (cùng bàn, thời gian trùng lấn)
// Sử dụng preparationStartTime và reservedEndTime nếu có, nếu không thì dùng scheduledTime
const checkOverlap = (order1, order2) => {
  // Chỉ kiểm tra nếu cả 2 đều đã được gán bàn
  if (!order1.tableId || !order2.tableId) return false;
  if (order1.tableId._id?.toString() !== order2.tableId._id?.toString()) return false;
  
  // Nếu có reservedEndTime thì dùng để kiểm tra overlap chính xác
  if (order1.reservedEndTime && order2.reservedEndTime) {
    const start1 = order1.preparationStartTime ? new Date(order1.preparationStartTime) : new Date(order1.scheduledTime);
    const end1 = new Date(order1.reservedEndTime);
    const start2 = order2.preparationStartTime ? new Date(order2.preparationStartTime) : new Date(order2.scheduledTime);
    const end2 = new Date(order2.reservedEndTime);
    
    // Kiểm tra overlap: start1 < end2 && start2 < end1
    return start1 < end2 && start2 < end1;
  }
  
  // Nếu không có reservedEndTime, fallback về logic cũ (kiểm tra scheduledTime trong vòng 2 giờ)
  if (!order1.scheduledTime || !order2.scheduledTime) return false;
  
  const time1 = new Date(order1.scheduledTime);
  const time2 = new Date(order2.scheduledTime);
  const timeDiff = Math.abs(time1.getTime() - time2.getTime());
  const twoHours = 2 * 60 * 60 * 1000; // 2 giờ
  
  return timeDiff < twoHours;
};

export default function PreOrderCalendar({ preorders, onSelectEvent }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());

  // Chuyển đổi preorders thành events cho calendar
  const events = useMemo(() => {
    if (!preorders || !Array.isArray(preorders)) return [];
    
    // Tìm các preorder bị overlap
    const overlapMap = new Map();
    for (let i = 0; i < preorders.length; i++) {
      for (let j = i + 1; j < preorders.length; j++) {
        if (checkOverlap(preorders[i], preorders[j])) {
          const id1 = preorders[i]._id.toString();
          const id2 = preorders[j]._id.toString();
          
          if (!overlapMap.has(id1)) overlapMap.set(id1, []);
          if (!overlapMap.has(id2)) overlapMap.set(id2, []);
          
          overlapMap.get(id1).push(id2);
          overlapMap.get(id2).push(id1);
        }
      }
    }
    
    return preorders
      .filter(order => order.scheduledTime) // Chỉ hiển thị preorder có scheduledTime
      .map(order => {
        const scheduledTime = formatDate(order.scheduledTime);
        if (!scheduledTime) return null;
        
        // Sử dụng reservedEndTime nếu có, nếu không thì hiển thị 30 phút
        let endTime;
        if (order.reservedEndTime) {
          endTime = new Date(order.reservedEndTime);
        } else {
          // Fallback: hiển thị 30 phút nếu chưa có reservedEndTime
          endTime = new Date(scheduledTime.getTime() + 30 * 60 * 1000);
        }
        
        // Sử dụng preparationStartTime nếu có, nếu không thì dùng scheduledTime
        let startTime = scheduledTime;
        if (order.preparationStartTime) {
          startTime = new Date(order.preparationStartTime);
        }
        
        const hasOverlap = overlapMap.has(order._id.toString());
        const overlappingOrders = hasOverlap ? overlapMap.get(order._id.toString()) : [];
        
        // Màu sắc: đỏ nếu overlap, xanh nếu approved, vàng nếu pending
        let backgroundColor = '#3b82f6'; // Xanh mặc định
        if (hasOverlap) {
          backgroundColor = '#ef4444'; // Đỏ nếu overlap
        } else if (order.waiterResponse?.status === 'approved') {
          backgroundColor = '#10b981'; // Xanh lá nếu approved
        } else if (order.waiterResponse?.status === 'pending') {
          backgroundColor = '#f59e0b'; // Vàng nếu pending
        } else if (order.waiterResponse?.status === 'rejected') {
          backgroundColor = '#6b7280'; // Xám nếu rejected
        }
        
        // Format scheduledTime để hiển thị
        const timeStr = scheduledTime.toLocaleTimeString('vi-VN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        return {
          id: order._id,
          title: `${timeStr} - Bàn ${order.tableId?.tableNumber || 'Chưa gán'} - ${order.userId?.name || 'Khách vãng lai'}`,
          start: startTime,
          end: endTime,
          resource: {
            order,
            hasOverlap,
            overlappingOrders
          },
          style: {
            backgroundColor,
            color: 'white',
            border: hasOverlap ? '3px solid #dc2626' : '1px solid rgba(0,0,0,0.1)',
            borderRadius: '4px',
            padding: '2px 4px',
            fontSize: '12px'
          }
        };
      })
      .filter(event => event !== null);
  }, [preorders]);

  const eventStyleGetter = (event) => {
    return {
      style: event.style
    };
  };

  const handleSelectEvent = (event) => {
    setSelectedOrder(event.resource.order);
    if (onSelectEvent) {
      onSelectEvent(event.resource.order);
    }
  };

  return (
    <div className="h-[600px] w-full">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={handleSelectEvent}
        messages={{
          next: 'Sau',
          previous: 'Trước',
          today: 'Hôm nay',
          month: 'Tháng',
          week: 'Tuần',
          day: 'Ngày',
          agenda: 'Lịch trình',
          date: 'Ngày',
          time: 'Giờ',
          event: 'Sự kiện',
          noEventsInRange: 'Không có đơn đặt trước trong khoảng thời gian này'
        }}
        popup
        showMultiDayTimes
      />
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
          <span>Đã duyệt</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
          <span>Đang chờ</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
          <span>Bị trùng lấn</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6b7280' }}></div>
          <span>Đã từ chối</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
          <span>Khác</span>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-black">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn đặt trước</DialogTitle>
            <DialogDescription>
              {selectedOrder && `Mã đơn: ${String(selectedOrder._id).slice(-8)}`}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Thông tin khách hàng */}
              <div>
                <h3 className="font-semibold text-lg mb-2">Thông tin khách hàng</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Tên:</span>{' '}
                    <span className="font-medium">{selectedOrder.userId?.name || 'Khách vãng lai'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>{' '}
                    <span className="font-medium">{selectedOrder.userId?.email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">SĐT:</span>{' '}
                    <span className="font-medium">{selectedOrder.userId?.phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Bàn:</span>{' '}
                    <span className="font-medium">
                      {selectedOrder.tableId ? `Bàn ${selectedOrder.tableId.tableNumber}` : 'Chưa gán'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Thời gian đặt:</span>{' '}
                    <span className="font-medium">
                      {selectedOrder.scheduledTime
                        ? new Date(selectedOrder.scheduledTime).toLocaleString('vi-VN')
                        : '-'}
                    </span>
                  </div>
                  {selectedOrder.preparationStartTime && (
                    <div>
                      <span className="text-gray-500">Thời gian bắt đầu chuẩn bị:</span>{' '}
                      <span className="font-medium">
                        {new Date(selectedOrder.preparationStartTime).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  )}
                  {selectedOrder.reservedEndTime && (
                    <div>
                      <span className="text-gray-500">Thời gian kết thúc dành bàn:</span>{' '}
                      <span className="font-medium">
                        {new Date(selectedOrder.reservedEndTime).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Trạng thái:</span>{' '}
                    <span className="font-medium">
                      {selectedOrder.waiterResponse?.status === 'approved'
                        ? 'Đã duyệt'
                        : selectedOrder.waiterResponse?.status === 'pending'
                        ? 'Đang chờ'
                        : 'Đã từ chối'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cảnh báo overlap */}
              {events.find(e => e.id === selectedOrder._id)?.resource.hasOverlap && (
                <div className="bg-red-50 border-2 border-red-500 rounded-lg p-3">
                  <h4 className="font-semibold text-red-700 mb-2">⚠️ Cảnh báo: Bị trùng lấn</h4>
                  <p className="text-sm text-red-600">
                    Đơn này có thời gian trùng với đơn khác ở cùng bàn. Vui lòng kiểm tra và điều chỉnh.
                  </p>
                </div>
              )}

              {/* Chi tiết món ăn */}
              {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Chi tiết món ăn</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left p-2">Món ăn</th>
                          <th className="text-left p-2">SL</th>
                          <th className="text-left p-2">Đơn giá</th>
                          <th className="text-left p-2">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.orderItems.map((item, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="p-2">{item.itemName || '-'}</td>
                            <td className="p-2">{item.quantity || 0}</td>
                            <td className="p-2">{formatCurrency(item.price || 0)}</td>
                            <td className="p-2">
                              {formatCurrency((item.price || 0) * (item.quantity || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tổng tiền */}
              <div>
                <h3 className="font-semibold text-lg mb-2">Tổng tiền</h3>
                <div className="text-lg font-bold text-blue-600">
                  {formatCurrency(selectedOrder.totalAmount || 0)}
                </div>
                {selectedOrder.totalPaid > 0 && (
                  <div className="text-sm text-gray-600 mt-1">
                    Đã thanh toán: {formatCurrency(selectedOrder.totalPaid)}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

