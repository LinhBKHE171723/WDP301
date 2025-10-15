import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import TableMap from './components/waiter/TableMap'
import TableDetail from './components/waiter/TableDetail'
function App() {
  return (
     <BrowserRouter>
      <div className="container">
        <Routes>
          <Route path="/tables" element={<TableMap />} />
          <Route path="/tables/:id" element={<TableDetail />} />
          <Route path="*" element={<div className="mt-5 text-center">
            404 - Không tìm thấy trang
            <Link to="/tables" className="btn btn-warning btn-sm ms-3">Quay về sơ đồ bàn</Link>
            </div>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App