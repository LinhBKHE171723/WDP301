import React from "react";
import { useParams, useLocation } from "react-router-dom";
import ItemTrendAnalytics from "../../components/admin/ItemTrendAnalytics";

export default function AnalyticsPage2() {
  const { itemId } = useParams();
  const location = useLocation();

  // Lấy tên món từ state khi điều hướng, fallback an toàn
  const itemName = location.state?.name || "Chi Tiết Món Ăn";

  return (
    <div className="space-y-6">
      {/* Truyền rõ ràng props để component con không phụ thuộc router */}
      <ItemTrendAnalytics itemId={itemId} itemName={itemName} />
    </div>
  );
}
