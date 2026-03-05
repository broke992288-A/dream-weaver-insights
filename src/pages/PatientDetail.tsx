import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Clock, FlaskConical, AlertTriangle, Shield, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import AddLabDialog from "@/components/AddLabDialog";
import LabHistoryTable from "@/components/LabHistoryTable";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [patient, setPatient] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [labs, setLabs] = useState<any>(null);
  const [allLabs, setAllLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideLevel, setOverrideLevel] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overriding, setOverriding] = useState(false);

  const loadData = async () => {
    if (!id) return;
    const [{ data: pt }, { data: tl }, { data: lb }] = await Promise.all([
      supabase.from("patients").select("*").eq("id", id).single(),
      supabase.from("patient_events").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
      supabase.from("lab_results").select("*").eq("patient_id", id).order("recorded_at", { ascending: false }),
    ]);
    setPatient(pt);
    setTimeline(tl ?? []);
    setAllLabs(lb ?? []);
    setLabs(lb?.[0] ?? null);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  const handleOverride = async () => {
    if (!user || !id || !overrideLevel || !overrideReason.trim()) {
      toast({ title: t("detail.provideReason"), variant: "destructive" });
      return;
    }
    setOverriding(true);
    await supabase.from("patients").update({ risk_level: overrideLevel }).eq("id", id);
    await supabase.from("patient_events").insert({ patient_id: id, event_type: "risk_override", description: `Risk overridden to ${overrideLevel}: ${overrideReason}`, created_by: user.id });
    setPatient((prev: any) => ({ ...prev, risk_level: overrideLevel }));
    setOverrideLevel(""); setOverrideReason(""); setOverriding(false);
    toast({ title: t("detail.riskOverridden") });
    loadData();
  };

  const riskColor = (level: string) =>
    level === "high" ? "bg-destructive text-destructive-foreground" : level === "medium" ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground";

  if (loading) return <DashboardLayout><div className="flex items-center justify-center py-20 text-muted-foreground">{t("common.loading")}</div></DashboardLayout>;
  if (!patient) return <DashboardLayout><div className="flex items-center justify-center py-20 text-muted-foreground">Patient not found</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}><ArrowLeft className="h-5 w-5" /></Button>
            <span className="text-lg font-bold">{patient.full_name}</span>
            <Badge className={riskColor(patient.risk_level)}>{patient.risk_level.toUpperCase()}</Badge>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-1" />{t("common.delete") || "Ўчириш"}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("detail.confirmDelete") || "Беморни ўчириш"}</AlertDialogTitle>
                <AlertDialogDescription>{t("detail.confirmDeleteDesc") || "Ҳақиқатан ҳам бу беморни ўчирмоқчимисиз? Бу амални қайтариб бўлмайди."}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel") || "Бекор қилиш"}</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
                  await supabase.from("lab_results").delete().eq("patient_id", patient.id);
                  await supabase.from("patient_events").delete().eq("patient_id", patient.id);
                  await supabase.from("patients").delete().eq("id", patient.id);
                  toast({ title: t("detail.patientDeleted") || "Бемор ўчирилди" });
                  navigate("/patients");
                }}>{t("common.delete") || "Ўчириш"}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {patient.risk_level === "high" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="font-medium">{t("detail.underReview")}</span>
          </div>
        )}

        <Card>
          <CardHeader><CardTitle className="text-lg">{t("detail.patientInfo")}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <InfoRow label={t("home.organ")} value={patient.organ_type} />
            <InfoRow label={t("add.gender")} value={patient.gender} />
            <InfoRow label={t("detail.dob")} value={patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "—"} />
            <InfoRow label={t("detail.added")} value={new Date(patient.created_at).toLocaleDateString()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t("detail.latestLabs")}</CardTitle>
            </div>
            <AddLabDialog patientId={patient.id} organType={patient.organ_type} onLabAdded={loadData} />
          </CardHeader>
          <CardContent>
            {labs ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {patient.organ_type === "liver" ? (
                  <>
                    <LabItem label={t("add.tacrolimus")} value={labs.tacrolimus_level} />
                    <LabItem label={t("add.alt")} value={labs.alt} />
                    <LabItem label={t("add.ast")} value={labs.ast} />
                    <LabItem label={t("add.totalBilirubin")} value={labs.total_bilirubin} />
                    <LabItem label={t("add.directBilirubin")} value={labs.direct_bilirubin} />
                  </>
                ) : (
                  <>
                    <LabItem label={t("add.creatinine")} value={labs.creatinine} />
                    <LabItem label={t("add.egfr")} value={labs.egfr} />
                    <LabItem label={t("add.proteinuria")} value={labs.proteinuria} />
                    <LabItem label={t("add.potassium")} value={labs.potassium} />
                  </>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t("detail.noEvents")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t("detail.aiAdvisory")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("detail.orOverride")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={overrideLevel} onValueChange={setOverrideLevel}>
                <SelectTrigger><SelectValue placeholder={t("detail.newRiskLevel")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">LOW</SelectItem>
                  <SelectItem value="medium">MEDIUM</SelectItem>
                  <SelectItem value="high">HIGH</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder={t("detail.overrideReason")} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} className="min-h-[60px]" />
            </div>
            <Button size="sm" variant="outline" onClick={handleOverride} disabled={overriding}>{t("detail.overrideRisk")}</Button>
          </CardContent>
        </Card>

        {allLabs.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t("detail.labHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <LabHistoryTable labs={allLabs} organType={patient.organ_type} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t("detail.timeline")}</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("detail.noEvents")}</p>
            ) : (
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
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}

function LabItem({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value ?? "—"}</p>
    </div>
  );
}
