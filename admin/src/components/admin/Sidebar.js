import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { BarChart3, Utensils, Users, MessageSquare, Settings, LayoutDashboard, PieChart, Calendar, History, Menu, X } from 'lucide-react';

export default function Sidebar() {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  
  // Cập nhật lại các mục menu - thêm prefix /admin/
  const items = [
    { to: "/admin/preorders", label: "Đặt trước", icon: Calendar },
    { to: "/admin/orders", label: "Lịch sử đơn hàng", icon: History },
    { to: "/admin/analytics", label: "Báo cáo Doanh thu", icon: BarChart3 },
    { to: "/admin/item-report", label: "Báo cáo Món ăn", icon: Utensils },
    { to: "/admin/accounts", label: "Tài khoản", icon: Users },
    { to: "/admin/feedback", label: "Feedback", icon: MessageSquare },
    { to: "/admin/customers", label: "khách hàng thân thiết", icon: Users },
    { to: "/admin/performance", label: "Hsuat nhan vien", icon: PieChart  },
    { to: "/admin/settings", label: "Cài đặt", icon: Settings },
  ];

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md border border-gray-200"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-screen w-64 bg-white shadow-lg z-40
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <aside className="w-64 min-h-screen border-r bg-white p-4 sticky top-0">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-indigo-600">Admin Dashboard</h1>
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-100 rounded"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="space-y-1">
            {items.map(it => {
              // Check if current path matches the menu item
              // Handle /admin vs /admin/ and exact matches for sub-routes
              const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
              const normalizedTo = it.to.endsWith('/') ? it.to.slice(0, -1) : it.to;
              const active = normalizedPath === normalizedTo || 
                (it.to === "/admin/" && (pathname === "/admin" || pathname === "/admin/"));
              return (
                <Link 
                  key={it.to} 
                  to={it.to}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active 
                      ? "bg-indigo-50 text-indigo-700" 
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <it.icon className="mr-3 h-5 w-5" />
                  {it.label}
                </Link>
              );
            })}
          </nav>
        </aside>
      </div>
    </>
  );
}