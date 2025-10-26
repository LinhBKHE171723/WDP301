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
            expand="md"
            className="shadow-sm sticky-top border-bottom"
        >
            <Container fluid className="px-3">
                {/* Logo + tên nhà hàng */}
                {/* Logo + tên nhà hàng */}
                <Navbar.Brand
                    className="fw-bold text-dark d-flex align-items-center"
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate("/waiter/dashboard")}
                >
                    🍽️ <span className="ms-2">Nhà hàng WDP</span>
                </Navbar.Brand>

                {/* Nút toggle hiển thị khi mobile */}
                <Navbar.Toggle aria-controls="main-navbar" />

                <Navbar.Collapse id="main-navbar">
                    {/* Navigation links - căn giữa khi rộng, xuống hàng khi hẹp */}
                    <Nav className="mx-auto my-2 my-md-0 text-center">
                        <Nav.Link
                            as={Link}
                            to="/waiter/tables"
                            className="btn btn-warning text-dark fw-semibold mx-1 mb-2 mb-md-0"
                        >
                            Sơ đồ bàn
                        </Nav.Link>
                        <Button variant="warning" className="text-dark fw-semibold mx-1 mb-2 mb-md-0">
                            <Link to="/waiter/checkin" className="text-dark text-decoration-none">
                                Check-in
                            </Link>
                        </Button>
                        <Button variant="warning" className="text-dark fw-semibold mx-1 mb-2 mb-md-0">
                            Danh sách Order
                        </Button>
                    </Nav>

                    {/* Phần profile bên phải */}
                    <div className="d-flex align-items-center justify-content-center gap-2 mt-3 mt-md-0">
                        <Link to="/profile" className="text-dark text-decoration-none">
                            <img
                                src={user?.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                                alt="profile"
                                width="35"
                                height="35"
                                className="rounded-circle border"
                            />
                        </Link>
                        <span className="fw-bold text-dark d-none d-sm-inline">
                            {user?.name}
                        </span>
                        <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={logout}
                            className="fw-semibold"
                        >
                            Đăng xuất
                        </Button>
                    </div>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}
