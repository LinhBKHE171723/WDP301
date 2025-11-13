import React from "react";
import { Button, Navbar, Container } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function CashierHeader() {
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
                <div className="d-flex align-items-center justify-content-between w-100">
                    {/* Logo */}
                    <Navbar.Brand
                        className="fw-bold text-dark d-flex align-items-center p-0"
                        style={{ cursor: "pointer", flexShrink: 0 }}
                        onClick={() => navigate("/admin/cashier/dashboard")}
                    >
                        <span style={{ fontSize: '22px' }}>🍽️</span>
                        <span className="ms-2" style={{ fontSize: '16px' }}>Nhà hàng WDP</span>
                    </Navbar.Brand>

                    {/* Profile */}
                    <div className="d-flex align-items-center gap-2">
                        <Link to="/admin/profile" className="text-dark text-decoration-none">
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
            </Container>
        </Navbar>
    );
}

