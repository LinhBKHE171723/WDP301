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
import userApi from "../../api/userApi"; // ✅ gọi API backend
import axios from "axios";
import { toast } from "react-toastify";

export default function Profile() {
    const {user, logout, setUser } = useAuth(); // setUser để cập nhật lại context
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: user?.name || "",
        phone: user?.phone || "",
        avatar: user?.avatar || "",
    });
    const [file, setFile] = useState(null); // file ảnh mới
    const [preview, setPreview] = useState(user?.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"); // ảnh preview

    // 📸 Khi chọn file mới
    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        const url = URL.createObjectURL(f);
        setPreview(url);
    };

    // ☁️ Upload ảnh lên Cloudinary
    const uploadToCloudinary = async (file) => {
        // Lấy chữ ký upload (signature) từ backend
        const sigRes = await axios.get("/api/cloudinary/upload/signature");
        const { signature, timestamp } = sigRes.data;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", process.env.REACT_APP_CLOUDINARY_API_KEY);
        formData.append("timestamp", timestamp);
        formData.append("signature", signature);
        formData.append("folder", "restaurant_profiles");

        const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

        const uploadRes = await axios.post(url, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        return uploadRes.data.secure_url; // trả về link ảnh
    };

    // 💾 Lưu thông tin hồ sơ
    const handleSave = async () => {
        setSaving(true);
        try {
            let avatarUrl = form.avatar;

            // Nếu người dùng chọn ảnh mới → upload lên Cloudinary
            if (file) {
                avatarUrl = await uploadToCloudinary(file);
            }

            // Gọi API cập nhật hồ sơ
            const updatedUser = await userApi.updateProfile({
                name: form.name,
                phone: form.phone,
                avatar: avatarUrl,
            });

            toast.success("Cập nhật hồ sơ thành công!");
            setUser?.(updatedUser); // Cập nhật context
            setShowModal(false);
        } catch (error) {
            console.error("❌ Lỗi cập nhật hồ sơ:", error);
            toast.error("Không thể lưu hồ sơ, vui lòng thử lại!");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container className="py-4">
            {/* 🧭 Header chung cho nhân viên phục vụ */}
            <Header user={user} onLogout={logout} />

            <h3 className="my-4">Hồ sơ cá nhân</h3>

            {/* 🪪 Thông tin người dùng hiển thị tĩnh */}
            <Card className="p-3 d-flex flex-row align-items-center gap-3 shadow-sm">
                <Image
                    src={
                        user?.avatar ||
                        "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                    }
                    roundedCircle
                    width={100}
                    height={100}
                />
                <div>
                    <h5>{user?.name}</h5>
                    <p className="mb-1"> <span className="fw-bold">Email:</span>  {user?.email}</p>
                    <p className="mb-1"> <span className="fw-bold">Phone number:</span> {user?.phone || "Chưa có số điện thoại"}</p>
                    <Button variant="outline-primary" onClick={() => setShowModal(true)}>
                        Chỉnh sửa
                    </Button>
                </div>
            </Card>

            {/* ✏️ Modal chỉnh sửa hồ sơ */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Chỉnh sửa thông tin</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        {/* Ảnh đại diện */}
                        <div className="d-flex align-items-center mb-3 gap-3">
                            <div style={{ width: 96, height: 96 }}>
                                {preview ? (
                                    <Image src={preview} roundedCircle width={96} height={96} />
                                ) : (
                                    <div
                                        style={{
                                            width: 96,
                                            height: 96,
                                            background: "#eee",
                                            borderRadius: "50%",
                                        }}
                                    />
                                )}
                            </div>
                            <Form.Group controlId="formFile" className="mb-0">
                                <Form.Label>Ảnh đại diện</Form.Label>
                                <Form.Control
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                <Form.Text className="text-muted">
                                    Ảnh sẽ được upload lên Cloudinary.
                                </Form.Text>
                            </Form.Group>
                        </div>

                        {/* Họ tên */}
                        <Form.Group className="mb-3">
                            <Form.Label>Họ và tên</Form.Label>
                            <Form.Control
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </Form.Group>

                        {/* Số điện thoại */}
                        <Form.Group className="mb-3">
                            <Form.Label>Số điện thoại</Form.Label>
                            <Form.Control
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
        </Container>
    );
}
