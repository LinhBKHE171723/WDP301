import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TableInput from './components/TableInput';
import MenuView from './components/MenuView';
import CashierShiftManager from './components/cashier/CashierShiftManager';

import './App.css';

function App() {
  const [currentTable, setCurrentTable] = useState(null);

  const handleTableSubmit = (table) => {
    setCurrentTable(table);
  };

  const handleBackToTable = () => {
    setCurrentTable(null);
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/reservation"
            element={
              currentTable ?
                <MenuView table={currentTable} onBack={handleBackToTable} /> :
                <TableInput onTableSubmit={handleTableSubmit} />
            }
          />
          <Route path="/menu" element={<div>Menu Page - Coming Soon!</div>} />
          <Route path="/cashier" element={<CashierShiftManager />} />
          

        </Routes>
      </div>
    </Router>
  );
}

export default App;
