import { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import TranslatedText from "@/components/features/TranslatedText";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, FlaskConical, TrendingUp, Shield, Clock, Phone, Calendar, Pill, Stethoscope } from "lucide-react";
import patientPhotoAbdulhayot from "@/assets/patient-photo-edited.jpg";
import { useLanguage } from "@/hooks/useLanguage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLinkedPatient } from "@/hooks/usePatients";
import { usePatientHomeLabs, usePatientHomeEvents } from "@/hooks/usePatientDetail";
import { useRiskSnapshots } from "@/hooks/useRiskSnapshots";
import { riskColorClass } from "@/utils/risk";
import LabUploadDialog from "@/components/features/LabUploadDialog";
import NotificationSettings from "@/components/features/NotificationSettings";
import LabResultsTable from "@/components/features/LabResultsTable";
import LabHistoryTable from "@/components/features/LabHistoryTable";
const LabTrendCharts = lazy(() => import("@/components/features/LabTrendCharts"));
import PatientRiskCard from "@/components/features/PatientRiskCard";
import PatientAlertsCard from "@/components/features/PatientAlertsCard";
import DoctorNotesCard from "@/components/features/DoctorNotesCard";
import { usePatientMedications } from "@/hooks/useMedications";
import { useQueryClient } from "@tanstack/react-query";

export default function PatientProfile() {
  const { t } = useLanguage();
  const { data: patient, isLoading } = useLinkedPatient();
  const { data: allLabs = [] } = usePatientHomeLabs(patient?.id);
  const { data: timeline = [] } = usePatientHomeEvents(patient?.id);
  const { data: riskSnapshots = [] } = useRiskSnapshots(patient?.id);
  const { data: medications = [] } = usePatientMedications(patient?.id);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t) setTab(t);
  }, [searchParams]);

  const latestRisk = riskSnapshots[0] ?? null;
  const prevRisk = riskSnapshots[1] ?? null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["patient-labs", patient?.id] });
    queryClient.invalidateQueries({ queryKey: ["patient-events", patient?.id] });
    queryClient.invalidateQueries({ queryKey: ["risk-snapshots", patient?.id] });
    queryClient.invalidateQueries({ queryKey: ["risk-snapshot-latest", patient?.id] });
    queryClient.invalidateQueries({ queryKey: ["linked-patient"] });
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
            {patient.full_name.includes("bdulhayot") ? (
              <div className="h-12 w-12 rounded-lg overflow-hidden border-2 border-primary/20 shrink-0">
                <img src={patientPhotoAbdulhayot} alt={patient.full_name} className="h-full w-full object-cover object-[50%_0%] scale-125" />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{patient.full_name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className={riskColorClass(patient.risk_level)}>{t(`risk.${patient.risk_level}`)}</Badge>
                <span className="text-sm text-muted-foreground">{t(`organ.${patient.organ_type}`)} {t("profile.transplant").toLowerCase()}</span>
              </div>
            </div>
          </div>
          <LabUploadDialog patientId={patient.id} organType={patient.organ_type} patientData={{ transplant_number: patient.transplant_number, dialysis_history: patient.dialysis_history }} onLabAdded={invalidate} patientName={patient.full_name} patientDOB={patient.date_of_birth} patientMRN={patient.patient_number != null ? String(patient.patient_number) : null} />
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
              <User className="h-3.5 w-3.5" /> {t("profile.overview")}
            </TabsTrigger>
            <TabsTrigger value="medications" className="gap-1.5 text-xs sm:text-sm">
              <Pill className="h-3.5 w-3.5" /> {t("med.title")}
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
                <InfoRow label={t("profile.organType")} value={t(`organ.${patient.organ_type}`)} />
                <InfoRow label={t("profile.gender")} value={patient.gender ? t(`gender.${patient.gender}`) : "—"} />
                <InfoRow label={t("profile.dob")} value={patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "—"} />
                {patient.blood_type && <InfoRow label={t("add.bloodType")} value={patient.blood_type} />}
                {patient.donor_blood_type && <InfoRow label={t("add.donorBloodType")} value={patient.donor_blood_type} />}
                {patient.blood_type && patient.donor_blood_type && patient.blood_type !== patient.donor_blood_type && (
                  <InfoRow label={t("add.titerTherapy")} value={patient.titer_therapy ? t("add.yes") : t("add.no")} />
                )}
                {patient.phone && <InfoRow label={t("common.phone")} value={patient.phone} icon={<Phone className="h-3 w-3" />} />}
                {patient.transplant_date && <InfoRow label={t("profile.transplantDate")} value={new Date(patient.transplant_date).toLocaleDateString()} icon={<Calendar className="h-3 w-3" />} />}
              </CardContent>
            </Card>
            <PatientRiskCard snapshot={latestRisk} />
            {patient.risk_level === "high" && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm flex items-start gap-2">
                <Stethoscope className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
                {t("profile.highRiskWarning")}
              </div>
            )}
            <DoctorNotesCard patientId={patient.id} readOnly />
            <PatientAlertsCard patientId={patient.id} />
            <NotificationSettings />
          </TabsContent>

          {/* Medications */}
          <TabsContent value="medications">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Pill className="h-5 w-5 text-primary" /> {t("med.myMedications")}</CardTitle></CardHeader>
              <CardContent>
                {medications.filter(m => m.is_active).length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t("med.noMedications")}</p>
                ) : (
                  <div className="space-y-3">
                    {medications.filter(m => m.is_active).map((med) => (
                      <div key={med.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{med.medication_name}</p>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{med.dosage}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t(`med.${med.frequency}`)} · {t("med.startDate")}: {new Date(med.start_date).toLocaleDateString()}
                        </p>
                        {med.notes && <p className="text-xs text-muted-foreground mt-0.5"><TranslatedText text={med.notes} /></p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lab Results */}
          <TabsContent value="results">
            <LabHistoryTable labs={allLabs} organType={patient.organ_type} showAll editable onLabChanged={invalidate} />
          </TabsContent>

          {/* Trends */}
          <TabsContent value="trends">
            <Suspense fallback={<div className="flex items-center justify-center h-32 text-sm text-muted-foreground">…</div>}>
              <LabTrendCharts labs={allLabs} />
            </Suspense>
          </TabsContent>

          {/* Risk */}
          <TabsContent value="risk" className="space-y-4">
            <PatientRiskCard snapshot={latestRisk} />
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
