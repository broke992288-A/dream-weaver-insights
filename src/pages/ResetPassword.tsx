import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateUserPassword } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageSelector from "@/components/features/LanguageSelector";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast({ title: t("common.error"), description: t("login.passwordMismatch"), variant: "destructive" }); return; }
    setLoading(true);
    try {
      await updateUserPassword(password);
      toast({ title: t("login.passwordUpdated"), description: t("login.passwordUpdatedDesc") });
      navigate("/login");
    } catch (err: any) { toast({ title: t("common.error"), description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-end"><LanguageSelector /></div>
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25"><Heart className="h-7 w-7 text-primary-foreground" /></div>
          <div className="text-center"><h1 className="text-3xl font-bold tracking-tight">{t("login.title")}</h1><p className="mt-1 text-muted-foreground">{t("login.resetPassword")}</p></div>
        </div>
        <Card className="border-0 shadow-xl shadow-primary/5">
          <CardHeader className="space-y-1 pb-4"><CardTitle className="text-xl">{t("login.resetPassword")}</CardTitle><CardDescription>{t("login.resetDesc")}</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="password">{t("login.newPassword")}</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" /></div>
              <div className="space-y-2"><Label htmlFor="confirmPassword">{t("login.confirmPassword")}</Label><Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} placeholder="••••••••" /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}{t("login.updatePassword")}</Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground"><button className="font-medium text-primary hover:underline" onClick={() => navigate("/login")}>{t("login.backToLogin")}</button></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}