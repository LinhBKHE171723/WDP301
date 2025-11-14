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
    <header className="container-page flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
      <div className="text-xl sm:text-2xl font-semibold">Tổng quan</div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="flex-1 sm:flex-none sm:w-72">
          <Input placeholder="Tìm kiếm..." />
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">
              {user?.name || "Admin"}
            </p>
            <p className="text-xs text-gray-500">
              {user?.role === "admin" ? "Quản trị viên" : user?.role}
            </p>
          </div>
          <div className="text-right sm:hidden">
            <p className="text-xs font-semibold text-gray-900">
              {user?.name || "Admin"}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-1 sm:gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm px-2 sm:px-4"
          >
            <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
