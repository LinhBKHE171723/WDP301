import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import CashierDashboard from "./CashierDashboard"

const SHIFT_KEY = "fake_shift_data"

function CashierDashboardPage() {
  const navigate = useNavigate()

  const shiftInfo = useMemo(() => {
    const saved = localStorage.getItem(SHIFT_KEY)
    const parsed = saved ? JSON.parse(saved) : null
    // Fallback an toàn nếu không có dữ liệu
    return parsed
      ? { startTime: parsed.startTime, openingCash: parsed.openingCash ?? 0 }
      : { startTime: new Date().toISOString(), openingCash: 0 }
  }, [])

  const handleCloseShift = () => {
    navigate("/cashier/shift")
  }

  return <CashierDashboard shiftInfo={shiftInfo} onCloseShift={handleCloseShift} />
}

export default CashierDashboardPage
