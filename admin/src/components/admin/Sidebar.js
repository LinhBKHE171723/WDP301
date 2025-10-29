import { Link, useLocation } from "react-router-dom";
import { BarChart3, Utensils, Users, MessageSquare, Settings, LayoutDashboard, PieChart } from 'lucide-react';

export default function Sidebar() {
  const { pathname } = useLocation();
  
  // Cập nhật lại các mục menu - thêm prefix /admin/
  const items = [
    { to: "/admin/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/analytics", label: "Báo cáo Doanh thu", icon: BarChart3 },
    { to: "/admin/item-report", label: "Báo cáo Món ăn", icon: Utensils },
    { to: "/admin/accounts", label: "Tài khoản", icon: Users },
    { to: "/admin/feedback", label: "Feedback", icon: MessageSquare },
    { to: "/admin/customers", label: "khách hàng thân thiết", icon: Users },
    { to: "/admin/performance", label: "Hsuat nhan vien", icon: PieChart  },
    { to: "/admin/settings", label: "Cài đặt", icon: Settings },
  ];

  return (
    <div className="fixed top-0 left-0 h-screen w-64 bg-white shadow-lg">
      <aside className="w-64 min-h-screen border-r bg-white p-4 sticky top-0">
        <h1 className="text-xl font-bold mb-6 text-indigo-600">Admin Dashboard</h1>
        <nav className="space-y-1">
          {items.map(it => {
            // Check if current path matches the menu item
            // Handle /admin vs /admin/ and exact matches for sub-routes
            const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
            const normalizedTo = it.to.endsWith('/') ? it.to.slice(0, -1) : it.to;
            const active = normalizedPath === normalizedTo || 
              (it.to === "/admin/" && (pathname === "/admin" || pathname === "/admin/"));
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