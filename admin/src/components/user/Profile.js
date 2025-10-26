import React, { useState } from "react";
import {
    Container,
    Card,
    Button,
    Image,
    Modal,
    Form,
    Spinner,
} from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import Header from "../waiter/Header";
import userApi from "../../api/userApi";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Profile() {
    const { user, setUser } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // Dữ liệu form ban đầu từ user
    const [form, setForm] = useState({
        name: user?.name || "",
        phone: user?.phone || "",
    });

    const [preview, setPreview] = useState(
        user?.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"
    );
    const [file, setFile] = useState(null);

    // 🧩 Khi người dùng chọn ảnh mới
    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        const url = URL.createObjectURL(f);
        setPreview(url);
    };

    // 💾 Lưu thông tin hồ sơ (gửi tới backend)
    const handleSave = async () => {
        setSaving(true);
        try {
            // Tạo FormData để gửi file và các trường khác
            const formData = new FormData();
            formData.append("name", form.name);
            formData.append("phone", form.phone);
            if (file) formData.append("avatar", file); // chỉ thêm khi có file

            // Gọi API backend cập nhật
            const res = await userApi.updateProfile(formData, true); // thêm flag true để gửi multipart

            toast.success("Cập nhật hồ sơ thành công!");
            setUser?.(res.user); // Cập nhật context
            // ✅ Cập nhật localStorage để khi reload vẫn thấy đúng
            localStorage.setItem("user", JSON.stringify(res.user));
            if (res.token) localStorage.setItem("token", res.token);
            setShowModal(false);
        } catch (err) {
            console.error("❌ Lỗi cập nhật hồ sơ:", err);
            toast.error("Không thể lưu hồ sơ, vui lòng thử lại!");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container className="py-4">
            {/* 🧭 Header */}
            <Header />

            <h3 className="my-4">Hồ sơ cá nhân</h3>

            {/* 🪪 Hiển thị thông tin hiện tại */}
            <Card className="p-3 d-flex flex-row align-items-center gap-3 shadow-sm">
                <Image
                    src={preview}
                    roundedCircle
                    width={100}
                    height={100}
                    alt="avatar"
                />
                <div>
                    <h5>{user?.name}</h5>
                    <p className="mb-1">
                        <span className="fw-bold">Email:</span> {user?.email}
                    </p>
                    <p className="mb-1">
                        <span className="fw-bold">Phone number:</span>{" "}
                        {user?.phone || "Chưa có số điện thoại"}
                    </p>
                    <Button variant="outline-primary" onClick={() => setShowModal(true)}>
                        Chỉnh sửa
                    </Button>
                </div>
            </Card>

            {/* ✏️ Modal chỉnh sửa */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Chỉnh sửa thông tin</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        {/* Ảnh đại diện */}
                        <div className="d-flex align-items-center mb-3 gap-3">
                            <div style={{ width: 96, height: 96 }}>
                                <Image src={preview} roundedCircle width={96} height={96} />
                            </div>
                            <Form.Group controlId="formFile" className="mb-0">
                                <Form.Label>Ảnh đại diện</Form.Label>
                                <Form.Control
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </Form.Group>
                        </div>

                        {/* Họ tên */}
                        <Form.Group className="mb-3">
                            <Form.Label>Họ và tên</Form.Label>
                            <Form.Control
                                value={form.name}
                                onChange={(e) =>
                                    setForm({ ...form, name: e.target.value })
                                }
                            />
                        </Form.Group>

                        {/* Số điện thoại */}
                        <Form.Group className="mb-3">
                            <Form.Label>Số điện thoại</Form.Label>
                            <Form.Control
                                value={form.phone}
                                onChange={(e) =>
                                    setForm({ ...form, phone: e.target.value })
                                }
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Hủy
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={saving}>
                        {saving ? <Spinner animation="border" size="sm" /> : "Lưu"}
                    </Button>
                </Modal.Footer>
            </Modal>
            <ToastContainer position="top-right" autoClose={2000} />
        </Container>
    );
}
