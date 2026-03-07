import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Loader2, CheckCircle2, Edit3, FileText, AlertTriangle, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { insertLabResult } from "@/services/labService";
import { insertEvent } from "@/services/eventService";
import { logAudit } from "@/services/auditService";
import { computeRiskScore, insertRiskSnapshot } from "@/services/riskSnapshotService";
import { insertPatientAlert } from "@/services/patientAlertService";
import { updatePatient } from "@/services/patientService";
import { preprocessLabImage } from "@/utils/imagePreprocess";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LAB_FIELDS = [
  { key: "hb", label: "HB (Hemoglobin)", unit: "g/dL" },
  { key: "tlc", label: "TLC (WBC)", unit: "×10³/µL" },
  { key: "platelets", label: "Platelets", unit: "×10³/µL" },
  { key: "pti", label: "PTI", unit: "%" },
  { key: "inr", label: "INR", unit: "" },
  { key: "total_bilirubin", label: "Total Bilirubin", unit: "mg/dL" },
  { key: "direct_bilirubin", label: "Direct Bilirubin", unit: "mg/dL" },
  { key: "ast", label: "AST (SGOT)", unit: "U/L" },
  { key: "alt", label: "ALT (SGPT)", unit: "U/L" },
  { key: "alp", label: "ALP", unit: "U/L" },
  { key: "ggt", label: "GGT", unit: "U/L" },
  { key: "total_protein", label: "Total Protein", unit: "g/dL" },
  { key: "albumin", label: "Albumin", unit: "g/dL" },
  { key: "urea", label: "Urea", unit: "mg/dL" },
  { key: "creatinine", label: "Creatinine", unit: "mg/dL" },
  { key: "egfr", label: "eGFR", unit: "mL/min" },
  { key: "sodium", label: "Sodium", unit: "mEq/L" },
  { key: "potassium", label: "Potassium", unit: "mEq/L" },
  { key: "calcium", label: "Calcium", unit: "mg/dL" },
  { key: "magnesium", label: "Magnesium", unit: "mg/dL" },
  { key: "phosphorus", label: "Phosphorus", unit: "mg/dL" },
  { key: "uric_acid", label: "Uric Acid", unit: "mg/dL" },
  { key: "crp", label: "CRP", unit: "mg/L" },
  { key: "esr", label: "ESR", unit: "mm/hr" },
  { key: "ldh", label: "LDH", unit: "U/L" },
  { key: "ammonia", label: "Ammonia", unit: "µg/dL" },
  { key: "tacrolimus_level", label: "Tacrolimus", unit: "ng/mL" },
  { key: "cyclosporine", label: "Cyclosporine", unit: "ng/mL" },
  { key: "proteinuria", label: "Proteinuria", unit: "mg/dL" },
];

interface Props {
  patientId: string;
  organType?: string;
  patientData?: { transplant_number?: number | null; dialysis_history?: boolean | null };
  onLabAdded: () => void;
}

type Step = "upload" | "processing" | "confirm";

interface DateGroup {
  date: string;
  values: Record<string, string>;
  confidence: Record<string, number>;
  originalText: Record<string, string>;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 95) return null;
  if (confidence >= 80) {
    return (
      <span className="ml-1 inline-flex items-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
        {confidence}%
      </span>
    );
  }
  return (
    <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
      <AlertTriangle className="h-2.5 w-2.5" />
      {confidence}%
    </span>
  );
}

