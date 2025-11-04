// CÁCH SỬA 1: Đổi tên import thành ItemTrendAnalytics
import ItemPerformanceReport from "../../components/admin/ItemPerformanceReport";

export default function ItemReportPage() {
  // Dùng tên component bạn vừa import
  return (
    <div className="space-y-6">
      <ItemPerformanceReport />
    </div>
  );
}
