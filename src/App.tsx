import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Calendar, FileText } from 'lucide-react';
import CalendarApp from './features/calendar/CalendarApp';
import ReportApp from './features/report/ReportApp';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <nav className="h-14 bg-slate-900 text-white flex items-center px-6 gap-6 flex-shrink-0 z-50 no-print">
          <div className="flex items-center gap-2 mr-4">
            <div className="bg-primary-600 p-1.5 rounded-lg shadow-inner">
              <span className="text-white font-bold text-sm">TS</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-wide leading-none">TeamSync</span>
              <span className="text-[9px] text-slate-400 font-medium tracking-widest uppercase">Smart Workspace</span>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
            <NavLink
              to="/calendar"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`
              }
            >
              <Calendar size={16} />
              <span className="hidden sm:inline">캘린더</span>
            </NavLink>
            <NavLink
              to="/report"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`
              }
            >
              <FileText size={16} />
              <span className="hidden sm:inline">보고서</span>
            </NavLink>
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/calendar" element={<CalendarApp />} />
            <Route path="/report" element={<ReportApp />} />
            <Route path="*" element={<Navigate to="/calendar" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;