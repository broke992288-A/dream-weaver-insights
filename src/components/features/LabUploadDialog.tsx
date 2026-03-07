import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Loader2, CheckCircle2, Edit3, FileText, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { insertLabResult } from "@/services/labService";
import { insertEvent } from "@/services/eventService";
import { logAudit } from "@/services/auditService";

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
  onLabAdded: () => void;
}

type Step = "upload" | "processing" | "confirm";

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
      {confidence}% — verify
    </span>
  );
}

export default function LabUploadDialog({ patientId, onLabAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [confidenceMap, setConfidenceMap] = useState<Record<string, number>>({});
  const [originalTextMap, setOriginalTextMap] = useState<Record<string, string>>({});
  const [reportType, setReportType] = useState<string>("");
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const reset = () => {
    setStep("upload");
    setValues({});
    setConfidenceMap({});
    setOriginalTextMap({});
    setReportType("");
    setReportUrl(null);
    setSaving(false);
  };

  const processFile = async (file: File) => {
    setStep("processing");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("lab_reports").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = await supabase.storage.from("lab_reports").createSignedUrl(path, 60 * 60 * 24 * 365);
      setReportUrl(urlData?.signedUrl ?? null);

      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const fileType = ext === "pdf" ? "pdf" : ext === "png" ? "png" : "jpeg";

      const { data: ocrData, error: ocrErr } = await supabase.functions.invoke("ocr-lab-report", {
        body: { imageBase64: base64, fileType },
      });

      if (ocrErr) throw ocrErr;
      if (ocrData?.error) throw new Error(ocrData.error);

      const extracted = ocrData?.data ?? {};
      const confidence = ocrData?.confidence ?? {};
      const originalText = ocrData?.originalText ?? {};

      const newValues: Record<string, string> = {};
      for (const field of LAB_FIELDS) {
        const v = extracted[field.key];
        newValues[field.key] = v != null ? String(v) : "";
      }
      setValues(newValues);
      setConfidenceMap(confidence);
      setOriginalTextMap(originalText);
      setReportType(ocrData?.reportType ?? "");

      const lowConfCount = LAB_FIELDS.filter(
        (f) => newValues[f.key] && confidence[f.key] != null && confidence[f.key] < 80
      ).length;

      if (lowConfCount > 0) {
        toast({
          title: `${lowConfCount} value(s) need verification`,
          description: "Values with low OCR confidence are highlighted in orange. Please review them.",
          variant: "destructive",
        });
      }

      setStep("confirm");
    } catch (err: any) {
      console.error("Upload/OCR error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setStep("upload");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const labData: Record<string, any> = { patient_id: patientId };
      if (reportUrl) labData.report_file_url = reportUrl;
      for (const field of LAB_FIELDS) {
        const v = parseFloat(values[field.key]);
        labData[field.key] = isNaN(v) ? null : v;
      }
      await insertLabResult(labData as Record<string, any> & { patient_id: string });
      await insertEvent({ patient_id: patientId, event_type: "lab_uploaded", description: "Lab report uploaded via OCR" });
      const filledCount = LAB_FIELDS.filter((f) => values[f.key] && values[f.key] !== "").length;
      logAudit({ action: "lab_upload", entityType: "patient", entityId: patientId, metadata: { filledCount } });
      toast({ title: "Lab results saved successfully" });
      reset();
      setOpen(false);
      onLabAdded();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filledCount = LAB_FIELDS.filter((f) => values[f.key] && values[f.key] !== "").length;
  const lowConfFields = LAB_FIELDS.filter(
    (f) => values[f.key] && confidenceMap[f.key] != null && confidenceMap[f.key] < 80
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Upload className="h-4 w-4" /> Upload Lab Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {step === "upload" && "Upload Laboratory Report"}
            {step === "processing" && "Processing Report..."}
            {step === "confirm" && "Confirm Extracted Values"}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a photo or file of your lab report. Supported formats: JPEG, JPG, PDF
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-32 flex-col gap-3 border-dashed border-2"
                onClick={() => cameraRef.current?.click()}
              >
                <Camera className="h-8 w-8 text-primary" />
                <span className="font-medium">Take Photo</span>
              </Button>
              <Button
                variant="outline"
                className="h-32 flex-col gap-3 border-dashed border-2"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-primary" />
                <span className="font-medium">Upload File</span>
              </Button>
            </div>
            <input ref={cameraRef} type="file" accept="image/jpeg,image/jpg,image/png" capture="environment" className="hidden" onChange={handleFileChange} />
            <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,application/pdf" className="hidden" onChange={handleFileChange} />
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Extracting lab values with AI...</p>
            <p className="text-xs text-muted-foreground">Detecting layout, normalizing test names across languages</p>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{filledCount} values extracted</span>
                {reportType && (
                  <span className="text-xs text-muted-foreground">• {reportType} layout</span>
                )}
              </div>
              {lowConfFields.length > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {lowConfFields.length} need review
                </span>
              )}
            </div>

            {/* Low confidence warning */}
            {lowConfFields.length > 0 && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <p className="text-xs font-medium text-destructive mb-1">
                  ⚠ Low confidence values — please verify:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {lowConfFields.map((f) => (
                    <span key={f.key} className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                      {f.label}: {values[f.key]} ({confidenceMap[f.key]}%)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Values grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {LAB_FIELDS.map((field) => {
                const hasValue = values[field.key] && values[field.key] !== "";
                const conf = confidenceMap[field.key] ?? 100;
                const isLowConf = hasValue && conf < 80;
                const origText = originalTextMap[field.key];

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
                    {origText && origText !== values[field.key] && (
                      <p className="text-[10px] text-muted-foreground truncate" title={origText}>
                        Original: "{origText}"
                      </p>
                    )}
                    <Input
                      type="number"
                      step="any"
                      value={values[field.key] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className={`h-8 text-sm ${isLowConf ? "border-destructive/40" : ""}`}
                      placeholder="—"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleConfirm} disabled={saving} className="flex-1 gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirm Results
              </Button>
              <Button variant="outline" onClick={() => setStep("upload")} className="gap-2">
                <Edit3 className="h-4 w-4" /> Re-upload
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
