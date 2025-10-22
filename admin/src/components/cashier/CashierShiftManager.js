import { useState } from "react"
import { Clock, DollarSign, LogIn, LogOut, User, Calendar, FileText, Plus, Minus, Printer } from "lucide-react";
import "./CashierShiftManager.css";
import CashierDashboard from "./CashierDashboard"

export default function CashierShiftManager() {
  const [shiftData, setShiftData] = useState({
    startTime: null,
    endTime: null,
    openingCash: null,
    closingCash: null,
    isShiftOpen: false,
    pettyCashTransactions: [],
  })

  const [openingAmount, setOpeningAmount] = useState("")
  const [closingAmount, setClosingAmount] = useState("")
  const [showCloseShiftForm, setShowCloseShiftForm] = useState(false)
  const [showBlindCount, setShowBlindCount] = useState(false)
  const [showZReport, setShowZReport] = useState(false)

  const [denominations, setDenominations] = useState([
    { denomination: 500000, count: 0 },
    { denomination: 200000, count: 0 },
    { denomination: 100000, count: 0 },
    { denomination: 50000, count: 0 },
    { denomination: 20000, count: 0 },
    { denomination: 10000, count: 0 },
    { denomination: 5000, count: 0 },
    { denomination: 2000, count: 0 },
    { denomination: 1000, count: 0 },
  ])
  // === Key doanh thu ca (đồng bộ với Dashboard) ===
  const getShiftKey = (shiftStart) => `cashier_sales_${new Date(shiftStart || Date.now()).getTime()}`

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount)
  }

  const formatDateTime = (dateString) => {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(dateString))
  }

  const handleOpenShift = () => {
    const amount = Number.parseFloat(openingAmount)
    if (isNaN(amount) || amount < 0) {
      alert("Vui lòng nhập số tiền hợp lệ")
      return
    }

    const now = new Date().toISOString()
    setShiftData((prev) => ({
      ...prev,
      startTime: now,
      openingCash: amount,
      isShiftOpen: true,
    }))
    setOpeningAmount("")
  }

  const calculateBlindCountTotal = () => {
    return denominations.reduce((total, item) => total + item.denomination * item.count, 0)
  }

  const handleDenominationChange = (denomination, count) => {
    setDenominations((prev) =>
      prev.map((item) => (item.denomination === denomination ? { ...item, count: Math.max(0, count) } : item))
    )
  }

  const handleCompleteBlindCount = () => {
    const total = calculateBlindCountTotal()
    const now = new Date().toISOString()
    setShiftData((prev) => ({
      ...prev,
      endTime: now,
      closingCash: total,
      isShiftOpen: false,
    }))
    setShowBlindCount(false)
    setShowCloseShiftForm(false)
    setShowZReport(true)
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
  // Tổng hợp phiếu thu/chi
  const pettyCashIn = shiftData.pettyCashTransactions
    .filter((t) => t.type === "in")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const pettyCashOut = shiftData.pettyCashTransactions
    .filter((t) => t.type === "out")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  // Doanh thu ca (đã lưu ở Dashboard)
  let cashSales = 0, cardSales = 0;
  try {
    const key = `cashier_sales_${new Date(shiftData.startTime || Date.now()).getTime()}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const sales = JSON.parse(raw);
      cashSales = Number(sales.cash || 0);
      cardSales = Number(sales.card || 0);
    }
  } catch {}

  // === CÔNG THỨC MỚI ===
  const openingCash = Number(shiftData.openingCash || 0);
  const expectedCash = openingCash + pettyCashIn - pettyCashOut + cashSales;

  return {
    reportType: "X-Report",
    reportTime: new Date().toISOString(),
    shiftStart: shiftData.startTime,
    openingCash,
    pettyCashIn,
    pettyCashOut,
    cashSales,
    cardSales,
    salesTotal: cashSales + cardSales,
    expectedCash, // dùng giá trị này để hiển thị "Tiền dự kiến"
  };
};


  const generateZReport = () => {
  const pettyCashIn = shiftData.pettyCashTransactions
    .filter((t) => t.type === "in")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const pettyCashOut = shiftData.pettyCashTransactions
    .filter((t) => t.type === "out")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  let cashSales = 0, cardSales = 0;
  try {
    const key = `cashier_sales_${new Date(shiftData.startTime || Date.now()).getTime()}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const sales = JSON.parse(raw);
      cashSales = Number(sales.cash || 0);
      cardSales = Number(sales.card || 0);
    }
  } catch {}

  const openingCash = Number(shiftData.openingCash || 0);
  const closingCash = Number(shiftData.closingCash || 0);

  // === CÔNG THỨC MỚI ===
  const expectedCash = openingCash + pettyCashIn - pettyCashOut + cashSales;
  const difference = closingCash - expectedCash;

  return {
    reportType: "Z-Report",
    reportTime: shiftData.endTime,
    shiftStart: shiftData.startTime,
    shiftEnd: shiftData.endTime,
    openingCash,
    closingCash,
    pettyCashIn,
    pettyCashOut,
    cashSales,
    cardSales,
    salesTotal: cashSales + cardSales,
    expectedCash,
    difference,
    denominationBreakdown: denominations.filter((d) => d.count > 0),
  };
};


  const handlePrintReport = (reportType) => {
    const report = reportType === "X" ? generateXReport() : generateZReport()
    console.log(`[v0] Printing ${reportType}-Report:`, report)
    alert(`${reportType}-Report đã được tạo! (Xem console để kiểm tra dữ liệu)`)
  }

  const handleCloseShift = () => {
    const amount = Number.parseFloat(closingAmount)
    if (!isNaN(amount) && amount >= 0) {
      const now = new Date().toISOString()
      setShiftData((prev) => ({
        ...prev,
        endTime: now,
        closingCash: amount,
        isShiftOpen: false,
      }))
      setShowCloseShiftForm(false)
      setShowZReport(true)
    }
  }

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
            <button onClick={() => handlePrintReport("Z")} className="button button-success">
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
                  <p className="info-box-value">{zReport.shiftStart && formatDateTime(zReport.shiftStart)}</p>
                </div>
                <div className="info-box">
                  <span className="info-box-label">Giờ kết thúc</span>
                  <p className="info-box-value">{zReport.shiftEnd && formatDateTime(zReport.shiftEnd)}</p>
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
                  <span className="report-value">{formatCurrency(zReport.openingCash || 0)}</span>
                </div>
                <div className="report-line">
                  <span>Phiếu thu trong ca</span>
                  <span className="report-value report-value-success">+{formatCurrency(zReport.pettyCashIn)}</span>
                </div>
                <div className="report-line">
                  <span>Phiếu chi trong ca</span>
                  <span className="report-value report-value-destructive">-{formatCurrency(zReport.pettyCashOut)}</span>
                </div>
                <div className="report-line">
                  <span>Doanh thu tiền mặt</span>
                  <span className="report-value report-value-success">+{formatCurrency(zReport.cashSales || 0)}</span>
                </div>
                <div className="report-line">
                  <span>Doanh thu thẻ/QR</span>
                  <span className="report-value">{formatCurrency(zReport.cardSales || 0)}</span>
                </div>
                <div className="report-line">
                  <span>Tổng doanh thu</span>
                  <span className="report-value">{formatCurrency((zReport.salesTotal) || 0)}</span>
                </div>
                <div className="report-line report-line-total">
                  <span>Tiền dự kiến</span>
                  <span className="report-value">{formatCurrency(zReport.expectedCash)}</span>
                </div>
                <div className="report-line report-line-total">
                  <span>Tiền đếm được</span>
                  <span className="report-value">{formatCurrency(zReport.closingCash || 0)}</span>
                </div>
                <div
                  className={`report-line report-line-highlight ${zReport.difference >= 0 ? "report-line-positive" : "report-line-negative"
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
                    <span className="report-value">{formatCurrency(item.denomination * item.count)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setShowZReport(false)
              setDenominations((prev) => prev.map((d) => ({ ...d, count: 0 })))
            }}
            className="button button-full"
          >
            Hoàn Tất
          </button>
        </div>
      </div>
    )
  }

  if (showBlindCount) {
    const total = calculateBlindCountTotal()
    return (
      <div className="shift-manager-container">
        <div className="shift-manager-content">
          <div className="shift-manager-header">
            <div className="header-title-section">
              <h1 className="header-title">Đếm Tiền Cuối Ca</h1>
              <p className="header-subtitle">Nhập số lượng từng mệnh giá tiền trong két</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Blind Count - Đếm Tiền Không Nhìn Số Dự Kiến</h2>
              <p className="card-description">Đếm số lượng từng loại tiền trong két</p>
            </div>
            <div className="card-content">
              <div className="denomination-grid">
                {denominations.map((item) => (
                  <div key={item.denomination} className="denomination-row">
                    <div className="denomination-label">{formatCurrency(item.denomination)}</div>
                    <div className="denomination-controls">
                      <button
                        onClick={() => handleDenominationChange(item.denomination, item.count - 1)}
                        className="button button-icon-only"
                      >
                        <Minus className="icon-sm" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={item.count}
                        onChange={(e) => handleDenominationChange(item.denomination, Number.parseInt(e.target.value) || 0)}
                        className="denomination-input"
                      />
                      <button
                        onClick={() => handleDenominationChange(item.denomination, item.count + 1)}
                        className="button button-icon-only"
                      >
                        <Plus className="icon-sm" />
                      </button>
                    </div>
                    <div className="denomination-total">{formatCurrency(item.denomination * item.count)}</div>
                  </div>
                ))}
              </div>

              <div className="blind-count-total">
                <span>Tổng tiền đếm được</span>
                <span className="blind-count-amount">{formatCurrency(total)}</span>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => setShowBlindCount(false)}
                  className="button button-full"
                  style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" }}
                >
                  Hủy
                </button>
                <button onClick={handleCompleteBlindCount} className="button button-full button-success">
                  Hoàn Tất Đếm Tiền
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (shiftData.isShiftOpen && !showCloseShiftForm) {
    return (
      <CashierDashboard
        shiftInfo={{
          // fallback nhỏ để tránh null trong JSX
          startTime: shiftData.startTime || new Date().toISOString(),
          openingCash: shiftData.openingCash ?? 0,
        }}
        shiftData={shiftData}
        onCloseShift={() => setShowCloseShiftForm(true)}
        onAddPettyCash={(transaction) => {
          setShiftData((prev) => ({
            ...prev,
            pettyCashTransactions: [...prev.pettyCashTransactions, transaction],
          }))
        }}
        onPrintXReport={() => handlePrintReport("X")}
      />
    )
  }

  if (showCloseShiftForm) {
    return (
      <div className="shift-manager-container">
        <div className="shift-manager-content">
          <div className="shift-manager-header">
            <div className="header-title-section">
              <h1 className="header-title">Đóng Ca Làm Việc</h1>
              <p className="header-subtitle">Chọn phương thức đếm tiền để kết thúc ca</p>
            </div>
          </div>

          <div className="grid-lg-2-cols">
            <div className="card card-clickable" onClick={() => setShowBlindCount(true)}>
              <div className="card-header">
                <div className="card-header-with-icon">
                  <div className="icon-wrapper icon-wrapper-success">
                    <FileText className="icon-success" />
                  </div>
                  <h2 className="card-title">Blind Count</h2>
                </div>
                <p className="card-description">Đếm tiền theo mệnh giá (Khuyến nghị)</p>
              </div>
              <div className="card-content">
                <p className="card-info">Đếm số lượng từng loại tiền mà không thấy số tiền dự kiến, giúp giảm gian lận</p>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-header-with-icon">
                  <div className="icon-wrapper icon-wrapper-destructive">
                    <DollarSign className="icon-destructive" />
                  </div>
                  <h2 className="card-title">Nhập Tổng Tiền</h2>
                </div>
                <p className="card-description">Nhập trực tiếp tổng số tiền</p>
              </div>
              <div className="card-content">
                <div className="input-group">
                  <label htmlFor="closing-cash" className="input-label">
                    Tiền cuối ca (VNĐ)
                  </label>
                  <div className="input-wrapper">
                    <DollarSign className="input-icon" />
                    <input
                      id="closing-cash"
                      type="number"
                      step="1000"
                      placeholder="0"
                      value={closingAmount}
                      onChange={(e) => setClosingAmount(e.target.value)}
                      className="input input-with-icon"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowCloseShiftForm(false)}
            className="button button-full"
            style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" }}
          >
            Hủy
          </button>

          <div style={{ height: ".75rem" }} />

          <button onClick={handleCloseShift} className="button button-full button-destructive">
            <LogOut className="button-icon" />
            Xác nhận đóng ca bằng tổng tiền
          </button>
        </div>
      </div>
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
          <div className="user-badge">
            <User className="user-badge-icon" />
            <div className="user-badge-info">
              <p className="user-badge-name">Thu Ngân</p>
              <p className="user-badge-status">Đang hoạt động</p>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="card card-status">
          <div className="card-header card-header-gradient">
            <div className="shift-manager-header">
              <div>
                <h2 className="card-title">Trạng Thái Ca Làm Việc</h2>
                <p className="card-description">{shiftData.isShiftOpen ? "Ca đang mở" : "Ca đã đóng hoặc chưa mở"}</p>
              </div>
              <div className={`status-badge ${shiftData.isShiftOpen ? "status-badge-open" : "status-badge-closed"}`}>
                {shiftData.isShiftOpen ? "ĐANG MỞ" : "ĐÃ ĐÓNG"}
              </div>
            </div>
          </div>
          <div className="card-content">
            <div className="grid-2-cols">
              {shiftData.startTime && (
                <div className="info-box">
                  <div className="info-box-header">
                    <Calendar className="info-box-icon" />
                    <span className="info-box-label">Thời gian bắt đầu</span>
                  </div>
                  <p className="info-box-value">{formatDateTime(shiftData.startTime)}</p>
                </div>
              )}
              {shiftData.endTime && (
                <div className="info-box">
                  <div className="info-box-header">
                    <Calendar className="info-box-icon" />
                    <span className="info-box-label">Thời gian kết thúc</span>
                  </div>
                  <p className="info-box-value">{formatDateTime(shiftData.endTime)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid-lg-2-cols">
          {/* Open Shift Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-with-icon">
                <div className="icon-wrapper icon-wrapper-success">
                  <LogIn className="icon-success" />
                </div>
                <h2 className="card-title">Mở Ca Làm Việc</h2>
              </div>
              <p className="card-description">Nhập số tiền đầu ca để bắt đầu làm việc</p>
            </div>
            <div className="card-content">
              <div className="input-group">
                <label htmlFor="opening-cash" className="input-label">
                  Tiền đầu ca (VNĐ)
                </label>
                <div className="input-wrapper">
                  <DollarSign className="input-icon" />
                  <input
                    id="opening-cash"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    disabled={shiftData.isShiftOpen}
                    className="input input-with-icon"
                  />
                </div>
              </div>

              {shiftData.openingCash !== null && (
                <div className="amount-display amount-display-success">
                  <p className="amount-label">Tiền đầu ca đã ghi nhận</p>
                  <p className="amount-value amount-value-success">{formatCurrency(shiftData.openingCash)}</p>
                </div>
              )}

              <button onClick={handleOpenShift} disabled={shiftData.isShiftOpen} className="button button-full button-success">
                <LogIn className="button-icon" />
                Mở Ca
              </button>
            </div>
          </div>

          {/* Close Shift Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-with-icon">
                <div className="icon-wrapper icon-wrapper-destructive">
                  <LogOut className="icon-destructive" />
                </div>
                <h2 className="card-title">Đóng Ca Làm Việc</h2>
              </div>
              <p className="card-description">Nhập số tiền đếm được để kết thúc ca làm việc</p>
            </div>
            <div className="card-content">
              <div className="input-group">
                <label htmlFor="closing-cash" className="input-label">
                  Tiền cuối ca (VNĐ)
                </label>
                <div className="input-wrapper">
                  <DollarSign className="input-icon" />
                  <input
                    id="closing-cash"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    disabled={!shiftData.isShiftOpen}
                    className="input input-with-icon"
                  />
                </div>
              </div>

              {shiftData.closingCash !== null && (
                <div className="amount-display amount-display-destructive">
                  <p className="amount-label">Tiền cuối ca đã ghi nhận</p>
                  <p className="amount-value amount-value-destructive">{formatCurrency(shiftData.closingCash)}</p>
                </div>
              )}

              <div style={{ display: "flex", gap: ".75rem" }}>
                <button
                  onClick={() => setShowCloseShiftForm(true)}
                  disabled={!shiftData.isShiftOpen}
                  className="button button-full"
                >
                  Chọn phương thức đếm tiền
                </button>
                <button onClick={handleCloseShift} disabled={!shiftData.isShiftOpen} className="button button-full button-destructive">
                  <LogOut className="button-icon" />
                  Đóng Ca
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        {shiftData.closingCash !== null && shiftData.openingCash !== null && (
          <div className="card card-summary">
            <div className="card-header card-header-gradient">
              <h2 className="card-title">Tổng Kết Ca Làm Việc</h2>
              <p className="card-description">Báo cáo chi tiết về ca làm việc vừa kết thúc</p>
            </div>
            <div className="card-content">
              <div className="grid-3-cols">
                <div className="summary-box">
                  <div className="summary-box-header">
                    <Clock className="summary-box-icon" />
                    <span className="summary-box-label">Thời gian làm việc</span>
                  </div>
                  <p className="summary-box-value">
                    {shiftData.startTime && shiftData.endTime
                      ? `${Math.round(
                        (new Date(shiftData.endTime).getTime() - new Date(shiftData.startTime).getTime()) / (1000 * 60 * 60)
                      )} giờ`
                      : "N/A"}
                  </p>
                </div>

                <div className="summary-box">
                  <div className="summary-box-header">
                    <DollarSign className="summary-box-icon" />
                    <span className="summary-box-label">Doanh thu ca</span>
                  </div>
                  <p className="summary-box-value">{formatCurrency(calculateDifference())}</p>
                </div>

                <div className={`summary-box ${calculateDifference() >= 0 ? "summary-box-positive" : "summary-box-negative"}`}>
                  <div className="summary-box-header">
                    <span className={`summary-box-label ${calculateDifference() >= 0 ? "summary-label-positive" : "summary-label-negative"}`}>
                      Chênh lệch
                    </span>
                  </div>
                  <p className={`summary-box-value ${calculateDifference() >= 0 ? "summary-value-positive" : "summary-value-negative"}`}>
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
