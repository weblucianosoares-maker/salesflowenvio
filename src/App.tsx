/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ImportCenter } from './pages/ImportCenter';
import { Dashboard } from './pages/Dashboard';
import { Leads } from './pages/Leads';
import { Campanhas } from './pages/Campanhas';
import { Inbox } from './pages/Inbox';
import { Monitorar } from './pages/Monitorar';
import { Funil } from './pages/Funil';
import { useState } from 'react';

export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-background">
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        />
        
        {/* Main Content */}
        <div className={`flex-1 overflow-auto transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/import" element={<ImportCenter />} />
            <Route path="/campaigns" element={<Campanhas />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/monitor" element={<Monitorar />} />
            <Route path="/funnel" element={<Funil />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
