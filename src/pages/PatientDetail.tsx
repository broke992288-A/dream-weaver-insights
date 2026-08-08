import { useState, useEffect, lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, FlaskConical, Shield, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePatientDetail } from "@/hooks/usePatientDetail";
import { useRiskSnapshots } from "@/hooks/useRiskSnapshots";
import { updatePatient } from "@/services/patientService";
import { insertEvent } from "@/services/eventService";
import { logAudit } from "@/services/auditService";
import { computeRiskScore } from "@/services/riskSnapshotService";
import type { RiskSnapshot } from "@/services/riskSnapshotService";
import { triggerRiskRecalculation } from "@/services/riskRecalculationService";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";

import PatientCockpitHeader from "@/components/features/PatientCockpitHeader";
import LatestLabsTable from "@/components/features/LatestLabsTable";
const LabTrendCharts = lazy(() => import("@/components/features/LabTrendCharts"));

import ActiveMedicationsCard from "@/components/features/ActiveMedicationsCard";
import PredictionPanel from "@/components/features/PredictionPanel";
import PatientLabScheduleCard from "@/components/features/PatientLabScheduleCard";
import RiskScoreCard from "@/components/features/RiskScoreCard";
import AddLabDialog from "@/components/features/AddLabDialog";
import LabUploadDialog from "@/components/features/LabUploadDialog";
import LabHistoryTable from "@/components/features/LabHistoryTable";
import DoctorNotesCard from "@/components/features/DoctorNotesCard";
import BulkLabEntryDialog from "@/components/features/BulkLabEntryDialog";

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  const { patient, labs: allLabs, latestLab, events: timeline, loading, invalidateAll } = usePatientDetail(id);
  const { data: riskSnapshots = [] } = useRiskSnapshots(id, 20);

  const latestRisk: RiskSnapshot | null = (() => {
    if (riskSnapshots.length === 0 && !latestLab) return null;
    if (latestLab) {
      const matchingSnapshot = riskSnapshots.find(s => s.lab_result_id === latestLab.id);
      if (matchingSnapshot) return matchingSnapshot;
      const historicalLabs = allLabs.slice(1, 5);
      const computed = computeRiskScore(patient?.organ_type ?? "kidney", latestLab, {
        transplant_number: patient?.transplant_number,
        dialysis_history: patient?.dialysis_history,
        transplant_date: patient?.transplant_date,
      }, historicalLabs);
      return {
        id: "computed",
        patient_id: latestLab.patient_id,
        lab_result_id: latestLab.id,
        score: computed.score,
        risk_level: computed.level,
        creatinine: latestLab.creatinine,
        alt: latestLab.alt,
        ast: latestLab.ast,
        total_bilirubin: latestLab.total_bilirubin,
        tacrolimus_level: latestLab.tacrolimus_level,
        details: { flags: computed.flags, explanations: computed.explanations },
        trend_flags: computed.flags.filter((f: string) => f.includes("increase") || f.includes("drop") || f.includes("declined")),
        algorithm_version: "v2.0-kdigo2024",
        created_at: latestLab.recorded_at ?? latestLab.created_at,
      } as RiskSnapshot;
    }
    return riskSnapshots[0] ?? null;
  })();

  const prevRisk = (() => {
    if (allLabs.length < 2 || riskSnapshots.length < 1) return null;
    const secondLab = allLabs[1];
    const matchingPrev = riskSnapshots.find(s => s.lab_result_id === secondLab.id);
    return matchingPrev ?? riskSnapshots[0] ?? null;
  })();

  useEffect(() => {
    if (id) logAudit({ action: "doctor_view_patient", entityType: "patient", entityId: id });
  }, [id]);

  const [overrideLevel, setOverrideLevel] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overriding, setOverriding] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculate = async () => {
    if (!id) return;
    setRecalculating(true);
    try {
      const res = await triggerRiskRecalculation(id);
      toast({ title: t("detail.riskRecalculated"), description: `${res.snapshots_created ?? 0} snapshot(s)` });
      invalidateAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    } finally {
      setRecalculating(false);
    }
  };

  const handleOverride = async () => {
    if (!user || !id || !overrideLevel || !overrideReason.trim()) {
      toast({ title: t("detail.provideReason"), variant: "destructive" });
      return;
    }
    setOverriding(true);
    try {
      await updatePatient(id, { risk_level: overrideLevel });
      await insertEvent({ patient_id: id, event_type: "risk_override", description: `${t("event.riskOverridden")}: ${t(`risk.${overrideLevel}`)} — ${overrideReason}`, created_by: user.id });
      setOverrideLevel(""); setOverrideReason("");
      toast({ title: t("detail.riskOverridden") });
      invalidateAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    } finally { setOverriding(false); }
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center py-20 text-muted-foreground">{t("common.loading")}</div></DashboardLayout>;
  if (!patient) return <DashboardLayout><div className="flex items-center justify-center py-20 text-muted-foreground">{t("detail.patientNotFound")}</div></DashboardLayout>;

  const direction = isMobile ? "vertical" as const : "horizontal" as const;

  return (
    <DashboardLayout>
      <div className="space-y-4 overflow-hidden">
        {/* TOP HEADER CARD */}
        <PatientCockpitHeader patient={patient} latestRisk={latestRisk} latestLab={latestLab} onUpdated={invalidateAll} />

        {/* ROW 1: Labs table + Trend charts — resizable (horizontal split + vertical height resize) */}
        <ResizablePanelGroup
          direction={direction}
          className="rounded-lg border resize-y overflow-hidden"
          style={{ height: 500, minHeight: 300, maxHeight: 1200 }}
        >
          <ResizablePanel defaultSize={50} minSize={25}>
            <div className="p-3 space-y-2 h-full overflow-auto">
              <LatestLabsTable labs={allLabs} organType={patient.organ_type} />
              <div className="flex flex-wrap gap-2">
                <AddLabDialog patientId={patient.id} organType={patient.organ_type} onLabAdded={invalidateAll} patientData={{ transplant_number: patient.transplant_number, dialysis_history: patient.dialysis_history, transplant_date: patient.transplant_date, date_of_birth: patient.date_of_birth, gender: patient.gender }} patientCountry={(patient as Record<string, unknown>).country as string} />
                <LabUploadDialog patientId={patient.id} organType={patient.organ_type} onLabAdded={invalidateAll} patientData={{ transplant_number: patient.transplant_number, dialysis_history: patient.dialysis_history }} patientCountry={(patient as Record<string, unknown>).country as string} patientName={patient.full_name} patientDOB={patient.date_of_birth} patientMRN={patient.patient_number != null ? String(patient.patient_number) : null} />
                <BulkLabEntryDialog patientId={patient.id} organType={patient.organ_type} onLabsAdded={invalidateAll} patientData={{ transplant_number: patient.transplant_number, dialysis_history: patient.dialysis_history, transplant_date: patient.transplant_date, date_of_birth: patient.date_of_birth, gender: patient.gender }} />
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={25}>
            <div className="p-3 h-full overflow-auto">
              <Suspense fallback={<div className="flex items-center justify-center h-32"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
                <LabTrendCharts labs={allLabs} />
              </Suspense>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* ROW 2: Medications */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ActiveMedicationsCard patientId={patient.id} />
        </div>

        {/* ROW 3: AI Prediction + Lab Schedule — resizable */}
        <ResizablePanelGroup direction={direction} className="min-h-[300px] rounded-lg border">
          <ResizablePanel defaultSize={50} minSize={25}>
            <div className="p-3 h-full overflow-auto">
              <PredictionPanel
                patientId={patient.id}
                patientName={patient.full_name}
                organType={patient.organ_type}
                currentRisk={latestRisk?.risk_level ?? patient.risk_level}
                patientData={{
                  blood_type: patient.blood_type,
                  donor_blood_type: patient.donor_blood_type,
                  titer_therapy: patient.titer_therapy,
                }}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={25}>
            <div className="p-3 h-full overflow-auto">
              <PatientLabScheduleCard patientId={patient.id} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Doctor Notes */}
        <DoctorNotesCard patientId={patient.id} />

        {/* ROW 4: Risk details + Override — resizable */}
        <ResizablePanelGroup direction={direction} className="min-h-[280px] rounded-lg border">
          <ResizablePanel defaultSize={50} minSize={25}>
            <div className="p-3 space-y-2 h-full overflow-auto">
              <RiskScoreCard snapshot={latestRisk} prevSnapshot={prevRisk} lastEvaluation={patient.last_risk_evaluation} />
              <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating} className="w-full">
                {recalculating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                {t("detail.recalculateRisk")}
              </Button>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={25}>
            <div className="p-3 h-full overflow-auto">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{t("detail.aiAdvisory")}</CardTitle>
                  </div>
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
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Lab History */}
        {allLabs.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t("detail.labHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <LabHistoryTable labs={allLabs} organType={patient.organ_type} editable onLabChanged={invalidateAll} />
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{t("detail.timeline")}</CardTitle>
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
