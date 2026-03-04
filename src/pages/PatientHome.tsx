import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, FlaskConical } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function PatientHome() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [patient, setPatient] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [labs, setLabs] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: pts } = await supabase.from("patients").select("*").eq("linked_user_id", user.id).limit(1);
      if (pts && pts.length > 0) {
        const pt = pts[0];
        setPatient(pt);
        const [{ data: tl }, { data: lb }] = await Promise.all([
          supabase.from("patient_events").select("*").eq("patient_id", pt.id).order("created_at", { ascending: false }).limit(10),
          supabase.from("lab_results").select("*").eq("patient_id", pt.id).order("recorded_at", { ascending: false }).limit(1),
        ]);
        setTimeline(tl ?? []);
        setLabs(lb?.[0] ?? null);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const riskColor = (level: string) =>
    level === "high" ? "bg-destructive text-destructive-foreground" : level === "medium" ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground";

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {loading ? (
          <p className="text-muted-foreground text-center">{t("home.loading")}</p>
        ) : !patient ? (
          <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">{t("home.noLinked")}</p></CardContent></Card>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle className="text-lg">{t("home.healthStatus")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("home.name")}</span><span className="font-medium">{patient.full_name}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("home.organ")}</span><span className="capitalize font-medium">{patient.organ_type}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("home.riskLevel")}</span><Badge className={riskColor(patient.risk_level)}>{patient.risk_level.toUpperCase()}</Badge></div>
                {patient.risk_level === "high" && (
                  <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{t("home.highRiskWarning")}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2"><Clock className="h-5 w-5 text-primary" /><CardTitle className="text-lg">{t("home.careTimeline")}</CardTitle></CardHeader>
              <CardContent>
                {timeline.length === 0 ? <p className="text-muted-foreground text-sm">{t("home.noEvents")}</p> : (
                  <div className="space-y-3">
                    {timeline.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-3 border-l-2 border-primary/20 pl-4 py-1">
                        <div>
                          <p className="text-sm font-medium">{ev.description}</p>
                          <p className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {labs && (
              <Card>
                <CardHeader className="flex flex-row items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /><CardTitle className="text-lg">{t("home.latestLabs")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {patient.organ_type === "liver" ? (
                      <>
                        {labs.tacrolimus_level != null && <LabItem label={t("add.tacrolimus")} value={labs.tacrolimus_level} />}
                        {labs.alt != null && <LabItem label={t("add.alt")} value={labs.alt} />}
                        {labs.ast != null && <LabItem label={t("add.ast")} value={labs.ast} />}
                        {labs.total_bilirubin != null && <LabItem label={t("add.totalBilirubin")} value={labs.total_bilirubin} />}
                        {labs.direct_bilirubin != null && <LabItem label={t("add.directBilirubin")} value={labs.direct_bilirubin} />}
                      </>
                    ) : (
                      <>
                        {labs.creatinine != null && <LabItem label={t("add.creatinine")} value={labs.creatinine} />}
                        {labs.egfr != null && <LabItem label={t("add.egfr")} value={labs.egfr} />}
                        {labs.proteinuria != null && <LabItem label={t("add.proteinuria")} value={labs.proteinuria} />}
                        {labs.potassium != null && <LabItem label={t("add.potassium")} value={labs.potassium} />}
                      </>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{t("home.recorded")}: {new Date(labs.recorded_at).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function LabItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
