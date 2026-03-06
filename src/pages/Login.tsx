import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageSelector from "@/components/features/LanguageSelector";
import { resetPasswordForEmail } from "@/services/authService";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isForgot) {
        await resetPasswordForEmail(email);
        toast({ title: t("login.resetSent"), description: t("login.resetSentDesc") });
        setIsForgot(false);
      } else if (isSignUp) {
        await signUp(email, password, fullName, phone);
        toast({ title: t("login.accountCreated"), description: t("login.checkEmail") });
      } else {
        await signIn(email, password);
        navigate("/select-role");
      }
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-end"><LanguageSelector /></div>
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
            <Heart className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">{t("login.title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("login.subtitle")}</p>
          </div>
        </div>
        <Card className="border-0 shadow-xl shadow-primary/5">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">{isForgot ? t("login.resetPassword") : isSignUp ? t("login.signUp") : t("login.signIn")}</CardTitle>
            <CardDescription>{isForgot ? t("login.resetDesc") : isSignUp ? t("login.signUpDesc") : t("login.signInDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && !isForgot && (
                <>
                  <div className="space-y-2"><Label htmlFor="fullName">{t("login.fullName")}</Label><Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Dr. Jane Smith" /></div>
                  <div className="space-y-2"><Label htmlFor="phone">Телефон рақами</Label><Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998901234567" /></div>
                </>
              )}
              <div className="space-y-2"><Label htmlFor="email">{t("login.email")}</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jane@hospital.com" /></div>
              {!isForgot && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t("login.password")}</Label>
                    {!isSignUp && <button type="button" className="text-xs text-primary hover:underline" onClick={() => setIsForgot(true)}>{t("login.forgotPassword")}</button>}
                  </div>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                {isForgot ? t("login.sendResetLink") : isSignUp ? t("login.createAccount") : t("login.signIn")}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {isForgot ? (
                <button className="font-medium text-primary hover:underline" onClick={() => setIsForgot(false)}>{t("login.backToLogin")}</button>
              ) : (
                <>{isSignUp ? t("login.alreadyHave") : t("login.dontHave")}{" "}<button className="font-medium text-primary hover:underline" onClick={() => setIsSignUp(!isSignUp)}>{isSignUp ? t("login.signIn") : t("login.signUp")}</button></>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}