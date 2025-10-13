import { useState, useEffect } from "react"
import { Clock, DollarSign, LogIn, LogOut, User, Calendar } from "lucide-react"
import "./CashierShiftManager.css"

// === FAKE DATABASE ===
const SHIFT_KEY = "fake_shift_data"
function saveShift(data) { localStorage.setItem(SHIFT_KEY, JSON.stringify(data)) }
function getShift() {
  const raw = localStorage.getItem(SHIFT_KEY)
  return raw ? JSON.parse(raw) : null
}
function clearShift() { localStorage.removeItem(SHIFT_KEY) }
// ======================

function CashierShiftManager() {
  const [shiftData, setShiftData] = useState({
    startTime: null,
    endTime: null,
    openingCash: null,
    closingCash: null,
    isShiftOpen: false,
  })
  const [openingAmount, setOpeningAmount] = useState("")
  const [closingAmount, setClosingAmount] = useState("")

  // Load dữ liệu “DB giả” khi mở trang
  useEffect(() => {
    const data = getShift()
    if (data) setShiftData(data)
  }, [])

  // Lưu mỗi khi shiftData thay đổi
  useEffect(() => {
    saveShift(shiftData)
  }, [shiftData])

  const formatCurrency = (amount) => {
    const safe = typeof amount === "number" ? amount : 0
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(safe)
  }

  const handleOpenShift = () => {
    const amount = parseFloat(openingAmount)
    if (isNaN(amount) || amount < 0) return alert("Vui lòng nhập số tiền hợp lệ")

    const now = new Date().toISOString()
    const newShift = {
      startTime: now,
      endTime: null,
      openingCash: amount,
      closingCash: null,
      isShiftOpen: true,
    }
    setShiftData(newShift)
    setOpeningAmount("")
  }

  const handleCloseShift = () => {
    const amount = parseFloat(closingAmount)
    if (isNaN(amount) || amount < 0) return alert("Vui lòng nhập số tiền hợp lệ")

    const now = new Date().toISOString()
    const closed = {
      ...shiftData,
      endTime: now,
      closingCash: amount,
      isShiftOpen: false,
    }
    setShiftData(closed)
    setClosingAmount("")
  }

  const calculateDifference = () => {
    if (shiftData.openingCash && shiftData.closingCash) {
      return shiftData.closingCash - shiftData.openingCash
    }
    return 0
  }

  const resetFakeDB = () => {
    clearShift()
    setShiftData({
      startTime: null,
      endTime: null,
      openingCash: null,
      closingCash: null,
      isShiftOpen: false,
    })
  }

  return (
    <div className="cashier-container">
      <header className="header">
        <h1>Quản lý ca làm việc</h1>
        <div className="user-info">
          <User className="icon" />
          <span>Thu ngân đang hoạt động</span>
        </div>
      </header>

      <div className="shift-status">
        <p>{shiftData.isShiftOpen ? "Ca đang mở" : "Chưa mở ca"}</p>
      </div>

      <div className="shift-panels">
        <div className="shift-card">
          <h2><LogIn className="icon" /> Mở ca</h2>
          <input
            type="number"
            placeholder="Tiền đầu ca"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            disabled={shiftData.isShiftOpen}
          />
          <button className="open-btn" onClick={handleOpenShift} disabled={shiftData.isShiftOpen}>
            Mở Ca
          </button>
        </div>

        <div className="shift-card">
          <h2><LogOut className="icon" /> Đóng ca</h2>
          <input
            type="number"
            placeholder="Tiền cuối ca"
            value={closingAmount}
            onChange={(e) => setClosingAmount(e.target.value)}
            disabled={!shiftData.isShiftOpen}
          />
          <button className="close-btn" onClick={handleCloseShift} disabled={!shiftData.isShiftOpen}>
            Đóng Ca
          </button>
        </div>
      </div>

      {shiftData.closingCash && (
        <div className="summary">
          <p><Calendar className="icon" /> Bắt đầu: {new Date(shiftData.startTime).toLocaleString("vi-VN")}</p>
          <p><Calendar className="icon" /> Kết thúc: {new Date(shiftData.endTime).toLocaleString("vi-VN")}</p>
          <p><DollarSign className="icon" /> Chênh lệch: {formatCurrency(calculateDifference())}</p>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        <button onClick={resetFakeDB}>🧹 Xóa dữ liệu fake</button>
      </div>
    </div>
  )
}

export default CashierShiftManager
