import { Card } from "./ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Button } from "./ui/button";
import { useState } from "react";

export function ProfitCharts() {
  const [range, setRange] = useState("6m");
  const data = [
    { label: "Tháng 1", revenue: 950, profit: 280 },
    { label: "Tháng 2", revenue: 1100, profit: 350 },
    { label: "Tháng 3", revenue: 1020, profit: 310 },
    { label: "Tháng 4", revenue: 1280, profit: 420 },
  ];
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Xu hướng doanh thu</div>
        <div className="flex items-center gap-3">
          <Select value={range} onValueChange={setRange}>
            {({ open, setOpen, onValueChange }) => (
              <div className="relative">
                <SelectTrigger onClick={() => setOpen(!open)}>
                  <SelectValue placeholder={"6 tháng qua"} />
                </SelectTrigger>
                {open && (
                  <SelectContent>
                    <SelectItem onSelect={() => (onValueChange("7d"), setOpen(false))}>7 ngày qua</SelectItem>
                    <SelectItem onSelect={() => (onValueChange("30d"), setOpen(false))}>30 ngày qua</SelectItem>
                    <SelectItem onSelect={() => (onValueChange("3m"), setOpen(false))}>3 tháng qua</SelectItem>
                    <SelectItem onSelect={() => (onValueChange("6m"), setOpen(false))}>6 tháng qua</SelectItem>
                    <SelectItem onSelect={() => (onValueChange("1y"), setOpen(false))}>1 năm qua</SelectItem>
                  </SelectContent>
                )}
              </div>
            )}
          </Select>
          <Button variant="outline">Xuất báo cáo</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((d) => (
          <Card key={d.label}>
            <div className="text-sm text-gray-600">{d.label}</div>
            <div className="mt-2 text-3xl font-semibold text-blue-600">{d.revenue} tr</div>
            <div className="text-sm text-green-600">Lợi nhuận: {d.profit} tr</div>
          </Card>
        ))}
      </div>
    </Card>
  );
}
