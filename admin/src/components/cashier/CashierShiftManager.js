import { useState, useEffect } from "react"
import {
  Clock,
  DollarSign,
  LogIn,
  LogOut,
  User,
  Calendar,
  Printer,
  ChevronDown,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import userApi from "../../api/userApi"
import "./CashierShiftManager.css"
import CashierDashboard from "./CashierDashboard"

export default function CashierShiftManager() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const displayName =
    user?.fullName || user?.name || user?.username || user?.email || "Thu Ngân"

  // Shift từ API (điểm danh)
  const [shift, setShift] = useState(null)
  const [loadingShift, setLoadingShift] = useState(true)

  // Dữ liệu tiền và giao dịch
  const [shiftData, setShiftData] = useState({
    startTime: null,
    endTime: null,
    openingCash: null,
    closingCash: null,
    isShiftOpen: false,
    pettyCashTransactions: [],
  })

  const [showZReport, setShowZReport] = useState(false)

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount)
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return "Chưa có"
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(dateString))
  }

  const formatTime = (time) => {
    if (!time) return "Chưa"
    return new Date(time).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Load shift từ API
  const loadShift = async () => {
    try {
      setLoadingShift(true)
      const res = await userApi.getTodayShift()
      setShift(res.shift)
      
      // Cập nhật shiftData từ shift
      if (res.shift) {
        setShiftData((prev) => ({
          ...prev,
          startTime: res.shift.startTime || null,
          endTime: res.shift.endTime || null,
          isShiftOpen: !!res.shift.startTime && !res.shift.endTime,
        }))
      }
    } catch (err) {
      console.error("Error loading shift:", err)
      toast.error(err?.message || "Lỗi khi lấy ca làm hôm nay")
    } finally {
      setLoadingShift(false)
    }
  }

  useEffect(() => {
    loadShift()
  }, [])

  // Check-in (đơn giản, không cần nhập tiền)
  const handleCheckIn = async () => {
    try {
      await userApi.checkIn()
      toast.success("Check-in thành công!")
      
      // Cập nhật shiftData
      const now = new Date().toISOString()
      setShiftData((prev) => ({
        ...prev,
        startTime: now,
        isShiftOpen: true,
      }))
      
      // Reload shift để lấy dữ liệu mới nhất
      await loadShift()
      
      // Tự động chuyển vào dashboard sau khi check-in
      navigate("/admin/cashier/dashboard")
    } catch (err) {
      toast.error(err?.message || "Check-in thất bại!")
    }
  }

  // Check-out (đơn giản, không cần nhập tiền)
  const handleCheckOut = async () => {
    try {
      await userApi.checkOut()
      toast.success("✅ Check-out thành công!")
      
      // Cập nhật shiftData
      const now = new Date().toISOString()
      setShiftData((prev) => ({
        ...prev,
        endTime: now,
        isShiftOpen: false,
      }))
      
      // Reload shift để lấy dữ liệu mới nhất
      await loadShift()
    } catch (err) {
      toast.error(err?.message || "Check-out thất bại!")
    }
  }



  const calculateDifference = () => {
    if (shiftData.openingCash !== null && shiftData.closingCash !== null) {
      const pettyCashTotal = shiftData.pettyCashTransactions.reduce(
        (sum, t) => sum + (t.type === "in" ? t.amount : -t.amount),
        0
      )
      return shiftData.closingCash - shiftData.openingCash - pettyCashTotal
    }
    return 0
  }

  const generateXReport = () => {
    const pettyCashTotal = shiftData.pettyCashTransactions.reduce(
      (sum, t) => sum + (t.type === "in" ? t.amount : -t.amount),
      0
    )
    const expectedCash = (shiftData.openingCash || 0) + pettyCashTotal

    return {
      reportType: "X-Report",
      reportTime: new Date().toISOString(),
      shiftStart: shiftData.startTime,
      openingCash: shiftData.openingCash,
      pettyCashIn: shiftData.pettyCashTransactions
        .filter((t) => t.type === "in")
        .reduce((s, t) => s + t.amount, 0),
      pettyCashOut: shiftData.pettyCashTransactions
        .filter((t) => t.type === "out")
        .reduce((s, t) => s + t.amount, 0),
      expectedCash,
    }
  }

  const generateZReport = () => {
    const pettyCashTotal = shiftData.pettyCashTransactions.reduce(
      (sum, t) => sum + (t.type === "in" ? t.amount : -t.amount),
      0
    )
    const expectedCash = (shiftData.openingCash || 0) + pettyCashTotal
    const difference = (shiftData.closingCash || 0) - expectedCash

    return {
      reportType: "Z-Report",
      reportTime: shiftData.endTime,
      shiftStart: shiftData.startTime,
      shiftEnd: shiftData.endTime,
      openingCash: shiftData.openingCash,
      closingCash: shiftData.closingCash,
      pettyCashIn: shiftData.pettyCashTransactions
        .filter((t) => t.type === "in")
        .reduce((s, t) => s + t.amount, 0),
      pettyCashOut: shiftData.pettyCashTransactions
        .filter((t) => t.type === "out")
        .reduce((s, t) => s + t.amount, 0),
      expectedCash,
      difference,
      denominationBreakdown: [],
    }
  }

  const handlePrintReport = (reportType) => {
    const report = reportType === "X" ? generateXReport() : generateZReport()
    console.log(`[v0] Printing ${reportType}-Report:`, report)
    alert(`${reportType}-Report đã được tạo! (Xem console để kiểm tra dữ liệu)`)
  }


  if (loadingShift) {
    return (
      <div className="shift-manager-container">
        <div className="shift-manager-content">
          <p>Đang tải thông tin ca làm hôm nay...</p>
        </div>
      </div>
    )
  }

  if (!shift) {
    return (
      <div className="shift-manager-container">
        <div className="shift-manager-content">
          <div className="shift-manager-header">
            <div className="header-title-section">
              <h1 className="header-title">Quản Lý Ca Làm Việc</h1>
              <p className="header-subtitle">Hệ thống thu ngân nhà hàng</p>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Không có ca làm việc hôm nay</h2>
            </div>
            <div className="card-content">
              <div style={{ padding: "1rem 0" }}>
                <p style={{ marginBottom: "1rem", color: "var(--muted-foreground)" }}>
                  Bạn chưa có ca làm việc được gán cho hôm nay. Có thể do:
                </p>
                <ul style={{ marginLeft: "1.5rem", marginBottom: "1rem", color: "var(--muted-foreground)" }}>
                  <li>Bạn chưa được gán vào ca làm việc nào trong hệ thống</li>
                  <li>Ca làm việc của bạn chưa được kích hoạt (isActive = false)</li>
                  <li>Hệ thống chưa tạo shift cho bạn (cron job có thể chưa chạy)</li>
                </ul>
                <p style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "var(--muted)", borderRadius: "0.5rem", color: "var(--muted-foreground)" }}>
                  <strong>Giải pháp:</strong> Vui lòng liên hệ quản trị viên để được gán vào ca làm việc trong phần <strong>Settings → Quản lý ca làm việc</strong>.
                </p>
                <button
                  onClick={loadShift}
                  className="button button-full"
                  style={{ marginTop: "1rem" }}
                >
                  🔄 Tải lại
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { workShiftId, status, startTime, endTime } = shift
  const canCheckIn = status === "pending"
  const canCheckOut = (status === "checked_in" || status === "late") && !endTime

  if (showZReport) {
    const zReport = generateZReport()
    return (
      <div className="shift-manager-container">
        <div className="shift-manager-content">
          <div className="shift-manager-header">
            <div className="header-title-section">
              <h1 className="header-title">Z-Report - Báo Cáo Cuối Ca</h1>
              <p className="header-subtitle">Tổng kết chi tiết ca làm việc</p>
            </div>
            <button
              onClick={() => handlePrintReport("Z")}
              className="button button-success"
            >
              <Printer className="button-icon" />
              In Z-Report
            </button>
          </div>

          <div className="card">
            <div className="card-header card-header-gradient">
              <h2 className="card-title">Thông Tin Ca Làm Việc</h2>
            </div>
            <div className="card-content">
              <div className="grid-2-cols">
                <div className="info-box">
                  <span className="info-box-label">Giờ bắt đầu</span>
                  <p className="info-box-value">
                    {zReport.shiftStart && formatDateTime(zReport.shiftStart)}
                  </p>
                </div>
                <div className="info-box">
                  <span className="info-box-label">Giờ kết thúc</span>
                  <p className="info-box-value">
                    {zReport.shiftEnd && formatDateTime(zReport.shiftEnd)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid-lg-2-cols">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Két Tiền</h2>
              </div>
              <div className="card-content">
                <div className="report-line">
                  <span>Tiền đầu ca</span>
                  <span className="report-value">
                    {formatCurrency(zReport.openingCash || 0)}
                  </span>
                </div>
                <div className="report-line">
                  <span>Phiếu thu trong ca</span>
                  <span className="report-value report-value-success">
                    +{formatCurrency(zReport.pettyCashIn)}
                  </span>
                </div>
                <div className="report-line">
                  <span>Phiếu chi trong ca</span>
                  <span className="report-value report-value-destructive">
                    -{formatCurrency(zReport.pettyCashOut)}
                  </span>
                </div>
                <div className="report-line report-line-total">
                  <span>Tiền dự kiến</span>
                  <span className="report-value">
                    {formatCurrency(zReport.expectedCash)}
                  </span>
                </div>
                <div className="report-line report-line-total">
                  <span>Tiền đếm được</span>
                  <span className="report-value">
                    {formatCurrency(zReport.closingCash || 0)}
                  </span>
                </div>
                <div
                  className={`report-line report-line-highlight ${
                    zReport.difference >= 0
                      ? "report-line-positive"
                      : "report-line-negative"
                  }`}
                >
                  <span>Chênh lệch</span>
                  <span className="report-value">
                    {zReport.difference >= 0 ? "+" : ""}
                    {formatCurrency(zReport.difference)}
                  </span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Chi Tiết Mệnh Giá</h2>
              </div>
              <div className="card-content">
                {zReport.denominationBreakdown.map((item) => (
                  <div key={item.denomination} className="report-line">
                    <span>
                      {formatCurrency(item.denomination)} × {item.count}
                    </span>
                    <span className="report-value">
                      {formatCurrency(item.denomination * item.count)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setShowZReport(false)
            }}
            className="button button-full"
          >
            Hoàn Tất
          </button>
        </div>
      </div>
    )
  }


  // Chỉ hiển thị CashierDashboard khi đã check-in và chưa check-out
  if (shiftData.isShiftOpen && !showZReport) {
    return (
      <CashierDashboard
        shiftInfo={{
          // fallback nhỏ để tránh null trong JSX
          startTime: shiftData.startTime || shift?.startTime || new Date().toISOString(),
          openingCash: shiftData.openingCash ?? 0,
        }}
        shiftData={shiftData}
        onCloseShift={handleCheckOut}
        onAddPettyCash={(transaction) => {
          setShiftData((prev) => ({
            ...prev,
            pettyCashTransactions: [
              ...prev.pettyCashTransactions,
              transaction,
            ],
          }))
        }}
        onPrintXReport={() => handlePrintReport("X")}
      />
    )
  }

  return (
    <div className="shift-manager-container">
      <div className="shift-manager-content">
        {/* Header */}
        <div className="shift-manager-header">
          <div className="header-title-section">
            <h1 className="header-title">Quản Lý Ca Làm Việc</h1>
            <p className="header-subtitle">Hệ thống thu ngân nhà hàng</p>
          </div>

          <div className="user-badge-wrapper">
            <button
              type="button"
              className="user-badge"
              onClick={() => setShowUserMenu((v) => !v)}
            >
              <User className="user-badge-icon" />
              <div className="user-badge-info">
                <p className="user-badge-name">{displayName}</p>
                <p className="user-badge-status">Đang hoạt động</p>
              </div>
              <ChevronDown className="user-badge-chevron" />
            </button>

            {showUserMenu && (
              <div className="user-menu">
                <button
                  className="user-menu-item"
                  onClick={() => {
                    setShowUserMenu(false)
                    navigate("/profile")
                  }}
                >
                  <User className="user-menu-icon" />
                  Hồ sơ cá nhân
                </button>
                <button
                  className="user-menu-item user-menu-item-danger"
                  onClick={() => {
                    setShowUserMenu(false)
                    logout()
                    navigate("/auth/login", { replace: true })
                  }}
                >
                  <LogOut className="user-menu-icon" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Card */}
        <div className="card card-status">
          <div className="card-header card-header-gradient">
            <div className="shift-manager-header">
              <div>
                <h2 className="card-title">Trạng Thái Ca Làm Việc</h2>
                <p className="card-description">
                  {workShiftId?.name || "N/A"} - {workShiftId?.startTime || ""} → {workShiftId?.endTime || ""}
                </p>
              </div>
              <div
                className={`status-badge ${
                  shiftData.isShiftOpen
                    ? "status-badge-open"
                    : "status-badge-closed"
                }`}
              >
                {shiftData.isShiftOpen ? "ĐANG LÀM VIỆC" : status === "checked_out" ? "ĐÃ KẾT THÚC" : "CHƯA BẮT ĐẦU"}
              </div>
            </div>
          </div>
          <div className="card-content">
            <div className="grid-2-cols">
              <div className="info-box">
                <div className="info-box-header">
                  <Calendar className="info-box-icon" />
                  <span className="info-box-label">Check-in</span>
                </div>
                <p className="info-box-value">
                  {formatTime(startTime)}
                </p>
              </div>
              <div className="info-box">
                <div className="info-box-header">
                  <Calendar className="info-box-icon" />
                  <span className="info-box-label">Check-out</span>
                </div>
                <p className="info-box-value">
                  {formatTime(endTime)}
                </p>
              </div>
            </div>
            <div className="grid-2-cols" style={{ marginTop: "1rem" }}>
              <div className="info-box">
                <div className="info-box-header">
                  <span className="info-box-label">Trạng thái</span>
                </div>
                <p className="info-box-value">
                  {status === "pending" ? "Chưa bắt đầu" : 
                   status === "checked_in" ? "Đã check-in" :
                   status === "late" ? "Đi trễ" :
                   status === "checked_out" ? "Đã check-out" :
                   status === "early_leave" ? "Về sớm" :
                   status === "absent" ? "Vắng mặt" : status}
                </p>
              </div>
              {shift.lateMinutes > 0 && (
                <div className="info-box">
                  <div className="info-box-header">
                    <span className="info-box-label">Đi trễ</span>
                  </div>
                  <p className="info-box-value" style={{ color: "var(--destructive)" }}>
                    {shift.lateMinutes} phút
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Check-in Card - chỉ hiển thị khi chưa check-in */}
        {canCheckIn && (
          <div className="card">
            <div className="card-header">
              <div className="card-header-with-icon">
                <div className="icon-wrapper icon-wrapper-success">
                  <LogIn className="icon-success" />
                </div>
                <h2 className="card-title">Check-in</h2>
              </div>
              <p className="card-description">
                Bắt đầu ca làm việc
              </p>
            </div>
            <div className="card-content">
              <button
                onClick={handleCheckIn}
                className="button button-full button-success"
                style={{ fontSize: "1.1rem", padding: "1rem" }}
              >
                <LogIn className="button-icon" />
                Check-In
              </button>
            </div>
          </div>
        )}

        {/* Summary Card */}
        {shiftData.closingCash !== null &&
          shiftData.openingCash !== null && (
            <div className="card card-summary">
              <div className="card-header card-header-gradient">
                <h2 className="card-title">Tổng Kết Ca Làm Việc</h2>
                <p className="card-description">
                  Báo cáo chi tiết về ca làm việc vừa kết thúc
                </p>
              </div>
              <div className="card-content">
                <div className="grid-3-cols">
                  <div className="summary-box">
                    <div className="summary-box-header">
                      <Clock className="summary-box-icon" />
                      <span className="summary-box-label">
                        Thời gian làm việc
                      </span>
                    </div>
                    <p className="summary-box-value">
                      {shiftData.startTime && shiftData.endTime
                        ? `${Math.round(
                            (new Date(shiftData.endTime).getTime() -
                              new Date(shiftData.startTime).getTime()) /
                              (1000 * 60 * 60)
                          )} giờ`
                        : "N/A"}
                    </p>
                  </div>

                  <div className="summary-box">
                    <div className="summary-box-header">
                      <DollarSign className="summary-box-icon" />
                      <span className="summary-box-label">Doanh thu ca</span>
                    </div>
                    <p className="summary-box-value">
                      {formatCurrency(calculateDifference())}
                    </p>
                  </div>

                  <div
                    className={`summary-box ${
                      calculateDifference() >= 0
                        ? "summary-box-positive"
                        : "summary-box-negative"
                    }`}
                  >
                    <div className="summary-box-header">
                      <span
                        className={`summary-box-label ${
                          calculateDifference() >= 0
                            ? "summary-label-positive"
                            : "summary-label-negative"
                        }`}
                      >
                        Chênh lệch
                      </span>
                    </div>
                    <p
                      className={`summary-box-value ${
                        calculateDifference() >= 0
                          ? "summary-value-positive"
                          : "summary-value-negative"
                      }`}
                    >
                      {calculateDifference() >= 0 ? "+" : ""}
                      {formatCurrency(calculateDifference())}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  )
}
