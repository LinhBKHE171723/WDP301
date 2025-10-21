import { Link, useLocation } from "react-router-dom";
import { BarChart3, Utensils, Users, MessageSquare, Settings, LayoutDashboard } from 'lucide-react';

export default function Sidebar() {
  const { pathname } = useLocation();
  
  // Cập nhật lại các mục menu
  const items = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/analytics", label: "Báo cáo Doanh thu", icon: BarChart3 },
    { to: "/item-report", label: "Báo cáo Món ăn", icon: Utensils }, // <-- TRANG MỚI
    { to: "/accounts", label: "Tài khoản", icon: Users },
    { to: "/feedback", label: "Feedback", icon: MessageSquare },
    { to: "/settings", label: "Cài đặt", icon: Settings },
  ];

  return (
    <div className="fixed top-0 left-0 h-screen w-64 bg-white shadow-lg">
      <aside className="w-64 min-h-screen border-r bg-white p-4 sticky top-0">
        <h1 className="text-xl font-bold mb-6 text-indigo-600">Admin Dashboard</h1>
        <nav className="space-y-1">
          {items.map(it => {
            const active = pathname === it.to;
            return (
              <Link key={it.to} to={it.to}
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
  );
}