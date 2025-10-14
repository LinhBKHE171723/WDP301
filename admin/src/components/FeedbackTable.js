// components/FeedbackTable.js
import { useEffect, useMemo, useState } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import axios from "axios";

// format dd/mm/yyyy
const formatDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN");
};

// render ⭐ sao
const renderStars = (n) => {
  const full = "⭐".repeat(Number(n || 0));
  const empty = "☆".repeat(5 - Number(n || 0));
  return (
    <span className="whitespace-nowrap" aria-label={`${n}/5`}>
      {full}
      <span className="opacity-40">{empty}</span>
      <span className="ml-1 text-xs text-gray-500">({n || 0})</span>
    </span>
  );
};

export function FeedbackTable() {
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all"); // all | 1..5
  const [feedbacks, setFeedbacks] = useState([]);
  const [openRow, setOpenRow] = useState(null); // id đang mở dialog

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/admin/feedbacks")
      .then((res) => {
        const apiData = res.data.data;
        setFeedbacks(
          Array.isArray(apiData.feedbacks)
            ? [...apiData.feedbacks].sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
              )
            : []
        );
      })
      .catch((err) => {
        console.error("Lỗi khi load feedbacks:", err);
        setFeedbacks([]); // fallback an toàn
      });
  }, []);

  const filtered = useMemo(() => {
    return feedbacks.filter((f) => {
      const customerName = f?.userId?.name || "Guest";
      const staffName = f?.orderId?.servedBy?.name || "";
      const text = `${customerName} ${staffName} ${
        f?.comment || ""
      }`.toLowerCase();
      const matchSearch = text.includes(search.toLowerCase());
      const matchRating =
        ratingFilter === "all" || Number(f?.rating) === Number(ratingFilter);
      return matchSearch && matchRating;
    });
  }, [feedbacks, search, ratingFilter]);

  return (
    <div className="space-y-4">
      <div className="text-2xl font-semibold">Phản hồi khách hàng</div>

      <Card>
        {/* Thanh công cụ: Search + Filter rating */}
        <div className="flex items-center gap-3">
          <Input
            placeholder="Tìm theo khách hàng / nhân viên / nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">Tất cả sao</option>
            <option value="5">5 sao</option>
            <option value="4">4 sao</option>
            <option value="3">3 sao</option>
            <option value="2">2 sao</option>
            <option value="1">1 sao</option>
          </select>

          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setRatingFilter("all");
            }}
          >
            Reset
          </Button>
        </div>

        {/* Bảng */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-sm text-gray-700">
                <th className="p-3">Khách hàng</th>
                <th className="p-3">Nhân viên phục vụ</th>
                <th className="p-3">Đánh giá</th>
                <th className="p-3">Bình luận</th>
                <th className="p-3">Mã đơn</th>
                <th className="p-3">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((fb) => {
                const id = fb?._id || `${fb?.orderId?._id}-${fb?.createdAt}`;
                const customer = fb?.userId?.name || "Guest / Khách ẩn danh";
                const staff = fb?.orderId?.servedBy?.name || "-";
                const staffRole = fb?.orderId?.servedBy?.role
                  ? ` (${fb.orderId.servedBy.role})`
                  : "";
                const orderShort = fb?.orderId?._id
                  ? `${String(fb.orderId._id).slice(-4) }...`
                  : "-";
                const rating = fb?.rating || 0;

                return (
                  <tr
                    key={id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="p-3 font-medium">{customer}</td>
                    <td className="p-3">
                      {staff}
                      {staffRole}
                    </td>
                    <td className="p-3">{renderStars(rating)}</td>
                    <td className="p-3">
                      <Dialog
                        open={openRow === id}
                        onOpenChange={(v) => setOpenRow(v ? id : null)}
                      >
                        <DialogTrigger asChild>
                          <span
                            className="text-blue-600 hover:underline line-clamp-1 cursor-pointer"
                            onClick={() => setOpenRow(id)}
                            title="Xem chi tiết"
                          >
                            {fb?.comment || "(không có nội dung)"}
                          </span>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl">
                          <DialogHeader>
                            <DialogTitle>Chi tiết phản hồi</DialogTitle>
                            <DialogDescription>
                              {customer} • {formatDate(fb?.createdAt)}
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-2">
                            <div>
                              <span className="text-gray-500">Nhân viên:</span>{" "}
                              {staff || "-"}
                            </div>
                            <div>
                              <span className="text-gray-500">Đánh giá:</span>{" "}
                              {renderStars(rating)}
                            </div>
                            <div className="text-gray-700 whitespace-pre-line">
                              {fb?.comment || "(không có nội dung)"}
                            </div>
                            <div className="text-sm text-gray-500">
                              Đơn hàng: {fb?.orderId?._id || "-"}
                            </div>
                          </div>

                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setOpenRow(null)}
                            >
                              Đóng
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </td>
                    <td className="p-3 text-sm text-gray-600">{orderShort}</td>
                    <td className="p-3 text-sm text-gray-600">
                      {formatDate(fb?.createdAt)}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={6}>
                    Không có phản hồi phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
