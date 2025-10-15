import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MenuView from './components/MenuView';
import CashierShiftManager from './components/cashier/CashierShiftManager';

import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/reservation"
            element={<MenuView />}
          />
          <Route path="/menu" element={<div>Menu Page - Coming Soon!</div>} />
          <Route path="/cashier" element={<CashierShiftManager />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
