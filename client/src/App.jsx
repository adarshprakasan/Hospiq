import { Routes, Route } from "react-router-dom";
import RegisterForm from "./pages/RegisterForm";
import LoginPage from "./pages/LoginPage";
import HospitalRegister from "./pages/HospitalRegister";
import CreateHospital from "./pages/CreateHospital";
import BookingPage from "./pages/BookingPage";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import ProfileDashboard from "./pages/ProfileDashboard";
import MyTokensPage from "./pages/MyTokensPage";
import DoctorScheduleForm from "./pages/DoctorScheduleForm";

function App() {
  return (
    <Routes>
      <Route path="/hospital-register" element={<HospitalRegister />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["doctor", "staff"]}>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={["patient"]}>
            <Layout>
              <BookingPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/create-hospital"
        element={
          <ProtectedRoute allowedRoles={["staff", "doctor"]}>
            <Layout>
              <CreateHospital />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/schedule"
        element={
          <ProtectedRoute allowedRoles={["staff", "doctor"]}>
            <Layout>
              <DoctorScheduleForm />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={["patient", "doctor", "staff"]}>
            <Layout>
              <ProfileDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Need editing---------------- */}
      <Route
        path="/my-tokens"
        element={
          <ProtectedRoute allowedRoles={["patient"]}>
            <Layout>
              <MyTokensPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/unauthorized"
        element={<div style={{ padding: "2rem" }}>Access Denied</div>}
      />
    </Routes>
  );
}

export default App;
