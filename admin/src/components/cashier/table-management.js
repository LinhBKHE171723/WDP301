import { useState } from "react"
import { Users, ArrowLeftRight, Merge, Split, ArrowLeft, Clock, DollarSign } from "lucide-react"
import "./table-management.css"

function TableManagement({ onBack }) {
  const [selectedTables, setSelectedTables] = useState([])
  const [showActions, setShowActions] = useState(false)
  const [tables, setTables] = useState([
    {
      id: "1",
      number: 1,
      capacity: 4,
      status: "occupied",
      orderType: "dine-in",
      orderNumber: "ĐH-001",
      orderAmount: 450000,
      orderTime: "14:30",
      guests: 3,
    },
    { id: "2", number: 2, capacity: 2, status: "available" },
    {
      id: "3",
      number: 3,
      capacity: 6,
      status: "occupied",
      orderType: "dine-in",
      orderNumber: "ĐH-002",
      orderAmount: 680000,
      orderTime: "15:00",
      guests: 5,
    },
    { id: "4", number: 4, capacity: 4, status: "reserved", orderType: "dine-in", orderTime: "18:00", guests: 4 },
    { id: "5", number: 5, capacity: 2, status: "available" },
    {
      id: "6",
      number: 6,
      capacity: 8,
      status: "occupied",
      orderType: "dine-in",
      orderNumber: "ĐH-003",
      orderAmount: 920000,
      orderTime: "14:00",
      guests: 7,
    },
    { id: "7", number: 7, capacity: 4, status: "available" },
    {
      id: "8",
      number: 8,
      capacity: 4,
      status: "occupied",
      orderType: "dine-in",
      orderNumber: "ĐH-004",
      orderAmount: 320000,
      orderTime: "15:30",
      guests: 2,
    },
    { id: "9", number: 9, capacity: 2, status: "available" },
    { id: "10", number: 10, capacity: 6, status: "reserved", orderType: "dine-in", orderTime: "19:00", guests: 6 },
    { id: "11", number: 11, capacity: 4, status: "available" },
    {
      id: "12",
      number: 12,
      capacity: 4,
      status: "occupied",
      orderType: "dine-in",
      orderNumber: "ĐH-005",
      orderAmount: 550000,
      orderTime: "14:45",
      guests: 4,
    },
  ])

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount)

  const handleTableClick = (tableId) => {
    if (selectedTables.includes(tableId)) {
      setSelectedTables(selectedTables.filter((id) => id !== tableId))
    } else {
      setSelectedTables([...selectedTables, tableId])
    }
  }

  const handleMergeTables = () => {
    if (selectedTables.length < 2) {
      alert("Vui lòng chọn ít nhất 2 bàn để gộp")
      return
    }
    alert(
      `Gộp ${selectedTables.length} bàn: ${selectedTables
        .map((id) => tables.find((t) => t.id === id)?.number)
        .join(", ")}`
    )
    setSelectedTables([])
  }

  const handleSplitTable = () => {
    if (selectedTables.length !== 1) {
      alert("Vui lòng chọn 1 bàn để tách")
      return
    }
    alert(`Tách bàn ${tables.find((t) => t.id === selectedTables[0])?.number}`)
    setSelectedTables([])
  }

  const handleTransferTable = () => {
    if (selectedTables.length !== 2) {
      alert("Vui lòng chọn 2 bàn để chuyển (bàn nguồn và bàn đích)")
      return
    }
    const sourceTable = tables.find((t) => t.id === selectedTables[0])
    const targetTable = tables.find((t) => t.id === selectedTables[1])
    alert(`Chuyển đơn từ bàn ${sourceTable?.number} sang bàn ${targetTable?.number}`)
    setSelectedTables([])
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return "table-available"
      case "occupied":
        return "table-occupied"
      case "reserved":
        return "table-reserved"
      default:
        return ""
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "available":
        return "Trống"
      case "occupied":
        return "Đang dùng"
      case "reserved":
        return "Đã đặt"
      default:
        return ""
    }
  }

  const stats = {
    total: tables.length,
    available: tables.filter((t) => t.status === "available").length,
    occupied: tables.filter((t) => t.status === "occupied").length,
    reserved: tables.filter((t) => t.status === "reserved").length,
  }

  return (
    <div className="table-management-container">
      <div className="table-management-header">
        <button onClick={onBack} className="button button-back">
          <ArrowLeft className="button-icon" />
          Quay lại
        </button>
        <div className="header-title-section">
          <h1 className="header-title">Quản Lý Bàn</h1>
          <p className="header-subtitle">Sơ đồ bàn và trạng thái</p>
        </div>
      </div>

      <div className="table-stats-bar">
        <div className="stat-item">
          <div className="stat-label">Tổng số bàn</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item stat-available">
          <div className="stat-label">Bàn trống</div>
          <div className="stat-value">{stats.available}</div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item stat-occupied">
          <div className="stat-label">Đang dùng</div>
          <div className="stat-value">{stats.occupied}</div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item stat-reserved">
          <div className="stat-label">Đã đặt</div>
          <div className="stat-value">{stats.reserved}</div>
        </div>
      </div>

      {selectedTables.length > 0 && (
        <div className="action-bar">
          <div className="action-bar-info">
            <span className="action-bar-text">Đã chọn {selectedTables.length} bàn</span>
            <button onClick={() => setSelectedTables([])} className="button button-clear">
              Bỏ chọn
            </button>
          </div>
          <div className="action-bar-buttons">
            <button onClick={handleMergeTables} className="button button-action">
              <Merge className="button-icon" />
              Gộp bàn
            </button>
            <button onClick={handleSplitTable} className="button button-action">
              <Split className="button-icon" />
              Tách bàn
            </button>
            <button onClick={handleTransferTable} className="button button-action">
              <ArrowLeftRight className="button-icon" />
              Chuyển bàn
            </button>
          </div>
        </div>
      )}

      <div className="tables-grid">
        {tables.map((table) => (
          <div
            key={table.id}
            className={`table-card ${getStatusColor(table.status)} ${
              selectedTables.includes(table.id) ? "table-selected" : ""
            }`}
            onClick={() => handleTableClick(table.id)}
          >
            <div className="table-card-header">
              <div className="table-number">Bàn {table.number}</div>
              <div className={`table-status-badge ${getStatusColor(table.status)}`}>
                {getStatusText(table.status)}
              </div>
            </div>

            <div className="table-card-body">
              <div className="table-info-row">
                <Users className="table-icon" />
                <span>
                  {table.guests || 0}/{table.capacity} người
                </span>
              </div>

              {table.orderNumber && (
                <>
                  <div className="table-divider"></div>
                  <div className="table-order-info">
                    <div className="order-number">{table.orderNumber}</div>
                    <div className="table-info-row">
                      <Clock className="table-icon" />
                      <span>{table.orderTime}</span>
                    </div>
                    {table.orderAmount && (
                      <div className="table-info-row">
                        <DollarSign className="table-icon" />
                        <span className="order-amount">{formatCurrency(table.orderAmount)}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {table.status === "reserved" && table.orderTime && (
                <>
                  <div className="table-divider"></div>
                  <div className="table-order-info">
                    <div className="table-info-row">
                      <Clock className="table-icon" />
                      <span>Đặt lúc {table.orderTime}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {selectedTables.includes(table.id) && (
              <div className="table-selected-indicator">
                <div className="selected-checkmark">✓</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="legend-section">
        <h3 className="legend-title">Chú thích</h3>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color legend-color-available"></div>
            <span>Bàn trống</span>
          </div>
          <div className="legend-item">
            <div className="legend-color legend-color-occupied"></div>
            <span>Đang sử dụng</span>
          </div>
          <div className="legend-item">
            <div className="legend-color legend-color-reserved"></div>
            <span>Đã đặt trước</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TableManagement
