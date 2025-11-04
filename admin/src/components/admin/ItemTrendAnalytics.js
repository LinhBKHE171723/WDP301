import React, { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  Bar,
  Legend,
  BarChart
} from "recharts";
import { Clock, TrendingUp, DollarSign, XCircle } from "lucide-react";

/**
 * ✅ FIX HOÀN CHỈNH – CÁCH 1:
 *  • from = 30 ngày trước, to = hôm nay (tự động).
 *  • Không phụ thuộc useParams/useLocation.
 *  • Giữ nguyên toàn bộ UI + logic xử lý dữ liệu.
 */

const formatCurrency = (amount) => {
  if (typeof amount !== "number" || isNaN(amount)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
};

export default function ItemTrendAnalytics({ itemId, itemName = "Chi Tiết Món Ăn" }) {
  const today = new Date().toISOString().split("T")[0];
  const lastMonth = new Date();
  lastMonth.setDate(lastMonth.getDate() - 30);
  const lastMonthStr = lastMonth.toISOString().split("T")[0];

  const [summaryData, setSummaryData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: "monthly",
    from: lastMonthStr,
    to: today,
    metric: "totalQuantity",
  });

  const API_BASE_URL = "http://localhost:5000/api/admin";

  const safeJsonParse = (text) => {
    let clean = text.replace(/^\uFEFF/, "");
    const firstBrace = clean.indexOf("{");
    if (firstBrace > 0) clean = clean.slice(firstBrace);
    return JSON.parse(clean);
  };

  useEffect(() => {
    if (!itemId) {
      setError("Không có ID món ăn nào được cung cấp.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const normalizedType = ["daily", "monthly", "yearly"].includes(
          (filters.type || "").toLowerCase()
        )
          ? filters.type
          : "monthly";

        const params = new URLSearchParams({
          itemId,
          type: normalizedType,
          from: filters.from,
          to: filters.to,
        });

        const res = await fetch(`${API_BASE_URL}/items/trend?${params.toString()}`);
        const rawText = await res.text();
        if (!res.ok) {
          try {
            const maybeJson = safeJsonParse(rawText);
            throw new Error(maybeJson?.message || `HTTP ${res.status}`);
          } catch {
            throw new Error(`HTTP ${res.status}`);
          }
        }

        const parsed = safeJsonParse(rawText);
        const payload = parsed?.data || {};
        let trend = Array.isArray(payload.trend) ? payload.trend : [];
        const summary = payload.summary || null;

        trend = trend.map((t) => ({
          ...t,
          totalQuantity: Number(t.totalQuantity) || 0,
          totalRevenue: Number(t.totalRevenue) || 0,
          cancellationRate: Number(t.cancellationRate) || 0,
          avgServiceTimeMinutes: Number(t.avgServiceTimeMinutes) || 0,
        
           revenue: Number(t.totalRevenue) || 0,
  cost: Number(t.totalExpense || t.cost || 0),
  profit: Number(t.totalProfit || t.profit || (t.totalRevenue - (t.totalExpense || 0)) || 0),

        }));

      if (trend.length === 1) {
  const copy = { ...trend[0] };
  copy.__isDuplicate = true;
  copy.label = null;
  trend.push(copy);
}
setTrendData(trend);

        setSummaryData(summary);
      } catch (e) {
        console.error("❌ Fetch Trend Error:", e);
        setError(e.message || "Đã xảy ra lỗi không xác định.");
        setTrendData([]);
        setSummaryData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [itemId, filters.type, filters.from, filters.to]);

  const metricOptions = [
    { key: "totalQuantity", label: "Số Lượng Bán", icon: TrendingUp, color: "blue" },
    { key: "totalRevenue", label: "Doanh Thu", icon: DollarSign, color: "green" },
    { key: "cancellationRate", label: "Tỷ Lệ Hủy (%)", icon: XCircle, color: "red" },
    { key: "avgServiceTimeMinutes", label: "Thời Gian Phục Vụ TB (Phút)", icon: Clock, color: "purple" },
  ];

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const KPI_CARD = ({ title, value, unit = "", icon: Icon, color }) => {
    const borderClass = `border-${color}-500`;
    const textClass = `text-${color}-600`;
    return (
      <div className={`bg-white p-4 rounded-xl shadow-lg flex flex-col justify-between transition-transform hover:scale-[1.02] border-b-4 border-l-2 ${borderClass}`}>
        <div className={`text-sm font-semibold text-gray-500 flex items-center mb-1 ${textClass}`}>
          <Icon size={16} className="mr-1" />{title}
        </div>
        <p className="text-3xl font-extrabold text-gray-900 truncate">
          {value}<span className="text-xl font-medium ml-1 text-gray-600">{unit}</span>
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-inter">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">{itemName}</h1>
        <p className="text-gray-500 mt-1">Phân tích xu hướng hiệu suất bán hàng theo thời gian.</p>
      </header>

      {/* Bộ lọc */}
      <div className="bg-white p-4 rounded-xl shadow-xl mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Nhóm Theo</label>
          <select
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="daily">Ngày</option>
            <option value="monthly">Tháng</option>
            <option value="yearly">Năm</option>
            <option value="weekly">Tuần</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Từ Ngày</label>
          <input
            type="date"
            name="from"
            value={filters.from}
            onChange={handleFilterChange}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Đến Ngày</label>
          <input
            type="date"
            name="to"
            value={filters.to}
            onChange={handleFilterChange}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 bg-white rounded-xl shadow-lg"><p>Đang tải dữ liệu...</p></div>
      ) : error ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          <p className="font-bold">Đã xảy ra lỗi</p><p>{error}</p>
        </div>
      ) : trendData.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl shadow-lg"><p>Không có dữ liệu.</p></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPI_CARD title="Tổng Số Lượng Bán" value={summaryData?.totalQuantity?.toLocaleString("vi-VN")} icon={TrendingUp} color="blue" />
            <KPI_CARD title="Doanh Thu" value={(summaryData?.formattedRevenue || "0 ₫").replace("₫","").trim()} unit="₫" icon={DollarSign} color="green" />
            <KPI_CARD title="Tỷ Lệ Hủy" value={Number(summaryData?.cancellationRate || 0).toLocaleString("vi-VN")} unit="%" icon={XCircle} color="red" />
            <KPI_CARD title="Thời Gian Phục Vụ TB" value={Number(summaryData?.avgServiceTimeMinutes || 0).toLocaleString("vi-VN")} unit="phút" icon={Clock} color="purple" />
          </div>

          {/* Biểu đồ */}
          <div className="bg-white p-4 rounded-xl shadow-xl">
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600 block mb-1">Hiển thị theo:</label>
              <div className="flex flex-wrap gap-2">
                {metricOptions.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setFilters((prev) => ({ ...prev, metric: m.key }))}
                    className={
                      filters.metric === m.key
                        ? `px-3 py-1 text-sm rounded-full font-medium transition duration-200 text-white shadow-md ${
                            m.color === "blue" ? "bg-blue-500 shadow-blue-200"
                            : m.color === "green" ? "bg-green-500 shadow-green-200"
                            : m.color === "red" ? "bg-red-500 shadow-red-200"
                            : "bg-purple-500 shadow-purple-200"
                          }`
                        : "px-3 py-1 text-sm rounded-full font-medium transition duration-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }
                  >
                    <m.icon size={14} className="inline mr-1" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData.filter(t => !t.__isDuplicate)} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
  dataKey="label"
  stroke="#555"
  tick={{ fontSize: 10 }}
  tickFormatter={(label, index) => {
    const item = trendData[index];
    // ✅ Nếu không có label hoặc là bản sao -> không hiển thị
    if (!item || item.__isDuplicate || !item.label) return "";
    return item.label;
  }}
/>

                  <YAxis
                    stroke="#555"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) =>
                      filters.metric === "totalRevenue"
                        ? `${(Number(v || 0) / 1000).toLocaleString("vi-VN")}K`
                        : Number(v || 0).toLocaleString("vi-VN")
                    }
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload?.length) {
                        const value = Number(payload[0].value || 0);
                        const isMoney = filters.metric === "totalRevenue";
                        const isRate = filters.metric === "cancellationRate";
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-xl border text-sm">
                            <p className="font-bold mb-1">{label}</p>
                            <p className={
                              filters.metric === "totalQuantity" ? "text-blue-600"
                              : filters.metric === "totalRevenue" ? "text-green-600"
                              : filters.metric === "cancellationRate" ? "text-red-600"
                              : "text-purple-600"
                            }>
                              <span className="font-semibold">
                                {filters.metric === "totalQuantity" ? "Số Lượng Bán: "
                                  : filters.metric === "totalRevenue" ? "Doanh Thu: "
                                  : filters.metric === "cancellationRate" ? "Tỷ Lệ Hủy: "
                                  : "Phục Vụ TB: "}
                              </span>
                              {isMoney
                                ? formatCurrency(value)
                                : `${value.toLocaleString("vi-VN")}${isRate ? "%" : ""}`}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={filters.metric}
                    strokeWidth={3}
                    stroke={
                      filters.metric === "totalQuantity" ? "#3b82f6"
                      : filters.metric === "totalRevenue" ? "#10b981"
                      : filters.metric === "cancellationRate" ? "#ef4444"
                      : "#a855f7"
                    }
                  />
                </LineChart>
              </ResponsiveContainer>
              {/* ================== BIỂU ĐỒ CỘT SO SÁNH DOANH THU - GIÁ VỐN - LỢI NHUẬN ================== */}
<div className="bg-white p-4 rounded-xl shadow-xl mt-10">
  <h2 className="text-lg font-semibold text-gray-700 mb-4">
    So sánh Doanh thu – Giá vốn – Lợi nhuận theo thời gian
  </h2>

  <div className="h-[420px]">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
       data={trendData.filter(t => !t.__isDuplicate)}
        margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        barGap={6}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
       <XAxis
  dataKey="label"
  stroke="#555"
  tick={{ fontSize: 10 }}
  tickFormatter={(label, index) => {
    const item = trendData[index];
    // ✅ Nếu không có label hoặc là bản sao -> không hiển thị
    if (!item || item.__isDuplicate || !item.label) return "";
    return item.label;
  }}
/>

        <YAxis
          stroke="#555"
          tick={{ fontSize: 10 }}
          tickFormatter={(v) =>
            v >= 1_000_000
              ? `${(v / 1_000_000).toFixed(1)}tr`
              : v.toLocaleString("vi-VN")
          }
        />
        <Tooltip
          formatter={(val, name) => [
            new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(val || 0),
            name,
          ]}
          labelFormatter={(label) => `Thời gian: ${label}`}
        />
        <Legend verticalAlign="top" height={30} />

        {/* 🟩 Doanh thu */}
        <Bar dataKey="revenue" name="Doanh thu" fill="#22c55e" radius={[4, 4, 0, 0]} />

        {/* 🟧 Giá vốn */}
        <Bar dataKey="cost" name="Giá vốn" fill="#f97316" radius={[4, 4, 0, 0]} />

        {/* 🟦 Lợi nhuận */}
        <Bar dataKey="profit" name="Lợi nhuận" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>
{/* ================== HẾT PHẦN BIỂU ĐỒ CỘT ================== */}

            </div>
          </div>
        </>
      )}
    </div>
  );
}
