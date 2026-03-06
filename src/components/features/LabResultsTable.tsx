import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { LabResult } from "@/types/patient";

const REFERENCE_RANGES: Record<string, { min: number; max: number; unit: string; label: string }> = {
  hb: { min: 12, max: 17, unit: "g/dL", label: "HB" },
  tlc: { min: 4, max: 11, unit: "×10³/µL", label: "TLC" },
  platelets: { min: 150, max: 400, unit: "×10³/µL", label: "Platelets" },
  pti: { min: 70, max: 100, unit: "%", label: "PTI" },
  inr: { min: 0.8, max: 1.2, unit: "", label: "INR" },
  total_bilirubin: { min: 0.1, max: 1.2, unit: "mg/dL", label: "Total Bilirubin" },
  direct_bilirubin: { min: 0, max: 0.3, unit: "mg/dL", label: "Direct Bilirubin" },
  ast: { min: 5, max: 40, unit: "U/L", label: "AST" },
  alt: { min: 5, max: 40, unit: "U/L", label: "ALT" },
  alp: { min: 44, max: 147, unit: "U/L", label: "ALP" },
  ggt: { min: 5, max: 55, unit: "U/L", label: "GGT" },
  total_protein: { min: 6, max: 8.3, unit: "g/dL", label: "Total Protein" },
  albumin: { min: 3.5, max: 5.5, unit: "g/dL", label: "Albumin" },
  urea: { min: 7, max: 20, unit: "mg/dL", label: "Urea" },
  creatinine: { min: 0.6, max: 1.2, unit: "mg/dL", label: "Creatinine" },
  egfr: { min: 90, max: 200, unit: "mL/min", label: "eGFR" },
  sodium: { min: 136, max: 145, unit: "mEq/L", label: "Sodium" },
  potassium: { min: 3.5, max: 5.1, unit: "mEq/L", label: "Potassium" },
  calcium: { min: 8.5, max: 10.5, unit: "mg/dL", label: "Calcium" },
  magnesium: { min: 1.7, max: 2.2, unit: "mg/dL", label: "Magnesium" },
  phosphorus: { min: 2.5, max: 4.5, unit: "mg/dL", label: "Phosphorus" },
  uric_acid: { min: 2.4, max: 7, unit: "mg/dL", label: "Uric Acid" },
  crp: { min: 0, max: 10, unit: "mg/L", label: "CRP" },
  esr: { min: 0, max: 20, unit: "mm/hr", label: "ESR" },
  ldh: { min: 140, max: 280, unit: "U/L", label: "LDH" },
  ammonia: { min: 15, max: 45, unit: "µg/dL", label: "Ammonia" },
  tacrolimus_level: { min: 5, max: 15, unit: "ng/mL", label: "Tacrolimus" },
  cyclosporine: { min: 100, max: 300, unit: "ng/mL", label: "Cyclosporine" },
  proteinuria: { min: 0, max: 150, unit: "mg/dL", label: "Proteinuria" },
};

function getStatus(key: string, value: number): { label: string; color: string } {
  const ref = REFERENCE_RANGES[key];
  if (!ref) return { label: "—", color: "" };
  
  const lowBorder = ref.min * 0.9;
  const highBorder = ref.max * 1.1;
  
  if (value >= ref.min && value <= ref.max) return { label: "Normal", color: "bg-green-500/15 text-green-700 border-green-200" };
  if (value < lowBorder || value > highBorder) return { label: "High", color: "bg-red-500/15 text-red-700 border-red-200" };
  return { label: "Borderline", color: "bg-yellow-500/15 text-yellow-700 border-yellow-200" };
}

interface Props {
  labs: LabResult[];
}

export default function LabResultsTable({ labs }: Props) {
  if (labs.length === 0) return <p className="text-muted-foreground text-sm py-4">No lab results available</p>;

  return (
    <div className="space-y-6">
      {labs.map((lab) => {
        const entries = Object.entries(REFERENCE_RANGES)
          .map(([key, ref]) => {
            const val = (lab as any)[key];
            if (val == null) return null;
            const status = getStatus(key, val);
            return { key, label: ref.label, value: val, unit: ref.unit, range: `${ref.min}–${ref.max}`, status };
          })
          .filter(Boolean) as Array<{ key: string; label: string; value: number; unit: string; range: string; status: { label: string; color: string } }>;

        if (entries.length === 0) return null;

        return (
          <div key={lab.id} className="rounded-xl border overflow-hidden">
            <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm font-semibold">{new Date(lab.recorded_at).toLocaleDateString()}</span>
              <span className="text-xs text-muted-foreground">{entries.length} tests</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[180px]">Test Name</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Reference</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.key}>
                    <TableCell className="font-medium">{e.label}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{e.value}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">{e.unit}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">{e.range}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-xs ${e.status.color}`}>{e.status.label}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </div>
  );
}

export { REFERENCE_RANGES };
