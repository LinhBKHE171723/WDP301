// API configuration constants

export const API_BASE_URL = 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  // Customer endpoints
  CUSTOMER: {
    TABLES: `${API_BASE_URL}/customer/table`,
    MENUS: `${API_BASE_URL}/customer/menus`,
    MENU_BY_ID: (id) => `${API_BASE_URL}/customer/menus/${id}`,
    ITEMS: `${API_BASE_URL}/customer/items`,
    ITEM_BY_ID: (id) => `${API_BASE_URL}/customer/items/${id}`,
    ORDERS: `${API_BASE_URL}/customer/orders`,
    ORDER_BY_ID: (id) => `${API_BASE_URL}/customer/orders/${id}`,
    USER_ORDERS: `${API_BASE_URL}/customer/user/orders`,
    ADD_ITEMS_TO_ORDER: (id) => `${API_BASE_URL}/customer/orders/${id}/items`,
    CANCEL_ORDER_ITEM: (orderId, itemId) => `${API_BASE_URL}/customer/orders/${orderId}/items/${itemId}`,
    ORDER_CAN_FEEDBACK: (id) => `${API_BASE_URL}/customer/orders/${id}/can-feedback`,
    ORDER_FEEDBACK: (id) => `${API_BASE_URL}/customer/orders/${id}/feedback`
  },
  
  // Auth endpoints
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    CHECK_ME: `${API_BASE_URL}/auth/checkme`
  },
  
  // WebSocket
  WEBSOCKET: 'ws://localhost:5000/ws'
};

