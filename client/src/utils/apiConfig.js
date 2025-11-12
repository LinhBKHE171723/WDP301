// API configuration constants

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Helper function to resolve WebSocket URL
const resolveWebSocketUrl = () => {
  // If explicit WebSocket URL is provided, use it
  if (process.env.REACT_APP_WS_URL) {
    return process.env.REACT_APP_WS_URL;
  }
  
  // Otherwise, derive from API_BASE_URL
  try {
    const apiUrl = new URL(API_BASE_URL);
    const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = apiUrl.host;
    return `${wsProtocol}//${wsHost}/ws`;
  } catch (error) {
    // Fallback to default if URL parsing fails
    return 'ws://localhost:5000/ws';
  }
};

export const WEBSOCKET_URL = resolveWebSocketUrl();

export const API_ENDPOINTS = {
  // Customer endpoints
  CUSTOMER: {
    TABLES: `${API_BASE_URL}/customer/table`,
    MENUS: `${API_BASE_URL}/customer/menus`,
    ALL_MENUS: `${API_BASE_URL}/customer/menus/all`,
    MENU_BY_ID: (id) => `${API_BASE_URL}/customer/menus/${id}`,
    ITEMS: `${API_BASE_URL}/customer/items`,
    ALL_ITEMS: `${API_BASE_URL}/customer/items/all`,
    ITEM_BY_ID: (id) => `${API_BASE_URL}/customer/items/${id}`,
    ORDERS: `${API_BASE_URL}/customer/orders`,
    ORDER_BY_ID: (id) => `${API_BASE_URL}/customer/orders/${id}`,
    USER_ORDERS: `${API_BASE_URL}/customer/user/orders`,
    ADD_ITEMS_TO_ORDER: (id) => `${API_BASE_URL}/customer/orders/${id}/items`,
    CANCEL_ORDER_ITEM: (orderId, itemId) => `${API_BASE_URL}/customer/orders/${orderId}/items/${itemId}`,
    CONFIRM_ORDER: (id) => `${API_BASE_URL}/customer/orders/${id}/confirm`,
    START_EDIT_ORDER: (id) => `${API_BASE_URL}/customer/orders/${id}/start-edit`,
    REQUEST_PAYMENT: (id) => `${API_BASE_URL}/customer/orders/${id}/request-payment`,
    ORDER_CAN_FEEDBACK: (id) => `${API_BASE_URL}/customer/orders/${id}/can-feedback`,
    ORDER_FEEDBACK: (id) => `${API_BASE_URL}/customer/orders/${id}/feedback`,
    PREORDERS: `${API_BASE_URL}/customer/preorders`,
    ORDER_EMPLOYEES: (id) => `${API_BASE_URL}/customer/orders/${id}/employees`,
    LOYALTY_INFO: `${API_BASE_URL}/customer/loyalty-info`
  },
  
  // Auth endpoints
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    CHECK_ME: `${API_BASE_URL}/auth/checkme`,
    FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgotPassword`,
    VERIFY_RESET_TOKEN: `${API_BASE_URL}/auth/verifyResetToken`,
    RESET_PASSWORD: `${API_BASE_URL}/auth/resetPassword`
  },
  
  // User endpoints
  USER: {
    PROFILE: `${API_BASE_URL}/user/profile`,
    UPDATE_PROFILE: `${API_BASE_URL}/user/updateProfile`
  },
  
  // WebSocket
  WEBSOCKET: WEBSOCKET_URL
};

