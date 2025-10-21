import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
// --- BƯỚC 1: IMPORT AXIOS GIỐNG NHƯ FILE FEEDBACKTABLE.JS ---
import axios from 'axios';

const ItemPerformanceReport = () => {
    // State cho dữ liệu gốc từ API và các bộ lọc
    const [originalData, setOriginalData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortBy, setSortBy] = useState('totalRevenue_desc');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    // State quản lý trạng thái loading và lỗi
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- BƯỚC 2: GỌI API BẰNG AXIOS VỚI URL ĐẦY ĐỦ (HỌC TỪ FEEDBACKTABLE.JS) ---
   // --- BƯỚC 2: GỌI API THEO ĐÚNG CẤU TRÚC CỦA FEEDBACKTABLE.JS ĐỂ DEBUG ---
    useEffect(() => {
        setLoading(true);
        setError(null);

        // Xây dựng URL với các tham số (query params) cho khoảng thời gian
        const params = new URLSearchParams();
        if (dateRange.from) params.append('from', dateRange.from);
        if (dateRange.to) params.append('to', dateRange.to);
        
        // URL đầy đủ của API
        const apiUrl = `http://localhost:5000/api/admin/top-items?${params.toString()}`;

        // === LOGGING ĐỂ DEBUG ===
        // In ra URL cuối cùng sẽ được gọi. Hãy kiểm tra nó trong Developer Console (F12)
        console.log("Đang gọi đến URL:", apiUrl); 
        // ========================

        axios.get(apiUrl)
            .then(response => {
                // === LOGGING ĐỂ DEBUG ===
                console.log("Thành công! Dữ liệu nhận được:", response.data);
                // ========================

                // Kiểm tra lại lần nữa để chắc chắn dữ liệu là một mảng
                if (Array.isArray(response.data)) {
                    setOriginalData(response.data);
                } else {
                    console.error("Lỗi: Dữ liệu trả về không phải là một mảng!", response.data);
                    setError("Dữ liệu nhận được có định dạng không đúng.");
                    setOriginalData([]);
                }
            })
            .catch(err => {
                // === LOGGING ĐỂ DEBUG ===
                console.error("API gặp lỗi:", err);
                // In ra chi tiết lỗi từ server (nếu có)
                if (err.response) {
                    console.error("Chi tiết lỗi từ server:", err.response.data);
                }
                // ========================

                const errorMessage = err.response?.data?.message || err.message || "Có lỗi xảy ra khi tải dữ liệu";
                setError(errorMessage);
                setOriginalData([]); // Xóa dữ liệu cũ khi có lỗi
            })
            .finally(() => {
                setLoading(false); // Luôn tắt loading sau khi hoàn tất
            });

    }, [dateRange]); // Chạy lại khi dateRange thay đổi
    // --- LOGIC XỬ LÝ DỮ LIỆU Ở FRONTEND (KHÔNG THAY ĐỔI) ---
    const categories = useMemo(() => 
        ['all', ...new Set(originalData.map(item => item.category))]
    , [originalData]);

    const filteredAndSortedData = useMemo(() => {
        let data = [...originalData];

        if (searchTerm) {
            data = data.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        if (categoryFilter !== 'all') {
            data = data.filter(item => item.category === categoryFilter);
        }

        const [key, direction] = sortBy.split('_');
        data.sort((a, b) => {
            if (direction === 'asc') {
                return a[key] > b[key] ? 1 : -1;
            }
            return b[key] > a[key] ? 1 : -1;
        });

        return data;
    }, [originalData, searchTerm, categoryFilter, sortBy]);

    const totalRevenue = useMemo(() => filteredAndSortedData.reduce((sum, item) => sum + item.totalRevenue, 0), [filteredAndSortedData]);
    const totalQuantity = useMemo(() => filteredAndSortedData.reduce((sum, item) => sum + item.totalQuantity, 0), [filteredAndSortedData]);
    const bestSeller = useMemo(() => {
        const sortedByQuantity = [...filteredAndSortedData].sort((a,b) => b.totalQuantity - a.totalQuantity);
        return sortedByQuantity.length > 0 ? sortedByQuantity[0].name : 'N/A';
    }, [filteredAndSortedData]);
    
    // --- Các hàm tiện ích và JSX render (KHÔNG THAY ĐỔI GIAO DIỆN) ---
    const formatCurrency = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

    const handleDateChange = (e, type) => {
        setDateRange(prev => ({ ...prev, [type]: e.target.value }));
    };

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', padding: '2rem', backgroundColor: '#f9fafb' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#111827' }}>
                Báo cáo Hiệu suất Món ăn
            </h1>

            {/* Filters Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', md: { gridTemplateColumns: 'repeat(4, 1fr)' }, gap: '1rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Khoảng thời gian</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                         <input type="date" value={dateRange.from} onChange={(e) => handleDateChange(e, 'from')} style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                         <span style={{ margin: '0 0.5rem' }}>-</span>
                         <input type="date" value={dateRange.to} onChange={(e) => handleDateChange(e, 'to')} style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Tìm kiếm món ăn</label>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '10px', top: '10px', color: '#9ca3af' }} size={20} />
                        <input 
                            type="text" 
                            placeholder="VD: Phở Bò..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ padding: '0.5rem 0.5rem 0.5rem 2.5rem', border: '1px solid #d1d5db', borderRadius: '4px', width: '100%' }} 
                        />
                    </div>
                </div>
                 <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Danh mục</label>
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}>
                        {categories.map(cat => <option key={cat} value={cat}>{cat === 'all' ? 'Tất cả' : cat}</option>)}
                    </select>
                </div>
                 <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Sắp xếp theo</label>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}>
                        <option value="totalRevenue_desc">Doanh thu cao nhất</option>
                        <option value="totalRevenue_asc">Doanh thu thấp nhất</option>
                        <option value="totalQuantity_desc">Bán chạy nhất</option>
                        <option value="totalQuantity_asc">Bán ít nhất</option>
                    </select>
                </div>
            </div>

            {/* KPI Cards Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', md: { gridTemplateColumns: 'repeat(3, 1fr)' }, gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
                    <h3 style={{ color: '#6b7280', marginBottom: '0.5rem' }}>Tổng Doanh Thu</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalRevenue)}</p>
                </div>
                <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
                    <h3 style={{ color: '#6b7280', marginBottom: '0.5rem' }}>Tổng Số Lượng Bán</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{totalQuantity.toLocaleString('vi-VN')}</p>
                </div>
                <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
                    <h3 style={{ color: '#6b7280', marginBottom: '0.5rem' }}>Món Bán Chạy Nhất</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6' }}>{bestSeller}</p>
                </div>
            </div>

            {/* Data Table */}
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
                {loading && <p style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu...</p>}
                {error && <p style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>Lỗi: {error}</p>}
                {!loading && !error && (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
                            <tr>
                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Hạng</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Tên Món Ăn</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Danh Mục</th>
                                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Số Lượng Bán</th>
                                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Doanh Thu</th>
                                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedData.length > 0 ? (
                                filteredAndSortedData.map((item, index) => (
                                <tr key={item._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '1rem', fontWeight: '500' }}>{index + 1}</td>
                                    <td style={{ padding: '1rem', fontWeight: 'bold', color: '#111827' }}>{item.name}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: '#e0e7ff', color: '#4338ca', fontSize: '0.875rem' }}>
                                            {item.category}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '500' }}>{item.totalQuantity.toLocaleString('vi-VN')}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>{formatCurrency(item.totalRevenue)}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <Link to={`/admin/item-analytics?itemId=${item._id}`} style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                                            Xem <ChevronRight size={20} />
                                        </Link>
                                    </td>
                                </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Không có dữ liệu phù hợp.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ItemPerformanceReport;