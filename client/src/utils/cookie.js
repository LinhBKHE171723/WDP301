// setCookie: days is optional; defaults to 7
export function setCookie(name, value, days = 7) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const secure = isHttps ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}; ${expires}; path=/; SameSite=Lax${secure}`;
}

export function getCookie(name) {
  const target = `${encodeURIComponent(name)}=`;
  const decoded = document.cookie.split("; ");
  for (const part of decoded) {
    if (part.indexOf(target) === 0) {
      const raw = part.substring(target.length);
      try {
        return decodeURIComponent(raw);
      } catch (_) {
        return raw;
      }
    }
  }
  return null;
}

export function eraseCookie(name) {
  // Set expiration to past date
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

// Guest Order History Cookie Management
const GUEST_ORDER_IDS_COOKIE = 'guest_order_ids';
const MAX_GUEST_ORDERS = 50; // Giới hạn số lượng order để tránh cookie quá lớn

export function addOrderIdToCookie(orderId) {
  try {
    const existingIds = getGuestOrderIds();
    
    // Thêm order ID mới vào đầu mảng (order mới nhất sẽ ở đầu)
    const updatedIds = [orderId, ...existingIds.filter(id => id !== orderId)];
    
    // Giới hạn số lượng order IDs
    const limitedIds = updatedIds.slice(0, MAX_GUEST_ORDERS);
    
    // Lưu vào cookie với thời gian sống 365 ngày (gần như vĩnh viễn)
    setCookie(GUEST_ORDER_IDS_COOKIE, JSON.stringify(limitedIds), 365);
    
    return limitedIds;
  } catch (error) {
    console.error('Error adding order ID to cookie:', error);
    return [];
  }
}

export function getGuestOrderIds() {
  try {
    const cookieValue = getCookie(GUEST_ORDER_IDS_COOKIE);
    if (!cookieValue) return [];
    
    const parsedIds = JSON.parse(cookieValue);
    return Array.isArray(parsedIds) ? parsedIds : [];
  } catch (error) {
    console.error('Error parsing guest order IDs from cookie:', error);
    return [];
  }
}

export function removeOrderIdFromCookie(orderId) {
  try {
    const existingIds = getGuestOrderIds();
    const updatedIds = existingIds.filter(id => id !== orderId);
    
    if (updatedIds.length === 0) {
      eraseCookie(GUEST_ORDER_IDS_COOKIE);
    } else {
      setCookie(GUEST_ORDER_IDS_COOKIE, JSON.stringify(updatedIds), 365);
    }
    
    return updatedIds;
  } catch (error) {
    console.error('Error removing order ID from cookie:', error);
    return [];
  }
}

export function clearGuestOrderIds() {
  try {
    eraseCookie(GUEST_ORDER_IDS_COOKIE);
    return [];
  } catch (error) {
    console.error('Error clearing guest order IDs:', error);
    return [];
  }
}




