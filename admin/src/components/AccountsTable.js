import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import axios from "axios";

// Hàm format ngày từ ISO sang dd/mm/yyyy
const formatDate = (isoDate) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString("vi-VN");
};

export function AccountsTable() {
  const [filterStatus, setFilterStatus] = useState("all");

  const [editData, setEditData] = useState(null);
  const [openEdit, setOpenEdit] = useState(false);

  const [search, setSearch] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [openRow, setOpenRow] = useState(null);

  const toggleDropdown = (id) => setOpenRow(openRow === id ? null : id);
  const handleEdit = (user) => {
    setEditData(user); // Lưu dữ liệu người dùng
    setOpenEdit(true); // Mở dialog
  };
  const handleSaveEdit = async () => {
    try {
      await axios.put(`http://localhost:5000/api/admin/users/${editData._id}`, {
        role: editData.role,
        accountStatus: editData.accountStatus,
      });

      setAccounts((prev) =>
        prev.map((u) => (u._id === editData._id ? editData : u))
      );
      setOpenEdit(false);
    } catch (err) {
      console.error("Lỗi khi cập nhật:", err);
    }
  };

  // STATE FORM & THÔNG BÁO
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "waiter",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Gọi API lấy danh sách
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/admin/users")
      .then((res) => setAccounts(res.data.data.items))
      .catch((err) => console.error("Lỗi khi load users:", err));
  }, []);

  // Lọc tìm kiếm
  const filtered = accounts.filter((a) => {
  const matchSearch =
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase());

  const matchStatus =
    filterStatus === "all" || a.status === filterStatus;

  return matchSearch && matchStatus;
});


  // Validate FE
  const validate = () => {
    const { name, email, phone, role } = formData;
    if (!name.trim() || !email.trim() || !phone.trim() || !role.trim()) {
      setErrorMessage("Vui lòng điền đầy đủ thông tin bắt buộc.");
      return false;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      setErrorMessage("Email không hợp lệ.");
      return false;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      setErrorMessage("Số điện thoại phải gồm đúng 10 số.");
      return false;
    }
    return true;
  };

  // Reset form
  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", role: "waiter" });
    setErrorMessage("");
    setSuccessMessage("");
  };

  // Create Account
  const handleCreateAccount = async (closeDialog) => {
    setErrorMessage("");
    setSuccessMessage("");
    if (!validate()) return;

    try {
      setSubmitting(true);
      const res = await axios.post(
        "http://localhost:5000/api/admin/users",
        formData
      );
      setAccounts((prev) => [res.data.data, ...prev]);
      setSuccessMessage("Tạo tài khoản thành công. Mật khẩu đã gửi email.");

      setTimeout(() => {
        resetForm();
        closeDialog(); // Đóng dialog
      }, 1000);
    } catch (err) {
      if (err?.response?.status === 409) {
        setErrorMessage("Email đã tồn tại. Vui lòng dùng email khác.");
      } else if (err?.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage("Không thể tạo tài khoản. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-semibold">Quản lý tài khoản</div>

        {/* OPEN DIALOG */}
        <Dialog>
          <DialogTrigger asChild>
            <Button>Thêm tài khoản</Button>
          </DialogTrigger>

          <DialogContent className="border-2 border-orange-400 bg-orange-50 shadow-xl rounded-xl">
            <DialogHeader>
              <DialogTitle>Thêm tài khoản mới</DialogTitle>
              <DialogDescription>Nhập thông tin cơ bản</DialogDescription>
              {errorMessage && (
                <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
              )}
              {successMessage && (
                <p className="mt-2 text-sm text-green-600">{successMessage}</p>
              )}
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <Label>Họ và tên</Label>
                <Input
                  name="name"
                  placeholder="Nhập họ tên"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((s) => ({
                      ...s,
                      [e.target.name]: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((s) => ({
                      ...s,
                      [e.target.name]: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Số điện thoại</Label>
                <Input
                  name="phone"
                  type="text"
                  placeholder="09xxxxxxxx"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((s) => ({
                      ...s,
                      [e.target.name]: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Vai trò</Label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData((s) => ({
                      ...s,
                      [e.target.name]: e.target.value,
                    }))
                  }
                  className="w-full border rounded px-2 py-2"
                >
                  <option value="waiter">Phục vụ</option>
                  <option value="chef">Bếp trưởng</option>
                  <option value="cashier">Thu ngân</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  document.body.click(); // đóng dialog thủ công
                }}
              >
                Huỷ
              </Button>
              <Button
                onClick={() => handleCreateAccount(() => document.body.click())}
                disabled={submitting}
              >
                {submitting ? "Đang tạo..." : "Tạo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
      <Card>
        <div className="flex items-center gap-3">
  <Input
    placeholder="Tìm theo tên hoặc email..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />

  <select
    value={filterStatus}
    onChange={(e) => setFilterStatus(e.target.value)}
    className="border rounded px-3 py-2"
  >
    <option value="all">Tất cả</option>
    <option value="active">Hoạt động</option>
    <option value="inactive">Không hoạt động</option>
  </select>
</div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-sm text-gray-700">
                <th className="p-3">Người dùng</th>
                <th className="p-3">Email</th>
                <th className="p-3">Số điện thoại</th>
                <th className="p-3">Vai trò</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Ngày tạo</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u._id}
                  className="border-b last:border-0 hover:bg-gray-50"
                >
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-sm text-gray-600">{u.email}</td>
                  <td className="p-3 text-sm text-gray-600">
                    {u.phone || "-"}
                  </td>
                  <td className="p-3">
                    <Badge>{u.role}</Badge>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={u.status === "active" ? "success" : "default"}
                    >
                      {u.status === "active" ? "Hoạt động" : "Không hoạt động"}
                    </Badge>
                  </td>
                  <td className="p-3 text-sm text-gray-500">
                    {u.createdAt ? formatDate(u.createdAt) : "-"}
                  </td>
                  <td className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(u)} // Mở form sửa
                        >
                          Edit
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent isOpen={openRow === u._id}>
                        <DropdownMenuItem>Xem</DropdownMenuItem>
                        <DropdownMenuItem>Sửa</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          Xoá
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {openEdit && editData && (
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
              <DialogContent className="border-2 border-orange-400 bg-orange-50 shadow-xl ">
                <DialogHeader>
                  <DialogTitle>Sửa tài khoản</DialogTitle>
                  <DialogDescription>
                    Chỉ có thể thay đổi Vai trò & Trạng thái
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  <div>
                    <Label>Họ và tên</Label>
                    <Input value={editData.name} disabled />
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input value={editData.email} disabled />
                  </div>

                  <div>
                    <Label>Số điện thoại</Label>
                    <Input value={editData.phone} disabled />
                  </div>

                  <div>
                    <Label>Vai trò</Label>
                    <select
                      value={editData.role}
                      onChange={(e) =>
                        setEditData((s) => ({ ...s, role: e.target.value }))
                      }
                      className="w-full border rounded px-2 py-2"
                    >
                      <option value="waiter">Phục vụ</option>
                      <option value="chef">Bếp trưởng</option>
                      <option value="cashier">Thu ngân</option>
                    </select>
                  </div>

                  <div>
                    <Label>Trạng thái tài khoản</Label>
                    <select
                      value={editData.accountStatus}
                      onChange={(e) =>
                        setEditData((s) => ({
                          ...s,
                          accountStatus: e.target.value,
                        }))
                      }
                      className="w-full border rounded px-2 py-2"
                    >
                      <option value="active">Hoạt động</option>
                      <option value="banned">Bị cấm</option>
                    </select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenEdit(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleSaveEdit}>Lưu thay đổi</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </Card>
    </div>
  );
}
