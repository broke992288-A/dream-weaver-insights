import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DateInputSeparate } from "@/components/DateInputSeparate";

type OrganType = "liver" | "kidney";

function calculateRisk(organ: OrganType, data: Record<string, any>): "low" | "medium" | "high" {
  if (organ === "liver") {
    const alt = parseFloat(data.alt) || 0;
    const tac = parseFloat(data.tacrolimus_level) || 0;
    const txNum = parseInt(data.transplant_number) || 1;
    if (alt > 120) return "high";
    if (tac < 5) return txNum >= 2 ? "high" : "medium";
    if (txNum >= 2) return "medium";
    return "low";
  } else {
    const cr = parseFloat(data.creatinine) || 0;
    const egfr = parseFloat(data.egfr) || 999;
    const dialysis = data.dialysis_history === "yes";
    if (dialysis) return "high";
    if (cr > 2.5) return "high";
    if (egfr < 30) return "high";
    if (egfr < 45) return "medium";
    if (cr > 1.5) return "medium";
    return "low";
  }
}

export default function AddPatient() {
  const [step, setStep] = useState<1 | 2>(1);
  const [organ, setOrgan] = useState<OrganType | null>(null);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [form, setForm] = useState<Record<string, string>>({
    full_name: "", date_of_birth: "", gender: "male", transplant_number: "1", transplant_date: "",
    rejection_type: "", tacrolimus_level: "", alt: "", ast: "", total_bilirubin: "", direct_bilirubin: "",
    dialysis_history: "no", return_dialysis_date: "", creatinine: "", egfr: "", proteinuria: "",
    potassium: "", biopsy_result: "",
  });

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const selectOrgan = (o: OrganType) => { setOrgan(o); setStep(2); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !organ) return;
    setSaving(true);
    try {
      const riskLevel = calculateRisk(organ, form);
      const { data: patient, error: pErr } = await supabase.from("patients").insert({
        full_name: form.full_name, date_of_birth: form.date_of_birth || null, gender: form.gender,
        organ_type: organ, risk_level: riskLevel, assigned_doctor_id: user.id,
        transplant_number: parseInt(form.transplant_number) || 1,
        transplant_date: form.transplant_date || null,
        rejection_type: organ === "liver" ? (form.rejection_type || null) : null,
        dialysis_history: organ === "kidney" ? form.dialysis_history === "yes" : false,
        return_dialysis_date: organ === "kidney" && form.dialysis_history === "yes" && form.return_dialysis_date ? form.return_dialysis_date : null,
        biopsy_result: form.biopsy_result || null,
      }).select("id").single();
      if (pErr) throw pErr;

      const labData: any = { patient_id: patient.id };
      if (organ === "liver") {
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
      await supabase.from("lab_results").insert(labData);

      const txLabel = organ === "liver" ? "Liver" : "Kidney";
      const events: { patient_id: string; event_type: string; description: string; created_by: string }[] = [
        { patient_id: patient.id, event_type: "transplant_added", description: `${txLabel} Tx #${form.transplant_number} added`, created_by: user.id },
      ];
      if (organ === "kidney" && form.dialysis_history === "yes") {
        events.push({ patient_id: patient.id, event_type: "dialysis_recorded", description: "Return to dialysis recorded", created_by: user.id });
      }
      await supabase.from("patient_events").insert(events);

      toast({ title: t("add.patientAdded"), description: `${form.full_name} — Risk: ${riskLevel.toUpperCase()}` });
      navigate("/doctor-dashboard");
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (step === 1) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/doctor-dashboard")}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-2xl font-bold">{t("add.selectOrgan")}</h1>
              <p className="text-muted-foreground">{t("add.chooseType")}</p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {(["liver", "kidney"] as OrganType[]).map((o) => (
              <Card key={o} className="group cursor-pointer border-2 border-transparent transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10" onClick={() => selectOrgan(o)}>
                <CardHeader className="items-center text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary text-3xl font-bold transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    {o === "liver" ? "🫁" : "🫘"}
                  </div>
                  <CardTitle className="text-xl mt-4">{o === "liver" ? t("add.liverTransplant") : t("add.kidneyTransplant")}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription>{o === "liver" ? t("add.liverDesc") : t("add.kidneyDesc")}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setStep(1)}><ArrowLeft className="h-5 w-5" /></Button>
          <span className="text-lg font-bold">{organ === "liver" ? t("add.addLiver") : t("add.addKidney")}</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">{t("add.patientInfo")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label>{t("add.fullName")} *</Label><Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required /></div>
              <div className="space-y-2"><Label>{t("add.dob")} *</Label><Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} required /></div>
              <div className="space-y-2">
                <Label>{t("add.gender")} *</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t("add.male")}</SelectItem>
                    <SelectItem value="female">{t("add.female")}</SelectItem>
                    <SelectItem value="other">{t("add.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">{t("add.transplantDetails")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>{t("add.transplantNumber")} *</Label><Input type="number" min={1} value={form.transplant_number} onChange={(e) => set("transplant_number", e.target.value)} required /></div>
              <div className="space-y-2"><Label>{t("add.transplantDate")} *</Label><Input type="date" value={form.transplant_date} onChange={(e) => set("transplant_date", e.target.value)} required /></div>
              {organ === "liver" && (
                <div className="space-y-2">
                  <Label>{t("add.rejectionType")}</Label>
                  <Select value={form.rejection_type} onValueChange={(v) => set("rejection_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent><SelectItem value="ACR">ACR</SelectItem><SelectItem value="AMR">AMR</SelectItem><SelectItem value="Chronic">Chronic</SelectItem><SelectItem value="Unknown">Unknown</SelectItem></SelectContent>
                  </Select>
                </div>
              )}
              {organ === "kidney" && (
                <>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>{t("add.dialysisHistory")} *</Label>
                    <RadioGroup value={form.dialysis_history} onValueChange={(v) => set("dialysis_history", v)} className="flex gap-4">
                      <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="dh-yes" /><Label htmlFor="dh-yes">{t("add.yes")}</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="no" id="dh-no" /><Label htmlFor="dh-no">{t("add.no")}</Label></div>
                    </RadioGroup>
                  </div>
                  {form.dialysis_history === "yes" && (
                    <div className="space-y-2"><Label>{t("add.returnDialysisDate")}</Label><Input type="date" value={form.return_dialysis_date} onChange={(e) => set("return_dialysis_date", e.target.value)} /></div>
                  )}
                </>
              )}
              <div className="space-y-2 sm:col-span-2"><Label>{t("add.biopsyResult")}</Label><Input value={form.biopsy_result} onChange={(e) => set("biopsy_result", e.target.value)} placeholder={t("common.optional")} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">{t("add.labResults")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {organ === "liver" ? (
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
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            {t("add.save")}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