function formatDateLocalized(dateStr: string, t: (key: string) => string): string {
  if (dateStr === "unknown") return t("upload.dateNotDetected");
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

function DateGroupValues({
  group,
  onValueChange,
  t,
}: {
  group: DateGroup;
  onValueChange: (key: string, value: string) => void;
  t: (key: string) => string;
}) {
  const filledCount = LAB_FIELDS.filter((f) => group.values[f.key] && group.values[f.key] !== "").length;
  const lowConfFields = LAB_FIELDS.filter(
    (f) => group.values[f.key] && group.confidence[f.key] != null && group.confidence[f.key] < 80
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">{filledCount} {t("upload.valuesFound")}</span>
        </div>
        {lowConfFields.length > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            {lowConfFields.length} {t("upload.needsVerification")}
          </span>
        )}
      </div>

      {lowConfFields.length > 0 && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-xs font-medium text-destructive mb-1">
            ⚠ {t("upload.lowConfidence")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {lowConfFields.map((f) => (
              <span key={f.key} className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                {f.label}: {group.values[f.key]} ({group.confidence[f.key]}%)
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LAB_FIELDS.map((field) => {
          const hasValue = group.values[field.key] && group.values[field.key] !== "";
          const conf = group.confidence[field.key] ?? 100;
          const isLowConf = hasValue && conf < 80;
          const origText = group.originalText[field.key];

          return (
            <div
              key={field.key}
              className={`space-y-1 rounded-lg border p-2.5 ${
                isLowConf
                  ? "border-destructive/40 bg-destructive/5 ring-1 ring-destructive/20"
                  : hasValue
                  ? "border-primary/30 bg-primary/5"
                  : ""
              }`}
            >
              <Label className="text-xs flex items-center justify-between">
                <span className="flex items-center">
                  {field.label}
                  {hasValue && <ConfidenceBadge confidence={conf} />}
                </span>
                <span className="text-muted-foreground">{field.unit}</span>
              </Label>
              {origText && origText !== group.values[field.key] && (
                <p className="text-[10px] text-muted-foreground truncate" title={origText}>
                  {t("upload.original")}: "{origText}"
                </p>
              )}
              <Input
                type="number"
                step="any"
                value={group.values[field.key] ?? ""}
                onChange={(e) => onValueChange(field.key, e.target.value)}
                className={`h-8 text-sm ${isLowConf ? "border-destructive/40" : ""}`}
                placeholder="—"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LabUploadDialog({ patientId, organType, patientData, onLabAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [saving, setSaving] = useState(false);
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
  const [reportType, setReportType] = useState<string>("");
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("0");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const reset = () => {
    setStep("upload");
    setDateGroups([]);
    setReportType("");
    setReportUrl(null);
    setSaving(false);
    setActiveTab("0");
  };

  const processFile = async (file: File) => {
    setStep("processing");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { base64, file: processedFile, fileType } = await preprocessLabImage(file);

      const ext = processedFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("lab_reports").upload(path, processedFile);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = await supabase.storage.from("lab_reports").createSignedUrl(path, 60 * 60 * 24);
      setReportUrl(urlData?.signedUrl ?? null);

      const { data: ocrData, error: ocrErr } = await supabase.functions.invoke("ocr-lab-report", {
        body: { imageBase64: base64, fileType },
      });

      if (ocrErr) throw ocrErr;
      if (ocrData?.error) throw new Error(ocrData.error);

      let groups: DateGroup[] = [];

      if (ocrData?.multiDate && ocrData?.dateGroups?.length > 0) {
        groups = ocrData.dateGroups.map((g: any) => {
          const values: Record<string, string> = {};
          for (const field of LAB_FIELDS) {
            const v = g.data?.[field.key];
            values[field.key] = v != null ? String(v) : "";
          }
          return {
            date: g.date ?? "unknown",
            values,
            confidence: g.confidence ?? {},
            originalText: g.originalText ?? {},
          };
        });
      } else {
        const extracted = ocrData?.data ?? {};
        const values: Record<string, string> = {};
        for (const field of LAB_FIELDS) {
          const v = extracted[field.key];
          values[field.key] = v != null ? String(v) : "";
        }
        groups = [{
          date: "unknown",
          values,
          confidence: ocrData?.confidence ?? {},
          originalText: ocrData?.originalText ?? {},
        }];
      }

      setDateGroups(groups);
      setReportType(ocrData?.reportType ?? "");

      const totalLowConf = groups.reduce((sum, g) => {
        return sum + LAB_FIELDS.filter(
          (f) => g.values[f.key] && g.confidence[f.key] != null && g.confidence[f.key] < 80
        ).length;
      }, 0);

      if (totalLowConf > 0) {
        toast({
          title: `${totalLowConf} ${t("upload.verifyValues")}`,
          description: t("upload.lowConfidenceDesc"),
          variant: "destructive",
        });
      }

      if (groups.length > 1) {
        toast({
          title: `${groups.length} ${t("upload.datesDetected")}`,
        });
      }

      setStep("confirm");
    } catch (err: any) {
      console.error("Upload/OCR error:", err);
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
      setStep("upload");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const updateGroupValue = (groupIndex: number, key: string, value: string) => {
    setDateGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex ? { ...g, values: { ...g.values, [key]: value } } : g
      )
    );
  };

  const updateGroupDate = (groupIndex: number, newDate: string) => {
    setDateGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex ? { ...g, date: newDate } : g
      )
    );
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      let totalFilled = 0;

      for (const group of dateGroups) {
        const labData: Record<string, any> = { patient_id: patientId };
        if (reportUrl) labData.report_file_url = reportUrl;

        if (group.date && group.date !== "unknown") {
          labData.recorded_at = new Date(group.date).toISOString();
        }

        let filledCount = 0;
        for (const field of LAB_FIELDS) {
          const v = parseFloat(group.values[field.key]);
          labData[field.key] = isNaN(v) ? null : v;
          if (!isNaN(v)) filledCount++;
        }

        if (filledCount > 0) {
          await insertLabResult(labData as Record<string, any> & { patient_id: string });
          totalFilled += filledCount;
        }
      }

      await insertEvent({ patient_id: patientId, event_type: "lab_uploaded", description: `Lab report uploaded via OCR (${dateGroups.length} date(s))` });
      logAudit({ action: "lab_upload", entityType: "patient", entityId: patientId, metadata: { dateCount: dateGroups.length, totalFilled } });
      
      toast({ title: `${dateGroups.length} ${t("upload.resultsSaved")}` });
      reset();
      setOpen(false);
      onLabAdded();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Upload className="h-4 w-4" /> {t("upload.title")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {step === "upload" && t("upload.uploadTitle")}
            {step === "processing" && t("upload.processing")}
            {step === "confirm" && t("upload.confirm")}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("upload.description")}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-32 flex-col gap-3 border-dashed border-2"
                onClick={() => cameraRef.current?.click()}
              >
                <Camera className="h-8 w-8 text-primary" />
                <span className="font-medium">{t("upload.takePhoto")}</span>
              </Button>
              <Button
                variant="outline"
                className="h-32 flex-col gap-3 border-dashed border-2"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-primary" />
                <span className="font-medium">{t("upload.uploadFile")}</span>
              </Button>
            </div>
            <input ref={cameraRef} type="file" accept="image/jpeg,image/jpg,image/png" capture="environment" className="hidden" onChange={handleFileChange} />
            <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,application/pdf" className="hidden" onChange={handleFileChange} />
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">{t("upload.aiProcessing")}</p>
            <p className="text-xs text-muted-foreground">{t("upload.detectingDates")}</p>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            {dateGroups.length > 1 && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">
                  {dateGroups.length} {t("upload.datesDetected")}
                </span>
              </div>
            )}

            {dateGroups.length > 1 ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
                  {dateGroups.map((group, i) => {
                    const filled = LAB_FIELDS.filter((f) => group.values[f.key] && group.values[f.key] !== "").length;
                    return (
                      <TabsTrigger key={i} value={String(i)} className="gap-1.5 text-xs">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDateLocalized(group.date, t)}
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {filled}
                        </Badge>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                {dateGroups.map((group, i) => (
                  <TabsContent key={i} value={String(i)} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">{t("upload.dateLabel")}</Label>
                      <Input
                        type="date"
                        value={group.date === "unknown" ? "" : group.date}
                        onChange={(e) => updateGroupDate(i, e.target.value)}
                        className="h-8 w-48 text-sm"
                      />
                      {group.date === "unknown" && (
                        <span className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {t("upload.enterDateManually")}
                        </span>
                      )}
                    </div>
                    <DateGroupValues
                      group={group}
                      onValueChange={(key, value) => updateGroupValue(i, key, value)}
                      t={t}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <>
                {dateGroups[0]?.date !== "unknown" && (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm">{t("upload.dateLabel")} {formatDateLocalized(dateGroups[0]?.date, t)}</span>
                    <Input
                      type="date"
                      value={dateGroups[0]?.date === "unknown" ? "" : dateGroups[0]?.date}
                      onChange={(e) => updateGroupDate(0, e.target.value)}
                      className="h-7 w-40 text-xs ml-auto"
                    />
                  </div>
                )}
                {dateGroups[0]?.date === "unknown" && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">{t("upload.dateNotDetectedDesc")}</span>
                    <Input
                      type="date"
                      value=""
                      onChange={(e) => updateGroupDate(0, e.target.value)}
                      className="h-7 w-40 text-xs ml-auto"
                    />
                  </div>
                )}
                {dateGroups[0] && (
                  <DateGroupValues
                    group={dateGroups[0]}
                    onValueChange={(key, value) => updateGroupValue(0, key, value)}
                    t={t}
                  />
                )}
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleConfirm} disabled={saving} className="flex-1 gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {dateGroups.length > 1
                  ? `${dateGroups.length} ${t("upload.saveResults")}`
                  : t("upload.confirmResults")}
              </Button>
              <Button variant="outline" onClick={() => setStep("upload")} className="gap-2">
                <Edit3 className="h-4 w-4" /> {t("upload.reupload")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
