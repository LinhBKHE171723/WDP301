import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import axios from "axios";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const ItemPerformanceReport = () => {
  // State cho dữ liệu gốc từ API và các bộ lọc
  const [originalData, setOriginalData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  // --- BƯỚC 1: SET LẠI GIÁ TRỊ MẶC ĐỊNH CHO SẮP XẾP LÀ THEO LỢI NHUẬN ---
  const [sortBy, setSortBy] = useState("totalProfit_desc");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  // State cho giới hạn số lượng items (mặc định là "all" - không giới hạn)
  const [itemLimit, setItemLimit] = useState("all");
  // State quản lý trạng thái loading và lỗi
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State cho chart view
  const [viewMode, setViewMode] = useState("table"); // "table" hoặc "chart"
  const [chartType, setChartType] = useState("line"); // "line", "bar", "stackedBar"
  const [timeGroup, setTimeGroup] = useState("daily"); // "daily", "weekly", "monthly"
  const [topItemsCount, setTopItemsCount] = useState(10); // 5, 10, 15, 20
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);
  const [availableItems, setAvailableItems] = useState([]); // Danh sách tất cả items có trong khoảng thời gian
  const [selectedItemIds, setSelectedItemIds] = useState([]); // Danh sách IDs được chọn
  const [useCustomSelection, setUseCustomSelection] = useState(false); // Toggle giữa Top N và chọn thủ công

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (dateRange.from) params.append("from", dateRange.from);
    if (dateRange.to) params.append("to", dateRange.to);
    // Chỉ thêm limit nếu không phải "all"
    if (itemLimit !== "all") {
      params.append("limit", itemLimit);
    }
    const apiUrl = `http://localhost:5000/api/admin/top-items?${params.toString()}`;

    console.log("Đang gọi đến URL:", apiUrl);

    axios
      .get(apiUrl)
      .then((response) => {
        console.log("Thành công! Dữ liệu nhận được:", response.data);
        if (Array.isArray(response.data)) {
          setOriginalData(response.data);
        } else {
          console.error("Lỗi: Dữ liệu trả về không phải là một mảng!", response.data);
          setError("Dữ liệu nhận được có định dạng không đúng.");
          setOriginalData([]);
        }
      })
      .catch((err) => {
        console.error("API gặp lỗi:", err);
        if (err.response) {
          console.error("Chi tiết lỗi từ server:", err.response.data);
        }
        const errorMessage = err.response?.data?.message || err.message || "Có lỗi xảy ra khi tải dữ liệu";
        setError(errorMessage);
        setOriginalData([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dateRange, itemLimit]);

  // Fetch danh sách items có sẵn khi chuyển sang chart mode hoặc thay đổi date range
  useEffect(() => {
    if (viewMode !== "chart") return;

    // Fetch với topN rất lớn để lấy tất cả items và combos
    const params = new URLSearchParams();
    if (dateRange.from) params.append("from", dateRange.from);
    if (dateRange.to) params.append("to", dateRange.to);
    params.append("type", timeGroup);
    params.append("topN", "10000"); // Tăng lên để đảm bảo lấy tất cả items và combos

    const apiUrl = `http://localhost:5000/api/admin/items/sales-by-time?${params.toString()}`;

    axios
      .get(apiUrl)
      .then((response) => {
        if (Array.isArray(response.data)) {
          // Lấy danh sách unique items và combos từ tất cả các khoảng thời gian
          const allItemsMap = new Map();
          response.data.forEach((period) => {
            if (period.items && Array.isArray(period.items)) {
              period.items.forEach((item) => {
                // Lấy _id từ item (có thể là string hoặc object)
                const itemId = item._id ? (typeof item._id === 'string' ? item._id : item._id.toString()) : null;
                if (itemId && !allItemsMap.has(itemId)) {
                  allItemsMap.set(itemId, {
                    _id: itemId,
                    name: item.name,
                  });
                }
              });
            }
          });
          const itemsArray = Array.from(allItemsMap.values());
          // Sắp xếp theo tên để dễ tìm
          itemsArray.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
          setAvailableItems(itemsArray);
          console.log(`[Chart] Loaded ${itemsArray.length} items/combos for selection`);
        }
      })
      .catch((err) => {
        console.error("Error fetching available items:", err);
        setAvailableItems([]);
      });
  }, [viewMode, dateRange, timeGroup]);

  // Fetch chart data khi các tùy chọn thay đổi
  useEffect(() => {
    if (viewMode !== "chart") return;

    // Nếu ở chế độ chọn món cụ thể nhưng chưa chọn món nào, không fetch data
    if (useCustomSelection && selectedItemIds.length === 0) {
      setChartData({ chartData: [], itemNames: [] });
      setChartLoading(false);
      setChartError(null);
      return;
    }

    setChartLoading(true);
    setChartError(null);
    const params = new URLSearchParams();
    if (dateRange.from) params.append("from", dateRange.from);
    if (dateRange.to) params.append("to", dateRange.to);
    params.append("type", timeGroup);
    
    if (useCustomSelection && selectedItemIds.length > 0) {
      // Gửi danh sách itemIds được chọn
      params.append("itemIds", selectedItemIds.join(","));
    } else {
      // Dùng topN
      params.append("topN", topItemsCount);
    }

    const apiUrl = `http://localhost:5000/api/admin/items/sales-by-time?${params.toString()}`;

    axios
      .get(apiUrl)
      .then((response) => {
        if (Array.isArray(response.data)) {
          // Transform data for chart
          const processedData = processChartData(response.data);
          setChartData(processedData);
        } else {
          setChartError("Dữ liệu nhận được có định dạng không đúng.");
          setChartData({ chartData: [], itemNames: [] });
        }
      })
      .catch((err) => {
        console.error("Chart API error:", err);
        const errorMessage = err.response?.data?.message || err.message || "Có lỗi xảy ra khi tải dữ liệu chart";
        setChartError(errorMessage);
        setChartData({ chartData: [], itemNames: [] });
      })
      .finally(() => {
        setChartLoading(false);
      });
  }, [viewMode, dateRange, timeGroup, topItemsCount, chartType, useCustomSelection, selectedItemIds]);

  // Function để xử lý dữ liệu cho chart
  const processChartData = (rawData) => {
    if (!rawData || rawData.length === 0) {
      return { chartData: [], itemNames: [] };
    }

    // Lấy tất cả các tên món unique từ tất cả các khoảng thời gian
    const allItemNames = new Set();
    rawData.forEach((period) => {
      if (period.items && Array.isArray(period.items)) {
        period.items.forEach((item) => {
          allItemNames.add(item.name);
        });
      }
    });

    const itemNamesArray = Array.from(allItemNames);

    // Tạo data cho chart: mỗi period là một object với các fields là tên món
    const chartDataArray = rawData.map((period) => {
      const dataPoint = {
        time: period.label || period.time,
        timeKey: period.time,
      };

      // Thêm quantity cho từng món
      itemNamesArray.forEach((itemName) => {
        const item = period.items?.find((i) => i.name === itemName);
        dataPoint[itemName] = item ? item.quantity : 0;
      });

      return dataPoint;
    });

    return { chartData: chartDataArray, itemNames: itemNamesArray };
  };

  const categories = useMemo(
    () => ["all", ...new Set(originalData.map((item) => item.category))],
    [originalData]
  );

  const filteredAndSortedData = useMemo(() => {
    let data = [...originalData];
    if (searchTerm) {
      data = data.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (categoryFilter !== "all") {
      data = data.filter((item) => item.category === categoryFilter);
    }
    const [key, direction] = sortBy.split("_");
    data.sort((a, b) => {
      if (direction === "asc") {
        return a[key] > b[key] ? 1 : -1;
      }
      return b[key] > a[key] ? 1 : -1;
    });
    return data;
  }, [originalData, searchTerm, categoryFilter, sortBy]);

  const totalRevenue = useMemo(
    () => filteredAndSortedData.reduce((sum, item) => sum + item.totalRevenue, 0),
    [filteredAndSortedData]
  );
  
  // --- BƯỚC 2: TÍNH TOÁN THÊM TỔNG LỢI NHUẬN ĐỂ HIỂN THỊ TRÊN THẺ KPI ---
  const totalProfit = useMemo(
    () => filteredAndSortedData.reduce((sum, item) => sum + item.totalProfit, 0),
    [filteredAndSortedData]
  );

  const totalQuantity = useMemo(
    () => filteredAndSortedData.reduce((sum, item) => sum + item.totalQuantity, 0),
    [filteredAndSortedData]
  );

  const bestSeller = useMemo(() => {
    const sortedByQuantity = [...filteredAndSortedData].sort((a, b) => b.totalQuantity - a.totalQuantity);
    return sortedByQuantity.length > 0 ? sortedByQuantity[0].name : "N/A";
  }, [filteredAndSortedData]);

  const formatCurrency = (num) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(num);

  const handleDateChange = (e, type) => {
    setDateRange((prev) => ({ ...prev, [type]: e.target.value }));
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setItemLimit("all");
    setSortBy("totalProfit_desc");
    setDateRange({ from: "", to: "" });
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "2rem", backgroundColor: "#f9fafb" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1.5rem", color: "#111827" }}>
        Báo cáo Hiệu suất Món ăn
      </h1>

      {/* Tabs để chuyển đổi giữa Table và Chart - Đưa lên trên cùng */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "2px solid #e5e7eb" }}>
          <button
            onClick={() => setViewMode("table")}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: viewMode === "table" ? "#3b82f6" : "transparent",
              color: viewMode === "table" ? "white" : "#6b7280",
              border: "none",
              borderBottom: viewMode === "table" ? "2px solid #3b82f6" : "2px solid transparent",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "0.875rem",
              marginBottom: "-2px",
            }}
          >
            Bảng
          </button>
          <button
            onClick={() => setViewMode("chart")}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: viewMode === "chart" ? "#3b82f6" : "transparent",
              color: viewMode === "chart" ? "white" : "#6b7280",
              border: "none",
              borderBottom: viewMode === "chart" ? "2px solid #3b82f6" : "2px solid transparent",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "0.875rem",
              marginBottom: "-2px",
            }}
          >
            Biểu đồ
          </button>
        </div>
      </div>

      {/* Filters Section - Chỉ hiển thị khi ở table view */}
      {viewMode === "table" && (
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem", marginBottom: "1.5rem", padding: "1rem", backgroundColor: "white", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)" }}>
        {/* Search - Full Width */}
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>Tìm kiếm món ăn</label>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} size={16} />
            <input 
              type="text" 
              placeholder="Nhập tên món ăn..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={{ 
                padding: "0.5rem 0.5rem 0.5rem 2.5rem", 
                border: "1px solid #d1d5db", 
                borderRadius: "6px", 
                width: "100%", 
                fontSize: "0.875rem",
                outline: "none"
              }} 
            />
          </div>
        </div>

        {/* Other Filters - Grid Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", gridColumn: "1 / -1" }}>
          {/* Date Range */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>Từ ngày</label>
            <input 
              type="date" 
              value={dateRange.from} 
              onChange={(e) => handleDateChange(e, "from")} 
              style={{ 
                padding: "0.5rem", 
                border: "1px solid #d1d5db", 
                borderRadius: "6px", 
                fontSize: "0.875rem",
                width: "100%",
                outline: "none"
              }} 
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>Đến ngày</label>
            <input 
              type="date" 
              value={dateRange.to} 
              onChange={(e) => handleDateChange(e, "to")} 
              style={{ 
                padding: "0.5rem", 
                border: "1px solid #d1d5db", 
                borderRadius: "6px", 
                fontSize: "0.875rem",
                width: "100%",
                outline: "none"
              }} 
            />
          </div>
          {/* Category */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>Danh mục</label>
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)} 
              style={{ 
                padding: "0.5rem", 
                border: "1px solid #d1d5db", 
                borderRadius: "6px", 
                fontSize: "0.875rem",
                width: "100%",
                outline: "none",
                backgroundColor: "white"
              }}
            >
              {categories.map((cat) => ( <option key={cat} value={cat}>{cat === "all" ? "Tất cả" : cat}</option> ))}
            </select>
          </div>
          {/* Display Limit */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>Số lượng hiển thị</label>
            <select 
              value={itemLimit} 
              onChange={(e) => setItemLimit(e.target.value)} 
              style={{ 
                padding: "0.5rem", 
                border: "1px solid #d1d5db", 
                borderRadius: "6px", 
                fontSize: "0.875rem",
                width: "100%",
                outline: "none",
                backgroundColor: "white"
              }}
            >
              <option value="all">Tất cả</option>
              <option value="10">Top 10</option>
              <option value="20">Top 20</option>
              <option value="50">Top 50</option>
              <option value="100">Top 100</option>
            </select>
          </div>
          {/* Sort By */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>Sắp xếp theo</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)} 
              style={{ 
                padding: "0.5rem", 
                border: "1px solid #d1d5db", 
                borderRadius: "6px", 
                fontSize: "0.875rem",
                width: "100%",
                outline: "none",
                backgroundColor: "white"
              }}
            >
              <option value="totalProfit_desc">Lợi nhuận cao nhất</option>
              <option value="totalProfit_asc">Lợi nhuận thấp nhất</option>
              <option value="totalRevenue_desc">Doanh thu cao nhất</option>
              <option value="totalRevenue_asc">Doanh thu thấp nhất</option>
              <option value="totalQuantity_desc">Bán chạy nhất</option>
              <option value="totalQuantity_asc">Bán ít nhất</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
          <button 
            onClick={handleResetFilters}
            style={{ 
              padding: "0.5rem 1rem", 
              backgroundColor: "#6b7280", 
              color: "white", 
              borderRadius: "6px", 
              fontSize: "0.875rem",
              border: "none",
              cursor: "pointer",
              fontWeight: "500"
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = "#4b5563"}
            onMouseOut={(e) => e.target.style.backgroundColor = "#6b7280"}
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>
      )}

      {/* KPI Cards Section - Chỉ hiển thị khi ở table view */}
      {viewMode === "table" && (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {/* Thẻ Tổng Doanh Thu (Không đổi) */}
        <div style={{ padding: "1.5rem", backgroundColor: "white", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}>
          <h3 style={{ color: "#6b7280", marginBottom: "0.5rem" }}>Tổng Doanh Thu</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#10b981" }}>{formatCurrency(totalRevenue)}</p>
        </div>
        
        {/* --- BƯỚC 4: THÊM THẺ KPI MỚI CHO TỔNG LỢI NHUẬN --- */}
        <div style={{ padding: "1.5rem", backgroundColor: "white", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}>
          <h3 style={{ color: "#6b7280", marginBottom: "0.5rem" }}>Tổng Lợi Nhuận</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#f59e0b" }}>{formatCurrency(totalProfit)}</p>
        </div>

        {/* Thẻ Tổng Số Lượng & Bán Chạy Nhất (Không đổi) */}
        <div style={{ padding: "1.5rem", backgroundColor: "white", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}>
          <h3 style={{ color: "#6b7280", marginBottom: "0.5rem" }}>Tổng Số Lượng Bán</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#3b82f6" }}>{totalQuantity.toLocaleString("vi-VN")}</p>
        </div>
        <div style={{ padding: "1.5rem", backgroundColor: "white", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}>
          <h3 style={{ color: "#6b7280", marginBottom: "0.5rem" }}>Món Bán Chạy Nhất</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#8b5cf6" }}>{bestSeller}</p>
        </div>
      </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div style={{ backgroundColor: "white", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
          {loading && (<p style={{ textAlign: "center", padding: "2rem" }}>Đang tải dữ liệu...</p>)}
          {error && (<p style={{ textAlign: "center", padding: "2rem", color: "red" }}>Lỗi: {error}</p>)}
          {!loading && !error && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
                <tr>
                  {/* Các cột cũ (Không đổi) */}
                  <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600", color: "#374151" }}>Hạng</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600", color: "#374151" }}>Tên Món Ăn</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600", color: "#374151" }}>Danh Mục</th>
                  <th style={{ padding: "1rem", textAlign: "right", fontWeight: "600", color: "#374151" }}>Số Lượng Bán</th>
                  <th style={{ padding: "1rem", textAlign: "right", fontWeight: "600", color: "#374151" }}>Doanh Thu</th>
                  
                  {/* --- BƯỚC 5: THÊM 2 CỘT MỚI VÀO TIÊU ĐỀ BẢNG --- */}
                  <th style={{ padding: "1rem", textAlign: "right", fontWeight: "600", color: "#374151" }}>Chi phí</th>
                  <th style={{ padding: "1rem", textAlign: "right", fontWeight: "600", color: "#374151" }}>Lợi Nhuận</th>

                  <th style={{ padding: "1rem", textAlign: "center", fontWeight: "600", color: "#374151" }}>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.length > 0 ? (
                  filteredAndSortedData.map((item, index) => (
                    <tr key={item._id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      {/* Các cột cũ (Không đổi) */}
                      <td style={{ padding: "1rem", fontWeight: "500" }}>{index + 1}</td>
                      <td style={{ padding: "1rem", fontWeight: "bold", color: "#111827" }}>{item.name}</td>
                      <td style={{ padding: "1rem" }}><span style={{ padding: "0.25rem 0.75rem", borderRadius: "9999px", backgroundColor: "#e0e7ff", color: "#4338ca", fontSize: "0.875rem" }}>{item.category}</span></td>
                      <td style={{ padding: "1rem", textAlign: "right", fontWeight: "500" }}>{item.totalQuantity.toLocaleString("vi-VN")}</td>
                      <td style={{ padding: "1rem", textAlign: "right", fontWeight: "bold", color: "#16a34a" }}>{formatCurrency(item.totalRevenue)}</td>
                      
                      {/* --- BƯỚC 6: HIỂN THỊ DỮ LIỆU CHO 2 CỘT MỚI --- */}
                      <td style={{ padding: "1rem", textAlign: "right", fontWeight: "500", color: "#ef4444" }}>{formatCurrency(item.totalExpense)}</td>
                      <td style={{ padding: "1rem", textAlign: "right", fontWeight: "bold", color: "#f59e0b" }}>{formatCurrency(item.totalProfit)}</td>

                      <td style={{ padding: "1rem", textAlign: "center" }}>
                        <Link to={`/item-analytics/${item._id}`} state={{ name: item.name }} style={{ color: "#2563eb", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                          Xem <ChevronRight size={20} />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    {/* --- BƯỚC 7: CẬP NHẬT COLSPAN CHO ĐÚNG SỐ CỘT (8 CỘT) --- */}
                    <td colSpan="8" style={{ textAlign: "center", padding: "2rem" }}>
                      Không có dữ liệu phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Chart View */}
      {viewMode === "chart" && (
        <div>
          {/* Chart Filters - Date Range */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem", padding: "1rem", backgroundColor: "white", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>Từ ngày</label>
              <input 
                type="date" 
                value={dateRange.from} 
                onChange={(e) => handleDateChange(e, "from")} 
                style={{ 
                  padding: "0.5rem", 
                  border: "1px solid #d1d5db", 
                  borderRadius: "6px", 
                  fontSize: "0.875rem",
                  width: "100%",
                  outline: "none"
                }} 
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>Đến ngày</label>
              <input 
                type="date" 
                value={dateRange.to} 
                onChange={(e) => handleDateChange(e, "to")} 
                style={{ 
                  padding: "0.5rem", 
                  border: "1px solid #d1d5db", 
                  borderRadius: "6px", 
                  fontSize: "0.875rem",
                  width: "100%",
                  outline: "none"
                }} 
              />
            </div>
          </div>

          <div style={{ backgroundColor: "white", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", padding: "1.5rem" }}>
            {/* Chart Options */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>Loại biểu đồ</label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                style={{
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  width: "100%",
                  outline: "none",
                  backgroundColor: "white",
                }}
              >
                <option value="line">Đường (Line)</option>
                <option value="bar">Cột (Bar)</option>
                <option value="stackedBar">Cột xếp chồng (Stacked Bar)</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>Nhóm thời gian</label>
              <select
                value={timeGroup}
                onChange={(e) => setTimeGroup(e.target.value)}
                style={{
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  width: "100%",
                  outline: "none",
                  backgroundColor: "white",
                }}
              >
                <option value="daily">Theo ngày</option>
                <option value="weekly">Theo tuần</option>
                <option value="monthly">Theo tháng</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>Chế độ hiển thị</label>
              <select
                value={useCustomSelection ? "custom" : "top"}
                onChange={(e) => {
                  const isCustom = e.target.value === "custom";
                  setUseCustomSelection(isCustom);
                  if (!isCustom) {
                    setSelectedItemIds([]);
                  }
                }}
                style={{
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  width: "100%",
                  outline: "none",
                  backgroundColor: "white",
                }}
              >
                <option value="top">Top N món</option>
                <option value="custom">Chọn món cụ thể</option>
              </select>
            </div>
            {!useCustomSelection && (
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>Số lượng món</label>
                <select
                  value={topItemsCount}
                  onChange={(e) => setTopItemsCount(Number(e.target.value))}
                  style={{
                    padding: "0.5rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    width: "100%",
                    outline: "none",
                    backgroundColor: "white",
                  }}
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={15}>Top 15</option>
                  <option value={20}>Top 20</option>
                </select>
              </div>
            )}
          </div>

          {/* Item Selection (khi chọn chế độ custom) */}
          {useCustomSelection && (
            <div style={{ marginBottom: "1.5rem", padding: "1rem", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
              <label style={{ display: "block", marginBottom: "0.75rem", fontWeight: "600", color: "#374151", fontSize: "0.875rem" }}>
                Chọn món/combo để hiển thị ({selectedItemIds.length} đã chọn)
              </label>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <button
                  onClick={() => setSelectedItemIds(availableItems.map(item => item._id))}
                  style={{
                    padding: "0.375rem 0.75rem",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  Chọn tất cả
                </button>
                <button
                  onClick={() => setSelectedItemIds([])}
                  style={{
                    padding: "0.375rem 0.75rem",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  Bỏ chọn tất cả
                </button>
              </div>
              <div style={{ maxHeight: "200px", overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.5rem" }}>
                {availableItems.map((item) => (
                  <label
                    key={item._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "0.5rem",
                      backgroundColor: selectedItemIds.includes(item._id) ? "#dbeafe" : "white",
                      borderRadius: "4px",
                      cursor: "pointer",
                      border: `1px solid ${selectedItemIds.includes(item._id) ? "#3b82f6" : "#d1d5db"}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItemIds.includes(item._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItemIds([...selectedItemIds, item._id]);
                        } else {
                          setSelectedItemIds(selectedItemIds.filter(id => id !== item._id));
                        }
                      }}
                      style={{ marginRight: "0.5rem" }}
                    />
                    <span style={{ fontSize: "0.875rem", color: "#374151" }}>{item.name}</span>
                  </label>
                ))}
              </div>
              {availableItems.length === 0 && (
                <p style={{ textAlign: "center", padding: "1rem", color: "#6b7280", fontSize: "0.875rem" }}>
                  Không có món nào trong khoảng thời gian đã chọn
                </p>
              )}
            </div>
          )}

          {/* Chart Display */}
          {chartLoading && (
            <p style={{ textAlign: "center", padding: "2rem" }}>Đang tải dữ liệu biểu đồ...</p>
          )}
          {chartError && (
            <p style={{ textAlign: "center", padding: "2rem", color: "red" }}>Lỗi: {chartError}</p>
          )}
          {useCustomSelection && selectedItemIds.length === 0 && (
            <p style={{ textAlign: "center", padding: "2rem", color: "#6b7280", fontSize: "1rem" }}>
              Vui lòng chọn ít nhất một món/combo để hiển thị trên biểu đồ.
            </p>
          )}
          {!chartLoading && !chartError && !(useCustomSelection && selectedItemIds.length === 0) && chartData.chartData && chartData.chartData.length > 0 && (
            <div style={{ height: "500px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "line" ? (
                  <LineChart data={chartData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="time"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value, name) => [
                        `${value.toLocaleString("vi-VN")} món`,
                        name,
                      ]}
                    />
                    <Legend />
                    {chartData.itemNames.map((itemName, index) => (
                      <Line
                        key={itemName}
                        type="monotone"
                        dataKey={itemName}
                        stroke={`hsl(${(index * 360) / chartData.itemNames.length}, 70%, 50%)`}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name={itemName}
                      />
                    ))}
                  </LineChart>
                ) : chartType === "bar" ? (
                  <BarChart data={chartData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="time"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value, name) => [
                        `${value.toLocaleString("vi-VN")} món`,
                        name,
                      ]}
                    />
                    <Legend />
                    {chartData.itemNames.map((itemName, index) => (
                      <Bar
                        key={itemName}
                        dataKey={itemName}
                        fill={`hsl(${(index * 360) / chartData.itemNames.length}, 70%, 50%)`}
                        name={itemName}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                ) : (
                  <BarChart data={chartData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="time"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value, name) => [
                        `${value.toLocaleString("vi-VN")} món`,
                        name,
                      ]}
                    />
                    <Legend />
                    {chartData.itemNames.map((itemName, index) => (
                      <Bar
                        key={itemName}
                        dataKey={itemName}
                        stackId="a"
                        fill={`hsl(${(index * 360) / chartData.itemNames.length}, 70%, 50%)`}
                        name={itemName}
                        radius={index === chartData.itemNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
          {!chartLoading && !chartError && (!chartData.chartData || chartData.chartData.length === 0) && (
            <p style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
              Không có dữ liệu để hiển thị. Vui lòng chọn khoảng thời gian khác.
            </p>
          )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemPerformanceReport;