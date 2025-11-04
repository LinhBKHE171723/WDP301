import React, { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line
} from 'recharts';

const Card = ({ className, children }) => (
  <div className={`rounded-xl border border-gray-200 bg-white shadow-lg ${className}`}>
    {children}
  </div>
);

const Input = ({ type = 'text', value, onChange, className, placeholder }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`h-10 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
  />
);

const MetricCard = ({ title, value, color, icon: Icon }) => (
  <Card className="p-4 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
    {Icon && <Icon className={`h-8 w-8 ${color} opacity-60`} />}
  </Card>
);

const SelectTrigger = ({ children, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center justify-between h-10 min-w-[120px] px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    {children}
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70 ml-2" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  </button>
);

const SelectContent = ({ children }) => (
  <div className="absolute z-20 min-w-[150px] bg-white border border-gray-200 rounded-lg shadow-xl mt-1">
    {children}
  </div>
);

const SelectItem = ({ children, onSelect }) => (
  <div
    onClick={onSelect}
    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 transition-colors"
  >
    {children}
  </div>
);

const SelectValue = ({ children }) => (
  <span className="truncate text-gray-700">{children}</span>
);

const Select = ({ value, onValueChange, children }) => {
  const [open, setOpen] = useState(false);
  const selectRef = useRef(null);

  const selectedItem = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.props?.value === value
  ) || { props: { children: "Chọn phạm vi" } };

  const handleSelect = (newValue) => {
    onValueChange(newValue);
    setOpen(false);
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className="relative" ref={selectRef}>
      <SelectTrigger onClick={() => setOpen(!open)}>
        <SelectValue>{selectedItem.props.children}</SelectValue>
      </SelectTrigger>
      {open && (
        <SelectContent>
          {React.Children.map(children, (child) =>
            React.isValidElement(child)
              ? React.cloneElement(child, { onSelect: () => handleSelect(child.props.value) })
              : child
          )}
        </SelectContent>
      )}
    </div>
  );
};

// ---- ICONS ----
const DollarIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.879c.78.78 2.04.78 2.82 0l3.18-3.18a3 3 0 0 0 0-4.242l-.879-.879m-3.18 3.18 3.18-3.18m-3.18 3.18h.008v.008h-.008v-.008Zm0 3.75h.008v.008h-.008v-.008Z" />
  </svg>
);
const ReceiptIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625A1.125 1.125 0 0 0 18.375 10.5H16.5m-5.625-2.625c-.37 0-.75.033-1.125.109m1.125-.109a1.125 1.125 0 0 1 1.125 1.125v1.5a1.125 1.125 0 0 1-1.125 1.125H9.75v-1.5a1.125 1.125 0 0 0-1.125-1.125Z" />
  </svg>
);
const MoneyBagIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 20.25c0-4.556 3.694-8.25 8.25-8.25S19.5 15.694 19.5 20.25M12 12V6m-3 2h6" />
  </svg>
);
const PercentIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 7.5l-9 9m0-9l9 9" />
  </svg>
);
const WasteIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const formatVND = (value) =>
  typeof value === "number"
    ? value.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
    : "0 ₫";

// Format cho Y-axis - ngắn gọn hơn để tránh bị cắt
const formatVNDAxis = (value) => {
  if (typeof value !== "number") return "0 ₫";
  // Nếu giá trị lớn, format ngắn gọn
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M ₫`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K ₫`;
  }
  return `${value.toLocaleString("vi-VN")} ₫`;
};

// Format cho phần trăm
const formatPercentAxis = (value) => {
  if (typeof value !== "number") return "0%";
  return `${value.toFixed(1)}%`;
};

const getFormattedDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const calculatePresetDates = (range) => {
  const today = new Date();
  let fromDate = new Date();
  let toDate = new Date();
  switch (range) {
    case "7d": fromDate.setDate(today.getDate() - 7); break;
    case "30d": fromDate.setDate(today.getDate() - 30); break;
    case "thisMonth": fromDate = new Date(today.getFullYear(), today.getMonth(), 1); break;
    case "lastMonth":
      fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      toDate = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case "3m": fromDate.setMonth(today.getMonth() - 3); break;
    default: fromDate.setDate(today.getDate() - 7);
  }
  return { from: getFormattedDate(fromDate), to: getFormattedDate(toDate) };
};

const fetchProfitData = async ({ range, customFrom, customTo }) => {
  let fromDateString, toDateString;
  if (range === "custom" && customFrom && customTo) {
    fromDateString = customFrom;
    toDateString = customTo;
  } else {
    const dates = calculatePresetDates(range);
    fromDateString = dates.from;
    toDateString = dates.to;
  }
  const API_URL = `http://localhost:5000/api/admin/revenue?from=${fromDateString}&to=${toDateString}&type=daily`;
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    return [];
  }
};

