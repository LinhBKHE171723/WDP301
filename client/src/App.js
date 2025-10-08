import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TableInput from './components/TableInput';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<TableInput />} />
          <Route path="/menu" element={<div>Menu Page - Coming Soon!</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
