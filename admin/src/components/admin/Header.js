import { Input } from "../ui/admin/input";
import { Button } from "../ui/admin/button";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="container-page flex items-center justify-between">
      <div className="text-2xl font-semibold">Tổng quan</div>
      <div className="flex items-center gap-3">
        <div className="w-72">
          <Input placeholder="Tìm kiếm..." />
        </div>
        <Button variant="outline">Xuất báo cáo</Button>
        <div className="flex items-center gap-3 border-l pl-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">
              {user?.name || "Admin"}
            </p>
            <p className="text-xs text-gray-500">
              {user?.role === "admin" ? "Quản trị viên" : user?.role}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Button>
        </div>
      </div>
    </header>
  );
}
