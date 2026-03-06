import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Stethoscope, User, Loader2, HeadsetIcon, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import type { AppRole } from "@/types/roles";
import { registerPatientSelf } from "@/services/authService";

export default function SelectRole() {
  const { user, role, setUserRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [selecting, setSelecting] = useState<AppRole | null>(null);

  const getRoleRedirect = (r: AppRole) => {
    switch (r) { case "doctor": return "/doctor-dashboard"; case "patient": return "/patient/home"; case "support": return "/doctor-dashboard"; case "admin": return "/doctor-dashboard"; }
  };

  useEffect(() => { if (!authLoading && role) navigate(getRoleRedirect(role), { replace: true }); }, [role, authLoading, navigate]);
  if (!user) { navigate("/login", { replace: true }); return null; }

  const handleSelect = async (selectedRole: AppRole) => {
    setSelecting(selectedRole);
    try {
      await setUserRole(selectedRole);

      // If patient, create/link patient record using the DB function
      if (selectedRole === "patient") {
        const meta = user.user_metadata || {};
        await registerPatientSelf({
          fullName: meta.full_name || user.email || "",
          phone: meta.phone || null,
        });
      }

      navigate(getRoleRedirect(selectedRole), { replace: true });
    }
    catch (err: any) { toast({ title: t("common.error"), description: err.message, variant: "destructive" }); setSelecting(null); }
  };

  const roles = [
    { role: "doctor" as AppRole, icon: Stethoscope, title: t("role.doctor"), description: t("role.doctorDesc") },
    { role: "patient" as AppRole, icon: User, title: t("role.patient"), description: t("role.patientDesc") },
    { role: "support" as AppRole, icon: HeadsetIcon, title: t("role.support"), description: t("role.supportDesc") },
    { role: "admin" as AppRole, icon: ShieldCheck, title: t("role.admin"), description: t("role.adminDesc") },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25"><Heart className="h-7 w-7 text-primary-foreground" /></div>
          <div className="text-center"><h1 className="text-3xl font-bold tracking-tight">{t("role.welcome")}</h1><p className="mt-1 text-muted-foreground">{t("role.selectRole")}</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map(({ role: r, icon: Icon, title, description }) => (
            <Card key={r} className="group cursor-pointer border-2 border-transparent transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10" onClick={() => !selecting && handleSelect(r)}>
              <CardHeader className="items-center text-center pb-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {selecting === r ? <Loader2 className="h-8 w-8 animate-spin" /> : <Icon className="h-8 w-8" />}
                </div>
                <CardTitle className="text-lg mt-3">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center"><CardDescription>{description}</CardDescription></CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}