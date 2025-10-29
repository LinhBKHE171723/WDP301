// Utility functions for order-related operations

/**
 * Groups order items by name and note for display
 * @param {Array} orderItems - Array of order items
 * @returns {Array} Grouped items
 */
export const groupOrderItems = (orderItems) => {
  const grouped = {};
  
  orderItems?.forEach((orderItem) => {
    const itemName = orderItem.itemName || orderItem.itemId?.name || 'Món ăn';
    const note = orderItem.note || '';
    const key = `${itemName}-${note}`;
    
    if (!grouped[key]) {
      grouped[key] = {
        name: itemName,
        note: note,
        price: orderItem.price,
        itemType: orderItem.itemType,
        totalQuantity: 0,
        items: [],
        statusCounts: {}
      };
    }
    
    grouped[key].totalQuantity += orderItem.quantity;
    grouped[key].items.push(orderItem);
    
    // Count items by status
    const status = orderItem.status || 'pending';
    if (!grouped[key].statusCounts[status]) {
      grouped[key].statusCounts[status] = 0;
    }
    grouped[key].statusCounts[status] += orderItem.quantity;
  });
  
  return Object.values(grouped);
};

/**
 * Gets Vietnamese text for order status
 * @param {string} status - Order status
 * @returns {string} Vietnamese status text
 */
export const getStatusText = (status) => {
  const statusMap = {
    'pending': 'Chờ xử lý',
    'waiting_confirm': 'Chờ xác nhận',
    'confirmed': 'Đã xác nhận',
    'preparing': 'Đang chuẩn bị',
    'ready': 'Sẵn sàng',
    'served': 'Đã phục vụ',
    'paid': 'Đã phục vụ', // Gộp "paid" vào "served"
    'cancelled': 'Đã hủy'
  };
  return statusMap[status] || status;
};

/**
 * Gets CSS class for order status
 * @param {string} status - Order status
 * @returns {string} CSS class name
 */
export const getStatusClass = (status) => {
  const classMap = {
    'pending': 'status-pending',
    'waiting_confirm': 'status-waiting',
    'confirmed': 'status-confirmed',
    'preparing': 'status-preparing',
    'ready': 'status-ready',
    'served': 'status-served',
    'paid': 'status-served', // Gộp "paid" vào "served" - cùng CSS class
    'cancelled': 'status-cancelled'
  };
  return classMap[status] || 'status-default';
};

/**
 * Gets color for order status
 * @param {string} status - Order status
 * @returns {string} Color hex code
 */
export const getStatusColor = (status) => {
  const colorMap = {
    'pending': '#ffc107',
    'preparing': '#17a2b8',
    'ready': '#28a745',
    'served': '#6f42c1',
    'paid': '#20c997',
    'cancelled': '#dc3545'
  };
  return colorMap[status] || '#6c757d';
};

/**
 * Gets Vietnamese text for order item status
 * @param {string} status - Order item status
 * @returns {string} Vietnamese status text
 */
export const getItemStatusText = (status) => {
  const statusMap = {
    'pending': 'Chờ xử lý',
    'preparing': 'Đang chuẩn bị',
    'ready': 'Sẵn sàng',
    'served': 'Đã phục vụ'
  };
  return statusMap[status] || status;
};

/**
 * Formats date to Vietnamese locale string
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string
 */
export const formatOrderDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

