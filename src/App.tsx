import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NotificationProvider } from './lib/useNotification';
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

function App() {
  return (
    <NotificationProvider>
      <Router>
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
      </Router>
    </NotificationProvider>
  );
}

export default App;