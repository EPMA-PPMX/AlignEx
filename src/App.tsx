import { Routes, Route } from "react-router-dom";

import Login from "../src/pages/Login";
import Home from "./Home";

import ProtectedRoute from "../src/auth/ProtectedRoute";
import Projects from "./pages/Projects";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
