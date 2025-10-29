import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import Settings from './pages/Settings';

function App() {
  return (
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
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;