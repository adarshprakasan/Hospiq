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
const DoctorProfilePage = lazy(() => import("./pages/DoctorProfilePage"));

const MedicalRecordsPage = lazy(() => import("./pages/MedicalRecordsPage"));
const MedicationsPage = lazy(() => import("./pages/MedicationsPage"));
const PharmacyPage = lazy(() => import("./pages/PharmacyPage"));
const PharmacyPaymentPage = lazy(() => import("./pages/PharmacyPaymentPage"));
const PharmacyTeamPage = lazy(() => import("./pages/PharmacyTeamPage"));

const PatientQrPage = lazy(() => import("./pages/PatientQrPage"));
const AdministrationPage = lazy(() => import("./pages/AdministrationPage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));

const PasswordRecoveryPage = lazy(() => import("./pages/PasswordRecoveryPage"));
const FindCarePage = lazy(() => import("./pages/FindCarePage"));
const HealthSummaryPage = lazy(() => import("./pages/HealthSummaryPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const FamilyPage = lazy(() => import("./pages/FamilyPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const LabTestsPage = lazy(() => import("./pages/LabTestsPage"));
function App() {
  return (
    <Suspense fallback={<Box textAlign="center" p={8}><CircularProgress aria-label="Loading page" /></Box>}>
    <Routes>
      <Route path="/inventory" element={<ProtectedRoute allowedRoles={["pharmacist"]}><Layout><InventoryPage /></Layout></ProtectedRoute>} />
      <Route path="/lab-tests" element={<ProtectedRoute allowedRoles={["patient"]}><Layout><LabTestsPage /></Layout></ProtectedRoute>} />
      <Route path="/patients/:patientId/labs" element={<ProtectedRoute allowedRoles={["doctor"]}><Layout><LabTestsPage /></Layout></ProtectedRoute>} />
      <Route path="/family" element={<ProtectedRoute allowedRoles={["patient"]}><Layout><FamilyPage /></Layout></ProtectedRoute>} />
      <Route path="/health-summary" element={<ProtectedRoute allowedRoles={["patient"]}><Layout><HealthSummaryPage /></Layout></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute allowedRoles={["patient"]}><Layout><NotificationsPage /></Layout></ProtectedRoute>} />
      <Route path="/find-care" element={<FindCarePage />} />
      <Route path="/forgot-password" element={<PasswordRecoveryPage />} />
      <Route path="/reset-password" element={<PasswordRecoveryPage />} />
      <Route path="/hospital-register" element={<HospitalRegister />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><Layout><AdministrationPage /></Layout></ProtectedRoute>} />
      <Route path="/hospital-admin" element={<ProtectedRoute allowedRoles={["hospital_admin"]}><Layout><AdministrationPage /></Layout></ProtectedRoute>} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["doctor", "staff", "hospital_admin"]}>
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
          <ProtectedRoute allowedRoles={["hospital_admin", "admin"]}>
            <Layout>
              <CreateHospital />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/schedule"
        element={
          <ProtectedRoute allowedRoles={["staff", "hospital_admin", "admin"]}>
            <Layout>
              <DoctorScheduleForm />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/manage-doctors"
        element={
          <ProtectedRoute allowedRoles={["hospital_admin", "admin"]}>
            <Layout>
              <AdministrationPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/doctor/:doctorId"
        element={
          <ProtectedRoute allowedRoles={["staff", "doctor", "patient", "hospital_admin", "admin"]}>
            <Layout>
              <DoctorProfilePage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={["patient", "doctor", "staff", "pharmacist", "hospital_admin", "admin"]}>
            <Layout>
              <ProfileDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="/book/:hospitalId" element={<BookingPage />} />

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
      <Route path="/my-qr" element={<ProtectedRoute allowedRoles={["patient"]}><Layout><PatientQrPage /></Layout></ProtectedRoute>} />
      <Route path="/medical-records" element={<ProtectedRoute allowedRoles={["patient"]}><Layout><MedicalRecordsPage /></Layout></ProtectedRoute>} />
      <Route path="/medications" element={<ProtectedRoute allowedRoles={["pharmacist"]}><Layout><MedicationsPage /></Layout></ProtectedRoute>} />
      <Route path="/pharmacy" element={<ProtectedRoute allowedRoles={["pharmacist", "patient"]}><Layout><PharmacyPage /></Layout></ProtectedRoute>} />
      <Route path="/pharmacy/payment/:orderId" element={<ProtectedRoute allowedRoles={["patient"]}><Layout><PharmacyPaymentPage /></Layout></ProtectedRoute>} />
      <Route path="/pharmacy-team" element={<ProtectedRoute allowedRoles={["hospital_admin", "admin"]}><Layout><PharmacyTeamPage /></Layout></ProtectedRoute>} />
      <Route path="/patients/:patientId/records" element={<ProtectedRoute allowedRoles={["doctor"]}><Layout><MedicalRecordsPage /></Layout></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}

export default App;
