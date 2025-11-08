import { useEffect, useRef } from "react";
import { toast } from "sonner";
import useAdminWebSocket from "../../hooks/useAdminWebSocket";
import { useAuth } from "../../context/AuthContext";

const formatCurrency = (amount) => {
  if (!amount) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

/**
 * Component to handle WebSocket notifications for preorders
 * This component should be placed in the admin layout to show notifications on all admin pages
 */
export default function AdminPreOrderNotification() {
  const { user } = useAuth();
  const userRole = user?.role || 'admin';
  
  // Track preorders that have already shown toast to avoid duplicates
  const shownToastRef = useRef(new Set());

  // WebSocket connection for real-time preorder updates
  const { lastMessage } = useAdminWebSocket();

  // Listen for new preorders via WebSocket
  useEffect(() => {
    if (!lastMessage) return;

    // Handle new preorder event
    // Admin chỉ nhận đơn lớn, Cashier chỉ nhận đơn nhỏ (backend đã filter)
    if (lastMessage.type === 'preorder:new') {
      const newPreorder = lastMessage.data;
      
      if (newPreorder && newPreorder._id) {
        const preorderId = String(newPreorder._id);
        
        // Show toast notification for new preorder (only if not shown before)
        if (!shownToastRef.current.has(preorderId)) {
          const customerName = newPreorder?.userId?.name || "Khách hàng";
          const scheduledTime = newPreorder?.scheduledTime 
            ? new Date(newPreorder.scheduledTime).toLocaleString("vi-VN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Chưa có";
          const totalAmount = newPreorder?.totalAmount || 0;
          
          toast.info(`🆕 Có đơn đặt trước mới!`, {
            description: `Khách hàng: ${customerName} | Thời gian: ${scheduledTime} | Tổng tiền: ${formatCurrency(totalAmount)}`,
            duration: 5000,
          });
          
          // Mark this preorder as shown
          shownToastRef.current.add(preorderId);
          
          // Clean up old entries after 5 minutes to prevent memory leak
          setTimeout(() => {
            shownToastRef.current.delete(preorderId);
          }, 5 * 60 * 1000);
          
          console.log('✅ New preorder notification shown:', preorderId);
        }
      }
    }
  }, [lastMessage]);

  // This component doesn't render anything
  return null;
}

