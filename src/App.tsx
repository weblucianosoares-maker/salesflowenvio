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
import { Monitorar } from './pages/Monitorar';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-background">
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto ml-64">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/import" element={<ImportCenter />} />
            <Route path="/campaigns" element={<Campanhas />} />
            <Route path="/monitor" element={<Monitorar />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
