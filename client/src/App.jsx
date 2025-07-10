import { Routes, Route } from "react-router-dom";
import BookingPage from "./pages/BookingPage";
import LoginPage from "./pages/LoginPage";
import RegisterForm from "./pages/RegisterForm";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterForm />} />

      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={["patient"]}>
            <BookingPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["doctor", "staff"]}>
            <DashboardPage />
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
