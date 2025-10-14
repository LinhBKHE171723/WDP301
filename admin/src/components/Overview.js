import { Card } from "./ui/card";

export function Overview() {
  const items = [
    { label: "Tổng người dùng", value: "2,543", delta: "+12.5%" },
    { label: "Phản hồi đang xử lý", value: "142", delta: "+8.2%" },
    { label: "Doanh thu tháng này", value: "1.045.231.000đ", delta: "+23.1%" },
    { label: "Tỷ lệ tăng trưởng", value: "18.2%", delta: "+4.3%" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it) => (
        <Card key={it.label}>
          <div className="text-sm text-gray-600">{it.label}</div>
          <div className="mt-1 text-2xl font-semibold">{it.value}</div>
          <div className="mt-1 text-sm text-green-600">{it.delta} so với tháng trước</div>
        </Card>
      ))}
    </div>
  );
}
