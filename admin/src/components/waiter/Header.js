import React from "react";
import { Button, Navbar, Container, Nav } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Header() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    return (
        <Navbar
            bg="white"
            expand={false}
            className="shadow-sm sticky-top border-bottom"
            style={{ zIndex: 1030 }}
        >
            <Container fluid className="px-2 px-md-3 py-2">
                {/* Desktop Layout: 1 hàng */}
                <div className="d-none d-lg-flex align-items-center justify-content-between w-100">
                    {/* Logo */}
                    <Navbar.Brand
                        className="fw-bold text-dark d-flex align-items-center p-0"
                        style={{ cursor: "pointer", flexShrink: 0 }}
                        onClick={() => navigate("/waiter/dashboard")}
                    >
                        <span style={{ fontSize: '22px' }}>🍽️</span>
                        <span className="ms-2" style={{ fontSize: '16px' }}>Nhà hàng WDP</span>
                    </Navbar.Brand>

                    {/* Navigation links */}
                    <div className="d-flex align-items-center gap-2">
                        <Link
                            to="/waiter/tables"
                            className="btn btn-warning text-dark fw-semibold px-3 py-1"
                            style={{ fontSize: '14px' }}
                        >
                            Sơ đồ bàn
                        </Link>
                        <Link
                            to="/waiter/checkin"
                            className="btn btn-warning text-dark fw-semibold px-3 py-1"
                            style={{ fontSize: '14px' }}
                        >
                            Check-in
                        </Link>
                        <Link
                            to="/waiter/orders/history"
                            className="btn btn-warning text-dark fw-semibold px-3 py-1"
                            style={{ fontSize: '14px' }}
                        >
                            Lịch sử phục vụ
                        </Link>
                    </div>

                    {/* Profile */}
                    <div className="d-flex align-items-center gap-2">
                        <Link to="/profile" className="text-dark text-decoration-none">
                            <img
                                src={user?.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                                alt="profile"
                                width="36"
                                height="36"
                                className="rounded-circle border"
                                style={{ objectFit: 'cover' }}
                            />
                        </Link>
                        <span className="fw-bold text-dark" style={{ fontSize: '14px' }}>
                            {user?.name}
                        </span>
                        <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={logout}
                            className="fw-semibold px-2"
                        >
                            Đăng xuất
                        </Button>
                    </div>
                </div>

                {/* Mobile Layout: Stacked */}
                <div className="d-flex d-lg-none flex-column gap-2 w-100">
                    {/* Row 1: Logo + Profile */}
                    <div className="d-flex align-items-center justify-content-between">
                        <Navbar.Brand
                            className="fw-bold text-dark d-flex align-items-center p-0"
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate("/waiter/dashboard")}
                        >
                            <span style={{ fontSize: '20px' }}>🍽️</span>
                            <span className="ms-2" style={{ fontSize: '16px' }}>Nhà hàng WDP</span>
                        </Navbar.Brand>
                        <div className="d-flex align-items-center gap-2">
                            <Link to="/profile" className="text-dark text-decoration-none">
                                <img
                                    src={user?.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                                    alt="profile"
                                    width="32"
                                    height="32"
                                    className="rounded-circle border"
                                    style={{ objectFit: 'cover' }}
                                />
                            </Link>
                            <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={logout}
                                className="fw-semibold px-2 py-1"
                                style={{ fontSize: '12px' }}
                            >
                                Thoát
                            </Button>
                        </div>
                    </div>

                    {/* Row 2: Navigation buttons */}
                    <div className="d-flex gap-1 justify-content-between">
                        <Link
                            to="/waiter/tables"
                            className="btn btn-warning text-dark fw-semibold flex-fill px-2 py-1"
                            style={{ fontSize: '12px' }}
                        >
                            Sơ đồ bàn
                        </Link>
                        <Link
                            to="/waiter/checkin"
                            className="btn btn-warning text-dark fw-semibold flex-fill px-2 py-1"
                            style={{ fontSize: '12px' }}
                        >
                            Check-in
                        </Link>
                        <Link
                            to="/waiter/dashboard"
                            className="btn btn-warning text-dark fw-semibold flex-fill px-2 py-1"
                            style={{ fontSize: '12px' }}
                        >
                            Danh sách
                        </Link>
                    </div>
                </div>
            </Container>
        </Navbar>
    );
}