const processRawData = (rawData) => {
  if (!Array.isArray(rawData)) return [];
  return rawData.map(day => {
    const revenue = Number(day.revenue) || 0;
    const cost = Number(day.cost) || 0;
    const waste = Number(day.waste) || 0;
    const profit = Number(day.profit) || (revenue - cost - waste);
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const roi = cost > 0 ? (profit / cost) * 100 : 0;
    
    return {
      label: day.timeLabel || "N/A",
      revenue,
      cost,
      waste,
      profit,
      profitMargin,
      roi
    };
  });
};

export const ProfitCharts = () => {
  const [range, setRange] = useState("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trendType, setTrendType] = useState("profit"); // "profit", "profitMargin", "roi"
  
  // Khung thời gian riêng cho chart xu hướng
  const [trendRange, setTrendRange] = useState("7d");
  const [trendCustomFrom, setTrendCustomFrom] = useState("");
  const [trendCustomTo, setTrendCustomTo] = useState("");
  const [trendChartData, setTrendChartData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    const { from, to } = calculatePresetDates("7d");
    setCustomFrom(from);
    setCustomTo(to);
    setTrendCustomFrom(from);
    setTrendCustomTo(to);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const rawData = await fetchProfitData({ range, customFrom, customTo });
      setChartData(processRawData(rawData));
      setIsLoading(false);
    };
    if (range !== "custom" || (customFrom && customTo)) loadData();
  }, [range, customFrom, customTo]);

  // Load data riêng cho chart xu hướng
  useEffect(() => {
    const loadTrendData = async () => {
      setTrendLoading(true);
      const rawData = await fetchProfitData({ range: trendRange, customFrom: trendCustomFrom, customTo: trendCustomTo });
      setTrendChartData(processRawData(rawData));
      setTrendLoading(false);
    };
    if (trendRange !== "custom" || (trendCustomFrom && trendCustomTo)) loadTrendData();
  }, [trendRange, trendCustomFrom, trendCustomTo]);

  const handleTrendRangeChange = (newRange) => {
    setTrendRange(newRange);
    if (newRange !== "custom") {
      const { from, to } = calculatePresetDates(newRange);
      setTrendCustomFrom(from);
      setTrendCustomTo(to);
    }
  };

  const totalRevenue = chartData.reduce((sum, i) => sum + i.revenue, 0);
  const totalCost = chartData.reduce((sum, i) => sum + i.cost, 0);
  const totalWaste = chartData.reduce((sum, i) => sum + i.waste, 0);
  const totalProfit = totalRevenue - totalCost - totalWaste;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const roi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const handleRangeChange = (newRange) => {
    setRange(newRange);
    if (newRange !== "custom") {
      const { from, to } = calculatePresetDates(newRange);
      setCustomFrom(from);
      setCustomTo(to);
    }
  };

  const LoadingState = () => (
    <div className="flex items-center justify-center h-[300px]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
      <p className="ml-4 text-gray-600">Đang tải dữ liệu...</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen font-sans">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Bảng Điều Khiển Tài Chính</h1>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <MetricCard title="Tổng Doanh Thu" value={formatVND(totalRevenue)} color="text-yellow-600" icon={DollarIcon} />
        <MetricCard title="Tổng Chi Phí" value={formatVND(totalCost)} color="text-blue-600" icon={ReceiptIcon} />
        <MetricCard 
          title="Thất thoát nguyên liệu" 
          value={formatVND(totalWaste)} 
          color="text-red-600" 
          icon={WasteIcon} 
        />
        <MetricCard title="Lợi Nhuận Thuần" value={formatVND(totalProfit)} color={totalProfit >= 0 ? "text-emerald-600" : "text-red-600"} icon={MoneyBagIcon} />
        <MetricCard title="Tỷ Suất Lợi Nhuận" value={`${profitMargin.toFixed(1)}%`} color="text-purple-600" icon={PercentIcon} />
        <MetricCard title="Tỷ suất sinh lời" value={`${roi.toFixed(1)}%`} color={roi >= 0 ? "text-emerald-600" : "text-red-600"} icon={PercentIcon} />
      </div>

      <Card className="space-y-6 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <div className="text-xl font-bold text-gray-800 mb-3 sm:mb-0">
            Phân Tích Doanh Thu & Chi Phí
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={range} onValueChange={handleRangeChange}>
              <SelectItem value="7d">7 ngày qua</SelectItem>
              <SelectItem value="30d">30 ngày qua</SelectItem>
              <SelectItem value="thisMonth">Tháng này</SelectItem>
              <SelectItem value="lastMonth">Tháng trước</SelectItem>
              <SelectItem value="3m">3 tháng qua</SelectItem>
              <SelectItem value="custom">Chọn ngày...</SelectItem>
            </Select>
            <div className="flex items-center gap-2">
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <span className="text-gray-500">đến</span>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="h-[350px] w-full">
          {isLoading ? <LoadingState /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#ccc" }} />
                <YAxis tickFormatter={formatVNDAxis} axisLine={false} tickLine={false} width={80} />
                <Tooltip formatter={(value, name) => {
                  const labels = {
                    revenue: "Doanh thu",
                    cost: "Chi phí",
                    waste: "Thất thoát"
                  };
                  return [formatVND(value), labels[name] || name];
                }} />
                <Legend payload={[
                  { value: "Doanh thu", type: "rect", color: "#f59e0b" },
                  { value: "Chi phí", type: "rect", color: "#3b82f6" },
                  { value: "Thất thoát", type: "rect", color: "#ef4444" }
                ]} />
                <Bar dataKey="revenue" name="Doanh thu" fill="#f59e0b" barSize={20} radius={[6, 6, 0, 0]} />
                <Bar dataKey="cost" name="Chi phí" fill="#3b82f6" barSize={20} radius={[6, 6, 0, 0]} />
                <Bar dataKey="waste" name="Thất thoát" fill="#ef4444" barSize={20} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="p-6 mt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
          <div className="text-xl font-bold text-gray-800 mb-3 sm:mb-0">
            {trendType === "profit" 
              ? "Xu Hướng Lợi Nhuận Thuần"
              : trendType === "profitMargin"
              ? "Xu Hướng Tỷ Suất Lợi Nhuận"
              : "Xu Hướng Tỷ Suất Sinh Lời"}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={trendRange} onValueChange={handleTrendRangeChange}>
              <SelectItem value="7d">7 ngày qua</SelectItem>
              <SelectItem value="30d">30 ngày qua</SelectItem>
              <SelectItem value="thisMonth">Tháng này</SelectItem>
              <SelectItem value="lastMonth">Tháng trước</SelectItem>
              <SelectItem value="3m">3 tháng qua</SelectItem>
              <SelectItem value="custom">Chọn ngày...</SelectItem>
            </Select>
            <div className="flex items-center gap-2">
              <Input type="date" value={trendCustomFrom} onChange={(e) => setTrendCustomFrom(e.target.value)} />
              <span className="text-gray-500">đến</span>
              <Input type="date" value={trendCustomTo} onChange={(e) => setTrendCustomTo(e.target.value)} />
            </div>
            <Select value={trendType} onValueChange={setTrendType}>
              <SelectItem value="profit">Lợi Nhuận Thuần</SelectItem>
              <SelectItem value="profitMargin">Tỷ Suất Lợi Nhuận</SelectItem>
              <SelectItem value="roi">Tỷ Suất Sinh Lời</SelectItem>
            </Select>
          </div>
        </div>
        <div className="h-[250px] w-full">
          {trendLoading ? <LoadingState /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis 
                  tickFormatter={trendType === "profit" ? formatVNDAxis : formatPercentAxis} 
                  width={80} 
                />
                <Tooltip formatter={(v) => {
                  if (trendType === "profit") {
                    return [formatVND(v), "Lợi nhuận"];
                  } else if (trendType === "profitMargin") {
                    return [`${Number(v).toFixed(1)}%`, "Tỷ suất lợi nhuận"];
                  } else {
                    return [`${Number(v).toFixed(1)}%`, "Tỷ suất sinh lời"];
                  }
                }} />
                <Legend payload={[{
                  value: trendType === "profit" 
                    ? "Lợi nhuận Thuần"
                    : trendType === "profitMargin"
                    ? "Tỷ Suất Lợi Nhuận"
                    : "Tỷ Suất Sinh Lời",
                  type: "line",
                  color: "#10b981"
                }]} />
                <Line 
                  type="monotone" 
                  dataKey={trendType} 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ProfitCharts;
