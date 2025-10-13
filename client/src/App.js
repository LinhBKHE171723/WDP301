import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import Profile from "./components/screens/Profile";
import PrivateRoute from "./components/auth/PrivateRoute";

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("token"));

  const onLogin = () => setAuthed(true);
  const onLogout = () => {
    localStorage.removeItem("token");
    setAuthed(false);
  };

  return (
    <BrowserRouter>
      <nav style={{ padding: 12, borderBottom: "1px solid #ccc" }}>
        <Link to="/" style={{ marginRight: 12 }}>Home</Link>
        {authed ? (
          <>
            <Link to="/profile" style={{ marginRight: 12 }}>Profile</Link>
            <button onClick={onLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ marginRight: 12 }}>Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<div style={{ padding: 20 }}>Welcome — Restaurant Demo</div>} />
        <Route path="/login" element={<Login onLogin={onLogin} />} />
        <Route path="/register" element={<Register onLogin={onLogin} />} />

        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile onLogout={onLogout} />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
