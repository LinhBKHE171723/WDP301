import React, { useState, useEffect, useMemo } from 'react';

// --- COMPONENT CHÍNH ---
const CustomerReport = () => {
    // --- STATE MANAGEMENT ---
    const [allCustomers, setAllCustomers] = useState([]); // Lưu trữ toàn bộ danh sách khách hàng từ API
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // State cho các bộ lọc
    const initialFilters = { from: '', to: '', minSpent: '', minOrders: '', search: '' };
    const [filters, setFilters] = useState(initialFilters);

    // State cho sort
    const [sortField, setSortField] = useState('reliability'); // Mặc định sort theo reliability
    const [sortDirection, setSortDirection] = useState('desc'); // desc = từ cao xuống thấp

    // State cho phân trang
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10; // 10 khách hàng mỗi trang

    // --- API ENDPOINT ---
    const API_URL = 'http://localhost:5000/api/admin/reports/customers';

    // --- EFFECT ĐỂ FETCH DỮ LIỆU ---
    // Chỉ fetch một lần khi component được mount
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Tạm thời chưa gửi filter khi fetch lần đầu
                const response = await fetch(API_URL);
                if (!response.ok) {
                    throw new Error('Không thể tải dữ liệu khách hàng');
                }
                const result = await response.json();
                setAllCustomers(result.data || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []); // Dependency rỗng `[]` để chỉ chạy 1 lần

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
        
        // Sắp xếp
        customers.sort((a, b) => {
            let aValue = a[sortField];
            let bValue = b[sortField];
            
            // Xử lý null values
            if (aValue === null || aValue === undefined) aValue = sortField === 'recencyDays' ? Infinity : -Infinity;
            if (bValue === null || bValue === undefined) bValue = sortField === 'recencyDays' ? Infinity : -Infinity;
            
            if (sortDirection === 'desc') {
                return bValue - aValue;
            } else {
                return aValue - bValue;
            }
        });
        
        return customers;
    }, [allCustomers, filters, sortField, sortDirection]);


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
        setSortField('reliability');
        setSortDirection('desc');
    };

    const handleSort = (field) => {
        if (sortField === field) {
            // Đổi chiều sort nếu đã sort theo field này
            setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
        } else {
            // Sort theo field mới, mặc định desc
            setSortField(field);
            setSortDirection('desc');
        }
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
            
            {/* --- BỘ LỌC --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 border rounded-md">
                <div className="col-span-full">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Tìm kiếm (Tên / Email / SĐT)</label>
                    <input 
                        type="text" 
                        name="search" 
                        placeholder="Nhập tên, email hoặc số điện thoại..." 
                        value={filters.search} 
                        onChange={handleFilterChange} 
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Từ ngày</label>
                    <input type="date" name="from" value={filters.from} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md text-sm"/>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Đến ngày</label>
                    <input type="date" name="to" value={filters.to} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md text-sm"/>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Chi tiêu tối thiểu (VND)</label>
                    <input type="number" name="minSpent" placeholder="VD: 5000000" value={filters.minSpent} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md text-sm"/>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Số đơn tối thiểu</label>
                    <input type="number" name="minOrders" placeholder="VD: 10" value={filters.minOrders} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md text-sm"/>
                </div>
                 <div className="col-span-full flex justify-end">
                    <button onClick={handleResetFilters} className="px-4 py-2 bg-gray-500 text-white rounded-md text-sm">Xóa bộ lọc</button>
                </div>
            </div>

            {/* --- BẢNG DỮ LIỆU --- */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hạng</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Khách Hàng</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email / SĐT</th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('reliability')}
                            >
                                Tỷ Lệ Thanh Toán {sortField === 'reliability' && (sortDirection === 'desc' ? '↓' : '↑')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số Đơn</th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('totalSpent')}
                            >
                                Tổng Chi Tiêu {sortField === 'totalSpent' && (sortDirection === 'desc' ? '↓' : '↑')}
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('averageOrderValue')}
                            >
                                Giá Trị Đơn TB {sortField === 'averageOrderValue' && (sortDirection === 'desc' ? '↓' : '↑')}
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('frequencyPerMonth')}
                            >
                                Tần Suất {sortField === 'frequencyPerMonth' && (sortDirection === 'desc' ? '↓' : '↑')}
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('recencyDays')}
                            >
                                Gần Đây {sortField === 'recencyDays' && (sortDirection === 'desc' ? '↓' : '↑')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lần Cuối</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {currentCustomers.length > 0 ? (
                            currentCustomers.map((customer) => (
                                <tr key={customer.userId}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.rank}</td>
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