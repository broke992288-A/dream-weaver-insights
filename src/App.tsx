import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useRealtimeInvalidation } from "@/hooks/useRealtimeInvalidation";
import { LanguageProvider } from "@/hooks/useLanguage";
import { ErrorBoundary } from "@/components/features/ErrorBoundary";
import { handleError } from "@/utils/errorHandler";
import Login from "./pages/Login";
import SelectRole from "./pages/SelectRole";
import DoctorDashboard from "./pages/DoctorDashboard";
import AddPatient from "./pages/AddPatient";
import PatientDetail from "./pages/PatientDetail";
import PatientHome from "./pages/PatientHome";
import PatientProfile from "./pages/PatientProfile";
import ResetPassword from "./pages/ResetPassword";
import Compare from "./pages/Compare";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Alerts from "./pages/Alerts";
import Medications from "./pages/Medications";
import Patients from "./pages/Patients";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.skipGlobalError) return;
      handleError(error, `Query [${query.queryKey[0]}]`);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      handleError(error, "Mutation");
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

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

function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtimeInvalidation();
  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <RealtimeProvider>
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
              <Route path="/patient/home" element={<ProtectedRoute allowedRole="patient"><PatientProfile /></ProtectedRoute>} />
              <Route path="/compare" element={<DoctorOrAdminRoute><Compare /></DoctorOrAdminRoute>} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </RealtimeProvider>
          </AuthProvider>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
