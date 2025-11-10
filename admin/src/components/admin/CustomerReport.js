import React, { useState, useEffect, useMemo } from 'react';
import Client from "../../api/Client";

// --- COMPONENT CHÍNH ---
const CustomerReport = () => {
    // --- STATE MANAGEMENT ---
    const [allCustomers, setAllCustomers] = useState([]); // Lưu trữ toàn bộ danh sách khách hàng từ API
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // State cho các bộ lọc
    const initialFilters = { from: '', to: '', minSpent: '', minOrders: '', search: '' };
    const [filters, setFilters] = useState(initialFilters);

    // State cho sort - mảng các tiêu chí sort
    const [sortCriteria, setSortCriteria] = useState([
        { field: 'reliability', direction: 'desc' }
    ]); // Mỗi item: { field: string, direction: 'asc' | 'desc' }
    
    // Các field có thể sort
    const sortableFields = [
        { value: 'reliability', label: 'Tỷ Lệ Thanh Toán' },
        { value: 'totalSpent', label: 'Tổng Chi Tiêu' },
        { value: 'averageOrderValue', label: 'Giá Trị Đơn TB' },
        { value: 'frequencyPerMonth', label: 'Tần Suất' },
        { value: 'recencyDays', label: 'Gần Đây' },
        { value: 'paidOrders', label: 'Số Đơn Đã Thanh Toán' }
    ];

    // State cho phân trang
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10; // 10 khách hàng mỗi trang

   useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await Client.get("/admin/reports/customers");
            setAllCustomers(res.data || []);
        } catch (err) {
            console.error(err);
            setError("Không thể tải dữ liệu khách hàng");
        } finally {
            setLoading(false);
        }
    };
    fetchData();
}, []);

    // --- LOGIC LỌC, SẮP XẾP VÀ PHÂN TRANG (CLIENT-SIDE) ---
    const filteredCustomers = useMemo(() => {
        // Bắt đầu với toàn bộ danh sách
        let customers = [...allCustomers];

        // Áp dụng bộ lọc
        if (filters.from) {
            customers = customers.filter(c => new Date(c.lastVisit) >= new Date(filters.from));
        }
        if (filters.to) {
            customers = customers.filter(c => new Date(c.lastVisit) <= new Date(filters.to));
        }
        if (filters.minSpent) {
            customers = customers.filter(c => c.totalSpent >= parseFloat(filters.minSpent));
        }
        if (filters.minOrders) {
            customers = customers.filter(c => c.paidOrders >= parseInt(filters.minOrders, 10));
        }
        // Tìm kiếm theo tên, email, SĐT (không phân biệt hoa thường)
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase().trim();
            customers = customers.filter(c => {
                const name = (c.name || '').toLowerCase();
                const email = (c.email || '').toLowerCase();
                const phone = (c.phone || '').toLowerCase();
                return name.includes(searchTerm) || 
                       email.includes(searchTerm) || 
                       phone.includes(searchTerm);
            });
        }
        
        // Sắp xếp theo nhiều tiêu chí (theo thứ tự trong mảng sortCriteria)
        customers.sort((a, b) => {
            for (const criteria of sortCriteria) {
                const { field, direction } = criteria;
                let aValue = a[field];
                let bValue = b[field];
                
                // Xử lý null values
                if (aValue === null || aValue === undefined) {
                    aValue = field === 'recencyDays' ? Infinity : -Infinity;
                }
                if (bValue === null || bValue === undefined) {
                    bValue = field === 'recencyDays' ? Infinity : -Infinity;
                }
                
                // So sánh
                let comparison = 0;
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    comparison = aValue - bValue;
                } else {
                    // Nếu không phải số, so sánh chuỗi
                    comparison = String(aValue).localeCompare(String(bValue));
                }
                
                // Áp dụng direction
                if (direction === 'desc') {
                    comparison = -comparison;
                }
                
                // Nếu khác nhau, trả về kết quả
                if (comparison !== 0) {
                    return comparison;
                }
                // Nếu bằng nhau, tiếp tục với tiêu chí tiếp theo
            }
            return 0; // Tất cả tiêu chí đều bằng nhau
        });
        
        return customers;
    }, [allCustomers, filters, sortCriteria]);


    // Tính toán dữ liệu cho trang hiện tại
    const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);

    // --- EVENT HANDLERS ---
    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
        setCurrentPage(1); // Reset về trang 1 mỗi khi lọc
    };
    
    const handleResetFilters = () => {
        setFilters(initialFilters);
        setCurrentPage(1);
        setSortCriteria([{ field: 'reliability', direction: 'desc' }]);
    };

    // Thêm tiêu chí sort
    const addSortCriterion = () => {
        setSortCriteria([...sortCriteria, { field: 'reliability', direction: 'desc' }]);
    };

    // Xóa tiêu chí sort
    const removeSortCriterion = (index) => {
        if (sortCriteria.length > 1) {
            setSortCriteria(sortCriteria.filter((_, i) => i !== index));
            setCurrentPage(1);
        }
    };

    // Cập nhật field của tiêu chí
    const updateSortField = (index, field) => {
        setSortCriteria(sortCriteria.map((item, i) => 
            i === index ? { ...item, field } : item
        ));
        setCurrentPage(1);
    };

    // Cập nhật direction của tiêu chí
    const updateSortDirection = (index) => {
        setSortCriteria(sortCriteria.map((item, i) => 
            i === index ? { ...item, direction: item.direction === 'asc' ? 'desc' : 'asc' } : item
        ));
        setCurrentPage(1);
    };


    // --- RENDER ---
    if (loading) {
        return <div className="p-4">Đang tải dữ liệu khách hàng...</div>;
    }
    if (error) {
        return <div className="p-4 text-red-600">Lỗi: {error}</div>;
    }

    return (
        <div className="p-4 bg-white rounded-lg shadow-md font-sans">
            <h1 className="text-2xl font-bold mb-4">Báo Cáo Khách Hàng Thân Thiết</h1>
            
            {/* --- BỘ LỌC VÀ SẮP XẾP - Tối ưu --- */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem", marginBottom: "1rem", padding: "0.75rem", backgroundColor: "white", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)" }}>
                {/* Search - Full Width */}
                <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", marginBottom: "0.375rem", fontWeight: "500", color: "#374151", fontSize: "0.8125rem" }}>Tìm kiếm (Tên / Email / SĐT)</label>
                    <input 
                        type="text" 
                        name="search" 
                        placeholder="Nhập tên, email hoặc số điện thoại..." 
                        value={filters.search} 
                        onChange={handleFilterChange} 
                        style={{ 
                            width: "100%", 
                            padding: "0.4375rem 0.5rem", 
                            border: "1px solid #d1d5db", 
                            borderRadius: "6px", 
                            fontSize: "0.8125rem",
                            outline: "none"
                        }}
                    />
                </div>

                {/* Other Filters - Compact Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", gridColumn: "1 / -1" }}>
                    <div>
                        <label style={{ display: "block", marginBottom: "0.375rem", fontWeight: "500", color: "#374151", fontSize: "0.8125rem" }}>Từ ngày</label>
                        <input 
                            type="date" 
                            name="from" 
                            value={filters.from} 
                            onChange={handleFilterChange} 
                            style={{ 
                                width: "100%", 
                                padding: "0.4375rem 0.5rem", 
                                border: "1px solid #d1d5db", 
                                borderRadius: "6px", 
                                fontSize: "0.8125rem",
                                outline: "none"
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "0.375rem", fontWeight: "500", color: "#374151", fontSize: "0.8125rem" }}>Đến ngày</label>
                        <input 
                            type="date" 
                            name="to" 
                            value={filters.to} 
                            onChange={handleFilterChange} 
                            style={{ 
                                width: "100%", 
                                padding: "0.4375rem 0.5rem", 
                                border: "1px solid #d1d5db", 
                                borderRadius: "6px", 
                                fontSize: "0.8125rem",
                                outline: "none"
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "0.375rem", fontWeight: "500", color: "#374151", fontSize: "0.8125rem" }}>Chi tiêu tối thiểu (VND)</label>
                        <input 
                            type="number" 
                            name="minSpent" 
                            placeholder="VD: 5000000" 
                            value={filters.minSpent} 
                            onChange={handleFilterChange} 
                            style={{ 
                                width: "100%", 
                                padding: "0.4375rem 0.5rem", 
                                border: "1px solid #d1d5db", 
                                borderRadius: "6px", 
                                fontSize: "0.8125rem",
                                outline: "none"
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "0.375rem", fontWeight: "500", color: "#374151", fontSize: "0.8125rem" }}>Số đơn tối thiểu</label>
                        <input 
                            type="number" 
                            name="minOrders" 
                            placeholder="VD: 10" 
                            value={filters.minOrders} 
                            onChange={handleFilterChange} 
                            style={{ 
                                width: "100%", 
                                padding: "0.4375rem 0.5rem", 
                                border: "1px solid #d1d5db", 
                                borderRadius: "6px", 
                                fontSize: "0.8125rem",
                                outline: "none"
                            }}
                        />
                    </div>
                </div>

                {/* Sắp xếp theo nhiều tiêu chí */}
                <div style={{ gridColumn: "1 / -1", marginTop: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid #e5e7eb" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <label style={{ fontWeight: "500", color: "#374151", fontSize: "0.8125rem" }}>Sắp xếp theo nhiều tiêu chí</label>
                        <button
                            onClick={addSortCriterion}
                            style={{ 
                                padding: "0.375rem 0.625rem", 
                                backgroundColor: "#3b82f6", 
                                color: "white", 
                                borderRadius: "6px", 
                                fontSize: "0.75rem",
                                border: "none",
                                cursor: "pointer",
                                fontWeight: "500"
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = "#2563eb"}
                            onMouseOut={(e) => e.target.style.backgroundColor = "#3b82f6"}
                        >
                            + Thêm tiêu chí
                        </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {sortCriteria.map((criterion, index) => (
                            <div key={index} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", backgroundColor: "#f9fafb", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: "500", color: "#6b7280", minWidth: "24px" }}>#{index + 1}</span>
                                <select
                                    value={criterion.field}
                                    onChange={(e) => updateSortField(index, e.target.value)}
                                    style={{ 
                                        flex: 1, 
                                        padding: "0.4375rem 0.5rem", 
                                        border: "1px solid #d1d5db", 
                                        borderRadius: "6px", 
                                        fontSize: "0.8125rem",
                                        outline: "none",
                                        backgroundColor: "white"
                                    }}
                                >
                                    {sortableFields.map(field => (
                                        <option key={field.value} value={field.value}>
                                            {field.label}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => updateSortDirection(index)}
                                    style={{ 
                                        padding: "0.4375rem 0.625rem", 
                                        backgroundColor: "#e5e7eb", 
                                        color: "#374151", 
                                        borderRadius: "6px", 
                                        fontSize: "0.8125rem",
                                        border: "none",
                                        cursor: "pointer",
                                        fontWeight: "500",
                                        minWidth: "36px"
                                    }}
                                    onMouseOver={(e) => e.target.style.backgroundColor = "#d1d5db"}
                                    onMouseOut={(e) => e.target.style.backgroundColor = "#e5e7eb"}
                                    title={criterion.direction === 'desc' ? 'Giảm dần' : 'Tăng dần'}
                                >
                                    {criterion.direction === 'desc' ? '↓' : '↑'}
                                </button>
                                <button
                                    onClick={() => removeSortCriterion(index)}
                                    disabled={sortCriteria.length === 1}
                                    style={{ 
                                        padding: "0.4375rem 0.625rem", 
                                        backgroundColor: sortCriteria.length === 1 ? "#d1d5db" : "#ef4444", 
                                        color: "white", 
                                        borderRadius: "6px", 
                                        fontSize: "0.8125rem",
                                        border: "none",
                                        cursor: sortCriteria.length === 1 ? "not-allowed" : "pointer",
                                        fontWeight: "500",
                                        minWidth: "36px",
                                        opacity: sortCriteria.length === 1 ? 0.5 : 1
                                    }}
                                    onMouseOver={(e) => {
                                        if (sortCriteria.length > 1) {
                                            e.target.style.backgroundColor = "#dc2626";
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (sortCriteria.length > 1) {
                                            e.target.style.backgroundColor = "#ef4444";
                                        }
                                    }}
                                    title="Xóa"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Clear Filters Button */}
                <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginTop: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid #e5e7eb" }}>
                    <button 
                        onClick={handleResetFilters} 
                        style={{ 
                            padding: "0.4375rem 0.875rem", 
                            backgroundColor: "#6b7280", 
                            color: "white", 
                            borderRadius: "6px", 
                            fontSize: "0.8125rem",
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

            {/* --- BẢNG DỮ LIỆU --- */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Khách Hàng</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email / SĐT</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tỷ Lệ Thanh Toán
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số Đơn</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tổng Chi Tiêu
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Giá Trị Đơn TB
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tần Suất
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Gần Đây
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lần Cuối</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {currentCustomers.length > 0 ? (
                            currentCustomers.map((customer, index) => (
                                <tr key={customer.userId}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{customer.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.email || customer.phone}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {customer.reliability !== null && customer.reliability !== undefined ? `${customer.reliability}%` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {customer.paidOrders} / {customer.totalOrders}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                                        {customer.formattedTotalSpent}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {customer.formattedAverageOrderValue}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {customer.frequencyPerMonth !== null && customer.frequencyPerMonth !== undefined 
                                            ? `${customer.frequencyPerMonth} lần/tháng` 
                                            : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {customer.recencyDays !== null && customer.recencyDays !== undefined 
                                            ? `${customer.recencyDays} ngày` 
                                            : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.formattedLastVisit}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="10" className="px-6 py-4 text-center text-sm text-gray-500">
                                    Không tìm thấy khách hàng nào phù hợp với bộ lọc.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- BỘ ĐIỀU KHIỂN PHÂN TRANG --- */}
            {totalPages > 1 && (
                <div className="py-4 flex items-center justify-between">
                    <button 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md disabled:opacity-50"
                    >
                        Trang Trước
                    </button>
                    <span className="text-sm text-gray-700">
                        Trang {currentPage} / {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md disabled:opacity-50"
                    >
                        Trang Sau
                    </button>
                </div>
            )}
        </div>
    );
};

export default CustomerReport;