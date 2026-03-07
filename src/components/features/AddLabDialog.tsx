import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { insertLabResult } from "@/services/labService";
import { insertEvent } from "@/services/eventService";
import { computeRiskScore, insertRiskSnapshot } from "@/services/riskSnapshotService";
import { insertPatientAlert } from "@/services/patientAlertService";

interface AddLabDialogProps {
  patientId: string;
  organType: string;
  onLabAdded: () => void;
  patientData?: { transplant_number?: number | null; dialysis_history?: boolean | null };
}

export default function AddLabDialog({ patientId, organType, onLabAdded, patientData }: AddLabDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const [form, setForm] = useState<Record<string, string>>({
    tacrolimus_level: "", alt: "", ast: "", total_bilirubin: "", direct_bilirubin: "",
    creatinine: "", egfr: "", proteinuria: "", potassium: "",
  });
  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const labData: any = { patient_id: patientId };
      if (organType === "liver") {
        labData.tacrolimus_level = parseFloat(form.tacrolimus_level) || null;
        labData.alt = parseFloat(form.alt) || null;
        labData.ast = parseFloat(form.ast) || null;
        labData.total_bilirubin = parseFloat(form.total_bilirubin) || null;
        labData.direct_bilirubin = parseFloat(form.direct_bilirubin) || null;
      } else {
        labData.creatinine = parseFloat(form.creatinine) || null;
        labData.egfr = parseFloat(form.egfr) || null;
        labData.proteinuria = parseFloat(form.proteinuria) || null;
        labData.potassium = parseFloat(form.potassium) || null;
      }
      const savedLab = await insertLabResult(labData);

      // Compute risk score from fresh lab data
      try {
        const { score, level, flags } = computeRiskScore(organType, savedLab as any, patientData ?? {});
        const snapshot = await insertRiskSnapshot({
          patient_id: patientId,
          lab_result_id: savedLab.id,
          score,
          risk_level: level,
          creatinine: labData.creatinine ?? null,
          alt: labData.alt ?? null,
          ast: labData.ast ?? null,
          total_bilirubin: labData.total_bilirubin ?? null,
          tacrolimus_level: labData.tacrolimus_level ?? null,
          details: { flags },
        });

        // Create alert if risk is high or medium
        if (level === "high") {
          await insertPatientAlert({
            patient_id: patientId,
            risk_snapshot_id: snapshot?.id ?? null,
            severity: "critical",
            title: `Юқори хавф аниқланди (балл: ${score})`,
            message: flags.join("; "),
          });
        } else if (level === "medium") {
          await insertPatientAlert({
            patient_id: patientId,
            risk_snapshot_id: snapshot?.id ?? null,
            severity: "warning",
            title: `Ўртача хавф аниқланди (балл: ${score})`,
            message: flags.join("; "),
          });
        }
      } catch (riskErr) {
        console.error("Risk calculation error:", riskErr);
      }

      await insertEvent({ patient_id: patientId, event_type: "lab_added", description: t("detail.labAddedEvent") });
      toast({ title: t("detail.labAdded") });
      setForm({ tacrolimus_level: "", alt: "", ast: "", total_bilirubin: "", direct_bilirubin: "", creatinine: "", egfr: "", proteinuria: "", potassium: "" });
      setOpen(false);
      onLabAdded();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> {t("detail.addLab")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("detail.addNewLab")}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {organType === "liver" ? (
            <>
              <div className="space-y-2"><Label>{t("add.tacrolimus")} *</Label><Input type="number" step="0.1" value={form.tacrolimus_level} onChange={(e) => set("tacrolimus_level", e.target.value)} required /></div>
              <div className="space-y-2"><Label>{t("add.alt")} *</Label><Input type="number" value={form.alt} onChange={(e) => set("alt", e.target.value)} required /></div>
              <div className="space-y-2"><Label>{t("add.ast")} *</Label><Input type="number" value={form.ast} onChange={(e) => set("ast", e.target.value)} required /></div>
              <div className="space-y-2"><Label>{t("add.totalBilirubin")} *</Label><Input type="number" step="0.1" value={form.total_bilirubin} onChange={(e) => set("total_bilirubin", e.target.value)} required /></div>
              <div className="space-y-2"><Label>{t("add.directBilirubin")} *</Label><Input type="number" step="0.1" value={form.direct_bilirubin} onChange={(e) => set("direct_bilirubin", e.target.value)} required /></div>
            </>
          ) : (
            <>
              <div className="space-y-2"><Label>{t("add.creatinine")} *</Label><Input type="number" step="0.1" value={form.creatinine} onChange={(e) => set("creatinine", e.target.value)} required /></div>
              <div className="space-y-2"><Label>{t("add.egfr")} *</Label><Input type="number" value={form.egfr} onChange={(e) => set("egfr", e.target.value)} required /></div>
              <div className="space-y-2"><Label>{t("add.proteinuria")} *</Label><Input type="number" step="0.1" value={form.proteinuria} onChange={(e) => set("proteinuria", e.target.value)} required /></div>
              <div className="space-y-2"><Label>{t("add.potassium")} *</Label><Input type="number" step="0.1" value={form.potassium} onChange={(e) => set("potassium", e.target.value)} required /></div>
            </>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="animate-spin mr-1" />}{t("detail.saveLab")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
