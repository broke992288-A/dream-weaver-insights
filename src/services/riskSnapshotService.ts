import { supabase } from "@/integrations/supabase/client";
import type { LabResult } from "@/types/patient";

export interface RiskSnapshot {
  id: string;
  patient_id: string;
  lab_result_id: string | null;
  score: number;
  risk_level: string;
  creatinine: number | null;
  alt: number | null;
  ast: number | null;
  total_bilirubin: number | null;
  tacrolimus_level: number | null;
  details: Record<string, any>;
  created_at: string;
}

// Clinical risk thresholds
const THRESHOLDS = {
  creatinine: { warning: 1.5, critical: 2.5 },
  alt: { warning: 60, critical: 120 },
  ast: { warning: 60, critical: 120 },
  total_bilirubin: { warning: 1.5, critical: 3.0 },
  tacrolimus: { low: 5, high: 15 },
};

export function computeRiskScore(
  organType: string,
  lab: LabResult,
  patient: { transplant_number?: number | null; dialysis_history?: boolean | null }
): { score: number; level: string; flags: string[] } {
  let score = 0;
  const flags: string[] = [];

  const tac = lab.tacrolimus_level ?? 0;
  const cr = lab.creatinine ?? 0;
  const alt = lab.alt ?? 0;
  const ast = lab.ast ?? 0;
  const bili = lab.total_bilirubin ?? 0;
  const egfr = lab.egfr ?? 999;

  if (organType === "liver") {
    // Tacrolimus
    if (tac < THRESHOLDS.tacrolimus.low) { score += 30; flags.push(`Tacrolimus low: ${tac}`); }
    else if (tac > THRESHOLDS.tacrolimus.high) { score += 20; flags.push(`Tacrolimus high: ${tac}`); }

    // ALT
    if (alt > THRESHOLDS.alt.critical) { score += 30; flags.push(`ALT critical: ${alt}`); }
    else if (alt > THRESHOLDS.alt.warning) { score += 15; flags.push(`ALT elevated: ${alt}`); }

    // AST
    if (ast > THRESHOLDS.ast.critical) { score += 25; flags.push(`AST critical: ${ast}`); }
    else if (ast > THRESHOLDS.ast.warning) { score += 10; flags.push(`AST elevated: ${ast}`); }

    // Bilirubin
    if (bili > THRESHOLDS.total_bilirubin.critical) { score += 20; flags.push(`Bilirubin critical: ${bili}`); }
    else if (bili > THRESHOLDS.total_bilirubin.warning) { score += 10; flags.push(`Bilirubin elevated: ${bili}`); }

    // Transplant number multiplier
    if ((patient.transplant_number ?? 1) >= 2) { score += 15; flags.push("Re-transplant patient"); }
  } else {
    // Kidney
    if (cr > THRESHOLDS.creatinine.critical) { score += 35; flags.push(`Creatinine critical: ${cr}`); }
    else if (cr > THRESHOLDS.creatinine.warning) { score += 15; flags.push(`Creatinine elevated: ${cr}`); }

    if (egfr < 30) { score += 30; flags.push(`eGFR very low: ${egfr}`); }
    else if (egfr < 45) { score += 15; flags.push(`eGFR low: ${egfr}`); }

    if (tac < THRESHOLDS.tacrolimus.low) { score += 20; flags.push(`Tacrolimus low: ${tac}`); }
    else if (tac > THRESHOLDS.tacrolimus.high) { score += 15; flags.push(`Tacrolimus high: ${tac}`); }

    if (patient.dialysis_history) { score += 20; flags.push("Dialysis history"); }
  }

  // Cap at 100
  score = Math.min(score, 100);

  const level = score >= 60 ? "high" : score >= 30 ? "medium" : "low";
  return { score, level, flags };
}

export async function insertRiskSnapshot(data: {
  patient_id: string;
  lab_result_id?: string | null;
  score: number;
  risk_level: string;
  creatinine?: number | null;
  alt?: number | null;
  ast?: number | null;
  total_bilirubin?: number | null;
  tacrolimus_level?: number | null;
  details?: Record<string, any>;
}) {
  const { data: row, error } = await supabase
    .from("risk_snapshots")
    .insert(data as any)
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function fetchRiskSnapshots(patientId: string, limit = 10) {
  const { data, error } = await supabase
    .from("risk_snapshots")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as RiskSnapshot[];
}

export async function fetchLatestRiskSnapshot(patientId: string) {
  const { data, error } = await supabase
    .from("risk_snapshots")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as RiskSnapshot | null;
}
