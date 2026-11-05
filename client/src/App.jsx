import { lazy, Suspense } from "react";
import { CircularProgress, Box } from "@mui/material";
import NotFound from "./pages/NotFound";
import { Routes, Route } from "react-router-dom";
const RegisterForm = lazy(() => import("./pages/RegisterForm"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const HospitalRegister = lazy(() => import("./pages/HospitalRegister"));
const CreateHospital = lazy(() => import("./pages/CreateHospital"));
const HomePage = lazy(() => import("./pages/HomePage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
const ProfileDashboard = lazy(() => import("./pages/ProfileDashboard"));
const MyTokensPage = lazy(() => import("./pages/MyTokensPage"));
const DoctorScheduleForm = lazy(() => import("./pages/DoctorScheduleForm"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const ManageDoctorsPage = lazy(() => import("./pages/ManageDoctorsPage"));
const DoctorProfilePage = lazy(() => import("./pages/DoctorProfilePage"));

function App() {
  return (
    <Suspense fallback={<Box textAlign="center" p={8}><CircularProgress aria-label="Loading page" /></Box>}>
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
              <HomePage />
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
        path="/manage-doctors"
        element={
          <ProtectedRoute allowedRoles={["staff", "doctor"]}>
            <Layout>
              <ManageDoctorsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/doctor/:doctorId"
        element={
          <ProtectedRoute allowedRoles={["staff", "doctor", "patient"]}>
            <Layout>
              <DoctorProfilePage />
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

      <Route path="/book/:hospitalId" element={<ProtectedRoute allowedRoles={["patient"]}><Layout><BookingPage /></Layout></ProtectedRoute>} />

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
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}

export default App;
