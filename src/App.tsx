import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import Login from "./pages/Login";
import SelectRole from "./pages/SelectRole";
import DoctorDashboard from "./pages/DoctorDashboard";
import AddPatient from "./pages/AddPatient";
import PatientDetail from "./pages/PatientDetail";
import PatientHome from "./pages/PatientHome";
import ResetPassword from "./pages/ResetPassword";
import Compare from "./pages/Compare";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Alerts from "./pages/Alerts";
import Medications from "./pages/Medications";
import Patients from "./pages/Patients";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole?: string }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!role) return <Navigate to="/select-role" replace />;
  if (allowedRole && role !== allowedRole) {
    const home = role === "patient" ? "/patient/home" : "/doctor-dashboard";
    return <Navigate to={home} replace />;
  }
  return <>{children}</>;
}

function DoctorOrAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!role) return <Navigate to="/select-role" replace />;
  if (!["doctor", "admin", "support"].includes(role)) return <Navigate to="/patient/home" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/select-role" element={<SelectRole />} />
              <Route path="/doctor-dashboard" element={<DoctorOrAdminRoute><DoctorDashboard /></DoctorOrAdminRoute>} />
              <Route path="/add-patient" element={<DoctorOrAdminRoute><AddPatient /></DoctorOrAdminRoute>} />
              <Route path="/patient/:id" element={<DoctorOrAdminRoute><PatientDetail /></DoctorOrAdminRoute>} />
              <Route path="/patients" element={<DoctorOrAdminRoute><Patients /></DoctorOrAdminRoute>} />
              <Route path="/analytics" element={<DoctorOrAdminRoute><Analytics /></DoctorOrAdminRoute>} />
              <Route path="/reports" element={<DoctorOrAdminRoute><Reports /></DoctorOrAdminRoute>} />
              <Route path="/alerts" element={<DoctorOrAdminRoute><Alerts /></DoctorOrAdminRoute>} />
              <Route path="/medications" element={<DoctorOrAdminRoute><Medications /></DoctorOrAdminRoute>} />
              <Route path="/patient/home" element={<ProtectedRoute allowedRole="patient"><PatientHome /></ProtectedRoute>} />
              <Route path="/compare" element={<DoctorOrAdminRoute><Compare /></DoctorOrAdminRoute>} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
