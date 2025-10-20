import React from "react";
import { Button, Navbar, Container, Nav } from "react-bootstrap";

export default function Header({ onLogout, user }) {
  return (
    <Navbar
      bg="white"
      expand="md"
      className="shadow-sm sticky-top border-bottom"
    >
      <Container fluid className="px-3">
        {/* Logo + tên nhà hàng */}
        <Navbar.Brand className="fw-bold text-dark d-flex align-items-center">
          🍽️ <span className="ms-2">Nhà hàng WDP</span>
        </Navbar.Brand>

        {/* Nút toggle hiển thị khi mobile */}
        <Navbar.Toggle aria-controls="main-navbar" />

        <Navbar.Collapse id="main-navbar">
          {/* Navigation links - căn giữa khi rộng, xuống hàng khi hẹp */}
          <Nav className="mx-auto my-2 my-md-0 text-center">
            <Button variant="warning" className="text-dark fw-semibold mx-1 mb-2 mb-md-0">
              Sơ đồ bàn
            </Button>
            <Button variant="warning" className="text-dark fw-semibold mx-1 mb-2 mb-md-0">
              Check-in
            </Button>
            <Button variant="warning" className="text-dark fw-semibold mx-1 mb-2 mb-md-0">
              Danh sách Order
            </Button>
          </Nav>

          {/* Phần profile bên phải */}
          <div className="d-flex align-items-center justify-content-center gap-2 mt-3 mt-md-0">
            <img
              src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
              alt="profile"
              width="35"
              height="35"
              className="rounded-circle border"
            />
            <span className="fw-bold text-dark d-none d-sm-inline">
              {user?.name}
            </span>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={onLogout}
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
