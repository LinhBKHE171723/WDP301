import { useRef, useState, useEffect, useMemo } from "react"
import { User, LogOut, ChevronDown } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import "./CashierDashboard.css"

/**
 * Component tái sử dụng: User Badge với dropdown menu
 * Dùng cho cả CashierDashboard và Profile page
 */
export default function CashierUserBadge() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  // Lấy tên và initials
  const cashierName = user?.name || "Thu ngân"
  const cashierInitials = useMemo(() => {
    if (!cashierName) return "TN"
    const parts = cashierName.trim().split(/\s+/)
    const letters = parts.map((p) => p[0]).join("")
    return letters.slice(-2).toUpperCase()
  }, [cashierName])

  // Đóng menu khi click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Handler Profile
  const handleGoProfile = () => {
    setIsUserMenuOpen(false)
    navigate("/admin/profile")
  }

  // Handler Logout
  const handleLogout = () => {
    setIsUserMenuOpen(false)
    logout()
    navigate("/auth/login", { replace: true })
  }

  return (
    <div className="dashboard-user-wrapper" ref={userMenuRef}>
      <button
        type="button"
        className="user-badge-button"
        onClick={() => setIsUserMenuOpen((v) => !v)}
      >
        <div className="user-avatar-circle">{cashierInitials}</div>
        <div className="user-badge-info">
          <p className="user-badge-name">{cashierName}</p>
          <p className="user-badge-role">Thu ngân</p>
        </div>
        <ChevronDown className="user-badge-chevron" />
      </button>

      {isUserMenuOpen && (
        <div className="user-menu-dropdown">
          <button className="user-menu-item" onClick={handleGoProfile}>
            <User className="user-menu-item-icon" />
            <span>Hồ sơ cá nhân</span>
          </button>
          <div className="user-menu-separator" />
          <button className="user-menu-item logout" onClick={handleLogout}>
            <LogOut className="user-menu-item-icon" />
            <span>Đăng xuất</span>
          </button>
        </div>
      )}
    </div>
  )
}

