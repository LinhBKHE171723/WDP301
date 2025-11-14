import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import CashierUserBadge from "./CashierUserBadge";
import "./CashierDashboard.css";

/**
 * Header đơn giản cho cashier - tái sử dụng user badge từ dashboard
 * Dùng cho trang Profile và các trang khác của cashier
 * @param {boolean} showBackButton - Hiển thị nút quay lại
 * @param {string} backPath - Đường dẫn quay lại (mặc định: /admin/cashier/dashboard)
 */
export default function CashierHeader({ showBackButton = false, backPath = "/admin/cashier/dashboard" }) {
    const navigate = useNavigate();
    
    const handleBack = () => {
        navigate(backPath);
    };
    
    return (
        <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
            <div className="dashboard-header-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Nút quay lại */}
                    {showBackButton && (
                        <button 
                            onClick={handleBack} 
                            className="button button-secondary"
                            style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                padding: '0.5rem 1rem'
                            }}
                        >
                            <ArrowLeft className="button-icon" />
                            Quay lại
                        </button>
                    )}
                    
                    {/* Logo */}
                    <div 
                        className="dashboard-title-section"
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate("/admin/cashier/dashboard")}
                    >
                        <h1 className="dashboard-title" style={{ fontSize: '1.5rem', margin: 0 }}>
                            🍽️ Nhà hàng WDP
                        </h1>
                    </div>
                </div>

                {/* User Badge - tái sử dụng từ dashboard */}
                <CashierUserBadge />
            </div>
        </div>
    );
}

