import React from "react";
import CashierHeader from "./CashierHeader";
import "./CashierDashboard.css";

/**
 * Layout wrapper cho các trang của cashier
 * Cung cấp header và container nhất quán
 * @param {React.ReactNode} children - Nội dung trang
 * @param {boolean} showBackButton - Hiển thị nút quay lại trong header
 * @param {string} backPath - Đường dẫn quay lại (mặc định: /admin/cashier/dashboard)
 */
export default function CashierLayout({ children, showBackButton = true, backPath = "/admin/cashier/dashboard" }) {
  return (
    <div className="dashboard-container">
      <CashierHeader showBackButton={showBackButton} backPath={backPath} />
      {children}
    </div>
  );
}

