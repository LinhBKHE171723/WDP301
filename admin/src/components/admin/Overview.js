import { useEffect, useState } from "react";
import { Card } from "../ui/admin/card";
import adminApi from "../../api/adminApi";

export function Overview() {
  const [wasteStats, setWasteStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWasteStats = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getIngredientWasteStats();
        setWasteStats(response);
      } catch (err) {
        console.error("Lỗi khi load thống kê thất thoát:", err);
        setWasteStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWasteStats();
  }, []);

  const items = [
    { label: "Tổng người dùng", value: "2,543", delta: "+12.5%" },
    { label: "Phản hồi đang xử lý", value: "142", delta: "+8.2%" },
    { label: "Doanh thu tháng này", value: "1.045.231.000đ", delta: "+23.1%" },
    { label: "Tỷ lệ tăng trưởng", value: "18.2%", delta: "+4.3%" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((it) => (
          <Card key={it.label}>
            <div className="text-sm text-gray-600">{it.label}</div>
            <div className="mt-1 text-2xl font-semibold">{it.value}</div>
            <div className="mt-1 text-sm text-green-600">
              {it.delta} so với tháng trước
            </div>
          </Card>
        ))}
      </div>

      {/* Thất thoát nguyên liệu hết hạn */}
      <Card>
        <div className="text-sm text-gray-600 mb-2">Thất thoát nguyên liệu hết hạn</div>
        {loading ? (
          <div className="text-gray-500">Đang tải...</div>
        ) : wasteStats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div>
              <div className="text-xs text-gray-500">Hôm nay</div>
              <div className="text-lg font-semibold text-red-600">
                {wasteStats.todayVND || "0 ₫"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Tháng này</div>
              <div className="text-lg font-semibold text-red-600">
                {wasteStats.thisMonthVND || "0 ₫"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Năm này</div>
              <div className="text-lg font-semibold text-red-600">
                {wasteStats.thisYearVND || "0 ₫"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Tổng thất thoát</div>
              <div className="text-lg font-semibold text-red-700">
                {wasteStats.totalVND || "0 ₫"}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Không thể tải dữ liệu</div>
        )}
      </Card>
    </div>
  );
}
