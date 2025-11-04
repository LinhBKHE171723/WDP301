import { eraseCookie } from './cookie';

/**
 * Wrapper cho fetch với xử lý 401 tự động
 * Nếu nhận lỗi 401 (Unauthorized), tự động clear cookies và redirect
 */
export const authenticatedFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    
    // Nếu lỗi 401 (Unauthorized) - token invalid hoặc user không tồn tại
    if (response.status === 401) {
      console.log('Token invalid - clearing cookies and redirecting to home');
      
      // Clear cookies
      eraseCookie("customer_token");
      eraseCookie("customer_user");
      eraseCookie("current_order_id");
      
      // Redirect về trang chủ (không redirect to login vì customer app không có login page riêng)
      window.location.href = "/";
      
      throw new Error("Unauthorized");
    }
    
    return response;
  } catch (error) {
    // Nếu đã handle 401 rồi thì không throw lại
    if (error.message === "Unauthorized") {
      throw error;
    }
    
    throw error;
  }
};

