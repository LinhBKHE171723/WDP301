import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const buildQueryString = (params) => {
    return Object.entries(params)
        .filter(([_, value]) => value != null && value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
};

const formatCurrency = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

const ItemTrendAnalytics = () => {
    // --- STATE & ROUTER ---
    const location = useLocation();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    
    const [trendData, setTrendData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        itemId: queryParams.get('itemId') || '',
        type: 'monthly',
        metric: 'totalRevenue'
    });
    const itemName = queryParams.get('itemName') || '...';

    // --- API CALL ---
    useEffect(() => {
        const itemIdFromUrl = queryParams.get('itemId');
        if (itemIdFromUrl) {
            setFilters(prev => ({ ...prev, itemId: itemIdFromUrl }));
        }

        if (!itemIdFromUrl) {
            setError("Không tìm thấy ID món ăn trong URL.");
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const queryString = buildQueryString({
                    itemId: filters.itemId,
                    type: filters.type
                });
                const response = await fetch(`/api/admin/items/trend?${queryString}`);
                if (!response.ok) {
                     const errData = await response.json();
                     throw new Error(errData.message || 'Failed to fetch trend data');
                }
                const data = await response.json();
                setTrendData(data.data || []);
            } catch (err) {
                console.error("Fetch Trend Error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [queryParams, filters.itemId, filters.type]); 

    // --- HANDLERS & DERIVED STATE ---
    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const currentMetric = useMemo(() => ({
        key: filters.metric,
        // Thêm các thuộc tính khác nếu cần (label, color, ...)
    }), [filters.metric]);

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <Link to="/item-report" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: '#4b5563', marginRight: '1rem' }}>
                    <ArrowLeft size={24} />
                </Link>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>
                    Phân tích chi tiết: <span style={{ color: '#4f46e5' }}>{decodeURIComponent(itemName)}</span>
                </h1>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                 <select name="type" value={filters.type} onChange={handleFilterChange} style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}>
                    <option value="daily">Theo Ngày</option>
                    <option value="weekly">Theo Tuần</option>
                    <option value="monthly">Theo Tháng</option>
                 </select>
                 <select name="metric" value={filters.metric} onChange={handleFilterChange} style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}>
                    <option value="totalRevenue">Doanh Thu</option>
                    <option value="totalQuantity">Số Lượng Bán</option>
                    <option value="cancellationRate">Tỷ Lệ Hủy</option>
                    <option value="avgServiceTimeMinutes">TG Phục Vụ</option>
                 </select>
            </div>

            {/* Chart and Data */}
            {loading && <p>Đang tải dữ liệu biểu đồ...</p>}
            {error && <p style={{ color: 'red' }}>Lỗi: {error}</p>}
            {!loading && !error && (
                trendData.length > 0 ? (
                    <div style={{ height: '400px', backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" />
                                <YAxis tickFormatter={(val) => filters.metric === 'totalRevenue' ? `${(val/1000).toLocaleString('vi-VN')}k` : val} />
                                <Tooltip formatter={(value) => filters.metric === 'totalRevenue' ? formatCurrency(value) : value.toLocaleString('vi-VN')} />
                                <Line type="monotone" dataKey={filters.metric} stroke="#8884d8" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <p>Không có dữ liệu để hiển thị cho lựa chọn này.</p>
                )
            )}
        </div>
    );
};

export default ItemTrendAnalytics;