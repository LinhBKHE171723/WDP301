import { Input } from "./ui/input";
import { Button } from "./ui/button";

export function Header() {
  return (
    <header className="container-page flex items-center justify-between">
      <div className="text-2xl font-semibold">Tổng quan</div>
      <div className="flex items-center gap-3">
        <div className="w-72"><Input placeholder="Tìm kiếm..." /></div>
        <Button variant="outline">Xuất báo cáo</Button>
      </div>
    </header>
  );
}
