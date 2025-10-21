import React, { useState, useEffect, useRef, useCallback } from "react";
// Import các components biểu đồ từ recharts
import { 
    BarChart, Bar, XAxis, YAxis, 
    CartesianGrid, Tooltip, Legend, 
    ResponsiveContainer, LineChart, Line // Đã thêm LineChart và Line
} from 'recharts';

// --- ĐỊNH NGHĨA CÁC COMPONENTS UI KHẮC PHỤC LỖI IMPORT ---

// Component Card (Sử dụng Tailwind CSS)
const Card = ({ className, children }) => (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-lg ${className}`}>
        {children}
    </div>
);

// Component Input
const Input = ({ type = 'text', value, onChange, className, placeholder }) => (
    <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`h-10 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    />
);

// Component MetricCard MỚI
const MetricCard = ({ title, value, color, icon: Icon }) => (
    <Card className="p-4 flex items-center justify-between">
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        {Icon && <Icon className={`h-8 w-8 ${color} opacity-60`} />}
    </Card>
);

// Component SelectTrigger
const SelectTrigger = ({ children, onClick, className }) => (
    <button 
        className={`flex items-center justify-between h-10 min-w-[120px] px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        onClick={() => { if(onClick) onClick(); }}
    >
        {children}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70 ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
    </button>
);

// Component SelectContent
const SelectContent = ({ children, className }) => (
    <div className={`absolute z-20 min-w-[150px] bg-white border border-gray-200 rounded-lg shadow-xl mt-1 ${className}`}>
        {children}
    </div>
);

// Component SelectItem
const SelectItem = ({ children, onSelect, className, value }) => (
    <div 
        className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
        onClick={onSelect}
    >
        {children}
    </div>
);

// Component SelectValue
const SelectValue = ({ children }) => (
    <span className="truncate text-gray-700">{children}</span>
);

// Component Select (Logic chính của dropdown)
const Select = ({ value, onValueChange, children }) => {
    const [open, setOpen] = useState(false);
    const selectRef = useRef(null); 
    
    // Tìm văn bản của mục đã chọn
    const selectedItem = React.Children.toArray(children).find(
        child => React.isValidElement(child) && child.props?.value === value
    ) || { props: { children: "Chọn phạm vi" } };

    const handleSelect = (newValue) => {
        onValueChange(newValue);
        setOpen(false);
    };

    // Tạo các SelectItem với logic onSelect được gắn vào
    const SelectElements = React.Children.map(children, child => {
        if (child && child.type === SelectItem) {
            return React.cloneElement(child, {
                onSelect: () => handleSelect(child.props.value)
            });
        }
        return child;
    });

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (selectRef.current && !selectRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [open]);


    return (
        <div className="relative" ref={selectRef}>
            <SelectTrigger onClick={() => setOpen(!open)}>
                <SelectValue>{selectedItem.props.children}</SelectValue>
            </SelectTrigger>
            {open && (
                <SelectContent>
                    {SelectElements}
                </SelectContent>
            )}
        </div>
    );
};


// --- HÀM HỖ TRỢ & LOGIC XỬ LÝ DỮ LIỆU ---

// Icons (Sử dụng SVG inline để không cần import thư viện)
const DollarIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.03 60.03 0 0 1 20.5-2.25c.365 0 .729.01.096-.039a6.002 6.002 0 0 1 5.904 6.039v2.25H2.25V18.75Z" />
    </svg>
);
const MoneyBagIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.879c.78.78 2.04.78 2.82 0l3.18-3.18a3 3 0 0 0 0-4.242l-.879-.879m-3.18 3.18 3.18-3.18m-3.18 3.18h.008v.008h-.008v-.008Zm0 3.75h.008v.008h-.008v-.008Z" />
    </svg>
);
const ReceiptIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625A1.125 1.125 0 0 0 18.375 10.5H16.5m-5.625-2.625c-.37 0-.75.033-1.125.109m1.125-.109a1.125 1.125 0 0 1 1.125 1.125v1.5a1.125 1.125 0 0 1-1.125 1.125H9.75v-1.5a1.125 1.125 0 0 0-1.125-1.125Z" />
    </svg>
);
const PercentIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5l.45-1.636a1.125 1.125 0 0 1 2.05-.205l.383 1.15.54 1.62h3.355a.75.75 0 0 0 .54-1.22l-1.03-1.636a1.125 1.125 0 0 1 1.834-1.119l1.458 2.518a1.125 1.125 0 0 1 0 1.119l-1.458 2.518a1.125 1.125 0 0 1-1.834-1.119l1.03-1.636a.75.75 0 0 0-.54-1.22H11.603l-.54 1.62-.382 1.15c-.413 1.24-.764 2.443-.889 2.568.125.125.476 1.328.889 2.568l.383 1.15a1.125 1.125 0 0 1-2.05-.205l-.45-1.636" />
    </svg>
);

// Hàm định dạng giá trị VND
const formatVND = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return `0 ₫`;
    // Nếu giá trị lớn (>= 1 triệu), hiển thị Tr
    if (Math.abs(value) >= 1000000) {
        return `${(value / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} Tr`;
    }
    // Định dạng số thông thường
    return `${value.toLocaleString('vi-VN')} ₫`; 
};

// Hàm helper để lấy ngày theo định dạng YYYY-MM-DD
const getFormattedDate = (date) => {
    // Tránh timezone issue bằng cách lấy ngày cục bộ
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Hàm tính toán ngày bắt đầu và ngày kết thúc cho các preset range.
 */
const calculatePresetDates = (range) => {
    const today = new Date();
    let fromDate = new Date();
    let toDate = new Date(); 

    switch (range) {
        case '7d':
            fromDate.setDate(today.getDate() - 7);
            break;
        case '30d':
            fromDate.setDate(today.getDate() - 30);
            break;
        case 'thisMonth':
            fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case 'lastMonth':
            fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            toDate = new Date(today.getFullYear(), today.getMonth(), 0); 
            break;
        case '3m':
            fromDate.setMonth(today.getMonth() - 3);
            break;
        default:
            fromDate.setDate(today.getDate() - 7);
    }
    return {
        from: getFormattedDate(fromDate),
        to: getFormattedDate(toDate),
    };
};


/**
 * Hàm fetch data, sử dụng 'from' và 'to' để gửi đến BE
 */
const fetchProfitData = async ({ range, customFrom, customTo }) => {
    let fromDateString, toDateString;
    
    if (range === 'custom' && customFrom && customTo) {
        fromDateString = customFrom;
        toDateString = customTo;
    } else {
        const dates = calculatePresetDates(range);
        fromDateString = dates.from;
        toDateString = dates.to;
    }

    const queryString = `from=${fromDateString}&to=${toDateString}&type=daily`; 
    const API_URL = `http://localhost:5000/api/admin/revenue?${queryString}`; 
    console.log(`Fetching data from: ${API_URL}`);

    try {
        let response;
        for (let attempt = 0; attempt < 3; attempt++) {
            response = await fetch(API_URL);
            if (response.ok) break;
            await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000));
        }
        
        if (!response || !response.ok) {
            throw new Error(`HTTP error! status: ${response ? response.status : 'Network error'}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching data from backend:", error);
        return []; 
    }
};

/**
 * Hàm xử lý dữ liệu từ backend trả về
 */
const processRawData = (rawData) => {
    if (!Array.isArray(rawData)) {
        console.error("Raw data is not an array:", rawData);
        return [];
    }

    const chartData = rawData.map(day => {
        const label = day.timeLabel ? day.timeLabel.substring(5) : 'N/A'; 
        
        const revenue = Number(day.revenue) || 0;
        const cost = Number(day.cost) || 0;
        const profit = Number(day.profit) || (revenue - cost) || 0; 

        return {
            label: label, 
            revenue: revenue, 
            cost: cost,       
            profit: profit, 
        };
    });
    
    return chartData;
};

// --- COMPONENT CHÍNH ---

export const ProfitCharts = () => {
    const [range, setRange] = useState("7d"); 
    const [customFrom, setCustomFrom] = useState(''); 
    const [customTo, setCustomTo] = useState('');   
    const [chartData, setChartData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Khởi tạo ngày mặc định khi component load lần đầu
    useEffect(() => {
        if (!customFrom || !customTo) {
            const { from, to } = calculatePresetDates('7d');
            setCustomFrom(from);
            setCustomTo(to);
        }
    }, []); 

    // Hook để fetch data khi range hoặc custom dates thay đổi
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            
            const fetchParams = { range, customFrom, customTo };

            try {
                const rawData = await fetchProfitData(fetchParams); 
                const processedData = processRawData(rawData);
                setChartData(processedData);
            } catch (error) {
                console.error("Error fetching profit data:", error);
                setChartData([]); 
            } finally {
                setIsLoading(false);
            }
        };

        if (range !== 'custom' || (customFrom && customTo)) {
            loadData();
        }
        
    }, [range, customFrom, customTo]);

    // --- TÍNH TOÁN METRICS TỔNG QUAN ---
    const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
    const totalCost = chartData.reduce((sum, item) => sum + item.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    // --- KẾT THÚC TÍNH TOÁN ---

    // Hàm xử lý khi thay đổi range
    const handleRangeChange = (newRange) => {
        setRange(newRange);
        if (newRange !== 'custom') {
            const { from, to } = calculatePresetDates(newRange);
            setCustomFrom(from);
            setCustomTo(to);
        }
    };

    // Component hiển thị trạng thái loading
    const LoadingState = () => (
        <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
            <p className="ml-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen font-sans">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Bảng Điều Khiển Tài Chính</h1>

            {/* --- 1. METRIC CARDS (THẺ TỔNG QUAN) --- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard 
                    title="Tổng Doanh Thu" 
                    value={formatVND(totalRevenue)} 
                    color="text-yellow-600" 
                    icon={DollarIcon}
                />
                <MetricCard 
                    title="Tổng Chi Phí" 
                    value={formatVND(totalCost)} 
                    color="text-blue-600" 
                    icon={ReceiptIcon}
                />
                <MetricCard 
                    title="Lợi Nhuận Thuần" 
                    value={formatVND(totalProfit)} 
                    color={totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}
                    icon={MoneyBagIcon}
                />
                <MetricCard 
                    title="Tỷ Suất Lợi Nhuận" 
                    value={`${profitMargin.toFixed(1)}%`} 
                    color="text-purple-600" 
                    icon={PercentIcon}
                />
            </div>

            {/* --- 2. BIỂU ĐỒ CỘT DOANH THU VÀ CHI PHÍ (CŨ) --- */}
            <Card className="space-y-6 p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                    <div className="text-xl font-bold text-gray-800 mb-3 sm:mb-0">
                        Phân Tích Doanh Thu & Chi Phí (Biểu Đồ Cột)
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
                            <Input 
                                type="date"
                                value={customFrom}
                                onChange={(e) => {
                                    setCustomFrom(e.target.value);
                                    if (range !== 'custom') setRange('custom');
                                }}
                                placeholder="Từ ngày"
                            />
                            <span className="text-gray-500">đến</span>
                            <Input 
                                type="date"
                                value={customTo}
                                onChange={(e) => {
                                    setCustomTo(e.target.value);
                                    if (range !== 'custom') setRange('custom');
                                }}
                                placeholder="Đến ngày"
                            />
                        </div>
                    </div>
                </div>

                <div className="h-[350px] w-full">
                    {isLoading ? <LoadingState /> : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={chartData} 
                                margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
                                barCategoryGap="20%"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                                <XAxis 
                                    dataKey="label" 
                                    tickLine={false} 
                                    axisLine={{ stroke: '#ccc' }}
                                    padding={{ left: 20, right: 20 }}
                                    className="text-xs text-gray-500"
                                />
                                <YAxis 
                                    tickFormatter={formatVND} 
                                    axisLine={false} 
                                    tickLine={false}
                                    className="text-xs text-gray-500"
                                    orientation="left"
                                />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }}
                                    labelFormatter={(label) => `Thời gian: ${label}`}
                                    formatter={(value, name) => {
                                        let displayName = name;
                                        if (name === 'revenue') displayName = 'Tổng Doanh thu';
                                        if (name === 'cost') displayName = 'Tổng Chi phí';
                                        return [formatVND(value), displayName];
                                    }} 
                                    contentStyle={{ 
                                        borderRadius: '6px', fontSize: '14px', padding: '8px 12px', 
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #ccc' 
                                    }}
                                />
                                <Legend 
                                    verticalAlign="top" 
                                    align="right" 
                                    height={36}
                                    payload={[
                                        { value: 'Tổng Doanh thu', type: 'rect', color: '#f59e0b' },
                                        { value: 'Tổng Chi phí', type: 'rect', color: '#3b82f6' }
                                    ]}
                                />
                                <Bar 
                                    dataKey="revenue" 
                                    name="Tổng Doanh thu" 
                                    fill="#f59e0b"
                                    barSize={20} 
                                    radius={[6, 6, 0, 0]} 
                                />
                                <Bar 
                                    dataKey="cost" 
                                    name="Tổng Chi phí" 
                                    fill="#3b82f6"
                                    barSize={20}
                                    radius={[6, 6, 0, 0]} 
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </Card>

            {/* --- 3. BIỂU ĐỒ ĐƯỜNG LỢI NHUẬN THUẦN (MỚI) --- */}
            <Card className="p-6 mt-6">
                <div className="text-xl font-bold mb-4 text-gray-800">
                    Xu Hướng Lợi Nhuận Thuần Hàng Ngày
                </div>
                <div className="h-[250px] w-full">
                    {isLoading ? <LoadingState /> : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                                <XAxis dataKey="label" tickLine={false} className="text-xs text-gray-500" />
                                <YAxis 
                                    tickFormatter={formatVND} 
                                    axisLine={false} 
                                    tickLine={false}
                                    className="text-xs text-gray-500"
                                />
                                <Tooltip 
                                    formatter={(value) => [formatVND(value), 'Lợi nhuận Thuần']}
                                    contentStyle={{ 
                                        borderRadius: '6px', fontSize: '14px', padding: '8px 12px', 
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #ccc' 
                                    }}
                                />
                                <Legend 
                                    verticalAlign="top" 
                                    align="right" 
                                    height={36}
                                    payload={[{ value: 'Lợi nhuận Thuần', type: 'line', color: '#10b981' }]}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="profit" 
                                    stroke="#10b981" // Màu xanh ngọc lục bảo
                                    strokeWidth={3} 
                                    name="Lợi nhuận Thuần" 
                                    dot={false} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </Card>
        </div>
    );
}

// React component cần được export default
export default ProfitCharts;
