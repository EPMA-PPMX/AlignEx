import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NotificationProvider } from './lib/useNotification';
import { useCurrentUser, DEMO_USER_EMAILID } from './lib/useCurrentUser';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProjectInitiation from './pages/ProjectInitiation';
import Projects from './pages/Projects';
import NewProject from './pages/NewProject';
import ProjectDetail from './pages/ProjectDetail';
import OrganizationalPriorities from './pages/OrganizationalPriorities';
import Resources from './pages/Resources';
import Skills from './pages/Skills';
import ActionItems from './pages/ActionItems';
import Timesheet from './pages/Timesheet';
import TimesheetApproval from './pages/TimesheetApproval';
import Settings from './pages/Settings';
import StatusReport from './pages/StatusReport';
import TaskScheduler from './pages/TaskScheduler';
import Teams from './pages/Teams';

function UnauthorizedScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header band */}
          <div className="bg-gradient-to-r from-[#5B2C91] to-[#26D0CE] p-6 flex items-center justify-center">
            <img
              src="/Just Logo - AlignEX.png"
              alt="AlignEX"
              className="h-12 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          {/* Body */}
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-500 mb-4">
              You are not an authorized user for PPMX.
            </p>

            {DEMO_USER_EMAILID && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-6">
                <p className="text-xs text-gray-400 mb-1">Attempted login as</p>
                <p className="text-sm font-medium text-gray-700 break-all">{DEMO_USER_EMAILID}</p>
              </div>
            )}

            <p className="text-sm text-gray-400">
              Please contact your administrator to request access or verify your account is active.
            </p>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-100 px-8 py-4 text-center">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} PPMX &mdash; Project Portfolio Management
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { loading, unauthorized } = useCurrentUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#26D0CE] mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (unauthorized) {
    return <UnauthorizedScreen />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/initiation" element={<ProjectInitiation />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/new" element={<NewProject />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/priorities" element={<OrganizationalPriorities />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/action-items" element={<ActionItems />} />
        <Route path="/timesheet" element={<Timesheet />} />
        <Route path="/timesheet-approval" element={<TimesheetApproval />} />
        <Route path="/status-report" element={<StatusReport />} />
        <Route path="/scheduler" element={<TaskScheduler />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <NotificationProvider>
      <Router>
        <AppContent />
      </Router>
    </NotificationProvider>
  );
}

export default App;
