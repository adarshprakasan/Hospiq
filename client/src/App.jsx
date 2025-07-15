import { Routes, Route } from "react-router-dom";
import BookingPage from "./pages/BookingPage";
import LoginPage from "./pages/LoginPage";
import RegisterForm from "./pages/RegisterForm";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import ProfileDashboard from "./pages/ProfileDashboard";
import MyTokensPage from "./pages/MyTokensPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterForm />} />

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
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={["patient", "doctor", "staff"]}>
            <Layout>
              <ProfileDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

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
