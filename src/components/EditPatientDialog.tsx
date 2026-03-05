import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { DateInputSeparate } from "@/components/DateInputSeparate";

interface EditPatientDialogProps {
  patient: any;
  onUpdated: () => void;
}

export default function EditPatientDialog({ patient, onUpdated }: EditPatientDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState(patient.full_name);
  const [gender, setGender] = useState(patient.gender || "");
  const [dateOfBirth, setDateOfBirth] = useState(patient.date_of_birth || "");
  const [phone, setPhone] = useState(patient.phone || "");
  const [organType, setOrganType] = useState(patient.organ_type);
  const [transplantDate, setTransplantDate] = useState(patient.transplant_date || "");
  const [transplantNumber, setTransplantNumber] = useState(patient.transplant_number?.toString() || "1");
  const [dialysisHistory, setDialysisHistory] = useState(patient.dialysis_history || false);
  const [returnDialysisDate, setReturnDialysisDate] = useState(patient.return_dialysis_date || "");
  const [rejectionType, setRejectionType] = useState(patient.rejection_type || "");
  const [biopsyResult, setBiopsyResult] = useState(patient.biopsy_result || "");

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast({ title: t("add.fillRequired") || "Исмни киритинг", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("patients").update({
      full_name: fullName.trim(),
      gender: gender || null,
      date_of_birth: dateOfBirth || null,
      phone: phone || null,
      organ_type: organType,
      transplant_date: transplantDate || null,
      transplant_number: transplantNumber ? parseInt(transplantNumber) : null,
      dialysis_history: dialysisHistory,
      return_dialysis_date: returnDialysisDate || null,
      rejection_type: rejectionType || null,
      biopsy_result: biopsyResult || null,
    }).eq("id", patient.id);

    setSaving(false);
    if (error) {
      toast({ title: "Хатолик юз берди", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("detail.patientUpdated") || "Бемор маълумотлари сақланди" });
      setOpen(false);
      onUpdated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (v) {
        setFullName(patient.full_name);
        setGender(patient.gender || "");
        setDateOfBirth(patient.date_of_birth || "");
        setPhone(patient.phone || "");
        setOrganType(patient.organ_type);
        setTransplantDate(patient.transplant_date || "");
        setTransplantNumber(patient.transplant_number?.toString() || "1");
        setDialysisHistory(patient.dialysis_history || false);
        setReturnDialysisDate(patient.return_dialysis_date || "");
        setRejectionType(patient.rejection_type || "");
        setBiopsyResult(patient.biopsy_result || "");
      }
      setOpen(v);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-1" />{t("common.edit") || "Таҳрирлаш"}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("detail.editPatient") || "Бемор маълумотларини таҳрирлаш"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>{t("add.fullName") || "Тўлиқ исм"}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("add.gender") || "Жинси"}</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t("add.male") || "Эркак"}</SelectItem>
                  <SelectItem value="female">{t("add.female") || "Аёл"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("add.organ") || "Орган"}</Label>
              <Select value={organType} onValueChange={setOrganType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kidney">{t("analytics.kidney") || "Буйрак"}</SelectItem>
                  <SelectItem value="liver">{t("analytics.liver") || "Жигар"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{t("detail.dob") || "Туғилган сана"}</Label>
            <DateInputSeparate value={dateOfBirth} onChange={setDateOfBirth} />
          </div>

          <div>
            <Label>{t("add.phone") || "Телефон"}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998..." />
          </div>

          <div>
            <Label>{t("add.transplantDate") || "Трансплантация санаси"}</Label>
            <DateInputSeparate value={transplantDate} onChange={setTransplantDate} />
          </div>

          <div>
            <Label>{t("add.transplantNumber") || "Трансплантация рақами"}</Label>
            <Input type="number" min="1" value={transplantNumber} onChange={(e) => setTransplantNumber(e.target.value)} />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={dialysisHistory} onCheckedChange={setDialysisHistory} />
            <Label>{t("add.dialysisHistory") || "Диализ тарихи"}</Label>
          </div>

          {dialysisHistory && (
            <div>
              <Label>{t("add.returnDialysisDate") || "Диализга қайтган сана"}</Label>
              <DateInputSeparate value={returnDialysisDate} onChange={setReturnDialysisDate} />
            </div>
          )}

          <div>
            <Label>{t("add.rejectionType") || "Рад этиш тури"}</Label>
            <Select value={rejectionType} onValueChange={setRejectionType}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("add.none") || "Йўқ"}</SelectItem>
                <SelectItem value="acute">{t("add.acute") || "Ўткир"}</SelectItem>
                <SelectItem value="chronic">{t("add.chronic") || "Сурункали"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("add.biopsyResult") || "Биопсия натижаси"}</Label>
            <Input value={biopsyResult} onChange={(e) => setBiopsyResult(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel") || "Бекор қилиш"}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "..." : (t("common.save") || "Сақлаш")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
