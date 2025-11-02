import { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/admin/card";
import { Input } from "../ui/admin/input";
import { Badge } from "../ui/admin/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  z,
} from "../ui/admin/dialog";
import { Button } from "../ui/admin/button";
import axios from "axios";

const formatDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN");
};

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
  const [ratingFilter, setRatingFilter] = useState("all");
  const [feedbacks, setFeedbacks] = useState([]);
  const [openRow, setOpenRow] = useState(null);

  // 🔹 Thêm state phân trang
  const [page, setPage] = useState(1);
  const [limit] = useState(10); // đổi số mỗi trang tại đây
  const [total, setTotal] = useState(0);

  // 🔹 Gọi API có phân trang + filter
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/admin/feedbacks", {
        params: {
          page,
          limit,
          rating: ratingFilter === "all" ? undefined : ratingFilter,
          search: search || undefined,
        },
      })
      .then((res) => {
        const apiData = res.data?.data || {};
        setFeedbacks(Array.isArray(apiData.feedbacks) ? apiData.feedbacks : []);
        setTotal(Number(apiData.total || 0));
      })
      .catch((err) => {
        console.error("Lỗi khi load feedbacks:", err);
        setFeedbacks([]);
        setTotal(0);
      });
  }, [page, limit, ratingFilter, search]);

  const filtered = useMemo(() => {
    // vẫn giữ filter phía FE để người dùng tìm nhanh trong trang hiện tại
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

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="text-2xl font-semibold">Phản hồi khách hàng</div>

      <Card>
        {/* Search + Filter rating */}
        <div className="flex items-center gap-3">
          <Input
            placeholder="Tìm theo khách hàng / nhân viên / nội dung..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // reset về trang 1 khi tìm kiếm
            }}
          />

          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setPage(1); // reset về trang 1 khi đổi filter
            }}
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
              setPage(1);
            }}
          >
            Reset
          </Button>
        </div>

        {/* Bảng (giữ nguyên dialog/chi tiết như bạn đang dùng) */}
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
                  ? `${String(fb.orderId._id).slice(-4)}...`
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

                            {/* Giữ nguyên phần chi tiết món như bạn có */}
                            {fb?.orderId?.orderItems?.length > 0 && (
                              <div className="mt-3 border-t pt-2">
                                <h4 className="font-semibold text-gray-800">
                                  Chi tiết món ăn
                                </h4>
                                <table className="w-full mt-2 text-sm border-collapse border border-gray-200">
                                  <thead>
                                    <tr className="bg-gray-50 border-b">
                                      <th className="text-left p-2">Món ăn</th>
                                      <th className="text-left p-2">
                                        Số lượng
                                      </th>
                                      <th className="text-left p-2">Đầu bếp</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {fb.orderId.orderItems.map((item, i) => (
                                      <tr key={i} className="border-b">
                                        <td className="p-2">
                                          {item?.itemId?.name ||
                                            item?.itemName ||
                                            "Không rõ"}
                                        </td>
                                        <td className="p-2">
                                          {item?.quantity || 1}
                                        </td>
                                        <td className="p-2">
                                          {item?.assignedChef?.name ||
                                            "Chưa gán"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
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

        {/* 🔹 Thanh phân trang (mới) */}
        <div className="flex justify-between items-center p-3 text-sm text-gray-600">
          <span>
            Trang {page} / {totalPages} — Tổng {total} phản hồi
          </span>
          <div className="space-x-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trang trước
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Trang sau
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
