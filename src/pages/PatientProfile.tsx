import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, FlaskConical, TrendingUp, Shield, Clock, Phone, Calendar } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLinkedPatient } from "@/hooks/usePatients";
import { usePatientHomeLabs, usePatientHomeEvents } from "@/hooks/usePatientDetail";
import { useRiskSnapshots } from "@/hooks/useRiskSnapshots";
import { riskColorClass } from "@/utils/risk";
import LabUploadDialog from "@/components/features/LabUploadDialog";
import LabResultsTable from "@/components/features/LabResultsTable";
import LabTrendCharts from "@/components/features/LabTrendCharts";
import RiskScoreCard from "@/components/features/RiskScoreCard";
import PatientAlertsCard from "@/components/features/PatientAlertsCard";
import { useQueryClient } from "@tanstack/react-query";

export default function PatientProfile() {
  const { t } = useLanguage();
  const { data: patient, isLoading } = useLinkedPatient();
  const { data: allLabs = [] } = usePatientHomeLabs(patient?.id);
  const { data: timeline = [] } = usePatientHomeEvents(patient?.id);
  const { data: riskSnapshots = [] } = useRiskSnapshots(patient?.id);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("overview");

  const latestRisk = riskSnapshots[0] ?? null;
  const prevRisk = riskSnapshots[1] ?? null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["patient-labs", patient?.id] });
    queryClient.invalidateQueries({ queryKey: ["patient-events", patient?.id] });
    queryClient.invalidateQueries({ queryKey: ["risk-snapshots", patient?.id] });
  };

  if (isLoading) return <DashboardLayout><div className="flex items-center justify-center py-20 text-muted-foreground">{t("common.loading")}</div></DashboardLayout>;
  if (!patient) return (
    <DashboardLayout>
      <Card className="max-w-md mx-auto mt-12">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{t("home.noLinked")}</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{patient.full_name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className={riskColorClass(patient.risk_level)}>{patient.risk_level.toUpperCase()}</Badge>
                <span className="text-sm text-muted-foreground capitalize">{patient.organ_type} {t("profile.transplant").toLowerCase()}</span>
              </div>
            </div>
          </div>
          <LabUploadDialog patientId={patient.id} organType={patient.organ_type} patientData={{ transplant_number: patient.transplant_number, dialysis_history: patient.dialysis_history }} onLabAdded={invalidate} />
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
              <User className="h-3.5 w-3.5" /> {t("profile.overview")}
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-1.5 text-xs sm:text-sm">
              <FlaskConical className="h-3.5 w-3.5" /> {t("profile.labResults")}
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="h-3.5 w-3.5" /> {t("profile.trends")}
            </TabsTrigger>
            <TabsTrigger value="risk" className="gap-1.5 text-xs sm:text-sm">
              <Shield className="h-3.5 w-3.5" /> {t("profile.risk")}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5 text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5" /> {t("profile.timeline")}
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">{t("profile.patientInfo")}</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <InfoRow label={t("profile.fullName")} value={patient.full_name} />
                <InfoRow label={t("profile.organType")} value={patient.organ_type} />
                <InfoRow label={t("profile.gender")} value={patient.gender ?? "—"} />
                <InfoRow label={t("profile.dob")} value={patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "—"} />
                {patient.phone && <InfoRow label={t("common.phone")} value={patient.phone} icon={<Phone className="h-3 w-3" />} />}
                {patient.transplant_date && <InfoRow label={t("profile.transplantDate")} value={new Date(patient.transplant_date).toLocaleDateString()} icon={<Calendar className="h-3 w-3" />} />}
              </CardContent>
            </Card>
            <RiskScoreCard snapshot={latestRisk} prevSnapshot={prevRisk} />
            {patient.risk_level === "high" && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                {t("profile.highRiskWarning")}
              </div>
            )}
          </TabsContent>

          {/* Lab Results */}
          <TabsContent value="results">
            <LabResultsTable labs={allLabs} />
          </TabsContent>

          {/* Trends */}
          <TabsContent value="trends">
            <LabTrendCharts labs={allLabs} />
          </TabsContent>

          {/* Risk */}
          <TabsContent value="risk" className="space-y-4">
            <RiskScoreCard snapshot={latestRisk} prevSnapshot={prevRisk} />
            <PatientAlertsCard patientId={patient.id} />
          </TabsContent>

          {/* Timeline */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> {t("profile.careTimeline")}</CardTitle></CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t("profile.noEvents")}</p>
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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</p>
      <p className="font-medium capitalize mt-0.5">{value}</p>
    </div>
  );
}
