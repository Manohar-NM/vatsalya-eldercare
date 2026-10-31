import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import HealthRecords from "./pages/HealthRecords";
import CareTeam from "./pages/CareTeam";
import Settings from "./pages/Settings";
import ParentDevice from "./pages/ParentDevice";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Child (Caregiver) Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/health-records" element={<ProtectedRoute><HealthRecords /></ProtectedRoute>} />
        <Route path="/care-team" element={<ProtectedRoute><CareTeam /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* Parent Device Route (no auth - uses unique code) */}
        <Route path="/parent" element={<ParentDevice />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
